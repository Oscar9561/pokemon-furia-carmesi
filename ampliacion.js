/* =========================================================
   AMPLIACIÓN DE AURELIA
   - Más entrenadores por las rutas: clases nuevas (sprites animados de PokéRogue).
   - Zonas nuevas, cada una con su legendario: Bosque Eterno (Celebi), Torre Prisma (las megas de Leyendas Z-A),
     Islas Remolino (Lugia), Torre Campana (Ho-Oh), Fragua Magma (Heatran), Pilar Celeste (Rayquaza) e Isla Luna Nueva
     (Darkrai). Y el Estadio Corona, donde se juega el Torneo de Campeones (torneo.js).
   - Un vecino más en cada pueblo con un encargo: enséñale el Pokémon que busca y te dará algo a cambio.
   - Lem, el inventor de Ciudad Luminalia, estudia en la Torre Prisma las megapiedras nuevas: las vende y reta a quien
     quiera ver una megaevolución de cerca.
   ========================================================= */

// ===================== ENTRENADORES NUEVOS =====================
// fem: clase femenina (para su nombre) · pareja: dos personajes a la vez · tipos: los Pokémon que llevan.
const CLASES_NUEVAS = [
    { sprite: "artist", nombre: "Artista", enc: "psychic", tipos: ["normal", "fairy", "psychic"] },
    { sprite: "baker", nombre: "Pastelera", enc: "lass", fem: true, tipos: ["fairy", "normal"] },
    { sprite: "biker", nombre: "Motorista", enc: "roughneck", tipos: ["poison", "fire", "dark"] },
    { sprite: "bird_keeper_m", nombre: "Ornitólogo", enc: "ace_trainer", tipos: ["flying"] },
    { sprite: "bird_keeper_f", nombre: "Ornitóloga", enc: "ace_trainer", tipos: ["flying", "normal"] },
    { sprite: "clerk_m", nombre: "Oficinista", enc: "clerk", tipos: ["normal", "steel"] },
    { sprite: "clerk_f", nombre: "Oficinista", enc: "clerk", tipos: ["normal", "electric"] },
    { sprite: "collector", nombre: "Coleccionista", enc: "rich", tipos: ["rock", "steel", "dragon"] },
    { sprite: "doctor_m", nombre: "Doctor", enc: "scientist", tipos: ["normal", "psychic"] },
    { sprite: "doctor_f", nombre: "Doctora", enc: "scientist", tipos: ["fairy", "normal", "water"] },
    { sprite: "firebreather", nombre: "Tragafuegos", enc: "roughneck", tipos: ["fire"] },
    { sprite: "harlequin", nombre: "Arlequín", enc: "psychic", tipos: ["psychic", "ghost"] },
    { sprite: "hoopster", nombre: "Baloncestista", enc: "cyclist", tipos: ["fighting", "normal"] },
    { sprite: "infielder", nombre: "Jugador de Béisbol", enc: "cyclist", tipos: ["normal", "fighting", "steel"] },
    { sprite: "janitor", nombre: "Conserje", enc: "clerk", tipos: ["poison", "normal"] },
    { sprite: "linebacker", nombre: "Jugador de Rugby", enc: "roughneck", tipos: ["fighting", "rock"] },
    { sprite: "maid", nombre: "Doncella", enc: "rich", fem: true, tipos: ["fairy", "psychic"] },
    { sprite: "musician", nombre: "Músico", enc: "roughneck", tipos: ["normal", "electric"] },
    { sprite: "nursery_aide", nombre: "Monitora", enc: "lass", fem: true, tipos: ["normal", "fairy"] },
    { sprite: "preschooler_m", nombre: "Parvulito", enc: "youngster", tipos: ["normal", "bug"] },
    { sprite: "preschooler_f", nombre: "Parvulita", enc: "lass", tipos: ["normal", "fairy"] },
    { sprite: "ranger_f", nombre: "Pokémon Ranger", enc: "backpacker", tipos: ["grass", "water", "flying"] },
    { sprite: "ruin_maniac", nombre: "Ruinamaníaco", enc: "backpacker", tipos: ["rock", "ground"] },
    { sprite: "scuba_diver_m", nombre: "Buceador", enc: "ace_trainer", tipos: ["water"] },
    { sprite: "scuba_diver_f", nombre: "Buceadora", enc: "ace_trainer", tipos: ["water"] },
    { sprite: "smasher", nombre: "Tenista", enc: "cyclist", fem: true, tipos: ["normal", "fighting"] },
    { sprite: "snow_worker_m", nombre: "Operario Nival", enc: "clerk", tipos: ["ice", "steel"] },
    { sprite: "snow_worker_f", nombre: "Operaria Nival", enc: "clerk", tipos: ["ice", "water"] },
    { sprite: "striker", nombre: "Futbolista", enc: "cyclist", tipos: ["fighting", "fire"] },
    { sprite: "waiter_f", nombre: "Camarera", enc: "rich", tipos: ["normal", "fairy"] },
    { sprite: "worker_f", nombre: "Operaria", enc: "clerk", tipos: ["steel", "rock"] },
    { sprite: "young_couple", nombre: "Pareja", enc: "twins", pareja: ["Ana y Leo", "Nora y Íker", "Sara y Teo"], tipos: ["normal", "fairy", "grass"] },
    { sprite: "aroma_lady", nombre: "Aromaterapeuta", enc: "parasol_lady", fem: true, tipos: ["grass", "fairy"] },
];
CLASES_NUEVAS.forEach((c) => {
    if (!CLASES_ENTRENADOR.some((x) => x.sprite === c.sprite)) CLASES_ENTRENADOR.push({ sprite: c.sprite, nombre: c.nombre, enc: c.enc, fem: c.fem, pareja: c.pareja });
    TIPOS_CLASE[c.sprite] = c.tipos;
});
// Por dónde andan.
Object.entries({
    pradera: ["preschooler_m", "preschooler_f", "nursery_aide", "smasher"], pantano: ["ranger_f", "biker"], bosque: ["artist", "ranger_f"],
    llanura: ["musician", "clerk_m", "biker"], cantera: ["ruin_maniac", "linebacker"], cumbre: ["bird_keeper_m", "bird_keeper_f"],
    valle: ["collector", "bird_keeper_f"], playa: ["scuba_diver_m", "scuba_diver_f", "young_couple", "striker"], cueva: ["ruin_maniac", "collector"],
    jardin: ["aroma_lady", "baker", "maid"], mar: ["scuba_diver_f", "waiter_f"], ruinas: ["ruin_maniac", "harlequin", "artist"],
    niebla: ["harlequin", "doctor_m"], costa: ["janitor", "worker_f", "clerk_f"], nieve: ["snow_worker_m", "snow_worker_f"],
    tormenta: ["hoopster", "infielder", "striker"], victoria: ["doctor_f", "collector"],
}).forEach(([b, lista]) => { if (BIOMAS[b]) BIOMAS[b].clases.push(...lista.filter((s) => !BIOMAS[b].clases.includes(s))); });

