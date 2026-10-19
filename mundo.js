/* =========================================================
   MUNDO DE JUEGO · Región Aurelia
   16 gimnasios (cada uno con su música y su medalla), Liga Pokémon,
   rivales oficiales, dos equipos villanos y entrenadores de ruta.
   Sprites de personajes: PokéRogue (fangame). Medallas: PokéAPI.
   ========================================================= */

const REGION = "Aurelia";

// n: orden · lider: sprite PokéRogue · medalla: nº de imagen PokéAPI · as: Pokémon estrella
const GIMNASIOS = [
    { ciudad: "Pueblo Albor",       lider: "cheren",   nombre: "Cheren",  tipo: "normal",   medalla: 34, nombreMedalla: "Medalla Base",      as: 506, musica: mus("battle_unova_gym"),
      intro: "Un buen entrenador no presume: demuestra. Enséñame tu primer paso.", derrota: "Has entendido lo básico mejor que nadie. Sigue así." },
    { ciudad: "Villa Lúmina",       lider: "roxie",    nombre: "Hiedra",  tipo: "poison",   medalla: 35, nombreMedalla: "Medalla Tóxica",    as: 544, musica: musSD("bw2-homika-dogars"),
      intro: "¡Súbele el volumen! Mi veneno va a sonar más fuerte que tú.", derrota: "¡Qué ritmo! Me has dejado sin voz." },
    { ciudad: "Ciudad Hojarasca",   lider: "burgh",    nombre: "Camus",   tipo: "bug",      medalla: 36, nombreMedalla: "Medalla Insecto",   as: 541, musica: mus("battle_kalos_gym"),
      intro: "Mis bichos son obras de arte en movimiento. ¿Sabrás apreciarlas?", derrota: "Tu estilo me inspira un cuadro nuevo." },
    { ciudad: "Ciudad Voltia",      lider: "elesa",    nombre: "Camila",  tipo: "electric", medalla: 37, nombreMedalla: "Medalla Voltio",    as: 523, musica: mus("battle_galar_gym"),
      intro: "Las luces de la pasarela son para mí. Intenta no deslumbrarte.", derrota: "Brillas con luz propia. Me encanta." },
    { ciudad: "Ciudad Cantera",     lider: "clay",     nombre: "Yakón",   tipo: "ground",   medalla: 38, nombreMedalla: "Medalla Temblor",   as: 530, musica: mus("battle_hoenn_gym"),
      intro: "Aquí se trabaja duro, chaval. Vamos a ver de qué pasta estás hecho.", derrota: "Tienes agallas. Te has ganado esta medalla." },
    { ciudad: "Ciudad Celeste Alta", lider: "skyla",   nombre: "Gerania", tipo: "flying",   medalla: 39, nombreMedalla: "Medalla Jet",       as: 581, musica: mus("battle_paldea_gym"),
      intro: "¡Despegamos! A ver si puedes seguirme el vuelo.", derrota: "¡Aterrizaje perfecto el tuyo! Enhorabuena." },
    { ciudad: "Ciudad Escama",      lider: "drayden",  nombre: "Lirio",   tipo: "dragon",   medalla: 41, nombreMedalla: "Medalla Leyenda",   as: 612, musica: mus("battle_sinnoh_gym"),
      intro: "Los dragones exigen respeto. Muéstrame que lo tienes.", derrota: "Tu vínculo con tus Pokémon es digno de un dragón." },
    { ciudad: "Puerto Marea",       lider: "marlon",   nombre: "Ciprián", tipo: "water",    medalla: 42, nombreMedalla: "Medalla Ola",       as: 593, musica: mus("battle_johto_gym"),
      intro: "¡Cuidado con la marea, que hoy viene fuerte!", derrota: "¡Me has arrastrado como una ola gigante!" },
    { ciudad: "Ciudad Peñasco",     lider: "brock",    nombre: "Brock",   tipo: "rock",     medalla: 1,  nombreMedalla: "Medalla Roca",      as: 464, musica: mus("battle_kanto_gym"),
      intro: "Mi defensa es dura como la roca. ¿Podrás romperla?", derrota: "Has partido la roca. Impresionante." },
    { ciudad: "Ciudad Jardín",      lider: "erika",    nombre: "Erika",   tipo: "grass",    medalla: 4,  nombreMedalla: "Medalla Arcoíris",  as: 45,  musica: musSD("bw2-kanto-gym-leader"),
      intro: "Qué agradable visita... Aunque mis flores no serán tan amables.", derrota: "Has florecido como entrenador. Enhorabuena." },
    { ciudad: "Isla Volcán",        lider: "blaine",   nombre: "Blaine",  tipo: "fire",     medalla: 7,  nombreMedalla: "Medalla Volcán",    as: 467, musica: mus("battle_hoenn_elite"),
      intro: "¡Hoooh! ¿Tienes preparado el antiquemar? ¡Lo vas a necesitar!", derrota: "¡Me has apagado la llama! Te lo has ganado." },
    { ciudad: "Ciudad Mente",       lider: "sabrina",  nombre: "Sabrina", tipo: "psychic",  medalla: 6,  nombreMedalla: "Medalla Pantano",   as: 65,  musica: mus("battle_unova_elite"),
      intro: "Ya sabía que vendrías. También sé cómo acabará esto.", derrota: "No lo vi venir... Eres toda una sorpresa." },
    { ciudad: "Ciudad Neblina",     lider: "morty",    nombre: "Morty",   tipo: "ghost",    medalla: 12, nombreMedalla: "Medalla Niebla",    as: 94,  musica: mus("battle_kalos_elite"),
      intro: "Entre la niebla ven cosas que otros no ven. ¿Te atreves?", derrota: "Tu luz ha disipado mi niebla." },
    { ciudad: "Ciudad Faro",        lider: "jasmine",  nombre: "Yasmina", tipo: "steel",    medalla: 14, nombreMedalla: "Medalla Mineral",   as: 208, musica: mus("battle_alola_elite"),
      intro: "Eh... encantada. Mis Pokémon de acero no se rinden fácilmente.", derrota: "Eres muy fuerte... Toma, te la has ganado." },
    { ciudad: "Pueblo Escarcha",    lider: "pryce",    nombre: "Fredo",   tipo: "ice",      medalla: 15, nombreMedalla: "Medalla Glaciar",   as: 473, musica: mus("battle_galar_elite"),
      intro: "El hielo enseña paciencia. Veamos cuánto aguantas el frío.", derrota: "Has derretido el hielo de este viejo corazón." },
    { ciudad: "Ciudad Tormenta",    lider: "chuck",    nombre: "Aníbal",  tipo: "fighting", medalla: 13, nombreMedalla: "Medalla Tormenta",  as: 62,  musica: mus("battle_paldea_elite"),
      intro: "¡WAHAHA! ¡Mi entrenamiento es a puño limpio! ¡En guardia!", derrota: "¡Me has ganado con todas las de la ley!" },
];
GIMNASIOS.forEach((g, i) => {
    g.n = i + 1;
    g.nivel = 12 + i * 5;                                    // nivel del as
    g.tamano = [2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 5, 5, 6, 6, 6, 6][i];
});

