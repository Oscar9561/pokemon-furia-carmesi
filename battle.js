/* =========================================================
   MOTOR DE COMBATE · estilo Blanco/Negro 2
   Combates de uno contra uno con las reglas de los juegos actuales: daño, tipos, habilidades, objetos, estados,
   tiempo atmosférico, campos, trampas, pantallas y casi todos los movimientos, con sus datos oficiales (PokéAPI).
   También la captura, la experiencia, los poderes (Megaevolución, Z, Dinamax/Gigamax y Teracristal) y el multijugador.
   Lo que se ve: sprites 2D animados, entrenadores que lanzan su Poké Ball, animaciones y sonidos reales de cada
   movimiento (PokéRogue o Showdown), cinemáticas de los poderes (Deluxe Battle Kit) y música según el rival.
   Multijugador: las dos partidas simulan el mismo combate a la vez, así que la lógica solo usa el azar compartido
   (azarC, alAzarC, entreC) y nunca Math.random, que solo vale para lo que se ve (partículas, destellos…).
   Depende de data.js, recursos.js, habilidades.js, objetos.js, poderes.js, audio.js y animaciones.js.
   ========================================================= */

// ===================== CREAR COMBATIENTES =====================
// s = { id, nivel, objeto, shiny, bola, xp, movimientos, genero, mote, ev, hp, estado, naturaleza, habSlot, probOculta, teraTipo }
async function crearCombatiente(s) {
    const id = s.id, nivel = s.nivel;
    const d = await cargarPokemon(id);
    const base = {};
    d.stats.forEach((st) => { base[st.stat.name] = st.base_stat; });
    const ev = Object.assign({}, s.ev);
    // Naturaleza y habilidad: las suyas o, si es salvaje o de un rival, al azar (la oculta, a veces).
    const naturaleza = NATURALEZAS[s.naturaleza] ? s.naturaleza : naturalezaAleatoria();
    const habSlot = s.habSlot || huecoAleatorio(d, s.probOculta == null ? 0.05 : s.probOculta);
    const habilidad = habilidadDe(d, habSlot);
    const { hpMax, stats } = statsDeNivel(base, nivel, ev, naturaleza);
    const tipos = d.types.map((t) => t.type.name);
    let movimientos = Array.isArray(s.movimientos) && s.movimientos.length ? s.movimientos.map((x) => ({ ...x })) : [];
    if (!movimientos.length) { try { movimientos = await construirMovesetReal(d, nivel); } catch (_) { movimientos = []; } }
    if (!movimientos.length) movimientos = construirMoveset(tipos);
    // PP, prioridad y efectos oficiales (PokéAPI), al día aunque lo aprendiera con una versión anterior del juego; los PP se recargan en cada combate.
    await Promise.all(movimientos.map(async (m) => {
        if (m.clave) {
            try { const { nivel: _, ...act } = movDeAPI(await cargarMovimiento(m.clave), 1); Object.assign(m, act); } catch (_) {}
        }
        m.pp = m.pp || 20; m.ppAct = m.pp;
    }));
    let factorExp = 1; try { factorExp = await factorExpPokemon(id); } catch (_) { factorExp = 1; }
    const objeto = s.objeto || null;
    const hp = s.hp == null ? hpMax : limitar(s.hp, 0, hpMax);
    return {
        id, baseId: id, nivel, nombre: s.mote || nombreBonito(NOMBRE_POR_ID[id] || d.name), mote: s.mote, tipos, tiposBase: tipos, hpMax, hp,
        base, stats, ev, movimientos, peso: d.weight || 0, naturaleza, habSlot, habilidad, habBase: habilidad,
        teraTipo: TIPOS_TERA.includes(s.teraTipo) ? s.teraTipo : tipos[0],
        xp: s.xp || 0, xpProx: xpNecesaria(nivel, factorExp), factorExp, baseExp: d.base_experience || 64,
        bola: claveObj(s.bola || "poke-ball"), objeto, shiny: !!s.shiny,
        puedeMega: !!megaDe(id, objeto) || !!megaPorAscenso(id, objeto, movimientos), esMega: false, megaSprite: null,
        genero: s.genero !== undefined ? s.genero : generoAleatorio(id),
        estado: s.estado && hp > 0 ? { tipo: s.estado, turnos: s.estado === "dor" ? entreC(1, 3) : 0 } : null,
        etapas: etapasCero(), critEtapa: 0, bloqueo: null, furioso: !!s.furioso,
    };
}
async function prepararEquipo(specs) {
    return Promise.all(specs.map((x) => crearCombatiente(x)));
}

// Forcejeo: cuando no quedan PP (daño de retroceso).
const FORCEJEO = { clave: "struggle", nombre: "Forcejeo", tipo: "normal", poder: 50, cat: "fis", prec: 1, drenaje: -0.25, pp: 1, ppAct: 1 };
const conPP = (c) => c.movimientos.filter((m) => m.ppAct > 0);

// ===================== ESTADOS Y CAMBIOS DE ESTADÍSTICAS =====================
const etapasCero = () => ({ atk: 0, def: 0, spa: 0, spd: 0, vel: 0 });
const multEtapa = (e) => (e >= 0 ? (2 + e) / 2 : 2 / (2 - e));
const velEfectiva = (c) => c.stats.vel * multEtapa(c.etapas.vel) * (c.estado && c.estado.tipo === "par" && c.habilidad !== "quick-feet" ? 0.5 : 1) *
    (c.objeto === "choice-scarf" ? 1.5 : c.objeto === "iron-ball" ? 0.5 : 1) * multVelHab(c) * (CAMPO.lados && CAMPO.lados[c.lado] && CAMPO.lados[c.lado].vientoAfin ? 2 : 1);
// Lo que hay en el campo de cada bando: pantallas y Viento Afín (turnos que les quedan) y trampas (capas).
const ladoNuevo = () => ({ reflejo: 0, pantallaLuz: 0, veloAurora: 0, vientoAfin: 0, rocas: 0, puas: 0, toxicas: 0, red: 0, acero: 0, deseo: null, gmax: null,
    veloSagrado: 0, neblina: 0, futuro: null, deseoCura: null });
// Trampas: capas como máximo y los textos al ponerlas y al quitarlas (los de PokéRogue en español).
const PELIGROS = {
    rocas: { max: 1, pone: (yo) => `¡${yo ? "Tu bando está" : "El bando rival está"} rodeado de piedras puntiagudas!`,
        quita: (yo) => `Las piedras puntiagudas lanzadas ${yo ? "a tu bando" : "al bando rival"} han desaparecido.` },
    puas: { max: 3, pone: (yo) => `¡${yo ? "Tu bando está" : "El bando rival está"} rodeado de púas!`,
        quita: (yo) => `Las púas lanzadas ${yo ? "a tu bando" : "al bando rival"} han desaparecido.` },
    toxicas: { max: 2, pone: (yo) => `¡${yo ? "Tu bando está" : "El bando rival está"} rodeado de púas tóxicas!`,
        quita: (yo) => `Las púas tóxicas lanzadas ${yo ? "a tu bando" : "al bando rival"} han desaparecido.` },
    red: { max: 1, pone: (yo) => `¡Una red viscosa se extiende a los pies ${yo ? "de tu bando" : "del bando rival"}!`,
        quita: (yo) => `La red viscosa que rodeaba ${yo ? "a tu bando" : "al bando rival"} ha desaparecido.` },
    acero: { max: 1, pone: (yo) => `¡${yo ? "Tu bando está" : "El bando rival está"} rodeado de afiladas púas de acero!`,
        quita: (yo) => `Las púas de acero lanzadas ${yo ? "a tu bando" : "al bando rival"} han desaparecido.` },
};
const QUITA_PELIGROS = new Set(["rapid-spin", "mortal-spin"]);
// Potencia según la situación (como en los juegos): el estado o los PS de cada uno, el peso, la Velocidad, las mejoras…
// Los que dependen del momento del turno los marca ejecutarMovimiento en su copia del movimiento (_primero, _golpeado…).
const pesoKg = (c) => ((c.peso || 0) / 10) * (c.habilidad === "heavy-metal" ? 2 : c.habilidad === "light-metal" ? 0.5 : 1) * (c.objeto === "float-stone" ? 0.5 : 1);   // (Metal Pesado / Liviano, Piedra Pómez)
const subidas = (c) => Object.values(c.etapas).reduce((s, v) => s + Math.max(0, v), 0);
const conEstado = (c, t) => (c.estado ? !t || c.estado.tipo === t : c.habilidad === "comatose" && (!t || t === "dor"));
const poderPorPeso = (kg) => (kg < 10 ? 20 : kg < 25 ? 40 : kg < 50 ? 60 : kg < 100 ? 80 : kg < 200 ? 100 : 120);
const poderPorPesoRel = (a, d) => { const r = pesoKg(a) / Math.max(0.1, pesoKg(d)); return r >= 5 ? 120 : r >= 4 ? 100 : r >= 3 ? 80 : r >= 2 ? 60 : 40; };
const poderAgonia = (a) => { const p = Math.floor(48 * a.hp / a.hpMax); return p <= 1 ? 200 : p <= 4 ? 150 : p <= 9 ? 100 : p <= 16 ? 80 : p <= 32 ? 40 : 20; };
const PODER_VARIABLE = {
    hex: (a, d, m) => m.poder * (conEstado(d) ? 2 : 1), "infernal-parade": (a, d, m) => m.poder * (conEstado(d) ? 2 : 1),
    venoshock: (a, d, m) => m.poder * (conEstado(d, "env") ? 2 : 1), "barb-barrage": (a, d, m) => m.poder * (conEstado(d, "env") ? 2 : 1),
    "smelling-salts": (a, d, m) => m.poder * (conEstado(d, "par") ? 2 : 1), "wake-up-slap": (a, d, m) => m.poder * (conEstado(d, "dor") ? 2 : 1),
    brine: (a, d, m) => m.poder * (d.hp * 2 <= d.hpMax ? 2 : 1),
    facade: (a, d, m) => m.poder * (a.estado && ["par", "que", "env"].includes(a.estado.tipo) ? 2 : 1),
    acrobatics: (a, d, m) => m.poder * (a.objeto ? 1 : 2),
    payback: (a, d, m) => m.poder * (m._primero === false ? 2 : 1),
    avalanche: (a, d, m) => m.poder * (m._golpeado ? 2 : 1), revenge: (a, d, m) => m.poder * (m._golpeado ? 2 : 1),
    assurance: (a, d, m) => m.poder * (m._danado ? 2 : 1),
    "fishious-rend": (a, d, m) => m.poder * (m._primero ? 2 : 1), "bolt-beak": (a, d, m) => m.poder * (m._primero ? 2 : 1),
    "last-respects": (a, d, m) => 50 + 50 * (m._caidos || 0), "rage-fist": (a) => Math.min(350, 50 + 50 * (a.golpesRecibidos || 0)),
    eruption: (a) => 150 * a.hp / a.hpMax, "water-spout": (a) => 150 * a.hp / a.hpMax, "dragon-energy": (a) => 150 * a.hp / a.hpMax,
    "crush-grip": (a, d) => 120 * d.hp / d.hpMax, "wring-out": (a, d) => 120 * d.hp / d.hpMax, "hard-press": (a, d) => 100 * d.hp / d.hpMax,
    reversal: (a) => poderAgonia(a), flail: (a) => poderAgonia(a),
    "low-kick": (a, d) => poderPorPeso(pesoKg(d)), "grass-knot": (a, d) => poderPorPeso(pesoKg(d)),
    "heavy-slam": (a, d) => poderPorPesoRel(a, d), "heat-crash": (a, d) => poderPorPesoRel(a, d),
    "gyro-ball": (a, d) => Math.min(150, Math.floor(25 * velEfectiva(d) / Math.max(1, velEfectiva(a))) + 1),
    "electro-ball": (a, d) => { const r = velEfectiva(a) / Math.max(1, velEfectiva(d)); return r >= 4 ? 150 : r >= 3 ? 120 : r >= 2 ? 80 : r >= 1 ? 60 : 40; },
    "stored-power": (a) => 20 + 20 * subidas(a), "power-trip": (a) => 20 + 20 * subidas(a), punishment: (a, d) => Math.min(200, 60 + 20 * subidas(d)),
    magnitude: (a, d, m) => m._magnitud || 70,
    "terrain-pulse": (a, d, m) => m.poder * (terrenoEnCampo() && enSuelo(a) ? 2 : 1),
    "rising-voltage": (a, d, m) => m.poder * (terrenoEnCampo() === "electrico" && enSuelo(d) ? 2 : 1),
    "expanding-force": (a, d, m) => m.poder * (terrenoEnCampo() === "psiquico" && enSuelo(a) ? 1.5 : 1),
    psyblade: (a, d, m) => m.poder * (terrenoEnCampo() === "electrico" ? 1.5 : 1),
    "spit-up": (a) => 100 * (a.reservas || 0), fling: (a) => poderLanzar(a.objeto), "natural-gift": () => 80, present: (a, d, m) => m._presente || 80,
    "beat-up": (a) => 5 + Math.floor(((a.base && a.base.attack) || 80) / 10),
};
const PODER_VARIABLE_TXT = {
    hex: "Doble de potencia si el rival tiene un problema de estado", "infernal-parade": "Doble de potencia si el rival tiene un problema de estado",
    venoshock: "Doble de potencia si el rival está envenenado", "barb-barrage": "Doble de potencia si el rival está envenenado",
    "smelling-salts": "Doble de potencia si el rival está paralizado (y lo cura)", "wake-up-slap": "Doble de potencia si el rival está dormido (y lo despierta)",
    brine: "Doble de potencia si al rival le queda la mitad de sus PS o menos", facade: "Doble de potencia si el usuario está envenenado, quemado o paralizado",
    acrobatics: "Doble de potencia si el usuario no lleva objeto", payback: "Doble de potencia si el rival ya ha actuado",
    avalanche: "Doble de potencia si le han golpeado en este turno", revenge: "Doble de potencia si le han golpeado en este turno",
    assurance: "Doble de potencia si el rival ya ha recibido daño en este turno",
    "fishious-rend": "Doble de potencia si ataca antes que el rival", "bolt-beak": "Doble de potencia si ataca antes que el rival",
    "last-respects": "Más fuerte por cada compañero debilitado", "rage-fist": "Más fuerte por cada golpe que ha recibido",
    eruption: "Más fuerte cuantos más PS le queden al usuario", "water-spout": "Más fuerte cuantos más PS le queden al usuario",
    "dragon-energy": "Más fuerte cuantos más PS le queden al usuario", "crush-grip": "Más fuerte cuantos más PS le queden al rival",
    "wring-out": "Más fuerte cuantos más PS le queden al rival", "hard-press": "Más fuerte cuantos más PS le queden al rival",
    reversal: "Más fuerte cuantos menos PS le queden al usuario", flail: "Más fuerte cuantos menos PS le queden al usuario",
    "low-kick": "Más fuerte cuanto más pese el rival", "grass-knot": "Más fuerte cuanto más pese el rival",
    "heavy-slam": "Más fuerte cuanto más pese el usuario que el rival", "heat-crash": "Más fuerte cuanto más pese el usuario que el rival",
    "gyro-ball": "Más fuerte cuanto más lento sea el usuario que el rival", "electro-ball": "Más fuerte cuanto más rápido sea el usuario que el rival",
    "stored-power": "Más fuerte por cada mejora en sus características", "power-trip": "Más fuerte por cada mejora en sus características",
    punishment: "Más fuerte por cada mejora en las características del rival", magnitude: "Potencia al azar, de 10 a 150",
    "terrain-pulse": "Con un campo, cambia a su tipo y duplica su potencia", "rising-voltage": "Doble de potencia con Campo Eléctrico",
    "expanding-force": "Más fuerte con Campo Psíquico", psyblade: "Más fuerte con Campo Eléctrico",
};Object.assign(PODER_VARIABLE_TXT, {
    "spit-up": "100 de potencia por cada reserva de Reserva (y las gasta)", fling: "Lanza su objeto: la potencia depende del objeto",
    "natural-gift": "Gasta su baya: el tipo depende de la baya", present: "Potencia al azar (40, 80 o 120)... o cura al rival",
    "beat-up": "Golpea una vez por cada compañero sano del equipo",
});

const poderMovimiento = (a, d, mov) => { const f = !mov.esZ && PODER_VARIABLE[mov.clave]; return f ? Math.max(1, Math.floor(f(a, d, mov))) : mov.poder; };
// Atrapan al rival de 4 a 5 turnos (1/8 de sus PS cada turno, sin poder cambiar ni huir). Textos de PokéRogue.
const ATRAPA = {
    bind: (x, y) => `¡La atadura de ${y} oprime a ${x}!`, wrap: (x, y) => `¡${y} ha atrapado a ${x} con una constricción!`,
    "fire-spin": (x) => `¡${x} ha quedado atrapado en un torbellino de fuego!`, whirlpool: (x) => `¡${x} ha quedado atrapado dentro del torbellino!`,
    "sand-tomb": (x) => `¡Bucle Arena ha atrapado a ${x}!`, clamp: (x, y) => `¡${y} ha atenazado a ${x}!`,
    infestation: (x, y) => `¡${x} es presa del acoso de ${y}!`, "magma-storm": (x) => `¡${x} ha quedado atrapado en la lluvia ígnea!`,
    "snap-trap": (x) => `¡${x} ha quedado atrapado en un cepo!`, "thunder-cage": (x, y) => `¡${y} ha enjaulado a ${x}!`,
};
// No puede cambiar ni huir (los de tipo Fantasma y con Muda Concha, sí).
// Con Arraigo tampoco (sus raíces lo sujetan), ni frente a Trampa Arena (si toca el suelo), Sombra Trampa (salvo si él también
// la tiene) o Imán (si es de tipo Acero). Los de tipo Fantasma escapan de todo eso; la Muda Concha, de todo.
const sinSalida = (c) => c.objeto !== "shed-shell" && (CAMPO.cerrojo > 0 || (!!c.atrapado && !c.tipos.includes("ghost")) || !!c.arraigo || atrapadoPorHab(c));
function atrapadoPorHab(c) {
    const r = CAMPO.activos ? CAMPO.activos().find((p) => p && p !== c && p.lado !== c.lado && p.hp > 0) : null;
    if (!r || c.tipos.includes("ghost")) return false;
    const h = r.habilidad;
    return (h === "arena-trap" && enSuelo(c)) || (h === "shadow-tag" && c.habilidad !== "shadow-tag") || (h === "magnet-pull" && c.tipos.includes("steel"));
}
// Atracción y Gran Encanto: solo entre Pokémon de distinto sexo.
const generosOpuestos = (a, b) => !!(a && b && a.genero && b.genero && a.genero !== b.genero);
// Premonición y Deseo Oculto golpean dos turnos después; Metaláser, Cabeza Sorpresa y Clorofiláser cuestan la mitad de los PS.
const FUTURO = new Set(["future-sight", "doom-desire"]);
const MEDIO_PS = new Set(["steel-beam", "mind-blown", "chloroblast"]);
// Última Baza: solo si ya ha usado todos sus otros movimientos desde que salió. Sincrorruido: solo contra quien comparte tipo.
const ultimaBazaLista = (c) => { const otros = c.movimientos.filter((x) => x.clave !== "last-resort"); return otros.length > 0 && otros.every((x) => c.usados && c.usados.has(x.clave)); };
const compartenTipo = (a, b) => a.tipos.some((t) => b.tipos.includes(t));
// Cola Dragón y Llave Giro: tras golpear, el rival vuelve a su Poké Ball y sale otro al azar (Rugido y Remolino, sin golpe).
const ARRASTRA = new Set(["dragon-tail", "circle-throw"]);
// Sustituto: los movimientos de sonido, Allanamiento, Mofa, Otra Vez y Rugido lo atraviesan.
const atraviesaSub = (mov, atk) => MOVS_SONIDO.has(mov.clave) || atk.habilidad === "infiltrator" || ["mofa", "otraVez", "arrastrar"].includes(mov.especial);
// Movimientos especiales que se animan sobre el propio usuario.
const ESPECIAL_PROPIO = new Set(["shell-smash", "victory-dance", "shelter", "fillet-away", "take-heart", "acupressure", "stockpile", "laser-focus", "magnet-rise", "endure", "lunar-blessing", "jungle-healing", "refresh", "revival-blessing", "recycle", "magic-coat", "snatch", "conversion", "camouflage", "power-trick", "power-shift", "gravity", "magic-room", "wonder-room", "mud-sport", "water-sport", "ion-deluge", "fairy-lock", "lucky-chant", "court-change", "happy-hour", "splash", "celebrate", "baton-pass", "teleport", "shed-tail", "chilly-reception", "proteccion", "reflejo", "pantallaLuz", "veloAurora", "vientoAfin", "sustituto", "tambor", "deseo", "descanso",
    "espacioRaro", "niebla", "terreno", "limpieza", "arraigo", "acuaAro", "veloSagrado", "neblina", "foco", "campana", "deseoCura", "transformar"]);
// Objeto que se le puede quitar (Desarme): no su megapiedra, ni un cristal Z, ni con Viscosidad.
const puedePerderObjeto = (c) => !!c.objeto && c.habilidad !== "sticky-hold" && !TIPO_CRISTAL[c.objeto] && !(MEGAS[c.objeto] && MEGAS[c.objeto].base === c.baseId);
const hayCambios = (c, signo) => Object.values(c.etapas).some((v) => (signo > 0 ? v > 0 : signo < 0 ? v < 0 : v !== 0));
const hayPeligros = (l) => !!l && Object.keys(PELIGROS).some((k) => l[k] > 0);
// Toca el suelo (le afectan las Púas, las Púas Tóxicas y la Red Viscosa): ni tipo Volador, ni Levitación, ni Globo Helio.
const enSuelo = (c) => CAMPO.gravedad > 0 || !!c.arraigo || c.objeto === "iron-ball" || (!(c.levitando > 0) && !(c.telequinesis > 0) && !c.tipos.includes("flying") && c.habilidad !== "levitate" && c.objeto !== "air-balloon");
// PS que le quitarían las trampas de su bando al entrar (Trampa Rocas, según su debilidad a la Roca, y Púas).
function peajeEntrada(c) {
    const l = CAMPO.lados && CAMPO.lados[c.lado];
    if (!l || c.objeto === "heavy-duty-boots" || c.habilidad === "magic-guard") return 0;
    return Math.floor(c.hpMax * ((l.rocas ? efectividad("rock", c.tipos) / 8 : 0) + (l.puas && enSuelo(c) ? [0, 1 / 8, 1 / 6, 1 / 4][l.puas] : 0)));
}
// Abreviatura (como en los juegos en español), animación común de PokéRogue y textos.
const ESTADOS = {
    par: { corto: "PAR", anim: "common-paralysis", inmunes: ["electric"], pone: (n) => `¡${n} está paralizado! Quizás no pueda moverse.` },
    que: { corto: "QUE", anim: "common-burn",      inmunes: ["fire"],     pone: (n) => `¡${n} se ha quemado!` },
    env: { corto: "ENV", anim: "common-poison",    inmunes: ["poison", "steel"], pone: (n) => `¡${n} ha sido envenenado!` },
    dor: { corto: "DOR", anim: "common-sleep",     inmunes: [],           pone: (n) => `¡${n} se ha dormido!` },
    con: { corto: "CON", anim: "common-frozen",    inmunes: ["ice"],      pone: (n) => `¡${n} se ha congelado!` },
};
const NOMBRE_STAT = { atk: "el Ataque", def: "la Defensa", spa: "el Ataque Especial", spd: "la Defensa Especial", vel: "la Velocidad" };
const ABREV_STAT = { atk: "Ata", def: "Def", spa: "AtE", spd: "DfE", vel: "Vel" };
async function aplicarMega(c) {
    const info = megaDeC(c); if (!info) return;
    const d = await cargarPokemon(info.api);
    const base = {}; d.stats.forEach((s) => { base[s.stat.name] = s.base_stat; });
    c.base = base;
    const sd = statsDeNivel(base, c.nivel, c.ev, c.naturaleza);
    c.hpMax = sd.hpMax; c.hp = Math.min(c.hp, c.hpMax); c.stats = sd.stats;
    c.tipos = c.tiposBase = d.types.map((t) => t.type.name);
    c.habilidad = c.habBase = info.hab || habilidadDe(d, 1) || c.habilidad;   // la de la mega (Garra Dura, Sequía…)
    c.nombre = info.nombre; c.megaSprite = info.sprite; c.megaInfo = info;
    c.esMega = true; c.puedeMega = false;
}
// Al acabar el combate, la megaevolución se deshace: vuelve su forma de siempre, con sus datos, tipos y habilidad.
async function deshacerMega(c) {
    if (!c || !c.esMega) return;
    const d = await cargarPokemon(c.baseId);
    const base = {}; d.stats.forEach((s) => { base[s.stat.name] = s.base_stat; });
    const antes = c.hpMax, sd = statsDeNivel(base, c.nivel, c.ev, c.naturaleza);
    c.base = base; c.stats = sd.stats;
    c.hpMax = sd.hpMax; if (c.hp > 0) c.hp = Math.max(1, Math.min(c.hpMax, c.hp + (c.hpMax - antes)));
    c.tipos = c.tiposBase = d.types.map((t) => t.type.name);
    c.habilidad = c.habBase = habilidadDe(d, c.habSlot) || c.habilidad;
    c.nombre = c.mote || nombreBonito(NOMBRE_POR_ID[c.baseId] || d.name);
    c.megaSprite = null; c.megaInfo = null; c.esMega = false; c.puedeMega = !!megaDeC(c);
}

// Lectores de pantalla: el mensaje entero, una sola vez (en pantalla se escribe letra a letra).
const anunciarSR = (txt) => { const el = document.getElementById("anuncio-sr"); if (el) el.textContent = txt; };

// ===================== AZAR DEL COMBATE =====================
// Normalmente Math.random; en el multijugador, uno con semilla compartida: las dos partidas simulan el combate a la vez y
// sacan los mismos números (cada una solo envía lo que elige su jugador).
let azarC = Math.random;
function semillaAzar(n) {   // mulberry32
    let a = n >>> 0;
    return () => {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = Math.imul(a ^ (a >>> 15), a | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
const alAzarC = (lista) => lista[Math.floor(azarC() * lista.length)];
const entreC = (min, max) => Math.floor(azarC() * (max - min + 1)) + min;

// ===================== CÁLCULO DE DAÑO =====================
// Probabilidad de crítico por nivel (como en Blanco/Negro): Periscopio, Garra Afilada, Crítico X…
const PROB_CRIT = [1 / 16, 1 / 8, 1 / 4, 1 / 3, 1 / 2];
const nivelCritico = (c, mov) => (mov.critAlto ? 1 : 0) + (c.critEtapa || 0) + (c.objeto === "scope-lens" || c.objeto === "razor-claw" ? 1 : 0);
function multAtaqueObjeto(c, fisico) {
    const o = c.objeto;
    if ((o === "choice-band" && fisico) || (o === "choice-specs" && !fisico)) return 1.5;
    if (o === "light-ball" && c.baseId === 25) return 2;
    if (o === "thick-club" && fisico && (c.baseId === 104 || c.baseId === 105)) return 2;
    return 1;
}
function multDefensaObjeto(c, fisico) {
    if (c.objeto === "assault-vest" && !fisico) return 1.5;
    if (c.objeto === "eviolite" && !c.esMega && (EVO_TABLA[c.baseId] || [])[3] > 0) return 1.5;
    return 1;
}
function multPoderObjeto(c, mov) {
    if (POTENCIA_TIPO[c.objeto] === mov.tipo) return 1.2;
    if ((c.objeto === "muscle-band" && mov.cat === "fis") || (c.objeto === "wise-glasses" && mov.cat === "esp")) return 1.1;
    if (c.objeto === "metronome" && c.metronomo && c.metronomo.clave === mov.clave) return 1 + 0.2 * Math.min(5, c.metronomo.n);
    return 1;
}
// estimado: sin crítico ni azar (para que la IA calcule).
function calcularDanio(atacante, defensor, mov, estimado = false) {
    const fijo = !mov.esZ && !mov.esMax && DANIO_FIJO[mov.clave];
    if (fijo) {   // Sísmico, Superdiente…: solo cuenta si le afecta o no
        const efect = efectividadHab(mov._tipo || tipoDeMovimiento(atacante, mov), defensor, atacante, mov) > 0 ? 1 : 0;
        return { dmg: efect ? Math.max(1, fijo(atacante, defensor, estimado, mov)) : 0, efect, crit: false, resiste: false };
    }
    // Teraexplosión teracristalizado: física si su Ataque es mayor que su Ataque Especial.
    const fisico = mov.clave === "tera-blast" && atacante.teracristal
        ? atacante.stats.atk * multEtapa(atacante.etapas.atk) > atacante.stats.spa * multEtapa(atacante.etapas.spa) : mov.cat === "fis";
    const tipo = mov._tipo || tipoDeMovimiento(atacante, mov);   // Piel Feérica, Meteorobola…
    const ha = atacante.habilidad, hd = habDef(defensor, atacante, mov);
    // Crítico: Afortunado sube el índice, Armadura Batalla lo impide y Ensañamiento acierta siempre contra un envenenado.
    const laser = !estimado && !!atacante.laserFocus; if (laser) atacante.laserFocus = false;   // (Aguzar: su siguiente golpe, crítico)
    const crit = !estimado && !sinCriticos(defensor, atacante) && (laser || (ha === "merciless" && defensor.estado && defensor.estado.tipo === "env") ||
        azarC() < PROB_CRIT[Math.min(4, nivelCritico(atacante, mov) + (ha === "super-luck" ? 1 : 0))]);
    // Un crítico ignora las bajadas propias y las subidas del rival; Ignorante, todos los cambios del otro.
    const ea = hd === "unaware" ? 0 : atacante.etapas[fisico ? "atk" : "spa"], ed = ha === "unaware" ? 0 : defensor.etapas[fisico ? "def" : "spd"];
    const a = (fisico ? atacante.stats.atk : atacante.stats.spa) * multEtapa(crit ? Math.max(0, ea) : ea) * multAtaqueObjeto(atacante, fisico) * multAtaqueHab(atacante, fisico, defensor);
    const d = ((fisico !== (CAMPO.salaExtrana > 0)) ? defensor.stats.def : defensor.stats.spd) * multEtapa(crit ? Math.min(0, ed) : ed) * multDefensaObjeto(defensor, fisico) * multDefensaHab(defensor, fisico, atacante);
    let base = poderMovimiento(atacante, defensor, mov);
    // Teracristal: los movimientos de su teratipo pegan al menos con 60 de potencia (salvo los de varios golpes o con prioridad).
    if (atacante.teracristal === tipo && base < 60 && !mov.golpes && !((mov.prio || 0) > 0) && !mov.esMax && !mov.esZ) base = 60;
    const mv = base === mov.poder ? mov : Object.assign({}, mov, { poder: base });
    const poder = base * (mov.clave === "knock-off" && puedePerderObjeto(defensor) ? 1.5 : 1) *   // Desarme, si tiene objeto
        multPoderObjeto(atacante, Object.assign({}, mov, { tipo })) * multPoderHab(atacante, mv, tipo, defensor) *
        (tipo === "electric" && CAMPO.chapoteo > 0 ? 1 / 3 : 1) * (tipo === "fire" && CAMPO.hidrochorro > 0 ? 1 / 3 : 1);   // (Chapoteo Lodo, Hidrochorro)
    const stab = stabDe(atacante, tipo);   // (con Teracristal, también el del teratipo)
    const efect = efectividadHab(tipo, defensor, atacante, mov) * (tipo === "ground" && defensor.objeto === "air-balloon" && mov.clave !== "thousand-arrows" ? 0 : 1);
    const quemado = fisico && atacante.estado && atacante.estado.tipo === "que" && ha !== "guts" && mov.clave !== "facade" ? 0.5 : 1;
    const rnd = estimado ? 0.925 : 0.85 + azarC() * 0.15;
    let mod = stab * efect * (crit ? 1.5 : 1) * rnd * quemado * multDanioHab(atacante, defensor, mov, tipo, efect, crit);
    if (atacante.objeto === "life-orb") mod *= 1.3;
    if (atacante.objeto === "expert-belt" && efect >= 2) mod *= 1.2;
    const resiste = efect > 0 && !nervioso(defensor) && BAYA_RESISTE[defensor.objeto] === tipo && (efect >= 2 || defensor.objeto === "chilan-berry");
    if (resiste) mod *= defensor.habilidad === "ripen" ? 0.25 : 0.5;   // (con Maduración, el doble de efecto)
    // Reflejo, Pantalla de Luz y Velo Aurora del bando que recibe: la mitad de daño (no con críticos ni con Allanamiento).
    const pant = CAMPO.lados && CAMPO.lados[defensor.lado];
    if (pant && !crit && ha !== "infiltrator" && (pant.veloAurora || (fisico ? pant.reflejo : pant.pantallaLuz))) mod *= 0.5;
    if (mov._cuarto) mod *= 0.25;
    if (mov._amorFilial) mod *= 0.25;   // (segundo golpe de Amor Filial)
    const dmg = Math.floor((((2 * atacante.nivel / 5 + 2) * poder * (a / d)) / 50 + 2) * mod);
    return { dmg: efect === 0 ? 0 : Math.max(1, dmg), efect, crit: crit && efect > 0, resiste };
}
// ===================== MOVIMIENTOS DE VARIOS TURNOS =====================
// Dos turnos: el primero carga (o se esconde, y casi nada le alcanza) y el segundo ataca. Textos de PokéRogue (es-ES).
const MOVS_CARGA = {
    "solar-beam": { txt: "¡{n} ha absorbido luz solar!" }, "solar-blade": { txt: "¡{n} ha absorbido luz solar!" },
    "sky-attack": { txt: "¡Un intenso halo rodea a {n}!" }, "skull-bash": { txt: "¡{n} ha agachado la cabeza!", sube: { def: 1 } },
    "razor-wind": { txt: "¡{n} se prepara para lanzar una borrasca!" }, "meteor-beam": { txt: "¡{n} rebosa energía cósmica!", sube: { spa: 1 } },
    "electro-shot": { txt: "¡{n} está acumulando electricidad!", sube: { spa: 1 } }, "freeze-shock": { txt: "¡Una luz fría envuelve a {n}!" },
    "ice-burn": { txt: "¡Una ráfaga gélida envuelve a {n}!" },
    fly: { txt: "¡{n} voló alto!", oculto: "aire" }, bounce: { txt: "¡{n} ha saltado muy alto!", oculto: "aire" },
    dig: { txt: "¡{n} se ha ocultado bajo tierra!", oculto: "tierra" }, dive: { txt: "¡{n} se ha ocultado bajo el agua!", oculto: "agua" },
    "phantom-force": { txt: "¡{n} desaparece en un abrir y cerrar de ojos!", oculto: "fuera" },
    "shadow-force": { txt: "¡{n} desaparece en un abrir y cerrar de ojos!", oculto: "fuera" },
};
// Qué alcanza a un Pokémon escondido (y por cuánto multiplica su potencia).
const ALCANZA = {
    aire: { gust: 2, twister: 2, thunder: 1, hurricane: 1, "sky-uppercut": 1, "smack-down": 1, "thousand-arrows": 1 },
    tierra: { earthquake: 2, magnitude: 2, fissure: 1 }, agua: { surf: 2, whirlpool: 2 }, fuera: {},
};
// Furia: 2-3 turnos seguidos sin poder elegir y luego, agotado, se queda confuso.
const MOVS_FURIA = new Set(["outrage", "thrash", "petal-dance", "raging-fury"]);
// Recarga: el turno siguiente no puede hacer nada.
const MOVS_RECARGA = new Set(["hyper-beam", "giga-impact", "blast-burn", "hydro-cannon", "frenzy-plant", "rock-wrecker", "roar-of-time",
    "prismatic-laser", "eternabeam", "meteor-assault"]);
// Protecciones: Escudo Real, Telatrampa y Llama Protectora solo paran ataques; Finta y Golpe Umbrío la rompen; Hiperbarrena y Hachazo Titánico la atraviesan.
const PROTEGE_SOLO_ATAQUES = new Set(["kings-shield", "silk-trap", "burning-bulwark", "mat-block", "obstruct"]);
const ROMPE_PROTECCION = new Set(["feint", "phantom-force", "shadow-force", "hyperspace-fury", "hyperspace-hole"]);
const ATRAVIESA_PROTECCION = new Set(["hyper-drill", "mighty-cleave"]);
const RECARGA = { clave: "recarga", nombre: "Recarga", tipo: "normal", cat: "est", poder: 0, prec: 1, prio: 0, pp: 1 };
const cargaSinEspera = (mov, c) => ((mov.clave === "solar-beam" || mov.clave === "solar-blade") && climaDeAtaque(c) === "sol") || (mov.clave === "electro-shot" && climaEnCampo() === "lluvia");
// El movimiento que tiene que usar sí o sí (segundo turno de carga, furia o recarga), o null.
const movForzado = (c) => (c.forzado ? (c.forzado.tipo === "recarga" ? RECARGA : c.forzado.mov) : null);

// Daño que espera hacer con un ataque (sin crítico ni azar; los de varios golpes, la media).
function danioEsperado(atacante, defensor, mov) {
    if (mov.cat === "est" || (!mov.poder && !PODER_VARIABLE[mov.clave] && !DANIO_FIJO[mov.clave])) return 0;
    const golpes = mov.golpes ? (atacante.habilidad === "skill-link" ? mov.golpes[1] : (mov.golpes[0] + mov.golpes[1]) / 2) : 1;
    return calcularDanio(atacante, defensor, mov, true).dmg * golpes;
}
// Lo más que le quita a otro con un golpe (esperado y según la precisión).
const golpeMaximo = (a, d) => Math.max(0, ...conPP(a).filter((m) => m.cat !== "est").map((m) => danioEsperado(a, d, m) * Math.min(1, m.prec || 1)));
// precision: probabilidad de hacer su mejor jugada (sube con la dificultad). Desde 0,9 la IA está atenta: remata si puede
// (con prioridad si es más lenta), se cura a tiempo y, con pocos PS, no pierde el turno con movimientos de estado.
function iaElegirMov(atacante, defensor, precision = 0.75) {
    let movs = conPP(atacante);
    if (atacante.bloqueo) { const m = movs.find((x) => x.clave === atacante.bloqueo); return m || FORCEJEO; }   // objeto Elección
    if (atacante.otraVez) { const m = movs.find((x) => x.clave === atacante.otraVez.clave); return m || FORCEJEO; }   // Otra Vez
    if (atacante.objeto === "assault-vest" || atacante.mofa > 0) movs = movs.filter((x) => x.cat !== "est");
    // (ni el anulado, ni los que ahora fallarían: Eructo sin baya, Última Baza antes de tiempo, Sincrorruido sin tipo común,
    // una Premonición que ya espera, o Transformación si ya está transformado)
    movs = movs.filter((x) => !(atacante.anulado && x.clave === atacante.anulado.clave) && !(x.clave === "belch" && !atacante.ultimaBaya) &&
        !(x.clave === "last-resort" && !ultimaBazaLista(atacante)) && !(x.clave === "synchronoise" && !compartenTipo(atacante, defensor)) &&
        !(FUTURO.has(x.clave) && CAMPO.lados && CAMPO.lados[defensor.lado] && CAMPO.lados[defensor.lado].futuro) &&
        !(x.especial === "transformar" && (atacante.transformado || defensor.transformado || defensor.sustituto > 0)) &&
        !(atacante.tormento && x.clave === atacante.ultimoMov) && !(defensor.sellado && defensor.movimientos.some((y) => y.clave === x.clave)) &&
        !(x.clave === "spit-up" && !(atacante.reservas > 0)) && !((x.clave === "fling" || x.clave === "natural-gift") && !atacante.objeto) &&
        !(OHKO.has(x.clave) && defensor.nivel > atacante.nivel));
    // Dormida, Sonámbulo o Ronquido si los tiene (despierta, nunca); Sorpresa y Escaramuza, solo nada más entrar; Comesueños, contra un dormido.
    const dormida = !!atacante.estado && atacante.estado.tipo === "dor";
    if (dormida) { const st = movs.find((x) => x.clave === "sleep-talk") || movs.find((x) => x.clave === "snore"); if (st) return st; }
    const posibles = movs.filter((x) => (dormida || !SOLO_DORMIDO.has(x.clave)) && !(PRIMER_TURNO.has(x.clave) && atacante.accionesEnCampo > 0) && !DEVUELVE[x.clave] &&
        !(defensor.sustituto > 0 && apuntaAlRival(x) && !atraviesaSub(x, atacante)) &&   // (contra un sustituto no sirven)
        !(x.clave === "dream-eater" && !(defensor.estado && defensor.estado.tipo === "dor")) && !(x.especial === "sonambulo"));
    if (posibles.length) movs = posibles;
    if (!movs.length) return FORCEJEO;
    const sorpresa = !atacante.accionesEnCampo && movs.find((x) => x.clave === "fake-out");
    if (sorpresa && efectividad("normal", defensor.tipos) > 0 && defensor.habilidad !== "inner-focus" && azarC() < 0.6) return sorpresa;
    // (sin usar movimientos que su habilidad anula: nada de Tierra contra Levitación ni de Rayo contra Pararrayos)
    const anulado = (mv) => !!inmunidadHab(defensor, atacante, mv, tipoDeMovimiento(atacante, mv)) ||
        (terrenoEnCampo() === "psiquico" && prioridadHab(atacante, mv) > 0 && enSuelo(defensor) && mv.cat !== "est");   // (el Campo Psíquico frena la prioridad)
    const ataques = movs.filter((mv) => mv.cat !== "est");
    const turnos = (mv) => (MOVS_CARGA[mv.clave] && !cargaSinEspera(mv, atacante) ? 0.55 : MOVS_RECARGA.has(mv.clave) ? 0.7 : 1);   // pierden un turno
    // Explosión, Sacrificio…: solo cuando le queda poca vida, y nunca con su último Pokémon (perdería el combate).
    const suicida = (mv) => AUTO_KO.has(mv.clave) || mv.clave === "final-gambit";
    const peaje = (mv) => (!suicida(mv) ? 1 : CAMPO.quedan && CAMPO.quedan(atacante.lado) <= 1 ? 0 : atacante.hp < atacante.hpMax * 0.35 ? 1.1 : 0.2);
    const valor = new Map(ataques.map((mv) => [mv, anulado(mv) ? 0 : danioEsperado(atacante, defensor, mv) * Math.min(1, mv.prec || 1) * turnos(mv) * peaje(mv)]));
    const atenta = precision >= 0.9 && azarC() < precision;
    if (atenta) {
        // Remata: el ataque que lo debilita (con margen por el azar); si es más lenta, mejor uno con prioridad.
        const rematan = ataques.filter((mv) => !anulado(mv) && !suicida(mv) && !(MOVS_CARGA[mv.clave] && !cargaSinEspera(mv, atacante)) && danioEsperado(atacante, defensor, mv) * 0.92 >= defensor.hp);
        if (rematan.length) {
            const lenta = (velEfectiva(atacante) <= velEfectiva(defensor)) !== (CAMPO.espacioRaro > 0);
            rematan.sort((a, b) => (lenta ? (b.prio || 0) - (a.prio || 0) : 0) || Math.min(1, b.prec || 1) - Math.min(1, a.prec || 1) || valor.get(b) - valor.get(a));
            return rematan[0];
        }
        // Con poca vida, se cura si tiene cómo (y si no la van a debilitar igual).
        const cura = movs.find((mv) => mv.cat === "est" && mv.curacion);
        if (cura && atacante.hp < atacante.hpMax * 0.4 && golpeMaximo(defensor, atacante) < atacante.hp + atacante.hpMax * cura.curacion && azarC() < 0.75) return cura;
    }
    // A veces usa un movimiento de estado si tiene sentido (el rival sin estado, o aún puede mejorar sus estadísticas).
    const utilEstado = movs.filter((mv) => mv.cat === "est" && !anulado(mv) && (
        (mv.curacion && atacante.hp < atacante.hpMax * 0.5) ||
        (mv.especial === "perish-song" && !defensor.perecer && defensor.habilidad !== "soundproof" && CAMPO.quedan && CAMPO.quedan(atacante.lado) > CAMPO.quedan(defensor.lado)) ||
        (mv.clima && climaEnCampo() !== mv.clima) ||
        (mv.confunde && !defensor.confuso && defensor.habilidad !== "own-tempo") ||
        (mv.especial === "proteccion" && !atacante.protecciones && (defensor.drenado || (defensor.estado && ["env", "que"].includes(defensor.estado.tipo)) || azarC() < 0.2)) ||
        (mv.especial === "drenadoras" && !defensor.drenado && !defensor.tipos.includes("grass")) ||
        (["reflejo", "pantallaLuz", "veloAurora"].includes(mv.especial) && CAMPO.lados && !CAMPO.lados[atacante.lado][mv.especial] && (mv.especial !== "veloAurora" || climaEnCampo() === "nieve")) ||
        (mv.especial === "mofa" && !defensor.mofa && defensor.movimientos.some((x) => x.cat === "est")) ||
        (mv.especial === "vientoAfin" && CAMPO.lados && !CAMPO.lados[atacante.lado].vientoAfin && velEfectiva(atacante) <= velEfectiva(defensor)) ||
        (PELIGROS[mv.especial] && CAMPO.lados && CAMPO.quedan && CAMPO.quedan(defensor.lado) > 1 && CAMPO.lados[defensor.lado][mv.especial] < PELIGROS[mv.especial].max) ||
        ((mv.especial === "despejar" || mv.especial === "limpieza") && CAMPO.lados && hayPeligros(CAMPO.lados[atacante.lado])) ||
        (mv.especial === "espacioRaro" && !CAMPO.espacioRaro && velEfectiva(atacante) < velEfectiva(defensor)) ||
        (mv.especial === "terreno" && terrenoEnCampo() !== TERRENO_MOV[mv.clave]) ||
        (mv.especial === "bostezo" && !defensor.estado && !defensor.bostezo && !inmuneEstadoHab(defensor, "dor", atacante)) ||
        (mv.especial === "otraVez" && !defensor.otraVez && defensor.ultimoMov && !NO_OTRA_VEZ.has(defensor.ultimoMov) &&
            (defensor.movimientos.find((x) => x.clave === defensor.ultimoMov) || {}).cat === "est") ||
        (["shell-smash", "victory-dance", "shelter", "take-heart", "acupressure", "stockpile"].includes(mv.especial) && atacante.hp > atacante.hpMax * 0.6 && subidas(atacante) < 3) ||
        (mv.especial === "curse" && !atacante.tipos.includes("ghost") && atacante.hp > atacante.hpMax * 0.6 && subidas(atacante) < 3) ||
        (["strength-sap", "lunar-blessing", "jungle-healing"].includes(mv.especial) && atacante.hp < atacante.hpMax * 0.5) ||
        (["torment", "heal-block", "embargo", "spite", "topsy-turvy", "gastro-acid", "worry-seed", "soak", "simple-beam", "trick-or-treat", "forests-curse", "magic-powder",
            "spicy-extract", "laser-focus", "metronome", "nature-power", "copycat", "mirror-move", "assist", "celebrate", "splash"].includes(mv.especial) && azarC() < 0.15) ||
        (mv.especial === "nightmare" && defensor.estado && defensor.estado.tipo === "dor" && !defensor.pesadilla) ||
        (mv.especial === "dividir" && atacante.hp < atacante.hpMax * 0.5 && defensor.hp > atacante.hp * 1.6) ||
        (mv.especial === "tambor" && atacante.hp > atacante.hpMax * 0.75 && atacante.etapas.atk < 6 && golpeMaximo(defensor, atacante) < atacante.hp * 0.4) ||
        (mv.especial === "deseo" && atacante.hp < atacante.hpMax * 0.6 && CAMPO.lados && !CAMPO.lados[atacante.lado].deseo) ||
        (mv.especial === "sustituto" && !atacante.sustituto && atacante.hp > atacante.hpMax * 0.5 && golpeMaximo(defensor, atacante) < Math.floor(atacante.hpMax / 4)) ||
        (mv.especial === "niebla" && (hayCambios(defensor, 1) || hayCambios(atacante, -1))) ||
        (mv.especial === "descanso" && atacante.hp < atacante.hpMax * 0.4 && !(atacante.estado && atacante.estado.tipo === "dor")) ||
        (mv.especial === "arrastrar" && CAMPO.quedan && CAMPO.quedan(defensor.lado) > 1 && (hayCambios(defensor, 1) || hayPeligros(CAMPO.lados && CAMPO.lados[defensor.lado]))) ||
        (mv.especial === "anular" && !defensor.anulado && defensor.ultimoMov && (defensor.movimientos.find((x) => x.clave === defensor.ultimoMov) || {}).cat !== "est") ||
        (mv.especial === "atraccion" && !defensor.enamorado && generosOpuestos(atacante, defensor) && defensor.habilidad !== "oblivious") ||
        ((mv.especial === "arraigo" || mv.especial === "acuaAro") && !atacante[mv.especial] && atacante.hp < atacante.hpMax * 0.85) ||
        (mv.especial === "bloqueo" && !defensor.atrapado && !defensor.tipos.includes("ghost") && CAMPO.quedan && CAMPO.quedan(defensor.lado) > 1) ||
        ((mv.especial === "veloSagrado" || mv.especial === "neblina") && CAMPO.lados && !CAMPO.lados[atacante.lado][mv.especial] && azarC() < 0.4) ||
        (mv.especial === "foco" && !atacante.foco) ||
        (mv.especial === "fijar" && !atacante.fijado && movs.some((x) => x.cat !== "est" && (x.prec || 1) < 0.85)) ||
        (mv.especial === "campana" && !!atacante.estado) ||
        (mv.especial === "masPsique" && Object.values(defensor.etapas).reduce((s, v) => s + v, 0) > Object.values(atacante.etapas).reduce((s, v) => s + v, 0) + 1) ||
        ((mv.especial === "legado" || mv.especial === "deseoCura") && atacante.hp < atacante.hpMax * 0.25 && CAMPO.quedan && CAMPO.quedan(atacante.lado) > 1) ||
        (mv.especial === "transformar" && !atacante.transformado) ||
        (mv.estado && !defensor.estado && !ESTADOS[mv.estado.tipo].inmunes.some((t) => defensor.tipos.includes(t)) && !inmuneEstadoHab(defensor, mv.estado.tipo, atacante) && efectividad(mv.tipo, defensor.tipos) > 0) ||
        (mv.cambios && Object.entries(mv.cambios.stats).every(([k, v]) => Math.abs((mv.cambios.objetivo === "yo" ? atacante : defensor).etapas[k] + v) <= 2))));
    const apuros = atacante.hp < atacante.hpMax * 0.35;
    // Mismo Destino: en apuros y más rápida que el rival, para llevárselo por delante.
    const destino = movs.find((mv) => mv.especial === "destiny-bond");
    if (destino && atacante.hp < atacante.hpMax * 0.25 && atacante._movPrevio !== "destiny-bond" && (velEfectiva(atacante) > velEfectiva(defensor)) !== (CAMPO.espacioRaro > 0) && azarC() < 0.6) return destino;
    if (utilEstado.length && azarC() < (atenta ? (apuros ? 0.08 : 0.25) : 0.3)) return alAzarC(utilEstado);
    // Con trampas en su campo, a menudo las quita (Giro Rápido, Giro Mortal).
    const giro = CAMPO.lados && hayPeligros(CAMPO.lados[atacante.lado]) && ataques.find((mv) => QUITA_PELIGROS.has(mv.clave) && valor.get(mv) > 0);
    if (giro && azarC() < 0.5) return giro;
    // Su ataque que más daño hace (con el que casi siempre va, según la dificultad).
    let mejor = ataques[0] || movs[0], mejorVal = -1;
    ataques.forEach((mv) => { if (valor.get(mv) > mejorVal) { mejorVal = valor.get(mv); mejor = mv; } });
    return azarC() < precision ? mejor : alAzarC(ataques.length ? ataques.concat(mejor) : movs);
}

// ===================== PANTALLA DE EQUIPO (como el menú de equipo de PokéRogue) =====================
// Misma disposición y gráficos que PokéRogue (lienzo de 320×180 escalado a píxeles):
// el primero en la ranura grande de la izquierda y el resto en la lista de la derecha.
// miembros: [{ id, nombre, nivel, genero, hp, hpMax, shiny, estado, objeto }]
// o: { mensaje, flotante, cancelable, textoCancelar, alCancelar(), opciones(i) → [{ txt, fn }], alElegir(i), mover, etiqueta(i) }
const PR_UI = (r) => prURL("images/ui/" + r);
function montarPantallaEquipo(cont, miembros, o = {}) {
    const U = (n) => `calc(var(--u) * ${n})`;
    const raiz = document.createElement("div");
    raiz.className = "pe" + (o.flotante ? " pe-flotante" : "");
    const ranura = (p, i) => {
        const principal = i === 0;
        const pos = principal ? { x: 9, y: 31.5 } : { x: 143, y: -16 + 28 * i };
        const posV = principal ? { x: 12, y: 8 } : { x: 10, y: 36 + 26 * i };   // vertical (móvil)
        const L = principal
            ? { pb: [4, 4], nombre: [24, 10], nv: [32, 22], genero: [100, 13], estado: [87, 22], barra: [8, 31], ancho: 110, obj: [8, 10] }
            : { pb: [2, 12], nombre: [21, 2], nv: [29, 14], genero: [65, 14], estado: [72, 14], barra: [72, 6], ancho: 175, obj: [11, 15] };
        const ratio = p.hpMax ? Math.max(0, p.hp) / p.hpMax : 1;
        const vida = ratio > 0.5 ? "" : ratio > 0.25 ? "media" : "baja";
        const clases = ["pe-slot", principal ? "pe-principal" : "pe-banco", p.hp <= 0 ? "ko" : "", o.mover === i ? "mover" : ""].join(" ");
        const etq = o.etiqueta ? o.etiqueta(i) : null;
        const salud = etq != null
            ? `<span class="pe-txt pe-etiqueta" style="left:${U(L.barra[0] + 2)};top:${U(L.barra[1] + (principal ? 3 : 1))}">${etq}</span>`
            : `<span class="pe-barra" style="left:${U(L.barra[0])};top:${U(L.barra[1])}"></span>
            <span class="pe-lbl-ps" style="left:${U(L.barra[0] + 2)};top:${U(L.barra[1])}"></span>
            <span class="pe-vida ${vida}" style="left:${U(L.barra[0] + 16)};top:${U(L.barra[1] + 2)};width:${U(80 * ratio)}"></span>
            <span class="pe-txt pe-ps" style="right:${U(L.ancho - L.barra[0] - 97)};top:${U(L.barra[1] + 5)}">${Math.max(0, p.hp)}/${p.hpMax}</span>`;
        return `<button class="${clases}" data-i="${i}" style="--x:${pos.x};--y:${pos.y};--xv:${posV.x};--yv:${posV.y}">
            <span class="pe-pb" style="left:${U(L.pb[0] - 10)};top:${U(L.pb[1] - 11)}"></span>
            <span class="pe-icono-caja" style="left:${U(L.pb[0] - 20)};top:${U(L.pb[1] - 17)}">${htmlIcono(p.id, "", p.shiny, p.forma)}</span>
            ${p.objeto ? `<img class="pe-objeto" src="${urlObj(p.objeto)}" alt="" title="${obj(p.objeto).nombre}" style="left:${U(L.obj[0])};top:${U(L.obj[1])}">` : ""}
            <span class="pe-txt pe-nombre" style="left:${U(L.nombre[0])};top:${U(L.nombre[1])}">${p.nombre}</span>
            <span class="pe-lbl-nv" style="left:${U(L.nv[0])};top:${U(L.nv[1])}"></span>
            <span class="pe-txt" style="left:${U(L.nv[0] + 9)};top:${U(L.nv[1])}">${p.nivel}</span>
            ${p.genero ? `<span class="pe-txt pe-genero ${p.genero}" style="left:${U(L.genero[0])};top:${U(L.genero[1])}">${p.genero === "f" ? "♀" : "♂"}</span>` : ""}
            ${p.estado && FILA_ESTADO[p.estado] ? `<span class="pe-estado" style="left:${U(L.estado[0])};top:${U(L.estado[1])};background-position:0 ${U(-8 * FILA_ESTADO[p.estado])}"></span>` : ""}
            ${salud}
        </button>`;
    };
    raiz.innerHTML = `<div class="pe-lienzo">
        ${miembros.map(ranura).join("")}
        <div class="pe-mensaje"><span>${o.mensaje || ""}</span></div>
        ${o.cancelable !== false ? `<button class="pe-cancelar"><span class="pe-pb"></span><span class="pe-txt">${o.textoCancelar || "Salir"}</span></button>` : ""}
        <div class="pe-opciones oculta"></div>
    </div>`;
    cont.appendChild(raiz);
    pintarIconos(raiz);
    // Escala de píxeles limpia según el hueco disponible; en pantallas estrechas, en vertical.
    const escalar = () => {
        const r = cont.getBoundingClientRect();
        const vertical = r.width < 480;
        raiz.classList.toggle("pe-vertical", vertical);
        let u = Math.min(r.width / (vertical ? 186 : 320), o.flotante ? r.height / (vertical ? 237 : 180) : 3.5);
        u = u >= 2 ? Math.floor(u * 2) / 2 : Math.max(1, u);
        raiz.style.setProperty("--u", u + "px");
    };
    escalar();
    const ro = new ResizeObserver(escalar); ro.observe(cont);
    const opcionesEl = raiz.querySelector(".pe-opciones");
    const deseleccionar = () => { raiz.querySelectorAll(".pe-slot.sel").forEach((b) => b.classList.remove("sel")); opcionesEl.classList.add("oculta"); };
    raiz.querySelectorAll(".pe-slot").forEach((b) => b.onclick = () => {
        const i = Number(b.dataset.i);
        AudioFX.ui("select");
        if (o.alElegir) return o.alElegir(i);
        deseleccionar(); b.classList.add("sel");
        const ops = (o.opciones ? o.opciones(i) : []).concat([{ txt: "Cancelar", fn: deseleccionar }]);
        opcionesEl.innerHTML = ops.map((x, k) => `<button class="pe-op" data-k="${k}">${x.txt}</button>`).join("");
        opcionesEl.classList.remove("oculta");
        opcionesEl.querySelectorAll(".pe-op").forEach((x) => x.onclick = (ev) => { ev.stopPropagation(); AudioFX.ui("select"); ops[Number(x.dataset.k)].fn(); });
    });
    const bc = raiz.querySelector(".pe-cancelar");
    if (bc) bc.onclick = () => { AudioFX.ui("select"); if (o.alCancelar) o.alCancelar(); };
    return {
        cerrar() { ro.disconnect(); raiz.remove(); },
        mensaje(txt) { raiz.querySelector(".pe-mensaje span").textContent = txt; },
    };
}

// ===================== COMBATE =====================
const Combate = (() => {
    let capa, mensajeEl, accionesEl, movesEl, equipoMenuEl;
    let aliados = [], enemigos = [];
    let iAliado = 0, iEnemigo = 0;
    let opts = {};
    let bloqueado = false;
    let activo = false;   // true mientras la batalla existe; frena turnos huérfanos
    let racha = 0;
    let turno = 1;                         // turnos del combate (Turno Ball, Veloz Ball)
    // Poderes: Megaevolución, movimiento Z, Dinamax o Teracristal; uno por entrenador y combate. poderSel: el que tienes marcado.
    const poder = { aliado: null, rival: null };
    let poderSel = null;

    const aliadoActivo  = () => aliados[iAliado];
    const enemigoActivo = () => enemigos[iEnemigo];
    const quedanAliados  = () => aliados.some((p) => p.hp > 0);
    const $ = (id) => document.getElementById(id);
    const escenaEl = () => capa.querySelector(".batalla-escena");
    const efectosEl = () => $("capa-efectos");
    // Multijugador: cuando el orden no lo decide el juego (empates y efectos de los dos a la vez), primero el anfitrión,
    // para que las dos partidas hagan lo mismo en el mismo orden.
    const primeroYo = () => !opts.pvp || opts.pvp.anfitrion;
    const ordenFijo = () => (primeroYo() ? [true, false] : [false, true]);
    const ordenVel = () => {
        const a = velEfectiva(aliadoActivo()), e = velEfectiva(enemigoActivo());
        return (a !== e && (a > e) !== (CAMPO.espacioRaro > 0)) || (a === e && primeroYo()) ? [true, false] : [false, true];
    };
    let movRivalPvP = null, cambioPvP = -1, terminado = false, ultimoMovCampo = null;
    const spriteEl = (esAliado) => $(esAliado ? "sprite-aliado" : "sprite-enemigo");

    async function anim(el, kf, o) {
        const dur = ((o && o.duration) || 400) / velJuego();
        const a = el.animate(kf, Object.assign({ fill: "forwards" }, o, { duration: dur }));
        await pausa(dur + 20);
        try { a.finish(); a.commitStyles(); a.cancel(); } catch (_) {}   // siempre queda en el estado final
    }
    function resetTransform(s) { if (s) { s.style.transform = ""; s.style.filter = ""; } }
    // Mensajes que aparecen letra a letra, como en los juegos.
    function ponerMensaje(txt) { if (!mensajeEl) return; clearInterval(mensajeEl._tw); mensajeEl._tok = null; mensajeEl.textContent = txt; }
    async function decir(txt, ms = 950) {
        if (!activo || !mensajeEl) return;
        anunciarSR(txt);
        mensajeEl.classList.remove("info-mov");   // (los datos de un movimiento, con letra pequeña, ya no se ven)
        refrescarFichas();
        clearInterval(mensajeEl._tw);
        const tok = mensajeEl._tok = {};
        let i = 0;
        ms /= velJuego();
        const paso = Math.max(1, Math.ceil(txt.length / Math.max(8, (ms * 0.45) / 16)));
        mensajeEl.textContent = "";
        mensajeEl._tw = setInterval(() => {
            i = Math.min(txt.length, i + paso);
            mensajeEl.textContent = txt.slice(0, i);
            if (i >= txt.length) clearInterval(mensajeEl._tw);
        }, 16);
        await pausa(ms);
        if (mensajeEl._tok === tok && mensajeEl.textContent !== txt && activo) ponerMensaje(txt);
    }

    // ---------- Música según el rival ----------
    function musicaRival() {
        if (opts.musica) return opts.musica;
        if (!opts.salvaje) {
            if (!opts._musicaEnt) { opts._musicaEnt = temaEntrenador(true); AudioFX.precargarMusica([temaEntrenador()]); }   // y el del siguiente, listo
            return opts._musicaEnt;
        }
        const e = enemigos.find((x) => esLegendario(x.baseId)) || enemigoActivo();
        if (e.furioso) return MUSICA.salvajeFuerte;
        return musicaSalvaje(e.baseId, e.nivel, aliados[0] ? aliados[0].nivel : 0);
    }
    function fanfarriaVictoria(capturado) {
        if (capturado) return MUSICA.captura;
        if (opts.victoria) return opts.victoria;
        if (opts.salvaje && enemigos.some((e) => esLegendario(e.baseId))) return MUSICA.victoriaCampeon;
        return MUSICA.victoriaEntrenador;
    }

    // ---------- Iniciar ----------
    async function iniciar(config) {
        opts = config; opts._salido = false;
        aliados = config.aliados; enemigos = config.enemigos;
        aliados.forEach((p) => { p.nivelEntrada = p.nivel; });
        iAliado = Math.max(0, aliados.findIndex((p) => p.hp > 0));
        iEnemigo = Math.max(0, enemigos.findIndex((p) => p.hp > 0));
        bloqueado = true; racha = 0; turno = 1; poderSel = null;
        poder.aliado = null; poder.rival = null;
        CAMPO.clima = null; CAMPO.activos = () => [aliadoActivo(), enemigoActivo()];   // tiempo atmosférico y quién está en el campo
        CAMPO.lados = { a: ladoNuevo(), r: ladoNuevo() };   // pantallas, Viento Afín y trampas de cada bando
        CAMPO.espacioRaro = 0; CAMPO.terreno = null;
        CAMPO.quedan = (lado) => (lado === "a" ? aliados : enemigos).filter((p) => p.hp > 0).length;
        aliados.forEach((p) => { p.lado = "a"; }); enemigos.forEach((p) => { p.lado = "r"; });
        // Deja terminar la transición de entrada (script.js) antes de montar la escena.
        const falta = (window.cargaBatallaHasta || 0) - performance.now();
        window.cargaBatallaHasta = 0;
        if (falta > 0) await pausa(falta);
        azarC = config.pvp ? semillaAzar(config.pvp.semilla) : Math.random;
        movRivalPvP = null; cambioPvP = -1; terminado = false; ultimoMovCampo = null;
        // Multijugador: si el rival se rinde o se va mientras eliges, se sabe al momento (si estás esperando, ya lo recoge la espera).
        if (config.pvp && config.pvp.alFin) config.pvp.alFin((motivo) => { if (!terminado && !bloqueado) rivalAbandona(motivo); });
        capa = $("capa-batalla");
        capa.classList.remove("oculta", "cerrando", "en-transicion");
        document.body.style.overflow = "hidden";
        construirEscena();
        caja(false, false); caja(true, false);
        activo = true;
        document.removeEventListener("keydown", onTeclaBatalla);
        document.addEventListener("keydown", onTeclaBatalla);
        // La música empieza con el combate, sin esperar a que carguen los sprites.
        AudioFX.musicaSonar(opts.salvaje ? musicaRival() : opts.musicaEncuentro || musicaRival());
        precargarCombate();

        window.removeEventListener("resize", ajustarEscena);
        window.addEventListener("resize", ajustarEscena);
        window.removeEventListener("resize", aplicarDisposicion);
        window.addEventListener("resize", aplicarDisposicion);
        await Promise.all([renderEnemigo(true), renderAliado(true)]);
        spriteEl(false).style.opacity = "0";
        spriteEl(true).style.opacity = "0";
        const entrada = mostrarJugador();
        await presentarRival();
        await entrada;
        await lanzamientoJugador();
        await climaDelLugar();
        await entradasIniciales();
        mostrarAcciones();
    }
    function precargarCombate() {
        const claves = aliados.concat(enemigos).flatMap((p) => p.movimientos.map((mv) => mv.clave));
        AnimMov.precargar([...new Set(claves), "tackle", "common-health-up"]);
        MovSD.precargar().catch(() => {});
        AudioFX.precargar(["hit", "hit_strong", "hit_weak", "faint", "pb_throw", "pb_rel", "pb_move", "pb_lock", "pb_bounce_1", "pb_bounce_2", "pb_catch", "sparkle", "flee", "level_up_fanfare", "exp", "restore", "stat_up", "stat_down", "pb_tray_ball", "low_hp"]);
        // Lo que va a sonar: los gritos de todos, las fanfarrias y, contra entrenadores, su tema de combate.
        AudioFX.precargarGritos(aliados.concat(enemigos).map((p) => p.baseId));
        AudioFX.precargarMusica([fanfarriaVictoria(false), opts.permitirCaptura && MUSICA.captura, !opts.salvaje && musicaRival()]);
        // Poderes: el aura del Poder Z, la Teracristalización y los sprites de Gigamax, listos de antemano.
        cargarImagen(Z_FX).catch(() => {});
        AnimMov.precargar(["common-terastallize"]);
        aliados.concat(enemigos).filter((p) => GMAX[p.baseId]).forEach((p) => precargarSprite(candidatosGmax(p.baseId, aliados.includes(p), p.shiny)));
        precargarPoderes();
        // Si alguien puede megaevolucionar: la animación, sus sonidos, los datos y el sprite de la mega, listos de antemano.
        const megas = aliados.concat(enemigos).filter((p) => p.puedeMega);
        if (!megas.length) return;
        [MEGA_FX.orbe, MEGA_FX.estallido, MEGA_FX.fondo, MEGA_FX.chispas, MEGA_FX.pulsera, MEGA_FX.destello].forEach((u) => cargarImagen(u).catch(() => {}));
        AudioFX.precargarUrls([MEGA_FX.sonido(1), MEGA_FX.sonido(2)]);
        AudioFX.precargarGritos(megas.map((p) => urlGritoMega(megaDeC(p))));
        megas.forEach((p) => {
            const info = megaDeC(p);
            cargarPokemon(info.api).catch(() => {});
            precargarSprite(candidatosMega(info, aliados.includes(p), p.shiny));
        });
    }

    function construirEscena() {
        const base = opts.fondo || alAzar(FONDOS), fondo = fondoSegunHora(base);
        const hora = fondo === base && FONDOS_EXTERIOR.includes(fondo) && typeof claseHora === "function" ? "hora-" + claseHora() : "";
        capa.innerHTML = `
            <div class="batalla-escena">
                <div class="fondo-batalla ${hora}"><img class="fondo-img" src="${urlFondo(fondo)}" alt="" onerror="this.style.display='none'"></div>
                <div class="clima-fondo" id="clima-fondo"></div>
                <div class="vineta-dinamax" id="vineta-dinamax"></div>
                <div class="velo-poderoso" id="velo-poderoso"></div>
                <div class="terreno-batalla" id="terreno-batalla"></div>
                <div class="espacio-raro-batalla" id="espacio-raro-batalla"></div>
                <div class="capa-anim-fondo" id="capa-anim-fondo"></div>
                <div class="capa-anim-detras" id="capa-anim-detras"></div>
                <div class="caja-hp caja-enemigo" id="caja-enemigo"></div>
                <div class="caja-hp caja-aliado" id="caja-aliado"></div>
                <div class="puesto puesto-enemigo"><div class="soporte soporte-enemigo"><img class="sprite sprite-enemigo" id="sprite-enemigo" alt=""><img class="muneco" id="muneco-r" alt="" src="https://play.pokemonshowdown.com/sprites/substitutes/gen5/substitute.png"></div><div class="trampas" id="trampas-r"></div></div>
                <div class="puesto puesto-aliado"><div class="soporte soporte-aliado"><img class="sprite sprite-aliado" id="sprite-aliado" alt=""><img class="muneco" id="muneco-a" alt="" src="https://play.pokemonshowdown.com/sprites/substitutes/gen5-back/substitute.png"></div><div class="trampas" id="trampas-a"></div></div>
                <canvas class="entrenador-sprite oculta" id="entrenador-sprite"></canvas>
                <canvas class="jugador-sprite oculta" id="jugador-sprite"></canvas>
                <div class="capa-bola oculta" id="capa-bola"><img class="bola-throw" src="${urlItem("poke-ball")}" alt=""></div>
                <div class="capa-efectos" id="capa-efectos"></div>
                <button class="btn-velocidad" id="btn-velocidad" data-velocidad aria-label="Velocidad del juego"></button>
                <div class="esquina-batalla"><div class="reloj-pvp oculta" id="reloj-pvp" title="Tiempo para elegir"></div><div class="clima-batalla oculta" id="clima-batalla"></div></div>
                <button class="btn-disposicion" id="btn-disposicion" title="Cambiar la disposición de las pantallas" aria-label="Cambiar la disposición de las pantallas">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2.5" y="4" width="11" height="16" rx="2"/><rect x="15.5" y="4" width="6" height="16" rx="2"/></svg>
                </button>
            </div>
            <div class="batalla-ui">
                <div class="mensaje-batalla" id="mensaje-batalla"></div>
                <div class="acciones-batalla" id="acciones-batalla"></div>
                <div class="menu-moves oculta" id="menu-moves"></div>
                <div class="menu-equipo oculta" id="menu-equipo"></div>
            </div>`;
        mensajeEl = $("mensaje-batalla");
        accionesEl = $("acciones-batalla");
        movesEl = $("menu-moves");
        equipoMenuEl = $("menu-equipo");
        aplicarDisposicion();
        // Acelerador ×1 → ×2 → ×3 (también con la tecla V).
        $("btn-velocidad").onclick = () => { if (typeof cambiarVelocidad === "function") cambiarVelocidad(); };
        if (typeof pintarVelocidad === "function") pintarVelocidad();
        $("btn-disposicion").onclick = () => {
            if (typeof config === "undefined") return;
            config.disposicion = config.disposicion === "horizontal" ? "vertical" : "horizontal";
            if (typeof guardarConfig === "function") guardarConfig();
            AudioFX.ui("select");
            aplicarDisposicion();
        };
    }
    // Pantalla de arriba a la izquierda y la de abajo a la derecha (si cabe), para que nada necesite scroll.
    // Con el móvil en horizontal la de abajo no cabe debajo: siempre lado a lado y más compacta.
    function aplicarDisposicion() {
        if (!capa) return;
        const apaisado = window.innerWidth > window.innerHeight, bajo = apaisado && window.innerHeight < 560;
        const cabe = apaisado && (window.innerWidth >= 820 || bajo);
        capa.classList.toggle("horizontal", cabe && (bajo || (typeof config !== "undefined" && config.disposicion === "horizontal")));
        capa.classList.toggle("compacta", cabe && bajo);
        setTimeout(ajustarEscena, 30);
    }

    // ---------- Fichas ----------
    function htmlBolas(equipo, esAliado) {
        if (!esAliado && opts.salvaje) return "";
        return (equipo || []).map((p) => {
            return `<img class="bola-mini ${p.hp > 0 ? "" : "ko"}" src="${urlObj(esAliado ? p.bola || "poke-ball" : "poke-ball")}" alt="" draggable="false">`;
        }).join("");
    }
    const colorPS = (pct) => (pct > 50 ? "verde" : pct > 20 ? "amarillo" : "rojo");
    const htmlEstado = (c) => (c.estado ? `<span class="hp-estado">${iconoEstado(c.estado.grave ? "tox" : c.estado.tipo, 2)}</span>` : "");
    const htmlEtapas = (c) => Object.entries(c.etapas || {}).filter(([, v]) => v)
        .map(([k, v]) => `<span class="hp-etapa ${v > 0 ? "sube" : "baja"}">${ABREV_STAT[k]} ${v > 0 ? "+" : "−"}${Math.abs(v)}</span>`).join("")
        + htmlEfectos(c);
    // Lo que afecta a su bando (pantallas, Viento Afín, trampas) y a él (confusión, drenadoras, Mofa, atrapado), con sus turnos.
    function htmlEfectos(c) {
        const out = [], l = CAMPO.lados && CAMPO.lados[c.lado];
        if (l) {
            if (l.reflejo) out.push(["Reflejo", l.reflejo]);
            if (l.pantallaLuz) out.push(["Pantalla de Luz", l.pantallaLuz]);
            if (l.veloAurora) out.push(["Velo Aurora", l.veloAurora]);
            if (l.vientoAfin) out.push(["Viento Afín", l.vientoAfin]);
            if (l.veloSagrado) out.push(["Velo Sagrado", l.veloSagrado]);
            if (l.neblina) out.push(["Neblina", l.neblina]);
            if (l.futuro) out.push([l.futuro.mov.nombre]);
            if (l.rocas) out.push(["Trampa Rocas"]);
            if (l.acero) out.push(["Púas de acero"]);
            if (l.gmax) out.push([l.gmax.nombre, l.gmax.turnos]);
            if (l.puas) out.push([l.puas > 1 ? `Púas ×${l.puas}` : "Púas"]);
            if (l.toxicas) out.push([l.toxicas > 1 ? `Púas Tóxicas ×${l.toxicas}` : "Púas Tóxicas"]);
            if (l.red) out.push(["Red Viscosa"]);
            if (l.deseo) out.push(["Deseo"]);
        }
        if (c.confuso) out.push(["Confuso"]);
        if (c.drenado) out.push(["Drenadoras"]);
        if (c.mofa > 0) out.push(["Mofa", c.mofa]);
        if (c.atrapado) out.push([c.atrapado.mov]);
        if (c.otraVez) out.push(["Otra Vez", c.otraVez.turnos]);
        if (c.bostezo) out.push(["Somnoliento"]);
        if (c.sustituto > 0) out.push(["Sustituto"]);
        if (c.enamorado) out.push(["Enamorado"]);
        if (c.anulado) out.push([`${c.anulado.nombre} anulado`, c.anulado.turnos]);
        if (c.arraigo) out.push(["Arraigo"]);
        if (c.acuaAro) out.push(["Acua Aro"]);
        if (c.foco) out.push(["Foco Energía"]);
        if (c.transformado) out.push(["Transformado"]);
        if (c.dinamax) out.push([c.dinamax.gmax ? "Gigamax" : "Dinamax", c.dinamax.turnos]);
        return out.map(([t, n]) => `<span class="hp-campo">${t}${n ? ` <b>${n}</b>` : ""}</span>`).join("");
    }
    // Las etiquetas y el tiempo, al día: cada cosa que cambia va con su mensaje, así que se repasan en cada uno.
    function refrescarFichas() {
        for (const esAli of [true, false]) {
            const c = activoDe(esAli), caja = $(esAli ? "caja-aliado" : "caja-enemigo"), t = caja && caja.querySelector("[data-etapas]");
            if (!c || !t) continue;
            const h = htmlEtapas(c);
            if (t._h !== h) { t.innerHTML = h; t._h = h; }
        }
        pintarClima();
    }
    // Ficha de combate (databox) estilo Blanco/Negro 2: nombre, género, estado y nivel;
    // medidor de PS con su etiqueta; y en tu Pokémon, barra de EXP y PS numéricos.
    function cajaHP(c, esAliado, equipo) {
        const pct = (c.hp / c.hpMax) * 100;
        const genero = c.genero ? `<span class="hp-genero ${c.genero}">${c.genero === "f" ? "♀" : "♂"}</span>` : "";
        const registrado = !esAliado && opts.salvaje && opts.yaCapturado && opts.yaCapturado(c.baseId)
            ? `<img class="hp-registrado" src="${urlItem("poke-ball")}" alt="Ya capturado" title="Ya lo tienes registrado">` : "";
        const pie = esAliado ? `<div class="hp-pie">
                <div class="xp-fila"><span class="xp-etq">EXP</span><div class="xp-barra"><span class="xp-relleno" style="width:${Math.min(100, (c.xp / c.xpProx) * 100)}%"></span></div></div>
                <div class="hp-num"><b data-hp>${c.hp}</b><span>/${c.hpMax}</span></div>
            </div>` : "";
        return `<div class="caja-bolas" data-bolas>${htmlBolas(equipo, esAliado)}</div>
            <div class="caja-tipos">${c.tipos.map((t) => iconoTipo(t, 2)).join("")}</div>
            <div class="caja-etapas" data-etapas>${htmlEtapas(c)}</div>
            <div class="hp-cabecera">
                ${registrado}<span class="hp-nombre${c.furioso ? " furioso" : ""}">${c.nombre}</span>${genero}${c.esMega ? `<img class="hp-mega" src="${EBDX_FX}Animations/Moves/ebMega007.png" alt="" title="Megaevolución">` : ""}${c.teracristal ? `<img class="hp-tera" src="${urlTera(c.teracristal)}" alt="" title="Teratipo ${TIPOS_ES[c.teracristal]}">` : ""}${c.shiny ? `<img class="hp-shiny" src="${PR_UI("shiny_small.png")}" alt="Variocolor" title="Variocolor">` : ""}
                <span class="hp-hueco" data-estado>${htmlEstado(c)}</span>
                <span class="hp-nivel"><small>Nv.</small>${c.nivel}</span>
            </div>
            <div class="hp-fila"><span class="hp-etq">PS</span><div class="hp-barra"><span class="hp-relleno ${colorPS(pct)}" style="width:${pct}%"></span></div></div>
            ${pie}`;
    }
    function pintarCaja(caja, c, esAliado, equipo) {
        caja.innerHTML = cajaHP(c, esAliado, equipo);
        caja.dataset.tipo = c.tipos[0];
        marcarPSBajos(caja, c, esAliado);
    }
    function marcarPSBajos(caja, c, esAliado) {
        const bajos = c.hp > 0 && c.hp / c.hpMax <= 0.2;
        caja.classList.toggle("baja", bajos);
        if (esAliado) AudioFX.alarma(bajos && activo && !caja.classList.contains("fuera"));
    }
    function actualizarEstadoCaja(esAliado) {
        const c = esAliado ? aliadoActivo() : enemigoActivo();
        const caja = $(esAliado ? "caja-aliado" : "caja-enemigo"); if (!caja) return;
        const e = caja.querySelector("[data-estado]"); if (e) e.innerHTML = htmlEstado(c);
        const t = caja.querySelector("[data-etapas]"); if (t) t.innerHTML = htmlEtapas(c);
    }
    // Los PS bajan contando, como en los juegos.
    function contarPS(el, fin) {
        const ini = Number(el.textContent) || 0;
        clearInterval(el._tim);
        if (ini === fin) return;
        const t0 = performance.now(), dur = Math.min(700, 120 + Math.abs(fin - ini) * 12) / velJuego();
        el._tim = setInterval(() => {   // temporizador (sigue aunque la pestaña no se esté pintando)
            const k = Math.min(1, (performance.now() - t0) / dur);
            el.textContent = Math.round(ini + (fin - ini) * k);
            if (k >= 1) clearInterval(el._tim);
        }, 30);
    }
    // El sprite se monta oculto: solo aparece cuando sale de su Poké Ball o entra en escena
    // (antes se veía un instante mientras cargaba el del otro lado).
    // El muñeco del sustituto ocupa el sitio del Pokémon mientras dura.
    function ponerMuneco(esAli, on) {
        const m = $(esAli ? "muneco-a" : "muneco-r"), s = spriteEl(esAli); if (!m) return;
        m.style.width = Math.round(96 * zoomEscena(esAli)) + "px";
        m.classList.toggle("activo", !!on);
        if (s) s.classList.toggle("con-sustituto", !!on);
    }
    async function montarCombatiente(esAliado, c, visible = false) {
        ponerMuneco(esAliado, false);
        const el = spriteEl(esAliado); if (!el) return;
        el.style.cssText = "opacity:0"; el.classList.remove("debilitado", "recibe");
        const t = c.transformado;   // (transformado: el aspecto del otro)
        const nuevo = await montarPokemon(el, t ? t.id : c.baseId, { espalda: esAliado, shiny: c.shiny, mega: t ? t.mega : c.megaInfo || c.megaSprite,
            gmax: !!(c.dinamax && c.dinamax.gmax) });
        if (visible && nuevo) nuevo.style.opacity = "1";
        pintarPoderes(esAliado, c);
        if (activo) ajustarEscena();
    }
    // Dinamax (gigante, con su brillo rojo), Furia Carmesí (la misma energía, carmesí) y Teracristal (brillo del cristal de su
    // teratipo): sobre el sitio del Pokémon.
    const soporteEl = (esAli) => capa && capa.querySelector(esAli ? ".soporte-aliado" : ".soporte-enemigo");
    function pintarPoderes(esAli, c = activoDe(esAli)) {
        const s = soporteEl(esAli); if (!s) return;
        const dx = !!(c && c.dinamax), tera = !!(c && c.teracristal), furia = !!(c && c.furioso && c.hp > 0 && !dx);
        s.classList.toggle("dinamax", dx);
        // Dinamaxizado, la energía roja no deja de salir de él (el aura del Poder Z de PokéRogue, en rojo); furioso, carmesí.
        let au = s.querySelector(".aura-dinamax");
        if ((dx || furia) && !au) { au = document.createElement("div"); au.className = "aura-dinamax"; au.style.backgroundImage = `url("${Z_FX}")`; s.prepend(au); }
        else if (!dx && !furia && au) au.remove();
        if (au) au.classList.toggle("furia", furia);
        if (tera) {
            s.style.setProperty("--tera", COLOR_TERA[c.teracristal] || "#fff");
            filtroTera(esAli ? "tera-fx-a" : "tera-fx-r", spriteEl(esAli), c.teracristal);
            chispasTera();
        }
        s.classList.toggle("tera", tera);
        // Teracristalizado: la joya de su teratipo flota sobre su cabeza (como la corona de Escarlata y Púrpura).
        let corona = s.querySelector(".tera-corona-fija");
        if (tera && !corona) { corona = document.createElement("img"); corona.className = "tera-corona-fija"; corona.alt = ""; s.appendChild(corona); }
        if (corona) { if (tera) { corona.src = urlTera(c.teracristal); corona.style.setProperty("--tera", COLOR_TERA[c.teracristal] || "#fff"); } else corona.remove(); }
        if (dx) brasasDinamax();
        // (con un Pokémon dinamaxizado en el campo, el cielo se tiñe de la energía roja, como en Espada y Escudo)
        const v = $("vineta-dinamax");
        if (v) v.classList.toggle("activa", [true, false].some((ea) => { const x = ea === esAli ? c : activoDe(ea); return !!(x && x.dinamax && x.hp > 0); }));
        if (activo) ajustarEscena(); else ajustarPoderes();
    }
    // El aura y la textura de cristal, a la medida del sprite.
    function ajustarPoderes() {
        for (const esAli of [true, false]) {
            const s = soporteEl(esAli), sp = spriteEl(esAli), c = activoDe(esAli); if (!s || !sp) continue;
            const au = s.querySelector(".aura-dinamax");
            if (au) au.style.setProperty("--k", (Math.max(sp.offsetWidth, sp.offsetHeight, 48) * 1.15 / 96).toFixed(3));
            if (c && c.teracristal) filtroTera(esAli ? "tera-fx-a" : "tera-fx-r", sp, c.teracristal);
        }
    }
    // Tamaño como en Blanco/Negro: píxeles nativos del sprite × un zoom según la escena
    // (así ningún Pokémon sale diminuto y se respetan las proporciones entre especies).
    // Como en Blanco/Negro, tu Pokémon (de espalda, más cerca de la cámara) se ve bastante más grande que el rival;
    // en pantallas estrechas, algo menos, para que no tape su ficha.
    function zoomEscena(esAliado) {
        const e = escenaEl(); if (!e) return 2;
        const z = limitar(Math.round(Math.min(e.clientWidth / 300, e.clientHeight / 205) * 4) / 4, 1.5, 4);
        return esAliado ? z * (e.clientWidth < 520 ? 1.35 : 1.55) : z;
    }
    // Colocación como en Blanco/Negro: el rival sobre su plataforma arriba a la derecha y tu Pokémon
    // abajo a la izquierda, sin salirse de la escena por grande que sea (Wailord, Giratina…).
    function ajustarEscena() {
        const e = capa && escenaEl(); if (!e || !activo) return;
        const W = e.clientWidth, H = e.clientHeight;
        const en = spriteEl(false), al = spriteEl(true);
        tamanoNativo(en, zoomEscena(false), H * 0.42, W * 0.36);
        tamanoNativo(al, zoomEscena(true), H * 0.56, W * (W < 520 ? 0.44 : 0.48));
        tamanoNativo($("entrenador-sprite"), zoomEscena(false), H * 0.5);
        tamanoNativo($("jugador-sprite"), zoomEscena(false) * 1.12, H * 0.78);   // (el entrenador, como antes)
        const pe = e.querySelector(".puesto-enemigo"), pa = e.querySelector(".puesto-aliado");
        // (dinamaxizado, su soporte crece: cuenta para que no se salga de la escena)
        const crece = (ea) => { const c = soporteEl(ea); return c && c.classList.contains("dinamax") ? (ea ? 1.22 : 1.38) : 1; };   // (los de piel.css)
        const we = en ? en.offsetWidth * crece(false) : 0, wa = al ? al.offsetWidth * crece(true) : 0;
        if (pe) pe.style.left = Math.min(W * 0.72, W - we / 2 - W * 0.04) + "px";
        if (pa) pa.style.left = (W < 520 ? Math.max(W * 0.24, wa / 2 + W * 0.02) : Math.max(W * 0.27, wa / 2 + W * 0.04)) + "px";   // (en el móvil, algo más a la izquierda: no se mete bajo su ficha)
        e.style.setProperty("--plataforma", Math.round(100 * zoomEscena(false)) + "px");
        e.style.setProperty("--plataforma-aliado", Math.round(Math.max(wa * 1.15, 120 * zoomEscena(true))) + "px");
        for (const ea of [true, false]) { const mu = $(ea ? "muneco-a" : "muneco-r"); if (mu) mu.style.width = Math.round(96 * zoomEscena(ea)) + "px"; }
        ajustarPoderes();
        // El tiempo y el reloj (arriba a la derecha): si la ficha del rival llega hasta ahí (pantallas estrechas), debajo de ella.
        const esq = capa.querySelector(".esquina-batalla"), ce = $("caja-enemigo");
        if (esq && ce) {   // (medidas sin transformaciones: la ficha puede estar aún fuera de la pantalla, entrando)
            esq.style.top = ce.offsetLeft + ce.offsetWidth > e.clientWidth - 170 ? Math.round(ce.offsetTop + ce.offsetHeight + 8) + "px" : "";
        }
    }
    async function renderEnemigo(nuevo, visible = false) {
        const caja = $("caja-enemigo"); if (!caja) return;
        pintarCaja(caja, enemigoActivo(), false, enemigos);
        if (nuevo) await montarCombatiente(false, enemigoActivo(), visible);
    }
    async function renderAliado(nuevo, visible = false) {
        const caja = $("caja-aliado"); if (!caja) return;
        pintarCaja(caja, aliadoActivo(), true, aliados);
        if (nuevo) await montarCombatiente(true, aliadoActivo(), visible);
    }
    // Las fichas de PS aparecen cuando sale cada Pokémon (como en los juegos).
    function caja(esAliado, visible) {
        const c = $(esAliado ? "caja-aliado" : "caja-enemigo"); if (!c) return;
        const entra = visible && c.classList.contains("fuera");
        c.classList.toggle("fuera", !visible);
        if (esAliado && aliadoActivo()) marcarPSBajos(c, aliadoActivo(), true);
        // Las Poké Balls del equipo entran una a una, con el sonido real de la bandeja.
        if (entra) c.querySelectorAll(".bola-mini").forEach((b, i) => {
            b.style.animationDelay = (i * 70) + "ms"; b.classList.add("entra");
            setTimeout(() => AudioFX.efecto("pb_tray_ball", { vol: 0.3 }), i * 70);
        });
    }
    function renderBolas() {
        const upd = (equipo, sel, esAliado) => {
            const box = document.querySelector(sel); if (!box) return;
            const el = box.querySelector("[data-bolas]"); if (el) el.innerHTML = htmlBolas(equipo, esAliado);
        };
        upd(enemigos, ".caja-enemigo", false); upd(aliados, ".caja-aliado", true);
    }
    function animarBarraXP(c, ms = 400) {
        const fill = document.querySelector("#caja-aliado .xp-relleno"); if (!fill) return;
        fill.style.transition = ms ? `width ${ms}ms linear` : "none";
        fill.style.width = Math.min(100, (c.xp / c.xpProx) * 100) + "%";
    }
    function actualizarHP(esAliado) {
        const c = esAliado ? aliadoActivo() : enemigoActivo();
        const caja = $(esAliado ? "caja-aliado" : "caja-enemigo"); if (!caja) return;
        const pct = (c.hp / c.hpMax) * 100;
        const relleno = caja.querySelector(".hp-relleno");
        if (relleno) { relleno.style.width = pct + "%"; relleno.className = "hp-relleno " + colorPS(pct); }
        const num = caja.querySelector("[data-hp]");
        if (num) contarPS(num, c.hp);
        marcarPSBajos(caja, c, esAliado);
    }

    // ---------- Posiciones ----------
    function centroSprite(esAliado) {
        const s = spriteEl(esAliado), e = escenaEl();
        if (!s || !e) return { x: 0, y: 0 };
        const rs = s.getBoundingClientRect(), re = e.getBoundingClientRect();
        return { x: rs.left - re.left + rs.width / 2, y: rs.top - re.top + rs.height / 2 };
    }
    function piesSprite(esAliado) {
        const s = spriteEl(esAliado), e = escenaEl(); if (!s || !e) return centroSprite(esAliado);
        const rs = s.getBoundingClientRect(), re = e.getBoundingClientRect();
        return { x: rs.left - re.left + rs.width / 2, y: rs.top - re.top + rs.height - 6 };
    }
    function animarGolpe(esAliado) {
        const s = spriteEl(esAliado); if (!s) return;
        s.classList.add("recibe");
        setTimeout(() => s.classList.remove("recibe"), 520);
    }
    // Además, el golpe lo echa un poco hacia atrás (más si es crítico o muy eficaz), como en Elite Battle DX.
    function empujeGolpe(esAli, fuerza = 1) {
        const s = spriteEl(esAli); if (!s || !conCamara() || typeof s.animate !== "function" || s.style.visibility === "hidden") return;
        const k = Math.max(4, Math.round(s.offsetWidth * 0.045)) * fuerza, dx = (esAli ? -1 : 1) * k, dy = (esAli ? 1 : -1) * k * 0.3;
        s.animate([{ translate: "0 0" }, { translate: `${dx.toFixed(1)}px ${dy.toFixed(1)}px`, offset: 0.2 },
                   { translate: `${(-dx * 0.25).toFixed(1)}px ${(-dy * 0.25).toFixed(1)}px`, offset: 0.6 }, { translate: "0 0" }],
            { duration: 340 / velJuego(), easing: "ease-out" });
    }

    // ---------- Luz de las Poké Balls y sus partículas (como en PokéRogue) ----------
    // Color de la luz de cada ball (los de PokéRogue); las demás, la roja de la Poké Ball.
    const TINTE_BOLA = { "poke-ball": "#d52929", "great-ball": "#94b4de", "ultra-ball": "#e6cd31", "master-ball": "#a441bd", "luxury-ball": "#ffde6a" };
    const colorBola = (bola) => TINTE_BOLA[bola] || TINTE_BOLA["poke-ball"];
    const SENO_IN = "cubic-bezier(0.47, 0, 0.745, 0.715)";   // (Sine.easeIn de PokéRogue)
    // Tiñe el sprite de un color (t de 0 a 1), como el tint de PokéRogue: una matriz de color en un filtro SVG.
    function filtroTinte(id, hex, t) {
        const svg = svgFx();
        let f = svg.querySelector("#" + id);
        if (!f) {
            svg.insertAdjacentHTML("beforeend", `<filter id="${id}" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0"/></filter>`);
            f = svg.querySelector("#" + id);
        }
        const n = parseInt(hex.slice(1), 16), u = 1 - t, c = [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255].map((x) => (x * t).toFixed(3));
        f.firstElementChild.setAttribute("values", `${u} 0 0 0 ${c[0]} 0 ${u} 0 0 ${c[1]} 0 0 ${u} 0 ${c[2]} 0 0 0 1 0`);
    }
    // Anima el tinte (de 'desde' a 'hasta') por encima de los filtros que ya tenga el sprite; al quitarlo del todo, se va.
    function tintar(s, esAli, hex, desde, hasta, ms) {
        const id = esAli ? "tinte-a" : "tinte-r";
        s.style.filter = "";
        const base = getComputedStyle(s).filter;
        filtroTinte(id, hex, desde);
        s.style.filter = (base && base !== "none" ? base + " " : "") + `url(#${id})`;
        const dur = Math.max(1, ms / velJuego()), t0 = performance.now();
        return new Promise((res) => {
            let hecho = false;
            const fin = () => {
                if (hecho) return; hecho = true;
                filtroTinte(id, hex, hasta);
                if (hasta === 0 && s.style.filter.includes(id)) s.style.filter = "";
                res();
            };
            const paso = (ahora) => {
                if (hecho) return;
                const p = Math.min(1, (ahora - t0) / dur);
                filtroTinte(id, hex, desde + (hasta - desde) * (1 - Math.cos((p * Math.PI) / 2)));
                if (p < 1) requestAnimationFrame(paso); else fin();
            };
            requestAnimationFrame(paso);
            setTimeout(fin, dur + 60);   // (con la pestaña oculta no hay fotogramas)
        });
    }
    // Al abrirse la ball salen sus partículas: destellos que se alejan girando (Poké Ball y, más lejos, Super Ball) o en abanico
    // en espiral (Ultra Ball y Master Ball, con estrellas).
    const PB_PARTICULAS = prURL("images/effects/pb_particles");
    async function particulasBola(x, y, bola) {
        const cont = efectosEl(); if (!cont || !activo) return;
        let a; try { a = await Atlas.cargar(PB_PARTICULAS); } catch (_) { return; }
        const z = escalaBola(), v = velJuego();
        const nueva = (fr) => {
            const cv = document.createElement("canvas");
            cv.width = a.w; cv.height = a.h; cv.className = "chispa-bola";
            cv.style.width = a.w * z + "px"; cv.style.left = x + "px"; cv.style.top = y + "px";
            Atlas.dibujar(cv, a, fr);
            cont.appendChild(cv);
            return cv;
        };
        const seno = (i, amp) => amp * Math.sin((i * Math.PI) / 128), coseno = (i, amp) => amp * Math.cos((i * Math.PI) / 128);
        if (bola === "ultra-ball" || bola === "master-ball") {
            const lista = [];
            if (bola === "ultra-ball") for (let i = 0; i < 10; i++) lista.push({ el: nueva(8), t: i * 25, vx: 1, vy: 1, giro: 5 });
            else for (let i = 0; i < 2; i++) for (let j = 0; j < 8; j++) lista.push({ el: nueva(4), t: j * 32, vx: i ? 1 : 2, vy: j ? 2 : 1, giro: 8 });
            const t0 = performance.now();
            const paso = (ahora) => {
                const ms = (ahora - t0) * v, f = ms / (1000 / 60);   // (sus fotogramas, a 60 por segundo)
                lista.forEach((p) => {
                    p.el.style.left = x + seno(p.t + p.giro * f, f * p.vx) * z + "px";
                    p.el.style.top = y + coseno(p.t + p.giro * f, f * p.vy) * z + "px";
                    p.el.style.opacity = ms < 750 ? "1" : String(Math.max(0, 1 - (ms - 750) / 250));
                });
                if (ms < 1000 && activo) requestAnimationFrame(paso); else lista.forEach((p) => p.el.remove());
            };
            requestAnimationFrame(paso);
            setTimeout(() => lista.forEach((p) => p.el.remove()), 1200 / v);
            return;
        }
        const radio = (bola === "great-ball" ? 96 : 48) * z;
        for (let n = 1; n <= 17; n++) setTimeout(() => {
            if (!activo) return;
            let fr = (n + 3) % 4;
            const cv = nueva(fr), ang = (n * 45 * Math.PI) / 180;
            const giro = setInterval(() => { fr = (fr + 1) % 4; Atlas.dibujar(cv, a, fr); }, 1000 / 16 / v);
            cv.animate([{ transform: "translate(0,0)" }, { transform: `translate(${Math.cos(ang) * radio}px,${Math.sin(ang) * radio}px)` }], { duration: 575 / v, fill: "forwards" });
            cv.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 75 / v, delay: 500 / v, fill: "both", easing: "ease-in" });
            setTimeout(() => { clearInterval(giro); cv.remove(); }, 600 / v);
        }, (n * 20) / v);
    }

    // ---------- Aparición y lanzamientos ----------
    // Sale de su ball como en PokéRogue: con la luz de la ball, desde la mitad de su tamaño, mientras saltan sus partículas.
    async function aparecerDesdeBola(esAliado) {
        const s = spriteEl(esAliado); if (!s) return;
        const c = activoDe(esAliado), bola = (c && c.bola) || "poke-ball", { x, y } = centroSprite(esAliado);
        particulasBola(x, y, bola);
        s.style.opacity = "1"; s.style.transformOrigin = "50% 100%";
        const luz = tintar(s, esAliado, colorBola(bola), 1, 0, 250);
        await anim(s, [{ transform: "scale(.5)" }, { transform: "scale(1)" }], { duration: 250, easing: SENO_IN });
        await luz;
        resetTransform(s); s.style.opacity = "1"; s.style.transformOrigin = "";
    }
    async function animarAparicionSalvaje() {
        const s = spriteEl(false); if (!s) return;
        s.style.opacity = "1";
        await anim(s, [{ transform: "translateX(-120px)", opacity: 0 }, { transform: "translateX(0)", opacity: 1 }], { duration: 520, easing: "ease-out" });
        resetTransform(s); s.style.opacity = "1";
    }
    // La Poké Ball, proporcionada a los Pokémon: el icono (30 px) lleva la bola de 18 px en el centro.
    const escalaBola = () => zoomEscena(false) * 0.82;
    function prepararBola(b, bola) {
        const z = escalaBola();
        b.src = urlObj(bola || "poke-ball");
        b.style.width = b.style.height = Math.round(30 * z) + "px";
        b.style.transformOrigin = "50% 50%";
        b.style.filter = `drop-shadow(0 ${Math.round(z * 1.5)}px ${Math.round(z)}px rgba(0,0,0,0.45))`;
        return z;
    }
    // Punto del suelo bajo el rival (el centro de su plataforma), donde cae la Poké Ball.
    function sueloRival() {
        const e = escenaEl(), p = e && e.querySelector(".puesto-enemigo");
        if (!p) return piesSprite(false);
        const re = e.getBoundingClientRect(), rp = p.getBoundingClientRect();
        return { x: rp.left - re.left, y: rp.top - re.top };
    }
    // Poké Ball en arco (como en PokéRogue) y apertura con su sonido real. `lejos`: se aleja de la cámara (se ve cada vez más pequeña).
    async function volarBola(fin, origen, bola, { lejos = false } = {}) {
        const cb = $("capa-bola"); if (!cb) return;
        const b = cb.querySelector(".bola-throw"); if (!b) return;
        prepararBola(b, bola);
        cb.classList.remove("oculta");
        b.style.left = origen.x + "px"; b.style.top = origen.y + "px";
        const e0 = lejos ? 1.7 : 1;
        await anim(b, [
            { left: origen.x + "px", top: origen.y + "px", transform: `translate(-50%,-50%) rotate(0) scale(${e0})` },
            { left: (origen.x + (fin.x - origen.x) * 0.45) + "px", top: (Math.min(origen.y, fin.y) - 90) + "px", transform: `translate(-50%,-50%) rotate(700deg) scale(${(e0 + 1) / 2})`, offset: 0.35 },
            { left: fin.x + "px", top: fin.y + "px", transform: "translate(-50%,-50%) rotate(1440deg) scale(1)" },
        ], { duration: 620, easing: "ease-in" });
    }
    function ocultarBola() {
        const cb = $("capa-bola"); if (!cb) return;
        cb.classList.add("oculta");
        const b = cb.querySelector(".bola-throw"); if (b) b.style.cssText = "";
    }
    async function envioConBola(esAliado) {
        const s = spriteEl(esAliado); if (!s) return;
        s.style.opacity = "0";
        const esc = escenaEl(); if (!esc) return;
        const fin = centroSprite(esAliado);
        const origen = esAliado ? { x: esc.clientWidth * 0.06, y: esc.clientHeight * 0.95 } : { x: esc.clientWidth * 0.96, y: esc.clientHeight * 0.12 };
        AudioFX.efecto("pb_throw");
        await volarBola(fin, origen, esAliado ? aliadoActivo().bola : "poke-ball");
        AudioFX.efecto("pb_rel");
        ocultarBola();
        await aparecerDesdeBola(esAliado);
    }
    // El jugador de espaldas (atlas real de PokéRogue): entra en escena junto al rival...
    let atlasJugador = null;
    async function mostrarJugador() {
        const cv = $("jugador-sprite"); atlasJugador = null;
        if (!cv) return;
        try { atlasJugador = await Atlas.cargar(urlEntrenadorPR(`trainer_${opts.generoJugador === "f" ? "f" : "m"}_back_pb`)); } catch (_) { return; }
        if (!activo) return;
        cv.width = atlasJugador.w; cv.height = atlasJugador.h;
        cv.dataset.nw = atlasJugador.w; cv.dataset.nh = atlasJugador.h;
        Atlas.dibujar(cv, atlasJugador, 0);
        ajustarEscena();
        cv.classList.remove("oculta");
        await anim(cv, [{ transform: "translateX(-110%)" }, { transform: "translateX(0)" }], { duration: 520, easing: "ease-out" });
    }
    // ...y lanza la Poké Ball: prepara, levanta el brazo y la suelta desde la mano.
    async function lanzamientoJugador() {
        const cv = $("jugador-sprite");
        if (!atlasJugador || !cv || cv.classList.contains("oculta") || !activo) {
            await envioConBola(true);
        } else {
            await decir(`¡Adelante, ${aliadoActivo().nombre}!`, 420);
            Atlas.dibujar(cv, atlasJugador, 1);
            await esperar(160);
            const esc = escenaEl(), rc = cv.getBoundingClientRect(), re = esc.getBoundingClientRect();
            const origen = { x: rc.left - re.left + rc.width * 0.53, y: rc.top - re.top + rc.height * 0.05 };
            Atlas.dibujar(cv, atlasJugador, 2);
            AudioFX.efecto("pb_throw");
            const vuelo = volarBola(centroSprite(true), origen, aliadoActivo().bola);
            await esperar(260);
            anim(cv, [{ transform: "translateX(0)" }, { transform: "translateX(-120%)" }], { duration: 520, easing: "ease-in" })
                .then(() => { cv.classList.add("oculta"); cv.style.transform = ""; });
            await vuelo;
            AudioFX.efecto("pb_rel");
            ocultarBola();
            await aparecerDesdeBola(true);
        }
        caja(true, true);
        AudioFX.grito(aliadoActivo().baseId, { vol: 0.55 });
        await revelarShiny(true);
        await esperar(300);
    }
    // Presenta al rival: salvaje (entra en escena) o entrenador (aparece, habla y lanza su ball).
    async function presentarRival() {
        const e = enemigoActivo();
        if (opts.salvaje) {
            AudioFX.musicaSonar(musicaRival());
            await esperar(250);
            await animarAparicionSalvaje();
            caja(false, true);
            AudioFX.grito(e.baseId, { vol: 0.6 });
            await decir(esLegendario(e.baseId) ? `¡Un ${e.nombre} LEGENDARIO apareció!` : e.furioso ? `¡Un ${e.nombre} FURIOSO apareció envuelto en un aura carmesí!`
                : `¡Un ${e.nombre} salvaje apareció!`, 1200);
            await revelarShiny(false);
            return;
        }
        const cv = $("entrenador-sprite");
        AudioFX.musicaSonar(opts.musicaEncuentro || musicaRival());
        if (cv && opts.entrenadorSprite) {
            const nuevo = await montarEntrenador(cv, opts.entrenadorSprite, { fps: 24 * velJuego() });
            ajustarEscena();
            nuevo.classList.remove("oculta");
            await anim(nuevo, [{ transform: "translateX(110%)", opacity: 0 }, { transform: "translateX(0)", opacity: 1 }], { duration: 520, easing: "ease-out" });
            nuevo.style.opacity = "1";
        }
        await decir(`${opts.titulo || "El rival"} quiere luchar.`, 1100);
        if (opts.dialogo) await decir(`«${opts.dialogo}»`, 2100);
        AudioFX.musicaSonar(musicaRival());
        await lanzamientoRival(true);
    }
    // El entrenador rival lanza su Poké Ball y sale de escena (o, si ya no está, solo la ball).
    async function lanzamientoRival(conEntrenador, arrastre = false) {
        const e = enemigoActivo(), s = spriteEl(false);
        s.style.opacity = "0";
        await decir(arrastre ? `¡${e.nombre} ha sido arrastrado al combate!` : `${opts.titulo || "El rival"} envió a ${e.nombre}.`, arrastre ? 900 : 700);
        const cv = $("entrenador-sprite");
        if (conEntrenador && cv && !cv.classList.contains("oculta")) {
            const esc = escenaEl(), rc = cv.getBoundingClientRect(), re = esc.getBoundingClientRect();
            const origen = { x: rc.left - re.left + rc.width * 0.3, y: rc.top - re.top + rc.height * 0.35 };
            anim(cv, [{ transform: "translateX(0)", opacity: 1 }, { transform: "translateX(110%)", opacity: 0 }], { duration: 650, easing: "ease-in" })
                .then(() => cv.classList.add("oculta"));
            AudioFX.efecto("pb_throw");
            await volarBola(centroSprite(false), origen, "poke-ball");
            AudioFX.efecto("pb_rel");
            ocultarBola();
            await aparecerDesdeBola(false);
        } else {
            await envioConBola(false);
        }
        caja(false, true);
        AudioFX.grito(e.baseId, { vol: 0.6 });
        await revelarShiny(false);
    }

    // ---------- Shiny: destello real de PokéRogue ----------
    async function revelarShiny(esAliado) {
        const c = esAliado ? aliadoActivo() : enemigoActivo();
        if (!c || !c.shiny || !activo) return;
        const cont = efectosEl(); if (!cont) return;
        const pie = piesSprite(esAliado);
        try {
            const a = await Atlas.cargar(prURL("images/effects/shiny"));
            const cv = document.createElement("canvas");
            cv.className = "fx-shiny-sparkle";
            cv.style.left = pie.x + "px"; cv.style.top = pie.y + "px";
            cv.style.height = Math.round(a.h * 2.2) + "px";
            cont.appendChild(cv);
            const fps = 32 * velJuego();
            Atlas.animar(cv, a, { fps, bucle: false });
            setTimeout(() => cv.remove(), (a.frames.length / fps) * 1000 + 100);
        } catch (_) {}
        AudioFX.efecto("sparkle");
        await decir(`¡${c.nombre} es de un color especial!`, 1300);
    }

    // ---------- Menús ----------
    function ocultarMenus() {
        accionesEl.classList.add("oculta"); movesEl.classList.add("oculta"); equipoMenuEl.classList.add("oculta");
        if (mensajeEl && mensajeEl.classList.contains("info-mov")) { mensajeEl.classList.remove("info-mov"); ponerMensaje(""); }
        const ui = capa && capa.querySelector(".batalla-ui"); if (ui) ui.classList.remove("alta");
    }
    const ICO_ACC = {
        mochila: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M9 3h6a2 2 0 0 1 2 2v1h1a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V9a3 3 0 0 1 3-3h1V5a2 2 0 0 1 2-2zm0 3h6V5H9zm-3 6v2h12v-2z"/></svg>',
        cambiar: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9.5" fill="#fff" stroke="currentColor" stroke-width="2"/><path d="M2.5 12a9.5 9.5 0 0 1 19 0z" fill="currentColor"/><path d="M2.5 12h19" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="3.2" fill="#fff" stroke="currentColor" stroke-width="2"/></svg>',
        huir: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M13.5 5.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM9.8 8.9 7 22h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3A7.3 7.3 0 0 0 19 12v-2a5.2 5.2 0 0 1-4.5-2.5l-1-1.6A2 2 0 0 0 11.8 5a2 2 0 0 0-.8.2L6 7.3V12h2V8.6z"/></svg>',
        mega: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2 9 9H2l5.6 4.3L5.5 21 12 16.5 18.5 21l-2.1-7.7L22 9h-7z"/></svg>',
    };
    function mostrarAcciones() {
        if (!activo || terminado) return;
        const c = aliadoActivo();
        if (c.forzado && c.hp > 0) {   // segundo turno de Vuelo, Enfado, recarga…
            bloqueado = false;
            return opts.pvp ? elegirPvP({ tipo: "forzado" }) : jugarTurno(movForzado(c));
        }
        bloqueado = false; ocultarMenus(); accionesEl.classList.remove("oculta"); accionesEl.classList.add("principal");
        capa.querySelector(".batalla-ui").classList.remove("alta");
        const ultimo = opts.salvaje ? { acc: "huir", txt: "Huir" } : { acc: "rendirse", txt: "Rendirse" };
        accionesEl.innerHTML = `
            <button class="accion-btn acc-luchar" data-acc="luchar"><span class="acc-texto">Luchar</span></button>
            ${opts.pvp || opts.sinMochila ? "" : `<button class="accion-btn acc-mochila" data-acc="mochila">${ICO_ACC.mochila}<span>Mochila</span></button>`}
            <button class="accion-btn acc-cambiar" data-acc="cambiar">${ICO_ACC.cambiar}<span>Pokémon</span></button>
            <button class="accion-btn acc-huir" data-acc="${ultimo.acc}">${ICO_ACC.huir}<span>${ultimo.txt}</span></button>`;
        accionesEl.classList.toggle("sin-mochila", !!(opts.pvp || opts.sinMochila));
        accionesEl.querySelectorAll(".accion-btn").forEach((x) => x.onclick = () => onAccion(x.dataset.acc));
        ponerMensaje(`¿Qué debería hacer ${c.nombre}?`);
        if (opts.pvp && !relojPvP) relojTurno(eleccionAutomatica);   // (sigue corriendo aunque vayas y vuelvas de los menús)
    }
    // ---------- Multijugador: tiempo para elegir ----------
    // Un minuto por decisión mientras el rival espera; si se acaba, el juego elige por ti.
    let relojPvP = null, pantEquipo = null;
    function relojTurno(alAgotar, seg = 60) {
        pararReloj();
        if (!opts.pvp || terminado) return;
        const el = $("reloj-pvp"); let s = seg;
        const pintar = () => { if (el) { el.textContent = `${s} s`; el.classList.toggle("urgente", s <= 10); el.classList.remove("oculta"); } };
        pintar();
        relojPvP = setInterval(() => {
            if (!activo || terminado) return pararReloj();
            s--; pintar();
            if (s <= 0) { pararReloj(); alAgotar(); }
        }, 1000);
    }
    function pararReloj() {
        clearInterval(relojPvP); relojPvP = null;
        const el = $("reloj-pvp"); if (el) el.classList.add("oculta");
    }
    // Se acabó el tiempo: el primer movimiento que pueda usar (o Forcejeo).
    function eleccionAutomatica() {
        if (terminado || bloqueado) return;
        if (pantEquipo) { pantEquipo.cerrar(); pantEquipo = null; }
        poderSel = null;
        const c = aliadoActivo();
        const i = c.movimientos.findIndex((m) => m.ppAct > 0 && (!c.bloqueo || m.clave === c.bloqueo) && !((c.mofa > 0 || c.objeto === "assault-vest") && m.cat === "est"));
        elegirPvP({ tipo: "mov", i });
    }
    // Botón de movimiento: etiqueta oficial del tipo, icono de categoría, potencia y PP.
    function botonMov(mv, i, pista, apagado = false) {
        const agotado = mv.ppAct !== undefined && mv.ppAct <= 0, off = agotado || apagado;
        return `<button class="move-btn tipo-${mv.tipo} ${agotado ? "agotado" : ""} ${apagado ? "apagado" : ""} ${mv.esZ ? "mov-z" : ""}" data-i="${i}" ${off ? "disabled" : ""}>
            <span class="mb-fila"><span class="move-nombre">${mv.nombre}</span>${etiquetaTipo(mv.tipo, 2)}</span>
            <span class="mb-fila mb-datos">${iconoCategoria(mv.cat, 2)}<span class="mb-pot">${mv.cat === "est" || !mv.poder ? "—" : mv.poder}</span>
                ${pista ? `<span class="mb-pista">${pista}</span>` : ""}
                <span class="mb-pp">PP <b>${mv.ppAct ?? mv.pp ?? "—"}</b>/${mv.pp ?? "—"}</span></span>
        </button>`;
    }
    // Movimiento Z: con el cristal de su tipo, una vez por combate, sobre un movimiento de daño de ese tipo.
    function zDisponible(c, esAli = true) {
        const t = TIPO_CRISTAL[c.objeto];
        return t && !poder[esAli ? "aliado" : "rival"] && !c.dinamax && c.movimientos.some((m) => m.tipo === t && m.cat !== "est" && m.ppAct > 0) ? t : null;
    }
    // Los poderes que puede usar ahora (uno por combate): Megaevolución con su megapiedra, Z con su cristal, y Dinamax (o Gigamax)
    // y Teracristal en cualquier combate (un Pokémon megaevolucionado, dinamaxizado o teracristalizado no combina otro).
    function poderesDisponibles(c, esAli = true) {
        if (!c || c.hp <= 0 || poder[esAli ? "aliado" : "rival"]) return [];
        const out = [], libre = !c.esMega && !c.dinamax && !c.teracristal;
        if (c.puedeMega && !c.esMega) out.push("mega");
        if (zDisponible(c, esAli)) out.push("z");
        if (libre && !SIN_DINAMAX.has(c.baseId)) out.push("dinamax");
        if (libre) out.push("tera");
        return out;
    }
    const iconoPoder = (k, c) => (k === "mega" ? prURL("images/items/mega_bracelet.png") : k === "z" ? urlObj(c.objeto)
        : k === "dinamax" ? prURL("images/items/dynamax_band.png") : urlTera(c.teraTipo || c.tipos[0]));
    const etiquetaPoder = (k, c) => (k === "dinamax" && puedeGigamax(c) ? "Gigamax" : k === "tera" ? `Teracristal (${TIPOS_ES[c.teraTipo] || ""})` : NOMBRE_PODER[k]);
    const movZ = (m) => ({ clave: m.clave, nombre: MOVIMIENTO_Z[m.tipo] || m.nombre, tipo: m.tipo, cat: m.cat, poder: poderZ(m.poder),
        prec: 1, pp: m.pp, ppAct: m.ppAct, prio: 0, esZ: true, base: m });
    // Los datos de un movimiento en el cuadro de texto: categoría, potencia, precisión y qué hace (los textos de la ficha).
    function textoInfoMov(mv) {
        const datos = [mv.cat === "est" ? "Estado" : mv.cat === "fis" ? "Físico" : "Especial"];
        if (mv.cat !== "est" && mv.poder) datos.push(`Pot. ${mv.poder}`);
        datos.push(`Prec. ${Math.round(Math.min(1, mv.prec || 1) * 100)} %`);
        const ef = typeof efectoMov === "function" ? efectoMov(mv) : "";
        return `${mv.nombre}: ${datos.join(" · ")}.${ef ? " " + ef + "." : ""}`;
    }
    // Al pasar el ratón por encima (o al llegar con el teclado) se ven sus datos; en el móvil, manteniéndolo pulsado
    // (y entonces no se elige).
    function infoAlSenalar(b, mv, c) {
        // (solo mientras se elige: al elegir, el menú se oculta y sus avisos no deben tapar los mensajes del turno)
        const eligiendo = () => b.isConnected && !!b.offsetParent && !bloqueado;
        const ver = () => { if (!eligiendo()) return; mensajeEl.classList.add("info-mov"); ponerMensaje(textoInfoMov(mv)); };
        const quitar = () => { mensajeEl.classList.remove("info-mov"); if (eligiendo()) ponerMensaje(`¿Qué debería hacer ${c.nombre}?`); };
        b.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") ver(); });
        b.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse") quitar(); });
        b.addEventListener("focus", ver); b.addEventListener("blur", quitar);
        let t = null;
        b.addEventListener("pointerdown", (e) => { if (e.pointerType !== "mouse") t = setTimeout(() => { b._soloInfo = true; ver(); }, 450); });
        ["pointerup", "pointercancel", "pointerleave"].forEach((ev) => b.addEventListener(ev, () => clearTimeout(t)));
        b.addEventListener("contextmenu", (e) => e.preventDefault());   // (sin el menú del navegador al mantener pulsado)
    }
    // Por qué no puede elegir ahora un movimiento (o null): Otra Vez, objeto Elección, Chaleco Asalto, Mofa, Anulación o Eructo sin baya.
    function motivoBloqueo(c, mv) {
        const fijo = c.otraVez ? c.movimientos.find((m) => m.clave === c.otraVez.clave) : c.bloqueo ? c.movimientos.find((m) => m.clave === c.bloqueo) : null;
        if (fijo && mv !== fijo) return c.otraVez ? "Otra Vez" : obj(c.objeto).nombre;
        if (c.objeto === "assault-vest" && mv.cat === "est") return "Chaleco Asalto";
        if (c.mofa > 0 && mv.cat === "est") return "Mofa";
        if (c.anulado && mv.clave === c.anulado.clave) return "Anulado";
        if (mv.clave === "belch" && !c.ultimaBaya) return "Sin baya";
        return null;
    }
    function mostrarMoves() {
        ocultarMenus(); movesEl.classList.remove("oculta");
        const c = aliadoActivo(), rival = enemigoActivo();
        if (!conPP(c).some((m) => !motivoBloqueo(c, m))) {   // no le queda ninguno que pueda usar: solo Forcejeo
            movesEl.innerHTML = botonMov(FORCEJEO, 0, "Sin PP") + `<button class="move-volver" data-volver="1">Atrás</button>`;
            movesEl.querySelector(".move-btn").onclick = () => (opts.pvp ? elegirPvP({ tipo: "mov", i: -1 }) : jugarTurno(FORCEJEO));
        } else {
            const poderes = poderesDisponibles(c);
            if (poderSel && !poderes.includes(poderSel)) poderSel = null;
            const tz = poderSel === "z" ? zDisponible(c) : null;
            const enMax = !!c.dinamax || poderSel === "dinamax";   // dinamaxizado (o a punto): sus Maximovimientos
            capa.querySelector(".batalla-ui").classList.toggle("alta", poderes.length > 0);   // una fila más para los poderes
            const vista = (mv) => (enMax ? movMax(c, mv, c.dinamax ? c.dinamax.gmax : puedeGigamax(c)) : mv);
            movesEl.innerHTML = c.movimientos.map((mv, i) => {
                if (tz) return mv.tipo === tz && mv.cat !== "est" && mv.ppAct > 0 ? botonMov(movZ(mv), i, "Movimiento Z") : botonMov(mv, i, "", true);
                const v = vista(mv);
                if (enMax) return botonMov(v, i, v.cat === "est" ? "" : "Maximovimiento", mv.ppAct <= 0);
                const ef = mv.cat === "est" ? 1 : efectividad(mv.tipo, rival.tipos), motivo = motivoBloqueo(c, mv);
                if (motivo) return botonMov(mv, i, motivo, true);
                return botonMov(mv, i, ef === 0 ? "No afecta" : ef >= 2 ? "Supereficaz" : ef < 1 ? "Poco eficaz" : "");
            }).join("") + (poderes.length ? `<div class="move-poderes">${poderes.map((k) =>
                `<button class="move-poder p-${k} ${poderSel === k ? "activo" : ""}" data-poder="${k}"><img src="${iconoPoder(k, c)}" alt="">${etiquetaPoder(k, c)}</button>`).join("")}</div>` : "")
                + `<button class="move-volver" data-volver="1">Atrás</button>`;
            movesEl.querySelectorAll(".move-btn").forEach((b) => {
                if (!b.disabled) b.onclick = () => {
                    if (b._soloInfo) { b._soloInfo = false; return; }   // (lo ha mantenido pulsado para ver sus datos)
                    const i = Number(b.dataset.i), mv = c.movimientos[i], k = poderSel;
                    if (opts.pvp) return elegirPvP({ tipo: "mov", i, poder: k });
                    jugarTurno(tz ? movZ(mv) : vista(mv), k);
                };
                const mv = c.movimientos[Number(b.dataset.i)];
                if (mv) infoAlSenalar(b, tz ? (mv.tipo === tz && mv.cat !== "est" ? movZ(mv) : mv) : enMax ? vista(mv) : mv, c);
            });
            movesEl.querySelectorAll("[data-poder]").forEach((b) => b.onclick = () => {
                poderSel = poderSel === b.dataset.poder ? null : b.dataset.poder;
                AudioFX.efecto(poderSel ? "shine" : "pb_rel", { vol: 0.4 }); mostrarMoves();
            });
        }
        movesEl.querySelector("[data-volver]").onclick = () => { poderSel = null; mostrarAcciones(); };
    }
    // modo: "normal" (cuesta turno) · "forzado" (tras debilitarse) · "libre" (gratis, tras caer un rival)
    // Si está megaevolucionado, su icono es el de la mega.
    const miembroPE = (p) => ({ id: p.baseId, nombre: p.nombre, nivel: p.nivel, genero: p.genero, hp: p.hp, hpMax: p.hpMax, shiny: p.shiny, estado: p.estado && (p.estado.grave ? "tox" : p.estado.tipo), objeto: p.objeto,
        forma: p.esMega && p.megaInfo ? megaClavePR(p.megaInfo) : null });
    function mostrarEquipoMenu(modo, alTerminar) {
        if (modo === false) modo = "normal"; if (modo === true) modo = "forzado";
        const forzado = modo === "forzado" || modo === "ko" || modo === "caida" || modo === "pivote" || modo === "elegir";   // (elegir: solo dice a quién, tras una doble caída)   // (ko: cayó en pleno turno; caida: por las trampas al entrar; pivote: Ida y Vuelta…)
        ocultarMenus();
        // El que está en combate va en la ranura grande, como en los juegos.
        const orden = [iAliado, ...aliados.map((_, i) => i).filter((i) => i !== iAliado)];
        const pant = pantEquipo = montarPantallaEquipo(capa, orden.map((i) => miembroPE(aliados[i])), {
            flotante: true, cancelable: !forzado, textoCancelar: modo === "libre" ? "No" : "Atrás",
            mensaje: forzado ? "Elige tu próximo Pokémon." : modo === "libre" ? "¿Quieres cambiar de Pokémon?" : "¿A quién quieres enviar?",
            opciones: (k) => {
                const i = orden[k], p = aliados[i], ops = [];
                if (i !== iAliado && p.hp > 0) ops.push({ txt: "Enviar", fn: () => {
                    pant.cerrar(); pantEquipo = null;
                    if (forzado) pararReloj();
                    if (opts.pvp && modo === "normal") return elegirPvP({ tipo: "cambio", i });
                    if (modo === "elegir") return alTerminar(i);
                    accionCambiar(i, modo, alTerminar);
                } });
                if (typeof mostrarResumen === "function") ops.push({ txt: "Datos", fn: () => mostrarResumen(p.baseId, { mega: p.esMega ? p.megaInfo : null, tera: p.teracristal || null }) });
                return ops;
            },
            alCancelar: () => { pant.cerrar(); pantEquipo = null; if (modo === "libre" && alTerminar) return alTerminar(); mostrarAcciones(); },
        });
        // Multijugador: si no eliges a tiempo a quién sacar, sale el primero que pueda.
        if (forzado && opts.pvp) relojTurno(() => {
            const i = aliados.findIndex((p, j) => j !== iAliado && p.hp > 0);
            if (i < 0 || terminado) return;
            pant.cerrar(); pantEquipo = null;
            if (modo === "elegir") return alTerminar(i);
            accionCambiar(i, modo, alTerminar);
        });
    }

    // ---------- Acciones ----------
    function onAccion(acc) {
        if (bloqueado) return;
        if (acc === "luchar") mostrarMoves();
        else if (acc === "mochila") mostrarMochila();
        else if (acc === "cambiar") { if (sinSalida(aliadoActivo())) return avisoSinSalida(); mostrarEquipoMenu("normal"); }
        else if (acc === "huir") accionHuir();
        else if (acc === "rendirse") { if (opts.pvp) rendirsePvP(); else finBatalla(false); }
    }


    // ---------- Objetos del rival (dificultad Difícil y Extremo) ----------
    // Con pocos PS, el entrenador usa una de sus pociones (una sola vez por turno) en vez de atacar.
    async function rivalUsaCura(ene) {
        const cur = opts.curasRival;
        if (opts.salvaje || !cur || cur.n <= 0 || !ene || ene.hp <= 0 || ene.hp > ene.hpMax * 0.3 || azarC() > 0.85) return false;
        cur.n--;
        const k = cur.objeto, o = obj(k);
        await decir(`¡${opts.titulo || "El rival"} ha usado ${/poci/i.test(o.nombre) ? "una" : "un"} ${o.nombre}!`, 900);
        AudioFX.efecto("restore");
        await animComun("common-health-up", false);
        if (!activo) return true;
        ene.hp = Math.min(ene.hpMax, ene.hp + psQueCura(k, ene.hpMax));
        if (k === "full-restore") ene.estado = null;
        actualizarHP(false); actualizarEstadoCaja(false);
        await decir(`¡${ene.nombre} ha recuperado PS!`, 900);
        return true;
    }

    // ---------- Megaevolución: gráficos y sonidos reales (packs de Pokémon Reborn y Gen 8 que usa PokéRogue) ----------
    const MEGA_FX = {
        orbe: prURL("images/battle_anims/PRAS- MegaEvo.png"),            // la esfera de energía nace, envuelve al Pokémon y se agrieta
        estallido: prURL("images/battle_anims/GEN8- MegaEvolution.png"), // la esfera estalla en pedazos
        fondo: prURL("images/battle_anims/PRAS- MegaEvo BG.png"),
        chispas: prURL("images/battle_anims/PRAS- Orbs.png"),
        pulsera: prURL("images/items/mega_bracelet.png"),
        destello: prURL("images/effects/evo_sparkle.png"),
        sonido: (n) => prURL(`audio/battle_anims/PRSFX- Mega Evolution${n}.wav`),
    };
    const nombreJugador = () => opts.nombreJugador || (typeof entrenador !== "undefined" && entrenador && entrenador.nombre) || "su entrenador";
    // Hoja de fotogramas de 96×96 (5 por fila) centrada en un punto de la escena.
    function celMega(url, x, y, escala) {
        const d = document.createElement("div");
        d.className = "anim-cel mega-cel";
        d.style.backgroundImage = `url("${url}")`;
        d.style.left = x + "px"; d.style.top = y + "px";
        d.style.transform = `translate(-50%,-50%) scale(${escala})`;
        efectosEl().appendChild(d);
        return d;
    }
    async function fotogramasMega(d, lista, ms) {
        for (const f of lista) {
            if (!activo) return;
            d.style.backgroundPosition = `-${(f % 5) * 96}px -${Math.floor(f / 5) * 96}px`;
            await esperar(ms);
        }
    }
    // La Piedra Activadora del entrenador reacciona con la megapiedra: un chorro de energía de colores va de una a otra.
    function reaccionMega(esAliado, c) {
        const esc = escenaEl(), cont = efectosEl(), s = spriteEl(esAliado);
        if (!esc || !cont || !s) return () => {};
        const W = esc.clientWidth, H = esc.clientHeight, z = zoomEscena(esAliado);
        const re = esc.getBoundingClientRect(), rs = s.getBoundingClientRect();
        // La megapiedra brilla sobre el Pokémon y la Piedra Activadora, en el lado de su entrenador.
        const piedra = { x: rs.left - re.left + rs.width / 2, y: Math.max(18 * z, rs.top - re.top + rs.height * 0.22) };
        const pulsera = esAliado ? { x: W * 0.1, y: H * 0.84 } : { x: W * 0.93, y: H * 0.36 };
        const piezas = [];
        const icono = (src, p, clase) => {
            const i = document.createElement("img");
            i.className = "mega-icono " + clase; i.src = src; i.alt = "";
            i.style.left = p.x + "px"; i.style.top = p.y + "px"; i.style.width = Math.round(26 * z) + "px";
            cont.appendChild(i); piezas.push(i);
        };
        icono(MEGA_FX.pulsera, pulsera, "pulsera");
        if (MEGAS[c.objeto]) icono(urlObj(c.objeto), piedra, "piedra");   // (Mega-Rayquaza no lleva piedra)
        AudioFX.efecto("sparkle", { vol: 0.5 });
        const dx = piedra.x - pulsera.x, dy = piedra.y - pulsera.y, arco = -(Math.abs(dx) * 0.2 + 24 * z);
        for (let k = 0; k < 12; k++) {
            const d = document.createElement("div"), fr = [0, 1, 2, 3, 4, 5][k % 6];
            d.className = "anim-cel mega-chispa";
            d.style.backgroundImage = `url("${MEGA_FX.chispas}")`;
            d.style.backgroundPosition = `-${(fr % 4) * 96}px -${Math.floor(fr / 4) * 96}px`;
            d.style.left = pulsera.x + "px"; d.style.top = pulsera.y + "px";
            const col = `hsl(${(k * 47) % 360} 100% 62%)`, sc = z * (0.5 + (k % 3) * 0.18);
            d.style.filter = `drop-shadow(0 0 ${2 * z}px ${col}) drop-shadow(0 0 ${5 * z}px ${col})`;
            cont.appendChild(d); piezas.push(d);
            d.animate([
                { transform: `translate(-50%,-50%) scale(${sc})`, opacity: 0 },
                { transform: `translate(-50%,-50%) translate(${dx * 0.5}px,${dy * 0.5 + arco}px) scale(${sc})`, opacity: 1, offset: 0.5 },
                { transform: `translate(-50%,-50%) translate(${dx}px,${dy}px) scale(${sc * 0.5})`, opacity: 0.1 },
            ], { duration: 650 / velJuego(), delay: (k * 85) / velJuego(), fill: "both", easing: "ease-in-out" });
        }
        return () => piezas.forEach((p) => { p.classList.add("fuera"); setTimeout(() => p.remove(), 260); });
    }
    // Destello blanco y chispas que salen disparadas al aparecer la megaevolución.
    function estallidoMega(esAliado) {
        const cont = efectosEl(); if (!cont) return;
        const f = document.createElement("div");
        f.className = "mega-flash";
        cont.appendChild(f); setTimeout(() => f.remove(), 700 / velJuego());
        const { x, y } = centroSprite(esAliado), z = zoomEscena(esAliado);
        for (let k = 0; k < 12; k++) {
            const i = document.createElement("img");
            i.src = MEGA_FX.destello; i.className = "mega-destello"; i.alt = "";
            const ang = (k / 12) * Math.PI * 2, r = (34 + (k % 3) * 14) * z;
            i.style.left = x + "px"; i.style.top = y + "px"; i.style.width = Math.round(8 * z * 1.3) + "px";
            cont.appendChild(i);
            i.animate([{ transform: "translate(-50%,-50%) scale(.4)", opacity: 1 },
                       { transform: `translate(-50%,-50%) translate(${Math.cos(ang) * r}px,${Math.sin(ang) * r}px) scale(1)`, opacity: 0 }],
                { duration: 850 / velJuego(), easing: "cubic-bezier(.2,.8,.3,1)", fill: "forwards" });
            setTimeout(() => i.remove(), 900 / velJuego());
        }
    }
    // Más espectáculo (gráficos de Pokémon Essentials EBDX): rayos de luz que giran detrás, destellos que convergen en la
    // esfera, anillos de energía al estallar y el símbolo de la megaevolución sobre el Pokémon.
    const EBDX_FX = EBDX_BASE.replace(/Pokemon\/$/, "EBDX/");
    function rayosMega(esAliado) {
        const cont = $("capa-anim-fondo"); if (!cont) return () => {};
        const { x, y } = centroSprite(esAliado), z = zoomEscena(esAliado);
        const d = document.createElement("div");
        d.className = "mega-rayos"; d.style.left = x + "px"; d.style.top = y + "px"; d.style.setProperty("--z", z);
        d.innerHTML = Array.from({ length: 10 }, (_, i) => `<img src="${EBDX_FX}Pictures/Evolution/ray.png" alt="" style="--a:${i * 36}deg">`).join("");
        cont.appendChild(d);
        requestAnimationFrame(() => d.classList.add("visible"));
        return () => { d.classList.remove("visible"); setTimeout(() => d.remove(), 500); };
    }
    function particulasMega(esAliado) {
        const cont = efectosEl(); if (!cont) return () => {};
        const { x, y } = centroSprite(esAliado), z = zoomEscena(esAliado);
        const t = setInterval(() => {
            const p = document.createElement("img");
            p.src = `${EBDX_FX}Animations/Moves/ebMega00${Math.random() < 0.5 ? 1 : 4}.png`; p.className = "mega-particula"; p.alt = "";
            const ang = Math.random() * Math.PI * 2, r = (70 + Math.random() * 60) * z;
            p.style.left = x + "px"; p.style.top = y + "px"; p.style.setProperty("--z", z);
            p.style.setProperty("--dx", Math.cos(ang) * r + "px"); p.style.setProperty("--dy", Math.sin(ang) * r + "px");
            p.style.animationDuration = (520 + Math.random() * 320) / velJuego() + "ms";
            cont.appendChild(p); setTimeout(() => p.remove(), 950 / velJuego());
        }, 55 / velJuego());
        return () => clearInterval(t);
    }
    function anillosMega(esAliado) {
        const cont = efectosEl(); if (!cont) return;
        const { x, y } = centroSprite(esAliado), z = zoomEscena(esAliado);
        [0, 150, 300].forEach((retraso) => setTimeout(() => {
            const a = document.createElement("img");
            a.src = `${EBDX_FX}Pictures/Evolution/shine4.png`; a.className = "mega-anillo"; a.alt = "";
            a.style.left = x + "px"; a.style.top = y + "px"; a.style.setProperty("--z", z);
            cont.appendChild(a); setTimeout(() => a.remove(), 900 / velJuego());
        }, retraso / velJuego()));
    }
    function simboloMega(esAliado) {
        const cont = efectosEl(), s = spriteEl(esAliado), esc = escenaEl(); if (!cont || !s || !esc) return;
        const re = esc.getBoundingClientRect(), rs = s.getBoundingClientRect(), z = zoomEscena(esAliado);
        const i = document.createElement("img");
        i.src = `${EBDX_FX}Animations/Moves/ebMega007.png`; i.className = "mega-simbolo"; i.alt = "";
        i.style.left = (rs.left - re.left + rs.width / 2) + "px"; i.style.top = Math.max(60 * z, rs.top - re.top + 4 * z) + "px"; i.style.setProperty("--z", z);
        cont.appendChild(i);
        AudioFX.efecto("shine", { vol: 0.5 });
        setTimeout(() => i.remove(), 1700 / velJuego());
    }
    async function activarPoder(esAli, k) {
        const c = activoDe(esAli); if (!c || c.hp <= 0 || !activo) return;
        poder[esAli ? "aliado" : "rival"] = k;
        if (k === "mega") await animacionMega(esAli);
        else if (k === "dinamax") await dinamaxizar(esAli);
        else if (k === "tera") await teracristalizar(esAli);
    }
    // El rival usa su poder: megaevoluciona si tiene megapiedra y, si su entrenador lo tiene, dinamaxiza o teracristaliza a
    // su as (el último que le queda o el último de su equipo). true si lo ha usado.
    async function poderRivalIA(ene) {
        if (opts.pvp || opts.salvaje || poder.rival || !ene || ene.hp <= 0 || ene.forzado) return false;
        if (ene.puedeMega && !ene.esMega) { await activarPoder(false, "mega"); return true; }
        const p = opts.poderRival; if (!p) return false;
        const vivos = enemigos.filter((x) => x.hp > 0).length, esAs = vivos === 1 || ene === enemigos[enemigos.length - 1];
        if (!esAs || !poderesDisponibles(ene, false).includes(p)) return false;
        if (p === "z") { ene.usaZ = true; return false; }   // (el movimiento Z sale con su ataque: ver movZRival)
        if (p === "tera") ene.teraTipo = teraParaIA(ene);
        await activarPoder(false, p);
        return true;
    }
    // El rival con su cristal Z (Kukui…): convierte en Z el ataque elegido si es del tipo del cristal o, si no, su mejor ataque de
    // ese tipo. Solo una vez por combate.
    function movZRival(ene, mv) {
        if (!ene.usaZ || poder.rival || ene.forzado || ene.dinamax) return mv;
        const t = zDisponible(ene, false); if (!t) return mv;
        const cands = ene.movimientos.filter((m) => m.tipo === t && m.cat !== "est" && m.ppAct > 0 && !(ene.anulado && ene.anulado.clave === m.clave));
        const base = mv && mv.tipo === t && mv.cat !== "est" && cands.includes(mv) ? mv : cands.sort((a, b) => (b.poder || 0) - (a.poder || 0))[0];
        if (!base) return mv;
        poder.rival = "z"; ene.usaZ = false;
        return movZ(base);
    }
    // Teratipo del rival: entre los suyos y el de su mejor ataque, el que mejor aguanta tus ataques (a igualdad, el suyo).
    function teraParaIA(ene) {
        const ali = aliadoActivo(), golpes = ali ? ali.movimientos.filter((m) => m.cat !== "est") : [];
        const cand = [...new Set([...(ene.teraTipo ? [ene.teraTipo] : []), ...ene.tipos, ...ene.movimientos.filter((m) => m.cat !== "est").map((m) => m.tipo)])];
        const peor = (t) => Math.max(1, ...golpes.map((m) => efectividad(m.tipo, [t])));
        return cand.sort((a, b) => peor(a) - peor(b) || (ene.tipos.includes(b) ? 1 : 0) - (ene.tipos.includes(a) ? 1 : 0))[0] || ene.tipos[0];
    }
    // Dinamax como en Espada y Escudo: absorbe la energía, vuelve a su Poké Ball, que crece envuelta en energía roja, y sale
    // gigante (con su forma Gigamax si la tiene). El doble de PS y Maximovimientos durante 3 turnos.
    async function dinamaxizar(esAli) {
        const c = activoDe(esAli), sop = soporteEl(esAli);
        if (!c || !sop || !activo) return;
        const gmax = puedeGigamax(c), ROJO = COLOR_PODER.dinamax;
        // Absorbe la energía: le llega de todas partes (partículas del Deluxe Battle Kit) y se va tiñendo de rojo.
        let s = spriteEl(esAli), rojo = 0;
        if (s && s.offsetWidth) {
            rojo = 0.6; tintar(s, esAli, ROJO, 0, rojo, 900);
            energiaHacia(centroSprite(esAli), zoomEscena(esAli), ROJO, 18, 1050);
            AudioFX.efecto("charge", { vol: 0.3 });
        }
        await decir(`¡${c.nombre} está absorbiendo la energía Dinamax!`, 1100);
        await cinematicaPoder(esAli, "dinamax", c);
        const sitio = centroSprite(esAli);
        s = spriteEl(esAli);
        if (s && activo) await animRetirada(esAli, c, ROJO, rojo);
        c.dinamax = { turnos: 3, hpMax: c.hpMax, gmax };
        c.bloqueo = null;   // (sin el bloqueo del objeto Elección mientras dura)
        c.hp = c.hp * 2; c.hpMax = c.hpMax * 2;
        if (gmax) await montarCombatiente(esAli, c, false);
        await bolaGigante(esAli, c, sitio);
        pintarPoderes(esAli, c);
        s = spriteEl(esAli);
        if (s) {
            // Sale de la energía roja ya gigante: primero su silueta roja, que crece y se va aclarando.
            s.style.opacity = "1"; s.style.transformOrigin = "50% 100%";
            const luz = tintar(s, esAli, ROJO, 1, 0, 700);
            await anim(s, [{ transform: "scale(.3)" }, { transform: "scale(1.06)", offset: 0.7 }, { transform: "scale(1)" }], { duration: 560, easing: "cubic-bezier(.2,.9,.3,1)" });
            const pie = piesSprite(esAli), z = zoomEscena(esAli);
            temblor(gmax ? 2.6 : 2.2);
            anilloPoder(pie, z, ROJO, 700, gmax ? 5 : 4);
            if (gmax) setTimeout(() => activo && anilloPoder(pie, z, ROJO, 700, 6), 160 / velJuego());
            energiaDesde(centroSprite(esAli), z, ROJO, gmax ? 20 : 14, 800, 90);
            await luz;
            resetTransform(s); s.style.opacity = "1"; s.style.transformOrigin = "";
        } else temblor(2.2);
        AudioFX.grito(c.baseId, { rate: 0.72, vol: 0.75 });
        repintarFicha(esAli);
        await decir(gmax ? `¡${c.nombre} se ha gigamaxizado!` : `¡${c.nombre} se ha dinamaxizado!`, 1300);
    }
    // Su Poké Ball aparece donde estaba, crece con la energía roja y se abre de golpe.
    async function bolaGigante(esAli, c, sitio) {
        const cb = $("capa-bola"), b = cb && cb.querySelector(".bola-throw"); if (!b || !activo) return;
        const zb = prepararBola(b, (esAli && c.bola) || "poke-ball"), { x, y } = sitio;
        b.style.left = x + "px"; b.style.top = y + "px"; b.style.zIndex = "3";
        cb.classList.remove("oculta");
        const aura = celMega(Z_FX, x, y, zb * 1.1);
        aura.classList.add("fx-dinamax"); cb.insertBefore(aura, b);   // (detrás de la bola)
        AudioFX.efecto("charge", { vol: 0.5 });
        const z = zoomEscena(esAli), ROJO = COLOR_PODER.dinamax;
        energiaHacia(sitio, z, ROJO, 22, 1000, 100);   // (la energía sigue entrando en la bola mientras crece)
        anilloPoder(sitio, z, ROJO, 900, 0.2, 3);   // (un anillo que se cierra sobre ella)
        anim(aura, [{ transform: `translate(-50%,-50%) scale(${zb * 1.1})` }, { transform: `translate(-50%,-50%) scale(${zb * 3.4})`, offset: 0.7 },
                    { transform: `translate(-50%,-50%) scale(${zb * 3.6})` }], { duration: 1000, easing: "ease-out" });
        const llamas = (async () => { for (let i = 0; i < 3 && activo; i++) await fotogramasMega(aura, [3, 4, 5, 6], 80); })();
        const rojo = (a, b2) => `drop-shadow(0 0 ${a * zb}px #ff2050) drop-shadow(0 0 ${b2 * zb}px #ff0046)`;
        await anim(b, [
            { transform: "translate(-50%,-50%) scale(1)", filter: rojo(0, 0) },
            { transform: "translate(-50%,-50%) scale(3.2)", filter: rojo(3, 9), offset: 0.7 },
            { transform: "translate(-50%,-50%) scale(3) rotate(-14deg)", filter: rojo(3, 9), offset: 0.8 },
            { transform: "translate(-50%,-50%) scale(3.1) rotate(10deg)", filter: rojo(3, 9), offset: 0.9 },
            { transform: "translate(-50%,-50%) scale(3.3) rotate(0)", filter: rojo(5, 14) },
        ], { duration: 1000, easing: "ease-out" });
        await llamas;
        AudioFX.efecto("pb_rel");
        destelloColor(ROJO, sitio);
        anilloPoder(sitio, z, ROJO, 550, 3.2);
        energiaDesde(sitio, z, ROJO, 18, 700, 120);
        aura.remove(); ocultarBola();
    }
    // La ficha entera de nuevo (PS máximos del Dinamax, icono del teratipo).
    function repintarFicha(esAli) {
        const c = activoDe(esAli), f = $(esAli ? "caja-aliado" : "caja-enemigo"); if (!c || !f) return;
        pintarCaja(f, c, esAli, esAli ? aliados : enemigos);
        caja(esAli, true);
    }
    // Vuelve a su tamaño (al acabar los 3 turnos, al retirarse o al terminar el combate): sus PS vuelven a la escala normal.
    function quitarDinamax(c) {
        if (!c || !c.dinamax) return false;
        const d = c.dinamax;
        c.hp = c.hp > 0 ? Math.max(1, Math.round((c.hp * d.hpMax) / c.hpMax)) : 0;
        c.hpMax = d.hpMax; c.dinamax = null;
        return true;
    }
    async function desdinamaxizar(esAli) {
        const c = activoDe(esAli); if (!c || !c.dinamax) return;
        const gmax = c.dinamax.gmax, ROJO = COLOR_PODER.dinamax;
        // Se ilumina de rojo, la energía se le escapa en todas direcciones y encoge hasta su tamaño de siempre.
        const p = centroSprite(esAli), z = zoomEscena(esAli);
        const s = spriteEl(esAli);
        if (s) await tintar(s, esAli, ROJO, 0, 0.7, 260);
        quitarDinamax(c);
        pintarPoderes(esAli, c);   // (su soporte vuelve a su tamaño, con su transición)
        energiaDesde(p, z, ROJO, 16, 750, 80);
        AudioFX.efecto("pb_rel", { vol: 0.3 });
        anilloPoder(piesSprite(esAli), z, ROJO, 500, 0.3, 2.6);   // (la energía se recoge)
        await esperar(300);
        if (gmax) await montarCombatiente(esAli, c, true);
        const s2 = spriteEl(esAli);
        if (s2 && activo) await tintar(s2, esAli, ROJO, 0.7, 0, 420);
        repintarFicha(esAli);
        await decir(`¡${c.nombre} ha vuelto a su tamaño normal!`, 1100);
    }
    // Teracristal: el cristal de su teratipo lo envuelve y se rompe; queda cubierto de cristal (como en PokéRogue) y pasa a ser
    // de ese tipo hasta el final del combate.
    async function teracristalizar(esAli) {
        const c = activoDe(esAli); if (!c || !activo) return;
        const t = c.teraTipo || c.tipos[0], color = COLOR_TERA[t] || "#ffffff", id = esAli ? "tera-fx-a" : "tera-fx-r";
        ponerMensaje("");
        const cine = conCinematicas();
        await cinematicaPoder(esAli, "tera", c);
        let s = spriteEl(esAli), brillo = 0;
        AudioFX.efecto("shine", { vol: 0.55 });
        if (!cine && s && s.offsetWidth) {
            // (sin cinemática) La energía de su teratipo le llega de todas partes y empieza a brillar de su color.
            // (la animación de PokéRogue tiñe el sprite a su manera: su brillo, después)
            energiaHacia(centroSprite(esAli), zoomEscena(esAli), color, 16, 900);
            await AnimMov.reproducir("common-terastallize", ctxAnim(esAli, true));
            brillo = 0.6; if (activo) await tintar(s, esAli, color, 0, brillo, 300);
        }
        c.tiposAntesTera = (c.tiposBase || c.tipos).slice();
        c.teracristal = t; c.tipos = [t]; c.protean = true;   // (Mutatipo y Líbero ya no le cambian el tipo)
        s = spriteEl(esAli);
        if (s && activo) {
            // El cristal lo va cubriendo de abajo arriba, con un filo de luz, y se rompe dejándolo cristalizado.
            filtroTera(id, s, t); barridoTera(id, s, 0);
            pintarPoderes(esAli, c);
            const apaga = tintar(s, esAli, color, brillo, 0, 650);
            AudioFX.efecto("sparkle", { vol: 0.45 });
            await cubrirTera(id, s, 620);
            await apaga;
            AudioFX.sonar(SONIDO_PODER.cristal, { vol: 0.5 });
            const p = centroSprite(esAli), z = zoomEscena(esAli);
            destelloColor(color, p, 0.7);
            anilloPoder(p, z, color, 500, 2.4);
            energiaDesde(p, z, color, 16, 750, 85);
            iconoTera(esAli, t);
            s.style.transformOrigin = "50% 100%";
            await anim(s, [{ transform: "scale(1)" }, { transform: "scale(1.07,1.04)", offset: 0.4 }, { transform: "scale(1)" }], { duration: 320, easing: "ease-out" });
            s.style.transform = ""; s.style.transformOrigin = "";
        } else pintarPoderes(esAli, c);
        repintarFicha(esAli);
        await decir(`¡${c.nombre} se ha teracristalizado en el tipo ${TIPOS_ES[t]}!`, 1300);
    }
    // ---------- Energía de los poderes (gráficos del Deluxe Battle Kit) ----------
    // Su partícula (rosa: se tiñe al color de cada poder) converge en un punto o sale disparada de él; su anillo de energía
    // se expande (o se cierra); y un destello del color del poder, que sale de ese punto.
    function particulaPoder(p, z, color, k, n) {
        const i = document.createElement("img");
        i.src = DBK_FX.particula; i.alt = ""; i.className = "poder-particula";
        i.style.left = p.x + "px"; i.style.top = p.y + "px"; i.style.width = Math.round((9 + (k % 3) * 4) * z) + "px";
        i.style.filter = tenir(color, 330);
        efectosEl().appendChild(i);
        return { i, ang: (k / n) * Math.PI * 2 + Math.random() * 0.5 };
    }
    function energiaHacia(p, z, color, n = 16, ms = 900, radio = 70) {
        if (!efectosEl() || !activo) return Promise.resolve();
        const piezas = [];
        for (let k = 0; k < n; k++) {
            const { i, ang } = particulaPoder(p, z, color, k, n), r = (radio + Math.random() * radio * 0.6) * z;
            piezas.push(i);
            i.animate([
                { transform: `translate(-50%,-50%) translate(${Math.cos(ang) * r}px,${Math.sin(ang) * r * 0.8}px) scale(.6)`, opacity: 0 },
                { opacity: 1, offset: 0.3 },
                { transform: "translate(-50%,-50%) scale(.15)", opacity: 0.2 },
            ], { duration: (ms * 0.55) / velJuego(), delay: ((k / n) * ms * 0.45) / velJuego(), easing: "cubic-bezier(.55,0,.85,.45)", fill: "both" });
        }
        return esperar(ms + 40).then(() => piezas.forEach((i) => i.remove()));
    }
    function energiaDesde(p, z, color, n = 14, ms = 750, radio = 80) {
        if (!efectosEl() || !activo) return;
        for (let k = 0; k < n; k++) {
            const { i, ang } = particulaPoder(p, z, color, k, n), r = (radio * (0.6 + Math.random() * 0.7)) * z;
            i.animate([
                { transform: "translate(-50%,-50%) scale(1.1)", opacity: 1 },
                { transform: `translate(-50%,-50%) translate(${Math.cos(ang) * r}px,${Math.sin(ang) * r * 0.8 - 10 * z}px) scale(.25)`, opacity: 0 },
            ], { duration: (ms * (0.7 + Math.random() * 0.3)) / velJuego(), easing: "cubic-bezier(.15,.8,.3,1)", fill: "forwards" })
                .finished.then(() => i.remove(), () => i.remove());
        }
    }
    function anilloPoder(p, z, color, ms = 600, hasta = 3, desde = 0.2) {
        const cont = efectosEl(); if (!cont || !activo) return;
        const i = document.createElement("img");
        i.src = DBK_FX.pulso; i.alt = ""; i.className = "poder-anillo";
        i.style.left = p.x + "px"; i.style.top = p.y + "px"; i.style.width = Math.round(48 * z) + "px";
        i.style.filter = `drop-shadow(0 0 ${Math.round(3 * z)}px ${color}) drop-shadow(0 0 ${Math.round(7 * z)}px ${color})`;
        cont.appendChild(i);
        const abre = desde < hasta;
        i.animate([{ transform: `translate(-50%,-50%) scale(${desde})`, opacity: abre ? 1 : 0 },
                   { opacity: abre ? 0.75 : 0.9, offset: abre ? 0.35 : 0.7 },
                   { transform: `translate(-50%,-50%) scale(${hasta})`, opacity: abre ? 0 : 1 }],
            { duration: ms / velJuego(), easing: abre ? "cubic-bezier(.2,.7,.4,1)" : "ease-in", fill: "forwards" })
            .finished.then(() => i.remove(), () => i.remove());
    }
    function destelloColor(color, p, fuerza = 0.85) {
        const cont = efectosEl(); if (!cont || !conCamara()) return;
        const f = document.createElement("div");
        f.className = "poder-flash";
        f.style.background = `radial-gradient(circle at ${Math.round(p.x)}px ${Math.round(p.y)}px, #fff 0, ${color} 16%, transparent 78%)`;
        f.style.setProperty("--fuerza", fuerza);
        cont.appendChild(f); setTimeout(() => f.remove(), 650 / velJuego());
    }
    // Al teracristalizarse, el icono de su teratipo (el de Showdown) le brilla sobre la cabeza, como la corona de cristal.
    function iconoTera(esAli, t) {
        const cont = efectosEl(), s = spriteEl(esAli), e = escenaEl(); if (!cont || !s || !e) return;
        const rs = s.getBoundingClientRect(), re = e.getBoundingClientRect(), z = zoomEscena(false);
        const i = document.createElement("img");
        i.src = urlTera(t); i.alt = ""; i.className = "tera-corona";
        i.style.left = (rs.left - re.left + rs.width / 2) + "px"; i.style.top = Math.max(26 * z, rs.top - re.top + 6 * z) + "px";
        i.style.width = Math.round(22 * z) + "px"; i.style.setProperty("--tera", COLOR_TERA[t] || "#fff");
        cont.appendChild(i);
        i.animate([{ transform: "translate(-50%,-50%) scale(0) rotate(-30deg)", opacity: 0 },
                   { transform: "translate(-50%,-50%) scale(1.25) rotate(6deg)", opacity: 1, offset: 0.2 },
                   { transform: "translate(-50%,-60%) scale(1)", opacity: 1, offset: 0.75 },
                   { transform: "translate(-50%,-120%) scale(.9)", opacity: 0 }],
            { duration: 1500 / velJuego(), easing: "ease-out", fill: "forwards" }).finished.then(() => i.remove(), () => i.remove());
    }
    // Poder Z: el símbolo Z y el aura de fuego (gráficos de PokéRogue) envuelven al Pokémon.
    const Z_FX = prURL("images/battle_anims/PRAS- ZPower.png");
    async function auraZ(esAli) {
        const s = spriteEl(esAli); if (!s || !activo) return;
        const { x, y } = centroSprite(esAli), z = zoomEscena(esAli), rs = s.getBoundingClientRect(), re = escenaEl().getBoundingClientRect();
        const simbolo = celMega(Z_FX, x, Math.max(40 * z, rs.top - re.top - 16 * z), z * 1.1);
        simbolo.classList.add("fx-z-simbolo");
        await fotogramasMega(simbolo, [0], 10);
        const aura = celMega(Z_FX, x, y, z * 1.3);
        const detras = $("capa-anim-detras"); if (detras) detras.appendChild(aura);   // el aura, por detrás del Pokémon
        if (conCinematicas()) AudioFX.efecto("charge", { vol: 0.5 }); else AudioFX.sonar(SONIDO_PODER.z1, { vol: 0.55 });
        await fotogramasMega(aura, [1, 2, 3, 4, 5, 6, 7, 8], 75);
        aura.remove(); simbolo.remove();
    }
    // ---------- Poderes: cinemáticas ----------
    // Al usar un poder, como en el Deluxe Battle Kit de Essentials y con sus gráficos: primer plano del Pokémon de frente sobre
    // su escenario, su entrenador con el objeto que lo activa, la energía que converge en él y el destello que lo revela.
    // Se quitan en Opciones y se saltan tocando la pantalla.
    const conCinematicas = () => typeof config === "undefined" || config.cinematicas !== false;
    const COLOR_PODER = { dinamax: "#ff2d6e", z: "#ffd23a" };
    const OBJETO_PODER = { dinamax: prURL("images/items/dynamax_band.png"), tera: prURL("images/items/tera_orb.png"),
        z: "https://raw.githubusercontent.com/msikma/pokesprite/master/icons/key-item/z-ring.png" };
    const DBK_FX = { rafaga: dbkURL("Graphics/Plugins/Deluxe Battle Kit/burst.png"), pulso: dbkURL("Graphics/Plugins/Deluxe Battle Kit/pulse.png"),
        particula: dbkURL("Graphics/Plugins/Deluxe Battle Kit/particle.png"), brillo: dbkURL("Graphics/Plugins/Deluxe Battle Kit/shine.png") };
    const SONIDO_PODER = { accion: dbkURL("Audio/SE/DX Action.ogg"), cristal: prURL("audio/battle_anims/PRSFX- Mirror Shatter.wav"),
        z1: prURL("audio/battle_anims/PRSFX- Zpower1.wav"), z2: prURL("audio/battle_anims/PRSFX- ZPower2.wav") };
    const TERASTAL_FX = prURL("images/battle_anims/terastallize.png");
    // Tiñe un gráfico al color de un poder: gira su tono (el del gráfico, en grados) y, si el color es pálido, lo apaga.
    function tenir(hex, tonoBase) {
        const n = parseInt(hex.slice(1), 16), r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
        const mx = Math.max(r, g, b), d = mx - Math.min(r, g, b);
        const h = !d ? 0 : mx === r ? 60 * (((g - b) / d + 6) % 6) : mx === g ? 60 * ((b - r) / d + 2) : 60 * ((r - g) / d + 4);
        return `hue-rotate(${Math.round(h - tonoBase)}deg) saturate(${mx && d / mx < 0.3 ? 0.4 : 1.15})`;
    }
    async function cinematicaPoder(esAli, k, c) {
        const esc = escenaEl();
        if (!esc || !c || !activo || !conCinematicas()) return;
        const W = esc.clientWidth, H = esc.clientHeight, z = zoomEscena(false), tt = c.teraTipo || c.tipos[0];
        const color = k === "tera" ? COLOR_TERA[tt] || "#fff" : COLOR_PODER[k];
        // La cámara se acerca a su sitio, que queda en el centro.
        const re = esc.getBoundingClientRect(), pu = esc.querySelector(esAli ? ".puesto-aliado" : ".puesto-enemigo");
        const rp = pu ? pu.getBoundingClientRect() : { left: re.left + W / 2, top: re.top + H * 0.8 };
        const px = rp.left - re.left, py = rp.top - re.top, suelo = H * 0.8, fondo = esc.querySelector(".fondo-img"), ez = esAli ? 1.25 : 1.75;
        const cam = (v, p, lado) => Math.min(0, Math.max(lado - ez * lado, v - ez * p));   // (sin que asomen los bordes)
        const d = document.createElement("div");
        d.className = "cine-poder";
        d.style.setProperty("--color", color);
        d.innerHTML = `<img class="cine-fondo" alt="" ${fondo && fondo.src ? `src="${fondo.src}"` : ""} style="transform-origin:0 0;transform:translate(${cam(W / 2, px, W)}px,${cam(suelo, py, H)}px) scale(${ez})">
            <div class="cine-rafaga" style="background-image:url('${DBK_FX.rafaga}');filter:${tenir(color, 205)}"></div>
            <div class="cine-entrenador ${esAli ? "izq" : "der"}"><canvas id="cine-entrenador"></canvas></div>
            <div class="cine-sombra"></div>
            <div class="cine-brillo" style="background-image:url('${DBK_FX.brillo}')"></div>
            <div class="cine-caja${esAli ? " espejo" : ""}"><img class="cine-poke" id="cine-poke" alt=""></div>
            <div class="cine-fx"></div>
            <div class="cine-velo"></div>`;
        esc.appendChild(d);
        const q = (sel) => d.querySelector(sel), velo = q(".cine-velo"), fx = q(".cine-fx"), caja = q(".cine-caja");
        let saltar = false, alSaltar = null;
        const salto = new Promise((r) => { alSaltar = r; });
        const saltarYa = () => { saltar = true; alSaltar(); };
        const tecla = (e) => { if (["Enter", " ", "Escape"].includes(e.key)) { e.preventDefault(); saltarYa(); } };
        d.addEventListener("pointerdown", (e) => { e.preventDefault(); e.stopPropagation(); saltarYa(); });
        document.addEventListener("keydown", tecla);
        const t = (ms) => (saltar ? Promise.resolve() : Promise.race([esperar(ms), salto]));
        const A = (el, kf, ms, o) => el.animate(kf, Object.assign({ duration: ms / velJuego(), fill: "forwards", easing: "ease-out" }, o));
        const terminar = () => {
            document.removeEventListener("keydown", tecla);
            d.remove();
            const n = document.createElement("div");
            n.className = "cine-salida"; esc.appendChild(n);
            n.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 260 / velJuego(), fill: "forwards" }).finished.then(() => n.remove(), () => n.remove());
        };
        const fin = () => saltar || !activo;
        // Su sprite de frente (el tuyo, mirando al centro); si tarda en cargar, el que tiene en combate.
        const montar = async (gmax) => {
            const tr = c.transformado;
            await Promise.race([montarPokemon(q(".cine-poke"), tr ? tr.id : c.baseId, { espalda: false, shiny: c.shiny, mega: tr ? tr.mega : c.megaInfo || c.megaSprite, gmax }), esperar(1800)]);
            const p = q(".cine-poke"); if (!p) return null;
            const s = spriteEl(esAli);
            if (!p.dataset.nw && s && s.tagName === "IMG" && p.tagName === "IMG") { p.src = s.src; p.dataset.nw = s.dataset.nw || s.naturalWidth; p.dataset.nh = s.dataset.nh || s.naturalHeight; }
            tamanoNativo(p, z * 1.7, H * (gmax ? 0.66 : 0.5), W * 0.52);
            q(".cine-sombra").style.setProperty("--sombra", Math.round(Math.max(p.offsetWidth * 1.1, 110 * z)) + "px");
            return p;
        };
        let poke = await montar(false);
        if (!poke || fin()) return terminar();
        const centro = () => {
            const r = poke.getBoundingClientRect(), rd = d.getBoundingClientRect();
            return { x: r.left - rd.left + r.width / 2, y: r.top - rd.top + r.height / 2, w: r.width, h: r.height, top: r.top - rd.top };
        };
        const fotogramas = async (e, lista, ms) => { for (const f of lista) { if (saltar) return; e.style.backgroundPosition = `-${(f % 5) * 96}px -${Math.floor(f / 5) * 96}px`; await t(ms); } };
        const cosas = [];
        const cel = (url, x, y, escala, detras) => {
            const e = document.createElement("div");
            e.className = "anim-cel mega-cel"; e.style.backgroundImage = `url("${url}")`;
            e.style.left = x + "px"; e.style.top = y + "px"; e.style.transform = `translate(-50%,-50%) scale(${escala})`;
            if (detras) d.insertBefore(e, caja); else fx.appendChild(e);
            cosas.push(e);
            return e;
        };
        const pulso = (p) => {
            const e = document.createElement("img");
            e.src = DBK_FX.pulso; e.alt = ""; e.className = "cine-pulso";
            e.style.left = p.x + "px"; e.style.top = p.y + "px"; e.style.width = Math.round(Math.min(W, H) * 0.3) + "px";
            fx.appendChild(e);
            A(e, [{ transform: "translate(-50%,-50%) scale(1)", opacity: 1 }, { transform: "translate(-50%,-50%) scale(8)", opacity: 0 }], 500);
        };
        // 1. Del negro al primer plano.
        A(velo, [{ opacity: 1 }, { opacity: 0 }], 260);
        await t(260); if (fin()) return terminar();
        // 2. Su entrenador entra y el objeto del poder brilla sobre él: la Pulsera Dinamax, el Teraorbe o la Pulsera Z.
        const claveEnt = esAli ? `player_${opts.generoJugador === "f" ? "f" : "m"}` : opts.entrenadorSprite;
        let ent = null;
        if (claveEnt) {
            await Promise.race([montarEntrenador(q("#cine-entrenador"), claveEnt, { fps: 24 * velJuego() }), esperar(900)]);
            ent = q("#cine-entrenador");
            if (ent && ent.dataset.nw) {
                tamanoNativo(ent, z * 1.5, H * 0.5, W * 0.3);
                A(ent.parentNode, [{ translate: esAli ? "-170% 0" : "170% 0" }, { translate: "0 0" }], 380);
                await t(380);
            } else ent = null;
        }
        if (fin()) return terminar();
        const rd = d.getBoundingClientRect(), pc0 = centro(), re0 = ent && ent.getBoundingClientRect();
        const ob = document.createElement("img");
        ob.className = "cine-objeto"; ob.alt = ""; ob.src = OBJETO_PODER[k];
        ob.style.left = (re0 ? re0.left - rd.left + re0.width / 2 : pc0.x) + "px";
        ob.style.top = (re0 ? re0.top - rd.top : pc0.top) - 4 * z + "px";
        ob.style.width = Math.round(32 * z * 1.3) + "px";
        fx.appendChild(ob);
        AudioFX.sonar(SONIDO_PODER.accion, { vol: 0.55 });
        A(ob, [{ opacity: 0, transform: "translateY(0)" }, { opacity: 1, transform: `translateY(${-14 * z}px)`, offset: 0.6 },
               { opacity: 0, transform: `translateY(${-18 * z}px)` }], 950);
        await t(650); if (fin()) return terminar();
        // 3. El escenario se oscurece, el Pokémon se vuelve una silueta negra y luego blanca, y la energía converge en él.
        A(q(".cine-fondo"), [{ filter: "brightness(.9)" }, { filter: "brightness(.25)" }], 500);
        if (ent) A(ent, [{ filter: "brightness(1)" }, { filter: "brightness(.5)" }], 500);
        AudioFX.efecto("charge", { vol: 0.45 });
        A(poke, [{ filter: "brightness(1)" }, { filter: "brightness(0)", offset: 0.5 }, { filter: "brightness(0) invert(1)" }], 600);
        const pc = centro(), R = Math.max(W, H) * 0.45, tinte = tenir(color, 334);
        for (let i = 0; i < 10; i++) {
            const p = document.createElement("img");
            p.src = DBK_FX.particula; p.alt = ""; p.className = "cine-particula";
            p.style.left = pc.x + "px"; p.style.top = pc.y + "px"; p.style.width = Math.round(Math.min(W, H) * 0.1) + "px"; p.style.filter = tinte;
            fx.appendChild(p);
            const a = (i / 10) * Math.PI * 2 + 0.4;
            A(p, [{ transform: `translate(-50%,-50%) translate(${Math.cos(a) * R}px,${Math.sin(a) * R}px)`, opacity: 0 }, { opacity: 1, offset: 0.25 },
                  { transform: "translate(-50%,-50%) scale(.3)", opacity: 0 }], 380, { delay: (i * 55) / velJuego(), easing: "ease-in", fill: "both" });
        }
        await t(640); if (fin()) return terminar();
        // 4. Lo propio de cada poder.
        const esc1 = Math.max(pc.w, pc.h) / 96, crece = Math.max(1, Math.min(1.38, (suelo - 6) / Math.max(1, poke.offsetHeight)));
        if (k === "dinamax") {   // la energía roja lo envuelve y crece
            const aura = cel(Z_FX, pc.x, pc.y - pc.h * 0.05, esc1 * 1.35, true);
            aura.classList.add("fx-dinamax");
            A(poke, [{ transform: "scale(1)" }, { transform: `scale(${crece})` }], 700, { easing: "cubic-bezier(.3,1.5,.5,1)" });
            A(caja, Array.from({ length: 9 }, (_, i) => ({ transform: i === 8 ? "none" : `translateX(${i % 2 ? -3 : 3}px)` })), 700, { easing: "linear" });
            await fotogramas(aura, [1, 2, 3, 4, 5, 6, 7, 8], 85);
        } else if (k === "tera") {   // un cristal de su teratipo crece sobre él y estalla
            AudioFX.efecto("shine", { vol: 0.5 });
            const cr = cel(TERASTAL_FX, pc.x, pc.y, esc1 * 1.25, false);
            cr.style.filter = `${tenir(color, 174)} drop-shadow(0 0 ${4 * z}px ${color})`;
            await fotogramas(cr, [0, 1, 2, 3], 90);
            await t(220);
            AudioFX.sonar(SONIDO_PODER.cristal, { vol: 0.55 });
            A(cr, [{ opacity: 1, transform: `translate(-50%,-50%) scale(${esc1 * 1.25})` }, { opacity: 0, transform: `translate(-50%,-50%) scale(${esc1 * 2.4})` }], 300);
            pulso(pc);
            await t(160);
        } else {   // el símbolo Z aparece sobre él y el aura dorada lo envuelve
            AudioFX.sonar(SONIDO_PODER.z1, { vol: 0.6 });
            const sim = cel(Z_FX, pc.x, Math.max(44 * z, pc.top - 12 * z), z * 1.6, false);
            sim.classList.add("fx-z-simbolo");
            sim.style.backgroundPosition = "0 0";
            A(sim, [{ transform: `translate(-50%,-50%) scale(${z * 0.4})`, opacity: 0 }, { transform: `translate(-50%,-50%) scale(${z * 1.9})`, opacity: 1, offset: 0.6 },
                    { transform: `translate(-50%,-50%) scale(${z * 1.6})`, opacity: 1 }], 380);
            const aura = cel(Z_FX, pc.x, pc.y - pc.h * 0.05, esc1 * 1.35, true);
            await fotogramas(aura, [1, 2, 3, 4, 5, 6, 7, 8], 85);
        }
        if (fin()) return terminar();
        // 5. Destello blanco y aparece su silueta (si se gigamaxiza, ya con su forma Gigamax).
        velo.style.background = "#fff";
        A(velo, [{ opacity: 0 }, { opacity: 1 }], 160);
        await t(170);
        cosas.forEach((e) => e.remove());
        poke.getAnimations().forEach((a) => a.cancel()); caja.getAnimations().forEach((a) => a.cancel());
        const gmax = k === "dinamax" && puedeGigamax(c);
        if (gmax) poke = (await montar(true)) || poke;
        poke.style.transform = k === "dinamax" && !gmax ? `scale(${crece})` : "";
        poke.style.filter = "brightness(0)";
        A(velo, [{ opacity: 1 }, { opacity: 0 }], 240);
        if (fin()) return terminar();
        // 6. Se revela con la ráfaga de energía de su color, el brillo y la onda; se agita y ruge.
        const pc2 = centro(), lado = Math.max(pc2.w, pc2.h), brillo = q(".cine-brillo");
        brillo.style.left = pc2.x + "px"; brillo.style.top = pc2.y + "px";
        brillo.style.width = Math.round(lado * 2.4) + "px"; brillo.style.height = Math.round(lado * 1.8) + "px";
        brillo.style.filter = `drop-shadow(0 0 ${6 * z}px ${color})`;
        const parpadeo = [0, 0.94, 0.63, 0.94, 0.63, 0.94, 0.63, 0.94, 0].map((o, i, l) => ({ opacity: o, offset: i / (l.length - 1) }));
        A(q(".cine-rafaga"), parpadeo, 1400, { easing: "linear" });
        A(brillo, parpadeo, 1400, { easing: "linear" });
        pulso(pc2);
        if (k === "tera") { filtroTera("tera-fx-c", poke, tt); poke.dataset.tera = "1"; chispasTera(); }
        const final = k === "tera" ? `url(#tera-fx-c) drop-shadow(0 0 ${2 * z}px ${color})`
            : k === "dinamax" ? `drop-shadow(0 0 ${3 * z}px rgba(255,40,90,.95)) drop-shadow(0 0 ${8 * z}px rgba(255,0,70,.6))` : `drop-shadow(0 0 ${3 * z}px ${color})`;
        poke.style.filter = final;
        A(poke, [{ filter: "brightness(0)" }, { filter: "brightness(1)" }], 420, { fill: "none" });
        AudioFX.grito(c.baseId, { rate: k === "dinamax" ? 0.72 : 1, vol: 0.7 });
        if (k === "z") AudioFX.sonar(SONIDO_PODER.z2, { vol: 0.5 });
        A(caja, Array.from({ length: 13 }, (_, i) => ({ transform: i === 12 ? "none" : `translateY(${i % 2 ? -2 : 2}px)` })), 900, { easing: "linear" });
        // Encima, su teratipo o el símbolo Z.
        if (k === "tera") {
            const ic = document.createElement("img");
            ic.className = "cine-icono"; ic.alt = ""; ic.src = urlTera(tt);
            ic.style.left = pc2.x + "px"; ic.style.top = Math.max(40 * z, pc2.top - 4 * z) + "px"; ic.style.width = Math.round(30 * z) + "px";
            fx.appendChild(ic);
            A(ic, [{ opacity: 0, transform: "scale(.4)" }, { opacity: 1, transform: "scale(1)" }], 360, { delay: 200 / velJuego(), fill: "both" });
        } else if (k === "z") {
            const sim = cel(Z_FX, pc2.x, Math.max(44 * z, pc2.top - 12 * z), z * 1.5, false);
            sim.classList.add("fx-z-simbolo"); sim.style.backgroundPosition = "0 0";
            A(sim, [{ opacity: 0 }, { opacity: 1 }], 360, { delay: 200 / velJuego(), fill: "both" });
        }
        await t(1400); if (fin()) return terminar();
        // 7. A negro y de vuelta al combate.
        velo.style.background = "#000";
        A(velo, [{ opacity: 0 }, { opacity: 1 }], 240);
        await t(240);
        terminar();
    }

    // ---------- Teracristal: el cristal y sus destellos (como en PokéRogue) ----------
    // Su shader, con un filtro SVG: el sprite toma el tono del teratipo y se cubre de su textura de cristal tornasolada, que va
    // cambiando de color. Colores de los tipos de PokéRogue.
    const TERA_RGB = {
        normal: [168, 168, 120], fighting: [192, 48, 40], flying: [168, 144, 240], poison: [160, 64, 160], ground: [224, 192, 104], rock: [184, 160, 56],
        bug: [168, 184, 32], ghost: [112, 88, 152], steel: [184, 184, 208], fire: [240, 128, 48], water: [104, 144, 240], grass: [120, 200, 80],
        electric: [248, 208, 48], psychic: [248, 88, 136], ice: [152, 216, 216], dragon: [112, 56, 248], dark: [112, 88, 72], fairy: [232, 136, 200],
    };
    let svgEfectos = null, texTera = null;
    // Un SVG oculto con los filtros de los efectos (se crea la primera vez).
    function svgFx() {
        if (!svgEfectos || !svgEfectos.isConnected) {
            svgEfectos = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            svgEfectos.setAttribute("aria-hidden", "true");
            svgEfectos.style.cssText = "position:absolute;width:0;height:0;overflow:hidden;pointer-events:none";
            document.body.appendChild(svgEfectos);
        }
        return svgEfectos;
    }
    // La textura de cristal de PokéRogue coloreada como en su shader: tono según su gris y su posición; saturación y brillo, su gris.
    function texturaTera() {
        if (!texTera) texTera = cargarImagen(prURL("images/effects/tera.png"), true).then((img) => {
            const cv = document.createElement("canvas"), w = (cv.width = img.naturalWidth), h = (cv.height = img.naturalHeight);
            const g = cv.getContext("2d"); g.drawImage(img, 0, 0);
            const datos = g.getImageData(0, 0, w, h), p = datos.data;
            for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
                const i = (y * w + x) * 4, v = p[i] / 255;
                let tono = (v - 86 / 255) * 4 + (x / w) * 3 + (y / h) * 3; tono -= Math.floor(tono);
                const f = tono * 6, s = Math.floor(f) % 6, fr = f - Math.floor(f), a = v * (1 - v), b = v * (1 - fr * v), c = v * (1 - (1 - fr) * v);
                const [r, gg, bb] = [[v, c, a], [b, v, a], [a, v, c], [a, b, v], [c, a, v], [v, a, b]][s];
                p[i] = r * 255; p[i + 1] = gg * 255; p[i + 2] = bb * 255;
            }
            g.putImageData(datos, 0, 0);
            return cv.toDataURL();
        }).catch(() => null);
        return texTera;
    }
    function filtroTera(id, el, tipo) {
        const svgTera = svgFx();
        let f = svgTera.querySelector("#" + id);
        if (!f) {
            svgTera.insertAdjacentHTML("beforeend", `<filter id="${id}" x="0" y="0" width="1" height="1" color-interpolation-filters="sRGB">
                <feFlood flood-color="#ffffff" result="color"/>
                <feBlend in="color" in2="SourceGraphic" mode="hue" result="tono"/>
                <feComposite in="tono" in2="SourceGraphic" operator="arithmetic" k2="0.625" k3="0.375" result="base"/>
                <feImage x="0" y="0" width="200" height="120" preserveAspectRatio="none" result="textura"/>
                <feTile in="textura" result="mosaico"/>
                <feColorMatrix in="mosaico" type="hueRotate" values="0" result="tornasol"><animate attributeName="values" from="0" to="360" dur="1.96s" repeatCount="indefinite"/></feColorMatrix>
                <feComposite in="tornasol" in2="color" operator="arithmetic" k2="0.5" k3="0.5" result="cristal"/>
                <feBlend in="cristal" in2="base" mode="overlay" result="mezcla"/>
                <feComposite in="color" in2="mezcla" operator="arithmetic" k2="0" k3="1" result="final"/>
                <feComposite in="final" in2="SourceAlpha" operator="in" result="pintado"/>
                <feFlood flood-color="#ffffff" result="lleno"/>
                <feOffset in="lleno" dy="0" result="cubre"/>
                <feOffset in="lleno" dy="0" result="cubre2"/>
                <feComposite in="pintado" in2="cubre" operator="in" result="cristal-visto"/>
                <feComposite in="cubre" in2="cubre2" operator="out" result="franja"/>
                <feComposite in="franja" in2="SourceAlpha" operator="in" result="filo"/>
                <feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="cristal-visto"/><feMergeNode in="filo"/></feMerge>
            </filter>`);
            f = svgTera.querySelector("#" + id);
            texturaTera().then((url) => { if (url) f.querySelector("feImage").setAttribute("href", url); });
        }
        const rgb = TERA_RGB[tipo] || [255, 255, 255], mx = Math.max(...rgb), m = mx ? (1 - (mx - Math.min(...rgb)) / mx) / 2 : 0.5;
        f.querySelector("feFlood").setAttribute("flood-color", "#" + rgb.map((x) => x.toString(16).padStart(2, "0")).join(""));
        const fin = f.querySelector('[result="final"]'); fin.setAttribute("k2", m.toFixed(3)); fin.setAttribute("k3", (1 - m).toFixed(3));
        const nw = el && (Number(el.dataset.nw) || el.naturalWidth), k = el && el.offsetWidth && nw ? el.offsetWidth / nw : 2;
        const im = f.querySelector("feImage"); im.setAttribute("width", (200 * k).toFixed(1)); im.setAttribute("height", (120 * k).toFixed(1));
    }
    // El cristal lo cubre hasta la altura 'p' (de 0 a 1, de abajo arriba), con un filo de luz blanca donde se está formando.
    function barridoTera(id, el, p) {
        const f = svgFx().querySelector("#" + id); if (!f || !el) return;
        const h = el.offsetHeight || 100, nw = Number(el.dataset.nw) || el.naturalWidth || 96, k = el.offsetWidth ? el.offsetWidth / nw : 2;
        const dy = p >= 1 ? 0 : h * (1 - p), filo = p > 0 && p < 1 ? Math.max(2, 2.5 * k) : 0;
        f.querySelector('[result="cubre"]').setAttribute("dy", dy.toFixed(1));
        f.querySelector('[result="cubre2"]').setAttribute("dy", (dy + filo).toFixed(1));
    }
    function cubrirTera(id, el, ms) {
        const dur = Math.max(1, ms / velJuego()), t0 = performance.now();
        return new Promise((res) => {
            const paso = (ahora) => {
                const p = Math.min(1, (ahora - t0) / dur);
                barridoTera(id, el, p >= 1 || !activo ? 1 : 1 - (1 - p) * (1 - p));
                if (p < 1 && activo) requestAnimationFrame(paso); else res();
            };
            requestAnimationFrame(paso);
        });
    }
    // Subidas y bajadas de características, como en PokéRogue (y Blanco/Negro): su textura de flechas (roja al subir, azul al
    // bajar) recorre el cuerpo del Pokémon hacia arriba o hacia abajo durante un segundo y medio.
    let hojaStats = null;
    const relojStat = {};
    async function animStat(esAli, sube) {
        const s = spriteEl(esAli); if (!s || !s.offsetWidth) return;
        if (!hojaStats) hojaStats = cargarImagen(prURL("images/effects/battle_stats.png"), true).catch(() => null);
        const img = await hojaStats; if (!img || !activo) return;
        const nw = Number(s.dataset.nw) || s.naturalWidth || 96, k = s.offsetWidth / nw, lado = Math.max(2, Math.round(32 * k));
        const cv = document.createElement("canvas"); cv.width = cv.height = lado;
        const g = cv.getContext("2d"); g.imageSmoothingEnabled = false;
        g.drawImage(img, 0, sube ? 64 : 192, 32, 32, 0, 0, lado, lado);   // (sus casillas «atk» y «spd»)
        const id = esAli ? "stat-fx-a" : "stat-fx-r", svg = svgFx();
        let f = svg.querySelector("#" + id);
        if (!f) {
            svg.insertAdjacentHTML("beforeend", `<filter id="${id}" x="0" y="0" width="1" height="1" color-interpolation-filters="sRGB">
                <feImage x="0" y="0" width="32" height="32" preserveAspectRatio="none" result="tira"/>
                <feTile in="tira" result="mosaico"/>
                <feComposite in="mosaico" in2="SourceAlpha" operator="in" result="flechas"/>
                <feComponentTransfer in="flechas" result="velo"><feFuncA type="linear" slope="0"/></feComponentTransfer>
                <feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="velo"/></feMerge>
            </filter>`);
            f = svg.querySelector("#" + id);
        }
        const im = f.querySelector("feImage"), fa = f.querySelector("feFuncA");
        im.setAttribute("href", cv.toDataURL()); im.setAttribute("width", lado); im.setAttribute("height", lado);
        const tok = relojStat[id] = {};
        s.style.filter = "";
        const base = getComputedStyle(s).filter;
        s.style.filter = (base && base !== "none" ? base + " " : "") + `url(#${id})`;
        const dur = 1500 / velJuego(), t0 = performance.now(), recorrido = 160 * k;
        const pinta = (p) => {
            const y = (sube ? -1 : 1) * recorrido * p;
            im.setAttribute("y", (((y % lado) + lado) % lado).toFixed(1));
            fa.setAttribute("slope", (0.8375 * Math.max(0, Math.min(1, p * 6, (1 - p) * 6))).toFixed(3));
        };
        const fin = () => { if (relojStat[id] !== tok) return; relojStat[id] = null; if (s.style.filter.includes(id)) s.style.filter = ""; };
        const paso = (ahora) => {
            if (relojStat[id] !== tok) return;
            const p = Math.min(1, (ahora - t0) / dur);
            pinta(p);
            if (p < 1) requestAnimationFrame(paso); else fin();
        };
        pinta(0); requestAnimationFrame(paso);
        setTimeout(fin, dur + 120);
    }
    // Destellos: cada 200 ms nace uno en un punto al azar de su cuerpo (los de PokéRogue).
    let relojChispas = 0;
    const mascaras = new Map();   // la silueta de los sprites GIF, leída una vez (si su servidor lo permite)
    const siluetasCv = new WeakMap();   // y la de los sprites animados en lienzo
    // Dinamaxizado: brasas de energía roja (la partícula del Deluxe Battle Kit) suben sin parar desde su cuerpo.
    let relojBrasas = 0;
    function brasasDinamax() {
        if (relojBrasas) return;
        relojBrasas = setInterval(() => {
            const lados = activo ? [true, false].filter((ea) => { const c = activoDe(ea); return c && c.dinamax && c.hp > 0; }) : [];
            if (!lados.length) { clearInterval(relojBrasas); relojBrasas = 0; return; }
            const cont = efectosEl(); if (!cont || document.hidden) return;
            lados.forEach((ea) => {
                const s = spriteEl(ea), e = escenaEl(); if (!s || !e || !s.offsetWidth) return;
                const rs = s.getBoundingClientRect(), re = e.getBoundingClientRect(), z = zoomEscena(ea);
                const i = document.createElement("img");
                i.src = DBK_FX.particula; i.alt = ""; i.className = "poder-particula brasa";
                i.style.left = (rs.left - re.left + rs.width * (0.15 + Math.random() * 0.7)) + "px"; i.style.top = (rs.top - re.top + rs.height * (0.55 + Math.random() * 0.4)) + "px";
                i.style.width = Math.round((6 + Math.random() * 6) * z) + "px"; i.style.filter = tenir(COLOR_PODER.dinamax, 330);
                cont.appendChild(i);
                i.animate([{ transform: "translate(-50%,-50%) scale(.6)", opacity: 0 }, { opacity: 0.9, offset: 0.25 },
                           { transform: `translate(-50%,-50%) translate(${(Math.random() - 0.5) * 20 * z}px, ${-(40 + Math.random() * 40) * z}px) scale(.2)`, opacity: 0 }],
                    { duration: (1100 + Math.random() * 600) / velJuego(), easing: "ease-out", fill: "forwards" }).finished.then(() => i.remove(), () => i.remove());
            });
        }, 240);
    }
    function chispasTera() {
        if (relojChispas) return;
        relojChispas = setInterval(() => {
            const lista = activo ? [true, false].filter((ea) => { const c = activoDe(ea); return c && c.teracristal && c.hp > 0; }).map((ea) => spriteEl(ea)) : [];
            const cine = document.getElementById("cine-poke"); if (cine && cine.dataset.tera) lista.push(cine);
            if (!lista.length) { clearInterval(relojChispas); relojChispas = 0; return; }
            lista.forEach((s) => chispa(s));
        }, 200);
    }
    async function chispa(s) {
        const cont = s && s.parentNode; if (!cont || !s.offsetWidth || getComputedStyle(s).opacity === "0") return;
        let a; try { a = await Atlas.cargar(prURL("images/effects/tera_sparkle")); } catch (_) { return; }
        const nw = Number(s.dataset.nw) || s.naturalWidth, nh = Number(s.dataset.nh) || s.naturalHeight; if (!nw || !nh) return;
        const x = Math.floor(Math.random() * nw), y = Math.floor(Math.random() * nh);
        if (!(await opaco(s, x, y, nw, nh)) || !s.isConnected) return;
        const k = s.offsetWidth / nw, cv = document.createElement("canvas");
        cv.className = "chispa-tera";
        cv.style.left = (s.offsetLeft + (x + 0.5) * k) + "px"; cv.style.top = (s.offsetTop + (y + 0.5) * k) + "px";
        cv.style.width = Math.round(a.w * k) + "px";
        cont.appendChild(cv);
        Atlas.animar(cv, a, { fps: 12, bucle: false });
        setTimeout(() => cv.remove(), 1100);
    }
    async function opaco(s, x, y, nw, nh) {
        try {
            if (s.tagName === "CANVAS") {
                // (su silueta, copiada en un lienzo aparte y renovada cada segundo y medio: leer el suyo a menudo lo frena)
                let m = siluetasCv.get(s);
                if (!m || m.w !== s.width || m.h !== s.height || performance.now() - m.t > 1500) {
                    const cv = document.createElement("canvas"); cv.width = s.width; cv.height = s.height;
                    const g = cv.getContext("2d", { willReadFrequently: true }); g.drawImage(s, 0, 0);
                    m = { t: performance.now(), w: s.width, h: s.height, d: g.getImageData(0, 0, s.width, s.height).data };
                    siluetasCv.set(s, m);
                }
                const xx = Math.min(m.w - 1, Math.floor((x * m.w) / nw)), yy = Math.min(m.h - 1, Math.floor((y * m.h) / nh));
                return m.d[(yy * m.w + xx) * 4 + 3] > 0;
            }
            // (Showdown no deja leer los píxeles de sus sprites desde otra web: ni se intenta, para no llenar la consola de errores)
            if (!mascaras.has(s.src)) mascaras.set(s.src, /pokemonshowdown\.com/.test(s.src) ? Promise.resolve(null) : cargarImagen(s.src, true).then((img) => {
                const cv = document.createElement("canvas"); cv.width = nw; cv.height = nh;
                const g = cv.getContext("2d", { willReadFrequently: true }); g.drawImage(img, 0, 0, nw, nh);
                return g.getImageData(0, 0, nw, nh).data;
            }).catch(() => null));
            const m = await mascaras.get(s.src);
            if (m) return m[(y * nw + x) * 4 + 3] > 0;
        } catch (_) { /* sin permiso para leer sus píxeles */ }
        const dx = (x / nw - 0.5) / 0.34, dy = (y / nh - 0.6) / 0.38;   // si no se pueden leer: dentro de una elipse sobre su centro
        return dx * dx + dy * dy < 1;
    }
    // Lo que va a hacer falta: los campos de sus habilidades, las trampas, Drenadoras, Protección, la Teraexplosión de su
    // teratipo, el cristal y, con cinemáticas, sus gráficos, tu entrenador de frente y tus Pokémon de frente (y en Gigamax).
    function precargarPoderes() {
        const extra = new Set();
        aliados.concat(enemigos).forEach((p) => {
            if (TERRENO_HAB[p.habilidad]) extra.add(TERRENOS[TERRENO_HAB[p.habilidad]].anim);
            p.movimientos.forEach((m) => {
                if (ATRAPA[m.clave]) extra.add("common-" + m.clave);
                if (m.clave === "leech-seed") extra.add("common-leech-seed");
                if (m.especial === "proteccion") extra.add("common-protect");
                if (m.clave === "tera-blast" && p.teraTipo) extra.add(TERA_BLAST_ANIM[p.teraTipo]);
            });
        });
        AnimMov.precargar([...extra]);
        texturaTera();
        Atlas.cargar(prURL("images/effects/tera_sparkle")).catch(() => {});
        Atlas.cargar(PB_PARTICULAS).catch(() => {});
        if (!hojaStats) hojaStats = cargarImagen(prURL("images/effects/battle_stats.png"), true).catch(() => null);
        AudioFX.precargarUrls([SONIDO_PODER.cristal, SONIDO_PODER.z1]);
        if (!conCinematicas()) return;
        Object.values(DBK_FX).concat(Object.values(OBJETO_PODER), [TERASTAL_FX]).forEach((u) => cargarImagen(u).catch(() => {}));
        AudioFX.precargarUrls([SONIDO_PODER.accion, SONIDO_PODER.z2]);
        Atlas.cargar(urlEntrenadorPR(`player_${opts.generoJugador === "f" ? "f" : "m"}`)).catch(() => {});
        aliados.forEach((p) => {
            precargarSprite(candidatosSprite(p.baseId, false, p.shiny));
            if (GMAX[p.baseId]) precargarSprite(candidatosGmax(p.baseId, false, p.shiny));
        });
    }
    // Maximovimientos y Gigamovimientos: lo que hacen además del daño.
    async function efectoMax(ef, atacante, defensor, esAliado) {
        if (!ef || !activo) return;
        const rivalVivo = defensor && defensor.hp > 0;
        if (ef.clima && climaEnCampo() !== ef.clima) return ponerClima(ef.clima, atacante, esAliado, false);
        if (ef.terreno && terrenoEnCampo() !== ef.terreno) return ponerTerreno(ef.terreno, atacante, esAliado, false, true);
        if (ef.yo) return aplicarCambios(atacante, ef.yo, esAliado);
        if (ef.rival) return rivalVivo ? aplicarCambios(defensor, ef.rival, !esAliado, atacante) : null;
        const g = ef.gmax; if (!g) return;
        const ladoR = CAMPO.lados[esAliado ? "r" : "a"], ladoY = CAMPO.lados[esAliado ? "a" : "r"];
        if (g === "residuo") {   // Gigallamarada, Gigalianas, Gigacañonazo, Gigarroca Ígnea
            if (ladoR.gmax) return;
            ladoR.gmax = { tipo: ef.tipo, turnos: 4, nombre: ef.nombre };
            return decir(`¡${esAliado ? "El bando rival" : "Tu bando"} queda bajo los efectos de ${ef.nombre}!`, 1100);
        }
        if (g === "rocas" || g === "acero") {
            const k = g === "rocas" ? "rocas" : "acero";
            if (ladoR[k]) return;
            ladoR[k] = 1; pintarTrampas();
            return decir(PELIGROS[k].pone(!esAliado), 1200);
        }
        if (g === "despejar") { for (const yo of [esAliado, !esAliado]) await quitarPeligros(yo); return; }
        if (g === "velo") { if (ladoY.veloAurora) return; ladoY.veloAurora = 5; return decir(`¡Velo Aurora ha aumentado la resistencia ${esAliado ? "de tu bando" : "del bando rival"} ante los ataques físicos y especiales!`, 1300); }
        if (g === "critico") { atacante.critEtapa = Math.min(3, (atacante.critEtapa || 0) + 1); return decir(`¡${atacante.nombre} se está preparando para asestar golpes críticos!`, 1100); }
        if (g === "cura") { if (atacante.estado) { atacante.estado = null; actualizarEstadoCaja(esAliado); return decir(`¡${atacante.nombre} se ha curado de su problema de estado!`, 1000); } return; }
        if (g === "curaSexto") { if (atacante.hp < atacante.hpMax) { atacante.hp = Math.min(atacante.hpMax, atacante.hp + Math.floor(atacante.hpMax / 6)); actualizarHP(esAliado); return decir(`¡${atacante.nombre} ha recuperado PS!`, 900); } return; }
        if (!rivalVivo) return;
        if (g === "paralisis") return aplicarEstado(defensor, { tipo: "par" }, !esAliado, atacante);
        if (g === "veneno") return aplicarEstado(defensor, { tipo: "env" }, !esAliado, atacante);
        if (g === "venenoPar") return aplicarEstado(defensor, { tipo: alAzarC(["env", "par"]) }, !esAliado, atacante);
        if (g === "aturde") return aplicarEstado(defensor, { tipo: alAzarC(["env", "par", "dor"]) }, !esAliado, atacante);
        if (g === "confusion") return confundir(defensor, !esAliado, false, atacante);
        if (g === "velocidad") return aplicarCambios(defensor, { vel: -2 }, !esAliado, atacante);
        if (g === "bostezo") { if (!defensor.estado && !defensor.bostezo && azarC() < 0.5) { defensor.bostezo = 2; return decir(`¡${defensor.nombre} está somnoliento!`, 1000); } return; }
        if (g === "atrapa" || g === "trampa") {
            if (defensor.atrapado) return;
            defensor.atrapado = { mov: ef.nombre, clave: { fire: "fire-spin", ground: "sand-tomb" }[ef.tipo], turnos: g === "trampa" ? entreC(4, 5) : 99, por: atacante, sinDanio: g === "atrapa" };
            return decir(`¡${defensor.nombre} no puede escapar!`, 1000);
        }
        if (g === "pp") {
            const mv = defensor.ultimoMov && defensor.movimientos.find((x) => x.clave === defensor.ultimoMov);
            if (mv && mv.ppAct > 0) { mv.ppAct = Math.max(0, mv.ppAct - 2); return decir(`¡${ef.nombre} ha reducido los PP de ${mv.nombre} de ${defensor.nombre}!`, 1200); }
        }
    }
    // Secuencia completa, como en los juegos: reacción de las piedras, esfera de energía que se agrieta y estalla, y la mega.
    async function animacionMega(esAliado) {
        const c = esAliado ? aliadoActivo() : enemigoActivo();
        const info = megaDeC(c), s = spriteEl(esAliado), esc = escenaEl();
        if (!info || !s || !esc || !activo) return;
        const nombreAntes = c.nombre, quien = esAliado ? nombreJugador() : opts.titulo || "el rival";
        const quitarReaccion = reaccionMega(esAliado, c);
        await decir(info.ascenso ? `¡El ferviente deseo de ${quien} ha llegado hasta ${nombreAntes}!`
            : `¡La ${obj(c.objeto).nombre} de ${nombreAntes} está reaccionando a la Piedra Activadora de ${quien}!`, 1700);
        quitarReaccion();
        if (!activo) return;
        // Fondo de energía y el Pokémon se convierte en luz dentro de una esfera.
        const fondo = document.createElement("div");
        fondo.className = "mega-fondo";
        fondo.style.backgroundImage = `url("${MEGA_FX.fondo}")`;
        fondo.style.setProperty("--ancho", Math.round((256 * esc.clientHeight) / 192) + "px");
        $("capa-anim-fondo").appendChild(fondo);
        requestAnimationFrame(() => fondo.classList.add("visible"));
        const { x, y } = centroSprite(esAliado), rs = s.getBoundingClientRect(), z = zoomEscena(esAliado);
        const escala = limitar(Math.max(z, (Math.max(rs.width, rs.height) * 1.05) / 60), 1.5, 7);
        const quitarRayos = rayosMega(esAliado), pararParticulas = particulasMega(esAliado);
        AudioFX.sonar(MEGA_FX.sonido(1), { vol: 0.6 });
        const aLuz = anim(s, [{ filter: "brightness(1)" }, { filter: "brightness(0) invert(1) drop-shadow(0 0 8px #f0c8ff)" }], { duration: 420 });
        const orbe = celMega(MEGA_FX.orbe, x, y, escala);
        await fotogramasMega(orbe, [0, 1, 2, 3, 4], 75);
        await aLuz;
        s.style.opacity = "0";
        // Dentro de la esfera cambia de forma (mientras se agrieta, se prepara la mega).
        temblor(0.7);
        const cambio = (async () => { await aplicarMega(c); await montarCombatiente(esAliado, c); })().catch(() => {});
        await fotogramasMega(orbe, [5, 6, 7, 8, 9, 10, 11, 12], 95);
        await cambio;
        orbe.remove();
        pararParticulas();
        if (!activo) { fondo.remove(); quitarRayos(); return; }
        // La esfera estalla y aparece la megaevolución.
        AudioFX.sonar(MEGA_FX.sonido(2), { vol: 0.65 });
        const est = celMega(MEGA_FX.estallido, x, y, escala * 1.15);
        temblor(2); anillosMega(esAliado);
        await fotogramasMega(est, [0, 1], 70);
        estallidoMega(esAliado);
        const s2 = spriteEl(esAliado);
        s2.style.opacity = "1";
        const revela = anim(s2, [{ filter: "brightness(0) invert(1)" }, { filter: "brightness(1)" }], { duration: 650 });
        await fotogramasMega(est, [2, 3, 4], 85);
        est.remove();
        await revela;
        s2.style.filter = "";
        fondo.classList.remove("visible");
        quitarRayos();
        setTimeout(() => fondo.remove(), 500);
        await (esAliado ? renderAliado(false) : renderEnemigo(false));
        simboloMega(esAliado);
        AudioFX.gritoMega(info, c.baseId, { vol: 0.65 });
        await decir(`¡${nombreAntes} ha megaevolucionado en ${c.nombre}!`, 1600);
        await habilidadEntrada(esAliado);   // su nueva habilidad actúa al momento (Sequía de Mega-Charizard Y, Intimidación…)
    }

    let seccionMochila = null;
    const usableEnCombate = (k) => esBola(k) || CURA_PS[k] != null || !!CURA_ESTADO[k] || !!REVIVIR[k] || !!CURA_PP[k] || !!OBJ_X[k] || k === "dire-hit";
    // Situación para las Poké Balls especiales (Turno, Ocaso, Acopio…).
    const situacionCaptura = (enemigo) => ({
        enemigo, aliado: aliadoActivo(), turno,
        registrado: !!(opts.yaCapturado && opts.yaCapturado(enemigo.baseId)),
        noche: typeof claseHora === "function" && claseHora() === "noche", cueva: /cave/.test(opts.fondo || ""), pesca: !!opts.pesca,
    });
    const fmtMult = (x) => "×" + (Math.round(x * 10) / 10).toLocaleString("es-ES");
    function mostrarMochila() {
        ocultarMenus(); equipoMenuEl.classList.remove("oculta");
        const bolsa = opts.bolsa || {};
        const secciones = BOLSILLOS.filter((s) => ["cura", "balls", "objetos", "bayas"].includes(s.cat) && (s.cat !== "balls" || opts.permitirCaptura));
        if (!seccionMochila || !secciones.some((s) => s.cat === seccionMochila)) seccionMochila = secciones[0].cat;
        const tabs = secciones.map((s) => `<button class="mochila-tab ${s.cat === seccionMochila ? "activa" : ""}" data-sec="${s.cat}" title="${s.nombre}"><img src="${urlItem(s.icono)}" alt=""><span>${s.nombre}</span></button>`).join("");
        const lista = ordenarObjetos(Object.keys(bolsa).filter((k) => bolsa[k] > 0 && obj(k).bolsillo === seccionMochila && usableEnCombate(k)));
        const sit = seccionMochila === "balls" ? situacionCaptura(enemigoActivo()) : null;
        const items = lista.map((k) => {
            const f = obj(k), extra = sit ? `${efectoCorto(k)} · ahora ${multBola(k, sit) >= 255 ? "segura" : fmtMult(multBola(k, sit))}` : efectoCorto(k);
            return `<button class="mochila-item" data-item="${k}">
                <img src="${urlObj(k)}" alt="">
                <span class="mi-info"><b>${f.nombre}</b><span>${extra}</span></span>
                <span class="mi-cant">×${bolsa[k]}</span></button>`;
        }).join("") || `<p class="mochila-vacia">No llevas objetos de este bolsillo que se puedan usar ahora.</p>`;
        equipoMenuEl.innerHTML = `<div class="mochila-tabs">${tabs}</div>${items}<button class="move-volver" data-volver="1">Atrás</button>`;
        equipoMenuEl.querySelectorAll(".mochila-tab").forEach((b) => b.onclick = () => { seccionMochila = b.dataset.sec; AudioFX.ui("select"); mostrarMochila(); });
        equipoMenuEl.querySelectorAll(".mochila-item").forEach((b) => b.onclick = () => usarItem(b.dataset.item));
        equipoMenuEl.querySelector("[data-volver]").onclick = mostrarAcciones;
        ponerMensaje("¿Qué objeto quieres usar?");
    }
    function usarItem(k) {
        if (esBola(k)) return accionAtrapar(k);
        if (OBJ_X[k] || k === "dire-hit") return usarObjetoX(k);
        return usarCuraEnCombate(k);
    }
    // Elegir a quién se le da el objeto (pantalla de equipo). -1 si se cancela.
    function elegirAliado(mensaje, valido) {
        return new Promise((resolve) => {
            const orden = [iAliado, ...aliados.map((_, i) => i).filter((i) => i !== iAliado)];
            const pant = montarPantallaEquipo(capa, orden.map((i) => miembroPE(aliados[i])), {
                flotante: true, mensaje, textoCancelar: "Atrás",
                alElegir: (k) => {
                    const i = orden[k];
                    if (!valido(aliados[i])) { AudioFX.ui("error"); pant.mensaje("No tendría ningún efecto."); return; }
                    pant.cerrar(); resolve(i);
                },
                alCancelar: () => { pant.cerrar(); resolve(-1); },
            });
        });
    }
    function elegirMovimiento(c, mensaje, valido) {
        return new Promise((resolve) => {
            ocultarMenus(); movesEl.classList.remove("oculta");
            ponerMensaje(mensaje);
            movesEl.innerHTML = c.movimientos.map((mv, i) => botonMov(mv, i, "", !valido(mv))).join("") + `<button class="move-volver" data-volver="1">Atrás</button>`;
            movesEl.querySelectorAll(".move-btn").forEach((b) => { if (!b.disabled) b.onclick = () => resolve(Number(b.dataset.i)); });
            movesEl.querySelector("[data-volver]").onclick = () => resolve(-1);
        });
    }
    function puedeRecibir(k, p) {
        if (REVIVIR[k]) return p.hp <= 0;
        if (p.hp <= 0) return false;
        return (CURA_PS[k] != null && p.hp < p.hpMax) || !!(CURA_ESTADO[k] && p.estado && CURA_ESTADO[k].includes(p.estado.tipo))
            || !!(CURA_PP[k] && p.movimientos.some((m) => m.ppAct < m.pp));
    }
    async function usarCuraEnCombate(k) {
        const bolsa = opts.bolsa || {}; if ((bolsa[k] || 0) <= 0) return;
        const f = obj(k);
        let objetivos, mov = null;
        if (k === "sacred-ash") {
            objetivos = aliados.filter((p) => p.hp <= 0);
            if (!objetivos.length) { AudioFX.ui("error"); ponerMensaje("No tendría ningún efecto."); return; }
        } else {
            const i = await elegirAliado(`¿En qué Pokémon quieres usar ${f.nombre}?`, (p) => puedeRecibir(k, p));
            if (i < 0) return mostrarMochila();
            objetivos = [aliados[i]];
            if (CURA_PP[k] && !PP_A_TODOS.has(k)) {
                const j = await elegirMovimiento(aliados[i], "¿Qué movimiento quieres restaurar?", (m) => m.ppAct < m.pp);
                if (j < 0) return mostrarMochila();
                mov = aliados[i].movimientos[j];
            }
        }
        bolsa[k]--; if (opts.guardarBolsa) opts.guardarBolsa();
        ocultarMenus(); bloqueado = true;
        await decir(`Has usado ${f.nombre}.`, 650);
        for (const p of objetivos) await aplicarCura(k, p, mov);
        if (await turnoEnemigoSolo()) return;
        mostrarAcciones();
    }
    async function aplicarCura(k, p, mov) {
        const enCampo = p === aliadoActivo();
        if (REVIVIR[k]) {
            p.hp = Math.max(1, Math.floor(p.hpMax * REVIVIR[k])); p.estado = null;
            AudioFX.efecto("restore"); renderBolas();
            await decir(`¡${p.nombre} se ha recuperado del debilitamiento!`, 1100);
            return;
        }
        if (enCampo) await animComun("common-health-up", true);
        AudioFX.efecto("restore");
        if (CURA_PS[k] != null && p.hp < p.hpMax) {
            const antes = p.hp; p.hp = Math.min(p.hpMax, p.hp + psQueCura(k, p.hpMax));
            if (enCampo) actualizarHP(true);
            await decir(`¡${p.nombre} ha recuperado ${p.hp - antes} PS!`, 1000);
        }
        if (CURA_ESTADO[k] && p.estado && CURA_ESTADO[k].includes(p.estado.tipo)) {
            p.estado = null; if (enCampo) actualizarEstadoCaja(true);
            await decir(`¡${p.nombre} se ha recuperado de su problema de estado!`, 1000);
        }
        if (CURA_PP[k]) {
            (mov ? [mov] : p.movimientos).forEach((m) => { m.ppAct = Math.min(m.pp, m.ppAct + CURA_PP[k]); });
            await decir(mov ? `¡Se han restaurado los PP de ${mov.nombre}!` : `¡Se han restaurado los PP de ${p.nombre}!`, 1000);
        }
    }
    // Objetos de combate: Ataque X, Defensa X… (+2) y Crítico X.
    async function usarObjetoX(k) {
        const bolsa = opts.bolsa || {}; if ((bolsa[k] || 0) <= 0) return;
        const c = aliadoActivo();
        if (k === "dire-hit" ? c.critEtapa >= 2 : c.etapas[OBJ_X[k]] >= 6) { AudioFX.ui("error"); ponerMensaje("No tendría ningún efecto."); return; }
        bolsa[k]--; if (opts.guardarBolsa) opts.guardarBolsa();
        ocultarMenus(); bloqueado = true;
        await decir(`Has usado ${obj(k).nombre}.`, 650);
        await AnimMov.reproducir("common-use-item", ctxAnim(true, true));
        if (k === "dire-hit") {
            c.critEtapa = 2; AudioFX.efecto("stat_up");
            await decir(`¡${c.nombre} se está concentrando para asestar un golpe crítico!`, 1100);
        } else await aplicarCambios(c, { [OBJ_X[k]]: 2 }, true);
        if (await turnoEnemigoSolo()) return;
        mostrarAcciones();
    }

    // ---------- Experiencia ----------
    function subirNivel(c) {
        c.xp -= c.xpProx;
        c.nivel = Math.min(100, c.nivel + 1);
        const antesMax = c.hpMax;
        const sd = statsDeNivel(c.base, c.nivel, c.ev, c.naturaleza);
        c.hpMax = sd.hpMax; c.stats = sd.stats;
        c.hp += (c.hpMax - antesMax);
        c.xpProx = xpNecesaria(c.nivel, c.factorExp || 1);
        if (c.nivel >= 100) c.xp = 0;
    }
    async function ganarXP(c, cantidad, esActivo) {
        if (!c || cantidad <= 0) return;
        if (esActivo) await decir(`${c.nombre} ganó ${cantidad} puntos de experiencia.`, 800);
        let restante = cantidad, antesSubida = null;
        while (restante > 0 && activo) {
            if (c.nivel >= 100) { c.xp = 0; if (esActivo) animarBarraXP(c, 0); break; }
            const add = Math.min(c.xpProx - c.xp, restante);
            c.xp += add; restante -= add;
            if (esActivo) {
                const ms = Math.round(limitar((add / c.xpProx) * 1500, 220, 1500) / velJuego());
                AudioFX.efectoDurante("exp", ms, { vol: 0.35 });
                animarBarraXP(c, ms);
                await pausa(ms + 40);
            }
            if (c.xp >= c.xpProx) {
                if (!antesSubida) antesSubida = { nivel: c.nivel, hpMax: c.hpMax, stats: Object.assign({}, c.stats) };
                subirNivel(c);
                AudioFX.efecto("level_up_fanfare");
                if (esActivo) { await renderAliado(false); animarBarraXP(c, 0); }
            }
        }
        if (antesSubida && activo) {
            await decir(`¡${c.nombre} subió al nivel ${c.nivel}!`, 850);
            await pantallaSubidaNivel(c, antesSubida);
            await aprenderEnCombate(c, antesSubida.nivel, c.nivel);
        }
    }
    // ---------- Aprender movimientos en pleno combate (al subir de nivel o evolucionar) ----------
    async function aprenderEnCombate(c, desde, hasta, alEvolucionar = false) {
        let d; try { d = await cargarPokemon(c.baseId); } catch (_) { return; }
        let nuevos = [];
        try { nuevos = alEvolucionar ? await movimientosDeEvolucion(d, hasta, c.movimientos) : await nuevosMovimientos(d, desde, hasta, c.movimientos); } catch (_) {}
        for (const mov of nuevos) { if (!activo) return; await ofrecerMovimiento(c, mov); }
    }
    async function ofrecerMovimiento(c, mov) {
        const { nivel: _, ...m } = mov;
        if (c.movimientos.some((x) => x.clave === m.clave)) return;
        m.pp = m.pp || 20; m.ppAct = m.pp;
        if (c.movimientos.length < 4) {
            c.movimientos.push(m);
            AudioFX.efecto("level_up_fanfare");
            await decir(`¡${c.nombre} aprendió ${m.nombre}!`, 1300);
            return;
        }
        await decir(`${c.nombre} quiere aprender ${m.nombre}...`, 1100);
        await decir(`...pero ya conoce cuatro movimientos.`, 1100);
        const i = await elegirOlvido(c, m);
        if (i < 0) { await decir(`${c.nombre} no aprendió ${m.nombre}.`, 1100); return; }
        const viejo = c.movimientos[i];
        c.movimientos[i] = m;
        c.olvidados = [...new Set([...(c.olvidados || []), viejo.clave])].filter((k) => k !== m.clave);
        await decir("1, 2 y... ¡Puf!", 900);
        await decir(`${c.nombre} olvidó ${viejo.nombre}...`, 1000);
        AudioFX.efecto("level_up_fanfare");
        await decir(`...¡y aprendió ${m.nombre}!`, 1200);
    }
    function elegirOlvido(c, nuevo) {
        return new Promise((resolve) => {
            ocultarMenus(); movesEl.classList.remove("oculta");
            ponerMensaje(`¿Qué movimiento debería olvidar ${c.nombre}?`);
            movesEl.innerHTML = c.movimientos.map((mv, i) => botonMov(mv, i, "")).join("") +
                `<div class="olvidar-nuevo">${botonMov(nuevo, -1, "No aprender")}</div>`;
            const ui = capa.querySelector(".batalla-ui"); ui.classList.add("alta");
            movesEl.querySelectorAll(".move-btn").forEach((b) => {
                b.disabled = false; b.classList.remove("agotado");   // también se puede olvidar uno sin PP
                b.onclick = () => { movesEl.classList.add("oculta"); ui.classList.remove("alta"); resolve(Number(b.dataset.i)); };
            });
        });
    }
    // ---------- Evolución al terminar el combate (dentro del propio combate, como en los juegos) ----------
    async function evolucionesTrasCombate() {
        if (!opts.evolucionar) return;
        for (const c of aliados) {
            if (!activo) return;
            if (c.hp <= 0 || c.nivel <= (c.nivelEntrada ?? c.nivel)) continue;
            let nuevoId = null;
            try { nuevoId = await opts.evolucionar(c); } catch (_) { nuevoId = null; }
            if (nuevoId && activo) {
                const n = await crearCombatiente({ id: nuevoId, nivel: c.nivel, objeto: c.objeto, shiny: c.shiny, bola: c.bola, xp: c.xp,
                    movimientos: c.movimientos, genero: c.genero, mote: c.mote, ev: c.ev });
                const ratio = c.hp / c.hpMax;
                Object.assign(c, n, { hp: Math.max(1, Math.round(n.hpMax * ratio)), estado: c.estado, olvidados: c.olvidados });
                if (c === aliadoActivo()) await renderAliado(true, true);
                await aprenderEnCombate(c, c.nivel, c.nivel, true);
            }
            c.nivelEntrada = c.nivel;
        }
    }
    // Subida de nivel, como la ventana de estadísticas de Blanco/Negro: primero lo que gana cada una (+N)
    // y, al pulsar (o solo), cómo suben hasta su nuevo valor. Con su toque: el Pokémon en un escenario de su tipo.
    const COLOR_TIPO = {
        normal: "#a8a77a", fire: "#ee8130", water: "#6390f0", electric: "#f7d02c", grass: "#7ac74c", ice: "#96d9d6",
        fighting: "#c22e28", poison: "#a33ea1", ground: "#e2bf65", flying: "#a98ff3", psychic: "#f95587", bug: "#a6b91a",
        rock: "#b6a136", ghost: "#735797", dragon: "#6f35fc", dark: "#705746", steel: "#b7b7ce", fairy: "#d685ad",
    };
    function pantallaSubidaNivel(c, antes) {
        return new Promise((resolve) => {
            if (!activo) return resolve();
            const datos = [
                ["PS", antes.hpMax, c.hpMax], ["Ataque", antes.stats.atk, c.stats.atk],
                ["Defensa", antes.stats.def, c.stats.def], ["At. Esp.", antes.stats.spa, c.stats.spa],
                ["Def. Esp.", antes.stats.spd, c.stats.spd], ["Velocidad", antes.stats.vel, c.stats.vel],
            ];
            const tope = Math.max(...datos.map((d) => d[2])) * 1.08, mayor = Math.max(...datos.map(([, a, b]) => b - a));
            const col1 = COLOR_TIPO[c.tipos[0]] || "#5b8ee6", col2 = COLOR_TIPO[c.tipos[1] || c.tipos[0]] || col1;
            const capaN = document.createElement("div");
            capaN.className = "capa-nivel";
            capaN.innerHTML = `<div class="nivel-card" style="--c1:${col1};--c2:${col2}">
                <div class="nivel-cabecera">
                    <div class="nivel-rayos"></div>
                    <div class="nivel-escena">
                        <span class="nivel-peana"></span>
                        ${Array.from({ length: 8 }, (_, i) => `<img class="nivel-chispa" src="${prURL("images/effects/evo_sparkle.png")}" alt="" style="--x:${8 + ((i * 37) % 84)}%;--d:${(i * 0.23).toFixed(2)}s">`).join("")}
                        <img class="nivel-sprite" alt="">
                    </div>
                    <div class="nivel-titulo">
                        <span class="nivel-cinta">¡Subida de nivel!</span>
                        <b class="nivel-nombre ${c.nombre.length > 10 ? "largo" : ""}">${c.nombre}</b>
                        <span class="nivel-tipos">${c.tipos.map((t) => iconoTipo(t, 2)).join("")}</span>
                        <span class="nivel-nv"><small>Nv.</small><span class="nv-antes">${antes.nivel}</span><i class="nv-flecha"></i><span class="nv-nuevo">${c.nivel}</span></span>
                    </div>
                </div>
                <div class="nivel-panel ventana-pk">
                    ${datos.map(([n, a, b], i) => `<div class="nivel-fila ${b - a === mayor && mayor > 0 ? "mejor" : ""}" style="--i:${i}">
                        <span class="nf-n">${n}</span>
                        <span class="nf-barra"><span class="nf-antes" style="width:${((a / tope) * 100).toFixed(1)}%"></span><span class="nf-gana" style="left:${((a / tope) * 100).toFixed(1)}%;width:${(((b - a) / tope) * 100).toFixed(1)}%"></span></span>
                        <span class="nf-v" data-de="${a}" data-a="${b}">${a}</span>
                        <span class="nf-d">+${b - a}</span>
                    </div>`).join("")}
                </div>
                <button class="nivel-ok"><span>Continuar</span><i class="nivel-flecha"></i></button>
            </div>`;
            document.body.appendChild(capaN);
            const card = capaN.querySelector(".nivel-card");
            montarPokemon(capaN.querySelector(".nivel-sprite"), c.baseId, { shiny: c.shiny, mega: c.megaInfo })
                .then((el) => tamanoNativo(el, 2, 130, 150));
            // Segunda parte: los números suben hasta su nuevo valor y se llenan las barras.
            let fase2 = false, cerrado = false;
            const subir = () => {
                if (fase2 || !capaN.isConnected) return;
                fase2 = true; card.classList.add("fase2");
                AudioFX.efecto("stat_up", { vol: 0.3 });
                const nums = [...card.querySelectorAll(".nf-v")], t0 = performance.now(), dur = 650 / velJuego();
                const paso = (t) => {
                    const k = Math.min(1, (t - t0) / dur);
                    nums.forEach((n) => { const a = +n.dataset.de, b = +n.dataset.a; n.textContent = Math.round(a + (b - a) * k); });
                    if (k < 1 && capaN.isConnected) requestAnimationFrame(paso);
                };
                requestAnimationFrame(paso);
            };
            const tSubir = setTimeout(subir, (250 + datos.length * 90 + 500) / velJuego());
            // Primer toque: completa la subida; el segundo, cierra (como en los juegos).
            const cerrarN = () => {
                if (cerrado) return;
                if (!fase2) { clearTimeout(tSubir); subir(); return; }
                cerrado = true; clearTimeout(tSubir);
                document.removeEventListener("keydown", onKey, true);
                capaN.classList.add("cerrando");
                setTimeout(() => { capaN.remove(); resolve(); }, 180);
            };
            const onKey = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); cerrarN(); } };
            document.addEventListener("keydown", onKey, true);
            capaN.querySelector(".nivel-ok").onclick = cerrarN;
            if (velJuego() > 1) setTimeout(() => { subir(); setTimeout(cerrarN, 900 / velJuego()); }, 2200 / velJuego());   // acelerado: sigue solo
        });
    }
    async function repartirXP(enemigo) {
        if (!opts.darXP) return;
        const total = xpPorVictoria(enemigo);
        const c = aliadoActivo();
        const huevo = (p, n) => (p.objeto === "lucky-egg" ? Math.floor(n * 1.5) : n);   // Huevo Suerte: +50 %
        if (c.hp > 0) await ganarXP(c, huevo(c, total), true);   // (tras una doble caída, solo los del Repartir Experiencia)
        if (opts.expShare && opts.expShare()) {
            const otros = aliados.filter((p) => p !== c && p.hp > 0);
            if (otros.length) {
                const cada = Math.max(1, Math.ceil(total / 2));
                await decir(`El Repartir Experiencia da ${cada} puntos al resto del equipo.`, 950);
                for (const p of otros) { if (!activo) break; await ganarXP(p, huevo(p, cada), false); }
            }
        }
    }

    // ---------- Habilidades ----------
    const activoDe = (esAli) => (esAli ? aliadoActivo() : enemigoActivo());
    // Cartel de la habilidad (el de PokéRogue): entra por su lado con el nombre del Pokémon y el de su habilidad.
    async function cartelHabilidad(c, esAli, hab = c.habilidad) {
        const e = escenaEl(); if (!e || !hab || !activo) return;
        e.querySelectorAll(`.cartel-habilidad.${esAli ? "aliado" : "rival"}`).forEach((x) => x.remove());
        const b = document.createElement("div");
        b.className = "cartel-habilidad " + (esAli ? "aliado" : "rival");
        b.style.backgroundImage = `url("${PR_UI(`ability_bar_${esAli ? "left" : "right"}.png`)}")`;
        b.style.setProperty("--ch", (e.clientWidth / 320).toFixed(3));   // a la escala de la pantalla de 320 px de PokéRogue
        b.innerHTML = `<span>${c.nombre}</span><b>${nombreHabilidad(hab)}</b>`;
        e.appendChild(b);
        void b.offsetWidth; b.classList.add("dentro");
        setTimeout(() => { b.classList.remove("dentro"); setTimeout(() => b.remove(), 350); }, 1700 / velJuego());
        await esperar(280);
    }
    // Indicador del tiempo atmosférico (con los turnos que le quedan).
    // Arriba, lo que afecta a todo el campo: el tiempo atmosférico y Espacio Raro (con sus turnos).
    function pintarClima() {
        const el = $("clima-batalla"); if (!el) return;
        const t = climaEnCampo(), partes = [];
        if (t) partes.push(`<span class="cb-${t}">${CLIMAS[t].nombre}${CAMPO.clima.fijo ? "" : `<b class="num-pk">${CAMPO.clima.turnos}</b>`}</span>`);
        const cf = $("clima-fondo");   // (la imagen del tiempo de Showdown sobre el escenario)
        if (cf && cf.dataset.t !== (t || "")) {
            cf.dataset.t = t || "";
            if (t) cf.style.backgroundImage = `url("${urlClimaFx(t)}")`;
            cf.className = "clima-fondo" + (t ? " activo t-" + t : "");
        }
        const tr = terrenoEnCampo();
        if (tr) partes.push(`<span class="cb-${tr}">${TERRENOS[tr].nombre}<b class="num-pk">${CAMPO.terreno.turnos}</b></span>`);
        if (CAMPO.espacioRaro > 0) partes.push(`<span>Espacio Raro<b class="num-pk">${CAMPO.espacioRaro}</b></span>`);
        const er = $("espacio-raro-batalla"); if (er) er.classList.toggle("activo", CAMPO.espacioRaro > 0);   // (la cuadrícula de Showdown)
        const h = partes.join("");
        if (el._h === h) return;
        el._h = h;
        el.className = "clima-batalla" + (t ? " clima-" + t : "") + (partes.length ? "" : " oculta");
        el.innerHTML = h;
    }
    // El campo se ve sobre el escenario (con la imagen de cada uno).
    function pintarTerreno() {
        const el = $("terreno-batalla"); if (!el) return;
        const t = terrenoEnCampo();
        if (t) el.style.backgroundImage = `url("https://play.pokemonshowdown.com/fx/weather-${TERRENOS[t].img}.png")`;
        el.classList.toggle("activo", !!t);
        pintarClima();
    }
    // conAnim: su animación (la de PokéRogue) cuando no la pone un movimiento de campo, que ya tiene la suya.
    async function ponerTerreno(tipo, c, esAli, porHabilidad, conAnim = porHabilidad) {
        if (terrenoEnCampo() === tipo) { if (!porHabilidad) await decir("¡Pero falló!", 800); return false; }
        if (porHabilidad) await cartelHabilidad(c, esAli);
        CAMPO.terreno = { tipo, turnos: c.objeto === "terrain-extender" ? 8 : 5 };   // 8 con el Cubresuelos
        if (conAnim) await animComun(TERRENOS[tipo].anim, esAli);
        pintarTerreno();
        await decir(TERRENOS[tipo].empieza, 1100);
        for (const ea of [true, false]) { const p = activoDe(ea); if (p && p.hp > 0 && p.habilidad === "mimicry") await mimetismo(p, ea); }
        for (const ea of ordenFijo()) await semilla(activoDe(ea), ea);
        for (const ea of [true, false]) {   // Carga Cuark
            const p = activoDe(ea);
            if (p && p.hp > 0 && p.habilidad === "quark-drive" && tipo === "electrico" && !p.potenciado) { await cartelHabilidad(p, ea); await decir(`¡El Campo Eléctrico ha activado la Carga Cuark de ${p.nombre}!`, 1100); }
        }
        await potenciadoras();
        return true;
    }
    // Mimetismo: con un campo pasa a ser de su tipo; sin campo, vuelve a sus tipos de siempre.
    async function mimetismo(c, esAli) {
        const t = terrenoEnCampo(), nuevo = t ? [TERRENOS[t].tipo] : (c.tiposBase || c.tipos);
        if (c.teracristal || nuevo.join() === c.tipos.join()) return;
        await cartelHabilidad(c, esAli);
        c.tipos = nuevo.slice(); repintarFicha(esAli);
        await decir(t ? `¡${c.nombre} ha cambiado a tipo ${TIPOS_ES[nuevo[0]]}!` : `¡${c.nombre} ha recuperado sus tipos de siempre!`, 1100);
    }
    async function quitarTerreno() {
        const t = terrenoEnCampo(); if (!t) return false;
        CAMPO.terreno = null; pintarTerreno();
        await decir(TERRENOS[t].fin, 1000);
        for (const ea of [true, false]) { const p = activoDe(ea); if (p && p.hp > 0 && p.habilidad === "mimicry") await mimetismo(p, ea); }
        await potenciadoras();
        return true;
    }
    async function ponerClima(tipo, c, esAli, porHabilidad) {
        if (CAMPO.clima && CAMPO.clima.tipo === tipo) { if (!porHabilidad) await decir("¡Pero falló!", 800); return false; }
        if (porHabilidad) await cartelHabilidad(c, esAli);
        CAMPO.clima = { tipo, turnos: ROCA_CLIMA[c.objeto] === tipo ? 8 : 5 };   // 8 con la Roca Lluvia, Roca Calor…
        pintarClima();
        await animComun(CLIMAS[tipo].anim, esAli);
        await decir(CLIMAS[tipo].empieza, 1000);
        // Paleosíntesis: el sol la activa.
        for (const ea of [true, false]) {
            const p = activoDe(ea);
            if (p && p.hp > 0 && p.habilidad === "protosynthesis" && climaEnCampo() === "sol" && !p.potenciado) { await cartelHabilidad(p, ea); await decir(`¡El sol ha activado la Paleosíntesis de ${p.nombre}!`, 1100); }
        }
        await potenciadoras();
        return true;
    }
    // El tiempo del lugar de la región (lluvia en la ruta, nieve en la montaña…): el combate empieza con él y dura hasta el
    // final, como en Espada y Escudo (otro tiempo lo sustituye, y entonces ya se acaba como cualquiera).
    async function climaDelLugar() {
        const t = opts.climaInicial;
        if (!t || !CLIMAS[t] || !activo || (CAMPO.clima && CAMPO.clima.tipo === t)) return;
        CAMPO.clima = { tipo: t, turnos: 0, fijo: true };
        pintarClima();
        await animComun(CLIMAS[t].anim, true);
        await decir(CLIMAS[t].ambiente, 900);
    }
    // Al empezar el combate, las habilidades de los dos (primero la del más rápido).
    async function entradasIniciales() {
        const orden = ordenVel();
        for (const esAli of orden) await alEntrar(esAli);
    }
    // Un Pokémon entra en el campo: se reinician sus contadores, le afectan las trampas de su bando y actúa su habilidad.
    // true si cae al entrar (entonces ya ha salido otro en su lugar, o se ha acabado el combate).
    async function alEntrar(esAli) {
        const c = activoDe(esAli); if (!c || c.hp <= 0 || !activo) return false;
        c.turnosEnCampo = 0; c.accionesEnCampo = 0; c.protean = false; c.holgazan = false; c.recienLlegado = true;   // (para Vigilante)
        pintarClima();
        if (c.objeto === "air-balloon") await decir(`¡${c.nombre} flota gracias al Globo Helio!`, 950);
        if (c.furioso && !c.furiaHecha) await furiaCarmesi(c, esAli);
        const lc = CAMPO.lados && CAMPO.lados[esAli ? "a" : "r"];
        if (lc && lc.deseoCura) {   // Deseo Cura y Danza Lunar: el que sale en su lugar recupera todos sus PS y su salud (y, con la danza, sus PP)
            const lunar = lc.deseoCura.lunar; lc.deseoCura = null;
            AudioFX.efecto("restore"); await animComun("common-health-up", esAli);
            c.hp = c.hpMax; c.estado = null;
            if (lunar) c.movimientos.forEach((m) => { m.ppAct = m.pp; });
            actualizarHP(esAli); actualizarEstadoCaja(esAli); renderBolas();
            await decir(lunar ? `¡Un místico halo de luz de luna envuelve a ${c.nombre}!` : `¡El deseo de curación se ha hecho realidad para ${c.nombre}!`, 1200);
        }
        if (await peligrosEntrada(c, esAli)) {
            await debilitar(c, esAli);
            if (!esAli) await rivalDerrotado();
            else if (quedanAliados()) await new Promise((res) => mostrarEquipoMenu("caida", res));
            else finBatalla(false);
            return true;
        }
        if (activo && !terminado) await habilidadEntrada(esAli);
        if (activo && !terminado && activoDe(esAli) === c) { await semilla(c, esAli); await servicioRaro(c, esAli); await energiaPotenciadora(c, esAli); }
        return false;
    }
    // Trampa Rocas (según su debilidad a la Roca), Púas, Púas Tóxicas y Red Viscosa (las tres, si toca el suelo). true si cae.
    async function peligrosEntrada(c, esAli) {
        const l = CAMPO.lados && CAMPO.lados[esAli ? "a" : "r"];
        if (!hayPeligros(l)) return false;
        const suelo = enSuelo(c), muro = c.habilidad === "magic-guard";
        // Uno de tipo Veneno que toca el suelo se lleva las Púas Tóxicas (aunque lleve Botas Gruesas).
        if (l.toxicas && suelo && c.tipos.includes("poison")) {
            l.toxicas = 0; pintarTrampas();
            await decir(PELIGROS.toxicas.quita(esAli), 1000);
        }
        if (c.objeto === "heavy-duty-boots") return false;
        const herir = async (frac, texto) => {
            c.hp = Math.max(0, c.hp - Math.max(1, Math.floor(c.hpMax * frac)));
            animarGolpe(esAli); actualizarHP(esAli);
            await decir(texto, 1000);
            return c.hp <= 0;
        };
        if (l.rocas && !muro && await herir(efectividad("rock", c.tipos) / 8, `¡Unas piedras puntiagudas han dañado a ${c.nombre}!`)) return true;
        if (l.acero && !muro && await herir(efectividad("steel", c.tipos) / 8, `¡Unas púas de acero han dañado a ${c.nombre}!`)) return true;
        if (l.puas && suelo && !muro && await herir([0, 1 / 8, 1 / 6, 1 / 4][l.puas], `¡Las púas han herido a ${c.nombre}!`)) return true;
        if (l.toxicas && suelo) await aplicarEstado(c, { tipo: "env", grave: l.toxicas >= 2 }, esAli);
        if (l.red && suelo && activo) {
            await decir(`¡${c.nombre} ha caído en una red viscosa!`, 1000);
            const r = activoDe(!esAli);
            await aplicarCambios(c, { vel: -1 }, esAli, r && r.hp > 0 ? r : null);
        }
        return false;
    }
    // Quita las trampas de un bando (Giro Rápido, Despejar…). true si había alguna.
    async function quitarPeligros(esAli) {
        const l = CAMPO.lados && CAMPO.lados[esAli ? "a" : "r"]; if (!l) return false;
        let algo = false;
        for (const k of Object.keys(PELIGROS)) {
            if (!l[k]) continue;
            l[k] = 0; algo = true; pintarTrampas();
            if (activo) await decir(PELIGROS[k].quita(esAli), 1000);
        }
        return algo;
    }
    // Las trampas se ven en el campo de cada bando, como en los juegos (sprites de Pokémon Showdown).
    // [sprite, x %, y % (de la plataforma), ancho %]
    const SITIO_TRAMPA = {
        rocas: [["rock1", 3, -170, 13], ["rock2", 22, -290, 11], ["rock1", 80, -240, 12], ["rock2", 95, -110, 11]],
        puas: [["caltrop", 14, 18, 15], ["caltrop", 72, 46, 15], ["caltrop", 92, 4, 15]],
        toxicas: [["poisoncaltrop", 34, 52, 15], ["poisoncaltrop", 57, -4, 15]],
        red: [["web", 50, 22, 56]],
        acero: [["greenmetal1", 18, -120, 14], ["greenmetal2", 84, -150, 14], ["greenmetal1", 62, -40, 12]],
    };
    function pintarTrampas() {
        for (const ld of ["a", "r"]) {
            const cont = $("trampas-" + ld); if (!cont) continue;
            const l = CAMPO.lados && CAMPO.lados[ld], quiero = new Set();
            if (l) Object.entries(SITIO_TRAMPA).forEach(([k, sitios]) => {
                const n = k === "rocas" || k === "red" ? (l[k] ? sitios.length : 0) : l[k] || 0;
                sitios.slice(0, n).forEach((_, i) => quiero.add(k + i));
            });
            cont.querySelectorAll(".trampa").forEach((e) => { if (!quiero.has(e.dataset.k)) e.remove(); });
            quiero.forEach((id) => {
                if (cont.querySelector(`[data-k="${id}"]`)) return;
                const k = id.replace(/\d+$/, ""), [sp, x, y, w] = SITIO_TRAMPA[k][+id.slice(k.length)];
                const img = document.createElement("img");
                img.className = `trampa trampa-${k}`; img.dataset.k = id; img.alt = "";
                img.src = `https://play.pokemonshowdown.com/fx/${sp}.png`;
                img.style.cssText = `left:${x}%;top:${y}%;width:${w}%`;
                cont.appendChild(img);
            });
        }
    }
    async function habilidadEntrada(esAli) {
        const c = activoDe(esAli), r = activoDe(!esAli), h = c && c.habilidad;
        if (!h || c.hp <= 0 || !activo) return;
        // Impostor: nada más salir se transforma en el rival (y usa la habilidad que copia, si es de las que actúan al entrar).
        if (h === "imposter") { if (await transformar(c, esAli, r, true)) return habilidadEntrada(esAli); return; }
        // Calco: copia la habilidad del rival (y la usa).
        if (h === "trace") {
            if (!r || r.hp <= 0 || !r.habilidad || NO_COPIABLES.has(r.habilidad)) return;
            await cartelHabilidad(c, esAli);
            c.habilidad = r.habilidad;
            await decir(`¡${c.nombre} ha copiado la habilidad ${nombreHabilidad(r.habilidad)} de ${r.nombre}!`, 1300);
            return habilidadEntrada(esAli);
        }
        if (CLIMA_HAB[h]) return ponerClima(CLIMA_HAB[h], c, esAli, true);
        if (TERRENO_HAB[h]) return ponerTerreno(TERRENO_HAB[h], c, esAli, true);
        if (h === "intimidate" && r && r.hp > 0) return intimidar(c, esAli, r);
        if (h === "download" && r && r.hp > 0) {
            await cartelHabilidad(c, esAli);
            return aplicarCambios(c, { [r.stats.def * multEtapa(r.etapas.def) < r.stats.spd * multEtapa(r.etapas.spd) ? "atk" : "spa"]: 1 }, esAli);
        }
        if ((h === "intrepid-sword" || h === "dauntless-shield") && !c.bonoEntrada) {
            c.bonoEntrada = true; await cartelHabilidad(c, esAli);
            return aplicarCambios(c, { [h === "intrepid-sword" ? "atk" : "def"]: 1 }, esAli);
        }
        if (h === "frisk" && r && r.objeto) {
            await cartelHabilidad(c, esAli);
            return decir(`¡${c.nombre} ha cacheado a ${r.nombre} y ha encontrado su ${obj(r.objeto).nombre}!`, 1300);
        }
        if (h === "forewarn" && r && r.hp > 0) {   // Alerta: descubre el movimiento más potente del rival
            const fuerte = r.movimientos.slice().sort((a, b) => (b.poder || 0) - (a.poder || 0))[0];
            if (fuerte) { await cartelHabilidad(c, esAli); return decir(`¡${c.nombre} ha detectado el movimiento ${fuerte.nombre} de ${r.nombre}!`, 1200); }
        }
        if (h === "screen-cleaner") {   // Antibarrera: fuera las pantallas de los dos bandos
            const hay = ["a", "r"].some((l) => CAMPO.lados[l].reflejo || CAMPO.lados[l].pantallaLuz || CAMPO.lados[l].veloAurora);
            if (!hay) return;
            await cartelHabilidad(c, esAli);
            ["a", "r"].forEach((l) => Object.assign(CAMPO.lados[l], { reflejo: 0, pantallaLuz: 0, veloAurora: 0 }));
            return decir("¡Se han anulado los efectos de las barreras de los dos bandos!", 1200);
        }
        if (h === "mimicry" && terrenoEnCampo()) return mimetismo(c, esAli);
        if (h === "anticipation" && r && r.movimientos.some((m) => m.cat !== "est" && efectividad(m.tipo, c.tipos) >= 2)) {
            await cartelHabilidad(c, esAli); return decir(`¡${c.nombre} se ha estremecido!`, 1000);
        }
        if (h === "supreme-overlord") {
            c.caidos = (esAli ? aliados : enemigos).filter((p) => p.hp <= 0).length;
            if (c.caidos) { await cartelHabilidad(c, esAli); await decir(`¡${c.nombre} ha ganado fuerza gracias a sus compañeros caídos!`, 1200); }
            return;
        }
        if (h === "protosynthesis" && climaEnCampo() === "sol") { await cartelHabilidad(c, esAli); return decir(`¡El sol ha activado la Paleosíntesis de ${c.nombre}!`, 1100); }
        if (ANUNCIO_HAB[h]) { await cartelHabilidad(c, esAli); await decir(ANUNCIO_HAB[h](c.nombre), 1200); if (ANULA_CLIMA.has(h)) pintarClima(); }
    }
    // Intimidación: baja el Ataque del rival (salvo que su habilidad lo impida).
    async function intimidar(c, esAli, r) {
        await cartelHabilidad(c, esAli);
        const hr = r.habilidad;
        if (["inner-focus", "oblivious", "own-tempo", "scrappy"].includes(hr)) {
            await cartelHabilidad(r, !esAli);
            return decir(`¡${nombreHabilidad(hr)} de ${r.nombre} evita que sea intimidado!`, 1200);
        }
        if (hr === "guard-dog") { await cartelHabilidad(r, !esAli); return aplicarCambios(r, { atk: 1 }, !esAli); }
        await aplicarCambios(r, { atk: -1 }, !esAli, c);
        if (hr === "rattled" && r.hp > 0) { await cartelHabilidad(r, !esAli); await aplicarCambios(r, { vel: 1 }, !esAli); }
        if (r.objeto === "adrenaline-orb" && r.hp > 0 && r.etapas.vel < 6) {   // Nerviosfera
            consumirObjeto(r); await decir(`¡${r.nombre} ha usado su Nerviosfera!`, 950);
            await aplicarCambios(r, { vel: 1 }, !esAli);
        }
    }
    // Pérdida de PS por una habilidad o por el tiempo. true si alguien cayó y el combate ya siguió por otro lado.
    async function perderPS(c, esAli, cant, texto, cartel = null) {
        if (cartel) await cartelHabilidad(cartel.c, cartel.esAli, cartel.h);
        c.hp = Math.max(0, c.hp - Math.max(1, Math.floor(cant)));
        animarGolpe(esAli); actualizarHP(esAli);
        await decir(texto, 1000);
        if (c.hp > 0) return false;
        await debilitar(c, esAli);
        if (esAli) { aliadoDerrotado(); return true; }
        return rivalCaeFin();
    }
    // Cae el rival al final del turno: si saca otro, el final del turno sigue; en el multijugador se corta aquí (como cuando
    // cae el tuyo), para que las dos partidas sigan exactamente igual.
    async function rivalCaeFin() {
        if (await rivalDerrotado()) return true;
        if (opts.pvp) { mostrarAcciones(); return true; }
        return false;
    }
    async function curarHab(c, esAli, cant, h = c.habilidad) {
        if (c.hp >= c.hpMax) return;
        await cartelHabilidad(c, esAli, h);
        c.hp = Math.min(c.hpMax, c.hp + Math.max(1, Math.floor(cant))); AudioFX.efecto("restore"); actualizarHP(esAli);
        await decir(`¡${c.nombre} restauró algunos de sus PS gracias a ${nombreHabilidad(h)}!`, 1100);
    }
    async function curarEstadoHab(c, esAli, h = c.habilidad) {
        if (!c.estado) return;
        await cartelHabilidad(c, esAli, h);
        c.estado = null; actualizarEstadoCaja(esAli);
        await decir(`¡${nombreHabilidad(h)} de ${c.nombre} ha curado su problema de estado!`, 1100);
    }
    // La habilidad del objetivo anula el movimiento: Absorbe Agua cura, Pararrayos sube el At. Esp., Absorbe Fuego potencia sus ataques…
    async function efectoInmunidad(c, esAli, inm) {
        await cartelHabilidad(c, esAli, inm.h);
        if (inm.efecto === "cura" && c.hp < c.hpMax) {
            c.hp = Math.min(c.hpMax, c.hp + Math.max(1, Math.floor(c.hpMax / 4))); AudioFX.efecto("restore"); actualizarHP(esAli);
            return decir(`¡${c.nombre} restauró algunos de sus PS gracias a ${nombreHabilidad(inm.h)}!`, 1100);
        }
        if (inm.efecto === "fuego" && !c.fuegoAbsorbido) {
            c.fuegoAbsorbido = true;
            return decir(`¡La potencia de los movimientos de tipo Fuego de ${c.nombre} ha aumentado!`, 1200);
        }
        if (inm.stats && await aplicarCambios(c, inm.stats, esAli)) return;
        if (inm.h === "wonder-guard") return decir(`¡${c.nombre} evitó el daño gracias a ${nombreHabilidad(inm.h)}!`, 1100);
        await decir(`No afecta a ${c.nombre}…`, 850);
    }
    // ¿Puede sufrir este problema de estado? (para no sacar el cartel de Elec. Estática si no va a hacer nada)
    const puedeSufrir = (c, tipo, fuente) => c.hp > 0 && !c.estado && !inmuneEstadoHab(c, tipo, fuente) &&
        !(ESTADOS[tipo].inmunes.some((t) => c.tipos.includes(t)) && !(tipo === "env" && fuente && fuente.habilidad === "corrosion"));
    // Al recibir un golpe: Elec. Estática, Piel Tosca, Baba, Momia… (contacto) y Tesón, Armadura Frágil, Justiciero… (cualquiera).
    async function trasGolpe(atacante, defensor, esAliado, mov, tipo, hpAntes, crit) {
        const hd = defensor.habilidad, ha = atacante.habilidad;
        // (el atacante no cae aquí: si llega a 0 PS, el turno lo debilita después; y no caen los dos a la vez)
        const herir = async (cant, texto) => {
            await cartelHabilidad(defensor, !esAliado, hd);
            atacante.hp = Math.max(defensor.hp > 0 ? 0 : 1, atacante.hp - Math.max(1, Math.floor(cant)));
            animarGolpe(esAliado); actualizarHP(esAliado);
            await decir(texto, 1000);
        };
        if (esContacto(mov, atacante) && atacante.hp > 0 && atacante.objeto !== "protective-pads") {
            if ((hd === "rough-skin" || hd === "iron-barbs") && ha !== "magic-guard") {
                await herir(atacante.hpMax / 8, `¡${nombreHabilidad(hd)} de ${defensor.nombre} ha herido a su atacante!`);
                if (!activo || atacante.hp <= 0) return;
            }
            const suerte = azarC() < 0.3;
            const estadoPor = { static: "par", "flame-body": "que", "poison-point": "env" }[hd] ||
                (hd === "effect-spore" && !atacante.tipos.includes("grass") && ha !== "overcoat" && atacante.objeto !== "safety-goggles" ? alAzarC(["dor", "par", "env"]) : null);
            if (estadoPor && suerte && puedeSufrir(atacante, estadoPor, defensor)) {
                await cartelHabilidad(defensor, !esAliado, hd);
                await aplicarEstado(atacante, { tipo: estadoPor }, esAliado, defensor);
            }
            if (hd === "cute-charm" && suerte && atacante.hp > 0 && !atacante.enamorado && generosOpuestos(atacante, defensor) && atacante.habilidad !== "oblivious") {
                await cartelHabilidad(defensor, !esAliado, hd);
                await enamorar(atacante, esAliado, defensor, false);
            }
            if ((hd === "gooey" || hd === "tangling-hair") && atacante.hp > 0) { await cartelHabilidad(defensor, !esAliado, hd); await aplicarCambios(atacante, { vel: -1 }, esAliado, defensor); }
            if ((hd === "mummy" || hd === "lingering-aroma") && ha !== hd && !NO_COPIABLES.has(ha) && atacante.hp > 0) {
                await cartelHabilidad(defensor, !esAliado, hd);
                atacante.habilidad = hd;
                await decir(`¡La habilidad de ${atacante.nombre} ha cambiado a ${nombreHabilidad(hd)}!`, 1200);
            }
            if (hd === "wandering-spirit" && ha !== hd && !NO_COPIABLES.has(ha) && atacante.hp > 0 && defensor.hp > 0) {   // Alma Errante: se cambian la habilidad
                await cartelHabilidad(defensor, !esAliado, hd);
                atacante.habilidad = hd; defensor.habilidad = ha;
                await decir(`¡${defensor.nombre} ha intercambiado su habilidad con la de ${atacante.nombre}!`, 1200);
            }
            if (hd === "pickpocket" && !defensor.objeto && defensor.hp > 0 && atacante.objeto && puedePerderObjeto(atacante)) await robarObjeto(defensor, !esAliado, atacante, hd);
            if (defensor.objeto === "sticky-barb" && !atacante.objeto && atacante.hp > 0) {
                if (!defensor.objetoQuitado) defensor.objetoQuitado = "sticky-barb";
                defensor.objeto = null;
                if (esAliado && !opts.salvaje && !atacante.objetoRobado) atacante.objetoRobado = { antes: null };
                atacante.objeto = "sticky-barb";
                await decir(`¡La Toxiestrella se ha pegado a ${atacante.nombre}!`, 1000);
            }
            if (hd === "aftermath" && defensor.hp <= 0 && atacante.habilidad !== "magic-guard" && atacante.hp > 0 && !hayHumedad()) {
                await herir(atacante.hpMax / 4, `¡${nombreHabilidad(hd)} de ${defensor.nombre} hizo daño a su atacante!`);
                if (!activo || atacante.hp <= 0) return;
            }
            if (ha === "poison-touch" && defensor.hp > 0 && azarC() < 0.3 && puedeSufrir(defensor, "env", atacante)) {
                await cartelHabilidad(atacante, esAliado);
                await aplicarEstado(defensor, { tipo: "env" }, !esAliado, atacante);
            }
        }
        // Revés: al caer, devuelve todo el daño que le ha quitado el último golpe.
        if (hd === "innards-out" && defensor.hp <= 0 && atacante.hp > 0 && ha !== "magic-guard" && hpAntes > 0) {
            await herir(hpAntes, `¡${nombreHabilidad(hd)} de ${defensor.nombre} ha herido a su atacante!`);
            if (!activo) return;
        }
        // Salpicante (Mega-Scovillain): quema a quien le golpea, con el ataque que sea.
        if (hd === "spicy-spray" && atacante.hp > 0 && puedeSufrir(atacante, "que", defensor)) {
            await cartelHabilidad(defensor, !esAliado, hd);
            await aplicarEstado(atacante, { tipo: "que" }, esAliado, defensor);
            if (!activo) return;
        }
        // Cadena Tóxica: 30 % de envenenar gravemente a quien golpea.
        if (ha === "toxic-chain" && defensor.hp > 0 && azarC() < 0.3 && puedeSufrir(defensor, "env", atacante)) {
            await cartelHabilidad(atacante, esAliado);
            await aplicarEstado(defensor, { tipo: "env", grave: true }, !esAliado, atacante);
        }
        if (defensor.hp <= 0 || !activo) return;
        // Capa Tóxica: si le golpean con un ataque físico, siembra Púas Tóxicas en el campo del atacante.
        if (hd === "toxic-debris" && mov.cat === "fis" && CAMPO.lados[esAliado ? "a" : "r"].toxicas < PELIGROS.toxicas.max) {
            await cartelHabilidad(defensor, !esAliado, hd);
            CAMPO.lados[esAliado ? "a" : "r"].toxicas++; pintarTrampas();
            await decir(PELIGROS.toxicas.pone(esAliado), 1200);
        }
        // Disemillar: al recibir un golpe, el campo se cubre de hierba.
        if (hd === "seed-sower" && terrenoEnCampo() !== "hierba") await ponerTerreno("hierba", defensor, !esAliado, true);
        // Cuerpo Maldito: 30 % de anular el movimiento con el que le han golpeado.
        if (hd === "cursed-body" && atacante.hp > 0 && !atacante.anulado && !mov.esZ && !mov.esMax && atacante.habilidad !== "aroma-veil" && azarC() < 0.3) {
            const mv = atacante.movimientos.find((x) => x.clave === mov.clave);
            if (mv) { await cartelHabilidad(defensor, !esAliado, hd); await anular(atacante, esAliado, mv); }
        }
        // Cambios por el golpe recibido.
        const sube = (stats) => cartelHabilidad(defensor, !esAliado, hd).then(() => aplicarCambios(defensor, stats, !esAliado));
        if (hd === "stamina") await sube({ def: 1 });
        if (hd === "weak-armor" && mov.cat === "fis") await sube({ def: -1, vel: 2 });
        if (hd === "justified" && tipo === "dark") await sube({ atk: 1 });
        if (hd === "rattled" && ["bug", "ghost", "dark"].includes(tipo)) await sube({ vel: 1 });
        if (hd === "water-compaction" && tipo === "water") await sube({ def: 2 });
        if (hd === "steam-engine" && (tipo === "fire" || tipo === "water")) await sube({ vel: 6 });
        if (hd === "thermal-exchange" && tipo === "fire") await sube({ atk: 1 });
        if (hd === "anger-point" && crit && defensor.etapas.atk < 6) await sube({ atk: 12 });
        const cruzaMitad = hpAntes > defensor.hpMax / 2 && defensor.hp <= defensor.hpMax / 2;
        if (hd === "berserk" && cruzaMitad) await sube({ spa: 1 });
        if (hd === "anger-shell" && cruzaMitad) await sube({ def: -1, spd: -1, atk: 1, spa: 1, vel: 1 });
        if (hd === "cotton-down" && atacante.hp > 0) { await cartelHabilidad(defensor, !esAliado, hd); await aplicarCambios(atacante, { vel: -1 }, esAliado, defensor); }
        if ((hd === "electromorphosis" || (hd === "wind-power" && MOVS_VIENTO.has(mov.clave))) && !defensor.cargado) {
            defensor.cargado = true; await cartelHabilidad(defensor, !esAliado, hd);
            await decir(`¡${defensor.nombre} se ha cargado de electricidad!`, 1000);
        }
        if (hd === "sand-spit" && climaEnCampo() !== "arena") await ponerClima("arena", defensor, !esAliado, true);
        if (hd === "color-change" && !(defensor.tipos.length === 1 && defensor.tipos[0] === tipo)) {
            defensor.tipos = [tipo]; await cartelHabilidad(defensor, !esAliado, hd);
            await decir(`¡${nombreHabilidad(hd)} de ${defensor.nombre} cambió a tipo ${TIPOS_ES[tipo]}!`, 1100);
        }
    }
    // Al derrotar a un rival: Autoestima, Ultraimpulso, Relincho Blanco / Negro…
    async function alDerrotar(a, esAli) {
        const h = a.habilidad;
        if (h === "moxie" || h === "chilling-neigh" || h === "as-one-glastrier") { await cartelHabilidad(a, esAli); await aplicarCambios(a, { atk: 1 }, esAli); }
        else if (h === "grim-neigh" || h === "as-one-spectrier" || h === "soul-heart") { await cartelHabilidad(a, esAli); await aplicarCambios(a, { spa: 1 }, esAli); }
        else if (h === "beast-boost" || h === "eelevate") { await cartelHabilidad(a, esAli); await aplicarCambios(a, { [mejorStat(a)]: 1 }, esAli); }
    }
    // Al retirarse: Regeneración y Cura Natural; y vuelve a su tipo y habilidad de siempre.
    function alRetirarse(c, sale = true) {
        quitarDinamax(c);   // vuelve a su tamaño (y sus PS, a la escala normal)
        destransformar(c);
        if (sale && c.hp > 0 && c.habilidad === "regenerator") c.hp = Math.min(c.hpMax, c.hp + Math.floor(c.hpMax / 3));
        if (sale && c.hp > 0 && c.habilidad === "natural-cure") c.estado = null;
        if (c.estado && c.estado.grave) c.estado.n = 0;
        if (c.objetoEmbargado && !c.objeto) c.objeto = c.objetoEmbargado;
        if (c.mimetismo) { c.movimientos[c.mimetismo.i] = c.mimetismo.mov; c.mimetismo = null; }
        if (c.statsOrig) { c.stats = c.statsOrig; c.statsOrig = null; }
        Object.assign(c, { maldito: false, pesadilla: false, identificado: false, ojoMilagro: false, levitando: 0, telequinesis: 0, electrificado: false, polvo: 0,
            laserFocus: false, reservas: 0, aguante: 0, capaMagica: 0, robo: 0, octopresa: null, tormento: false, sellado: false, anticura: 0, embargo: 0, objetoEmbargado: null,
            perecer: 0, mismoDestino: false });
        Object.assign(c, { tipos: c.teracristal ? [c.teracristal] : c.tiposBase || c.tipos, habilidad: c.habBase || c.habilidad, fuegoAbsorbido: false, cargado: false, protean: !!c.teracristal, ligero: false, turnosEnCampo: 0,
            forzado: null, confuso: 0, drenado: false, mofa: 0, protegido: false, protecciones: 0, atrapado: null, otraVez: null, bostezo: 0, ultimoMov: null, sustituto: 0,
            enamorado: null, anulado: null, arraigo: false, acuaAro: false, foco: false, fijado: null, usados: null, metronomo: null, potenciado: false });
    }

    // ---------- Turnos ----------
    async function jugarTurno(movJugador, poderJ = null) {
        if (bloqueado) return;
        bloqueado = true; ocultarMenus();
        const ali = aliadoActivo(), ene = enemigoActivo();
        aliados.concat(enemigos).forEach((p) => { p.protegido = false; });
        // Los poderes, al empezar el turno (antes que los movimientos): primero el tuyo y luego el del rival.
        if (poderJ && !opts.pvp && poderesDisponibles(ali).includes(poderJ)) {
            poderSel = null;
            await activarPoder(true, poderJ);
            if (!activo) return;
            if (poderJ === "dinamax" && movJugador !== FORCEJEO && !movJugador.esMax) movJugador = movMax(ali, movJugador, ali.dinamax.gmax);
        }
        if (!opts.pvp && await poderRivalIA(ene)) { if (!activo) return; }
        // Presión del rival: cada movimiento gasta un PP más (en el multijugador, no: cada partida lleva los PP de su jugador).
        const gasto = (defensor) => (!opts.pvp && defensor && defensor.hp > 0 && defensor.habilidad === "pressure" ? 2 : 1);
        if (movJugador.base) movJugador.base.ppAct = Math.max(0, movJugador.base.ppAct - (movJugador.esZ ? 1 : gasto(ene)));   // (Z y Maximovimientos)
        else if (movJugador !== FORCEJEO && !ali.forzado) movJugador.ppAct = Math.max(0, (movJugador.ppAct ?? 1) - gasto(ene));
        // Como en los juegos, usar un objeto va antes que los ataques: si el rival se cura, ese turno no ataca.
        if (!ene.forzado && await rivalUsaCura(ene)) {
            if (!activo) return;
            ene.movTurno = null;
            if (esEleccion(ali.objeto) && !ali.bloqueo && movJugador !== FORCEJEO && !movJugador.base && !ali.dinamax && !ali.forzado) ali.bloqueo = movJugador.clave;
            await concentrar(ali, movJugador);
            await ejecutarMovimiento(ali, ene, movJugador, true, true);
            aliados.concat(enemigos).forEach((p) => { p.retrocede = false; });
            if (!activo) return;
            if (ali.hp <= 0 && ene.hp <= 0) return dobleKO();
            if (ali.hp <= 0 && ene.hp > 0) { await debilitar(ali, true); return aliadoDerrotado("ko"); }
            if (ene.hp <= 0) { await debilitar(ene, false); if (!(await rivalDerrotado())) await cierreTrasKO(); return; }
            turno++;
            if (await finDeTurno()) return;
            return mostrarAcciones();
        }
        // El rival cambia de Pokémon (va antes que los ataques): tu movimiento golpea al que entra.
        const cambio = opts.pvp ? cambioPvP : cambioRival(ene, ali);
        cambioPvP = -1;
        if (cambio >= 0) {
            const cayo = await cambiarRival(cambio);
            if (!activo || terminado) return;
            if (cayo) { turno++; if (await finDeTurno()) return; return mostrarAcciones(); }   // cayó al entrar: tu ataque ya no tiene a quién darle
            const nuevo = enemigoActivo();
            nuevo.movTurno = null;
            if (esEleccion(ali.objeto) && !ali.bloqueo && movJugador !== FORCEJEO && !movJugador.base && !ali.dinamax && !ali.forzado) ali.bloqueo = movJugador.clave;
            await concentrar(ali, movJugador);
            await ejecutarMovimiento(ali, nuevo, movJugador, true, false);
            aliados.concat(enemigos).forEach((p) => { p.retrocede = false; });
            if (!activo) return;
            if (ali.hp <= 0 && nuevo.hp <= 0) return dobleKO();
            if (ali.hp <= 0 && nuevo.hp > 0) { await debilitar(ali, true); return aliadoDerrotado("ko"); }
            if (nuevo.hp <= 0) { await debilitar(nuevo, false); if (!(await rivalDerrotado())) await cierreTrasKO(); return; }
            turno++;
            if (await finDeTurno()) return;
            return mostrarAcciones();
        }
        let movEnemigo = opts.pvp ? movRivalPvP : movForzado(ene) || iaElegirMov(ene, ali, opts.ia || 0.75);
        if (!opts.pvp && ene.dinamax && !ene.forzado) movEnemigo = movMax(ene, movEnemigo, ene.dinamax.gmax);
        if (!opts.pvp && movEnemigo !== FORCEJEO) movEnemigo = movZRival(ene, movEnemigo);
        ali.movTurno = movJugador; ene.movTurno = movEnemigo;
        if (movEnemigo.base) movEnemigo.base.ppAct = Math.max(0, movEnemigo.base.ppAct - gasto(ali));
        else if (movEnemigo !== FORCEJEO && !ene.forzado) movEnemigo.ppAct = Math.max(0, (movEnemigo.ppAct ?? 1) - gasto(ali));
        // Los objetos Elección bloquean el primer movimiento que se usa.
        if (esEleccion(ali.objeto) && !ali.bloqueo && movJugador !== FORCEJEO && !movJugador.base && !ali.dinamax && !ali.forzado) ali.bloqueo = movJugador.clave;
        if (esEleccion(ene.objeto) && !ene.bloqueo && movEnemigo !== FORCEJEO && !movEnemigo.base && !ene.dinamax && !ene.forzado) ene.bloqueo = movEnemigo.clave;
        // Orden: prioridad del movimiento (Ataque Rápido… y Bromista, Alas Vendaval, Primer Auxilio), Rezagado,
        // Garra Rápida / Mano Rápida y Velocidad (empate: al azar).
        const rapido = (c) => (c.objeto === "quick-claw" && azarC() < 0.2) || (c.habilidad === "quick-draw" && azarC() < 0.3);
        let garraA, garraE;
        if (primeroYo()) { garraA = rapido(ali); garraE = rapido(ene); } else { garraE = rapido(ene); garraA = rapido(ali); }
        const pA = (movJugador.prioEf = prioridadHab(ali, movJugador)), pE = (movEnemigo.prioEf = prioridadHab(ene, movEnemigo));
        const vA = velEfectiva(ali), vE = velEfectiva(ene), uA = vaUltimo(ali, movJugador), uE = vaUltimo(ene, movEnemigo);
        const porGarra = pA === pE && uA === uE && garraA !== garraE;
        const aliadoPrimero = pA !== pE ? pA > pE : uA !== uE ? uE : porGarra ? garraA : vA !== vE ? (vA > vE) !== (CAMPO.espacioRaro > 0) : (azarC() < 0.5) === primeroYo();
        const sec = aliadoPrimero
            ? [{ a: ali, d: ene, m: movJugador, ali: true, garra: porGarra }, { a: ene, d: ali, m: movEnemigo, ali: false }]
            : [{ a: ene, d: ali, m: movEnemigo, ali: false, garra: porGarra }, { a: ali, d: ene, m: movJugador, ali: true }];
        for (const p of sec) await concentrar(p.a, p.m);
        for (const paso of sec) {
            if (!activo || terminado) return;
            if (paso.a.hp <= 0 || paso.a !== activoDe(paso.ali)) continue;
            paso.d = activoDe(!paso.ali);   // (si el primero hizo Ida y Vuelta, el segundo golpea al que ha entrado)
            if (paso.garra && paso.a.habilidad === "quick-draw" && paso.a.objeto !== "quick-claw") {
                await cartelHabilidad(paso.a, paso.ali); await decir(`¡${paso.a.nombre} ataca primero gracias a la habilidad Mano Rápida!`, 1000);
            } else if (paso.garra) await decir(`¡${paso.a.nombre} se ha adelantado gracias a su Garra Rápida!`, 950);
            await ejecutarMovimiento(paso.a, paso.d, paso.m, paso.ali, paso === sec[0]);
            if (!activo || terminado) return;
            if (paso.a.hp <= 0 && paso.d.hp <= 0) return dobleKO();   // (Explosión, Mismo Destino…)
            if (paso.a.hp <= 0 && paso.d.hp > 0) {   // cayó por el retroceso de su propio ataque
                await debilitar(paso.a, paso.ali);
                aliados.concat(enemigos).forEach((p) => { p.retrocede = false; });
                if (paso.ali) return aliadoDerrotado("ko");
                if (!(await rivalDerrotado())) await cierreTrasKO();
                return;
            }
            if (paso.d.hp <= 0) {
                aliados.concat(enemigos).forEach((p) => { p.retrocede = false; });
                await debilitar(paso.d, !paso.ali);
                if (!paso.ali) return aliadoDerrotado("ko");
                if (!(await rivalDerrotado())) await cierreTrasKO();
                return;
            }
        }
        aliados.concat(enemigos).forEach((p) => { p.retrocede = false; });
        turno++;
        if (await finDeTurno()) return;
        mostrarAcciones();
    }
    // IA de cambio (Difícil y Extremo): si su Pokémon lo tiene muy mal (lo vas a debilitar y apenas te hace nada), lo
    // cambia por el del equipo que mejor aguanta tu ataque. El que entra recibe el golpe, como en los juegos.
    function cambioRival(ene, ali) {
        const prob = opts.cambiosRival || 0;
        if (opts.salvaje || !prob || ene.forzado || ene.hp <= 0 || ali.hp <= 0 || (ali.forzado && ali.forzado.oculto) || sinSalida(ene)) return -1;
        if (ene.turnoCambio != null && turno - ene.turnoCambio < 3) return -1;   // no cambia a cada rato
        if (golpeMaximo(ali, ene) < ene.hp * 0.95 || golpeMaximo(ene, ali) > ali.hp * 0.4) return -1;   // no lo tiene tan mal
        let mejor = -1, mejorVal = -Infinity;
        enemigos.forEach((p, i) => {
            if (i === iEnemigo || p.hp <= 0) return;
            const recibe = (golpeMaximo(ali, p) + peajeEntrada(p)) / p.hp;   // (y lo que le quitan las trampas al entrar)
            if (recibe >= 0.55) return;                          // tampoco aguantaría
            const v = golpeMaximo(p, ali) / ali.hp - recibe;
            if (v > mejorVal) { mejorVal = v; mejor = i; }
        });
        return mejor >= 0 && azarC() < prob ? mejor : -1;
    }
    // Vuelve a su Poké Ball como en PokéRogue: la luz de su ball lo cubre mientras encoge (dinamaxizado, la luz es roja y la
    // energía Dinamax se le escapa).
    async function animRetirada(esAli, c, color = null, desde = 0) {
        const s = spriteEl(esAli); if (!s) return;
        const dx = !!(c && c.dinamax);
        if (dx) {
            const { x, y } = centroSprite(esAli), a = celMega(Z_FX, x, y, zoomEscena(esAli) * 1.5);
            a.classList.add("fx-dinamax");
            fotogramasMega(a, [6, 7, 8], 90).then(() => a.remove());
        }
        AudioFX.efecto("pb_rel", { vol: 0.45 });
        s.style.transformOrigin = "50% 100%";
        const luz = tintar(s, esAli, color || (dx ? "#ff2050" : colorBola((c && c.bola) || "poke-ball")), desde, 1, 250);
        await anim(s, [{ transform: "scale(1)", opacity: 1 }, { transform: "scale(.5)", opacity: 1, offset: 0.85 }, { transform: "scale(.45)", opacity: 0 }], { duration: 290, easing: SENO_IN });
        await luz;
        s.style.transformOrigin = "";
    }
    async function cambiarRival(i, arrastre = false) {
        const sale = enemigoActivo();
        if (!arrastre) await decir(`¡${opts.titulo || "El rival"} ha retirado a ${sale.nombre}!`, 850);
        await animRetirada(false, sale);
        alRetirarse(sale);
        Object.assign(sale, { etapas: etapasCero(), critEtapa: 0, bloqueo: null });   // al retirarse pierde sus cambios
        iEnemigo = i;
        enemigos[i].turnoCambio = turno;
        caja(false, false);
        await renderEnemigo(true); renderBolas();
        spriteEl(false).style.opacity = "0";
        await lanzamientoRival(false, arrastre);
        return alEntrar(false);
    }
    // ---------- Multijugador ----------
    // Lo que elige tu jugador se envía; cuando llega lo del rival, las dos partidas resuelven el turno igual.
    // accion: { tipo: "mov", i } (i = -1: Forcejeo) · { tipo: "cambio", i } · { tipo: "forzado" } (Vuelo, Enfado, recarga…)
    const movDePvP = (c, a) => {
        if (a.tipo === "forzado") return movForzado(c) || FORCEJEO;
        const m = a.i < 0 || !c.movimientos[a.i] ? FORCEJEO : c.movimientos[a.i];
        if (m === FORCEJEO) return m;
        if (c.dinamax) return movMax(c, m, c.dinamax.gmax);
        if (a.poder === "z" && TIPO_CRISTAL[c.objeto] === m.tipo && m.cat !== "est" && m.ppAct > 0) return movZ(m);
        return m;
    };
    // Estado de los dos equipos (para avisar si las partidas se desincronizan).
    const huellaPvP = () => {
        const lado = (eq, i) => eq.map((p) => `${p.hp}${p.estado ? p.estado.tipo : ""}`).join(",") + "@" + i;
        const yo = lado(aliados, iAliado), el = lado(enemigos, iEnemigo);
        return opts.pvp.anfitrion ? yo + "|" + el : el + "|" + yo;
    };
    async function elegirPvP(accion) {
        if (terminado) return;
        pararReloj();
        bloqueado = true; ocultarMenus();
        opts.pvp.enviar({ t: "accion", turno, accion, h: huellaPvP() });
        ponerMensaje(`Esperando a ${opts.titulo}…`);
        accionesEl.classList.remove("oculta", "principal");
        accionesEl.innerHTML = `<button class="accion-btn acc-huir ancho" data-acc="rendirse-pvp">${ICO_ACC.huir}<span>Rendirse</span></button>`;
        accionesEl.querySelector("button").onclick = () => rendirsePvP();
        const suya = await opts.pvp.recibir("accion");
        if (!activo || terminado) return;
        accionesEl.classList.add("oculta");
        if (suya.fin) return rivalAbandona(suya.fin);
        if (suya.h && suya.h !== huellaPvP()) console.warn("Multijugador: partidas desincronizadas", suya.h, huellaPvP());
        return resolverTurnoPvP(accion, suya.accion);
    }
    async function resolverTurnoPvP(mia, suya) {
        // Los poderes que eligieron los dos con su movimiento (primero el anfitrión).
        for (const esAli of ordenFijo()) {
            const a = esAli ? mia : suya, c = activoDe(esAli);
            if (a && a.tipo === "mov" && a.poder && a.poder !== "z" && poderesDisponibles(c, esAli).includes(a.poder)) { await activarPoder(esAli, a.poder); if (!activo) return; }
            if (a && a.tipo === "mov" && a.poder === "z" && !poder[esAli ? "aliado" : "rival"]) poder[esAli ? "aliado" : "rival"] = "z";
        }
        const yoCambio = mia.tipo === "cambio", elCambio = suya.tipo === "cambio";
        if (yoCambio && elCambio) {   // los dos cambian: primero el anfitrión y nadie ataca
            for (const esAli of ordenFijo()) {
                if (esAli) await accionCambiar(mia.i, "pvp"); else await cambiarRival(suya.i);
                if (!activo || terminado) return;
            }
            turno++;
            if (await finDeTurno()) return;
            return mostrarAcciones();
        }
        if (yoCambio) { movRivalPvP = movDePvP(enemigoActivo(), suya); bloqueado = true; return accionCambiar(mia.i, "normal"); }
        movRivalPvP = elCambio ? null : movDePvP(enemigoActivo(), suya);
        cambioPvP = elCambio ? suya.i : -1;
        bloqueado = false;
        return jugarTurno(movDePvP(aliadoActivo(), mia));
    }
    async function rivalAbandona(motivo) {
        if (terminado) return;
        bloqueado = true; ocultarMenus();
        capa.querySelectorAll(".pe-flotante").forEach((e) => e.remove());   // por si estabas eligiendo a quién sacar
        await decir(motivo === "rendirse" ? `¡${opts.titulo} se ha rendido!` : `${opts.titulo} se ha desconectado.`, 1400);
        return finBatalla(true);
    }
    function rendirsePvP() {
        if (terminado) return;
        opts.pvp.enviar({ t: "rendirse" });
        finBatalla(false);
    }

    // Rival KO: experiencia, cambio opcional y su siguiente Pokémon. true si el combate terminó.
    async function rivalDerrotado() {
        await repartirXP(enemigoActivo());
        if (!enemigos.some((p) => p.hp > 0)) { finBatalla(true); return true; }
        if (!opts.salvaje && !opts.pvp && aliadoActivo().hp > 0 && aliados.filter((p) => p.hp > 0).length > 1) {
            if (await preguntarCambioRival()) await new Promise((res) => mostrarEquipoMenu("libre", res));
        }
        let sig;
        if (opts.pvp) {
            ponerMensaje(`${opts.titulo} está eligiendo a su siguiente Pokémon…`);
            const r = await opts.pvp.recibir("reemplazo");
            if (r.fin) { await rivalAbandona(r.fin); return true; }
            sig = r.i;
        }
        if (!(await enviarSiguienteEnemigo(sig))) { finBatalla(true); return true; }
        return false;
    }
    // Los dos se han debilitado a la vez (Explosión, Mismo Destino, Canto Mortal…). Si ninguno tiene más Pokémon, pierde el bando
    // que lo provocó (causaKO). Si no, eliges el tuyo (en el online se envía), llega el del rival y salen los dos, primero el
    // del anfitrión, para que las dos partidas sigan igual. o.fin: al final del turno (el siguiente turno empieza ya).
    let causaKO = null;
    async function dobleKO(o = {}) {
        const causa = causaKO; causaKO = null;
        aliados.concat(enemigos).forEach((p) => { p.retrocede = false; });
        for (const esAli of ordenFijo()) { const c = activoDe(esAli); if (c && c.hp <= 0) await debilitar(c, esAli); if (!activo) return; }
        await repartirXP(enemigoActivo());
        const quedaA = quedanAliados(), quedaR = enemigos.some((p) => p.hp > 0);
        if (!quedaA || !quedaR) return finBatalla(quedaA ? true : quedaR ? false : causa === false);
        const mio = await new Promise((res) => mostrarEquipoMenu("elegir", res));
        if (!activo || terminado) return;
        let suyo;
        if (opts.pvp) {
            opts.pvp.enviar({ t: "reemplazo", i: mio });
            ponerMensaje(`${opts.titulo} está eligiendo a su siguiente Pokémon…`);
            const r = await opts.pvp.recibir("reemplazo");
            if (r.fin) return rivalAbandona(r.fin);
            suyo = r.i;
        }
        for (const esAli of ordenFijo()) {
            if (esAli) await accionCambiar(mio, "doble", () => {});
            else if (!(await enviarSiguienteEnemigo(suyo))) return finBatalla(true);
            if (!activo || terminado) return;
        }
        if (o.fin) return mostrarAcciones();
        return cierreTrasKO();
    }
    // modo "ko": ha caído en pleno turno (el turno se cierra cuando sale el siguiente); "forzado": al final del turno.
    function aliadoDerrotado(modo = "forzado") { return quedanAliados() ? mostrarEquipoMenu(modo) : finBatalla(false); }
    // Tras caer uno en pleno turno y salir el siguiente, el turno se cierra como cualquier otro: tiempo atmosférico, estados,
    // Restos y las cuentas atrás (Dinamax, pantallas, campos, Mofa…). Antes se saltaba y todo eso duraba turnos de más.
    async function cierreTrasKO() {
        if (!activo || terminado) return;
        turno++;
        if (await finDeTurno()) return;
        mostrarAcciones();
    }
    // Final del turno: el tiempo, la quemadura y el veneno, los objetos y las habilidades. true si alguien cayó y el combate ya siguió.
    async function finDeTurno() {
        const orden = ordenVel();
        // Tiempo atmosférico: cuenta atrás, daño de la arena y habilidades que dependen de él.
        if (CAMPO.clima && activo) {
            const cl = CAMPO.clima;
            if (!cl.fijo && --cl.turnos <= 0) { CAMPO.clima = null; pintarClima(); await decir(CLIMAS[cl.tipo].fin, 1000); await potenciadoras(); }
            else {
                pintarClima();
                const t = climaEnCampo();
                if (t) {
                    await animComun(CLIMAS[t].anim, true);
                    await decir(CLIMAS[t].sigue, 850);
                    for (const esAli of orden) {
                        const c = activoDe(esAli); if (!activo || !c || c.hp <= 0) continue;
                        const h = c.habilidad, tc = climaPara(c);   // (el Parasol Multiuso le quita el sol y la lluvia)
                        if (t === "arena" && !c.tipos.some((x) => x === "rock" || x === "ground" || x === "steel") &&
                            !["sand-veil", "sand-rush", "sand-force", "overcoat", "magic-guard"].includes(h) && c.objeto !== "safety-goggles") {
                            if (await perderPS(c, esAli, c.hpMax / 16, `¡La tormenta de arena zarandea a ${c.nombre}!`)) return true;
                            continue;
                        }
                        if ((h === "rain-dish" || h === "dry-skin") && tc === "lluvia") await curarHab(c, esAli, c.hpMax / (h === "dry-skin" ? 8 : 16));
                        else if (h === "ice-body" && t === "nieve") await curarHab(c, esAli, c.hpMax / 16);
                        else if ((h === "dry-skin" || h === "solar-power") && tc === "sol") {
                            if (await perderPS(c, esAli, c.hpMax / 8, `¡${c.nombre} se hizo daño por su ${nombreHabilidad(h)}!`, { c, esAli, h })) return true;
                        }
                        if (h === "hydration" && tc === "lluvia" && c.estado && c.hp > 0) await curarEstadoHab(c, esAli);
                    }
                }
            }
        }
        // Premonición y Deseo Oculto: el golpe llega dos turnos después a quien esté en ese lado (aunque se proteja).
        for (const esAli of ordenFijo()) {
            const l = CAMPO.lados[esAli ? "a" : "r"];
            if (!activo || !l.futuro || --l.futuro.turnos > 0) continue;
            const f = l.futuro, c = activoDe(esAli);
            l.futuro = null;
            if (!c || c.hp <= 0) continue;
            await decir(`¡${c.nombre} ha sido alcanzado por ${f.mov.nombre}!`, 1000);
            await MovSD.reproducir(f.mov.clave === "doom-desire" ? "doomdesirehit" : "futuresighthit", ctxSD(esAli, f.mov.clave), { grupo: "other", mismo: true });
            const r = calcularDanio(f.de, c, Object.assign({}, f.mov, { _tipo: f.tipo }));
            if (!r.efect) { await decir(`No afecta a ${c.nombre}…`, 850); continue; }
            c.hp = Math.max(0, c.hp - r.dmg); c.golpeadoEn = turno;
            AudioFX.golpe(r.efect, r.crit); animarGolpe(esAli); actualizarHP(esAli);
            if (r.efect >= 2) await decir("¡Es muy eficaz!", 850); else if (r.efect < 1) await decir("No es muy eficaz…", 850);
            if (c.hp > 0) continue;
            await debilitar(c, esAli);
            if (esAli) { aliadoDerrotado(); return true; }
            if (await rivalCaeFin()) return true;
        }
        for (const esAli of ordenFijo()) {
            const c = esAli ? aliadoActivo() : enemigoActivo();
            if (!activo || c.hp <= 0 || !c.estado || !["que", "env"].includes(c.estado.tipo)) continue;
            // Antídoto: el veneno le cura en vez de dañarle. Muro Mágico: no le afecta.
            if (c.habilidad === "poison-heal" && c.estado.tipo === "env") { await curarHab(c, esAli, c.hpMax / 8); continue; }
            if (c.habilidad === "magic-guard") continue;
            await animComun(ESTADOS[c.estado.tipo].anim, esAli);
            const div = c.estado.tipo === "que" ? (c.habilidad === "heatproof" ? 32 : 16) : 8;   // Ignífugo: la mitad de daño por quemadura
            // Envenenamiento grave (Tóxico): cada turno, 1/16 más.
            const dano = c.estado.grave ? Math.floor((c.hpMax * (c.estado.n = Math.min(15, (c.estado.n || 0) + 1))) / 16) : Math.floor(c.hpMax / div);
            c.hp = Math.max(0, c.hp - Math.max(1, dano));
            animarGolpe(esAli); actualizarHP(esAli);
            await decir(`¡${c.nombre} se resiente ${c.estado.tipo === "que" ? "de la quemadura" : "del veneno"}!`, 950);
            if (c.hp <= 0) {
                await debilitar(c, esAli);
                if (esAli) { aliadoDerrotado(); return true; }
                if (await rivalCaeFin()) return true;
            }
        }
        for (const esAli of ordenFijo()) {
            const c = esAli ? aliadoActivo() : enemigoActivo();
            if (!activo || c.hp <= 0 || !c.objeto) continue;
            const o = c.objeto;
            if (o === "leftovers" || (o === "black-sludge" && c.tipos.includes("poison"))) {
                if (c.hp < c.hpMax) {
                    c.hp = Math.min(c.hpMax, c.hp + Math.max(1, Math.floor(c.hpMax / 16))); actualizarHP(esAli);
                    await decir(`¡${c.nombre} ha recuperado unos pocos PS gracias ${o === "leftovers" ? "a los Restos" : "al Lodo Negro"}!`, 1000);
                }
            } else if (o === "black-sludge" && c.habilidad !== "magic-guard") {
                c.hp = Math.max(0, c.hp - Math.max(1, Math.floor(c.hpMax / 8))); animarGolpe(esAli); actualizarHP(esAli);
                await decir(`¡El Lodo Negro ha herido a ${c.nombre}!`, 1000);
                if (c.hp <= 0) {
                    await debilitar(c, esAli);
                    if (esAli) { aliadoDerrotado(); return true; }
                    if (await rivalCaeFin()) return true;
                    continue;
                }
            }
            if ((o === "toxic-orb" || o === "flame-orb") && !c.estado) {   // Toxisfera y Llamasfera
                await aplicarEstado(c, o === "toxic-orb" ? { tipo: "env", grave: true } : { tipo: "que" }, esAli);
            }
            if (o === "sticky-barb" && c.habilidad !== "magic-guard") {   // Toxiestrella
                if (await perderPS(c, esAli, c.hpMax / 8, `¡La Toxiestrella ha herido a ${c.nombre}!`)) return true;
                if (c.hp <= 0) continue;
            }
            if (o === "leppa-berry" && !nervioso(c)) {
                const m = c.movimientos.find((x) => x.ppAct <= 0);
                if (m) {
                    consumirObjeto(c); m.ppAct = Math.min(m.pp, CURA_PP[o]);
                    await AnimMov.reproducir("common-use-item", ctxAnim(esAli, true));
                    await decir(`¡${c.nombre} ha recuperado PP de ${m.nombre} gracias a su Baya Zanama!`, 1100);
                }
            }
        }
        // Acua Aro y Arraigo: recuperan 1/16 de sus PS cada turno.
        for (const esAli of orden) {
            const c = activoDe(esAli);
            for (const [k, texto] of [["acuaAro", "ha restaurado sus PS con Acua Aro"], ["arraigo", "ha absorbido nutrientes a través de sus raíces"]]) {
                if (!activo || !c || c.hp <= 0 || c.hp >= c.hpMax || !c[k]) continue;
                await animComun("common-health-up", esAli);
                c.hp = Math.min(c.hpMax, c.hp + Math.max(1, Math.floor((c.hpMax / 16) * (c.objeto === "big-root" ? 1.3 : 1)))); actualizarHP(esAli);
                await decir(`¡${c.nombre} ${texto}!`, 1000);
            }
        }
        if (await finTurnoNuevos(orden)) return true;   // (Maldición, Pesadilla, Octopresa y los efectos con cuenta atrás)
        // Drenadoras: le roban 1/8 de sus PS cada turno (con Viscosecreción, al que absorbe le hace daño).
        for (const esAli of orden) {
            const c = activoDe(esAli), r = activoDe(!esAli);
            if (!activo || !c || c.hp <= 0 || !c.drenado || !r || r.hp <= 0 || c.habilidad === "magic-guard") continue;
            const cant = Math.max(1, Math.floor(c.hpMax / 8));
            await animDrenadoras(esAli);
            c.hp = Math.max(0, c.hp - cant); animarGolpe(esAli); actualizarHP(esAli);
            r.hp = c.habilidad === "liquid-ooze" ? Math.max(0, r.hp - cant) : Math.min(r.hpMax, r.hp + Math.floor(cant * (r.objeto === "big-root" ? 1.3 : 1))); actualizarHP(!esAli);
            await decir(`¡Las drenadoras han restado salud a ${c.nombre}!`, 1000);
            for (const [p, ea] of [[c, esAli], [r, !esAli]]) {
                if (p.hp > 0) continue;
                await debilitar(p, ea);
                if (ea) { aliadoDerrotado(); return true; }
                if (await rivalCaeFin()) return true;
            }
        }
        // Atrapado (Atadura, Torbellino…): 1/8 de sus PS cada turno hasta que se libera; si se va quien lo atrapó, se acaba.
        for (const esAli of orden) {
            const c = activoDe(esAli);
            if (!activo || !c || c.hp <= 0 || !c.atrapado) continue;
            const t = c.atrapado;
            if (t.por !== activoDe(!esAli) || t.por.hp <= 0) { c.atrapado = null; continue; }
            if (--t.turnos <= 0) { c.atrapado = null; await decir(`¡${c.nombre} se ha liberado de ${t.mov}!`, 1000); continue; }
            if (c.habilidad === "magic-guard" || t.sinDanio) continue;
            if (t.clave) await animComun("common-" + t.clave, esAli);   // (Atadura, Giro Fuego, Torbellino… de PokéRogue)
            c.hp = Math.max(0, c.hp - Math.max(1, Math.floor(c.hpMax / (t.por.objeto === "binding-band" ? 6 : 8)))); animarGolpe(esAli); actualizarHP(esAli);
            await decir(`¡${t.mov} ha herido a ${c.nombre}!`, 1000);
            if (c.hp > 0) continue;
            await debilitar(c, esAli);
            if (esAli) { aliadoDerrotado(); return true; }
            if (await rivalCaeFin()) return true;
        }
        // Pantallas y Viento Afín: cuenta atrás de cada bando.
        for (const esAli of ordenFijo()) {
            const lado = CAMPO.lados[esAli ? "a" : "r"], bando = esAli ? "tu bando" : "el bando rival";
            for (const [k, nombre] of [["reflejo", "Reflejo"], ["pantallaLuz", "Pantalla de Luz"], ["veloAurora", "Velo Aurora"]]) {
                if (lado[k] > 0 && --lado[k] === 0 && activo) await decir(`El efecto de ${nombre} en ${bando} se ha disipado.`, 1000);
            }
            if (lado.vientoAfin > 0 && --lado.vientoAfin === 0 && activo) await decir(`Ha dejado de soplar el viento que favorecía ${esAli ? "a tu bando" : "al bando rival"}.`, 1000);
            if (lado.veloSagrado > 0 && --lado.veloSagrado === 0 && activo) await decir(`El efecto de Velo Sagrado en ${esAli ? "tu equipo" : "el bando rival"} se ha disipado.`, 1000);
            if (lado.neblina > 0 && --lado.neblina === 0 && activo) await decir(`Ha desaparecido el efecto de la neblina en ${bando}.`, 1000);
        }
        if (CAMPO.espacioRaro > 0 && --CAMPO.espacioRaro === 0 && activo) await decir("Se han restaurado las dimensiones alteradas.", 1000);
        // Campo de Hierba: los que tocan el suelo recuperan 1/16 de sus PS.
        if (terrenoEnCampo() === "hierba") {
            for (const esAli of orden) {
                const c = activoDe(esAli);
                if (!activo || !c || c.hp <= 0 || c.hp >= c.hpMax || !enSuelo(c)) continue;
                await animComun("common-health-up", esAli);
                c.hp = Math.min(c.hpMax, c.hp + Math.max(1, Math.floor(c.hpMax / 16))); actualizarHP(esAli);
                await decir(`¡${c.nombre} ha recuperado PS gracias al Campo de Hierba!`, 950);
            }
        }
        if (CAMPO.terreno && --CAMPO.terreno.turnos <= 0 && activo) await quitarTerreno();
        for (const esAli of orden) {
            const c = activoDe(esAli);
            if (activo && c && c.hp > 0 && c.mofa > 0 && --c.mofa === 0) await decir(`¡${c.nombre} ya se ha olvidado de la mofa!`, 1000);
        }
        for (const esAli of orden) {
            const c = activoDe(esAli); if (!activo || !c || c.hp <= 0) continue;
            if (c.otraVez) {
                const mv = c.movimientos.find((x) => x.clave === c.otraVez.clave);
                if (--c.otraVez.turnos <= 0 || !mv || mv.ppAct <= 0) { c.otraVez = null; await decir(`¡${c.nombre} ya no sufre los efectos de Otra Vez!`, 1000); }
            }
            if (c.bostezo && --c.bostezo <= 0) { c.bostezo = 0; await aplicarEstado(c, { tipo: "dor" }, esAli); }
            if (c.anulado && --c.anulado.turnos <= 0) { const n = c.anulado.nombre; c.anulado = null; await decir(`¡El movimiento ${n} de ${c.nombre} ya no está anulado!`, 1000); }
        }
        for (const esAli of ordenFijo()) {   // Gigallamarada y compañía: 1/6 de sus PS a los que no son de su tipo, 4 turnos
            const l = CAMPO.lados[esAli ? "a" : "r"], c = activoDe(esAli);
            if (!activo || !l.gmax) continue;
            if (c && c.hp > 0 && !c.tipos.includes(l.gmax.tipo) && c.habilidad !== "magic-guard") {
                const a = { fire: "common-fire-spin", water: "common-whirlpool", grass: "vine-whip", rock: "rock-tomb" }[l.gmax.tipo];
                if (a) await animComun(a, esAli);
                c.hp = Math.max(0, c.hp - Math.max(1, Math.floor(c.hpMax / 6))); animarGolpe(esAli); actualizarHP(esAli);
                await decir(`¡${c.nombre} sufre los efectos de ${l.gmax.nombre}!`, 1000);
                if (c.hp <= 0) { l.gmax.turnos--; await debilitar(c, esAli); if (esAli) { aliadoDerrotado(); return true; } if (await rivalCaeFin()) return true; continue; }
            }
            if (--l.gmax.turnos <= 0) l.gmax = null;
        }
        for (const esAli of ordenFijo()) {   // Dinamax: a los 3 turnos vuelve a su tamaño
            const c = activoDe(esAli);
            if (activo && c && c.hp > 0 && c.dinamax && --c.dinamax.turnos <= 0) await desdinamaxizar(esAli);
        }
        for (const esAli of ordenFijo()) {   // Deseo
            const l = CAMPO.lados[esAli ? "a" : "r"];
            if (!activo || !l.deseo || --l.deseo.turnos > 0) continue;
            const d = l.deseo, c = activoDe(esAli);
            l.deseo = null;
            if (!c || c.hp <= 0) continue;
            await decir(`¡El deseo de ${d.de} se ha hecho realidad!`, 1100);
            if (c.hp < c.hpMax) { AudioFX.efecto("restore"); await animComun("common-health-up", esAli); c.hp = Math.min(c.hpMax, c.hp + d.cura); actualizarHP(esAli); }
        }
        [true, false].forEach((ea) => { const p = activoDe(ea); if (p) p.recienLlegado = false; });   // (ya no acaba de salir)
        // Habilidades de final de turno: Impulso, Veleta, Mudar, Mal Sueño, Recogecosecha, Inicio Lento…
        for (const esAli of orden) {
            const c = activoDe(esAli); if (!activo || !c || c.hp <= 0) continue;
            const h = c.habilidad, r = activoDe(!esAli);
            if (h === "speed-boost" && (c.turnosEnCampo || 0) > 0 && c.etapas.vel < 6) { await cartelHabilidad(c, esAli); await aplicarCambios(c, { vel: 1 }, esAli); }
            if (h === "moody") {
                const sube = alAzarC(["atk", "def", "spa", "spd", "vel"].filter((k) => c.etapas[k] < 6));
                const baja = alAzarC(["atk", "def", "spa", "spd", "vel"].filter((k) => k !== sube && c.etapas[k] > -6));
                if (sube || baja) { await cartelHabilidad(c, esAli); await aplicarCambios(c, Object.assign({}, sube ? { [sube]: 2 } : {}, baja ? { [baja]: -1 } : {}), esAli); }
            }
            if (h === "shed-skin" && c.estado && azarC() < 1 / 3) await curarEstadoHab(c, esAli);
            if (h === "bad-dreams" && r && r.hp > 0 && r.estado && r.estado.tipo === "dor" && r.habilidad !== "magic-guard") {
                if (await perderPS(r, !esAli, r.hpMax / 8, `¡${r.nombre} está inmerso en un sueño agitado!`, { c, esAli, h })) return true;
            }
            if (h === "harvest" && !c.objeto && c.ultimaBaya && (climaEnCampo() === "sol" || azarC() < 0.5)) {
                c.objeto = c.ultimaBaya; c.ultimaBaya = null;
                await cartelHabilidad(c, esAli);
                await decir(`¡${c.nombre} ha recogido una ${obj(c.objeto).nombre}!`, 1100);
                await comprobarBayas(c, esAli);
            }
            if (h === "slow-start" && c.turnosEnCampo === 4) { await cartelHabilidad(c, esAli); await decir(`¡${c.nombre} ya está a pleno rendimiento!`, 1100); }
        }
        [true, false].forEach((esAli) => { const c = activoDe(esAli); if (c && c.hp > 0) c.turnosEnCampo = (c.turnosEnCampo || 0) + 1; });
        return false;
    }
    // ---------- Objetos equipados que se gastan (bayas, Banda Aguante, Hierba Blanca…) ----------
    // (Liviano: sin objeto va más rápido; Recogecosecha: recuerda la baya que se comió)
    function consumirObjeto(c) {
        if (c.objeto) c.objetoGastado = c.objeto;   // (Reciclaje lo recupera)
        if (c.objeto && obj(c.objeto).bolsillo === "bayas") c.ultimaBaya = c.objeto;
        c.objeto = null; c.bloqueo = null; c.ligero = true;
    }
    // Bayas que se comen al tener pocos PS: curan o suben una característica (Nerviosismo del rival lo impide).
    async function comprobarBayas(c, esAli) {
        const k = c.objeto; if (!k || !activo || c.hp <= 0 || obj(k).bolsillo !== "bayas" || nervioso(c)) return;
        const f = obj(k), ratio = c.hp / c.hpMax;
        // Gula: las bayas de apuro, ya con la mitad de los PS. Maduración: el doble de efecto.
        const apuro = c.habilidad === "gluttony" ? 0.5 : 0.25, doble = c.habilidad === "ripen" ? 2 : 1;
        if (CURA_PS[k] != null && c.hp < c.hpMax && ratio <= (k === "oran-berry" || k === "sitrus-berry" ? 0.5 : apuro)) {
            consumirObjeto(c);
            await AnimMov.reproducir("common-use-item", ctxAnim(esAli, true));
            c.hp = Math.min(c.hpMax, c.hp + psQueCura(k, c.hpMax) * doble); AudioFX.efecto("restore"); actualizarHP(esAli);
            await decir(`¡${c.nombre} ha recuperado PS gracias a su ${f.nombre}!`, 1100);
            await carrillo(c, esAli);
        } else if (ratio <= apuro && (BAYA_APURO[k] || k === "lansat-berry" || k === "starf-berry")) {
            consumirObjeto(c);
            await AnimMov.reproducir("common-use-item", ctxAnim(esAli, true));
            await decir(`¡${c.nombre} se ha comido su ${f.nombre}!`, 900);
            if (k === "lansat-berry") { c.critEtapa = Math.max(c.critEtapa, 2); AudioFX.efecto("stat_up"); await decir(`¡${c.nombre} está preparado para asestar golpes críticos!`, 1000); }
            else await aplicarCambios(c, { [BAYA_APURO[k] || alAzarC(["atk", "def", "spa", "spd", "vel"])]: (k === "starf-berry" ? 2 : 1) * doble }, esAli);
            await carrillo(c, esAli);
        }
    }
    // Carrillo: al comerse una baya, además recupera un tercio de sus PS.
    async function carrillo(c, esAli) {
        if (c.habilidad !== "cheek-pouch" || c.hp <= 0 || c.hp >= c.hpMax || !activo) return;
        await cartelHabilidad(c, esAli);
        c.hp = Math.min(c.hpMax, c.hp + Math.floor(c.hpMax / 3)); AudioFX.efecto("restore"); actualizarHP(esAli);
        await decir(`¡${c.nombre} ha recuperado PS!`, 900);
    }
    // Bayas que curan un problema de estado nada más sufrirlo (Zreza, Atania, Ziuela…).
    async function curarConBaya(c, esAli) {
        const k = c.objeto;
        if (!k || !c.estado || c.hp <= 0 || obj(k).bolsillo !== "bayas" || !CURA_ESTADO[k] || !CURA_ESTADO[k].includes(c.estado.tipo) || nervioso(c)) return;
        consumirObjeto(c);
        await AnimMov.reproducir("common-use-item", ctxAnim(esAli, true));
        c.estado = null; actualizarEstadoCaja(esAli);
        await decir(`¡${c.nombre} se ha curado gracias a su ${obj(k).nombre}!`, 1100);
        await carrillo(c, esAli);
    }
    // Dormido, congelado o paralizado: puede que no ataque este turno.
    async function puedeMoverse(c, esAli, mov = null) {
        const e = c.estado; if (!e) return true;
        if (e.tipo === "dor") {
            e.turnos -= c.habilidad === "early-bird" ? 2 : 1;   // Madrugar: se despierta el doble de rápido
            if (e.turnos < 0) { c.estado = null; actualizarEstadoCaja(esAli); await decir(`¡${c.nombre} se ha despertado!`, 850); return true; }
            await animComun(ESTADOS.dor.anim, esAli);
            await decir(`${c.nombre} está dormido como un tronco.`, 950);
            return !!mov && SOLO_DORMIDO.has(mov.clave);   // (Sonámbulo y Ronquido, sí)
        }
        if (e.tipo === "con") {
            if (azarC() < 0.2) { c.estado = null; actualizarEstadoCaja(esAli); await decir(`¡${c.nombre} ya no está congelado!`, 850); return true; }
            await animComun(ESTADOS.con.anim, esAli);
            await decir(`¡${c.nombre} está congelado!`, 950); return false;
        }
        if (e.tipo === "par" && azarC() < 0.25) {
            await animComun(ESTADOS.par.anim, esAli);
            await decir(`¡${c.nombre} está paralizado! ¡No se puede mover!`, 1000); return false;
        }
        return true;
    }
    // fuente: quien lo provoca (para Sincronía y Corrosión). avisar: si lo impide una habilidad, se dice (movimientos de estado).
    async function aplicarEstado(c, est, esAli, fuente = null, avisar = false) {
        if (!est || c.hp <= 0 || c.estado) return false;
        if (ESTADOS[est.tipo].inmunes.some((t) => c.tipos.includes(t)) && !(est.tipo === "env" && fuente && fuente.habilidad === "corrosion")) return false;
        const inm = inmuneEstadoHab(c, est.tipo, fuente);
        if (inm === "terreno") {   // Campo de Niebla (todo) o Campo Eléctrico (el sueño)
            if (!avisar) return false;
            await decir(`¡El ${TERRENOS[terrenoEnCampo()].nombre} ha protegido a ${c.nombre}!`, 1100);
            return null;
        }
        if (inm) {
            if (avisar && inm !== "sol") {
                await cartelHabilidad(c, esAli, inm);
                await decir(`¡${nombreHabilidad(inm)} de ${c.nombre} evita ${ESTADO_CURA_TXT[est.tipo]}!`, 1200);
                return null;   // ya se ha explicado (sin «¡Pero falló!»)
            }
            return false;
        }
        if (protegidoPorVelo(c, fuente)) {   // Velo Sagrado: nada de problemas de estado causados por el rival
            if (!avisar) return false;
            await decir(`¡${c.nombre} está protegido por Velo Sagrado!`, 1000);
            return null;
        }
        c.estado = { tipo: est.tipo, turnos: est.tipo === "dor" ? entreC(1, 3) : 0, grave: !!est.grave && est.tipo === "env", n: 0 };
        actualizarEstadoCaja(esAli);
        await animComun(ESTADOS[est.tipo].anim, esAli);
        await decir(c.estado.grave ? `¡${c.nombre} ha sido gravemente envenenado!` : ESTADOS[est.tipo].pone(c.nombre), 1000);
        await curarConBaya(c, esAli);
        // Sincronía: le devuelve la parálisis, la quemadura o el veneno a quien se lo ha causado.
        if (c.habilidad === "synchronize" && fuente && fuente !== c && ["par", "que", "env"].includes(est.tipo) && puedeSufrir(fuente, est.tipo, c)) {
            await cartelHabilidad(c, esAli);
            await aplicarEstado(fuente, { tipo: est.tipo }, !esAli, c);
        }
        return true;
    }
    // fuente: el rival que provoca el cambio (sus bajadas las frenan Cuerpo Puro, Corte Fuerte… y activan Competitivo y Tenacidad).
    // El Velo Sagrado de su bando lo protege de los problemas de estado y la confusión que le cause el rival (Allanamiento lo salta).
    const protegidoPorVelo = (c, fuente) => !!(fuente && fuente !== c && fuente.lado !== c.lado && fuente.habilidad !== "infiltrator" &&
        CAMPO.lados && CAMPO.lados[c.lado] && CAMPO.lados[c.lado].veloSagrado > 0);
    async function aplicarCambios(c, statsPedidos, esAli, fuente = null) {
        const porRival = !!(fuente && fuente !== c);
        // Neblina: el rival no puede bajarle las características.
        const ln = CAMPO.lados && CAMPO.lados[c.lado];
        if (porRival && ln && ln.neblina > 0 && fuente.habilidad !== "infiltrator" && Object.values(statsPedidos).some((v) => v < 0)) {
            statsPedidos = Object.fromEntries(Object.entries(statsPedidos).filter(([, v]) => v > 0));
            await decir(`¡${c.nombre} está protegido por la neblina!`, 1000);
            if (!Object.keys(statsPedidos).length) return false;
        }
        const { stats, bloqueo } = cambiosConHab(c, statsPedidos, porRival, fuente);
        if (bloqueo) {
            await cartelHabilidad(c, esAli, bloqueo[1]);
            const todas = ["clear-body", "white-smoke", "full-metal-body", "mirror-armor"].includes(bloqueo[1]);
            await decir(todas ? `¡${nombreHabilidad(bloqueo[1])} de ${c.nombre} evita que bajen sus características!`
                : `¡${nombreHabilidad(bloqueo[1])} de ${c.nombre} evita que baje su ${STAT_LARGO[bloqueo[0]]}!`, 1200);
        }
        let alguno = false, bajo = false;
        for (const [k, v] of Object.entries(stats)) {
            const nombre = NOMBRE_STAT[k], antes = c.etapas[k], ahora = limitar(antes + v, -6, 6);
            const frase = nombre.charAt(0).toUpperCase() + nombre.slice(1) + " de " + c.nombre;
            if (ahora === antes) { await decir(`¡${frase} no puede ${v > 0 ? "subir" : "bajar"} más!`, 900); continue; }
            c.etapas[k] = ahora; alguno = true; if (v < 0) bajo = true;
            AudioFX.efecto(v > 0 ? "stat_up" : "stat_down");
            animStat(esAli, v > 0);
            actualizarEstadoCaja(esAli);
            const cuanto = Math.abs(ahora - antes) >= 3 ? " muchísimo" : Math.abs(ahora - antes) === 2 ? " mucho" : "";
            await decir(`¡${frase} ha ${v > 0 ? "subido" : "bajado"}${cuanto}!`, 950);
        }
        // Hierba Blanca: anula las bajadas de características.
        if (c.objeto === "white-herb" && Object.values(c.etapas).some((v) => v < 0) && c.hp > 0) {
            consumirObjeto(c);
            Object.keys(c.etapas).forEach((k) => { if (c.etapas[k] < 0) c.etapas[k] = 0; });
            await AnimMov.reproducir("common-use-item", ctxAnim(esAli, true));
            actualizarEstadoCaja(esAli);
            await decir(`¡${c.nombre} ha restaurado sus características con la Hierba Blanca!`, 1100);
        }
        // Oportunista: el rival copia las subidas (una vez por cada una; dos Oportunistas no se copian entre sí).
        const opo = activoDe(!esAli), suben = Object.fromEntries(Object.entries(stats).filter(([, v]) => v > 0));
        if (alguno && Object.keys(suben).length && opo && opo !== c && opo.hp > 0 && opo.habilidad === "opportunist" && !c.copiandoSubidas && activo) {
            opo.copiandoSubidas = true;
            await cartelHabilidad(opo, !esAli);
            await aplicarCambios(opo, suben, !esAli);
            opo.copiandoSubidas = false;
        }
        if (alguno && Object.keys(suben).length && opo && opo !== c && opo.hp > 0 && opo.objeto === "mirror-herb" && !c.copiandoSubidas && activo) {
            consumirObjeto(opo); opo.copiandoSubidas = true;
            await decir(`¡${opo.nombre} ha copiado las mejoras con su Hierba Copia!`, 1100);
            await aplicarCambios(opo, suben, !esAli);
            opo.copiandoSubidas = false;
        }
        // Tenacidad / Competitivo: si el rival le baja una característica, sube mucho su Ataque o su Ataque Especial.
        if (bajo && porRival && (c.habilidad === "defiant" || c.habilidad === "competitive") && c.hp > 0 && activo) {
            await cartelHabilidad(c, esAli);
            await aplicarCambios(c, { [c.habilidad === "defiant" ? "atk" : "spa"]: 2 }, esAli);
        }
        return alguno;
    }
    function ctxAnim(atacanteEsAliado, mismoObjetivo) {
        const a = spriteEl(true), e = spriteEl(false), yo = atacanteEsAliado ? a : e;
        // (sobre sí mismo y dinamaxizado, su animación crece con él: la Maxibarrera, su curación…)
        const sop = mismoObjetivo && soporteEl(atacanteEsAliado), crece = sop && sop.classList.contains("dinamax") ? (atacanteEsAliado ? 1.22 : 1.38) : 1;
        return {
            escena: escenaEl(), delante: efectosEl(), detras: $("capa-anim-detras"), fondo: $("capa-anim-fondo"),
            aliadoEl: mismoObjetivo ? yo : a, enemigoEl: mismoObjetivo ? yo : e, atacanteEsAliado, zoom: zoomEscena(false) * crece,
            grito: (tono) => AudioFX.grito((atacanteEsAliado ? aliadoActivo() : enemigoActivo()).baseId, { rate: (tono || 100) / 100, vol: 0.5 }),
            sigue: () => activo,
        };
    }
    // Animaciones de los movimientos: las de Pokémon Showdown (partículas con perspectiva, como en Blanco/Negro) con los
    // sonidos de PokéRogue; si Showdown no tiene la de un movimiento, la de PokéRogue tal cual.
    const Z_SD = {
        normal: "breakneckblitz", fighting: "alloutpummeling", flying: "supersonicskystrike", poison: "aciddownpour", ground: "tectonicrage",
        rock: "continentalcrush", bug: "savagespinout", ghost: "neverendingnightmare", steel: "corkscrewcrash", fire: "infernooverdrive",
        water: "hydrovortex", grass: "bloomdoom", electric: "gigavolthavoc", psychic: "shatteredpsyche", ice: "subzeroslammer",
        dragon: "devastatingdrake", dark: "blackholeeclipse", fairy: "twinkletackle",
    };
    function ctxSD(esAliado, clavePR) {
        const c = ctxAnim(esAliado, false);   // Showdown necesita dónde están los dos Pokémon
        c.clave = clavePR; c.sonidosDe = (k) => AnimMov.sonidos(k, c);
        return c;
    }
    const estiloSD = () => typeof config !== "undefined" && config.animaciones === "showdown";
    // ---------- Animaciones modernas (se quitan en Opciones) ----------
    // Como en los juegos actuales: antes del ataque, el físico arremete hacia su objetivo y el especial reúne la energía de su
    // tipo (partículas del Deluxe Battle Kit); la cámara se acerca al objetivo mientras dura la animación, y cada golpe estalla
    // con el color de su tipo.
    const conModernas = () => typeof config === "undefined" || config.animModernas !== false;
    const colorTipo = (t) => COLOR_TIPO[t] || "#ffffff";
    async function anticipacion(mov, esAli) {
        const s = spriteEl(esAli), o = spriteEl(!esAli); if (!s || !s.offsetWidth || s.style.visibility === "hidden") return;
        const p = centroSprite(esAli), q = o ? centroSprite(!esAli) : p, z = zoomEscena(esAli), color = colorTipo(mov.tipo);
        if (mov.cat === "fis") {
            const dx = (q.x - p.x) * 0.12, dy = (q.y - p.y) * 0.12;
            await s.animate([{ translate: "0 0", scale: "1" }, { translate: `${(-dx * 0.25).toFixed(1)}px ${(-dy * 0.25).toFixed(1)}px`, scale: "1.04 .96", offset: 0.35 },
                             { translate: `${dx.toFixed(1)}px ${dy.toFixed(1)}px`, scale: "1", offset: 0.75 }, { translate: "0 0", scale: "1" }],
                { duration: 300 / velJuego(), easing: "cubic-bezier(.3,0,.3,1)" }).finished.catch(() => {});
        } else {
            energiaHacia(p, z, color, 10, 420, 46);
            const luz = tintar(s, esAli, color, 0, 0.4, 200);
            await luz; if (activo) await tintar(s, esAli, color, 0.4, 0, 220);
        }
    }
    // La cámara se acerca al objetivo (el escenario de fondo se mueve hacia él); devuelve la función que la devuelve a su sitio.
    function empujeCamara(esAliDef, fuerte) {
        const f = escenaEl() && escenaEl().querySelector(".fondo-batalla"), e = escenaEl(); if (!f || !e || !conCamara()) return null;
        const p = centroSprite(esAliDef);
        f.style.transformOrigin = `${Math.round((p.x / e.clientWidth) * 100)}% ${Math.round((p.y / e.clientHeight) * 100)}%`;
        const a = f.animate([{ scale: "1" }, { scale: fuerte ? "1.06" : "1.035" }], { duration: 500 / velJuego(), easing: "cubic-bezier(.2,.7,.3,1)", fill: "forwards" });
        return () => { f.animate([{ scale: fuerte ? "1.06" : "1.035" }, { scale: "1" }], { duration: 420 / velJuego(), easing: "ease-in-out" }).finished.then(() => a.cancel(), () => a.cancel()); };
    }
    // Cada golpe: un destello y un anillo del color de su tipo y chispas que saltan del objetivo.
    function impactoTipo(esAliDef, tipo, fuerte) {
        const s = spriteEl(esAliDef); if (!s || !s.offsetWidth || !conModernas()) return;
        const p = centroSprite(esAliDef), z = zoomEscena(esAliDef), color = colorTipo(tipo);
        anilloPoder(p, z, color, 380, fuerte ? 2 : 1.4, 0.3);
        energiaDesde(p, z, color, fuerte ? 12 : 7, 520, fuerte ? 60 : 42);
        if (fuerte) destelloColor(color, p, 0.45);
    }
    // Los Maximovimientos y los movimientos Z, con más espectáculo: el Pokémon gigante ruge mientras le llega la energía roja,
    // la escena se oscurece del color del tipo y el golpe estalla en el objetivo (anillos y energía del Deluxe Battle Kit).
    async function animarMovimiento(mov, esAliado, propio) {
        const grande = activo && !propio && mov.cat !== "est" && (mov.esMax || mov.esZ);
        if (grande && mov.esMax) await preludioMax(esAliado);
        const velo = grande ? veloPoderoso(mov.tipo) : null;
        // Animaciones modernas: el atacante se prepara (arremete o carga energía de su tipo) y la cámara se acerca al objetivo.
        const moderna = activo && !propio && !grande && mov.cat !== "est" && conModernas();
        if (moderna) await anticipacion(mov, esAliado);
        const camara = moderna ? empujeCamara(!esAliado, (mov.poder || 0) >= 100) : null;
        await animarMovimientoBase(mov, esAliado, propio);
        if (camara) camara();
        if (grande && activo) impactoGrande(!esAliado, mov);
        if (velo) velo();
        if (!activo) return;
        // La Maxibarrera, con la energía roja del Dinamax; la Teraexplosión teracristalizado estalla en esquirlas de su teratipo.
        if (mov.clave === "max-guard") {
            const p = centroSprite(esAliado), z = zoomEscena(esAliado);
            anilloPoder(p, z, COLOR_PODER.dinamax, 600, 2.8); energiaDesde(p, z, COLOR_PODER.dinamax, 12, 650, 70);
        } else if (mov.clave === "tera-blast" && (activoDe(esAliado) || {}).teracristal) {
            const t = activoDe(esAliado).teracristal, p = centroSprite(!esAliado), z = zoomEscena(!esAliado);
            anilloPoder(p, z, COLOR_TERA[t] || "#ffffff", 550, 2.4); energiaDesde(p, z, COLOR_TERA[t] || "#ffffff", 14, 700, 80);
        }
    }
    async function preludioMax(esAli) {
        const c = activoDe(esAli), s = spriteEl(esAli); if (!c || !s || !s.offsetWidth || !activo) return;
        const ROJO = COLOR_PODER.dinamax, p = centroSprite(esAli), z = zoomEscena(esAli);
        AudioFX.grito(c.baseId, { rate: 0.7, vol: 0.6 });
        energiaHacia(p, z, ROJO, 14, 650, 60);
        anilloPoder(p, z, ROJO, 600, 0.3, 2.6);
        s.style.transformOrigin = "50% 100%";
        const luz = tintar(s, esAli, ROJO, 0, 0.45, 300);
        await anim(s, [{ transform: "scale(1)" }, { transform: "scale(1.05,1.08)", offset: 0.45 }, { transform: "scale(1)" }], { duration: 600, easing: "ease-in-out" });
        await luz;
        if (activo) await tintar(s, esAli, ROJO, 0.45, 0, 200);
        s.style.transform = ""; s.style.transformOrigin = "";
    }
    function veloPoderoso(tipo) {
        const v = $("velo-poderoso"); if (!v) return null;
        v.style.setProperty("--color", COLOR_TIPO[tipo] || "#888888");
        v.classList.add("activo");
        return () => v.classList.remove("activo");
    }
    function impactoGrande(esAli, mov) {
        const s = spriteEl(esAli); if (!s || !s.offsetWidth) return;
        const color = COLOR_TIPO[mov.tipo] || "#ffffff", p = centroSprite(esAli), z = zoomEscena(esAli);
        destelloColor(color, p, 0.7);
        anilloPoder(piesSprite(esAli), z, color, 650, 3.2);
        setTimeout(() => activo && anilloPoder(p, z, mov.esMax ? COLOR_PODER.dinamax : COLOR_PODER.z, 600, 2.4), 120 / velJuego());
        energiaDesde(p, z, color, 18, 800, 90);
        temblor(2.4);
    }
    async function animarMovimientoBase(mov, esAliado, propio) {
        const tb = mov.clave === "tera-blast" && (activoDe(esAliado) || {}).teracristal;   // teracristalizado, la de su teratipo
        const gm = mov.esMax && ANIM_GMAX[mov.clave];   // (cada Gigamovimiento, la del movimiento que más se le parece)
        // (los Maximovimientos de Showdown son los mismos que los Z: de PokéRogue, la animación y los sonidos del Z de su tipo)
        const clavePR = gm || (mov.esZ ? ANIM_Z[mov.tipo] : mov.esMax ? (mov.clave === "max-guard" ? "protect" : ANIM_Z[mov.tipo]) : tb ? TERA_BLAST_ANIM[tb] : ALIAS_ANIM[mov.clave] || mov.clave);
        const claveSD = gm || (mov.esZ ? Z_SD[mov.tipo] : tb ? "terablast" + tb : mov.clave);
        const pr = async (k) => k && AnimMov.reproducir(k, ctxAnim(esAliado, propio));
        const sd = async (k, kPR) => k && MovSD.reproducir(k, ctxSD(esAliado, kPR), { mismo: propio });
        // Primero el estilo elegido en Opciones y, si ese no tiene la animación del movimiento, el otro. Los Maximovimientos,
        // siempre primero los de Showdown (PokéRogue no tiene); la Maxibarrera, la Protección de PokéRogue.
        const sdAntes = estiloSD() || (mov.esMax && !gm && mov.clave !== "max-guard");
        const orden = sdAntes ? [() => sd(claveSD, clavePR), () => pr(clavePR)] : [() => pr(clavePR), () => sd(claveSD, clavePR)];
        for (const intento of orden) { if (await intento()) return; if (!activo) return; }
        const reserva = animReserva(mov);
        if (!(await pr(reserva))) await sd(reserva, reserva);
    }
    // Estados y curación: las de Showdown (con el sonido de PokéRogue) o, si no, las de PokéRogue.
    const COMUN_SD = {
        "common-health-up": ["other", "heal"], "common-paralysis": ["status", "par"], "common-burn": ["status", "brn"], "common-poison": ["status", "psn"],
        "common-toxic": ["status", "psn"], "common-sleep": ["status", "slp"], "common-frozen": ["status", "frz"], "common-confusion": ["status", "confused"],
    };
    async function animComun(clavePR, esAli) {
        const sd = COMUN_SD[clavePR];
        if (estiloSD() && sd && await MovSD.reproducir(sd[1], ctxSD(esAli, clavePR), { grupo: sd[0], mismo: true })) return true;
        if (await AnimMov.reproducir(clavePR, ctxAnim(esAli, true))) return true;
        return !!(sd && await MovSD.reproducir(sd[1], ctxSD(esAli, clavePR), { grupo: sd[0], mismo: true }));
    }
    // Drenadoras: la energía va del infectado al que las plantó (la de Showdown o la de PokéRogue).
    async function animDrenadoras(esAli) {
        const sd = () => MovSD.reproducir("leech", ctxSD(!esAli, "common-leech-seed"), { grupo: "other" });
        if (estiloSD() && await sd()) return;
        if (await AnimMov.reproducir("common-leech-seed", ctxAnim(!esAli, false))) return;
        await sd();
    }
    // Efectos de cámara (se pueden quitar en Opciones): la escena tiembla con los golpes y destella con los críticos.
    const conCamara = () => typeof config === "undefined" || config.camara !== false;
    function temblor(fuerza = 1) {
        const e = escenaEl(); if (!e || !conCamara() || typeof e.animate !== "function") return;
        const a = 4 * fuerza, kf = [0, 1, 2, 3, 4, 5].map((i) => ({ translate: `${(i % 2 ? -a : a) * (1 - i / 6)}px ${(i % 3 - 1) * a * 0.5}px` }));
        kf.push({ translate: "0 0" });
        e.animate(kf, { duration: 300 / velJuego(), easing: "linear" });
    }
    function destello() {
        const cont = efectosEl(); if (!cont || !conCamara()) return;
        const f = document.createElement("div");
        f.className = "golpe-destello";
        cont.appendChild(f); setTimeout(() => f.remove(), 320 / velJuego());
    }
    // Esquiva (el ataque ha fallado): se aparta hacia su lado y vuelve, como en Elite Battle DX.
    function esquivar(esAli) {
        const s = spriteEl(esAli); if (!s || typeof s.animate !== "function" || s.style.visibility === "hidden") return Promise.resolve();
        const d = (esAli ? -1 : 1) * Math.max(14, Math.round(s.offsetWidth * 0.22));
        return s.animate([{ translate: "0 0" }, { translate: `${d}px 0`, offset: 0.3 }, { translate: `${d}px 0`, offset: 0.62 }, { translate: "0 0" }],
            { duration: 460 / velJuego(), easing: "ease-out" }).finished.catch(() => {});
    }
    // Se esconde (Vuelo, Excavar…) o vuelve a verse.
    function ocultarSprite(esAli, donde) {
        const s = spriteEl(esAli); if (!s || typeof s.animate !== "function") return;
        const y = donde === "aire" ? -70 : donde === "fuera" ? 0 : 24;
        s._oculto = s.animate([{ opacity: 1, translate: "0 0" }, { opacity: 0, translate: `0 ${y}px` }], { duration: 380 / velJuego(), easing: "ease-in", fill: "forwards" });
    }
    function mostrarSprite(esAli) {
        const s = spriteEl(esAli); if (!s || !s._oculto) return;
        s._oculto.cancel(); s._oculto = null;
        s.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220 / velJuego() });
    }
    // Si algo le impide seguir (retroceso, parálisis, falla…), la carga o la furia se cortan sin más.
    function cortarForzado(c, esAli) {
        if (!c.forzado || c.forzado.tipo === "recarga") return;
        if (c.forzado.oculto) mostrarSprite(esAli);
        c.forzado = null;
    }
    // Confusión (2-5 turnos): Rayo Confuso, Contoneo… o el cansancio tras Enfado. Ritmo Propio la evita.
    // avisar: los movimientos de estado explican por qué no funciona (null = ya explicado).
    async function confundir(c, esAli, avisar = false, fuente = null) {
        if (!c || c.hp <= 0) return false;
        if (c.confuso) { if (avisar) { await decir(`¡${c.nombre} ya está confuso!`, 900); return null; } return false; }
        if (protegidoPorVelo(c, fuente)) {
            if (!avisar) return false;
            await decir(`¡${c.nombre} está protegido por Velo Sagrado!`, 1000); return null;
        }
        if (terrenoEnCampo() === "niebla" && enSuelo(c)) {
            if (!avisar) return false;
            await decir(`¡El Campo de Niebla ha protegido a ${c.nombre}!`, 1100); return null;
        }
        if (c.habilidad === "own-tempo") {
            if (!avisar) return false;
            await cartelHabilidad(c, esAli); await decir(`¡${c.nombre} no se confunde gracias a su Ritmo Propio!`, 1100); return null;
        }
        c.confuso = entreC(2, 5);
        await animComun("common-confusion", esAli);
        await decir(`¡${c.nombre} se ha quedado confuso!`, 950);
        return true;
    }
    // Pokémon Furiosos: la furia carmesí les sube todas las características al entrar (como el aura de los Pokémon
    // dominantes de Sol y Luna), con su grito y las flechas de PokéRogue.
    async function furiaCarmesi(c, esAli) {
        c.furiaHecha = true;
        pintarPoderes(esAli, c);
        AudioFX.grito(c.baseId, { rate: 0.85, vol: 0.6 });
        Object.keys(c.etapas).forEach((k) => { c.etapas[k] = Math.min(6, c.etapas[k] + 1); });
        AudioFX.efecto("stat_up"); animStat(esAli, true); actualizarEstadoCaja(esAli);
        await decir(`¡La furia carmesí ha subido todas las características de ${c.nombre}!`, 1300);
    }
    // Hierba Mental: se libra (una vez) de Atracción, Mofa, Otra Vez y Anulación.
    async function hierbaMental(c, esAli) {
        if (!c || c.objeto !== "mental-herb" || c.hp <= 0 || !(c.enamorado || c.mofa > 0 || c.otraVez || c.anulado)) return null;
        consumirObjeto(c);
        Object.assign(c, { enamorado: null, mofa: 0, otraVez: null, anulado: null });
        await decir(`¡${c.nombre} se ha curado gracias a su Hierba Mental!`, 1100);
        return null;
    }
    // Espray Bucal: tras usar un movimiento de sonido, sube su Ataque Especial (una vez).
    async function esprayBucal(c, esAli, mov) {
        if (c.objeto !== "throat-spray" || c.hp <= 0 || !MOVS_SONIDO.has(mov.clave) || c.etapas.spa >= 6 || !activo) return;
        consumirObjeto(c); await decir(`¡${c.nombre} ha usado su Espray Bucal!`, 950);
        await aplicarCambios(c, { spa: 1 }, esAli);
    }
    // Semillas (Electro, Hierba, Bruma y Psique): con su campo, suben la Defensa o la Defensa Especial (una vez).
    const SEMILLAS = { "electric-seed": ["electrico", "def"], "grassy-seed": ["hierba", "def"], "misty-seed": ["niebla", "spd"], "psychic-seed": ["psiquico", "spd"] };
    async function semilla(c, esAli) {
        const s = c && SEMILLAS[c.objeto];
        if (!s || c.hp <= 0 || terrenoEnCampo() !== s[0] || c.etapas[s[1]] >= 6 || !activo) return;
        const nombre = obj(c.objeto).nombre;
        consumirObjeto(c); await decir(`¡${c.nombre} ha usado su ${nombre}!`, 950);
        await aplicarCambios(c, { [s[1]]: 1 }, esAli);
    }
    // Servicio Raro: con Espacio Raro, baja su Velocidad (una vez).
    async function servicioRaro(c, esAli) {
        if (!c || c.objeto !== "room-service" || c.hp <= 0 || !(CAMPO.espacioRaro > 0) || c.etapas.vel <= -6 || !activo) return;
        consumirObjeto(c); await decir(`¡${c.nombre} ha usado su Servicio Raro!`, 950);
        await aplicarCambios(c, { vel: -1 }, esAli);
    }
    // Energía Potenciadora: activa Paleosíntesis o Carga Cuark sin sol ni Campo Eléctrico (hasta que se retire).
    async function energiaPotenciadora(c, esAli) {
        if (!c || c.objeto !== "booster-energy" || c.hp <= 0 || !["protosynthesis", "quark-drive"].includes(c.habilidad) || paradojaActiva(c) || !activo) return;
        consumirObjeto(c); c.potenciado = true;
        await cartelHabilidad(c, esAli);
        await decir(`¡${c.nombre} ha usado su Energía Potenciadora para activar ${nombreHabilidad(c.habilidad)}!`, 1200);
    }
    const potenciadoras = async () => { for (const ea of ordenFijo()) await energiaPotenciadora(activoDe(ea), ea); };
    // Hurto y Prestidigitador: se queda con el objeto del otro. Lo que le quitan a uno tuyo vuelve al acabar; lo que roba uno
    // tuyo a un entrenador, también se devuelve (a un salvaje, se lo queda).
    async function robarObjeto(ladron, esAliL, victima, hab) {
        const o = victima.objeto;
        await cartelHabilidad(ladron, esAliL, hab);
        if (!victima.objetoQuitado) victima.objetoQuitado = o;
        victima.objeto = null; victima.bloqueo = null;
        if (esAliL && !opts.salvaje && !ladron.objetoRobado) ladron.objetoRobado = { antes: ladron.objeto };
        ladron.objeto = o;
        await decir(`¡${ladron.nombre} le ha robado ${obj(o).nombre} a ${victima.nombre}!`, 1200);
    }
    // El Pokémon en el campo con Humedad (o null).
    const hayHumedad = () => [true, false].map((ea) => activoDe(ea)).find((p) => p && p.hp > 0 && p.habilidad === "damp") || null;
    // Velo Aroma: protege de Mofa, Otra Vez, Anulación y Atracción. true si lo ha parado (y ya lo ha dicho).
    async function veloAroma(c, esAli) {
        if (!c || c.habilidad !== "aroma-veil") return false;
        await cartelHabilidad(c, esAli);
        await decir(`¡${c.nombre} está protegido por un velo aromático!`, 1000);
        return true;
    }
    // Anulación (y Cuerpo Maldito): ese movimiento no se puede usar durante 4 turnos.
    async function anular(c, esAli, mv) {
        c.anulado = { clave: mv.clave, nombre: mv.nombre, turnos: 4 };
        await decir(`¡Se ha anulado el movimiento ${mv.nombre} de ${c.nombre}!`, 1100);
        return hierbaMental(c, esAli);
    }
    // Atracción y Gran Encanto. avisar: si no puede, se explica (con «null», ya explicado); false: no le afecta.
    async function enamorar(c, esAli, fuente, avisar = false) {
        if (!c || c.hp <= 0 || !fuente) return false;
        if (c.habilidad === "aroma-veil") { if (avisar) { await veloAroma(c, esAli); return null; } return false; }
        if (c.enamorado) { if (avisar) { await decir(`¡${c.nombre} ya está enamorado!`, 900); return null; } return false; }
        if (!generosOpuestos(c, fuente)) return false;
        if (c.habilidad === "oblivious") {   // Despiste
            if (!avisar) return false;
            await cartelHabilidad(c, esAli); await decir(`No afecta a ${c.nombre}…`, 850); return null;
        }
        c.enamorado = fuente;
        await animComun("common-attract", esAli);
        await decir(`¡${c.nombre} se ha enamorado de ${fuente.nombre}!`, 1000);
        // Lazo Destino: el amor también le llega al otro.
        if (c.objeto === "destiny-knot" && !fuente.enamorado && fuente.hp > 0) {
            await decir(`¡El Lazo Destino de ${c.nombre} se ha activado!`, 950);
            await enamorar(fuente, !esAli, c, false);
        }
        await hierbaMental(c, esAli);
        return true;
    }
    // Puño Certero: al empezar el turno, antes de que nadie ataque, se concentra.
    async function concentrar(c, mv) {
        if (mv && mv.clave === "focus-punch" && !mv.esZ && !mv.esMax && c.hp > 0 && activo) await decir(`¡${c.nombre} está reforzando su concentración!`, 900);
    }
    // Metaláser, Cabeza Sorpresa y Clorofiláser: el usuario pierde la mitad de sus PS (si el rival ha caído, aguanta con 1).
    async function sacrificioMedio(atacante, esAliado, defensor) {
        if (atacante.hp <= 0 || atacante.habilidad === "magic-guard" || !activo) return;
        atacante.hp = Math.max(defensor && defensor.hp <= 0 ? 1 : 0, atacante.hp - Math.ceil(atacante.hpMax / 2));
        animarGolpe(esAliado); actualizarHP(esAliado);
        await decir(`¡${atacante.nombre} sacrifica sus PS para mejorar su movimiento!`, 1100);
    }
    // Transformación e Impostor: copia el aspecto, los tipos, las características (menos los PS), sus cambios, la habilidad, el
    // peso y los movimientos (con 5 PP cada uno) del rival, hasta que se retira o acaba el combate.
    async function transformar(c, esAli, objetivo, porHabilidad = false) {
        if (!c || !objetivo || c.hp <= 0 || objetivo.hp <= 0 || c.transformado || objetivo.transformado || objetivo.sustituto > 0 ||
            (objetivo.forzado && objetivo.forzado.oculto) || !activo) {
            if (!porHabilidad) await decir("¡Pero falló!", 800);
            return false;
        }
        if (porHabilidad) await cartelHabilidad(c, esAli, "imposter");
        c.original = { tipos: c.tipos, tiposBase: c.tiposBase, habilidad: c.habilidad, habBase: c.habBase, movimientos: c.movimientos, peso: c.peso, puedeMega: c.puedeMega };
        c.transformado = { id: objetivo.baseId, mega: objetivo.esMega ? objetivo.megaInfo || objetivo.megaSprite : null };
        Object.assign(c, {
            tipos: objetivo.tipos.slice(), tiposBase: objetivo.tipos.slice(), habilidad: objetivo.habilidad, habBase: objetivo.habilidad,
            peso: objetivo.peso, puedeMega: false, stats: Object.assign({}, objetivo.stats), etapas: Object.assign({}, objetivo.etapas),
            critEtapa: objetivo.critEtapa || 0, movimientos: objetivo.movimientos.map((m) => Object.assign({}, m, { pp: 5, ppAct: 5 })),
            bloqueo: null, otraVez: null, anulado: null, usados: null,
        });
        AudioFX.efecto("shine", { vol: 0.5 });
        const s = spriteEl(esAli);
        if (s) await anim(s, [{ filter: "brightness(1)" }, { filter: "brightness(3) saturate(0)" }], { duration: 220 });
        await montarCombatiente(esAli, c, true);
        if (c.sustituto > 0) ponerMuneco(esAli, true);   // (el muñeco sigue ahí)
        const s2 = spriteEl(esAli);
        if (s2) { await anim(s2, [{ filter: "brightness(3) saturate(0)" }, { filter: "brightness(1)" }], { duration: 300 }); s2.style.filter = ""; }
        repintarFicha(esAli);   // (sus tipos nuevos en la ficha)
        await decir(`¡${c.nombre} se ha transformado en ${objetivo.nombre}!`, 1200);
        return true;
    }
    // Vuelve a ser él mismo: lo suyo de antes y sus características de siempre (por si ha subido de nivel mientras tanto).
    function destransformar(c) {
        if (!c || !c.transformado) return;
        Object.assign(c, c.original);
        c.stats = statsDeNivel(c.base, c.nivel, c.ev, c.naturaleza).stats;
        c.transformado = null; c.original = null;
    }
    // Protección y compañía, Drenadoras, Mofa, Viento Afín y las pantallas (Reflejo, Pantalla de Luz, Velo Aurora).
    // ---------- Movimientos de estado que se programaron después (cada uno, como en los juegos) ----------
    const repintar = (c, esAli) => { const f = $(esAli ? "caja-aliado" : "caja-enemigo"); if (f && c === activoDe(esAli)) { pintarCaja(f, c, esAli, esAli ? aliados : enemigos); actualizarEstadoCaja(esAli); } };
    const falla = () => decir("¡Pero falló!", 800);
    const STATS5 = ["atk", "def", "spa", "spd", "vel"];
    // Usa otro movimiento (Metrónomo, Manto Espejo, Yo Primero…): con sus datos oficiales y sin volver a comprobar si puede moverse.
    async function usarOtro(clave, atacante, defensor, esAliado, primero, mult = 1) {
        let mv;
        try { mv = movDeAPI(await conLimite(cargarMovimiento(clave), 8000), 1); } catch (_) { mv = null; }
        if (!mv || !activo) return falla();
        mv.pp = mv.ppAct = mv.pp || 5;
        if (mult !== 1 && mv.poder) mv.poder = Math.floor(mv.poder * mult);
        return ejecutarMovimiento(atacante, defensor, mv, esAliado, primero, true);
    }
    // Relevo, Teletransporte, Autotomía de Cola, Recepción Gélida: vuelve a su Poké Ball y sale otro (con lo que le pase).
    async function relevar(esAli, alSalir) {
        const equipo = esAli ? aliados : enemigos, actual = esAli ? iAliado : iEnemigo;
        if ((opts.salvaje && !esAli) || !equipo.some((p, i) => i !== actual && p.hp > 0)) return false;
        const ok = await pivotar(esAli);
        if (ok && alSalir) { const n = activoDe(esAli); if (n && n.hp > 0) await alSalir(n); }
        return ok;
    }
    const cambiaHab = (c, esAli, h) => { c.habilidad = h; repintar(c, esAli); };
    const NO_TOCAR_HAB = new Set(["multitype", "stance-change", "schooling", "comatose", "shields-down", "disguise", "rks-system", "battle-bond",
        "power-construct", "ice-face", "gulp-missile", "zero-to-hero", "commander", "as-one-glastrier", "as-one-spectrier", "tera-shift", "truant"]);
    async function efectoNuevo(k, mov, atacante, defensor, esAliado, primero, m) {
        const a = atacante, d = defensor, eA = esAliado, eD = !esAliado, lado = CAMPO.lados[eA ? "a" : "r"];
        if (["power-trick", "power-shift", "speed-swap", "power-split", "guard-split"].includes(k)) [a, d].forEach((c) => { if (!c.statsOrig) c.statsOrig = Object.assign({}, c.stats); });
        switch (k) {
            // — Mismo Destino y Canto Mortal —
            case "destiny-bond":
                if (a._movPrevio === "destiny-bond") return falla();   // (no funciona dos veces seguidas)
                a.mismoDestino = true;
                return decir(`¡${a.nombre} quiere llevarse a su rival consigo!`, 1000);
            case "perish-song": {
                const oyen = [a, d].filter((c) => c && c.hp > 0 && !c.perecer && c.habilidad !== "soundproof");
                if (!oyen.length) return falla();
                oyen.forEach((c) => { c.perecer = 4; });
                CAMPO.cantoMortalDe = eA;   // (si caen los dos a la vez, pierde el bando que cantó)
                return decir("¡Todos los Pokémon que han oído la canción se debilitarán en tres turnos!", 1200);
            }
            // — Subidas de características —
            case "shell-smash": await aplicarCambios(a, { def: -1, spd: -1 }, eA); return aplicarCambios(a, { atk: 2, spa: 2, vel: 2 }, eA);
            case "victory-dance": return aplicarCambios(a, { atk: 1, def: 1, vel: 1 }, eA);
            case "shelter": return aplicarCambios(a, { def: 2 }, eA);
            case "fillet-away":
                if (a.hp <= a.hpMax / 2) return falla();
                a.hp -= Math.floor(a.hpMax / 2); animarGolpe(eA); actualizarHP(eA);
                await decir(`¡${a.nombre} ha sacrificado parte de sus PS!`, 900);
                return aplicarCambios(a, { atk: 2, spa: 2, vel: 2 }, eA);
            case "take-heart":
                if (a.estado) { a.estado = null; actualizarEstadoCaja(eA); await decir(`¡${a.nombre} se ha curado de su problema de estado!`, 900); }
                return aplicarCambios(a, { spa: 1, spd: 1 }, eA);
            case "acupressure": {
                const libres = STATS5.filter((s) => a.etapas[s] < 6); if (!libres.length) return falla();
                return aplicarCambios(a, { [alAzarC(libres)]: 2 }, eA);
            }
            case "stockpile":
                if ((a.reservas || 0) >= 3) return falla();
                a.reservas = (a.reservas || 0) + 1;
                await decir(`¡${a.nombre} ha reservado energía (${a.reservas})!`, 850);
                return aplicarCambios(a, { def: 1, spd: 1 }, eA);
            case "curse":
                if (!a.tipos.includes("ghost")) { await aplicarCambios(a, { vel: -1 }, eA); return aplicarCambios(a, { atk: 1, def: 1 }, eA); }
                if (d.maldito) return falla();
                a.hp = Math.max(0, a.hp - Math.floor(a.hpMax / 2)); animarGolpe(eA); actualizarHP(eA);
                d.maldito = true;
                await decir(`¡${a.nombre} ha sacrificado parte de sus PS y ha maldecido a ${d.nombre}!`, 1200);
                return;
            case "spicy-extract": await aplicarCambios(d, { atk: 2 }, eD, a); return aplicarCambios(d, { def: -2 }, eD, a);
            case "laser-focus": a.laserFocus = true; return decir(`¡${a.nombre} se ha concentrado al máximo!`, 900);
            case "magnet-rise":
                if (a.levitando || a.arraigo) return falla();
                a.levitando = 5; return decir(`¡${a.nombre} levita gracias al electromagnetismo!`, 950);
            case "telekinesis":
                if (d.telequinesis || d.arraigo) return falla();
                d.telequinesis = 3; return decir(`¡${d.nombre} se ha quedado flotando en el aire!`, 950);
            case "endure":
                if (!primero || azarC() >= 1 / Math.pow(3, a.protecciones || 0)) { a.protecciones = 0; return falla(); }
                a.protecciones = (a.protecciones || 0) + 1; a.aguante = turno;
                return decir(`¡${a.nombre} se prepara para aguantar el golpe!`, 900);
            // — Curación —
            case "strength-sap": {
                if (d.etapas.atk <= -6) return falla();
                const cant = Math.floor(d.stats.atk * multEtapa(d.etapas.atk));
                await aplicarCambios(d, { atk: -1 }, eD, a);
                if (a.anticura > 0) return decir(`¡${a.nombre} no puede curarse!`, 850);
                a.hp = Math.min(a.hpMax, a.hp + cant); AudioFX.efecto("restore"); actualizarHP(eA);
                return decir(`¡${a.nombre} ha absorbido la fuerza de ${d.nombre}!`, 950);
            }
            case "lunar-blessing": case "jungle-healing": {
                const cura = a.hp < a.hpMax, estado = !!a.estado;
                if (!cura && !estado) return falla();
                if (a.anticura > 0) return decir(`¡${a.nombre} no puede curarse!`, 850);
                a.hp = Math.min(a.hpMax, a.hp + Math.floor(a.hpMax / 4)); a.estado = null; AudioFX.efecto("restore"); actualizarHP(eA); actualizarEstadoCaja(eA);
                return decir(`¡${a.nombre} ha recuperado PS${estado ? " y se ha curado" : ""}!`, 950);
            }
            case "purify":
                if (!d.estado) return falla();
                d.estado = null; actualizarEstadoCaja(eD); await decir(`¡${d.nombre} se ha curado de su problema de estado!`, 900);
                if (a.hp < a.hpMax && !(a.anticura > 0)) { a.hp = Math.min(a.hpMax, a.hp + Math.floor(a.hpMax / 2)); AudioFX.efecto("restore"); actualizarHP(eA); await decir(`¡${a.nombre} ha recuperado PS!`, 850); }
                return;
            case "refresh":
                if (!a.estado || !["par", "que", "env"].includes(a.estado.tipo)) return falla();
                a.estado = null; actualizarEstadoCaja(eA); return decir(`¡${a.nombre} se ha curado de su problema de estado!`, 900);
            case "psycho-shift": {
                if (!a.estado || d.estado) return falla();
                const ok = await aplicarEstado(d, { tipo: a.estado.tipo, grave: a.estado.grave }, eD, a, true);
                if (ok === false) return falla();
                a.estado = null; actualizarEstadoCaja(eA); return decir(`¡${a.nombre} se ha curado de su problema de estado!`, 900);
            }
            case "revival-blessing": {
                const equipo = eA ? aliados : enemigos, caido = equipo.find((p) => p.hp <= 0);
                if (!caido) return falla();
                caido.hp = Math.max(1, Math.floor(caido.hpMax / 2)); caido.estado = null;
                AudioFX.efecto("restore"); renderBolas();
                return decir(`¡${caido.nombre} ha recuperado las fuerzas y puede volver a combatir!`, 1100);
            }
            // — Objetos —
            case "recycle":
                if (a.objeto || !a.objetoGastado) return falla();
                a.objeto = a.objetoGastado; a.objetoGastado = null; return decir(`¡${a.nombre} ha recuperado su ${obj(a.objeto).nombre}!`, 950);
            case "trick": case "switcheroo": {
                if ((!a.objeto && !d.objeto) || (a.objeto && !puedePerderObjeto(a)) || (d.objeto && !puedePerderObjeto(d)) || d.habilidad === "sticky-hold") return falla();
                for (const c of [a, d]) if (c.lado === "a" && !opts.salvaje && !c.objetoRobado) c.objetoRobado = { antes: c.objeto };   // (lo tuyo vuelve al acabar)
                [a.objeto, d.objeto] = [d.objeto, a.objeto]; a.bloqueo = null; d.bloqueo = null;
                await decir(`¡${a.nombre} ha intercambiado su objeto con ${d.nombre}!`, 950);
                if (a.objeto) await decir(`¡${a.nombre} ha recibido ${obj(a.objeto).nombre}!`, 850);
                return d.objeto ? decir(`¡${d.nombre} ha recibido ${obj(d.objeto).nombre}!`, 850) : null;
            }
            case "bestow":
                if (!a.objeto || d.objeto || !puedePerderObjeto(a)) return falla();
                if (a.lado === "a" && !opts.salvaje && !a.objetoRobado) a.objetoRobado = { antes: a.objeto };
                d.objeto = a.objeto; a.objeto = null;
                return decir(`¡${a.nombre} le ha dado ${obj(d.objeto).nombre} a ${d.nombre}!`, 950);
            case "corrosive-gas":
                if (!d.objeto || !puedePerderObjeto(d)) return falla();
                if (!d.objetoQuitado) d.objetoQuitado = d.objeto;
                await decir(`¡${a.nombre} ha corroído ${obj(d.objeto).nombre} de ${d.nombre}!`, 950);
                d.objeto = null; return;
            case "embargo":
                if (d.embargo) return falla();
                d.embargo = 5; d.objetoEmbargado = d.objeto; d.objeto = null;
                return decir(`¡${d.nombre} no puede usar objetos!`, 900);
            // — Trabas al rival —
            case "heal-block":
                if (d.anticura) return falla();
                d.anticura = 5; return decir(`¡${d.nombre} no puede curarse!`, 900);
            case "torment":
                if (d.tormento) return falla();
                d.tormento = true; return decir(`¡${a.nombre} atormenta a ${d.nombre}!`, 900);
            case "imprison":
                if (a.sellado) return falla();
                a.sellado = true; return decir(`¡${a.nombre} ha sellado los movimientos que conoce!`, 950);
            case "spite": {
                const u = d.ultimoMov, mv = u && d.movimientos.find((x) => x.clave === u);
                if (!mv || mv.ppAct <= 0) return falla();
                const q = Math.min(4, mv.ppAct); mv.ppAct -= q;
                return decir(`¡${mv.nombre} de ${d.nombre} ha perdido ${q} PP!`, 950);
            }
            case "nightmare":
                if (!d.estado || d.estado.tipo !== "dor" || d.pesadilla) return falla();
                d.pesadilla = true; return decir(`¡${d.nombre} tiene una pesadilla!`, 900);
            case "octolock":
                if (d.octopresa || d.tipos.includes("ghost")) return falla();
                d.octopresa = a; d.atrapado = d.atrapado || { mov: "Octopresa", por: a, turnos: 99, sinDanio: true };
                return decir(`¡${d.nombre} ha quedado atrapado por Octopresa!`, 950);
            case "foresight": case "odor-sleuth": d.identificado = true; return decir(`¡${a.nombre} ha identificado a ${d.nombre}!`, 900);
            case "miracle-eye": d.ojoMilagro = true; return decir(`¡${a.nombre} ha identificado a ${d.nombre}!`, 900);
            case "electrify": d.electrificado = true; return decir(`¡El movimiento de ${d.nombre} ahora es de tipo Eléctrico!`, 950);
            case "powder": d.polvo = turno; return decir(`¡${d.nombre} está cubierto de polvo explosivo!`, 950);
            case "magic-coat": a.capaMagica = turno; return decir(`¡${a.nombre} se ha cubierto con un manto mágico!`, 900);
            case "snatch": a.robo = turno; return decir(`¡${a.nombre} espera a que el rival use un movimiento!`, 900);
            // — Tipos y habilidades —
            case "conversion": {
                const t = (a.movimientos[0] || {}).tipo; if (!t || (a.tipos.length === 1 && a.tipos[0] === t) || a.teracristal) return falla();
                a.tipos = [t]; repintar(a, eA); return decir(`¡${a.nombre} ahora es de tipo ${TIPOS_ES[t]}!`, 950);
            }
            case "conversion-2": {
                const u = d.ultimoMov, mv = u && d.movimientos.find((x) => x.clave === u); if (!mv || a.teracristal) return falla();
                const resisten = Object.keys(TIPOS_ES).filter((t) => efectividad(mv.tipo, [t]) < 1 && !a.tipos.includes(t)); if (!resisten.length) return falla();
                const t = alAzarC(resisten); a.tipos = [t]; repintar(a, eA); return decir(`¡${a.nombre} ahora es de tipo ${TIPOS_ES[t]}!`, 950);
            }
            case "camouflage": {
                if (a.teracristal) return falla();
                const t = { electrico: "electric", hierba: "grass", niebla: "fairy", psiquico: "psychic" }[terrenoEnCampo()] || "normal";
                a.tipos = [t]; repintar(a, eA); return decir(`¡${a.nombre} ahora es de tipo ${TIPOS_ES[t]}!`, 950);
            }
            case "reflect-type":
                if (a.teracristal || d.tipos.join() === a.tipos.join()) return falla();
                a.tipos = d.tipos.slice(); repintar(a, eA); return decir(`¡${a.nombre} ahora es del mismo tipo que ${d.nombre}!`, 950);
            case "soak": case "magic-powder": {
                const t = k === "soak" ? "water" : "psychic";
                if (d.teracristal || (d.tipos.length === 1 && d.tipos[0] === t)) return falla();
                d.tipos = [t]; repintar(d, eD); return decir(`¡${d.nombre} ahora es de tipo ${TIPOS_ES[t]}!`, 950);
            }
            case "trick-or-treat": case "forests-curse": {
                const t = k === "trick-or-treat" ? "ghost" : "grass";
                if (d.teracristal || d.tipos.includes(t)) return falla();
                d.tipos = d.tipos.slice(0, 2).concat([t]); repintar(d, eD); return decir(`¡${d.nombre} ahora también es de tipo ${TIPOS_ES[t]}!`, 950);
            }
            case "worry-seed": case "simple-beam": {
                const h = k === "worry-seed" ? "insomnia" : "simple";
                if (NO_TOCAR_HAB.has(d.habilidad) || d.habilidad === h) return falla();
                cambiaHab(d, eD, h); if (h === "insomnia" && d.estado && d.estado.tipo === "dor") { d.estado = null; actualizarEstadoCaja(eD); }
                return decir(`¡La habilidad de ${d.nombre} ahora es ${nombreHabilidad(h)}!`, 950);
            }
            case "entrainment":
                if (NO_TOCAR_HAB.has(d.habilidad) || NO_COPIABLES.has(a.habilidad) || d.habilidad === a.habilidad) return falla();
                cambiaHab(d, eD, a.habilidad); return decir(`¡La habilidad de ${d.nombre} ahora es ${nombreHabilidad(d.habilidad)}!`, 950);
            case "role-play": case "doodle":
                if (NO_TOCAR_HAB.has(a.habilidad) || NO_COPIABLES.has(d.habilidad) || d.habilidad === a.habilidad) return falla();
                cambiaHab(a, eA, d.habilidad); return decir(`¡${a.nombre} ha copiado la habilidad ${nombreHabilidad(a.habilidad)}!`, 950);
            case "skill-swap":
                if (NO_TOCAR_HAB.has(a.habilidad) || NO_TOCAR_HAB.has(d.habilidad) || NO_COPIABLES.has(a.habilidad) || NO_COPIABLES.has(d.habilidad)) return falla();
                [a.habilidad, d.habilidad] = [d.habilidad, a.habilidad]; repintar(a, eA); repintar(d, eD);
                return decir(`¡${a.nombre} ha intercambiado su habilidad con ${d.nombre}!`, 950);
            case "gastro-acid":
                if (NO_TOCAR_HAB.has(d.habilidad) || d.habilidad === "-") return falla();
                cambiaHab(d, eD, "-"); return decir(`¡La habilidad de ${d.nombre} ha quedado anulada!`, 950);
            // — Características intercambiadas —
            case "power-trick": [a.stats.atk, a.stats.def] = [a.stats.def, a.stats.atk]; return decir(`¡${a.nombre} ha intercambiado su Ataque y su Defensa!`, 950);
            case "power-shift":
                [a.stats.atk, a.stats.def] = [a.stats.def, a.stats.atk]; [a.stats.spa, a.stats.spd] = [a.stats.spd, a.stats.spa];
                return decir(`¡${a.nombre} ha intercambiado sus características de ataque y de defensa!`, 1000);
            case "power-swap": case "guard-swap": case "heart-swap": {
                const ks = k === "power-swap" ? ["atk", "spa"] : k === "guard-swap" ? ["def", "spd"] : STATS5;
                ks.forEach((s) => { [a.etapas[s], d.etapas[s]] = [d.etapas[s], a.etapas[s]]; });
                actualizarEstadoCaja(eA); actualizarEstadoCaja(eD);
                return decir(`¡${a.nombre} ha intercambiado los cambios en las características con ${d.nombre}!`, 1000);
            }
            case "speed-swap": [a.stats.vel, d.stats.vel] = [d.stats.vel, a.stats.vel]; return decir(`¡${a.nombre} ha intercambiado su Velocidad con ${d.nombre}!`, 950);
            case "power-split": case "guard-split": {
                for (const s of k === "power-split" ? ["atk", "spa"] : ["def", "spd"]) { const med = Math.floor((a.stats[s] + d.stats[s]) / 2); a.stats[s] = d.stats[s] = med; }
                return decir(`¡${a.nombre} ha compartido su ${k === "power-split" ? "poder" : "defensa"} con ${d.nombre}!`, 950);
            }
            case "topsy-turvy":
                if (!STATS5.some((s) => d.etapas[s])) return falla();
                STATS5.forEach((s) => { d.etapas[s] = -d.etapas[s]; }); actualizarEstadoCaja(eD);
                return decir(`¡Los cambios en las características de ${d.nombre} se han invertido!`, 950);
            // — Campo —
            case "gravity":
                if (CAMPO.gravedad) return falla();
                CAMPO.gravedad = 5; [a, d].forEach((c) => { c.levitando = 0; c.telequinesis = 0; });
                return decir("¡La gravedad se ha intensificado!", 950);
            case "magic-room":
                if (CAMPO.salaMagica) { CAMPO.salaMagica = 0; [a, d].forEach(devolverObjetoSala); return decir("¡La Zona Mágica ha desaparecido!", 900); }
                CAMPO.salaMagica = 5; [a, d].forEach((c) => { if (c.objeto && !c.objetoSala) { c.objetoSala = c.objeto; c.objeto = null; } });
                return decir("¡Se ha creado una zona donde los objetos no tienen efecto!", 1000);
            case "wonder-room":
                CAMPO.salaExtrana = CAMPO.salaExtrana ? 0 : 5;
                return decir(CAMPO.salaExtrana ? "¡Se ha creado una zona donde se intercambian la Defensa y la Defensa Especial!" : "¡La Zona Extraña ha desaparecido!", 1000);
            case "mud-sport": if (CAMPO.chapoteo) return falla(); CAMPO.chapoteo = 5; return decir("¡Se ha debilitado el poder de los ataques de tipo Eléctrico!", 950);
            case "water-sport": if (CAMPO.hidrochorro) return falla(); CAMPO.hidrochorro = 5; return decir("¡Se ha debilitado el poder de los ataques de tipo Fuego!", 950);
            case "ion-deluge": CAMPO.diluvio = true; return decir("¡Una lluvia de electrones cae sobre el terreno!", 950);
            case "fairy-lock": if (CAMPO.cerrojo) return falla(); CAMPO.cerrojo = 2; return decir("¡Nadie podrá huir durante el siguiente turno!", 950);
            case "lucky-chant": if (lado.conjuro) return falla(); lado.conjuro = 5; return decir(`¡Conjuro protege ${eA ? "a tu bando" : "al bando rival"} de los golpes críticos!`, 1000);
            case "court-change": {
                [CAMPO.lados.a, CAMPO.lados.r] = [CAMPO.lados.r, CAMPO.lados.a];
                pintarTrampas(); actualizarEstadoCaja(true); actualizarEstadoCaja(false);
                return decir(`¡${a.nombre} ha intercambiado los efectos de cada lado del terreno!`, 1000);
            }
            case "happy-hour": if (!opts.felicidad && opts.premio) { opts.felicidad = true; opts.premio *= 2; } return decir("¡Reina un ambiente de felicidad!", 900);
            case "splash": return decir("¡Pero no ha pasado nada!", 850);
            case "celebrate": return decir(`¡Felicidades, ${eA ? entrenador.nombre || "entrenador" : opts.titulo || "rival"}!`, 900);
            // — Relevos —
            case "baton-pass": {
                const datos = { etapas: Object.assign({}, a.etapas), sustituto: a.sustituto || 0, foco: a.foco, critEtapa: a.critEtapa, confuso: a.confuso };
                const ok = await relevar(eA, async (n) => {
                    Object.assign(n.etapas, datos.etapas); n.critEtapa = datos.critEtapa || 0; n.foco = datos.foco; n.confuso = datos.confuso || 0;
                    if (datos.sustituto > 0) { n.sustituto = datos.sustituto; ponerMuneco(eA, true); }
                    actualizarEstadoCaja(eA); await decir(`¡${n.nombre} ha recibido el relevo!`, 850);
                });
                return ok ? null : falla();
            }
            case "teleport": return (await relevar(eA)) ? null : falla();
            case "shed-tail": {
                const coste = Math.ceil(a.hpMax / 2), muneco = Math.floor(a.hpMax / 4);
                if (a.hp <= coste || !(eA ? aliados : enemigos).some((p, i) => i !== (eA ? iAliado : iEnemigo) && p.hp > 0)) return falla();
                a.hp -= coste; animarGolpe(eA); actualizarHP(eA);
                await decir(`¡${a.nombre} se ha desprendido de su cola para crear un sustituto!`, 1000);
                return relevar(eA, async (n) => { n.sustituto = muneco; ponerMuneco(eA, true); });
            }
            case "chilly-reception":
                await decir(`¡${a.nombre} se dispone a contar un chiste malísimo!`, 1000);
                await ponerClima("nieve", a, eA, false);
                return relevar(eA);
            // — Movimientos que usan otros —
            case "metronome": return usarOtro(alAzarC(METRONOMO), a, d, eA, primero);
            case "nature-power": return usarOtro({ electrico: "thunderbolt", hierba: "energy-ball", niebla: "moonblast", psiquico: "psychic" }[terrenoEnCampo()] || "tri-attack", a, d, eA, primero);
            case "copycat": return ultimoMovCampo && ultimoMovCampo !== "copycat" ? usarOtro(ultimoMovCampo, a, d, eA, primero) : falla();
            case "mirror-move": return d.ultimoMov && d.ultimoMov !== "mirror-move" ? usarOtro(d.ultimoMov, a, d, eA, primero) : falla();
            case "me-first":
                if (!primero || !d.movTurno || d.movTurno.cat === "est" || !d.movTurno.clave) return falla();
                return usarOtro(d.movTurno.clave, a, d, eA, primero, 1.5);
            case "assist": {
                const opciones = (eA ? aliados : enemigos).filter((p) => p !== a).flatMap((p) => p.movimientos).filter((x) => x.clave && x.cat !== "est" && !MOVS_CARGA[x.clave]);
                return opciones.length ? usarOtro(alAzarC(opciones).clave, a, d, eA, primero) : falla();
            }
            case "mimic": case "sketch": {
                const u = d.ultimoMov; if (!u || ["mimic", "sketch", "struggle", "transform", "metronome"].includes(u) || a.movimientos.some((x) => x.clave === u)) return falla();
                let mv; try { mv = movDeAPI(await conLimite(cargarMovimiento(u), 8000), 1); } catch (_) { return falla(); }
                if (!mv) return falla();
                const i = a.movimientos.findIndex((x) => x.clave === k); if (i < 0) return falla();
                if (k === "mimic" && !a.mimetismo) a.mimetismo = { i, mov: a.movimientos[i] };   // (Mimético solo dura el combate)
                mv.pp = k === "mimic" ? 5 : mv.pp || 10; mv.ppAct = mv.pp; delete mv.nivel;
                a.movimientos[i] = mv;
                return decir(`¡${a.nombre} ha ${k === "mimic" ? "copiado" : "esbozado"} ${mv.nombre}!`, 950);
            }
        }
        return falla();
    }
    function devolverObjetoSala(c) { if (c && c.objetoSala) { if (!c.objeto) c.objeto = c.objetoSala; c.objetoSala = null; } }
    // Al final del turno: maldición, pesadillas, Octopresa y los efectos con su cuenta atrás.
    async function finTurnoNuevos(orden) {
        for (const esAli of orden) {
            const c = activoDe(esAli); if (!activo || !c || c.hp <= 0) continue;
            if (c.maldito && c.habilidad !== "magic-guard" && await perderPS(c, esAli, c.hpMax / 4, `¡${c.nombre} es víctima de una maldición!`)) return true;
            if (c.hp > 0 && c.pesadilla) {
                if (!c.estado || c.estado.tipo !== "dor") c.pesadilla = false;
                else if (c.habilidad !== "magic-guard" && await perderPS(c, esAli, c.hpMax / 4, `¡${c.nombre} está atrapado en una pesadilla!`)) return true;
            }
            if (c.hp > 0 && c.octopresa) {
                if (c.octopresa !== activoDe(!esAli) || c.octopresa.hp <= 0) c.octopresa = null;
                else await aplicarCambios(c, { def: -1, spd: -1 }, esAli, c.octopresa);
            }
            for (const [k, fin] of [["embargo", "puede volver a usar objetos"], ["anticura", "ya puede curarse"], ["levitando", "ha dejado de levitar"], ["telequinesis", "ha dejado de flotar"]]) {
                if (c[k] > 0 && --c[k] <= 0) {
                    c[k] = 0;
                    if (k === "embargo" && c.objetoEmbargado && !c.objeto) { c.objeto = c.objetoEmbargado; c.objetoEmbargado = null; }
                    await decir(`¡${c.nombre} ${fin}!`, 850);
                }
            }
        }
        // Canto Mortal: la cuenta atrás de los que lo oyeron; a cero, se debilitan.
        const cuenta = orden.map((esAli) => ({ esAli, c: activoDe(esAli) })).filter((x) => activo && x.c && x.c.hp > 0 && x.c.perecer > 0);
        for (const x of cuenta) { x.c.perecer--; await decir(`¡El contador de Canto Mortal de ${x.c.nombre} ha bajado a ${x.c.perecer}!`, 900); }
        const caen = cuenta.filter((x) => x.c.perecer <= 0);
        if (caen.length && activo) {
            caen.forEach((x) => { x.c.perecer = 0; x.c.hp = 0; actualizarHP(x.esAli); });
            if (caen.length === 2) { causaKO = CAMPO.cantoMortalDe; await dobleKO({ fin: true }); return true; }
            await debilitar(caen[0].c, caen[0].esAli);
            if (caen[0].esAli) { aliadoDerrotado(); return true; }
            if (await rivalCaeFin()) return true;
        }
        const TXT = { gravedad: "¡La gravedad ha vuelto a la normalidad!", salaExtrana: "¡La Zona Extraña ha desaparecido!", chapoteo: "¡Los efectos de Chapoteo Lodo se han disipado!",
            hidrochorro: "¡Los efectos de Hidrochorro se han disipado!" };
        for (const k of Object.keys(TXT)) if (CAMPO[k] > 0 && --CAMPO[k] <= 0) { CAMPO[k] = 0; await decir(TXT[k], 900); }
        if (CAMPO.salaMagica > 0 && --CAMPO.salaMagica <= 0) { CAMPO.salaMagica = 0; aliados.concat(enemigos).forEach(devolverObjetoSala); await decir("¡La Zona Mágica ha desaparecido!", 900); }
        if (CAMPO.cerrojo > 0) CAMPO.cerrojo--;
        CAMPO.diluvio = false; aliados.concat(enemigos).forEach((c) => { c.electrificado = false; });
        for (const l of ["a", "r"]) { const L = CAMPO.lados[l]; if (L.conjuro > 0 && --L.conjuro <= 0) { L.conjuro = 0; await decir(`¡Conjuro ya no protege ${l === "a" ? "a tu bando" : "al bando rival"}!`, 900); } }
        return false;
    }
    async function efectoEspecial(mov, atacante, defensor, esAliado, primero, m) {
        const k = mov.especial, lado = CAMPO.lados[esAliado ? "a" : "r"], deBando = esAliado ? "de tu bando" : "del bando rival";
        if (MOVS_NUEVOS_ESTADO.has(k)) return efectoNuevo(k, mov, atacante, defensor, esAliado, primero, m);
        if (APOYO.has(k)) return decir("¡Pero falló! No hay ningún compañero al que ayudar.", 1000);   // (solo sirven en los dobles)
        if (k === "proteccion" && mov.clave === "mat-block" && atacante.accionesEnCampo > 1) return decir("¡Pero falló!", 800);   // (Escudo Tatami: solo nada más salir)
        if (k === "proteccion") {
            // Cada vez seguida es más difícil (1/3, 1/9…), y si ya ha actuado todo el mundo, falla.
            if (!primero || azarC() >= 1 / Math.pow(3, atacante.protecciones || 0)) { atacante.protecciones = 0; return decir("¡Pero falló!", 800); }
            atacante.protecciones = (atacante.protecciones || 0) + 1;
            atacante.protegido = mov.clave;
            return decir(`¡${atacante.nombre} se está protegiendo!`, 900);
        }
        if (k === "drenadoras" || k === "mofa") {
            let obj = defensor;
            if (habDef(defensor, atacante, m) === "magic-bounce") {   // Espejo Mágico se lo devuelve
                await cartelHabilidad(defensor, !esAliado, "magic-bounce");
                await decir(`¡${defensor.nombre} ha devuelto ${mov.nombre}!`, 1000);
                obj = atacante;
            }
            if (k === "drenadoras") {
                if (obj.tipos.includes("grass")) return decir(`No afecta a ${obj.nombre}…`, 850);
                if (obj.drenado) return decir("¡Pero falló!", 800);
                obj.drenado = true;
                return decir(`¡${obj.nombre} ha sido infectado!`, 900);
            }
            if (await veloAroma(obj, obj === defensor ? !esAliado : esAliado)) return null;
            if (obj.mofa > 0 || obj.habilidad === "oblivious") return decir("¡Pero falló!", 800);
            obj.mofa = primero ? 3 : 4;   // tres turnos (uno más si ya ha actuado este)
            await decir(`¡${obj.nombre} se ha dejado provocar por una mofa!`, 1000);
            return hierbaMental(obj, obj === defensor ? !esAliado : esAliado);
        }
        if (PELIGROS[k]) {
            // Trampas: al campo del rival (Espejo Mágico se las devuelve).
            let alMio = !esAliado;
            if (habDef(defensor, atacante, m) === "magic-bounce") {
                await cartelHabilidad(defensor, !esAliado, "magic-bounce");
                await decir(`¡${defensor.nombre} ha devuelto ${mov.nombre}!`, 1000);
                alMio = esAliado;
            }
            const l = CAMPO.lados[alMio ? "a" : "r"];
            if (l[k] >= PELIGROS[k].max) return decir("¡Pero falló!", 800);
            l[k]++;
            pintarTrampas();
            return decir(PELIGROS[k].pone(alMio), 1200);
        }
        if (k === "despejar" || k === "limpieza") {
            // Despejar: las trampas de los dos bandos y las barreras del rival. Limpieza: las trampas, y sube Ataque y Velocidad.
            let hecho = false;
            for (const yo of [esAliado, !esAliado]) hecho = (await quitarPeligros(yo)) || hecho;
            if (k === "limpieza") return aplicarCambios(atacante, { atk: 1, vel: 1 }, esAliado);
            const ld = CAMPO.lados[esAliado ? "r" : "a"];
            for (const [b, nombre] of [["reflejo", "Reflejo"], ["pantallaLuz", "Pantalla de Luz"], ["veloAurora", "Velo Aurora"]]) {
                if (ld[b] > 0) { ld[b] = 0; hecho = true; await decir(`El efecto de ${nombre} en ${esAliado ? "el bando rival" : "tu bando"} se ha disipado.`, 1000); }
            }
            return hecho ? null : decir("¡Pero falló!", 800);
        }
        if (k === "descanso") {   // duerme dos turnos y se cura del todo (y de su problema de estado)
            if (atacante.hp >= atacante.hpMax || (atacante.estado && atacante.estado.tipo === "dor") || inmuneEstadoHab(atacante, "dor", null)) return decir("¡Pero falló!", 800);
            atacante.estado = { tipo: "dor", turnos: 2, grave: false, n: 0 };
            actualizarEstadoCaja(esAliado);
            await animComun(ESTADOS.dor.anim, esAliado);
            await decir(`¡${atacante.nombre} se ha dormido!`, 900);
            atacante.hp = atacante.hpMax; AudioFX.efecto("restore"); actualizarHP(esAliado);
            return decir(`¡${atacante.nombre} se ha recuperado tras dormir un poco!`, 1100);
        }
        if (k === "sonambulo") return decir("¡Pero falló!", 800);
        if (k === "terreno") return ponerTerreno(TERRENO_MOV[mov.clave], atacante, esAliado, false);
        if (k === "sustituto") {   // un cuarto de sus PS hace de muñeco
            if (atacante.sustituto > 0) return decir(`¡${atacante.nombre} ya tiene un sustituto!`, 900);
            const coste = Math.floor(atacante.hpMax / 4);
            if (atacante.hp <= coste) return decir("¡Está demasiado débil para crear un sustituto!", 1000);
            atacante.hp -= coste; atacante.sustituto = coste; actualizarHP(esAliado);
            ponerMuneco(esAliado, true);
            return decir(`¡${atacante.nombre} ha creado un sustituto!`, 1000);
        }
        if (k === "bostezo") {   // se dormirá al final del turno siguiente
            if (defensor.estado || defensor.bostezo || inmuneEstadoHab(defensor, "dor", atacante) || protegidoPorVelo(defensor, atacante)) return decir("¡Pero falló!", 800);
            defensor.bostezo = 2;
            return decir(`¡${defensor.nombre} está somnoliento!`, 1000);
        }
        if (k === "otraVez") {
            if (await veloAroma(defensor, !esAliado)) return null;
            const u = defensor.ultimoMov, mv = u && defensor.movimientos.find((x) => x.clave === u);
            if (!mv || defensor.otraVez || mv.ppAct <= 0 || NO_OTRA_VEZ.has(u) || defensor.dinamax) return decir("¡Pero falló!", 800);
            defensor.otraVez = { clave: u, turnos: 3 };
            await decir(`¡${defensor.nombre} sufre los efectos de Otra Vez!`, 1000);
            return hierbaMental(defensor, !esAliado);
        }
        if (k === "dividir") {   // Divide Dolor: los dos se quedan con la media de sus PS
            const media = Math.floor((atacante.hp + defensor.hp) / 2);
            atacante.hp = Math.min(atacante.hpMax, media); defensor.hp = Math.min(defensor.hpMax, media);
            actualizarHP(esAliado); actualizarHP(!esAliado);
            return decir("¡Los dos Pokémon se han repartido sus PS!", 1100);
        }
        if (k === "tambor") {   // Tambor: la mitad de sus PS a cambio del Ataque al máximo
            if (atacante.hp <= Math.floor(atacante.hpMax / 2) || atacante.etapas.atk >= 6) return decir("¡Pero falló!", 800);
            atacante.hp -= Math.floor(atacante.hpMax / 2); actualizarHP(esAliado);
            atacante.etapas.atk = 6; actualizarEstadoCaja(esAliado);
            return decir(`¡${atacante.nombre} ha sacrificado algunos PS y ha aumentado al máximo su Ataque!`, 1300);
        }
        if (k === "deseo") {   // al final del turno siguiente, el de su bando recupera la mitad de los PS del que lo pidió
            if (lado.deseo) return decir("¡Pero falló!", 800);
            lado.deseo = { turnos: 2, cura: Math.floor(atacante.hpMax / 2), de: atacante.nombre };
            return decir(`¡${atacante.nombre} ha pedido un deseo!`, 1000);
        }
        if (k === "arrastrar") return (await arrastrar(defensor, !esAliado, atacante)) ? null : decir("¡Pero falló!", 800);
        if (k === "anular" || k === "atraccion" || k === "bloqueo") {
            let obj = defensor, ea = !esAliado, src = atacante;
            if (habDef(defensor, atacante, m) === "magic-bounce") {   // Espejo Mágico se lo devuelve
                await cartelHabilidad(defensor, !esAliado, "magic-bounce");
                await decir(`¡${defensor.nombre} ha devuelto ${mov.nombre}!`, 1000);
                obj = atacante; ea = esAliado; src = defensor;
            }
            if (k !== "bloqueo" && await veloAroma(obj, ea)) return null;   // (Velo Aroma no para Mal de Ojo)
            if (k === "anular") {   // su último movimiento, 4 turnos
                const u = obj.ultimoMov, mv = u && obj.movimientos.find((x) => x.clave === u);
                if (!mv || obj.anulado || mv.ppAct <= 0 || obj.dinamax) return decir("¡Pero falló!", 800);
                return anular(obj, ea, mv);
            }
            if (k === "atraccion") return (await enamorar(obj, ea, src, true)) === false ? decir("¡Pero falló!", 800) : null;
            // Mal de Ojo, Bloqueo y Telaraña: no puede huir ni cambiarse mientras siga el que lo ha usado.
            if (obj.atrapado || obj.tipos.includes("ghost")) return decir("¡Pero falló!", 800);
            obj.atrapado = { mov: mov.nombre, turnos: 99, por: src, sinDanio: true };
            return decir(`¡${obj.nombre} no puede escapar!`, 1000);
        }
        if (k === "arraigo" || k === "acuaAro") {
            if (atacante[k]) return decir("¡Pero falló!", 800);
            atacante[k] = true;
            return decir(k === "arraigo" ? `¡${atacante.nombre} ha echado raíces!` : `¡${atacante.nombre} se ha rodeado de un manto de agua!`, 1000);
        }
        if (k === "veloSagrado" || k === "neblina") {   // 5 turnos para todo su bando
            if (lado[k] > 0) return decir("¡Pero falló!", 800);
            lado[k] = 5;
            return decir(k === "veloSagrado" ? (esAliado ? "¡Tu equipo se ha protegido con Velo Sagrado!" : "¡El bando rival se ha protegido con Velo Sagrado!")
                : esAliado ? "¡Una neblina ha cubierto a tu bando!" : "¡Una neblina ha cubierto al bando rival!", 1100);
        }
        if (k === "foco") {   // Foco Energía: críticos mucho más probables
            if (atacante.foco) return decir("¡Pero falló!", 800);
            atacante.foco = true; atacante.critEtapa = Math.min(3, (atacante.critEtapa || 0) + 2);
            return decir(`¡${atacante.nombre} se está preparando para luchar!`, 1000);
        }
        if (k === "fijar") {
            atacante.fijado = { obj: defensor, turno };
            return decir(`¡${atacante.nombre} tiene en su punto de mira a ${defensor.nombre}!`, 1000);
        }
        if (k === "campana") {   // Campana Cura y Aromaterapia: todo su equipo se cura de sus problemas de estado
            await decir(mov.clave === "heal-bell" ? "Ha repicado una campana." : "Un aroma balsámico flota en el aire.", 1000);
            const equipo = (esAliado ? aliados : enemigos).filter((p) => p.hp > 0 && p.estado);
            if (!equipo.length) return decir("¡Pero falló!", 800);
            equipo.forEach((p) => { p.estado = null; });
            actualizarEstadoCaja(esAliado); renderBolas();
            return decir(`¡Se han curado los problemas de estado ${deBando}!`, 1100);
        }
        if (k === "masPsique") {   // Más Psique: copia los cambios en las características del rival
            atacante.etapas = Object.assign({}, defensor.etapas); atacante.critEtapa = defensor.critEtapa || 0;
            actualizarEstadoCaja(esAliado);
            return decir(`¡${atacante.nombre} ha copiado los cambios de características de ${defensor.nombre}!`, 1100);
        }
        if (k === "legado") {   // Legado: baja mucho el Ataque y el Ataque Especial del rival y se debilita
            await aplicarCambios(defensor, { atk: -2, spa: -2 }, !esAliado, atacante);
            atacante.hp = 0; actualizarHP(esAliado);
            return null;
        }
        if (k === "deseoCura") {   // Deseo Cura y Danza Lunar: se debilita y el que salga en su lugar vuelve como nuevo
            const equipo = esAliado ? aliados : enemigos, actual = esAliado ? iAliado : iEnemigo;
            if (!equipo.some((p, i) => i !== actual && p.hp > 0)) return decir("¡Pero falló!", 800);
            lado.deseoCura = { lunar: mov.clave === "lunar-dance" };
            atacante.hp = 0; actualizarHP(esAliado);
            return null;
        }
        if (k === "transformar") return transformar(atacante, esAliado, defensor);
        if (k === "espacioRaro") {   // otra vez, y se deshace
            if (CAMPO.espacioRaro > 0) { CAMPO.espacioRaro = 0; return decir("Se han restaurado las dimensiones alteradas.", 1100); }
            CAMPO.espacioRaro = 5;
            await decir(`¡${atacante.nombre} ha alterado las dimensiones!`, 1100);
            for (const ea of ordenFijo()) await servicioRaro(activoDe(ea), ea);
            return null;
        }
        if (k === "niebla") {
            [atacante, defensor].forEach((p) => { if (p.hp > 0) p.etapas = etapasCero(); });
            return decir("¡Se han anulado todos los cambios en las características!", 1100);
        }
        if (k === "vientoAfin") {
            if (lado.vientoAfin > 0) return decir("¡Pero falló!", 800);
            lado.vientoAfin = 4;
            return decir(`¡El viento sopla a favor ${deBando}!`, 1100);
        }
        // Pantallas: 5 turnos (8 con la Arcilla Ligera); el Velo Aurora, solo con nieve.
        if (lado[k] > 0 || (k === "veloAurora" && climaEnCampo() !== "nieve")) return decir("¡Pero falló!", 800);
        lado[k] = atacante.objeto === "light-clay" ? 8 : 5;
        const [nombre, que] = { reflejo: ["Reflejo", "los ataques físicos"], pantallaLuz: ["Pantalla de Luz", "los ataques especiales"],
            veloAurora: ["Velo Aurora", "los ataques físicos y especiales"] }[k];
        return decir(`¡${nombre} ha aumentado la resistencia ${deBando} ante ${que}!`, 1300);
    }
    // Quien toca a un Pokémon protegido con Barrera Espinosa, Escudo Real, Búnker, Telatrampa o Llama Protectora lo paga.
    async function castigoProteccion(d, a, esAliA) {
        const k = d.protegido;
        if (k === "spiky-shield" && a.habilidad !== "magic-guard") {
            a.hp = Math.max(0, a.hp - Math.max(1, Math.floor(a.hpMax / 8))); animarGolpe(esAliA); actualizarHP(esAliA);
            await decir(`¡${a.nombre} se ha herido con la Barrera Espinosa!`, 1000);
        } else if (k === "kings-shield") await aplicarCambios(a, { atk: -1 }, esAliA, d);
        else if (k === "silk-trap") await aplicarCambios(a, { vel: -1 }, esAliA, d);
        else if (k === "obstruct") await aplicarCambios(a, { def: -2 }, esAliA, d);
        else if (k === "baneful-bunker") await aplicarEstado(a, { tipo: "env" }, esAliA, d);
        else if (k === "burning-bulwark") await aplicarEstado(a, { tipo: "que" }, esAliA, d);
    }
    // llamado: lo usa otro movimiento (Metrónomo, Manto Espejo…): ya ha pasado las comprobaciones de si puede moverse.
    async function ejecutarMovimiento(atacante, defensor, mov, esAliado, primero = false, llamado = false) {
        if (!llamado) { atacante._movPrevio = atacante.ultimoMov; atacante.mismoDestino = false; }   // (Mismo Destino dura hasta su siguiente acción)
        atacante._autoKO = false;
        await ejecutarMovimientoBase(atacante, defensor, mov, esAliado, primero, llamado);
        if (!activo || terminado) return;
        // Explosión, Autodestrucción, Explosión Bruma y Sacrificio: el usuario se debilita tras su movimiento.
        if (atacante._autoKO) { atacante._autoKO = false; if (atacante.hp > 0) { atacante.hp = 0; actualizarHP(esAliado); } }
        // Mismo Destino: el que debilita al que lo usó cae con él (no si está dinamaxizado).
        if (defensor && defensor !== atacante && defensor.hp <= 0 && defensor.mismoDestino && atacante.hp > 0 && !atacante.dinamax && activoDe(esAliado) === atacante) {
            defensor.mismoDestino = false;
            await decir(`¡${defensor.nombre} se ha llevado consigo a ${atacante.nombre}!`, 1200);
            atacante.hp = 0; actualizarHP(esAliado); causaKO = !esAliado;
        }
    }
    async function ejecutarMovimientoBase(atacante, defensor, mov, esAliado, primero = false, llamado = false) {
        const primeraAccion = !atacante.accionesEnCampo;   // (Sorpresa y Escaramuza solo valen en la primera)
        if (!llamado) atacante.accionesEnCampo = (atacante.accionesEnCampo || 0) + 1;
        if (!llamado) {
        // Otra Vez: tiene que repetir su último movimiento (aunque hubiera elegido otro).
        if (atacante.otraVez && mov.clave !== atacante.otraVez.clave && mov !== RECARGA && !atacante.forzado) {
            const enc = atacante.movimientos.find((x) => x.clave === atacante.otraVez.clave);
            if (enc && enc.ppAct > 0) mov = enc;
        }
        // Hiperrayo, Gigaimpacto…: el turno siguiente lo pasa recuperándose.
        if (atacante.forzado && atacante.forzado.tipo === "recarga") {
            atacante.forzado = null; atacante.retrocede = false;
            await decir(`¡${atacante.nombre} necesita recuperarse de su ataque!`, 1000);
            return;
        }
        if (atacante.retrocede) {
            cortarForzado(atacante, esAliado);
            atacante.retrocede = false; await decir(`¡${atacante.nombre} retrocedió!`, 900);
            if (atacante.habilidad === "steadfast") { await cartelHabilidad(atacante, esAliado); await aplicarCambios(atacante, { vel: 1 }, esAliado); }   // Impasible
            return;
        }
        // Ausente: holgazanea un turno de cada dos.
        if (atacante.habilidad === "truant") {
            if (atacante.holgazan) { atacante.holgazan = false; await cartelHabilidad(atacante, esAliado); await decir(`¡${atacante.nombre} está holgazaneando!`, 950); return; }
            atacante.holgazan = true;
        }
        if (!(await puedeMoverse(atacante, esAliado, mov))) { cortarForzado(atacante, esAliado); return; }
        // Confuso: un tercio de las veces se hiere a sí mismo (golpe físico sin tipo de potencia 40).
        if (atacante.confuso) {
            if (--atacante.confuso <= 0) { atacante.confuso = 0; await decir(`¡${atacante.nombre} ya no está confuso!`, 900); }
            else {
                await animComun("common-confusion", esAliado);
                await decir(`¡${atacante.nombre} está confuso!`, 850);
                if (azarC() < 1 / 3) {
                    cortarForzado(atacante, esAliado);
                    const a = atacante.stats.atk * multEtapa(atacante.etapas.atk), d = atacante.stats.def * multEtapa(atacante.etapas.def);
                    const dmg = Math.max(1, Math.floor((((2 * atacante.nivel / 5 + 2) * 40 * (a / d)) / 50 + 2) * (0.85 + azarC() * 0.15)));
                    atacante.hp = Math.max(0, atacante.hp - dmg);
                    AudioFX.golpe(1, false); animarGolpe(esAliado); actualizarHP(esAliado);
                    await decir("¡Está tan confuso que se ha herido a sí mismo!", 1100);
                    return;
                }
            }
        }
        // Enamorado: la mitad de las veces el amor le impide atacar (se le pasa si cualquiera de los dos se retira).
        if (atacante.enamorado) {
            const f = atacante.enamorado;
            if (f.hp <= 0 || f !== activoDe(!esAliado)) atacante.enamorado = null;
            else {
                await animComun("common-attract", esAliado);
                await decir(`¡${atacante.nombre} está enamorado de ${f.nombre}!`, 950);
                if (azarC() < 0.5) { cortarForzado(atacante, esAliado); await decir(`¡El enamoramiento impide que ${atacante.nombre} reaccione!`, 1100); return; }
            }
        }
        if (atacante.anulado && mov.clave === atacante.anulado.clave) {
            await decir(`¡${atacante.nombre} no puede usar ${mov.nombre} porque ha sido anulado!`, 1100);
            return;
        }
        if (atacante.mofa > 0 && mov.cat === "est" && mov !== RECARGA) {
            await decir(`¡Se han mofado de ${atacante.nombre}, por lo que no puede usar ${mov.nombre}!`, 1200);
            return;
        }
        if (mov.esZ) {   // el Poder Z envuelve al Pokémon antes de su movimiento Z (con cinemática, primero en primer plano)
            const cine = conCinematicas(), s = spriteEl(esAliado);
            if (cine) { await decir(`¡${atacante.nombre} se ha rodeado del Poder Z!`, 900); await cinematicaPoder(esAliado, "z", atacante); }
            if (s) s.classList.add("z-aura");
            const aura = auraZ(esAliado);
            if (!cine) await decir(`¡${atacante.nombre} se ha rodeado del Poder Z!`, 1000);
            await aura;
            AudioFX.efecto("shine", { vol: 0.5 });
            await decir(`¡${atacante.nombre} desata todo su poder!`, 900);
            if (s) s.classList.remove("z-aura");
        }
        // Puño Certero: si le han golpeado antes de atacar, pierde la concentración.
        if (mov.clave === "focus-punch" && !mov.esZ && !mov.esMax && atacante.golpeadoEn === turno) {
            await decir(`¡${atacante.nombre} ha perdido la concentración y no puede atacar!`, 1100); return;
        }
        }
        // Tormento (no puede repetir) y Sellar (no puede usar los que conoce el rival).
        if (!llamado && atacante.tormento && mov.clave === atacante.ultimoMov && mov !== FORCEJEO && mov !== RECARGA && !atacante.forzado) {
            await decir(`¡${atacante.nombre} no puede usar el mismo movimiento dos veces seguidas por el tormento!`, 1100); return;
        }
        const selladoPor = activoDe(!esAliado);
        if (!llamado && selladoPor && selladoPor.sellado && selladoPor.movimientos.some((x) => x.clave === mov.clave)) {
            await decir(`¡${atacante.nombre} no puede usar ${mov.nombre} porque está sellado!`, 1100); return;
        }
        const cargado = atacante.forzado && atacante.forzado.tipo === "carga";
        if (cargado) { atacante.forzado = null; mostrarSprite(esAliado); }
        await decir(`¡${atacante.nombre} usó ${mov.nombre}!`, 650);
        atacante.ultimoMov = mov.clave;   // (para Otra Vez)
        ultimoMovCampo = mov.clave;   // (para Copión)
        // Polvo Explosivo: si ataca con Fuego, estalla.
        if (atacante.polvo === turno && mov.cat !== "est" && tipoDeMovimiento(atacante, mov) === "fire") {
            atacante.polvo = 0; atacante.hp = Math.max(0, atacante.hp - Math.floor(atacante.hpMax / 4)); animarGolpe(esAliado); actualizarHP(esAliado);
            await decir("¡El polvo explosivo ha estallado al entrar en contacto con el fuego!", 1100); return;
        }
        // Golpe Bajo: solo si el rival va a atacar y aún no lo ha hecho.
        if (SOLO_SI_ATACA.has(mov.clave) && (!primero || !defensor.movTurno || defensor.movTurno.cat === "est")) { await decir("¡Pero falló!", 800); return; }
        // Sorpresa y Escaramuza, solo nada más entrar; Sonámbulo y Ronquido, solo dormido.
        const dormido = !!atacante.estado && atacante.estado.tipo === "dor";
        if (mov.clave === "sleep-talk" && dormido) {   // Sonámbulo: otro de sus movimientos, al azar
            const otros = atacante.movimientos.filter((x) => !SOLO_DORMIDO.has(x.clave) && !MOVS_CARGA[x.clave] && !MOVS_FURIA.has(x.clave) && x.especial !== "descanso");
            if (!otros.length) { await decir("¡Pero falló!", 800); return; }
            mov = alAzarC(otros);
            await decir(`¡${atacante.nombre} usó ${mov.nombre}!`, 650);
        }
        if ((PRIMER_TURNO.has(mov.clave) && !primeraAccion) || (SOLO_DORMIDO.has(mov.clave) && !dormido)) { await decir("¡Pero falló!", 800); return; }
        // Última Baza (si aún no ha usado los demás), Eructo (sin haberse comido una baya) y Sincrorruido (sin un tipo en común).
        if (mov.clave === "last-resort" && !ultimaBazaLista(atacante)) { await decir("¡Pero falló!", 800); return; }
        (atacante.usados || (atacante.usados = new Set())).add(mov.clave);
        if (atacante.objeto === "metronome") atacante.metronomo = atacante.metronomo && atacante.metronomo.clave === mov.clave ? { clave: mov.clave, n: atacante.metronomo.n + 1 } : { clave: mov.clave, n: 0 };
        if (mov.clave === "belch" && !atacante.ultimaBaya) { await decir(`¡${atacante.nombre} debe comerse una baya equipada para poder eructar!`, 1100); return; }
        if (mov.clave === "synchronoise" && !compartenTipo(atacante, defensor)) { await decir(`No afecta a ${defensor.nombre}…`, 850); return; }
        const humedo = (mov.clave === "mind-blown" || AUTO_KO.has(mov.clave)) && hayHumedad();   // Humedad: no deja que nadie estalle
        if (humedo) { await cartelHabilidad(humedo, humedo === atacante ? esAliado : !esAliado); await decir(`¡${humedo.nombre} impide que ${atacante.nombre} use ${mov.nombre}!`, 1100); return; }
        if (AUTO_KO.has(mov.clave)) { atacante._autoKO = true; causaKO = esAliado; }   // (cae aunque falle o el rival se proteja)
        if (mov.especial !== "proteccion") atacante.protecciones = 0;
        // Primer turno de Rayo Solar, Vuelo, Excavar…: carga (o se esconde) y ataca en el siguiente. Con sol, Rayo Solar no espera.
        const carga = MOVS_CARGA[mov.clave];
        if (carga && !cargado) {
            const ya = cargaSinEspera(mov, atacante), hierba = !ya && atacante.objeto === "power-herb";   // Hierba Única: carga al instante (una vez)
            if (!ya) {
                AudioFX.efecto("charge", { vol: 0.4 });
                if (carga.oculto && !hierba) ocultarSprite(esAliado, carga.oculto);
                await decir(carga.txt.replace("{n}", atacante.nombre), 1000);
                if (hierba) { consumirObjeto(atacante); await decir(`¡${atacante.nombre} ha completado la carga gracias a su Hierba Única!`, 1100); }
                else atacante.forzado = { tipo: "carga", mov, oculto: carga.oculto || null };
            }
            if (carga.sube) await aplicarCambios(atacante, carga.sube, esAliado);   // Cabezazo, Rayo Meteórico, Electrorrayo
            if (!ya && !hierba) return;
        }
        // Llama Final y Doble Rayo: solo si es de ese tipo.
        if ((mov.clave === "burn-up" && !atacante.tipos.includes("fire")) || (mov.clave === "double-shock" && !atacante.tipos.includes("electric"))) {
            await decir("¡Pero falló!", 800); return;
        }
        // Tipo con el que sale (Piel Feérica, Meteorobola…); Mutatipo y Líbero cambian el del Pokémon al del movimiento.
        const tipo = tipoDeMovimiento(atacante, mov);
        if ((atacante.habilidad === "protean" || atacante.habilidad === "libero") && !atacante.protean && !(atacante.tipos.length === 1 && atacante.tipos[0] === tipo)) {
            atacante.protean = true; atacante.tipos = [tipo];
            await cartelHabilidad(atacante, esAliado);
            await decir(`¡${atacante.nombre} ha cambiado a tipo ${TIPOS_ES[tipo]}!`, 1000);
        }
        const m = Object.assign({}, mov, { _tipo: tipo, _ultimo: !primero, _primero: primero, _golpeado: atacante.golpeadoEn === turno,
            _danado: defensor.golpeadoEn === turno, _caidos: (esAliado ? aliados : enemigos).filter((p) => p.hp <= 0).length });
        if (mov.clave === "magnitude") {   // Magnitud: de 4 a 10, al azar
            const r = azarC(), n = r < 0.05 ? 4 : r < 0.15 ? 5 : r < 0.35 ? 6 : r < 0.65 ? 7 : r < 0.85 ? 8 : r < 0.95 ? 9 : 10;
            m._magnitud = { 4: 10, 5: 30, 6: 50, 7: 70, 8: 90, 9: 110, 10: 150 }[n];
            await decir(`¡Magnitud ${n}!`, 800);
        }
        // Presente: 40, 80 o 120 de potencia... o, a veces, cura al rival.
        if (mov.clave === "present") {
            if (azarC() < 0.2) {
                if (defensor.hp >= defensor.hpMax) { await decir(`¡Pero ${defensor.nombre} no necesita curarse!`, 900); return; }
                defensor.hp = Math.min(defensor.hpMax, defensor.hp + Math.floor(defensor.hpMax / 4)); AudioFX.efecto("restore"); actualizarHP(!esAliado);
                await decir(`¡${defensor.nombre} ha recuperado PS!`, 900); return;
            }
            const r = azarC(); m._presente = r < 0.5 ? 40 : r < 0.85 ? 80 : 120;
        }
        // Golpes fulminantes: no afectan a los de más nivel (ni Frío Polar a los de tipo Hielo, ni nada a Robustez).
        if (OHKO.has(mov.clave)) {
            if (defensor.nivel > atacante.nivel || (mov.clave === "sheer-cold" && defensor.tipos.includes("ice")) || habDef(defensor, atacante, m) === "sturdy") {
                await decir(`No afecta a ${defensor.nombre}…`, 850); return;
            }
            const prob = (mov.clave === "sheer-cold" && !atacante.tipos.includes("ice") ? 0.2 : 0.3) + (atacante.nivel - defensor.nivel) / 100;
            if (azarC() >= prob) { await Promise.all([esquivar(!esAliado), decir(`¡${defensor.nombre} ha evitado el ataque!`, 900)]); return; }
            m.prec = 1; m._fulminante = true;
        }
        if (mov.clave === "spit-up" && !(atacante.reservas > 0)) { await decir("¡Pero no ha conseguido escupir nada!", 900); return; }
        if ((mov.clave === "fling" && (!atacante.objeto || !puedePerderObjeto(atacante))) || (mov.clave === "natural-gift" && !(atacante.objeto && obj(atacante.objeto).bolsillo === "bayas"))) {
            await decir("¡Pero falló!", 800); return;
        }
        if (mov.clave === "fling") await decir(`¡${atacante.nombre} ha lanzado ${obj(atacante.objeto).nombre}!`, 850);
        if (mov.clave === "beat-up") { const n = (esAliado ? aliados : enemigos).filter((p) => p.hp > 0 && !p.estado).length || 1; mov = Object.assign({}, mov, { golpes: [n, n] }); }
        // Premonición y Deseo Oculto: el golpe llegará dos turnos después (ni la protección lo para).
        if (FUTURO.has(mov.clave) && !mov.esZ && !mov.esMax) {
            const l = CAMPO.lados[esAliado ? "r" : "a"];
            if (l.futuro) { await decir("¡Pero falló!", 800); return; }
            await animarMovimiento(mov, esAliado, true);
            l.futuro = { turnos: 3, de: atacante, mov, tipo };
            await decir(mov.clave === "doom-desire" ? `¡${atacante.nombre} ha elegido Deseo Oculto para el futuro!` : `¡${atacante.nombre} ha previsto el ataque!`, 1100);
            return;
        }
        // Se protege (Protección, Detección…): no le llega; Barrera Espinosa, Escudo Real… castigan a quien le toca.
        const maxiBarrera = defensor.protegido === "max-guard";   // (Maxibarrera lo para todo)
        if (defensor.protegido && defensor.hp > 0 && defensor !== atacante && (mov.cat !== "est" || apuntaAlRival(mov))
            && !(mov.cat === "est" && PROTEGE_SOLO_ATAQUES.has(defensor.protegido)) && !(mov.efectoMax && mov.efectoMax.gmax === "atraviesa")
            && !(defensor.protegido === "crafty-shield" && mov.cat !== "est") && !(defensor.protegido === "quick-guard" && !(prioridadHab(atacante, mov) > 0))
            && !(defensor.protegido === "wide-guard" && !MOVS_AREA.has(mov.clave))) {
            if (maxiBarrera) {
                cortarForzado(atacante, esAliado);
                await animComun("common-protect", !esAliado);
                await decir(`¡${defensor.nombre} se ha protegido!`, 900);
                return;
            }
            if (ROMPE_PROTECCION.has(mov.clave)) {
                defensor.protegido = false;
                await decir(mov.clave === "feint" ? `¡${defensor.nombre} ha caído en la finta!` : `¡${atacante.nombre} ha roto la protección de ${defensor.nombre}!`, 1000);
            } else if (mov.esZ || mov.esMax || (atacante.habilidad === "piercing-drill" && esContacto(mov, atacante))) {   // un movimiento Z, un Maximovimiento o Turbotaladro la atraviesan a medias
                m._cuarto = true;
                await decir(`¡${defensor.nombre} no ha podido protegerse del todo!`, 1000);
            } else if (!ATRAVIESA_PROTECCION.has(mov.clave) && !(atacante.habilidad === "unseen-fist" && esContacto(mov, atacante))) {
                cortarForzado(atacante, esAliado);
                await animComun("common-protect", !esAliado);
                await decir(`¡${defensor.nombre} se ha protegido!`, 900);
                if (esContacto(mov, atacante) && atacante.hp > 0 && atacante.objeto !== "protective-pads") await castigoProteccion(defensor, atacante, esAliado);
                return;
            }
        }
        // Campo Psíquico: quien toca el suelo no recibe movimientos con prioridad.
        if (terrenoEnCampo() === "psiquico" && defensor !== atacante && defensor.hp > 0 && enSuelo(defensor) && (mov.prioEf != null ? mov.prioEf : mov.prio || 0) > 0
            && (mov.cat !== "est" || apuntaAlRival(mov))) {
            cortarForzado(atacante, esAliado);
            await decir(`¡El Campo Psíquico ha protegido a ${defensor.nombre}!`, 1100); return;
        }
        // Rodillo de Púas falla sin campo.
        if (mov.clave === "steel-roller" && !terrenoEnCampo()) { await decir("¡Pero falló!", 800); return; }
        // Contra un rival escondido solo aciertan algunos movimientos (Terremoto contra Excavar, Surf contra Buceo…), y con el doble de fuerza.
        // Fijar Blanco y Telépata: su siguiente movimiento contra ese rival no falla (ni aunque esté escondido).
        const fijado = !!(atacante.fijado && atacante.fijado.obj === defensor && turno - atacante.fijado.turno <= 1);
        if (fijado) atacante.fijado = null;
        const escondido = !fijado && defensor.forzado && defensor.forzado.oculto;
        if (escondido && defensor.hp > 0 && (mov.cat !== "est" || apuntaAlRival(mov)) && atacante.habilidad !== "no-guard" && defensor.habilidad !== "no-guard") {
            const x = ALCANZA[escondido][mov.clave];
            if (!x) { cortarForzado(atacante, esAliado); await decir(`¡${defensor.nombre} ha evitado el ataque!`, 900); return; }
            m.poder *= x;
        }
        if ((mov.clave === "solar-beam" || mov.clave === "solar-blade") && ["lluvia", "arena", "nieve"].includes(climaEnCampo())) m.poder = Math.floor(m.poder / 2);
        if (!fijado && azarC() > precisionFinal(atacante, defensor, m) * (atacante.objeto === "wide-lens" ? 1.1 : atacante.objeto === "zoom-lens" && m._ultimo ? 1.2 : 1)) {
            cortarForzado(atacante, esAliado);
            await Promise.all([esquivar(!esAliado), decir(`¡${defensor.nombre} ha evitado el ataque!`, 900)]);   // (ha fallado por precisión)
            if (atacante.objeto === "blunder-policy" && atacante.hp > 0 && atacante.etapas.vel < 6) {   // Seguro Fallo
                consumirObjeto(atacante); await decir(`¡El Seguro Fallo de ${atacante.nombre} se ha activado!`, 1000);
                await aplicarCambios(atacante, { vel: 2 }, esAliado);
            }
            if (MEDIO_PS.has(mov.clave)) await sacrificioMedio(atacante, esAliado, defensor);   // (aunque falle)
            return;
        }
        const alUsuario = mov.cambios && mov.cambios.objetivo === "yo";
        const alRival = mov.cat !== "est" || apuntaAlRival(mov);
        // La habilidad del objetivo lo anula (Levitación, Absorbe Agua, Pararrayos, Insonorizar…) y otras reglas: polvos contra Planta,
        // Bromista contra Siniestro. Sin animación, como en los juegos.
        if (alRival) {
            const inm = inmunidadHab(defensor, atacante, m, tipo);
            if (inm) { cortarForzado(atacante, esAliado); await efectoInmunidad(defensor, !esAliado, inm); return; }
            if ((MOVS_POLVO.has(mov.clave) && (defensor.tipos.includes("grass") || defensor.objeto === "safety-goggles")) || (atacante.habilidad === "prankster" && apuntaAlRival(mov) && defensor.tipos.includes("dark"))) {
                await decir(`No afecta a ${defensor.nombre}…`, 850); return;
            }
        }
        // Animación real del movimiento (Showdown, con los sonidos de PokéRogue).
        const propio = mov.cat === "est" && (alUsuario || mov.clima || mov.curacion || ESPECIAL_PROPIO.has(mov.especial)) && !mov.estado;
        await animarMovimiento(mov, esAliado, propio);
        if (!activo) return;
        // Movimientos de estado: tiempo atmosférico, curación, estados alterados y cambios de características.
        if (mov.cat === "est") {
            // Robo: el que espera se queda con el movimiento que el otro usa sobre sí mismo.
            if (defensor !== atacante && defensor.robo === turno && defensor.hp > 0 && propio && mov.especial !== "proteccion") {
                defensor.robo = 0;
                await decir(`¡${defensor.nombre} ha robado el movimiento de ${atacante.nombre}!`, 1000);
                [atacante, defensor] = [defensor, atacante]; esAliado = !esAliado;
            }
            if (defensor.sustituto > 0 && defensor !== atacante && apuntaAlRival(mov) && !atraviesaSub(mov, atacante)) { await decir("¡Pero falló!", 800); return; }
            if (mov.especial) { await efectoEspecial(mov, atacante, defensor, esAliado, primero, m); return; }
            if (mov.clima) { await ponerClima(mov.clima, atacante, esAliado, false); return; }
            if (mov.curacion) {
                if (atacante.anticura > 0) { await decir(`¡${atacante.nombre} no puede curarse!`, 900); return; }
                if (atacante.hp >= atacante.hpMax) { await decir(`¡Los PS de ${atacante.nombre} están al máximo!`, 900); return; }
                // Luz Lunar, Síntesis y Sol Matinal curan más con sol y menos con otro tiempo; Recogearena, más con arena.
                const cl = atacante.habilidad === "mega-sol" ? "sol" : climaPara(atacante); let f = mov.curacion;
                if (["moonlight", "synthesis", "morning-sun"].includes(mov.clave) && cl) f = cl === "sol" ? 2 / 3 : 1 / 4;
                if (mov.clave === "shore-up" && cl === "arena") f = 2 / 3;
                atacante.hp = Math.min(atacante.hpMax, atacante.hp + Math.floor(atacante.hpMax * f));
                AudioFX.efecto("restore"); actualizarHP(esAliado);
                await decir(`¡${atacante.nombre} ha recuperado PS!`, 950);
                if (!mov.estado && !mov.cambios) return;
            }
            if (mov.estado && efectividad(tipo, defensor.tipos) === 0) { await decir(`No afecta a ${defensor.nombre}…`, 850); return; }
            // Espejo Mágico: devuelve los movimientos de estado.
            const capaMagica = defensor !== atacante && defensor.capaMagica === turno;   // (Capa Mágica: como Espejo Mágico, este turno)
            if (apuntaAlRival(mov) && (capaMagica || habDef(defensor, atacante, m) === "magic-bounce")) {
                if (!capaMagica) await cartelHabilidad(defensor, !esAliado, "magic-bounce");
                await decir(`¡${defensor.nombre} ha devuelto ${mov.nombre}!`, 1000);
                let hecho = mov.estado ? await aplicarEstado(atacante, mov.estado, esAliado, defensor, true) : false;
                if (mov.cambios && !alUsuario) hecho = (await aplicarCambios(atacante, mov.cambios.stats, esAliado, defensor)) || hecho;
                if (mov.confunde) { const r = await confundir(atacante, esAliado, true, defensor); hecho = r === null ? (hecho || null) : (r || hecho); }
                if (hecho === false && (mov.estado || mov.confunde)) await decir("¡Pero falló!", 800);
                return;
            }
            let hecho = mov.estado ? await aplicarEstado(defensor, mov.estado, !esAliado, atacante, true) : false;
            if (mov.cambios) hecho = (await aplicarCambios(alUsuario ? atacante : defensor, mov.cambios.stats, alUsuario ? esAliado : !esAliado, alUsuario ? null : atacante)) || hecho;
            if (mov.confunde) { const r = await confundir(defensor, !esAliado, true, atacante); hecho = r === null ? (hecho || null) : (r || hecho); }
            if (hecho === false && (mov.estado || mov.confunde)) await decir("¡Pero falló!", 800);
            if (hecho !== false) await esprayBucal(atacante, esAliado, mov);
            if (PIVOTES.has(mov.clave) && hecho !== false && atacante.hp > 0 && activo) await pivotar(esAliado);
            return;
        }
        if (mov.clave === "endeavor" && atacante.hp >= defensor.hp) { await decir("¡Pero falló!", 800); return; }
        if (defensor.dinamax && ["low-kick", "grass-knot", "heavy-slam", "heat-crash"].includes(mov.clave)) { await decir("¡Pero falló!", 800); return; }
        // Contraataque, Manto Espejo, Repr. Metal: devuelven el daño que le han hecho en este turno.
        if (DEVUELVE[mov.clave]) {
            const [cat, f] = DEVUELVE[mov.clave], r = atacante.recibido;
            if (!r || r.turno !== turno || !r.cant || (cat && r.cat !== cat)) { await decir("¡Pero falló!", 800); return; }
            m._fijo = Math.max(1, Math.floor(r.cant * f));
        }
        if (mov.clave === "dream-eater" && !(defensor.estado && defensor.estado.tipo === "dor") && defensor.habilidad !== "comatose") {
            await decir(`No afecta a ${defensor.nombre}…`, 850); return;
        }
        // Demolición y Psicocolmillo rompen el Reflejo, la Pantalla de Luz y el Velo Aurora del rival.
        if (["brick-break", "psychic-fangs", "raging-bull"].includes(mov.clave)) {
            const lado = CAMPO.lados[esAliado ? "r" : "a"];
            if (lado.reflejo || lado.pantallaLuz || lado.veloAurora) {
                lado.reflejo = lado.pantallaLuz = lado.veloAurora = 0;
                await decir(`¡${atacante.nombre} ha roto las barreras ${esAliado ? "del bando rival" : "de tu bando"}!`, 1000);
            }
        }
        // Golpes múltiples (Doble Patada, Pin Misil…): 2-5 golpes según el movimiento (Encadenado: siempre el máximo).
        const amorFilial = atacante.habilidad === "parental-bond" && !mov.golpes && !mov.esZ && !mov.esMax;   // Amor Filial: golpea dos veces
        const nGolpes = mov.golpes ? (mov.golpes[0] === mov.golpes[1] || atacante.habilidad === "skill-link" ? mov.golpes[1]
            : alAzarC((atacante.objeto === "loaded-dice" && mov.golpes[1] >= 4 ? [4, 5] : [2, 2, 3, 3, 4, 5]).filter((n) => n >= mov.golpes[0] && n <= mov.golpes[1]))) : amorFilial ? 2 : 1;
        const hpAntes = defensor.hp;
        let total = 0, efect = 1, crit = false, golpes = 0, bayaUsada = null, aguante = null, disfraz = false, alSub = false, subRoto = false;
        const conSub = defensor.sustituto > 0 && defensor !== atacante && !atraviesaSub(mov, atacante);
        for (let i = 0; i < nGolpes && defensor.hp > 0 && activo; i++) {
            if (i > 0) { await animarMovimientoBase(mov, esAliado, propio); if (!activo) break; }   // (cada golpe, con su animación, como en PokéRogue)
            const r = calcularDanio(atacante, defensor, amorFilial && i === 1 ? Object.assign({}, m, { _amorFilial: true }) : m);
            efect = r.efect; crit = crit || r.crit; golpes++;
            let dmg = r.dmg;
            if (conSub && dmg > 0) {   // el sustituto recibe el golpe
                const quita = Math.min(dmg, defensor.sustituto);
                defensor.sustituto -= quita; total += quita; alSub = true;
                AudioFX.golpe(r.efect, r.crit); animarGolpe(!esAliado);
                await esperar(nGolpes > 1 ? 300 : 550);
                if (defensor.sustituto <= 0) { subRoto = true; break; }
                continue;
            }
            if (r.resiste) { bayaUsada = defensor.objeto; consumirObjeto(defensor); }
            // Disfraz: el primer golpe no le hace daño.
            if (dmg > 0 && habDef(defensor, atacante, m) === "disguise" && !defensor.disfrazRoto) { defensor.disfrazRoto = true; disfraz = true; dmg = 0; }
            // Robustez o Banda Aguante (con los PS al máximo) o Cinta Aguante (10 %): aguanta con 1 PS.
            if (dmg >= defensor.hp && defensor.hp > 0) {
                if (habDef(defensor, atacante, m) === "sturdy" && defensor.hp === defensor.hpMax) { dmg = defensor.hp - 1; aguante = "sturdy"; }
                else if (defensor.aguante === turno) { dmg = defensor.hp - 1; aguante = "endure"; }
                else if (defensor.objeto === "focus-sash" && defensor.hp === defensor.hpMax) { dmg = defensor.hp - 1; aguante = "focus-sash"; consumirObjeto(defensor); }
                else if (defensor.objeto === "focus-band" && azarC() < 0.1) { dmg = defensor.hp - 1; aguante = "focus-band"; }
            }
            defensor.hp = Math.max(0, defensor.hp - dmg); total += dmg;
            if (dmg > 0) {
                defensor.golpeadoEn = turno; defensor.golpesRecibidos = (defensor.golpesRecibidos || 0) + 1;   // (Represalia, Puño Furia…)
                AudioFX.golpe(r.efect, r.crit); animarGolpe(!esAliado); impactoTipo(!esAliado, tipo, r.crit || r.efect >= 2);
                empujeGolpe(!esAliado, r.crit || r.efect >= 2 ? 1.5 : dmg >= defensor.hpMax * 0.25 ? 1 : 0.55);
                if (r.crit || r.efect >= 2) temblor(r.crit && r.efect >= 2 ? 2 : 1.4);
                else if (dmg >= defensor.hpMax * 0.25) temblor(0.8);
                if (r.crit) destello();
            }
            actualizarHP(!esAliado);
            await esperar(nGolpes > 1 ? 300 : 550);
            if (efect === 0 || disfraz) break;
        }
        if (defensor.hp <= 0) defensor._ko = { a: atacante, esAli: esAliado };   // para Autoestima, Ultraimpulso…
        if (total > 0 && !alSub) defensor.recibido = { cant: total, cat: mov.cat, turno };   // (Contraataque, Manto Espejo…)
        if (disfraz) {
            await cartelHabilidad(defensor, !esAliado, "disguise");
            await decir("¡El disfraz ha actuado como señuelo!", 950);
            defensor.hp = Math.max(1, defensor.hp - Math.floor(defensor.hpMax / 8)); animarGolpe(!esAliado); actualizarHP(!esAliado);
            await decir(`¡El disfraz de ${defensor.nombre} se ha roto!`, 1000);
            return;
        }
        if (bayaUsada) await decir(`¡La ${obj(bayaUsada).nombre} ha reducido el daño que sufre ${defensor.nombre}!`, 1100);
        if (crit) await decir("¡Un golpe crítico!", 750);
        if (efect === 0) await decir(`No afecta a ${defensor.nombre}…`, 850);
        else if (efect >= 2) await decir("¡Es muy eficaz!", 850);
        else if (efect > 0 && efect < 1) await decir("No es muy eficaz…", 850);
        if (nGolpes > 1 && efect > 0) await decir(`¡Golpeó ${golpes} ${golpes === 1 ? "vez" : "veces"}!`, 850);
        if (alSub) {
            await decir(`¡El sustituto recibe el ataque en lugar de ${defensor.nombre}!`, 1000);
            if (subRoto) { defensor.sustituto = 0; ponerMuneco(!esAliado, false); await decir(`¡El sustituto de ${defensor.nombre} ha desaparecido!`, 1000); }
        }
        if (aguante === "sturdy") { await cartelHabilidad(defensor, !esAliado, "sturdy"); await decir(`¡${defensor.nombre} ha resistido el golpe!`, 1000); }
        else if (aguante === "endure") await decir(`¡${defensor.nombre} ha aguantado el golpe!`, 1000);
        else if (aguante) await decir(`¡${defensor.nombre} ha aguantado el golpe gracias a ${aguante === "focus-sash" ? "la Banda Aguante" : "la Cinta Aguante"}!`, 1100);
        if (efect === 0) { cortarForzado(atacante, esAliado); return; }
        if (m._fulminante && defensor.hp <= 0) await decir("¡Es un golpe fulminante!", 900);
        if (mov.clave === "spit-up") { const n = atacante.reservas || 0; atacante.reservas = 0; if (n) await aplicarCambios(atacante, { def: -n, spd: -n }, esAliado); }
        if (mov.clave === "fling" || mov.clave === "natural-gift") {
            const o = atacante.objeto; consumirObjeto(atacante);
            if (mov.clave === "fling" && defensor.hp > 0 && o) {
                const est = { "flame-orb": { tipo: "que" }, "toxic-orb": { tipo: "env", grave: true }, "light-ball": { tipo: "par" }, "poison-barb": { tipo: "env" } }[o];
                if (est) await aplicarEstado(defensor, est, !esAliado, atacante);
                if ((o === "kings-rock" || o === "razor-fang") && primero) defensor.retrocede = true;
            }
        }
        // Enfado, Danza Pétalo…: 2-3 turnos seguidos; al acabar, agotado, se queda confuso.
        if (MOVS_FURIA.has(mov.clave)) {
            if (!atacante.forzado) atacante.forzado = { tipo: "furia", mov, turnos: entreC(1, 2) };
            else if (--atacante.forzado.turnos <= 0) { atacante.forzado = null; if (atacante.hp > 0) await confundir(atacante, esAliado); }
        }
        if (MOVS_RECARGA.has(mov.clave) && atacante.hp > 0) atacante.forzado = { tipo: "recarga" };
        if (mov.clave === "burn-up" || mov.clave === "double-shock") {
            const t = mov.clave === "burn-up" ? "fire" : "electric";
            atacante.tipos = atacante.tipos.filter((x) => x !== t); pintarCaja($(esAliado ? "caja-aliado" : "caja-enemigo"), atacante, esAliado, esAliado ? aliados : enemigos);
            await decir(mov.clave === "burn-up" ? `¡El fuego interior de ${atacante.nombre} se ha extinguido!` : `¡${atacante.nombre} ha descargado toda su electricidad!`, 1100);
        }
        if (atacante.cargado && tipo === "electric") atacante.cargado = false;   // Dinamo / Energía Eólica: la carga se gasta
        if (mov.clave === "final-gambit" && total > 0) { atacante._autoKO = true; causaKO = esAliado; }   // Sacrificio: solo si llega a golpear
        // Absorber PS (Gigadrenado…; Viscosecreción lo vuelve daño) o daño de retroceso (Doble Filo…; no con Cabeza Roca ni Muro Mágico).
        if (mov.drenaje > 0 && total > 0) {
            const cant = Math.max(1, Math.floor(total * mov.drenaje * (atacante.objeto === "big-root" ? 1.3 : 1)));
            if (defensor.habilidad === "liquid-ooze") {
                await cartelHabilidad(defensor, !esAliado, "liquid-ooze");
                atacante.hp = Math.max(defensor.hp > 0 ? 0 : 1, atacante.hp - cant); animarGolpe(esAliado); actualizarHP(esAliado);
                await decir(`¡${atacante.nombre} ha absorbido la secreción viscosa tóxica!`, 1100);
            } else if (atacante.hp < atacante.hpMax && !(atacante.anticura > 0)) {
                atacante.hp = Math.min(atacante.hpMax, atacante.hp + cant);
                actualizarHP(esAliado);
                await decir(`¡${defensor.nombre} ha perdido energía!`, 850);
            }
        } else if (mov.drenaje < 0 && total > 0 && atacante.habilidad !== "magic-guard" && !(atacante.habilidad === "rock-head" && mov !== FORCEJEO)) {
            atacante.hp = Math.max(defensor.hp > 0 ? 0 : 1, atacante.hp - Math.max(1, Math.floor(total * -mov.drenaje)));
            animarGolpe(esAliado); actualizarHP(esAliado);
            await decir(`¡${atacante.nombre} también se ha hecho daño!`, 850);
        }
        if (MEDIO_PS.has(mov.clave)) await sacrificioMedio(atacante, esAliado, defensor);
        await esprayBucal(atacante, esAliado, mov);
        // Objetos al golpear: Cascabel Concha, Vidasfera y Casco Dentado del rival.
        if (total > 0 && atacante.hp > 0) {
            const minimo = defensor.hp > 0 ? 0 : 1;   // no caen los dos a la vez
            if (atacante.objeto === "shell-bell" && atacante.hp < atacante.hpMax) {
                atacante.hp = Math.min(atacante.hpMax, atacante.hp + Math.max(1, Math.floor(total / 8))); actualizarHP(esAliado);
                await decir(`¡${atacante.nombre} ha recuperado algunos PS con el Cascabel Concha!`, 1000);
            }
            if (atacante.objeto === "life-orb" && atacante.habilidad !== "magic-guard" && !(atacante.habilidad === "sheer-force" && tieneSecundarios(mov))) {
                atacante.hp = Math.max(minimo, atacante.hp - Math.max(1, Math.floor(atacante.hpMax / 10))); animarGolpe(esAliado); actualizarHP(esAliado);
                await decir(`¡${atacante.nombre} ha perdido algunos PS por la Vidasfera!`, 1000);
            }
            if (defensor.objeto === "rocky-helmet" && !alSub && esContacto(mov, atacante) && atacante.objeto !== "protective-pads" && atacante.hp > 0 && atacante.habilidad !== "magic-guard") {
                atacante.hp = Math.max(minimo, atacante.hp - Math.max(1, Math.floor(atacante.hpMax / 6))); animarGolpe(esAliado); actualizarHP(esAliado);
                await decir(`¡El Casco Dentado de ${defensor.nombre} ha herido a ${atacante.nombre}!`, 1100);
            }
        }
        // Habilidades al recibir el golpe (contacto y otras).
        if (total > 0 && !alSub) await trasGolpe(atacante, defensor, esAliado, m, tipo, hpAntes, crit);
        if (total > 0 && !alSub && defensor.objeto === "air-balloon") {
            consumirObjeto(defensor); await decir(`¡El Globo Helio de ${defensor.nombre} ha explotado!`, 1000);
        }
        if (total > 0 && !alSub && efect >= 2 && defensor.hp > 0 && defensor.objeto === "weakness-policy") {
            consumirObjeto(defensor); await decir(`¡El Seguro Debilidad de ${defensor.nombre} se ha activado!`, 1000);
            await aplicarCambios(defensor, { atk: 2, spa: 2 }, !esAliado);
        }
        if (!activo) return;
        // Efectos secundarios (probabilidad oficial; Dicha la dobla, Potencia Bruta los quita y Polvo Escudo los evita).
        const dicha = atacante.habilidad === "serene-grace" ? 2 : 1;
        const sinSec = atacante.habilidad === "sheer-force" && tieneSecundarios(mov);
        const polvo = habDef(defensor, atacante, m) === "shield-dust" || alSub;   // (el sustituto también para los efectos)
        const retroceso = sinSec ? 0 : (mov.retroceder || (atacante.objeto === "kings-rock" || atacante.objeto === "razor-fang" ? 0.1 : 0) || (atacante.habilidad === "stench" ? 0.1 : 0)) * dicha;
        if (retroceso && primero && defensor.hp > 0 && !polvo && !defensor.dinamax && habDef(defensor, atacante, m) !== "inner-focus" && azarC() < retroceso) defensor.retrocede = true;
        if (!sinSec) {
            if (mov.estado && defensor.hp > 0 && !polvo && azarC() < mov.estado.prob * dicha) await aplicarEstado(defensor, mov.estado, !esAliado, atacante);
            if (mov.confunde && defensor.hp > 0 && !polvo && azarC() < mov.confunde * dicha) await confundir(defensor, !esAliado, false, atacante);
            if (mov.cambios && azarC() < (mov.cambios.prob < 1 ? mov.cambios.prob * dicha : 1)) {
                const quien = alUsuario ? atacante : defensor;
                if (quien.hp > 0 && (alUsuario || !polvo)) await aplicarCambios(quien, mov.cambios.stats, alUsuario ? esAliado : !esAliado, alUsuario ? null : atacante);
            }
        }
        // Giro Rápido y Giro Mortal: se libra de las drenadoras y quita las trampas de su campo.
        if (QUITA_PELIGROS.has(mov.clave) && atacante.hp > 0 && activo) {
            if (atacante.drenado) { atacante.drenado = false; await decir(`¡${atacante.nombre} se ha librado de las drenadoras!`, 1000); }
            if (atacante.atrapado) { await decir(`¡${atacante.nombre} se ha liberado de ${atacante.atrapado.mov}!`, 1000); atacante.atrapado = null; }
            await quitarPeligros(esAliado);
        }
        // Prestidigitador: al golpear, se queda con el objeto del rival si él no lleva ninguno.
        if (atacante.habilidad === "magician" && !atacante.objeto && total > 0 && !alSub && atacante.hp > 0 && defensor.objeto && puedePerderObjeto(defensor))
            await robarObjeto(atacante, esAliado, defensor, "magician");
        // Desarme: el rival pierde su objeto (si es tuyo, lo recuperas al acabar el combate).
        if (mov.clave === "knock-off" && total > 0 && !alSub && defensor.hp > 0 && atacante.hp > 0 && puedePerderObjeto(defensor)) {
            const o = defensor.objeto;
            if (!defensor.objetoQuitado) defensor.objetoQuitado = o;
            defensor.objeto = null; defensor.bloqueo = null;
            await decir(`¡${defensor.nombre} ha perdido el objeto ${obj(o).nombre}!`, 1100);
        }
        // Estímulo cura la parálisis del rival y Espabila lo despierta.
        if (total > 0 && !alSub && defensor.hp > 0 && ((mov.clave === "smelling-salts" && conEstado(defensor, "par")) || (mov.clave === "wake-up-slap" && defensor.estado && defensor.estado.tipo === "dor"))) {
            const dormia = defensor.estado.tipo === "dor";
            defensor.estado = null; actualizarEstadoCaja(!esAliado);
            await decir(dormia ? `¡${defensor.nombre} se ha despertado!` : `¡${defensor.nombre} ya no está paralizado!`, 950);
        }
        // Atadura, Torbellino, Giro Fuego, Bucle Arena, Acoso…: lo atrapa unos turnos.
        if (ATRAPA[mov.clave] && total > 0 && !alSub && defensor.hp > 0 && atacante.hp > 0 && !defensor.atrapado) {
            defensor.atrapado = { mov: mov.nombre, clave: mov.clave, turnos: atacante.objeto === "grip-claw" ? 7 : entreC(4, 5), por: atacante };
            await decir(ATRAPA[mov.clave](defensor.nombre, atacante.nombre), 1100);
        }
        // Niebla Clara: anula los cambios en las características del rival.
        if (mov.clave === "clear-smog" && total > 0 && !alSub && defensor.hp > 0 && hayCambios(defensor, 0)) {
            defensor.etapas = etapasCero();
            await decir(`¡Se han anulado todos los cambios en las características de ${defensor.nombre}!`, 1100);
        }
        if ((mov.clave === "steel-roller" || mov.clave === "ice-spinner") && total > 0 && atacante.hp > 0) await quitarTerreno();
        if (mov.esMax && mov.efectoMax && efect > 0 && atacante.hp > 0 && activo) await efectoMax(mov.efectoMax, atacante, defensor, esAliado);
        // Bayas de apuro de los dos tras el golpe.
        await comprobarBayas(defensor, !esAliado);
        await comprobarBayas(atacante, esAliado);
        // Botón Escape: el que lo lleva vuelve a su Poké Ball y sale otro. Tarjeta Roja: el que le ha golpeado.
        const quedanEn = (ea) => (ea ? aliados : enemigos).some((p, i) => i !== (ea ? iAliado : iEnemigo) && p.hp > 0);
        if (total > 0 && !alSub && defensor.hp > 0 && atacante.hp > 0 && activo && !terminado) {
            if (defensor.objeto === "eject-button" && quedanEn(!esAliado) && !(opts.salvaje && esAliado)) {
                consumirObjeto(defensor);
                await decir(`¡${defensor.nombre} ha vuelto gracias al Botón Escape!`, 1000);
                await pivotar(!esAliado);
                return;
            }
            if ((defensor.habilidad === "emergency-exit" || defensor.habilidad === "wimp-out") && hpAntes > defensor.hpMax / 2 && defensor.hp <= defensor.hpMax / 2
                && quedanEn(!esAliado) && !opts.salvaje) {
                await cartelHabilidad(defensor, !esAliado);
                await decir(`¡${defensor.nombre} ha vuelto a su Poké Ball!`, 1000);
                await pivotar(!esAliado);
                return;
            }
            if (defensor.objeto === "red-card" && quedanEn(esAliado) && !(opts.salvaje && !esAliado)) {
                consumirObjeto(defensor);
                await decir(`¡${defensor.nombre} ha mostrado su Tarjeta Roja a ${atacante.nombre}!`, 1100);
                await arrastrar(atacante, esAliado, defensor);
                return;
            }
        }
        // Ida y Vuelta, Voltiocambio, Viraje: tras golpear, vuelve y sale otro (si el rival no ha caído).
        if (PIVOTES.has(mov.clave) && total > 0 && atacante.hp > 0 && defensor.hp > 0 && activo && !terminado) await pivotar(esAliado);
        // Cola Dragón y Llave Giro: el rival vuelve a su Poké Ball y sale otro al azar.
        if (ARRASTRA.has(mov.clave) && total > 0 && !alSub && atacante.hp > 0 && defensor.hp > 0 && activo && !terminado) await arrastrar(defensor, !esAliado, atacante);
    }
    // El rival (esAliD: si es tuyo) vuelve a su Poké Ball y sale otro de su equipo al azar (con el azar compartido, así que en el
    // multijugador las dos partidas sacan el mismo). Con un Pokémon salvaje, o sin nadie más para salir, no pasa nada.
    async function arrastrar(defensor, esAliD, atacante) {
        const equipo = esAliD ? aliados : enemigos, actual = esAliD ? iAliado : iEnemigo;
        if ((opts.salvaje && !esAliD) || defensor.hp <= 0 || defensor !== activoDe(esAliD) || defensor.dinamax || defensor.arraigo) return false;
        const opciones = equipo.map((_, i) => i).filter((i) => i !== actual && equipo[i].hp > 0);
        if (!opciones.length) return false;
        if (habDef(defensor, atacante, {}) === "suction-cups") {
            await cartelHabilidad(defensor, esAliD, "suction-cups");
            await decir(`¡${defensor.nombre} se ha aferrado con sus Ventosas!`, 1000);
            return false;
        }
        const i = alAzarC(opciones);
        if (esAliD) await new Promise((res) => accionCambiar(i, "arrastre", res));
        else await cambiarRival(i, true);
        return true;
    }
    // El que usa un movimiento de relevo vuelve a su Poké Ball y sale otro de su equipo (tú eliges; el rival, el que mejor le va).
    async function pivotar(esAli) {
        const equipo = esAli ? aliados : enemigos, actual = esAli ? iAliado : iEnemigo;
        if (opts.salvaje && !esAli) return false;
        if (!equipo.some((p, i) => i !== actual && p.hp > 0)) return false;
        if (esAli) { await new Promise((res) => mostrarEquipoMenu("pivote", res)); return true; }
        let i;
        if (opts.pvp) {
            ponerMensaje(`${opts.titulo} está eligiendo a su siguiente Pokémon…`);
            const r = await opts.pvp.recibir("reemplazo");
            if (r.fin) { await rivalAbandona(r.fin); return true; }
            i = r.i;
        } else i = mejorReemplazoRival();
        if (i == null || i < 0 || i === iEnemigo || !enemigos[i] || enemigos[i].hp <= 0) return false;
        await cambiarRival(i);
        return true;
    }
    function mejorReemplazoRival() {
        const ali = aliadoActivo(); let mejor = -1, val = -Infinity;
        enemigos.forEach((p, i) => {
            if (i === iEnemigo || p.hp <= 0) return;
            const v = golpeMaximo(p, ali) / Math.max(1, ali.hp) - (golpeMaximo(ali, p) + peajeEntrada(p)) / p.hp;
            if (v > val) { val = v; mejor = i; }
        });
        return mejor;
    }
    async function debilitar(c, esAliado) {
        ponerMuneco(esAliado, false);
        AudioFX.grito(c.baseId, { rate: 0.8, vol: 0.5 });
        await esperar(350);
        AudioFX.efecto("faint");
        const s = spriteEl(esAliado); if (s) s.classList.add("debilitado");
        renderBolas();
        caja(esAliado, false);   // su ficha se retira, como en los juegos
        await decir(`¡${c.nombre} se debilitó!`, 1000);
        if (quitarDinamax(c) || c.furioso) pintarPoderes(esAliado, c);   // (su aura y su tamaño gigante se van con él)
        destransformar(c);
        // Quien lo ha derrotado puede crecerse (Autoestima, Ultraimpulso…).
        const ko = c._ko; c._ko = null;
        if (ko && ko.a.hp > 0 && activo && ko.a === activoDe(ko.esAli)) await alDerrotar(ko.a, ko.esAli);
    }
    async function enviarSiguienteEnemigo(elegido) {
        const sig = elegido != null ? elegido : enemigos.findIndex((p) => p.hp > 0);
        if (sig < 0 || !enemigos[sig] || enemigos[sig].hp <= 0) return false;
        iEnemigo = sig;
        caja(false, false);
        await renderEnemigo(true); renderBolas();
        spriteEl(false).style.opacity = "0";
        await lanzamientoRival(false);
        await alEntrar(false);
        return !terminado;
    }
    async function accionCambiar(indice, modo, alTerminar) {
        if (indice === iAliado) return;
        if (opts.pvp && (modo === "forzado" || modo === "ko" || modo === "caida" || modo === "pivote")) opts.pvp.enviar({ t: "reemplazo", i: indice });   // tu rival lo verá salir
        ocultarMenus(); bloqueado = true;
        if (aliadoActivo().hp > 0) {
            if (modo !== "arrastre") await decir(`¡${aliadoActivo().nombre}, vuelve!`, 600);
            await animRetirada(true, aliadoActivo());
            actualizarHP(true);
        }
        alRetirarse(aliadoActivo());   // Regeneración, Cura Natural…
        Object.assign(aliadoActivo(), { etapas: etapasCero(), critEtapa: 0, bloqueo: null });   // al retirarse pierde sus cambios
        iAliado = indice;
        caja(true, false);
        await renderAliado(true);
        await decir(modo === "arrastre" ? `¡${aliadoActivo().nombre} ha sido arrastrado al combate!` : `¡Adelante, ${aliadoActivo().nombre}!`, modo === "arrastre" ? 900 : 400);
        await envioConBola(true);
        caja(true, true);
        AudioFX.grito(aliadoActivo().baseId, { vol: 0.55 });
        await revelarShiny(true);
        const cayo = await alEntrar(true);
        if (modo === "caida" || modo === "pivote" || modo === "arrastre" || modo === "doble") return alTerminar && alTerminar();   // (el turno sigue donde estaba)
        if (modo === "ko") return cierreTrasKO();
        if (!activo || terminado) return;
        if (modo === "normal") {
            if (cayo) { turno++; if (await finDeTurno()) return; return mostrarAcciones(); }   // cayó al entrar: el rival no tiene a quién atacar
            if (await turnoEnemigoSolo()) return;
        }
        if (modo === "libre" && alTerminar) return alTerminar();
        if (modo === "pvp") return;   // multijugador: los dos cambian a la vez y el turno sigue fuera
        mostrarAcciones();
    }
    function preguntarCambioRival() {
        return new Promise((resolve) => {
            ocultarMenus(); accionesEl.classList.remove("oculta", "principal");
            ponerMensaje(`${opts.titulo || "El rival"} va a sacar otro Pokémon. ¿Quieres cambiar el tuyo?`);
            accionesEl.innerHTML =
                `<button class="accion-btn acc-cambiar" data-si>Sí, cambiar</button>` +
                `<button class="accion-btn acc-huir" data-no>No</button>`;
            const fin = (v) => { accionesEl.classList.add("oculta"); resolve(v); };
            accionesEl.querySelector("[data-si]").onclick = () => fin(true);
            accionesEl.querySelector("[data-no]").onclick = () => fin(false);
        });
    }
    // Solo ataca el rival (tras usar un objeto, cambiar, fallar la huida o la captura). true si ya tomó el control.
    async function turnoEnemigoSolo() {
        if (enemigoActivo().hp <= 0 || !activo) return false;
        const ene = enemigoActivo();
        aliados.concat(enemigos).forEach((p) => { p.protegido = false; });
        if (!opts.pvp && await poderRivalIA(ene)) { if (!activo) return true; }
        if (!ene.forzado && await rivalUsaCura(ene)) { turno++; return finDeTurno(); }
        const forz = movForzado(ene);
        let mv = opts.pvp ? movRivalPvP : forz || iaElegirMov(ene, aliadoActivo(), opts.ia || 0.75);
        if (!opts.pvp && ene.dinamax && !forz) mv = movMax(ene, mv, ene.dinamax.gmax);
        if (!opts.pvp && !forz && mv !== FORCEJEO) mv = movZRival(ene, mv);
        aliadoActivo().movTurno = null; ene.movTurno = mv;
        const gastoSolo = !opts.pvp && aliadoActivo().hp > 0 && aliadoActivo().habilidad === "pressure" ? 2 : 1;
        if (mv.base) mv.base.ppAct = Math.max(0, mv.base.ppAct - gastoSolo);
        else if (!forz && mv !== FORCEJEO) mv.ppAct = Math.max(0, (mv.ppAct ?? 1) - gastoSolo);
        if (!forz && esEleccion(ene.objeto) && !ene.bloqueo && mv !== FORCEJEO && !mv.base && !ene.dinamax) ene.bloqueo = mv.clave;
        mv.prioEf = prioridadHab(enemigoActivo(), mv);
        await concentrar(enemigoActivo(), mv);
        await ejecutarMovimiento(enemigoActivo(), aliadoActivo(), mv, false);
        if (aliadoActivo().hp <= 0 && enemigoActivo().hp <= 0) { await dobleKO(); return true; }
        if (aliadoActivo().hp <= 0) { await debilitar(aliadoActivo(), true); aliadoDerrotado("ko"); return true; }
        if (enemigoActivo().hp <= 0) { await debilitar(enemigoActivo(), false); if (!(await rivalDerrotado())) await cierreTrasKO(); return true; }
        turno++;
        return finDeTurno();
    }

    // ---------- Captura (sonidos reales de PokéRogue) ----------
    async function accionAtrapar(clave) {
        ocultarMenus(); bloqueado = true;
        const enemigo = enemigoActivo();
        if (enemigo.forzado && enemigo.forzado.oculto) {   // en el aire, bajo tierra o bajo el agua: no hay a qué apuntar
            await decir(`¡No puedes apuntar a ${enemigo.nombre} ahora!`, 1100);
            return mostrarAcciones();
        }
        clave = clave || "poke-ball";
        if (opts.bolsa) { opts.bolsa[clave] = Math.max(0, (opts.bolsa[clave] || 0) - 1); if (opts.guardarBolsa) opts.guardarBolsa(); }
        let base = (1 - enemigo.hp / enemigo.hpMax) * 0.6 + 0.18;
        if (esLegendario(enemigo.baseId)) base *= 0.28;
        if (enemigo.furioso) base *= 0.6;   // (la furia lo hace más difícil de atrapar)
        if (enemigo.estado) base *= ["dor", "con"].includes(enemigo.estado.tipo) ? 2 : 1.5;   // como en los juegos
        const mult = multBola(clave, situacionCaptura(enemigo));
        const exito = mult >= 255 || azarC() < limitar(base * mult, 0.02, 0.98);

        await decir(`¡Lanzaste una ${obj(clave).nombre}!`, 500);
        AudioFX.efecto("pb_throw");
        const esc = escenaEl();
        // Como en Blanco/Negro: la ball golpea al Pokémon, rebota hacia arriba, se abre y lo absorbe en luz roja.
        await volarBola(centroSprite(false), { x: esc.clientWidth * 0.1, y: esc.clientHeight * 0.95 }, clave, { lejos: true });
        await rebotarBola();
        AudioFX.efecto("pb_rel");
        await absorber(true, clave);
        await caerBola();
        await esperar(300);
        const meneos = exito ? 3 : entreC(0, 2);
        for (let i = 0; i < meneos; i++) { AudioFX.efecto("pb_move"); await menearBola(i); await esperar(380); }
        if (exito) {
            AudioFX.efecto("pb_lock");
            estrellasCaptura();
            await decir("¡Clic!", 600);
            enemigo.bolaCaptura = clave;
            AudioFX.fanfarria(MUSICA.captura);
            await decir(`¡Ya está! ¡${enemigo.nombre} atrapado!`, 1800);
            return finBatalla(true, enemigo);   // la ball se queda en el suelo, como en los juegos
        }
        AudioFX.efecto("pb_rel");
        await absorber(false, clave);
        AudioFX.grito(enemigo.baseId, { vol: 0.5 });
        ocultarBola();
        await decir(["¡Oh, no! ¡El Pokémon se ha escapado!", "¡Vaya! ¡Parecía que lo tenías!", "¡Argh! ¡Casi lo consigues!"][Math.min(2, meneos)], 1000);
        // Recogebolas: la primera ball que falla, la trae de vuelta (una vez por combate).
        const perro = aliadoActivo();
        if (perro && perro.hp > 0 && perro.habilidad === "ball-fetch" && !opts._bolaRecogida && opts.bolsa) {
            opts._bolaRecogida = true; opts.bolsa[clave] = (opts.bolsa[clave] || 0) + 1; if (opts.guardarBolsa) opts.guardarBolsa();
            await cartelHabilidad(perro, true);
            await decir(`¡${perro.nombre} ha ido a buscar la ${obj(clave).nombre}!`, 1200);
        }
        if (await turnoEnemigoSolo()) return;
        mostrarAcciones();
    }
    const bolaEl = () => document.querySelector("#capa-bola .bola-throw");
    // Tras golpear, la ball rebota y queda flotando sobre el Pokémon.
    async function rebotarBola() {
        const b = bolaEl(), s = spriteEl(false); if (!b || !s) return;
        const x = parseFloat(b.style.left), y = parseFloat(b.style.top), h = s.getBoundingClientRect().height;
        const alto = y - Math.max(h * 0.32, 22 * escalaBola());
        await anim(b, [{ left: x + "px", top: y + "px", transform: "translate(-50%,-50%) rotate(0)" },
                       { left: (x - 6) + "px", top: alto + "px", transform: "translate(-50%,-50%) rotate(-30deg)" }], { duration: 260, easing: "cubic-bezier(.2,.9,.4,1)" });
    }
    // El Pokémon se vuelve luz roja y entra en la ball (o sale de ella si se escapa), hacia donde esté la ball.
    async function absorber(entrar, bola) {
        const s = spriteEl(false), b = bolaEl(); if (!s) return;
        if (b) {
            const rs = s.getBoundingClientRect(), rb = b.getBoundingClientRect();
            s.style.transformOrigin = `${rb.left + rb.width / 2 - rs.left}px ${rb.top + rb.height / 2 - rs.top}px`;
        }
        const color = colorBola(bola);   // (la luz de esa ball, como en PokéRogue)
        const au = soporteEl(false) && soporteEl(false).querySelector(".aura-dinamax");   // (el aura se va con él dentro de la ball)
        if (au) au.style.visibility = entrar ? "hidden" : "";
        if (entrar) {
            await tintar(s, false, color, 0, 1, 180);
            await anim(s, [{ transform: "scale(1)", opacity: 1 }, { transform: "scale(.05)", opacity: 0 }], { duration: 340, easing: "ease-in" });
            s.style.visibility = "hidden";
        } else {
            s.style.visibility = "visible";
            const luz = tintar(s, false, color, 1, 0, 520);
            await anim(s, [{ transform: "scale(.05)", opacity: 0 }, { transform: "scale(1)", opacity: 1, offset: 0.65 }, { transform: "scale(1)", opacity: 1 }], { duration: 480, easing: "ease-out" });
            await luz;
            resetTransform(s); s.style.opacity = "1";
        }
        s.style.transformOrigin = "";
    }
    // La ball cae al suelo, sobre la plataforma del rival, y rebota dos veces (con sus sonidos reales).
    async function caerBola() {
        const b = bolaEl(); if (!b) return;
        const z = escalaBola(), suelo = sueloRival();
        const x0 = parseFloat(b.style.left), y0 = parseFloat(b.style.top);
        const yR = suelo.y - 8 * z;   // el borde de abajo de la bola toca el suelo
        const dur = 900;
        setTimeout(() => AudioFX.efecto("pb_bounce_1"), (dur * 0.46) / velJuego());
        setTimeout(() => AudioFX.efecto("pb_bounce_2", { vol: 0.35 }), (dur * 0.8) / velJuego());
        await anim(b, [
            { left: x0 + "px", top: y0 + "px", transform: "translate(-50%,-50%) rotate(-30deg)", easing: "cubic-bezier(.55,0,1,.45)" },
            { left: suelo.x + "px", top: yR + "px", transform: "translate(-50%,-50%) rotate(0)", offset: 0.46, easing: "cubic-bezier(0,.55,.45,1)" },
            { left: suelo.x + "px", top: (yR - 16 * z) + "px", transform: "translate(-50%,-50%) rotate(0)", offset: 0.64, easing: "cubic-bezier(.55,0,1,.45)" },
            { left: suelo.x + "px", top: yR + "px", transform: "translate(-50%,-50%) rotate(0)", offset: 0.8, easing: "cubic-bezier(0,.55,.45,1)" },
            { left: suelo.x + "px", top: (yR - 5 * z) + "px", transform: "translate(-50%,-50%) rotate(0)", offset: 0.9, easing: "cubic-bezier(.55,0,1,.45)" },
            { left: suelo.x + "px", top: yR + "px", transform: "translate(-50%,-50%) rotate(0)" },
        ], { duration: dur, easing: "linear" });
        b.style.transformOrigin = "50% 80%";   // desde aquí se mece apoyada en el suelo
    }
    async function menearBola(i = 0) {
        const b = bolaEl(); if (!b) return;
        const g = i % 2 ? -24 : 24;
        await anim(b, [{ transform: "translate(-50%,-50%) rotate(0)" }, { transform: `translate(-50%,-50%) rotate(${-g}deg)`, offset: 0.3 },
                       { transform: `translate(-50%,-50%) rotate(${g * 0.6}deg)`, offset: 0.7 }, { transform: "translate(-50%,-50%) rotate(0)" }], { duration: 440, easing: "ease-in-out" });
    }
    // «¡Clic!»: como en PokéRogue, tres estrellas saltan de la ball y caen apagándose.
    async function estrellasCaptura() {
        const b = bolaEl(), cont = efectosEl(); if (!b || !cont) return;
        let a; try { a = await Atlas.cargar(PB_PARTICULAS); } catch (_) { return; }
        const e = escenaEl(), re = e.getBoundingClientRect(), rb = b.getBoundingClientRect(), z = escalaBola(), v = velJuego();
        const x = rb.left - re.left + rb.width / 2, y = rb.top - re.top + rb.height / 2;
        for (let k = 0; k < 3; k++) {
            const cv = document.createElement("canvas");
            cv.width = a.w; cv.height = a.h; cv.className = "chispa-bola";
            Atlas.dibujar(cv, a, 4);
            cv.style.width = a.w * z + "px"; cv.style.left = x + "px"; cv.style.top = y + "px";
            cont.appendChild(cv);
            // Desvío al azar con forma de campana (su randGauss(25)).
            const dx = Math.sqrt(-2 * Math.log(1 - Math.random())) * Math.cos(2 * Math.PI * Math.random()) * 25 * z;
            cv.animate([{ transform: `translate(0,0)` }, { transform: `translate(${dx / 2}px,${-10 * z}px)`, easing: SENO_IN }, { transform: `translate(${dx}px,0)` }],
                { duration: 500 / v, easing: "linear", fill: "forwards" });
            cv.animate([{ opacity: 0.5 }, { opacity: 0.5, offset: 0.85 }, { opacity: 0 }], { duration: 500 / v, fill: "forwards" });
            setTimeout(() => cv.remove(), 560 / v);
        }
    }

    // ---------- Huida ----------
    async function avisoSinSalida() {   // atrapado: ni cambiar ni huir (no gasta el turno)
        ocultarMenus(); bloqueado = true;
        await decir(`¡${aliadoActivo().nombre} no puede escapar!`, 1000);
        mostrarAcciones();
    }
    async function accionHuir() {
        const fuga = aliadoActivo().habilidad === "run-away";   // Fuga: huye siempre, aunque lo tengan atrapado
        if (sinSalida(aliadoActivo()) && !fuga) return avisoSinSalida();
        ocultarMenus(); bloqueado = true;
        if (fuga || azarC() < 0.85) {
            AudioFX.efecto("flee");
            const s = spriteEl(true);
            if (s) await anim(s, [{ transform: "translateX(0)", opacity: 1 }, { transform: "translateX(-300px)", opacity: 0 }], { duration: 520, easing: "ease-in" });
            // En la hierba alta: seguir buscando otros Pokémon o volver a la región.
            if (opts.cadena) {
                racha = 0;
                await decir("¡Escapaste sin problemas!", 900);
                ponerMensaje("Has huido del combate. ¿Sigues buscando Pokémon en la hierba alta?");
                return botonesFin(
                    `<button class="accion-btn acc-cambiar" data-acc="seguir">Seguir explorando</button><button class="accion-btn acc-huir" data-acc="salir">Volver a la región</button>`,
                    { seguir: () => { const sa = spriteEl(true); if (sa) { sa.style.transform = ""; sa.style.opacity = "1"; } continuarCadena(); },
                      salir: () => salir({ gano: null }) });
            }
            await decir("¡Escapaste sin problemas!", 1000);
            return finBatalla(null);
        }
        await decir("¡No has podido escapar!", 900);
        if (await turnoEnemigoSolo()) return;
        mostrarAcciones();
    }

    // ---------- Fin ----------
    // Botones del final: solo cuenta la primera pulsación (un doble clic no puede dar dos veces los premios ni seguir dos veces).
    function botonesFin(html, handlers) {
        accionesEl.classList.remove("oculta", "principal");
        accionesEl.innerHTML = html;
        let usado = false;
        Object.entries(handlers).forEach(([acc, fn]) => {
            const b = accionesEl.querySelector(`[data-acc=${acc}]`);
            if (b) b.onclick = () => { if (usado) return; usado = true; fn(); };
        });
    }
    function salir(res) {
        if (opts._salido) return;   // (una sola vez por combate)
        opts._salido = true;
        restaurarTrasCombate(); cerrar(); if (opts.alTerminar) opts.alTerminar(Object.assign({ racha, equipo: aliados }, res));
    }
    // Al acabar (o al irse sin terminar, como al huir en la hierba alta) todos vuelven a ser como antes: sin Dinamax ni
    // Transformación ni Teracristal, con su tipo y su habilidad de siempre y con el objeto que les quitaron (lo que uno tuyo
    // le robó a un entrenador, se devuelve). Cura Natural cura al acabar. Se puede llamar más de una vez.
    function restaurarTrasCombate() {
        aliados.concat(enemigos).forEach((p) => {
            quitarDinamax(p); destransformar(p); p.teracristal = null;
            if (p.objetoEmbargado && !p.objeto) p.objeto = p.objetoEmbargado;
            if (p.objetoSala && !p.objeto) p.objeto = p.objetoSala;
            p.objetoEmbargado = p.objetoSala = null; p.embargo = 0;
            if (p.mimetismo) { p.movimientos[p.mimetismo.i] = p.mimetismo.mov; p.mimetismo = null; }
            if (p.statsOrig) { p.stats = p.statsOrig; p.statsOrig = null; }
        });
        if (CAMPO) Object.assign(CAMPO, { gravedad: 0, salaMagica: 0, salaExtrana: 0, chapoteo: 0, hidrochorro: 0, cerrojo: 0, diluvio: false });
        aliados.forEach((p) => {
            if (p.hp > 0 && (p.habBase || p.habilidad) === "natural-cure") p.estado = null;
            Object.assign(p, { tipos: p.tiposBase || p.tipos, habilidad: p.habBase || p.habilidad });
            if (p.objetoRobado) { p.objeto = p.objetoRobado.antes; delete p.objetoRobado; }
            if (p.objetoQuitado) { p.objeto = p.objetoQuitado; delete p.objetoQuitado; }   // Desarme y Hurto no son para siempre
        });
    }
    // Recogida: al ganar, a veces uno con esta habilidad y sin objeto se encuentra uno (mejores cuanto más nivel tiene).
    const RECOGIDA = [["potion", 1], ["antidote", 1], ["super-potion", 15], ["great-ball", 15], ["full-heal", 25], ["ultra-ball", 25], ["hyper-potion", 35],
        ["revive", 35], ["rare-candy", 45], ["sun-stone", 45], ["moon-stone", 45], ["nugget", 55], ["full-restore", 65], ["max-revive", 65], ["pp-up", 75], ["max-elixir", 85]];
    async function recogerObjetos() {
        if (opts.pvp) return;
        for (const p of aliados) {
            if (p.hp <= 0 || p.objeto || p.habilidad !== "pickup" || Math.random() >= 0.1 || !activo) continue;
            const k = alAzar(RECOGIDA.filter(([, n]) => n <= p.nivel).slice(-6))[0];
            p.objeto = k;
            await decir(`¡${p.nombre} ha recogido ${obj(k).nombre}!`, 1300);
        }
    }
    async function finBatalla(gano, capturado) {
        if (terminado) return;
        terminado = true; pararReloj();
        // En línea, el resultado sale para el ranking ya (no al pulsar «Continuar»: así cuenta aunque se cierre el juego).
        if (opts.pvp && opts.pvp.alResultado && (gano === true || gano === false)) { try { opts.pvp.alResultado(gano); } catch (_) {} }
        bloqueado = true; ocultarMenus();
        AudioFX.alarma(false);
        restaurarTrasCombate();
        CAMPO.clima = null; pintarClima();
        if (gano === true) {
            if (!capturado && !opts.salvaje && opts.dialogoDerrota) {
                const cv = $("entrenador-sprite");
                if (cv && opts.entrenadorSprite) {
                    cv.classList.remove("oculta"); cv.style.transform = ""; cv.style.opacity = "1";
                    await anim(cv, [{ transform: "translateX(110%)", opacity: 0 }, { transform: "translateX(0)", opacity: 1 }], { duration: 420 });
                }
                if (!capturado) AudioFX.fanfarria(fanfarriaVictoria(false));
                await decir(`¡Has derrotado a ${opts.titulo}!`, 1300);
                await decir(`«${opts.dialogoDerrota}»`, 2200);
                if (opts.premio) await decir(`Recibes ${numES(opts.premio)} ₽ por la victoria.`, 1200);
            } else if (!capturado) {
                AudioFX.fanfarria(fanfarriaVictoria(false));
                await decir(opts.salvaje ? `¡Has vencido a ${enemigoActivo().nombre}!` : "¡Has ganado el combate!", 1400);
            }
            await recogerObjetos();
            await evolucionesTrasCombate();
            if (!activo) return;
            if (opts.cadena) {
                racha++;
                // Como en los juegos: el capturado se une al equipo si hay hueco.
                if (capturado && aliados.length < 6 && !aliados.some((a) => a.baseId === capturado.baseId)) {
                    capturado.bola = capturado.bolaCaptura || "poke-ball";
                    capturado.nivelEntrada = capturado.nivel;
                    aliados.push(capturado);
                    await decir(`¡${capturado.nombre} se ha unido a tu equipo!`, 1200);
                }
                if (opts.onRonda) opts.onRonda({ capturado, racha, jefe: !!opts.jefe, equipo: aliados, salvaje: !!opts.salvaje, premio: capturado ? 0 : opts.premio || 0, rivales: enemigos });
                return botonesFin(
                    `<button class="accion-btn acc-cambiar" data-acc="seguir">Seguir explorando</button><button class="accion-btn acc-huir" data-acc="salir">Volver</button>`,
                    { seguir: continuarCadena, salir: () => salir({ gano: true }) });
            }
        } else {
            AudioFX.pararMusica();
            if (gano === false) await decir(quedanAliados() ? "Te has rendido." : "No te quedan Pokémon en condiciones de combatir...", 1400);
        }
        botonesFin(`<button class="accion-btn ancho" data-acc="salir">Continuar</button>`, { salir: () => salir({ gano, capturado }) });
    }
    // Cadena de la hierba: pide el siguiente rival y sigue con el mismo equipo.
    async function continuarCadena() {
        terminado = false;
        bloqueado = true; ocultarMenus(); ocultarBola();
        // Cada encuentro es un combate nuevo: el que se dinamaxizó, teracristalizó o megaevolucionó llega en su forma normal
        // y los poderes (Mega, Z, Dinamax y Teracristal) se pueden volver a usar.
        restaurarTrasCombate();
        try { await Promise.all(aliados.map((p) => deshacerMega(p))); } catch (_) {}
        poder.aliado = null;
        if (aliadoActivo().hp > 0) await montarCombatiente(true, aliadoActivo(), true);
        pintarPoderes(true); repintarFicha(true);
        await decir("Buscando entre la hierba alta...", 700);
        let res = null;
        try { res = opts.siguienteEnemigo ? await opts.siguienteEnemigo(racha) : null; } catch (_) { res = null; }
        if (!activo) return;
        if (!res || !res.enemigos || !res.enemigos.length) return botonesFin(`<button class="accion-btn ancho" data-acc="salir">Continuar</button>`, { salir: () => salir({ gano: true }) });
        aliados.forEach((p) => { alRetirarse(p, false); Object.assign(p, { etapas: etapasCero(), critEtapa: 0, bloqueo: null, retrocede: false, nivelEntrada: p.nivel, forzado: null, confuso: 0, drenado: false, mofa: 0, protegido: false, protecciones: 0 }); if (p.hp > 0) p.hp = Math.min(p.hpMax, p.hp + Math.floor(p.hpMax * 0.2)); });
        turno = 1; poderSel = null; poder.rival = null; poder.aliado = null;
        CAMPO.clima = null; pintarClima();   // cada encuentro, con su tiempo
        // El entrenador anterior se va de la escena (antes se quedaba encima del siguiente Pokémon).
        const cvE = $("entrenador-sprite");
        if (cvE) { cvE.classList.add("oculta"); cvE.style.transform = ""; cvE.style.opacity = ""; }
        efectosEl().innerHTML = ""; $("capa-anim-fondo").innerHTML = ""; $("capa-anim-detras").innerHTML = "";
        enemigos = res.enemigos;
        enemigos.forEach((p) => { p.lado = "r"; });
        CAMPO.lados = { a: ladoNuevo(), r: ladoNuevo() }; CAMPO.espacioRaro = 0; CAMPO.terreno = null;
        pintarTrampas(); pintarTerreno();
        ["salvaje", "jefe", "titulo", "entrenadorSprite", "dialogo", "dialogoDerrota", "musica", "musicaEncuentro", "victoria", "premio", "curasRival", "ia", "cambiosRival", "fondo"].forEach((k) => { if (k !== "fondo" || res[k]) opts[k] = res[k]; });
        opts.salvaje = !!res.salvaje; opts.permitirCaptura = !!res.salvaje; opts._musicaEnt = null;
        iEnemigo = enemigos.findIndex((p) => p.hp > 0);
        // Su música y sus gritos, ya: sin esperar a que cargue el sprite.
        AudioFX.musicaSonar(opts.salvaje ? musicaRival() : opts.musicaEncuentro || musicaRival());
        AudioFX.precargarGritos(enemigos.map((p) => p.baseId));
        if (!opts.salvaje) AudioFX.precargarMusica([musicaRival(), fanfarriaVictoria(false)]);
        let cambiaAliado = false;
        if (aliadoActivo().hp <= 0) { const v = aliados.findIndex((p) => p.hp > 0); if (v >= 0) { iAliado = v; cambiaAliado = true; } }
        AnimMov.precargar(enemigos.flatMap((p) => p.movimientos.map((mv) => mv.clave)));
        caja(false, false);
        if (cambiaAliado) caja(true, false);
        await Promise.all([renderEnemigo(true), renderAliado(cambiaAliado)]);
        renderBolas();
        spriteEl(false).style.opacity = "0";
        if (cambiaAliado) spriteEl(true).style.opacity = "0";
        await presentarRival();
        if (cambiaAliado) {   // tu Pokémon anterior cayó: sale el siguiente con su Poké Ball
            await decir(`¡Adelante, ${aliadoActivo().nombre}!`, 450);
            await envioConBola(true);
            caja(true, true);
            AudioFX.grito(aliadoActivo().baseId, { vol: 0.55 });
        }
        await climaDelLugar();
        await entradasIniciales();
        mostrarAcciones();
    }
    function cerrar() {
        activo = false; document.removeEventListener("keydown", onTeclaBatalla);
        pararReloj();
        azarC = Math.random;
        AudioFX.alarma(false);
        CAMPO.clima = null; CAMPO.activos = () => []; CAMPO.lados = null; CAMPO.quedan = null; CAMPO.espacioRaro = 0; CAMPO.terreno = null;
        window.removeEventListener("resize", ajustarEscena);
        window.removeEventListener("resize", aplicarDisposicion);
        AudioFX.pararMusica();
        const c = capa;
        c.classList.add("cerrando");
        setTimeout(() => { c.classList.remove("cerrando"); c.classList.add("oculta"); c.innerHTML = ""; }, 340);
        document.body.style.overflow = "";
    }

    // ---------- Teclado ----------
    function onTeclaBatalla(e) {
        if (!activo) return;
        let menu = null;
        if (accionesEl && !accionesEl.classList.contains("oculta")) menu = accionesEl;
        else if (movesEl && !movesEl.classList.contains("oculta")) menu = movesEl;
        else if (equipoMenuEl && !equipoMenuEl.classList.contains("oculta")) menu = equipoMenuEl;
        if (!menu) return;
        const k = e.key;
        const salirB = menu.querySelector("[data-acc='salir']");
        if (salirB && (k === "Enter" || k === " ")) { e.preventDefault(); salirB.click(); return; }
        const volver = menu.querySelector("[data-volver]");
        if (volver && (k === "Escape" || k === "Backspace")) { e.preventDefault(); volver.click(); return; }
        const tabs = [...menu.querySelectorAll(".mochila-tab")];
        if (tabs.length > 1 && (k === "ArrowLeft" || k === "ArrowRight")) {
            const act = tabs.findIndex((t) => t.classList.contains("activa"));
            const nxt = k === "ArrowRight" ? (act + 1) % tabs.length : (act - 1 + tabs.length) % tabs.length;
            e.preventDefault(); tabs[nxt].click(); return;
        }
        if (/^[1-9]$/.test(k)) {
            const botones = [...menu.querySelectorAll("button")].filter((b) => !b.disabled && !b.hasAttribute("data-volver") && !b.hasAttribute("data-sec"));
            const b = botones[Number(k) - 1];
            if (b) { e.preventDefault(); b.click(); }
        }
    }

    return { iniciar };
})();
