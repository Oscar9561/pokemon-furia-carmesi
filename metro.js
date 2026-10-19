/* =========================================================
   METRO BATALLA · Ciudad Voltia (como el de Blanco y Negro)
   Combates seguidos con tres de tus Pokémon a nivel 50 contra entrenadores cada vez más duros, en trayectos de
   siete. En el combate 21 y en cada 49 espera Ingo, el Jefe de Metro. Cada victoria da Puntos de Batalla (PB) que
   se canjean por objetos que no vende ninguna tienda (mentas, cápsulas de habilidad…). Perder, rendirse o dejar un
   combate a medias termina el viaje (la mejor racha se guarda).
   Sin mochila ni experiencia; los objetos equipados que se gastan vuelven tras cada combate, y el equipo se cura.
   Sprites: PokéRogue (Ingo, el agente de estación y los entrenadores) · Música: Pokémon Showdown (Blanco/Negro).
   ========================================================= */

const METRO_NIVEL = 50, METRO_TRAYECTO = 7, METRO_MEDALLAS = 8, METRO_CIUDAD = 4;   // (Ciudad Voltia, la del gimnasio 4)
const metroAbierto = () => nMedallas() >= METRO_MEDALLAS;
const esJefeMetro = (n) => n === 21 || n % 49 === 0;   // n: número del combate en el viaje (1, 2, 3…)
// Estado guardado en la partida: racha del viaje actual, mejor racha, PB, el equipo elegido y si hay un viaje en curso.
function metro() {
    if (!entrenador.metro || typeof entrenador.metro !== "object") entrenador.metro = {};
    const m = entrenador.metro;
    ["racha", "mejor", "pb", "total", "jefes", "victorias"].forEach((k) => { m[k] = Math.max(0, Number(m[k]) || 0); });
    if (!Array.isArray(m.equipo)) m.equipo = [];
    m.equipo = m.equipo.filter((id) => entrenador.capturados[id]);
    if (m.activo && m.equipo.length < 3) { m.activo = false; m.racha = 0; }   // (alguno ya no está: el viaje no puede seguir)
    return m;
}
// PB de una victoria: 1, más el premio del trayecto al completar 7 (3, 4, 5… hasta 10) y el de Ingo.
function pbVictoria(n, jefe) {
    let pb = 1;
    if (n % METRO_TRAYECTO === 0) pb += Math.min(10, 2 + n / METRO_TRAYECTO);
    if (jefe) pb += n === 21 ? 10 : 20;
    return pb;
}

// ===================== RIVALES =====================
const OBJETOS_METRO = ["life-orb", "choice-scarf", "choice-band", "choice-specs", "focus-sash", "leftovers", "assault-vest", "rocky-helmet",
    "weakness-policy", "expert-belt", "sitrus-berry", "lum-berry", "white-herb", "air-balloon", "heavy-duty-boots", "shell-bell"];
const FRASES_METRO = ["¡Este tren no para hasta la última estación!", "¡Llevo todo el viaje esperando un rival como tú!", "¡En el Metro Batalla no hay segundas oportunidades!",
    "¿Ya vas por aquí? Entonces no eres cualquiera.", "¡Siguiente parada: tu derrota!", "Mis Pokémon y yo conocemos cada curva de esta línea."];