// Liga Pokémon (tras las 16 medallas).
const LIGA = [
    { lider: "shauntal", nombre: "Anís",    titulo: "Alto Mando Anís",    tipo: "ghost",    as: 609, nivel: 90, musica: mus("battle_unova_elite"),
      intro: "Tu historia merece un capítulo final... ¿será feliz?", derrota: "Qué final tan inesperado. Me encanta." },
    { lider: "grimsley", nombre: "Aza",     titulo: "Alto Mando Aza",     tipo: "dark",     as: 625, nivel: 91, musica: MUSICA.altoMando,
      intro: "La vida es una apuesta. Hoy apuesto contra ti.", derrota: "Has ganado la mano. Bien jugado." },
    { lider: "caitlin",  nombre: "Catleya", titulo: "Alto Mando Catleya", tipo: "psychic",  as: 576, nivel: 92, musica: mus("battle_kalos_elite"),
      intro: "Espero que no me aburras. Me has despertado de la siesta.", derrota: "Qué combate tan elegante..." },
    { lider: "marshal",  nombre: "Lotto",   titulo: "Alto Mando Lotto",   tipo: "fighting", as: 534, nivel: 93, musica: musSD("spl-elite4"),
      intro: "Solo el que entrena cada día puede superarme.", derrota: "Tu espíritu es más fuerte que mis puños." },
    { lider: "iris",     nombre: "Iris",    titulo: "Campeona Iris",      tipo: "dragon",   as: 612, nivel: 95, musica: MUSICA.campeon, campeon: true,
      intro: "¡Por fin llegas! Soy la Campeona y no pienso ponértelo fácil.", derrota: "¡Increíble! Eres el nuevo Campeón de Aurelia." },
];

