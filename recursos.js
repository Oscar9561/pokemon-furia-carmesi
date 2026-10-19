/* =========================================================
   RECURSOS REALES (nada se dibuja ni se sintetiza aquí)
   - PokéRogue (fangame, pagefaultgames/pokerogue-assets): animaciones y sonidos
     de TODOS los movimientos, música (gimnasios, rivales, villanos, legendarios),
     efectos de sonido, entrenadores animados y sprites 2D animados Gen 6-9.
   - Pokémon Showdown: sprites 2D animados estilo Blanco/Negro, fondos de combate.
   - PokéAPI: datos, gritos, sprites B/N animados (Gen 1-5), objetos y medallas.
   - Pokémon Essentials (EBDX Renovation) y Ghasty001: sprites 2D animados de frente
     y de espalda de todas las especies y megas.
   ========================================================= */

const PR_BASE = "https://raw.githubusercontent.com/pagefaultgames/pokerogue-assets/beta/";
const prURL = (ruta) => PR_BASE + ruta.split("/").map(encodeURIComponent).join("/");
const SD_BASE = "https://play.pokemonshowdown.com/";
const RAIZ = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon";
const BW = `${RAIZ}/versions/generation-v/black-white/animated`;

// ---------- Disponibilidad de sprites animados (extraída de los repositorios) ----------
const EXP_FRENTE = "659-665,673,675-676,679-685,695-697,699,702,704-706,709-713,715,717,720-738,741-745,747-752,755-757,759-763,765-766,771-776,779,785-800,802-806,808-842,845-869,872-889,891-901,903-904,906-924,926-930,933-934,938-950,953-963,965-968,971-975,977,980-984,986,989-991,993-995,999-1006";
const EXP_ESPALDA = "659-665,673,675-676,679-685,695-697,699,702,704-706,709-713,715,717,720-738,741-745,747-752,755-757,759-763,765-766,771-776,779,785-800,802-806,808-842,845-869,872-901,903-904,906-924,926-930,933-934,938-950,953-963,965-967,971-975,980-984,986,989-990,993-995,999-1006";
const EXP_SHINY = EXP_FRENTE;
const EXP_SHINY_ESPALDA = EXP_ESPALDA;
const SD_ANI_FRENTE = "651-654,656,658,661-672,674-675,679,681-682,684-688,691-694,696-698,700,702-709,712-722,725,727-740,742-746,748-756,759-762,764,767,769-787,789-798,800-802,804-811,813-814,816-818,821-823,830-835,837,839-840,843-849,852,856,858-859,861-864,866-878,880,882-890,895-896,898-899,901-902,904,924-925,932,938,969,978,980,984,987,992,994-997,999-1004,1006,1008,1019-1020,1024";
const SD_ANI_ESPALDA = "651-654,656,661-668,671-672,674-675,679,681-682,684,687-688,692-694,696-698,700,702-705,707-709,712-714,718-719,722,725,727-740,742-746,748-756,760-762,764,767,769-778,780-787,789-792,795-798,800-801,804,806-807,811,814,816-818,822-823,830-835,837,839-840,843-844,846,848-849,852,856,859,861-864,866,869,871-878,882-890,895-896,898,902,904";
function conjuntoRangos(txt) {
    const s = new Set();
    txt.split(",").forEach((p) => {
        const [a, b] = p.split("-").map(Number);
        for (let i = a; i <= (b || a); i++) s.add(i);
    });
    return s;
}
const SET_EXP = { f: conjuntoRangos(EXP_FRENTE), b: conjuntoRangos(EXP_ESPALDA), s: conjuntoRangos(EXP_SHINY), sb: conjuntoRangos(EXP_SHINY_ESPALDA) };
const SET_SD_ANI = { f: conjuntoRangos(SD_ANI_FRENTE), b: conjuntoRangos(SD_ANI_ESPALDA) };

