/* =========================================================
   FORMAS REGIONALES · Alola, Galar, Hisui y Paldea
   Cada forma es un Pokémon más, con su número de PokéAPI (10091 = Rattata de Alola), que viene de su especie de siempre
   (base): la especie da la Pokédex, la experiencia y la descripción; la forma, sus tipos, características y movimientos.
   Sprites: las tiras 2D animadas de Pokémon Essentials (EBDX), los atlas de PokéRogue (2000 + n.º en Alola, 4000 en
   Galar, 6000 en Hisui y 8000 en Paldea) y los de Showdown. En Aurelia aparecen a veces en lugar de su especie.
   Y las otras formas (Rotom, Giratina, Shaymin, Formas Tótem, Deoxys, Hoopa, Oricorio y Lycanroc): no salen solas, se
   cambian con su objeto (los vende Lem en la Torre Prisma) o, las de Lycanroc, según la hora a la que evoluciona Rockruff.
   ========================================================= */
const REGION_FORMA = { alola: "Alola", galar: "Galar", hisui: "Hisui", paldea: "Paldea" };
const GEN_REGION = { alola: 7, galar: 8, hisui: 8, paldea: 9 };   // (hoja de iconos de PokéRogue en la que está)
// id: especie, región, tipos, nombre en Showdown, clave en PokéRogue y archivo de EBDX (uno, o frente/espalda/variocolor si cambian)
const FORMAS_REGIONALES = {
    10091: { base: 19, region: "alola", tipos: ["dark","normal"], sd: "rattata-alola", pr: "2019", ebdx: "RATTATA_1.png" },   // rattata-alola
    10092: { base: 20, region: "alola", tipos: ["dark","normal"], sd: "raticate-alola", pr: "2020", ebdx: "RATICATE_1.png" },   // raticate-alola
    10100: { base: 26, region: "alola", tipos: ["electric","psychic"], sd: "raichu-alola", pr: "2026", ebdx: "RAICHU_1.png" },   // raichu-alola
    10101: { base: 27, region: "alola", tipos: ["ice","steel"], sd: "sandshrew-alola", pr: "2027", ebdx: "SANDSHREW_1.png" },   // sandshrew-alola
    10102: { base: 28, region: "alola", tipos: ["ice","steel"], sd: "sandslash-alola", pr: "2028", ebdx: "SANDSLASH_1.png" },   // sandslash-alola
    10103: { base: 37, region: "alola", tipos: ["ice"], sd: "vulpix-alola", pr: "2037", ebdx: "VULPIX_1.png" },   // vulpix-alola
    10104: { base: 38, region: "alola", tipos: ["ice","fairy"], sd: "ninetales-alola", pr: "2038", ebdx: "NINETALES_1.png" },   // ninetales-alola
    10105: { base: 50, region: "alola", tipos: ["ground","steel"], sd: "diglett-alola", pr: "2050", ebdx: "DIGLETT_1.png" },   // diglett-alola
    10106: { base: 51, region: "alola", tipos: ["ground","steel"], sd: "dugtrio-alola", pr: "2051", ebdx: "DUGTRIO_1.png" },   // dugtrio-alola
    10107: { base: 52, region: "alola", tipos: ["dark"], sd: "meowth-alola", pr: "2052", ebdx: "MEOWTH_1.png" },   // meowth-alola
    10108: { base: 53, region: "alola", tipos: ["dark"], sd: "persian-alola", pr: "2053", ebdx: "PERSIAN_1.png" },   // persian-alola
    10109: { base: 74, region: "alola", tipos: ["rock","electric"], sd: "geodude-alola", pr: "2074", ebdx: "GEODUDE_1.png" },   // geodude-alola
    10110: { base: 75, region: "alola", tipos: ["rock","electric"], sd: "graveler-alola", pr: "2075", ebdx: "GRAVELER_1.png" },   // graveler-alola
    10111: { base: 76, region: "alola", tipos: ["rock","electric"], sd: "golem-alola", pr: "2076", ebdx: "GOLEM_1.png" },   // golem-alola
    10112: { base: 88, region: "alola", tipos: ["poison","dark"], sd: "grimer-alola", pr: "2088", ebdx: "GRIMER_1.png" },   // grimer-alola
    10113: { base: 89, region: "alola", tipos: ["poison","dark"], sd: "muk-alola", pr: "2089", ebdx: "MUK_1.png" },   // muk-alola
    10114: { base: 103, region: "alola", tipos: ["grass","dragon"], sd: "exeggutor-alola", pr: "2103", ebdx: "EXEGGUTOR_1.png" },   // exeggutor-alola
    10115: { base: 105, region: "alola", tipos: ["fire","ghost"], sd: "marowak-alola", pr: "2105", ebdx: "MAROWAK_1.png" },   // marowak-alola
    10161: { base: 52, region: "galar", tipos: ["steel"], sd: "meowth-galar", pr: "4052", ebdx: "MEOWTH_2.png" },   // meowth-galar
    10162: { base: 77, region: "galar", tipos: ["psychic"], sd: "ponyta-galar", pr: "4077", ebdx: "PONYTA_1.png" },   // ponyta-galar
    10163: { base: 78, region: "galar", tipos: ["psychic","fairy"], sd: "rapidash-galar", pr: "4078", ebdx: "RAPIDASH_1.png" },   // rapidash-galar
    10164: { base: 79, region: "galar", tipos: ["psychic"], sd: "slowpoke-galar", pr: "4079", ebdx: "SLOWPOKE_1.png" },   // slowpoke-galar
    10165: { base: 80, region: "galar", tipos: ["poison","psychic"], sd: "slowbro-galar", pr: "4080", ebdx: "SLOWBRO_1.png" },   // slowbro-galar
    10166: { base: 83, region: "galar", tipos: ["fighting"], sd: "farfetchd-galar", pr: "4083", ebdx: "FARFETCHD_1.png" },   // farfetchd-galar
    10167: { base: 110, region: "galar", tipos: ["poison","fairy"], sd: "weezing-galar", pr: "4110", ebdx: "WEEZING_1.png" },   // weezing-galar
    10168: { base: 122, region: "galar", tipos: ["ice","psychic"], sd: "mrmime-galar", pr: "4122", ebdx: "MRMIME_1.png" },   // mr-mime-galar
    10169: { base: 144, region: "galar", tipos: ["psychic","flying"], sd: "articuno-galar", pr: "4144", ebdx: "ARTICUNO_1.png" },   // articuno-galar
    10170: { base: 145, region: "galar", tipos: ["fighting","flying"], sd: "zapdos-galar", pr: "4145", ebdx: "ZAPDOS_1.png" },   // zapdos-galar
    10171: { base: 146, region: "galar", tipos: ["dark","flying"], sd: "moltres-galar", pr: "4146", ebdx: "MOLTRES_1.png" },   // moltres-galar
    10172: { base: 199, region: "galar", tipos: ["poison","psychic"], sd: "slowking-galar", pr: "4199", ebdx: "SLOWKING_1.png" },   // slowking-galar
    10173: { base: 222, region: "galar", tipos: ["ghost"], sd: "corsola-galar", pr: "4222", ebdx: "CORSOLA_1.png" },   // corsola-galar
    10174: { base: 263, region: "galar", tipos: ["dark","normal"], sd: "zigzagoon-galar", pr: "4263", ebdx: "ZIGZAGOON_1.png" },   // zigzagoon-galar
    10175: { base: 264, region: "galar", tipos: ["dark","normal"], sd: "linoone-galar", pr: "4264", ebdx: "LINOONE_1.png" },   // linoone-galar
    10176: { base: 554, region: "galar", tipos: ["ice"], sd: "darumaka-galar", pr: "4554", ebdx: "DARUMAKA_2.png" },   // darumaka-galar
    10177: { base: 555, region: "galar", tipos: ["ice"], sd: "darmanitan-galar", pr: "4555", ebdx: "DARMANITAN_2.png" },   // darmanitan-galar-standard
    10179: { base: 562, region: "galar", tipos: ["ground","ghost"], sd: "yamask-galar", pr: "4562", ebdx: "YAMASK_1.png" },   // yamask-galar
    10180: { base: 618, region: "galar", tipos: ["ground","steel"], sd: "stunfisk-galar", pr: "4618", ebdx: "STUNFISK_1.png" },   // stunfisk-galar
    10229: { base: 58, region: "hisui", tipos: ["fire","rock"], sd: "growlithe-hisui", pr: "6058", ebdx: "GROWLITHE_1.PNG" },   // growlithe-hisui
    10230: { base: 59, region: "hisui", tipos: ["fire","rock"], sd: "arcanine-hisui", pr: "6059", ebdx: "ARCANINE_1.PNG" },   // arcanine-hisui
    10231: { base: 100, region: "hisui", tipos: ["electric","grass"], sd: "voltorb-hisui", pr: "6100", ebdx: "VOLTORB_1.PNG" },   // voltorb-hisui
    10232: { base: 101, region: "hisui", tipos: ["electric","grass"], sd: "electrode-hisui", pr: "6101", ebdx: "ELECTRODE_1.PNG" },   // electrode-hisui
    10233: { base: 157, region: "hisui", tipos: ["fire","ghost"], sd: "typhlosion-hisui", pr: "6157", ebdx: "TYPHLOSION_1.PNG" },   // typhlosion-hisui
    10234: { base: 211, region: "hisui", tipos: ["dark","poison"], sd: "qwilfish-hisui", pr: "6211", ebdx: "QWILFISH_1.PNG" },   // qwilfish-hisui
    10235: { base: 215, region: "hisui", tipos: ["fighting","poison"], sd: "sneasel-hisui", pr: "6215", ebdx: "SNEASEL_1.PNG" },   // sneasel-hisui
    10236: { base: 503, region: "hisui", tipos: ["water","dark"], sd: "samurott-hisui", pr: "6503", ebdx: "SAMUROTT_1.PNG" },   // samurott-hisui
    10237: { base: 549, region: "hisui", tipos: ["grass","fighting"], sd: "lilligant-hisui", pr: "6549", ebdx: "LILLIGANT_1.PNG" },   // lilligant-hisui
    10238: { base: 570, region: "hisui", tipos: ["normal","ghost"], sd: "zorua-hisui", pr: "6570", ebdx: "ZORUA_1.PNG" },   // zorua-hisui
    10239: { base: 571, region: "hisui", tipos: ["normal","ghost"], sd: "zoroark-hisui", pr: "6571", ebdx: "ZOROARK_1.PNG" },   // zoroark-hisui
    10240: { base: 628, region: "hisui", tipos: ["psychic","flying"], sd: "braviary-hisui", pr: "6628", ebdx: "BRAVIARY_1.PNG" },   // braviary-hisui
    10241: { base: 705, region: "hisui", tipos: ["steel","dragon"], sd: "sliggoo-hisui", pr: "6705", ebdx: "SLIGGOO_1.PNG" },   // sliggoo-hisui
    10242: { base: 706, region: "hisui", tipos: ["steel","dragon"], sd: "goodra-hisui", pr: "6706", ebdx: "GOODRA_1.PNG" },   // goodra-hisui
    10243: { base: 713, region: "hisui", tipos: ["ice","rock"], sd: "avalugg-hisui", pr: "6713", ebdx: "AVALUGG_1.PNG" },   // avalugg-hisui
    10244: { base: 724, region: "hisui", tipos: ["grass","fighting"], sd: "decidueye-hisui", pr: "6724", ebdx: "DECIDUEYE_1.PNG" },   // decidueye-hisui
    10250: { base: 128, region: "paldea", tipos: ["fighting"], sd: "tauros-paldeacombat", pr: "8128", ebdx: "TAUROS_1.png", raza: "Raza Combatiente" },   // tauros-paldea-combat-breed
    10251: { base: 128, region: "paldea", tipos: ["fighting","fire"], sd: "tauros-paldeablaze", pr: "8128-blaze", ebdx: "TAUROS_2.png", raza: "Raza Ardiente" },   // tauros-paldea-blaze-breed
    10252: { base: 128, region: "paldea", tipos: ["fighting","water"], sd: "tauros-paldeaaqua", pr: "8128-aqua", ebdx: "TAUROS_3.png", raza: "Raza Acuática" },   // tauros-paldea-aqua-breed
    10253: { base: 194, region: "paldea", tipos: ["poison","ground"], sd: "wooper-paldea", pr: "8194", ebdx: "WOOPER_1.png" },   // wooper-paldea
};
// Otras formas (sin región): nombre (si no es el de su especie), etiqueta (la forma) y el objeto con el que se cambia.
const FORMAS_ALT = {
    10008: { base: 479, nombre: "Rotom Calor", etiqueta: "Calor", tipos: ["electric", "fire"], sd: "rotom-heat", pr: "479-heat", ebdx: "ROTOM_1.png", objeto: "rotom-catalog" },
    10009: { base: 479, nombre: "Rotom Lavado", etiqueta: "Lavado", tipos: ["electric", "water"], sd: "rotom-wash", pr: "479-wash", ebdx: "ROTOM_2.png", objeto: "rotom-catalog" },
    10010: { base: 479, nombre: "Rotom Frío", etiqueta: "Frío", tipos: ["electric", "ice"], sd: "rotom-frost", pr: "479-frost", ebdx: "ROTOM_3.png", objeto: "rotom-catalog" },
    10011: { base: 479, nombre: "Rotom Ventilador", etiqueta: "Ventilador", tipos: ["electric", "flying"], sd: "rotom-fan", pr: "479-fan", ebdx: "ROTOM_4.png", objeto: "rotom-catalog" },
    10012: { base: 479, nombre: "Rotom Corte", etiqueta: "Corte", tipos: ["electric", "grass"], sd: "rotom-mow", pr: "479-mow", ebdx: "ROTOM_5.png", objeto: "rotom-catalog" },
    10007: { base: 487, etiqueta: "Forma Origen", tipos: ["ghost", "dragon"], sd: "giratina-origin", pr: "487-origin", ebdx: "GIRATINA_1.png", objeto: "griseous-orb" },
    10006: { base: 492, etiqueta: "Forma Cielo", tipos: ["grass", "flying"], sd: "shaymin-sky", pr: "492-sky", ebdx: "SHAYMIN_1.png", objeto: "gracidea" },
    10019: { base: 641, etiqueta: "Forma Tótem", tipos: ["flying"], sd: "tornadus-therian", pr: "641-therian", ebdx: "TORNADUS_1.png", objeto: "reveal-glass" },
    10020: { base: 642, etiqueta: "Forma Tótem", tipos: ["electric", "flying"], sd: "thundurus-therian", pr: "642-therian", ebdx: "THUNDURUS_1.png", objeto: "reveal-glass" },
    10021: { base: 645, etiqueta: "Forma Tótem", tipos: ["ground", "flying"], sd: "landorus-therian", pr: "645-therian", ebdx: "LANDORUS_1.png", objeto: "reveal-glass" },
    10249: { base: 905, etiqueta: "Forma Tótem", tipos: ["fairy", "flying"], sd: "enamorus-therian", pr: "905-therian", ebdx: "ENAMORUS_1.PNG", objeto: "reveal-glass" },
    10001: { base: 386, etiqueta: "Forma Ataque", tipos: ["psychic"], sd: "deoxys-attack", pr: "386-attack", ebdx: "DEOXYS_1.png", objeto: "meteorite" },
    10002: { base: 386, etiqueta: "Forma Defensa", tipos: ["psychic"], sd: "deoxys-defense", pr: "386-defense", ebdx: "DEOXYS_2.png", objeto: "meteorite" },
    10003: { base: 386, etiqueta: "Forma Velocidad", tipos: ["psychic"], sd: "deoxys-speed", pr: "386-speed", ebdx: "DEOXYS_3.png", objeto: "meteorite" },
    10086: { base: 720, nombre: "Hoopa Desatado", etiqueta: "Desatado", tipos: ["psychic", "dark"], sd: "hoopa-unbound", pr: "720-unbound", ebdx: "HOOPA_1.png", objeto: "prison-bottle" },
    10123: { base: 741, etiqueta: "Estilo Animado", tipos: ["electric", "flying"], sd: "oricorio-pompom", pr: "741-pompom", ebdx: "ORICORIO_1.png", objeto: "yellow-nectar" },
    10124: { base: 741, etiqueta: "Estilo Plácido", tipos: ["psychic", "flying"], sd: "oricorio-pau", pr: "741-pau", ebdx: "ORICORIO_2.png", objeto: "pink-nectar" },
    10125: { base: 741, etiqueta: "Estilo Refinado", tipos: ["ghost", "flying"], sd: "oricorio-sensu", pr: "741-sensu", ebdx: "ORICORIO_3.png", objeto: "purple-nectar" },
    // Fusiones (con su objeto y el otro Pokémon, que se queda dentro hasta que se separan: mochila.js)
    10023: { base: 646, nombre: "Kyurem Blanco", etiqueta: "Blanco", tipos: ["dragon", "ice"], sd: "kyurem-white", pr: "646-white", ebdx: "KYUREM_1.png", objeto: "dna-splicers" },
    10022: { base: 646, nombre: "Kyurem Negro", etiqueta: "Negro", tipos: ["dragon", "ice"], sd: "kyurem-black", pr: "646-black", ebdx: "KYUREM_2.png", objeto: "dna-splicers" },
    10155: { base: 800, nombre: "Necrozma Melena Crepuscular", etiqueta: "Melena Crepuscular", tipos: ["psychic", "steel"], sd: "necrozma-duskmane", pr: "800-dusk-mane", ebdx: "NECROZMA_1.png", objeto: "n-solarizer" },
    10156: { base: 800, nombre: "Necrozma Alas del Alba", etiqueta: "Alas del Alba", tipos: ["psychic", "ghost"], sd: "necrozma-dawnwings", pr: "800-dawn-wings", ebdx: "NECROZMA_2.png", objeto: "n-lunarizer" },
    10193: { base: 898, nombre: "Calyrex Jinete Glacial", etiqueta: "Jinete Glacial", tipos: ["psychic", "ice"], sd: "calyrex-ice", pr: "898-ice", ebdx: "CALYREX_1.png", objeto: "reins-of-unity" },
    10194: { base: 898, nombre: "Calyrex Jinete Espectral", etiqueta: "Jinete Espectral", tipos: ["psychic", "ghost"], sd: "calyrex-shadow", pr: "898-shadow", ebdx: "CALYREX_2.png", objeto: "reins-of-unity" },
    // Hembras con forma propia (otras habilidades y movimientos): la especie de siempre es el macho.
    10025: { base: 678, etiqueta: "Hembra", genero: "f", tipos: ["psychic"], sd: "meowstic-f", pr: "678-female", ebdx: "MEOWSTIC_1.png" },
    10186: { base: 876, etiqueta: "Hembra", genero: "f", tipos: ["psychic", "normal"], sd: "indeedee-f", pr: "876-female", ebdx: "INDEEDEE_1.png" },
    10248: { base: 902, etiqueta: "Hembra", genero: "f", tipos: ["water", "ghost"], sd: "basculegion-f", pr: "902-female", ebdx: "BASCULEGION_1.png" },
    10254: { base: 916, etiqueta: "Hembra", genero: "f", tipos: ["normal"], sd: "oinkologne-f", pr: "916-female", ebdx: "OINKOLOGNE_1.png" },
    10126: { base: 745, etiqueta: "Forma Nocturna", tipos: ["rock"], sd: "lycanroc-midnight", pr: "745-midnight", ebdx: "LYCANROC_1.png" },
    10152: { base: 745, etiqueta: "Forma Crepuscular", tipos: ["rock"], sd: "lycanroc-dusk", pr: "745-dusk", ebdx: "LYCANROC_2.png" },
};
Object.assign(FORMAS_REGIONALES, FORMAS_ALT);
// Lycanroc: de noche, su forma nocturna; al atardecer, la crepuscular (al evolucionar y en la naturaleza).
const FORMA_POR_HORA = { 745: { noche: 10126, tarde: 10152 } };
// Meowstic, Indeedee, Basculegion y Oinkologne: la hembra es su forma (al evolucionar, según el sexo; en la naturaleza, la mitad).
const FORMA_HEMBRA = {};
Object.entries(FORMAS_ALT).forEach(([k, f]) => { if (f.genero === "f") FORMA_HEMBRA[f.base] = Number(k); });
const formaPorGenero = (id, genero) => (genero === "f" && FORMA_HEMBRA[id]) || id;
const formaPorHora = (id) => (FORMA_POR_HORA[id] && typeof claseHora === "function" && FORMA_POR_HORA[id][claseHora()]) || id;
const esFormaRegional = (id) => !!FORMAS_REGIONALES[id];
const idBase = (id) => (FORMAS_REGIONALES[id] ? FORMAS_REGIONALES[id].base : id);
const _formasDe = {};
Object.keys(FORMAS_REGIONALES).forEach((k) => { const b = FORMAS_REGIONALES[k].base; (_formasDe[b] = _formasDe[b] || []).push(Number(k)); });
const formasDe = (base) => _formasDe[base] || [];
// «Vulpix de Alola», «Rotom Calor» o, si la forma no cambia el nombre, el de su especie (la raza de los Tauros de Paldea y
// las formas como «Forma Origen» van aparte, en etiquetaForma).
const nombreForma = (id) => { const f = FORMAS_REGIONALES[id], b = nombreBonito(NOMBRE_POR_ID[f.base] || ""); return f.nombre || (f.region ? `${b} de ${REGION_FORMA[f.region]}` : b); };
const etiquetaForma = (id) => { const f = FORMAS_REGIONALES[id]; return f.region ? `De ${REGION_FORMA[f.region]}${f.raza ? " · " + f.raza : ""}` : f.etiqueta; };
// Nombre de cualquier Pokémon por su número (especie o forma regional).
const nombreEspecie = (id, siNo = "") => (FORMAS_REGIONALES[id] ? nombreForma(id) : nombreBonito(NOMBRE_POR_ID[id] || siNo));
// Evoluciones de las formas regionales: al nivel (de noche, si lo pide) o con un objeto, a su forma regional o a su especie propia
// (si tiene varias, en una lista).
const EVO_REGIONAL = {
    10091: { a: 10092, nivel: 20, noche: true },
    10101: { a: 10102, objeto: "ice-stone" },
    10103: { a: 10104, objeto: "ice-stone" },
    10105: { a: 10106, nivel: 26 },
    10107: { a: 10108, nivel: 28 },
    10109: { a: 10110, nivel: 25 },
    10110: { a: 10111, nivel: 36 },
    10112: { a: 10113, nivel: 38 },
    10161: { a: 863, nivel: 28 },
    10162: { a: 10163, nivel: 40 },
    10164: [{ a: 10165, nivel: 37 }, { a: 10172, objeto: "kings-rock" }],   // (Slowbro de Galar o, con la Roca del Rey, Slowking de Galar)
    10166: { a: 865, nivel: 35 },
    10168: { a: 866, nivel: 42 },
    10173: { a: 864, nivel: 38 },
    10174: { a: 10175, nivel: 20 },
    10175: { a: 862, nivel: 35, noche: true },
    10176: { a: 10177, objeto: "ice-stone" },
    10179: { a: 867, nivel: 34 },
    10229: { a: 10230, objeto: "fire-stone" },
    10231: { a: 10232, objeto: "leaf-stone" },
    10234: { a: 904, nivel: 35 },
    10235: { a: 903, objeto: "razor-claw" },
    10238: { a: 10239, nivel: 30 },
    10241: { a: 10242, nivel: 50 },
    10253: { a: 980, nivel: 20 },
};
// Especies que solo se consiguen desde una forma regional (Perrserker, Sirfetch'd, Clodsire…): su especie de siempre no evoluciona en ellas.
Object.keys(EVO_REGIONAL).forEach((k) => { if (!Array.isArray(EVO_REGIONAL[k])) EVO_REGIONAL[k] = [EVO_REGIONAL[k]]; });   // (siempre una lista)
const SOLO_DE_FORMA = new Set(Object.values(EVO_REGIONAL).flat().map((e) => e.a).filter((a) => !FORMAS_REGIONALES[a]));
// Con la semilla de un sitio (Safari, pesca, vendedor…): a veces, la forma regional en vez de la especie (y siempre la misma).
function formaSorteada(id, rnd, prob = 0.3, libre = () => true) {
    const l = formasDe(id).filter((f) => FORMAS_REGIONALES[f].region && libre(f));
    return l.length && rnd() < prob ? l[Math.floor(rnd() * l.length)] : id;
}
// A veces, en vez de un Pokémon de siempre, sale una de sus formas regionales: más a menudo si es de los tipos del sitio
// (tipos) y, si se piden solo esos (soloTipos, para los entrenadores), nunca de otros. Los legendarios, solo si se dice.
function quizaRegional(id, { prob = 0.12, tipos = null, soloTipos = false, legendarios = false } = {}) {
    if (formaPorHora(id) !== id) return formaPorHora(id);
    if (FORMA_HEMBRA[id] && Math.random() < 0.5) return FORMA_HEMBRA[id];
    let l = formasDe(id).filter((f) => FORMAS_REGIONALES[f].region);
    if (!l.length || (!legendarios && typeof esLegendario === "function" && esLegendario(id))) return id;
    const encaja = (f) => tipos && FORMAS_REGIONALES[f].tipos.some((t) => tipos.includes(t));
    if (soloTipos) l = l.filter(encaja);
    if (!l.length) return id;
    const f = l[Math.floor(Math.random() * l.length)];
    return Math.random() < (encaja(f) ? prob * 2.5 : prob) ? f : id;
}
