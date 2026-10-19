/* =========================================================
   TORNEO CORONA · Estadio Corona (tras ser Campeón)
   Como el Pokémon World Tournament de Blanco 2 y Negro 2: tres rondas seguidas contra Campeones de todas las regiones,
   cada uno con su equipo de los juegos, su poder (Megaevolución, Dinamax, movimiento Z o Teracristal) y su tema de
   combate. Tu equipo se cura antes de cada ronda; perder o dejar un combate a medias termina el torneo.
   Ganarlo da dinero, una megapiedra de Luminalia (o un objeto raro) y una copa más en tu vitrina.
   Sprites: PokéRogue · Música: PokéRogue (temas de los Campeones).
   ========================================================= */

// equipo: [especie, objeto] (el último es su as) · poder: el que usa (las megas, con su megapiedra)
const CAMPEONES = {
    red:     { nombre: "Rojo", region: "Kanto", musica: "battle_kanto_champion", poder: null, intro: "......", derrota: "......!",
        equipo: [[25, "light-ball"], [3], [9], [143, "leftovers"], [131], [6, "charizardite-x"]] },
    blue:    { nombre: "Azul", region: "Kanto", musica: "battle_kanto_champion", poder: null,
        intro: "¡Eh! ¿Así que tú eres el nuevo Campeón? Yo fui el Campeón más rápido de la historia, ¿sabes?", derrota: "¿Qué? ¡No puede ser! Vale, vale... eres muy bueno.",
        equipo: [[65], [464], [103], [130], [59], [18, "pidgeotite"]] },
    lance:   { nombre: "Lance", region: "Johto", musica: "battle_johto_champion", poder: null,
        intro: "Los dragones son criaturas legendarias. ¡Siente su verdadero poder!", derrota: "Increíble... Tu vínculo con tus Pokémon supera al de los dragones.",
        equipo: [[130], [142], [6], [230], [373], [149, "dragoninite"]] },
    steven:  { nombre: "Máximo", region: "Hoenn", musica: "battle_hoenn_champion_g6", poder: null,
        intro: "Me encantan las piedras raras... y los entrenadores raros como tú. ¡Veamos de qué estás hecho!", derrota: "Brillas más que cualquier piedra que haya encontrado.",
        equipo: [[227], [344], [306], [346], [348], [376, "metagrossite"]] },
    wallace: { nombre: "Plubio", region: "Hoenn", musica: "battle_hoenn_champion_g5", poder: "tera",
        intro: "¡Que comience el espectáculo! Mis Pokémon de agua bailarán para ti.", derrota: "Qué combate tan bello... Has danzado mejor que nadie.",
        equipo: [[321], [340], [272], [73], [130], [350, "leftovers"]] },
    cynthia: { nombre: "Cintia", f: true, region: "Sinnoh", musica: "battle_sinnoh_champion", poder: null,
        intro: "Hay algo en ti que me recuerda a mí cuando empecé. No pienso contenerme.", derrota: "Un combate maravilloso. Tienes un futuro brillante.",
        equipo: [[442], [407], [468], [448], [350], [445, "garchompite-z"]] },
    alder:   { nombre: "Mirto", region: "Teselia", musica: "battle_champion_alder", poder: "tera",
        intro: "¡Ja, ja! ¡Disfrutemos de este combate como si fuera el último!", derrota: "¡Qué bien lo hemos pasado! Así es como se debe combatir.",
        equipo: [[626], [617], [589], [584], [553], [637]] },
    diantha: { nombre: "Dianta", f: true, region: "Kalos", musica: "battle_kalos_champion", poder: null,
        intro: "En Kalos me conocen por mis películas, pero mi papel favorito es el de entrenadora.", derrota: "¡Qué actuación! Me has robado el protagonismo.",
        equipo: [[701], [697], [699], [711], [706], [282, "gardevoirite"]] },
    kukui:   { nombre: "Kukui", region: "Alola", musica: "battle_champion_kukui", poder: "z",
        intro: "¡Alola! ¡Mi movimiento Z va a dejarte sin aliento, primo!", derrota: "¡Increíble, primo! ¡Así se combate en Alola!",
        equipo: [[745], [663], [628], [462], [143], [727, "firium-z--held"]] },
    leon:    { nombre: "Lionel", region: "Galar", musica: "battle_galar_champion", poder: "dinamax",
        intro: "¡Que empiece el combate de campeones! ¡Mi récord sigue invicto!", derrota: "¡Ha sido un combate de campeonato! Te has ganado mi respeto.",
        equipo: [[681], [887], [612], [537], [866], [6]] },
    geeta:   { nombre: "Ságita", f: true, region: "Paldea", musica: "battle_champion_geeta", poder: "tera",
        intro: "Como presidenta de la Liga, es mi deber comprobar tu nivel. Adelante.", derrota: "Un resultado excelente. Aurelia tiene un gran Campeón.",
        equipo: [[956], [673], [976], [713], [983], [970]] },
    nemona:  { nombre: "Nemona", f: true, region: "Paldea", musica: "battle_champion_nemona", poder: "tera",
        intro: "¡Por fin un rival a mi altura! ¡Vamos a darlo todo!", derrota: "¡Ha sido INCREÍBLE! ¡Tenemos que repetirlo!",
        equipo: [[745], [706], [982], [968], [923], [914]] },
    kieran:  { nombre: "Cass", region: "Arándano", musica: "battle_champion_kieran", poder: "tera",
        intro: "Esta vez no pienso perder. He entrenado sin descanso para este momento.", derrota: "...Otra vez. Pero algún día te ganaré.",
        equipo: [[983], [1013], [149], [727], [1019], [1018]] },
};
const RONDAS_TORNEO = ["Cuartos de final", "Semifinal", "Final"];
// Estado en la partida: si hay un torneo en curso, la ronda, los tres rivales, el combate a medias y las copas ganadas.
function torneo() {
    if (!entrenador.torneo || typeof entrenador.torneo !== "object") entrenador.torneo = {};
    const t = entrenador.torneo;
    ["ronda", "copas", "jugados", "victorias"].forEach((k) => { t[k] = Math.max(0, Number(t[k]) || 0); });
    if (!Array.isArray(t.rivales) || t.rivales.some((k) => !CAMPEONES[k])) { t.rivales = []; t.activo = false; }
    return t;
}
const nivelTorneo = (ronda) => limitar(Math.max(70, ...entrenador.equipo.map((id) => entrenador.capturados[id].nivel || 5)) + ronda * 2 + Math.round(dificultad().lider / 3), 1, 100);
async function specsCampeon(k, ronda) {
    const C = CAMPEONES[k], nivel = nivelTorneo(ronda), D = dificultad();
    const specs = C.equipo.map(([id, objeto], i) => ({ id, nivel: limitar(nivel - (i === C.equipo.length - 1 ? 0 : 2), 1, 100), objeto: objeto || null, probOculta: 0.5 }));
    specs.forEach((s) => marcarVisto(s.id));
    return reforzarEquipo(specs, D, true);
}