// Especie de nivel 50 ya evolucionada; en los trayectos altos, de las fuertes (suma de características base mínima).
async function especieMetro(excl, pool, minimo) {
    let id = null;
    for (let i = 0; i < 6; i++) {
        id = await especieCoherente(METRO_NIVEL, excl, pool, 6);
        if (!minimo) return id;
        try { const d = await cargarPokemon(id); if (d.stats.reduce((s, x) => s + x.base_stat, 0) >= minimo) return id; } catch (_) { return id; }
    }
    return id;
}
// Entrenador del combate n (trayecto t = 0, 1, 2…): tres Pokémon de los tipos de su clase, cada vez más fuertes y entrenados.
async function rivalMetro(n) {
    const t = Math.floor((n - 1) / METRO_TRAYECTO), D = dificultad();
    const clase = alAzar(CLASES_ENTRENADOR);
    let pool = null;
    try { const sets = await Promise.all(tiposDeClase(clase).map((x) => idsPorTipo(x))); pool = poolBatalla().filter((p) => sets.some((st) => st.has(p.id))); } catch (_) {}
    if (pool && pool.length < 12) pool = null;   // (pocos de sus tipos: de cualquiera)
    const excl = new Set(), objetos = [...OBJETOS_METRO], specs = [];
    const minimo = t >= 4 ? 520 : t >= 2 ? 480 : t >= 1 ? 440 : 0;
    for (let i = 0; i < 3; i++) {
        const s = { id: await especieMetro(excl, pool, minimo), nivel: METRO_NIVEL, probOculta: 0.3 };
        s.objeto = objetos.splice(Math.floor(Math.random() * objetos.length), 1)[0];   // (sin repetir objeto, como en los juegos)
        try { const b = {}; (await cargarPokemon(s.id)).stats.forEach((x) => { b[x.stat.name] = x.base_stat; }); entrenarRival(s, t >= 1 ? 2 : 1, b); } catch (_) {}
        specs.push(s);
    }
    specs.forEach((s) => marcarVisto(s.id));
    return {
        specs, titulo: nombreNPC(clase), sprite: clase.sprite, dialogo: alAzar(FRASES_METRO), derrota: "¡Increíble! Sigue así hasta el final de la línea.",
        ia: Math.min(1, Math.max(D.ia, 0.75 + 0.1 * t)), cambios: Math.max(D.cambios, t >= 2 ? 0.5 : 0.2),
        poder: t >= 3 && Math.random() < 0.35 ? alAzar(["tera", "dinamax"]) : null, musicaEncuentro: musicaEncuentro(clase.enc),
    };
}
// Ingo, Jefe de Metro: Excadrill, Chandelure y Archeops (su equipo de Blanco y Negro), entrenados al máximo; desde el 49, con Teracristal.
function rivalIngo(n) {
    const specs = [
        { id: 567, nivel: METRO_NIVEL, objeto: "focus-sash", naturaleza: "jolly", ev: { attack: 252, speed: 252, hp: 6 } },
        { id: 609, nivel: METRO_NIVEL, objeto: "choice-specs", naturaleza: "timid", ev: { "special-attack": 252, speed: 252, hp: 6 }, habSlot: 1 },
        { id: 530, nivel: METRO_NIVEL, objeto: n >= 49 ? "life-orb" : "sitrus-berry", naturaleza: "adamant", ev: { attack: 252, speed: 252, hp: 6 }, habSlot: 3 },
    ];
    return {
        specs, titulo: "Jefe de Metro Ingo", sprite: "ingo", jefe: true,
        dialogo: n >= 49 ? "¡Has vuelto a llegar hasta mí! Esta vez el tren va a toda máquina: ¡no pienso frenar!"
            : "Soy Ingo, Jefe de Metro. ¡Has llegado lejos, pero aquí se acaba la línea! ¡Todos a bordo!",
        derrota: "¡Bravo! ¡Un viaje digno de los mejores! Mis respetos, de verdad.",
        ia: 1, cambios: 0.6, poder: n >= 49 ? "tera" : null,
    };
}

