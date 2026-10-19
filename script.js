/* =========================================================
   POKÉMON FURIA CARMESÍ · Aplicación principal
   Router, inicio, aventura (Región Aurelia: 16 gimnasios, Liga, rivales,
   equipos villanos, Pokémon Furiosos y revanchas), minijuegos y Pokédex.
   ========================================================= */

// ===================== ESTADO PERSISTENTE (3 ranuras de guardado) =====================
const config = {
    sonido: true, tema: "oscuro", expShare: true, velocidad: 1, modoAventura: "region",
    disposicion: window.innerWidth >= 1000 && window.innerWidth > window.innerHeight * 1.3 ? "horizontal" : "vertical",
};
const entrenadorNuevo = () => ({
    nombre: "", genero: "m", starter: null,
    capturados: {},     // id -> { nivel, xp, objeto, bola, movimientos, nivelCaptura, genero, mote, shiny, ev, hp, estado }
    equipo: [],         // ids (máx 6)
    medallas: [],       // nº de gimnasio conseguidos (1..16)
    eventos: [],        // rivales y misiones villanas completadas
    progreso: null,     // objetivos del gimnasio actual
    campeon: false, batallasGanadas: 0, mejorRacha: 0,
    mochila: { "poke-ball": 10, "great-ball": 5, potion: 5, "super-potion": 1, revive: 1, "exp-share": 1 },
    dinero: 3000, tiempo: 0, creada: Date.now(), guardada: Date.now(),
});
const entrenador = entrenadorNuevo();
const RANURAS = [1, 2, 3];
let ranuraActiva = 0;   // 0 = ninguna partida cargada
const claveRanura = (n) => "partida_" + n;
function leerRanura(n) { try { return JSON.parse(localStorage.getItem(claveRanura(n))); } catch (_) { return null; } }
function ponerEntrenador(datos) {
    Object.keys(entrenador).forEach((k) => delete entrenador[k]);
    Object.assign(entrenador, entrenadorNuevo(), datos || {});
    ["medallas", "eventos", "equipo"].forEach((k) => { if (!Array.isArray(entrenador[k])) entrenador[k] = []; });
    // Partidas anteriores: «bolas» con claves propias y megapiedras sueltas → mochila con las claves oficiales.
    if (datos && !datos.mochila) {
        entrenador.mochila = {};
        Object.entries(datos.bolas || {}).forEach(([k, n]) => { if (n > 0) meterObjeto(claveObj(k), n); });
        (datos.piedras || []).forEach((st) => { if (!Object.values(entrenador.capturados).some((c) => c.objeto === st)) entrenador.mochila[st] = 1; });
    }
    delete entrenador.bolas; delete entrenador.piedras;
    Object.values(entrenador.capturados).forEach((c) => {
        c.bola = claveObj(c.bola || "poke-ball");
        // Partidas de antes de las naturalezas y las habilidades: se les da una a cada Pokémon.
        if (!NATURALEZAS[c.naturaleza]) c.naturaleza = naturalezaAleatoria();
        if (![1, 2, 3].includes(c.habSlot)) c.habSlot = Math.random() < 0.5 ? 1 : 2;
    });
    if (!entrenador.mochila["exp-share"]) entrenador.mochila["exp-share"] = 1;
}
function cargarTodo() {
    try { Object.assign(config, JSON.parse(localStorage.getItem("config_pokearcade")) || {}); } catch (_) {}
    // Partida de versiones anteriores → ranura 1.
    const vieja = localStorage.getItem("entrenador_v2");
    if (vieja && !RANURAS.some((n) => localStorage.getItem(claveRanura(n)))) {
        escribirLocal(claveRanura(1), vieja); escribirLocal("partida_activa", "1");
    }
    localStorage.removeItem("entrenador_v2");
    const n = Number(localStorage.getItem("partida_activa")) || 0;
    const datos = n ? leerRanura(n) : null;
    ranuraActiva = datos ? n : 0;
    ponerEntrenador(datos);
}
let avisoSinGuardar = false;
function escribirLocal(clave, valor) {
    try { localStorage.setItem(clave, valor); return true; }
    catch (_) {
        if (!avisoSinGuardar && typeof toast === "function") {
            avisoSinGuardar = true;
            toast("No se pudo guardar la partida. Haz una copia de seguridad desde «Cargar partida».", 5000);
        }
        return false;
    }
}
function guardarConfig()     { escribirLocal("config_pokearcade", JSON.stringify(config)); }
function guardarEntrenador() {
    if (!ranuraActiva) return;
    if (typeof revisarLogros === "function") revisarLogros();   // (logros conseguidos desde la última vez)
    entrenador.guardada = Date.now();
    if (escribirLocal(claveRanura(ranuraActiva), JSON.stringify(entrenador))) escribirLocal("partida_activa", String(ranuraActiva));
}
function cargarRanura(n) {
    const datos = leerRanura(n); if (!datos) return false;
    ranuraActiva = n; ponerEntrenador(datos); guardarEntrenador(); subAventura = "principal";
    return true;
}
function nuevaPartida(n) {
    ranuraActiva = n; ponerEntrenador(null); guardarEntrenador(); subAventura = "principal";
    mostrarVista("aventura");
}
function borrarRanura(n) {
    localStorage.removeItem(claveRanura(n));
    if (n === ranuraActiva) { ranuraActiva = 0; ponerEntrenador(null); localStorage.removeItem("partida_activa"); }
}
const hayPartida = () => ranuraActiva > 0 && !!entrenador.starter;
const VERSION_JUEGO = "Beta 0.9";
const tiempoTexto = (seg) => { const m = Math.floor((seg || 0) / 60); return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")} min`; };
const dineroTexto = (n) => `${numES(n)} ₽`;
// Tiempo de juego (solo con la pestaña visible y una partida en curso).
setInterval(() => { if (hayPartida() && !document.hidden) { entrenador.tiempo = (entrenador.tiempo || 0) + 30; guardarEntrenador(); } }, 30000);
const poolBatalla = () => TODOS;

// ===================== UTILIDADES DE UI =====================
function toast(msg, ms = 2400) {
    const t = document.getElementById("toast");
    t.textContent = msg;
    t.classList.remove("oculta");
    clearTimeout(t._id);
    t._id = setTimeout(() => t.classList.add("oculta"), ms);
}
function lanzarConfeti() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const colores = ["#ffcb05", "#3c5aa6", "#ee1515", "#4caf50", "#f95587"];
    for (let i = 0; i < 26; i++) {
        const c = document.createElement("div");
        c.className = "confeti";
        c.style.left = Math.random() * 100 + "vw";
        c.style.background = alAzar(colores);
        c.style.animationDuration = (1 + Math.random() * 0.8) + "s";
        c.style.animationDelay = Math.random() * 0.2 + "s";
        document.body.appendChild(c);
        setTimeout(() => c.remove(), 2200);
    }
}
const sonarAcierto = () => AudioFX.ui("select");
const sonarFallo = () => AudioFX.ui("error");
function aplicarTema() {
    document.body.classList.toggle("tema-claro", config.tema === "claro");
    document.documentElement.style.colorScheme = config.tema === "claro" ? "light" : "dark";
    // Marco de las ventanas (los cinco de PokéRogue)
    [1, 2, 3, 4, 5].forEach((n) => document.body.classList.toggle("ventana-" + n, String(config.ventana || 3) === String(n)));
}
function especiesAleatorias(n, excluir = new Set(), pool = TODOS) {
    const specs = [], usados = new Set(excluir);
    let guardia = 0;
    while (specs.length < n && guardia++ < 500) {
        const p = alAzar(pool);
        if (!usados.has(p.id)) { usados.add(p.id); specs.push(p); }
    }
    return specs;
}
const nombrePk = (id) => nombreBonito(NOMBRE_POR_ID[id] || "");
// Mote si lo tiene (como en los juegos), si no el nombre de la especie.
const nombreDe = (id) => entrenador.capturados[id]?.mote || nombrePk(id);
const htmlGenero = (g) => (g ? `<span class="genero-${g}">${g === "f" ? "♀" : "♂"}</span>` : "");

// ===================== ROUTER DE VISTAS =====================
const TITULOS_VISTA = { batalla: "Batalla", aventura: "Aventura", multijugador: "Online", quiz: "Adivina", duelo: "Duelo", memoria: "Memoria", pokedex: "Pokédex" };
let vistaActual = "inicio";
function mostrarVista(nombre, desdeHistorial = false) {
    if (!desdeHistorial && nombre !== vistaActual) { try { history.pushState({ vista: nombre }, ""); } catch (_) {} }
    vistaActual = nombre;
    document.title = TITULOS_VISTA[nombre] ? `${TITULOS_VISTA[nombre]} · Pokémon Furia Carmesí` : "Pokémon Furia Carmesí";
    document.querySelectorAll(".vista").forEach((v) => v.classList.add("oculta"));
    const vista = document.getElementById("vista-" + nombre);
    if (vista) vista.classList.remove("oculta");
    document.querySelectorAll(".nav-btn").forEach((b) => b.classList.toggle("activa", b.dataset.vista === nombre));
    if (nombre !== "aventura") { if (MUSICA.vistas[nombre]) AudioFX.musicaSonar(MUSICA.vistas[nombre]); else AudioFX.pararMusica(); }
    if (nombre === "inicio")   renderInicio();
    if (nombre === "batalla")  renderBatalla();
    if (nombre === "aventura") renderAventura();
    if (nombre === "quiz")     iniciarQuizSiHaceFalta();
    if (nombre === "duelo")    renderDuelo();
    if (nombre === "memoria")  renderMemoria();
    if (nombre === "pokedex")  aplicarFiltrosDex();
    if (nombre === "multijugador") renderMultijugador(); else if (typeof Online !== "undefined") { Online.cerrar(); Presencia.salir(); }
    window.scrollTo({ top: 0, behavior: "smooth" });
}

// ===================== INICIO =====================
const ICONOS = {
    batalla:  '<svg viewBox="0 0 24 24" fill="currentColor"><path opacity=".32" d="M3 3h3l8.6 8.6-3 3L3 6V3zm18 0h-3l-8.6 8.6 3 3L21 6V3z"/><path d="M15.1 13.3 20.3 18.5c.4.4.4 1.1 0 1.5l-.3.3c-.4.4-1.1.4-1.5 0l-5.2-5.2 1.8-1.8zM8.9 13.3 3.7 18.5c-.4.4-.4 1.1 0 1.5l.3.3c.4.4 1.1.4 1.5 0l5.2-5.2-1.8-1.8z"/></svg>',
    quiz:     '<svg viewBox="0 0 24 24"><path fill="currentColor" fill-opacity=".85" d="M12 2.2c-.9 0-1.6.5-2 1.2-.7-.3-1.7 0-1.7 1 0 .4.2.8.5 1C6.6 7.2 5.2 9.5 5.2 12.2 5.2 16.5 8.3 20 12 20s6.8-3.5 6.8-7.8c0-2.7-1.4-5-3.6-6.8.3-.2.5-.6.5-1 0-1-1-1.3-1.7-1-.4-.7-1.1-1.2-2-1.2z"/><path fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" d="M10.6 10.4a1.6 1.6 0 0 1 3 .6c0 1-1.5 1.4-1.5 2.4"/><circle cx="12" cy="16" r="1.05" fill="#fff"/></svg>',
    duelo:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.2v17.6M6 21h12"/><path d="M5 7.5h14"/><path fill="currentColor" fill-opacity=".28" stroke="none" d="M5 7.5 2.2 13.4h5.6L5 7.5zm14 0-2.8 5.9h5.6L19 7.5z"/><path d="M2.2 13.4a2.8 2.8 0 0 0 5.6 0M16.2 13.4a2.8 2.8 0 0 0 5.6 0"/></svg>',
    memoria:  '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="2.5" y="6" width="10" height="14" rx="2.2" opacity=".32" transform="rotate(-9 7.5 13)"/><rect x="10.5" y="4" width="11" height="15.5" rx="2.4"/><circle cx="16" cy="11.75" r="2.5" fill="#fff"/><circle cx="16" cy="11.75" r="1" fill="currentColor"/></svg>',
    pokedex:  '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="18" height="18" rx="3.2" opacity=".3"/><circle cx="8" cy="8" r="2.6"/><circle cx="8" cy="8" r="1" fill="#fff"/><rect x="12.6" y="6.4" width="6" height="3.2" rx="1.3"/><rect x="5.4" y="13" width="13.2" height="2.4" rx="1.2"/><rect x="5.4" y="16.6" width="8.4" height="2.4" rx="1.2"/></svg>',
};

// Hora del día (como el ciclo día/noche de Blanco 2).
function claseHora() { const h = new Date().getHours(); return h >= 20 || h < 6 ? "noche" : h >= 18 ? "tarde" : "dia"; }

function renderInicio() {
    const cont = document.getElementById("vista-inicio");
    const juegos = [
        { v: "batalla", t: "Combate rápido" }, { v: "multijugador", t: "Multijugador" }, { v: "quiz", t: "Adivina" }, { v: "duelo", t: "Duelo" },
        { v: "memoria", t: "Memoria" }, { v: "pokedex", t: "Pokédex" },
    ];
    const partida = hayPartida();
    const medallas = GIMNASIOS.filter((g) => entrenador.medallas.includes(g.n))
        .map((g) => `<img src="${urlMedalla(g.medalla)}" alt="${g.nombreMedalla}" title="${g.nombreMedalla}">`).join("");
    // Como el menú de inicio de Blanco/Negro 2: «Continuar» con los datos de la partida.
    const minutos = Math.floor((entrenador.tiempo || 0) / 60);
    cont.innerHTML = `
        <section class="portada">
            <div class="portada-escena hora-${claseHora()}" style="background-image:url('${urlFondo(partida ? "route" : "meadow")}')">
                <div class="portada-titulo"><h2>Pokémon<br><span class="titulo-furia">Furia Carmesí</span></h2></div>
                <div class="portada-personajes">
                    <canvas id="portada-jugador" class="portada-sprite"></canvas>
                    ${partida ? `<img id="portada-poke" class="portada-sprite poke" alt="">` : `<canvas id="portada-jugadora" class="portada-sprite"></canvas>`}
                </div>
            </div>
            <div class="portada-menu">
                ${partida ? `
                <button class="menu-op principal" data-continuar>
                    <span class="mo-titulo">Continuar</span>
                    <span class="mo-tabla">
                        <span>Jugador</span><b>${entrenador.campeon ? `<img class="mo-cinta" src="${PR_UI("champion_ribbon.png")}" alt="Campeón" title="Campeón">` : ""}${entrenador.nombre || "Entrenador"}</b>
                        <span>Pokédex</span><b class="num-pk">${Object.keys(entrenador.capturados).length}</b>
                        <span>Tiempo</span><b class="num-pk">${Math.floor(minutos / 60)}:${String(minutos % 60).padStart(2, "0")}</b>
                        <span>Medallas</span><b class="num-pk">${entrenador.medallas.length}</b>
                    </span>
                    ${medallas ? `<span class="mo-medallas">${medallas}</span>` : ""}
                </button>` : ""}
                <button class="menu-op" data-nueva>Nueva partida</button>
                <button class="menu-op" data-cargar>Cargar partida</button>
            </div>
        </section>
        <div class="mini-juegos">
            ${juegos.map((j) => `<button class="mini-juego" data-ir="${j.v}"><span class="mj-icono">${ICONOS[j.v] || `<img src="${urlItem("vs-seeker")}" alt="">`}</span>${j.t}</button>`).join("")}
        </div>
        ${portadaExtraHTML(partida)}`;
    const pintarSprite = (el) => tamanoNativo(el, 2);
    montarEntrenador(document.getElementById("portada-jugador"), partida && entrenador.genero === "f" ? "player_f" : "player_m").then(pintarSprite);
    if (partida) montarPokemon(document.getElementById("portada-poke"), entrenador.equipo[0]).then(pintarSprite);
    else montarEntrenador(document.getElementById("portada-jugadora"), "player_f").then(pintarSprite);
    cont.querySelectorAll("[data-ir]").forEach((b) => b.onclick = () => mostrarVista(b.dataset.ir));
    const bc = cont.querySelector("[data-continuar]"); if (bc) bc.onclick = () => { subAventura = "principal"; mostrarVista("aventura"); };
    cont.querySelector("[data-nueva]").onclick = () => abrirRanuras("nueva");
    cont.querySelector("[data-cargar]").onclick = () => abrirRanuras("cargar");
    conectarPortadaExtra(cont);
}
// ---- Debajo de la portada: el Pokémon del día, tu siguiente objetivo, las novedades y lo que hay en el juego ----
// El Pokémon del día: el mismo para todos durante el día (sale de la fecha).
const pokemonDelDia = () => { const d = new Date(), k = d.getFullYear() * 372 + d.getMonth() * 31 + d.getDate(); return (Math.imul(k, 2654435761) >>> 0) % TOTAL_NACIONAL + 1; };
function siguienteObjetivo() {
    if (!hayPartida()) return null;
    const g = siguienteGimnasio();
    if (g) return { icono: urlMedalla(g.medalla), etq: "Siguiente gimnasio", txt: `${g.ciudad}: Líder ${g.nombre}`, sub: `Tipo ${TIPOS_ES[g.tipo]} · Nv. ${g.nivel} aprox.` };
    if (!entrenador.campeon) return { icono: PR_UI("champion_ribbon.png"), etq: "Siguiente objetivo", txt: "La Liga Pokémon", sub: "El Alto Mando y la Campeona Iris te esperan." };
    return { icono: PR_UI("champion_ribbon.png"), etq: "Eres Campeón de Aurelia", txt: "Torneo Corona y leyendas", sub: "Rayquaza, Darkrai y los Campeones de otras regiones te esperan." };
}
function portadaExtraHTML(partida) {
    const id = pokemonDelDia(), nov = NOVEDADES[0], meta = siguienteObjetivo();
    const cifras = [[TOTAL_NACIONAL, "Pokémon"], [Object.keys(MEGAS).length + 1, "megaevoluciones"], [Object.keys(LUGARES).length, "lugares"], [GIMNASIOS.length, "gimnasios"],
        [CLASES_ENTRENADOR.length, "clases de entrenador"], [LOGROS.length, "logros"]];
    return `<section class="inicio-extra">
        <article class="inicio-tarjeta pk-dia" data-pk-dia="${id}">
            <span class="hub-etq">Pokémon del día</span>
            <div class="pk-dia-cuerpo">
                <div class="pk-dia-escena"><img id="pk-dia-spr" alt=""></div>
                <div class="pk-dia-info"><b class="pk-dia-nombre">Nº ${String(id).padStart(4, "0")} · ${nombrePk(id)}</b><div class="pk-dia-tipos"></div><p class="pk-dia-texto">Consultando la Pokédex…</p></div>
            </div>
            <button class="btn-mini" data-pk-dia-ver>Ver en la Pokédex</button>
        </article>
        <div class="inicio-columna">
            ${meta ? `<article class="inicio-tarjeta objetivo"><img src="${meta.icono}" alt=""><div><span class="hub-etq">${meta.etq}</span><b>${meta.txt}</b><small>${meta.sub}</small></div></article>` : `
            <article class="inicio-tarjeta objetivo"><img src="${urlItem("poke-ball")}" alt=""><div><span class="hub-etq">Empieza tu aventura</span><b>La región de Aurelia</b><small>16 gimnasios, la Liga, Pokémon Furiosos y legendarios.</small></div></article>`}
            <article class="inicio-tarjeta novedades">
                <span class="hub-etq">Novedades · ${nov.titulo}</span>
                <ul>${nov.lista.slice(0, 3).map(([ic, txt]) => `<li><img src="${iconoGuia(ic)}" alt=""><span>${txt.length > 110 ? txt.slice(0, 108).replace(/\s\S*$/, "") + "…" : txt}</span></li>`).join("")}</ul>
                <button class="btn-mini" data-novedades-ver>Ver todas</button>
            </article>
        </div>
        <article class="inicio-tarjeta cifras">
            <span class="hub-etq">En el juego</span>
            <div class="cifras-rejilla">${cifras.map(([n, txt]) => `<div><b class="num-pk">${numES(n)}</b><small>${txt}</small></div>`).join("")}</div>
        </article>
    </section>
    <footer class="pie-web">
        <p><b>Pokémon Furia Carmesí</b> es un juego de fans gratuito. Pokémon es una marca de Nintendo, Creatures Inc. y GAME FREAK inc. Créditos en Opciones.</p>
        <p class="pie-version"><span>${VERSION_JUEGO}</span><button class="pie-enlace" data-informe>Informar de un error</button><button class="pie-enlace" data-privacidad>Privacidad</button><button class="pie-enlace" data-compartir>Compartir el juego</button></p>
    </footer>`;
}
function conectarPortadaExtra(cont) {
    const t = cont.querySelector("[data-pk-dia]"); if (!t) return;
    const id = Number(t.dataset.pkDia);
    montarPokemon(document.getElementById("pk-dia-spr"), id).then((el) => el && tamanoNativo(el, 2, 130, 150)).catch(() => {});
    Promise.all([cargarPokemon(id), cargarEspecie(id)]).then(([d, e]) => {
        if (!t.isConnected) return;
        t.querySelector(".pk-dia-tipos").innerHTML = d.types.map((x) => insigniaTipoHTML(x.type.name)).join("");
        // (solo en español: si la Pokédex no tiene su texto en español, su categoría, altura y peso)
        const g = (e.genera || []).find((x) => x.language.name === "es"), es = (e.flavor_text_entries || []).find((x) => x.language.name === "es");
        t.querySelector(".pk-dia-texto").textContent = es ? textoEspecie(e)
            : `${g ? g.genus : "Pokémon"}. Mide ${(d.height / 10).toLocaleString("es-ES")} m y pesa ${(d.weight / 10).toLocaleString("es-ES")} kg.`;
        if (es && g) t.querySelector(".pk-dia-nombre").insertAdjacentHTML("afterend", `<small class="pk-dia-genero">${g.genus}</small>`);
    }).catch(() => { const p = t.querySelector(".pk-dia-texto"); if (p) p.textContent = ""; });
    t.querySelector("[data-pk-dia-ver]").onclick = () => { mostrarVista("pokedex"); setTimeout(() => abrirModal(id), 400); };
    const bn = cont.querySelector("[data-novedades-ver]"); if (bn) bn.onclick = () => abrirNovedades();
    const bi = cont.querySelector(".pie-web [data-informe]"); if (bi) bi.onclick = () => abrirInforme();
    const bp = cont.querySelector(".pie-web [data-privacidad]"); if (bp) bp.onclick = () => abrirPrivacidad();
    const bc = cont.querySelector(".pie-web [data-compartir]"); if (bc) bc.onclick = () => compartirJuego();
}