// Especies cuyo sprite por defecto en PokéRogue lleva sufijo de forma.
const SPRITE_FORMA = {
    201: "201-a", 412: "412-plant", 413: "413-plant", 421: "421-overcast", 422: "422-west", 423: "423-west",
    487: "487-altered", 492: "492-land", 493: "493-normal", 550: "550-red-striped", 585: "585-spring", 586: "586-spring",
    641: "641-incarnate", 642: "642-incarnate", 645: "645-incarnate", 647: "647-ordinary", 648: "648-aria",
    666: "666-meadow", 669: "669-red", 670: "670-red", 671: "671-red", 716: "716-neutral", 778: "778-disguised",
    905: "905-incarnate", 925: "925-four", 931: "931-green-plumage", 964: "964-zero", 978: "978-curly",
    1007: "1007-apex-build", 1008: "1008-ultimate-mode", 1012: "1012-counterfeit", 1013: "1013-unremarkable", 1017: "1017-teal-mask",
};
const clavePR = (id) => SPRITE_FORMA[id] || String(id);
// Nombre de archivo en Showdown: el de la especie sin símbolos (PokéAPI nombra algunas por su forma: «aegislash-shield»…).
const SD_ESPECIE = {
    386: "deoxys", 413: "wormadam", 487: "giratina", 492: "shaymin", 550: "basculin", 555: "darmanitan", 592: "frillish", 593: "jellicent",
    641: "tornadus", 642: "thundurus", 645: "landorus", 647: "keldeo", 648: "meloetta", 668: "pyroar", 678: "meowstic", 681: "aegislash",
    710: "pumpkaboo", 711: "gourgeist", 718: "zygarde", 741: "oricorio", 745: "lycanroc", 746: "wishiwashi", 774: "minior", 778: "mimikyu",
    849: "toxtricity", 875: "eiscue", 876: "indeedee", 877: "morpeko", 892: "urshifu", 902: "basculegion", 905: "enamorus", 916: "oinkologne",
    925: "maushold", 931: "squawkabilly", 964: "palafin", 978: "tatsugiri", 982: "dudunsparce",
};
const nombreShowdown = (id) => String(SD_ESPECIE[id] || (typeof NOMBRE_POR_ID !== "undefined" && NOMBRE_POR_ID[id]) || "").replace(/[^a-z0-9]/g, "");
// Showdown no tiene su versión variocolor animada.
const SD_SIN_SHINY = { f: new Set([652, 715, 870]), b: new Set([652]) };
// Sprites animados al estilo de Blanco/Negro de Ghasty001 (github.com/Ghasty001/Animated_sprites_by_Ghasty001, libres citando al autor):
// completan especies de 6.ª-9.ª gen. y megas que no tienen animación ni en Showdown ni en PokéRogue.
const GH_BASE = "https://raw.githubusercontent.com/Ghasty001/Animated_sprites_by_Ghasty001/main/";
const GH_CARPETA = { f: "FRONT", b: "BACK", s: "FRONT_SHINY", sb: "BACK_SHINY" };
const GH_ESPECIES = (() => {
    const comunes = { 690: "SKRELP", 691: "DRAGALGE", 692: "CLAUNCHER", 693: "CLAWITZER", 695: "HELIOLISK", 709: "TREVENANT", 741: "ORICORIO",
        768: "GOLISOPOD", 825: "DOTTLER", 826: "ORBEETLE", 829: "Gossifleur", 841: "FLAPPLE", 842: "APPLETUN", 885: "DREEPY", 886: "DRAKLOAK",
        887: "DRAGAPULT", 903: "SNEASLER", 909: "FUECOCO", 910: "CROCALOR", 911: "SKELEDIRGE", 926: "FIDOUGH", 927: "DACHSBUN", 928: "SMOLIV",
        929: "DOLLIV", 930: "ARBOLIVA", 933: "NACLSTACK", 934: "GARGANACL", 936: "ARMAROUGE", 937: "CERULEDGE", 979: "ANNIHILAPE", 983: "KINGAMBIT" };
    // extra: { id: archivo } propios de cada carpeta (los nombres no siempre siguen la misma regla).
    const con = (extra) => {
        const m = {};
        Object.entries(comunes).forEach(([id, n]) => { m[id] = n + ".gif"; });
        return Object.assign(m, extra);
    };
    const traseros = { 899: "WYRDEER.gif", 917: "TAROUNTULA.gif", 918: "SPIDOPS.gif", 932: "NACLI.gif", 980: "CLODSIRE.gif", 1000: "GHOLDENGO.gif" };
    return {
        f: con({ 944: "SHROODLE.gif", 945: "GRAFAIAI.gif", 946: "BRAMBLIN.gif", 947: "BRAMBLEGHAST.gif" }),
        s: con({ 917: "TAROUNTULA.gif", 918: "SPIDOPS.gif", 944: "SHROODLE.gif", 945: "GRAFAIAI.gif", 937: "CERULEDGE shiny.gif", 946: "BRAMBLIN shiny.gif", 947: "BRAMBLEGHAST shiny.gif" }),
        b: con(Object.assign({ 946: "BRAMBLIN back.gif", 947: "BRAMBLEGHAST back.gif" }, traseros)),
        sb: con(Object.assign({ 946: "BRAMBLIN back shiny.gif", 947: "BRAMBLEGHAST back shiny.gif" }, traseros)),
    };
})();
const GH_MEGAS = {
    f: { "absol-mega": "ABSOL_Mega.gif", "altaria-mega": "ALTARIA_Mega.gif", "ampharos-mega": "AMPHAROS_Mega.gif" },
    s: { "absol-mega": "ABSOL_Mega.gif", "altaria-mega": "ALTARIA_Mega.gif", "ampharos-mega": "AMPHAROS_Mega.gif" },
    b: { "absol-mega": "ABSOL_Mega.gif", "altaria-mega": "ALTARIA_Mega.gif", "ampharos-mega": "AMPHAROS_Mega.gif", "beedrill-mega": "BEEDRILL_Mega.gif" },
    sb: { "absol-mega": "ABSOL_Mega.gif", "altaria-mega": "ALTARIA_mega.gif", "ampharos-mega": "AMPHAROS_Mega.gif", "beedrill-mega": "BEEDRILL_Mega.gif" },
};
const urlGhasty = (v, archivo) => GH_BASE + GH_CARPETA[v] + "/" + encodeURIComponent(archivo);
// Tiras animadas de Pokémon Essentials, del proyecto «Open-Source EBDX Renovation» (github.com/ChromeValiant/
// Pokemon-Essentials-21-With-Unofficial-EBDX): sprites 2D al estilo de Blanco/Negro, de frente y de espalda (y variocolor),
// de TODAS las especies (1.ª-9.ª gen.) y de todas las megas. Autores: Smogon Sprite Project, «Sprites Animados» de La Base
// de Sky, Ghasty001 y más (ver sus créditos). Fijado a un commit para que los enlaces no cambien.
const EBDX_BASE = "https://raw.githubusercontent.com/ChromeValiant/Pokemon-Essentials-21-With-Unofficial-EBDX/0f70800ce050d374545054addc7f74190bc0bf4e/Graphics/Pokemon/";
// Deluxe Battle Kit de Pokémon Essentials (Lucidious89, adaptado por La Base de Sky): gráficos y sonido de las cinemáticas.
const DBK_BASE = "https://raw.githubusercontent.com/La-Base-De-Sky-Plugins/Deluxe-Battle-Kit-Enhanced-Battle-UI/b586fef7cc8830a31a8c4d431817343aee1cdcda/";
const dbkURL = (ruta) => DBK_BASE + ruta.split("/").map(encodeURIComponent).join("/");
const nombreEBDX = (id) => ({ 29: "NIDORANfE", 32: "NIDORANmA" }[id] || nombreShowdown(id).toUpperCase());
const urlEBDX = (nombre, espalda, shiny, base = EBDX_BASE) => base + encodeURIComponent((espalda ? "Back" : "Front") + (shiny ? " shiny" : "")) + "/" + nombre + ".png";
// Las megas de Leyendas Z-A y Megadimensión, animadas en 2D: llegaron al mismo proyecto más tarde (fijado a un commit posterior).
const EBDX_BASE_ZA = "https://raw.githubusercontent.com/ChromeValiant/Pokemon-Essentials-21-With-Unofficial-EBDX/4856b53624013293ba7c9ff0bc8dec08fe8956ef/Graphics/Pokemon/";
const EBDX_MEGA_ZA = {
    "clefable-mega": "CLEFABLE_1", "victreebel-mega": "VICTREEBEL_1", "starmie-mega": "STARMIE_1", "dragonite-mega": "DRAGONITE_1", "meganium-mega": "MEGANIUM_1",
    "feraligatr-mega": "FERALIGATR_1", "skarmory-mega": "SKARMORY_1", "froslass-mega": "FROSLASS_1", "emboar-mega": "EMBOAR_1", "excadrill-mega": "EXCADRILL_1",
    "scolipede-mega": "SCOLIPEDE_1", "scrafty-mega": "SCRAFTY_1", "eelektross-mega": "EELEKTROSS_1", "chandelure-mega": "CHANDELURE_1", "chesnaught-mega": "CHESNAUGHT_1",
    "delphox-mega": "DELPHOX_1", "greninja-mega": "GRENINJA_3", "pyroar-mega": "PYROAR_1", "floette-mega": "FLOETTE_6", "malamar-mega": "MALAMAR_1",
    "barbaracle-mega": "BARBARACLE_1", "dragalge-mega": "DRAGALGE_1", "hawlucha-mega": "HAWLUCHA_1", "zygarde-mega": "ZYGARDE_4", "drampa-mega": "DRAMPA_1",
    "falinks-mega": "FALINKS_1", "raichu-megax": "RAICHU_2", "raichu-megay": "RAICHU_3", "chimecho-mega": "CHIMECHO_1", "absol-megaz": "ABSOL_2",
    "staraptor-mega": "STARAPTOR_1", "garchomp-megaz": "GARCHOMP_2", "lucario-megaz": "LUCARIO_2", "heatran-mega": "HEATRAN_1", "darkrai-mega": "DARKRAI_1",
    "golurk-mega": "GOLURK_1", "meowstic-mmega": "MEOWSTIC_2", "crabominable-mega": "CRABOMINABLE_1", "golisopod-mega": "GOLISOPOD_1", "magearna-mega": "MAGEARNA_2",
    "zeraora-mega": "ZERAORA_1", "scovillain-mega": "SCOVILLAIN_1", "glimmora-mega": "GLIMMORA_1", "tatsugiri-curlymega": "TATSUGIRI_3", "baxcalibur-mega": "BAXCALIBUR_1",
};
// Cada mega, con su nombre de archivo en Essentials (especie_forma).
const EBDX_MEGA = {
    "venusaur-mega": "VENUSAUR_1", "charizard-megax": "CHARIZARD_1", "charizard-megay": "CHARIZARD_2", "blastoise-mega": "BLASTOISE_1",
    "beedrill-mega": "BEEDRILL_1", "pidgeot-mega": "PIDGEOT_1", "alakazam-mega": "ALAKAZAM_1", "slowbro-mega": "SLOWBRO_2", "gengar-mega": "GENGAR_1",
    "kangaskhan-mega": "KANGASKHAN_1", "pinsir-mega": "PINSIR_1", "gyarados-mega": "GYARADOS_1", "aerodactyl-mega": "AERODACTYL_1",
    "mewtwo-megax": "MEWTWO_1", "mewtwo-megay": "MEWTWO_2", "ampharos-mega": "AMPHAROS_1", "steelix-mega": "STEELIX_1", "scizor-mega": "SCIZOR_1",
    "heracross-mega": "HERACROSS_1", "houndoom-mega": "HOUNDOOM_1", "tyranitar-mega": "TYRANITAR_1", "sceptile-mega": "SCEPTILE_1",
    "blaziken-mega": "BLAZIKEN_1", "swampert-mega": "SWAMPERT_1", "gardevoir-mega": "GARDEVOIR_1", "sableye-mega": "SABLEYE_1", "mawile-mega": "MAWILE_1",
    "aggron-mega": "AGGRON_1", "medicham-mega": "MEDICHAM_1", "manectric-mega": "MANECTRIC_1", "sharpedo-mega": "SHARPEDO_1", "camerupt-mega": "CAMERUPT_1",
    "altaria-mega": "ALTARIA_1", "banette-mega": "BANETTE_1", "absol-mega": "ABSOL_1", "glalie-mega": "GLALIE_1", "salamence-mega": "SALAMENCE_1",
    "metagross-mega": "METAGROSS_1", "latias-mega": "LATIAS_1", "latios-mega": "LATIOS_1", "lopunny-mega": "LOPUNNY_1", "garchomp-mega": "GARCHOMP_1",
    "lucario-mega": "LUCARIO_1", "abomasnow-mega": "ABOMASNOW_1", "gallade-mega": "GALLADE_1", "audino-mega": "AUDINO_1", "diancie-mega": "DIANCIE_1",
    "rayquaza-mega": "RAYQUAZA_1",
};