// ===================== COMBATE =====================
// Tus tres Pokémon a nivel 50, sanos y con sus objetos.
async function specsMetro(ids) {
    return Promise.all(ids.map(async (id) => {
        const e = entrenador.capturados[id];
        return { id, nivel: METRO_NIVEL, objeto: e.objeto || null, bola: e.bola || "poke-ball", movimientos: await asegurarMovimientos(id),
            genero: e.genero, mote: e.mote, shiny: !!e.shiny, ev: e.ev, naturaleza: e.naturaleza, habSlot: e.habSlot, teraTipo: e.teraTipo };
    }));
}
async function combateMetro() {
    const m = metro(), n = m.racha + 1, jefe = esJefeMetro(n);
    if (!m.activo || m.equipo.length < 3) return renderAventura();
    try {
        mostrarCargaBatalla(jefe ? { vs: true, sprite: "ingo", titulo: "Jefe de Metro Ingo" } : {});
        const musica = jefe ? mus("battle_unova_elite") : musSD("bw-subway-trainer");
        AudioFX.musicaSonar(musica);
        const rival = jefe ? rivalIngo(n) : await rivalMetro(n);
        const [aliados, enemigos] = await Promise.all([prepararEquipo(await specsMetro(m.equipo)), prepararEquipo(rival.specs)]);
        m.enCombate = n; guardarEntrenador();   // (si se deja a medias, el viaje se pierde)
        Combate.iniciar({
            aliados, enemigos, salvaje: false, permitirCaptura: false, premio: 0, sinMochila: true, darXP: false,
            poderRival: rival.poder, ia: rival.ia, cambiosRival: rival.cambios, curasRival: null,
            titulo: rival.titulo, entrenadorSprite: rival.sprite, dialogo: rival.dialogo, dialogoDerrota: rival.derrota,
            musica, musicaEncuentro: rival.musicaEncuentro, victoria: jefe ? MUSICA.victoriaGimnasio : MUSICA.victoriaEntrenador,
            fondo: jefe ? "g6-darkcity" : "city", generoJugador: entrenador.genero,
            alTerminar: (r) => finCombateMetro(r, n, jefe),
        });
    } catch (_) { errorCombate(); }
}
function finCombateMetro(r, n, jefe) {
    const m = metro();
    m.enCombate = 0;
    if (r && r.gano) {
        const pb = pbVictoria(n, jefe);
        m.racha = n; m.mejor = Math.max(m.mejor, n); m.pb += pb; m.total += pb; m.victorias++;
        if (jefe) m.jefes++;
        entrenador.batallasGanadas++;
        guardarEntrenador();
        if (jefe) lanzarConfeti();
        toast(`¡Victoria ${n}! +${pb} PB.${n % METRO_TRAYECTO === 0 ? " ¡Trayecto completado!" : ""}${jefe ? " ¡Has vencido al Jefe de Metro!" : ""}`, 3600);
    } else {
        m.activo = false; m.racha = 0;
        guardarEntrenador();
        toast(`El viaje termina en el combate ${n}. Tu mejor racha: ${m.mejor}.`, 4200);
    }
    subAventura = "metro"; renderAventura();
}