// ===================== COMBATE =====================
async function combateTorneo() {
    const t = torneo(); if (!t.activo) return renderAventura();
    const k = t.rivales[t.ronda], C = CAMPEONES[k], final = t.ronda === 2;
    try {
        curarEquipo();
        mostrarCargaBatalla({ vs: true, sprite: k, titulo: `Campeón${C.f ? "a" : ""} ${C.nombre}`, estilo: "liga" });
        AudioFX.musicaSonar(mus(C.musica));
        const D = dificultad();
        const [aliados, enemigos] = await Promise.all([prepararEquipo(await specsMiEquipo()), prepararEquipo(await specsCampeon(k, t.ronda))]);
        t.enCombate = true; guardarEntrenador();   // (si se deja a medias, el torneo se pierde)
        Combate.iniciar({
            aliados, enemigos, salvaje: false, permitirCaptura: false, premio: 0, poderRival: C.poder,
            curasRival: final ? { n: Math.max(1, D.curas.campeon - 1), objeto: D.objetoCura } : null, ia: 1, cambiosRival: Math.max(0.5, D.cambios),
            titulo: `${C.nombre} · ${C.region}`, entrenadorSprite: k, dialogo: C.intro, dialogoDerrota: C.derrota,
            musica: mus(C.musica), victoria: MUSICA.victoriaGimnasio, fondo: final ? "g6-darkcity" : "g6-city",
            bolsa: entrenador.mochila, guardarBolsa: guardarEntrenador, evolucionar: evolucionarEnCombate,
            darXP: true, expShare: () => config.expShare, generoJugador: entrenador.genero,
            alTerminar: async (r) => { sincronizarEquipoCombate(r.equipo); await finCombateTorneo(r); },
        });
    } catch (_) { errorCombate(); }
}
// Premio de cada ronda; la final, además, una megapiedra de Luminalia que no tengas (o un objeto raro si ya las tienes todas).
const PREMIO_RONDA = [8000, 15000, 40000];
async function finCombateTorneo(r) {
    const t = torneo(); t.enCombate = false;
    curarEquipo();
    if (r && r.gano) {
        const dinero = Math.round(PREMIO_RONDA[t.ronda] * dificultad().dinero);
        entrenador.dinero = (entrenador.dinero || 0) + dinero; entrenador.batallasGanadas++; entrenador.entrenadoresVencidos = (entrenador.entrenadoresVencidos || 0) + 1;
        t.victorias++; t.ronda++;
        if (t.ronda >= 3) {
            t.activo = false; t.copas++; t.ronda = 0;
            const faltan = (typeof PIEDRAS_ZA !== "undefined" ? PIEDRAS_ZA : Object.keys(MEGAS)).filter((p) => !tieneObjeto(p));
            const tuyas = faltan.filter((p) => entrenador.capturados[MEGAS[p].base]);
            const piedra = alAzar(tuyas.length ? tuyas : faltan);
            const premios = darObjetos(piedra ? [[piedra, 1], ["rare-candy", 3]] : [["gold-bottle-cap", 1], ["pp-max", 2]]);
            guardarEntrenador(); lanzarConfeti(); AudioFX.efecto("item_fanfare");
            toast(`¡Has ganado el Torneo Corona! +${dineroTexto(dinero)} y ${textoPremios(premios)}. Copas: ${t.copas}.`, 6000);
        } else {
            guardarEntrenador();
            toast(`¡Has ganado la ${RONDAS_TORNEO[t.ronda - 1].toLowerCase()}! +${dineroTexto(dinero)}. Tu equipo se recupera para la ${RONDAS_TORNEO[t.ronda].toLowerCase()}.`, 4200);
        }
    } else {
        t.activo = false; t.ronda = 0; guardarEntrenador();
        toast("Has caído en el torneo... Tu equipo se recupera. ¡Vuelve a inscribirte cuando quieras!", 4200);
    }
    subAventura = "torneo"; renderAventura();
}

