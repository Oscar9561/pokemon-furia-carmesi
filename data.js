/* =========================================================
   DATOS Y UTILIDADES COMPARTIDAS
   Tipos, movimientos reales (PokéAPI), experiencia, legendarios, megas y caché.
   ========================================================= */

const TOTAL_NACIONAL = 1025;
const URL_LISTA = `https://pokeapi.co/api/v2/pokemon-species?limit=${TOTAL_NACIONAL}`;

const GENERACIONES = {
    1: [1, 151],   2: [152, 251], 3: [252, 386],
    4: [387, 493], 5: [494, 649], 6: [650, 721],
    7: [722, 809], 8: [810, 905], 9: [906, 1025],
};

const TIPOS_ES = {
    normal: "Normal", fire: "Fuego", water: "Agua", grass: "Planta",
    electric: "Eléctrico", ice: "Hielo", fighting: "Lucha", poison: "Veneno",
    ground: "Tierra", flying: "Volador", psychic: "Psíquico", bug: "Bicho",
    rock: "Roca", ghost: "Fantasma", dragon: "Dragón", dark: "Siniestro",
    steel: "Acero", fairy: "Hada",
};

const STATS_ES = {
    "hp": "PS", "attack": "Ataque", "defense": "Defensa",
    "special-attack": "At. Esp.", "special-defense": "Def. Esp.", "speed": "Velocidad",
};

const STATS_DUELO = [
    { clave: "peso",    etiqueta: "más peso" },
    { clave: "altura",  etiqueta: "más altura" },
    { clave: "hp",      etiqueta: "más PS" },
    { clave: "attack",  etiqueta: "más Ataque" },
    { clave: "defense", etiqueta: "más Defensa" },
    { clave: "speed",   etiqueta: "más Velocidad" },
];

// ===================== TABLA DE EFECTIVIDAD =====================
const EFECTIVIDAD = {
    normal:   { rock: 0.5, ghost: 0, steel: 0.5 },
    fire:     { fire: 0.5, water: 0.5, grass: 2, ice: 2, bug: 2, rock: 0.5, dragon: 0.5, steel: 2 },
    water:    { fire: 2, water: 0.5, grass: 0.5, ground: 2, rock: 2, dragon: 0.5 },
    electric: { water: 2, electric: 0.5, grass: 0.5, ground: 0, flying: 2, dragon: 0.5 },
    grass:    { fire: 0.5, water: 2, grass: 0.5, poison: 0.5, ground: 2, flying: 0.5, bug: 0.5, rock: 2, dragon: 0.5, steel: 0.5 },
    ice:      { fire: 0.5, water: 0.5, grass: 2, ice: 0.5, ground: 2, flying: 2, dragon: 2, steel: 0.5 },
    fighting: { normal: 2, ice: 2, poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, rock: 2, ghost: 0, dark: 2, steel: 2, fairy: 0.5 },
    poison:   { grass: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0, fairy: 2 },
    ground:   { fire: 2, electric: 2, grass: 0.5, poison: 2, flying: 0, bug: 0.5, rock: 2, steel: 2 },
    flying:   { electric: 0.5, grass: 2, fighting: 2, bug: 2, rock: 0.5, steel: 0.5 },
    psychic:  { fighting: 2, poison: 2, psychic: 0.5, dark: 0, steel: 0.5 },
    bug:      { fire: 0.5, grass: 2, fighting: 0.5, poison: 0.5, flying: 0.5, psychic: 2, ghost: 0.5, dark: 2, steel: 0.5, fairy: 0.5 },
    rock:     { fire: 2, ice: 2, fighting: 0.5, ground: 0.5, flying: 2, bug: 2, steel: 0.5 },
    ghost:    { normal: 0, psychic: 2, ghost: 2, dark: 0.5 },
    dragon:   { dragon: 2, steel: 0.5, fairy: 0 },
    dark:     { fighting: 0.5, psychic: 2, ghost: 2, dark: 0.5, fairy: 0.5 },
    steel:    { fire: 0.5, water: 0.5, electric: 0.5, ice: 2, rock: 2, steel: 0.5, fairy: 2 },
    fairy:    { fire: 0.5, fighting: 2, poison: 0.5, dragon: 2, dark: 2, steel: 0.5 },
};
function efectividad(tipoMov, tiposDef) {
    let mult = 1;
    const tabla = EFECTIVIDAD[tipoMov] || {};
    tiposDef.forEach((t) => { if (tabla[t] !== undefined) mult *= tabla[t]; });
    return mult;
}

// ===================== MOVIMIENTOS DE RESPALDO =====================
// Solo si un Pokémon no tiene ataques de daño a su nivel (p. ej. Magikarp muy bajo).
const movR = (clave, nombre, tipo, poder, cat, prec = 1) => ({ clave, nombre, tipo, poder, cat, prec });
const MOVIMIENTOS = {
    normal:   [movR("body-slam", "Golpe Cuerpo", "normal", 85, "fis"),        movR("tackle", "Placaje", "normal", 40, "fis")],
    fire:     [movR("flamethrower", "Lanzallamas", "fire", 90, "esp"),         movR("ember", "Ascuas", "fire", 40, "esp")],
    water:    [movR("hydro-pump", "Hidrobomba", "water", 110, "esp", 0.8),     movR("water-gun", "Pistola Agua", "water", 40, "esp")],
    electric: [movR("thunderbolt", "Rayo", "electric", 90, "esp"),             movR("thunder-shock", "Impactrueno", "electric", 40, "esp")],
    grass:    [movR("energy-ball", "Energibola", "grass", 90, "esp"),          movR("razor-leaf", "Hoja Afilada", "grass", 55, "fis", 0.95)],
    ice:      [movR("ice-beam", "Rayo Hielo", "ice", 90, "esp"),               movR("icy-wind", "Viento Hielo", "ice", 55, "esp", 0.95)],
    fighting: [movR("close-combat", "A Bocajarro", "fighting", 120, "fis"),    movR("karate-chop", "Golpe Kárate", "fighting", 50, "fis")],
    poison:   [movR("sludge-bomb", "Bomba Lodo", "poison", 90, "esp"),         movR("acid", "Ácido", "poison", 40, "esp")],
    ground:   [movR("earthquake", "Terremoto", "ground", 100, "fis"),          movR("mud-slap", "Bofetón Lodo", "ground", 20, "esp")],
    flying:   [movR("brave-bird", "Pájaro Osado", "flying", 120, "fis"),       movR("gust", "Tornado", "flying", 40, "esp")],
    psychic:  [movR("psychic", "Psíquico", "psychic", 90, "esp"),              movR("confusion", "Confusión", "psychic", 50, "esp")],
    bug:      [movR("bug-buzz", "Zumbido", "bug", 90, "esp"),                  movR("bug-bite", "Picadura", "bug", 60, "fis")],
    rock:     [movR("rock-slide", "Avalancha", "rock", 75, "fis", 0.9),        movR("rock-throw", "Lanzarrocas", "rock", 50, "fis", 0.9)],
    ghost:    [movR("shadow-ball", "Bola Sombra", "ghost", 80, "esp"),         movR("lick", "Lengüetazo", "ghost", 30, "fis")],
    dragon:   [movR("dragon-claw", "Garra Dragón", "dragon", 80, "fis"),       movR("dragon-breath", "Dragoaliento", "dragon", 60, "esp")],
    dark:     [movR("dark-pulse", "Pulso Umbrío", "dark", 80, "esp"),          movR("bite", "Mordisco", "dark", 60, "fis")],
    steel:    [movR("flash-cannon", "Foco Resplandor", "steel", 80, "esp"),    movR("metal-claw", "Garra Metal", "steel", 50, "fis", 0.95)],
    fairy:    [movR("moonblast", "Fuerza Lunar", "fairy", 95, "esp"),          movR("disarming-voice", "Voz Cautivadora", "fairy", 40, "esp")],
};
function construirMoveset(tipos) {
    const set = [];
    const meter = (x) => { if (x && !set.some((y) => y.clave === x.clave)) set.push({ ...x }); };
    tipos.forEach((t) => meter(MOVIMIENTOS[t] && MOVIMIENTOS[t][0]));
    meter(MOVIMIENTOS[tipos[0]] && MOVIMIENTOS[tipos[0]][1]);
    meter(MOVIMIENTOS.normal[1]);
    return set.slice(0, 4);
}

// ===================== MOVIMIENTOS REALES (aprendizaje por nivel) =====================
const _cacheMov = new Map();
async function cargarMovimiento(nombre) {
    if (_cacheMov.has(nombre)) return _cacheMov.get(nombre);
    const p = pedir(`https://pokeapi.co/api/v2/move/${nombre}`);
    _cacheMov.set(nombre, p);
    p.catch(() => _cacheMov.delete(nombre));
    return p;
}
function nombreEsMov(mv) {
    const es = (mv.names || []).find((n) => n.language && n.language.name === "es");
    return es ? es.name : nombreBonito(mv.name);
}
// Movimientos con efectos propios que resuelve el motor de combate (battle.js).
const MOV_ESPECIAL = {
    protect: "proteccion", detect: "proteccion", "kings-shield": "proteccion", "spiky-shield": "proteccion", "baneful-bunker": "proteccion",
    "silk-trap": "proteccion", "burning-bulwark": "proteccion",
    "leech-seed": "drenadoras", reflect: "reflejo", "light-screen": "pantallaLuz", "aurora-veil": "veloAurora",
    taunt: "mofa", tailwind: "vientoAfin",
    "stealth-rock": "rocas", spikes: "puas", "toxic-spikes": "toxicas", "sticky-web": "red", defog: "despejar", "tidy-up": "limpieza",
    "trick-room": "espacioRaro", haze: "niebla", rest: "descanso", "sleep-talk": "sonambulo", roar: "arrastrar", whirlwind: "arrastrar",
    "electric-terrain": "terreno", "grassy-terrain": "terreno", "misty-terrain": "terreno", "psychic-terrain": "terreno",
    yawn: "bostezo", encore: "otraVez", "pain-split": "dividir", "belly-drum": "tambor", wish: "deseo", substitute: "sustituto",
    disable: "anular", attract: "atraccion", ingrain: "arraigo", "aqua-ring": "acuaAro", "mean-look": "bloqueo", block: "bloqueo",
    "spider-web": "bloqueo", safeguard: "veloSagrado", mist: "neblina", "focus-energy": "foco", "lock-on": "fijar", "mind-reader": "fijar",
    "heal-bell": "campana", aromatherapy: "campana", "psych-up": "masPsique", memento: "legado", "healing-wish": "deseoCura",
    "lunar-dance": "deseoCura", transform: "transformar",
    "quick-guard": "proteccion", "wide-guard": "proteccion", "crafty-shield": "proteccion", "mat-block": "proteccion", obstruct: "proteccion",
};
// Los que se programaron después: cada uno con su propio efecto (battle.js, efectoNuevo).
const MOVS_NUEVOS_ESTADO = new Set(["shell-smash", "victory-dance", "shelter", "fillet-away", "take-heart", "acupressure", "stockpile", "curse", "spicy-extract", "laser-focus", "magnet-rise", "telekinesis", "endure", "strength-sap", "lunar-blessing", "jungle-healing", "purify", "refresh", "psycho-shift", "revival-blessing", "recycle", "trick", "switcheroo", "bestow", "corrosive-gas", "embargo", "heal-block", "torment", "imprison", "spite", "nightmare", "octolock", "foresight", "odor-sleuth", "miracle-eye", "electrify", "powder", "magic-coat", "snatch", "conversion", "conversion-2", "camouflage", "reflect-type", "soak", "magic-powder", "trick-or-treat", "forests-curse", "worry-seed", "simple-beam", "entrainment", "role-play", "doodle", "skill-swap", "gastro-acid", "power-trick", "power-shift", "power-swap", "guard-swap", "heart-swap", "speed-swap", "power-split", "guard-split", "topsy-turvy", "gravity", "magic-room", "wonder-room", "mud-sport", "water-sport", "ion-deluge", "fairy-lock", "lucky-chant", "court-change", "happy-hour", "splash", "celebrate", "baton-pass", "teleport", "shed-tail", "chilly-reception", "metronome", "nature-power", "copycat", "mirror-move", "me-first", "assist", "mimic", "sketch", "destiny-bond", "perish-song"]);
MOVS_NUEVOS_ESTADO.forEach((k) => { MOV_ESPECIAL[k] = k; });
// Los que alcanzan a todos los rivales (Vasta Guardia los para).
const MOVS_AREA = new Set(["earthquake", "surf", "rock-slide", "heat-wave", "discharge", "hyper-voice", "dazzling-gleam", "blizzard", "icy-wind", "bulldoze",
    "muddy-water", "snarl", "eruption", "water-spout", "lava-plume", "sludge-wave", "boomburst", "origin-pulse", "precipice-blades", "glaciate", "breaking-swipe",
    "electroweb", "struggle-bug", "make-it-rain", "petal-blizzard", "magnitude", "explosion", "self-destruct", "parabolic-charge", "air-cutter", "razor-leaf",
    "powder-snow", "acid", "bubble", "swift", "twister", "brutal-swing", "diamond-storm", "thousand-arrows", "thousand-waves", "core-enforcer", "clanging-scales",
    "springtide-storm", "bleakwind-storm", "wildbolt-storm", "sandsear-storm", "mortal-spin", "spin-out", "expanding-force", "dragon-energy", "fiery-wrath"]);