// Rivales oficiales: aparecen al conseguir ciertas medallas.
const RIVALES = [
    { id: "matis1", sprite: "hugh",   nombre: "Matís",  tras: 1,  tamano: 2, intro: "¡Eh! Antes de seguir, ¡quiero comprobar lo fuerte que eres!", derrota: "Grr... La próxima vez te ganaré." },
    { id: "tilo",   sprite: "hau",    nombre: "Tilo",   tras: 3,  tamano: 3, tipos: ["electric", "normal"], intro: "¡Hola! ¡Tenía ganas de verte! ¿Combatimos?", derrota: "¡Jajaja, qué pasada! Eres buenísimo." },
    { id: "roxy",   sprite: "marnie", nombre: "Roxy",   tras: 5,  tamano: 3, tipos: ["dark"], intro: "No he venido a hacer amigos. He venido a ganar.", derrota: "...No está mal. Nada mal." },
    { id: "matis2", sprite: "hugh",   nombre: "Matís",  tras: 8,  tamano: 4, intro: "¡Llevo entrenando sin parar! ¡Esta vez va en serio!", derrota: "¿Otra vez...? Tengo que ser más fuerte." },
    { id: "bede",   sprite: "bede",   nombre: "Bede",   tras: 10, tamano: 4, tipos: ["psychic", "fairy"], intro: "Espero que estés a mi altura. Lo dudo mucho.", derrota: "¡Imposible! ¡Esto no quedará así!" },
    { id: "mencia", sprite: "nemona", nombre: "Mencía", tras: 12, tamano: 5, tipos: ["electric", "fighting"], intro: "¡Por fin un combate de verdad! ¡Dalo todo!", derrota: "¡Qué emoción! ¡Hay que repetirlo!" },
    { id: "cass",   sprite: "kieran", nombre: "Cass",   tras: 13, tamano: 5, tipos: ["dragon", "grass"], intro: "He cambiado. Ya no soy el de antes.", derrota: "Aún... no es suficiente." },
    { id: "azul",   sprite: "blue",   nombre: "Azul",   tras: 14, tamano: 6, tipos: ["rock", "ground", "flying"], intro: "¿Tú eres el que va por ahí ganando medallas? Qué gracioso.", derrota: "¡Tsk! Supongo que no eres tan malo." },
    { id: "matis3", sprite: "hugh",   nombre: "Matís",  tras: 16, tamano: 6, intro: "Antes de la Liga, ¡demuéstrame que mereces llegar!", derrota: "Ve a por la Liga. ¡Y gana por los dos!" },
];

