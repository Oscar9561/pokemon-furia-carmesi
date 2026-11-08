/* =========================================================
   EVENTOS DE TEMPORADA Y LUGARES NUEVOS
   - Eventos de temporada (según la fecha): Noche de Halloween, Navidad en Aurelia, Día de Pokémon, Festival de las
     Flores y Verano en la Costa. Cambian los Pokémon salvajes, el tiempo o los variocolor, y en los pueblos dan un
     regalo una vez al año.
   - Zonas nuevas, cada una con su legendario y su música (las de PokéRogue que faltaban): Selva Umbría (Zarude),
     Templo Ancestral (Mew), Gruta Feérica (Diancie), Gruta Glaciar (Articuno), Fábrica Abandonada (Genesect) y, para
     los Campeones, Fosa Abisal (Kyogre) y Pico Estelar (Eternatus, con su segunda fase a media vida).
   - Distrito Sombra y la Torre Sombra (tras ser Campeón): cuatro combates seguidos contra los comandantes y los jefes de
     los equipos villanos de otras regiones (Rocket, Magma, Aqua, Galaxia, Plasma, Skull, Æther y Macrocosmos), con sus
     equipos y sus temas de combate. Sprites: PokéRogue · Música: PokéRogue.
   ========================================================= */

// ===================== EVENTOS DE TEMPORADA =====================
// desde/hasta: [mes, día] (ambos incluidos; Navidad pasa de un año al siguiente) · especies: las que salen más (familias
// enteras, para que haya alguna a cada nivel) · prob: cuántas veces sale una de ellas en vez del Pokémon de siempre
// (probNoche, de noche) · clima: el tiempo que hace más a menudo · shiny: multiplica la probabilidad de variocolor.
const TEMPORADAS = [
    { id: "halloween", nombre: "Noche de Halloween", icono: "spell-tag", desde: [10, 20], hasta: [11, 2], musicaTitulo: "halloween_title",
        texto: "Salen muchos más Pokémon fantasma, sobre todo de noche.", prob: 0.2, probNoche: 0.45,
        especies: [92, 93, 94, 200, 429, 353, 354, 355, 356, 477, 425, 426, 442, 562, 563, 570, 571, 607, 608, 609, 708, 709, 710, 711, 778, 854, 855, 971, 972],
        regalo: { pokemon: { id: 710, nivel: 20, objeto: "spell-tag" }, objetos: [["rare-candy", 2], ["dusk-ball", 5]] } },
    { id: "navidad", nombre: "Navidad en Aurelia", icono: "never-melt-ice", desde: [12, 15], hasta: [1, 6],
        texto: "Nieva en casi toda la región y salen más Pokémon de hielo.", prob: 0.3, clima: "nieve", musicaTitulo: "winter_title",
        especies: [225, 215, 461, 220, 221, 473, 361, 362, 478, 459, 460, 582, 583, 584, 613, 614, 712, 713, 872, 873, 875, 974, 975, 996, 997, 998],
        regalo: { pokemon: { id: 225, nivel: 25, objeto: "never-melt-ice" }, objetos: [["rare-candy", 2], ["ultra-ball", 5]] } },
    { id: "san-valentin", nombre: "San Valentín", icono: "sweet-heart", desde: [2, 10], hasta: [2, 16],
        texto: "Salen más Pokémon de tipo Hada y los más cariñosos.", prob: 0.25,
        especies: [35, 36, 173, 39, 40, 174, 113, 242, 440, 370, 594, 531, 669, 670, 671, 682, 683, 684, 685, 700, 742, 743, 764, 868, 869],
        regalo: { pokemon: { id: 370, nivel: 20, objeto: "lansat-berry" }, objetos: [["sweet-heart", 5], ["rare-candy", 2]] } },
    { id: "dia-pokemon", nombre: "Día de Pokémon", icono: "light-ball", desde: [2, 20], hasta: [3, 3],
        texto: "Los Pokémon variocolor salen el doble de a menudo.", prob: 0.1, shiny: 2,
        especies: [25, 26, 172, 133, 134, 135, 136, 196, 197, 470, 471, 700],
        regalo: { pokemon: { id: 25, nivel: 25, objeto: "light-ball", shiny: true }, objetos: [["rare-candy", 2]] } },
    { id: "flores", nombre: "Festival de las Flores", icono: "miracle-seed", desde: [3, 20], hasta: [4, 10],
        texto: "Salen más Pokémon de tipo Planta y Hada.", prob: 0.25,
        especies: [43, 44, 45, 182, 406, 315, 407, 420, 421, 546, 547, 548, 549, 585, 586, 669, 670, 671, 682, 683, 742, 743, 764, 829, 830, 856, 857, 858, 928, 929, 930],
        regalo: { pokemon: { id: 669, nivel: 18, objeto: "miracle-seed" }, objetos: [["rare-candy", 2]] } },
    { id: "verano", nombre: "Verano en la Costa", icono: "mystic-water", desde: [7, 15], hasta: [8, 31],
        texto: "Salen más Pokémon de agua y de bicho, y hace más sol.", prob: 0.25, clima: "sol",
        especies: [7, 8, 9, 54, 55, 72, 73, 116, 117, 230, 120, 121, 222, 278, 279, 283, 284, 313, 314, 318, 319, 370, 456, 457, 594, 690, 691, 746, 751, 752, 767, 768, 846, 847, 960, 961],
        regalo: { pokemon: { id: 131, nivel: 30, objeto: "mystic-water" }, objetos: [["rare-candy", 2]] } },
];
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
// El evento de hoy (o null). anio: el del día en que empezó (Navidad de 2026 sigue siendo la de 2026 en enero).
function temporadaActiva(fecha = new Date()) {
    const md = (fecha.getMonth() + 1) * 100 + fecha.getDate();
    for (const t of TEMPORADAS) {
        const a = t.desde[0] * 100 + t.desde[1], b = t.hasta[0] * 100 + t.hasta[1];
        if (a <= b ? md >= a && md <= b : md >= a || md <= b) return Object.assign({ anio: fecha.getFullYear() - (a > b && md <= b ? 1 : 0) }, t);
    }
    return null;
}
const hastaTemporada = (t) => `${t.hasta[1]} de ${MESES[t.hasta[0] - 1]}`;
// Pokémon salvaje del evento: a veces, en vez del de siempre, uno de los suyos que encaje a esos niveles.
function salvajeDeTemporada(id, min, max) {
    const t = temporadaActiva(); if (!t || !t.especies || esLegendario(id)) return id;
    if (Math.random() >= (t.probNoche && claseHora() === "noche" ? t.probNoche : t.prob)) return id;
    const aptas = t.especies.filter((e) => especieApta(e, min, max));
    return aptas.length ? alAzar(aptas) : id;
}
// El tiempo del evento: en Navidad nieva en la mitad de los sitios (salvo en el volcán); en verano, más sol de día.
const _climaSinTemporada = climaDeLugar;
climaDeLugar = function (L) {
    const base = _climaSinTemporada(L), t = temporadaActiva();
    if (!t || !t.clima || !L || !L.bioma || base === t.clima || L.bioma === "volcan" || (t.clima === "sol" && claseHora() === "noche")) return base;
    return semilla(`temporada:${t.id}:${new Date().toISOString().slice(0, 10)}:${L.id}`)() < 0.5 ? t.clima : base;
};
{ const t = temporadaActiva(); if (t && t.musicaTitulo) MUSICA.vistas.inicio = mus(t.musicaTitulo); }   // (la portada de invierno)