// ===================== ZONAS NUEVAS =====================
// La Torre Prisma: una torre de cristal, con su propio paisaje (Pokémon eléctricos, de acero y psíquicos).
BIOMAS.prisma = { tipos: ["electric", "steel", "psychic"], noche: ["ghost"], fondo: "g6-city", musica: "metropolis",
    clases: ["scientist_f", "scientist_m", "ace_trainer_f", "ace_trainer_m", "clerk_f", "musician"] };
(() => {
    const zona = (id, datos, desde) => { nuevoLugar(id, Object.assign({ tipo: "zona" }, datos)); conectar(desde, id); };
    zona("bosque-eterno", { nombre: "Bosque Eterno", bioma: "bosque", med: 4, x: 22, y: 31, nivel: [28, 33],
        desc: "Un bosque antiquísimo donde el tiempo parece haberse detenido. Entre los árboles hay un pequeño santuario de madera." }, "ruta-2");
    zona("torre-prisma", { nombre: "Torre Prisma", bioma: "prisma", med: 6, x: 30, y: 18, nivel: [38, 44],
        desc: "Una torre de cristal donde Lem, el inventor de Ciudad Luminalia, estudia las megapiedras recién descubiertas." }, "ciudad-voltia");
    zona("islas-remolino", { nombre: "Islas Remolino", bioma: "mar", med: 12, x: 82, y: 18, nivel: [62, 68],
        desc: "Cuatro islotes rodeados de remolinos que ningún barco se atreve a cruzar. Del fondo del mar sube un canto." }, "puerto-marea");
    zona("torre-campana", { nombre: "Torre Campana", bioma: "ruinas", med: 13, x: 68, y: 45, nivel: [66, 72],
        desc: "Una pagoda de nueve pisos entre la niebla. Dicen que en lo más alto se posa un ave de fuego de siete colores." }, "ciudad-neblina");
    zona("fragua-magma", { nombre: "Fragua Magma", bioma: "volcan", med: 14, x: 79, y: 33, nivel: [70, 76],
        desc: "Una caldera de roca fundida bajo la isla. El calor deforma el aire y algo de metal ardiente se mueve en el fondo." }, "isla-volcan");
    zona("pilar-celeste", { nombre: "Pilar Celeste", bioma: "cielo", campeon: true, x: 44, y: 16, nivel: [88, 94], cerrado: "La entrada del Pilar Celeste está sellada. Solo el Campeón de la Liga puede subir.",
        desc: "Una torre en ruinas que se eleva hasta las nubes. En su cima duerme el guardián del cielo." }, "liga");
    zona("isla-luna-nueva", { nombre: "Isla Luna Nueva", bioma: "niebla", campeon: true, x: 54, y: 42, nivel: [86, 92], cerrado: "Ningún barquero quiere llevarte a la Isla Luna Nueva... salvo que seas el Campeón.",
        desc: "Una isla que solo aparece en las noches sin luna. Quien duerme en ella tiene pesadillas terribles." }, "ciudad-faro");
    zona("estadio-corona", { nombre: "Estadio Corona", campeon: true, x: 58, y: 20, fondo: "g6-city", musica: "metropolis", cerrado: "El Estadio Corona solo abre sus puertas a los Campeones.",
        desc: "El estadio más grande de Aurelia. Cada día reúne a Campeones de todas las regiones en el Torneo Corona." }, "liga");
})();
Object.assign(EVENTOS_POKEMON, {
    "bosque-eterno":   { id: "celebi", especie: 251, nivel: 40, titulo: "El santuario del bosque",
        lineas: ["Te acercas al pequeño santuario de madera...", "Una luz verde aparece entre los árboles y el aire se llena de hojas...", "¡Celebi ha viajado desde otro tiempo!"] },
    "islas-remolino":  { id: "lugia", especie: 249, nivel: 72, titulo: "Un canto bajo los remolinos",
        lineas: ["Los remolinos se calman de repente...", "Una sombra enorme sale del mar entre una lluvia de espuma.", "¡Lugia, el guardián de los mares, te observa!"] },
    "torre-campana":   { id: "ho-oh", especie: 250, nivel: 75, titulo: "Fuego en lo alto de la torre",
        lineas: ["Subes los nueve pisos de la torre...", "Un arcoíris cruza el cielo y las campanas suenan solas.", "¡Ho-Oh ha bajado a la Torre Campana!"] },
    "fragua-magma":    { id: "heatran", especie: 485, nivel: 78, titulo: "Metal fundido",
        lineas: ["El suelo de la caldera vibra como una forja...", "Algo de metal al rojo trepa por las paredes.", "¡Heatran sale de la lava!"] },
    "pilar-celeste":   { id: "rayquaza", especie: 384, nivel: 92, titulo: "La cima del cielo",
        lineas: ["En lo alto del pilar, el viento ruge sin parar...", "Una silueta verde enorme se despereza entre las nubes.", "¡Rayquaza ha despertado!"] },
    "isla-luna-nueva": { id: "darkrai", especie: 491, nivel: 90, titulo: "La pesadilla",
        lineas: ["Te entra un sueño muy pesado...", "Una sombra sin rostro flota sobre ti y todo se vuelve negro.", "¡Darkrai ha salido de la oscuridad!"] },
});

