/* =========================================================
   MODO REGIÓN · Aurelia con pueblos, ciudades y rutas
   Se viaja de lugar en lugar por el mapa de la región: cada ruta tiene sus
   Pokémon salvajes y sus entrenadores, cada pueblo su Centro Pokémon y su
   tienda, y por el camino esperan eventos de personajes (rivales, villanos,
   vecinos) y de Pokémon (enjambres, legendarios, el Snorlax dormido…).
   Combates, gimnasios, tienda, Centro y mochila son los de siempre; el
   modo clásico sigue disponible desde la tarjeta de entrenador.
   Fondos: Pokémon Showdown · Música y personajes: PokéRogue.
   ========================================================= */

// ===================== BIOMAS =====================
// tipos: los Pokémon de la zona · noche: los que solo salen de noche · clases: entrenadores que la recorren
const BIOMAS = {
    pradera:  { tipos: ["normal", "flying", "bug", "grass"], fondo: "g6-meadow", musica: "plains", clases: ["youngster_m", "youngster_f", "camper_m", "camper_f", "school_kid_f"] },
    pantano:  { tipos: ["poison", "water", "bug"], noche: ["ghost"], fondo: "river", musica: "swamp", clases: ["fisherman", "hex_maniac", "backpacker_m", "roughneck"] },
    bosque:   { tipos: ["bug", "grass", "poison"], noche: ["ghost", "dark"], fondo: "g6-forest", musica: "forest", clases: ["bug_catcher", "ranger_m", "camper_f", "backpacker_f"] },
    llanura:  { tipos: ["electric", "normal", "steel"], fondo: "thunderplains", musica: "power_plant", clases: ["guitarist", "scientist_m", "cyclist_f", "school_kid_m"] },
    cantera:  { tipos: ["ground", "rock", "fighting"], fondo: "g6-desert", musica: "badlands", clases: ["hiker", "worker_m", "black_belt_m", "backpacker_m"] },
    cumbre:   { tipos: ["flying", "rock", "normal"], fondo: "mountain", musica: "mountain", clases: ["hiker", "ranger_m", "cyclist_m", "veteran_f"] },
    valle:    { tipos: ["dragon", "flying", "ground"], fondo: "g6-orasdesert", musica: "wasteland", clases: ["dragon_tamer", "ace_trainer_m", "veteran_f"] },
    playa:    { tipos: ["water", "flying", "ground"], fondo: "g6-beach", musica: "beach", clases: ["swimmer_m", "swimmer_f", "fisherman", "sailor", "parasol_lady"] },
    cueva:    { tipos: ["rock", "ground", "steel"], noche: ["ghost", "dark"], fondo: "earthycave", musica: "cave", clases: ["hiker", "hex_maniac", "black_belt_f", "worker_m"] },
    jardin:   { tipos: ["grass", "bug", "fairy"], fondo: "meadow", musica: "meadow", clases: ["beauty", "parasol_lady", "breeder_f", "camper_f"] },
    mar:      { tipos: ["water", "fire", "flying"], fondo: "g6-orassea", musica: "sea", clases: ["swimmer_f", "sailor", "fisherman", "rich_m"] },
    ruinas:   { tipos: ["psychic", "fairy", "rock"], fondo: "g6-orasdesert", musica: "ruins", clases: ["psychic_m", "psychic_f", "scientist_f", "dancer"] },
    niebla:   { tipos: ["ghost", "dark", "poison"], noche: ["ghost"], fondo: "g6-dampcave", musica: "graveyard", clases: ["hex_maniac", "psychic_f", "roughneck"] },
    costa:    { tipos: ["steel", "electric", "water"], fondo: "g6-city", musica: "rocky_coast", clases: ["worker_m", "sailor", "scientist_m", "officer"] },
    nieve:    { tipos: ["ice", "water", "normal"], fondo: "g6-icecave", musica: "snowy_forest", clases: ["hiker", "black_belt_f", "ace_trainer_f"] },
    tormenta: { tipos: ["fighting", "electric", "flying"], fondo: "thunderplains", musica: "power_plant", clases: ["black_belt_m", "black_belt_f", "cyclist_m", "veteran_m"] },
    victoria: { tipos: ["dragon", "rock", "fighting", "dark"], fondo: "g6-earthycave", musica: "end_summit", clases: ["ace_trainer_m", "ace_trainer_f", "veteran_m", "veteran_f", "dragon_tamer"] },
    lago:     { tipos: ["water", "psychic", "fairy"], fondo: "river", musica: "lake", clases: [] },
    volcan:   { tipos: ["fire", "rock", "ground"], fondo: "volcanocave", musica: "volcano", clases: [] },
    cielo:    { tipos: ["electric", "flying", "dragon"], fondo: "g6-skypillar", musica: "power_plant", clases: [] },
    abismo:   { tipos: ["psychic", "dark", "ghost"], fondo: "g6-deepsea", musica: "abyss", clases: [] },
};

// ===================== LUGARES =====================
// tipo: pueblo | ciudad | ruta | zona · gym: nº de gimnasio · med: medallas para entrar · x, y: posición en el mapa (%)
const LUGARES = {};
const ORDEN_CAMINO = [];   // pueblos, rutas y ciudades en el orden de la aventura
function nuevoLugar(id, datos) { LUGARES[id] = Object.assign({ id, conexiones: [], med: 0 }, datos); return LUGARES[id]; }
function conectar(a, b) { LUGARES[a].conexiones.push(b); LUGARES[b].conexiones.push(a); }
const idCiudad = (n) => GIMNASIOS[n - 1].ciudad.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, "-");
(() => {
    // Ciudades de los gimnasios: posición, fondo y cómo son.
    const CIUDADES = [
        [7, 40, "route", "town", "Un pueblo tranquilo entre prados donde empiezan todos los viajes. Su gimnasio pone a prueba lo básico."],
        [15, 26, "river", "town", "Una villa de canales y marismas. Por la noche sus calles suenan a guitarra eléctrica."],
        [8, 9, "forest", "metropolis", "Una ciudad rodeada de bosque, llena de talleres de artistas y de Pokémon bicho."],
        [25, 5, "thunderplains", "metropolis", "La ciudad de las luces: pasarelas, neones y una central eléctrica que nunca duerme."],
        [38, 12, "desert", "town", "Una ciudad minera levantada junto a la cantera más grande de Aurelia."],
        [50, 4, "mountain", "town", "Construida sobre un pico, con un aeródromo donde despegan los Pokémon voladores."],
        [63, 10, "mountain", "town", "Una ciudad antigua donde se cuenta que los dragones enseñaron a los humanos a convivir con ellos."],
        [76, 5, "beachshore", "metropolis", "El gran puerto de la región. Barcos, mercados de pescado y olor a sal."],
        [90, 10, "earthycave", "town", "Excavada en la roca de la montaña. Sus mineros conocen cada fósil de Aurelia."],
        [93, 27, "meadow", "meadow", "Una ciudad de jardines y perfumes. Dicen que sus flores curan cualquier pena."],
        [86, 42, "volcanocave", "island", "Una isla al pie de un volcán dormido... de momento."],
        [90, 57, "city", "metropolis", "Una ciudad de institutos y laboratorios donde se estudian los poderes psíquicos."],
        [74, 58, "dampcave", "graveyard", "Siempre cubierta de niebla. Sus vecinos hablan de sombras que se mueven solas."],
        [60, 52, "beach", "metropolis", "Una ciudad costera con un faro enorme y los astilleros de acero de la región."],
        [46, 58, "icecave", "snowy_forest", "Un pueblo nevado donde el invierno no termina nunca."],
        [33, 50, "thunderplains", "metropolis", "Una ciudad azotada por tormentas donde se entrenan los luchadores más duros."],
    ];
    const BIOMA_RUTA = ["pradera", "pantano", "bosque", "llanura", "cantera", "cumbre", "valle", "playa", "cueva", "jardin", "mar", "ruinas", "niebla", "costa", "nieve", "tormenta", "victoria"];
    nuevoLugar("pueblo-raiz", { tipo: "pueblo", nombre: "Pueblo Raíz", x: 7, y: 57, fondo: "meadow", musica: "town",
        desc: "Tu pueblo natal. Aquí vive la Profesora Encina, que estudia la relación entre las personas y los Pokémon." });
    ORDEN_CAMINO.push("pueblo-raiz");
    let previo = "pueblo-raiz";
    GIMNASIOS.forEach((g, i) => {
        const n = i + 1, [x, y, fondo, musica, desc] = CIUDADES[i], id = idCiudad(n), a = LUGARES[previo];
        const L = GIMNASIOS[i].nivel;
        nuevoLugar(`ruta-${n}`, { tipo: "ruta", num: n, nombre: `Ruta ${n}`, bioma: BIOMA_RUTA[i], med: n - 1,
            x: (a.x + x) / 2, y: (a.y + y) / 2, nivel: [Math.max(2, L - 9), L - 4], hacia: g.ciudad });
        nuevoLugar(id, { tipo: /^(Pueblo|Villa)/.test(g.ciudad) ? "pueblo" : "ciudad", nombre: g.ciudad, gym: n, x, y, fondo, musica, desc, med: n - 1 });
        conectar(previo, `ruta-${n}`); conectar(`ruta-${n}`, id);
        ORDEN_CAMINO.push(`ruta-${n}`, id);
        previo = id;
    });
    nuevoLugar("ruta-17", { tipo: "ruta", num: 17, nombre: "Ruta 17", bioma: "victoria", med: 16, x: 36, y: 42, nivel: [80, 86], hacia: "Calle Victoria" });
    nuevoLugar("calle-victoria", { tipo: "zona", nombre: "Calle Victoria", bioma: "victoria", med: 16, x: 41, y: 33, nivel: [84, 90],
        desc: "La última prueba antes de la Liga: una cueva enorme donde entrenan los mejores." });
    nuevoLugar("liga", { tipo: "liga", nombre: "Liga Pokémon", med: 16, x: 51, y: 25, fondo: "city", musica: "end",
        desc: "El Alto Mando y la Campeona esperan a quien haya reunido las dieciséis medallas." });
    conectar(previo, "ruta-17"); conectar("ruta-17", "calle-victoria"); conectar("calle-victoria", "liga");
    ORDEN_CAMINO.push("ruta-17", "calle-victoria", "liga");
    // Zonas especiales (eventos de Pokémon).
    nuevoLugar("bosque-musgo", { tipo: "zona", nombre: "Bosque Musgo", bioma: "bosque", med: 2, x: 21, y: 17, nivel: [16, 21],
        desc: "Un bosque tan espeso que casi no entra la luz. Algo enorme sacude los árboles de vez en cuando." });
    nuevoLugar("lago-espejo", { tipo: "zona", nombre: "Lago Espejo", bioma: "lago", med: 8, x: 70, y: 21, nivel: [48, 53],
        desc: "Un lago de aguas tan quietas que reflejan el cielo como un espejo. Por aquí pasea algo muy rápido." });
    nuevoLugar("monte-brasa", { tipo: "zona", nombre: "Monte Brasa", bioma: "volcan", med: 11, x: 97, y: 49, nivel: [62, 67],
        desc: "El volcán de la isla. Sus rocas queman y la tierra retumba bajo los pies." });
    nuevoLugar("cumbre-tormenta", { tipo: "zona", nombre: "Cumbre Tormenta", bioma: "cielo", med: 16, x: 23, y: 45, nivel: [78, 84],
        desc: "Una cima donde los rayos caen sin parar. Algunos juran haber visto una bestia correr entre ellos." });
    nuevoLugar("cueva-celeste", { tipo: "zona", nombre: "Cueva Celeste", bioma: "abismo", med: 16, campeon: true, x: 60, y: 30, nivel: [88, 95],
        desc: "Una cueva sellada hasta que hubiera un nuevo Campeón. Dentro late un poder terrible." });
    conectar("ruta-3", "bosque-musgo"); conectar("ruta-9", "lago-espejo"); conectar("ruta-12", "monte-brasa");
    conectar("ruta-17", "cumbre-tormenta"); conectar("liga", "cueva-celeste");
})();
const esPoblado = (L) => L.tipo === "pueblo" || L.tipo === "ciudad";
const tieneHierba = (L) => L.tipo === "ruta" || (L.tipo === "zona" && L.bioma);