// ---- Ranuras de guardado: partida nueva / cargar / borrar ----
function abrirRanuras(modo) {
    const capa = document.createElement("div");
    capa.className = "capa-resumen";
    const cerrar = () => { capa.remove(); document.body.style.overflow = ""; document.removeEventListener("keydown", onEsc); };
    const onEsc = (e) => { if (e.key === "Escape") cerrar(); };
    const pintar = (confirmar = 0) => {
        const filas = RANURAS.map((n) => {
            const d = leerRanura(n);
            const info = d && d.starter
                ? `<img class="rn-poke" src="${urlSpritePeq((d.equipo && d.equipo[0]) || d.starter)}" alt="">
                   <span class="rn-datos"><b>${d.nombre || "Entrenador"}</b><span>${(d.medallas || []).length}/16 medallas · ${Object.keys(d.capturados || {}).length} Pokémon · ${tiempoTexto(d.tiempo)}</span>
                   <span class="rn-fecha">Guardada el ${new Date(d.guardada || Date.now()).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" })}</span></span>`
                : `<span class="rn-datos vacia"><b>Ranura ${n}</b><span>${d ? "Partida sin empezar" : "Vacía"}</span></span>`;
            let botones;
            if (confirmar === n) botones = `<button class="btn-mini peligro" data-si="${n}">${modo === "nueva" ? "Sí, sobrescribir" : "Sí, borrar"}</button><button class="btn-mini" data-cancelar>No</button>`;
            else if (modo === "nueva") botones = `<button class="btn-mini" data-usar="${n}">${d && d.starter ? "Sobrescribir" : "Empezar aquí"}</button>`;
            else botones = d ? `<button class="btn-mini" data-cargar="${n}">Cargar</button><button class="btn-mini peligro" data-borrar="${n}">Borrar</button>` : "";
            return `<div class="ranura ${n === ranuraActiva ? "activa" : ""}"><span class="rn-num">${n}</span>${info}<span class="rn-botones">${botones}</span></div>`;
        }).join("");
        capa.innerHTML = `<div class="resumen ranuras">
            <h3>${modo === "nueva" ? "Partida nueva: elige una ranura" : "Cargar partida"}</h3>
            ${confirmar ? `<p class="nota aviso">${modo === "nueva" ? "Se perderá la partida guardada en esa ranura." : "La partida se borrará para siempre."}</p>` : ""}
            <div class="lista-ranuras">${filas}</div>
            <div class="res-acciones">
                ${modo === "cargar" ? `<button class="btn-sec" data-copias>Copias y pasar a otro dispositivo</button>` : ""}
                <button class="btn-sec" data-cerrar>Cerrar</button>
            </div></div>`;
        capa.querySelectorAll("[data-usar]").forEach((b) => b.onclick = () => {
            const n = Number(b.dataset.usar), d = leerRanura(n);
            if (d && d.starter) return pintar(n);
            cerrar(); nuevaPartida(n);
        });
        capa.querySelectorAll("[data-cargar]").forEach((b) => b.onclick = () => {
            if (!cargarRanura(Number(b.dataset.cargar))) return;
            cerrar(); toast(`Partida cargada. ¡Hola de nuevo, ${entrenador.nombre || "entrenador"}!`);
            if (hayPartida()) renderInicio(); else mostrarVista("aventura");
        });
        capa.querySelectorAll("[data-borrar]").forEach((b) => b.onclick = () => pintar(Number(b.dataset.borrar)));
        capa.querySelectorAll("[data-si]").forEach((b) => b.onclick = () => {
            const n = Number(b.dataset.si);
            if (modo === "nueva") { cerrar(); nuevaPartida(n); return; }
            borrarRanura(n); toast("Partida borrada."); renderInicio(); pintar();
        });
        const bcan = capa.querySelector("[data-cancelar]"); if (bcan) bcan.onclick = () => pintar();
        const bco = capa.querySelector("[data-copias]"); if (bco) bco.onclick = () => { cerrar(); abrirCopias(); };
        capa.querySelector("[data-cerrar]").onclick = cerrar;
    };
    pintar();
    document.body.appendChild(capa); document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onEsc);
    capa.addEventListener("click", (e) => { if (e.target === capa) cerrar(); });
    AudioFX.ui("menu_open");
}
function exportarPartida() {
    try {
        const codigo = btoa(unescape(encodeURIComponent(JSON.stringify(entrenador))));
        if (navigator.clipboard) navigator.clipboard.writeText(codigo).then(() => toast("Código de guardado copiado.")).catch(() => {});
        window.prompt("Tu código de guardado (cópialo y guárdalo):", codigo);
    } catch (_) { toast("No se pudo exportar."); }
}
// Importa un código en la primera ranura libre (o en la actual si están todas ocupadas).
function importarPartida() {
    const codigo = window.prompt("Pega aquí tu código de guardado:");
    if (!codigo) return;
    let datos = null;
    try { datos = JSON.parse(decodeURIComponent(escape(atob(codigo.trim())))); } catch (_) {}
    if (!meterPartida(datos)) toast("El código no es válido.");
}
// Mete una partida importada (código o archivo) en la primera ranura libre; si están todas ocupadas, pregunta cuál pisar.
// Los textos que se ven (nombre y motes) se limpian: la partida puede venir de otra persona.
function meterPartida(datos) {
    if (!datos || typeof datos !== "object" || !datos.capturados || typeof datos.capturados !== "object") return false;
    const limpio = (s, n) => String(s || "").replace(/[<>&"'`]/g, "").slice(0, n);
    datos.nombre = limpio(datos.nombre, 20);
    Object.values(datos.capturados).forEach((c) => { if (c && c.mote) c.mote = limpio(c.mote, 20); });
    let n = RANURAS.find((x) => !leerRanura(x));
    if (!n) {
        n = ranuraActiva || 1;
        const vieja = leerRanura(n);
        if (!window.confirm(`Las tres ranuras están ocupadas. ¿Sustituir la ranura ${n} (${limpio(vieja && vieja.nombre, 20) || "sin nombre"}) por la partida importada?`)) return true;
    }
    if (!escribirLocal(claveRanura(n), JSON.stringify(datos))) return true;
    cargarRanura(n);
    toast(`¡Partida importada en la ranura ${n}!`);
    renderInicio();
    return true;
}
// Copias de seguridad: en un archivo, con un código corto para otro dispositivo (servidor) o con el código largo de siempre.
function abrirCopias() {
    const online = typeof Ranking !== "undefined" && Ranking.activo(), partida = hayPartida();
    const fila = (titulo, desc, botones) => `<section class="cp-fila"><b>${titulo}</b><small>${desc}</small><div class="cp-botones">${botones}</div></section>`;
    ventanaAyuda("Copias de seguridad", [
        online ? fila("Pasar a otro dispositivo", "Te damos un código para cargar la partida en otro móvil u ordenador.",
            `${partida ? `<button class="btn-grande" data-cp-subir>Generar código</button>` : ""}<button class="btn-sec" data-cp-bajar>Tengo un código</button>`) : "",
        fila("Copia en un archivo", "Guarda tu partida en un archivo para no perderla nunca.",
            `${partida ? `<button class="btn-sec" data-cp-descargar>Descargar copia</button>` : ""}<button class="btn-sec" data-cp-cargar>Cargar copia</button>`),
        fila("Código de texto", "El código de las versiones anteriores.",
            `${partida ? `<button class="btn-sec" data-cp-exportar>Exportar código</button>` : ""}<button class="btn-sec" data-cp-importar>Importar código</button>`),
    ].join(""));
    const capa = [...document.querySelectorAll(".capa-resumen")].pop(); if (!capa) return;
    const cerrar = () => { const ok = capa.querySelector("[data-ok]"); if (ok) ok.click(); };
    const on = (k, fn) => { const b = capa.querySelector(`[data-cp-${k}]`); if (b) b.onclick = fn; };
    on("descargar", descargarCopia);
    on("cargar", () => { cerrar(); cargarCopia(); });
    on("exportar", exportarPartida);
    on("importar", () => { cerrar(); importarPartida(); });
    on("subir", async (ev) => {
        const b = ev.currentTarget; b.disabled = true; b.textContent = "Generando…";
        try {
            const codigo = await Ranking.subirCopia({ juego: "pokemon-furia-carmesi", version: VERSION_JUEGO, fecha: Date.now(), partida: entrenador });
            if (!codigo) throw new Error("sin código");
            const bonito = `${codigo.slice(0, 4)}-${codigo.slice(4)}`;
            b.outerHTML = `<div class="cp-codigo"><b class="num-pk">${bonito}</b><small>Escríbelo en el otro dispositivo, en «Tengo un código». Sirve durante 7 días.</small></div>`;
            if (navigator.clipboard) navigator.clipboard.writeText(bonito).catch(() => {});
        } catch (_) { b.disabled = false; b.textContent = "Generar código"; toast("No se pudo generar el código. Revisa tu conexión.", 3000); }
    });
    on("bajar", async () => {
        const codigo = (window.prompt("Escribe el código de 8 letras de tu otro dispositivo:") || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
        if (!codigo) return;
        if (codigo.length !== 8) { toast("El código tiene 8 letras y números."); return; }
        try {
            const d = await Ranking.bajarCopia(codigo);
            if (!d) { toast("Ese código no existe o ya ha caducado."); return; }
            cerrar();
            if (!meterPartida(d.partida ? d.partida : d)) toast("Esa copia no es válida.");
        } catch (_) { toast("No se pudo cargar. Revisa tu conexión.", 3000); }
    });
}
function descargarCopia() {
    if (!hayPartida()) return;
    const fecha = new Date().toISOString().slice(0, 10);
    const nombre = (entrenador.nombre || "entrenador").normalize("NFD").replace(/[^\w-]+/g, "").toLowerCase() || "entrenador";
    const datos = { juego: "pokemon-furia-carmesi", version: VERSION_JUEGO, fecha: Date.now(), partida: entrenador };
    const url = URL.createObjectURL(new Blob([JSON.stringify(datos)], { type: "application/json" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: `furia-carmesi-${nombre}-${fecha}.json` });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    toast("Copia de seguridad descargada. Guárdala: con ella recuperas la partida en cualquier dispositivo.", 4200);
}
function cargarCopia() {
    const entrada = Object.assign(document.createElement("input"), { type: "file", accept: ".json,application/json" });
    entrada.onchange = () => {
        const f = entrada.files && entrada.files[0]; if (!f) return;
        if (f.size > 8 * 1024 * 1024) { toast("Ese archivo es demasiado grande para ser una partida."); return; }
        f.text().then((txt) => {
            let d = null;
            try { d = JSON.parse(txt); } catch (_) {}
            if (!meterPartida(d && d.partida ? d.partida : d)) toast("Ese archivo no es una copia de seguridad del juego.");
        }).catch(() => toast("No se pudo leer el archivo."));
    };
    entrada.click();
}
// Compartir el enlace del juego (en el móvil, con el menú de compartir; si no, se copia).
async function compartirJuego() {
    const url = `${location.origin}${location.pathname}`, texto = "¡Juega a Pokémon Furia Carmesí!";
    if (navigator.share) { try { await navigator.share({ title: "Pokémon Furia Carmesí", text: texto, url }); return; } catch (e) { if (e && e.name === "AbortError") return; } }
    try { await navigator.clipboard.writeText(url); toast("Enlace del juego copiado."); } catch (_) { window.prompt("Copia el enlace del juego:", url); }
}

// ===================== MODO BATALLA (rápida) =====================
let nivelRival = 50;
let formatoRapido = 1;   // 1: individual · 2: doble
function renderBatalla() {
    const cont = document.getElementById("vista-batalla");
    const tieneEquipo = entrenador.equipo.length > 0;
    cont.innerHTML = `
        <div class="cabecera-modo">
            <h2>Batalla</h2>
            <p>Un combate de exhibición contra un Entrenador.</p>
        </div>
        <div class="panel">
            <div class="campo">
                <label for="sel-rival">Nivel del rival</label>
                <select id="sel-rival">
                    <option value="40">Fácil (Nv.40)</option>
                    <option value="50" selected>Normal (Nv.50)</option>
                    <option value="65">Difícil (Nv.65)</option>
                    <option value="80">Experto (Nv.80)</option>
                </select>
            </div>
            <div class="campo">
                <label>Formato</label>
                <div class="op-seg" data-formato>${[["1", "Individual"], ["2", "Doble"]].map(([v, txt]) => `<button class="${String(formatoRapido) === v ? "activa" : ""}" data-v="${v}">${txt}</button>`).join("")}</div>
            </div>
            <button class="btn-grande" id="btn-combate-aleatorio">Combate rápido (equipo aleatorio)</button>
            ${tieneEquipo ? `<button class="btn-grande secundario" id="btn-combate-equipo">Combatir con mi equipo</button>`
                          : `<p class="nota">Con una partida empezada podrás combatir con tu propio equipo.</p>`}
        </div>`;
    document.getElementById("sel-rival").value = String(nivelRival);
    document.getElementById("sel-rival").onchange = (e) => { nivelRival = Number(e.target.value); };
    document.getElementById("btn-combate-aleatorio").onclick = () => combateRapido(false);
    cont.querySelectorAll("[data-formato] [data-v]").forEach((b) => b.onclick = () => { formatoRapido = Number(b.dataset.v); AudioFX.ui("select"); renderBatalla(); });
    const be = document.getElementById("btn-combate-equipo");
    if (be) be.onclick = () => combateRapido(true);
}
// Transición de entrada al combate con los gráficos de Pokémon Essentials EBDX: dos destellos y la Poké Ball que se
// cierra (salvajes y entrenadores) o la barra «VS» con el rival (líderes, rivales, jefes villanos y Liga). Dura lo que
// tarde en prepararse el combate, con un mínimo para que se vea entera; mientras, una Poké Ball gira en la esquina.
// o: { vs, sprite, titulo, estilo: "malvado" | "liga" }
const EBDX_TR = EBDX_BASE.replace(/Pokemon\/$/, "EBDX/Transitions/");
function mostrarCargaBatalla(o = {}) {
    const capa = document.getElementById("capa-batalla");
    capa.classList.remove("oculta", "cerrando");
    capa.classList.add("en-transicion");
    document.body.style.overflow = "hidden";
    const v = Math.min(1.5, velJuego()), vs = !!(o.vs && o.sprite);   // aunque se juegue acelerado, que se vea
    const bola = `<img class="tr-cargando" src="${EBDX_TR}Common/ball.png" alt="">`;
    capa.innerHTML = vs
        ? `<div class="tr tr-vs ${o.estilo || ""}" style="--v:${v}">
            <div class="tr-negro"></div>
            <div class="tr-banda"><div class="tr-rayas"></div><div class="tr-rayas dos"></div>
                <canvas class="tr-rival" id="tr-rival"></canvas>
                <img class="tr-logo" src="${EBDX_TR}Common/vs.png" alt="VS">
                <span class="tr-nombre">${o.titulo || ""}</span>
            </div>
            <div class="tr-destello"></div>${bola}
        </div>`
        : `<div class="tr tr-bola" style="--v:${v}"><div class="tr-iris"></div><div class="tr-negro"></div><div class="tr-destello"></div>${bola}</div>`;
    if (vs) montarEntrenador(document.getElementById("tr-rival"), o.sprite, { fps: 24 * v });
    window.cargaBatallaHasta = performance.now() + (vs ? 2300 : 1150) / v;
}
function errorCombate() {
    AudioFX.pararMusica();
    const capa = document.getElementById("capa-batalla");
    capa.classList.add("oculta"); capa.classList.remove("en-transicion"); capa.innerHTML = "";
    document.body.style.overflow = "";
    toast("No se pudo preparar el combate. ¿Tienes internet?");
}
async function combateRapido(usarMiEquipo) {
    try {
        mostrarCargaBatalla();
        const doble = formatoRapido === 2;
        const aliadosSpecs = usarMiEquipo && entrenador.equipo.length
            ? await specsMiEquipo(false)
            : especiesAleatorias(doble ? 4 : 3).map((p) => ({ id: p.id, nivel: 50 }));
        const clase = alAzar(CLASES_ENTRENADOR);
        // Fácil: sin más · Normal, Difícil y Experto: rivales entrenados y con objetos, como en la aventura.
        const D = DIFICULTADES[{ 50: "normal", 65: "dificil", 80: "extremo" }[nivelRival]] || null;
        let rivales = await specsDeTipos(tiposDeClase(clase), Math.max(doble ? 2 : 1, aliadosSpecs.length), nivelRival, 0, 0);
        if (D) rivales = await reforzarEquipo(rivales, D, nivelRival >= 65);
        const [aliados, enemigos] = await Promise.all([prepararEquipo(aliadosSpecs), prepararEquipo(rivales)]);
        if (doble && aliados.length >= 2) await darApoyo(enemigos);   // (algún rival con Refuerzo, Señuelo…)
        if (doble && aliados.length >= 2) return Dobles.iniciar({
            aliados, enemigos, titulo: nombreNPC(clase), entrenadorSprite: clase.sprite, dialogo: alAzar(FRASES_NPC), ia: D ? D.ia : 0.8, poderRival: nivelRival >= 80 ? "tera" : null,
            musicaEncuentro: musicaEncuentro(clase.enc), musica: nivelRival >= 80 ? alAzar(MUSICA.campeones) : nivelRival >= 65 ? alAzar(MUSICA.rivales) : undefined,
            fondo: alAzar(FONDOS_SALVAJE),
            alTerminar: (r) => { if (r.gano) { entrenador.batallasGanadas++; guardarEntrenador(); lanzarConfeti(); } renderBatalla(); },
        });
        Combate.iniciar({
            aliados, enemigos, salvaje: false, permitirCaptura: false, ia: D ? D.ia : 0.8, cambiosRival: D ? D.cambios : 0,
            poderRival: nivelRival >= 80 ? "tera" : nivelRival >= 65 ? "dinamax" : null,
            titulo: nombreNPC(clase), entrenadorSprite: clase.sprite, musica: nivelRival >= 80 ? alAzar(MUSICA.campeones) : nivelRival >= 65 ? alAzar(MUSICA.rivales) : undefined,
            dialogo: alAzar(FRASES_NPC), musicaEncuentro: musicaEncuentro(clase.enc), generoJugador: entrenador.genero,
            alTerminar: (r) => {
                if (r.gano) { entrenador.batallasGanadas++; guardarEntrenador(); lanzarConfeti(); }
                renderBatalla();
            },
        });
    } catch (_) { errorCombate(); }
}

// ===================== AVENTURA · REGIÓN AURELIA =====================
const STARTERS = [1, 4, 7, 152, 155, 158, 252, 255, 258, 387, 390, 393, 495, 498, 501, 650, 653, 656, 722, 725, 728, 810, 813, 816, 906, 909, 912];
let subAventura = "principal";
const nMedallas = () => entrenador.medallas.length;
const siguienteGimnasio = () => (nMedallas() < 16 ? GIMNASIOS[nMedallas()] : null);
function misionesPendientes() {
    const n = nMedallas(), hechos = entrenador.eventos;
    return [
        ...RIVALES, ...MISIONES_VILLANO,
    ].filter((x) => x.tras <= n && !hechos.includes(x.id)).sort((a, b) => a.tras - b.tras);
}

// Objetivos del gimnasio actual: progreso guardado (se reinicia con cada medalla).
function progresoGym() {
    const g = siguienteGimnasio(); if (!g) return null;
    if (!entrenador.progreso || entrenador.progreso.gym !== g.n) entrenador.progreso = { gym: g.n, ruta: 0, tipo: 0, especies: 0, racha: 0, gimnasio: 0 };
    return entrenador.progreso;
}
function textoObjetivo(o) {
    return {
        ruta: `Gana ${o.meta} combates en la ruta`,
        tipo: `Captura un Pokémon de tipo ${TIPOS_ES[o.tipo]}`,
        especies: `Registra ${o.meta} especies nuevas en la Pokédex`,
        nivel: `Entrena a un Pokémon hasta el Nv. ${o.meta}`,
        racha: `Gana ${o.meta} combates seguidos en la hierba alta`,
        gimnasio: `Vence a los ${o.meta} entrenadores del gimnasio`,
    }[o.id];
}
function estadoObjetivos(g) {
    const p = progresoGym();
    return objetivosDe(g).map((o) => {
        const valor = o.id === "nivel" ? Math.max(1, ...entrenador.equipo.map((id) => entrenador.capturados[id]?.nivel || 1)) : p[o.id] || 0;
        return { ...o, valor: Math.min(valor, o.meta), hecho: valor >= o.meta, texto: textoObjetivo(o) };
    });
}
// Tipo que pide la misión del gimnasio (hace que aparezca más en la hierba).
function tipoBuscado() {
    const g = hayPartida() && siguienteGimnasio();
    const o = g && estadoObjetivos(g).find((x) => x.id === "tipo" && !x.hecho);
    return o ? o.tipo : null;
}
const pagoDe = (tipo, specs) => PAGO_POR_NIVEL[tipo] * Math.max(1, ...specs.map((x) => x.nivel));

function renderSinPartida(cont) {
    cont.innerHTML = `
        <div class="cabecera-modo"><h2>Aventura</h2><p>Empieza una partida nueva o carga una guardada.</p></div>
        <div class="panel sin-partida">
            <button class="btn-grande" data-nueva>Partida nueva</button>
            <button class="btn-grande secundario" data-cargar>Cargar partida</button>
        </div>`;
    cont.querySelector("[data-nueva]").onclick = () => abrirRanuras("nueva");
    cont.querySelector("[data-cargar]").onclick = () => abrirRanuras("cargar");
}

// Fondos de ruta (Showdown) según el tramo de la región.
const FONDOS_RUTA = ["route", "g6-meadow", "meadow", "g6-forest", "forest", "river", "g6-beach", "mountain", "g6-desert", "beach",
    "g6-orasdesert", "desert", "g6-icecave", "thunderplains", "g6-orassea", "g6-skypillar"];
const MENU_REGION = [
    { sub: "equipo", icono: "poke-ball", txt: "Equipo" },
    { sub: "mochila", icono: "explorer-kit", txt: "Mochila" },
    { sub: "caja", icono: "seal-case", txt: "Caja" },
    { sub: "tienda", icono: "coin-case", txt: "Tienda" },
    { sub: "centro", icono: "full-restore", txt: "Centro" },
    { sub: "estuche", icono: "town-map", txt: "Mapa" },
    { sub: "metro", icono: "vs-recorder", txt: "Metro", si: () => metroAbierto() },
    { sub: "logros", icono: ICONO_LOGROS, txt: "Logros" },
    { acc: "guardar", icono: "journal", txt: "Guardar" },
    { acc: "opciones", icono: "point-card", txt: "Opciones" },
];
// ---- Piezas de la pantalla de aventura (las usan el modo clásico y el modo Región) ----
const modoRegion = () => config.modoAventura !== "clasico";
function tarjetaEntrenadorHTML() {
    const campeonTxt = entrenador.genero === "f" ? "Campeona" : "Campeón";
    return `<header class="hub-tarjeta">
        <canvas class="ht-sprite" id="ht-sprite"></canvas>
        <div class="ht-id"><span class="hub-etq">Región ${REGION}</span><b>${entrenador.nombre || "Entrenador"}</b>
            <span class="ht-chips">${entrenador.campeon ? `<span class="chip-campeon">${campeonTxt}</span>` : ""}
            <span class="chip-dificultad" style="--dif:${dificultad().color}">${dificultad().nombre}</span></span></div>
        <button class="ht-medallas" data-sub="estuche" title="Medallas">
            ${GIMNASIOS.map((g) => `<img class="${entrenador.medallas.includes(g.n) ? "tiene" : ""}" src="${urlMedalla(g.medalla)}" alt="">`).join("")}
        </button>
        <div class="ht-datos">
            <span><small>Dinero</small><b class="num-pk">${dineroTexto(entrenador.dinero)}</b></span>
            <span><small>Pokédex</small><b class="num-pk">${Object.keys(entrenador.capturados).length}</b></span>
            <span><small>Tiempo</small><b>${tiempoTexto(entrenador.tiempo)}</b></span>
        </div>
    </header>`;
}
function equipoHubHTML() {
    const huecos = Math.max(0, 6 - entrenador.equipo.length);
    return `<section class="hub-equipo">
        <div class="he-cab"><span class="hub-etq">Tu equipo</span><button class="he-enlace" data-sub="equipo">Gestionar ›</button></div>
        <div class="he-lista">
            ${entrenador.equipo.map((id, i) => `<button class="he-slot" data-sub="equipo" data-i="${i}">
                ${htmlIcono(id, "he-icono", !!entrenador.capturados[id]?.shiny)}
                <span class="he-datos"><span class="he-nom">${nombreDe(id)}</span>
                    <span class="he-fila"><span class="he-nv">Nv. <b class="num-pk">${entrenador.capturados[id].nivel}</b></span><span class="he-extra"></span></span></span>
                <span class="he-ps"><span></span></span>
            </button>`).join("")}
            ${'<span class="he-slot vacio"></span>'.repeat(huecos)}
        </div>
    </section>`;
}
// (si: solo cuando se cumple, p. ej. el Metro Batalla con ocho medallas; icono: clave de PokéAPI o una URL)
const menuHubHTML = (todos) => { const items = todos.filter((m) => !m.si || m.si()); return `<nav class="hub-menu${items.length > 7 ? " muchos" : ""}" style="--n:${items.length}">
    ${items.map((m) => `<button class="hm-op" ${m.sub ? `data-sub="${m.sub}"` : `data-acc="${m.acc}"`}>
        <span class="hm-icono"><img src="${/^https?:/.test(m.icono) ? m.icono : urlItem(m.icono)}" alt=""></span><span class="hm-txt">${m.txt}</span>
        ${m.sub === "centro" && equipoHerido() ? '<i class="hm-aviso" title="Tu equipo necesita descansar"></i>' : ""}
        ${m.sub === "logros" && logrosPorCobrar() ? '<i class="hm-aviso" title="Tienes premios por recoger"></i>' : ""}
    </button>`).join("")}
</nav>`; };
// Tarjeta del próximo gimnasio (o de la Liga) con sus retos. En el modo Región, los rivales y villanos se buscan en su lugar.
function retoGimnasio({ region = false } = {}) {
    const gym = siguienteGimnasio();
    const historia = misionesPendientes();
    const objetivos = gym ? estadoObjetivos(gym) : [];
    const gymObj = objetivos.find((o) => o.id === "gimnasio");
    const previos = objetivos.filter((o) => o.id !== "gimnasio").every((o) => o.hecho) && !historia.length;
    const listo = gym ? previos && gymObj.hecho : !historia.length;
    const campeonTxt = entrenador.genero === "f" ? "Campeona" : "Campeón";
    const filaObj = (o) => `<li class="obj ${o.hecho ? "hecho" : ""}">
        <span class="obj-marca"></span><span class="obj-texto">${o.texto}</span>
        ${o.id === "gimnasio"
            ? (o.hecho ? `<span class="obj-prog">${o.valor}/${o.meta}</span>` : `<button class="btn-mini" data-gym ${previos ? "" : "disabled"}>Entrar ${o.valor}/${o.meta}</button>`)
            : `<span class="obj-prog">${o.id === "nivel" ? "Nv. " + o.valor : o.valor + "/" + o.meta}</span>`}
    </li>`;
    const filaHistoria = (m, i) => {
        const eq = m.equipo ? EQUIPOS_VILLANOS[m.equipo] : null;
        const texto = eq ? `${eq.nombre}: ${m.nombre}` : `Tu rival ${m.nombre} te está esperando`;
        return `<li class="obj historia ${eq ? "villano" : "rival"}">
            <span class="obj-marca"></span><span class="obj-texto">${texto}${region ? ` <small class="obj-lugar">en ${nombreLugar(lugarMision(m))}</small>` : ""}</span>
            ${region ? "" : `<button class="btn-mini" data-mision="${i}">¡Combatir!</button>`}</li>`;
    };
    const lista = [...historia.map(filaHistoria), ...objetivos.filter((o) => o.id !== "gimnasio").map(filaObj), ...(gymObj ? [filaObj(gymObj)] : [])].join("");
    const hechos = objetivos.filter((o) => o.hecho).length;
    const html = gym ? `
        <section class="hub-reto" data-tipo="${gym.tipo}">
            <img class="hr-fondo" src="${urlFondo(FONDO_TIPO[gym.tipo])}" alt="">
            <div class="hr-cab">
                <canvas class="hr-lider" id="av-reto-sprite"></canvas>
                <div class="hr-titulo">
                    <span class="hub-etq">Gimnasio ${gym.n} · ${gym.ciudad}</span>
                    <h3>Líder ${gym.nombre}</h3>
                    <div class="hr-tipo">${insigniaTipoHTML(gym.tipo)}<span class="hr-medalla"><img src="${urlMedalla(gym.medalla)}" alt="">${gym.nombreMedalla}</span></div>
                    <span class="hr-nivel">Nivel aproximado <b class="num-pk">${gym.nivel}</b></span>
                </div>
            </div>
            <div class="hr-retos">
                <div class="hr-progreso"><span>Retos para desafiar al líder</span><b class="num-pk">${hechos}/${objetivos.length}</b></div>
                <ul class="objetivos">${lista}</ul>
            </div>
            <button class="btn-grande" id="btn-reto" ${listo ? "" : "disabled"}>${listo ? `¡Retar a ${gym.nombre}!` : "Completa los retos para retar al líder"}</button>
        </section>`
        : `<section class="hub-reto liga" data-tipo="dragon">
            <img class="hr-fondo" src="${urlFondo("mountain")}" alt="">
            <div class="hr-cab">
                <canvas class="hr-lider" id="av-reto-sprite"></canvas>
                <div class="hr-titulo">
                    <span class="hub-etq">Liga Pokémon · Calle Victoria</span>
                    <h3>${entrenador.campeon ? `¡${campeonTxt} de ${REGION}!` : "El Alto Mando te espera"}</h3>
                    <span class="hr-nivel">Cuatro miembros del Alto Mando y la Campeona Iris, uno tras otro.</span>
                </div>
            </div>
            ${lista ? `<div class="hr-retos"><ul class="objetivos">${lista}</ul></div>` : ""}
            <button class="btn-grande" id="btn-reto" ${listo ? "" : "disabled"}>${entrenador.campeon ? "Defender el título" : "Entrar a la Liga"}</button>
        </section>`;
    const conectar = (cont) => {
        const sprite = gym ? gym.lider : (entrenador.campeon ? (entrenador.genero === "f" ? "player_f" : "player_m") : "iris");
        montarEntrenador(document.getElementById("av-reto-sprite"), sprite).then((el) => el && tamanoNativo(el, 2, 150, Math.max(90, (el.parentElement?.clientWidth || 400) * 0.42)));
        document.getElementById("btn-reto").onclick = () => { if (!listo) return; gym ? retarGimnasio(gym) : retarLiga(); };
        cont.querySelectorAll("[data-mision]").forEach((b) => b.onclick = () => combatirMision(historia[Number(b.dataset.mision)]));
        const bg = cont.querySelector("[data-gym]"); if (bg) bg.onclick = () => { if (previos) combatirEntrenadorGimnasio(gym); };
    };
    return { html, conectar };
}
// Lo común a las dos pantallas: sprite del jugador, equipo, menú, guardar y el cambio de estilo.
function conectarHub(cont) {
    montarEntrenador(document.getElementById("ht-sprite"), entrenador.genero === "f" ? "player_f" : "player_m").then((el) => tamanoNativo(el, 1, 70));
    pintarIconos(cont);
    rellenarEquipoRegion(cont);
    cont.querySelectorAll("[data-sub]").forEach((b) => b.onclick = () => { AudioFX.ui("select"); subAventura = b.dataset.sub; renderAventura(); });
    const bs = cont.querySelector("[data-acc=guardar]");
    if (bs) bs.onclick = () => { guardarEntrenador(); AudioFX.efecto("save"); toast(`Partida guardada en la ranura ${ranuraActiva}.`); };
    const bo = cont.querySelector("[data-acc=opciones]");
    if (bo) bo.onclick = () => { AudioFX.ui("select"); abrirOpciones(); };
}
function renderAventura() {
    const cont = document.getElementById("vista-aventura");
    if (!ranuraActiva) return renderSinPartida(cont);
    if (!entrenador.starter) return renderElegirStarter(cont);
    if (typeof eclosionPendiente === "function" && (entrenador.huevos || []).some((h) => h.combates <= 0)) setTimeout(eclosionPendiente, 700);
    const vistas = { equipo: renderGestionEquipo, caja: renderCaja, estuche: renderEstuche, tienda: renderTienda, mochila: renderMochila, centro: renderCentro, mapa: renderMapaRegion,
        metro: renderMetro, canje: (c) => renderTienda(c, "pb"), logros: renderLogros, safari: renderSafari,
        prisma: (c) => renderTienda(c, "prisma"), torneo: (c) => renderTorneo(c), guarderia: (c) => renderGuarderia(c) };
    if (vistas[subAventura]) return vistas[subAventura](cont);
    if (modoRegion()) return renderRegion(cont);
    AudioFX.musicaSonar(MUSICA.hub[Math.min(4, Math.floor(nMedallas() / 4))]);

    const gym = siguienteGimnasio();
    const reto = retoGimnasio();
    const tipo = tipoBuscado(), debil = equipoDebilitado();
    const fondoRuta = gym ? FONDOS_RUTA[(gym.n - 1) % FONDOS_RUTA.length] : "mountain";

    cont.innerHTML = `
        <div class="hub">
            ${tarjetaEntrenadorHTML()}
            <div class="hub-rejilla">
                <section class="hub-explorar hora-${claseHora()}">
                    <img class="hx-fondo" src="${urlFondo(fondoRuta)}" alt="">
                    <div class="hx-escena"><img class="hx-poke" id="hx-poke" alt=""></div>
                    <div class="hx-info">
                        <span class="hub-etq">${gym ? `Ruta ${gym.n} · hacia ${gym.ciudad}` : "Calle Victoria"}</span>
                        <h3>Hierba alta</h3>
                        <p>${debil ? "Tu equipo está debilitado. Llévalo al Centro Pokémon antes de seguir." : tipo ? `Dicen que por aquí abundan los Pokémon de tipo ${TIPOS_ES[tipo]}.` : "Pokémon salvajes, entrenadores y objetos escondidos entre la hierba."}</p>
                        <button class="hx-boton" id="btn-explorar">${debil ? "Ir al Centro Pokémon" : "Explorar"}</button>
                        ${entrenador.mejorRacha ? `<span class="hx-racha">Mejor racha: <b class="num-pk">${entrenador.mejorRacha}</b></span>` : ""}
                    </div>
                </section>
                ${reto.html}
            </div>
            ${equipoHubHTML()}
            ${menuHubHTML(MENU_REGION)}
        </div>`;

    conectarHub(cont);
    reto.conectar(cont);
    const lead = entrenador.equipo.find((id) => entrenador.capturados[id].hp !== 0) || entrenador.equipo[0];
    montarPokemon(document.getElementById("hx-poke"), lead, { shiny: !!entrenador.capturados[lead]?.shiny }).then((el) => tamanoNativo(el, 2, 120, 150));
    document.getElementById("btn-explorar").onclick = () => { if (equipoDebilitado()) { subAventura = "centro"; return renderAventura(); } iniciarEncuentro(); };
    precargarSonidosAventura();
}
// Lo que va a sonar al explorar, descargado de antemano (poco después de pintar la pantalla, para no frenarla):
// los temas de salvajes y del próximo entrenador, las fanfarrias, los gritos de tu equipo y lo que se pida (música vecina…).
function precargarSonidosAventura(musicas = [], gritos = []) {
    clearTimeout(precargarSonidosAventura._t);
    precargarSonidosAventura._t = setTimeout(() => {
        AudioFX.precargarMusica([MUSICA.salvaje, MUSICA.victoriaEntrenador, MUSICA.captura, temaEntrenador(), ...musicas]);
        AudioFX.precargarGritos([...entrenador.equipo, ...gritos]);
    }, 1200);
}
// Barra de PS, estado y objeto de cada Pokémon del equipo en la pantalla de la región.
async function rellenarEquipoRegion(cont) {
    const ms = await miembrosEquipo();
    const slots = cont.querySelectorAll(".he-slot[data-i]");
    ms.forEach((m, i) => {
        const s = slots[i]; if (!s || !s.isConnected) return;
        const pct = m.hpMax ? (m.hp / m.hpMax) * 100 : 100;
        const barra = s.querySelector(".he-ps span");
        barra.style.width = pct + "%";
        barra.className = pct > 50 ? "" : pct > 20 ? "media" : "baja";
        s.classList.toggle("ko", m.hp <= 0);
        s.querySelector(".he-extra").innerHTML = (m.estado && m.hp > 0 ? iconoEstado(m.estado, 1.5) : "") + (m.objeto ? `<img src="${urlObj(m.objeto)}" alt="" title="${obj(m.objeto).nombre}">` : "");
        s.title = `${m.nombre} · PS ${m.hp}/${m.hpMax}`;
    });
}

function renderElegirStarter(cont) {
    cont.innerHTML = `
        <div class="cabecera-modo">
            <h2>¡Bienvenido a ${REGION}!</h2>
            <p>Antes de empezar tu viaje, cuéntame un poco sobre ti.</p>
        </div>
        <div class="campo-nombre">
            <label for="nombre-jugador">¿Cómo te llamas?</label>
            <input id="nombre-jugador" maxlength="12" autocomplete="off" placeholder="${entrenador.genero === "f" ? "Rosa" : "Nate"}" value="${entrenador.nombre || ""}">
        </div>
        <div class="genero-sel">
            <button class="genero-op ${entrenador.genero !== "f" ? "activa" : ""}" data-gen="m"><canvas id="gen-m"></canvas><span>Chico</span></button>
            <button class="genero-op ${entrenador.genero === "f" ? "activa" : ""}" data-gen="f"><canvas id="gen-f"></canvas><span>Chica</span></button>
        </div>
        ${htmlDificultad(entrenador.dificultad || "normal", "¿Qué dificultad quieres?")}
        <span class="hub-etq titulo-starters">¿Qué Pokémon será tu compañero?</span>
        <div class="rejilla-starters">
            ${STARTERS.map((id) => `
                <button class="carta-starter" data-id="${id}">
                    <img src="${urlSprite2D(id)}" alt="${nombrePk(id)}" loading="lazy">
                    <span>${nombrePk(id)}</span>
                </button>`).join("")}
        </div>`;
    montarEntrenador(document.getElementById("gen-m"), "player_m");
    montarEntrenador(document.getElementById("gen-f"), "player_f");
    const input = document.getElementById("nombre-jugador");
    cont.querySelectorAll(".genero-op").forEach((b) => b.onclick = () => {
        entrenador.genero = b.dataset.gen;
        input.placeholder = entrenador.genero === "f" ? "Rosa" : "Nate";
        cont.querySelectorAll(".genero-op").forEach((x) => x.classList.toggle("activa", x === b));
    });
    conectarDificultad(cont, (k) => { entrenador.dificultad = k; });
    cont.querySelectorAll(".carta-starter").forEach((b) => b.onclick = () => elegirStarter(Number(b.dataset.id), input.value.trim() || input.placeholder));
}
// Selector de dificultad (al empezar partida y en Opciones).
const htmlDificultad = (actual, titulo = "") => `<div class="dif-sel">
    <span class="hub-etq ${titulo ? "titulo-starters" : ""}">${titulo || "Dificultad"}</span>
    <div class="dif-ops">${Object.entries(DIFICULTADES).map(([k, d]) => `
        <button class="dif-op ${k === actual ? "activa" : ""}" data-dif="${k}" style="--dif:${d.color}">
            <b>${d.nombre}</b><small>${d.desc}</small>
        </button>`).join("")}</div>
</div>`;
function conectarDificultad(raiz, alElegir) {
    raiz.querySelectorAll("[data-dif]").forEach((b) => b.onclick = () => {
        raiz.querySelectorAll("[data-dif]").forEach((x) => x.classList.toggle("activa", x === b));
        AudioFX.ui("select");
        alElegir(b.dataset.dif);
    });
}
function elegirStarter(id, nombre) {
    entrenador.nombre = nombre.slice(0, 12);
    entrenador.starter = id;
    entrenador.capturados[id] = { nivel: 5, xp: 0, objeto: null, bola: "poke-ball", movimientos: null, nivelCaptura: 5, genero: generoAleatorio(id),
        naturaleza: naturalezaAleatoria(), habSlot: 1, lugarCaptura: "pueblo-raiz", recibido: true };
    entrenador.equipo = [id];
    entrenador.creada = Date.now();
    entrenador.dificultad = entrenador.dificultad || "normal";
    // Menos objetos para empezar cuanto más difícil (siempre alguno de cada).
    const ini = dificultad().inicial;
    Object.keys(entrenador.mochila).forEach((k) => { if (k !== "exp-share") entrenador.mochila[k] = Math.max(1, Math.round(entrenador.mochila[k] * ini)); });
    guardarEntrenador();
    asegurarMovimientos(id);
    AudioFX.fanfarria(MUSICA.captura);
    lanzarConfeti();
    toast(`¡${nombrePk(id)} se une a tu equipo, ${entrenador.nombre}!`, 3000);
    subAventura = "principal";
    renderAventura();
}

// ---- Mapa de la región y estuche de medallas ----
function renderEstuche(cont) {
    const gym = siguienteGimnasio();
    const nodo = (g) => {
        const tiene = entrenador.medallas.includes(g.n), actual = gym && gym.n === g.n;
        return `<div class="nodo-gym ${tiene ? "hecho" : actual ? "actual" : "bloqueado"}" title="${g.ciudad} · ${g.nombre}">
            <img src="${urlMedalla(g.medalla)}" alt="">
            <span class="ng-num">${g.n}</span>
            <span class="ng-ciudad">${g.ciudad}</span>
        </div>`;
    };
    const abierta = nMedallas() >= 16;
    cont.innerHTML = `
        <div class="cabecera-modo con-volver">
            <button class="btn-volver" data-volver>Atrás</button>
            <h2>${modoRegion() ? "Gimnasios y medallas" : `Mapa de ${REGION}`}</h2>
        </div>
        <div class="mapa-region">${GIMNASIOS.map(nodo).join("")}
            <div class="nodo-liga ${abierta ? "abierta" : ""}"><b>Liga Pokémon</b><span>${entrenador.campeon ? "¡Ya eres ganador de la Liga!" : abierta ? "¡El Alto Mando te espera!" : `Faltan ${16 - nMedallas()} medallas`}</span></div>
        </div>
        <h3 class="titulo-seccion">Estuche de medallas <span class="num-pk">${nMedallas()}/16</span></h3>
        <div class="estuche">
            ${GIMNASIOS.map((g) => {
                const tiene = entrenador.medallas.includes(g.n);
                return `<div class="hueco-medalla ${tiene ? "tiene" : ""}">
                    <img src="${urlMedalla(g.medalla)}" alt="">
                    <b>${tiene ? g.nombreMedalla : "???"}</b>
                    <span>${tiene ? `${g.nombre} · ${g.ciudad}` : `Gimnasio ${g.n}`}</span>
                    ${tiene && entrenador.campeon ? `<button class="btn-mini" data-revancha="${g.n}">Revancha · Nv. ${nivelRevancha(g)}</button>` : ""}
                </div>`;
            }).join("")}
        </div>
        ${entrenador.campeon ? `<p class="nota campeon-nota">${entrenador.genero === "f" ? "Campeona" : "Campeón"} de la Liga Pokémon de ${REGION}. Los líderes aceptan revancha.</p>` : ""}`;
    cont.querySelector("[data-volver]").onclick = () => { subAventura = "principal"; renderAventura(); };
    cont.querySelectorAll("[data-revancha]").forEach((b) => b.onclick = () => { subAventura = "principal"; retarRevancha(GIMNASIOS[Number(b.dataset.revancha) - 1]); });
}

// ===================== EVOLUCIÓN =====================
const _cacheEvo = new Map();
function buscarNodoEvo(nodo, nombre) {
    if (nodo.species.name === nombre) return nodo;
    for (const e of nodo.evolves_to) { const f = buscarNodoEvo(e, nombre); if (f) return f; }
    return null;
}
// Ramas de evolución de la especie y cómo se consigue cada una (PokéAPI).
async function ramasEvolucion(id) {
    if (_cacheEvo.has(id)) return _cacheEvo.get(id);
    let ramas;
    try {
        const esp = await cargarEspecie(id);
        const ec = await pedir(esp.evolution_chain.url);
        const nodo = buscarNodoEvo(ec.chain, esp.name);
        ramas = (nodo ? nodo.evolves_to : []).map((sig) => ({ aId: sacarId(sig.species.url), det: sig.evolution_details || [] }))
            .filter((r) => r.aId <= TOTAL_NACIONAL);
    } catch (_) { return []; }   // sin caché: se reintenta la próxima vez
    _cacheEvo.set(id, ramas);
    return ramas;
}
const encajaGenero = (det, genero) => !det.gender || !genero || (det.gender === 1 ? "f" : "m") === genero;
// Evolución al subir de nivel. Sin nivel oficial (amistad, intercambio, un movimiento…), al nivel equivalente de la tabla.
// Las que piden un objeto (piedras, Mejora, Garra Afilada…) solo con ese objeto; la hora del día cuenta (Espeon/Umbreon).
async function evolucionDe(id, genero) {
    const noche = claseHora() === "noche";
    for (const r of await ramasEvolucion(id)) {
        const conObjeto = r.det.some((d) => d.item || d.held_item);
        for (const det of r.det) {
            const t = det.trigger && det.trigger.name;
            if (t === "use-item" || det.held_item || !encajaGenero(det, genero)) continue;
            if (det.location && conObjeto) continue;   // Magnezone, Leafeon, Glaceon: con su piedra
            if (det.time_of_day && (det.time_of_day === "night") !== noche) continue;
            return { aId: r.aId, nivel: det.min_level || Math.max(12, (EVO_TABLA[r.aId] || [])[2] || 30) };
        }
    }
    return null;
}
// Evolución con un objeto: piedras y los que en los juegos se llevan al intercambiar o al subir de nivel.
async function evolucionConObjeto(id, k, genero) {
    for (const r of await ramasEvolucion(id)) {
        if (r.det.some((d) => ((d.item && d.item.name === k) || (d.held_item && d.held_item.name === k)) && encajaGenero(d, genero))) return r.aId;
    }
    return null;
}
// Evolución: la escena de Pokémon Essentials EBDX (fondo, rayos de luz, destellos que convergen y anillos), los sprites
// 2D animados y la música real de Blanco/Negro. cancelable: como en los juegos, se puede detener (no con piedras ni
// objetos). Devuelve true si ha evolucionado.
const EBDX_EVO = EBDX_BASE.replace(/Pokemon\/$/, "EBDX/Pictures/Evolution/");
function animarEvolucion(oldId, newId, cancelable = false) {
    return new Promise(async (resolve) => {
        const capa = document.createElement("div");
        capa.className = "capa-evolucion evo2";
        capa.innerHTML = `
            <div class="evo2-fondo"></div>
            <div class="evo2-rayos">${Array.from({ length: 12 }, (_, i) => `<img src="${EBDX_EVO}ray.png" alt="" style="--a:${i * 30}deg">`).join("")}</div>
            <img class="evo2-brillo" src="${EBDX_EVO}shine3.png" alt="">
            <div class="evo-sprites"><img class="evo-old" id="evo-old" alt=""><img class="evo-new" id="evo-new" alt=""></div>
            <div class="evo2-particulas"></div>
            <div class="evo2-velo"></div>
            <div class="evo-msg" id="evo-msg">¿Eh? ¡${nombrePk(oldId)} está evolucionando!</div>
            ${cancelable ? `<button class="btn-sec evo-detener">Detener</button>` : ""}`;
        const flash = document.createElement("div");
        flash.className = "evo-flash";
        document.body.appendChild(capa); document.body.appendChild(flash);
        document.body.style.overflow = "hidden";
        const sprites = capa.querySelector(".evo-sprites"), part = capa.querySelector(".evo2-particulas");
        const els = await Promise.all([montarPokemon(document.getElementById("evo-old"), oldId), montarPokemon(document.getElementById("evo-new"), newId)]);
        els.forEach((el) => tamanoNativo(el, 3, 230));
        AudioFX.grito(oldId, { vol: 0.5 });
        AudioFX.musicaSonar(MUSICA.evolucion, { bucle: false });
        let detenido = false;
        const bd = capa.querySelector(".evo-detener");
        if (bd) bd.onclick = () => { detenido = true; bd.disabled = true; AudioFX.ui("select"); };
        // Destellos que van hacia el Pokémon desde fuera, y anillos de luz que se abren.
        const destello = () => {
            const d = document.createElement("img");
            d.src = EBDX_EVO + (Math.random() < 0.5 ? "shine5.png" : "shine2.png"); d.className = "evo2-chispa"; d.alt = "";
            const ang = Math.random() * Math.PI * 2, r = 38 + Math.random() * 22;
            d.style.setProperty("--x", `${Math.cos(ang) * r}vmin`); d.style.setProperty("--y", `${Math.sin(ang) * r}vmin`);
            d.style.animationDuration = `${0.7 + Math.random() * 0.5}s`;
            part.appendChild(d); setTimeout(() => d.remove(), 1300);
        };
        const anillo = (grande = false) => {
            const a = document.createElement("img");
            a.src = EBDX_EVO + "shine4.png"; a.className = "evo2-anillo" + (grande ? " grande" : ""); a.alt = "";
            part.appendChild(a); setTimeout(() => a.remove(), 1400);
        };
        await esperar(1400);
        // Se convierte en luz.
        capa.classList.add("cargando-luz");
        let t = 0;
        const chispas = setInterval(() => { if (!detenido) { destello(); if (Math.random() < 0.6) destello(); } }, 110);
        const anillos = setInterval(() => { if (!detenido) anillo(); }, 950);
        await esperar(900);
        // Cambia de forma cada vez más deprisa.
        let intervalo = 560, mostrarNuevo = false;
        while (t < 4600 && !detenido) {
            mostrarNuevo = !mostrarNuevo;
            sprites.classList.toggle("mostrar-nuevo", mostrarNuevo);
            await esperar(intervalo);
            t += intervalo;
            intervalo = Math.max(80, Math.round(intervalo * 0.8));
        }
        clearInterval(chispas); clearInterval(anillos);
        if (bd) bd.remove();
        const msg = document.getElementById("evo-msg");
        let evoluciono = true;
        if (detenido) {   // se detuvo: vuelve a ser como era
            evoluciono = false;
            AudioFX.pararMusica();
            capa.classList.remove("cargando-luz");
            sprites.classList.remove("mostrar-nuevo");
            sprites.classList.add("detenida");
            AudioFX.grito(oldId, { vol: 0.5 });
            msg.textContent = `¿Eh? ¡${nombrePk(oldId)} ha dejado de evolucionar!`;
        } else {
            // Estalla la luz y aparece la nueva forma.
            flash.classList.add("activo");
            anillo(true); anillo(true);
            for (let n = 0; n < 16; n++) {
                const d = document.createElement("img");
                d.src = EBDX_EVO + "shine5.png"; d.className = "evo2-sale"; d.alt = "";
                const ang = (n / 16) * Math.PI * 2;
                d.style.setProperty("--x", `${Math.cos(ang) * 42}vmin`); d.style.setProperty("--y", `${Math.sin(ang) * 42}vmin`);
                part.appendChild(d); setTimeout(() => d.remove(), 1400);
            }
            await esperar(260);
            capa.classList.remove("cargando-luz"); capa.classList.add("evolucionado");
            sprites.classList.add("revelado");
            AudioFX.fanfarria(MUSICA.evolucionFanfarria);
            AudioFX.grito(newId, { vol: 0.6 });
            msg.textContent = `¡Enhorabuena! ¡Tu ${nombrePk(oldId)} ha evolucionado en ${nombrePk(newId)}!`;
        }
        setTimeout(() => flash.remove(), 700);
        const btn = document.createElement("button");
        btn.className = "evo-continuar"; btn.textContent = "Continuar";
        capa.appendChild(btn);
        const cerrar = () => { capa.remove(); flash.remove(); document.body.style.overflow = ""; document.removeEventListener("keydown", onEnter); resolve(evoluciono); };
        const onEnter = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); cerrar(); } };
        btn.onclick = cerrar;
        document.addEventListener("keydown", onEnter);
    });
}
async function intentarEvolucion(oldId) {
    const c = entrenador.capturados[oldId];
    if (!c || c.objeto === "everstone") return null;   // la Piedra Eterna impide evolucionar
    const evo = await evolucionDe(oldId, c.genero);
    if (!evo || (c.nivel || 0) < evo.nivel || entrenador.capturados[evo.aId]) return null;
    if (!(await completarEvolucion(oldId, evo.aId, true))) return null;   // se puede detener, como en los juegos
    return { oldId, newId: evo.aId };
}
// Animación y cambio de especie conservando todo (nivel, objeto, mote, movimientos, esfuerzo…).
async function completarEvolucion(oldId, newId, cancelable = false) {
    const antesMax = await psMaxDe(oldId);
    if (!(await animarEvolucion(oldId, newId, cancelable))) return false;
    const e = entrenador.capturados[oldId];
    delete entrenador.capturados[oldId];
    entrenador.capturados[newId] = e;
    entrenador.equipo = entrenador.equipo.map((x) => (x === oldId ? newId : x));
    entrenador.evoluciones = (entrenador.evoluciones || 0) + 1;
    if (entrenador.metro && Array.isArray(entrenador.metro.equipo)) entrenador.metro.equipo = entrenador.metro.equipo.map((x) => (x === oldId ? newId : x));   // (sigue en el Metro)
    if (entrenador.starter === oldId) entrenador.starter = newId;
    if (e.hp != null) { const ahoraMax = await psMaxDe(newId); e.hp = Math.min(ahoraMax, e.hp + Math.max(0, ahoraMax - antesMax)); }
    guardarEntrenador();
    return true;
}

// ===================== EQUIPOS Y RIVALES COHERENTES =====================
// Especie que ya existe a ese nivel (Bewear no antes del 27) y que no lleve "margen" niveles sin evolucionar.
async function especieCoherente(nivel, excluir, pool, margen = 15) {
    const base = (pool || poolBatalla()).filter((p) => !esLegendario(p.id) && !excluir.has(p.id));
    const lista = base.length ? base : poolBatalla().filter((p) => !esLegendario(p.id));
    let valido = null, mejor = null, mejorMin = Infinity;
    for (let i = 0; i < 16; i++) {
        const cand = alAzar(lista).id;
        let info; try { info = await etapaEvolutiva(cand); } catch (_) { info = { nivelMin: 1, nivelEvo: Infinity }; }
        if (info.nivelMin <= nivel) {
            if (info.nivelEvo + margen > nivel) { excluir.add(cand); return cand; }
            valido ??= cand;
        } else if (info.nivelMin < mejorMin) { mejor = cand; mejorMin = info.nivelMin; }
    }
    const c = valido ?? mejor ?? alAzar(lista).id; excluir.add(c); return c;
}
async function elegirSalvaje(nivelLead) {
    let id, nivel;
    if (nivelLead >= 30 && Math.random() < 1 / RATIO_RARO) {
        id = alAzar([...LEGENDARIOS]);
        nivel = limitar(nivelLead + aleatorioEntre(3, 8), 35, 100);
    } else {
        nivel = limitar(nivelLead + aleatorioEntre(-3, 1), 2, 100);   // algo por debajo de tu líder, como en las rutas
        let pool = null;
        const tipo = tipoBuscado();
        if (tipo && Math.random() < 0.4) { try { const set = await idsPorTipo(tipo); pool = poolBatalla().filter((x) => set.has(x.id)); } catch (_) {} }
        id = await especieCoherente(nivel, new Set(), pool);
    }
    return { id, nivel, shiny: Math.random() < probShiny() };
}
async function specsRivalCoherentes(n, nivelBase, minDelta, maxDelta, pool) {
    const excl = new Set(), out = [];
    for (let i = 0; i < n; i++) {
        const nivel = limitar(nivelBase + aleatorioEntre(minDelta, maxDelta), 2, 100);
        out.push({ id: await especieCoherente(nivel, excl, pool, 6), nivel });
    }
    return out;
}
// Equipo de un tipo (gimnasios, Liga): su as al nivel indicado y el resto algo por debajo.
async function specsDeTipo(tipo, n, nivelAs, asId) {
    let pool = poolBatalla();
    try { const set = await idsPorTipo(tipo); pool = pool.filter((p) => set.has(p.id)); } catch (_) {}
    const resto = await specsRivalCoherentes(Math.max(0, n - 1), nivelAs, -5, -2, pool.filter((p) => p.id !== asId));
    // El as lleva un objeto, como en los juegos (Baya Zidra; en la Liga, algo más fuerte).
    const objeto = nivelAs >= 85 ? alAzar(["leftovers", "life-orb", "focus-sash", "expert-belt"]) : "sitrus-berry";
    return resto.concat([{ id: asId, nivel: nivelAs, objeto }]);
}
// Equipo de unos tipos concretos (entrenadores de ruta, rivales, villanos): cada Pokémon tiene al menos uno de ellos.
async function specsDeTipos(tipos, n, nivelBase, minDelta, maxDelta) {
    let pool = null;
    try {
        const sets = await Promise.all(tipos.map((t) => idsPorTipo(t)));
        pool = poolBatalla().filter((p) => sets.some((st) => st.has(p.id)));
    } catch (_) {}
    return specsRivalCoherentes(n, nivelBase, minDelta, maxDelta, pool && pool.length ? pool : null);
}
// Los entrenadores fuertes llevan una megapiedra y megaevolucionan en combate (como Dianta o Corelia).
// Se la da a quien pueda usarla (mejor el as); si nadie puede, entra un Pokémon de sus tipos que sí, en lugar del más flojo.
async function conMega(specs, tipos) {
    if (!specs.length || specs.some((s) => megaDe(s.id, s.objeto))) return specs;
    let i = -1;
    for (let k = specs.length - 1; k >= 0; k--) if (piedrasDe(specs[k].id).length) { i = k; break; }
    if (i < 0 && tipos && tipos.length) {
        let cand = [];
        try {
            const sets = await Promise.all(tipos.map((t) => idsPorTipo(t)));
            cand = [...new Set(Object.values(MEGAS).map((m) => m.base))]
                .filter((id) => !esLegendario(id) && sets.some((st) => st.has(id)) && !specs.some((s) => s.id === id));
        } catch (_) {}
        if (cand.length) {
            const resto = specs.slice(0, -1);
            const flojo = resto.length ? resto.reduce((m, s, k) => (s.nivel < resto[m].nivel ? k : m), 0) : -1;
            const nivel = Math.max(...specs.map((s) => s.nivel)) - 1;
            if (flojo >= 0) specs.splice(flojo, 1);
            specs.splice(Math.max(0, specs.length - 1), 0, { id: alAzar(cand), nivel });
            i = Math.max(0, specs.length - 2);
        }
    }
    if (i >= 0) specs[i].objeto = alAzar(piedrasDe(specs[i].id));
    return specs;
}
// ---- Dificultad aplicada a cada equipo rival ----
// Tipos más repetidos de un equipo (para que los Pokémon extra sean de su estilo).
async function tiposDelEquipo(specs) {
    const cuenta = {};
    for (const s of specs) {
        try { (await cargarPokemon(s.id)).types.forEach((t) => { cuenta[t.type.name] = (cuenta[t.type.name] || 0) + 1; }); } catch (_) {}
    }
    return Object.keys(cuenta).sort((a, b) => cuenta[b] - cuenta[a]).slice(0, 2);
}
// Objeto equipado de un Pokémon rival según la dificultad, acorde con cómo ataca (fisico: true, false o null si no se sabe).
function objetoRival(D, importante, fisico = null) {
    const t = importante ? D.objetosLider : D.objetos;
    if (t === "todos") {
        const suyos = fisico == null ? [] : fisico ? ["choice-band", "life-orb", "expert-belt"] : ["choice-specs", "life-orb", "expert-belt"];
        return alAzar(OBJETOS_RIVAL.todos.filter((k) => k !== "choice-band" && k !== "choice-specs").concat(suyos, suyos));
    }
    if (t === "algunos" && Math.random() < 0.6) return alAzar(OBJETOS_RIVAL.algunos.filter((k) => fisico == null || k !== (fisico ? "wise-glasses" : "muscle-band")));
    return null;
}
// Entrenamiento de un Pokémon rival (b: sus estadísticas base): esfuerzo en su mejor ataque y en Velocidad (o PS si es
// lento) y, con esfuerzo al máximo (o a veces con el medio), la naturaleza que le va: Firme, Modesta, Alegre o Miedosa.
function entrenarRival(s, nivel, b) {
    if (!nivel || !b) return;
    const fisico = b.attack >= b["special-attack"], rapido = b.speed >= 70, n = nivel >= 2 ? 252 : 128;
    s.ev = { [fisico ? "attack" : "special-attack"]: n, [rapido ? "speed" : "hp"]: n,
        [rapido ? "hp" : b.defense >= b["special-defense"] ? "defense" : "special-defense"]: nivel >= 2 ? 6 : 64 };
    if (nivel >= 2 || Math.random() < 0.5) s.naturaleza = rapido ? (fisico ? "jolly" : "timid") : (fisico ? "adamant" : "modest");
}
// Objetos y entrenamiento de un equipo rival (importante: líderes, rivales, jefes y Liga).
async function reforzarEquipo(specs, D, importante) {
    await Promise.all(specs.map(async (s) => {
        let b = null, tipos = [];
        try { b = {}; const d = await cargarPokemon(s.id); d.stats.forEach((x) => { b[x.stat.name] = x.base_stat; }); tipos = d.types.map((t) => t.type.name); } catch (_) { b = null; }
        entrenarRival(s, D.esfuerzo[importante ? "lider" : "ruta"], b);
        // Con todos los objetos, los muy débiles a la Roca (Charizard, Volcarona…) suelen llevar Botas Gruesas contra Trampa Rocas.
        if (!s.objeto && D[importante ? "objetosLider" : "objetos"] === "todos" && tipos.length && efectividad("rock", tipos) >= 4 && Math.random() < 0.6) s.objeto = "heavy-duty-boots";
        if (!s.objeto) s.objeto = objetoRival(D, importante, b ? b.attack >= b["special-attack"] : null);
    }));
    return specs;
}
// categoria: la del pago (ruta, gimnasio, rival, villano, lider, alto, campeon).
async function ajustarEquipo(specs, categoria = "ruta") {
    const D = dificultad();
    const esLider = ["lider", "alto", "campeon"].includes(categoria), importante = esLider || categoria === "rival" || categoria === "villano";
    let out = specs.map((s) => Object.assign({}, s, { nivel: limitar(s.nivel + (esLider ? D.lider : D.entrenador), 1, 100) }));
    const extra = Math.min(6 - out.length, importante ? D.extraLider : D.extra);
    if (extra > 0) {
        try {
            const tipos = await tiposDelEquipo(out), as = out[out.length - 1];
            const nuevos = (await specsDeTipos(tipos, extra, Math.max(...out.map((s) => s.nivel)) - 1, -3, 0))
                .filter((n) => !out.some((s) => s.id === n.id));
            out = out.slice(0, -1).concat(nuevos, [as]);
        } catch (_) {}
    }
    return reforzarEquipo(out, D, importante);
}
// Premios según la dificultad: los objetos gastables llegan en menor cantidad (y en Extremo a veces no llegan).
function premiosDificultad(lista) {
    const D = dificultad();
    return lista.map(([k, n]) => {
        const gastable = !(k in MT) && !Object.values(CRISTAL_Z).includes(k) && obj(k).bolsillo !== "clave" && !MEGAS[k];
        if (!gastable || D.premios >= 1) return [k, n];
        const m = Math.round(n * D.premios);
        return [k, m > 0 ? m : Math.random() < D.premios ? 1 : 0];
    }).filter(([, n]) => n > 0);
}
// Pokémon vistos en combate (para la Pokédex de cada ruta del modo Región).
function marcarVisto(id) {
    if (!Array.isArray(entrenador.vistos)) entrenador.vistos = [];
    if (!entrenador.vistos.includes(id)) entrenador.vistos.push(id);
}
// Tu equipo para combatir (conSalud = false: con la salud al máximo, p. ej. en el combate rápido).
async function specsMiEquipo(conSalud = true) {
    const out = [];
    for (const id of entrenador.equipo) {
        const e = entrenador.capturados[id];
        out.push({
            id, nivel: e.nivel || 5, objeto: e.objeto || null, bola: e.bola || "poke-ball", xp: e.xp || 0, movimientos: await asegurarMovimientos(id),
            genero: e.genero, mote: e.mote, shiny: !!e.shiny, ev: e.ev, hp: conSalud ? e.hp : null, estado: conSalud ? e.estado : null,
            naturaleza: e.naturaleza, habSlot: e.habSlot, teraTipo: e.teraTipo,
        });
    }
    return out;
}
function sincronizarEquipoCombate(equipo) {
    if (!equipo) return;
    equipo.forEach((c) => {
        const e = entrenador.capturados[c.baseId]; if (!e) return;
        e.nivel = c.nivel; e.xp = c.xp;
        if (e.genero === undefined) e.genero = c.genero;
        e.objeto = c.objeto || null;   // las bayas y la Banda Aguante se gastan
        // Los PS y el estado se mantienen hasta pasar por el Centro Pokémon.
        if (c.hp >= c.hpMax) delete e.hp; else e.hp = Math.max(0, c.hp);
        e.estado = c.hp > 0 && c.estado ? c.estado.tipo : null;
        if (Array.isArray(c.movimientos) && c.movimientos.length) e.movimientos = c.movimientos.map(({ ppAct: _, ...m }) => m);
        if (c.olvidados) e.olvidados = [...new Set([...(e.olvidados || []), ...c.olvidados])].filter((k) => !(e.movimientos || []).some((m) => m.clave === k));
    });
    if (typeof avanzarHuevos === "function") avanzarHuevos();   // (los huevos que llevas, un combate más cerca de abrirse)
    guardarEntrenador();
}
// PS máximos de un Pokémon capturado (fuera de combate).
async function psMaxDe(id) {
    const e = entrenador.capturados[id]; if (!e) return 1;
    try {
        const d = await cargarPokemon(id), base = {};
        d.stats.forEach((st) => { base[st.stat.name] = st.base_stat; });
        return statsDeNivel(base, e.nivel || 5, e.ev).hpMax;
    } catch (_) { return 1; }
}
const equipoDebilitado = () => entrenador.equipo.length > 0 && entrenador.equipo.every((id) => entrenador.capturados[id]?.hp === 0);
const equipoHerido = () => entrenador.equipo.some((id) => { const e = entrenador.capturados[id]; return e && (e.hp != null || e.estado); });
function curarEquipo() {
    Object.values(entrenador.capturados).forEach((e) => { delete e.hp; e.estado = null; });
    guardarEntrenador();
}
const llevaMonedaAmuleto = () => entrenador.equipo.some((id) => entrenador.capturados[id]?.objeto === "amulet-coin");
async function asegurarMovimientos(id) {
    const e = entrenador.capturados[id];
    if (!e) return [];
    if (Array.isArray(e.movimientos) && e.movimientos.length) return e.movimientos;
    try {
        const d = await cargarPokemon(id);
        const mv = await construirMovesetReal(d, e.nivel || 5);
        e.movimientos = mv && mv.length ? mv : [];
        guardarEntrenador();
    } catch (_) { e.movimientos = e.movimientos || []; }
    return e.movimientos;
}

// ---- Aprender movimientos nuevos (con opción de cambiar) ----
function ofrecerAprender(id, mov) {
    return new Promise((resolve) => {
        const e = entrenador.capturados[id];
        if (!e) return resolve();
        if (!Array.isArray(e.movimientos)) e.movimientos = [];
        if (e.movimientos.some((x) => (x.clave || x.nombre) === (mov.clave || mov.nombre))) return resolve();
        const { nivel: _, ...limpio } = mov;
        if (e.movimientos.length < 4) {
            e.movimientos.push(limpio); guardarEntrenador();
            AudioFX.efecto("level_up_fanfare");
            toast(`¡${nombrePk(id)} aprendió ${mov.nombre}!`);
            return resolve();
        }
        mostrarAprenderMovimiento(id, limpio, resolve);
    });
}
function mostrarAprenderMovimiento(id, nuevoMov, done) {
    const e = entrenador.capturados[id];
    const nombre = nombrePk(id);
    const capa = document.createElement("div");
    capa.className = "capa-resumen";
    capa.innerHTML = `<div class="resumen aprender">
        <div class="apr-cabecera">
            <span class="apr-sprite-caja"><img class="apr-sprite" alt=""></span>
            <div class="apr-titbox">
                <h3>¡${nombre} quiere aprender ${nuevoMov.nombre}!</h3>
                <p class="nota">Pero ya conoce cuatro movimientos. ¿Cuál quieres que olvide?</p>
            </div>
        </div>
        <div class="apr-move es-nuevo">${htmlMovFicha(nuevoMov, '<span class="apr-badge">NUEVO</span>')}</div>
        <div class="apr-flecha">Cambiar por:</div>
        <div class="apr-lista">
            ${e.movimientos.map((x, i) => `<button class="apr-op" data-olvidar="${i}">${htmlMovFicha(x)}</button>`).join("")}
        </div>
        <div class="res-acciones"><button class="btn-sec" data-no>No aprender ${nuevoMov.nombre}</button></div>
    </div>`;
    document.body.appendChild(capa); document.body.style.overflow = "hidden";
    montarPokemon(capa.querySelector(".apr-sprite"), id, { shiny: !!e.shiny }).then((el) => tamanoNativo(el, 1, 80, 96));
    const cerrar = () => { capa.remove(); document.body.style.overflow = ""; document.removeEventListener("keydown", onEsc); if (done) done(); };
    const onEsc = (ev) => { if (ev.key === "Escape") { toast(`${nombre} no aprendió ${nuevoMov.nombre}.`); cerrar(); } };
    document.addEventListener("keydown", onEsc);
    capa.querySelectorAll("[data-olvidar]").forEach((b) => b.onclick = () => {
        const i = Number(b.dataset.olvidar), viejo = e.movimientos[i];
        e.movimientos[i] = { ...nuevoMov };
        e.olvidados = [...new Set([...(e.olvidados || []), viejo.clave])].filter((k) => k !== nuevoMov.clave);
        guardarEntrenador();
        AudioFX.efecto("level_up_fanfare");
        toast(`1, 2 y... ¡Puf! ${nombre} olvidó ${viejo.nombre} y aprendió ${nuevoMov.nombre}.`, 3200);
        cerrar();
    });
    capa.querySelector("[data-no]").onclick = () => { toast(`${nombre} no aprendió ${nuevoMov.nombre}.`); cerrar(); };
}
// Evolución al terminar un combate (la pide el propio combate): guarda su progreso y evoluciona.
async function evolucionarEnCombate(c) {
    sincronizarEquipoCombate([c]);
    const evo = await intentarEvolucion(c.baseId);
    return evo ? evo.newId : null;
}
// Fuera de combate (Caramelo Raro): movimientos nuevos y evolución de quien subió de nivel.
async function trasSubirNivel(nivelesAntes) {
    for (const id of [...entrenador.equipo]) {
        const e = entrenador.capturados[id];
        const antes = nivelesAntes[id];
        if (!e || antes == null || (e.nivel || 5) <= antes) continue;
        try {
            const d = await cargarPokemon(id);
            await asegurarMovimientos(id);
            for (const mov of await nuevosMovimientos(d, antes, e.nivel || 5, e.movimientos || [])) await ofrecerAprender(id, mov);
        } catch (_) {}
    }
    // Como en Blanco 2: solo evoluciona quien ha subido de nivel en el combate.
    for (const id of [...entrenador.equipo]) {
        const antes = nivelesAntes[id];
        if (antes == null || (entrenador.capturados[id]?.nivel || 5) <= antes) continue;
        try {
            const evo = await intentarEvolucion(id);
            if (!evo) continue;
            const d2 = await cargarPokemon(evo.newId), ee = entrenador.capturados[evo.newId];
            for (const mov of await movimientosDeEvolucion(d2, ee.nivel || 5, ee.movimientos || [])) await ofrecerAprender(evo.newId, mov);
        } catch (_) {}
    }
}
const instantaneaNiveles = () => { const n = {}; entrenador.equipo.forEach((id) => { n[id] = entrenador.capturados[id].nivel || 5; }); return n; };

// ===================== RECOMPENSAS =====================
// Megapiedra que aún no tienes (mejor si es de un Pokémon que ya has capturado). Devuelve su clave.
function recompensaMegapiedra() {
    const faltan = Object.keys(MEGAS).filter((k) => !tieneObjeto(k));
    if (!faltan.length) return null;
    const tuyas = faltan.filter((k) => entrenador.capturados[MEGAS[k].base]);
    const k = alAzar(tuyas.length ? tuyas : faltan);
    meterObjeto(k);
    return k;
}
// Hallazgos en la hierba alta: [objeto, peso, medallas necesarias]. Más y mejores objetos según avanzas.
const TABLA_HALLAZGOS = [
    ["potion", 14, 0], ["poke-ball", 10, 0], ["oran-berry", 8, 0], ["antidote", 5, 0], ["paralyze-heal", 4, 0], ["awakening", 3, 0],
    ["tiny-mushroom", 3, 0], ["pretty-wing", 2, 0], ["great-ball", 8, 1], ["super-potion", 8, 1], ["pecha-berry", 3, 1], ["cheri-berry", 3, 1],
    ["rawst-berry", 3, 1], ["chesto-berry", 3, 1], ["x-attack", 2, 1], ["x-defense", 2, 1], ["pearl", 3, 1], ["stardust", 3, 1],
    ["ether", 3, 2], ["revive", 3, 2], ["full-heal", 3, 2], ["sitrus-berry", 4, 2], ["x-speed", 2, 2], ["dire-hit", 1, 2],
    ["ultra-ball", 7, 3], ["hyper-potion", 5, 3], ["net-ball", 2, 3], ["dusk-ball", 2, 3], ["timer-ball", 2, 3], ["repeat-ball", 2, 3],
    ["fire-stone", 1, 3], ["water-stone", 1, 3], ["thunder-stone", 1, 3], ["leaf-stone", 1, 3], ["moon-stone", 1, 3], ["nugget", 2, 3],
    ["big-mushroom", 2, 3], ["quick-ball", 2, 4], ["sun-stone", 1, 4], ["big-pearl", 1, 4], ["quick-claw", 1, 4], ["amulet-coin", 1, 4],
    ["elixir", 2, 5], ["rare-candy", 1, 5], ["star-piece", 1, 5], ["ice-stone", 1, 5], ["lum-berry", 2, 5], ["kings-rock", 1, 5],
    ["scope-lens", 1, 5], ["focus-band", 1, 5], ["hp-up", 1, 6], ["protein", 1, 6], ["iron", 1, 6], ["calcium", 1, 6], ["zinc", 1, 6],
    ["carbos", 1, 6], ["shiny-stone", 1, 6], ["dusk-stone", 1, 6], ["dawn-stone", 1, 6], ["rare-bone", 1, 6], ["lucky-egg", 1, 6],
    ["max-potion", 2, 7], ["max-revive", 1, 7], ["pp-up", 1, 7], ["liechi-berry", 1, 7], ["salac-berry", 1, 7], ["petaya-berry", 1, 7],
    ["leftovers", 1, 8], ["full-restore", 1, 9], ["relic-gold", 1, 8], ["big-nugget", 1, 10], ["comet-shard", 1, 12], ["pp-max", 1, 12],
];
function hallazgo(prob = 0.35) {
    if (Math.random() > prob * dificultad().hallazgo) return null;   // menos objetos en las dificultades altas
    const pool = TABLA_HALLAZGOS.filter((x) => x[2] <= nMedallas());
    let r = Math.random() * pool.reduce((a, x) => a + x[1], 0);
    const k = (pool.find((x) => (r -= x[1]) < 0) || pool[0])[0];
    meterObjeto(k);
    return k;
}
// Objeto que lleva a veces un Pokémon salvaje (se queda con él si lo capturas).
function objetoSalvaje(nivel) {
    const r = Math.random();
    if (r > 0.12) return null;
    if (r < 0.03 && nivel >= 15) return alAzar(["sitrus-berry", "lum-berry", "leppa-berry", "nugget", "star-piece", "big-pearl", "quick-claw",
        "kings-rock", "everstone", "silk-scarf", "soft-sand", "hard-stone", "miracle-seed", "charcoal", "mystic-water", "magnet", "sharp-beak"]);
    return alAzar(["oran-berry", "pecha-berry", "cheri-berry", "rawst-berry", "chesto-berry", "aspear-berry", "tiny-mushroom", "pearl", "stardust"]);
}

// ===================== POKÉMON FURIOSOS (la Furia Carmesí) =====================
// Desde la primera medalla, a veces (más de noche) sale un salvaje envuelto en un aura carmesí: tres niveles más, todas
// sus características subidas al entrar, más difícil de capturar y con un objeto valioso que suelta al calmarlo (o que
// sigue llevando si lo capturas). Los legendarios nunca salen furiosos.
const PROB_FURIA = 0.05;
const FURIA_OBJETOS = ["life-orb", "choice-scarf", "choice-band", "choice-specs", "focus-sash", "leftovers", "assault-vest", "weakness-policy",
    "expert-belt", "rocky-helmet", "booster-energy", "loaded-dice", "rare-candy", "pp-up", "big-nugget", "comet-shard"];
function specSalvaje(s, L = null) {
    const tormenta = !!L && climaDeLugar(L) === "lluvia";   // (con lluvia, el doble)
    const furioso = nMedallas() >= 1 && !esLegendario(s.id) && Math.random() < PROB_FURIA * (claseHora() === "noche" ? 1.6 : 1) * (tormenta ? 2 : 1);
    if (!furioso) return { id: s.id, nivel: s.nivel, shiny: s.shiny, objeto: objetoSalvaje(s.nivel) };
    return { id: s.id, nivel: limitar(s.nivel + 3, 1, 100), shiny: s.shiny, objeto: alAzar(FURIA_OBJETOS), furioso: true, probOculta: 0.5 };
}
// Al calmar (vencer) a un Furioso: cuenta para los logros y suelta su objeto (si lo gastó, otro de premio).
function calmarFurioso(furioso, capturado) {
    entrenador.furiosos = (entrenador.furiosos || 0) + 1;
    if (capturado) return null;
    const k = furioso.objeto || alAzar(["rare-candy", "pp-up", "nugget"]);
    meterObjeto(k);
    return k;
}

// ===================== COMBATES CONTRA ENTRENADORES (historia) =====================
function avisoDebilitado() {
    AudioFX.ui("error");
    toast("Tus Pokémon están debilitados. ¡Llévalos al Centro Pokémon!");
}
async function combateEntrenador(cfg) {
    if (equipoDebilitado()) return avisoDebilitado();
    try {
        mostrarCargaBatalla(cfg.vs ? { vs: true, sprite: cfg.sprite, titulo: cfg.titulo, estilo: cfg.vs === true ? "" : cfg.vs } : {});
        AudioFX.musicaSonar(cfg.musicaEncuentro || cfg.musica || temaEntrenador());   // suena ya, mientras se prepara el combate
        const D = dificultad();
        const specs = await ajustarEquipo(typeof cfg.specs === "function" ? await cfg.specs() : cfg.specs, cfg.pago || "ruta");
        const premio = cfg.pago ? Math.round(pagoDe(cfg.pago, specs) * D.dinero) * (llevaMonedaAmuleto() ? 2 : 1) : 0;   // Moneda Amuleto: el doble
        const curas = cfg.pago ? D.curas[cfg.pago] || 0 : 0;
        const [aliados, enemigos] = await Promise.all([prepararEquipo(await specsMiEquipo()), prepararEquipo(specs)]);
        const poderRival = cfg.poderRival !== undefined ? cfg.poderRival
            : cfg.pago === "lider" ? "dinamax" : ["rival", "alto", "campeon"].includes(cfg.pago) ? "tera" : null;
        Combate.iniciar({
            aliados, enemigos, salvaje: false, permitirCaptura: false, premio, poderRival,
            curasRival: curas ? { n: curas, objeto: D.objetoCura } : null, ia: D.ia, cambiosRival: D.cambios,
            titulo: cfg.titulo, entrenadorSprite: cfg.sprite, dialogo: cfg.dialogo, dialogoDerrota: cfg.dialogoDerrota,
            musica: cfg.musica, musicaEncuentro: cfg.musicaEncuentro, victoria: cfg.victoria, fondo: cfg.fondo, climaInicial: cfg.clima || null,
            bolsa: entrenador.mochila, guardarBolsa: guardarEntrenador, evolucionar: evolucionarEnCombate,
            darXP: true, expShare: () => config.expShare, generoJugador: entrenador.genero,
            alTerminar: async (r) => {
                sincronizarEquipoCombate(r.equipo);
                if (r.gano) {
                    entrenador.batallasGanadas++; entrenador.entrenadoresVencidos = (entrenador.entrenadoresVencidos || 0) + 1;
                    entrenador.dinero = (entrenador.dinero || 0) + premio; guardarEntrenador(); if (cfg.alGanar) await cfg.alGanar();
                }
                else if (r.gano === false) perderDinero("Entrena a tu equipo y vuelve a intentarlo.");
                if (cfg.despues) return cfg.despues(r);
                renderAventura();
            },
        });
    } catch (_) { errorCombate(); }
}
// Como en los juegos, perder cuesta dinero y vuelves al Centro Pokémon con el equipo curado.
function perderDinero(consejo) {
    const perdida = Math.floor((entrenador.dinero || 0) / 4);
    entrenador.dinero = (entrenador.dinero || 0) - perdida;
    if (modoRegion()) volverAlCentro();
    curarEquipo();
    toast(`Has perdido...${perdida ? ` Pierdes ${dineroTexto(perdida)}.` : ""} Vuelves al Centro Pokémon y tu equipo se recupera. ${consejo}`, 4600);
}
function retarGimnasio(g) {
    combateEntrenador({
        titulo: `Líder ${g.nombre}`, sprite: g.lider, dialogo: g.intro, dialogoDerrota: g.derrota,
        musica: g.musica, victoria: MUSICA.victoriaGimnasio, fondo: FONDO_TIPO[g.tipo], pago: "lider", vs: true,
        // A partir del noveno gimnasio, los líderes megaevolucionan a uno de los suyos.
        specs: async () => { const sp = await specsDeTipo(g.tipo, g.tamano, g.nivel, g.as); return g.n >= 9 ? conMega(sp, [g.tipo]) : sp; },
        alGanar: async () => {
            if (!entrenador.medallas.includes(g.n)) entrenador.medallas.push(g.n);
            // Como en los juegos: la MT del líder; y el cristal Z de su tipo, una megapiedra y material.
            const premios = darObjetos(premiosDificultad([[MT_GIMNASIO[g.n - 1], 1], [CRISTAL_Z[g.tipo], 1], ["ultra-ball", 2], ["hyper-potion", 1]]));
            const piedra = recompensaMegapiedra();
            if (piedra) premios.push([piedra, 1]);
            guardarEntrenador(); lanzarConfeti();
            await mostrarMedalla(g, premios);
        },
    });
}
function mostrarMedalla(g, premios) {
    return new Promise((resolve) => {
        const capa = document.createElement("div");
        capa.className = "capa-resumen";
        capa.innerHTML = `<div class="resumen medalla-obtenida">
            <img class="medalla-grande" src="${urlMedalla(g.medalla)}" alt="">
            <h3>¡Has conseguido la ${g.nombreMedalla}!</h3>
            <p class="nota">Líder ${g.nombre} · ${g.ciudad}</p>
            ${premios.length ? `<p class="premios-tit">También recibes</p>
            <div class="premios">${premios.map(([k, n]) => `<div class="premio"><img src="${urlObj(k)}" alt=""><span>${n > 1 ? `${n}× ` : ""}${obj(k).nombre}</span></div>`).join("")}</div>` : ""}
            <div class="res-acciones"><button class="btn-grande" data-ok>Guardar en el estuche</button></div>
        </div>`;
        document.body.appendChild(capa);
        AudioFX.efecto("item_fanfare");
        capa.querySelector("[data-ok]").onclick = () => { capa.remove(); resolve(); };
    });
}
// Entrenadores del gimnasio (de su tipo), uno tras otro antes del líder.
function combatirEntrenadorGimnasio(g) {
    const p = progresoGym(), lista = ENTRENADORES_GIMNASIO[g.tipo] || CLASES_ENTRENADOR;
    const clase = lista[p.gimnasio % lista.length];
    const n = Math.min(3, 1 + Math.floor((g.n - 1) / 5));
    combateEntrenador({
        titulo: nombreNPC(clase), sprite: clase.sprite, dialogo: alAzar(FRASES_GIMNASIO),
        dialogoDerrota: `¡Uf! El líder ${g.nombre} te espera más adelante.`,
        musicaEncuentro: mus("encounter_ace_trainer"), fondo: FONDO_TIPO[g.tipo], pago: "gimnasio",
        specs: async () => {
            let pool = null;
            try { const set = await idsPorTipo(g.tipo); pool = poolBatalla().filter((x) => set.has(x.id) && x.id !== g.as); } catch (_) {}
            return specsRivalCoherentes(n, g.nivel - 3, -2, 0, pool);
        },
        alGanar: async () => { progresoGym().gimnasio++; guardarEntrenador(); },
    });
}
// Como en Blanco 2: el rival lleva el inicial con ventaja sobre el tuyo, evolucionado según su nivel.
async function starterRival(nivel) {
    const i = STARTERS.findIndex((b) => entrenador.starter >= b && entrenador.starter <= b + 2);
    if (i < 0) return null;
    const base = STARTERS[i - (i % 3) + ((i % 3) + 1) % 3];
    for (const cand of [base + 2, base + 1]) { try { if ((await etapaEvolutiva(cand)).nivelMin <= nivel) return cand; } catch (_) {} }
    return base;
}
function combatirMision(ms) {
    const nivel = GIMNASIOS[Math.min(15, ms.tras - 1)].nivel + (ms.jefe ? 3 : 1);
    const crearSpecs = async () => {
        let specs;
        if (ms.equipo) {
            // Cada villano con los tipos de su equipo o los suyos propios.
            specs = await specsDeTipos(ms.tipos || EQUIPOS_VILLANOS[ms.equipo].tipos, ms.tamano, nivel, -4, 0);
            if (ms.jefe) specs[specs.length - 1] = { id: ms.equipo === "eclipse" ? 668 : 700, nivel: nivel + 2 };
        } else {
            // Cada rival con sus tipos favoritos (Matís, con el de su inicial).
            const iS = STARTERS.findIndex((b) => entrenador.starter >= b && entrenador.starter <= b + 2);
            const tipos = ms.id.startsWith("matis") ? [["grass", "fire", "water"][(Math.max(0, iS) % 3 + 1) % 3], "flying"] : ms.tipos || ["normal"];
            specs = await specsDeTipos(tipos, ms.tamano, nivel, -3, 1);
            if (ms.id.startsWith("matis")) { const s = await starterRival(nivel + 2); if (s) specs[specs.length - 1] = { id: s, nivel: nivel + 2 }; }
        }
        if (ms.jefe || !ms.equipo) specs[specs.length - 1].objeto = "sitrus-berry";   // el as del rival y del jefe
        // Los jefes villanos y los rivales de la segunda mitad del viaje megaevolucionan.
        if (ms.jefe || (!ms.equipo && ms.tras >= 8)) {
            const tipos = ms.equipo ? ms.tipos || EQUIPOS_VILLANOS[ms.equipo].tipos : ms.tipos || null;
            return conMega(specs, tipos);
        }
        return specs;
    };
    const eq = ms.equipo ? EQUIPOS_VILLANOS[ms.equipo] : null;
    const musica = eq
        ? (ms.musica === "jefe" ? eq.musicaJefe : ms.musica === "comandante" ? (eq.musicaComandante || eq.musicaRecluta) : eq.musicaRecluta)
        : MUSICA_RIVAL[ms.id] || MUSICA.rival[Math.min(2, Math.floor(ms.tras / 6))];
    combateEntrenador({
        titulo: ms.nombre, sprite: ms.sprite, dialogo: ms.intro, dialogoDerrota: ms.derrota, specs: crearSpecs, musica,
        fondo: eq ? (ms.equipo === "eclipse" ? "volcanocave" : "dampcave") : "route",
        musicaEncuentro: eq ? mus("encounter_plasma_grunt") : mus("encounter_rival"),
        victoria: eq ? MUSICA.victoriaVillano : MUSICA.victoriaEntrenador, pago: eq ? "villano" : "rival",
        poderRival: eq ? (ms.jefe ? "dinamax" : null) : "tera",
        vs: !eq ? true : ms.jefe || ms.musica === "comandante" ? "malvado" : false,
        alGanar: async () => {
            if (!entrenador.eventos.includes(ms.id)) entrenador.eventos.push(ms.id);
            const premios = darObjetos(premiosDificultad(ms.jefe ? [["master-ball", 1], ["max-revive", 1], ["nugget", 1]]
                : eq ? [["ultra-ball", 1], ["super-potion", 2], ["x-attack", 1]] : [["hyper-potion", 1], ["revive", 1], ["rare-candy", 1]]));
            const piedra = ms.jefe ? recompensaMegapiedra() : null;
            if (piedra) premios.push([piedra, 1]);
            guardarEntrenador();
            toast("Recibes: " + textoPremios(premios), 4600);
        },
    });
}
// Revanchas (como en Blanco 2): siendo Campeón, cada líder acepta otro combate con seis Pokémon de nivel muy alto. Paga
// como un líder y, una vez al día por líder, da además un premio.
const nivelRevancha = (g) => Math.min(100, 70 + g.n);
const hoyISO = () => new Date().toISOString().slice(0, 10);
function retarRevancha(g) {
    const campeonTxt = entrenador.genero === "f" ? "la Campeona" : "el Campeón";
    combateEntrenador({
        titulo: `Líder ${g.nombre}`, sprite: g.lider, dialogo: `¡Así que ${campeonTxt} quiere revancha! Esta vez no me guardo nada.`, dialogoDerrota: g.derrota,
        musica: g.musica, victoria: MUSICA.victoriaGimnasio, fondo: FONDO_TIPO[g.tipo], pago: "lider", vs: true, poderRival: "dinamax",
        specs: async () => conMega(await specsDeTipo(g.tipo, 6, nivelRevancha(g), g.as), [g.tipo]),
        alGanar: async () => {
            const r = entrenador.revanchas || (entrenador.revanchas = {}), antes = r[g.n];
            r[g.n] = { veces: ((antes && antes.veces) || 0) + 1, dia: hoyISO() };
            const premios = antes && antes.dia === hoyISO() ? [] : darObjetos([alAzar([["rare-candy", 3], ["pp-max", 1], ["big-nugget", 1], ["ability-capsule", 1], [alAzar(Object.keys(MENTAS)), 1]])]);
            guardarEntrenador();
            toast(`¡Has vencido a ${g.nombre} en la revancha!${premios.length ? " Premio: " + textoPremios(premios) + "." : " (Hoy ya te dio su premio.)"}`, 4200);
        },
    });
}
// Liga: Alto Mando y Campeona seguidos. Perder te devuelve a la región.
function retarLiga(i = 0) {
    const r = LIGA[i];
    combateEntrenador({
        titulo: r.titulo, sprite: r.lider, dialogo: r.intro, dialogoDerrota: r.derrota, musica: r.musica, fondo: FONDO_TIPO[r.tipo],
        victoria: r.campeon ? MUSICA.victoriaCampeon : MUSICA.victoriaGimnasio, pago: r.campeon ? "campeon" : "alto", vs: "liga",
        specs: async () => { const sp = await specsDeTipo(r.tipo, r.campeon ? 6 : 5, r.nivel, r.as); return r.campeon ? conMega(sp, [r.tipo]) : sp; },
        alGanar: async () => {
            // Cristal Z del tipo de cada miembro (el de Hada, de la Campeona).
            const premios = darObjetos(premiosDificultad([[CRISTAL_Z[r.tipo], 1], ...(r.campeon ? [[CRISTAL_Z.fairy, 1], ["master-ball", 1]] : [])]));
            if (r.campeon) {
                entrenador.campeon = true;
                const sf = entrenador.salonFama || (entrenador.salonFama = []);
                sf.unshift({ fecha: Date.now(), equipo: entrenador.equipo.map((id) => { const e = entrenador.capturados[id]; return { id, nivel: e.nivel, shiny: !!e.shiny, mote: e.mote || null }; }) });
                sf.splice(20);
                const piedra = recompensaMegapiedra(); if (piedra) premios.push([piedra, 1]);
                toast(`¡Enhorabuena! Eres ${entrenador.genero === "f" ? "la Campeona" : "el Campeón"} de ${REGION}.${premios.length ? " Premio: " + textoPremios(premios) + "." : ""}`, 5200);
                lanzarConfeti();
            } else if (premios.length) toast("Recibes: " + textoPremios(premios), 3600);
            guardarEntrenador();
        },
        despues: (res) => { if (res.gano && i + 1 < LIGA.length) retarLiga(i + 1); else renderAventura(); },
    });
}

// ===================== HIERBA ALTA (cadena de combates) =====================
// ctx = { lugar }: en el modo Región, la ruta (sus Pokémon, sus niveles y los entrenadores que la recorren).
async function iniciarEncuentro(ctx = null) {
    if (equipoDebilitado()) return avisoDebilitado();
    const L = ctx && ctx.lugar;
    try {
        mostrarCargaBatalla();
        const vivo = entrenador.equipo.find((id) => entrenador.capturados[id].hp !== 0) || entrenador.equipo[0];
        const nivelLead = entrenador.capturados[vivo].nivel || 5;
        const salvaje = L ? await salvajeDeLugar(L) : await elegirSalvaje(nivelLead);
        salvaje.nivel = limitar(salvaje.nivel + dificultad().salvaje, 1, 100);
        const spec = specSalvaje(salvaje, L);
        // Como en los juegos, la música del combate empieza con la transición (mientras se prepara) y el grito ya se descarga.
        AudioFX.musicaSonar(spec.furioso ? MUSICA.salvajeFuerte : musicaSalvaje(salvaje.id, salvaje.nivel, entrenador.capturados[entrenador.equipo[0]]?.nivel || 5));
        AudioFX.precargarGritos([salvaje.id]);
        marcarVisto(salvaje.id);
        const [aliados, enemigos] = await Promise.all([
            prepararEquipo(await specsMiEquipo()),
            prepararEquipo([spec]),
        ]);
        Combate.iniciar({
            aliados, enemigos, salvaje: true, permitirCaptura: true, titulo: "Salvaje", fondo: L ? fondoDe(L) : alAzar(FONDOS_SALVAJE),
            ia: spec.furioso ? dificultad().ia : dificultad().iaSalvaje,   // (un Furioso pelea como un entrenador)
            climaInicial: L ? climaDeLugar(L) : null,
            bolsa: entrenador.mochila, guardarBolsa: guardarEntrenador, yaCapturado: (id) => !!entrenador.capturados[id], evolucionar: evolucionarEnCombate,
            cadena: true, darXP: true, expShare: () => config.expShare, generoJugador: entrenador.genero,
            onRonda: ({ capturado, equipo, salvaje, premio, racha, rivales }) => {
                sincronizarEquipoCombate(equipo);
                const p = progresoGym();
                if (p) { p.ruta++; p.racha = Math.max(p.racha || 0, racha); }
                const furioso = salvaje && (rivales || []).find((x) => x.furioso);
                const suelta = furioso ? calmarFurioso(furioso, capturado) : null;
                if (capturado) return registrarCaptura(capturado);
                entrenador.batallasGanadas++;
                if (!salvaje) entrenador.entrenadoresVencidos = (entrenador.entrenadoresVencidos || 0) + 1;
                if (!salvaje && premio) entrenador.dinero = (entrenador.dinero || 0) + premio;
                const k = hallazgo();
                guardarEntrenador();
                if (suelta) toast(`¡${furioso.nombre} se ha calmado y ha dejado ${obj(suelta).nombre}!${k ? ` También encuentras: ${obj(k).nombre}.` : ""}`, 3800);
                else if (k) toast(`Has encontrado: ${obj(k).nombre}.`);
            },
            // Siguiente rival: salvaje, entrenador de ruta o recluta villano.
            siguienteEnemigo: async (r) => {
                const nv = L ? L.nivel[1] : entrenador.capturados[entrenador.equipo[0]]?.nivel || 5;
                const dinero = llevaMonedaAmuleto() ? 2 : 1;
                if (r >= 1 && Math.random() < 0.3) {
                    const n = Math.min(1 + Math.floor(r / 3), 3);
                    const recluta = RECLUTAS.find((x) => nMedallas() >= x.desde && nMedallas() <= x.hasta);
                    if (recluta && Math.random() < 0.35) {
                        const eq = EQUIPOS_VILLANOS[recluta.equipo];
                        const specs = await ajustarEquipo(await specsDeTipos(eq.tipos, n, nv, 0, 2), "ruta");
                        return {
                            enemigos: await prepararEquipo(specs), salvaje: false, premio: Math.round(pagoDe("villano", specs) * dificultad().dinero) * dinero,
                            curasRival: null, ia: dificultad().ia, cambiosRival: dificultad().cambios,
                            titulo: recluta.nombre, entrenadorSprite: alAzar(recluta.sprites),
                            dialogo: eq.lema, dialogoDerrota: "¡Grr! ¡Esto no acaba aquí!",
                            musica: eq.musicaRecluta, musicaEncuentro: mus("encounter_plasma_grunt"), victoria: MUSICA.victoriaVillano,
                        };
                    }
                    // Entrenadores que recorren esta ruta, cada uno con los tipos de su clase.
                    const deRuta = L && BIOMAS[L.bioma].clases.length ? CLASES_ENTRENADOR.find((c) => c.sprite === alAzar(BIOMAS[L.bioma].clases)) : null;
                    const clase = deRuta || alAzar(CLASES_ENTRENADOR);
                    const specs = await ajustarEquipo(await specsDeTipos(tiposDeClase(clase), n, nv, 0, 3), "ruta");
                    specs.forEach((x) => marcarVisto(x.id));
                    return {
                        enemigos: await prepararEquipo(specs), salvaje: false, premio: Math.round(pagoDe("ruta", specs) * dificultad().dinero) * dinero,
                        curasRival: null, ia: dificultad().ia, cambiosRival: dificultad().cambios,
                        titulo: nombreNPC(clase), entrenadorSprite: clase.sprite,
                        dialogo: alAzar(FRASES_NPC), dialogoDerrota: "¡Vaya! ¡Eres muy bueno!",
                        musicaEncuentro: musicaEncuentro(clase.enc),
                    };
                }
                const s = L ? await salvajeDeLugar(L) : await elegirSalvaje(nv);
                s.nivel = limitar(s.nivel + dificultad().salvaje, 1, 100);
                marcarVisto(s.id);
                const sp = specSalvaje(s, L);
                return { enemigos: await prepararEquipo([sp]), salvaje: true, titulo: "Salvaje",
                    ia: sp.furioso ? dificultad().ia : dificultad().iaSalvaje, cambiosRival: 0 };
            },
            alTerminar: async (r) => {
                if (r && r.equipo) sincronizarEquipoCombate(r.equipo);
                if (r && r.racha > (entrenador.mejorRacha || 0)) { entrenador.mejorRacha = r.racha; guardarEntrenador(); }
                if (r && r.gano === false) perderDinero("Tu equipo necesita descansar.");
                renderAventura();
            },
        });
    } catch (_) { errorCombate(); }
}
function registrarCaptura(capturado) {
    const prev = entrenador.capturados[capturado.id];
    entrenador.capturasTotales = (entrenador.capturasTotales || 0) + 1;
    const bola = capturado.bolaCaptura || "poke-ball";
    // El objeto que llevaba se queda con él (si ya llevaba uno el que tenías, el nuevo va a la mochila).
    let objeto = prev?.objeto || capturado.objeto || null;
    if (prev?.objeto && capturado.objeto) meterObjeto(capturado.objeto);
    entrenador.capturados[capturado.id] = {
        nivel: capturado.nivel, xp: prev?.xp || 0, objeto, genero: capturado.genero, mote: prev?.mote, shiny: !!capturado.shiny || !!prev?.shiny,
        bola, movimientos: prev?.movimientos || null, nivelCaptura: prev?.nivelCaptura ?? capturado.nivel, ev: prev?.ev,
        lugarCaptura: prev ? prev.lugarCaptura : entrenador.mundo?.lugar, recibido: prev?.recibido,
        naturaleza: prev?.naturaleza || capturado.naturaleza || naturalezaAleatoria(), habSlot: prev?.habSlot || capturado.habSlot || 1,
    };
    const e = entrenador.capturados[capturado.id];
    // Como en los juegos: entra con los PS con los que se capturó (la Sana Ball lo cura del todo).
    if (bola !== "heal-ball" && capturado.hp < capturado.hpMax) { e.hp = Math.max(1, capturado.hp); e.estado = capturado.estado ? capturado.estado.tipo : null; }
    const p = progresoGym(), g = siguienteGimnasio();
    if (p) {
        if (!prev) p.especies = (p.especies || 0) + 1;
        const o = objetivosDe(g).find((x) => x.id === "tipo");
        if (o && (capturado.tipos || []).includes(o.tipo)) p.tipo = (p.tipo || 0) + 1;
    }
    guardarEntrenador();
    asegurarMovimientos(capturado.id);
    toast(`${prev ? "" : "¡Nuevo en la Pokédex! "}${capturado.nombre} capturado.${capturado.objeto ? ` Llevaba: ${obj(capturado.objeto).nombre}.` : ""}`, 3400);
    if (!entrenador.equipo.includes(capturado.id)) {
        if (entrenador.equipo.length < 6) { entrenador.equipo.push(capturado.id); guardarEntrenador(); }
        else mostrarCambioPorCaptura(capturado.id);
    }
}

// ===================== EQUIPO, CAJA Y RESUMEN =====================
// Miembros del equipo para la pantalla de equipo (fuera de combate, con su salud actual).
async function miembrosEquipo() {
    return Promise.all(entrenador.equipo.map(async (id) => {
        const e = entrenador.capturados[id];
        const hpMax = await psMaxDe(id);
        return {
            id, nombre: nombreDe(id), nivel: e.nivel || 5, genero: e.genero, shiny: !!e.shiny, objeto: e.objeto,
            hp: e.hp == null ? hpMax : Math.min(e.hp, hpMax), hpMax, estado: e.hp !== 0 ? e.estado : null,
        };
    }));
}
// Pantalla de equipo a pantalla completa (equipo lleno, usar o dar un objeto…).
// crear(cerrar, avisar) devuelve las opciones; avisar(texto) cambia el mensaje de abajo.
async function abrirEquipoModal(crear, miembros) {
    const capa = document.createElement("div");
    capa.className = "capa-pe";
    document.body.appendChild(capa); document.body.style.overflow = "hidden";
    let pant = null;
    const cerrar = () => { if (pant) pant.cerrar(); capa.remove(); if (!document.querySelector(".capa-resumen")) document.body.style.overflow = ""; };
    const avisar = (t) => { if (pant) pant.mensaje(t); };
    pant = montarPantallaEquipo(capa, miembros || await miembrosEquipo(), Object.assign({ flotante: true }, crear(cerrar, avisar)));
}
// Mi equipo: la ranura grande sale primero. Datos, Objeto, Mover o enviarlo a la Caja.
let moverDesde = null;
async function renderGestionEquipo(cont) {
    cont.innerHTML = `
        <div class="cabecera-modo con-volver">
            <button class="btn-volver" data-volver>Atrás</button>
            <h2>Mi equipo</h2>
        </div>
        <div class="pe-marco" id="pe-marco"></div>`;
    const volver = () => { moverDesde = null; subAventura = "principal"; renderAventura(); };
    cont.querySelector("[data-volver]").onclick = volver;
    const miembros = await miembrosEquipo();
    const marco = document.getElementById("pe-marco");
    if (!marco || subAventura !== "equipo") return;
    const moviendo = moverDesde !== null && moverDesde < miembros.length;
    const otra = () => renderGestionEquipo(cont);
    montarPantallaEquipo(marco, miembros, moviendo ? {
        mensaje: `¿Con quién cambias de sitio a ${miembros[moverDesde].nombre}?`, mover: moverDesde, textoCancelar: "Atrás",
        alCancelar: () => { moverDesde = null; otra(); },
        alElegir: (i) => {
            const eq = entrenador.equipo;
            [eq[moverDesde], eq[i]] = [eq[i], eq[moverDesde]];
            moverDesde = null; guardarEntrenador(); otra();
        },
    } : {
        mensaje: "Elige un Pokémon.", textoCancelar: "Salir", alCancelar: volver,
        opciones: (i) => {
            const id = entrenador.equipo[i], e = entrenador.capturados[id], ops = [{ txt: "Datos", fn: () => mostrarResumen(id) }];
            ops.push({ txt: e.objeto ? "Cambiar objeto" : "Dar objeto", fn: async () => { const k = await elegirObjetoMochila(`¿Qué objeto le das a ${nombreDe(id)}?`); if (k) { equiparObjeto(id, k); otra(); } } });
            if (e.objeto) ops.push({ txt: "Quitar objeto", fn: () => { quitarObjeto(id); otra(); } });
            if (entrenador.equipo.length > 1) ops.push({ txt: "Mover", fn: () => { moverDesde = i; otra(); } });
            if (entrenador.equipo.length > 1) ops.push({ txt: "A la Caja", fn: () => {
                entrenador.equipo = entrenador.equipo.filter((x) => x !== id);
                delete e.hp; e.estado = null;   // en la Caja descansa
                guardarEntrenador(); toast(`${nombreDe(id)} pasó a la Caja.`); otra();
            } });
            return ops;
        },
    });
}
// Caramelo Raro: +1 nivel, con sus movimientos nuevos y su evolución.
async function usarCaramelo(id) {
    const e = entrenador.capturados[id];
    if (!e || cantidadObj("rare-candy") <= 0 || e.nivel >= 100) return;
    const antes = instantaneaNiveles();
    const antesMax = await psMaxDe(id);
    sacarObjeto("rare-candy"); e.nivel++; e.xp = 0;
    if (e.hp != null) e.hp += Math.max(0, (await psMaxDe(id)) - antesMax);
    guardarEntrenador();
    AudioFX.efecto("level_up_fanfare");
    toast(`¡${nombreDe(id)} subió al nivel ${e.nivel}!`);
    await trasSubirNivel(antes);
}
// o.mega: está megaevolucionado (en combate): su ficha es la de la mega · o.tera: su teratipo, si está teracristalizado.
async function mostrarResumen(id, o = {}) {
    const capa = document.createElement("div");
    capa.className = "capa-resumen";
    capa._mega = o.mega || null; capa._tera = o.tera || null;
    capa.innerHTML = `<div class="resumen"><div class="modal-cargando"><div class="cargando"></div></div></div>`;
    document.body.appendChild(capa); document.body.style.overflow = "hidden";
    const cerrar = () => { capa.remove(); document.body.style.overflow = ""; document.removeEventListener("keydown", onEsc); };
    const onEsc = (e) => { if (e.key === "Escape") cerrar(); };
    document.addEventListener("keydown", onEsc);
    capa.addEventListener("click", (e) => { if (e.target === capa) cerrar(); });
    try { renderResumen(capa, id, await cargarPokemon(capa._mega ? capa._mega.api : id), cerrar); }
    catch (_) {
        capa.querySelector(".resumen").innerHTML = `<p class="nota">No se pudo cargar la ficha.</p><button class="btn-sec" data-x>Cerrar</button>`;
        capa.querySelector("[data-x]").onclick = cerrar;
    }
}
// Qué hace un movimiento, con los datos oficiales (estado, estadísticas, drenaje…).
function efectoMov(x) {
    const out = [];
    const NOMBRE_ESTADO = { par: "paralizar", que: "quemar", env: "envenenar", dor: "dormir", con: "congelar" };
    if (x.estado) out.push(`${x.cat === "est" ? "Puede" : `${Math.round(x.estado.prob * 100)} % de`} ${x.estado.grave ? "envenenar gravemente" : NOMBRE_ESTADO[x.estado.tipo]}`);
    if (x.cambios) Object.entries(x.cambios.stats).forEach(([k, v]) => out.push(`${x.cambios.prob < 1 ? `${Math.round(x.cambios.prob * 100)} %: ` : ""}${v > 0 ? "sube" : "baja"} ${x.cambios.objetivo === "yo" ? NOMBRE_STAT[k].replace(/^(el|la) /, "su ") : NOMBRE_STAT[k] + " del rival"} (${v > 0 ? "+" : ""}${v})`));
    if (x.drenaje > 0) out.push(`Absorbe el ${Math.round(x.drenaje * 100)} % del daño`);
    if (x.drenaje < 0) out.push(`Daño de retroceso (${Math.round(-x.drenaje * 100)} %)`);
    if (x.curacion) out.push(`Recupera el ${Math.round(x.curacion * 100)} % de los PS`);
    if (x.retroceder) out.push(`${Math.round(x.retroceder * 100)} % de hacer retroceder`);
    if (x.golpes) out.push(`Golpea de ${x.golpes[0]} a ${x.golpes[1]} veces`);
    if (x.critAlto) out.push("Crítico más probable");
    if (x.clima) out.push(`Cambia el tiempo: ${CLIMAS[x.clima].nombre.toLowerCase()} durante 5 turnos`);
    if (x.confunde) out.push(x.cat === "est" ? "Confunde al rival" : `${Math.round(x.confunde * 100)} % de confundir`);
    const ESPECIAL_TXT = {
        proteccion: "Se protege de los ataques este turno (si lo repite, puede fallar)", drenadoras: "Le roba 1/8 de los PS al rival cada turno",
        reflejo: "Tu bando recibe la mitad de daño físico durante 5 turnos", pantallaLuz: "Tu bando recibe la mitad de daño especial durante 5 turnos",
        veloAurora: "Con nieve: tu bando recibe la mitad de daño durante 5 turnos", mofa: "El rival no puede usar movimientos de estado durante 3 turnos",
        vientoAfin: "Duplica la Velocidad de tu bando durante 4 turnos",
        rocas: "Llena de piedras el campo rival: dañan a cada Pokémon que entra, más si es débil a la Roca",
        puas: "Llena de púas el campo rival (hasta 3 capas): dañan a los que entran tocando el suelo",
        toxicas: "Llena de púas tóxicas el campo rival (hasta 2 capas): envenenan a los que entran tocando el suelo",
        red: "Tiende una red en el campo rival: baja la Velocidad de los que entran tocando el suelo",
        despejar: "Quita las trampas de los dos bandos y las barreras del rival", limpieza: "Quita las trampas de los dos bandos y sube el Ataque y la Velocidad",
        espacioRaro: "Durante 5 turnos, los Pokémon más lentos atacan primero", niebla: "Anula los cambios en las características de todos",
        descanso: "Duerme 2 turnos y recupera todos sus PS y su salud", sonambulo: "Solo dormido: usa al azar otro de sus movimientos",
        arrastrar: "El rival vuelve a su Poké Ball y sale otro de su equipo al azar",
        terreno: "Crea un campo durante 5 turnos (afecta a los que tocan el suelo)",
        bostezo: "El rival se queda somnoliento y se duerme al final del turno siguiente",
        otraVez: "Durante 3 turnos, el rival solo puede repetir su último movimiento",
        dividir: "Reparte a partes iguales los PS del usuario y los del rival", tambor: "Pierde la mitad de sus PS y sube al máximo su Ataque",
        deseo: "Al final del turno siguiente, el Pokémon de su bando recupera la mitad de los PS del usuario",
        sustituto: "Usa un cuarto de sus PS para crear un muñeco que recibe los ataques en su lugar",
        anular: "Durante 4 turnos, el rival no puede usar el último movimiento que usó",
        atraccion: "Enamora al rival si es del sexo contrario: la mitad de las veces no podrá atacar",
        arraigo: "Recupera 1/16 de sus PS cada turno, pero ya no puede cambiarse", acuaAro: "Recupera 1/16 de sus PS cada turno",
        bloqueo: "El rival no puede huir ni cambiarse mientras el usuario siga en el combate",
        veloSagrado: "Durante 5 turnos, protege a tu bando de los problemas de estado y la confusión",
        neblina: "Durante 5 turnos, el rival no puede bajar las características de tu bando",
        foco: "Aumenta mucho la probabilidad de asestar golpes críticos", fijar: "Su siguiente movimiento contra el rival no fallará",
        campana: "Cura los problemas de estado de todo tu equipo", masPsique: "Copia los cambios en las características del rival",
        legado: "Se debilita, pero baja mucho el Ataque y el Ataque Especial del rival",
        deseoCura: "Se debilita, y el Pokémon que salga en su lugar recupera todos sus PS y su salud",
        transformar: "Se transforma en el rival: copia su aspecto, sus tipos, sus características y sus movimientos",
    };
    Object.assign(ESPECIAL_TXT, TXT_MOVS_NUEVOS);
    if (x.especial && ESPECIAL_TXT[x.especial]) out.push(ESPECIAL_TXT[x.especial]);
    if (QUITA_PELIGROS.has(x.clave)) out.push("Quita las trampas y las drenadoras de tu bando");
    if (DANIO_FIJO_TXT[x.clave]) out.push(DANIO_FIJO_TXT[x.clave]);
    if (PIVOTES.has(x.clave)) out.push("Después vuelve a su Poké Ball y sale otro de su equipo");
    if (x.clave === "knock-off") out.push("Si el rival lleva un objeto, le hace más daño y se lo quita");
    if (FUTURO.has(x.clave)) out.push("El golpe llega dos turnos después");
    if (x.clave === "focus-punch") out.push("Va de los últimos y falla si le golpean antes de atacar");
    if (MEDIO_PS.has(x.clave)) out.push("El usuario pierde la mitad de sus PS");
    if (x.clave === "last-resort") out.push("Solo funciona si ya ha usado todos sus otros movimientos");
    if (x.clave === "synchronoise") out.push("Solo daña a quien comparte algún tipo con el usuario");
    if (x.clave === "belch") out.push("Solo se puede usar después de comerse una baya en el combate");
    if (x.clave === "lunar-dance") out.push("También le devuelve todos sus PP");
    if (PRIMER_TURNO.has(x.clave)) out.push("Solo funciona en su primer turno en el campo");
    if (SOLO_SI_ATACA.has(x.clave)) out.push("Solo funciona si el rival va a atacar y aún no lo ha hecho");
    if (PODER_VARIABLE_TXT[x.clave]) out.push(PODER_VARIABLE_TXT[x.clave]);
    if (ATRAPA[x.clave]) out.push("Atrapa al rival de 4 a 5 turnos: no puede huir ni cambiar y pierde PS cada turno");
    if (ARRASTRA.has(x.clave)) out.push("Después, el rival vuelve a su Poké Ball y sale otro de su equipo al azar");
    if (x.clave === "snore") out.push("Solo se puede usar dormido");
    if (x.clave === "dream-eater") out.push("Solo funciona si el rival está dormido");
    if (x.clave === "clear-smog") out.push("Anula los cambios en las características del rival");
    const carga = MOVS_CARGA[x.clave];
    if (carga) out.push(carga.oculto ? "Se esconde un turno y ataca en el siguiente" : "Carga un turno y ataca en el siguiente");
    if (MOVS_FURIA.has(x.clave)) out.push("Ataca 2 o 3 turnos seguidos y después se confunde");
    if (MOVS_RECARGA.has(x.clave)) out.push("Tras usarlo, necesita un turno para recuperarse");
    return out.join(" · ").replace(/^./, (c) => c.toUpperCase());
}
function htmlMovFicha(x, extra = "") {
    const ef = efectoMov(x);
    return `<div class="ficha-mov tipo-${x.tipo}">
        <div class="fm-cab"><span class="fm-nombre">${x.nombre}</span>${etiquetaTipo(x.tipo, 2)}</div>
        <div class="fm-datos">${iconoCategoria(x.cat, 2)}
            <span>Pot. <b class="num-pk">${x.cat === "est" || !x.poder ? "—" : x.poder}</b></span>
            <span>Prec. <b class="num-pk">${x.prec ? Math.round(x.prec * 100) : "—"}</b></span>
            <span>PP <b class="num-pk">${x.pp || "—"}</b></span>${extra}</div>
        ${ef ? `<div class="fm-efecto">${ef}</div>` : ""}
    </div>`;
}
const COLOR_STAT = { hp: "#ff5959", attack: "#f5ac78", defense: "#fae078", "special-attack": "#9db7f5", "special-defense": "#a7db8d", speed: "#fa92b2" };
async function renderResumen(capa, id, d, cerrar) {
    const c = entrenador.capturados[id], mega = capa._mega, tera = capa._tera;
    const nivel = c ? c.nivel : 50;
    const tipos = tera ? [tera] : d.types.map((t) => t.type.name);
    let moves = [];
    if (c) { try { moves = await asegurarMovimientos(id); } catch (_) {} }
    if (!moves.length) { try { moves = await construirMovesetReal(d, nivel); } catch (_) {} }
    if (!moves.length) moves = construirMoveset(tipos);
    const enEquipo = entrenador.equipo.includes(id);
    const piedras = piedrasDe(id);
    let etapa = { etapa: 1, maxEtapas: 1, evoluciona: false };
    try { etapa = await etapaEvolutiva(id); } catch (_) {}
    let factor = 1; try { factor = await factorExpPokemon(id); } catch (_) {}
    const xp = c ? (c.xp || 0) : 0, xpProx = xpNecesaria(nivel, factor);
    const pctXp = nivel >= 100 ? 100 : Math.min(100, Math.round((xp / xpProx) * 100));
    const etiquetaEtapa = etapa.maxEtapas === 1 ? "Sin evolución" : etapa.etapa === 1 ? "Básico"
        : (etapa.etapa >= 3 || !etapa.evoluciona) ? "Evolución final" : "1ª evolución";
    const base = {}; d.stats.forEach((s) => { base[s.stat.name] = s.base_stat; });
    const nat = c && c.naturaleza;
    const sd = statsDeNivel(base, nivel, c && c.ev, nat);
    const ref = statsDeNivel({ hp: 200, attack: 200, defense: 200, "special-attack": 200, "special-defense": 200, speed: 200 }, nivel);
    const valor = { hp: sd.hpMax, attack: sd.stats.atk, defense: sd.stats.def, "special-attack": sd.stats.spa, "special-defense": sd.stats.spd, speed: sd.stats.vel };
    const maxRef = { hp: ref.hpMax, attack: ref.stats.atk, defense: ref.stats.def, "special-attack": ref.stats.spa, "special-defense": ref.stats.spd, speed: ref.stats.vel };
    const total = Object.values(valor).reduce((a, b) => a + b, 0);
    // Como en los juegos: la característica que sube la naturaleza, en rojo, y la que baja, en azul.
    const CORTA = { attack: "atk", defense: "def", "special-attack": "spa", "special-defense": "spd", speed: "vel" };
    const statsHTML = d.stats.map((s) => {
        const n = s.stat.name, val = valor[n], ancho = Math.min(100, (val / maxRef[n]) * 100);
        const mn = nat ? multNaturaleza(nat, CORTA[n]) : 1, marca = mn > 1 ? "sube" : mn < 1 ? "baja" : "";
        return `<div class="fs-fila"><span class="fs-nom ${marca}" ${marca ? `title="${marca === "sube" ? "+10 %" : "−10 %"} por su naturaleza"` : ""}>${STATS_ES[n]}</span><span class="fs-val num-pk">${val}</span>
            <div class="fs-barra"><span style="width:${ancho}%;background:${COLOR_STAT[n]}"></span></div><span class="fs-base" title="Estadística base">${s.base_stat}</span></div>`;
    }).join("");
    // Habilidad: la suya (o, si no es tuyo, las posibles de la especie) con su descripción oficial.
    const habs = habilidadesDe(d);
    const hab = mega ? mega.hab || habilidadDe(d, 1) : c ? habilidadDe(d, c.habSlot) : null, oculta = !mega && c && c.habSlot === 3 && habs[3];
    const habHTML = c
        ? `<div class="rd-habilidad"><span>Habilidad</span><b>${nombreHabilidad(hab)}${oculta ? ' <i class="hab-oculta">Oculta</i>' : ""}</b><p>${descHabilidad(hab)}</p></div>`
        : `<div class="rd-habilidad"><span>Habilidades</span><b>${[habs[1], habs[2]].filter(Boolean).map(nombreHabilidad).join(" / ")}${habs[3] ? ` · <i class="hab-oculta">Oculta</i> ${nombreHabilidad(habs[3])}` : ""}</b></div>`;
    const tab = capa._tab || "datos";
    const bola = obj((c && c.bola) || "poke-ball");
    const esf = (c && c.ev) || {}, esfTotal = Object.values(esf).reduce((a, b) => a + b, 0);
    capa.querySelector(".resumen").className = "resumen ficha";
    capa.querySelector(".resumen").innerHTML = `
        <button class="res-cerrar" data-x aria-label="Cerrar">×</button>
        <div class="ficha-cab" data-tipo="${tipos[0]}">
            <div class="ficha-escenario"><span class="ficha-plataforma"></span><img class="ficha-sprite" id="res-sprite" alt=""></div>
            <div class="ficha-id">
                <span class="ficha-num">Nº <b class="num-pk">${String(id).padStart(4, "0")}</b></span>
                <div class="ficha-nombre">${mega ? mega.nombre : c ? nombreDe(id) : nombrePk(id)}${c ? htmlGenero(c.genero) : ""}</div>
                ${mega ? `<div class="ficha-especie ficha-poder"><img src="${EBDX_BASE.replace(/Pokemon\/$/, "EBDX/")}Animations/Moves/ebMega007.png" alt="">Megaevolucionado</div>`
                    : c && c.mote ? `<div class="ficha-especie">${nombrePk(id)}</div>` : ""}
                ${tera ? `<div class="ficha-especie ficha-poder"><img src="${urlTera(tera)}" alt="">Teracristalizado</div>` : ""}
                <div class="ficha-tipos">${tipos.map((t) => `<span class="ficha-tipo">${iconoTipo(t, 2)}${etiquetaTipo(t, 2)}</span>`).join("")}</div>
            </div>
            <div class="ficha-nv"><small>Nv.</small><b class="num-pk">${nivel}</b></div>
        </div>
        <div class="ficha-tabs">
            ${[["datos", "Datos"], ["stats", "Estadísticas"], ["movs", "Movimientos"], ...(c ? [["recordar", "Recordar"]] : [])]
                .map(([k, t]) => `<button class="ficha-tab ${k === tab ? "activa" : ""}" data-tab="${k}">${t}</button>`).join("")}
        </div>
        <div class="ficha-panel" data-panel="datos">
            <div class="ficha-datos">
                ${c ? `<div><span>Entrenador</span><b>${entrenador.nombre || "—"}</b></div>
                ${c.nivelCaptura != null || c.lugarCaptura ? `<div><span>${c.recibido ? "Recibido" : "Capturado"}</span><b>${c.lugarCaptura && LUGARES[c.lugarCaptura] ? nombreLugar(c.lugarCaptura) + (c.nivelCaptura != null ? " · " : "") : ""}${c.nivelCaptura != null ? `Nv. <span class="num-pk">${c.nivelCaptura}</span>` : ""}</b></div>` : ""}
                <div><span>Poké Ball</span><b><img class="rm-ball" src="${urlObj(bola.clave)}" alt="">${bola.nombre}</b></div>` : ""}
                ${c ? `<div><span>Naturaleza</span><b>${textoNaturaleza(nat)}</b></div>` : ""}
                ${habHTML}
                <div><span>Etapa</span><b>${etiquetaEtapa}${esLegendario(id) ? " · Legendario" : ""}</b></div>
                <div><span>Altura</span><b><span class="num-pk">${(d.height / 10).toFixed(1)}</span> m</b></div>
                <div><span>Peso</span><b><span class="num-pk">${(d.weight / 10).toFixed(1)}</span> kg</b></div>
                ${c ? `<div class="rd-objeto"><span>Objeto</span><b>${c.objeto ? `<img class="rm-ball" src="${urlObj(c.objeto)}" alt="">${obj(c.objeto).nombre}` : "Ninguno"}</b>
                    <span class="rd-botones"><button class="btn-mini" data-dar>${c.objeto ? "Cambiar" : "Dar"}</button>${c.objeto ? `<button class="btn-mini secundario" data-quitar-obj>Quitar</button>` : ""}</span></div>` : ""}
            </div>
            ${c ? `<div class="res-exp">
                <div class="res-exp-cab"><span>Experiencia</span><span class="num-pk">${xp} / ${xpProx}</span></div>
                <div class="res-exp-barra"><span style="width:${pctXp}%"></span></div>
                <div class="res-exp-falta">${nivel >= 100 ? "¡Nivel máximo alcanzado!" : `Faltan <b class="num-pk">${Math.max(0, xpProx - xp)}</b> puntos para el Nv. ${nivel + 1}`}</div>
            </div>` : ""}
            ${piedras.map((st) => {
                const m = MEGAS[st], equipada = c && c.objeto === st, tiene = equipada || cantidadObj(st) > 0 || quienLleva(st).length > 0;
                return `<div class="res-mega ${equipada ? "activa" : ""}">
                    <img src="${urlObj(st)}" alt="">
                    <div class="rme-info"><b>Megaevolución: ${m.nombre}</b>
                        <span>${equipada ? "Megapiedra equipada: podrás megaevolucionar en combate." : tiene ? `Tienes la ${obj(st).nombre}. Dásela para megaevolucionar.` : `Consigue la ${obj(st).nombre} en los gimnasios y contra los jefes villanos.`}</span></div>
                    ${c && cantidadObj(st) > 0 && !equipada ? `<button class="btn-sec" data-mega="${st}">Equipar</button>` : ""}
                </div>`;
            }).join("")}
        </div>
        <div class="ficha-panel" data-panel="stats">
            <div class="ficha-stats">${statsHTML}
                <div class="fs-fila fs-total"><span class="fs-nom">Total</span><span class="fs-val num-pk">${total}</span><div></div><span class="fs-base">${d.stats.reduce((a, s) => a + s.base_stat, 0)}</span></div>
            </div>
            <p class="nota">Valores a nivel ${nivel}${nat && NATURALEZAS[nat][1] ? `. Naturaleza ${nombreNaturaleza(nat)}: en rojo, +10 %; en azul, −10 %` : ""}. A la derecha, la estadística base de la especie.${c ? ` Puntos de esfuerzo: <b class="num-pk">${esfTotal}</b>/${EV_TOTAL}${esfTotal ? " (" + Object.entries(esf).filter(([, v]) => v).map(([k, v]) => `${EV_TXT[k]} ${v}`).join(", ") + ")" : ""}.` : ""}</p>
        </div>
        <div class="ficha-panel" data-panel="movs"><div class="ficha-movs">${moves.map((x) => htmlMovFicha(x)).join("")}</div></div>
        ${c ? `<div class="ficha-panel" data-panel="recordar"><div class="ficha-recordar"><div class="cargando"></div></div></div>` : ""}
        <div class="res-acciones">${c ? `<button class="btn-sec" data-mote>${c.mote ? "Cambiar mote" : "Poner mote"}</button>` + (enEquipo ? `<button class="btn-sec" data-quitar>Quitar del equipo</button>` : typeof enLaGuarderia === "function" && enLaGuarderia(id) ? `<span class="nota">Está en la Guardería de Villa Lúmina.</span>` : `<button class="btn-grande" data-anadir>Añadir al equipo</button>`) : ""}</div>`;
    const panelAct = () => capa.querySelectorAll(".ficha-panel").forEach((p) => p.classList.toggle("oculta", p.dataset.panel !== capa._tab));
    capa._tab = tab; panelAct();
    capa.querySelectorAll(".ficha-tab").forEach((b) => b.onclick = () => {
        capa._tab = b.dataset.tab;
        capa.querySelectorAll(".ficha-tab").forEach((x) => x.classList.toggle("activa", x === b));
        panelAct(); AudioFX.ui("select");
        if (capa._tab === "recordar") pintarRecordar(capa, id, d, cerrar);
    });
    if (tab === "recordar") pintarRecordar(capa, id, d, cerrar);
    montarPokemon(document.getElementById("res-sprite"), id, { shiny: !!(c && c.shiny), mega }).then((el) => tamanoNativo(el, 3, 170, 220));
    capa.querySelector("[data-x]").onclick = cerrar;
    const bMote = capa.querySelector("[data-mote]");
    if (bMote) bMote.onclick = () => {
        const m = window.prompt(`Mote para ${nombrePk(id)} (déjalo vacío para quitarlo):`, c.mote || "");
        if (m === null) return;
        c.mote = m.trim().slice(0, 12) || undefined;
        guardarEntrenador(); renderResumen(capa, id, d, cerrar); renderAventura();
    };
    capa.querySelectorAll("[data-mega]").forEach((b) => b.onclick = () => { equiparObjeto(id, b.dataset.mega); renderResumen(capa, id, d, cerrar); });
    const bDar = capa.querySelector("[data-dar]");
    if (bDar) bDar.onclick = async () => { const k = await elegirObjetoMochila(`¿Qué objeto le das a ${nombreDe(id)}?`); if (k) { equiparObjeto(id, k); renderResumen(capa, id, d, cerrar); } };
    const bQuitarObj = capa.querySelector("[data-quitar-obj]");
    if (bQuitarObj) bQuitarObj.onclick = () => { quitarObjeto(id); renderResumen(capa, id, d, cerrar); };
    const bAnadir = capa.querySelector("[data-anadir]");
    if (bAnadir) bAnadir.onclick = () => {
        if (entrenador.equipo.length >= 6) return toast("El equipo está lleno (6).");
        entrenador.equipo.push(id); guardarEntrenador(); renderResumen(capa, id, d, cerrar); renderAventura();
    };
    const bQuitar = capa.querySelector("[data-quitar]");
    if (bQuitar) bQuitar.onclick = () => {
        if (entrenador.equipo.length <= 1) return toast("Debes tener al menos 1 Pokémon en el equipo.");
        entrenador.equipo = entrenador.equipo.filter((x) => x !== id); delete c.hp; c.estado = null;
        guardarEntrenador(); renderResumen(capa, id, d, cerrar); renderAventura();
    };
}
// Recordar movimientos: los que podría saber a su nivel (los olvidados, marcados) y volver a aprenderlos.
async function pintarRecordar(capa, id, d, cerrar) {
    const cont = capa.querySelector(".ficha-recordar"); if (!cont) return;
    const e = entrenador.capturados[id]; if (!e) return;
    let lista = [];
    try { lista = await movimientosRecordables(d, e.nivel || 5, e.movimientos || []); } catch (_) {}
    if (!cont.isConnected) return;
    if (!lista.length) { cont.innerHTML = `<p class="nota">No hay movimientos que recordar a este nivel.</p>`; return; }
    const olv = new Set(e.olvidados || []);
    lista.sort((a, b) => (olv.has(b.clave) - olv.has(a.clave)) || b.nivel - a.nivel);
    cont.innerHTML = `<p class="nota">¿Qué movimiento quieres que recuerde?</p>` +
        lista.map((x, i) => `<div class="recordar-fila">${htmlMovFicha(x, `<span class="fm-nivel">Nv. <b class="num-pk">${x.nivel}</b></span>${olv.has(x.clave) ? '<span class="fm-olvidado">Olvidado</span>' : ""}`)}
            <button class="btn-mini" data-rec="${i}">Recordar</button></div>`).join("");
    cont.querySelectorAll("[data-rec]").forEach((b) => b.onclick = async () => {
        await ofrecerAprender(id, lista[Number(b.dataset.rec)]);
        capa._tab = "movs";
        renderResumen(capa, id, d, cerrar);
    });
}
// Equipo lleno tras una captura: se elige a quién mandar a la Caja (o el nuevo se queda en ella).
function mostrarCambioPorCaptura(nuevoId) {
    return abrirEquipoModal((cerrar) => ({
        mensaje: `¡${nombrePk(nuevoId)} capturado! Tu equipo está lleno: ¿a quién envías a la Caja?`,
        textoCancelar: "Ninguno",
        alCancelar: () => { toast(`${nombrePk(nuevoId)} se queda en la Caja.`); cerrar(); },
        alElegir: (i) => {
            const viejo = entrenador.equipo[i];
            entrenador.equipo[i] = nuevoId;
            guardarEntrenador();
            toast(`${nombreDe(viejo)} pasó a la Caja y ${nombrePk(nuevoId)} entró al equipo.`);
            cerrar();
        },
    }));
}
// La Caja: todos tus Pokémon, con buscador por nombre, filtro por tipo y orden (n.º de la Pokédex, nivel o nombre).
let cajaOrden = "num", cajaBusca = "", cajaTipo = "";
const normTxt = (t) => String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
function renderCaja(cont) {
    const total = Object.keys(entrenador.capturados).length;
    cont.innerHTML = `
        <div class="cabecera-modo con-volver">
            <button class="btn-volver" data-volver>Atrás</button>
            <h2>Caja (${total})</h2>
        </div>
        <div class="controles-dex caja-filtros">
            <div class="buscador">
                <svg class="lupa" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
                <input type="search" data-busca placeholder="Buscar por nombre o número…" autocomplete="off" value="${cajaBusca.replace(/"/g, "")}">
            </div>
            <select data-tipo aria-label="Tipo"><option value="">Todos los tipos</option>${Object.keys(TIPOS_ES).map((t) => `<option value="${t}" ${t === cajaTipo ? "selected" : ""}>${TIPOS_ES[t]}</option>`).join("")}</select>
            <select data-orden aria-label="Orden">${[["num", "N.º de la Pokédex"], ["nivel", "Nivel"], ["nombre", "Nombre"]].map(([v, t]) => `<option value="${v}" ${v === cajaOrden ? "selected" : ""}>${t}</option>`).join("")}</select>
        </div>
        <div class="rejilla-caja"></div>`;
    const rejilla = cont.querySelector(".rejilla-caja");
    let turnoPintado = 0;
    const pintar = async () => {
        const yo = ++turnoPintado;
        let ids = Object.keys(entrenador.capturados).map(Number);
        const q = normTxt(cajaBusca.trim());
        if (q) ids = ids.filter((id) => normTxt(nombreDe(id)).includes(q) || normTxt(nombrePk(id)).includes(q) || String(id) === q);
        if (cajaTipo) { try { const set = await idsPorTipo(cajaTipo); ids = ids.filter((id) => set.has(id)); } catch (_) {} }
        if (yo !== turnoPintado || !rejilla.isConnected) return;   // (ya se ha pedido otra búsqueda)
        const nv = (id) => entrenador.capturados[id].nivel || 1;
        ids.sort(cajaOrden === "nivel" ? (a, b) => nv(b) - nv(a) || a - b : cajaOrden === "nombre" ? (a, b) => nombreDe(a).localeCompare(nombreDe(b), "es") : (a, b) => a - b);
        rejilla.innerHTML = ids.map((id) => {
            const enEq = entrenador.equipo.includes(id), lleva = entrenador.capturados[id].objeto, gd = typeof enLaGuarderia === "function" && enLaGuarderia(id);
            return `<button class="carta-caja ${enEq ? "en-equipo" : ""} ${gd ? "en-guarderia" : ""}" data-id="${id}">
                ${lleva ? `<img class="cc-obj" src="${urlObj(lleva)}" alt="" title="${obj(lleva).nombre}">` : ""}
                ${htmlIcono(id, "cc-icono", !!entrenador.capturados[id].shiny)}
                <span class="cc-nom">${nombreDe(id)}</span>
                <span class="cc-nv">Nv.${nv(id)}</span>
                ${enEq ? '<span class="cc-check">En equipo</span>' : gd ? '<span class="cc-check">Guardería</span>' : ""}
            </button>`;
        }).join("") || `<p class="nota">No hay ningún Pokémon que coincida.</p>`;
        rejilla.querySelectorAll(".carta-caja").forEach((b) => b.onclick = () => mostrarResumen(Number(b.dataset.id)));
        pintarIconos(rejilla);
    };
    cont.querySelector("[data-volver]").onclick = () => { subAventura = "principal"; renderAventura(); };
    cont.querySelector("[data-busca]").oninput = (e) => { cajaBusca = e.target.value; pintar(); };
    cont.querySelector("[data-tipo]").onchange = (e) => { cajaTipo = e.target.value; pintar(); };
    cont.querySelector("[data-orden]").onchange = (e) => { cajaOrden = e.target.value; pintar(); };
    pintar();
}

// ===================== MODO ADIVINA (QUIZ) =====================
let quizIniciado = false, quizModo = "silueta", quizPool = [];
let quizResp = null, quizRespondido = false;
let quizPuntos = 0, quizRacha = 0, quizAciertos = 0, quizIntentos = 0;
let quizRecord = Number(localStorage.getItem("quiz_record")) || 0;
const qImg = () => document.getElementById("q-imagen");

function iniciarQuizSiHaceFalta() {
    if (quizIniciado || TODOS.length === 0) return;
    quizIniciado = true;
    document.getElementById("q-record").textContent = quizRecord;
    prepararQuizPool();
    nuevaRondaQuiz();
}
function prepararQuizPool() {
    const r = idsDeGeneracion(document.getElementById("quiz-generacion").value);
    quizPool = r ? TODOS.filter((p) => p.id >= r.min && p.id <= r.max) : TODOS.slice();
}
async function nuevaRondaQuiz() {
    quizRespondido = false;
    const fb = document.getElementById("q-feedback");
    fb.textContent = ""; fb.className = "feedback";
    document.getElementById("q-nombre").textContent = "";
    document.getElementById("q-tipos").innerHTML = "";
    document.getElementById("q-siguiente").style.display = "none";
    document.getElementById("q-zona-imagen").classList.remove("revelado");
    document.getElementById("q-descripcion").classList.add("oculta");
    document.getElementById("q-grito-control").classList.add("oculta");
    const correcto = alAzar(quizPool);
    quizResp = correcto.id;
    const img = qImg();
    img.classList.remove("cargada");
    document.getElementById("q-zona-imagen").classList.add("cargando-activa");
    img.onload = () => { img.classList.add("cargada"); document.getElementById("q-zona-imagen").classList.remove("cargando-activa"); };
    img.src = urlArtwork(correcto.id);
    const opc = [correcto];
    while (opc.length < 4) { const a = alAzar(quizPool); if (!opc.some((p) => p.id === a.id)) opc.push(a); }
    pintarOpcionesQuiz(mezclar(opc));
    const preg = document.getElementById("q-pregunta");
    if (quizModo === "silueta") preg.textContent = "¿Quién es este Pokémon?";
    else if (quizModo === "descripcion") {
        preg.textContent = "¿Qué Pokémon se describe así?";
        try {
            const esp = await cargarEspecie(correcto.id);
            const nombreEs = (esp.names.find((n) => n.language.name === "es") || {}).name || correcto.name;
            const de = document.getElementById("q-descripcion");
            de.textContent = "«" + enmascarar(textoEspecie(esp) || "(Sin descripción)", [nombreEs, correcto.name]) + "»";
            de.classList.remove("oculta");
        } catch (_) {}
    } else if (quizModo === "grito") {
        preg.textContent = "¿De quién es este grito?";
        document.getElementById("q-grito-control").classList.remove("oculta");
        AudioFX.grito(correcto.id, { vol: 0.5 });
    }
}
function enmascarar(texto, nombres) {
    let t = texto;
    nombres.forEach((n) => { if (n) t = t.replace(new RegExp(n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), "???"); });
    return t;
}
function pintarOpcionesQuiz(lista) {
    const cont = document.getElementById("q-opciones");
    cont.innerHTML = "";
    lista.forEach((p) => {
        const b = document.createElement("button");
        b.className = "opcion"; b.dataset.id = p.id; b.textContent = nombreBonito(p.name);
        b.onclick = () => responderQuiz(b);
        cont.appendChild(b);
    });
}
function responderQuiz(boton) {
    if (quizRespondido) return;
    quizRespondido = true; quizIntentos++;
    const acierto = Number(boton.dataset.id) === quizResp;
    document.getElementById("q-zona-imagen").classList.add("revelado");
    document.querySelectorAll("#q-opciones .opcion").forEach((b) => { b.disabled = true; if (Number(b.dataset.id) === quizResp) b.classList.add("correcta"); });
    const fb = document.getElementById("q-feedback");
    if (acierto) {
        quizAciertos++; quizRacha++; quizPuntos += 10;
        fb.textContent = quizRacha > 1 && quizRacha % 5 === 0 ? `¡Racha de ${quizRacha}!` : "¡Correcto! +10";
        fb.className = "feedback bien";
        sonarAcierto(); lanzarConfeti();
        if (quizRacha > quizRecord) { quizRecord = quizRacha; escribirLocal("quiz_record", quizRecord); }
    } else {
        quizRacha = 0; boton.classList.add("incorrecta");
        fb.textContent = "¡Casi! Era este:"; fb.className = "feedback mal";
        sonarFallo();
    }
    mostrarTiposQuiz(quizResp);
    document.getElementById("q-nombre").textContent = numFormato(quizResp) + "  " + nombrePk(quizResp);
    document.getElementById("q-puntos").textContent = quizPuntos;
    document.getElementById("q-racha").textContent = quizRacha;
    document.getElementById("q-record").textContent = quizRecord;
    document.getElementById("q-precision").textContent = Math.round((quizAciertos / quizIntentos) * 100) + "%";
    const sig = document.getElementById("q-siguiente");
    sig.style.display = "block"; sig.focus();
}
async function mostrarTiposQuiz(id) {
    try {
        const d = await cargarPokemon(id), cont = document.getElementById("q-tipos");
        cont.innerHTML = ""; d.types.forEach((t) => cont.appendChild(insigniaTipo(t.type.name)));
    } catch (_) {}
}

// ===================== MODO DUELO DE STATS =====================
let dueloA = null, dueloB = null, dueloStat = null, dueloRespondido = false, dueloRacha = 0;
let dueloRecord = Number(localStorage.getItem("duelo_record")) || 0;
function valorStat(pkm, clave) {
    if (clave === "peso") return pkm.weight;
    if (clave === "altura") return pkm.height;
    const s = pkm.stats.find((x) => x.stat.name === clave);
    return s ? s.base_stat : 0;
}
function textoValor(pkm, clave) {
    if (clave === "peso") return (pkm.weight / 10).toFixed(1) + " kg";
    if (clave === "altura") return (pkm.height / 10).toFixed(1) + " m";
    return valorStat(pkm, clave);
}
function renderDuelo() {
    const cont = document.getElementById("vista-duelo");
    cont.innerHTML = `
        <div class="cabecera-modo"><h2>Duelo de stats</h2><p>¿Cuál de los dos gana? ¡Consigue la mejor racha!</p></div>
        <div class="marcador dos">
            <div class="stat"><span class="stat-label">Racha</span><span class="stat-num" id="d-racha">${dueloRacha}</span></div>
            <div class="stat"><span class="stat-label">Récord</span><span class="stat-num" id="d-record">${dueloRecord}</span></div>
        </div>
        <p class="duelo-pregunta" id="d-pregunta">Cargando…</p>
        <div class="duelo-arena" id="d-arena"></div>
        <p class="feedback" id="d-feedback"></p>
        <button class="btn-siguiente" id="d-siguiente">Siguiente</button>`;
    document.getElementById("d-siguiente").onclick = nuevaRondaDuelo;
    nuevaRondaDuelo();
}
async function nuevaRondaDuelo() {
    dueloRespondido = false;
    document.getElementById("d-feedback").textContent = "";
    document.getElementById("d-feedback").className = "feedback";
    document.getElementById("d-siguiente").style.display = "none";
    const arena = document.getElementById("d-arena");
    arena.innerHTML = `<div class="cargando" style="display:block;margin:40px auto"></div>`;
    const [a, b] = especiesAleatorias(2);
    dueloStat = alAzar(STATS_DUELO);
    try { [dueloA, dueloB] = await Promise.all([cargarPokemon(a.id), cargarPokemon(b.id)]); }
    catch (_) { arena.innerHTML = '<p class="nota">Error de carga. Reintenta.</p>'; return; }
    document.getElementById("d-pregunta").innerHTML = `¿Qué Pokémon tiene <b>${dueloStat.etiqueta}</b>?`;
    arena.innerHTML = [dueloA, dueloB].map((p, i) => `
        <button class="duelo-carta" data-lado="${i}">
            <img src="${urlSprite2D(p.id)}" alt="${nombrePk(p.id)}" onerror="this.onerror=null;this.src='${urlSpritePeq(p.id)}'">
            <span class="dc-nom">${nombrePk(p.id)}</span>
            <span class="dc-val oculta">${textoValor(p, dueloStat.clave)}</span>
        </button>`).join(`<div class="duelo-vs">VS</div>`);
    arena.querySelectorAll(".duelo-carta").forEach((btn) => btn.onclick = () => responderDuelo(Number(btn.dataset.lado), arena));
}
function responderDuelo(lado, arena) {
    if (dueloRespondido) return;
    dueloRespondido = true;
    const vA = valorStat(dueloA, dueloStat.clave), vB = valorStat(dueloB, dueloStat.clave);
    const acierto = (lado === 0 ? vA : vB) >= (lado === 0 ? vB : vA);
    arena.querySelectorAll(".dc-val").forEach((v) => v.classList.remove("oculta"));
    const cartas = arena.querySelectorAll(".duelo-carta");
    cartas[vA >= vB ? 0 : 1].classList.add("gana");
    if (!acierto) cartas[lado].classList.add("pierde");
    const fb = document.getElementById("d-feedback");
    if (acierto) {
        dueloRacha++; fb.textContent = "¡Correcto!"; fb.className = "feedback bien"; sonarAcierto();
        if (dueloRacha > dueloRecord) { dueloRecord = dueloRacha; escribirLocal("duelo_record", dueloRecord); }
    } else { dueloRacha = 0; fb.textContent = "¡Fallaste!"; fb.className = "feedback mal"; sonarFallo(); }
    document.getElementById("d-racha").textContent = dueloRacha;
    document.getElementById("d-record").textContent = dueloRecord;
    document.getElementById("d-siguiente").style.display = "block";
}

// ===================== MODO MEMORIA =====================
let memPares = 6, memVolteadas = [], memBloqueo = false, memMovs = 0, memHechas = 0, memInicio = 0, memTimer = null;
function renderMemoria() {
    const cont = document.getElementById("vista-memoria");
    cont.innerHTML = `
        <div class="cabecera-modo"><h2>Memoria Pokémon</h2><p>¡Encuentra todas las parejas!</p></div>
        <div class="mem-controles">
            <div class="campo">
                <label for="mem-tam">Dificultad</label>
                <select id="mem-tam">
                    <option value="6">Fácil (6 parejas)</option>
                    <option value="8">Media (8 parejas)</option>
                    <option value="10">Difícil (10 parejas)</option>
                </select>
            </div>
            <button class="btn-grande" id="mem-nuevo">Nueva partida</button>
        </div>
        <div class="mem-stats">
            <span>Intentos: <b id="mem-movs">0</b></span>
            <span>Parejas: <b id="mem-parejas">0/${memPares}</b></span>
            <span>Tiempo: <b id="mem-tiempo">0s</b></span>
        </div>
        <div class="mem-tablero" id="mem-tablero"></div>`;
    document.getElementById("mem-tam").value = String(memPares);
    document.getElementById("mem-tam").onchange = (e) => { memPares = Number(e.target.value); nuevaMemoria(); };
    document.getElementById("mem-nuevo").onclick = nuevaMemoria;
    nuevaMemoria();
}
function nuevaMemoria() {
    clearInterval(memTimer);
    memVolteadas = []; memBloqueo = false; memMovs = 0; memHechas = 0; memInicio = 0;
    document.getElementById("mem-movs").textContent = "0";
    document.getElementById("mem-parejas").textContent = `0/${memPares}`;
    document.getElementById("mem-tiempo").textContent = "0s";
    const elegidos = especiesAleatorias(memPares);
    const cartas = mezclar(elegidos.concat(elegidos).map((p) => ({ id: p.id })));
    const tablero = document.getElementById("mem-tablero");
    tablero.style.setProperty("--cols", memPares >= 10 ? 5 : 4);
    tablero.innerHTML = cartas.map((c) => `
        <button class="mem-carta" data-id="${c.id}">
            <div class="mem-cara mem-atras"></div>
            <div class="mem-cara mem-frente"><img src="${urlSprite2D(c.id)}" alt="" onerror="this.onerror=null;this.src='${urlSpritePeq(c.id)}'"></div>
        </button>`).join("");
    tablero.querySelectorAll(".mem-carta").forEach((b) => b.onclick = () => voltearMem(b));
}
function voltearMem(carta) {
    if (memBloqueo || carta.classList.contains("volteada") || carta.classList.contains("hecha")) return;
    if (memInicio === 0) {
        memInicio = Date.now();
        memTimer = setInterval(() => { document.getElementById("mem-tiempo").textContent = Math.floor((Date.now() - memInicio) / 1000) + "s"; }, 500);
    }
    carta.classList.add("volteada");
    memVolteadas.push(carta);
    if (memVolteadas.length < 2) return;
    memMovs++;
    document.getElementById("mem-movs").textContent = memMovs;
    memBloqueo = true;
    const [a, b] = memVolteadas;
    if (a.dataset.id === b.dataset.id) {
        setTimeout(() => {
            a.classList.add("hecha"); b.classList.add("hecha");
            memVolteadas = []; memBloqueo = false; memHechas++;
            document.getElementById("mem-parejas").textContent = `${memHechas}/${memPares}`;
            sonarAcierto();
            if (memHechas === memPares) { clearInterval(memTimer); lanzarConfeti(); toast(`¡Completado en ${memMovs} intentos y ${Math.floor((Date.now() - memInicio) / 1000)}s!`, 3500); }
        }, 450);
    } else {
        setTimeout(() => { a.classList.remove("volteada"); b.classList.remove("volteada"); memVolteadas = []; memBloqueo = false; }, 800);
    }
}

// ===================== POKÉDEX =====================
let tipoActivo = null, listaFiltrada = [], renderizados = 0;
const LOTE = 60;
const busqueda = document.getElementById("busqueda");
const dexGeneracion = document.getElementById("dex-generacion");
const tiposFiltro = document.getElementById("tipos-filtro");
const conteoDex = document.getElementById("conteo-dex");
const rejillaDex = document.getElementById("rejilla-dex");
const sentinela = document.getElementById("sentinela");

function construirFiltrosTipo() {
    Object.keys(TIPOS_ES).forEach((tipo) => {
        const chip = document.createElement("button");
        chip.className = "chip-tipo tipo-" + tipo;
        chip.innerHTML = iconoTipo(tipo, 1.5) + TIPOS_ES[tipo];
        chip.onclick = () => {
            if (tipoActivo === tipo) { tipoActivo = null; chip.classList.remove("activo"); }
            else { document.querySelectorAll(".chip-tipo").forEach((c) => c.classList.remove("activo")); tipoActivo = tipo; chip.classList.add("activo"); }
            aplicarFiltrosDex();
        };
        tiposFiltro.appendChild(chip);
    });
}
async function aplicarFiltrosDex() {
    if (TODOS.length === 0) return;
    let base = TODOS;
    const r = idsDeGeneracion(dexGeneracion.value);
    if (r) base = base.filter((p) => p.id >= r.min && p.id <= r.max);
    if (tipoActivo) {
        conteoDex.textContent = "Filtrando por tipo…";
        try { const set = await idsPorTipo(tipoActivo); base = base.filter((p) => set.has(p.id)); } catch (_) {}
    }
    // Busca por clave, por nombre en español (sin tildes ni signos: «mr mime», «flabebe», «colmilargo») o por número.
    const plano = (t) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9♀♂]+/g, " ").trim();
    const q = busqueda.value.trim().toLowerCase().replace("#", ""), qp = plano(q);
    if (q) base = base.filter((p) => p.name.includes(q) || (qp && plano(nombreBonito(p.name)).includes(qp)) || String(p.id).includes(q) || numFormato(p.id).includes(q));
    listaFiltrada = base;
    const nCap = base.filter((p) => entrenador.capturados[p.id]).length;
    conteoDex.textContent = `${base.length} Pokémon` + (tipoActivo ? ` de tipo ${TIPOS_ES[tipoActivo]}` : "") + (hayPartida() ? ` · Capturados: ${nCap}` : "");
    rejillaDex.innerHTML = ""; renderizados = 0;
    if (!base.length) { rejillaDex.innerHTML = `<p class="dex-vacio">No se encontró ningún Pokémon.</p>`; return; }
    renderLote();
}
function renderLote() {
    const frag = document.createDocumentFragment();
    const fin = Math.min(renderizados + LOTE, listaFiltrada.length);
    for (let i = renderizados; i < fin; i++) {
        const p = listaFiltrada[i], capturado = !!entrenador.capturados[p.id];
        const carta = document.createElement("button");
        carta.className = "carta-dex" + (capturado ? " capturado" : "");
        carta.style.animationDelay = ((i - renderizados) * 0.015) + "s";
        carta.innerHTML = `${capturado ? `<img class="marca-cap" src="${urlItem("poke-ball")}" alt="Capturado" title="Capturado">` : ""}
            <span class="num-dex">${numFormato(p.id)}</span>
            <img loading="lazy" decoding="async" src="${urlSprite2D(p.id)}" alt="${nombreBonito(p.name)}" onerror="this.onerror=null;this.src='${urlSpritePeq(p.id)}'">
            <span class="nom-dex">${nombreBonito(p.name)}</span>`;
        carta.onclick = () => abrirModal(p.id);
        frag.appendChild(carta);
    }
    rejillaDex.appendChild(frag);
    renderizados = fin;
}
new IntersectionObserver((e) => { if (e[0].isIntersecting && renderizados < listaFiltrada.length) renderLote(); }, { rootMargin: "300px" }).observe(sentinela);

