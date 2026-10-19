/* =========================================================
   LOGROS · retos de toda la partida con premio
   Cada logro mira algo de la partida (Pokédex, medallas, victorias, Furiosos, Metro Batalla…); además, tres misiones
   diarias, el historial de la partida y el Salón de la Fama (los equipos campeones). Al conseguir un logro
   avisa y el premio se recoge en la pantalla de Logros (objetos, dinero o Puntos de Batalla).
   Iconos: los de los objetos (PokéAPI, pokesprite) y las medallas y cintas de PokéRogue.
   ========================================================= */

const nPokedex = () => Object.keys(entrenador.capturados || {}).length;
const nVariocolor = () => Object.values(entrenador.capturados || {}).filter((c) => c && c.shiny).length;
const nLegendarios = () => Object.keys(entrenador.capturados || {}).map(Number).filter(esLegendario).length;
const nRevanchas = () => Object.keys(entrenador.revanchas || {}).length;
const datoMetro = (k) => ((entrenador.metro && entrenador.metro[k]) || 0);
// icono: clave de objeto (su icono) o URL · valor: progreso actual · premio: [[objeto, n]…], { dinero } o { pb }
const LOGROS = [
    { id: "dex-10", nombre: "Primeros pasos", desc: "Registra 10 Pokémon en la Pokédex.", icono: "poke-ball", meta: 10, valor: nPokedex, premio: [["great-ball", 5]] },
    { id: "dex-50", nombre: "Coleccionista", desc: "Registra 50 Pokémon en la Pokédex.", icono: "great-ball", meta: 50, valor: nPokedex, premio: [["ultra-ball", 5]] },
    { id: "dex-150", nombre: "Investigador", desc: "Registra 150 Pokémon en la Pokédex.", icono: "shiny-charm", meta: 150, valor: nPokedex, premio: [["shiny-charm", 1]] },
    { id: "dex-300", nombre: "Maestro Pokémon", desc: "Registra 300 Pokémon en la Pokédex.", icono: "master-ball", meta: 300, valor: nPokedex, premio: [["master-ball", 1]] },
    { id: "med-4", nombre: "Cuarta medalla", desc: "Consigue 4 medallas de gimnasio.", medalla: 4, meta: 4, valor: () => nMedallas(), premio: [["rare-candy", 3]] },
    { id: "med-8", nombre: "Mitad del camino", desc: "Consigue 8 medallas: se abre el Metro Batalla.", medalla: 8, meta: 8, valor: () => nMedallas(), premio: { pb: 10 } },
    { id: "med-16", nombre: "Dieciséis medallas", desc: "Consigue las 16 medallas de Aurelia.", medalla: 16, meta: 16, valor: () => nMedallas(), premio: [["ability-capsule", 1]] },
    { id: "campeon", nombre: "Campeón de Aurelia", desc: "Vence al Alto Mando y a la Campeona.", icono: () => PR_UI("champion_ribbon.png"), meta: 1, valor: () => (entrenador.campeon ? 1 : 0), premio: [["master-ball", 1]] },
    { id: "victorias-50", nombre: "Luchador", desc: "Gana 50 combates.", icono: "vs-seeker", meta: 50, valor: () => entrenador.batallasGanadas || 0, premio: { dinero: 10000 } },
    { id: "victorias-250", nombre: "Veterano", desc: "Gana 250 combates.", icono: "vs-seeker", meta: 250, valor: () => entrenador.batallasGanadas || 0, premio: [["lucky-egg", 1]] },
    { id: "victorias-1000", nombre: "Leyenda de los combates", desc: "Gana 1000 combates.", icono: "vs-seeker", meta: 1000, valor: () => entrenador.batallasGanadas || 0, premio: [["ability-patch", 1]] },
    { id: "racha-10", nombre: "Imparable", desc: "Gana 10 combates seguidos en la hierba alta.", icono: "max-repel", meta: 10, valor: () => entrenador.mejorRacha || 0, premio: [["amulet-coin", 1]] },
    { id: "furia-1", nombre: "Calma en la tormenta", desc: "Vence o captura a un Pokémon Furioso.", icono: "red-shard", meta: 1, valor: () => entrenador.furiosos || 0, premio: [["max-revive", 1]] },
    { id: "furia-20", nombre: "Domador de furias", desc: "Vence o captura a 20 Pokémon Furiosos.", icono: "red-shard", meta: 20, valor: () => entrenador.furiosos || 0, premio: [["ability-capsule", 1]] },
    { id: "shiny-1", nombre: "Destello", desc: "Consigue un Pokémon variocolor.", icono: "star-piece", meta: 1, valor: nVariocolor, premio: [["rare-candy", 5]] },
    { id: "legendario-1", nombre: "Leyenda viva", desc: "Captura un Pokémon legendario.", icono: "soul-dew", meta: 1, valor: nLegendarios, premio: [["max-revive", 2]] },
    { id: "pesca-15", nombre: "Pescador", desc: "Pesca 15 Pokémon.", icono: "good-rod", meta: 15, valor: () => entrenador.pescados || 0, premio: [["lure-ball", 10]] },
    { id: "misterio-10", nombre: "Curiosidad", desc: "Completa 10 encuentros misteriosos.", icono: "town-map", meta: 10, valor: () => entrenador.misteriosHechos || 0, premio: [["rare-candy", 3]] },
    { id: "safari-5", nombre: "Explorador del Safari", desc: "Atrapa 5 Pokémon en la Zona Safari.", icono: "safari-ball", meta: 5, valor: () => entrenador.safariCapturas || 0, premio: [["ultra-ball", 5]] },
    { id: "evo-10", nombre: "Evolucionista", desc: "Haz evolucionar a 10 Pokémon.", icono: "thunder-stone", meta: 10, valor: () => entrenador.evoluciones || 0, premio: [["rare-candy", 3]] },
    { id: "metro-7", nombre: "Primer trayecto", desc: "Gana 7 combates seguidos en el Metro Batalla.", icono: "pass", meta: 7, valor: () => datoMetro("mejor"), premio: { pb: 10 } },
    { id: "metro-jefe", nombre: "Fin de la línea", desc: "Vence a Ingo, el Jefe de Metro.", icono: "vs-recorder", meta: 1, valor: () => datoMetro("jefes"), premio: [["ability-patch", 1]] },
    { id: "metro-49", nombre: "Leyenda del metro", desc: "Gana 49 combates seguidos en el Metro Batalla.", icono: "vs-recorder", meta: 49, valor: () => datoMetro("mejor"), premio: { pb: 50 } },
    { id: "revancha-1", nombre: "Sin piedad", desc: "Vence a un líder en una revancha.", icono: "pp-max", meta: 1, valor: nRevanchas, premio: [["pp-max", 2]] },
    { id: "revancha-16", nombre: "Rey de los gimnasios", desc: "Vence en revancha a los 16 líderes.", icono: "medal-box", meta: 16, valor: nRevanchas, premio: [["master-ball", 1]] },
    { id: "pvp-1", nombre: "Rival de verdad", desc: "Gana un combate en el multijugador.", icono: "vs-recorder", meta: 1, valor: () => (entrenador.pvp && entrenador.pvp.victorias) || 0, premio: { dinero: 20000 } },
];
const iconoLogro = (l) => (l.medalla ? urlMedalla(GIMNASIOS[l.medalla - 1].medalla) : typeof l.icono === "function" ? l.icono() : /^https?:/.test(l.icono) ? l.icono : urlObj(l.icono));
const estadoLogros = () => (entrenador.logros && typeof entrenador.logros === "object" ? entrenador.logros : (entrenador.logros = {}));
const textoPremioLogro = (p) => (Array.isArray(p) ? textoPremios(p) : p.dinero ? dineroTexto(p.dinero) : `${p.pb} PB`);
function darPremio(p) {
    if (Array.isArray(p)) darObjetos(p);
    else if (p.dinero) entrenador.dinero = (entrenador.dinero || 0) + p.dinero;
    else if (p.pb) metro().pb += p.pb;
}