// Candidatos de sprite 2D por orden de preferencia (animados primero; nunca 3D).
function candidatosSprite(id, espalda, shiny) {
    const c = [], sd = nombreShowdown(id);
    const dir = (espalda ? "/back" : "") + (shiny ? "/shiny" : "");
    if (id <= 649) c.push({ tipo: "img", url: `${BW}${dir}/${id}.gif` });
    if (sd && id > 649 && (espalda ? SET_SD_ANI.b : SET_SD_ANI.f).has(id) && !(shiny && SD_SIN_SHINY[espalda ? "b" : "f"].has(id)))
        c.push({ tipo: "img", url: `${SD_BASE}sprites/gen5ani${espalda ? "-back" : ""}${shiny ? "-shiny" : ""}/${sd}.gif` });
    const k = (shiny ? "s" : "") + (espalda ? "b" : "") || "f";
    const prDir = (espalda ? "back/" : "") + (shiny ? "shiny/" : "");
    if (SET_EXP[k] && SET_EXP[k].has(id)) c.push({ tipo: "atlas", url: prURL(`images/pokemon/exp/${prDir}${clavePR(id)}`) });
    const v = (shiny ? "s" : "") + (espalda ? "b" : "") || "f";
    if (id > 649 && GH_ESPECIES[v][id]) c.push({ tipo: "img", url: urlGhasty(v, GH_ESPECIES[v][id]) });
    c.push({ tipo: "tira", url: urlEBDX(nombreEBDX(id), espalda, shiny) });   // las hay de todas: así casi nunca hace falta el 3D
    if (id > 649) c.push({ tipo: "atlas", url: prURL(`images/pokemon/${prDir}${clavePR(id)}`) });
    if (sd && ani3D()) c.push({ tipo: "img", url: `${SD_BASE}sprites/ani${espalda ? "-back" : ""}${shiny ? "-shiny" : ""}/${sd}.gif`, animado: true, escala: ESCALA_3D });
    if (sd) c.push({ tipo: "img", url: `${SD_BASE}sprites/gen5${espalda ? "-back" : ""}${shiny ? "-shiny" : ""}/${sd}.png` });
    c.push({ tipo: "img", url: `${RAIZ}${dir}/${id}.png` });
    if (shiny) return c.concat(sinPreferencia(candidatosSprite(id, espalda, false)));
    return c;
}
// Sprite 2D fijo al estilo de Blanco/Negro (96×96): el de los juegos hasta la 5.ª gen. y, después, el del proyecto de Smogon (Showdown).
// Para las listas (Pokédex, duelo, memoria…), en vez de las ilustraciones en alta resolución, que desentonan con el pixel art.
const urlSprite2D = (id, shiny = false) => (id <= 649 ? `${RAIZ}/versions/generation-v/black-white${shiny ? "/shiny" : ""}/${id}.png`
    : `${SD_BASE}sprites/gen5${shiny ? "-shiny" : ""}/${nombreShowdown(id)}.png`);