// Regalo del evento (una vez al año): un Pokémon con su objeto (si ya tienes esa especie, otro objeto más) y objetos.
const claveRegalo = (t) => `${t.id}-${t.anio}`;
const regaloRecogido = (t) => !!(entrenador.regalosTemporada || {})[claveRegalo(t)];
function recogerRegalo(t) {
    if (!t || regaloRecogido(t)) return;
    (entrenador.regalosTemporada = entrenador.regalosTemporada || {})[claveRegalo(t)] = true;
    const p = t.regalo.pokemon, objetos = t.regalo.objetos.slice();
    let unido = null;
    if (p && !entrenador.capturados[p.id]) {
        entrenador.capturados[p.id] = { nivel: p.nivel, xp: 0, objeto: p.objeto || null, bola: "cherish-ball", movimientos: null, nivelCaptura: p.nivel,
            genero: generoAleatorio(p.id), naturaleza: naturalezaAleatoria(), habSlot: Math.random() < 0.5 ? 1 : 2, shiny: !!p.shiny,
            lugarCaptura: mundo().lugar, recibido: true };
        if (entrenador.equipo.length < 6) entrenador.equipo.push(p.id);
        asegurarMovimientos(p.id);
        unido = p.id;
    } else if (p && p.objeto) objetos.push([p.objeto, 1]);
    const dados = darObjetos(objetos);
    guardarEntrenador();
    AudioFX.fanfarria(MUSICA.captura);
    toast(`¡Regalo de ${t.nombre}! ${unido ? `${nombrePk(unido)} se une a ${entrenador.equipo.includes(unido) ? "tu equipo" : "tu Caja"}. ` : ""}Recibes: ${textoPremios(dados)}.`, 5200);
}
// Halloween: en los pueblos espera alguien disfrazado con un equipo de fantasmas (un combate al día con premio).
function retarDisfrazado() {
    const f = entrenador.genero !== "f", nivel = Math.max(5, ...entrenador.equipo.map((id) => entrenador.capturados[id].nivel || 5));
    combateEntrenador({
        titulo: f ? "Entrenadora disfrazada" : "Entrenador disfrazado", sprite: f ? "halloween_rival_f" : "halloween_rival_m", vs: true, pago: "rival",
        dialogo: "¡Truco o trato! Si me ganas, te doy un trato... ¡pero mis fantasmas no se dejan!", dialogoDerrota: "¡Vale, vale! ¡Toma tu trato! ¡Feliz Halloween!",
        musica: mus("battle_rival_2"), fondo: "g6-darkcity",
        specs: async () => specsDeTipos(["ghost"], 4, nivel - 1, -2, 0),
        alGanar: async () => {
            if (entrenador.disfrazado === hoyISO()) return;
            entrenador.disfrazado = hoyISO();
            const premios = darObjetos([["rare-candy", 1], ["dusk-ball", 3]]);
            guardarEntrenador(); toast(`¡Tu trato de Halloween! Recibes: ${textoPremios(premios)}.`, 4200);
        },
    });
}
// Día de los Inocentes (28 de diciembre): la portada y los combates contra entrenadores suenan con su versión de broma.
const esInocentes = (d = new Date()) => d.getMonth() === 11 && d.getDate() === 28;
if (esInocentes()) {
    MUSICA.vistas.inicio = mus(Math.random() < 0.5 ? "title_afd" : "title_afd_2");
    MUSICA.rival = MUSICA.rival.map(() => mus("battle_rival_3_afd"));
    Object.keys(MUSICA_RIVAL).forEach((k) => { MUSICA_RIVAL[k] = mus("battle_rival_3_afd"); });
    const _temaEntrenadorNormal = temaEntrenador;
    temaEntrenador = (usar) => (esInocentes() ? mus("battle_trainer_afd") : _temaEntrenadorNormal(usar));
}
// Tarjeta del evento en la portada.
function tarjetaTemporadaInicio() {
    const t = temporadaActiva(); if (!t) return "";
    return `<article class="inicio-tarjeta objetivo temporada"><img src="${urlItem(t.icono)}" alt=""><div><span class="hub-etq">Evento · hasta el ${hastaTemporada(t)}</span><b>${t.nombre}</b><small>${t.texto}</small></div></article>`;
}

