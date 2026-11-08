/* =========================================================
   PODERES DE COMBATE · Megaevolución, movimientos Z, Dinamax (y Gigamax) y Teracristalización.
   Cada entrenador puede usar uno por combate. Nombres oficiales en español (traducción de PokéRogue),
   potencias de los Maximovimientos como en Pokémon Showdown y sprites de Gigamax (los 2D de PokéRogue y, si no
   tienen animación, la oficial en 3D de Showdown). Las animaciones y cinemáticas de los poderes están en battle.js.
   ========================================================= */

// ---------- Dinamax: Maximovimientos (uno por tipo) y su efecto ----------
// efecto: { clima } · { terreno } · { yo: cambios del usuario } · { rival: cambios del rival }
const MAX_MOV = {
    normal: ["max-strike", "Maxiataque", { rival: { vel: -1 } }],
    fighting: ["max-knuckle", "Maxipuño", { yo: { atk: 1 } }],
    flying: ["max-airstream", "Maxiciclón", { yo: { vel: 1 } }],
    poison: ["max-ooze", "Maxiácido", { yo: { spa: 1 } }],
    ground: ["max-quake", "Maxitemblor", { yo: { spd: 1 } }],
    rock: ["max-rockfall", "Maxilito", { clima: "arena" }],
    bug: ["max-flutterby", "Maxinsecto", { rival: { spa: -1 } }],
    ghost: ["max-phantasm", "Maxiespectro", { rival: { def: -1 } }],
    steel: ["max-steelspike", "Maximetal", { yo: { def: 1 } }],
    fire: ["max-flare", "Maxignición", { clima: "sol" }],
    water: ["max-geyser", "Maxichorro", { clima: "lluvia" }],
    grass: ["max-overgrowth", "Maxiflora", { terreno: "hierba" }],
    electric: ["max-lightning", "Maxitormenta", { terreno: "electrico" }],
    psychic: ["max-mindstorm", "Maxionda", { terreno: "psiquico" }],
    ice: ["max-hailstorm", "Maxihelada", { clima: "nieve" }],
    dragon: ["max-wyrmwind", "Maxidraco", { rival: { atk: -1 } }],
    dark: ["max-darkness", "Maxisombra", { rival: { spd: -1 } }],
    fairy: ["max-starfall", "Maxiestela", { terreno: "niebla" }],
};
// Potencia: la tabla de los juegos (los de Lucha y Veneno, más baja) y los movimientos que tienen la suya.
const MAX_POTENCIA_PROPIA = {
    bonemerang: 130, bonerush: 130, bulletseed: 130, cometpunch: 100, counter: 75, crushgrip: 140, doublehit: 120, doubleironbash: 140,
    doublekick: 80, dragondarts: 130, dualchop: 130, dualwingbeat: 130, electroball: 130, endeavor: 130, fissure: 130, flail: 130,
    frustration: 130, furyswipes: 100, geargrind: 130, grassknot: 130, guillotine: 130, gyroball: 130, heatcrash: 130, heavyslam: 130,
    horndrill: 130, iciclespear: 130, magnitude: 140, multiattack: 95, naturalgift: 130, pinmissile: 130, powertrip: 130, punishment: 130,
    return: 130, risingvoltage: 140, rockblast: 130, scaleshot: 130, seismictoss: 75, sheercold: 130, spikecannon: 120, storedpower: 130,
    surgingstrikes: 130, tachyoncutter: 140, tailslap: 130, terrainpulse: 130, tripleaxel: 140, triplekick: 80, trumpcard: 130,
    twineedle: 100, weatherball: 130, wringout: 140,
};
function poderMax(m) {
    const propia = MAX_POTENCIA_PROPIA[(m.clave || "").replace(/-/g, "")];
    if (propia) return propia;
    const p = m.poder || 0;
    if (!p) return 100;
    if (m.tipo === "fighting" || m.tipo === "poison")
        return p >= 150 ? 100 : p >= 110 ? 95 : p >= 75 ? 90 : p >= 65 ? 85 : p >= 55 ? 80 : p >= 45 ? 75 : 70;
    return p >= 150 ? 150 : p >= 110 ? 140 : p >= 75 ? 130 : p >= 65 ? 120 : p >= 55 ? 110 : p >= 45 ? 100 : 90;
}

