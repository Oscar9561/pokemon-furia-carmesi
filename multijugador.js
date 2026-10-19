// ===================== MULTIJUGADOR =====================
// Combates entre dos jugadores, gratis y sin cuentas: los dos navegadores se conectan directamente (WebRTC con PeerJS;
// su servidor público solo sirve para que se encuentren). Partida abierta contra cualquiera que esté buscando rival, o
// sala privada: uno la crea y le pasa el código al otro.
// Las dos partidas simulan el combate a la vez con el mismo azar (semilla compartida) y cada una solo envía lo que elige
// su jugador. Todos los Pokémon luchan a nivel 50, como en el competitivo oficial.
// Puntos: sistema Elo (se empieza con 1000 y ganar a alguien con más puntos da más). Se guardan en la partida.
const VERSION_PVP = 21;   // súbela si cambia el motor de combate: las dos partidas tienen que calcular igual

const OnlineP2P = (() => {
    const PEERJS = "https://cdn.jsdelivr.net/npm/peerjs@1.5.5/dist/peerjs.min.js";
    const PREFIJO = "pk-aurelia-";
    const LETRAS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";   // sin 0/O ni 1/I, que se confunden
    let peer = null, con = null, colas = {}, esperas = {}, fin = null, oyenteFin = null, latido = null, ultimo = 0;
    // Servidores STUN públicos (para que los dos navegadores se encuentren aunque estén detrás de un router). Si algún
    // jugador no puede conectar nunca (datos móviles, redes muy cerradas), se puede añadir un servidor TURN en online-config.js.
    const opcionesPeer = () => ({ debug: 0, config: { iceServers: [
        ...(typeof ONLINE_CONFIG !== "undefined" && Array.isArray(ONLINE_CONFIG.iceServers) ? ONLINE_CONFIG.iceServers : []),
        { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }, { urls: "stun:stun.cloudflare.com:3478" },
    ] } });

    function cargar() {
        if (window.Peer) return Promise.resolve();
        return new Promise((ok, mal) => {
            const s = document.createElement("script");
            s.src = PEERJS; s.onload = () => ok(); s.onerror = () => mal({ type: "sin-peerjs" });
            document.head.appendChild(s);
        });
    }
    const codigoNuevo = () => Array.from({ length: 5 }, () => LETRAS[Math.floor(Math.random() * LETRAS.length)]).join("");
    // Mensajes: cada tipo en su cola (el canal los entrega en orden); si el rival se rinde o se va, se avisa a quien espere.
    function llegar(msg) {
        if (!msg || typeof msg !== "object" || typeof msg.t !== "string") return;
        if (msg.t === "latido") return;
        if (msg.t === "rendirse") return terminar("rendirse");
        const e = esperas[msg.t];
        if (e && e.length) e.shift()(msg);
        else (colas[msg.t] = colas[msg.t] || []).push(msg);
    }
    function terminar(motivo) {
        if (fin) return;
        fin = motivo;
        Object.values(esperas).forEach((l) => l.forEach((ok) => ok({ fin })));
        esperas = {};
        if (oyenteFin) oyenteFin(fin);
    }
    // Aviso en cuanto el rival se rinde o se va (aunque tu jugador no esté esperando nada).
    function alFin(fn) { oyenteFin = fn; if (fin && fn) fn(fin); }
    function prepararConexion(c) {
        con = c; ultimo = Date.now();
        c.on("data", (m) => { ultimo = Date.now(); llegar(m); });
        c.on("close", () => terminar("desconexion"));
        c.on("error", () => terminar("desconexion"));
        c.on("iceStateChanged", (s) => { if (s === "failed" || s === "closed") terminar("desconexion"); });
        // Latido cada 4 s; si en un minuto no llega nada del rival (se le cerró el navegador, se quedó sin conexión…), se acabó.
        clearInterval(latido);
        latido = setInterval(() => {
            if (!con || fin) { clearInterval(latido); return; }
            enviar({ t: "latido" });
            if (Date.now() - ultimo > 60000) terminar("desconexion");
        }, 4000);
    }
    function cerrar() {
        cancelarBusqueda();
        clearInterval(latido); latido = null;
        oyenteFin = null;
        try { if (con) con.close(); } catch (_) {}
        try { if (peer) peer.destroy(); } catch (_) {}
        con = null; peer = null; colas = {}; esperas = {}; fin = null;
    }
    // Anfitrión: abre la sala. Devuelve su código y una promesa que se cumple cuando entra el rival.
    async function crearSala() {
        await cargar(); cerrar();
        for (let intento = 0; intento < 4; intento++) {
            const codigo = codigoNuevo();
            try {
                await new Promise((ok, mal) => {
                    peer = new Peer(PREFIJO + codigo, opcionesPeer());
                    peer.on("open", ok);
                    peer.on("error", mal);
                });
                let avisar;
                const conectado = new Promise((ok) => { avisar = ok; });
                peer.on("connection", (c) => {
                    if (con) { c.on("open", () => c.close()); return; }   // la sala ya está llena
                    c.on("open", () => { prepararConexion(c); avisar(); });
                });
                return { codigo, conectado };
            } catch (e) {
                try { if (peer) peer.destroy(); } catch (_) {}
                peer = null;
                if (!e || e.type !== "unavailable-id") throw e;   // código ocupado: se prueba otro
            }
        }
        throw { type: "sin-sala" };
    }
    // Invitado: entra en la sala de ese código.
    async function unirse(codigo) {
        await cargar(); cerrar();
        await new Promise((ok, mal) => {
            peer = new Peer(opcionesPeer());
            peer.on("open", ok);
            peer.on("error", mal);
        });
        await new Promise((ok, mal) => {
            // Si la sala no existe, el servidor lo dice enseguida; si existe pero no se abre el canal, es la red.
            const t = setTimeout(() => mal({ type: "sin-conexion" }), 20000);
            peer.on("error", (e) => { clearTimeout(t); mal(e); });
            const c = peer.connect(PREFIJO + codigo, { reliable: true, serialization: "json" });
            c.on("iceStateChanged", (s) => { if (s === "failed") { clearTimeout(t); mal({ type: "sin-conexion" }); } });
            c.on("open", () => { clearTimeout(t); prepararConexion(c); ok(); });
        });
    }
    // ---------- Partida abierta: cualquiera contra cualquiera ----------
    // El servidor gratuito de PeerJS no deja ver quién está conectado, así que hay unas salas públicas con nombre fijo:
    // quien busca rival entra en la primera donde haya alguien esperando y, si no hay nadie, espera él en la primera
    // libre. Si dos acaban esperando en salas distintas, el de la sala más alta se une al de la más baja.
    const HUECOS = 8;
    let sufijo = "";   // ("-dobles" al buscar un combate doble: cada formato tiene sus salas)
    const idPublica = (k) => `${PREFIJO}v${VERSION_PVP}${sufijo}-abierta-${k}`;
    let buscando = false, extras = [];   // peers de la búsqueda (se cierran al emparejarse o cancelar)
    const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
    // Peer con ese nombre (o uno al azar): el peer, "ocupada" si ese nombre ya lo tiene otro, o null si falla.
    function nuevoPeer(id) {
        return new Promise((ok) => {
            let listo = false;
            const p = id ? new Peer(id, opcionesPeer()) : new Peer(opcionesPeer());
            p.on("open", () => { listo = true; ok(p); });
            p.on("error", (e) => {
                if (listo) return;
                listo = true;
                try { p.destroy(); } catch (_) {}
                ok(e && e.type === "unavailable-id" ? "ocupada" : null);
            });
        });
    }
    // Intenta entrar en la sala pública k: la conexión si quien espera allí nos acepta; si no, null.
    function probarSala(p, k, ms = 6000) {
        return new Promise((ok) => {
            let hecho = false, c = null, t = null;
            const onErr = (e) => { if (e && e.type === "peer-unavailable") acabar(null); };
            const acabar = (v) => {
                if (hecho) return;
                hecho = true; clearTimeout(t); p.off("error", onErr);
                if (!v && c) { try { c.close(); } catch (_) {} }
                ok(v);
            };
            t = setTimeout(() => acabar(null), ms);
            p.on("error", onErr);
            try { c = p.connect(idPublica(k), { reliable: true, serialization: "json" }); } catch (_) { acabar(null); return; }
            c.on("open", () => c.on("data", (m) => { if (m && m.t === "sala-ok") acabar(c); }));
            c.on("close", () => acabar(null));
        });
    }
    // Emparejados: se queda el peer de la conexión y la sala pública queda libre para otros.
    function emparejado(dueno, c, anfitrion) {
        buscando = false;
        prepararConexion(c);
        extras.forEach((p) => { if (p !== dueno) { try { p.destroy(); } catch (_) {} } });
        extras = [];
        peer = dueno;
        if (anfitrion) { try { dueno.disconnect(); } catch (_) {} }   // suelta el nombre de la sala; la conexión sigue
        return { anfitrion };
    }
    function esperarEnSala(busca, sala, k) {
        return new Promise((ok) => {
            let hecho = false;
            const acabar = (v) => { if (!hecho) { hecho = true; ok(v); } };
            sala.on("connection", (c) => c.on("open", () => {
                if (hecho || !buscando) { try { c.close(); } catch (_) {} return; }
                c.send({ t: "sala-ok" });
                acabar(emparejado(sala, c, true));
            }));
            // Mientras, cada pocos segundos: si alguien espera en una sala más baja, me uno a él.
            (async () => {
                while (!hecho && buscando) {
                    await esperar(5000);
                    for (let j = 1; j < k && !hecho && buscando; j++) {
                        const c = await probarSala(busca, j, 5000);
                        if (!c) continue;
                        if (hecho || !buscando) { try { c.close(); } catch (_) {} } else acabar(emparejado(busca, c, false));
                        return;
                    }
                }
                acabar(null);
            })();
        });
    }
    // Busca rival: { anfitrion } cuando lo encuentra, o null si se cancela. aviso("esperando") cuando pasa a esperar.
    async function buscarPartida(aviso = () => {}, formato = "individual") {
        await cargar(); cerrar();
        sufijo = formato === "doble" ? "-dobles" : "";
        buscando = true;
        const busca = await nuevoPeer();   // con este entra en las salas de los demás
        if (!buscando) { if (busca && busca !== "ocupada") busca.destroy(); return null; }
        if (!busca || busca === "ocupada") { buscando = false; throw { type: "network" }; }
        extras.push(busca);
        while (buscando) {
            for (let k = 1; k <= HUECOS && buscando; k++) {           // ¿alguien esperando? Entro
                const c = await probarSala(busca, k);
                if (c && buscando) return emparejado(busca, c, false);
            }
            for (let k = 1; k <= HUECOS && buscando; k++) {           // nadie: espero yo en la primera libre
                const sala = await nuevoPeer(idPublica(k));
                if (!buscando) { if (sala && sala !== "ocupada") sala.destroy(); return null; }
                if (sala === "ocupada") {                               // alguien la acaba de coger: me uno a él
                    const c = await probarSala(busca, k);
                    if (c && buscando) return emparejado(busca, c, false);
                    continue;
                }
                if (!sala) continue;
                extras.push(sala);
                aviso("esperando");
                return esperarEnSala(busca, sala, k);
            }
            await esperar(2000);
        }
        return null;
    }
    function cancelarBusqueda() {
        buscando = false;
        extras.forEach((p) => { try { p.destroy(); } catch (_) {} });
        extras = [];
    }

    function enviar(msg) { try { if (con && con.open) con.send(msg); } catch (_) {} }
    // Al cerrar la pestaña (o salir de la página) se cierra la conexión, y el rival se entera al momento.
    window.addEventListener("pagehide", () => {
        try { if (con) con.close(); } catch (_) {}
        try { if (peer) peer.destroy(); } catch (_) {}
    });
    function recibir(tipo) {
        const c = colas[tipo];
        if (c && c.length) return Promise.resolve(c.shift());   // (lo que llegó antes de cortarse, primero)
        if (fin) return Promise.resolve({ fin });
        return new Promise((ok) => { (esperas[tipo] = esperas[tipo] || []).push(ok); });
    }
    return { crearSala, unirse, buscarPartida, enviar, recibir, cerrar, alFin };
})();