// ===================== ZONAS NUEVAS =====================
Object.assign(BIOMAS, {
    selva:   { tipos: ["grass", "bug", "poison"], noche: ["dark"], fondo: "g6-forest", musica: "jungle", clases: ["ranger_m", "ranger_f", "bug_catcher", "backpacker_f"] },
    templo:  { tipos: ["psychic", "ghost", "rock"], fondo: "g6-desert", musica: "temple", clases: ["ruin_maniac", "psychic_m", "psychic_f", "hex_maniac"] },
    feerico: { tipos: ["fairy", "rock", "psychic"], fondo: "icecave", musica: "fairy_cave", clases: ["beauty", "maid", "psychic_f", "collector"] },
    glaciar: { tipos: ["ice", "rock", "water"], fondo: "g6-icecave", musica: "ice_cave", clases: ["snow_worker_m", "snow_worker_f", "hiker", "ace_trainer_f"] },
    fabrica: { tipos: ["steel", "electric", "poison"], noche: ["ghost"], fondo: "g6-darkcity", musica: "factory", clases: ["worker_m", "worker_f", "scientist_m", "janitor"] },
    fosa:    { tipos: ["water", "dark", "ghost"], fondo: "g6-deepsea", musica: "seabed", clases: ["scuba_diver_m", "scuba_diver_f", "fisherman"] },
    estelar: { tipos: ["psychic", "dragon", "steel"], fondo: "g6-skypillar", musica: "space", clases: ["ace_trainer_m", "ace_trainer_f", "psychic_m", "scientist_f"] },
    sombra:  { tipos: ["dark", "poison", "steel"], noche: ["ghost"], fondo: "g6-darkcity", musica: "slum", clases: [] },
    obras:   { tipos: ["fighting", "steel", "ground"], fondo: "desert", musica: "construction_site", clases: ["worker_m", "worker_f", "linebacker", "black_belt_m"] },
    pozo:    { tipos: ["ghost", "poison", "water"], noche: ["dark"], fondo: "g6-dampcave", musica: "underground_well", clases: ["hex_maniac", "psychic_f", "backpacker_m"] },
});
Object.assign(CLIMA_BIOMA, { obras: [[null, 3], ["arena", 1]], selva: [[null, 3], ["lluvia", 2]], glaciar: [[null, 1], ["nieve", 3]], templo: [[null, 3], ["arena", 1]], fosa: [[null, 1], ["lluvia", 1]] });
BIOMAS_AGUA.add("fosa"); BIOMAS_AGUA.add("pozo");
// Reclutas de los equipos villanos de otras regiones, por el Distrito Sombra.
[
    { sprite: "rocket_grunt_m", nombre: "Recluta Rocket", tipos: ["poison", "normal"], musica: "battle_rocket_grunt" }, { sprite: "rocket_grunt_f", nombre: "Recluta Rocket", fem: true, tipos: ["poison", "dark"], musica: "battle_rocket_grunt" },
    { sprite: "magma_grunt_m", nombre: "Recluta Magma", tipos: ["fire", "ground"], musica: "battle_aqua_magma_grunt" }, { sprite: "aqua_grunt_m", nombre: "Recluta Aqua", tipos: ["water", "dark"], musica: "battle_aqua_magma_grunt" },
    { sprite: "galactic_grunt_m", nombre: "Recluta Galaxia", tipos: ["poison", "dark"], musica: "battle_galactic_grunt" }, { sprite: "plasma_grunt_m", nombre: "Recluta Plasma", tipos: ["dark", "psychic"], musica: "battle_plasma_grunt" },
    { sprite: "skull_grunt_m", nombre: "Recluta Skull", tipos: ["poison", "bug", "dark"], musica: "battle_skull_grunt" }, { sprite: "aether_grunt_m", nombre: "Empleado de la Fundación Æther", tipos: ["psychic", "normal"], musica: "battle_aether_grunt" },
    { sprite: "macro_grunt_m", nombre: "Entrenador Macrocosmos", tipos: ["steel"], musica: "battle_macro_grunt" }, { sprite: "macro_grunt_f", nombre: "Entrenadora Macrocosmos", fem: true, tipos: ["steel", "fairy"], musica: "battle_macro_grunt" },
].forEach((c) => {
    if (!CLASES_ENTRENADOR.some((x) => x.sprite === c.sprite)) CLASES_ENTRENADOR.push({ sprite: c.sprite, nombre: c.nombre, enc: "plasma_grunt", fem: c.fem, musica: c.musica });
    TIPOS_CLASE[c.sprite] = c.tipos;
    BIOMAS.sombra.clases.push(c.sprite);
});
// Más entrenadores por las rutas (sprites de PokéRogue con sus nombres oficiales en español); los Pandilleros, en pareja.
[
    { sprite: "backers_m", nombre: "Hincha", enc: "roughneck", tipos: ["normal", "fighting"], biomas: ["tormenta", "pradera"] },
    { sprite: "backers_f", nombre: "Hincha", enc: "lass", fem: true, tipos: ["normal", "fairy"], biomas: ["tormenta", "pradera"] },
    { sprite: "fairy_tale_girl", nombre: "Niña Soñadora", enc: "lass", fem: true, tipos: ["fairy", "psychic"], biomas: ["jardin", "feerico"] },
    { sprite: "snow_ace_trainer_m", nombre: "Entrenador Guay", enc: "ace_trainer", tipos: ["ice", "water"], biomas: ["nieve", "glaciar"] },
    { sprite: "hooligans", nombre: "Pandilleros", enc: "roughneck", pareja: ["Kevin y Brian", "Jony y Raúl", "Iker y Dani"], tipos: ["dark", "poison"], biomas: ["sombra", "costa"] },
].forEach((c) => {
    if (!CLASES_ENTRENADOR.some((x) => x.sprite === c.sprite)) CLASES_ENTRENADOR.push({ sprite: c.sprite, nombre: c.nombre, enc: c.enc, fem: c.fem, pareja: c.pareja });
    TIPOS_CLASE[c.sprite] = c.tipos;
    c.biomas.forEach((b) => { if (BIOMAS[b] && !BIOMAS[b].clases.includes(c.sprite)) BIOMAS[b].clases.push(c.sprite); });
    if (c.pareja) CLASES_DOBLES.add(c.sprite);
});
(() => {
    const zona = (id, datos, desde) => { nuevoLugar(id, Object.assign({ tipo: "zona" }, datos)); conectar(desde, id); };
    zona("selva-umbria", { nombre: "Selva Umbría", bioma: "selva", med: 9, x: 3, y: 24, nivel: [52, 57],
        desc: "Una selva tan cerrada que es de noche a mediodía. Entre las lianas se oyen pasos que no son de nadie." }, "villa-lumina");
    zona("templo-ancestral", { nombre: "Templo Ancestral", bioma: "templo", med: 12, x: 64, y: 16, nivel: [62, 68],
        desc: "Las ruinas de un templo más antiguo que la propia Ciudad Escama. En su altar flota a veces una luz rosa." }, "ciudad-escama");
    zona("gruta-feerica", { nombre: "Gruta Feérica", bioma: "feerico", med: 10, x: 97, y: 35, nivel: [56, 61],
        desc: "Una cueva de cristales rosados junto a Ciudad Jardín. Dicen que en el fondo nacen diamantes de verdad." }, "ciudad-jardin");
    zona("gruta-glaciar", { nombre: "Gruta Glaciar", bioma: "glaciar", med: 14, x: 39, y: 61, nivel: [70, 76],
        desc: "Una cueva de hielo bajo Pueblo Escarcha. El viento que sale de ella congela hasta las cascadas." }, "pueblo-escarcha");
    zona("fabrica-abandonada", { nombre: "Fábrica Abandonada", bioma: "fabrica", med: 13, x: 65, y: 61, nivel: [66, 72],
        desc: "Una vieja fábrica de los astilleros. Nadie trabaja aquí desde hace años, pero las máquinas siguen en marcha." }, "ciudad-faro");
    zona("fosa-abisal", { nombre: "Fosa Abisal", bioma: "fosa", campeon: true, x: 88, y: 61, nivel: [86, 92], cerrado: "Ningún submarino baja a la Fosa Abisal... salvo con el Campeón a bordo.",
        desc: "El punto más hondo del mar de Aurelia. Allí abajo duerme algo que hace subir las mareas." }, "ruta-13");
    zona("pico-estelar", { nombre: "Pico Estelar", bioma: "estelar", campeon: true, x: 48, y: 34, nivel: [90, 96], cerrado: "El camino al Pico Estelar está cerrado. Solo el Campeón de la Liga puede subir.",
        desc: "La cumbre más alta de Aurelia, por encima de las nubes. Por la noche caen estrellas en su cráter." }, "calle-victoria");
    zona("pozo-antiguo", { nombre: "Pozo Antiguo", bioma: "pozo", med: 1, x: 14, y: 46, nivel: [12, 17],
        desc: "Un pozo de piedra a las afueras de Pueblo Albor. Los mayores dicen que de noche se oyen voces en el fondo." }, "pueblo-albor");
    zona("obras-autovia", { nombre: "Obras de la Autovía", bioma: "obras", med: 4, x: 37, y: 23, nivel: [28, 33],
        desc: "Las obras de la nueva autovía de Aurelia. Los Pokémon de lucha ayudan a cargar las vigas... cuando quieren." }, "ciudad-cantera");
    zona("distrito-sombra", { nombre: "Distrito Sombra", bioma: "sombra", campeon: true, x: 77, y: 50, nivel: [84, 90], cerrado: "Un guardia te corta el paso: «Al Distrito Sombra solo entran los Campeones».",
        desc: "Un barrio abandonado entre la niebla. Los antiguos villanos de otras regiones se reúnen en la torre del centro." }, "ciudad-neblina");
})();
Object.assign(EVENTOS_POKEMON, {
    "pozo-antiguo":       { id: "spiritomb", especie: 442, nivel: 18, titulo: "Voces en el fondo del pozo",
        lineas: ["Te asomas al pozo y una piedra con una grieta brilla en el fondo...", "Las voces suenan cada vez más cerca.", "¡Spiritomb sale de la piedra!"] },
    "obras-autovia":      { id: "conkeldurr", especie: 534, nivel: 36, titulo: "El capataz de las obras",
        lineas: ["Todos los obreros se han parado a mirar algo...", "Un Pokémon enorme levanta dos columnas de piedra como si nada.", "¡El Conkeldurr de las obras quiere medir su fuerza contigo!"] },
    "selva-umbria":       { id: "zarude", especie: 893, nivel: 58, titulo: "Lianas que se mueven",
        lineas: ["Las lianas se balancean sin que sople el viento...", "Algo salta de rama en rama y cae delante de ti.", "¡Zarude defiende su selva!"] },
    "templo-ancestral":   { id: "mew", especie: 151, nivel: 68, titulo: "Una burbuja en el altar",
        lineas: ["Sobre el altar flota una burbuja rosa...", "La burbuja estalla y algo diminuto se ríe a tu alrededor.", "¡Mew quiere jugar contigo!"] },
    "gruta-feerica":      { id: "diancie", especie: 719, nivel: 62, titulo: "Un brillo rosado",
        lineas: ["Las paredes de la gruta brillan como diamantes...", "En el centro, los cristales se juntan y toman forma.", "¡Diancie aparece entre las joyas!"] },
    "gruta-glaciar":      { id: "articuno", especie: 144, nivel: 74, titulo: "Viento helado",
        lineas: ["El aire se vuelve tan frío que cuesta respirar...", "Un ave de cristal azul planea sobre el hielo.", "¡Articuno ha bajado a la gruta!"] },
    "fabrica-abandonada": { id: "genesect", especie: 649, nivel: 74, titulo: "Algo en la cadena de montaje",
        lineas: ["Las máquinas de la fábrica se encienden solas...", "Un Pokémon de metal con un cañón a la espalda sale de entre los engranajes.", "¡Genesect te ha detectado!"] },
    "fosa-abisal":        { id: "kyogre", especie: 382, nivel: 92, titulo: "Luces en el fondo del mar",
        lineas: ["La presión del agua es enorme y no se ve nada...", "De repente, unas líneas rojas brillan en la oscuridad.", "¡Kyogre ha despertado!"] },
    "pico-estelar":       { id: "eternatus", especie: 890, nivel: 96, titulo: "Una estrella que cae",
        lineas: ["El cielo se tiñe de rojo sobre el pico...", "Algo enorme baja de las estrellas envuelto en energía.", "¡Eternatus ha llegado del espacio!"] },
});