// ===================== MODAL DE DETALLE (Pokédex) =====================
let modalId = null, modalShiny = false;
const modalFondo = document.getElementById("modal-fondo");
const modalContenido = document.getElementById("modal-contenido");
async function abrirModal(id) {
    modalId = id; modalShiny = false;
    if (modalFondo.classList.contains("oculta")) pasoVentana(true);
    modalFondo.classList.remove("oculta");
    document.body.style.overflow = "hidden";
    modalContenido.innerHTML = `<div class="modal-cargando"><div class="cargando"></div></div>`;
    try { const [pkm, esp] = await Promise.all([cargarPokemon(id), cargarEspecie(id)]); renderModal(pkm, esp); }
    catch (_) { modalContenido.innerHTML = `<div class="modal-cargando">No se pudo cargar la ficha.</div>`; }
}
// Color de cada tipo (el de sus etiquetas) para la cabecera de la ficha.
const COLOR_TIPO_DEX = {
    normal: "#a8a77a", fire: "#ee8130", water: "#6390f0", electric: "#f7d02c", grass: "#7ac74c", ice: "#96d9d6", fighting: "#c22e28",
    poison: "#a33ea1", ground: "#e2bf65", flying: "#a98ff3", psychic: "#f95587", bug: "#a6b91a", rock: "#b6a136", ghost: "#735797",
    dragon: "#6f35fc", dark: "#705746", steel: "#b7b7ce", fairy: "#d685ad",
};
function renderModal(pkm, esp) {
    const c1 = COLOR_TIPO_DEX[pkm.types[0].type.name] || "#6b5a73";
    const colorFondo = `linear-gradient(180deg, ${c1}, color-mix(in srgb, ${c1} 55%, #1b1622))`;
    const genero = (esp.genera.find((g) => g.language.name === "es") || esp.genera.find((g) => g.language.name === "en") || {}).genus || "";
    const capturado = !!entrenador.capturados[pkm.id];
    const statsHTML = pkm.stats.map((s) => {
        const val = s.base_stat, ancho = Math.min(100, (val / 200) * 100);
        const color = val >= 100 ? "#4caf50" : val >= 60 ? "#ffcb05" : "#ff7675";
        return `<div class="stat-fila"><span class="nom">${STATS_ES[s.stat.name]}</span><span class="val">${val}</span>
            <div class="stat-barra"><span data-ancho="${ancho}" style="background:${color}"></span></div></div>`;
    }).join("");
    modalContenido.innerHTML = `
        <div class="modal-cabecera" style="background:${colorFondo}">
            <div class="modal-num">Nº ${String(pkm.id).padStart(4, "0")}${capturado ? ` <img class="modal-capturado" src="${urlItem("poke-ball")}" alt="Capturado" title="Capturado">` : ""}</div>
            <div class="modal-nombre">${nombrePk(pkm.id)}</div>
            <div class="modal-genero">${genero}</div>
        </div>
        <div class="modal-cuerpo">
            <div class="modal-sprites">
                <div class="ms-caja ms-grande"><img id="modal-spr-frente" alt=""><small>Frente</small></div>
                <div class="ms-caja ms-grande"><img id="modal-spr-espalda" alt=""><small>Espalda</small></div>
                ${formasMega(pkm.id).map((m, i) => `<button class="ms-caja ms-mega" data-mega="${i}" title="Escuchar su grito"><img id="modal-spr-mega-${i}" alt=""><small>${m.nombre}</small></button>`).join("")}
            </div>
            <button class="btn-shiny" id="btn-shiny">Ver variocolor</button>
            <div class="modal-tipos">${pkm.types.map((t) => insigniaTipoHTML(t.type.name)).join("")}</div>
            <p class="modal-desc">${textoEspecie(esp)}</p>
            <div class="modal-medidas">
                <div class="medida"><div class="valor">${(pkm.height / 10).toFixed(1)} m</div><div class="etiqueta">Altura</div></div>
                <div class="medida"><div class="valor">${(pkm.weight / 10).toFixed(1)} kg</div><div class="etiqueta">Peso</div></div>
            </div>
            <div class="titulo-stats">Habilidades</div>
            <div class="modal-habs">${Object.entries(habilidadesDe(pkm)).map(([h, k]) => `<div class="mh"><b>${nombreHabilidad(k)}${h === "3" ? ' <i class="hab-oculta">Oculta</i>' : ""}</b><p>${descHabilidad(k)}</p></div>`).join("")}</div>
            ${hayPartida() && modoRegion() ? `<div class="titulo-stats">Dónde encontrarlo en Aurelia</div><div class="modal-donde" data-donde><div class="cargando"></div></div>` : ""}
            <div class="titulo-stats">Estadísticas base</div>
            ${statsHTML}
            <div style="text-align:center"><button class="btn-grito" id="btn-grito">Escuchar grito</button></div>
        </div>`;
    requestAnimationFrame(() => modalContenido.querySelectorAll(".stat-barra span").forEach((b) => b.style.width = b.dataset.ancho + "%"));
    const btnShiny = document.getElementById("btn-shiny");
    // Sprites animados de la ficha (y los de sus megaevoluciones), con su color normal o variocolor, como en la Pokédex de Blanco/Negro.
    const megas = formasMega(pkm.id);
    const montarSprites = () => {
        const estrecho = innerWidth < 520;   // en el móvil, frente y espalda uno al lado del otro
        const grande = (el) => tamanoNativo(el, 2, estrecho ? 124 : 170, estrecho ? 140 : 190), peq = (el) => tamanoNativo(el, 1, 100, 150);
        montarPokemon(document.getElementById("modal-spr-frente"), pkm.id, { shiny: modalShiny }).then(grande);
        montarPokemon(document.getElementById("modal-spr-espalda"), pkm.id, { shiny: modalShiny, espalda: true }).then(grande);
        megas.forEach((m, i) => montarPokemon(document.getElementById(`modal-spr-mega-${i}`), pkm.id, { shiny: modalShiny, mega: m }).then(peq));
    };
    montarSprites();
    modalContenido.querySelectorAll("[data-mega]").forEach((b) => b.onclick = () => AudioFX.gritoMega(megas[Number(b.dataset.mega)], pkm.id, { vol: 0.5 }));
    btnShiny.onclick = () => {
        modalShiny = !modalShiny;
        montarSprites();
        btnShiny.classList.toggle("activo", modalShiny);
        btnShiny.textContent = modalShiny ? "Ver color normal" : "Ver variocolor";
    };
    document.getElementById("btn-grito").onclick = () => AudioFX.grito(pkm.id, { vol: 0.5 });
    const donde = modalContenido.querySelector("[data-donde]");
    if (donde) dondeEncontrar(pkm.id).then((lista) => {
        if (!donde.isConnected || modalId !== pkm.id) return;
        donde.innerHTML = lista.length ? `<ul>${lista.map((x) => `<li class="${x.bloqueado ? "bloqueado" : ""}">${x.txt}${x.bloqueado ? " <small>· aún no puedes ir</small>" : ""}</li>`).join("")}</ul>`
            : `<p class="nota">No sale en la naturaleza de Aurelia: quizá evolucionando, en un intercambio o en algún encuentro misterioso.</p>`;
    }).catch(() => { donde.innerHTML = ""; });
}
function cerrarModal() { const abierta = !modalFondo.classList.contains("oculta"); modalFondo.classList.add("oculta"); document.body.style.overflow = ""; modalId = null; if (abierta && !document.querySelector(".capa-resumen, .capa-opciones")) pasoVentana(false); }
function navModal(dir) {
    if (modalId == null) return;
    const idx = listaFiltrada.findIndex((p) => p.id === modalId), nuevo = idx + dir;
    if (idx !== -1 && nuevo >= 0 && nuevo < listaFiltrada.length) abrirModal(listaFiltrada[nuevo].id);
}