// Cada rival con su tema: Matís (Hugh) el de su juego, Tilo (Hau) el de Sol y Luna, Mencía y Cass los de sus campeonatos…
const MUSICA_RIVAL = {
    matis1: musSD("bw2-rival"), matis2: musSD("bw2-rival"), matis3: mus("battle_rival_3"), tilo: musSD("sm-rival"), roxy: musSD("xy-rival"),
    bede: mus("battle_rival_2"), mencia: mus("battle_champion_nemona"), cass: mus("battle_champion_kieran"), azul: mus("battle_kanto_champion"),
};
// Dos equipos villanos (nombres inventados; atuendos y personajes de PokéRogue).
const EQUIPOS_VILLANOS = {
    eclipse: {
        nombre: "Equipo Eclipse", lema: "Un mundo nuevo nacerá cuando el sol se apague.", tipos: ["fire", "dark"],
        musicaRecluta: mus("battle_flare_grunt"), musicaJefe: mus("battle_flare_boss"),
    },
    nebulosa: {
        nombre: "Equipo Nebulosa", lema: "Las estrellas no tienen dueño... salvo nosotros.", tipos: ["poison", "dark", "fairy"],
        musicaRecluta: mus("battle_star_grunt"), musicaComandante: mus("battle_star_admin"), musicaJefe: mus("battle_star_boss"),
    },
};
// Eventos de historia (misiones) de los villanos, desbloqueados por medallas.
const MISIONES_VILLANO = [
    { id: "ecl1", equipo: "eclipse", tras: 2,  sprite: "flare_grunt_m", nombre: "Recluta Eclipse", tamano: 2, musica: "recluta",
      intro: "¡El Equipo Eclipse necesita esos Pokémon! ¡Apártate!", derrota: "¡Esto no ha terminado! ¡El Equipo Eclipse volverá!" },
    { id: "ecl2", equipo: "eclipse", tras: 4,  sprite: "mable", nombre: "Comandante Rubí", tamano: 3, musica: "recluta", tipos: ["fire"],
      intro: "Así que tú eres el que molesta a mis reclutas. Qué fastidio.", derrota: "Tch... Informaré de esto al jefe." },
    { id: "ecl3", equipo: "eclipse", tras: 6,  sprite: "xerosic", nombre: "Doctor Ión", tamano: 4, musica: "recluta", tipos: ["electric", "steel"],
      intro: "Interesante espécimen. Te usaré para mis experimentos.", derrota: "Fascinante... Mis cálculos fallaron." },
    { id: "ecl4", equipo: "eclipse", tras: 7,  sprite: "lysandre", nombre: "Solaris, líder del Equipo Eclipse", tamano: 5, musica: "jefe", jefe: true,
      intro: "El mundo está roto y yo lo arreglaré. Nadie me detendrá, ni siquiera tú.", derrota: "Imposible... Mi eclipse... se ha disipado." },
    { id: "neb1", equipo: "nebulosa", tras: 9,  sprite: "star_grunt_f", nombre: "Recluta Nebulosa", tamano: 3, musica: "recluta",
      intro: "¡Alto ahí! ¡Esta zona es territorio del Equipo Nebulosa!", derrota: "¡Nooo! ¡Nuestra constelación!" },
    { id: "neb2", equipo: "nebulosa", tras: 11, sprite: "giacomo", nombre: "Comandante Vega", tamano: 4, musica: "comandante", tipos: ["dark"],
      intro: "Pon el ritmo que quieras, yo pondré el final.", derrota: "Has cortado mi canción a la mitad." },
    { id: "neb3", equipo: "nebulosa", tras: 13, sprite: "mela", nombre: "Comandante Lyra", tamano: 5, musica: "comandante", tipos: ["fire"],
      intro: "¡Te voy a quemar hasta las cenizas!", derrota: "¡Arg! ¡Qué rabia!" },
    { id: "neb4", equipo: "nebulosa", tras: 15, sprite: "penny", nombre: "Nova, líder del Equipo Nebulosa", tamano: 6, musica: "jefe", jefe: true, tipos: ["fairy", "normal"],
      intro: "Lo creé todo desde las sombras. No dejaré que lo destruyas.", derrota: "...Supongo que hasta las estrellas se apagan." },
];
// Reclutas que aparecen en la hierba (combates de ruta) según el progreso.
const RECLUTAS = [
    { equipo: "eclipse",  sprites: ["flare_grunt_m", "flare_grunt_f"], nombre: "Recluta Eclipse",  desde: 2, hasta: 8 },
    { equipo: "nebulosa", sprites: ["star_grunt_m", "star_grunt_f"],   nombre: "Recluta Nebulosa", desde: 9, hasta: 16 },
];