// ===================== TORRE SOMBRA =====================
// Cuatro combates seguidos: dos comandantes y dos jefes, el último con el tema de la gran final. Tu equipo se cura
// antes de cada uno; perder o dejar un combate a medias te echa de la torre (sin perder dinero).
const EQUIPOS_SOMBRA = {
    rocket:  { nombre: "Team Rocket", region: "Kanto", comandante: "battle_rocket_grunt", jefe: "battle_rocket_boss" },
    magma:   { nombre: "Team Magma", region: "Hoenn", comandante: "battle_aqua_magma_grunt", jefe: "battle_aqua_magma_boss" },
    aqua:    { nombre: "Team Aqua", region: "Hoenn", comandante: "battle_aqua_magma_grunt", jefe: "battle_aqua_magma_boss" },
    galaxia: { nombre: "Equipo Galaxia", region: "Sinnoh", comandante: "battle_galactic_admin", jefe: "battle_galactic_boss" },
    plasma:  { nombre: "Equipo Plasma", region: "Teselia", comandante: "battle_plasma_grunt", jefe: "battle_plasma_boss" },
    skull:   { nombre: "Team Skull", region: "Alola", comandante: "battle_skull_admin", jefe: "battle_skull_boss" },
    aether:  { nombre: "Fundación Æther", region: "Alola", comandante: "battle_aether_grunt", jefe: "battle_aether_boss" },
    macro:   { nombre: "Macrocosmos", region: "Galar", comandante: "battle_macro_grunt", jefe: "battle_macro_boss" },
};
// clave: su sprite de PokéRogue · equipo: [especie, objeto] (el último es su as) · musica: la suya, si no es la de su equipo
const JEFES_SOMBRA = {
    giovanni: { nombre: "Giovanni", equipo: "rocket", poder: null, intro: "Así que eres tú quien ha llegado tan lejos. El Team Rocket no se rinde jamás.",
        derrota: "Me retiro... por ahora. Pero el Team Rocket volverá.", pk: [[10108], [34], [31], [450], [464], [115, "kangaskhanite"]] },
    maxie:    { nombre: "Magno", equipo: "magma", poder: null, intro: "El mundo necesita más tierra firme. Apártate de mi camino.",
        derrota: "Mis cálculos eran perfectos... ¿Cómo he podido perder?", pk: [[262], [169], [110], [229], [324], [323, "cameruptite"]] },
    archie:   { nombre: "Aquiles", equipo: "aqua", poder: null, intro: "¡Ja, ja! ¡El mar es el origen de todo! ¡Prepárate para mojarte!",
        derrota: "Vaya... Me has dejado sin olas.", pk: [[262], [169], [73], [130], [279], [319, "sharpedonite"]] },
    cyrus:    { nombre: "Helio", equipo: "galaxia", poder: "tera", intro: "Los sentimientos son un estorbo. Te lo voy a demostrar.",
        derrota: "...Interesante. Esa fuerza nace de lo que sientes.", pk: [[430], [169], [130], [229], [473], [461]] },
    ghetsis:  { nombre: "Ghechis", equipo: "plasma", poder: "tera", intro: "¡Nadie puede oponerse al Equipo Plasma! ¡Nadie!",
        derrota: "¡Imposible! ¡Mis planes no pueden fallar así!", pk: [[563], [626], [537], [625], [604], [635, "life-orb"]] },
    guzma:    { nombre: "Guzmán", equipo: "skull", poder: "z", intro: "¡El gran Guzmán está aquí! ¡Destrozarlo todo es lo mío!",
        derrota: "¿¡Qué!? ¿¡Cómo has podido!? ...Bah.", pk: [[168], [284], [212], [738], [127], [768, "buginium-z--held"]] },
    lusamine: { nombre: "Samina", f: true, equipo: "aether", poder: null, intro: "Mis queridos Pokémon y yo seremos bellos para siempre.",
        derrota: "¿Por qué...? Tanto amor y aun así pierdo...", pk: [[549], [429], [350], [760], [36], [793]] },
    rose:     { nombre: "Rose", equipo: "macro", poder: "dinamax", intro: "Todo lo hago por el futuro de la región. Espero que lo entiendas.",
        derrota: "Una gestión impecable... salvo por ti.", pk: [[589], [598], [863], [601], [823], [879]] },
};
const COMANDANTES_SOMBRA = {
    archer:   { nombre: "Atlas", equipo: "rocket", intro: "El jefe volverá, y tú no vas a impedirlo.", derrota: "Grr... El jefe no me lo perdonará.", pk: [[169], [24], [110], [229], [53]] },
    ariana:   { nombre: "Atenea", f: true, equipo: "rocket", intro: "¿Un niño con ganas de jugar? Qué pena me das.", derrota: "No está mal... para ser un crío.", pk: [[24], [89], [71], [110], [45]] },
    proton:   { nombre: "Protón", equipo: "rocket", intro: "Dicen que soy el más cruel del Team Rocket. Compruébalo.", derrota: "¡No puede ser! ¡Mis Pokémon venenosos!", pk: [[42], [89], [110], [454], [169]] },
    petrel:   { nombre: "Petrel", equipo: "rocket", intro: "¡Ja! ¡A ver si adivinas quién soy de verdad!", derrota: "Vale, vale... Me has pillado.", pk: [[110], [89], [24], [229], [51]] },
    tabitha:  { nombre: "Tatiano", equipo: "magma", intro: "¡Je, je! Magno me ha pedido que no pase nadie.", derrota: "¡Je...! Qué vergüenza...", pk: [[262], [169], [219], [324], [323]] },
    courtney: { nombre: "Carola", f: true, equipo: "magma", intro: "Analizando... Tú. Eres. Un estorbo.", derrota: "Error... Error en el cálculo.", pk: [[262], [169], [324], [78], [323]] },
    matt:     { nombre: "Matías", equipo: "aqua", intro: "¡Uooooh! ¡Me encanta combatir! ¡Vamos allá!", derrota: "¡Uooh! ¡Qué combate más bueno!", pk: [[262], [279], [73], [365], [319]] },
    shelly:   { nombre: "Silvina", f: true, equipo: "aqua", intro: "¿Otra vez metiendo las narices donde no te llaman?", derrota: "¡Arg! ¡Qué rabia me das!", pk: [[262], [73], [279], [130], [319]] },
    mars:     { nombre: "Venus", f: true, equipo: "galaxia", intro: "Helio quiere un mundo nuevo, y yo se lo voy a dar.", derrota: "¡No! ¡No puedo fallarle a Helio!", pk: [[432], [169], [426], [435], [437]] },
    jupiter:  { nombre: "Ceres", f: true, equipo: "galaxia", intro: "Qué fastidio. Acabemos rápido.", derrota: "Tch. Eres más fuerte de lo que parecías.", pk: [[435], [169], [437], [454], [461]] },
    saturn:   { nombre: "Saturno", equipo: "galaxia", intro: "Nada personal. Solo cumplo órdenes.", derrota: "Entendido. Has ganado.", pk: [[64], [437], [454], [169], [435]] },
    colress:  { nombre: "Acromo", equipo: "plasma", musica: "battle_colress", intro: "¡Quiero ver hasta dónde llega la fuerza de tus Pokémon!", derrota: "¡Fascinante! ¡Qué datos tan valiosos!", pk: [[601], [462], [474], [606], [604]] },
    plumeria: { nombre: "Francine", f: true, equipo: "skull", intro: "¿Te has metido con mis chicos? Ahora te las ves conmigo.", derrota: "Vale... Tú ganas. Por esta vez.", pk: [[10113], [169], [454], [110], [758]] },
    faba:     { nombre: "Fabio", equipo: "aether", intro: "¡Soy el director de la Fundación Æther! ¡Muestra un poco de respeto!", derrota: "¡Esto es inadmisible! ¡Inadmisible!", pk: [[97], [10114], [178], [765], [65]] },
    oleana:   { nombre: "Olivia", f: true, equipo: "macro", musica: "battle_oleana", intro: "El presidente no tiene tiempo para ti. Yo me encargo.", derrota: "Qué... molesto.", pk: [[478], [758], [763], [350], [569]] },
};
const RONDAS_SOMBRA = ["Primer piso", "Segundo piso", "Tercer piso", "Azotea"];
const PREMIO_SOMBRA = [6000, 9000, 15000, 30000];
const rivalSombra = (k) => JEFES_SOMBRA[k] || COMANDANTES_SOMBRA[k];
function sombra() {
    if (!entrenador.sombra || typeof entrenador.sombra !== "object") entrenador.sombra = {};
    const t = entrenador.sombra;
    ["ronda", "completadas", "jugados", "victorias"].forEach((k) => { t[k] = Math.max(0, Number(t[k]) || 0); });
    if (!Array.isArray(t.rivales) || t.rivales.length !== 4 || t.rivales.some((k) => !rivalSombra(k))) { t.rivales = []; t.activo = false; }
    return t;
}
const nivelSombra = (ronda) => limitar(Math.max(72, ...entrenador.equipo.map((id) => entrenador.capturados[id].nivel || 5)) + ronda * 2 + Math.round(dificultad().lider / 3), 1, 100);
async function specsSombra(k, ronda) {
    const R = rivalSombra(k), nivel = nivelSombra(ronda), D = dificultad();
    const specs = R.pk.map(([id, objeto], i) => ({ id, nivel: limitar(nivel - (i === R.pk.length - 1 ? 0 : 2), 1, 100), objeto: objeto || null, probOculta: 0.5 }));
    specs.forEach((s) => marcarVisto(s.id));
    return reforzarEquipo(specs, D, true);
}
const musicaSombra = (k, ronda) => mus(ronda === 3 ? "battle_final" : JEFES_SOMBRA[k] ? EQUIPOS_SOMBRA[JEFES_SOMBRA[k].equipo].jefe : rivalSombra(k).musica || EQUIPOS_SOMBRA[rivalSombra(k).equipo].comandante);
async function combateSombra() {
    const t = sombra(); if (!t.activo) return renderAventura();
    const k = t.rivales[t.ronda], R = rivalSombra(k), jefe = !!JEFES_SOMBRA[k], E = EQUIPOS_SOMBRA[R.equipo];
    try {
        curarEquipo();
        mostrarCargaBatalla({ vs: true, sprite: k, titulo: R.nombre, estilo: "malvado" });
        AudioFX.musicaSonar(musicaSombra(k, t.ronda));
        const D = dificultad();
        const [aliados, enemigos] = await Promise.all([prepararEquipo(await specsMiEquipo()), prepararEquipo(await specsSombra(k, t.ronda))]);
        t.enCombate = true; guardarEntrenador();   // (si se deja a medias, se pierde)
        Combate.iniciar({
            aliados, enemigos, salvaje: false, permitirCaptura: false, premio: 0, poderRival: jefe ? R.poder : null,
            curasRival: jefe ? { n: Math.max(1, D.curas.campeon - 1), objeto: D.objetoCura } : null, ia: 1, cambiosRival: Math.max(0.5, D.cambios),
            titulo: `${R.nombre} · ${E.nombre}`, entrenadorSprite: k, dialogo: R.intro, dialogoDerrota: R.derrota,
            musica: musicaSombra(k, t.ronda), musicaEncuentro: t.ronda === 3 ? mus("encounter_final") : undefined, victoria: MUSICA.victoriaVillano, fondo: t.ronda === 3 ? "g6-darkcity" : "g6-dampcave",
            bolsa: entrenador.mochila, guardarBolsa: guardarEntrenador, evolucionar: evolucionarEnCombate,
            darXP: true, expShare: () => config.expShare, generoJugador: entrenador.genero,
            alTerminar: async (r) => { sincronizarEquipoCombate(r.equipo); await finCombateSombra(r); },
        });
    } catch (_) { errorCombate(); }
}
async function finCombateSombra(r) {
    const t = sombra(); t.enCombate = false;
    curarEquipo();
    if (r && r.gano) {
        const dinero = Math.round(PREMIO_SOMBRA[t.ronda] * dificultad().dinero);
        entrenador.dinero = (entrenador.dinero || 0) + dinero; entrenador.batallasGanadas++; entrenador.entrenadoresVencidos = (entrenador.entrenadoresVencidos || 0) + 1;
        t.victorias++; t.ronda++;
        if (t.ronda >= 4) {
            t.activo = false; t.ronda = 0; t.completadas++;
            const premios = darObjetos(t.completadas === 1 ? [["master-ball", 1], ["rare-candy", 3]]
                : [alAzar([["big-nugget", 1], ["ability-patch", 1], ["gold-bottle-cap", 1], ["pp-max", 2]]), ["rare-candy", 3]]);
            guardarEntrenador(); lanzarConfeti(); AudioFX.efecto("item_fanfare");
            toast(`¡Has limpiado la Torre Sombra! +${dineroTexto(dinero)} y ${textoPremios(premios)}.`, 6000);
        } else {
            guardarEntrenador();
            toast(`¡Has superado el ${RONDAS_SOMBRA[t.ronda - 1].toLowerCase()}! +${dineroTexto(dinero)}. Tu equipo se recupera.`, 4200);
        }
    } else {
        t.activo = false; t.ronda = 0; guardarEntrenador();
        toast("Te han echado de la Torre Sombra... Tu equipo se recupera. ¡Vuelve cuando quieras!", 4200);
    }
    subAventura = "sombra"; renderAventura();
}
function entrarSombra() {
    const t = sombra(), coms = mezclar(Object.keys(COMANDANTES_SOMBRA)), jefes = mezclar(Object.keys(JEFES_SOMBRA));
    Object.assign(t, { activo: true, ronda: 0, rivales: [coms[0], coms[1], jefes[0], jefes[1]], enCombate: false }); t.jugados++;
    guardarEntrenador(); AudioFX.ui("select");
}
function renderTorreSombra(cont) {
    const t = sombra();
    if (!entrenador.campeon) { subAventura = "principal"; return renderAventura(); }
    let aviso = "";
    if (t.enCombate) { aviso = "Dejaste un combate a medias: te han echado de la torre."; Object.assign(t, { enCombate: false, activo: false, ronda: 0 }); guardarEntrenador(); }
    AudioFX.musicaSonar(mus("battle_final_encounter"));
    const tarjeta = (k, i) => {
        const R = rivalSombra(k), estado = !t.activo ? "" : i < t.ronda ? "hecha" : i === t.ronda ? "actual" : "";
        return `<article class="tn-rival ${estado}">
            <span class="hub-etq">${RONDAS_SOMBRA[i]}</span>
            <canvas class="lg-npc" data-sprite="${k}"></canvas>
            <b>${R.nombre}</b><small>${EQUIPOS_SOMBRA[R.equipo].nombre}</small>
            <div class="tn-equipo">${R.pk.map(([id]) => htmlIcono(id, "tn-icono")).join("")}</div>
            ${estado === "hecha" ? '<i class="tn-sello">Vencido</i>' : ""}
        </article>`;
    };
    const lista = Object.keys(JEFES_SOMBRA).map((k) => `<span class="tn-mini" title="${JEFES_SOMBRA[k].nombre} · ${EQUIPOS_SOMBRA[JEFES_SOMBRA[k].equipo].nombre}"><canvas class="lg-npc" data-sprite="${k}"></canvas><small>${JEFES_SOMBRA[k].nombre}</small></span>`).join("");
    cont.innerHTML = `
        <div class="cabecera-modo con-volver">
            <button class="btn-volver" data-volver>Salir</button>
            <h2>Torre Sombra</h2>
        </div>
        <section class="lugar-cabecera torneo-cabecera">
            <img class="lc-fondo" src="${urlFondo("g6-darkcity")}" alt="">
            <div class="lc-info">
                <span class="hub-etq">Distrito Sombra · Nivel ${nivelSombra(0)}+</span>
                <h2>Los villanos de otras regiones</h2>
                <p>Cuatro combates seguidos, piso a piso, contra comandantes y jefes. Tu equipo se cura antes de cada uno. Arriba del todo espera el peor de todos.</p>
            </div>
        </section>
        ${aviso ? `<p class="nota aviso">${aviso}</p>` : ""}
        <div class="metro-datos">
            <div class="ventana-pk"><small>Veces superada</small><b class="num-pk">${t.completadas}</b></div>
            <div class="ventana-pk"><small>Combates ganados</small><b class="num-pk">${t.victorias}</b></div>
            <div class="ventana-pk"><small>Intentos</small><b class="num-pk">${t.jugados}</b></div>
        </div>
        ${t.activo ? `
        <section class="metro-viaje">
            <span class="hub-etq">${RONDAS_SOMBRA[t.ronda]} · te espera: ${rivalSombra(t.rivales[t.ronda]).nombre}</span>
            <div class="tn-cuadro">${t.rivales.map(tarjeta).join("")}</div>
            <div class="metro-acciones">
                <button class="btn-grande" data-combatir>${t.ronda === 3 ? "¡Subir a la azotea!" : "¡Al combate!"}</button>
                <button class="btn-sec" data-retirarse>Salir de la torre</button>
            </div>
        </section>` : `
        <section class="metro-viaje">
            <span class="hub-etq">Jefes que se esconden en la torre</span>
            <div class="tn-lista">${lista}</div>
            <div class="metro-acciones"><button class="btn-grande" data-entrar>Entrar en la torre</button></div>
        </section>`}
        <p class="nota">Premios: ${PREMIO_SOMBRA.map(dineroTexto).join(" · ")} por piso y, arriba, un objeto muy raro. Perder o salir te devuelve a la entrada, pero no pierdes dinero.</p>`;
    pintarIconos(cont);
    cont.querySelectorAll("canvas[data-sprite]").forEach((cv) => Atlas.cargar(urlEntrenadorPR(cv.dataset.sprite)).then((a) => { cv.width = a.w; cv.height = a.h; Atlas.dibujar(cv, a, 0); }).catch(() => {}));
    cont.querySelector("[data-volver]").onclick = () => { subAventura = "principal"; renderAventura(); };
    const be = cont.querySelector("[data-entrar]");
    if (be) be.onclick = () => { if (equipoDebilitado()) curarEquipo(); entrarSombra(); renderTorreSombra(cont); };
    const bc = cont.querySelector("[data-combatir]"); if (bc) bc.onclick = () => combateSombra();
    const br = cont.querySelector("[data-retirarse]");
    if (br) br.onclick = () => {
        if (br.dataset.seguro !== "1") { br.dataset.seguro = "1"; br.textContent = "¿Seguro? Vuelves a la entrada"; return; }
        Object.assign(t, { activo: false, ronda: 0 }); guardarEntrenador(); toast("Sales de la torre."); renderTorreSombra(cont);
    };
}