// Golpes fulminantes: debilitan de un golpe si aciertan (no afectan a los de más nivel).
const OHKO = new Set(["guillotine", "horn-drill", "fissure", "sheer-cold"]);
// Metrónomo: cualquiera de estos ataques (todos los de daño, salvo los Z, los Max y los que no puede usar).
const METRONOMO = "absorb accelerock acid acid-spray acrobatics aerial-ace aeroblast air-cutter air-slash alluring-voice anchor-shot ancient-power apple-acid aqua-cutter aqua-jet aqua-step aqua-tail arm-thrust armor-cannon assurance astonish astral-barrage attack-order aura-sphere aura-wheel aurora-beam avalanche axe-kick baddy-bad barb-barrage barrage behemoth-bash behemoth-blade bind bite bitter-blade bitter-malice blast-burn blaze-kick blazing-torque bleakwind-storm blizzard blood-moon blue-flare body-press body-slam bolt-beak bolt-strike bone-club bone-rush bonemerang boomburst bounce bouncy-bubble branch-poke brave-bird breaking-swipe brick-break brine brutal-swing bubble bubble-beam bug-bite bug-buzz bulldoze bullet-punch bullet-seed burn-up burning-jealousy buzzy-buzz ceaseless-edge charge-beam chilling-water chip-away chloroblast circle-throw clamp clanging-scales clear-smog close-combat collision-course combat-torque comet-punch comeuppance confusion constrict core-enforcer crabhammer cross-chop cross-poison crunch crush-claw cut dark-pulse darkest-lariat dazzling-gleam diamond-storm dig dire-claw disarming-voice discharge dive dizzy-punch doom-desire double-edge double-hit double-iron-bash double-kick double-shock double-slap draco-meteor dragon-ascent dragon-breath dragon-claw dragon-darts dragon-energy dragon-hammer dragon-pulse dragon-rush dragon-tail drain-punch draining-kiss dream-eater drill-peck drill-run drum-beating dual-chop dual-wingbeat dynamax-cannon dynamic-punch earth-power earthquake echoed-voice eerie-spell egg-bomb electro-drift electro-shot electroweb ember energy-ball eruption esper-wing eternabeam expanding-force extrasensory extreme-speed facade fairy-wind fake-out false-surrender false-swipe feint-attack fell-stinger fickle-beam fiery-dance fiery-wrath fire-blast fire-fang fire-lash fire-pledge fire-punch fire-spin first-impression fishious-rend flame-burst flame-charge flame-wheel flamethrower flare-blitz flash-cannon fleur-cannon flip-turn floaty-fall flower-trick fly flying-press focus-blast force-palm foul-play freeze-dry freeze-shock freezing-glare freezy-frost frenzy-plant frost-breath fury-attack fury-cutter fury-swipes fusion-bolt fusion-flare future-sight gear-grind giga-drain giga-impact gigaton-hammer glacial-lance glaciate glaive-rush glitzy-glow grass-pledge grassy-glide grav-apple gunk-shot gust hammer-arm head-charge head-smash headbutt headlong-rush heart-stamp heat-wave hex hidden-power high-horsepower high-jump-kick hold-back horn-attack horn-leech hurricane hydro-cannon hydro-pump hydro-steam hyper-beam hyper-drill hyper-fang hyper-voice hyperspace-fury hyperspace-hole ice-ball ice-beam ice-burn ice-fang ice-hammer ice-punch ice-shard ice-spinner icicle-crash icicle-spear icy-wind incinerate infernal-parade inferno infestation iron-head iron-tail ivy-cudgel jaw-lock jet-punch judgment jump-kick karate-chop knock-off kowtow-cleave lands-wrath lash-out last-resort last-respects lava-plume leaf-blade leaf-storm leaf-tornado leafage leech-life lick light-of-ruin liquidation low-sweep lumina-crash lunge luster-purge mach-punch magical-leaf magical-torque magma-storm magnet-bomb make-it-rain malignant-chain matcha-gotcha mega-drain mega-kick mega-punch megahorn metal-claw meteor-assault meteor-beam meteor-mash mighty-cleave mind-blown mirror-shot mist-ball moonblast moongeist-beam mortal-spin mountain-gale mud-bomb mud-shot mud-slap muddy-water multi-attack mystical-fire mystical-power needle-arm night-daze night-slash noxious-torque nuzzle oblivion-wing octazooka ominous-wind order-up origin-pulse outrage overdrive overheat parabolic-charge pay-day payback peck petal-blizzard petal-dance phantom-force photon-geyser pin-missile plasma-fists play-rough pluck poison-fang poison-jab poison-sting poison-tail pollen-puff poltergeist population-bomb pounce pound powder-snow power-gem power-trip power-up-punch power-whip precipice-blades prismatic-laser psybeam psyblade psychic psychic-fangs psychic-noise psycho-boost psycho-cut psyshield-bash psyshock psystrike pursuit pyro-ball quick-attack rage rage-fist raging-bull raging-fury rapid-spin razor-leaf razor-shell razor-wind relic-song retaliate revelation-dance revenge rising-voltage roar-of-time rock-blast rock-climb rock-slide rock-smash rock-throw rock-tomb rock-wrecker rolling-kick rollout round ruination sacred-fire sacred-sword salt-cure sand-tomb sandsear-storm sappy-seed scald scale-shot scorching-sands scratch searing-shot secret-power secret-sword seed-bomb seed-flare shell-side-arm shock-wave signal-beam silver-wind sizzly-slide skitter-smack skull-bash sky-attack sky-uppercut slam slash sludge sludge-bomb sludge-wave smack-down smart-strike smelling-salts smog snap-trap snarl snipe-shot solar-beam solar-blade spacial-rend spark sparkling-aria sparkly-swirl spectral-thief spike-cannon spin-out spirit-break spirit-shackle splishy-splash springtide-storm steam-eruption steamroller steel-beam steel-roller steel-wing stomp stomping-tantrum stone-axe stone-edge stored-power storm-throw strange-steam strength struggle-bug submission sucker-punch sunsteel-strike supercell-slam superpower surf surging-strikes swift synchronoise syrup-bomb tachyon-cutter tackle tail-slap take-down techno-blast temper-flare tera-blast tera-starstorm terrain-pulse thousand-arrows thousand-waves thrash throat-chop thunder thunder-cage thunder-fang thunder-punch thunder-shock thunderbolt thunderclap thunderous-kick torch-song trailblaze tri-attack triple-arrows triple-axel triple-dive triple-kick trop-kick twin-beam twineedle twister u-turn upper-hand uproar v-create vacuum-wave venoshock vice-grip vine-whip vital-throw volt-switch volt-tackle wake-up-slap water-gun water-pledge water-pulse water-shuriken water-spout waterfall wave-crash weather-ball whirlpool wicked-blow wicked-torque wild-charge wildbolt-storm wing-attack wood-hammer wrap x-scissor zap-cannon zen-headbutt zing-zap zippy-zap".split(" ");
// Lanzamiento: su potencia según el objeto lanzado; Don Natural: el tipo según la baya.
const PODER_LANZAR = { "iron-ball": 130, "hard-stone": 100, "rare-bone": 100, "thick-club": 90, "assault-vest": 80, "heavy-duty-boots": 80, "rocky-helmet": 60,
    "flame-orb": 30, "toxic-orb": 30, "light-ball": 30, "kings-rock": 30, "razor-fang": 30, "poison-barb": 70, "dragon-fang": 70, "life-orb": 30, "choice-band": 10, "choice-scarf": 10, "choice-specs": 10 };
const poderLanzar = (k) => (!k ? 0 : PODER_LANZAR[k] || (obj(k).bolsillo === "bayas" ? 10 : 30));
const TIPO_REGALO = { "cheri-berry": "fire", "chesto-berry": "water", "pecha-berry": "electric", "rawst-berry": "grass", "aspear-berry": "ice", "leppa-berry": "fighting",
    "oran-berry": "poison", "persim-berry": "ground", "lum-berry": "flying", "sitrus-berry": "psychic", "figy-berry": "bug", "wiki-berry": "rock", "mago-berry": "ghost",
    "aguav-berry": "dragon", "iapapa-berry": "dark", "liechi-berry": "grass", "ganlon-berry": "ice", "salac-berry": "fighting", "petaya-berry": "poison", "apicot-berry": "ground",
    "lansat-berry": "flying", "starf-berry": "psychic", "occa-berry": "fire", "passho-berry": "water", "wacan-berry": "electric", "rindo-berry": "grass", "yache-berry": "ice",
    "chople-berry": "fighting", "kebia-berry": "poison", "shuca-berry": "ground", "coba-berry": "flying", "payapa-berry": "psychic", "tanga-berry": "bug", "charti-berry": "rock",
    "kasib-berry": "ghost", "haban-berry": "dragon", "colbur-berry": "dark", "babiri-berry": "steel", "chilan-berry": "normal", "roseli-berry": "fairy" };
// Lo que hacen (para la ficha y los datos del combate).
const TXT_MOVS_NUEVOS = {
    "shell-smash": "Baja su Defensa y Defensa Especial, pero sube mucho su Ataque, Ataque Especial y Velocidad", "victory-dance": "Sube su Ataque, Defensa y Velocidad",
    shelter: "Sube mucho su Defensa", "fillet-away": "Pierde la mitad de sus PS y sube mucho su Ataque, Ataque Especial y Velocidad",
    "take-heart": "Se cura de su problema de estado y sube su Ataque Especial y Defensa Especial", acupressure: "Sube mucho una característica al azar",
    stockpile: "Reserva energía (hasta 3 veces): sube su Defensa y Defensa Especial", curse: "Sube su Ataque y Defensa y baja su Velocidad; si es Fantasma, pierde la mitad de sus PS y maldice al rival (1/4 de sus PS cada turno)",
    "spicy-extract": "Sube mucho el Ataque del rival y baja mucho su Defensa", "laser-focus": "Su siguiente golpe será crítico",
    "magnet-rise": "Levita 5 turnos: los ataques de tipo Tierra no le afectan", telekinesis: "El rival flota 3 turnos: inmune a Tierra", endure: "Aguanta con 1 PS cualquier golpe este turno",
    "strength-sap": "Baja el Ataque del rival y recupera tantos PS como su Ataque", "lunar-blessing": "Recupera 1/4 de sus PS y se cura de su problema de estado",
    "jungle-healing": "Recupera 1/4 de sus PS y se cura de su problema de estado", purify: "Cura el problema de estado del rival y recupera la mitad de sus PS",
    refresh: "Se cura de la parálisis, las quemaduras y el veneno", "psycho-shift": "Le pasa al rival su problema de estado", "revival-blessing": "Revive a un compañero debilitado con la mitad de sus PS",
    recycle: "Recupera el objeto que ha gastado en el combate", trick: "Intercambia su objeto con el del rival", switcheroo: "Intercambia su objeto con el del rival",
    bestow: "Le da su objeto al rival", "corrosive-gas": "Le quita el objeto al rival (vuelve al acabar)", embargo: "El rival no puede usar su objeto durante 5 turnos",
    "heal-block": "El rival no puede recuperar PS durante 5 turnos", torment: "El rival no puede usar el mismo movimiento dos veces seguidas",
    imprison: "El rival no puede usar los movimientos que conoce el usuario", spite: "Quita 4 PP al último movimiento del rival", nightmare: "Si el rival duerme, pierde 1/4 de sus PS cada turno",
    octolock: "Atrapa al rival y le baja la Defensa y la Defensa Especial cada turno", foresight: "Normal y Lucha alcanzan al rival aunque sea Fantasma",
    "odor-sleuth": "Normal y Lucha alcanzan al rival aunque sea Fantasma", "miracle-eye": "Psíquico alcanza al rival aunque sea Siniestro", electrify: "El movimiento del rival en este turno será de tipo Eléctrico",
    powder: "Si el rival usa un movimiento de Fuego este turno, estalla y pierde 1/4 de sus PS", "magic-coat": "Devuelve los movimientos de estado que reciba este turno",
    snatch: "Si el rival usa un movimiento sobre sí mismo este turno, se lo roba", conversion: "Pasa a ser del tipo de su primer movimiento",
    "conversion-2": "Pasa a ser de un tipo que resiste el último movimiento del rival", camouflage: "Cambia su tipo según el campo", "reflect-type": "Pasa a ser del mismo tipo que el rival",
    soak: "El rival pasa a ser de tipo Agua", "magic-powder": "El rival pasa a ser de tipo Psíquico", "trick-or-treat": "El rival también es de tipo Fantasma",
    "forests-curse": "El rival también es de tipo Planta", "worry-seed": "La habilidad del rival pasa a ser Insomnio", "simple-beam": "La habilidad del rival pasa a ser Simple",
    entrainment: "El rival pasa a tener su misma habilidad", "role-play": "Copia la habilidad del rival", doodle: "Copia la habilidad del rival", "skill-swap": "Intercambia su habilidad con la del rival",
    "gastro-acid": "Anula la habilidad del rival", "power-trick": "Intercambia su Ataque y su Defensa", "power-shift": "Intercambia sus características de ataque y de defensa",
    "power-swap": "Intercambia con el rival los cambios de Ataque y Ataque Especial", "guard-swap": "Intercambia con el rival los cambios de Defensa y Defensa Especial",
    "heart-swap": "Intercambia con el rival todos los cambios en las características", "speed-swap": "Intercambia su Velocidad con la del rival",
    "power-split": "Reparte con el rival su Ataque y Ataque Especial", "guard-split": "Reparte con el rival su Defensa y Defensa Especial", "topsy-turvy": "Invierte los cambios en las características del rival",
    gravity: "5 turnos: todos tocan el suelo (Tierra alcanza a los voladores)", "magic-room": "5 turnos: los objetos no tienen efecto", "wonder-room": "5 turnos: se intercambian la Defensa y la Defensa Especial",
    "mud-sport": "5 turnos: los ataques de tipo Eléctrico pierden fuerza", "water-sport": "5 turnos: los ataques de tipo Fuego pierden fuerza", "ion-deluge": "Este turno, los ataques de tipo Normal son eléctricos",
    "fairy-lock": "En el siguiente turno nadie puede huir ni cambiarse", "lucky-chant": "5 turnos: tu bando no recibe golpes críticos", "court-change": "Intercambia los efectos de cada lado del campo",
    "happy-hour": "Duplica el dinero que se gana en el combate", splash: "No hace nada", celebrate: "No hace nada (¡pero qué alegría!)",
    "baton-pass": "Vuelve a su Poké Ball y el que sale recibe sus cambios en las características y su sustituto", teleport: "Vuelve a su Poké Ball y sale otro de su equipo",
    "shed-tail": "Pierde la mitad de sus PS: vuelve a su Poké Ball y el que sale tiene un sustituto", "chilly-reception": "Hace que nieve y vuelve a su Poké Ball",
    metronome: "Usa al azar casi cualquier movimiento", "nature-power": "Usa un movimiento según el campo (Triataque si no hay ninguno)", copycat: "Usa el último movimiento que se ha usado en el combate",
    "mirror-move": "Usa el último movimiento del rival", "me-first": "Si el rival va a atacar, usa su mismo ataque antes y con más potencia", assist: "Usa un movimiento al azar de un compañero de equipo",
    mimic: "Copia el último movimiento del rival durante el combate", sketch: "Copia para siempre el último movimiento del rival",
};