// Entrenadores de ruta (personajes secundarios) y su música de encuentro.
const CLASES_ENTRENADOR = [
    { sprite: "youngster_m",   nombre: "Joven",            enc: "youngster" },
    { sprite: "youngster_f",   nombre: "Chica",            enc: "lass" },
    { sprite: "school_kid_m",  nombre: "Colegial",         enc: "youngster" },
    { sprite: "school_kid_f",  nombre: "Colegiala",        enc: "lass" },
    { sprite: "bug_catcher",   nombre: "Cazabichos",       enc: "youngster" },
    { sprite: "camper_m",      nombre: "Campista",         enc: "youngster" },
    { sprite: "camper_f",      nombre: "Dominguera",       enc: "lass" },
    { sprite: "hiker",         nombre: "Montañero",        enc: "backpacker" },
    { sprite: "backpacker_m",  nombre: "Mochilero",        enc: "backpacker" },
    { sprite: "backpacker_f",  nombre: "Mochilera",        enc: "backpacker" },
    { sprite: "ranger_m",      nombre: "Pokémon Ranger",   enc: "backpacker" },
    { sprite: "black_belt_m",  nombre: "Karateka",         enc: "roughneck" },
    { sprite: "black_belt_f",  nombre: "Karateka",         enc: "roughneck" },
    { sprite: "psychic_m",     nombre: "Médium",           enc: "psychic" },
    { sprite: "psychic_f",     nombre: "Médium",           enc: "psychic" },
    { sprite: "hex_maniac",    nombre: "Ocultista",        enc: "psychic" },
    { sprite: "beauty",        nombre: "Bella",            enc: "parasol_lady" },
    { sprite: "parasol_lady",  nombre: "Dama Parasol",     enc: "parasol_lady" },
    { sprite: "dancer",        nombre: "Bailarín",         enc: "parasol_lady" },
    { sprite: "fisherman",     nombre: "Pescador",         enc: "roughneck" },
    { sprite: "sailor",        nombre: "Marinero",         enc: "roughneck" },
    { sprite: "roughneck",     nombre: "Macarra",          enc: "roughneck" },
    { sprite: "guitarist",     nombre: "Guitarrista",      enc: "roughneck" },
    { sprite: "swimmer_m",     nombre: "Nadador",          enc: "ace_trainer" },
    { sprite: "swimmer_f",     nombre: "Nadadora",         enc: "ace_trainer" },
    { sprite: "ace_trainer_m", nombre: "Entrenador Guay",  enc: "ace_trainer" },
    { sprite: "ace_trainer_f", nombre: "Entrenadora Guay", enc: "ace_trainer" },
    { sprite: "veteran_m",     nombre: "Veterano",         enc: "ace_trainer" },
    { sprite: "veteran_f",     nombre: "Veterana",         enc: "ace_trainer" },
    { sprite: "dragon_tamer",  nombre: "Domadragón",       enc: "ace_trainer" },
    { sprite: "scientist_m",   nombre: "Científico",       enc: "scientist" },
    { sprite: "scientist_f",   nombre: "Científica",       enc: "scientist" },
    { sprite: "pokefan_m",     nombre: "Pokéfan",          enc: "pokefan" },
    { sprite: "pokefan_f",     nombre: "Pokéfan",          enc: "pokefan" },
    { sprite: "breeder_m",     nombre: "Criador",          enc: "pokefan" },
    { sprite: "breeder_f",     nombre: "Criadora",         enc: "pokefan" },
    { sprite: "rich_m",        nombre: "Caballero",        enc: "rich" },
    { sprite: "rich_f",        nombre: "Dama",             enc: "rich" },
    { sprite: "rich_kid_m",    nombre: "Niño Bien",        enc: "rich" },
    { sprite: "rich_kid_f",    nombre: "Niña Bien",        enc: "rich" },
    { sprite: "cyclist_m",     nombre: "Ciclista",         enc: "cyclist" },
    { sprite: "cyclist_f",     nombre: "Ciclista",         enc: "cyclist" },
    { sprite: "worker_m",      nombre: "Operario",         enc: "clerk" },
    { sprite: "officer",       nombre: "Policía",          enc: "clerk" },
    { sprite: "twins",         nombre: "Gemelas",          enc: "twins" },
];
// Tipos de cada clase (como en los juegos: el Cazabichos lleva bichos, el Pescador Pokémon de agua…).
const TIPOS_CLASE = {
    youngster_m: ["normal", "bug"], youngster_f: ["normal", "fairy"], school_kid_m: ["normal", "electric"], school_kid_f: ["psychic", "fairy"],
    bug_catcher: ["bug"], camper_m: ["grass", "ground"], camper_f: ["grass", "bug"], hiker: ["rock", "ground"],
    backpacker_m: ["ground", "normal"], backpacker_f: ["grass", "flying"], ranger_m: ["grass", "bug", "flying"],
    black_belt_m: ["fighting"], black_belt_f: ["fighting"], psychic_m: ["psychic"], psychic_f: ["psychic", "fairy"], hex_maniac: ["ghost", "dark"],
    beauty: ["fairy", "normal"], parasol_lady: ["water", "fairy"], dancer: ["flying", "fairy"], fisherman: ["water"], sailor: ["water", "fighting"],
    roughneck: ["dark", "poison"], guitarist: ["electric", "poison"], swimmer_m: ["water"], swimmer_f: ["water"],
    veteran_m: ["fighting", "steel"], veteran_f: ["dragon", "flying"], dragon_tamer: ["dragon"], scientist_m: ["electric", "steel"],
    scientist_f: ["psychic", "electric"], pokefan_m: ["normal", "electric"], pokefan_f: ["fairy", "normal"], breeder_m: ["normal", "grass"],
    breeder_f: ["fairy", "normal"], rich_m: ["normal", "fire"], rich_f: ["fairy", "normal"], rich_kid_m: ["normal", "electric"],
    rich_kid_f: ["fairy", "normal"], cyclist_m: ["flying", "normal"], cyclist_f: ["electric", "flying"], worker_m: ["steel", "rock"],
    officer: ["fire", "dark"], twins: ["normal", "fairy"],
};
// Los Entrenadores Guay llevan una pareja de tipos que combinan bien.
const PAREJAS_TIPOS = [["fire", "flying"], ["water", "ice"], ["dragon", "ground"], ["dark", "ghost"], ["electric", "steel"], ["grass", "poison"],
    ["psychic", "fairy"], ["rock", "fighting"], ["water", "electric"], ["fire", "ground"], ["bug", "steel"], ["ice", "dragon"]];