// ===================== LEYENDA DEL DÍA =====================
// Para los Campeones: cada día, un legendario que aún no tienes (de los que no tienen su propia zona) se deja ver en una
// zona de la región. Si lo atrapas o lo vences, hasta mañana no aparece otro. Así, con el tiempo, se pueden tener todos.
function leyendaDelDia() {
    if (typeof entrenador === "undefined" || !entrenador || !entrenador.campeon) return null;
    const dia = hoyISO(), fijos = new Set(Object.values(EVENTOS_POKEMON).map((e) => e.especie));
    const cand = [...LEGENDARIOS].filter((id) => !fijos.has(id) && !entrenador.capturados[id] && !companeroFusion(id)).sort((a, b) => a - b);
    if (!cand.length) return null;
    const rnd = semilla(`leyenda:${dia}:${entrenador.creada || 0}`);
    const especie = cand[Math.floor(rnd() * cand.length)];
    const zonas = Object.values(LUGARES).filter((L) => L.tipo === "zona" && L.bioma && L.nivel).sort((a, b) => (a.id < b.id ? -1 : 1));
    const L = zonas[Math.floor(rnd() * zonas.length)];
    return { L, ev: { id: `leyenda-${dia}`, especie, nivel: limitar(Math.max(L.nivel[1] + 4, 75), 1, 100), titulo: "Una presencia legendaria",
        lineas: ["El aire se vuelve pesado y todo se queda en silencio...", `¡${nombrePk(especie)} aparece ante ti!`] } };
}
const noticiaLeyenda = () => { const x = leyendaDelDia(); return x && !hecho(x.ev.id) ? `Se ha visto un Pokémon legendario en ${x.L.nombre}.` : null; };