// Solo si el rival va a atacar y aún no lo ha hecho (Golpe Bajo, Electrorrápido).
const SOLO_SI_ATACA = new Set(["sucker-punch", "thunderclap"]);
// Devuelven el daño recibido en el turno: [categoría que cuenta (o cualquiera), multiplicador].
const DEVUELVE = { counter: ["fis", 2], "mirror-coat": ["esp", 2], "metal-burst": [null, 1.5], comeuppance: [null, 1.5] };
// Otra Vez no puede obligar a repetir estos.
const NO_OTRA_VEZ = new Set(["encore", "struggle", "transform", "mimic", "sketch", "sleep-talk", "copycat", "mirror-move", "assist", "me-first"]);
// Solo en su primer turno en el campo (Sorpresa, Escaramuza) y solo dormido (Sonámbulo, Ronquido).
const PRIMER_TURNO = new Set(["fake-out", "first-impression"]);
const SOLO_DORMIDO = new Set(["sleep-talk", "snore"]);
// Daño fijo (sin tipos ni críticos, salvo la inmunidad): Sísmico y Tinieblas quitan tanto como su nivel; Superdiente,
// Furia Natural y Ruina, la mitad de los PS que le queden al rival; Esfuerzo lo deja con los PS del usuario.
const DANIO_FIJO = {
    "seismic-toss": (a) => a.nivel, "night-shade": (a) => a.nivel, "dragon-rage": () => 40, "sonic-boom": () => 20,
    "super-fang": (a, d) => Math.floor(d.hp / 2), "natures-madness": (a, d) => Math.floor(d.hp / 2), ruination: (a, d) => Math.floor(d.hp / 2),
    endeavor: (a, d) => d.hp - a.hp, psywave: (a, d, estimado) => (estimado ? a.nivel : Math.floor(a.nivel * entreC(50, 150) / 100)),
    counter: (a, d, e, m) => (m && m._fijo) || 0, "mirror-coat": (a, d, e, m) => (m && m._fijo) || 0,
    "metal-burst": (a, d, e, m) => (m && m._fijo) || 0, comeuppance: (a, d, e, m) => (m && m._fijo) || 0,
    guillotine: (a, d) => d.hp, "horn-drill": (a, d) => d.hp, fissure: (a, d) => d.hp, "sheer-cold": (a, d) => d.hp,
    "final-gambit": (a) => a.hp,
};
const DANIO_FIJO_TXT = {
    "seismic-toss": "Quita tantos PS como su nivel", "night-shade": "Quita tantos PS como su nivel", "dragon-rage": "Quita siempre 40 PS",
    "sonic-boom": "Quita siempre 20 PS", "super-fang": "Quita la mitad de los PS que le queden al rival", "natures-madness": "Quita la mitad de los PS que le queden al rival",
    ruination: "Quita la mitad de los PS que le queden al rival", endeavor: "Deja al rival con los mismos PS que el usuario",
    psywave: "Quita entre la mitad y vez y media su nivel",
    counter: "Devuelve el doble del daño físico recibido en el turno", "mirror-coat": "Devuelve el doble del daño especial recibido en el turno",
    "metal-burst": "Devuelve vez y media el daño recibido en el turno", comeuppance: "Devuelve vez y media el daño recibido en el turno",
    guillotine: "Debilita de un golpe si acierta (no afecta a los de más nivel)", "horn-drill": "Debilita de un golpe si acierta (no afecta a los de más nivel)",
    fissure: "Debilita de un golpe si acierta (no afecta a los de más nivel)", "final-gambit": "Quita tantos PS como le quedan al usuario, que se debilita", "sheer-cold": "Debilita de un golpe si acierta (no afecta a los de más nivel ni a los de tipo Hielo)",
};
// Relevo: tras golpear (o tras bajar las características, Última Palabra), vuelve a su Poké Ball y sale otro de su equipo.
const PIVOTES = new Set(["u-turn", "volt-switch", "flip-turn", "parting-shot"]);
// Estados alterados y cambios de estadísticas según los datos oficiales del movimiento (PokéAPI).
const ESTADO_API = { paralysis: "par", burn: "que", poison: "env", sleep: "dor", freeze: "con" };
const STAT_API = { attack: "atk", defense: "def", "special-attack": "spa", "special-defense": "spd", speed: "vel" };
function movDeAPI(mv, nivel) {
    const cat = mv.damage_class.name === "status" ? "est" : mv.damage_class.name === "physical" ? "fis" : "esp";
    const m = {
        clave: mv.name, nombre: nombreEsMov(mv), tipo: mv.type.name, poder: mv.power || 0, cat,
        prec: mv.accuracy != null ? mv.accuracy / 100 : 1, pp: mv.pp || 20, nivel,
    };
    if (!m.poder && ["return", "frustration", "pika-papow", "veevee-volley"].includes(mv.name)) m.poder = 102;
    const meta = mv.meta || {}, catMeta = meta.category ? meta.category.name : "";
    const ail = ESTADO_API[meta.ailment && meta.ailment.name];
    if (ail && (catMeta === "ailment" || catMeta === "damage-ailment")) m.estado = { tipo: ail, prob: cat === "est" ? 1 : (meta.ailment_chance || 0) / 100 };
    const stats = {};
    (mv.stat_changes || []).forEach((sc) => { const k = STAT_API[sc.stat.name]; if (k) stats[k] = sc.change; });
    if (Object.keys(stats).length && ["net-good-stats", "damage-raise", "damage-lower"].includes(catMeta)) {
        const alUsuario = catMeta === "damage-raise" || (catMeta === "net-good-stats" && /^user/.test(mv.target.name));
        m.cambios = { objetivo: alUsuario ? "yo" : "rival", stats, prob: cat === "est" ? 1 : (meta.stat_chance || 100) / 100 };
    }
    if (meta.drain) m.drenaje = meta.drain / 100;              // + absorbe PS · − daño de retroceso
    if (catMeta === "heal" && meta.healing > 0) m.curacion = meta.healing / 100;
    if (meta.flinch_chance) m.retroceder = meta.flinch_chance / 100;
    if (meta.crit_rate) m.critAlto = true;
    if (meta.max_hits > 1) m.golpes = [meta.min_hits || 2, meta.max_hits];
    m.prio = mv.priority || 0;   // Ataque Rápido, Velocidad Extrema…
    if (typeof CLIMA_MOV !== "undefined" && CLIMA_MOV[mv.name]) m.clima = CLIMA_MOV[mv.name];   // Danza Lluvia, Día Soleado…
    // Confusión (Rayo Confuso, Psicorrayo…); Contoneo y Camelo además suben una característica del rival.
    if (meta.ailment && meta.ailment.name === "confusion") m.confunde = cat === "est" ? 1 : (meta.ailment_chance || 0) / 100;
    if (catMeta === "swagger" && Object.keys(stats).length) m.cambios = { objetivo: "rival", stats, prob: 1 };
    if (MOV_ESPECIAL[mv.name]) m.especial = MOV_ESPECIAL[mv.name];
    if ((mv.name === "toxic" || mv.name === "poison-fang") && m.estado) m.estado.grave = true;   // envenenamiento grave
    return m;
}
// Movimientos por nivel del juego más reciente en que está la especie (Escarlata/Púrpura, Espada/Escudo…), como en los
// juegos actuales. Leyendas: Arceus y Let's Go no cuentan: tienen los movimientos muy recortados.
const JUEGOS_MOVS = ["scarlet-violet", "sword-shield", "brilliant-diamond-shining-pearl", "ultra-sun-ultra-moon", "sun-moon",
    "omega-ruby-alpha-sapphire", "x-y", "black-2-white-2", "black-white", "heartgold-soulsilver", "platinum", "diamond-pearl",
    "emerald", "firered-leafgreen", "ruby-sapphire", "crystal", "gold-silver", "yellow", "red-blue"];
function juegoMovs(d) {
    const hay = new Set();
    for (const mv of d.moves) for (const v of mv.version_group_details) if (v.move_learn_method.name === "level-up") hay.add(v.version_group.name);
    return JUEGOS_MOVS.find((g) => hay.has(g)) || null;
}
const delJuego = (v, juego) => v.move_learn_method.name === "level-up" && (!juego || v.version_group.name === juego);
// Learnset por subida de nivel: [{ nombre, nivel }] (nivel 1: los de evolución y los que ya sabe al nacer).
function learnsetNivel(d) {
    const juego = juegoMovs(d), out = [];
    for (const mv of d.moves) {
        let lvl = Infinity;
        for (const v of mv.version_group_details) {
            if (delJuego(v, juego)) lvl = Math.min(lvl, v.level_learned_at || 1);
        }
        if (lvl !== Infinity) out.push({ nombre: mv.move.name, nivel: Math.max(1, lvl) });
    }
    return out;
}
// Movimientos cuya mecánica especial no está en el motor (el usuario se debilita, solo el primer turno,
// turno de recarga, fallan según lo que haga el rival…): no se aprenden ni los usan los rivales.
// Los que aún no resuelve el motor (los que debilitarían a los dos a la vez, o que dependen de otros que no hay).
const MOVS_EXCLUIDOS = new Set([
    "sky-drop", "shell-trap", "bide",
    // (los que solo sirven con un compañero: en un combate individual siempre fallarían)
    "after-you", "ally-switch", "follow-me", "rage-powder", "spotlight", "helping-hand", "quash", "instruct", "hold-hands", "dragon-cheer", "aromatic-mist",
    "coaching", "decorate",
]);
// Los que debilitan al usuario (aunque falle o el rival se proteja). Con Humedad en el campo, nadie puede usarlos.
const AUTO_KO = new Set(["self-destruct", "explosion", "misty-explosion"]);
// Los de apoyo al compañero: solo sirven en los combates dobles (en uno individual fallan). Tus Pokémon los aprenden con «Recordar».
const APOYO = new Set(["helping-hand", "follow-me", "rage-powder", "after-you", "quash", "instruct", "aromatic-mist", "coaching", "decorate", "dragon-cheer", "hold-hands"]);
APOYO.forEach((k) => { MOV_ESPECIAL[k] = k; });
// Movimientos útiles en combate: de daño, o de estado que provocan un estado alterado o cambian estadísticas.
async function detallesUtiles(candidatos, conApoyo = false) {
    candidatos = candidatos.filter((c) => !MOVS_EXCLUIDOS.has(c.nombre) || (conApoyo && APOYO.has(c.nombre)));
    const det = await Promise.all(candidatos.map((c) => cargarMovimiento(c.nombre).catch(() => null)));
    const out = [];
    candidatos.forEach((c, i) => {
        const mv = det[i]; if (!mv) return;
        const m = movDeAPI(mv, c.nivel);
        if (m.cat !== "est" ? m.poder > 0 || !!DANIO_FIJO[m.clave] || !!PODER_VARIABLE[m.clave] : (m.estado || m.cambios || m.curacion || m.clima || m.confunde || m.especial)) out.push(m);
    });
    return out;
}
// 4 movimientos que ya conoce a su nivel: hasta 3 de daño y 1 de estado. Los de daño, los más fuertes y recientes,
// con preferencia por los de su tipo y sin repetir tipo (así un Arcanine siempre lleva algún ataque de Fuego).
const _cacheMoveset = new Map();
async function construirMovesetReal(d, nivel) {
    const clave = d.id + ":" + nivel;
    if (_cacheMoveset.has(clave)) return _cacheMoveset.get(clave);
    try {
        const todos = learnsetNivel(d).filter((a) => a.nivel <= nivel).sort((a, b) => b.nivel - a.nivel);
        const cand = [...todos.slice(0, 16), ...todos.slice(16).filter((a) => a.nivel <= 1).slice(0, 10)];   // + los de evolución
        const utiles = (await detallesUtiles(cand)).sort((a, b) => b.nivel - a.nivel);
        const tipos = d.types.map((t) => t.type.name);
        const valor = (m) => m.poder * (tipos.includes(m.tipo) ? 1.5 : 1) * Math.min(1, m.prec || 1) + m.nivel;
        const dan = utiles.filter((x) => x.cat !== "est").sort((a, b) => valor(b) - valor(a)), est = utiles.filter((x) => x.cat === "est");
        const nDan = est.length ? 3 : 4;
        let elegidos = [];
        dan.forEach((m) => { if (elegidos.length < nDan && !elegidos.some((x) => x.tipo === m.tipo)) elegidos.push(m); });
        dan.forEach((m) => { if (elegidos.length < nDan && !elegidos.includes(m)) elegidos.push(m); });
        elegidos.push(...est.slice(0, 1));
        if (elegidos.length < 4) elegidos = elegidos.concat(utiles.filter((x) => !elegidos.includes(x)).slice(0, 4 - elegidos.length));
        elegidos = elegidos.map(({ nivel: _, ...x }) => x);
        if (elegidos.length) _cacheMoveset.set(clave, Promise.resolve(elegidos));
        return elegidos;
    } catch (_) { return []; }
}
// Movimientos al evolucionar: los "de evolución" (nivel 0 en los juegos recientes) y los de su nivel actual.
async function movimientosDeEvolucion(d, nivel, movsActuales) {
    const conocidos = new Set((movsActuales || []).map((x) => x.clave || x.nombre));
    const cand = [], juego = juegoMovs(d);
    for (const mv of d.moves) {
        const lv = mv.version_group_details.filter((v) => delJuego(v, juego)).map((v) => v.level_learned_at);
        if (lv.length && !conocidos.has(mv.move.name) && (lv.includes(0) || lv.includes(nivel))) cand.push({ nombre: mv.move.name, nivel });
    }
    return detallesUtiles(cand.slice(0, 4));
}
// Todos los movimientos que podría saber a su nivel y no conoce (para recordarlos).
async function movimientosRecordables(d, nivel, movsActuales) {
    const conocidos = new Set((movsActuales || []).map((x) => x.clave || x.nombre));
    const cand = learnsetNivel(d).filter((a) => a.nivel <= nivel && !conocidos.has(a.nombre)).sort((a, b) => b.nivel - a.nivel);
    // + los de apoyo al compañero que puede aprender de cualquier forma (para los combates dobles)
    const apoyo = [...new Set(d.moves.map((m) => m.move.name))].filter((n) => APOYO.has(n) && !conocidos.has(n) && !cand.some((c) => c.nombre === n)).map((n) => ({ nombre: n, nivel: 1 }));
    return (await detallesUtiles(cand.concat(apoyo), true)).sort((a, b) => b.nivel - a.nivel);
}
// Movimientos nuevos al pasar de nivelAntes a nivelAhora que aún no conoce.
async function nuevosMovimientos(d, nivelAntes, nivelAhora, movsActuales) {
    const conocidos = new Set((movsActuales || []).map((x) => x.clave || x.nombre));
    const cand = learnsetNivel(d)
        .filter((a) => a.nivel > nivelAntes && a.nivel <= nivelAhora && !conocidos.has(a.nombre))
        .sort((a, b) => a.nivel - b.nivel).slice(0, 8);
    return detallesUtiles(cand);
}