// ===================== EVENTOS =====================
// Pokémon: legendarios y encuentros especiales (una sola vez, se pueden capturar).
const EVENTOS_POKEMON = {
    "bosque-musgo":    { id: "heracross", especie: 214, nivel: 22, titulo: "Algo sacude los árboles",
        lineas: ["Las copas de los árboles se agitan con fuerza...", "¡Un Heracross salvaje baja de un tronco y te corta el paso!"] },
    "ruta-10":         { id: "snorlax", especie: 143, nivel: 50, titulo: "Un Pokémon dormido bloquea el camino", flauta: true,
        lineas: ["Un Pokémon enorme duerme en mitad del camino. No hay forma de pasar.", "Tocas la Pokéflauta...", "¡El Snorlax se ha despertado de muy mal humor!"] },
    "lago-espejo":     { id: "suicune", especie: 245, nivel: 55, titulo: "Una presencia en el lago",
        lineas: ["Una brisa helada recorre el lago...", "¡Suicune aparece sobre el agua!"] },
    "monte-brasa":     { id: "entei", especie: 244, nivel: 65, titulo: "Rugido en el volcán",
        lineas: ["La tierra tiembla y el aire arde...", "¡Entei ha salido del cráter!"] },
    "cumbre-tormenta": { id: "raikou", especie: 243, nivel: 80, titulo: "Truenos en la cumbre",
        lineas: ["Un rayo cae justo delante de ti...", "¡Raikou aparece entre los truenos!"] },
    "cueva-celeste":   { id: "mewtwo", especie: 150, nivel: 90, titulo: "Un poder que late",
        lineas: ["Al fondo de la cueva, algo te observa en silencio...", "¡Mewtwo se alza frente a ti!"] },
};
// Vecinos de cada pueblo: hablan, dan pistas y alguno regala algo (una sola vez).
const VECINOS = {
    "pueblo-raiz": [{ id: "profesora", sprite: "scientist_f", cargo: "Profesora", nombre: "Encina", color: "#4caf50",
        lineas: ["¡Hola, {nombre}! ¿List{o} para tu viaje por Aurelia?", "Toma, esto te vendrá bien: Poké Balls y unas Pociones.", "Hay dieciséis gimnasios en la región. Si reúnes todas sus medallas podrás retar a la Liga Pokémon.", "Y recuerda: cada ruta tiene sus propios Pokémon. ¡Explóralas todas!",
            "Ah, una cosa más: desde hace un tiempo hay Pokémon salvajes envueltos en un aura carmesí. Los llamamos Pokémon Furiosos.", "Son mucho más fuertes de lo normal... pero quien consigue calmarlos se lleva objetos muy valiosos. ¡Ten cuidado ahí fuera!"],
        regalo: [["poke-ball", 5], ["potion", 3]] }],
    "pueblo-albor": [{ id: "abuelo", sprite: "veteran_m", cargo: "Veterano", nombre: "Tomás", color: "#8d6e63",
        lineas: ["Los tipos lo son todo, chaval. El agua apaga el fuego, el fuego quema la planta y la planta absorbe el agua.", "Toma unas bayas: si se las das a tus Pokémon, se las comerán cuando lo necesiten."],
        regalo: [["oran-berry", 3]] }],
    "villa-lumina": [{ id: "pescador-lumina", sprite: "fisherman", cargo: "Pescador", nombre: "Paco", color: "#3f7fe0",
        lineas: ["¿Sabías que en cada ruta salen Pokémon distintos? Algunos solo aparecen de noche.", "Y en la Pokédex de la ruta verás cuáles has visto y cuáles te faltan."],
        cana: "old-rod", regaloCana: [["lure-ball", 5]],
        lineasCana: ["Por cierto, ¿te gusta pescar? Toma esta Caña Vieja, que yo ya tengo otra.", "Lánzala donde haya agua y, en cuanto pique algo, ¡tira enseguida! Y con las Cebo Ball se atrapan mejor."] }],
    "ciudad-hojarasca": [{ id: "criadora", sprite: "breeder_f", cargo: "Criadora", nombre: "Marta", color: "#e3609f",
        lineas: ["¡Qué equipo tan bonito tienes! Oye... tengo un Eevee que necesita un buen entrenador.", "¿Cuidarás de él? ¡Seguro que te lo agradece!"],
        pokemon: { id: 133, nivel: 18 } }],
    "ciudad-voltia": [{ id: "piloto", sprite: "pilot", cargo: "Piloto", nombre: "Ícaro", color: "#26a69a",
        lineas: ["¡Hola! Hago rutas en avioneta entre todas las ciudades de Aurelia.", "Desde ahora puedes volar a cualquier pueblo que ya hayas visitado. Búscalo en el mapa."],
        vuelo: true }],
    "ciudad-cantera": [{ id: "minero", sprite: "worker_m", cargo: "Minero", nombre: "Rufino", color: "#8d6e63",
        lineas: ["En la cantera encontramos de todo. Toma, a mí no me sirve de nada."], regalo: [["hard-stone", 1], ["nugget", 1]] }],
    "ciudad-celeste-alta": [{ id: "ornitologa", sprite: "bird_keeper_f", cargo: "Ornitóloga", nombre: "Ada", color: "#29b6f6",
        lineas: ["Cuentan que en el Lago Espejo, pasado Puerto Marea, se ha visto un Pokémon que corre sobre el agua.", "Si vas, lleva muchas Poké Balls."] }],
    "ciudad-escama": [{ id: "domadragon", sprite: "dragon_tamer", cargo: "Domadragón", nombre: "Ivo", color: "#7e57c2",
        lineas: ["Los dragones solo respetan a quien respeta a sus Pokémon.", "Toma este colmillo: potencia los ataques de tipo Dragón."], regalo: [["dragon-fang", 1]] }],
    "puerto-marea": [{ id: "marinero", sprite: "sailor", cargo: "Marinero", nombre: "Bruno", color: "#1e88e5",
        lineas: ["¡Ahoy! Los enjambres de Pokémon cambian cada día. Mira las noticias del Centro Pokémon.", "Toma, un regalo del puerto."], regalo: [["dive-ball", 3], ["net-ball", 3]],
        cana: "good-rod", lineasCana: ["¡Y llévate también esta Caña Buena! Con ella pican Pokémon bastante más fuertes."] }],
    "ciudad-penasco": [{ id: "flauta", sprite: "hiker", cargo: "Montañero", nombre: "Gregorio", color: "#6d4c41",
        lineas: ["¿Vas hacia Ciudad Jardín? Ten cuidado: un Snorlax enorme se ha dormido en mitad de la Ruta 10.", "Toma mi Pokéflauta. Con su música se despierta cualquier Pokémon dormido."],
        regalo: [["poke-flute", 1]] }],
    "ciudad-jardin": [{ id: "aromaterapeuta", sprite: "aroma_lady", cargo: "Aromaterapeuta", nombre: "Flora", color: "#66bb6a",
        lineas: ["Las flores de esta ciudad curan hasta el corazón más triste.", "Llévate esta semilla: da fuerza a los ataques de tipo Planta."], regalo: [["miracle-seed", 1]] }],
    "isla-volcan": [{ id: "tragafuegos", sprite: "firebreather", cargo: "Tragafuegos", nombre: "Pirro", color: "#ef6c00",
        lineas: ["¡Jojo! El Monte Brasa lleva días rugiendo. Algo muy caliente se esconde en el cráter.", "Toma, para que no te quemes."], regalo: [["burn-heal", 3], ["charcoal", 1]] }],
    "ciudad-mente": [{ id: "medium", sprite: "psychic_f", cargo: "Médium", nombre: "Selene", color: "#ab47bc",
        lineas: ["Veo en tu futuro... un combate muy importante.", "Toma esta cuchara. Mis visiones dicen que la necesitarás."], regalo: [["twisted-spoon", 1]] }],
    "ciudad-neblina": [{ id: "ocultista", sprite: "hex_maniac", cargo: "Ocultista", nombre: "Umbra", color: "#5e35b1",
        lineas: ["Jejeje... Por las noches, en la Ruta 13 salen Pokémon que de día nadie ve.", "Te regalo esto... si te atreves a llevarlo."], regalo: [["spell-tag", 1]] }],
    "ciudad-faro": [{ id: "operaria", sprite: "worker_f", cargo: "Operaria", nombre: "Irene", color: "#78909c",
        lineas: ["En los astilleros usamos el mejor acero de Aurelia. Te dejo un poco."], regalo: [["metal-coat", 1]],
        cana: "super-rod", lineasCana: ["Mi abuelo era el farero y el mejor pescador de la costa. Quédate su Supercaña: en estas aguas pican Pokémon tremendos."] }],
    "pueblo-escarcha": [{ id: "anciana", sprite: "veteran_f", cargo: "Veterana", nombre: "Nieves", color: "#4fc3f7",
        lineas: ["Aquí el frío no se va nunca, pero la gente tiene el corazón caliente.", "Toma una Piedra Hielo. A algunos Pokémon les encanta."], regalo: [["ice-stone", 1]] }],
    "ciudad-tormenta": [{ id: "karateka", sprite: "black_belt_m", cargo: "Karateka", nombre: "Kenzo", color: "#e53935",
        lineas: ["¡Uooh! En la Cumbre Tormenta, pasada la Ruta 17, vive una bestia que corre con el rayo.", "¡Solo los más fuertes pueden verla!"] }],
};