// ===================== MOSTAZ, MAESTRO DEL DOJO =====================
// En Ciudad Tormenta, para los Campeones: el viejo maestro de Galar acepta un combate cada día y da un premio.
const EQUIPO_MOSTAZ = [[620], [405], [823], [784], [892, "black-belt"]];
function retarMostaz() {
    const nivel = nivelSombra(0);
    combateEntrenador({
        titulo: "Maestro Mostaz", sprite: "mustard", vs: true, pago: "lider", poderRival: "dinamax", fondo: "thunderplains", musica: mus("battle_mustard"),
        dialogo: "¡Ju, ju! Un Campeón en mi dojo. ¡A ver qué sabes hacer!", dialogoDerrota: "¡Magnífico! Hacía años que no me divertía tanto.",
        specs: async () => EQUIPO_MOSTAZ.map(([id, objeto], i) => ({ id, nivel: i === EQUIPO_MOSTAZ.length - 1 ? nivel : nivel - 2, objeto: objeto || null })),
        alGanar: async () => {
            if (entrenador.mostaza === hoyISO()) return;
            entrenador.mostaza = hoyISO();
            const premios = darObjetos([alAzar([["rare-candy", 3], ["pp-up", 2], ["bottle-cap", 1], ["ability-capsule", 1]])]);
            guardarEntrenador(); toast(`¡Mostaz te da un premio! Recibes: ${textoPremios(premios)}.`, 4200);
        },
    });
}

