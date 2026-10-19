/* =========================================================
   ENCUENTROS MISTERIOSOS · como los de PokéRogue
   Cada día, en algunas rutas ya abiertas aparece algo fuera de lo normal: un cofre misterioso (¿premio o trampa?), un
   arbusto lleno de bayas que alguien vigila, un vendedor de Pokémon, un vendedor de vitaminas de dudosa fama, una
   terminal de intercambio (GTS), unas rebajas de un día, una sesión de entrenamiento, un sueño extraño, una boya a la
   deriva (junto al agua) y una excursión escolar. Cada uno se puede hacer una vez ese día.
   Gráficos y música: PokéRogue (images/mystery-encounters y sus temas).
   ========================================================= */

const ME = (n) => "images/mystery-encounters/" + n;
const hoyMisterio = () => new Date().toISOString().slice(0, 10);
// Lo de hoy: { idLugar: tipo } en hasta tres rutas o zonas a las que ya se puede ir (siempre igual ese día).
let _misterios = null;
function misteriosHoy() {
    const dia = hoyMisterio(), k = `${dia}:${nMedallas()}:${entrenador.creada || 0}`;
    if (_misterios && _misterios.k === k) return _misterios.mapa;
    const rnd = semilla("misterios:" + k);
    const lugares = Object.values(LUGARES).filter((L) => tieneHierba(L) && L.nivel && L.med <= nMedallas() && !bloqueoDe(L));
    const tipos = Object.keys(MISTERIOS).filter((t) => !MISTERIOS[t].si || MISTERIOS[t].si());
    const baraja = (l) => { for (let i = l.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [l[i], l[j]] = [l[j], l[i]]; } return l; };
    baraja(lugares); baraja(tipos);
    const mapa = {}, libres = [...lugares];
    for (const t of tipos) {   // (cada uno en un sitio que le vaya: la boya, junto al agua)
        if (Object.keys(mapa).length >= 3) break;
        const i = libres.findIndex((L) => !MISTERIOS[t].donde || MISTERIOS[t].donde(L));
        if (i >= 0) { mapa[libres[i].id] = t; libres.splice(i, 1); }
    }
    _misterios = { k, mapa };
    return mapa;
}
function estadoMisterios() {
    const dia = hoyMisterio();
    if (!entrenador.misterios || entrenador.misterios.dia !== dia) entrenador.misterios = { dia, hechos: [] };
    return entrenador.misterios;
}
const misterioAqui = (L) => { const t = misteriosHoy()[L.id]; return t && !estadoMisterios().hechos.includes(L.id) ? t : null; };
function marcarMisterio(L) {
    const e = estadoMisterios(); if (!e.hechos.includes(L.id)) e.hechos.push(L.id);
    entrenador.misteriosHechos = (entrenador.misteriosHechos || 0) + 1;
    guardarEntrenador();
}
const rndDe = (L, que) => semilla(`misterio:${que}:${hoyMisterio()}:${L.id}:${entrenador.creada || 0}`);
// Un Pokémon que se recibe (comprado o intercambiado): al equipo si cabe; si no, a la Caja.
function darPokemon(id, nivel, L, { shiny = false, habSlot = null } = {}) {
    entrenador.capturados[id] = { nivel, xp: 0, objeto: null, bola: "poke-ball", movimientos: null, nivelCaptura: nivel, genero: generoAleatorio(id),
        naturaleza: naturalezaAleatoria(), habSlot: habSlot || (Math.random() < 0.5 ? 1 : 2), lugarCaptura: L.id, recibido: true, shiny: !!shiny };
    marcarVisto(id);
    if (entrenador.equipo.length < 6) entrenador.equipo.push(id);
    asegurarMovimientos(id);
    guardarEntrenador();
    return entrenador.equipo.includes(id);
}