const tiposDeClase = (c) => TIPOS_CLASE[c.sprite] || alAzar(PAREJAS_TIPOS);
const NOMBRES_NPC = {
    m: ["Álex", "Bruno", "Dani", "Fer", "Gael", "Hugo", "Jaime", "Mario", "Óscar", "Raúl", "Teo", "Iker", "Marcos", "Pablo"],
    f: ["Carla", "Elena", "Inés", "Lara", "Nora", "Paula", "Sara", "Vera", "Lucía", "Nuria", "Alba", "Irene"],
};
const esClaseFemenina = (c) => !!c.fem || c.sprite.endsWith("_f") || ["hex_maniac", "beauty", "beauty_2", "parasol_lady", "twins", "aroma_lady", "mysterious_sisters"].includes(c.sprite);
const nombreNPC = (c) => `${c.nombre} ${c.pareja ? alAzar(c.pareja) : ["twins", "mysterious_sisters"].includes(c.sprite) ? alAzar(["Ana y Eva", "Lía y Mía", "Sol y Luz"]) : alAzar(NOMBRES_NPC[esClaseFemenina(c) ? "f" : "m"])}`;
const FRASES_NPC = [
    "¡Eh, tú! ¡Nuestras miradas se han cruzado!", "¡Te reto a un combate!", "¡Mis Pokémon están listos!",
    "¡No me subestimes!", "¡Llevo todo el día esperando a alguien como tú!", "¡Vamos a ver quién entrena mejor!",
];
const musicaEncuentro = (clave) => mus("encounter_" + clave);