// ===================== MISIONES DIARIAS =====================
// Tres encargos cada día (los mismos todo el día, distintos en cada partida). Cuentan desde que salen: lo de antes no vale.
// valor: el contador de la partida que miran · si: solo cuando tiene sentido (el Metro, con ocho medallas…).
const MISIONES = [
    { id: "ganar", icono: "vs-seeker", txt: (n) => `Gana ${n} combates`, metas: [5, 8, 10], valor: () => entrenador.batallasGanadas || 0 },
    { id: "capturar", icono: "poke-ball", txt: (n) => `Captura ${n} Pokémon`, metas: [2, 3, 4], valor: () => entrenador.capturasTotales || 0 },
    { id: "entrenadores", icono: "vs-recorder", txt: (n) => `Vence a ${n} entrenadores`, metas: [3, 4, 5], valor: () => entrenador.entrenadoresVencidos || 0 },
    { id: "furioso", icono: "red-shard", txt: () => "Calma a un Pokémon Furioso", metas: [1], valor: () => entrenador.furiosos || 0, si: () => nMedallas() >= 1 },
    { id: "metro", icono: "pass", txt: (n) => `Gana ${n} combates en el Metro Batalla`, metas: [3, 5], valor: () => datoMetro("victorias"), si: () => metroAbierto() },
    { id: "pescar", icono: "old-rod", txt: (n) => `Pesca ${n} Pokémon`, metas: [2, 3], valor: () => entrenador.pescados || 0, si: () => !!mejorCana() },
    { id: "evolucion", icono: "thunder-stone", txt: () => "Haz evolucionar a un Pokémon", metas: [1], valor: () => entrenador.evoluciones || 0, si: () => nMedallas() < 16 },
];
const valorMision = (m) => { try { return m.valor(); } catch (_) { return 0; } };
// Las de hoy (las crea al empezar el día). Guardadas: { id, meta, base, premio, estado (0 en curso, 1 cumplida, 2 cobrada) };
// devuelve además su definición, el progreso y el texto.
function misionesHoy() {
    const dia = new Date().toISOString().slice(0, 10);
    let d = entrenador.diarias;
    if (!d || d.dia !== dia || !Array.isArray(d.lista)) {
        const rnd = semilla(`misiones:${dia}:${entrenador.creada || 0}`);
        const pool = MISIONES.filter((m) => !m.si || m.si()), lista = [];
        const objetos = nMedallas() >= 8 ? [["ultra-ball", 3], ["rare-candy", 1], ["pp-up", 1], ["max-revive", 1]] : [["great-ball", 3], ["super-potion", 3], ["revive", 1], ["rare-candy", 1]];
        while (lista.length < 3 && pool.length) {
            const m = pool.splice(Math.floor(rnd() * pool.length), 1)[0];
            const premio = lista.length === 0 ? { dinero: 1000 + 500 * nMedallas() } : lista.length === 1 || !metroAbierto() ? [objetos[Math.floor(rnd() * objetos.length)]] : { pb: 5 };
            lista.push({ id: m.id, meta: m.metas[Math.floor(rnd() * m.metas.length)], base: valorMision(m), premio, estado: 0 });
        }
        d = entrenador.diarias = { dia, lista };
    }
    return d.lista.map((x) => {
        const m = MISIONES.find((y) => y.id === x.id) || MISIONES[0];
        return { ...x, def: m, progreso: Math.max(0, valorMision(m) - x.base), texto: m.txt(x.meta) };
    });
}
const misionesPorCobrar = () => (entrenador.diarias && Array.isArray(entrenador.diarias.lista) ? entrenador.diarias.lista.filter((x) => x.estado === 1).length : 0);
const logrosPorCobrar = () => Object.values(estadoLogros()).filter((v) => v === 1).length + misionesPorCobrar();