// ===================== ETAPA EVOLUTIVA =====================
// Tabla sacada de las cadenas evolutivas de PokéAPI: id → [etapa, nº etapas, nivel al que se obtiene, nivel al que evoluciona (0 = no)].
// Piedra/amistad/intercambio cuentan como nivel 20 (2ª etapa) o 32 (3ª); las crías (Pichu→Pikachu) no suben el nivel.
const EVO_TABLA = {1:[1,3,1,16],2:[2,3,16,32],3:[3,3,32,0],4:[1,3,1,16],5:[2,3,16,36],6:[3,3,36,0],7:[1,3,1,16],8:[2,3,16,36],9:[3,3,36,0],10:[1,3,1,7],11:[2,3,7,10],12:[3,3,10,0],13:[1,3,1,7],14:[2,3,7,10],15:[3,3,10,0],16:[1,3,1,18],17:[2,3,18,36],18:[3,3,36,0],19:[1,2,1,20],20:[2,2,20,0],21:[1,2,1,20],22:[2,2,20,0],23:[1,2,1,22],24:[2,2,22,0],25:[2,3,1,32],26:[3,3,32,0],27:[1,2,1,22],28:[2,2,22,0],29:[1,3,1,16],30:[2,3,16,32],31:[3,3,32,0],32:[1,3,1,16],33:[2,3,16,32],34:[3,3,32,0],35:[2,3,1,32],36:[3,3,32,0],37:[1,2,1,20],38:[2,2,20,0],39:[2,3,1,32],40:[3,3,32,0],41:[1,3,1,22],42:[2,3,22,32],43:[1,3,1,21],44:[2,3,21,32],45:[3,3,32,0],46:[1,2,1,24],47:[2,2,24,0],48:[1,2,1,31],49:[2,2,31,0],50:[1,2,1,26],51:[2,2,26,0],52:[1,2,1,28],53:[2,2,28,0],54:[1,2,1,33],55:[2,2,33,0],56:[1,3,1,28],57:[2,3,28,32],58:[1,2,1,20],59:[2,2,20,0],60:[1,3,1,25],61:[2,3,25,32],62:[3,3,32,0],63:[1,3,1,16],64:[2,3,16,32],65:[3,3,32,0],66:[1,3,1,28],67:[2,3,28,32],68:[3,3,32,0],69:[1,3,1,21],70:[2,3,21,32],71:[3,3,32,0],72:[1,2,1,30],73:[2,2,30,0],74:[1,3,1,25],75:[2,3,25,32],76:[3,3,32,0],77:[1,2,1,40],78:[2,2,40,0],79:[1,2,1,20],80:[2,2,37,0],81:[1,3,1,30],82:[2,3,30,32],83:[1,2,1,20],84:[1,2,1,31],85:[2,2,31,0],86:[1,2,1,34],87:[2,2,34,0],88:[1,2,1,38],89:[2,2,38,0],90:[1,2,1,20],91:[2,2,20,0],92:[1,3,1,25],93:[2,3,25,32],94:[3,3,32,0],95:[1,2,1,20],96:[1,2,1,26],97:[2,2,26,0],98:[1,2,1,28],99:[2,2,28,0],100:[1,2,1,30],101:[2,2,30,0],102:[1,2,1,20],103:[2,2,20,0],104:[1,2,1,28],105:[2,2,28,0],106:[2,2,20,0],107:[2,2,20,0],108:[1,2,1,20],109:[1,2,1,35],110:[2,2,35,0],111:[1,3,1,42],112:[2,3,42,42],113:[2,3,1,32],114:[1,2,1,20],115:[1,1,1,0],116:[1,3,1,32],117:[2,3,32,32],118:[1,2,1,33],119:[2,2,33,0],120:[1,2,1,20],121:[2,2,20,0],122:[2,3,1,42],123:[1,2,1,20],124:[2,2,30,0],125:[2,3,30,32],126:[2,3,30,32],127:[1,1,1,0],128:[1,1,1,0],129:[1,2,1,20],130:[2,2,20,0],131:[1,1,1,0],132:[1,1,1,0],133:[1,2,1,20],134:[2,2,20,0],135:[2,2,20,0],136:[2,2,20,0],137:[1,3,1,20],138:[1,2,1,40],139:[2,2,40,0],140:[1,2,1,40],141:[2,2,40,0],142:[1,1,1,0],143:[2,2,1,0],144:[1,1,1,0],145:[1,1,1,0],146:[1,1,1,0],147:[1,3,1,30],148:[2,3,30,55],149:[3,3,55,0],150:[1,1,1,0],151:[1,1,1,0],152:[1,3,1,16],153:[2,3,16,32],154:[3,3,32,0],155:[1,3,1,14],156:[2,3,14,36],157:[3,3,36,0],158:[1,3,1,18],159:[2,3,18,30],160:[3,3,30,0],161:[1,2,1,15],162:[2,2,15,0],163:[1,2,1,20],164:[2,2,20,0],165:[1,2,1,18],166:[2,2,18,0],167:[1,2,1,22],168:[2,2,22,0],169:[3,3,32,0],170:[1,2,1,27],171:[2,2,27,0],172:[1,3,1,1],173:[1,3,1,1],174:[1,3,1,1],175:[1,3,1,1],176:[2,3,1,32],177:[1,2,1,25],178:[2,2,25,0],179:[1,3,1,15],180:[2,3,15,30],181:[3,3,30,0],182:[3,3,32,0],183:[2,3,1,18],184:[3,3,18,0],185:[2,2,1,0],186:[3,3,32,0],187:[1,3,1,18],188:[2,3,18,27],189:[3,3,27,0],190:[1,2,1,20],191:[1,2,1,20],192:[2,2,20,0],193:[1,2,1,20],194:[1,2,1,20],195:[2,2,20,0],196:[2,2,20,0],197:[2,2,20,0],198:[1,2,1,20],199:[2,2,20,0],200:[1,2,1,20],201:[1,1,1,0],202:[2,2,15,0],203:[1,2,1,20],204:[1,2,1,31],205:[2,2,31,0],206:[1,2,1,20],207:[1,2,1,20],208:[2,2,20,0],209:[1,2,1,23],210:[2,2,23,0],211:[1,2,1,20],212:[2,2,20,0],213:[1,1,1,0],214:[1,1,1,0],215:[1,2,1,20],216:[1,3,1,30],217:[2,3,30,32],218:[1,2,1,38],219:[2,2,38,0],220:[1,3,1,33],221:[2,3,33,33],222:[1,2,1,38],223:[1,2,1,25],224:[2,2,25,0],225:[1,1,1,0],226:[2,2,1,0],227:[1,1,1,0],228:[1,2,1,24],229:[2,2,24,0],230:[3,3,32,0],231:[1,2,1,25],232:[2,2,25,0],233:[2,3,20,32],234:[1,2,1,20],235:[1,1,1,0],236:[1,2,1,20],237:[2,2,20,0],238:[1,2,1,30],239:[1,3,1,30],240:[1,3,1,30],241:[1,1,1,0],242:[3,3,32,0],243:[1,1,1,0],244:[1,1,1,0],245:[1,1,1,0],246:[1,3,1,30],247:[2,3,30,55],248:[3,3,55,0],249:[1,1,1,0],250:[1,1,1,0],251:[1,1,1,0],252:[1,3,1,16],253:[2,3,16,36],254:[3,3,36,0],255:[1,3,1,16],256:[2,3,16,36],257:[3,3,36,0],258:[1,3,1,16],259:[2,3,16,36],260:[3,3,36,0],261:[1,2,1,18],262:[2,2,18,0],263:[1,3,1,20],264:[2,3,20,35],265:[1,3,1,7],266:[2,3,7,10],267:[3,3,10,0],268:[2,3,7,10],269:[3,3,10,0],270:[1,3,1,14],271:[2,3,14,32],272:[3,3,32,0],273:[1,3,1,14],274:[2,3,14,32],275:[3,3,32,0],276:[1,2,1,22],277:[2,2,22,0],278:[1,2,1,25],279:[2,2,25,0],280:[1,3,1,20],281:[2,3,20,30],282:[3,3,30,0],283:[1,2,1,22],284:[2,2,22,0],285:[1,2,1,23],286:[2,2,23,0],287:[1,3,1,18],288:[2,3,18,36],289:[3,3,36,0],290:[1,2,1,20],291:[2,2,20,0],292:[2,2,20,0],293:[1,3,1,20],294:[2,3,20,40],295:[3,3,40,0],296:[1,2,1,24],297:[2,2,24,0],298:[1,3,1,1],299:[1,2,1,20],300:[1,2,1,20],301:[2,2,20,0],302:[1,1,1,0],303:[1,1,1,0],304:[1,3,1,32],305:[2,3,32,42],306:[3,3,42,0],307:[1,2,1,37],308:[2,2,37,0],309:[1,2,1,26],310:[2,2,26,0],311:[1,1,1,0],312:[1,1,1,0],313:[1,1,1,0],314:[1,1,1,0],315:[2,3,1,32],316:[1,2,1,26],317:[2,2,26,0],318:[1,2,1,30],319:[2,2,30,0],320:[1,2,1,40],321:[2,2,40,0],322:[1,2,1,33],323:[2,2,33,0],324:[1,1,1,0],325:[1,2,1,32],326:[2,2,32,0],327:[1,1,1,0],328:[1,3,1,35],329:[2,3,35,45],330:[3,3,45,0],331:[1,2,1,32],332:[2,2,32,0],333:[1,2,1,35],334:[2,2,35,0],335:[1,1,1,0],336:[1,1,1,0],337:[1,1,1,0],338:[1,1,1,0],339:[1,2,1,30],340:[2,2,30,0],341:[1,2,1,30],342:[2,2,30,0],343:[1,2,1,36],344:[2,2,36,0],345:[1,2,1,40],346:[2,2,40,0],347:[1,2,1,40],348:[2,2,40,0],349:[1,2,1,20],350:[2,2,20,0],351:[1,1,1,0],352:[1,1,1,0],353:[1,2,1,37],354:[2,2,37,0],355:[1,3,1,37],356:[2,3,37,37],357:[1,1,1,0],358:[2,2,1,0],359:[1,1,1,0],360:[1,2,1,15],361:[1,2,1,20],362:[2,2,42,0],363:[1,3,1,32],364:[2,3,32,44],365:[3,3,44,0],366:[1,2,1,20],367:[2,2,20,0],368:[2,2,20,0],369:[1,1,1,0],370:[1,1,1,0],371:[1,3,1,30],372:[2,3,30,50],373:[3,3,50,0],374:[1,3,1,20],375:[2,3,20,45],376:[3,3,45,0],377:[1,1,1,0],378:[1,1,1,0],379:[1,1,1,0],380:[1,1,1,0],381:[1,1,1,0],382:[1,1,1,0],383:[1,1,1,0],384:[1,1,1,0],385:[1,1,1,0],386:[1,1,1,0],387:[1,3,1,18],388:[2,3,18,32],389:[3,3,32,0],390:[1,3,1,14],391:[2,3,14,36],392:[3,3,36,0],393:[1,3,1,16],394:[2,3,16,36],395:[3,3,36,0],396:[1,3,1,14],397:[2,3,14,34],398:[3,3,34,0],399:[1,2,1,15],400:[2,2,15,0],401:[1,2,1,10],402:[2,2,10,0],403:[1,3,1,15],404:[2,3,15,30],405:[3,3,30,0],406:[1,3,1,1],407:[3,3,32,0],408:[1,2,1,30],409:[2,2,30,0],410:[1,2,1,30],411:[2,2,30,0],412:[1,2,1,20],413:[2,2,20,0],414:[2,2,20,0],415:[1,2,1,21],416:[2,2,21,0],417:[1,1,1,0],418:[1,2,1,26],419:[2,2,26,0],420:[1,2,1,25],421:[2,2,25,0],422:[1,2,1,30],423:[2,2,30,0],424:[2,2,20,0],425:[1,2,1,28],426:[2,2,28,0],427:[1,2,1,20],428:[2,2,20,0],429:[2,2,20,0],430:[2,2,20,0],431:[1,2,1,38],432:[2,2,38,0],433:[1,2,1,1],434:[1,2,1,34],435:[2,2,34,0],436:[1,2,1,33],437:[2,2,33,0],438:[1,2,1,1],439:[1,3,1,1],440:[1,3,1,1],441:[1,1,1,0],442:[1,1,1,0],443:[1,3,1,24],444:[2,3,24,48],445:[3,3,48,0],446:[1,2,1,1],447:[1,2,1,1],448:[2,2,1,0],449:[1,2,1,34],450:[2,2,34,0],451:[1,2,1,40],452:[2,2,40,0],453:[1,2,1,37],454:[2,2,37,0],455:[1,1,1,0],456:[1,2,1,31],457:[2,2,31,0],458:[1,2,1,1],459:[1,2,1,40],460:[2,2,40,0],461:[2,2,20,0],462:[3,3,32,0],463:[2,2,20,0],464:[3,3,42,0],465:[2,2,20,0],466:[3,3,32,0],467:[3,3,32,0],468:[3,3,32,0],469:[2,2,20,0],470:[2,2,20,0],471:[2,2,20,0],472:[2,2,20,0],473:[3,3,33,0],474:[3,3,32,0],475:[3,3,32,0],476:[2,2,20,0],477:[3,3,37,0],478:[2,2,20,0],479:[1,1,1,0],480:[1,1,1,0],481:[1,1,1,0],482:[1,1,1,0],483:[1,1,1,0],484:[1,1,1,0],485:[1,1,1,0],486:[1,1,1,0],487:[1,1,1,0],488:[1,1,1,0],489:[1,2,1,20],490:[2,2,20,0],491:[1,1,1,0],492:[1,1,1,0],493:[1,1,1,0],494:[1,1,1,0],495:[1,3,1,17],496:[2,3,17,36],497:[3,3,36,0],498:[1,3,1,17],499:[2,3,17,36],500:[3,3,36,0],501:[1,3,1,17],502:[2,3,17,36],503:[3,3,36,0],504:[1,2,1,20],505:[2,2,20,0],506:[1,3,1,16],507:[2,3,16,32],508:[3,3,32,0],509:[1,2,1,20],510:[2,2,20,0],511:[1,2,1,20],512:[2,2,20,0],513:[1,2,1,20],514:[2,2,20,0],515:[1,2,1,20],516:[2,2,20,0],517:[1,2,1,20],518:[2,2,20,0],519:[1,3,1,21],520:[2,3,21,32],521:[3,3,32,0],522:[1,2,1,27],523:[2,2,27,0],524:[1,3,1,25],525:[2,3,25,32],526:[3,3,32,0],527:[1,2,1,20],528:[2,2,20,0],529:[1,2,1,31],530:[2,2,31,0],531:[1,1,1,0],532:[1,3,1,25],533:[2,3,25,32],534:[3,3,32,0],535:[1,3,1,25],536:[2,3,25,36],537:[3,3,36,0],538:[1,1,1,0],539:[1,1,1,0],540:[1,3,1,20],541:[2,3,20,32],542:[3,3,32,0],543:[1,3,1,22],544:[2,3,22,30],545:[3,3,30,0],546:[1,2,1,20],547:[2,2,20,0],548:[1,2,1,20],549:[2,2,20,0],550:[1,2,1,20],551:[1,3,1,29],552:[2,3,29,40],553:[3,3,40,0],554:[1,2,1,35],555:[2,2,35,0],556:[1,1,1,0],557:[1,2,1,34],558:[2,2,34,0],559:[1,2,1,39],560:[2,2,39,0],561:[1,1,1,0],562:[1,2,1,20],563:[2,2,34,0],564:[1,2,1,37],565:[2,2,37,0],566:[1,2,1,37],567:[2,2,37,0],568:[1,2,1,36],569:[2,2,36,0],570:[1,2,1,30],571:[2,2,30,0],572:[1,2,1,20],573:[2,2,20,0],574:[1,3,1,32],575:[2,3,32,41],576:[3,3,41,0],577:[1,3,1,32],578:[2,3,32,41],579:[3,3,41,0],580:[1,2,1,35],581:[2,2,35,0],582:[1,3,1,35],583:[2,3,35,47],584:[3,3,47,0],585:[1,2,1,34],586:[2,2,34,0],587:[1,1,1,0],588:[1,2,1,20],589:[2,2,20,0],590:[1,2,1,39],591:[2,2,39,0],592:[1,2,1,40],593:[2,2,40,0],594:[1,1,1,0],595:[1,2,1,36],596:[2,2,36,0],597:[1,2,1,40],598:[2,2,40,0],599:[1,3,1,38],600:[2,3,38,49],601:[3,3,49,0],602:[1,3,1,39],603:[2,3,39,39],604:[3,3,39,0],605:[1,2,1,42],606:[2,2,42,0],607:[1,3,1,41],608:[2,3,41,41],609:[3,3,41,0],610:[1,3,1,38],611:[2,3,38,48],612:[3,3,48,0],613:[1,2,1,37],614:[2,2,37,0],615:[1,1,1,0],616:[1,2,1,20],617:[2,2,20,0],618:[1,1,1,0],619:[1,2,1,50],620:[2,2,50,0],621:[1,1,1,0],622:[1,2,1,43],623:[2,2,43,0],624:[1,3,1,52],625:[2,3,52,52],626:[1,1,1,0],627:[1,2,1,54],628:[2,2,54,0],629:[1,2,1,54],630:[2,2,54,0],631:[1,1,1,0],632:[1,1,1,0],633:[1,3,1,50],634:[2,3,50,64],635:[3,3,64,0],636:[1,2,1,59],637:[2,2,59,0],638:[1,1,1,0],639:[1,1,1,0],640:[1,1,1,0],641:[1,1,1,0],642:[1,1,1,0],643:[1,1,1,0],644:[1,1,1,0],645:[1,1,1,0],646:[1,1,1,0],647:[1,1,1,0],648:[1,1,1,0],649:[1,1,1,0],650:[1,3,1,16],651:[2,3,16,36],652:[3,3,36,0],653:[1,3,1,16],654:[2,3,16,36],655:[3,3,36,0],656:[1,3,1,16],657:[2,3,16,36],658:[3,3,36,0],659:[1,2,1,20],660:[2,2,20,0],661:[1,3,1,17],662:[2,3,17,35],663:[3,3,35,0],664:[1,3,1,9],665:[2,3,9,12],666:[3,3,12,0],667:[1,2,1,35],668:[2,2,35,0],669:[1,3,1,19],670:[2,3,19,32],671:[3,3,32,0],672:[1,2,1,32],673:[2,2,32,0],674:[1,2,1,32],675:[2,2,32,0],676:[1,1,1,0],677:[1,2,1,25],678:[2,2,25,0],679:[1,3,1,35],680:[2,3,35,35],681:[3,3,35,0],682:[1,2,1,20],683:[2,2,20,0],684:[1,2,1,20],685:[2,2,20,0],686:[1,2,1,30],687:[2,2,30,0],688:[1,2,1,39],689:[2,2,39,0],690:[1,2,1,48],691:[2,2,48,0],692:[1,2,1,37],693:[2,2,37,0],694:[1,2,1,20],695:[2,2,20,0],696:[1,2,1,39],697:[2,2,39,0],698:[1,2,1,39],699:[2,2,39,0],700:[2,2,20,0],701:[1,1,1,0],702:[1,1,1,0],703:[1,1,1,0],704:[1,3,1,40],705:[2,3,40,50],706:[3,3,50,0],707:[1,1,1,0],708:[1,2,1,20],709:[2,2,20,0],710:[1,2,1,20],711:[2,2,20,0],712:[1,2,1,37],713:[2,2,37,0],714:[1,2,1,48],715:[2,2,48,0],716:[1,1,1,0],717:[1,1,1,0],718:[1,1,1,0],719:[1,1,1,0],720:[1,1,1,0],721:[1,1,1,0],722:[1,3,1,17],723:[2,3,17,34],724:[3,3,34,0],725:[1,3,1,17],726:[2,3,17,34],727:[3,3,34,0],728:[1,3,1,17],729:[2,3,17,34],730:[3,3,34,0],731:[1,3,1,14],732:[2,3,14,28],733:[3,3,28,0],734:[1,2,1,20],735:[2,2,20,0],736:[1,3,1,20],737:[2,3,20,32],738:[3,3,32,0],739:[1,2,1,20],740:[2,2,20,0],741:[1,1,1,0],742:[1,2,1,25],743:[2,2,25,0],744:[1,2,1,25],745:[2,2,25,0],746:[1,1,1,0],747:[1,2,1,38],748:[2,2,38,0],749:[1,2,1,30],750:[2,2,30,0],751:[1,2,1,22],752:[2,2,22,0],753:[1,2,1,34],754:[2,2,34,0],755:[1,2,1,24],756:[2,2,24,0],757:[1,2,1,33],758:[2,2,33,0],759:[1,2,1,27],760:[2,2,27,0],761:[1,3,1,18],762:[2,3,18,32],763:[3,3,32,0],764:[1,1,1,0],765:[1,1,1,0],766:[1,1,1,0],767:[1,2,1,30],768:[2,2,30,0],769:[1,2,1,42],770:[2,2,42,0],771:[1,1,1,0],772:[1,2,1,20],773:[2,2,20,0],774:[1,1,1,0],775:[1,1,1,0],776:[1,1,1,0],777:[1,1,1,0],778:[1,1,1,0],779:[1,1,1,0],780:[1,1,1,0],781:[1,1,1,0],782:[1,3,1,35],783:[2,3,35,45],784:[3,3,45,0],785:[1,1,1,0],786:[1,1,1,0],787:[1,1,1,0],788:[1,1,1,0],789:[1,3,1,43],790:[2,3,43,53],791:[3,3,53,0],792:[3,3,53,0],793:[1,1,1,0],794:[1,1,1,0],795:[1,1,1,0],796:[1,1,1,0],797:[1,1,1,0],798:[1,1,1,0],799:[1,1,1,0],800:[1,1,1,0],801:[1,1,1,0],802:[1,1,1,0],803:[1,2,1,20],804:[2,2,20,0],805:[1,1,1,0],806:[1,1,1,0],807:[1,1,1,0],808:[1,2,1,20],809:[2,2,20,0],810:[1,3,1,16],811:[2,3,16,35],812:[3,3,35,0],813:[1,3,1,16],814:[2,3,16,35],815:[3,3,35,0],816:[1,3,1,16],817:[2,3,16,35],818:[3,3,35,0],819:[1,2,1,24],820:[2,2,24,0],821:[1,3,1,18],822:[2,3,18,38],823:[3,3,38,0],824:[1,3,1,10],825:[2,3,10,30],826:[3,3,30,0],827:[1,2,1,18],828:[2,2,18,0],829:[1,2,1,20],830:[2,2,20,0],831:[1,2,1,24],832:[2,2,24,0],833:[1,2,1,22],834:[2,2,22,0],835:[1,2,1,25],836:[2,2,25,0],837:[1,3,1,18],838:[2,3,18,34],839:[3,3,34,0],840:[1,3,1,20],841:[2,3,20,0],842:[2,3,20,0],843:[1,2,1,36],844:[2,2,36,0],845:[1,1,1,0],846:[1,2,1,26],847:[2,2,26,0],848:[1,2,1,30],849:[2,2,30,0],850:[1,2,1,28],851:[2,2,28,0],852:[1,2,1,20],853:[2,2,20,0],854:[1,2,1,20],855:[2,2,20,0],856:[1,3,1,32],857:[2,3,32,42],858:[3,3,42,0],859:[1,3,1,32],860:[2,3,32,42],861:[3,3,42,0],862:[3,3,35,0],863:[2,2,28,0],864:[2,2,38,0],865:[2,2,20,0],866:[3,3,42,0],867:[2,2,20,0],868:[1,2,1,20],869:[2,2,20,0],870:[1,1,1,0],871:[1,1,1,0],872:[1,2,1,20],873:[2,2,20,0],874:[1,1,1,0],875:[1,1,1,0],876:[1,1,1,0],877:[1,1,1,0],878:[1,2,1,34],879:[2,2,34,0],880:[1,1,1,0],881:[1,1,1,0],882:[1,1,1,0],883:[1,1,1,0],884:[1,2,1,20],885:[1,3,1,50],886:[2,3,50,60],887:[3,3,60,0],888:[1,1,1,0],889:[1,1,1,0],890:[1,1,1,0],891:[1,2,1,20],892:[2,2,20,0],893:[1,1,1,0],894:[1,1,1,0],895:[1,1,1,0],896:[1,1,1,0],897:[1,1,1,0],898:[1,1,1,0],899:[2,2,20,0],900:[2,2,20,0],901:[3,3,32,0],902:[2,2,20,0],903:[2,2,20,0],904:[2,2,20,0],905:[1,1,1,0],906:[1,3,1,16],907:[2,3,16,36],908:[3,3,36,0],909:[1,3,1,16],910:[2,3,16,36],911:[3,3,36,0],912:[1,3,1,16],913:[2,3,16,36],914:[3,3,36,0],915:[1,2,1,18],916:[2,2,18,0],917:[1,2,1,15],918:[2,2,15,0],919:[1,2,1,24],920:[2,2,24,0],921:[1,3,1,18],922:[2,3,18,32],923:[3,3,32,0],924:[1,2,1,25],925:[2,2,25,0],926:[1,2,1,26],927:[2,2,26,0],928:[1,3,1,25],929:[2,3,25,35],930:[3,3,35,0],931:[1,1,1,0],932:[1,3,1,24],933:[2,3,24,38],934:[3,3,38,0],935:[1,2,1,20],936:[2,2,20,0],937:[2,2,20,0],938:[1,2,1,20],939:[2,2,20,0],940:[1,2,1,25],941:[2,2,25,0],942:[1,2,1,30],943:[2,2,30,0],944:[1,2,1,28],945:[2,2,28,0],946:[1,2,1,20],947:[2,2,20,0],948:[1,2,1,30],949:[2,2,30,0],950:[1,1,1,0],951:[1,2,1,20],952:[2,2,20,0],953:[1,2,1,20],954:[2,2,20,0],955:[1,2,1,35],956:[2,2,35,0],957:[1,3,1,24],958:[2,3,24,38],959:[3,3,38,0],960:[1,2,1,26],961:[2,2,26,0],962:[1,1,1,0],963:[1,2,1,38],964:[2,2,38,0],965:[1,2,1,40],966:[2,2,40,0],967:[1,1,1,0],968:[1,1,1,0],969:[1,2,1,35],970:[2,2,35,0],971:[1,2,1,30],972:[2,2,30,0],973:[1,1,1,0],974:[1,2,1,20],975:[2,2,20,0],976:[1,1,1,0],977:[1,1,1,0],978:[1,1,1,0],979:[3,3,32,0],980:[2,2,20,0],981:[2,2,20,0],982:[2,2,20,0],983:[3,3,52,0],984:[1,1,1,0],985:[1,1,1,0],986:[1,1,1,0],987:[1,1,1,0],988:[1,1,1,0],989:[1,1,1,0],990:[1,1,1,0],991:[1,1,1,0],992:[1,1,1,0],993:[1,1,1,0],994:[1,1,1,0],995:[1,1,1,0],996:[1,3,1,35],997:[2,3,35,54],998:[3,3,54,0],999:[1,2,1,20],1000:[2,2,20,0],1001:[1,1,1,0],1002:[1,1,1,0],1003:[1,1,1,0],1004:[1,1,1,0],1005:[1,1,1,0],1006:[1,1,1,0],1007:[1,1,1,0],1008:[1,1,1,0],1009:[1,1,1,0],1010:[1,1,1,0],1011:[2,3,20,32],1012:[1,2,1,20],1013:[2,2,20,0],1014:[1,1,1,0],1015:[1,1,1,0],1016:[1,1,1,0],1017:[1,1,1,0],1018:[2,2,20,0],1019:[3,3,32,0],1020:[1,1,1,0],1021:[1,1,1,0],1022:[1,1,1,0],1023:[1,1,1,0],1024:[1,1,1,0],1025:[1,1,1,0]};
async function etapaEvolutiva(id) {
    const [etapa, maxEtapas, nivelMin, evo] = EVO_TABLA[id] || [1, 1, 1, 0];
    return { etapa, maxEtapas, evoluciona: evo > 0, nivelMin, nivelEvo: evo || Infinity };
}