// ===================== RETOS PARA DESBLOQUEAR CADA LÍDER =====================
// Antes de retar al líder hay que cumplir sus objetivos (como las pruebas de
// los gimnasios de Blanco 2): victorias en la ruta, una misión y los
// entrenadores del gimnasio. El progreso se reinicia con cada medalla.
const VENTAJA_TIPO = {
    normal: "fighting", poison: "psychic", bug: "fire", electric: "ground", ground: "water", flying: "electric",
    dragon: "ice", water: "grass", rock: "water", grass: "fire", fire: "water", psychic: "dark",
    ghost: "dark", steel: "fire", ice: "fire", fighting: "flying",
};
// Cada líder pide más: más victorias, dos misiones a partir del 5.º gimnasio (y en Difícil/Extremo) y más entrenadores.
function objetivosDe(g) {
    const i = g.n - 1, D = dificultad(), x = (n) => Math.max(1, Math.round(n * D.retos));
    const misiones = [
        { id: "tipo", meta: 1, tipo: VENTAJA_TIPO[g.tipo] },
        { id: "especies", meta: x(3 + Math.floor(i / 3)) },
        { id: "nivel", meta: Math.min(100, g.nivel + Math.round(D.lider / 2)) },
        { id: "racha", meta: x(4 + Math.floor(i / 4)) },
    ];
    const lista = [{ id: "ruta", meta: x(Math.min(12, 3 + Math.floor(i / 2))) }, misiones[i % 4]];
    if (i >= 4 || D.retos > 1) lista.push(misiones[(i + 2) % 4]);
    lista.push({ id: "gimnasio", meta: i < 5 ? 2 : i < 11 ? 3 : 4 });
    return lista;
}