// Marca los logros y misiones que se acaban de cumplir (1 = cumplido, 2 = premio recogido) y avisa. Lo llama guardarEntrenador.
function revisarLogros() {
    if (!entrenador.starter) return;
    const est = estadoLogros(), nuevos = [];
    for (const l of LOGROS) {
        if (est[l.id]) continue;
        let v = 0; try { v = l.valor(); } catch (_) {}
        if (v >= l.meta) { est[l.id] = 1; nuevos.push(l.nombre); }
    }
    misionesHoy().forEach((x, i) => { if (x.estado === 0 && x.progreso >= x.meta) { entrenador.diarias.lista[i].estado = 1; nuevos.push("Misión: " + x.texto); } });
    if (!nuevos.length) return;
    AudioFX.efecto("item_fanfare");
    toast(nuevos.length === 1 ? `¡Conseguido: ${nuevos[0]}! Recoge el premio en Logros.` : `¡${nuevos.length} logros y misiones cumplidos! Recoge sus premios en Logros.`, 4200);
}
function cobrarLogro(l) {
    const est = estadoLogros(); if (!l || est[l.id] !== 1) return;
    darPremio(l.premio);
    est[l.id] = 2;
    guardarEntrenador(); AudioFX.efecto("buy");
    toast(`Recibes: ${textoPremioLogro(l.premio)}.`, 3000);
}
function cobrarMision(i) {
    const x = entrenador.diarias && entrenador.diarias.lista[i]; if (!x || x.estado !== 1) return;
    darPremio(x.premio);
    x.estado = 2;
    guardarEntrenador(); AudioFX.efecto("buy");
    toast(`Recibes: ${textoPremioLogro(x.premio)}.`, 3000);
}