// ===================== EVENTOS GLOBALES =====================
document.getElementById("nav-juegos").addEventListener("click", (e) => { const b = e.target.closest(".nav-btn"); if (b) { if (b.dataset.vista === "aventura") subAventura = "principal"; mostrarVista(b.dataset.vista); } });
document.querySelector(".marca").addEventListener("click", () => mostrarVista("inicio"));
document.getElementById("btn-opciones").onclick = () => { AudioFX.ui("select"); abrirOpciones(); };
function pantallaCompleta() {
    try { if (!document.fullscreenElement) document.documentElement.requestFullscreen(); else document.exitFullscreen(); }
    catch (_) { toast("Tu navegador no permite pantalla completa aquí."); }
}

// ===================== OPCIONES =====================
// Sonido (con volumen para música, efectos y gritos), partida (dificultad y estilo), combate y pantalla.
// De dónde sale cada cosa (se muestra en Opciones → Créditos y fuentes).
const CREDITOS = [
    ["Sprites de Pokémon", [["Pokémon Negro y Blanco (animados, vía PokéAPI)", "https://github.com/PokeAPI/sprites"],
        ["Smogon Sprite Project (Pokémon Showdown; también los Gigamax animados en 3D)", "https://play.pokemonshowdown.com/sprites/"], ["PokéRogue (formas, megas y Gigamax)", "https://github.com/pagefaultgames/pokerogue-assets"],
        ["Ghasty001", "https://github.com/Ghasty001"], ["Pokémon Essentials EBDX", "https://github.com/ChromeValiant/Pokemon-Essentials-21-With-Unofficial-EBDX"]]],
    ["Animaciones y efectos", [["PokéRogue (ataques, campos, trampas, Drenadoras, Protección, Teracristalización con su cristal y sus destellos, Poder Z y aura de los Pokémon Furiosos, megaevolución, encuentros misteriosos, Zona Safari (cartel, cebo y barro), luz y partículas de las Poké Balls, flechas de las subidas y bajadas de características)", "https://github.com/pagefaultgames/pokerogue-assets"],
        ["Pokémon Showdown (animaciones alternativas, Maximovimientos, Teraexplosión, tiempo atmosférico, campos, Espacio Raro, trampas, Sustituto, iconos de teratipo)", "https://github.com/smogon/pokemon-showdown-client"],
        ["Deluxe Battle Kit de Essentials (Lucidious89, adaptado por La Base de Sky): cinemáticas y sonido de los poderes", "https://github.com/La-Base-De-Sky-Plugins/Deluxe-Battle-Kit-Enhanced-Battle-UI"],
        ["Pokémon Essentials EBDX (transiciones, evolución)", "https://github.com/ChromeValiant/Pokemon-Essentials-21-With-Unofficial-EBDX"]]],
    ["Escenarios", [["Pokémon Showdown (fondos de combate de Negro/Blanco, X/Y y Rubí Omega/Zafiro Alfa)", "https://play.pokemonshowdown.com/"]]],
    ["Entrenadores, interfaz y personajes", [["PokéRogue (sprites animados, ventanas, cursor e iconos)", "https://github.com/pagefaultgames/pokerogue-assets"]]],
    ["Música y sonidos", [["PokéRogue (música y efectos)", "https://github.com/pagefaultgames/pokerogue-assets"],
        ["Pokémon Showdown (audio)", "https://play.pokemonshowdown.com/audio/"], ["PokéAPI (gritos)", "https://github.com/PokeAPI/cries"]]],
    ["Datos y textos", [["PokéAPI (Pokémon, movimientos, objetos y nombres oficiales en español)", "https://pokeapi.co/"],
        ["Pokémon Showdown (datos de combate)", "https://github.com/smogon/pokemon-showdown"], ["PokéRogue (textos en español)", "https://github.com/pagefaultgames/pokerogue-locales"]]],
    ["Iconos de objetos", [["PokéAPI", "https://github.com/PokeAPI/sprites"], ["pokesprite (msikma)", "https://github.com/msikma/pokesprite"],
        ["PokéRogue (los objetos de Escarlata y Púrpura)", "https://github.com/pagefaultgames/pokerogue-assets"]]],
    ["Fuente de letra", [["«Pokémon Emerald Pro» (fuente de fans)", null]]],
    ["Multijugador", [["PeerJS (conexión entre jugadores)", "https://peerjs.com/"], ["Supabase (ranking mundial, opcional)", "https://supabase.com/"]]],
];
// ---- Informar de un error o sugerir algo (beta): se guarda en el servidor del juego (Supabase) ----
// Los datos técnicos son la versión, el navegador, la pantalla, dónde estabas y los últimos errores: nada personal.
function datosInforme() {
    const vista = document.querySelector(".vista:not(.oculta)");
    const p = hayPartida() ? { medallas: entrenador.medallas.length, campeon: !!entrenador.campeon, dificultad: entrenador.dificultad || "normal",
        modo: modoRegion() ? "region" : "clasico", lugar: (() => { try { return mundo().lugar || null; } catch (_) { return null; } })(), equipo: (entrenador.equipo || []).length, horas: Math.round((entrenador.tiempo || 0) / 360) / 10 } : null;
    return { version: VERSION_JUEGO, fecha: NOVEDADES[0].version, pvp: VERSION_PVP, vista: vista ? vista.id.replace("vista-", "") : null,
        combate: !!document.querySelector(".capa-batalla:not(.oculta)"), navegador: navigator.userAgent.slice(0, 220), idioma: navigator.language,
        pantalla: `${innerWidth}x${innerHeight} @${Math.round((window.devicePixelRatio || 1) * 100) / 100}`, tactil: "ontouchstart" in window,
        opciones: { animaciones: config.animaciones || "pokerogue", modernas: config.animModernas !== false, velocidad: velJuego(), disposicion: config.disposicion || "vertical" },
        partida: p, errores: (window.__errores || []).slice(-8) };
}
function abrirInforme(tipo = "error") {
    if (document.querySelector(".capa-informe")) return;
    const capa = document.createElement("div");
    capa.className = "capa-opciones capa-informe";
    capa.innerHTML = `<div class="opciones informe" role="dialog" aria-label="Informar de un error">
        <header class="op-cab"><h2>Informar</h2><button class="op-cerrar" data-cerrar aria-label="Cerrar">×</button></header>
        <div class="op-cuerpo">
            <p class="inf-intro">¿Algo no va bien o tienes una idea? Cuéntanoslo.</p>
            <div class="op-seg inf-tipo" data-seg="tipo">${[["error", "Algo falla"], ["sugerencia", "Una idea"], ["otro", "Otra cosa"]].map(([v, txt]) => `<button class="${v === tipo ? "activa" : ""}" data-v="${v}">${txt}</button>`).join("")}</div>
            <textarea class="inf-texto" maxlength="1500" rows="6" placeholder="¿Qué estabas haciendo y qué ha pasado?"></textarea>
            <div class="inf-pie"><small class="inf-cuenta">0 / 1500</small></div>
            <label class="inf-tecnicos"><input type="checkbox" checked> Enviar también datos de la partida para encontrar el fallo</label>
            <button class="btn-grande inf-enviar" data-enviar>Enviar</button>
            ${Ranking.activo() ? `<button class="pie-enlace inf-mios" data-mios>Mis informes</button>` : ""}
        </div>
    </div>`;
    document.body.appendChild(capa); document.body.style.overflow = "hidden";
    const cerrar = () => { capa.remove(); document.removeEventListener("keydown", onEsc); if (!document.querySelector(".capa-resumen, .capa-pe, .capa-opciones")) document.body.style.overflow = ""; };
    const onEsc = (e) => { if (e.key === "Escape") cerrar(); };
    document.addEventListener("keydown", onEsc);
    capa.addEventListener("click", (e) => { if (e.target === capa) cerrar(); });
    capa.querySelector("[data-cerrar]").onclick = cerrar;
    const bm = capa.querySelector("[data-mios]"); if (bm) bm.onclick = () => { cerrar(); abrirMisInformes(); };
    capa.querySelectorAll(".inf-tipo button").forEach((b) => b.onclick = () => { tipo = b.dataset.v; capa.querySelectorAll(".inf-tipo button").forEach((x) => x.classList.toggle("activa", x === b)); AudioFX.ui("select"); });
    const txt = capa.querySelector(".inf-texto"), cuenta = capa.querySelector(".inf-cuenta"), tec = capa.querySelector(".inf-tecnicos input");
    try { txt.value = localStorage.getItem("fc-informe-borrador") || ""; } catch (_) {}
    const contar = () => { cuenta.textContent = `${txt.value.length} / 1500`; try { localStorage.setItem("fc-informe-borrador", txt.value); } catch (_) {} };
    txt.oninput = contar; contar();
    setTimeout(() => txt.focus(), 60);
    const env = capa.querySelector("[data-enviar]");
    env.onclick = async () => {
        const texto = txt.value.trim();
        if (texto.length < 10) { AudioFX.ui("error"); toast("Cuéntalo con un poco más de detalle (al menos 10 letras)."); txt.focus(); return; }
        if (!Ranking.activo()) { AudioFX.ui("error"); toast("Ahora mismo no se pueden enviar informes."); return; }
        env.disabled = true; env.textContent = "Enviando…";
        try {
            const r = await Ranking.reportar(tipo, texto, tec.checked ? datosInforme() : {});
            if (r === "demasiados") { toast("Has enviado muchos informes hoy. ¡Gracias! Prueba de nuevo mañana.", 3600); env.disabled = false; env.textContent = "Enviar"; return; }
            try { localStorage.removeItem("fc-informe-borrador"); localStorage.setItem("fc-informes", "1"); } catch (_) {}
            AudioFX.ui("select"); cerrar();
            toast("¡Gracias! Tu informe ha llegado al creador del juego.", 3400);
        } catch (_) {
            AudioFX.ui("error"); env.disabled = false; env.textContent = "Enviar";
            toast("No se pudo enviar. Revisa tu conexión e inténtalo otra vez.", 3400);
        }
    };
}
// Tus informes, con su estado y lo que te ha contestado el creador (al abrirlos, las respuestas cuentan como leídas).
async function abrirMisInformes() {
    let lista = [];
    try { lista = await Ranking.misReportes(); } catch (_) { toast("No se pudieron cargar tus informes. Revisa tu conexión.", 3000); return; }
    const ESTADO = { nuevo: "Enviado", visto: "Leído", resuelto: "Resuelto" };
    const limpio = (s) => String(s || "").replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]));
    ventanaAyuda("Mis informes", lista.length ? lista.map((r) => `<section class="mi-inf ${r.respuesta && !r.leida ? "nueva" : ""}">
        <div class="mi-cab"><span class="mi-estado e-${r.estado}">${ESTADO[r.estado] || "Enviado"}</span><small>${new Date(r.creado).toLocaleDateString("es-ES")}</small></div>
        <p>${limpio(r.texto).slice(0, 300)}${r.texto.length > 300 ? "…" : ""}</p>
        ${r.respuesta ? `<div class="mi-resp"><b>Respuesta del creador</b><p>${limpio(r.respuesta)}</p></div>` : ""}</section>`).join("")
        : `<p class="nota">Aún no has enviado ningún informe.</p>`);
    if (lista.some((r) => r.respuesta && !r.leida)) Ranking.marcarLeidas();
}
// Al empezar, si enviaste informes, mira si el creador ha contestado alguno.
setTimeout(async () => {
    try {
        if (localStorage.getItem("fc-informes") !== "1" || typeof Ranking === "undefined" || !Ranking.activo()) return;
        const nuevas = (await Ranking.misReportes()).filter((r) => r.respuesta && !r.leida).length;
        if (!nuevas) return;
        const a = document.createElement("div");
        a.className = "aviso-error aviso-version";
        a.innerHTML = `<span>El creador ha contestado ${nuevas === 1 ? "a tu informe" : `a ${nuevas} informes tuyos`}.</span><button data-si>Ver</button><button data-no aria-label="Cerrar">×</button>`;
        document.body.appendChild(a);
        a.querySelector("[data-si]").onclick = () => { a.remove(); abrirMisInformes(); };
        a.querySelector("[data-no]").onclick = () => a.remove();
    } catch (_) {}
}, 8000);
// Si algo del juego falla, un aviso discreto (una vez por sesión) para poder contarlo.
let avisoErrorDado = false;
window.__alError = (e) => {
    if (avisoErrorDado || !e.f || !/\.js$/.test(e.f) || /supabase|peerjs/i.test(e.f) || !document.body) return;
    avisoErrorDado = true;
    const a = document.createElement("div");
    a.className = "aviso-error";
    a.innerHTML = `<span>Algo no ha ido bien.</span><button data-si>Informar</button><button data-no aria-label="Cerrar">×</button>`;
    document.body.appendChild(a);
    const quitar = () => a.remove();
    a.querySelector("[data-si]").onclick = () => { quitar(); abrirInforme("error"); };
    a.querySelector("[data-no]").onclick = quitar;
    setTimeout(quitar, 15000);
};
// Instalar como aplicación: en Android y en el ordenador lo ofrece el navegador; en el iPhone, desde «Compartir».
let avisoInstalar = null;
window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); avisoInstalar = e; });
window.addEventListener("appinstalled", () => { avisoInstalar = null; toast("¡Instalado! Ya puedes abrir el juego desde tu pantalla de inicio.", 3400); });
const enApp = () => window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
const esIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
function abrirOpciones() {
    if (document.querySelector(".capa-opciones")) return;
    const partida = hayPartida();
    const fila = (titulo, desc, control) => `<div class="op-fila"><div class="op-txt"><b>${titulo}</b>${desc ? `<small>${desc}</small>` : ""}</div><div class="op-ctl">${control}</div></div>`;
    const interruptor = (clave, on) => `<button class="op-switch ${on ? "on" : ""}" data-switch="${clave}" role="switch" aria-checked="${on}" aria-label="${clave}"><span></span></button>`;
    const deslizador = (clave) => { const v = config[clave] ?? 100; return `<input type="range" class="op-rango" min="0" max="100" step="5" value="${v}" data-rango="${clave}" aria-label="${clave}"><b class="op-valor" data-valor="${clave}">${v}</b>`; };
    const segmentos = (clave, ops, actual) => `<div class="op-seg" data-seg="${clave}">${ops.map(([v, t]) => `<button class="${String(v) === String(actual) ? "activa" : ""}" data-v="${v}">${t}</button>`).join("")}</div>`;
    const capa = document.createElement("div");
    capa.className = "capa-opciones";
    capa.innerHTML = `<div class="opciones" role="dialog" aria-label="Opciones">
        <header class="op-cab"><h2>Opciones</h2><button class="op-cerrar" data-cerrar aria-label="Cerrar">×</button></header>
        <div class="op-cuerpo">
            <section class="op-seccion"><h3>Sonido</h3>
                ${fila("Sonido", "Activa o silencia todo el juego.", interruptor("sonido", config.sonido))}
                ${fila("Música", "", deslizador("volMusica"))}
                ${fila("Efectos", "Ataques, Poké Balls y menús.", deslizador("volEfectos"))}
                ${fila("Gritos", "", deslizador("volGritos"))}
                ${fila("Pitido de PS bajos", "Suena mientras tu Pokémon está en rojo.", interruptor("alarmaPS", config.alarmaPS !== false))}
            </section>
            ${partida ? `<section class="op-seccion"><h3>Partida</h3>
                ${htmlDificultad(entrenador.dificultad || "normal")}
                ${fila("Estilo de la aventura", "Región: viaja por pueblos y rutas. Clásico: todo en una pantalla.", segmentos("modoAventura", [["region", "Región"], ["clasico", "Clásico"]], modoRegion() ? "region" : "clasico"))}
                ${fila("Repartir experiencia", "Todo el equipo gana experiencia en cada combate.", interruptor("expShare", config.expShare))}
                ${fila("Regalo Misterioso: Colección Mega", "Todos los Pokémon que megaevolucionan y todas sus megapiedras (también las X, Y y Z). Una vez por partida.",
                    regaloMegaRecibido() ? `<button class="btn-sec op-boton" disabled>Recibido</button>` : `<button class="btn-grande op-boton" data-regalo-mega>Recibir</button>`)}
            </section>` : ""}
            <section class="op-seccion"><h3>Combate</h3>
                ${fila("Velocidad del juego", "También con la tecla V.", segmentos("velocidad", [[1, "×1"], [2, "×2"], [3, "×3"]], velJuego()))}
                ${fila("Animaciones de ataques", "Cómo se ven los ataques.", segmentos("animaciones", [["pokerogue", "Detalladas"], ["showdown", "Showdown"]], config.animaciones === "showdown" ? "showdown" : "pokerogue"))}
                ${fila("Efectos de cámara", "La escena tiembla con los golpes fuertes y destella con los críticos.", interruptor("camara", config.camara !== false))}
                ${fila("Animaciones modernas", "Arremetidas, cámara que se acerca y golpes del color del tipo.", interruptor("animModernas", config.animModernas !== false))}
                ${fila("Cinemáticas de los poderes", "Primer plano al usar Dinamax, Teracristal o un movimiento Z.", interruptor("cinematicas", config.cinematicas !== false))}
                ${fila("Animaciones 3D", "Para los Pokémon que no tienen animación 2D.", interruptor("sprites3D", config.sprites3D !== false))}
                ${fila("Pantallas del combate", "", segmentos("disposicion", [["vertical", "Vertical"], ["horizontal", "Horizontal"]], config.disposicion === "horizontal" ? "horizontal" : "vertical"))}
            </section>
            <section class="op-seccion"><h3>Pantalla</h3>
                ${fila("Tema", "", segmentos("tema", [["oscuro", "Oscuro"], ["claro", "Claro"]], config.tema === "claro" ? "claro" : "oscuro"))}
                ${fila("Ventanas", "El marco de los menús y los cuadros de texto.", segmentos("ventana", [1, 2, 3, 4, 5].map((n) => [n, String(n)]), config.ventana || 3))}
                ${fila("Pantalla completa", "", `<button class="btn-sec op-boton" data-pantalla>Cambiar</button>`)}
                ${!enApp() && (avisoInstalar || esIOS()) ? fila("Instalar como aplicación", avisoInstalar ? "Ábrelo desde la pantalla de inicio, a pantalla completa."
                    : "En el iPhone o el iPad: Compartir → «Añadir a pantalla de inicio».", avisoInstalar ? `<button class="btn-grande op-boton" data-instalar>Instalar</button>` : "") : ""}
            </section>
            <section class="op-seccion"><h3>Ayuda</h3>
                ${fila("Guía del juego", "Cómo funciona cada cosa: Furiosos, tiempo, poderes, pesca, Safari, Metro…", `<button class="btn-sec op-boton" data-guia>Abrir</button>`)}
                ${fila("Novedades", "Lo nuevo de la última versión.", `<button class="btn-sec op-boton" data-novedades>Ver</button>`)}
                ${fila("Informar de un error", "¿Algo falla o tienes una idea? Cuéntanoslo.", `<button class="btn-sec op-boton" data-informe>Escribir</button>`)}
                ${fila("Privacidad", "", `<button class="btn-sec op-boton" data-privacidad>Ver</button>`)}
                ${fila("Versión", "", `<b class="op-version num-pk">${VERSION_JUEGO}</b>`)}
            </section>
            <section class="op-seccion op-creditos"><h3>Créditos y fuentes</h3>
                <p>Juego de fans sin ánimo de lucro. Pokémon y todo lo relacionado son propiedad de Nintendo, Creatures, GAME FREAK y The Pokémon Company.
                No se ha inventado ningún gráfico: todo viene de estos proyectos.</p>
                <ul class="op-fuentes">${CREDITOS.map(([que, fuentes]) => `<li><b>${que}:</b> ${fuentes.map(([n, url]) => url ? `<a href="${url}" target="_blank" rel="noopener">${n}</a>` : n).join(", ")}.</li>`).join("")}</ul>
            </section>
        </div>
    </div>`;
    document.body.appendChild(capa); document.body.style.overflow = "hidden";
    const cerrar = () => { capa.remove(); document.removeEventListener("keydown", onEsc); if (!document.querySelector(".capa-resumen, .capa-pe")) document.body.style.overflow = ""; };
    const onEsc = (e) => { if (e.key === "Escape") cerrar(); };
    document.addEventListener("keydown", onEsc);
    capa.addEventListener("click", (e) => { if (e.target === capa) cerrar(); });
    capa.querySelector("[data-cerrar]").onclick = cerrar;
    capa.querySelector("[data-pantalla]").onclick = pantallaCompleta;
    const bin = capa.querySelector("[data-instalar]");
    if (bin) bin.onclick = async () => { const e = avisoInstalar; if (!e) return; avisoInstalar = null; cerrar(); e.prompt(); try { await e.userChoice; } catch (_) {} };
    capa.querySelector("[data-guia]").onclick = () => { cerrar(); abrirGuia(); };
    const brm = capa.querySelector("[data-regalo-mega]");
    if (brm) brm.onclick = async () => {
        brm.disabled = true; brm.textContent = "Recibiendo...";
        const r = await regaloColeccionMega();
        if (!r) return;
        brm.textContent = "Recibido";
        AudioFX.fanfarria(MUSICA.captura); lanzarConfeti();
        toast(`¡Regalo recibido! ${r.pokemon} Pokémon nuevos en tu Caja y ${r.piedras} megapiedras en tu mochila. Equípales su piedra desde su ficha.`, 6000);
        if (document.getElementById("vista-aventura")) renderAventura();
    };
    capa.querySelector("[data-novedades]").onclick = () => { cerrar(); abrirNovedades(); };
    capa.querySelector("[data-informe]").onclick = () => { cerrar(); abrirInforme(); };
    capa.querySelector("[data-privacidad]").onclick = () => { cerrar(); abrirPrivacidad(); };
    // Sin sonido, los volúmenes se ven a 0 y no se pueden mover; al activarlo vuelven a su valor (si estaban todos a 0, al máximo).
    const VOLUMENES = ["volMusica", "volEfectos", "volGritos"];
    const pintarVolumenes = () => {
        capa.querySelectorAll("[data-rango]").forEach((r) => {
            const k = r.dataset.rango, v = config.sonido ? (config[k] ?? 100) : 0;
            r.value = v; r.disabled = !config.sonido;
            capa.querySelector(`[data-valor="${k}"]`).textContent = v;
            r.closest(".op-fila").classList.toggle("apagada", !config.sonido);
        });
    };
    const ponerSonido = (on) => {
        config.sonido = on;
        const b = capa.querySelector('[data-switch="sonido"]');
        b.classList.toggle("on", on); b.setAttribute("aria-checked", on);
        if (on && VOLUMENES.every((k) => !config[k])) VOLUMENES.forEach((k) => { config[k] = 100; });
        guardarConfig(); pintarVolumenes(); AudioFX.actualizarVolumen();
        if (!on) AudioFX.pararMusica();
        else if (!document.getElementById("vista-aventura").classList.contains("oculta")) renderAventura();
    };
    pintarVolumenes();
    capa.querySelectorAll("[data-switch]").forEach((b) => b.onclick = () => {
        const k = b.dataset.switch;
        const on = !b.classList.contains("on");
        if (k === "sonido") { ponerSonido(on); AudioFX.ui("select"); return; }
        b.classList.toggle("on", on); b.setAttribute("aria-checked", on);
        config[k] = on; guardarConfig();
        if (k === "alarmaPS" && !on) AudioFX.alarma(false);
        AudioFX.ui("select");
    });
    capa.querySelectorAll("[data-rango]").forEach((r) => {
        const k = r.dataset.rango;
        r.oninput = () => {
            config[k] = Number(r.value); capa.querySelector(`[data-valor="${k}"]`).textContent = r.value; AudioFX.actualizarVolumen();
            if (VOLUMENES.every((x) => !config[x])) ponerSonido(false);   // todo a 0: sin sonido
        };
        r.onchange = () => {
            guardarConfig();
            if (k === "volEfectos") AudioFX.ui("select");
            if (k === "volGritos") AudioFX.grito(entrenador.equipo[0] || 25, { vol: 0.5 });
        };
    });
    capa.querySelectorAll("[data-seg]").forEach((g) => g.querySelectorAll("button").forEach((b) => b.onclick = () => {
        const k = g.dataset.seg, v = b.dataset.v;
        g.querySelectorAll("button").forEach((x) => x.classList.toggle("activa", x === b));
        AudioFX.ui("select");
        if (k === "velocidad") { config.velocidad = Number(v); guardarConfig(); pintarVelocidad(); return; }
        config[k] = v; guardarConfig();
        if (k === "tema" || k === "ventana") aplicarTema();
        if (k === "modoAventura") { subAventura = "principal"; if (!document.getElementById("vista-aventura").classList.contains("oculta")) renderAventura(); }
    }));
    if (partida) conectarDificultad(capa, (k) => {
        entrenador.dificultad = k; guardarEntrenador();
        toast(`Dificultad: ${DIFICULTADES[k].nombre}. Se nota desde el próximo combate.`, 2800);
        if (!document.getElementById("vista-aventura").classList.contains("oculta") && subAventura === "principal") renderAventura();
    });
}
document.getElementById("quiz-subtabs").addEventListener("click", (e) => {
    const b = e.target.closest(".sub-tab"); if (!b) return;
    document.querySelectorAll("#quiz-subtabs .sub-tab").forEach((t) => t.classList.remove("activa"));
    b.classList.add("activa");
    quizModo = b.dataset.modo;
    nuevaRondaQuiz();
});
document.getElementById("quiz-generacion").onchange = () => { prepararQuizPool(); nuevaRondaQuiz(); };
document.getElementById("q-siguiente").onclick = nuevaRondaQuiz;
document.getElementById("q-btn-grito").onclick = () => AudioFX.grito(quizResp, { vol: 0.5 });
let tBusqueda = null;
busqueda.addEventListener("input", () => { clearTimeout(tBusqueda); tBusqueda = setTimeout(aplicarFiltrosDex, 250); });
dexGeneracion.onchange = aplicarFiltrosDex;
document.getElementById("modal-cerrar").onclick = cerrarModal;
document.getElementById("modal-prev").onclick = () => navModal(-1);
document.getElementById("modal-next").onclick = () => navModal(1);
modalFondo.addEventListener("click", (e) => { if (e.target === modalFondo) cerrarModal(); });
// ---- Acelerador del juego (×1, ×2, ×3) ----
const VELOCIDADES = [1, 2, 3];
function pintarVelocidad() {
    const v = velJuego();
    document.documentElement.style.setProperty("--vel", v);
    document.querySelectorAll("[data-velocidad]").forEach((b) => {
        b.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M3 5.5v13l8.5-6.5zm9 0v13l8.5-6.5z"/></svg><b>×${v}</b>`;
        b.classList.toggle("rapido", v > 1);
        b.title = `Velocidad ×${v} · pulsa para cambiar (tecla V)`;
    });
}
function cambiarVelocidad() {
    config.velocidad = VELOCIDADES[(VELOCIDADES.indexOf(velJuego()) + 1) % VELOCIDADES.length];
    guardarConfig(); pintarVelocidad(); AudioFX.ui("select");
}
document.addEventListener("keydown", (e) => {
    const escribiendo = e.target.closest && e.target.closest("input, textarea");
    if ((e.key === "v" || e.key === "V") && !e.ctrlKey && !e.metaKey && !escribiendo) { cambiarVelocidad(); return; }
    if ((e.key === "o" || e.key === "O") && !e.ctrlKey && !e.metaKey && !escribiendo && !document.querySelector(".capa-opciones")) { abrirOpciones(); return; }
    if (!modalFondo.classList.contains("oculta")) {
        if (e.key === "Escape") cerrarModal();
        if (e.key === "ArrowRight") navModal(1);
        if (e.key === "ArrowLeft") navModal(-1);
        return;
    }
    if (document.querySelector(".capa-resumen, .capa-evolucion, .capa-nivel")) return;
    if (!document.getElementById("vista-quiz").classList.contains("oculta")) {
        if (/^[1-4]$/.test(e.key) && !quizRespondido) { const b = document.querySelectorAll("#q-opciones .opcion")[Number(e.key) - 1]; if (b) b.click(); }
        if ((e.key === "Enter" || e.key === " ") && quizRespondido) { e.preventDefault(); nuevaRondaQuiz(); }
    }
    const enCombate = !document.getElementById("capa-batalla").classList.contains("oculta");
    if (!enCombate && !document.getElementById("vista-aventura").classList.contains("oculta") && (e.key === "e" || e.key === "E")) {
        const bx = document.getElementById("btn-explorar"); if (bx) { e.preventDefault(); bx.click(); }
    }
});