// ---------- Gigamax: las especies que pueden, su Gigamovimiento y lo que hace ----------
// efecto: residuo (daña 4 turnos a los que no son de su tipo) · paralisis · veneno · venenoPar · confusion · aturde (veneno,
// parálisis o sueño) · critico · atrapa (sin escapatoria) · trampa (atrapa y hiere) · velocidad · velo (Velo Aurora) · despejar ·
// rocas · acero · cura · curaSexto · bostezo · pp · atraviesa (atraviesa la protección) · poder (más potencia)
const GMAX = {
    3: { mov: "g-max-vine-lash", nombre: "Gigalianas", tipo: "grass", efecto: "residuo" },
    6: { mov: "g-max-wildfire", nombre: "Gigallamarada", tipo: "fire", efecto: "residuo" },
    9: { mov: "g-max-cannonade", nombre: "Gigacañonazo", tipo: "water", efecto: "residuo" },
    12: { mov: "g-max-befuddle", nombre: "Gigaestupor", tipo: "bug", efecto: "aturde" },
    25: { mov: "g-max-volt-crash", nombre: "Gigatronada", tipo: "electric", efecto: "paralisis" },
    52: { mov: "g-max-gold-rush", nombre: "Gigamonedas", tipo: "normal", efecto: "confusion" },
    68: { mov: "g-max-chi-strike", nombre: "Gigapuñición", tipo: "fighting", efecto: "critico" },
    94: { mov: "g-max-terror", nombre: "Gigaaparición", tipo: "ghost", efecto: "atrapa" },
    99: { mov: "g-max-foam-burst", nombre: "Gigaespuma", tipo: "water", efecto: "velocidad" },
    131: { mov: "g-max-resonance", nombre: "Gigamelodía", tipo: "ice", efecto: "velo" },
    133: { mov: "g-max-cuddle", nombre: "Gigaternura", tipo: "normal", efecto: null },
    143: { mov: "g-max-replenish", nombre: "Gigarreciclaje", tipo: "normal", efecto: null },
    569: { mov: "g-max-malodor", nombre: "Gigapestilencia", tipo: "poison", efecto: "veneno" },
    809: { mov: "g-max-meltdown", nombre: "Gigafundido", tipo: "steel", efecto: null },
    812: { mov: "g-max-drum-solo", nombre: "Gigarredoble", tipo: "grass", efecto: "poder" },
    815: { mov: "g-max-fireball", nombre: "Gigaesfera Ígnea", tipo: "fire", efecto: "poder" },
    818: { mov: "g-max-hydrosnipe", nombre: "Gigadisparo", tipo: "water", efecto: "poder" },
    823: { mov: "g-max-wind-rage", nombre: "Gigahuracán", tipo: "flying", efecto: "despejar" },
    826: { mov: "g-max-gravitas", nombre: "Gigabóveda", tipo: "psychic", efecto: null },
    834: { mov: "g-max-stonesurge", nombre: "Gigatrampa Rocas", tipo: "water", efecto: "rocas" },
    839: { mov: "g-max-volcalith", nombre: "Gigarroca Ígnea", tipo: "rock", efecto: "residuo" },
    841: { mov: "g-max-tartness", nombre: "Gigacorrosión", tipo: "grass", efecto: null },
    842: { mov: "g-max-sweetness", nombre: "Giganéctar", tipo: "grass", efecto: "cura" },
    844: { mov: "g-max-sandblast", nombre: "Gigapolvareda", tipo: "ground", efecto: "trampa" },
    849: { mov: "g-max-stun-shock", nombre: "Gigadescarga", tipo: "electric", efecto: "venenoPar" },
    851: { mov: "g-max-centiferno", nombre: "Gigacienfuegos", tipo: "fire", efecto: "trampa" },
    858: { mov: "g-max-smite", nombre: "Gigacastigo", tipo: "fairy", efecto: "confusion" },
    861: { mov: "g-max-snooze", nombre: "Gigasopor", tipo: "dark", efecto: "bostezo" },
    869: { mov: "g-max-finale", nombre: "Gigacolofón", tipo: "fairy", efecto: "curaSexto" },
    879: { mov: "g-max-steelsurge", nombre: "Gigatrampa Acero", tipo: "steel", efecto: "acero" },
    884: { mov: "g-max-depletion", nombre: "Gigadesgaste", tipo: "dragon", efecto: "pp" },
    892: { mov: "g-max-one-blow", nombre: "Gigagolpe Brusco", tipo: "dark", efecto: "atraviesa" },
};
const puedeGigamax = (c) => !!GMAX[c.baseId] && !c.esMega;
// Animación de cada Gigamovimiento: la del movimiento que más se le parece (ni PokéRogue ni Showdown tienen las suyas, salvo
// Gigatrampa Acero en Showdown). Los Maximovimientos normales usan la del gran ataque Z de su tipo.
const ANIM_GMAX = {
    "g-max-wildfire": "magma-storm", "g-max-vine-lash": "power-whip", "g-max-cannonade": "hydro-cannon", "g-max-befuddle": "silver-wind",
    "g-max-volt-crash": "thunder", "g-max-gold-rush": "pay-day", "g-max-chi-strike": "close-combat", "g-max-terror": "spirit-shackle",
    "g-max-foam-burst": "bubble-beam", "g-max-resonance": "aurora-beam", "g-max-cuddle": "play-rough", "g-max-replenish": "body-slam",
    "g-max-malodor": "gunk-shot", "g-max-meltdown": "double-iron-bash", "g-max-drum-solo": "drum-beating", "g-max-fireball": "pyro-ball",
    "g-max-hydrosnipe": "snipe-shot", "g-max-wind-rage": "hurricane", "g-max-gravitas": "gravity", "g-max-stonesurge": "stone-edge",
    "g-max-volcalith": "rock-wrecker", "g-max-tartness": "apple-acid", "g-max-sweetness": "grav-apple", "g-max-sandblast": "sand-tomb",
    "g-max-stun-shock": "overdrive", "g-max-centiferno": "fire-lash", "g-max-smite": "dazzling-gleam", "g-max-snooze": "dark-pulse",
    "g-max-finale": "fleur-cannon", "g-max-depletion": "dynamax-cannon", "g-max-one-blow": "wicked-blow",
};
// Como en Espada y Escudo, Zacian, Zamazenta y Eternatus no pueden dinamaxizarse.
const SIN_DINAMAX = new Set([888, 889, 890]);
// Sprites de Gigamax, animados siempre que se pueda: los de PokéRogue que tienen animación (Garbodor, Cinderace, Coalossal);
// si no, su animación oficial (3D, la de Showdown, algo reducida); y si tampoco, el sprite 2D quieto de PokéRogue o de Showdown.
const GMAX_ANI_PR = new Set([569, 815, 839]);
const GMAX_SIN_3D = { f: new Set([3, 9, 812, 815, 892]), b: new Set([3, 9, 812, 815, 818, 892]) };
function candidatosGmax(id, espalda, shiny) {
    const k = id === 892 ? "892-gigantamax-single" : `${id}-gigantamax`, sd = nombreShowdown(id);
    const prDir = (espalda ? "back/" : "") + (shiny ? "shiny/" : "");
    const c = [{ tipo: "atlas", url: prURL(`images/pokemon/${prDir}${k}`) }];
    if (sd && ani3D() && !GMAX_ANI_PR.has(id) && !GMAX_SIN_3D[espalda ? "b" : "f"].has(id))
        c.push({ tipo: "img", url: `${SD_BASE}sprites/ani${espalda ? "-back" : ""}${shiny ? "-shiny" : ""}/${sd}-gmax.gif`, animado: true, escala: ESCALA_3D });
    if (sd) c.push({ tipo: "img", url: `${SD_BASE}sprites/gen5${espalda ? "-back" : ""}${shiny ? "-shiny" : ""}/${sd}-gmax.png` });
    return shiny ? c.concat(sinPreferencia(candidatosGmax(id, espalda, false))) : c;
}
// El Maximovimiento de un movimiento (si está gigamaxizado y es de su tipo, su Gigamovimiento); los de estado, Maxibarrera.
function movMax(c, m, gmax) {
    if (!m || m.clave === "struggle") return m;
    const base = m.base || m;
    if (base.cat === "est") return { clave: "max-guard", nombre: "Maxibarrera", tipo: "normal", cat: "est", poder: 0, prec: 1, pp: base.pp, ppAct: base.ppAct,
        prio: 4, especial: "proteccion", esMax: true, base };
    const tipo = tipoDeMovimiento(c, base);
    const g = gmax && GMAX[c.baseId], esG = !!(g && g.tipo === tipo);
    const [clave, nombre, efecto] = MAX_MOV[tipo] || MAX_MOV.normal;
    return { clave: esG ? g.mov : clave, nombre: esG ? g.nombre : nombre, tipo, cat: base.cat,
        poder: esG && g.efecto === "poder" ? 160 : poderMax(base), prec: 1, pp: base.pp, ppAct: base.ppAct, prio: 0, esMax: true, base,
        efectoMax: esG ? { gmax: g.efecto, nombre: g.nombre, tipo } : efecto };
}