// ---------- Ranking mundial (Supabase, opcional) ----------
// Se activa al rellenar online-config.js. Cada jugador tiene una cuenta anónima (se guarda en este navegador); los
// combates cuentan cuando los dos jugadores informan del mismo ganador y los puntos los calcula el servidor (servidor/supabase.sql).
// La temporada del ranking: el mes natural en curso, con la hora de Madrid («2026-10»), como en el servidor.
function temporadaActual(d = new Date()) {
    const p = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Madrid", year: "numeric", month: "2-digit" }).formatToParts(d).map((x) => [x.type, x.value]));
    return `${p.year}-${p.month}`;
}
const temporadaAnterior = (t = temporadaActual()) => { const [y, m] = t.split("-").map(Number); return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`; };
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const nombreTemporada = (t) => { const [y, m] = t.split("-").map(Number); return `${MESES[m - 1]} de ${y}`; };
const Ranking = (() => {
    const LIB = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.2/dist/umd/supabase.min.js";
    let cli = null, yo = null, conectando = null;
    const activo = () => typeof ONLINE_CONFIG !== "undefined" && !!ONLINE_CONFIG.supabaseUrl && !!ONLINE_CONFIG.supabaseAnonKey;
    function cargar() {
        if (window.supabase && window.supabase.createClient) return Promise.resolve();
        return new Promise((ok, mal) => {
            const sc = document.createElement("script");
            sc.src = LIB; sc.onload = () => ok(); sc.onerror = () => mal(new Error("sin-supabase"));
            document.head.appendChild(sc);
        });
    }
    // Sesión anónima (la primera vez se crea la cuenta).
    function conectar() {
        if (!activo()) return Promise.resolve(null);
        if (yo) return Promise.resolve(yo);
        if (conectando) return conectando;
        conectando = (async () => {
            await cargar();
            cli = cli || window.supabase.createClient(ONLINE_CONFIG.supabaseUrl, ONLINE_CONFIG.supabaseAnonKey,
                { auth: { persistSession: true, autoRefreshToken: true, storageKey: "aurelia-online" } });
            let { data } = await cli.auth.getSession();
            let sesion = data && data.session;
            if (!sesion) {
                const r = await cli.auth.signInAnonymously();
                if (r.error) throw r.error;
                sesion = r.data.session;
            }
            yo = sesion.user.id;
            return yo;
        })();
        conectando.catch(() => {}).finally(() => { conectando = null; });
        return conectando;
    }
    async function registrar(nombre, genero) {
        if (!(await conectar())) return null;
        const { data, error } = await cli.rpc("registrar_entrenador", { p_nombre: nombre, p_genero: genero });
        if (error) throw error;
        return data;
    }
    // Ranking de la temporada actual (un mes). Si el servidor aún no tiene temporadas (SQL sin actualizar), el de siempre.
    let conTemporadas = true;
    async function top(n = 50) {
        if (!(await conectar())) return [];
        const q = () => cli.from("entrenadores").select("id,nombre,genero,puntos,victorias,derrotas").order("puntos", { ascending: false }).limit(n);
        let r = conTemporadas ? await q().eq("temporada", temporadaActual()) : await q();
        if (r.error && conTemporadas) { conTemporadas = false; r = await q(); }
        if (r.error) throw r.error;
        return r.data || [];
    }
    async function mio() {
        if (!(await conectar())) return null;
        const { data } = await cli.from("entrenadores").select("id,nombre,puntos,victorias,derrotas").eq("id", yo).maybeSingle();
        if (!data) return null;
        let q = cli.from("entrenadores").select("id", { count: "exact", head: true }).gt("puntos", data.puntos);
        if (conTemporadas) q = q.eq("temporada", temporadaActual());
        const { count } = await q;
        return Object.assign(data, { puesto: (count || 0) + 1 });
    }
    // Los tres primeros de una temporada pasada.
    async function campeones(temporada) {
        if (!conTemporadas || !(await conectar())) return [];
        const { data, error } = await cli.from("clasificacion_temporadas").select("nombre,puntos").eq("temporada", temporada).order("puntos", { ascending: false }).limit(3);
        return error ? [] : data || [];
    }
    // Pasar la partida a otro dispositivo con un código corto.
    async function subirCopia(datos) {
        if (!(await conectar())) return null;
        const { data, error } = await cli.rpc("subir_copia", { p_datos: datos });
        if (error) throw error;
        return data;
    }
    async function bajarCopia(codigo) {
        if (!(await conectar())) return null;
        const { data, error } = await cli.rpc("bajar_copia", { p_codigo: codigo });
        if (error) throw error;
        return data;
    }
    // Tus informes y las respuestas del creador.
    async function misReportes() {
        if (!(await conectar())) return [];
        const { data, error } = await cli.rpc("mis_reportes");
        if (error) throw error;
        return data || [];
    }
    async function marcarLeidas() { if (await conectar()) await cli.rpc("marcar_respuestas_leidas").then(() => {}, () => {}); }
    async function informar(combate, rival, gane) {
        if (!(await conectar())) return null;
        const { data, error } = await cli.rpc("informar_combate", { p_combate: combate, p_rival: rival, p_gane: gane });
        if (error) throw error;
        return data;
    }
    async function empezar(combate, rival) {
        if (!(await conectar())) return null;
        const { data, error } = await cli.rpc("empezar_combate", { p_combate: combate, p_rival: rival });
        if (error) throw error;
        return data;
    }
    // Cuenta los combates en los que el rival se fue sin informar (pasados unos minutos).
    async function resolverPendientes() {
        if (!(await conectar())) return 0;
        const { data, error } = await cli.rpc("resolver_pendientes");
        if (error) throw error;
        return data || 0;
    }
    // Informe de un error o una sugerencia (beta).
    async function reportar(tipo, texto, datos) {
        if (!(await conectar())) return null;
        const { data, error } = await cli.rpc("enviar_reporte", { p_tipo: tipo, p_texto: texto, p_datos: datos });
        if (error) throw error;
        return data;
    }
    return { activo, conectar, registrar, top, mio, campeones, informar, empezar, resolverPendientes, reportar, subirCopia, bajarCopia, misReportes, marcarLeidas,
        id: () => yo, cliente: () => cli, conTemporadas: () => conTemporadas };
})();
// ---------- Conexión por el servidor (Supabase Realtime) ----------
// Con el servidor configurado (online-config.js), los mensajes del combate pasan por los canales de Supabase en vez de ir
// de navegador a navegador: así se conecta desde cualquier red (datos móviles, wifi de la universidad…). «Buscar rival»
// usa una sala de espera con presencia: el servidor sabe quién está buscando y empareja a los dos que llevan más tiempo.
const OnlineSB = (() => {
    const LETRAS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let cli = null, canal = null, lobby = null, rivalId = null, buscando = false;
    let colas = {}, esperas = {}, fin = null, oyenteFin = null, latido = null, ultimo = 0;
    const yoId = (window.crypto && crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2) + Date.now());
    const pref = () => `fc-v${VERSION_PVP}`;
    const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
    const codigoNuevo = () => Array.from({ length: 5 }, () => LETRAS[Math.floor(Math.random() * LETRAS.length)]).join("");
    async function cliente() {
        if (cli) return cli;
        await Ranking.conectar();
        cli = Ranking.cliente();
        if (!cli) throw { type: "network" };
        return cli;
    }
    function llegar(msg) {
        if (!msg || typeof msg !== "object" || typeof msg.t !== "string") return;
        if (msg.t === "latido") return;
        if (msg.t === "rendirse") return terminar("rendirse");
        if (msg.t === "salir") return terminar("desconexion");
        const e = esperas[msg.t];
        if (e && e.length) e.shift()(msg);
        else (colas[msg.t] = colas[msg.t] || []).push(msg);
    }
    function terminar(motivo) {
        if (fin) return;
        fin = motivo;
        Object.values(esperas).forEach((l) => l.forEach((ok) => ok({ fin })));
        esperas = {};
        if (oyenteFin) oyenteFin(fin);
    }
    function alFin(fn) { oyenteFin = fn; if (fin && fn) fn(fin); }
    const mandar = (ch, para, msg) => ch.send({ type: "broadcast", event: "m", payload: { de: yoId, para, msg } }).catch(() => {});
    // Se une a un canal y espera a estar dentro. alMensaje({ de, para, msg }) con lo que le llegue.
    function abrirCanal(nombre, alMensaje, conPresencia = null) {
        return new Promise((ok, mal) => {
            const ch = cli.channel(nombre, { config: conPresencia ? { presence: { key: yoId } } : { broadcast: { self: false, ack: true } } });
            ch.on("broadcast", { event: "m" }, ({ payload }) => { if (payload && (!payload.para || payload.para === yoId)) alMensaje(payload); });
            if (conPresencia) ch.on("presence", { event: "sync" }, () => conPresencia(ch.presenceState()));
            let hecho = false;
            const t = setTimeout(() => { if (!hecho) { hecho = true; try { cli.removeChannel(ch); } catch (_) {} mal({ type: "network" }); } }, 12000);
            ch.subscribe((estado) => {
                if (hecho) return;   // (las desconexiones se notan por el latido o por el aviso «salir»: los cierres de canal son normales)
                if (estado === "SUBSCRIBED") { hecho = true; clearTimeout(t); ok(ch); }
                else if (estado === "CHANNEL_ERROR" || estado === "TIMED_OUT") { hecho = true; clearTimeout(t); try { cli.removeChannel(ch); } catch (_) {} mal({ type: "network" }); }
            });
        });
    }
    function conectado(ch, rival) {
        canal = ch; rivalId = rival; ultimo = Date.now();
        clearInterval(latido);
        latido = setInterval(() => {
            if (!canal || fin) { clearInterval(latido); return; }
            enviar({ t: "latido" });
            if (Date.now() - ultimo > 45000) terminar("desconexion");   // (45 s sin saber nada del rival)
        }, 4000);
    }
    // Sala con código: el anfitrión espera dentro; el invitado llama a la puerta hasta que le abren.
    async function salaAnfitrion(nombre) {
        let avisar, ch;
        const llegada = new Promise((ok) => { avisar = ok; });
        ch = await abrirCanal(nombre, ({ de, msg }) => {
            if (rivalId && de === rivalId) { ultimo = Date.now(); return llegar(msg); }
            if (msg && msg.t === "entrar") {
                if (rivalId && de !== rivalId) return mandar(ch, de, { t: "llena" });
                if (!rivalId) { conectado(ch, de); mandar(ch, de, { t: "sala-ok" }); avisar(); }
                else mandar(ch, de, { t: "sala-ok" });   // (repite: puede que no le llegara)
            }
        });
        return { ch, llegada };
    }
    async function salaInvitado(nombre, ms = 9000) {
        let resp = null, ch, avisar;
        const respuesta = new Promise((ok) => { avisar = ok; });
        ch = await abrirCanal(nombre, ({ de, msg }) => {
            if (rivalId && de === rivalId) { ultimo = Date.now(); return llegar(msg); }
            if (msg && (msg.t === "sala-ok" || msg.t === "llena") && !resp) {
                resp = { de, t: msg.t };
                if (msg.t === "sala-ok") conectado(ch, de);   // (ya: lo siguiente que mande el anfitrión ya es del combate)
                avisar();
            }
        });
        const t0 = Date.now();
        while (!resp && Date.now() - t0 < ms && !fin) { mandar(ch, null, { t: "entrar" }); await Promise.race([respuesta, esperar(1200)]); }
        if (resp && resp.t === "sala-ok") return ch;
        try { cli.removeChannel(ch); } catch (_) {}
        throw { type: resp && resp.t === "llena" ? "sala-llena" : "peer-unavailable" };
    }
    async function crearSala() {
        cerrar(); await cliente();
        const codigo = codigoNuevo();
        const { llegada } = await salaAnfitrion(`${pref()}-sala-${codigo}`);
        return { codigo, conectado: llegada };
    }
    async function unirse(codigo) {
        cerrar(); await cliente();
        await salaInvitado(`${pref()}-sala-${codigo}`);
    }
    // Buscar rival: sala de espera con presencia. Se emparejan por orden de llegada (1.º con 2.º, 3.º con 4.º…); el de la clave
    // más baja de cada pareja abre la sala de los dos y el otro entra.
    async function buscarPartida(aviso = () => {}, formato = "individual") {
        cerrar(); await cliente();
        buscando = true;
        const llegue = Date.now(), espera = formato === "doble" ? "espera-dobles" : "espera";
        while (buscando) {
            let pareja = null, avisar;
            const encontrada = new Promise((ok) => { avisar = ok; });
            let porAviso = false;
            // (los cambios de presencia llegan agrupados y una entrada seguida de una salida rápida no se ve: por eso el que
            // encuentra pareja se lo dice al otro con un mensaje directo)
            lobby = await abrirCanal(`${pref()}-${espera}`, ({ de, msg }) => {
                if (!pareja && msg && msg.t === "pareja" && de && de !== yoId) { pareja = de; porAviso = true; avisar(); }
            }, (estado) => {
                if (pareja) return;
                const lista = Object.entries(estado).map(([k, v]) => ({ k, t: (v && v[0] && v[0].t) || 0 })).sort((a, b) => a.t - b.t || (a.k < b.k ? -1 : 1));
                const i = lista.findIndex((x) => x.k === yoId);
                if (i < 0) return;
                const otro = lista[i % 2 ? i - 1 : i + 1];
                if (otro) { pareja = otro.k; avisar(); }
            });
            await lobby.track({ t: llegue });
            aviso("esperando");
            await Promise.race([encontrada, (async () => { while (buscando && !pareja) await esperar(500); })()]);
            const l = lobby; lobby = null;
            if (pareja && !porAviso) { mandar(l, pareja, { t: "pareja" }); await esperar(700); mandar(l, pareja, { t: "pareja" }); }
            try { await l.untrack(); } catch (_) {}
            try { cli.removeChannel(l); } catch (_) {}
            if (!buscando) return null;
            const anfitrion = yoId < pareja, nombre = `${pref()}-par-${[yoId, pareja].sort().join("-").replace(/[^a-z0-9-]/gi, "").slice(0, 80)}`;
            try {
                if (anfitrion) {
                    const { ch, llegada } = await salaAnfitrion(nombre);
                    const ok = await Promise.race([llegada.then(() => true), esperar(12000).then(() => false)]);
                    if (ok && buscando) { buscando = false; return { anfitrion: true }; }
                    rivalId = null; canal = null;
                    try { cli.removeChannel(ch); } catch (_) {}
                } else {
                    await esperar(600);
                    await salaInvitado(nombre, 12000);
                    if (buscando) { buscando = false; return { anfitrion: false }; }
                }
            } catch (_) { rivalId = null; canal = null; }
            // (no se ha completado: vuelta a la sala de espera)
        }
        return null;
    }
    function enviar(msg) { if (canal && rivalId) mandar(canal, rivalId, msg); }
    function recibir(tipo) {
        const c = colas[tipo];
        if (c && c.length) return Promise.resolve(c.shift());   // (lo que llegó antes de cortarse, primero)
        if (fin) return Promise.resolve({ fin });
        return new Promise((ok) => { (esperas[tipo] = esperas[tipo] || []).push(ok); });
    }
    function cerrar() {
        buscando = false;
        clearInterval(latido); latido = null; oyenteFin = null;
        if (canal && rivalId && !fin) mandar(canal, rivalId, { t: "salir" });
        const viejos = [canal, lobby];
        canal = null; lobby = null; rivalId = null; colas = {}; esperas = {}; fin = null;
        for (const ch of viejos) { if (ch && cli) { try { cli.removeChannel(ch); } catch (_) {} } }
    }
    window.addEventListener("pagehide", () => { if (canal && rivalId) mandar(canal, rivalId, { t: "salir" }); });
    return { crearSala, unirse, buscarPartida, enviar, recibir, cerrar, alFin };
})();
// Por dónde van los mensajes: el servidor si está configurado; si no, de navegador a navegador (PeerJS).
const Online = (() => {
    let red = null;
    const elegir = () => (Ranking.activo() ? OnlineSB : OnlineP2P);
    return {
        crearSala: (...a) => (red = elegir()).crearSala(...a),
        unirse: (...a) => (red = elegir()).unirse(...a),
        buscarPartida: (...a) => (red = elegir()).buscarPartida(...a),
        enviar: (m) => red && red.enviar(m),
        recibir: (t) => (red ? red.recibir(t) : Promise.resolve({ fin: "desconexion" })),
        alFin: (fn) => red && red.alFin(fn),
        cerrar: () => { OnlineP2P.cerrar(); OnlineSB.cerrar(); },
        porServidor: () => Ranking.activo(),
    };
})();
// Cuántos entrenadores hay ahora mismo en el multijugador y cuántos buscan rival (presencia en un canal común del servidor).
const Presencia = (() => {
    let ch = null, oyente = null, abriendo = false, estado = { b: 0 }, oyenteReto = null;
    const yo = window.crypto && crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2) + Date.now();
    function contar() {
        if (!ch || !oyente) return;
        const lista = Object.values(ch.presenceState()).map((v) => (v && v[0]) || {});
        oyente({ total: lista.length, buscando: lista.filter((x) => x.b).length, yoBusco: !!estado.b, cuentas: new Set(lista.map((x) => x.uid).filter(Boolean)) });
    }
    async function entrar(fn) {
        oyente = fn;
        if (ch) return contar();
        if (abriendo || !Ranking.activo()) return;
        abriendo = true;
        try {
            await Ranking.conectar();
            const cli = Ranking.cliente(); if (!cli) return;
            const c = cli.channel(`fc-v${VERSION_PVP}-portal`, { config: { presence: { key: yo } } });
            c.on("presence", { event: "sync" }, contar);
            c.on("broadcast", { event: "reto" }, ({ payload }) => { if (payload && payload.para === Ranking.id() && oyenteReto) oyenteReto(payload); });
            const dentro = await Promise.race([
                new Promise((ok) => c.subscribe((s) => { if (s === "SUBSCRIBED") ok(true); else if (s === "CHANNEL_ERROR" || s === "TIMED_OUT") ok(false); })),
                new Promise((ok) => setTimeout(() => ok(false), 10000))]);
            if (!dentro || !oyente) { try { cli.removeChannel(c); } catch (_) {} return; }   // (o ya se ha ido de la pantalla)
            ch = c;
            estado = Object.assign({}, estado, { uid: Ranking.id() || null });
            await ch.track(estado);
        } catch (_) {} finally { abriendo = false; }
    }
    function buscando(si) { estado = Object.assign({}, estado, { b: si ? 1 : 0 }); if (ch) ch.track(estado).catch(() => {}); }
    // Reto a un amigo conectado: le llega el código de tu sala.
    function retar(uid, datos) { if (!ch || !uid) return false; ch.send({ type: "broadcast", event: "reto", payload: Object.assign({ para: uid, de: Ranking.id() }, datos) }).catch(() => {}); return true; }
    const alReto = (fn) => { oyenteReto = fn; };
    function salir() {
        oyente = null;
        if (!ch) return;
        const c = ch; ch = null;
        try { c.untrack(); } catch (_) {}
        try { Ranking.cliente().removeChannel(c); } catch (_) {}
    }
    return { entrar, buscando, salir, retar, alReto };
})();
let cuentasEnLinea = new Set();
function pintarEnLinea({ total, buscando, yoBusco, cuentas }) {
    cuentasEnLinea = cuentas || new Set(); pintarAmigos();
    const el = document.getElementById("mp2-enlinea"); if (!el) return;
    const otros = Math.max(0, total - 1), otrosBuscan = Math.max(0, buscando - (yoBusco ? 1 : 0));
    el.hidden = false;
    el.classList.toggle("solo", otros === 0);
    el.innerHTML = `<span class="mp2-punto"></span><span>${otros === 0 ? "Ahora mismo no hay nadie más. ¡Invita a un amigo!"
        : `<b class="num-pk">${otros}</b> ${otros === 1 ? "entrenador más" : "entrenadores más"} en el multijugador ahora mismo${otrosBuscan ? ` · <b class="num-pk">${otrosBuscan}</b> ${otrosBuscan === 1 ? "busca" : "buscan"} rival` : ""}`}</span>`;
}


// ---------- Amigos ----------
// Se guardan en este navegador. Se añaden al acabar un combate online; los conectados a Online se pueden retar.
const AMIGOS = "fc-amigos";
function amigos() { try { const l = JSON.parse(localStorage.getItem(AMIGOS)); return Array.isArray(l) ? l.filter((a) => a && typeof a.uid === "string") : []; } catch (_) { return []; } }
function guardarAmigos(l) { try { localStorage.setItem(AMIGOS, JSON.stringify(l.slice(0, 50))); } catch (_) {} }
const esAmigo = (uid) => amigos().some((a) => a.uid === uid);
function guardarAmigo(uid, nombre) { if (!uid) return; guardarAmigos([{ uid, nombre: textoLimpio(nombre) || "Entrenador", desde: Date.now() }, ...amigos().filter((a) => a.uid !== uid)]); pintarAmigos(); }
function quitarAmigo(uid) { guardarAmigos(amigos().filter((a) => a.uid !== uid)); pintarAmigos(); }
function pintarAmigos() {
    const cont = document.getElementById("mp2-amigos"); if (!cont) return;
    const l = amigos();
    cont.hidden = !l.length || !Ranking.activo();
    if (cont.hidden) return;
    const ordenados = [...l].sort((a, b) => Number(cuentasEnLinea.has(b.uid)) - Number(cuentasEnLinea.has(a.uid)));
    cont.innerHTML = `<span class="hub-etq">Amigos</span>` + ordenados.map((a) => {
        const on = cuentasEnLinea.has(a.uid);
        return `<div class="mp2-amigo ${on ? "on" : ""}"><span class="mp2-punto"></span><b>${textoLimpio(a.nombre)}</b><small>${on ? "en Online ahora" : "desconectado"}</small>
            ${on ? `<button class="btn-mini" data-retar="${a.uid}">Retar</button>` : ""}<button class="btn-mini mp2-quitar" data-quitar="${a.uid}" aria-label="Quitar de amigos" title="Quitar de amigos">×</button></div>`;
    }).join("") + `<p class="nota">Añade amigos al acabar un combate online.</p>`;
    cont.querySelectorAll("[data-retar]").forEach((b) => b.onclick = () => {
        const a = amigos().find((x) => x.uid === b.dataset.retar); if (!a) return;
        AudioFX.ui("select");
        crearSalaPvP((codigo) => {
            Presencia.retar(a.uid, { codigo, nombre: textoLimpio(hayPartida() ? entrenador.nombre : "") || "Entrenador" });
            estadoSala(`Has retado a ${textoLimpio(a.nombre)}. Esperando a que acepte…`);
        });
    });
    cont.querySelectorAll("[data-quitar]").forEach((b) => b.onclick = () => { AudioFX.ui("select"); quitarAmigo(b.dataset.quitar); });
}
// Un amigo te reta: aceptar entra en su sala.
function recibirReto(p) {
    const codigo = String(p.codigo || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5);
    if (codigo.length !== 5 || !esAmigo(p.de) || document.querySelector(".capa-reto") || !document.getElementById("mp2-sala")) return;
    const nombre = textoLimpio(p.nombre) || "Un amigo";
    const capa = document.createElement("div");
    capa.className = "capa-resumen capa-reto";
    capa.innerHTML = `<div class="resumen reto"><h3>¡Te retan!</h3><p><b>${nombre}</b> quiere combatir contigo ahora.</p>
        <div class="res-acciones"><button class="btn-grande" data-si>Aceptar</button><button class="btn-sec" data-no>Ahora no</button></div></div>`;
    document.body.appendChild(capa);
    AudioFX.ui("menu_open");
    const t = setTimeout(() => capa.remove(), 30000);
    capa.querySelector("[data-no]").onclick = () => { clearTimeout(t); capa.remove(); };
    capa.querySelector("[data-si]").onclick = () => { clearTimeout(t); capa.remove(); AudioFX.ui("select"); unirseSalaPvP(codigo); };
}

// ---------- Datos del jugador ----------
function datosPvP() {
    if (!entrenador.pvp) entrenador.pvp = { puntos: 1000, victorias: 0, derrotas: 0, historial: [] };
    return entrenador.pvp;
}
// Elo: lo que ganas (o pierdes) depende de los puntos del rival.
const eloNuevo = (mio, suyo, gano) => Math.round(mio + 32 * ((gano ? 1 : 0) - 1 / (1 + 10 ** ((suyo - mio) / 400))));
const textoLimpio = (t, n = 12) => String(t || "").replace(/[<>&"'`]/g, "").trim().slice(0, n);