// ===================== VENTANAS ACCESIBLES =====================
// Cualquier ventana (capa-resumen, capa-opciones): se anuncia como diálogo, el foco va a su botón principal, el Tab no se
// sale de ella y, al cerrarla, el foco vuelve a donde estaba.
(() => {
    const SEL = ".capa-resumen, .capa-opciones";
    const enfocables = (c) => [...c.querySelectorAll("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])")].filter((x) => !x.disabled && x.offsetParent !== null);
    const previos = new WeakMap();
    new MutationObserver((cambios) => {
        for (const m of cambios) {
            m.addedNodes.forEach((n) => {
                if (!(n instanceof HTMLElement) || !n.matches(SEL)) return;
                const caja = n.firstElementChild || n;
                if (!caja.getAttribute("role")) caja.setAttribute("role", "dialog");
                caja.setAttribute("aria-modal", "true");
                const tit = caja.querySelector("h2, h3"); if (tit && !caja.getAttribute("aria-label")) { tit.id = tit.id || "dlg-" + Math.random().toString(36).slice(2); caja.setAttribute("aria-labelledby", tit.id); }
                previos.set(n, document.activeElement);
                if (!document.querySelectorAll(SEL)[1]) pasoVentana(true);
                setTimeout(() => {
                    if (!n.isConnected || n.contains(document.activeElement)) return;
                    const p = n.querySelector("[data-ok], [data-si], .btn-grande, [data-cerrar]") || enfocables(n)[0];
                    if (p) p.focus({ preventScroll: true });
                }, 60);
            });
            m.removedNodes.forEach((n) => {
                if (!(n instanceof HTMLElement) || !n.matches(SEL)) return;
                const p = previos.get(n);
                if (p && p.isConnected && !document.querySelector(SEL)) p.focus({ preventScroll: true });
                if (!document.querySelector(SEL) && modalFondo.classList.contains("oculta")) pasoVentana(false);
            });
        }
    }).observe(document.body, { childList: true });
    document.addEventListener("keydown", (e) => {
        if (e.key !== "Tab") return;
        const capas = [...document.querySelectorAll(SEL)]; const c = capas[capas.length - 1]; if (!c) return;
        const l = enfocables(c); if (!l.length) return;
        const i = l.indexOf(document.activeElement);
        if (e.shiftKey && (i <= 0)) { e.preventDefault(); l[l.length - 1].focus(); }
        else if (!e.shiftKey && (i === l.length - 1 || i < 0)) { e.preventDefault(); l[0].focus(); }
    });
})();