// ===================== PANTALLA =====================
function inscribirTorneo() {
    const t = torneo(), claves = Object.keys(CAMPEONES), rivales = [];
    while (rivales.length < 3) { const k = alAzar(claves); if (!rivales.includes(k)) rivales.push(k); }
    Object.assign(t, { activo: true, ronda: 0, rivales, enCombate: false }); t.jugados++;
    guardarEntrenador(); AudioFX.ui("select");
}
function renderTorneo(cont) {
    const t = torneo();
    if (!entrenador.campeon) { subAventura = "principal"; return renderAventura(); }
    let aviso = "";
    if (t.enCombate) { aviso = "Dejaste un combate del torneo a medias: has quedado eliminado."; Object.assign(t, { enCombate: false, activo: false, ronda: 0 }); guardarEntrenador(); }
    AudioFX.musicaSonar(mus("end"));
    const tarjeta = (k, i) => {
        const C = CAMPEONES[k], estado = !t.activo ? "" : i < t.ronda ? "hecha" : i === t.ronda ? "actual" : "";
        return `<article class="tn-rival ${estado}">
            <span class="hub-etq">${RONDAS_TORNEO[i]}</span>
            <canvas class="lg-npc" data-sprite="${k}"></canvas>
            <b>${C.nombre}</b><small>${C.region}</small>
            <div class="tn-equipo">${C.equipo.map(([id]) => htmlIcono(id, "tn-icono")).join("")}</div>
            ${estado === "hecha" ? '<i class="tn-sello">Vencido</i>' : ""}
        </article>`;
    };
    const lista = Object.keys(CAMPEONES).map((k) => `<span class="tn-mini" title="${CAMPEONES[k].nombre} · ${CAMPEONES[k].region}"><canvas class="lg-npc" data-sprite="${k}"></canvas><small>${CAMPEONES[k].nombre}</small></span>`).join("");
    cont.innerHTML = `
        <div class="cabecera-modo con-volver">
            <button class="btn-volver" data-volver>Salir</button>
            <h2>Torneo Corona</h2>
        </div>
        <section class="lugar-cabecera torneo-cabecera">
            <img class="lc-fondo" src="${urlFondo("g6-city")}" alt="">
            <div class="lc-escena"><canvas class="metro-agente" id="torneo-presentadora"></canvas></div>
            <div class="lc-info">
                <span class="hub-etq">Estadio Corona · Nivel ${nivelTorneo(0)}+</span>
                <h2>Torneo de Campeones</h2>
                <p>Tres combates seguidos contra Campeones de todas las regiones. Tu equipo se cura antes de cada ronda. ¡Quien gane la final se lleva la Copa Corona!</p>
            </div>
        </section>
        ${aviso ? `<p class="nota aviso">${aviso}</p>` : ""}
        <div class="metro-datos">
            <div class="ventana-pk"><small>Copas Corona</small><b class="num-pk">${t.copas}</b></div>
            <div class="ventana-pk"><small>Combates ganados</small><b class="num-pk">${t.victorias}</b></div>
            <div class="ventana-pk"><small>Torneos jugados</small><b class="num-pk">${t.jugados}</b></div>
        </div>
        ${t.activo ? `
        <section class="metro-viaje">
            <span class="hub-etq">${RONDAS_TORNEO[t.ronda]} · tu rival: ${CAMPEONES[t.rivales[t.ronda]].nombre}</span>
            <div class="tn-cuadro">${t.rivales.map(tarjeta).join("")}</div>
            <div class="metro-acciones">
                <button class="btn-grande" data-combatir>${t.ronda === 2 ? "¡Jugar la final!" : "¡Al combate!"}</button>
                <button class="btn-sec" data-retirarse>Retirarse</button>
            </div>
        </section>` : `
        <section class="metro-viaje">
            <span class="hub-etq">Participantes de este año</span>
            <div class="tn-lista">${lista}</div>
            <div class="metro-acciones"><button class="btn-grande" data-inscribir>Inscribirse</button></div>
        </section>`}
        <p class="nota">Premios: ${PREMIO_RONDA.map(dineroTexto).join(" · ")} por ronda y, en la final, una megapiedra de Luminalia. Perder o rendirse te elimina, pero no pierdes dinero.</p>`;
    pintarIconos(cont);
    cont.querySelectorAll("canvas[data-sprite]").forEach((cv) => Atlas.cargar(urlEntrenadorPR(cv.dataset.sprite)).then((a) => { cv.width = a.w; cv.height = a.h; Atlas.dibujar(cv, a, 0); }).catch(() => {}));
    montarEntrenador(document.getElementById("torneo-presentadora"), "interviewers", { bucle: true, fps: 12 }).then((el) => el && tamanoNativo(el, 2, 130)).catch(() => {});
    cont.querySelector("[data-volver]").onclick = () => { subAventura = "principal"; renderAventura(); };
    const bi = cont.querySelector("[data-inscribir]");
    if (bi) bi.onclick = () => { if (equipoDebilitado()) curarEquipo(); inscribirTorneo(); renderTorneo(cont); };
    const bc = cont.querySelector("[data-combatir]"); if (bc) bc.onclick = () => combateTorneo();
    const br = cont.querySelector("[data-retirarse]");
    if (br) br.onclick = () => {
        if (br.dataset.seguro !== "1") { br.dataset.seguro = "1"; br.textContent = "¿Seguro? Quedas eliminado"; return; }
        Object.assign(t, { activo: false, ronda: 0 }); guardarEntrenador(); toast("Te retiras del torneo."); renderTorneo(cont);
    };
}
// La entrada del estadio, en la pantalla del lugar.
const _tarjetasPrevias = typeof tarjetasLugarExtra === "function" ? tarjetasLugarExtra : null;
tarjetasLugarExtra = (L) => {
    const previas = _tarjetasPrevias ? _tarjetasPrevias(L) : [];
    if (L.id !== "estadio-corona") return previas;
    const t = torneo();
    return previas.concat([{ html: `<button class="lg-tarjeta lg-edificio torneo" data-sub="torneo">
            <canvas class="lg-npc" data-sprite="interviewers"></canvas>
            <div class="lg-info"><span class="hub-etq">Estadio</span><h4>Torneo Corona</h4><p>${t.activo ? `En juego: ${RONDAS_TORNEO[t.ronda].toLowerCase()} contra ${CAMPEONES[t.rivales[t.ronda]].nombre}.` : `Campeones de todas las regiones te esperan. Copas: ${t.copas}.`}</p></div>
        </button>` }]);
};
LOGROS.push(
    { id: "torneo-1", nombre: "Copa Corona", desc: "Gana el Torneo Corona del Estadio Corona.", icono: () => PR_UI("champion_ribbon.png"), meta: 1, valor: () => torneo().copas, premio: [["ability-patch", 1]] },
    { id: "torneo-10", nombre: "Campeón de campeones", desc: "Gana 10 veces el Torneo Corona.", icono: "gold-bottle-cap", meta: 10, valor: () => torneo().copas, premio: [["master-ball", 2]] },
);