// ===================== TARJETAS DE LOS LUGARES =====================
// La entrada de la Torre Sombra y, en los pueblos, el evento de temporada con su regalo.
const _tarjetasAntesEventos = typeof tarjetasLugarExtra === "function" ? tarjetasLugarExtra : null;
tarjetasLugarExtra = (L) => {
    const previas = _tarjetasAntesEventos ? _tarjetasAntesEventos(L) : [];
    const out = [];
    if (L.id === "distrito-sombra") {
        const t = sombra();
        out.push({ html: `<button class="lg-tarjeta lg-edificio torneo" data-sub="sombra">
            <canvas class="lg-npc" data-sprite="giovanni"></canvas>
            <div class="lg-info"><span class="hub-etq">Edificio</span><h3>Torre Sombra</h3><p>${t.activo ? `Vas por el ${RONDAS_SOMBRA[t.ronda].toLowerCase()}.` : "Los jefes villanos de otras regiones te esperan dentro."}</p></div>
        </button>` });
    }
    const ley = leyendaDelDia();
    if (ley && ley.L.id === L.id && !hecho(ley.ev.id)) {
        out.push({ html: `<article class="lg-tarjeta lg-evento legendario">
            <span class="lg-poke-evento">${htmlIcono(ley.ev.especie, "lg-icono-evento")}</span>
            <div class="lg-info"><span class="hub-etq">Leyenda del día</span><h3>${ley.ev.titulo}</h3><p>Solo por hoy, algo muy poderoso se deja ver por aquí...</p></div>
            <button class="btn-grande" data-leyenda>Investigar</button>
        </article>`, conectar: (cont) => { const b = cont.querySelector("[data-leyenda]"); if (b) b.onclick = () => iniciarEvento(ley.L, ley.ev); } });
    }
    if (L.id === "ciudad-tormenta" && entrenador.campeon) {
        const hecho = entrenador.mostaza === hoyISO();
        out.push({ html: `<article class="lg-tarjeta lg-evento rival">
            <canvas class="lg-npc" data-sprite="mustard"></canvas>
            <div class="lg-info"><span class="hub-etq">Dojo</span><h3>Maestro Mostaz</h3><p>${hecho ? "Hoy ya te ha dado su premio, pero puedes volver a retarlo." : "Acepta un combate al día y da un premio."}</p></div>
            <button class="btn-grande" data-mostaza>¡Combatir!</button>
        </article>`, conectar: (cont) => { const b = cont.querySelector("[data-mostaza]"); if (b) b.onclick = () => retarMostaz(); } });
    }
    const T = temporadaActiva();
    if (T && T.id === "halloween" && esPoblado(L) && entrenador.equipo.length) {
        const f = entrenador.genero !== "f", hecho = entrenador.disfrazado === hoyISO();
        out.push({ html: `<article class="lg-tarjeta lg-evento temporada">
            <canvas class="lg-npc" data-sprite="${f ? "halloween_rival_f" : "halloween_rival_m"}"></canvas>
            <div class="lg-info"><span class="hub-etq">Halloween</span><h3>${f ? "Una entrenadora disfrazada" : "Un entrenador disfrazado"}</h3><p>${hecho ? "Hoy ya te ha dado su trato. ¡Vuelve mañana!" : "¡Truco o trato! Reta a quien quiera combatir."}</p></div>
            ${hecho ? "" : '<button class="btn-grande" data-disfrazado>¡Truco o trato!</button>'}
        </article>`, conectar: (cont) => { const b = cont.querySelector("[data-disfrazado]"); if (b) b.onclick = () => retarDisfrazado(); } });
    }
    if (T && esPoblado(L)) {
        const listo = !regaloRecogido(T);
        out.push({ html: `<article class="lg-tarjeta lg-evento temporada">
            <img class="lg-npc-img" src="${urlItem(T.icono)}" alt="">
            <div class="lg-info"><span class="hub-etq">Evento · hasta el ${hastaTemporada(T)}</span><h3>${T.nombre}</h3><p>${T.texto}</p></div>
            ${listo ? '<button class="btn-grande" data-regalo-temporada>Recoger regalo</button>' : ""}
        </article>`, conectar: (cont) => { const b = cont.querySelector("[data-regalo-temporada]"); if (b) b.onclick = () => { recogerRegalo(T); renderAventura(); }; } });
    }
    return previas.concat(out);
};