// ===================== PANTALLA =====================
let metroSel = [];
function renderMetro(cont) {
    const m = metro();
    if (!metroAbierto()) { subAventura = "principal"; return renderAventura(); }
    let aviso = "";
    if (m.enCombate) {   // se dejó un combate a medias (se cerró el juego): el viaje se pierde
        aviso = `Dejaste el combate ${m.enCombate} a medias: el viaje ha terminado.`;
        m.enCombate = 0; m.activo = false; m.racha = 0; guardarEntrenador();
    }
    AudioFX.musicaSonar(mus("metropolis"));
    const n = m.racha + 1, enTrayecto = (n - 1) % METRO_TRAYECTO, trayecto = Math.floor((n - 1) / METRO_TRAYECTO) + 1;
    metroSel = metroSel.filter((id) => entrenador.equipo.includes(id)).slice(0, 3);
    const paradas = Array.from({ length: METRO_TRAYECTO }, (_, i) => {
        const num = (trayecto - 1) * METRO_TRAYECTO + i + 1;
        return `<span class="mt-parada ${i < enTrayecto ? "hecha" : i === enTrayecto && m.activo ? "actual" : ""} ${esJefeMetro(num) ? "jefe" : ""}" title="Combate ${num}${esJefeMetro(num) ? " · Jefe de Metro" : ""}"><b class="num-pk">${num}</b></span>`;
    }).join("");
    const pokeBtn = (id, sel) => `<button class="mt-poke ${sel ? "sel" : ""}" data-poke="${id}">
        ${htmlIcono(id, "mt-icono", !!entrenador.capturados[id].shiny)}<span class="mt-nom">${nombreDe(id)}</span>
        <span class="mt-nv">Nv. ${entrenador.capturados[id].nivel} → ${METRO_NIVEL}</span></button>`;
    cont.innerHTML = `
        <div class="cabecera-modo con-volver">
            <button class="btn-volver" data-volver>Salir</button>
            <h2>Metro Batalla</h2>
        </div>
        <section class="lugar-cabecera metro-cabecera">
            <img class="lc-fondo" src="${urlFondo("g6-darkcity")}" alt="">
            <div class="lc-escena"><canvas class="metro-agente" id="metro-agente"></canvas></div>
            <div class="lc-info">
                <span class="hub-etq">Línea Individual · Nivel ${METRO_NIVEL}</span>
                <h2>Metro Batalla</h2>
                <p>Elige tres Pokémon y aguanta todos los combates que puedas. En el combate 21 te espera el Jefe de Metro.</p>
            </div>
        </section>
        ${aviso ? `<p class="nota aviso">${aviso}</p>` : ""}
        <div class="metro-datos">
            <div class="ventana-pk"><small>Racha</small><b class="num-pk">${m.racha}</b></div>
            <div class="ventana-pk"><small>Mejor racha</small><b class="num-pk">${m.mejor}</b></div>
            <div class="ventana-pk"><small>Puntos de Batalla</small><b class="num-pk">${m.pb} PB</b></div>
        </div>
        ${m.activo ? `
        <section class="metro-viaje">
            <span class="hub-etq">Trayecto ${trayecto} · siguiente: combate ${n}${esJefeMetro(n) ? " · ¡Jefe de Metro!" : ""}</span>
            <div class="mt-paradas">${paradas}</div>
            <div class="mt-equipo">${m.equipo.map((id) => pokeBtn(id, true)).join("")}</div>
            <div class="metro-acciones">
                <button class="btn-grande" data-seguir>${esJefeMetro(n) ? "¡Retar al Jefe de Metro!" : "Siguiente combate"}</button>
                <button class="btn-sec" data-bajar>Bajar del tren</button>
            </div>
        </section>` : `
        <section class="metro-viaje">
            <span class="hub-etq">Elige a tus tres Pokémon (${metroSel.length}/3)</span>
            <div class="mt-equipo elegir">${entrenador.equipo.map((id) => pokeBtn(id, metroSel.includes(id))).join("")}</div>
            <div class="metro-acciones">
                <button class="btn-grande" data-subir ${metroSel.length === 3 ? "" : "disabled"}>Subir al tren</button>
            </div>
        </section>`}
        <section class="metro-canje">
            <div><span class="hub-etq">Canje de PB</span><p>Mentas, cápsulas de habilidad y objetos de combate que no se venden en las tiendas.</p></div>
            <button class="btn-sec" data-canje>Ir al canje</button>
        </section>
        <p class="nota">Reglas: todos a nivel ${METRO_NIVEL}, sin mochila y sin experiencia. Tu equipo se cura tras cada combate y los objetos que se gastan vuelven.
            Perder, rendirte o dejar un combate a medias termina el viaje.</p>`;
    pintarIconos(cont);
    montarEntrenador(document.getElementById("metro-agente"), "depot_agent", { bucle: true, fps: 12 }).then((el) => el && tamanoNativo(el, 2, 130));
    cont.querySelector("[data-volver]").onclick = () => { subAventura = "principal"; renderAventura(); };
    cont.querySelector("[data-canje]").onclick = () => { AudioFX.ui("select"); subAventura = "canje"; renderAventura(); };
    cont.querySelectorAll(".mt-equipo.elegir [data-poke]").forEach((b) => b.onclick = () => {
        const id = Number(b.dataset.poke);
        metroSel = metroSel.includes(id) ? metroSel.filter((x) => x !== id) : metroSel.length < 3 ? [...metroSel, id] : metroSel;
        AudioFX.ui("select"); renderMetro(cont);
    });
    const bs = cont.querySelector("[data-subir]");
    if (bs) bs.onclick = () => {
        if (metroSel.length !== 3) return;
        Object.assign(m, { activo: true, racha: 0, equipo: [...metroSel], enCombate: 0 });
        guardarEntrenador(); AudioFX.ui("select");
        combateMetro();
    };
    const bg = cont.querySelector("[data-seguir]"); if (bg) bg.onclick = () => combateMetro();
    const bb = cont.querySelector("[data-bajar]");
    if (bb) bb.onclick = () => {
        if (bb.dataset.seguro !== "1") { bb.dataset.seguro = "1"; bb.textContent = "¿Seguro? Se acaba el viaje"; return; }
        m.activo = false; m.racha = 0; guardarEntrenador();
        toast(`Te bajas del tren. Tu mejor racha: ${m.mejor}.`); renderMetro(cont);
    };
}