// ===================== IMÁGENES SENCILLAS (PokéAPI) =====================
const urlArtwork      = (id) => `${RAIZ}/other/official-artwork/${id}.png`;
const urlGrito        = (id) => `https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest/${id}.ogg`;
const urlSpritePeq    = (id) => `${RAIZ}/${id}.png`;
const urlItem         = (n) => "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/" + n + ".png";

// ===================== OBJETOS =====================
// Objetos clave de la historia del modo Región.
OBJETOS["poke-flute"] = ["Pokéflauta", 0, 0, 99, "clave", "Una flauta de sonido muy agradable. Su melodía despierta a cualquier Pokémon dormido."];
// Catálogo en objetos.js (nombres y descripciones oficiales, precios y bolsillo); aquí, lo que hace cada uno.
const _fichaObj = new Map();
function obj(clave) {
    if (_fichaObj.has(clave)) return _fichaObj.get(clave);
    const o = OBJETOS[clave];
    const f = o
        ? { clave, nombre: o[0], compra: o[1], venta: o[4] === "mt" || o[4] === "clave" ? 0 : o[2], medallas: o[3], bolsillo: o[4], desc: o[5], sprite: o[6] || clave }
        : { clave, nombre: nombreBonito(clave), compra: 0, venta: 0, medallas: 99, bolsillo: "objetos", desc: "", sprite: clave };
    _fichaObj.set(clave, f);
    return f;
}
const urlObj = (clave) => (/^https?:/.test(obj(clave).sprite) ? obj(clave).sprite : urlItem(obj(clave).sprite));
// Claves de las partidas antiguas.
const CLAVE_ANTIGUA = { poke: "poke-ball", great: "great-ball", ultra: "ultra-ball", master: "master-ball", pocion: "potion",
    superpocion: "super-potion", hiperpocion: "hyper-potion", curatotal: "full-heal", revivir: "revive", caramelo: "rare-candy" };