// Si un Pokémon no tiene animación 2D en ninguna parte, se usa su animación oficial en 3D (la de Showdown) en vez de dejarlo quieto.
// Sus imágenes son algo más grandes que las 2D: se reducen para que todos salgan del mismo tamaño.
const ani3D = () => typeof config === "undefined" || config.sprites3D !== false;
const ESCALA_3D = 0.82;
// Los candidatos de reserva (p. ej. los de color normal para un variocolor) no pasan por delante de uno fijo.
const sinPreferencia = (lista) => lista.map((x) => Object.assign({}, x, { animado: false }));
// ---------- Megaevoluciones ----------
// Animadas en 2D: las de PokéRogue (exp), las del proyecto de sprites de Showdown y las de Ghasty001; si no hay, su sprite de PokéRogue.
const MEGA_ANI_PR = new Set(["115-mega", "181-mega", "384-mega", "719-mega"]);
const MEGA_ANI_SD = {
    f: new Set(["charizard-megax", "beedrill-mega", "alakazam-mega", "mewtwo-megax", "mewtwo-megay", "ampharos-mega", "steelix-mega", "scizor-mega",
        "tyranitar-mega", "blaziken-mega", "gardevoir-mega", "mawile-mega", "medicham-mega", "manectric-mega", "banette-mega", "absol-mega",
        "glalie-mega", "salamence-mega", "latias-mega", "latios-mega", "garchomp-mega", "lucario-mega", "abomasnow-mega"]),
    b: new Set(["ampharos-mega", "scizor-mega", "tyranitar-mega", "gardevoir-mega", "mawile-mega", "absol-mega", "glalie-mega", "garchomp-mega",
        "lucario-mega", "abomasnow-mega", "mewtwo-megay"]),
};
const MEGA_SD_ARCHIVO_ESPALDA = { "mewtwo-megay": "mewtwo-mega-y" };   // en Showdown, su espalda se llama distinto
// Clave de PokéRogue de una mega («charizard-megax» → «6-mega-x»).
const megaClavePR = (m) => m.pr || `${m.base}-mega${/megax$/.test(m.sprite) ? "-x" : /megay$/.test(m.sprite) ? "-y" : ""}`;
const infoMega = (m) => (typeof m === "string" ? Object.values(MEGAS).concat([MEGA_RAYQUAZA]).find((x) => x.sprite === m) : m);
function candidatosMega(m, espalda, shiny) {
    const info = infoMega(m); if (!info) return [];
    const k = megaClavePR(info), s = info.sprite, c = [];
    const prDir = (espalda ? "back/" : "") + (shiny ? "shiny/" : "");
    if (MEGA_ANI_PR.has(k)) c.push({ tipo: "atlas", url: prURL(`images/pokemon/exp/${prDir}${k}`) });
    if (MEGA_ANI_SD[espalda ? "b" : "f"].has(s))
        c.push({ tipo: "img", url: `${SD_BASE}sprites/gen5ani${espalda ? "-back" : ""}${shiny ? "-shiny" : ""}/${(espalda && MEGA_SD_ARCHIVO_ESPALDA[s]) || s}.gif` });
    const v = (shiny ? "s" : "") + (espalda ? "b" : "") || "f";
    if (GH_MEGAS[v][s]) c.push({ tipo: "img", url: urlGhasty(v, GH_MEGAS[v][s]) });
    if (EBDX_MEGA[s]) c.push({ tipo: "tira", url: urlEBDX(EBDX_MEGA[s], espalda, shiny) });   // 2D animada de frente y de espalda
    if (EBDX_MEGA_ZA[s]) c.push({ tipo: "tira", url: urlEBDX(EBDX_MEGA_ZA[s], espalda, shiny, EBDX_BASE_ZA) });
    // Sin animación 2D de la mega: su animación oficial (3D), con su aspecto de mega de verdad.
    // (las de Z-A dicen si Showdown tiene su animación 3D y su sprite: así no se piden en balde)
    if (ani3D() && info.ani !== false) c.push({ tipo: "img", url: `${SD_BASE}sprites/ani${espalda ? "-back" : ""}${shiny ? "-shiny" : ""}/${s}.gif`, escala: ESCALA_3D });
    c.push({ tipo: "atlas", url: prURL(`images/pokemon/${prDir}${k}`) });
    if (info.gen5 !== false) c.push({ tipo: "img", url: `${SD_BASE}sprites/gen5${espalda ? "-back" : ""}${shiny ? "-shiny" : ""}/${s}.png` });
    return shiny ? c.concat(sinPreferencia(candidatosMega(info, espalda, false))) : c;
}
// Grito de la megaevolución (PokéRogue tiene los de todas las megas).
const urlGritoMega = (m) => prURL(`audio/cry/${megaClavePR(infoMega(m))}.m4a`);