// Equipo en el formato que se envía (y que las dos partidas usan igual): nivel 50, salud llena y datos completos.
function equipoValido(eq) {
    if (!Array.isArray(eq) || !eq.length) return null;
    const ev = (e) => {
        const out = {}; let total = 0;
        ["hp", "attack", "defense", "special-attack", "special-defense", "speed"].forEach((k) => {
            const v = Math.max(0, Math.min(EV_MAX, Math.floor(Number(e && e[k]) || 0), EV_TOTAL - total));
            if (v) { out[k] = v; total += v; }
        });
        return out;
    };
    return eq.slice(0, 6).map((s) => ({
        id: Math.max(1, Math.min(1025, Math.floor(Number(s && s.id)) || 1)), nivel: 50,
        objeto: typeof s.objeto === "string" ? s.objeto : null, bola: typeof s.bola === "string" ? s.bola : "poke-ball",
        mote: s.mote ? textoLimpio(s.mote) : null, shiny: !!s.shiny, genero: s.genero === "m" || s.genero === "f" ? s.genero : null,
        ev: ev(s.ev), naturaleza: NATURALEZAS[s.naturaleza] ? s.naturaleza : "hardy", habSlot: [1, 2, 3].includes(s.habSlot) ? s.habSlot : 1,
        teraTipo: TIPOS_TERA.includes(s.teraTipo) ? s.teraTipo : null,
        movimientos: (Array.isArray(s.movimientos) ? s.movimientos : []).filter((m) => m && typeof m.clave === "string").slice(0, 4)
            .map((m) => JSON.parse(JSON.stringify(m))),
    }));
}
// Los movimientos de un equipo se rehacen con los datos oficiales y solo valen los que su especie puede aprender
// (así nadie puede mandar un ataque inventado). Se hace igual con el equipo propio y con el del rival, para que las
// dos partidas tengan exactamente los mismos Pokémon.
async function movimientosSeguros(eq) {
    for (const s of eq) {
        let d = null;
        try { d = await cargarPokemon(s.id); } catch (_) { d = null; }
        const puede = d ? new Set(d.moves.map((m) => m.move.name)) : null;
        const claves = [...new Set(s.movimientos.map((m) => m.clave))].filter((k) => k === "struggle" || !puede || puede.has(k)).slice(0, 4);
        s.movimientos = (await Promise.all(claves.map(async (k) => {
            try { const { nivel: _, ...x } = movDeAPI(await cargarMovimiento(k), 1); return x; } catch (_) { return null; }
        }))).filter(Boolean);
    }
    return eq;
}
// Tu equipo: el de tu partida (o tres al azar si no tienes), con los movimientos con sus datos oficiales.
async function equipoPvP() {
    let specs;
    if (hayPartida() && entrenador.equipo.length) specs = await specsMiEquipo(false);
    else {
        specs = [];
        for (const p of especiesAleatorias(3)) {
            const d = await cargarPokemon(p.id);
            specs.push({ id: p.id, movimientos: await construirMovesetReal(d, 50), genero: generoAleatorio(p.id),
                naturaleza: naturalezaAleatoria(), habSlot: huecoAleatorio(d, 0.05) });
        }
    }
    for (const s of specs) {
        if (s.genero === undefined) s.genero = generoAleatorio(s.id);
        s.movimientos = await Promise.all((s.movimientos || []).slice(0, 4).map(async (m) => {
            try { const { nivel: _, ...x } = movDeAPI(await cargarMovimiento(m.clave), 1); return x; } catch (_) { return m; }
        }));
    }
    return equipoValido(specs);
}