// ===================== DIFICULTAD =====================
// Tres modos, y ninguno es un paseo. Cuanto más difícil: rivales y salvajes de más nivel, equipos más grandes y más
// entrenados (esfuerzo y naturaleza), con objetos equipados y curas en pleno combate, una IA más lista (remata y, desde
// Difícil, cambia de Pokémon cuando le conviene), retos de líder más largos y menos premios.
// curas: pociones de cada tipo de entrenador por combate · ia: probabilidad de elegir su mejor jugada · cambios: de cambiar
// de Pokémon si lo tiene muy mal · esfuerzo: 0 nada, 1 medio, 2 al máximo (ruta: entrenadores normales; lider: líderes,
// rivales, jefes y Liga) · objetos / objetosLider: "", "algunos" (bayas y objetos sencillos) o "todos" (de competición).
const DIFICULTADES = {
    normal: {
        nombre: "Normal", color: "#4caf50", desc: "Ya es un reto: rivales por encima de tu nivel, líderes entrenados y con objetos, curas en los combates importantes y una IA que remata cuando puede.",
        salvaje: 1, entrenador: 2, lider: 4, extra: 0, extraLider: 1, objetos: "", objetosLider: "algunos", esfuerzo: { ruta: 0, lider: 1 },
        curas: { ruta: 0, gimnasio: 0, rival: 1, villano: 1, lider: 1, alto: 2, campeon: 2 }, objetoCura: "super-potion",
        premios: 1, dinero: 1, hallazgo: 1, retos: 1, ia: 0.9, iaSalvaje: 0.8, cambios: 0, inicial: 1,
    },
    dificil: {
        nombre: "Difícil", color: "#ff9800", desc: "Rivales mucho más fuertes y entrenados, equipos más grandes, objetos de competición en los líderes y una IA que cambia de Pokémon cuando le conviene. Menos premios.",
        salvaje: 3, entrenador: 5, lider: 8, extra: 1, extraLider: 2, objetos: "algunos", objetosLider: "todos", esfuerzo: { ruta: 1, lider: 2 },
        curas: { ruta: 0, gimnasio: 1, rival: 2, villano: 2, lider: 2, alto: 3, campeon: 3 }, objetoCura: "hyper-potion",
        premios: 0.7, dinero: 0.8, hallazgo: 0.7, retos: 1.35, ia: 1, iaSalvaje: 0.9, cambios: 0.4, inicial: 0.6,
    },
    extremo: {
        nombre: "Extremo", color: "#e53935", desc: "Solo para expertos: equipos completos entrenados al máximo, objetos de competición, curas totales y una IA sin piedad que cambia y remata. Casi sin premios.",
        salvaje: 5, entrenador: 8, lider: 12, extra: 2, extraLider: 3, objetos: "todos", objetosLider: "todos", esfuerzo: { ruta: 2, lider: 2 },
        curas: { ruta: 1, gimnasio: 2, rival: 3, villano: 3, lider: 3, alto: 4, campeon: 5 }, objetoCura: "full-restore",
        premios: 0.45, dinero: 0.6, hallazgo: 0.5, retos: 1.7, ia: 1, iaSalvaje: 1, cambios: 0.75, inicial: 0.4,
    },
};
const dificultad = () => DIFICULTADES[(typeof entrenador !== "undefined" && entrenador && entrenador.dificultad) || "normal"] || DIFICULTADES.normal;
// Objetos que llevan los Pokémon rivales según la dificultad (todos funcionan en el combate).
const OBJETOS_RIVAL = {
    algunos: ["oran-berry", "sitrus-berry", "lum-berry", "quick-claw", "kings-rock", "shell-bell", "muscle-band", "wise-glasses"],
    todos: ["leftovers", "life-orb", "choice-scarf", "choice-band", "choice-specs", "focus-sash", "expert-belt", "assault-vest",
        "rocky-helmet", "sitrus-berry", "lum-berry", "scope-lens", "wide-lens", "weakness-policy", "air-balloon", "mental-herb", "zoom-lens",
        "metronome", "safety-goggles", "protective-pads", "blunder-policy"],
};
// Entrenadores de cada gimnasio según su tipo (clases y trajes de PokéRogue).
const ENTRENADORES_GIMNASIO = {
    normal:   [{ sprite: "school_kid_m", nombre: "Colegial" }, { sprite: "school_kid_f", nombre: "Colegiala" }],
    poison:   [{ sprite: "guitarist", nombre: "Guitarrista" }, { sprite: "musician", nombre: "Músico" }],
    bug:      [{ sprite: "harlequin", nombre: "Arlequín" }, { sprite: "bug_catcher", nombre: "Cazabichos" }],
    electric: [{ sprite: "beauty", nombre: "Modelo" }, { sprite: "beauty_2", nombre: "Modelo" }],
    ground:   [{ sprite: "worker_m", nombre: "Operario" }, { sprite: "worker_f", nombre: "Operaria" }],
    flying:   [{ sprite: "pilot", nombre: "Piloto" }, { sprite: "bird_keeper_f", nombre: "Ornitóloga" }],
    dragon:   [{ sprite: "dragon_tamer", nombre: "Domadragón" }, { sprite: "ace_trainer_f", nombre: "Entrenadora Guay" }],
    water:    [{ sprite: "swimmer_m", nombre: "Nadador" }, { sprite: "scuba_diver_f", nombre: "Buceadora" }],
    rock:     [{ sprite: "hiker", nombre: "Montañero" }, { sprite: "ruin_maniac", nombre: "Ruinamaníaco" }],
    grass:    [{ sprite: "aroma_lady", nombre: "Aromaterapeuta" }, { sprite: "parasol_lady", nombre: "Dama Parasol" }],
    fire:     [{ sprite: "firebreather", nombre: "Tragafuegos" }, { sprite: "scientist_m", nombre: "Científico" }],
    psychic:  [{ sprite: "psychic_m", nombre: "Médium" }, { sprite: "psychic_f", nombre: "Médium" }],
    ghost:    [{ sprite: "hex_maniac", nombre: "Ocultista" }, { sprite: "mysterious_sisters", nombre: "Hermanas Misterio" }],
    steel:    [{ sprite: "worker_m", nombre: "Operario" }, { sprite: "janitor", nombre: "Conserje" }],
    ice:      [{ sprite: "snow_worker_m", nombre: "Operario Nevado" }, { sprite: "snow_ace_trainer_f", nombre: "Entrenadora Guay" }],
    fighting: [{ sprite: "black_belt_m", nombre: "Karateka" }, { sprite: "black_belt_f", nombre: "Karateka" }],
};
const FRASES_GIMNASIO = [
    "¡Para llegar hasta el líder tendrás que pasar por encima de mí!",
    "¡Entreno aquí cada día! No me lo pondrás fácil.",
    "El líder solo recibe a quien demuestra su valía. ¡Demuéstralo!",
];
// Recompensa en dinero por nivel del Pokémon más fuerte del rival (como en los juegos).
const PAGO_POR_NIVEL = { ruta: 40, gimnasio: 60, villano: 50, rival: 80, lider: 100, alto: 120, campeon: 200 };