// ===================== VECINOS CON ENCARGOS =====================
// encargo: lo que hay que enseñarle (en el equipo) → { tipo, nivel } · { especies } · { capturas } · { equipo } · premio
const FOSILES = [138, 139, 140, 141, 142, 345, 346, 347, 348, 408, 409, 410, 411, 564, 565, 566, 567, 696, 697, 698, 699, 880, 881, 882, 883];
const VECINOS_NUEVOS = {
    "pueblo-raiz": { id: "monitora", sprite: "nursery_aide", cargo: "Monitora", nombre: "Rosa", color: "#f48fb1",
        lineas: ["¡Hola! Cuido de los Pokémon de los niños del pueblo mientras están en el colegio.", "Un buen entrenador siempre viaja con un equipo completo. ¿Me enseñas uno de seis?"],
        encargo: { equipo: 6, gracias: ["¡Qué equipo tan bonito! Se nota que los cuidas.", "Toma, con esto crecerán todavía más deprisa."], premio: [["rare-candy", 2]] } },
    "pueblo-albor": { id: "parvulita", sprite: "preschooler_f", cargo: "Parvulita", nombre: "Lola", color: "#ffb74d",
        lineas: ["¡Me encantan los bichitos! Los que tienen muchas patas y los que vuelan.", "¿Tienes algún Pokémon de tipo Bicho? ¡Porfa, porfa, enséñamelo!"],
        encargo: { tipo: "bug", gracias: ["¡Hala, qué chulo! ¡Gracias!", "Toma, lo encontré en el parque. A mí no me sirve."], premio: [["silver-powder", 1], ["great-ball", 3]] } },
    "villa-lumina": { id: "musico", sprite: "musician", cargo: "Músico", nombre: "Rafa", color: "#7986cb",
        lineas: ["Mis amplificadores se han quedado sin chispa justo antes del concierto...", "¿Tienes un Pokémon de tipo Eléctrico de nivel 20 o más? Con su ayuda podría tocar esta noche."],
        encargo: { tipo: "electric", nivel: 20, gracias: ["¡Ya suena! ¡Qué potencia!", "Llévate este imán: hace más fuertes los ataques eléctricos."], premio: [["magnet", 1]] } },
    "ciudad-hojarasca": { id: "artista", sprite: "artist", cargo: "Artista", nombre: "Salvador", color: "#9ccc65",
        lineas: ["Estoy pintando un cuadro del bosque, pero me falta algo verde y vivo...", "¿Me dejas pintar a un Pokémon de tipo Planta de nivel 25 o más?"],
        encargo: { tipo: "grass", nivel: 25, gracias: ["¡Perfecto! ¡Mira qué colores!", "Te regalo esta raíz que encontré mientras pintaba."], premio: [["big-root", 1], ["rare-candy", 1]] } },
    "ciudad-voltia": { id: "oficinista", sprite: "clerk_f", cargo: "Oficinista", nombre: "Elsa", color: "#90a4ae",
        lineas: ["Trabajo en la oficina de estadística de la región. Contamos todo: gente, Pokémon, farolas...", "Si has registrado 25 especies en tu Pokédex, me ayudarías mucho con el censo."],
        encargo: { capturas: 25, gracias: ["¡Veinticinco especies! Lo apunto todo.", "Como agradecimiento, este huevo: los Pokémon que lo llevan aprenden más deprisa."], premio: [["lucky-egg", 1]] } },
    "ciudad-cantera": { id: "ruinamaniaco", sprite: "ruin_maniac", cargo: "Ruinamaníaco", nombre: "Indalecio", color: "#a1887f",
        lineas: ["Llevo veinte años excavando y nunca he visto un Pokémon fósil vivo.", "Si algún día traes uno en tu equipo, ¿me lo enseñarás?"],
        encargo: { especies: FOSILES, texto: "un Pokémon fósil", gracias: ["¡Increíble! ¡Un fósil que respira!", "Toma, son mis mejores hallazgos. Se venden muy caros."], premio: [["nugget", 2], ["star-piece", 1]] } },
    "ciudad-celeste-alta": { id: "ornitologo", sprite: "bird_keeper_m", cargo: "Ornitólogo", nombre: "Fausto", color: "#4fc3f7",
        lineas: ["Desde el aeródromo veo pasar a los Pokémon voladores todo el día.", "Me encantaría ver de cerca un Pokémon de tipo Volador de nivel 35 o más."],
        encargo: { tipo: "flying", nivel: 35, gracias: ["¡Qué envergadura! ¡Qué plumaje!", "Toma este pico. Afila los ataques de tipo Volador."], premio: [["sharp-beak", 1], ["pp-up", 1]] } },
    "ciudad-escama": { id: "coleccionista", sprite: "collector", cargo: "Coleccionista", nombre: "Ramón", color: "#7e57c2",
        lineas: ["Colecciono escamas de dragón de todas las regiones.", "Si me enseñas un Pokémon de tipo Dragón de nivel 40 o más, te daré algo de mi colección."],
        encargo: { tipo: "dragon", nivel: 40, gracias: ["¡Qué escamas tan brillantes!", "Te doy una de mis escamas favoritas. A algunos Pokémon les hace evolucionar."], premio: [["dragon-scale", 1], ["rare-candy", 2]] } },
    "puerto-marea": { id: "buceadora", sprite: "scuba_diver_f", cargo: "Buceadora", nombre: "Marina", color: "#26c6da",
        lineas: ["Bajo el agua de este puerto hay perlas enormes, pero las corrientes son muy fuertes.", "¿Tienes un Pokémon de tipo Agua de nivel 45 o más que me acompañe?"],
        encargo: { tipo: "water", nivel: 45, gracias: ["¡Con él no hay corriente que valga!", "Mira lo que hemos encontrado ahí abajo. Es para ti."], premio: [["big-pearl", 2], ["pp-up", 1]] } },
    "ciudad-penasco": { id: "rugby", sprite: "linebacker", cargo: "Jugador de Rugby", nombre: "Toño", color: "#ef5350",
        lineas: ["¡Entreno empujando rocas! Pero necesito un compañero de verdad.", "¿Tienes un Pokémon de tipo Lucha de nivel 45 o más?"],
        encargo: { tipo: "fighting", nivel: 45, gracias: ["¡Uf! ¡Qué empuje!", "Toma este cinturón. Me lo regalaron por ganar la liga."], premio: [["black-belt", 1], ["rare-candy", 1]] } },
    "ciudad-jardin": { id: "pastelera", sprite: "baker", cargo: "Pastelera", nombre: "Dulce", color: "#f06292",
        lineas: ["Mis pasteles son los más famosos de la ciudad... ¡pero mis clientes favoritos son los Pokémon Hada!", "¿Me enseñas un Pokémon de tipo Hada de nivel 50 o más? Le tengo preparado un pastel."],
        encargo: { tipo: "fairy", nivel: 50, gracias: ["¡Se lo ha comido de un bocado! ¡Qué mono!", "Toma, para el viaje. Estos restos de comida le vendrán bien en combate."], premio: [["leftovers", 1]] } },
    "isla-volcan": { id: "doctor-ascua", sprite: "doctor_m", cargo: "Doctor", nombre: "Ascua", color: "#ff7043",
        lineas: ["Estudio cómo aguantan el calor los Pokémon del volcán.", "¿Puedo examinar un Pokémon de tipo Fuego de nivel 55 o más?"],
        encargo: { tipo: "fire", nivel: 55, gracias: ["¡Temperatura perfecta! Un ejemplar sanísimo.", "Te doy esta roca: con ella el sol que provocan tus Pokémon dura más."], premio: [["heat-rock", 1], ["pp-max", 1]] } },
    "ciudad-mente": { id: "arlequin", sprite: "harlequin", cargo: "Arlequín", nombre: "Pierrot", color: "#ba68c8",
        lineas: ["¡Je, je! Mi espectáculo de magia necesita un ayudante con poderes de verdad.", "¿Me prestas un momento un Pokémon de tipo Psíquico de nivel 55 o más?"],
        encargo: { tipo: "psychic", nivel: 55, gracias: ["¡Ovación! ¡El público se ha vuelto loco!", "Tu parte de la recaudación: esta arcilla mágica. Hace durar más las pantallas."], premio: [["light-clay", 1], ["ability-capsule", 1]] } },
    "ciudad-neblina": { id: "doncella", sprite: "maid", cargo: "Doncella", nombre: "Elvira", color: "#9575cd",
        lineas: ["En la mansión donde trabajo pasan cosas raras por las noches...", "Si me enseñas un Pokémon de tipo Fantasma de nivel 60 o más, a lo mejor dejo de tener miedo."],
        encargo: { tipo: "ghost", nivel: 60, gracias: ["Ay... ¡qué alivio! Si los fantasmas son así, no dan tanto miedo.", "La señora de la casa me pidió que le diera esto a alguien valiente."], premio: [["ability-patch", 1]] } },
    "ciudad-faro": { id: "conserje", sprite: "janitor", cargo: "Conserje", nombre: "Paco", color: "#8d6e63",
        lineas: ["Limpio el faro de arriba abajo y desde ahí veo Pokémon de todas clases.", "¿Has registrado ya 80 especies en tu Pokédex? Eso sí que sería un récord."],
        encargo: { capturas: 80, gracias: ["¡Ochenta! Eso no lo había visto nunca.", "Llévate esto, lo encontraron unos turistas en la playa."], premio: [["gold-bottle-cap", 1]] } },
    "pueblo-escarcha": { id: "operaria-nival", sprite: "snow_worker_f", cargo: "Operaria Nival", nombre: "Nieva", color: "#81d4fa",
        lineas: ["Quitamos la nieve de los caminos día y noche.", "Con un Pokémon de tipo Hielo de nivel 65 o más acabaríamos antes. ¿Me lo enseñas?"],
        encargo: { tipo: "ice", nivel: 65, gracias: ["¡Con este frío ni se inmuta!", "Toma esta roca helada: hace que la nieve dure más."], premio: [["icy-rock", 1], ["rare-candy", 2]] } },
    "ciudad-tormenta": { id: "futbolista", sprite: "striker", cargo: "Futbolista", nombre: "Tico", color: "#66bb6a",
        lineas: ["¡Busco al Pokémon más rápido y más fuerte de Aurelia para mi equipo!", "Si tienes uno de nivel 75 o más, ¡enséñamelo!"],
        encargo: { nivel: 75, gracias: ["¡Golazo! ¡Ese sí que es un campeón!", "Te regalo mi cinta de capitán. ¡Da muchísima fuerza!"], premio: [["choice-band", 1]] } },
};
Object.entries(VECINOS_NUEVOS).forEach(([lugar, v]) => { (VECINOS[lugar] = VECINOS[lugar] || []).push(v); });