// ---------- Entrenadores (atlas animados de PokéRogue) ----------
const urlEntrenadorPR = (clave) => prURL("images/trainer/" + clave);   // + ".json" / ".png"

// ---------- Medallas de gimnasio (PokéAPI) ----------
const urlMedalla = (n) => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/badges/${n}.png`;

// ---------- Música (PokéRogue / Showdown) ----------
const mus = (nombre) => prURL("audio/bgm/" + nombre + ".mp3");
const musSD = (nombre) => `${SD_BASE}audio/${nombre}.mp3`;
// Icono de los logros: el Honor de Kalos (pokesprite).
const ICONO_LOGROS = "https://raw.githubusercontent.com/msikma/pokesprite/master/items/key-item/honor-of-kalos.png";
const MUSICA = {
    salvaje: mus("battle_wild"),
    salvajeFuerte: mus("battle_wild_strong"),
    entrenador: mus("battle_trainer"),
    rival: [mus("battle_rival"), mus("battle_rival_2"), mus("battle_rival_3")],
    altoMando: mus("battle_bb_elite"),
    campeon: mus("battle_champion_iris"),
    victoriaEntrenador: mus("bw/victory_trainer"),
    victoriaGimnasio: mus("bw/victory_gym"),
    victoriaCampeon: mus("bw/victory_champion"),
    victoriaVillano: mus("bw/victory_team_plasma"),
    captura: mus("bw/minor_fanfare"),
    evolucion: mus("bw/evolution"),
    evolucionFanfarria: mus("bw/evolution_fanfare"),
    curar: mus("bw/heal"),
    region: mus("town"),
    hierba: mus("tall_grass"),
    gimnasio: mus("dojo"),
    liga: mus("end_summit"),
    inicio: mus("title"),
    // Temas de combate contra entrenadores de varias generaciones (PokéRogue y Showdown): cada combate, uno.
    entrenadores: [mus("battle_trainer"), musSD("bw-trainer"), musSD("bw-subway-trainer"), musSD("dpp-trainer"), musSD("hgss-johto-trainer"),
        musSD("hgss-kanto-trainer"), musSD("oras-trainer"), musSD("xy-trainer"), musSD("sm-trainer"), musSD("colosseum-miror-b"), musSD("xd-miror-b")],
    // Temas de rival y de Campeón de todas las regiones (para el multijugador y los combates más duros).
    rivales: [mus("battle_rival"), mus("battle_rival_2"), mus("battle_rival_3"), musSD("bw-rival"), musSD("bw2-rival"), musSD("dpp-rival"),
        musSD("xy-rival"), musSD("oras-rival"), musSD("sm-rival")],
    campeones: ["battle_kanto_champion", "battle_johto_champion", "battle_hoenn_champion_g5", "battle_hoenn_champion_g6", "battle_sinnoh_champion",
        "battle_champion_alder", "battle_champion_iris", "battle_kalos_champion", "battle_alola_champion", "battle_champion_kukui",
        "battle_galar_champion", "battle_champion_geeta", "battle_champion_nemona", "battle_champion_kieran"].map(mus),
    // Cada pantalla con su tema: título, menú de combate, el GTS para el multijugador, los minijuegos y el laboratorio.
    vistas: { inicio: mus("title"), batalla: mus("menu"), multijugador: mus("mystery_encounter_gen_6_gts"), quiz: mus("mystery_encounter_fun_and_games"),
        duelo: mus("mystery_encounter_fun_and_games"), memoria: mus("mystery_encounter_fun_and_games"), pokedex: mus("laboratory") },
    // La música de la pantalla de aventura cambia a medida que avanzas.
    hub: [mus("town"), mus("plains"), mus("metropolis"), mus("meadow"), mus("end_summit")],
};
// Tema propio de cada legendario (PokéRogue).
const MUSICA_LEGENDARIO = (() => {
    const m = {};
    const poner = (ids, pista) => ids.forEach((id) => { m[id] = mus("battle_legendary_" + pista); });
    poner([144, 145, 146, 150], "kanto"); poner([151, 251, 385], "mew");
    poner([243], "raikou"); poner([244], "entei"); poner([245], "suicune"); poner([249], "lugia"); poner([250], "ho_oh");
    poner([377, 378, 379, 486], "regis_g5"); poner([894, 895], "regis_g6");
    poner([380, 381, 382, 383], "gro_kyo"); poner([384], "rayquaza"); poner([386], "deoxys");
    poner([480, 481, 482], "lake_trio"); poner([483, 484], "dia_pal"); poner([487], "giratina"); poner([493], "arceus");
    poner([485, 488, 489, 490, 491, 492], "sinnoh");
    poner([494, 638, 639, 640, 641, 642, 645, 647, 648, 649], "unova"); poner([643, 644], "res_zek"); poner([646], "kyurem");
    poner([716, 717, 718, 719, 720, 721], "xern_yvel");
    poner([785, 786, 787, 788, 772, 773, 801, 802, 807, 808, 809], "tapu"); poner([789, 790, 791, 792], "sol_lun"); poner([800], "ultra_nec");
    poner([793, 794, 795, 796, 797, 798, 799, 803, 804, 805, 806], "ub");
    poner([888, 889, 891, 892, 893], "zac_zam"); poner([890], "eternatus_p1"); poner([896, 897], "glas_spec"); poner([898], "calyrex");
    poner([905], "origin_forme"); poner([1001, 1002, 1003, 1004], "ruinous"); poner([1007, 1008, 984, 985, 986, 987, 988, 989, 990, 991, 992, 993, 994, 995, 1005, 1006, 1009, 1010, 1020, 1021, 1022, 1023], "kor_mir");
    poner([1014, 1015, 1016], "loyal_three"); poner([1017], "ogerpon"); poner([1024], "terapagos"); poner([1025], "pecharunt");
    return m;
})();
const musicaLegendario = (id) => MUSICA_LEGENDARIO[id] || mus("battle_legendary_kanto");
// Tema de un combate salvaje: el del legendario, el de los fuertes (4 niveles más que tu primer Pokémon) o el normal.
const musicaSalvaje = (id, nivel, nivelPrimero) => (esLegendario(id) ? musicaLegendario(id) : nivel >= nivelPrimero + 4 ? MUSICA.salvajeFuerte : MUSICA.salvaje);
// El tema del próximo combate contra un entrenador se sortea de antemano: así se precarga y suena al instante.
let temaEntrenadorSig = null;
function temaEntrenador(usar = false) {
    const t = temaEntrenadorSig || (temaEntrenadorSig = alAzar(MUSICA.entrenadores));
    if (usar) temaEntrenadorSig = null;
    return t;
}

// ---------- Efectos de sonido reales (PokéRogue) ----------
const urlSE = (nombre) => prURL("audio/se/" + nombre + ".wav");
const urlUI = (nombre) => prURL("audio/ui/" + nombre + ".wav");

// ---------- Fondos de combate reales (Showdown) ----------
// Los de Blanco/Negro (clave «meadow»…) y los de X/Y y Rubí Omega/Zafiro Alfa, con más detalle (clave «g6-…»).
const FONDOS_G6 = ["aquacordetown", "beach", "city", "dampcave", "darkbeach", "darkcity", "darkmeadow", "deepsea", "desert", "earthycave",
    "elite4drake", "forest", "icecave", "leaderwallace", "library", "meadow", "orasdesert", "orassea", "skypillar"];
const FONDOS = [
    "meadow", "route", "forest", "city", "mountain", "river", "beach", "beachshore",
    "desert", "earthycave", "icecave", "thunderplains", "volcanocave", "deepsea", "dampcave",
    ...["aquacordetown", "beach", "city", "dampcave", "deepsea", "desert", "earthycave", "forest", "icecave", "meadow", "orasdesert", "orassea"].map((f) => "g6-" + f),
];
const urlFondo = (n) => (String(n).startsWith("g6-") ? `${SD_BASE}sprites/gen6bgs/bg-${n.slice(3)}.jpg` : `${SD_BASE}fx/bg-${n}.png`);
const FONDOS_EXTERIOR = ["meadow", "route", "forest", "city", "mountain", "river", "beach", "beachshore", "desert", "thunderplains",
    "g6-aquacordetown", "g6-beach", "g6-city", "g6-desert", "g6-forest", "g6-meadow", "g6-orasdesert", "g6-orassea"];
// De noche, los escenarios que tienen versión nocturna la usan (y no se oscurecen más).
const FONDO_NOCHE = { meadow: "g6-darkmeadow", "g6-meadow": "g6-darkmeadow", city: "g6-darkcity", "g6-city": "g6-darkcity", beach: "g6-darkbeach", "g6-beach": "g6-darkbeach" };
const fondoSegunHora = (f) => (typeof claseHora === "function" && claseHora() === "noche" && FONDO_NOCHE[f]) || f;
// Salvajes del modo clásico: muchos escenarios de exterior distintos.
const FONDOS_SALVAJE = ["meadow", "route", "forest", "river", "mountain", "beach", "g6-meadow", "g6-forest", "g6-beach", "g6-desert", "g6-orasdesert"];
// Fondo acorde al tipo del gimnasio / rival: cada tipo, su escenario.
const FONDO_TIPO = {
    normal: "g6-aquacordetown", poison: "g6-dampcave", bug: "g6-forest", electric: "thunderplains", ground: "g6-orasdesert",
    flying: "mountain", dragon: "g6-skypillar", water: "g6-leaderwallace", rock: "g6-earthycave", grass: "g6-meadow",
    fire: "volcanocave", psychic: "g6-library", ghost: "dampcave", steel: "g6-city", ice: "g6-icecave",
    fighting: "g6-elite4drake", dark: "g6-darkcity", fairy: "meadow",
};

// ---------- Iconos oficiales de PokéRogue (atlas en tira vertical) ----------
// Tipos con su dibujo, etiquetas de tipo y estados en español y categorías de movimiento.
const ORDEN_TIPOS_PR = ["unknown", "bug", "dark", "dragon", "electric", "fairy", "fighting", "fire", "flying", "ghost",
    "grass", "ground", "ice", "normal", "poison", "psychic", "rock", "steel", "water", "stellar"];
function sprAtlas(ruta, w, h, x, y, tw, th, esc, clase, titulo) {
    return `<span class="spr ${clase}" title="${titulo || ""}" style="width:${w * esc}px;height:${h * esc}px;` +
        `background-image:url('${prURL(ruta)}');background-position:-${x * esc}px -${y * esc}px;background-size:${tw * esc}px ${th * esc}px"></span>`;
}
const idxTipo = (t) => Math.max(0, ORDEN_TIPOS_PR.indexOf(t));
const iconoTipo = (t, esc = 2) => sprAtlas("images/ui/pbinfo_player_type1.png", 20, 12, 0, idxTipo(t) * 12, 20, 240, esc, "icono-tipo", TIPOS_ES[t]);
const etiquetaTipo = (t, esc = 2) => sprAtlas("images/types_es-ES.png", 32, 14, 0, idxTipo(t) * 14, 32, 280, esc, "etq-tipo", TIPOS_ES[t]);
const FILA_ESTADO = { que: 1, con: 3, par: 4, env: 5, dor: 6, tox: 7 };   // tox: envenenamiento grave (Tóxico)
const iconoEstado = (e, esc = 2) => sprAtlas("images/statuses_es-ES.png", 20, 8, 0, FILA_ESTADO[e] * 8, 22, 64, esc, "icono-estado", "");
const iconoCategoria = (cat, esc = 2) => sprAtlas("images/categories.png", 28, 11, { fis: 0, esp: 28, est: 56 }[cat] || 0, 0, 84, 11, esc, "icono-cat",
    { fis: "Físico", esp: "Especial", est: "Estado" }[cat]);