// ===================== BOTÓN «ATRÁS» =====================
// En el móvil, «atrás» cierra la ventana que esté abierta o vuelve a la sección anterior, en vez de salir del juego. En
// pleno combate no hace nada (se sale con el botón del combate).
let ignorarAtras = false;
function pasoVentana(abierta) {
    try {
        if (abierta && !(history.state && history.state.ventana)) history.pushState({ vista: vistaActual, ventana: true }, "");
        else if (!abierta && history.state && history.state.ventana) { ignorarAtras = true; history.back(); }
    } catch (_) {}
}
window.addEventListener("popstate", (e) => {
    if (ignorarAtras) { ignorarAtras = false; return; }
    const ventana = [...document.querySelectorAll(".capa-resumen, .capa-opciones")].pop();
    const ficha = !modalFondo.classList.contains("oculta");
    const combate = !document.getElementById("capa-batalla").classList.contains("oculta");
    if (ventana || ficha || combate) {
        if (combate || !(e.state && e.state.ventana === undefined)) { try { history.pushState({ vista: vistaActual }, ""); } catch (_) {} }   // (se queda en la sección)
        if (ventana) { const b = ventana.querySelector("[data-cerrar], [data-ok], [data-no], [data-cancelar]"); if (b) b.click(); else ventana.remove(); }
        else if (ficha) document.getElementById("modal-cerrar").click();
        return;
    }
    mostrarVista((e.state && e.state.vista) || "inicio", true);
});
try { history.replaceState({ vista: "inicio" }, ""); } catch (_) {}