const idEncargo = (v) => v.id + ":encargo";
const encargoPendiente = (v) => !!v.encargo && !hecho(idEncargo(v));
function textoEncargo(e) {
    if (e.texto) return e.texto;
    if (e.capturas) return `${e.capturas} especies en tu Pokédex`;
    if (e.equipo) return `un equipo de ${e.equipo} Pokémon`;
    if (e.tipo) return `un Pokémon de tipo ${TIPOS_ES[e.tipo]}${e.nivel ? ` de nivel ${e.nivel} o más` : ""}`;
    return `un Pokémon de nivel ${e.nivel} o más`;
}
async function encargoCumplido(e) {
    const eq = entrenador.equipo.map((id) => ({ id, nivel: (entrenador.capturados[id] && entrenador.capturados[id].nivel) || 5 }));
    if (e.especies) return eq.some((x) => e.especies.includes(x.id));
    if (e.capturas) return Object.keys(entrenador.capturados).length >= e.capturas;
    if (e.equipo) return eq.length >= e.equipo;
    for (const x of eq) {
        if (x.nivel < (e.nivel || 0)) continue;
        if (!e.tipo) return true;
        try { if ((await cargarPokemon(x.id)).types.some((t) => t.type.name === e.tipo)) return true; } catch (_) {}
    }
    return false;
}
// Al volver a hablarle: si ya puedes cumplir su encargo, te da su premio; si no, te recuerda lo que busca.
// La guardiana del Pilar Celeste: enseña Ascenso Draco a tu Rayquaza (con él puede megaevolucionar sin megapiedra).
VECINOS["pilar-celeste"] = [{ id: "guardiana-draconida", sprite: "dragon_tamer", cargo: "Guardiana Dracónida", nombre: "Ilma", color: "#2e7d32",
    lineas: ["Mi pueblo lleva siglos guardando este pilar y la leyenda de su guardián.", "Dicen que el ferviente deseo de las personas puede hacer que Rayquaza megaevolucione... sin megapiedra.",
        "Si algún día Rayquaza viaja contigo, tráemelo. Le enseñaré el movimiento sagrado de mi pueblo: Ascenso Draco."],
    encargo: { especies: [384], texto: "a Rayquaza en tu equipo", premio: [],
        gracias: ["¡Es él! El guardián del cielo ha elegido viajar contigo.", "Escucha bien, Rayquaza: este es el Ascenso Draco. Con él, el deseo de tu entrenador te hará megaevolucionar."],
        alCumplir: async () => {
            try { const m = movDeAPI(await cargarMovimiento("dragon-ascent"), 1); await ofrecerAprender(384, m); } catch (_) {}
        } } }];