// ===================== LOS ENCUENTROS =====================
// atlas: el sprite (PokéRogue) · musica: su tema · titulo y desc: la tarjeta de la ruta · iniciar(L): lo que pasa
const MISTERIOS = {
    cofre: {
        atlas: (L) => ME(rndDe(L, "cofre")() < 0.5 ? "mysterious_chest_red" : "mysterious_chest_blue"), musica: "mystery_encounter_weird_dream",
        titulo: "Un cofre misterioso", desc: "Hay un cofre abandonado en mitad del camino.",
        async iniciar(L) {
            const atlas = this.atlas(L), fondo = fondoDe(L);
            const r = await conversar({ atlas, modoAtlas: "fijo", fondo, lineas: ["En mitad del camino hay un cofre viejo y cubierto de musgo.", "Parece que nadie lo ha abierto en mucho tiempo…"],
                pregunta: "¿Qué haces?", opciones: ["Abrirlo", "Dejarlo"] });
            if (r !== 0) return;
            marcarMisterio(L);
            // Un tercio de las veces no es un cofre: es un Gimmighoul (como en PokéRogue).
            if (rndDe(L, "trampa")() < 0.33) {
                await conversar({ atlas, modoAtlas: "una", fondo, lineas: [{ txt: "¡El cofre se ha movido solo!", emote: "!" }, "¡No era un cofre! ¡Era un Pokémon!"] });
                return combateSalvajeLugar(L, { id: 999, nivel: limitar(L.nivel[1] + 3, 5, 100), shiny: Math.random() < probShiny() }, {
                    alGanar: () => { const k = alAzar(["nugget", "big-nugget", "rare-candy"]); meterObjeto(k); return [[k, 1]]; } });
            }
            const raros = ["ability-capsule", alAzar(Object.keys(MENTAS)), "pp-max", "max-revive"];
            const comunes = nMedallas() >= 8 ? ["nugget", "rare-candy", "pp-up", "ultra-ball", "max-revive", "big-pearl", "star-piece"] : ["nugget", "rare-candy", "great-ball", "revive", "pearl", "stardust"];
            const r2 = rndDe(L, "premio")(), k = r2 < 0.02 ? "master-ball" : r2 < 0.2 ? raros[Math.floor(r2 * 100) % raros.length] : comunes[Math.floor(r2 * 1000) % comunes.length];
            const n = k === "ultra-ball" || k === "great-ball" ? 3 : 1;
            await conversar({ atlas, modoAtlas: "una", fondo, lineas: ["Abres el cofre con cuidado…", `¡Dentro había ${n > 1 ? `${n}× ` : ""}${obj(k).nombre}!`] });
            darObjetos([[k, n]]); AudioFX.efecto("item_fanfare"); guardarEntrenador(); renderAventura();
        },
    },
    bayas: {
        atlas: () => ME("berries_abound_bush"), musica: null,
        titulo: "Un arbusto lleno de bayas", desc: "Está cargado de bayas… y algo se mueve entre las hojas.",
        async iniciar(L) {
            const fondo = fondoDe(L);
            const r = await conversar({ atlas: this.atlas(L), modoAtlas: "fijo", fondo, lineas: ["Un arbusto enorme rebosa de bayas maduras.", { txt: "Pero algo se mueve entre las hojas… Parece que alguien las vigila.", emote: "!" }],
                pregunta: "¿Qué haces?", opciones: ["Coger todas las que pueda", "Coger unas pocas con cuidado", "Irse"] });
            if (r === 2 || r == null) return;
            marcarMisterio(L);
            if (r === 1) {
                const k = alAzar(["oran-berry", "pecha-berry", "cheri-berry", "rawst-berry"]);
                darObjetos([[k, 2]]); AudioFX.efecto("item_fanfare"); toast(`Coges 2× ${obj(k).nombre} sin hacer ruido.`, 3200); return renderAventura();
            }
            // El que las vigila sale a defenderlas: más fuerte de lo normal (y a veces furioso).
            const s = await salvajeDeLugar(L);
            s.nivel = limitar(L.nivel[1] + 2, 2, 100);
            return combateSalvajeLugar(L, s, { furia: 0.3, alGanar: () => {
                const lista = [["sitrus-berry", 2], ["lum-berry", 1], [alAzar(["liechi-berry", "salac-berry", "petaya-berry", "ganlon-berry", "apicot-berry"]), 1]].filter(([k]) => OBJETOS[k]);
                return darObjetos(lista);
            } });
        },
    },
    vendedor: {
        atlas: () => ME("pokemon_salesman"), musica: "mystery_encounter_fun_and_games",
        titulo: "Un vendedor de Pokémon", desc: "Un hombre trajeado te hace señas desde el borde del camino.",
        async iniciar(L) {
            const rnd = rndDe(L, "vendedor"), [min, max] = L.nivel;
            let pool = []; try { pool = (await poolDeTipos(BIOMAS[L.bioma].tipos, min, max + 5)).filter((id) => !entrenador.capturados[id] && !esLegendario(id)); } catch (_) {}
            if (!pool.length) { await conversar({ atlas: this.atlas(L), fondo: fondoDe(L), lineas: ["«Vaya, ya tienes todos los Pokémon que yo vendo por aquí. ¡Otro día será!»"] }); return marcarMisterio(L), renderAventura(); }
            const id = pool[Math.floor(rnd() * pool.length)], shiny = rnd() < 0.08, oculta = !shiny && rnd() < 0.35, nivel = max;
            const precio = Math.round((2500 + nivel * 180) * (shiny ? 3 : oculta ? 1.5 : 1) / 100) * 100;
            const extra = shiny ? " ¡Y es de un color rarísimo, variocolor!" : oculta ? " Y tiene una habilidad poco común." : "";
            const r = await conversar({ atlas: this.atlas(L), fondo: fondoDe(L), lineas: [{ txt: "«¡Psst! ¡Eh, tú! Sí, tú. Tengo algo que te va a interesar.»", emote: "!" },
                `«Un ${nombrePk(id)} de nivel ${nivel}, sano y bien cuidado.${extra}»`],
                pregunta: `«Te lo dejo en ${dineroTexto(precio)}. ¿Trato hecho?»`, opciones: ["Comprarlo", "No, gracias"] });
            if (r !== 0) return;
            if ((entrenador.dinero || 0) < precio) { AudioFX.ui("error"); toast("No tienes dinero suficiente.", 2600); return; }
            entrenador.dinero -= precio; marcarMisterio(L);
            const enEquipo = darPokemon(id, nivel, L, { shiny, habSlot: oculta ? 3 : null });
            AudioFX.fanfarria(MUSICA.captura);
            toast(`¡${nombrePk(id)} se une a ${enEquipo ? "tu equipo" : "tu Caja"}!`, 3200);
            renderAventura();
        },
    },
    vitaminas: {
        atlas: () => ME("shady_vitamin_dealer"), musica: "mystery_encounter_delibirdy",
        titulo: "Un vendedor de vitaminas", desc: "Vende vitaminas muy baratas… quizá demasiado.",
        async iniciar(L) {
            const precio = 9000, lote = [0, 1, 2].map(() => alAzar(Object.keys(VITAMINAS)));
            const r = await conversar({ atlas: this.atlas(L), fondo: fondoDe(L), lineas: ["«¡Vitaminas! ¡Vitaminas de primera, a un tercio de su precio!»", "«Tres frascos por solo " + dineroTexto(precio) + ". No preguntes de dónde salen.»"],
                pregunta: "¿Le compras el lote?", opciones: ["Comprar el lote", "No, gracias"] });
            if (r !== 0) return;
            if ((entrenador.dinero || 0) < precio) { AudioFX.ui("error"); toast("No tienes dinero suficiente.", 2600); return; }
            entrenador.dinero -= precio; marcarMisterio(L);
            if (rndDe(L, "timo")() < 0.25) {
                await conversar({ atlas: this.atlas(L), fondo: fondoDe(L), lineas: ["El vendedor se marcha a toda prisa…", { txt: "¡Los frascos estaban vacíos! Te ha timado.", emote: "!" }] });
                return renderAventura();
            }
            const cuenta = {}; lote.forEach((k) => { cuenta[k] = (cuenta[k] || 0) + 1; });
            const dados = darObjetos(Object.entries(cuenta));
            AudioFX.efecto("item_fanfare"); toast("Recibes: " + textoPremios(dados), 3600); renderAventura();
        },
    },
    intercambio: {
        atlas: () => ME("global_trade_system"), musica: "mystery_encounter_gen_5_gts",
        titulo: "Una terminal de intercambio", desc: "Alguien de otra región ofrece un Pokémon por uno de los tuyos.",
        si: () => Object.keys(entrenador.capturados || {}).length >= 2,
        async iniciar(L) {
            const rnd = rndDe(L, "gts"), base = Math.max(...entrenador.equipo.map((id) => entrenador.capturados[id].nivel || 5));
            const pool = poolBatalla().map((p) => p.id).filter((id) => !entrenador.capturados[id] && !esLegendario(id) && especieApta(id, Math.max(2, base - 15), base));
            if (!pool.length) { await conversar({ atlas: this.atlas(L), fondo: fondoDe(L), lineas: ["La terminal no tiene ofertas ahora mismo."] }); return; }
            const id = pool[Math.floor(rnd() * pool.length)];
            const r = await conversar({ atlas: this.atlas(L), modoAtlas: "fijo", fondo: fondoDe(L), lineas: ["Es una terminal del Sistema de Intercambio Global (GTS).", `Alguien de otra región ofrece un ${nombrePk(id)} a cambio de uno de tus Pokémon.`],
                pregunta: "¿Quieres hacer el intercambio?", opciones: ["Elegir a quién cambiar", "No, gracias"] });
            if (r !== 0) return;
            if (entrenador.equipo.length < 2) { toast("Necesitas al menos dos Pokémon en el equipo.", 2600); return; }
            const quien = await elegirDelEquipo(`¿Qué Pokémon cambias por ${nombrePk(id)}?`, {});
            if (quien == null) return;
            const e = entrenador.capturados[quien], nivel = e.nivel || 5;
            if (e.objeto) meterObjeto(e.objeto);
            delete entrenador.capturados[quien];
            entrenador.equipo = entrenador.equipo.filter((x) => x !== quien);
            if (entrenador.starter === quien) entrenador.starter = id;
            marcarMisterio(L);
            darPokemon(id, nivel, L);
            AudioFX.fanfarria(MUSICA.captura);
            toast(`¡Has cambiado a ${nombrePk(quien)} por ${nombrePk(id)}!`, 3200);
            // Como en los juegos: los que evolucionan al intercambiarse, evolucionan al llegar.
            try {
                for (const rama of await ramasEvolucion(id)) {
                    if (rama.det.some((d) => d.trigger && d.trigger.name === "trade" && !d.held_item && !d.trade_species) && !entrenador.capturados[rama.aId]) {
                        await completarEvolucion(id, rama.aId);
                        break;
                    }
                }
            } catch (_) {}
            renderAventura();
        },
    },
    rebajas: {
        atlas: () => ME("department_store_sale_lady"), musica: "mystery_encounter_gen_6_gts",
        titulo: "Rebajas de un día", desc: "Una dependienta ha montado un puesto con productos a mitad de precio.",
        async iniciar(L) {
            const rnd = rndDe(L, "rebajas");
            const stock = [...new Set(CATEGORIAS_TIENDA.flatMap((c) => stockTienda(c)))].filter((k) => obj(k).bolsillo !== "mt" && obj(k).compra >= 1000);
            const ofertas = [];
            while (ofertas.length < 3 && stock.length) ofertas.push(stock.splice(Math.floor(rnd() * stock.length), 1)[0]);
            if (!ofertas.length) return;
            const precio = (k) => Math.round(obj(k).compra / 2);
            const r = await conversar({ atlas: this.atlas(L), fondo: fondoDe(L), lineas: [{ txt: "«¡Rebajas! ¡Solo hoy, todo a mitad de precio!»", emote: "!" }, "«Puedes llevarte una cosa. ¡Elige bien!»"],
                pregunta: "«¿Qué te llevas?»", opciones: ofertas.map((k) => `${obj(k).nombre} (${dineroTexto(precio(k))})`).concat(["Nada, gracias"]) });
            if (r == null || r >= ofertas.length) return;
            const k = ofertas[r];
            if ((entrenador.dinero || 0) < precio(k)) { AudioFX.ui("error"); toast("No tienes dinero suficiente.", 2600); return; }
            entrenador.dinero -= precio(k); meterObjeto(k); marcarMisterio(L);
            AudioFX.efecto("buy"); toast(`Compras ${obj(k).nombre} por ${dineroTexto(precio(k))}.`, 3000); renderAventura();
        },
    },
    entrenamiento: {
        atlas: () => ME("training_session_gear"), musica: null,
        titulo: "Una sesión de entrenamiento", desc: "Alguien ha dejado material para entrenar junto al camino.",
        async iniciar(L) {
            const r = await conversar({ atlas: this.atlas(L), modoAtlas: "fijo", fondo: fondoDe(L), lineas: ["Junto al camino hay material de entrenamiento y un cartel:", "«Combate de práctica: un solo Pokémon contra un rival muy fuerte. Si gana, se hará más fuerte.»"],
                pregunta: "¿Haces la sesión?", opciones: ["Elegir a un Pokémon", "Ahora no"] });
            if (r !== 0) return;
            const id = await elegirDelEquipo("¿Quién entrena?", { valido: (x) => (entrenador.capturados[x].hp === 0 ? "Está debilitado." : null) });
            if (id == null) return;
            marcarMisterio(L);
            return entrenamientoMisterio(L, id);
        },
    },
    sueno: {
        atlas: () => ME("weird_dream_woman"), musica: "mystery_encounter_weird_dream",
        titulo: "Un sueño extraño", desc: "Una mujer misteriosa te mira fijamente desde la niebla.",
        si: () => Object.keys(entrenador.capturados || {}).length >= 2,
        async iniciar(L) {
            const r = await conversar({ atlas: this.atlas(L), fondo: fondoDe(L), lineas: [{ txt: "«Qué sueño tan extraño… Tus Pokémon podrían soñar con ser otros.»", emote: "!" },
                "«Si quieres, uno de ellos despertará convertido en un Pokémon distinto. Nadie sabe en cuál.»"],
                pregunta: "¿Dejas que uno de tus Pokémon sueñe?", opciones: ["Sí, elegir a quién", "No, gracias"] });
            if (r !== 0) return;
            const id = await elegirDelEquipo("¿Quién va a soñar?", {});
            if (id == null) return;
            const e = entrenador.capturados[id], nivel = e.nivel || 5;
            const pool = poolBatalla().map((p) => p.id).filter((x) => !entrenador.capturados[x] && !esLegendario(x) && especieApta(x, Math.max(2, nivel - 5), nivel + 5));
            if (!pool.length) return;
            const nuevo = alAzar(pool);
            marcarMisterio(L);
            delete entrenador.capturados[id];
            e.movimientos = null; e.olvidados = []; e.habSlot = Math.random() < 0.5 ? 1 : 2; e.genero = generoAleatorio(nuevo); delete e.hp; e.estado = null;
            entrenador.capturados[nuevo] = e;
            entrenador.equipo = entrenador.equipo.map((x) => (x === id ? nuevo : x));
            if (entrenador.starter === id) entrenador.starter = nuevo;
            if (entrenador.metro && Array.isArray(entrenador.metro.equipo)) entrenador.metro.equipo = entrenador.metro.equipo.map((x) => (x === id ? nuevo : x));
            marcarVisto(nuevo); asegurarMovimientos(nuevo); guardarEntrenador();
            await conversar({ pokemon: nuevo, fondo: fondoDe(L), lineas: [`${nombrePk(id)} se queda dormido… y al despertar…`, { txt: `¡Se ha convertido en ${nombrePk(nuevo)}!`, emote: "!" }] });
            renderAventura();
        },
    },
    boya: {
        atlas: () => ME("lost_at_sea_buoy"), musica: null,
        titulo: "Una boya a la deriva", desc: "Alguien pide ayuda desde una boya que se aleja de la orilla.",
        donde: (L) => BIOMAS_AGUA.has(L.bioma),
        async iniciar(L) {
            const r = await conversar({ atlas: this.atlas(L), modoAtlas: "fijo", fondo: fondoDe(L), lineas: [{ txt: "«¡Socorro! ¡La corriente me arrastra!»", emote: "!" }, "Un pescador se ha quedado atrapado en una boya. Un Pokémon de tipo Agua podría remolcarla hasta la orilla."],
                pregunta: "¿Le ayudas?", opciones: ["Mandar a un Pokémon de tipo Agua", "No puedo"] });
            if (r !== 0) return;
            const nadadores = [];
            await Promise.all(entrenador.equipo.map(async (id) => { try { if ((await cargarPokemon(id)).types.some((t) => t.type.name === "water") && entrenador.capturados[id].hp !== 0) nadadores.push(id); } catch (_) {} }));
            if (!nadadores.length) { await conversar({ atlas: this.atlas(L), modoAtlas: "fijo", fondo: fondoDe(L), lineas: ["Ninguno de tus Pokémon puede nadar con esta corriente. Habrá que volver con uno de tipo Agua."] }); return; }
            const id = nadadores.sort((a, b) => (entrenador.capturados[b].nivel || 0) - (entrenador.capturados[a].nivel || 0))[0];
            marcarMisterio(L);
            const premios = darObjetos([["big-pearl", 1], [alAzar(["pearl-string", "nugget", "star-piece"]), 1]]);
            const exp = 40 * (entrenador.capturados[id].nivel || 5);
            await conversar({ pokemon: id, fondo: fondoDe(L), lineas: [`¡${nombreDe(id)} se lanza al agua y remolca la boya hasta la orilla!`, "«¡Gracias, de verdad! Toma esto, es lo único de valor que llevo encima.»"] });
            AudioFX.efecto("item_fanfare"); toast(`Recibes: ${textoPremios(premios)}. ¡${nombreDe(id)} gana experiencia!`, 3600);
            await subirExpFuera(id, exp);
            renderAventura();
        },
    },
    excursion: {
        atlas: () => ME("field_trip_teacher"), musica: null,
        titulo: "Una excursión escolar", desc: "Una profesora y sus alumnos quieren ver un movimiento de cerca.",
        async iniciar(L) {
            const cat = alAzar(["fis", "esp", "est"]), nombreCat = { fis: "físico", esp: "especial", est: "de estado" }[cat];
            const r = await conversar({ atlas: this.atlas(L), fondo: fondoDe(L), lineas: ["«¡Hola! Estamos de excursión estudiando los movimientos de los Pokémon.»", `«¿Podrías enseñarles a mis alumnos un movimiento ${nombreCat}?»`],
                pregunta: "¿Les enseñas uno?", opciones: ["Elegir a un Pokémon", "Ahora no"] });
            if (r !== 0) return;
            const id = await elegirDelEquipo(`¿Quién enseña un movimiento ${nombreCat}?`, {});
            if (id == null) return;
            await asegurarMovimientos(id);
            const mv = (entrenador.capturados[id].movimientos || []).find((m) => m.cat === cat);
            marcarMisterio(L);
            if (!mv) { await conversar({ atlas: this.atlas(L), fondo: fondoDe(L), lineas: [`«Vaya… ${nombreDe(id)} no conoce ningún movimiento ${nombreCat}. ¡Otra vez será!»`] }); return renderAventura(); }
            const premio = { fis: [["x-attack", 2], ["x-defense", 1]], esp: [["x-sp-atk", 2], ["x-sp-def", 1]], est: [["x-speed", 2], ["max-ether", 1]] }[cat].filter(([k]) => OBJETOS[k]);
            const dados = darObjetos(premio);
            await conversar({ atlas: this.atlas(L), fondo: fondoDe(L), lineas: [`¡${nombreDe(id)} usa ${mv.nombre}! Los alumnos aplauden entusiasmados.`, "«¡Qué maravilla! Tomad, un regalo de toda la clase.»"] });
            AudioFX.efecto("item_fanfare"); toast("Recibes: " + textoPremios(dados), 3200); renderAventura();
        },
    },
};
// Sesión de entrenamiento: un solo Pokémon (con todos sus PS: es práctica) contra uno de la zona mucho más fuerte, sin
// capturas ni dinero en juego. Si gana: experiencia y esfuerzo en sus dos mejores características; después vuelve curado.
async function entrenamientoMisterio(L, id) {
    try {
        mostrarCargaBatalla();
        const s = await salvajeDeLugar(L);
        const mio = (await specsMiEquipo(false)).filter((x) => x.id === id), objetoAntes = entrenador.capturados[id].objeto || null;
        const [aliados, enemigos] = await Promise.all([prepararEquipo(mio), prepararEquipo([{ id: s.id, nivel: limitar(Math.max(L.nivel[1], mio[0].nivel) + 4, 2, 100) }])]);
        marcarVisto(s.id);
        Combate.iniciar({
            aliados, enemigos, salvaje: true, permitirCaptura: false, titulo: "Práctica", fondo: fondoDe(L), ia: dificultad().ia,
            bolsa: entrenador.mochila, guardarBolsa: guardarEntrenador, evolucionar: evolucionarEnCombate,
            darXP: true, expShare: () => false, generoJugador: entrenador.genero,
            alTerminar: async (r) => {
                sincronizarEquipoCombate(r.equipo);
                const e = entrenador.capturados[id] ? id : (r.equipo[0] && r.equipo[0].baseId);   // (por si ha evolucionado)
                const c = entrenador.capturados[e];
                if (c) { delete c.hp; c.estado = null; c.objeto = objetoAntes; }   // (era práctica: vuelve curado y con su objeto)
                if (r.gano && c) {
                    let b = {}; try { (await cargarPokemon(e)).stats.forEach((x) => { b[x.stat.name] = x.base_stat; }); } catch (_) { b = { attack: 1, speed: 1 }; }
                    const mejores = Object.keys(b).sort((x, y) => b[y] - b[x]).slice(0, 2);
                    c.ev = c.ev || {};
                    const total = () => Object.values(c.ev).reduce((t, v) => t + v, 0);
                    mejores.forEach((k) => { c.ev[k] = Math.min(EV_MAX, (c.ev[k] || 0) + Math.min(12, EV_TOTAL - total())); });
                    toast(`¡${nombreDe(e)} ha superado la sesión! Gana esfuerzo en ${mejores.map((k) => EV_TXT[k] || k).join(" y ")}.`, 3800);
                } else if (r.gano === false) toast("La sesión ha sido demasiado dura. ¡Otra vez será!", 3000);
                guardarEntrenador(); renderAventura();
            },
        });
    } catch (_) { errorCombate(); }
}
// Experiencia fuera de combate (la boya): sube de nivel si llega, sin escena.
async function subirExpFuera(id, cantidad) {
    const e = entrenador.capturados[id]; if (!e) return;
    let factor = 1; try { factor = await factorExpPokemon(id); } catch (_) {}
    e.xp = (e.xp || 0) + cantidad;
    while ((e.nivel || 1) < 100 && e.xp >= xpNecesaria(e.nivel || 1, factor)) { e.xp -= xpNecesaria(e.nivel || 1, factor); e.nivel = (e.nivel || 1) + 1; }
    guardarEntrenador();
}
// Tarjeta de la ruta (si hoy hay algo aquí).
function tarjetaMisterioHTML(L) {
    const t = misterioAqui(L); if (!t) return "";
    const M = MISTERIOS[t];
    return `<article class="lg-tarjeta lg-evento lg-misterio">
        <canvas class="lg-npc" data-atlas="${M.atlas(L)}"></canvas>
        <div class="lg-info"><span class="hub-etq">Encuentro misterioso</span><h4>${M.titulo}</h4><p>${M.desc}</p></div>
        <button class="btn-grande" data-misterio>Acercarse</button>
    </article>`;
}
async function iniciarMisterio(L) {
    const t = misterioAqui(L); if (!t) return;
    const M = MISTERIOS[t];
    if (M.musica) AudioFX.musicaSonar(mus(M.musica));
    try { await M.iniciar(L); } finally { if (subAventura === "principal" && !document.querySelector(".capa-batalla:not(.oculta)")) AudioFX.musicaSonar(musicaDe(L)); }
}