const claveObj = (k) => CLAVE_ANTIGUA[k] || k;
// Bolsillos de la mochila, con el icono de un objeto real.
const BOLSILLOS = [
    { cat: "cura",    nombre: "Botiquín",      icono: "potion" },
    { cat: "balls",   nombre: "Poké Balls",    icono: "poke-ball" },
    { cat: "objetos", nombre: "Objetos",       icono: "leftovers" },
    { cat: "bayas",   nombre: "Bayas",         icono: "oran-berry" },
    { cat: "mt",      nombre: "MT",            icono: "tm-normal" },
    { cat: "clave",   nombre: "Objetos clave", icono: "key-stone" },
];

// ---- Poké Balls: multiplicador de captura según la situación (como en los juegos) ----
// s = { enemigo, aliado, turno, registrado, noche, cueva, pesca }
const ULTRAENTES = new Set([793, 794, 795, 796, 797, 798, 799, 803, 804, 805, 806]);
const EVO_LUNAR = new Set([29, 30, 32, 33, 35, 39, 173, 174, 300, 517]);
const BOLA_MULT = {
    "great-ball": () => 1.5, "ultra-ball": () => 2, "master-ball": () => 255,
    "net-ball": (s) => (s.enemigo.tipos.some((t) => t === "water" || t === "bug") ? 3.5 : 1),
    "dive-ball": (s) => (s.enemigo.tipos.includes("water") ? 3.5 : 1),
    "lure-ball": (s) => (s.pesca ? 4 : 1),
    "nest-ball": (s) => Math.max(1, (41 - s.enemigo.nivel) / 10),
    "repeat-ball": (s) => (s.registrado ? 3.5 : 1),
    "timer-ball": (s) => Math.min(4, 1 + (s.turno - 1) * 0.3),
    "dusk-ball": (s) => (s.noche || s.cueva ? 3 : 1),
    "quick-ball": (s) => (s.turno <= 1 ? 5 : 1),
    "dream-ball": (s) => (s.enemigo.estado && s.enemigo.estado.tipo === "dor" ? 4 : 1),
    "beast-ball": (s) => (ULTRAENTES.has(s.enemigo.baseId) ? 5 : 0.1),
    "level-ball": (s) => { const a = s.aliado.nivel, e = s.enemigo.nivel; return a >= e * 4 ? 8 : a >= e * 2 ? 4 : a > e ? 2 : 1; },
    "moon-ball": (s) => (EVO_LUNAR.has(s.enemigo.baseId) ? 4 : 1),
    "heavy-ball": (s) => { const p = s.enemigo.peso || 0; return p >= 3000 ? 4 : p >= 2000 ? 3 : p >= 1000 ? 2 : 1; },
    "fast-ball": (s) => (s.enemigo.base && s.enemigo.base.speed >= 100 ? 4 : 1),
    "love-ball": (s) => (s.aliado.baseId === s.enemigo.baseId && s.aliado.genero && s.enemigo.genero && s.aliado.genero !== s.enemigo.genero ? 8 : 1),
};
const multBola = (k, s) => (BOLA_MULT[k] ? BOLA_MULT[k](s) : 1);
const esBola = (k) => obj(k).bolsillo === "balls";

// ---- Botiquín ----
const TODOS_ESTADOS = ["par", "que", "env", "dor", "con"];
// PS que cura: número fijo, fracción de los PS máximos o "max".
const CURA_PS = {
    potion: 20, "super-potion": 60, "hyper-potion": 120, "max-potion": "max", "full-restore": "max", "fresh-water": 30, "soda-pop": 50,
    lemonade: 70, "moomoo-milk": 100, "energy-powder": 60, "energy-root": 120, "berry-juice": 20, "sweet-heart": 20,
    "oran-berry": 10, "sitrus-berry": 0.25, "figy-berry": 1 / 3, "wiki-berry": 1 / 3, "mago-berry": 1 / 3, "aguav-berry": 1 / 3, "iapapa-berry": 1 / 3,
};
const psQueCura = (k, hpMax) => { const v = CURA_PS[k]; return v === "max" ? hpMax : v < 1 ? Math.max(1, Math.floor(hpMax * v)) : v || 0; };
const CURA_ESTADO = {
    antidote: ["env"], "paralyze-heal": ["par"], "burn-heal": ["que"], "ice-heal": ["con"], awakening: ["dor"],
    "cheri-berry": ["par"], "chesto-berry": ["dor"], "pecha-berry": ["env"], "rawst-berry": ["que"], "aspear-berry": ["con"],
};
["full-heal", "full-restore", "heal-powder", "lava-cookie", "old-gateau", "casteliacone", "lumiose-galette", "shalour-sable", "big-malasada", "lum-berry"]
    .forEach((k) => { CURA_ESTADO[k] = TODOS_ESTADOS; });
const REVIVIR = { revive: 0.5, "max-revive": 1, "revival-herb": 1, "sacred-ash": 1 };   // la Ceniza Sagrada, a todo el equipo
const CURA_PP = { ether: 10, "max-ether": 99, elixir: 10, "max-elixir": 99, "leppa-berry": 10 };
const PP_A_TODOS = new Set(["elixir", "max-elixir"]);
// Vitaminas: +10 puntos de esfuerzo (máx. 252 por estadística y 510 en total).
const VITAMINAS = { "hp-up": "hp", protein: "attack", iron: "defense", calcium: "special-attack", zinc: "special-defense", carbos: "speed" };
const EV_MAX = 252, EV_TOTAL = 510;
// Objetos de combate: +2 niveles a una característica (Crítico X: +2 al índice de crítico).
const OBJ_X = { "x-attack": "atk", "x-defense": "def", "x-sp-atk": "spa", "x-sp-def": "spd", "x-speed": "vel" };