async function hablarEncargo(L, v, recien = false) {
    const e = v.encargo, quien = { sprite: v.sprite, cargo: v.cargo, nombre: v.nombre, color: v.color, fondo: fondoDe(L) };
    if (!(await encargoCumplido(e))) {
        if (!recien) await conversar(Object.assign({}, quien, { lineas: [{ txt: `¿Ya tienes ${textoEncargo(e)}? ¡Vuelve cuando lo tengas!`, emote: "!" }] }));
        return false;
    }
    await conversar(Object.assign({}, quien, { lineas: e.gracias.map((t, i) => (i ? t : { txt: t, emote: "corazon" })) }));
    const dados = darObjetos(e.premio || []);
    if (dados.length) { AudioFX.efecto("item_fanfare"); toast("Recibes: " + textoPremios(dados), 4200); }
    if (e.alCumplir) await e.alCumplir();
    marcarHecho(idEncargo(v));
    entrenador.encargosHechos = (entrenador.encargosHechos || 0) + 1;
    guardarEntrenador();
    return true;
}
LOGROS.push(
    { id: "encargos-5", nombre: "Buen vecino", desc: "Cumple 5 encargos de los vecinos de Aurelia.", icono: "grass-mail", meta: 5, valor: () => entrenador.encargosHechos || 0, premio: [["pp-max", 2]] },
    { id: "encargos-17", nombre: "Favorito de Aurelia", desc: "Cumple los 17 encargos de los vecinos.", icono: "gracidea", meta: 17, valor: () => entrenador.encargosHechos || 0, premio: [["master-ball", 1]] },
    { id: "leyendas-ampliacion", nombre: "Guardianes de Aurelia", desc: "Encuentra a Celebi, Lugia, Ho-Oh, Heatran, Rayquaza y Darkrai.", icono: "rainbow-wing", meta: 6,
        valor: () => ["celebi", "lugia", "ho-oh", "heatran", "rayquaza", "darkrai"].filter((k) => entrenador.mundo && entrenador.mundo.hechos.includes(k)).length, premio: [["master-ball", 1]] },
);