// ===================== ESTADO DEL MUNDO (en la partida) =====================
function mundo() {
    if (!entrenador.mundo) {
        // Partidas anteriores: aparecen en la ciudad de su última medalla, con el camino ya recorrido.
        const n = nMedallas(), lugar = n ? idCiudad(n) : "pueblo-raiz";
        entrenador.mundo = { lugar, visitados: ORDEN_CAMINO.slice(0, ORDEN_CAMINO.indexOf(lugar) + 1), hechos: n || entrenador.equipo.length > 1 ? ["profesora"] : [],
            vencidos: {}, tablas: {}, entrenadores: {}, objetos: [], ultimoCentro: lugar };
    }
    const m = entrenador.mundo;
    ["visitados", "hechos", "objetos"].forEach((k) => { if (!Array.isArray(m[k])) m[k] = []; });
    ["vencidos", "tablas", "entrenadores"].forEach((k) => { if (!m[k] || typeof m[k] !== "object") m[k] = {}; });
    if (!LUGARES[m.lugar]) m.lugar = "pueblo-raiz";
    return m;
}
const lugarActual = () => LUGARES[mundo().lugar];
const hecho = (id) => mundo().hechos.includes(id);
function marcarHecho(id) { const m = mundo(); if (!m.hechos.includes(id)) m.hechos.push(id); guardarEntrenador(); }
// Al perder: vuelves al último Centro Pokémon que visitaste.
function volverAlCentro() { const m = mundo(); m.lugar = m.ultimoCentro || "pueblo-raiz"; guardarEntrenador(); }
// Por qué no se puede entrar (o null si se puede).
function bloqueoDe(L) {
    if (L.campeon && !entrenador.campeon) return { quien: "officer", txt: L.cerrado || "Esta cueva está sellada. Solo el Campeón de la Liga puede entrar." };
    if (nMedallas() < L.med) {
        const g = GIMNASIOS[L.med - 1];
        return { quien: "officer", txt: `¡Alto! Solo los entrenadores con la ${g.nombreMedalla} pueden pasar. Consíguela en el gimnasio de ${g.ciudad}.` };
    }
    if (L.id === idCiudad(10) && !hecho("snorlax")) return { quien: null, txt: "Un Snorlax enorme duerme en mitad de la Ruta 10 y no te deja pasar." };
    return null;
}
// Eventos de historia (rivales y villanos) y dónde esperan: los rivales en la ruta siguiente a su ciudad y los villanos en la ciudad siguiente.
const lugarMision = (ms) => (ms.equipo ? idCiudad(Math.min(16, ms.tras + 1)) : `ruta-${Math.min(17, ms.tras + 1)}`);
const misionesAqui = (L) => misionesPendientes().filter((ms) => lugarMision(ms) === L.id);
const nombreLugar = (id) => (LUGARES[id] ? LUGARES[id].nombre : id);

// ===================== TIEMPO ATMOSFÉRICO DE LA REGIÓN =====================
// Cada día, cada ruta o zona tiene su tiempo (según su bioma; en las cuevas no llueve). Los combates de allí empiezan con
// él, con la lluvia salen más Pokémon de tipo Agua (con el sol, Fuego…) y la furia carmesí se desata más en las tormentas.
// [tiempo o null (despejado), peso]
const CLIMA_BIOMA = {
    pradera: [[null, 7], ["lluvia", 2], ["sol", 1]], pantano: [[null, 5], ["lluvia", 5]], bosque: [[null, 3], ["lluvia", 1]],
    llanura: [[null, 2], ["lluvia", 1]], cantera: [[null, 5], ["arena", 3], ["sol", 2]], cumbre: [[null, 6], ["nieve", 2], ["sol", 2]],
    valle: [[null, 4], ["arena", 4], ["sol", 2]], playa: [[null, 5], ["sol", 4], ["lluvia", 1]], jardin: [[null, 5], ["sol", 4], ["lluvia", 1]],
    mar: [[null, 2], ["lluvia", 1]], ruinas: [[null, 7], ["arena", 3]], niebla: [[null, 7], ["lluvia", 3]], costa: [[null, 7], ["lluvia", 3]],
    nieve: [[null, 1], ["nieve", 3]], tormenta: [[null, 3], ["lluvia", 7]], lago: [[null, 8], ["lluvia", 2]], volcan: [[null, 3], ["sol", 7]],
    cielo: [[null, 4], ["lluvia", 6]],
};
const CLIMA_TIPO = { lluvia: "water", sol: "fire", arena: "ground", nieve: "ice" };   // (el tipo que abunda con cada tiempo)
const _climas = new Map();
function climaDeLugar(L) {
    const tabla = L && L.bioma && CLIMA_BIOMA[L.bioma]; if (!tabla) return null;
    const hoy = new Date().toISOString().slice(0, 10), k = L.id + ":" + hoy;
    if (!_climas.has(k)) {
        const rnd = semilla(`clima:${hoy}:${L.id}:${entrenador.creada || 0}`);
        let r = rnd() * tabla.reduce((s, x) => s + x[1], 0);
        _climas.set(k, (tabla.find((x) => (r -= x[1]) < 0) || tabla[0])[0]);
    }
    const t = _climas.get(k);
    return t === "sol" && claseHora() === "noche" ? null : t;   // (de noche no hay sol)
}

// El parte del tiempo de las noticias: dónde llueve, hace sol… hoy (en los lugares a los que ya se puede ir).
function pronosticoHoy() {
    const por = {};
    Object.values(LUGARES).filter((L) => L.bioma && L.med <= nMedallas() && !bloqueoDe(L)).forEach((L) => { const c = climaDeLugar(L); if (c) (por[c] = por[c] || []).push(L.nombre); });
    return Object.entries(por).map(([c, l]) => `${CLIMAS[c].nombre}: ${l.slice(0, 3).join(", ")}${l.length > 3 ? "…" : ""}`).join(" · ");
}