// ---- Objetos que se equipan ----
const POTENCIA_TIPO = {
    "silk-scarf": "normal", charcoal: "fire", "mystic-water": "water", "sea-incense": "water", "wave-incense": "water",
    "miracle-seed": "grass", "rose-incense": "grass", magnet: "electric", "never-melt-ice": "ice", "black-belt": "fighting",
    "poison-barb": "poison", "soft-sand": "ground", "sharp-beak": "flying", "twisted-spoon": "psychic", "odd-incense": "psychic",
    "silver-powder": "bug", "hard-stone": "rock", "rock-incense": "rock", "spell-tag": "ghost", "dragon-fang": "dragon",
    "black-glasses": "dark", "metal-coat": "steel",
};
// Bayas que reducen a la mitad un ataque supereficaz de su tipo (la Chilan, cualquier ataque Normal).
const BAYA_RESISTE = {
    "occa-berry": "fire", "passho-berry": "water", "wacan-berry": "electric", "rindo-berry": "grass", "yache-berry": "ice",
    "chople-berry": "fighting", "kebia-berry": "poison", "shuca-berry": "ground", "coba-berry": "flying", "payapa-berry": "psychic",
    "tanga-berry": "bug", "charti-berry": "rock", "kasib-berry": "ghost", "haban-berry": "dragon", "colbur-berry": "dark",
    "babiri-berry": "steel", "roseli-berry": "fairy", "chilan-berry": "normal",
};
// Bayas de apuro (con un cuarto de los PS o menos): suben una característica.
const BAYA_APURO = { "liechi-berry": "atk", "ganlon-berry": "def", "salac-berry": "vel", "petaya-berry": "spa", "apicot-berry": "spd" };
const OBJ_LLEVABLES = new Set([
    "leftovers", "life-orb", "choice-band", "choice-specs", "choice-scarf", "focus-sash", "focus-band", "scope-lens", "razor-claw",
    "quick-claw", "expert-belt", "assault-vest", "eviolite", "shell-bell", "rocky-helmet", "white-herb", "muscle-band", "wise-glasses",
    "black-sludge", "kings-rock", "razor-fang", "wide-lens", "light-ball", "thick-club", "lucky-egg", "amulet-coin", "everstone",
    "heavy-duty-boots", "light-clay", "damp-rock", "heat-rock", "smooth-rock", "icy-rock", "terrain-extender",
    "weakness-policy", "air-balloon", "eject-button", "red-card", "shed-shell",
    "mental-herb", "big-root", "binding-band", "grip-claw", "loaded-dice", "throat-spray", "blunder-policy", "adrenaline-orb", "room-service",
    "protective-pads", "utility-umbrella", "booster-energy", "power-herb", "iron-ball", "float-stone", "toxic-orb", "flame-orb", "zoom-lens",
    "metronome", "safety-goggles", "electric-seed", "grassy-seed", "misty-seed", "psychic-seed", "destiny-knot", "sticky-barb", "lagging-tail",
    "ring-target", "mirror-herb",
    ...Object.keys(POTENCIA_TIPO),
]);
const TIPO_CRISTAL = {};
Object.entries(CRISTAL_Z).forEach(([t, k]) => { TIPO_CRISTAL[k] = t; });
const puedeLlevarse = (k) => OBJ_LLEVABLES.has(k) || obj(k).bolsillo === "bayas" || !!MEGAS[k] || !!TIPO_CRISTAL[k];
// Objetos con los que evoluciona alguna especie (piedras y los que en los juegos se llevan al intercambiar).
const OBJ_EVOLUCION = new Set([
    "fire-stone", "water-stone", "thunder-stone", "leaf-stone", "moon-stone", "sun-stone", "shiny-stone", "dusk-stone", "dawn-stone",
    "ice-stone", "oval-stone", "dragon-scale", "up-grade", "protector", "electirizer", "magmarizer", "dubious-disc", "reaper-cloth",
    "prism-scale", "whipped-dream", "sachet", "kings-rock", "metal-coat", "razor-claw", "razor-fang",
]);
const esEleccion = (k) => k === "choice-band" || k === "choice-specs" || k === "choice-scarf";
// Movimientos físicos que no son de contacto (para el Casco Dentado).
const SIN_CONTACTO = new Set([
    "earthquake", "bulldoze", "magnitude", "rock-slide", "stone-edge", "rock-tomb", "rock-throw", "rock-blast", "smack-down", "bone-club",
    "bonemerang", "bone-rush", "seed-bomb", "bullet-seed", "icicle-spear", "icicle-crash", "pin-missile", "poison-sting", "twineedle",
    "egg-bomb", "barrage", "rock-wrecker", "sky-attack", "explosion", "self-destruct", "gunk-shot", "spike-cannon", "razor-leaf", "fling",
    "pay-day", "precipice-blades", "diamond-storm", "thousand-arrows", "scale-shot", "ice-shard", "fissure", "psycho-cut", "beat-up",
    "present", "sacred-fire", "freeze-shock", "leafage",
]);

// ---- Textos cortos de lo que hace cada objeto (mochila y tienda) ----
const ESTADO_CURA_TXT = { par: "la parálisis", que: "las quemaduras", env: "el envenenamiento", dor: "el sueño", con: "la congelación" };
const STAT_TXT = { atk: "el Ataque", def: "la Defensa", spa: "el At. Esp.", spd: "la Def. Esp.", vel: "la Velocidad" };
const EV_TXT = { hp: "PS", attack: "Ataque", defense: "Defensa", "special-attack": "At. Esp.", "special-defense": "Def. Esp.", speed: "Velocidad" };
const BOLA_TXT = {
    "poke-ball": "Captura normal", "great-ball": "Captura ×1,5", "ultra-ball": "Captura ×2", "master-ball": "Captura asegurada",
    "premier-ball": "Captura normal", "luxury-ball": "Captura normal", "heal-ball": "Cura al capturado", "friend-ball": "Captura normal",
    "lure-ball": "×4 a los pescados", "net-ball": "×3,5 a Agua y Bicho", "dive-ball": "×3,5 a tipo Agua", "nest-ball": "Mejor con niveles bajos",
    "repeat-ball": "×3,5 si ya lo tienes", "timer-ball": "Mejora con los turnos", "dusk-ball": "×3 de noche o en cuevas",
    "quick-ball": "×5 en el primer turno", "dream-ball": "×4 si está dormido", "beast-ball": "Para los Ultraentes",
    "level-ball": "Mejor si tu nivel es mayor", "moon-ball": "×4 a los de Piedra Lunar", "heavy-ball": "Mejor con Pokémon pesados",
    "fast-ball": "×4 a los muy rápidos", "love-ball": "Misma especie, otro género",
};
function efectoCorto(k) {
    const ps = CURA_PS[k], est = CURA_ESTADO[k];
    if (esBola(k)) return BOLA_TXT[k] || "Captura normal";
    if (REVIVIR[k]) return k === "sacred-ash" ? "Revive a todo el equipo" : REVIVIR[k] === 1 ? "Revive con todos los PS" : "Revive con la mitad de PS";
    if (ps === "max" && est) return "Cura PS y estado";
    if (ps === "max") return "Cura todos los PS";
    if (ps != null) return ps < 1 ? `Cura ${Math.round(ps * 100)} % de PS` : `Cura ${ps} PS`;
    if (est) return est === TODOS_ESTADOS ? "Cura cualquier estado" : `Cura ${ESTADO_CURA_TXT[est[0]]}`;
    if (CURA_PP[k]) return (CURA_PP[k] >= 99 ? "Todos los PP" : `+${CURA_PP[k]} PP`) + (PP_A_TODOS.has(k) ? " de todos los movimientos" : " de un movimiento");
    if (VITAMINAS[k]) return `+10 esfuerzo en ${EV_TXT[VITAMINAS[k]]}`;
    if (OBJ_X[k]) return `Sube mucho ${STAT_TXT[OBJ_X[k]]}`;
    if (k === "dire-hit") return "Más golpes críticos";
    if (k === "rare-candy") return "Sube un nivel";
    if (MENTAS[k]) return "Naturaleza " + textoNaturaleza(MENTAS[k]);
    if (k === "ability-capsule") return "Cambia entre sus dos habilidades";
    if (k === "ability-patch") return "Le da su habilidad oculta";
    if (k === "shiny-charm") return "Más Pokémon variocolor";
    if (k === "pp-up") return "+20 % de PP a un movimiento";
    if (k === "pp-max") return "PP al máximo en un movimiento";
    if (POTENCIA_TIPO[k]) return `Potencia el tipo ${TIPOS_ES[POTENCIA_TIPO[k]]}`;
    if (BAYA_RESISTE[k]) return `Aguanta un ataque ${TIPOS_ES[BAYA_RESISTE[k]]}`;
    if (BAYA_APURO[k]) return `Sube ${STAT_TXT[BAYA_APURO[k]]} en apuros`;
    if (MEGAS[k]) return `Megaevoluciona a ${nombreBonito(NOMBRE_POR_ID[MEGAS[k].base] || "")}`;
    if (TIPO_CRISTAL[k]) return `Movimiento Z de tipo ${TIPOS_ES[TIPO_CRISTAL[k]]}`;
    if (obj(k).bolsillo === "mt") return `Enseña ${obj(k).nombre.replace(/^MT /, "")}`;
    if (OBJ_EVOLUCION.has(k) && !OBJ_LLEVABLES.has(k)) return "Hace evolucionar a algunos Pokémon";
    const otros = {
        leftovers: "Recupera PS cada turno", "life-orb": "+30 % de daño, pierde PS", "choice-band": "+50 % Ataque, un solo movimiento",
        "choice-specs": "+50 % At. Esp., un solo movimiento", "choice-scarf": "+50 % Velocidad, un solo movimiento",
        "focus-sash": "Aguanta un golpe con PS al máximo", "focus-band": "A veces aguanta con 1 PS", "scope-lens": "Más golpes críticos",
        "razor-claw": "Más golpes críticos", "quick-claw": "A veces ataca primero", "expert-belt": "+20 % a los supereficaces",
        "assault-vest": "+50 % Def. Esp., sin movimientos de estado", eviolite: "+50 % defensas si aún evoluciona",
        "shell-bell": "Recupera PS al atacar", "rocky-helmet": "Hiere a quien le golpea", "white-herb": "Anula las bajadas",
        "muscle-band": "+10 % a los físicos", "wise-glasses": "+10 % a los especiales", "black-sludge": "Cura a los de tipo Veneno",
        "kings-rock": "Puede hacer retroceder", "razor-fang": "Puede hacer retroceder", "wide-lens": "+10 % de precisión",
        "light-ball": "Dobla la fuerza de Pikachu", "thick-club": "Dobla el Ataque de Cubone y Marowak", "lucky-egg": "+50 % de experiencia",
        "amulet-coin": "Dobla el dinero ganado", everstone: "Impide evolucionar", "lansat-berry": "Más críticos en apuros",
        "starf-berry": "Sube mucho una característica en apuros", "exp-share": "Experiencia para todo el equipo",
        "heavy-duty-boots": "No le afectan las trampas", "light-clay": "Sus barreras duran 8 turnos",
        "damp-rock": "Su lluvia dura 8 turnos", "heat-rock": "Su sol dura 8 turnos", "smooth-rock": "Su tormenta de arena dura 8 turnos",
        "icy-rock": "Su nieve dura 8 turnos", "terrain-extender": "Sus campos duran 8 turnos",
        "weakness-policy": "+2 Ataque y At. Esp. si le dan un golpe muy eficaz", "air-balloon": "Inmune a Tierra hasta que le golpeen",
        "eject-button": "Sale del combate al recibir un golpe", "red-card": "Expulsa del combate al que le golpee", "shed-shell": "Siempre puede cambiarse",
        "mental-herb": "Se libra una vez de Atracción, Mofa, Otra Vez o Anulación", "big-root": "Absorbe un 30 % más de PS",
        "binding-band": "Sus ataques que atrapan quitan 1/6 de PS", "grip-claw": "Sus ataques que atrapan duran 7 turnos",
        "loaded-dice": "Sus golpes múltiples dan al menos 4 veces", "throat-spray": "+1 At. Esp. tras un movimiento de sonido",
        "blunder-policy": "+2 Velocidad si falla por precisión", "adrenaline-orb": "+1 Velocidad si le intimidan",
        "room-service": "−1 Velocidad con Espacio Raro", "protective-pads": "Sin efectos por contacto",
        "utility-umbrella": "No le afectan el sol ni la lluvia", "booster-energy": "Activa Paleosíntesis o Carga Cuark",
        "power-herb": "Ataca sin cargar una vez", "iron-ball": "Mitad de Velocidad y le alcanza la Tierra", "float-stone": "Pesa la mitad",
        "toxic-orb": "Lo envenena gravemente", "flame-orb": "Lo quema", "zoom-lens": "+20 % de precisión si ataca después",
        "metronome": "Más fuerza al repetir movimiento", "safety-goggles": "Inmune a la arena y a los polvos",
        "electric-seed": "+1 Defensa con Campo Eléctrico", "grassy-seed": "+1 Defensa con Campo de Hierba",
        "misty-seed": "+1 Def. Esp. con Campo de Niebla", "psychic-seed": "+1 Def. Esp. con Campo Psíquico",
        "destiny-knot": "Si lo enamoran, enamora también al otro", "sticky-barb": "Le quita PS y se pega al que le toca",
        "lagging-tail": "Siempre ataca el último", "ring-target": "Pierde sus inmunidades de tipo", "mirror-herb": "Copia una vez las subidas del rival",
    };
    if (otros[k]) return otros[k];
    if (obj(k).venta > 0 && !obj(k).compra) return `Se vende por ${numES(obj(k).venta)} ₽`;
    return "";
}
// Orden en la mochila y la tienda: las Poké Balls como en los juegos; el resto, por precio (lo que no se vende, al final) y nombre.
const ORDEN_BOLAS = ["poke-ball", "great-ball", "ultra-ball", "premier-ball", "heal-ball", "net-ball", "dive-ball", "nest-ball", "repeat-ball",
    "timer-ball", "luxury-ball", "dusk-ball", "quick-ball", "dream-ball", "beast-ball", "lure-ball", "level-ball", "moon-ball",
    "heavy-ball", "fast-ball", "friend-ball", "love-ball", "master-ball"];
function ordenarObjetos(lista) {
    if (lista.every((k) => ORDEN_BOLAS.includes(k))) return lista.sort((a, b) => ORDEN_BOLAS.indexOf(a) - ORDEN_BOLAS.indexOf(b));
    const precio = (k) => (k === "exp-share" ? -1 : obj(k).compra || (obj(k).venta ? obj(k).venta * 2 : 1e7));
    return lista.sort((a, b) => precio(a) - precio(b) || obj(a).nombre.localeCompare(obj(b).nombre, "es"));
}