// ===================== TORRE PRISMA: LEM Y LAS MEGAPIEDRAS DE LUMINALIA =====================
const PIEDRAS_ZA = Object.keys(MEGAS).filter((k) => MEGAS[k].pr && /^\d/.test(MEGAS[k].pr) && OBJETOS[k] && /Luminalia/.test(OBJETOS[k][5]));
const PRECIO_PIEDRA_ZA = (k) => (esLegendario(MEGAS[k].base) ? 60000 : 25000);
const LEM = { cargo: "Inventor", nombre: "Lem", atlas: "images/trainer/clemont", fps: 12, voz: 1.1, color: "#f9a825" };
VECINOS["torre-prisma"] = [{ id: "lem", sprite: "clemont", cargo: "Inventor", nombre: "Lem", color: "#f9a825",
    lineas: ["¡Hola! Soy Lem, de Ciudad Luminalia. ¡He venido a Aurelia a estudiar las megapiedras nuevas!", "En Luminalia se han descubierto megapiedras para un montón de Pokémon: Dragonite, Greninja, Starmie, Garchomp... ¡incluso Zygarde!",
        "¡La ciencia es increíble! Toma, para que lo compruebes tú mism{o}: una de las piedras que he traído.", "Si quieres más, en mi laboratorio te vendo las demás. ¡Y si te ves con fuerza, te reto a un combate!"],
    alPrimera: () => { const k = regaloLem(); if (k) { AudioFX.efecto("item_fanfare"); toast(`¡Lem te regala la ${obj(k).nombre}!`, 4200); } } }];