// ===================== CANJE DE PB (la tienda del Metro) =====================
const PRECIO_PB = {
    "life-orb": 32, "choice-band": 32, "choice-specs": 32, "choice-scarf": 32, "assault-vest": 32, "leftovers": 32, "booster-energy": 32,
    "focus-sash": 24, "rocky-helmet": 24, "weakness-policy": 24, "expert-belt": 24, "heavy-duty-boots": 24, "loaded-dice": 24,
    "ability-capsule": 24, "ability-patch": 64, "pp-max": 16, "rare-candy": 6, "master-ball": 150,
    "hp-up": 4, "protein": 4, "iron": 4, "calcium": 4, "zinc": 4, "carbos": 4,
    ...Object.fromEntries(Object.keys(MENTAS).map((k) => [k, 16])),
};
const CATEGORIAS_PB = [
    { id: "pb-combate", nombre: "Objetos de combate", icono: "life-orb", filtro: (k) => OBJ_LLEVABLES.has(k) },
    { id: "pb-mentas", nombre: "Mentas", icono: "adamant-mint", filtro: (k) => !!MENTAS[k] },
    { id: "pb-entreno", nombre: "Entrenamiento", icono: "ability-capsule", filtro: (k) => !OBJ_LLEVABLES.has(k) && !MENTAS[k] },
];
TIENDAS.pb = {
    P: () => ({ cargo: "Agente de Estación", nombre: "Remigio", atlas: "images/trainer/depot_agent", fps: 12, voz: 0.95, color: "#2e8b57" }),
    titulo: "Canje de PB", cartel: "CANJE DE PB", lugar: "al Canje de Puntos de Batalla",
    escaparate: () => ["adamant-mint", "modest-mint", "jolly-mint", "timid-mint", "ability-capsule", "ability-patch", "life-orb", "choice-scarf", "focus-sash", "master-ball"],
    musica: () => mus("mystery_encounter_gen_6_gts"), categorias: CATEGORIAS_PB,
    stock: (c) => Object.keys(PRECIO_PB).filter((k) => OBJETOS[k] && c.filtro(k)).sort((a, b) => PRECIO_PB[a] - PRECIO_PB[b] || obj(a).nombre.localeCompare(obj(b).nombre, "es")),
    precio: (k) => PRECIO_PB[k], saldo: () => metro().pb, cobrar: (n) => { metro().pb -= n; }, fmt: (n) => `${n} PB`, etqSaldo: "Puntos de Batalla",
    vende: false, volver: "metro", pide: "¿Qué quieres canjear por tus Puntos de Batalla?", sinSaldo: "Lo siento, no tienes Puntos de Batalla suficientes.",
};
