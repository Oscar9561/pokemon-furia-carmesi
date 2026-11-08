/* =========================================================
   TORNEO CORONA · Estadio Corona (tras ser Campeón)
   Como el Pokémon World Tournament de Blanco 2 y Negro 2: tres rondas seguidas en una copa a elegir. La Copa Campeones,
   con los Campeones de todas las regiones (cada uno con su equipo de los juegos y su poder: Megaevolución, Dinamax,
   movimiento Z o Teracristal), y una copa por región con sus líderes de gimnasio y su Alto Mando (los que no están ya
   en Aurelia). Tu equipo se cura antes de cada ronda; perder o dejar un combate a medias termina el torneo.
   Ganar da dinero, un premio raro (en la Copa Campeones, una megapiedra de Luminalia) y una copa más en tu vitrina.
   Sprites: PokéRogue · Música: PokéRogue (temas de cada región) · Nombres en español y equipos: PokéRogue.
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

// ===================== COPAS DE LÍDERES Y ALTO MANDO =====================
// Los de otras regiones que no están ya en Aurelia, con su nombre oficial, su tipo, su tema y su equipo (cada hueco, una o
// varias especies: sale una, ya evolucionada; el último es su as). Datos de PokéRogue (trainer-config y pokerogue-locales).
const LIDERES = {
    // Kanto
    misty: { nombre: "Misty", f: true, copa: "kanto", tipo: "water", musica: "battle_kanto_gym", pk: [[121], [55], [195], [131]] },
    lt_surge: { nombre: "Teniente Surge", copa: "kanto", tipo: "electric", musica: "battle_kanto_gym", pk: [[26], [101], [466], [135]] },
    koga: { nombre: "Koga", copa: "kanto", tipo: "poison", e4: true, musica: "battle_johto_gym", pk: [[49], [89,110], [73], [903,904], [169]] },
    janine: { nombre: "Sachiko", f: true, copa: "kanto", tipo: "poison", musica: "battle_kanto_gym", pk: [[49], [169], [168], [110,24]] },
    lorelei: { nombre: "Lorelei", f: true, copa: "kanto", tipo: "ice", e4: true, musica: "battle_kanto_gym", pk: [[87], [80,10165], [124], [91,10102], [131]] },
    bruno: { nombre: "Bruno", copa: "kanto", tipo: "fighting", e4: true, musica: "battle_kanto_gym", pk: [[106,107], [208], [62,214], [979], [68]] },
    agatha: { nombre: "Agatha", f: true, copa: "kanto", tipo: "ghost", e4: true, musica: "battle_kanto_gym", pk: [[429], [24,110], [10115], [864], [94]] },
    // Johto
    falkner: { nombre: "Pegaso", copa: "johto", tipo: "flying", musica: "battle_johto_gym", pk: [[18], [178], [430], [169]] },
    bugsy: { nombre: "Antón", copa: "johto", tipo: "bug", musica: "battle_johto_gym", pk: [[212], [213], [469], [127,214]] },
    whitney: { nombre: "Blanca", f: true, copa: "johto", tipo: "normal", musica: "battle_johto_gym", pk: [[241], [424], [40], [981,899]] },
    clair: { nombre: "Débora", f: true, copa: "johto", tipo: "dragon", musica: "battle_johto_gym", pk: [[230], [149], [130], [621]] },
    will: { nombre: "Mento", copa: "johto", tipo: "psychic", e4: true, musica: "battle_johto_gym", pk: [[103], [199,10172], [866], [899,981], [178]] },
    karen: { nombre: "Karen", f: true, copa: "johto", tipo: "dark", e4: true, musica: "battle_johto_gym", pk: [[197], [94], [430], [461], [229]] },
    // Hoenn
    roxanne: { nombre: "Petra", f: true, copa: "hoenn", tipo: "rock", musica: "battle_hoenn_gym", pk: [[476], [76], [346,348], [306]] },
    brawly: { nombre: "Marcial", copa: "hoenn", tipo: "fighting", musica: "battle_hoenn_gym", pk: [[297], [68], [308], [286]] },
    wattson: { nombre: "Erico", copa: "hoenn", tipo: "electric", musica: "battle_hoenn_gym", pk: [[310], [101], [462], [311,312]] },
    flannery: { nombre: "Candela", f: true, copa: "hoenn", tipo: "fire", musica: "battle_hoenn_gym", pk: [[324], [219], [323], [229]] },
    norman: { nombre: "Norman", copa: "hoenn", tipo: "normal", musica: "battle_hoenn_gym", pk: [[289], [352], [295], [335]] },
    winona: { nombre: "Alana", f: true, copa: "hoenn", tipo: "flying", musica: "battle_hoenn_gym", pk: [[334], [279], [357], [227]] },
    tate: { nombre: "Vito", copa: "hoenn", tipo: "psychic", musica: "battle_hoenn_gym", pk: [[338], [178], [358], [475]] },
    liza: { nombre: "Leti", f: true, copa: "hoenn", tipo: "psychic", musica: "battle_hoenn_gym", pk: [[337], [344], [326], [282]] },
    juan: { nombre: "Galano", copa: "hoenn", tipo: "water", musica: "battle_hoenn_gym", pk: [[230], [365], [340], [342]] },
    sidney: { nombre: "Sixto", copa: "hoenn", tipo: "dark", e4: true, pk: [[262], [862], [275,332], [319,342], [359]] },
    phoebe: { nombre: "Fátima", f: true, copa: "hoenn", tipo: "ghost", e4: true, pk: [[302], [354], [426,429], [741,10115], [477]] },
    glacia: { nombre: "Nívea", f: true, copa: "hoenn", tipo: "ice", e4: true, pk: [[460], [362], [478], [10104,873], [365]] },
    drake: { nombre: "Dracón", copa: "hoenn", tipo: "dragon", e4: true, pk: [[334], [781], [330], [230,691], [373]] },
    // Sinnoh
    roark: { nombre: "Roco", copa: "sinnoh", tipo: "rock", musica: "battle_sinnoh_gym", pk: [[409], [76], [476], [839]] },
    gardenia: { nombre: "Gardenia", f: true, copa: "sinnoh", tipo: "grass", musica: "battle_sinnoh_gym", pk: [[407], [421], [389], [470]] },
    maylene: { nombre: "Brega", f: true, copa: "sinnoh", tipo: "fighting", musica: "battle_sinnoh_gym", pk: [[448], [308], [392], [454]] },
    crasher_wake: { nombre: "Mananti", copa: "sinnoh", tipo: "water", musica: "battle_sinnoh_gym", pk: [[419], [195], [395], [130]] },
    fantina: { nombre: "Fantina", f: true, copa: "sinnoh", tipo: "ghost", musica: "battle_sinnoh_gym", pk: [[429], [426], [477], [442]] },
    byron: { nombre: "Acerón", copa: "sinnoh", tipo: "steel", musica: "battle_sinnoh_gym", pk: [[411], [437], [306], [227]] },
    candice: { nombre: "Inverna", f: true, copa: "sinnoh", tipo: "ice", musica: "battle_sinnoh_gym", pk: [[478], [460], [461], [471]] },
    volkner: { nombre: "Lectro", copa: "sinnoh", tipo: "electric", musica: "battle_sinnoh_gym", pk: [[466], [405], [171], [479]] },
    aaron: { nombre: "Alecrán", copa: "sinnoh", tipo: "bug", e4: true, musica: "battle_sinnoh_gym", pk: [[469], [214], [416], [212,900], [452]] },
    bertha: { nombre: "Gaia", f: true, copa: "sinnoh", tipo: "ground", e4: true, musica: "battle_sinnoh_gym", pk: [[340], [450], [472], [473,901], [464]] },
    flint: { nombre: "Fausto", copa: "sinnoh", tipo: "fire", e4: true, musica: "battle_sinnoh_gym", pk: [[78], [208,428], [392], [59,10230], [467]] },
    lucian: { nombre: "Delos", copa: "sinnoh", tipo: "psychic", e4: true, musica: "battle_sinnoh_gym", pk: [[437], [65], [981], [122,308], [475]] },
    // Teselia
    cilan: { nombre: "Millo", copa: "teselia", tipo: "grass", pk: [[512], [497], [556], [598]] },
    chili: { nombre: "Zeo", copa: "teselia", tipo: "fire", pk: [[514], [500], [631], [555]] },
    cress: { nombre: "Maíz", copa: "teselia", tipo: "water", pk: [[516], [503], [902], [537]] },
    lenora: { nombre: "Aloe", f: true, copa: "teselia", tipo: "normal", pk: [[505], [586], [531], [628]] },
    brycen: { nombre: "Junco", copa: "teselia", tipo: "ice", pk: [[615], [584], [614], [10177]] },
    // Kalos
    viola: { nombre: "Violeta", f: true, copa: "kalos", tipo: "bug", pk: [[666], [284], [743], [826]] },
    grant: { nombre: "Lino", copa: "kalos", tipo: "rock", pk: [[697], [699], [689], [558]] },
    korrina: { nombre: "Corelia", f: true, copa: "kalos", tipo: "fighting", pk: [[448], [620], [701], [675]] },
    ramos: { nombre: "Amaro", copa: "kalos", tipo: "grass", pk: [[673], [189], [71], [709,711]] },
    valerie: { nombre: "Valeria", f: true, copa: "kalos", tipo: "fairy", pk: [[700], [303], [122], [683,685]] },
    olympia: { nombre: "Ástrid", f: true, copa: "kalos", tipo: "psychic", pk: [[678], [561], [687], [199]] },
    wulfric: { nombre: "Édel", copa: "kalos", tipo: "ice", pk: [[713], [460], [615], [473]] },
    malva: { nombre: "Malva", f: true, copa: "kalos", tipo: "fire", e4: true, pk: [[668], [655], [324], [229,609], [663]] },
    siebold: { nombre: "Narciso", copa: "kalos", tipo: "water", e4: true, pk: [[693], [658], [121], [130,977], [689]] },
    wikstrom: { nombre: "Tileo", copa: "kalos", tipo: "steel", e4: true, pk: [[707], [652], [212,589], [823], [681]] },
    drasna: { nombre: "Drácena", f: true, copa: "kalos", tipo: "dragon", e4: true, pk: [[334], [691], [445,612], [780], [715]] },
    // Alola
    hala: { nombre: "Kaudan", copa: "alola", tipo: "fighting", e4: true, pk: [[297], [760], [979], [62,68], [740]] },
    molayne: { nombre: "Lario", copa: "alola", tipo: "steel", e4: true, pk: [[707], [10102], [462], [376,983], [10106]] },
    olivia: { nombre: "Mayla", f: true, copa: "alola", tipo: "rock", e4: true, pk: [[526], [476], [10111], [369,703], [745]] },
    acerola: { nombre: "Zarala", f: true, copa: "alola", tipo: "ghost", e4: true, pk: [[426], [778], [781], [478], [770]] },
    kahili: { nombre: "Kahili", f: true, copa: "alola", tipo: "flying", e4: true, pk: [[701], [774], [741], [628,630], [733]] },
    // Galar
    milo: { nombre: "Percy", copa: "galar", tipo: "grass", pk: [[830], [275], [841], [272]] },
    nessa: { nombre: "Cathy", f: true, copa: "galar", tipo: "water", pk: [[834], [768], [847], [748]] },
    kabu: { nombre: "Naboru", copa: "galar", tipo: "fire", pk: [[851], [38], [59], [324]] },
    bea: { nombre: "Judith", f: true, copa: "galar", tipo: "fighting", pk: [[68], [865], [853], [870]] },
    allister: { nombre: "Alistair", copa: "galar", tipo: "ghost", pk: [[94], [867], [864], [855]] },
    opal: { nombre: "Sally", f: true, copa: "galar", tipo: "fairy", pk: [[869], [10167], [468], [303]] },
    gordie: { nombre: "Morris", copa: "galar", tipo: "rock", pk: [[839], [213,689], [874], [248]] },
    melony: { nombre: "Mel", f: true, copa: "galar", tipo: "ice", pk: [[131], [873], [875], [866,10177]] },
    piers: { nombre: "Nerio", copa: "galar", tipo: "dark", pk: [[862], [560], [849], [687]] },
    raihan: { nombre: "Roy", copa: "galar", tipo: "dragon", pk: [[1018], [330], [706], [776]] },
    // Paldea
    katy: { nombre: "Araceli", f: true, copa: "paldea", tipo: "bug", pk: [[901], [920], [918], [954]] },
    brassius: { nombre: "Brais", copa: "paldea", tipo: "grass", pk: [[185], [930], [947], [549,286]] },
    iono: { nombre: "e-Nigma", f: true, copa: "paldea", tipo: "electric", pk: [[429], [939], [941], [462]] },
    kofu: { nombre: "Fuco", copa: "paldea", tipo: "water", pk: [[740], [976], [961], [279]] },
    larry: { nombre: "Laureano", copa: "paldea", tipo: "normal", pk: [[398], [982], [916], [775]] },
    ryme: { nombre: "Lima", f: true, copa: "paldea", tipo: "ghost", pk: [[849], [972], [354], [778]] },
    tulip: { nombre: "Tuli", f: true, copa: "paldea", tipo: "psychic", pk: [[671], [956], [282], [981]] },
    grusha: { nombre: "Grusha", copa: "paldea", tipo: "ice", pk: [[334], [975], [873], [614]] },
    rika: { nombre: "Cayena", f: true, copa: "paldea", tipo: "ground", e4: true, pk: [[51], [232], [389,949], [323], [980]] },
    poppy: { nombre: "Pola", f: true, copa: "paldea", tipo: "steel", e4: true, pk: [[879], [462], [437,823], [208], [959]] },
    hassel: { nombre: "Hesperio", copa: "paldea", tipo: "dragon", e4: true, pk: [[715], [691], [841,842], [612], [998]] },
    crispin: { nombre: "Denis", copa: "paldea", region: "Arándano", tipo: "fire", e4: true, pk: [[479], [103], [323,663], [467], [257]] },
    amarys: { nombre: "Nerina", f: true, copa: "paldea", region: "Arándano", tipo: "steel", e4: true, pk: [[227], [579], [212,10106], [395], [376]] },
    lacey: { nombre: "Aroa", f: true, copa: "paldea", region: "Arándano", tipo: "fairy", e4: true, pk: [[547], [730], [210], [869], [530]] },
    drayton: { nombre: "Levi", copa: "paldea", region: "Arándano", tipo: "dragon", e4: true, pk: [[149], [254], [230,330], [612], [1018]] },
};
const REGION_COPA = { kanto: "Kanto", johto: "Johto", hoenn: "Hoenn", sinnoh: "Sinnoh", teselia: "Teselia", kalos: "Kalos", alola: "Alola", galar: "Galar", paldea: "Paldea" };
// Tema de cada región para quien no tiene uno propio: [líderes, Alto Mando].
const TEMA_COPA = { kanto: ["battle_kanto_gym", "battle_kanto_gym"], johto: ["battle_johto_gym", "battle_johto_gym"], hoenn: ["battle_hoenn_gym", "battle_hoenn_elite"],
    sinnoh: ["battle_sinnoh_gym", "battle_sinnoh_gym"], teselia: ["battle_unova_gym", "battle_unova_elite"], kalos: ["battle_kalos_gym", "battle_kalos_elite"],
    alola: ["battle_alola_elite", "battle_alola_elite"], galar: ["battle_galar_gym", "battle_galar_elite"], paldea: ["battle_paldea_gym", "battle_paldea_elite"] };
const PODER_COPA = { galar: "dinamax", paldea: "tera" };   // (como en sus juegos)
const CARA_COPA = { campeones: "cynthia", kanto: "misty", johto: "clair", hoenn: "flannery", sinnoh: "volkner", teselia: "lenora", kalos: "valerie", alola: "acerola", galar: "raihan", paldea: "iono" };
Object.entries(LIDERES).forEach(([k, L]) => {
    L.region = L.region || REGION_COPA[L.copa];
    L.musica = L.region === "Arándano" ? "battle_bb_elite" : L.musica || TEMA_COPA[L.copa][L.e4 ? 1 : 0];
    L.poder = PODER_COPA[L.copa] || null;
    const tipo = (TIPOS_ES[L.tipo] || "").toLowerCase();
    L.intro = L.e4 ? `Soy ${L.nombre}, del Alto Mando de ${L.region}. ¡Prepárate para el tipo ${tipo}!` : `Soy ${L.nombre}, líder de gimnasio de ${L.region}. ¿Podrás con mis Pokémon de tipo ${tipo}?`;
    L.derrota = L.e4 ? "Impresionante... Ya veo por qué eres Campeón." : "¡Qué combate! Te has ganado mi respeto.";
});
const COPAS = Object.assign({ campeones: { nombre: "Copa Campeones", rivales: Object.keys(CAMPEONES) } },
    Object.fromEntries(Object.keys(REGION_COPA).map((c) => [c, { nombre: `Copa ${REGION_COPA[c]}`, rivales: Object.keys(LIDERES).filter((k) => LIDERES[k].copa === c) }])));
const rivalTorneo = (k) => CAMPEONES[k] || LIDERES[k];
const tituloTorneo = (k) => (CAMPEONES[k] ? `Campeón${CAMPEONES[k].f ? "a" : ""} ${CAMPEONES[k].nombre}` : `${LIDERES[k].e4 ? "Alto Mando" : "Líder"} ${LIDERES[k].nombre}`);
// Estado en la partida: la copa en curso, la ronda, los tres rivales, el combate a medias y las copas ganadas
// (copas: las de Campeones, como siempre; ganadas: las de cada copa).
let copaElegida = "campeones";
function torneo() {
    if (!entrenador.torneo || typeof entrenador.torneo !== "object") entrenador.torneo = {};
    const t = entrenador.torneo;
    ["ronda", "copas", "jugados", "victorias"].forEach((k) => { t[k] = Math.max(0, Number(t[k]) || 0); });
    if (!COPAS[t.copa]) t.copa = "campeones";
    if (!t.ganadas || typeof t.ganadas !== "object") t.ganadas = { campeones: t.copas };
    if (!Array.isArray(t.rivales) || t.rivales.some((k) => !rivalTorneo(k))) { t.rivales = []; t.activo = false; }
    return t;
}
const nivelTorneo = (ronda) => limitar(Math.max(70, ...entrenador.equipo.map((id) => entrenador.capturados[id].nivel || 5)) + ronda * 2 + Math.round(dificultad().lider / 3), 1, 100);
async function specsCampeon(k, ronda) {
    const C = CAMPEONES[k], nivel = nivelTorneo(ronda), D = dificultad();
    const specs = C.equipo.map(([id, objeto], i) => ({ id, nivel: limitar(nivel - (i === C.equipo.length - 1 ? 0 : 2), 1, 100), objeto: objeto || null, probOculta: 0.5 }));
    specs.forEach((s) => marcarVisto(s.id));
    return reforzarEquipo(specs, D, true);
}
// Un líder o alguien del Alto Mando: uno de cada hueco y, hasta seis, otros de su tipo delante.
async function specsLider(k, ronda) {
    const L = LIDERES[k], nivel = nivelTorneo(ronda), D = dificultad();
    let specs = L.pk.map((op, i) => ({ id: alAzar(op), nivel: limitar(nivel - (i === L.pk.length - 1 ? 0 : 2), 1, 100), probOculta: 0.5 }));
    if (specs.length < 6) {
        try {
            const extra = (await specsDeTipos([L.tipo], 6, nivel - 2, -1, 0)).filter((s) => !specs.some((x) => idBase(x.id) === idBase(s.id)));
            specs = extra.slice(0, 6 - specs.length).concat(specs);
        } catch (_) {}
    }
    specs.forEach((s) => marcarVisto(s.id));
    return reforzarEquipo(specs, D, true);
}
const specsTorneo = (k, ronda) => (CAMPEONES[k] ? specsCampeon(k, ronda) : specsLider(k, ronda));

// ===================== COMBATE =====================
async function combateTorneo() {
    const t = torneo(); if (!t.activo) return renderAventura();
    const k = t.rivales[t.ronda], C = rivalTorneo(k), final = t.ronda === 2;
    try {
        curarEquipo();
        mostrarCargaBatalla({ vs: true, sprite: k, titulo: tituloTorneo(k), estilo: "liga" });
        AudioFX.musicaSonar(mus(C.musica));
        const D = dificultad();
        const [aliados, enemigos] = await Promise.all([prepararEquipo(await specsMiEquipo()), prepararEquipo(await specsTorneo(k, t.ronda))]);
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
// Premio de cada ronda; la final, además: en la Copa Campeones, una megapiedra de Luminalia que no tengas (o un objeto raro
// si ya las tienes todas); en las de las regiones, Caramelos Raros y otro objeto raro.
const PREMIO_RONDA = [8000, 15000, 40000];
async function finCombateTorneo(r) {
    const t = torneo(); t.enCombate = false;
    curarEquipo();
    if (r && r.gano) {
        const dinero = Math.round(PREMIO_RONDA[t.ronda] * dificultad().dinero);
        entrenador.dinero = (entrenador.dinero || 0) + dinero; entrenador.batallasGanadas++; entrenador.entrenadoresVencidos = (entrenador.entrenadoresVencidos || 0) + 1;
        t.victorias++; t.ronda++;
        if (t.ronda >= 3) {
            t.activo = false; t.ronda = 0; t.ganadas[t.copa] = (t.ganadas[t.copa] || 0) + 1;
            let premios;
            if (t.copa === "campeones") {
                t.copas++;
                const faltan = (typeof PIEDRAS_ZA !== "undefined" ? PIEDRAS_ZA : Object.keys(MEGAS)).filter((p) => !tieneObjeto(p));
                const tuyas = faltan.filter((p) => entrenador.capturados[MEGAS[p].base]);
                const piedra = alAzar(tuyas.length ? tuyas : faltan);
                premios = darObjetos(piedra ? [[piedra, 1], ["rare-candy", 3]] : [["gold-bottle-cap", 1], ["pp-max", 2]]);
            } else premios = darObjetos([["rare-candy", 2], alAzar([["pp-up", 2], ["ability-capsule", 1], ["bottle-cap", 1], ["big-nugget", 1]])]);
            guardarEntrenador(); lanzarConfeti(); AudioFX.efecto("item_fanfare");
            toast(`¡Has ganado la ${COPAS[t.copa].nombre}! +${dineroTexto(dinero)} y ${textoPremios(premios)}.`, 6000);
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
function inscribirTorneo(copa = "campeones") {
    const t = torneo(), claves = COPAS[copa].rivales, rivales = [];
    while (rivales.length < 3) { const k = alAzar(claves); if (!rivales.includes(k)) rivales.push(k); }
    Object.assign(t, { activo: true, copa, ronda: 0, rivales, enCombate: false }); t.jugados++;
    guardarEntrenador(); AudioFX.ui("select");
}
function renderTorneo(cont) {
    const t = torneo();
    if (!entrenador.campeon) { subAventura = "principal"; return renderAventura(); }
    let aviso = "";
    if (t.enCombate) { aviso = "Dejaste un combate del torneo a medias: has quedado eliminado."; Object.assign(t, { enCombate: false, activo: false, ronda: 0 }); guardarEntrenador(); }
    AudioFX.musicaSonar(mus("end"));
    if (!COPAS[copaElegida]) copaElegida = "campeones";
    const tarjeta = (k, i) => {
        const C = rivalTorneo(k), estado = !t.activo ? "" : i < t.ronda ? "hecha" : i === t.ronda ? "actual" : "";
        const pk = CAMPEONES[k] ? C.equipo.map(([id]) => id) : C.pk.map((op) => op[0]);
        return `<article class="tn-rival ${estado}">
            <span class="hub-etq">${RONDAS_TORNEO[i]}</span>
            <canvas class="lg-npc" data-sprite="${k}"></canvas>
            <b>${C.nombre}</b><small>${C.region}</small>
            <div class="tn-equipo">${pk.map((id) => htmlIcono(id, "tn-icono")).join("")}</div>
            ${estado === "hecha" ? '<i class="tn-sello">Vencido</i>' : ""}
        </article>`;
    };
    const lista = COPAS[copaElegida].rivales.map((k) => { const C = rivalTorneo(k); return `<span class="tn-mini" title="${C.nombre} · ${C.region}"><canvas class="lg-npc" data-sprite="${k}"></canvas><small>${C.nombre}</small></span>`; }).join("");
    const copas = Object.keys(COPAS).map((c) => `<button class="tn-copa ${c === copaElegida ? "elegida" : ""}" data-copa="${c}">
            <canvas class="lg-npc" data-sprite="${CARA_COPA[c]}"></canvas><b>${COPAS[c].nombre}</b><small>${t.ganadas[c] ? `Ganada ×${t.ganadas[c]}` : `${COPAS[c].rivales.length} rivales`}</small></button>`).join("");
    const ganadas = Object.values(t.ganadas).reduce((a, n) => a + (Number(n) || 0), 0);
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
                <h2>Torneo de Campeones y líderes</h2>
                <p>Elige una copa: los Campeones de todas las regiones o los líderes y el Alto Mando de una región. Tres combates seguidos; tu equipo se cura antes de cada uno.</p>
            </div>
        </section>
        ${aviso ? `<p class="nota aviso">${aviso}</p>` : ""}
        <div class="metro-datos">
            <div class="ventana-pk"><small>Copas ganadas</small><b class="num-pk">${ganadas}</b></div>
            <div class="ventana-pk"><small>Combates ganados</small><b class="num-pk">${t.victorias}</b></div>
            <div class="ventana-pk"><small>Torneos jugados</small><b class="num-pk">${t.jugados}</b></div>
        </div>
        ${t.activo ? `
        <section class="metro-viaje">
            <span class="hub-etq">${COPAS[t.copa].nombre} · ${RONDAS_TORNEO[t.ronda]} · tu rival: ${rivalTorneo(t.rivales[t.ronda]).nombre}</span>
            <div class="tn-cuadro">${t.rivales.map(tarjeta).join("")}</div>
            <div class="metro-acciones">
                <button class="btn-grande" data-combatir>${t.ronda === 2 ? "¡Jugar la final!" : "¡Al combate!"}</button>
                <button class="btn-sec" data-retirarse>Retirarse</button>
            </div>
        </section>` : `
        <section class="metro-viaje">
            <span class="hub-etq">Elige una copa</span>
            <div class="tn-copas">${copas}</div>
            <span class="hub-etq">Participantes · ${COPAS[copaElegida].nombre}</span>
            <div class="tn-lista">${lista}</div>
            <div class="metro-acciones"><button class="btn-grande" data-inscribir>Inscribirse en la ${COPAS[copaElegida].nombre}</button></div>
        </section>`}
        <p class="nota">Premios: ${PREMIO_RONDA.map(dineroTexto).join(" · ")} por ronda y, en la final, un objeto raro (en la Copa Campeones, una megapiedra de Luminalia). Perder o rendirse te elimina, pero no pierdes dinero.</p>`;
    pintarIconos(cont);
    cont.querySelectorAll("canvas[data-sprite]").forEach((cv) => Atlas.cargar(urlEntrenadorPR(cv.dataset.sprite)).then((a) => { cv.width = a.w; cv.height = a.h; Atlas.dibujar(cv, a, 0); }).catch(() => {}));
    montarEntrenador(document.getElementById("torneo-presentadora"), "interviewers", { bucle: true, fps: 12 }).then((el) => el && tamanoNativo(el, 2, 130)).catch(() => {});
    cont.querySelector("[data-volver]").onclick = () => { subAventura = "principal"; renderAventura(); };
    cont.querySelectorAll("[data-copa]").forEach((b) => b.onclick = () => { copaElegida = b.dataset.copa; AudioFX.ui("select"); renderTorneo(cont); });
    const bi = cont.querySelector("[data-inscribir]");
    if (bi) bi.onclick = () => { if (equipoDebilitado()) curarEquipo(); inscribirTorneo(copaElegida); renderTorneo(cont); };
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
            <div class="lg-info"><span class="hub-etq">Estadio</span><h3>Torneo Corona</h3><p>${t.activo ? `${COPAS[t.copa].nombre}: ${RONDAS_TORNEO[t.ronda].toLowerCase()} contra ${rivalTorneo(t.rivales[t.ronda]).nombre}.` : "Campeones, líderes y Alto Mando de todas las regiones te esperan."}</p></div>
        </button>` }]);
};
LOGROS.push(
    { id: "torneo-1", nombre: "Copa Corona", desc: "Gana la Copa Campeones del Torneo Corona.", icono: () => PR_UI("champion_ribbon.png"), meta: 1, valor: () => torneo().copas, premio: [["ability-patch", 1]] },
    { id: "torneo-10", nombre: "Campeón de campeones", desc: "Gana 10 veces la Copa Campeones.", icono: "gold-bottle-cap", meta: 10, valor: () => torneo().copas, premio: [["master-ball", 2]] },
    { id: "torneo-regiones", nombre: "Leyenda del estadio", desc: "Gana la copa de cada región en el Torneo Corona.", icono: () => PR_UI("champion_ribbon.png"), meta: Object.keys(REGION_COPA).length,
        valor: () => Object.keys(REGION_COPA).filter((c) => torneo().ganadas[c]).length, premio: [["master-ball", 1], ["ability-patch", 1]] },
);