// ---- Movimientos Z: potencia según la del movimiento base y animación de un gran ataque de su tipo ----
const poderZ = (p) => (p >= 140 ? 200 : p >= 130 ? 195 : p >= 120 ? 190 : p >= 110 ? 185 : p >= 100 ? 180 : p >= 90 ? 175 : p >= 80 ? 160 : p >= 70 ? 140 : p >= 60 ? 120 : 100);
const ANIM_Z = {
    normal: "giga-impact", fighting: "focus-punch", flying: "sky-attack", poison: "gunk-shot", ground: "precipice-blades",
    rock: "diamond-storm", bug: "megahorn", ghost: "shadow-force", steel: "doom-desire", fire: "blast-burn", water: "hydro-cannon",
    grass: "frenzy-plant", electric: "zap-cannon", psychic: "psycho-boost", ice: "sheer-cold", dragon: "draco-meteor",
    dark: "hyperspace-fury", fairy: "light-of-ruin",
};
// ===================== LEGENDARIOS Y SHINY =====================
const LEGENDARIOS = new Set([
    144, 145, 146, 150, 151, 243, 244, 245, 249, 250, 251,
    377, 378, 379, 380, 381, 382, 383, 384, 385, 386,
    480, 481, 482, 483, 484, 485, 486, 487, 488, 489, 490, 491, 492, 493,
    494, 638, 639, 640, 641, 642, 643, 644, 645, 646, 647, 648, 649,
    716, 717, 718, 719, 720, 721,
    772, 773, 785, 786, 787, 788, 789, 790, 791, 792, 793, 794, 795, 796, 797, 798, 799,
    800, 801, 802, 803, 804, 805, 806, 807, 808, 809,
    888, 889, 890, 891, 892, 893, 894, 895, 896, 897, 898, 905,
    1001, 1002, 1003, 1004, 1007, 1008, 1014, 1015, 1016, 1017, 1024, 1025,
    // Paradoja (raros, fuera de los equipos normales)
    984, 985, 986, 987, 988, 989, 990, 991, 992, 993, 994, 995, 1005, 1006, 1009, 1010, 1020, 1021, 1022, 1023,
]);
const esLegendario = (id) => LEGENDARIOS.has(id);
// Proporción de hembras de cada especie en octavos (PokéAPI /gender); x = sin género.
const GENERO_TABLA = "11111111144444444444444444448880006666664444444444444444422444222222444444444444xx44444444444444444xx444400444448484444xx4482240444x1111x111111xxx444xx1111111114444444444446611444444444444444444411444x4444444664444444444464444444444x440082288xxx444xxx1111111114444444444444444444444444444444x44422646644444444444084444444444444444444444xx4444xx11114444444444444444444416444xxxxxx80xxxxx1111111114444444444441111480184444444444444466444xx448444441114444444444444x44422141144x0448xxxxxx4xx8xxxxxx11111111144444441111114444444444444442224440044444444884444444444444411114411666664444444444444444444444xxx4444444444444x444444xx44400884444444xxx00xx0xxxx11111111144444444778884444444444444444444444441111144x444444444444xxxxxx11111111144444444446444444444444444184488864444444xxx444444x444xxxxxxxxxxxxxxxxxxxxxxxxx11111111144444444444444444444444444444444444xx88800044644488x444444444xxxx4444xxx11xxxxxx4444448111111111404444444xx4444444444444444444444444444444888444444444444444444444444xxxxxxxxxxxx444xxxxxxxxxxxx4xx000844xxxx4x";
function generoAleatorio(id) {
    const r = GENERO_TABLA[id - 1];
    if (!r || r === "x") return null;
    return Math.random() * 8 < Number(r) ? "f" : "m";
}
// Números como en los juegos en español: 8.500 (con el punto de los miles también en los de cuatro cifras).
const _fmtNum = (() => { try { return new Intl.NumberFormat("es-ES", { useGrouping: "always" }); } catch (_) { return null; } })();
const numES = (n) => { const x = Number(n) || 0; try { return _fmtNum ? _fmtNum.format(x) : x.toLocaleString("es-ES"); } catch (_) { return String(x); } };
// Mentas: la naturaleza a la que cambian.
const MENTAS = Object.fromEntries(["lonely", "adamant", "naughty", "brave", "bold", "impish", "lax", "relaxed", "modest", "mild", "rash", "quiet",
    "calm", "gentle", "careful", "sassy", "timid", "hasty", "jolly", "naive", "serious"].map((n) => [n + "-mint", n]));
const RATIO_RARO = 200; // 1 de cada 200 (legendarios / shiny)
// Probabilidad de que un salvaje sea variocolor: el triple con el Amuleto Iris (premio de la Pokédex).
const probShiny = () => (typeof tieneObjeto === "function" && tieneObjeto("shiny-charm") ? 3 : 1) / RATIO_RARO;

// ===================== EXPERIENCIA Y NIVELES =====================
// Puntos de esfuerzo (ev) con las claves de PokéAPI: hp, attack, defense, special-attack, special-defense, speed.
// La naturaleza sube un 10 % una característica y baja otra un 10 % (habilidades.js).
function statsDeNivel(base, nivel, ev = {}, naturaleza = null) {
    const b = (k) => 2 * base[k] + Math.floor(((ev || {})[k] || 0) / 4);
    const st = (k, s) => Math.floor((Math.floor((b(k) * nivel) / 100) + 5) * (naturaleza ? multNaturaleza(naturaleza, s) : 1));
    return {
        hpMax: Math.floor((b("hp") * nivel) / 100) + nivel + 10,
        stats: { atk: st("attack", "atk"), def: st("defense", "def"), spa: st("special-attack", "spa"), spd: st("special-defense", "spd"), vel: st("speed", "vel") },
    };
}
function xpNecesaria(nivel, factor) {
    return Math.round((12 + nivel * 8 + nivel * nivel * 0.9) * (factor || 1));
}
function xpPorVictoria(enemigo) {
    const b = enemigo.baseExp || 64;
    const bonus = esLegendario(enemigo.baseId) ? 1.3 : enemigo.furioso ? 1.5 : 1;   // (los Furiosos dan más experiencia)
    return Math.max(8, Math.round((b * (enemigo.nivel || 1) / 7) * bonus));
}
async function factorExpPokemon(id) {
    if (esLegendario(id)) return 1.8;
    let info; try { info = await etapaEvolutiva(id); } catch (_) { info = { etapa: 1, evoluciona: false }; }
    if (info.etapa >= 3) return 1.45;
    if (info.etapa === 2) return info.evoluciona ? 1.2 : 1.3;
    return 1.0;
}

// ===================== MEGAEVOLUCIONES =====================
// MEGAS (objetos.js): megapiedra → { base, api, sprite, nombre }. Charizard y Mewtwo tienen dos.
const megaDe = (id, objeto) => (objeto && MEGAS[objeto] && MEGAS[objeto].base === id ? MEGAS[objeto] : null);
// Mega-Rayquaza no usa megapiedra: megaevoluciona si sabe Ascenso Draco (y no lleva un cristal Z), como en Rubí Omega y Zafiro Alfa.
const MEGA_RAYQUAZA = { base: 384, api: "rayquaza-mega", sprite: "rayquaza-mega", nombre: "Mega-Rayquaza", pr: "384-mega", ascenso: true };
const megaPorAscenso = (id, objeto, movs) => (id === 384 && !TIPO_CRISTAL[objeto] && (movs || []).some((m) => m && m.clave === "dragon-ascent") ? MEGA_RAYQUAZA : null);
// Todas sus megaevoluciones (las de megapiedra y Mega-Rayquaza), para la Pokédex.
const formasMega = (id) => piedrasDe(id).map((k) => MEGAS[k]).concat(id === 384 ? [MEGA_RAYQUAZA] : []);
const megaDeC = (c) => (c ? megaDe(c.baseId, c.objeto) || megaPorAscenso(c.baseId, c.objeto, c.movimientos) : null);
const piedrasDe = (id) => Object.keys(MEGAS).filter((k) => MEGAS[k].base === id);

// ===================== UTILIDADES =====================
function sacarId(url) {
    const trozos = url.split("/").filter((t) => t !== "");
    return Number(trozos[trozos.length - 1]);
}
// Especies cuyo nombre oficial en español no sale de su clave de PokéAPI (Nidoran♀, Mr. Mime, paradojas…).
const NOMBRES_ES = { "nidoran-f": "Nidoran♀", "nidoran-m": "Nidoran♂", "farfetchd": "Farfetch'd", "mr-mime": "Mr. Mime", "ho-oh": "Ho-Oh", "mime-jr": "Mime Jr.", "porygon-z": "Porygon-Z", "flabebe": "Flabébé", "type-null": "Código Cero", "jangmo-o": "Jangmo-o", "hakamo-o": "Hakamo-o", "kommo-o": "Kommo-o", "sirfetchd": "Sirfetch'd", "mr-rime": "Mr. Rime", "great-tusk": "Colmilargo", "scream-tail": "Colagrito", "brute-bonnet": "Furioseta", "flutter-mane": "Melenaleteo", "slither-wing": "Reptalada", "sandy-shocks": "Pelarena", "iron-treads": "Ferrodada", "iron-bundle": "Ferrosaco", "iron-hands": "Ferropalmas", "iron-jugulis": "Ferrocuello", "iron-moth": "Ferropolilla", "iron-thorns": "Ferropúas", "wo-chien": "Wo-Chien", "chien-pao": "Chien-Pao", "ting-lu": "Ting-Lu", "chi-yu": "Chi-Yu", "roaring-moon": "Bramaluna", "iron-valiant": "Ferropaladín", "walking-wake": "Ondulagua", "iron-leaves": "Ferroverdor", "gouging-fire": "Flamariete", "raging-bolt": "Electrofuria", "iron-boulder": "Ferromole", "iron-crown": "Ferrotesta" };
function nombreBonito(texto) {
    if (NOMBRES_ES[texto]) return NOMBRES_ES[texto];
    return String(texto).split("-").map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" ");
}
const numFormato = (id) => "#" + String(id).padStart(3, "0");
function alAzar(lista) { return lista[Math.floor(Math.random() * lista.length)]; }
function mezclar(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}
function aleatorioEntre(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function limitar(v, min, max) { return Math.max(min, Math.min(max, v)); }
function idsDeGeneracion(gen) {
    if (gen === "all" || !gen) return null;
    const [min, max] = GENERACIONES[gen];
    return { min, max };
}
function insigniaTipo(tipoEn) {
    const span = document.createElement("span");
    span.className = "tipo tipo-" + tipoEn;
    span.textContent = TIPOS_ES[tipoEn] || tipoEn;
    return span;
}
// Tipo con su dibujo y su etiqueta oficial en español (iconos de PokéRogue).
function insigniaTipoHTML(tipoEn) {
    return `<span class="insignia-tipo">${iconoTipo(tipoEn, 2)}${etiquetaTipo(tipoEn, 2)}</span>`;
}

// ===================== LISTA GLOBAL DE POKÉMON =====================
let TODOS = [];          // [{ id, name }] (nombres de especie)
let NOMBRE_POR_ID = {};  // { id: name }

// ===================== API CON CACHÉ =====================
// Lo que tarda demasiado en llegar (una conexión que se queda colgada) no puede parar el juego: pasado un tiempo se sigue
// sin ello (una imagen o un JSON que tarda más de 20 s cuenta como fallo; una animación, a los pocos segundos se salta).
const conLimite = (p, ms, siNo = null) => Promise.race([p, new Promise((r) => setTimeout(() => r(siNo), ms))]);
function pedirConLimite(url, ms = 20000) {
    const ac = typeof AbortController === "function" ? new AbortController() : null;
    const t = ac && setTimeout(() => ac.abort(), ms);
    return fetch(url, ac ? { signal: ac.signal } : undefined).finally(() => clearTimeout(t));
}
const _cacheURL = new Map();
async function pedir(url) {
    if (_cacheURL.has(url)) return _cacheURL.get(url);
    // Reintenta hasta 3 veces y no cachea el fallo (un microcorte no rompe la partida).
    const p = (async () => {
        let ultimo;
        for (let intento = 0; intento < 3; intento++) {
            try {
                const r = await pedirConLimite(url);
                if (!r.ok) throw new Error("HTTP " + r.status);
                return await r.json();
            } catch (e) {
                ultimo = e;
                if (intento < 2) await new Promise((res) => setTimeout(res, 350 * (intento + 1)));
            }
        }
        _cacheURL.delete(url);
        throw ultimo;
    })();
    _cacheURL.set(url, p);
    return p;
}
const _cachePokemon = new Map();
const _cacheEspecie = new Map();
const _cacheTipo = new Map();
async function cargarPokemon(id) {
    if (_cachePokemon.has(id)) return _cachePokemon.get(id);
    const d = await pedir(`https://pokeapi.co/api/v2/pokemon/${id}`);
    _cachePokemon.set(id, d);
    return d;
}
async function cargarEspecie(id) {
    if (_cacheEspecie.has(id)) return _cacheEspecie.get(id);
    const d = await pedir(`https://pokeapi.co/api/v2/pokemon-species/${id}`);
    _cacheEspecie.set(id, d);
    return d;
}
async function idsPorTipo(tipo) {
    if (_cacheTipo.has(tipo)) return _cacheTipo.get(tipo);
    const d = await pedir(`https://pokeapi.co/api/v2/type/${tipo}`);
    const set = new Set(d.pokemon.map((e) => sacarId(e.pokemon.url)).filter((id) => id <= TOTAL_NACIONAL));
    _cacheTipo.set(tipo, set);
    return set;
}
function textoEspecie(especie) {
    const e = especie.flavor_text_entries || [];
    const es = e.find((x) => x.language.name === "es");
    const en = e.find((x) => x.language.name === "en");
    const texto = (es || en || {}).flavor_text || "";
    return texto.replace(/[\n\f\r­]/g, " ").replace(/\s+/g, " ").trim();
}
// Velocidad del juego (acelerador ×1, ×2, ×3, como en los fangames): todo va más rápido salvo la música.
const velJuego = () => (typeof config !== "undefined" && config.velocidad) || 1;
const esperar = (ms) => new Promise((r) => setTimeout(r, ms / velJuego()));
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));   // espera real, sin acelerar