// ---------- Teracristalización ----------
// Teratipo: el que tenga guardado o, si no, su primer tipo. Iconos de teratipo de Pokémon Showdown.
const TIPOS_TERA = ["normal", "fire", "water", "electric", "grass", "ice", "fighting", "poison", "ground", "flying", "psychic", "bug", "rock",
    "ghost", "dragon", "dark", "steel", "fairy"];
// Teraexplosión teracristalizado: la animación de su teratipo (la misma elección que Pokémon Showdown).
const TERA_BLAST_ANIM = {
    normal: "techno-blast", fire: "flamethrower", water: "hydro-pump", electric: "thunderbolt", grass: "seed-flare", ice: "ice-beam",
    fighting: "focus-blast", poison: "sludge-bomb", ground: "earth-power", flying: "aeroblast", psychic: "psychic", bug: "bug-buzz",
    rock: "power-gem", ghost: "infernal-parade", dragon: "dragon-pulse", dark: "dark-pulse", steel: "flash-cannon", fairy: "moonblast",
};
const urlTera = (t) => `https://play.pokemonshowdown.com/sprites/types/Tera${t.charAt(0).toUpperCase() + t.slice(1)}.png`;
// Brillo del cristal según el teratipo.
const COLOR_TERA = {
    normal: "#e8e2c4", fire: "#ff9a4d", water: "#69b3ff", electric: "#ffe04d", grass: "#86e05a", ice: "#9eeaff", fighting: "#ff6a52",
    poison: "#d27cf0", ground: "#f0c66a", flying: "#b2c4ff", psychic: "#ff7bb5", bug: "#c8e03a", rock: "#d8c08a", ghost: "#a08cf0",
    dragon: "#9a7cff", dark: "#a08a7a", steel: "#c9d6e6", fairy: "#ffb0e6",
};
// STAB con Teracristal: el de sus tipos de siempre y el del teratipo (×2 si coincide con uno de los suyos).
function stabDe(c, tipo) {
    const ada = c.habilidad === "adaptability";
    const orig = (c.teracristal ? c.tiposAntesTera : c.tipos) || [];
    const esOrig = orig.includes(tipo), esTera = c.teracristal === tipo;
    if (esTera && esOrig) return ada ? 2.25 : 2;
    if (esTera || esOrig) return ada ? 2 : 1.5;
    return 1;
}

const NOMBRE_PODER = { mega: "Megaevolución", z: "Poder Z", dinamax: "Dinamax", tera: "Teracristal" };