// ===================== MISIONES DIARIAS =====================
MISIONES.push(
    { id: "forma", icono: "ice-stone", txt: () => "Captura una forma regional", metas: [1], valor: () => entrenador.formasCapturadas || 0, si: () => nMedallas() >= 3 },
    { id: "torneo", icono: "gold-bottle-cap", txt: (n) => `Gana ${n} combates en el Torneo Corona`, metas: [2, 3], valor: () => torneo().victorias, si: () => !!entrenador.campeon },
);

// ===================== LOGROS =====================
LOGROS.push(
    { id: "sombra-1", nombre: "Fin de las sombras", desc: "Supera la Torre Sombra del Distrito Sombra.", icono: "dusk-stone", meta: 1, valor: () => sombra().completadas, premio: [["ability-patch", 1]] },
    { id: "sombra-5", nombre: "Azote de villanos", desc: "Supera 5 veces la Torre Sombra.", icono: "dark-gem", meta: 5, valor: () => sombra().completadas, premio: [["master-ball", 1]] },
    { id: "formas-10", nombre: "Viajero de otras regiones", desc: "Ten 10 formas regionales distintas.", icono: "ice-stone", meta: 10,
        valor: () => Object.keys(entrenador.capturados || {}).filter((k) => FORMAS_REGIONALES[k] && FORMAS_REGIONALES[k].region).length, premio: [["rare-candy", 3]] },
    { id: "formas-57", nombre: "Cuatro regiones en tu Caja", desc: "Ten las 57 formas regionales.", icono: "ice-stone", meta: 57,
        valor: () => Object.keys(entrenador.capturados || {}).filter((k) => FORMAS_REGIONALES[k] && FORMAS_REGIONALES[k].region).length, premio: [["master-ball", 1]] },
    { id: "legendario-10", nombre: "Cazador de leyendas", desc: "Captura 10 Pokémon legendarios.", icono: "soul-dew", meta: 10, valor: nLegendarios, premio: [["master-ball", 1]] },
    { id: "legendario-50", nombre: "Guardián de las leyendas", desc: "Captura 50 Pokémon legendarios.", icono: "soul-dew", meta: 50, valor: nLegendarios, premio: [["ability-patch", 1], ["master-ball", 1]] },
    { id: "temporada-1", nombre: "Fiesta en Aurelia", desc: "Recoge el regalo de un evento de temporada.", icono: "cherish-ball", meta: 1, valor: () => Object.keys(entrenador.regalosTemporada || {}).length, premio: [["rare-candy", 3]] },
);