// ===================== ARRANQUE =====================
async function iniciar() {
    cargarTodo();
    aplicarTema();
    pintarVelocidad();
    construirFiltrosTipo();
    // Los efectos de sonido de siempre (menús, Poké Balls, golpes…), descargados desde el principio.
    setTimeout(() => {
        AudioFX.precargarUrls(["select", "error", "menu_open"].map(urlUI));
        AudioFX.precargar(["pb_move", "pb_rel", "pb_throw", "hit", "hit_strong", "hit_weak", "faint", "restore", "stat_up", "save", "item_fanfare", "buy", "level_up_fanfare", "exp"]);
    }, 800);
    try {
        const datos = await pedir(URL_LISTA);
        TODOS = datos.results.map((p) => { const id = sacarId(p.url); NOMBRE_POR_ID[id] = p.name; return { id, name: p.name }; });
        renderInicio();
        aplicarFiltrosDex();
        const sala = (new URLSearchParams(location.search).get("sala") || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5);
        if (sala.length === 5) {   // (un amigo le ha pasado su enlace de invitación)
            history.replaceState({ vista: "inicio" }, "", location.pathname);
            mostrarVista("multijugador");
            unirseSalaPvP(sala);
        } else novedadesAlEmpezar();
    } catch (_) {
        document.getElementById("vista-inicio").innerHTML = `<div class="dex-vacio"><p>No se pudo cargar. Revisa tu conexión a internet e inténtalo de nuevo.</p>
            <button class="btn-grande" onclick="location.reload()">Reintentar</button></div>`;
    }
}
iniciar();
// publicar.py pone «?v=AAAAMMDDHHMM» en los enlaces de los scripts: si la portada publicada trae otra, hay versión nueva.
// (en local no hay versión y no se mira)
const versionCargada = (() => { const s = document.querySelector('script[src*="script.js"]'); const m = s && /[?&]v=(\d+)/.exec(s.getAttribute("src")); return m ? m[1] : null; })();
let versionMirada = 0, avisoVersionDado = false;
async function mirarVersionNueva() {
    if (!versionCargada || avisoVersionDado || Date.now() - versionMirada < 10 * 60 * 1000) return;
    versionMirada = Date.now();
    try {
        const m = /script\.js\?v=(\d+)/.exec(await (await fetch("./", { cache: "no-store" })).text());
        if (!m || m[1] === versionCargada) return;
        avisoVersionDado = true;
        const a = document.createElement("div");
        a.className = "aviso-error aviso-version";
        a.innerHTML = `<span>Hay una versión nueva del juego.</span><button data-si>Actualizar</button><button data-no aria-label="Cerrar">×</button>`;
        document.body.appendChild(a);
        a.querySelector("[data-si]").onclick = () => { guardarEntrenador(); location.reload(); };
        a.querySelector("[data-no]").onclick = () => a.remove();
    } catch (_) {}
}
document.addEventListener("visibilitychange", () => { if (!document.hidden) mirarVersionNueva(); });
setTimeout(mirarVersionNueva, 60 * 1000);
// Caché de los recursos (sw.js): desde la segunda vez, los datos y gráficos cargan al momento (y algo se puede jugar sin conexión).
// (con ?sinsw en la dirección, sin ella: para comparar)
if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol) && !/[?&]sinsw/.test(location.search)) window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