TIENDAS.prisma = {
    P: () => LEM,
    titulo: "Laboratorio de Lem", cartel: "LABORATORIO PRISMA", lugar: "al laboratorio de Lem",
    escaparate: () => PIEDRAS_ZA.filter((k) => !tieneObjeto(k)).slice(0, 10),
    musica: () => mus("laboratory"), categorias: [{ id: "za", nombre: "Megapiedras de Luminalia", icono: "dragoninite", filtro: () => true }],
    stock: (c) => PIEDRAS_ZA.filter((k) => !tieneObjeto(k) && c.filtro(k)).sort((a, b) => PRECIO_PIEDRA_ZA(a) - PRECIO_PIEDRA_ZA(b) || obj(a).nombre.localeCompare(obj(b).nombre, "es")),
    precio: (k) => PRECIO_PIEDRA_ZA(k), saldo: () => entrenador.dinero || 0, cobrar: (n) => { entrenador.dinero -= n; }, fmt: (n) => dineroTexto(n), etqSaldo: "Dinero",
    vende: false, volver: "principal", pide: "¡Todas estas megapiedras vienen de Luminalia! ¿Cuál te llevas?", sinSaldo: "Vaya... no te llega el dinero. ¡La ciencia es cara!",
};
// La primera vez, Lem regala una piedra de un Pokémon que ya tengas (si no, una cualquiera).
function regaloLem() {
    const faltan = PIEDRAS_ZA.filter((k) => !tieneObjeto(k) && !esLegendario(MEGAS[k].base));
    const tuyas = faltan.filter((k) => entrenador.capturados[MEGAS[k].base]);
    const k = alAzar(tuyas.length ? tuyas : faltan); if (!k) return null;
    meterObjeto(k); return k;
}
// Su combate: tipo Eléctrico, con su Mega-Eelektross. La primera victoria regala dos piedras más.
function retarLem() {
    const nivel = Math.max(44, ...entrenador.equipo.map((id) => entrenador.capturados[id].nivel || 5)) + 1;
    combateEntrenador({
        titulo: "Inventor Lem", sprite: "clemont", vs: true, pago: "lider", poderRival: null, fondo: "g6-city", musica: mus("battle_kalos_gym"),
        dialogo: "¡La ciencia de las megaevoluciones es el futuro! ¡Te lo demostraré!", dialogoDerrota: "¡Increíble! ¡Tu vínculo con tus Pokémon es más fuerte que cualquier invento!",
        specs: [{ id: 702, nivel: nivel - 3 }, { id: 695, nivel: nivel - 2 }, { id: 462, nivel: nivel - 2 }, { id: 26, nivel: nivel - 1 }, { id: 604, nivel, objeto: "eelektrossite" }]
            .slice(nivel >= 55 ? 0 : 1),
        alGanar: async () => {
            if (hecho("lem-combate")) return;
            marcarHecho("lem-combate");
            const dadas = [regaloLem(), regaloLem()].filter(Boolean);
            if (dadas.length) { AudioFX.efecto("item_fanfare"); toast(`¡Lem te regala: ${dadas.map((k) => obj(k).nombre).join(" y ")}!`, 4200); }
        },
    });
}
// Tarjetas propias de algunos lugares (las añade renderRegion): el laboratorio y el reto de Lem.
function tarjetasLugarExtra(L) {
    if (L.id !== "torre-prisma" || !hecho("lem")) return [];
    return [{
        html: `<button class="lg-tarjeta lg-edificio prisma" data-sub="prisma">
            <canvas class="lg-npc" data-sprite="clemont"></canvas>
            <div class="lg-info"><span class="hub-etq">Laboratorio</span><h4>Megapiedras de Luminalia</h4><p>${PIEDRAS_ZA.filter((k) => !tieneObjeto(k)).length} piedras a la venta.</p></div>
        </button>
        <article class="lg-tarjeta lg-evento rival">
            <canvas class="lg-npc" data-sprite="clemont"></canvas>
            <div class="lg-info"><span class="hub-etq">Reto</span><h4>Inventor Lem</h4><p>${hecho("lem-combate") ? "Quiere la revancha cuando quieras." : "¡Usa una megaevolución nueva!"}</p></div>
            <button class="btn-grande" data-reto-lem>¡Combatir!</button>
        </article>`,
        conectar: (cont) => { const b = cont.querySelector("[data-reto-lem]"); if (b) b.onclick = () => { if (equipoDebilitado()) return avisoDebilitado(); retarLem(); }; },
    }];
}