// ===================== PESCA =====================
// Con una caña se pesca donde hay agua (pantanos, playas, el mar, la costa, el lago y los pueblos con canales o puerto):
// solo Pokémon de tipo Agua, más fuertes cuanto mejor es la caña. Al lanzar hay que esperar y tirar en cuanto pica.
const BIOMAS_AGUA = new Set(["pantano", "playa", "mar", "costa", "lago"]);
const PUEBLOS_AGUA = new Set(["villa-lumina", "puerto-marea", "isla-volcan", "ciudad-faro"]);
const CANAS = ["super-rod", "good-rod", "old-rod"];   // (de la mejor a la peor)
const puedePescar = (L) => !!L && (BIOMAS_AGUA.has(L.bioma) || PUEBLOS_AGUA.has(L.id));
const mejorCana = () => CANAS.find((k) => tieneObjeto(k)) || null;
// Niveles de lo que pica con cada caña (en los pueblos, según su gimnasio).
function rangoPesca(L, cana) {
    const g = L.gym ? GIMNASIOS[L.gym - 1].nivel : 10;
    const [a, b] = L.nivel || [Math.max(2, g - 8), Math.max(5, g - 3)];
    if (cana === "old-rod") return [Math.max(2, a - 12), Math.max(5, a - 6)];
    if (cana === "good-rod") return [Math.max(5, a - 3), Math.max(8, b - 1)];
    return [Math.max(10, a + 1), Math.min(100, b + 4)];
}
// Lo que pica en cada sitio con cada caña (siempre igual en cada partida).
const _pesca = new Map();
async function tablaPesca(L, cana) {
    const k = `${L.id}:${cana}:${entrenador.creada || 0}`;
    if (_pesca.has(k)) return _pesca.get(k);
    const [min, max] = rangoPesca(L, cana), rnd = semilla("pesca:" + k);
    let pool = []; try { pool = await poolDeTipos(["water"], min, max); } catch (_) { pool = []; }
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    const pesos = cana === "old-rod" ? [40, 30, 20] : cana === "good-rod" ? [30, 25, 20, 15] : [25, 22, 18, 15, 12, 8];
    const t = { min, max, tabla: pool.slice(0, pesos.length).map((id, i) => ({ id, peso: pesos[i] })) };
    if (t.tabla.length) _pesca.set(k, t);
    return t;
}
// Lanzar la caña: se espera y, cuando pica («!»), hay poco tiempo para tirar (menos cuanto mejor es la caña).
async function abrirPesca(L) {
    const cana = mejorCana(); if (!cana) return;
    if (equipoDebilitado()) return avisoDebilitado();
    const capa = document.createElement("div");
    capa.className = "capa-pesca";
    capa.innerHTML = `<div class="pz-caja">
        <div class="pz-escena" style="background-image:url('${urlFondo(fondoDe(L))}')"><img class="pz-cana" src="${urlObj(cana)}" alt=""><img class="pz-emote" src="${EMOTES["!"]}" alt=""></div>
        <p class="pz-texto ventana-pk">…</p>
        <div class="pz-botones"><button class="btn-grande" data-tirar>Lanzar</button><button class="btn-sec" data-salir>Dejarlo</button></div>
    </div>`;
    document.body.appendChild(capa); document.body.style.overflow = "hidden";
    const texto = capa.querySelector(".pz-texto"), boton = capa.querySelector("[data-tirar]"), emote = capa.querySelector(".pz-emote");
    let estado = "listo", reloj = null, pico = 0;
    const ventana = { "old-rod": 1400, "good-rod": 1150, "super-rod": 950 }[cana];
    const cerrar = () => { clearTimeout(reloj); capa.remove(); document.body.style.overflow = ""; document.removeEventListener("keydown", tecla); };
    const fin = (msg) => { clearTimeout(reloj); estado = "listo"; emote.classList.remove("ver"); capa.classList.remove("pica"); texto.textContent = msg; boton.textContent = "Lanzar otra vez"; };
    const lanzar = () => {
        estado = "espera"; capa.classList.remove("pica"); emote.classList.remove("ver");
        texto.textContent = `Lanzas la ${obj(cana).nombre}… Espera a que pique.`; boton.textContent = "¡Tirar!";
        AudioFX.ui("select");
        if (Math.random() < 0.15) { reloj = setTimeout(() => fin("No pica nada… Prueba otra vez."), 2600 + Math.random() * 1500); return; }
        reloj = setTimeout(() => {
            estado = "pica"; pico = performance.now(); capa.classList.add("pica"); emote.classList.add("ver");
            texto.textContent = "¡Algo ha picado!"; AudioFX.efecto("pb_bounce_1", { vol: 0.6 });
            reloj = setTimeout(() => { if (estado === "pica") fin("¡Vaya! Se ha escapado…"); }, ventana);
        }, 1400 + Math.random() * 3200);
    };
    const tirar = async () => {
        if (estado === "listo") return lanzar();
        if (estado === "espera") { fin("Has tirado demasiado pronto y se ha espantado."); return; }
        if (estado !== "pica") return;
        estado = "tirando"; clearTimeout(reloj);
        texto.textContent = "¡Lo tienes!";
        AudioFX.efecto("pb_bounce_2", { vol: 0.6 });
        const t = await tablaPesca(L, cana);
        if (!t.tabla.length) return fin("Aquí no pica nada con esta caña.");
        let r = Math.random() * t.tabla.reduce((s, x) => s + x.peso, 0);
        const id = (t.tabla.find((x) => (r -= x.peso) < 0) || t.tabla[0]).id;
        cerrar();
        combatePesca(L, { id, nivel: aleatorioEntre(t.min, t.max), shiny: Math.random() < probShiny() });
    };
    const tecla = (e) => { if (e.key === "Escape") cerrar(); else if (e.key === " " || e.key === "Enter") { e.preventDefault(); tirar(); } };
    document.addEventListener("keydown", tecla);
    boton.onclick = tirar;
    capa.querySelector("[data-salir]").onclick = cerrar;
    lanzar();
}
// El Pokémon pescado: un combate salvaje (con el tiempo del lugar; también puede salir Furioso).
function combatePesca(L, salvaje) {
    entrenador.pescados = (entrenador.pescados || 0) + 1;
    return combateSalvajeLugar(L, salvaje, { pesca: true });
}
// Combate contra un salvaje del lugar fuera de la hierba (pesca, encuentros misteriosos): con el tiempo del lugar, a veces
// Furioso (furia: probabilidad extra) y, si se gana, alGanar() da su premio (devuelve los objetos dados).
async function combateSalvajeLugar(L, salvaje, { pesca = false, furia = 0, alGanar = null } = {}) {
    if (equipoDebilitado()) return avisoDebilitado();
    try {
        mostrarCargaBatalla();
        salvaje.nivel = limitar(salvaje.nivel + dificultad().salvaje, 1, 100);
        const spec = specSalvaje(salvaje, L), D = dificultad();
        if (!spec.furioso && furia && Math.random() < furia && !esLegendario(spec.id)) Object.assign(spec, { furioso: true, nivel: limitar(spec.nivel + 3, 1, 100), objeto: alAzar(FURIA_OBJETOS) });
        AudioFX.musicaSonar(spec.furioso ? MUSICA.salvajeFuerte : musicaSalvaje(salvaje.id, salvaje.nivel, entrenador.capturados[entrenador.equipo[0]]?.nivel || 5));
        AudioFX.precargarGritos([salvaje.id]);
        marcarVisto(salvaje.id);
        const [aliados, enemigos] = await Promise.all([prepararEquipo(await specsMiEquipo()), prepararEquipo([spec])]);
        Combate.iniciar({
            aliados, enemigos, salvaje: true, permitirCaptura: true, pesca, titulo: "Salvaje", fondo: fondoDe(L),
            ia: spec.furioso ? D.ia : D.iaSalvaje, climaInicial: climaDeLugar(L),
            bolsa: entrenador.mochila, guardarBolsa: guardarEntrenador, yaCapturado: (id) => !!entrenador.capturados[id], evolucionar: evolucionarEnCombate,
            darXP: true, expShare: () => config.expShare, generoJugador: entrenador.genero,
            alTerminar: async (r) => {
                sincronizarEquipoCombate(r.equipo);
                const furioso = enemigos.find((x) => x.furioso);
                const suelta = furioso && r.gano ? calmarFurioso(furioso, r.capturado) : null;
                if (r.capturado) registrarCaptura(r.capturado);
                else if (r.gano) { entrenador.batallasGanadas++; const p = progresoGym(); if (p) p.ruta++; }
                const premio = r.gano && alGanar ? alGanar(r) : null;
                guardarEntrenador();
                if (suelta) toast(`¡${furioso.nombre} se ha calmado y ha dejado ${obj(suelta).nombre}!`, 3600);
                else if (premio && premio.length) { AudioFX.efecto("item_fanfare"); toast("Recibes: " + textoPremios(premio), 3600); }
                if (r.gano === false) perderDinero("Tu equipo necesita descansar.");
                renderAventura();
            },
        });
    } catch (_) { errorCombate(); }
}
function pintarPescaZona(cont, L, cana) {
    tablaPesca(L, cana).then((t) => {
        const caja = cont.querySelector("[data-pesca-especies]"); if (!caja || !caja.isConnected) return;
        const vistos = new Set(entrenador.vistos || []);
        caja.innerHTML = t.tabla.map((x) => {
            const cap = !!entrenador.capturados[x.id], visto = cap || vistos.has(x.id);
            return `<span class="lg-especie ${visto ? "" : "desconocida"} ${cap ? "capturada" : ""}" title="${visto ? nombrePk(x.id) : "???"}">${htmlIcono(x.id, "lg-icono")}${cap ? `<img class="lg-capt" src="${urlItem("poke-ball")}" alt="">` : ""}</span>`;
        }).join("") + `<small class="lg-pesca-nv">Nv. ${t.min}-${t.max}</small>`;
        pintarIconos(caja);
    }).catch(() => {});
}

// ===================== DÓNDE ENCONTRAR CADA POKÉMON (para la Pokédex) =====================
// En tu partida: las rutas y zonas donde sale (y si solo de noche), dónde se pesca y con qué caña, la Zona Safari de esta
// semana, el enjambre de hoy y los encuentros especiales. [{ txt, bloqueado }]
async function dondeEncontrar(id) {
    const out = [], abierto = (L) => L.med <= nMedallas() && !bloqueoDe(L);
    for (const L of ORDEN_CAMINO.map((k) => LUGARES[k]).concat(Object.values(LUGARES).filter((L) => !ORDEN_CAMINO.includes(L.id)))) {
        if (!L || !tieneHierba(L) || !L.nivel) continue;
        let tabla = []; try { tabla = await tablaRuta(L); } catch (_) { continue; }
        const x = tabla.find((t) => t.id === id);
        if (x) out.push({ txt: `${L.nombre}${x.noche ? " (de noche)" : ""}`, bloqueado: !abierto(L) });
    }
    for (const L of Object.values(LUGARES).filter(puedePescar)) {
        for (const cana of ["old-rod", "good-rod", "super-rod"]) {
            let t = { tabla: [] }; try { t = await tablaPesca(L, cana); } catch (_) {}
            if (t.tabla.some((x) => x.id === id)) { out.push({ txt: `Pescando en ${L.nombre} (${obj(cana).nombre})`, bloqueado: !abierto(L) || !tieneObjeto(cana) }); break; }
        }
    }
    if (typeof tablaSafari === "function" && safariAbierto()) {
        try { if ((await tablaSafari()).tabla.some((x) => x.id === id)) out.push({ txt: "Zona Safari (esta semana)", bloqueado: false }); } catch (_) {}
    }
    try { const e = await enjambreHoy(); if (e && e.especie === id) out.push({ txt: `Enjambre de hoy en la ${nombreLugar(e.lugar)}`, bloqueado: false }); } catch (_) {}
    Object.entries(EVENTOS_POKEMON).forEach(([lugar, ev]) => { if (ev.especie === id) out.push({ txt: `${nombreLugar(lugar)} (encuentro especial${hecho(ev.id) ? ", ya visto" : ""})`, bloqueado: !abierto(LUGARES[lugar]) }); });
    return out;
}