// ---------- Animación de reserva para cualquier movimiento sin la suya (mismo tipo y categoría) ----------
const ALIAS_ANIM = { "vice-grip": "vise-grip", snowscape: "common-snow", "tera-blast": "tera-starstorm" };
const ANIM_RESERVA = {
    normal: ["tackle", "hyper-voice", "growl"], fire: ["fire-punch", "flamethrower", "will-o-wisp"],
    water: ["waterfall", "water-pulse", "aqua-ring"], grass: ["leaf-blade", "energy-ball", "growth"],
    electric: ["thunder-punch", "thunderbolt", "thunder-wave"], ice: ["ice-punch", "ice-beam", "mist"],
    fighting: ["karate-chop", "aura-sphere", "bulk-up"], poison: ["poison-jab", "sludge-bomb", "toxic"],
    ground: ["earthquake", "earth-power", "sand-attack"], flying: ["wing-attack", "air-slash", "roost"],
    psychic: ["zen-headbutt", "psychic", "calm-mind"], bug: ["x-scissor", "bug-buzz", "string-shot"],
    rock: ["rock-slide", "power-gem", "rock-polish"], ghost: ["shadow-claw", "shadow-ball", "confuse-ray"],
    dragon: ["dragon-claw", "dragon-pulse", "dragon-dance"], dark: ["crunch", "dark-pulse", "nasty-plot"],
    steel: ["iron-head", "flash-cannon", "iron-defense"], fairy: ["play-rough", "moonblast", "charm"],
};
const animReserva = (mov) => (ANIM_RESERVA[mov.tipo] || ANIM_RESERVA.normal)[{ fis: 0, esp: 1, est: 2 }[mov.cat] ?? 0];