// ===================== PANTALLA: misiones, logros e historial =====================
let pestanaLogros = "misiones";
function renderLogros(cont) {
    const est = estadoLogros(), hechos = LOGROS.filter((l) => est[l.id]).length, hoy = misionesHoy();
    const tarjeta = ({ clase, icono, titulo, desc, v, meta, premio, boton }) => `<article class="logro ${clase}">
            <span class="lo-icono"><img src="${icono}" alt=""></span>
            <div class="lo-info">
                <b>${titulo}</b>${desc ? `<span>${desc}</span>` : ""}
                <div class="lo-barra"><span style="width:${Math.min(100, (v / meta) * 100)}%"></span></div>
                <div class="lo-pie"><small class="lo-premio">Premio: ${textoPremioLogro(premio)} · <span class="num-pk">${Math.min(v, meta)}/${meta}</span></small>${boton}</div>
            </div>
        </article>`;
    const boton = (e, attr) => (e === 1 ? `<button class="btn-mini" ${attr}>Recoger</button>` : e === 2 ? `<span class="lo-hecho">Hecho</span>` : "");
    const clase = (e) => (e === 2 ? "cobrado" : e === 1 ? "listo" : "");
    let cuerpo = "";
    if (pestanaLogros === "misiones") {
        cuerpo = `<p class="nota">Tres encargos nuevos cada día. Solo cuenta lo que hagas desde que salen.</p>
            <div class="logros">${hoy.map((x, i) => tarjeta({ clase: clase(x.estado), icono: urlObj(x.def.icono), titulo: x.texto, desc: "",
                v: x.progreso, meta: x.meta, premio: x.premio, boton: boton(x.estado, `data-mision="${i}"`) })).join("")}</div>`;
    } else if (pestanaLogros === "logros") {
        // Primero los que tienen el premio esperando, luego los pendientes y al final los ya recogidos.
        const rango = (l) => (est[l.id] === 1 ? 0 : !est[l.id] ? 1 : 2);
        cuerpo = `<div class="logros">${[...LOGROS].sort((a, b) => rango(a) - rango(b)).map((l) => {
            let v = 0; try { v = l.valor(); } catch (_) {}
            const e = est[l.id] || 0;
            return tarjeta({ clase: clase(e), icono: iconoLogro(l), titulo: l.nombre, desc: l.desc, v, meta: l.meta, premio: l.premio, boton: boton(e, `data-cobrar="${l.id}"`) });
        }).join("")}</div>`;
    } else {
        const pvp = entrenador.pvp || {}, m = entrenador.metro || {};
        const datos = [
            ["Tiempo de juego", tiempoTexto(entrenador.tiempo)], ["Combates ganados", entrenador.batallasGanadas || 0],
            ["Entrenadores vencidos", entrenador.entrenadoresVencidos || 0], ["Pokémon registrados", nPokedex()],
            ["Capturas", entrenador.capturasTotales || 0], ["Variocolor", nVariocolor()], ["Legendarios", nLegendarios()],
            ["Pokémon Furiosos calmados", entrenador.furiosos || 0], ["Pokémon pescados", entrenador.pescados || 0], ["Encuentros misteriosos", entrenador.misteriosHechos || 0], ["Capturas en la Zona Safari", entrenador.safariCapturas || 0], ["Evoluciones", entrenador.evoluciones || 0],
            ["Mejor racha en la hierba", entrenador.mejorRacha || 0], ["Metro Batalla: mejor racha", m.mejor || 0], ["Metro Batalla: Jefes vencidos", m.jefes || 0],
            ["Revanchas ganadas", Object.values(entrenador.revanchas || {}).reduce((s, r) => s + (r.veces || 0), 0)],
            ["Multijugador", `${pvp.victorias || 0} victorias · ${pvp.derrotas || 0} derrotas`],
        ];
        const fama = entrenador.salonFama || [];
        cuerpo = `<div class="historial">${datos.map(([k, v]) => `<div class="hi-fila"><span>${k}</span><b class="num-pk">${v}</b></div>`).join("")}</div>
            <h3 class="titulo-seccion">Salón de la Fama</h3>
            ${fama.length ? `<div class="salon-fama">${fama.map((f) => `<div class="sf-entrada">
                <span class="sf-fecha">${new Date(f.fecha).toLocaleDateString("es-ES", { dateStyle: "long" })}</span>
                <div class="sf-equipo">${f.equipo.map((p) => `<span class="sf-poke" title="${p.mote || nombrePk(p.id)}">${htmlIcono(p.id, "sf-icono", p.shiny)}<small>Nv. ${p.nivel}</small></span>`).join("")}</div>
            </div>`).join("")}</div>` : `<p class="nota">Cuando ganes la Liga Pokémon, tu equipo quedará aquí para siempre.</p>`}`;
    }
    const nm = misionesPorCobrar(), nl = Object.values(est).filter((v) => v === 1).length;
    cont.innerHTML = `
        <div class="cabecera-modo con-volver">
            <button class="btn-volver" data-volver>Atrás</button>
            <h2>Logros <span class="num-pk">${hechos}/${LOGROS.length}</span></h2>
        </div>
        <div class="sub-tabs logros-tabs">
            <button class="sub-tab ${pestanaLogros === "misiones" ? "activa" : ""}" data-pestana="misiones">Misiones de hoy${nm ? ` (${nm})` : ""}</button>
            <button class="sub-tab ${pestanaLogros === "logros" ? "activa" : ""}" data-pestana="logros">Logros${nl ? ` (${nl})` : ""}</button>
            <button class="sub-tab ${pestanaLogros === "historial" ? "activa" : ""}" data-pestana="historial">Historial</button>
        </div>
        ${cuerpo}`;
    pintarIconos(cont);
    cont.querySelector("[data-volver]").onclick = () => { subAventura = "principal"; renderAventura(); };
    cont.querySelectorAll("[data-pestana]").forEach((b) => b.onclick = () => { pestanaLogros = b.dataset.pestana; AudioFX.ui("select"); renderLogros(cont); });
    cont.querySelectorAll("[data-cobrar]").forEach((b) => b.onclick = () => { cobrarLogro(LOGROS.find((l) => l.id === b.dataset.cobrar)); renderLogros(cont); });
    cont.querySelectorAll("[data-mision]").forEach((b) => b.onclick = () => { cobrarMision(Number(b.dataset.mision)); renderLogros(cont); });
}