// ===================== POKÉMON DE CADA RUTA =====================
// Generador pseudoaleatorio con semilla: cada partida tiene sus propias rutas, siempre iguales.
function semilla(txt) {
    let h = 1779033703 ^ txt.length;
    for (let i = 0; i < txt.length; i++) { h = Math.imul(h ^ txt.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
    return () => { h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
}
// Si una especie encaja a esos niveles (sin legendarios; los Pokémon sin evolución, a partir del nivel 20).
function especieApta(id, min, max) {
    if (esLegendario(id)) return false;
    const [etapa, etapas, nivelMin, nivelEvo] = EVO_TABLA[id] || [1, 1, 1, 0];
    if (nivelMin > max) return false;
    if (etapas === 1) return max >= 20;
    if (nivelEvo) return nivelEvo + 6 > min;
    return etapa > 1 || max >= 20;
}
async function poolDeTipos(tipos, min, max) {
    const sets = await Promise.all(tipos.map((t) => idsPorTipo(t).catch(() => new Set())));
    return poolBatalla().map((p) => p.id).filter((id) => sets.some((s) => s.has(id)) && especieApta(id, min, max));
}
async function tablaRuta(L) {
    const m = mundo();
    if (m.tablas[L.id]) return m.tablas[L.id];
    const B = BIOMAS[L.bioma], [min, max] = L.nivel, rnd = semilla(`${L.id}:${entrenador.creada || 0}`);
    const pool = await poolDeTipos(B.tipos, min, max);
    const baraja = (lista) => { for (let i = lista.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [lista[i], lista[j]] = [lista[j], lista[i]]; } return lista; };
    baraja(pool);
    const pesos = [30, 30, 24, 15, 15, 10, 6, 4];
    const tabla = pool.slice(0, pesos.length).map((id, i) => ({ id, peso: pesos[i] }));
    if (B.noche) {
        const nocturnos = baraja(await poolDeTipos(B.noche, min, max)).filter((id) => !tabla.some((x) => x.id === id));
        nocturnos.slice(0, 2).forEach((id) => tabla.push({ id, peso: 18, noche: true }));
    }
    if (!tabla.length) return [];
    m.tablas[L.id] = tabla; guardarEntrenador();
    return tabla;
}
// Enjambre del día: una ruta desbloqueada se llena de una especie que normalmente no sale allí.
let _enjambre = null;
async function enjambreHoy() {
    const hoy = new Date().toISOString().slice(0, 10);
    if (_enjambre && _enjambre.dia === hoy && _enjambre.med === nMedallas()) return _enjambre;
    const rutas = ORDEN_CAMINO.map((id) => LUGARES[id]).filter((L) => L.tipo === "ruta" && L.med <= nMedallas());
    if (!rutas.length) return null;
    const rnd = semilla(`enjambre:${hoy}:${entrenador.creada || 0}`), L = rutas[Math.floor(rnd() * rutas.length)];
    const tabla = await tablaRuta(L), [min, max] = L.nivel;
    const pool = (await poolDeTipos(BIOMAS[L.bioma].tipos, min, max)).filter((id) => !tabla.some((x) => x.id === id));
    if (!pool.length) return null;
    _enjambre = { dia: hoy, med: nMedallas(), lugar: L.id, especie: pool[Math.floor(rnd() * pool.length)] };
    return _enjambre;
}
// Pokémon salvaje de la ruta (con el enjambre del día y los que solo salen de noche).
async function salvajeDeLugar(L) {
    const tabla = await tablaRuta(L), [min, max] = L.nivel, noche = claseHora() === "noche";
    const enj = await enjambreHoy().catch(() => null);
    let id;
    if (enj && enj.lugar === L.id && Math.random() < 0.4) id = enj.especie;
    else {
        const opciones = tabla.filter((x) => !x.noche || noche), cl = climaDeLugar(L);
        let delTiempo = null;   // (los del tipo que abunda con este tiempo salen bastante más)
        if (cl) { try { delTiempo = await idsPorTipo(CLIMA_TIPO[cl]); } catch (_) {} }
        const peso = (x) => x.peso * (delTiempo && delTiempo.has(x.id) ? 2.5 : 1);
        let r = Math.random() * opciones.reduce((a, x) => a + peso(x), 0);
        id = (opciones.find((x) => (r -= peso(x)) < 0) || opciones[0]).id;
    }
    return { id, nivel: aleatorioEntre(min, max), shiny: Math.random() < probShiny() };
}
// Entrenadores fijos de la ruta: cada uno con su equipo de los tipos de su clase.
async function entrenadoresRuta(L) {
    const m = mundo();
    if (m.entrenadores[L.id]) return m.entrenadores[L.id];
    const B = BIOMAS[L.bioma]; if (!B || !B.clases.length) return [];
    const rnd = semilla(`entrenadores:${L.id}:${entrenador.creada || 0}`);
    const n = L.tipo === "zona" ? 4 : L.num <= 4 ? 3 : L.num <= 10 ? 4 : 5;
    const lista = [];
    for (let i = 0; i < n; i++) {
        const sprite = B.clases[Math.floor(rnd() * B.clases.length)];
        const clase = CLASES_ENTRENADOR.find((c) => c.sprite === sprite) || CLASES_ENTRENADOR[0];
        const tipos = tiposDeClase(clase);
        const tam = limitar(1 + Math.floor((L.num || 12) / 5) + (i === n - 1 ? 1 : 0), 1, 5);
        const specs = await specsDeTipos(tipos, tam, L.nivel[1] + Math.min(i, 3), -3, 0);
        lista.push({ sprite, nombre: nombreNPC(clase), tipos, frase: alAzar(FRASES_NPC), specs: specs.map(({ id, nivel }) => ({ id, nivel })) });
    }
    m.entrenadores[L.id] = lista; guardarEntrenador();
    return lista;
}
const vencidosEn = (L) => mundo().vencidos[L.id] || [];

// ===================== VIAJAR =====================
async function viajar(destino, { volando = false } = {}) {
    const L = LUGARES[destino], m = mundo(); if (!L) return;
    const bloqueo = bloqueoDe(L);
    if (bloqueo) {
        AudioFX.ui("error");
        if (bloqueo.quien) await conversar({ sprite: bloqueo.quien, cargo: "Guardia", nombre: "de la ruta", color: "#546e7a", fondo: fondoDe(lugarActual()), lineas: [bloqueo.txt] });
        else toast(bloqueo.txt, 3200);
        return;
    }
    m.lugar = destino;
    if (!m.visitados.includes(destino)) m.visitados.push(destino);
    if (esPoblado(L)) m.ultimoCentro = destino;
    guardarEntrenador();
    AudioFX.efecto(volando ? "pb_rel" : "pb_move", { vol: 0.35 });
    subAventura = "principal";
    renderAventura();
    cartelLugar(L);
    window.scrollTo({ top: 0, behavior: "smooth" });
    await eventosAlLlegar(L);
}
// El cartel con el nombre del lugar al llegar, como en Blanco/Negro 2.
function cartelLugar(L) {
    document.querySelectorAll(".cartel-lugar").forEach((c) => c.remove());
    const c = document.createElement("div");
    c.className = "cartel-lugar";
    c.innerHTML = `<small>${{ ruta: "Ruta", pueblo: "Pueblo", ciudad: "Ciudad", zona: "Zona", liga: "Liga" }[L.tipo] || ""}</small><b>${L.nombre}</b>`;
    document.body.appendChild(c);
    setTimeout(() => c.classList.add("fuera"), 2200 / velJuego());
    setTimeout(() => c.remove(), 2800 / velJuego());
}
// Lo que pasa al llegar: rivales y villanos que te esperan, y la bienvenida de la profesora.
async function eventosAlLlegar(L) {
    if (L.id === "pueblo-raiz" && !hecho("profesora")) return hablarCon(L, VECINOS["pueblo-raiz"][0]);
    const ms = misionesAqui(L)[0];
    if (ms && !equipoDebilitado()) await presentarMision(ms, true);
}
// El rival o el villano sale a tu encuentro. Al llegar se puede dejar para más tarde (seguirá esperando aquí).
async function presentarMision(ms, alLlegar = false) {
    const eq = ms.equipo ? EQUIPOS_VILLANOS[ms.equipo] : null;
    const r = await conversar({
        sprite: ms.sprite, nombre: ms.nombre, cargo: eq ? eq.nombre : "Rival", color: eq ? "#c62828" : "#3f7fe0",
        fondo: fondoDe(lugarActual()), lineas: [{ txt: eq ? eq.lema : `¡Eh, ${entrenador.nombre || "tú"}! ¡Por fin te encuentro!`, emote: "!" }],
        pregunta: ms.intro, opciones: alLlegar ? ["¡Vamos a combatir!", "Ahora no"] : ["¡Vamos a combatir!"],
    });
    if (r === 0) combatirMision(ms);
    else toast(eq ? `${ms.nombre} sigue aquí. Vuelve cuando estés listo.` : `${ms.nombre} te esperará aquí.`, 2600);
}

// ===================== CONVERSACIONES (personaje en grande, como en la tienda) =====================
// o = { sprite (entrenador de PokéRogue) | pokemon (id) | atlas (otro atlas de PokéRogue; modoAtlas: "bucle", "fijo" o "una"), cargo, nombre,
//       color, voz, fondo, lineas: [texto | { txt, emote }], pregunta, opciones }
async function conversar(o) {
    const capa = document.createElement("div");
    capa.className = "capa-conversa";
    const p = o.nombre ? { cargo: o.cargo || "", nombre: o.nombre, voz: o.voz || 1.3, color: o.color || "#3f7fe0" } : null;
    capa.innerHTML = `<div class="local conversa" style="--color-npc:${(p && p.color) || "#3f7fe0"}">
        <div class="local-escena">
            <div class="local-fondo"><img class="conv-fondo" src="${urlFondo(o.fondo || "route")}" alt=""></div>
            <div class="vn-personaje entra estatico ${o.pokemon ? "es-pokemon" : ""}">
                <div class="vn-cuerpo">${o.pokemon ? `<img class="vn-sprite" alt="">` : `<canvas class="vn-sprite"></canvas>`}</div>
                <img class="vn-emote" alt="">
            </div>
            ${dialogoHTML(p)}
        </div>
    </div>`;
    document.body.appendChild(capa); document.body.style.overflow = "hidden";
    // (sin foco en lo de detrás: así Intro avanza el diálogo en vez de volver a pulsar la tarjeta del vecino)
    if (document.activeElement && document.activeElement !== document.body && document.activeElement.blur) document.activeElement.blur();
    const esc = () => parseFloat(getComputedStyle(capa.querySelector(".local")).getPropertyValue("--esc")) || 5;
    if (o.pokemon) {
        montarPokemon(capa.querySelector(".vn-sprite"), o.pokemon).then((el) => el && tamanoNativo(el, esc() - 1, 330, 420));
        AudioFX.grito(o.pokemon, { vol: 0.55 });
    } else if (o.sprite) {
        const cv = capa.querySelector("canvas.vn-sprite");
        Atlas.cargar(urlEntrenadorPR(o.sprite)).then((a) => { cv.width = a.w; cv.height = a.h; cv.dataset.nw = a.w; cv.dataset.nh = a.h; Atlas.dibujar(cv, a, 0); tamanoNativo(cv, esc()); }).catch(() => {});
    } else if (o.atlas) {
        const cv = capa.querySelector("canvas.vn-sprite");
        Atlas.cargar(prURL(o.atlas)).then((a) => {
            cv.width = a.w; cv.height = a.h; cv.dataset.nw = a.w; cv.dataset.nh = a.h; tamanoNativo(cv, esc());
            if (o.modoAtlas === "fijo" || a.frames.length < 2) Atlas.dibujar(cv, a, 0);
            else Atlas.animar(cv, a, { fps: 12, bucle: o.modoAtlas !== "una" });
        }).catch(() => {});
    }
    const dlg = crearDialogo(capa, p);
    let r;
    await esperar(300);
    for (const l of o.lineas) {
        const x = typeof l === "string" ? { txt: l } : l;
        if (x.emote) emocion(capa, x.emote);
        await dlg.decir(x.txt.replace(/\{nombre\}/g, entrenador.nombre || "entrenador").replace(/\{o\}/g, entrenador.genero === "f" ? "a" : "o"));
    }
    if (o.opciones) r = await dlg.preguntar(o.pregunta, o.opciones);
    dlg.cerrar();
    capa.classList.add("cerrando");
    await esperar(220);
    capa.remove();
    if (!document.querySelector(".capa-resumen, .capa-pe")) document.body.style.overflow = "";
    return r;
}
// Hablar con un vecino: sus frases y, la primera vez, su regalo.
// Algo pendiente con este vecino: la primera charla o su caña de pescar (también en partidas de antes de que existieran).
const conCanaPendiente = (v) => !!v.cana && !tieneObjeto(v.cana);
const vecinoPendiente = (v) => !hecho(v.id) || conCanaPendiente(v) || (typeof encargoPendiente === "function" && encargoPendiente(v));
async function hablarCon(L, v) {
    const primera = !hecho(v.id), cana = conCanaPendiente(v);
    // (ya os conocéis y tiene un encargo pendiente: te recuerda lo que busca o, si ya lo tienes, te da su premio)
    if (!primera && !cana && encargoPendiente(v)) { await hablarEncargo(L, v); renderAventura(); return; }
    const lineas = (primera ? v.lineas : [v.lineas[0]]).concat(cana ? v.lineasCana : []);
    await conversar({ sprite: v.sprite, cargo: v.cargo, nombre: v.nombre, color: v.color, fondo: fondoDe(L), lineas: lineas.map((t, i) => (i ? t : { txt: t, emote: "!" })) });
    const regalos = [...(primera && v.regalo ? v.regalo : []), ...(cana ? [[v.cana, 1], ...(v.regaloCana || [])] : [])];
    const dados = regalos.length ? darObjetos(regalos) : [];
    if (dados.length) { AudioFX.efecto("item_fanfare"); toast("Recibes: " + textoPremios(dados) + (cana ? ". ¡Ya puedes pescar donde haya agua!" : ""), 4200); }
    if (!primera) { guardarEntrenador(); if (cana) renderAventura(); return; }
    if (v.vuelo) toast("¡Ya puedes volar a los pueblos que hayas visitado desde el mapa!", 3600);
    if (v.pokemon) {
        if (entrenador.capturados[v.pokemon.id]) toast(`Ya tienes un ${nombrePk(v.pokemon.id)}, así que se queda con ella.`, 3200);
        else {
            entrenador.capturados[v.pokemon.id] = { nivel: v.pokemon.nivel, xp: 0, objeto: null, bola: "poke-ball", movimientos: null, nivelCaptura: v.pokemon.nivel, genero: generoAleatorio(v.pokemon.id),
                naturaleza: naturalezaAleatoria(), habSlot: Math.random() < 0.5 ? 1 : 2, lugarCaptura: L.id, recibido: true };
            if (entrenador.equipo.length < 6) entrenador.equipo.push(v.pokemon.id);
            asegurarMovimientos(v.pokemon.id);
            AudioFX.fanfarria(MUSICA.captura);
            toast(`¡${nombrePk(v.pokemon.id)} se une a ${entrenador.equipo.includes(v.pokemon.id) ? "tu equipo" : "tu Caja"}!`, 3200);
        }
    }
    if (v.alPrimera) await v.alPrimera(L);
    marcarHecho(v.id);
    if (v.encargo) await hablarEncargo(L, v, true);   // (si ya llevas lo que busca, te lo agradece al momento)
    renderAventura();
}
const fondoDe = (L) => (L ? L.fondo || (L.bioma && BIOMAS[L.bioma].fondo) || "route" : "route");
const musicaDe = (L) => mus(L.musica || (L.bioma && BIOMAS[L.bioma].musica) || "town");

// ===================== COMBATES DEL MODO REGIÓN =====================
function combatirEntrenadorRuta(L, i) {
    const t = mundo().entrenadores[L.id][i], clase = CLASES_ENTRENADOR.find((c) => c.sprite === t.sprite) || CLASES_ENTRENADOR[0];
    (CLASES_DOBLES.has(t.sprite) ? combateEntrenadorDoble : combateEntrenador)({
        titulo: t.nombre, sprite: t.sprite, dialogo: t.frase, dialogoDerrota: alAzar(["¡Vaya! ¡Eres muy bueno!", "¡Me has dado una buena lección!", "¡La próxima vez ganaré yo!"]),
        musicaEncuentro: musicaEncuentro(clase.enc), fondo: fondoDe(L), pago: "ruta", specs: t.specs.map((x) => ({ ...x })), clima: climaDeLugar(L),
        alGanar: async () => {
            const m = mundo();
            m.vencidos[L.id] = [...new Set([...(m.vencidos[L.id] || []), i])];
            const p = progresoGym(); if (p) p.ruta++;
            guardarEntrenador();
        },
    });
}
// Combate contra un único Pokémon especial (legendarios, el Snorlax…). Se puede capturar.
async function combateEvento(L, ev) {
    if (equipoDebilitado()) return avisoDebilitado();
    try {
        mostrarCargaBatalla();
        const nivel = limitar(ev.nivel + dificultad().salvaje, 1, 100);
        AudioFX.musicaSonar(musicaSalvaje(ev.especie, nivel, entrenador.capturados[entrenador.equipo[0]]?.nivel || 5));   // su tema, ya
        const [aliados, enemigos] = await Promise.all([prepararEquipo(await specsMiEquipo()), prepararEquipo([{ id: ev.especie, nivel, shiny: Math.random() < probShiny() }])]);
        marcarVisto(ev.especie);
        Combate.iniciar({
            aliados, enemigos, salvaje: true, permitirCaptura: true, titulo: "Salvaje", fondo: fondoDe(L), ia: dificultad().iaSalvaje, climaInicial: climaDeLugar(L),
            bolsa: entrenador.mochila, guardarBolsa: guardarEntrenador, yaCapturado: (id) => !!entrenador.capturados[id], evolucionar: evolucionarEnCombate,
            darXP: true, expShare: () => config.expShare, generoJugador: entrenador.genero,
            alTerminar: async (r) => {
                sincronizarEquipoCombate(r.equipo);
                if (r.capturado) registrarCaptura(r.capturado);
                if (r.gano) { marcarHecho(ev.id); if (!r.capturado) toast(`${nombrePk(ev.especie)} se ha marchado...`, 2800); }
                else if (r.gano === false) { perderDinero("Tu equipo necesita descansar."); }
                renderAventura();
            },
        });
    } catch (_) { errorCombate(); }
}
async function iniciarEvento(L, ev) {
    if (ev.flauta && !tieneObjeto("poke-flute")) {
        return conversar({ pokemon: ev.especie, fondo: fondoDe(L), lineas: [ev.lineas[0], "Quizá alguien en Ciudad Peñasco sepa cómo despertarlo."] });
    }
    await conversar({ pokemon: ev.especie, fondo: fondoDe(L), lineas: ev.lineas });
    combateEvento(L, ev);
}

// ===================== PANTALLA DEL LUGAR =====================
function tarjetaVecino(v, i) {
    const pend = vecinoPendiente(v), busca = hecho(v.id) && encargoPendiente(v);
    return `<button class="lg-tarjeta lg-vecino" data-vecino="${i}">
        <canvas class="lg-npc" data-sprite="${v.sprite}"></canvas>
        <div class="lg-info"><span class="hub-etq">${v.cargo}${v.encargo ? " · Encargo" : ""}</span><h4>${v.nombre}</h4><p>${busca ? `Busca ${textoEncargo(v.encargo)}.` : pend ? "Parece que quiere decirte algo." : "Ya habéis hablado."}</p></div>
        ${pend ? '<i class="lg-exclama">!</i>' : ""}
    </button>`;
}
async function renderRegion(cont) {
    const m = mundo(), L = lugarActual();
    AudioFX.musicaSonar(musicaDe(L));
    const hora = claseHora(), eventos = misionesAqui(L), evPoke = EVENTOS_POKEMON[L.id];
    const conHierba = tieneHierba(L), cl = climaDeLugar(L);
    const etq = { ruta: `Ruta · Nv. ${L.nivel ? L.nivel.join("-") : ""}`, pueblo: "Pueblo", ciudad: "Ciudad", zona: L.nivel ? `Zona · Nv. ${L.nivel.join("-")}` : "Zona", liga: "Liga Pokémon" }[L.tipo];
    const adyacentes = L.conexiones.map((id) => LUGARES[id]);
    const salida = (D) => {
        const b = bloqueoDe(D);
        return `<button class="lg-salida ${b ? "bloqueada" : ""}" data-ir="${D.id}"><small>${{ ruta: "Ruta", pueblo: "Pueblo", ciudad: "Ciudad", zona: "Zona", liga: "Liga" }[D.tipo]}</small><b>${D.nombre}</b>${b ? '<i class="lg-candado" title="Bloqueado"></i>' : ""}</button>`;
    };
    const tarjetas = [];
    // Eventos de historia aquí.
    eventos.forEach((ms, i) => {
        const eq = ms.equipo ? EQUIPOS_VILLANOS[ms.equipo] : null;
        tarjetas.push(`<article class="lg-tarjeta lg-evento ${eq ? "villano" : "rival"}">
            <canvas class="lg-npc" data-sprite="${ms.sprite}"></canvas>
            <div class="lg-info"><span class="hub-etq">${eq ? eq.nombre : "Rival"}</span><h4>${ms.nombre}</h4><p>${eq ? "¡Están causando problemas aquí!" : "Te está esperando para combatir."}</p></div>
            <button class="btn-grande" data-mision-aqui="${i}">¡Combatir!</button>
        </article>`);
    });
    const misterio = tarjetaMisterioHTML(L);   // (encuentro misterioso de hoy)
    if (misterio) tarjetas.push(misterio);
    if (evPoke && !hecho(evPoke.id) && nMedallas() >= L.med) {
        tarjetas.push(`<article class="lg-tarjeta lg-evento legendario">
            <span class="lg-poke-evento">${htmlIcono(evPoke.especie, "lg-icono-evento")}</span>
            <div class="lg-info"><span class="hub-etq">Evento</span><h4>${evPoke.titulo}</h4><p>${evPoke.flauta ? "Hace falta despertarlo para seguir." : "Una presencia poderosa se deja ver por aquí..."}</p></div>
            <button class="btn-grande" data-evento>${evPoke.flauta ? (tieneObjeto("poke-flute") ? "Usar la Pokéflauta" : "Acercarse") : "Investigar"}</button>
        </article>`);
    }
    if (esPoblado(L)) {
        tarjetas.push(`<button class="lg-tarjeta lg-edificio centro" data-sub="centro">
            <img class="lg-npc-img" src="${SD_BASE}sprites/trainers/pokemoncenterlady.png" alt="">
            <div class="lg-info"><span class="hub-etq">Edificio</span><h4>Centro Pokémon</h4><p>${equipoHerido() ? "Tu equipo necesita descansar." : "La enfermera Joy cuida de tus Pokémon."}</p></div>
            ${equipoHerido() ? '<i class="hm-aviso"></i>' : ""}
        </button>`);
        tarjetas.push(`<button class="lg-tarjeta lg-edificio tienda" data-sub="tienda">
            <canvas class="lg-npc lg-npc-atlas" data-atlas="images/trainer/waiter_m"></canvas>
            <div class="lg-info"><span class="hub-etq">Edificio</span><h4>Tienda Pokémon</h4><p>El dependiente Andrés te espera.</p></div>
        </button>`);
        if (L.id === idCiudad(SAFARI_CIUDAD)) tarjetas.push(safariAbierto()
            ? `<button class="lg-tarjeta lg-edificio safari" data-sub="safari">
                <canvas class="lg-npc" data-atlas="images/mystery-encounters/safari_zone"></canvas>
                <div class="lg-info"><span class="hub-etq">Parque natural</span><h4>Zona Safari</h4><p>Atrapa Pokémon que no salen en las rutas. Cambian cada semana.</p></div>
            </button>`
            : `<article class="lg-tarjeta lg-edificio safari cerrado">
                <canvas class="lg-npc" data-atlas="images/mystery-encounters/safari_zone"></canvas>
                <div class="lg-info"><span class="hub-etq">Parque natural</span><h4>Zona Safari</h4><p>Abre a los entrenadores con ${SAFARI_MEDALLAS} medallas.</p></div>
            </article>`);
        if (L.id === idCiudad(METRO_CIUDAD)) tarjetas.push(metroAbierto()
            ? `<button class="lg-tarjeta lg-edificio metro" data-sub="metro">
                <canvas class="lg-npc" data-sprite="depot_agent"></canvas>
                <div class="lg-info"><span class="hub-etq">Instalación de combate</span><h4>Metro Batalla</h4><p>${metro().activo ? `Tu viaje sigue: racha de ${metro().racha}.` : "Combates seguidos a nivel 50. ¡Gana Puntos de Batalla!"}</p></div>
            </button>`
            : `<article class="lg-tarjeta lg-edificio metro cerrado">
                <canvas class="lg-npc" data-sprite="depot_agent"></canvas>
                <div class="lg-info"><span class="hub-etq">Instalación de combate</span><h4>Metro Batalla</h4><p>Solo pueden subir los entrenadores con ${METRO_MEDALLAS} medallas.</p></div>
            </article>`);
        (VECINOS[L.id] || []).forEach((v, i) => tarjetas.push(tarjetaVecino(v, i)));
        tarjetas.push(`<article class="lg-tarjeta lg-noticias"><div class="lg-info"><span class="hub-etq">Noticias de la región</span><p data-noticias>Consultando las noticias...</p></div></article>`);
    }
    if (!esPoblado(L)) (VECINOS[L.id] || []).forEach((v, i) => tarjetas.push(tarjetaVecino(v, i)));   // (también hay quien vive fuera de los pueblos)
    const extras = typeof tarjetasLugarExtra === "function" ? tarjetasLugarExtra(L) : [];
    extras.forEach((x) => tarjetas.push(x.html));
    if (puedePescar(L)) {
        const cana = mejorCana();
        tarjetas.push(cana ? `<article class="lg-tarjeta lg-pesca">
            <div class="lg-info"><span class="hub-etq"><img class="lg-cana" src="${urlObj(cana)}" alt="">Pesca · ${obj(cana).nombre}</span><h4>Pokémon del agua</h4><div class="lg-especies" data-pesca-especies><div class="cargando"></div></div></div>
            <button class="hx-boton" data-pescar>Pescar</button>
        </article>` : `<article class="lg-tarjeta lg-pesca sin-cana">
            <img class="lg-npc-img" src="${urlItem("old-rod")}" alt="">
            <div class="lg-info"><span class="hub-etq">Pesca</span><h4>Aquí se puede pescar</h4><p>Hace falta una caña. Dicen que el pescador de Villa Lumina regala una.</p></div>
        </article>`);
    }
    if (conHierba) {
        tarjetas.push(`<article class="lg-tarjeta lg-hierba">
            <div class="lg-info"><span class="hub-etq">Hierba alta · ${hora === "noche" ? "de noche" : hora === "tarde" ? "al atardecer" : "de día"}</span><h4>Pokémon salvajes</h4><p data-enjambre>${cl ? `${CLIMAS[cl].ambiente} Abundan los Pokémon de tipo ${TIPOS_ES[CLIMA_TIPO[cl]]}${cl === "lluvia" ? " y la furia carmesí se desata más a menudo" : ""}.` : "Pokémon salvajes y entrenadores escondidos entre la hierba."}</p></div>
            <button class="hx-boton" id="btn-explorar">${equipoDebilitado() ? "Descansar antes" : "Explorar"}</button>
        </article>`);
        tarjetas.push(`<article class="lg-tarjeta lg-pokedex"><div class="lg-info"><span class="hub-etq">Pokémon de la zona</span><div class="lg-especies" data-especies><div class="cargando"></div></div></div></article>`);
        if (BIOMAS[L.bioma].clases.length) tarjetas.push(`<article class="lg-tarjeta lg-entrenadores"><div class="lg-info"><span class="hub-etq">Entrenadores de la zona</span><div class="lg-lista-entr" data-entrenadores><div class="cargando"></div></div></div></article>`);
        if (!m.objetos.includes(L.id)) tarjetas.push(`<button class="lg-tarjeta lg-objeto" data-objeto>
            <img src="${urlItem("poke-ball")}" alt=""><div class="lg-info"><span class="hub-etq">Algo brilla</span><h4>Un objeto entre la hierba</h4><p>Toca para recogerlo.</p></div></button>`);
    }
    const reto = L.gym && L.gym === nMedallas() + 1 ? retoGimnasio({ region: true }) : L.tipo === "liga" ? retoGimnasio({ region: true }) : null;
    const gymHecho = L.gym && entrenador.medallas.includes(L.gym) ? GIMNASIOS[L.gym - 1] : null;

    cont.innerHTML = `
        <div class="hub region">
            ${tarjetaEntrenadorHTML()}
            <section class="lugar-cabecera hora-${hora}">
                <img class="lc-fondo" src="${urlFondo(fondoDe(L))}" alt="">
                ${cl ? `<div class="lc-clima" style="background-image:url('${urlClimaFx(cl)}')"></div>` : ""}
                <div class="lc-escena"><img class="hx-poke" id="hx-poke" alt=""></div>
                <div class="lc-info">
                    <span class="hub-etq">${etq}${cl ? ` · ${CLIMAS[cl].nombre}` : ""}</span>
                    <h2>${L.nombre}</h2>
                    <p>${L.desc || (L.tipo === "ruta" ? `Camino hacia ${L.hacia}. ${BIOMAS[L.bioma].noche ? "De noche salen Pokémon distintos." : ""}` : "")}</p>
                </div>
            </section>
            ${reto ? reto.html : ""}
            ${gymHecho ? `<section class="lg-gym-hecho"><img src="${urlMedalla(gymHecho.medalla)}" alt=""><div><span class="hub-etq">Gimnasio de ${gymHecho.ciudad}</span><b>Ya tienes la ${gymHecho.nombreMedalla}</b></div>
                ${entrenador.campeon ? `<button class="btn-mini" data-revancha>Revancha · Nv. ${nivelRevancha(gymHecho)}</button>` : ""}</section>` : ""}
            <div class="lugar-rejilla">${tarjetas.join("")}</div>
            <nav class="lugar-salidas"><span class="hub-etq">Salidas</span>${adyacentes.map(salida).join("")}
                <button class="lg-salida mapa" data-sub="mapa"><img src="${urlItem("town-map")}" alt=""><b>Mapa</b></button></nav>
            ${equipoHubHTML()}
            ${menuHubHTML(MENU_MODO_REGION)}
        </div>`;

    conectarHub(cont);
    extras.forEach((x) => x.conectar && x.conectar(cont));
    if (reto) reto.conectar(cont);
    const lead = entrenador.equipo.find((id) => entrenador.capturados[id].hp !== 0) || entrenador.equipo[0];
    montarPokemon(document.getElementById("hx-poke"), lead, { shiny: !!entrenador.capturados[lead]?.shiny }).then((el) => tamanoNativo(el, 2, 120, 150));
    // Retratos pequeños de los personajes (primer fotograma del sprite de PokéRogue).
    cont.querySelectorAll("canvas[data-sprite], canvas[data-atlas]").forEach((cv) => {
        Atlas.cargar(cv.dataset.atlas ? prURL(cv.dataset.atlas) : urlEntrenadorPR(cv.dataset.sprite))
            .then((a) => { cv.width = a.w; cv.height = a.h; Atlas.dibujar(cv, a, 0); }).catch(() => {});
    });
    cont.querySelectorAll("[data-ir]").forEach((b) => b.onclick = () => viajar(b.dataset.ir));
    cont.querySelectorAll("[data-mision-aqui]").forEach((b) => b.onclick = () => presentarMision(eventos[Number(b.dataset.misionAqui)]));
    cont.querySelectorAll("[data-vecino]").forEach((b) => b.onclick = () => hablarCon(L, VECINOS[L.id][Number(b.dataset.vecino)]));
    const be = cont.querySelector("[data-evento]"); if (be) be.onclick = () => iniciarEvento(L, evPoke);
    const bm = cont.querySelector("[data-misterio]"); if (bm) bm.onclick = () => iniciarMisterio(L);
    const bp = cont.querySelector("[data-pescar]"); if (bp) { bp.onclick = () => abrirPesca(L); pintarPescaZona(cont, L, mejorCana()); }
    const brv = cont.querySelector("[data-revancha]"); if (brv) brv.onclick = () => retarRevancha(gymHecho);
    const bx = document.getElementById("btn-explorar");
    if (bx) bx.onclick = () => { if (equipoDebilitado()) return avisoDebilitado(); iniciarEncuentro({ lugar: L }); };
    const bo = cont.querySelector("[data-objeto]");
    if (bo) bo.onclick = () => {
        m.objetos.push(L.id);
        const k = hallazgo(1) || "potion";
        AudioFX.efecto("item_fanfare"); toast(`Has encontrado: ${obj(k).nombre}.`, 3000);
        guardarEntrenador(); renderAventura();
    };
    // Sonidos listos de antemano: la música de los lugares vecinos (al viajar suena al momento), la del evento de aquí
    // y los gritos de los Pokémon de la zona.
    const evento = evPoke && !hecho(evPoke.id) && nMedallas() >= L.med ? evPoke : null;
    precargarSonidosAventura([...adyacentes.filter((D) => D && !bloqueoDe(D)).map(musicaDe),
        evento && musicaSalvaje(evento.especie, evento.nivel, entrenador.capturados[entrenador.equipo[0]]?.nivel || 5)], evento ? [evento.especie] : []);
    // Datos que se cargan aparte: Pokémon de la zona, entrenadores y noticias.
    if (conHierba) {
        tablaRuta(L).then((tabla) => { pintarEspeciesZona(cont, tabla); AudioFX.precargarGritos(tabla.map((x) => x.id)); }).catch(() => {});
        if (BIOMAS[L.bioma].clases.length) entrenadoresRuta(L).then((lista) => pintarEntrenadoresZona(cont, L, lista)).catch(() => {});
    }
    enjambreHoy().then((e) => {
        const txt = e ? `¡Enjambre de ${nombrePk(e.especie)} en la ${nombreLugar(e.lugar)}!` : null;
        const pron = pronosticoHoy();
        const raros = Object.keys(misteriosHoy()).filter((id) => LUGARES[id] && misterioAqui(LUGARES[id])).map(nombreLugar);   // (encuentros misteriosos)
        const n = cont.querySelector("[data-noticias]"); if (n) n.innerHTML = (txt ? `${htmlIcono(e.especie, "lg-icono-noticia")} ${txt}` : "Hoy no hay noticias de enjambres.")
            + (pron ? `<small class="lg-pronostico">El tiempo hoy · ${pron}</small>` : "")
            + (raros.length ? `<small class="lg-pronostico">Cosas raras en: ${raros.join(", ")}</small>` : "");
        const h = cont.querySelector("[data-enjambre]"); if (h && e && e.lugar === L.id) h.innerHTML = `<b class="lg-enjambre">${htmlIcono(e.especie, "lg-icono-noticia")} ¡Hay un enjambre de ${nombrePk(e.especie)}!</b>`;
        pintarIconos(cont);
    }).catch(() => {});
    pintarIconos(cont);
    // Partida nueva: la Profesora Encina te recibe en Pueblo Raíz.
    if (L.id === "pueblo-raiz" && !hecho("profesora") && !document.querySelector(".capa-conversa")) hablarCon(L, VECINOS["pueblo-raiz"][0]);
}
function pintarEspeciesZona(cont, tabla) {
    const caja = cont.querySelector("[data-especies]"); if (!caja || !caja.isConnected) return;
    const vistos = new Set(entrenador.vistos || []);
    caja.innerHTML = tabla.map((x) => {
        const cap = !!entrenador.capturados[x.id], visto = cap || vistos.has(x.id);
        return `<span class="lg-especie ${visto ? "" : "desconocida"} ${cap ? "capturada" : ""}" title="${visto ? nombrePk(x.id) : "???"}${x.noche ? " · solo de noche" : ""}">
            ${htmlIcono(x.id, "lg-icono")}${x.noche ? '<i class="lg-luna" title="Solo de noche"></i>' : ""}${cap ? `<img class="lg-capt" src="${urlItem("poke-ball")}" alt="">` : ""}</span>`;
    }).join("") || `<p class="nota">No se han encontrado Pokémon.</p>`;
    pintarIconos(caja);
}
function pintarEntrenadoresZona(cont, L, lista) {
    const caja = cont.querySelector("[data-entrenadores]"); if (!caja || !caja.isConnected) return;
    const vencidos = vencidosEn(L);
    caja.innerHTML = lista.map((t, i) => `<div class="lg-entrenador ${vencidos.includes(i) ? "vencido" : ""}">
        <canvas class="lg-npc-mini" data-sprite="${t.sprite}"></canvas>
        <span class="le-datos"><b>${t.nombre}</b><span class="le-tipos">${t.tipos.map((tp) => iconoTipo(tp, 1.5)).join("")}<small>${t.specs.length} Pokémon · Nv. ${Math.max(...t.specs.map((s) => s.nivel))}</small></span></span>
        ${vencidos.includes(i) ? '<span class="le-hecho">Vencido</span>' : `<button class="btn-mini" data-entrenador="${i}">Combatir</button>`}
    </div>`).join("");
    caja.querySelectorAll("canvas[data-sprite]").forEach((cv) => {
        Atlas.cargar(urlEntrenadorPR(cv.dataset.sprite)).then((a) => { cv.width = a.w; cv.height = a.h; Atlas.dibujar(cv, a, 0); }).catch(() => {});
    });
    caja.querySelectorAll("[data-entrenador]").forEach((b) => b.onclick = () => {
        if (equipoDebilitado()) return avisoDebilitado();
        combatirEntrenadorRuta(L, Number(b.dataset.entrenador));
    });
}

// ===================== MAPA DE LA REGIÓN =====================
let lugarElegido = null;
function puedeVolarA(L) { return hecho("piloto") && esPoblado(L) && mundo().visitados.includes(L.id); }
function renderMapaRegion(cont) {
    const m = mundo(), actual = lugarActual();
    if (!lugarElegido || !LUGARES[lugarElegido]) lugarElegido = actual.id;
    const lineas = [];
    Object.values(LUGARES).forEach((A) => A.conexiones.forEach((id) => {
        const B = LUGARES[id]; if (A.id > B.id) return;
        const abierta = m.visitados.includes(A.id) && m.visitados.includes(B.id);
        lineas.push(`<line x1="${A.x}" y1="${A.y}" x2="${B.x}" y2="${B.y}" class="${abierta ? "abierta" : ""}"/>`);
    }));
    const nodo = (L) => {
        const visitado = m.visitados.includes(L.id), bloq = bloqueoDe(L), gym = L.gym ? GIMNASIOS[L.gym - 1] : null;
        const aviso = misionesAqui(L).length || (EVENTOS_POKEMON[L.id] && !hecho(EVENTOS_POKEMON[L.id].id) && nMedallas() >= L.med && visitado);
        return `<button class="mp-nodo ${L.tipo} ${visitado ? "visitado" : ""} ${bloq ? "bloqueado" : ""} ${L.id === actual.id ? "actual" : ""} ${L.id === lugarElegido ? "elegido" : ""}"
            style="left:${L.x}%;top:${(L.y / 64) * 100}%" data-lugar="${L.id}" title="${L.nombre}">
            ${gym ? `<img src="${urlMedalla(gym.medalla)}" class="${entrenador.medallas.includes(gym.n) ? "tiene" : ""}" alt="">` : ""}
            ${aviso ? '<i class="mp-aviso">!</i>' : ""}
            ${L.id === actual.id ? `<span class="mp-yo">${htmlIcono(entrenador.equipo[0], "mp-icono", !!entrenador.capturados[entrenador.equipo[0]]?.shiny)}</span>` : ""}
        </button>`;
    };
    const E = LUGARES[lugarElegido], bloqE = bloqueoDe(E), adyacente = actual.conexiones.includes(E.id);
    const accion = E.id === actual.id ? `<button class="btn-sec" disabled>Estás aquí</button>`
        : adyacente ? `<button class="btn-grande" data-viajar>${bloqE ? "Intentar pasar" : "Ir"}</button>`
        : puedeVolarA(E) ? `<button class="btn-grande" data-volar>Volar aquí</button>`
        : `<button class="btn-sec" disabled>${m.visitados.includes(E.id) ? (hecho("piloto") ? "Solo se puede volar a pueblos" : "Aún no puedes volar") : "Aún no has llegado"}</button>`;
    cont.innerHTML = `
        <div class="cabecera-modo con-volver">
            <button class="btn-volver" data-volver>Atrás</button>
            <h2>Mapa de ${REGION}</h2>
            <button class="btn-sec mp-medallas" data-sub="estuche">Medallas ${nMedallas()}/16</button>
        </div>
        <div class="mapa-aurelia">
            <svg class="mp-caminos" viewBox="0 0 100 64" preserveAspectRatio="none">${lineas.join("")}</svg>
            ${Object.values(LUGARES).map(nodo).join("")}
        </div>
        <section class="mp-panel">
            <div class="mp-info">
                <span class="hub-etq">${{ ruta: "Ruta", pueblo: "Pueblo", ciudad: "Ciudad", zona: "Zona", liga: "Liga" }[E.tipo]}${E.nivel ? ` · Nv. ${E.nivel.join("-")}` : ""}${E.gym ? ` · Gimnasio de tipo ${TIPOS_ES[GIMNASIOS[E.gym - 1].tipo]}` : ""}</span>
                <h3>${m.visitados.includes(E.id) || adyacente ? E.nombre : "???"}</h3>
                <p>${bloqE && !m.visitados.includes(E.id) ? bloqE.txt.replace(/^¡Alto! /, "") : m.visitados.includes(E.id) ? (E.desc || `Camino hacia ${E.hacia || ""}.`) : "Un lugar que aún no has visitado."}</p>
            </div>
            <div class="mp-acciones">${accion}</div>
        </section>
        <p class="nota">Toca un lugar del mapa. Puedes ir a los lugares conectados con el tuyo${hecho("piloto") ? " y volar a los pueblos que ya conoces" : ""}.</p>`;
    pintarIconos(cont);
    cont.querySelector("[data-volver]").onclick = () => { subAventura = "principal"; renderAventura(); };
    cont.querySelector("[data-sub=estuche]").onclick = () => { subAventura = "estuche"; renderAventura(); };
    cont.querySelectorAll("[data-lugar]").forEach((b) => b.onclick = () => { lugarElegido = b.dataset.lugar; AudioFX.ui("select"); renderMapaRegion(cont); });
    const bv = cont.querySelector("[data-viajar]"); if (bv) bv.onclick = () => viajar(E.id);
    const bf = cont.querySelector("[data-volar]"); if (bf) bf.onclick = () => viajar(E.id, { volando: true });
}
const MENU_MODO_REGION = [
    { sub: "equipo", icono: "poke-ball", txt: "Equipo" },
    { sub: "mochila", icono: "explorer-kit", txt: "Mochila" },
    { sub: "caja", icono: "seal-case", txt: "Caja" },
    { sub: "mapa", icono: "town-map", txt: "Mapa" },
    { sub: "estuche", icono: "medal-box", txt: "Medallas" },
    { sub: "logros", icono: ICONO_LOGROS, txt: "Logros" },
    { acc: "guardar", icono: "journal", txt: "Guardar" },
    { acc: "opciones", icono: "point-card", txt: "Opciones" },
];