// ===================== REGALO MISTERIOSO: COLECCIÓN MEGA =====================
// Una vez por partida: todos los Pokémon que megaevolucionan (los que no tengas, al nivel de tu Pokémon más fuerte, en una
// Gloria Ball) y todas las megapiedras, también las segundas de los que tienen dos megas (Charizard X e Y, Mewtwo X e Y,
// Raichu X e Y, Absol, Garchomp y Lucario Z). Rayquaza llega sabiendo Ascenso Draco.
const especiesMega = () => [...new Set(Object.values(MEGAS).map((m) => m.base).concat([MEGA_RAYQUAZA.base]))].sort((a, b) => a - b);
const regaloMegaRecibido = () => !!(entrenador.regalos && entrenador.regalos.megas);
async function regaloColeccionMega() {
    if (!hayPartida() || regaloMegaRecibido()) return null;
    entrenador.regalos = Object.assign({}, entrenador.regalos, { megas: true });
    const nivel = Math.max(30, ...entrenador.equipo.map((id) => (entrenador.capturados[id] && entrenador.capturados[id].nivel) || 1));
    const nuevos = [];
    for (const id of especiesMega()) {
        marcarVisto(id);
        if (entrenador.capturados[id]) continue;
        entrenador.capturados[id] = { nivel, xp: 0, objeto: null, genero: generoAleatorio(id), bola: "cherish-ball", movimientos: null, nivelCaptura: nivel,
            naturaleza: naturalezaAleatoria(), habSlot: 1, lugarCaptura: "regalo", recibido: true };
        nuevos.push(id);
    }
    const piedras = Object.keys(MEGAS).filter((k) => !tieneObjeto(k));
    piedras.forEach((k) => meterObjeto(k, 1));
    guardarEntrenador();
    await Promise.all(nuevos.map((id) => asegurarMovimientos(id).catch(() => [])));
    // Rayquaza, con su movimiento sagrado (sin él no puede megaevolucionar).
    const ray = entrenador.capturados[384];
    if (ray && nuevos.includes(384) && Array.isArray(ray.movimientos) && !ray.movimientos.some((m) => m.clave === "dragon-ascent")) {
        try { const m = movDeAPI(await cargarMovimiento("dragon-ascent"), 1); const { nivel: _, ...limpio } = m; if (ray.movimientos.length >= 4) ray.movimientos.pop(); ray.movimientos.push(limpio); } catch (_) {}
    }
    guardarEntrenador();
    return { pokemon: nuevos.length, piedras: piedras.length };
}