// ---------- Pantalla ----------
function renderMultijugador() {
    Online.cerrar();
    const cont = document.getElementById("vista-multijugador");
    const partida = hayPartida(), d = partida ? datosPvP() : null;
    const hist = d && d.historial.length
        ? d.historial.map((h) => `<div class="mp2-fila ${h.gano ? "gano" : "perdio"}"><span>${h.gano ? "Victoria" : "Derrota"}</span><b>${h.rival}</b>
            <span class="num-pk">${h.delta >= 0 ? "+" : ""}${h.delta}</span></div>`).join("")
        : `<p class="nota">Aún no has combatido contra nadie.</p>`;
    cont.innerHTML = `
        <div class="cabecera-modo">
            <h2>Multijugador</h2>
            <p>Reta a otro entrenador con tu equipo. Todos los Pokémon luchan a nivel 50.</p>
        </div>
        <p class="mp2-enlinea" id="mp2-enlinea" hidden></p>
        <section class="panel mp2-ficha">
            <canvas id="mp2-jugador"></canvas>
            <div class="mp2-datos">
                <span class="hub-etq">${partida ? "Entrenador" : "Sin partida"}</span>
                <b>${partida ? entrenador.nombre || "Entrenador" : "Equipo al azar"}</b>
                ${d ? `<span class="mp2-puntos"><b class="num-pk">${d.puntos}</b> puntos · ${d.victorias} V · ${d.derrotas} D</span>`
                    : `<span class="mp2-puntos">Empieza una partida para luchar con tu equipo y guardar tus puntos.</span>`}
            </div>
            <div class="mp2-equipo">${partida ? entrenador.equipo.map((id) => htmlIcono(id, "mp2-icono", !!entrenador.capturados[id]?.shiny)).join("") : ""}</div>
        </section>
        <section class="panel mp2-sala" id="mp2-sala">
            <div class="op-seg mp2-formato" role="group" aria-label="Formato del combate">
                <button data-formato="individual" class="${formatoPvP() === "individual" ? "activa" : ""}">Individual</button><button data-formato="doble" class="${formatoPvP() === "doble" ? "activa" : ""}">Dobles</button>
            </div>
            <button class="btn-grande mp2-buscar" data-buscar>Buscar rival</button>
            <p class="nota">Lucha contra quien esté buscando rival ahora.</p>
            <span class="hub-etq mp2-o">Con un amigo</span>
            <div class="mp2-unirse">
                <button class="btn-sec" data-crear>Crear sala</button>
                <input id="mp2-codigo" maxlength="5" placeholder="Código" autocomplete="off" autocapitalize="characters" spellcheck="false" aria-label="Código de la sala">
                <button class="btn-sec" data-unirse>Unirse</button>
            </div>
            <p class="nota">Crea una sala y pásale el código a un amigo, o escribe el suyo.</p>
        </section>
        <section class="panel mp2-amigos" id="mp2-amigos" hidden></section>
        <section class="panel mp2-historial"><span class="hub-etq">Últimos combates</span>${hist}</section>
        <section class="panel mp2-mundial">
            <span class="hub-etq">Ranking mundial</span>
            <div class="mp2-ranking" id="mp2-ranking">${Ranking.activo() ? `<p class="mp2-estado"><span class="cargando"></span><span>Cargando el ranking…</span></p>`
                : `<p class="nota">El ranking mundial no está disponible ahora mismo.</p>`}</div>
        </section>`;
    if (Ranking.activo()) { pintarRanking(); Presencia.entrar(pintarEnLinea); Presencia.alReto(recibirReto); }
    pintarAmigos();
    cont.querySelectorAll("[data-formato]").forEach((b) => b.onclick = () => {
        config.formatoPvP = b.dataset.formato; guardarConfig(); AudioFX.ui("select");
        cont.querySelectorAll("[data-formato]").forEach((x) => x.classList.toggle("activa", x === b));
    });
    montarEntrenador(document.getElementById("mp2-jugador"), partida && entrenador.genero === "f" ? "player_f" : "player_m").then((el) => tamanoNativo(el, 1.5));
    pintarIconos(cont);
    const input = cont.querySelector("#mp2-codigo");
    input.oninput = () => { input.value = input.value.toUpperCase().replace(/[^A-Z0-9]/g, ""); };
    input.onkeydown = (e) => { if (e.key === "Enter") cont.querySelector("[data-unirse]").click(); };
    cont.querySelector("[data-buscar]").onclick = () => { AudioFX.ui("select"); buscarRivalPvP(); };
    cont.querySelector("[data-crear]").onclick = () => { AudioFX.ui("select"); crearSalaPvP(); };
    cont.querySelector("[data-unirse]").onclick = () => {
        const codigo = input.value.trim();
        if (codigo.length !== 5) { AudioFX.ui("error"); toast("Escribe el código de 5 letras de la sala."); return; }
        AudioFX.ui("select"); unirseSalaPvP(codigo);
    };
}
// Los 50 mejores del mundo y tu puesto.
async function pintarRanking() {
    const cont = document.getElementById("mp2-ranking"); if (!cont) return;
    try {
        if (hayPartida()) {
            await Ranking.registrar(textoLimpio(entrenador.nombre) || "Entrenador", entrenador.genero === "f" ? "f" : "m");
            await Ranking.resolverPendientes().catch(() => 0);   // (combates en los que el rival se fue sin terminar)
        }
        const [lista, yo] = await Promise.all([Ranking.top(50), Ranking.mio()]);
        const prev = Ranking.conTemporadas() ? await Ranking.campeones(temporadaAnterior()).catch(() => []) : [];
        if (!document.getElementById("mp2-ranking")) return;
        const filas = lista.map((j, i) => `<div class="mp2-rk ${j.id === Ranking.id() ? "yo" : ""}">
            <span class="num-pk">${i + 1}</span><b>${textoLimpio(j.nombre)}</b><span class="num-pk">${j.puntos}</span><small>${j.victorias} V · ${j.derrotas} D</small></div>`).join("");
        const hoy = new Date(), finMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate(), quedan = finMes - hoy.getDate() + 1;
        const cabecera = Ranking.conTemporadas() ? `<p class="mp2-temporada">Temporada de ${nombreTemporada(temporadaActual()).split(" de ")[0]} · ${quedan === 1 ? "último día" : `quedan ${quedan} días`}</p>`
            + (prev.length ? `<p class="mp2-campeones">Campeones de ${nombreTemporada(temporadaAnterior()).split(" de ")[0]}: ${prev.map((c, i) => `<b>${i + 1}.º ${textoLimpio(c.nombre)}</b> (${c.puntos})`).join(" · ")}</p>` : "") : "";
        cont.innerHTML = cabecera + (filas || `<p class="nota">Todavía no hay nadie en el ranking esta temporada. ¡Sé el primero!</p>`)
            + (yo && !lista.some((j) => j.id === yo.id) ? `<div class="mp2-rk yo"><span class="num-pk">${yo.puesto}</span><b>${textoLimpio(yo.nombre)}</b><span class="num-pk">${yo.puntos}</span><small>${yo.victorias} V · ${yo.derrotas} D</small></div>` : "");
        if (yo && hayPartida()) { const d = datosPvP(); d.puntos = yo.puntos; d.victorias = yo.victorias; d.derrotas = yo.derrotas; }
        const pts = document.querySelector(".mp2-puntos b.num-pk"); if (pts && yo) pts.textContent = yo.puntos;
    } catch (e) {
        console.warn("Ranking", e);
        if (document.getElementById("mp2-ranking")) cont.innerHTML = `<p class="nota">No se pudo cargar el ranking mundial. Revisa tu conexión.</p>`;
    }
}
function salaEsperando(titulo, codigo, estado) {
    const sala = document.getElementById("mp2-sala"); if (!sala) return null;
    sala.innerHTML = `<span class="hub-etq">${titulo}</span>
        <div class="mp2-codigo">${codigo}</div>
        <p class="mp2-estado"><span class="cargando"></span><span>${estado}</span></p>
        <button class="btn-sec" data-cancelar>Cancelar</button>`;
    sala.querySelector("[data-cancelar]").onclick = () => { AudioFX.ui("select"); renderMultijugador(); };
    const cod = sala.querySelector(".mp2-codigo");
    if (cod && /^[A-Z0-9]{5}$/.test(codigo)) {
        cod.classList.add("copiable"); cod.title = "Toca para copiar el código";
        cod.onclick = () => navigator.clipboard.writeText(codigo).then(() => toast(`Código ${codigo} copiado.`)).catch(() => {});
    }
    return sala;
}
const estadoSala = (txt) => { const e = document.querySelector("#mp2-sala .mp2-estado span:last-child"); if (e) e.textContent = txt; };
const formatoPvP = () => (config.formatoPvP === "doble" ? "doble" : "individual");
// Partida abierta: se empareja con cualquiera que esté buscando (en el mismo formato).
async function buscarRivalPvP() {
    const sala = salaEsperando(formatoPvP() === "doble" ? "Partida abierta · Dobles" : "Partida abierta", "", "Buscando rival…");
    if (!sala) return;
    sala.querySelector(".mp2-codigo").outerHTML = `<b class="mp2-tiempo num-pk">0:00</b>`;
    const t0 = Date.now();
    const reloj = setInterval(() => {
        const el = document.querySelector("#mp2-sala .mp2-tiempo");
        if (!el) return clearInterval(reloj);
        const seg = Math.floor((Date.now() - t0) / 1000);
        el.textContent = `${Math.floor(seg / 60)}:${String(seg % 60).padStart(2, "0")}`;
        if (seg === 45) estadoSala("Aún no hay nadie más buscando. Puedes seguir esperando o retar a un amigo con un código.");
    }, 1000);
    Presencia.buscando(true);
    try {
        const r = await Online.buscarPartida((e) => { if (e === "esperando") estadoSala("Esperando a otro entrenador…"); }, formatoPvP());
        Presencia.buscando(false);
        clearInterval(reloj);
        if (!r || !document.getElementById("mp2-sala")) return;
        await empezarPvP(r.anfitrion);
    } catch (e) { Presencia.buscando(false); clearInterval(reloj); errorPvP(e); }
}
async function crearSalaPvP(alCodigo) {
    const titulo = formatoPvP() === "doble" ? "Tu sala · Dobles" : "Tu sala";
    salaEsperando(titulo, "·····", "Abriendo la sala…");
    try {
        const { codigo, conectado } = await Online.crearSala();
        const sala = salaEsperando(titulo, codigo, "Pásale este código a tu rival. Esperando…");
        if (!sala) return;
        if (typeof alCodigo === "function") alCodigo(codigo);
        sala.querySelector("[data-cancelar]").insertAdjacentHTML("beforebegin", `<button class="btn-grande mp2-invitar" data-invitar>${navigator.share ? "Invitar a un amigo" : "Copiar enlace de invitación"}</button>`);
        sala.querySelector("[data-invitar]").onclick = () => { AudioFX.ui("select"); invitarSala(codigo); };
        await conectado;
        if (!document.getElementById("mp2-sala")) return;
        await empezarPvP(true);
    } catch (e) { errorPvP(e); }
}
// El enlace de invitación abre el juego y entra directamente en la sala (?sala=CODIGO, ver iniciar en script.js).
async function invitarSala(codigo) {
    const url = `${location.origin}${location.pathname}?sala=${codigo}`;
    const texto = `¡Te reto a un combate en Pokémon Furia Carmesí! Entra con este enlace o escribe el código ${codigo} en Online.`;
    if (navigator.share) {
        try { await navigator.share({ title: "Pokémon Furia Carmesí", text: texto, url }); return; } catch (e) { if (e && e.name === "AbortError") return; }
    }
    try { await navigator.clipboard.writeText(`${texto} ${url}`); toast("Enlace copiado: pásaselo a tu amigo."); }
    catch (_) { window.prompt("Copia este enlace y pásaselo a tu amigo:", url); }
}
async function unirseSalaPvP(codigo) {
    salaEsperando("Sala", codigo, "Conectando…");
    try {
        await Online.unirse(codigo);
        await empezarPvP(false);
    } catch (e) { errorPvP(e); }
}
async function empezarPvP(anfitrion) {
    estadoSala("¡Conectado! Preparando el combate…");
    AudioFX.ui("select");
    const mio = await movimientosSeguros(await equipoPvP());
    let uid = null;   // cuenta del ranking mundial (si está conectado y tienes partida)
    if (Ranking.activo() && hayPartida()) {
        try { const r = await Ranking.registrar(textoLimpio(entrenador.nombre) || "Entrenador", entrenador.genero === "f" ? "f" : "m"); uid = Ranking.id(); if (r) Object.assign(datosPvP(), { puntos: r.puntos, victorias: r.victorias, derrotas: r.derrotas }); } catch (_) { uid = null; }
    }
    const yo = { t: "hola", v: VERSION_PVP, nombre: textoLimpio(hayPartida() ? entrenador.nombre : "") || "Entrenador", uid,
        cuenta: Ranking.id() || null, formato: formatoPvP(),
        genero: hayPartida() && entrenador.genero === "f" ? "f" : "m", puntos: hayPartida() ? datosPvP().puntos : 1000, equipo: mio };
    Online.enviar(yo);
    const el = await Online.recibir("hola");
    if (el.fin) throw { type: "desconexion" };
    if (el.v !== VERSION_PVP) throw { type: "version" };
    const suyo = equipoValido(el.equipo);
    if (!suyo) throw { type: "equipo" };
    await movimientosSeguros(suyo);
    // El anfitrión decide el formato (dobles solo si los dos tienen al menos dos Pokémon), la semilla del azar y el escenario.
    let semilla, fondo, formato;
    if (anfitrion) {
        semilla = (Math.random() * 4294967296) >>> 0; fondo = alAzar(FONDOS);
        formato = formatoPvP() === "doble" && mio.length >= 2 && suyo.length >= 2 ? "doble" : "individual";
        Online.enviar({ t: "empezar", semilla, fondo, formato });
    } else {
        const e = await Online.recibir("empezar");
        if (e.fin) throw { type: "desconexion" };
        semilla = Number(e.semilla) >>> 0; fondo = typeof e.fondo === "string" ? e.fondo : "route";
        formato = e.formato === "doble" && mio.length >= 2 && suyo.length >= 2 ? "doble" : "individual";
    }
    const rival = textoLimpio(el.nombre) || "Rival", sprite = el.genero === "f" ? "player_f" : "player_m";
    // Ranking mundial: los dos avisan al servidor de que el combate empieza y, nada más acabar, de quién ha ganado.
    const mundial = uid && typeof el.uid === "string" && el.uid !== uid ? { combate: `${semilla}-${[uid, el.uid].sort().join("-")}`, rival: el.uid, envio: null } : null;
    if (mundial) await Promise.race([Ranking.empezar(mundial.combate, mundial.rival).catch(() => null), new Promise((ok) => setTimeout(ok, 4000))]);
    const informarYa = (gano) => { if (mundial && !mundial.envio) mundial.envio = Ranking.informar(mundial.combate, mundial.rival, gano).then(() => true, () => false); };
    const puntosRival = Math.max(0, Math.min(5000, Number(el.puntos) || 1000));
    try {
        mostrarCargaBatalla({ vs: true, sprite, titulo: `${rival} · ${puntosRival} puntos` });
        const tema = alAzar([...MUSICA.rivales, ...MUSICA.campeones]);   // combates online: temas de rival y de Campeón
        AudioFX.musicaSonar(tema);
        const [aliados, enemigos] = await Promise.all([prepararEquipo(mio), prepararEquipo(suyo)]);
        const pvp = { anfitrion, semilla, enviar: Online.enviar, recibir: Online.recibir, alFin: Online.alFin, alResultado: informarYa };
        const info = { rival, puntosRival, mundial, anfitrion, cuentaRival: typeof el.cuenta === "string" && el.cuenta !== Ranking.id() ? el.cuenta : null };
        const alTerminar = (r) => { if (r && (r.gano === true || r.gano === false)) informarYa(r.gano); return terminarPvP(r, info); };
        enCombateOnline = true;
        if (formato === "doble") {
            Dobles.iniciar({ aliados, enemigos, titulo: rival, entrenadorSprite: sprite, fondo, musica: tema, dialogo: "¡Que gane el mejor!", dialogoDerrota: "¡Buen combate!", pvp, alTerminar })
                .catch(() => { Online.cerrar(); errorCombate(); renderMultijugador(); });
        } else Combate.iniciar({
            aliados, enemigos, salvaje: false, permitirCaptura: false, titulo: rival, entrenadorSprite: sprite, fondo, musica: tema,
            dialogo: "¡Que gane el mejor!", dialogoDerrota: "¡Buen combate!", generoJugador: hayPartida() ? entrenador.genero : "m", pvp, alTerminar,
        });
    } catch (_) { enCombateOnline = false; Online.cerrar(); errorCombate(); renderMultijugador(); }
}
// En pleno combate online, cerrar la pestaña lo pierde: el navegador pregunta antes.
let enCombateOnline = false;
window.addEventListener("beforeunload", (e) => { if (enCombateOnline) { e.preventDefault(); e.returnValue = ""; } });
// Al acabar: el resultado (ranking), la revancha (si los dos quieren) y, si no, de vuelta a Online.
async function terminarPvP(r, info) {
    enCombateOnline = false;
    await anotarResultado(r, info.rival, info.puntosRival, info.mundial);
    let otra = false;
    try { otra = await revancha(info); } catch (_) { otra = false; }
    if (otra) return empezarPvP(info.anfitrion).catch(errorPvP);
    Online.cerrar();
    mostrarVista("multijugador");
}
// Revancha: los dos tienen que quererla (30 segundos para decidir). También deja apuntar al rival como amigo.
function revancha(info) {
    return new Promise((resolver) => {
        const capa = document.createElement("div");
        capa.className = "capa-resumen capa-revancha";
        const puedeAmigo = info.cuentaRival && Ranking.activo() && !esAmigo(info.cuentaRival);
        capa.innerHTML = `<div class="resumen revancha"><h3>¿La revancha?</h3>
            <p>¿Otro combate contra <b>${info.rival}</b>?</p>
            <p class="nota rv-estado"><b class="num-pk rv-seg">30</b> s</p>
            ${puedeAmigo ? `<button class="btn-sec rv-amigo" data-amigo>Añadir a ${info.rival} a mis amigos</button>` : ""}
            <div class="res-acciones"><button class="btn-grande" data-si>Revancha</button><button class="btn-sec" data-no>Salir</button></div></div>`;
        document.body.appendChild(capa);
        AudioFX.ui("menu_open");
        let fase = "elegir", seg = 30, suya = null;
        const est = capa.querySelector(".rv-estado");
        const acabar = (v, aviso) => {
            if (fase === "fin") return;
            fase = "fin"; clearInterval(reloj); capa.remove(); Online.alFin(null);
            if (aviso) toast(aviso, 2600);
            resolver(v);
        };
        const reloj = setInterval(() => {
            seg--; const s = capa.querySelector(".rv-seg"); if (s) s.textContent = Math.max(0, seg);
            if (seg > 0) return;
            if (fase === "elegir") { Online.enviar({ t: "revancha", si: false }); acabar(false); }
            else acabar(false, `${info.rival} no ha respondido.`);
        }, 1000);
        Online.recibir("revancha").then((rr) => {
            suya = rr;
            if (fase === "fin") return;
            if (!rr || rr.fin) return acabar(false, `${info.rival} se ha ido.`);
            if (!rr.si) return acabar(false, `${info.rival} no quiere la revancha.`);
            if (fase === "esperando") return acabar(true);
            est.innerHTML = `¡<b>${info.rival}</b> quiere la revancha!`;
        });
        const ba = capa.querySelector("[data-amigo]");
        if (ba) ba.onclick = () => { guardarAmigo(info.cuentaRival, info.rival); ba.disabled = true; ba.textContent = `${info.rival} ya es tu amigo`; AudioFX.ui("select"); };
        capa.querySelector("[data-no]").onclick = () => { AudioFX.ui("select"); Online.enviar({ t: "revancha", si: false }); acabar(false); };
        capa.querySelector("[data-si]").onclick = (ev) => {
            if (fase !== "elegir") return;
            AudioFX.ui("select");
            ev.currentTarget.disabled = true; fase = "esperando"; seg = 30;
            Online.enviar({ t: "revancha", si: true });
            if (suya && suya.si) return acabar(true);
            est.innerHTML = `<span class="cargando"></span> Esperando a ${info.rival}…`;
        };
    });
}
async function anotarResultado(r, rival, puntosRival, mundial) {
    // Ranking mundial: informa del resultado; los puntos los pone el servidor cuando tu rival diga lo mismo.
    if (mundial && r && (r.gano === true || r.gano === false)) {
        const antes = datosPvP().puntos;
        try {
            if (!(await mundial.envio)) throw new Error("sin-envio");
            for (let i = 0; i < 4; i++) {   // espera un poco a que informe también el rival
                const yo = await Ranking.mio();
                if (yo && (yo.victorias + yo.derrotas) > (datosPvP().victorias + datosPvP().derrotas)) {
                    const d = datosPvP(), dif = yo.puntos - antes;
                    Object.assign(d, { puntos: yo.puntos, victorias: yo.victorias, derrotas: yo.derrotas });
                    d.historial = [{ rival, gano: r.gano, delta: dif, fecha: Date.now() }, ...d.historial].slice(0, 12);
                    guardarEntrenador();
                    toast(`${r.gano ? "¡Victoria!" : "Derrota."} ${dif >= 0 ? "+" : ""}${dif} puntos · puesto ${yo.puesto}`, 3400);
                    return;
                }
                await new Promise((ok) => setTimeout(ok, 1500));
            }
            toast("Resultado enviado al ranking.", 2600);
        } catch (_) { toast("No se pudo enviar el resultado al ranking.", 2800); }
        return;
    }
    if (hayPartida() && r && (r.gano === true || r.gano === false)) {
        const d = datosPvP(), antes = d.puntos;
        d.puntos = Math.max(0, eloNuevo(d.puntos, puntosRival, r.gano));
        if (r.gano) d.victorias++; else d.derrotas++;
        d.historial = [{ rival, gano: r.gano, delta: d.puntos - antes, fecha: Date.now() }, ...d.historial].slice(0, 12);
        guardarEntrenador();
        const dif = d.puntos - antes;
        toast(`${r.gano ? "¡Victoria!" : "Derrota."} ${dif >= 0 ? "+" : ""}${dif} puntos: ahora tienes ${d.puntos}.`, 3400);
    }
}
function errorPvP(e) {
    const t = e && e.type;
    const txt = t === "peer-unavailable" ? "No hay ninguna sala con ese código."
        : t === "version" ? "Tu rival tiene otra versión del juego: actualizad los dos."
        : t === "desconexion" ? "Se ha perdido la conexión con tu rival."
        : t === "sala-llena" ? "Esa sala ya tiene dos entrenadores."
        : t === "equipo" ? "El equipo de tu rival no es válido."
        : t === "sin-conexion" ? "No se pudo conectar con tu rival. Probad con otra red."
        : "No se pudo conectar. Comprueba tu conexión a internet.";
    Online.cerrar();
    AudioFX.ui("error");
    toast(txt, 3600);
    if (document.getElementById("vista-multijugador") && !document.getElementById("vista-multijugador").classList.contains("oculta")) renderMultijugador();
}
