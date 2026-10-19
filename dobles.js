/* =========================================================
   COMBATES DOBLES · dos contra dos, como en los juegos desde Rubí y Zafiro
   - Cada uno de tus dos Pokémon elige su movimiento y a qué rival ataca; los movimientos que alcanzan a varios
     (Terremoto, Surf, Onda Ígnea, Avalancha…) golpean a todos los que tocan con un 25 % menos de daño, Terremoto y Surf
     también a tu compañero. Protección, cambios de Pokémon, Megaevolución y Teracristal (uno por combate).
   - Usa el motor de siempre para lo que no cambia: el cálculo de daño (con habilidades, objetos, tiempo y pantallas),
     los estados, las animaciones de los movimientos (PokéRogue o Showdown), los sprites y los sonidos.
   - Lo juegan las parejas de entrenadores de las rutas (Gemelas, Parejas, Hermanas Misteriosas) y el Combate rápido
     en formato doble.
   ========================================================= */

const Dobles = (() => {
    let capa = null, opts = null, activo = false, turno = 1, msgTok = 0;
    let lados = null;   // { a: { equipo, en: [c, c] }, r: { … } }
    const poder = { a: null, r: null };
    const objetivos = new Map();   // clave del movimiento → a quién alcanza (PokéAPI: selected-pokemon, all-opponents…)
    let causaD = null, cantoD = null;   // el bando que provocó la última caída (Explosión, Mismo Destino) y el que cantó Canto Mortal
    let colaTurno = null;               // los movimientos del turno en curso (Cede Paso y Último Lugar la reordenan)
    let acabando = false, elegirAuto = null, relojD = null;
    // Multijugador: los empates no pueden depender del azar de cada partida (primero el anfitrión y, en cada bando, el hueco izquierdo).
    const desempate = (c) => (opts.pvp ? ((ladoDe(c) === "a") === opts.pvp.anfitrion ? 0.004 : 0) + (huecoDe(c) === 0 ? 0.002 : 0) : Math.random() * 0.01);
    const $ = (s) => capa && capa.querySelector(s);
    const otro = (l) => (l === "a" ? "r" : "a");
    const vivos = (l) => lados[l].en.filter((c) => c && c.hp > 0);
    const banquillo = (l) => lados[l].equipo.filter((c) => c.hp > 0 && !lados[l].en.includes(c));
    const ladoDe = (c) => (lados.a.equipo.includes(c) ? "a" : "r");
    const huecoDe = (c) => lados[ladoDe(c)].en.indexOf(c);
    const spriteDe = (c) => document.getElementById(`dbl-spr-${ladoDe(c)}${huecoDe(c)}`);
    const enCampo = (c) => !!c && huecoDe(c) >= 0;
    const MEGA_ORBE = prURL("images/battle_anims/PRAS- MegaEvo.png"), MEGA_SON = (n) => prURL(`audio/battle_anims/PRSFX- Mega Evolution${n}.wav`);

    // ---------- Mensajes ----------
    async function decir(txt, ms = 850) {
        if (!activo) return;
        anunciarSR(txt);
        const el = $(".mensaje-batalla"); if (!el) return;
        const tok = ++msgTok;
        el.textContent = "";
        const paso = Math.max(1, Math.ceil(txt.length / Math.max(8, (ms / velJuego()) * 0.45 / 16)));
        await new Promise((res) => {
            let i = 0;
            const iv = setInterval(() => {
                if (tok !== msgTok || !activo) { clearInterval(iv); return res(); }
                i = Math.min(txt.length, i + paso); el.textContent = txt.slice(0, i);
                if (i >= txt.length) { clearInterval(iv); res(); }
            }, 16);
        });
        await esperar(ms);
    }
    const ponerMensaje = (t) => { const el = $(".mensaje-batalla"); if (el) { msgTok++; el.textContent = t; } };

    // ---------- Escena ----------
    function construir() {
        capa = document.getElementById("capa-batalla");
        capa.classList.remove("oculta", "cerrando", "en-transicion", "horizontal", "compacta");
        capa.classList.add("dbl");
        document.body.style.overflow = "hidden";
        const hueco = (l, i) => `<div class="dbl-puesto dbl-${l}${i}"><div class="dbl-sombra"></div><img class="sprite dbl-sprite" id="dbl-spr-${l}${i}" alt=""></div>`;
        capa.innerHTML = `
            <div class="batalla-escena dbl-escena">
                <div class="fondo-batalla"><img class="fondo-img" src="${urlFondo(opts.fondo || "route")}" alt=""></div>
                <div class="clima-fondo" id="dbl-clima"></div>
                <div class="capa-anim-fondo" id="dbl-anim-fondo"></div>
                <div class="capa-anim-detras" id="dbl-anim-detras"></div>
                ${hueco("r", 0)}${hueco("r", 1)}${hueco("a", 0)}${hueco("a", 1)}
                <div class="caja-hp dbl-caja dbl-caja-r0" data-caja="r0"></div><div class="caja-hp dbl-caja dbl-caja-r1" data-caja="r1"></div>
                <div class="caja-hp dbl-caja dbl-caja-a0" data-caja="a0"></div><div class="caja-hp dbl-caja dbl-caja-a1" data-caja="a1"></div>
                <div class="capa-efectos" id="dbl-efectos"></div>
                <span class="dbl-formato">${opts.pvp ? "Combate doble online" : "Combate doble"}</span>
                <div class="reloj-pvp dbl-reloj oculta" id="dbl-reloj" title="Tiempo para elegir"></div>
            </div>
            <div class="batalla-ui">
                <div class="mensaje-batalla" id="mensaje-batalla"></div>
                <div class="acciones-batalla" id="acciones-batalla"></div>
                <div class="menu-moves oculta" id="menu-moves"></div>
            </div>`;
    }
    const zoom = () => { const e = $(".dbl-escena"); return e ? limitar(Math.round(Math.min(e.clientWidth / 340, e.clientHeight / 230) * 4) / 4, 1.25, 3.5) : 2; };
    function cajaHTML(c, l) {
        const pct = (c.hp / c.hpMax) * 100, color = pct > 50 ? "verde" : pct > 20 ? "amarillo" : "rojo";
        const genero = c.genero ? `<span class="hp-genero ${c.genero}">${c.genero === "f" ? "♀" : "♂"}</span>` : "";
        const etapas = Object.entries(c.etapas || {}).filter(([, v]) => v).map(([k, v]) => `<span class="hp-etapa ${v > 0 ? "sube" : "baja"}">${ABREV_STAT[k]} ${v > 0 ? "+" : "−"}${Math.abs(v)}</span>`).join("");
        return `<div class="caja-tipos">${c.tipos.map((t) => iconoTipo(t, 2)).join("")}</div>
            <div class="caja-etapas">${etapas}</div>
            <div class="hp-cabecera"><span class="hp-nombre">${c.nombre}</span>${genero}${c.teracristal ? `<img class="hp-tera" src="${urlTera(c.teracristal)}" alt="">` : ""}
                <span class="hp-hueco">${c.estado ? `<span class="hp-estado">${iconoEstado(c.estado.grave ? "tox" : c.estado.tipo, 2)}</span>` : ""}</span>
                <span class="hp-nivel"><small>Nv.</small>${c.nivel}</span></div>
            <div class="hp-fila"><span class="hp-etq">PS</span><div class="hp-barra"><span class="hp-relleno ${color}" style="width:${pct}%"></span></div></div>
            ${l === "a" ? `<div class="hp-pie"><div class="hp-num"><b>${c.hp}</b><span>/${c.hpMax}</span></div></div>` : ""}`;
    }
    function pintarCaja(l, i) {
        const el = $(`[data-caja="${l}${i}"]`), c = lados[l].en[i]; if (!el) return;
        if (!c || c.hp <= 0) { el.classList.add("fuera"); return; }
        el.classList.remove("fuera"); el.dataset.tipo = c.tipos[0];
        el.innerHTML = cajaHTML(c, l);
    }
    const pintarCajas = () => ["a", "r"].forEach((l) => [0, 1].forEach((i) => pintarCaja(l, i)));
    async function montar(l, i, visible = true) {
        const c = lados[l].en[i]; let el = document.getElementById(`dbl-spr-${l}${i}`); if (!el) return;
        if (!c) { el.style.opacity = "0"; return; }
        el.style.opacity = "0";
        el = await montarPokemon(el, c.baseId, { espalda: l === "a", shiny: c.shiny, mega: c.megaInfo || null }).catch(() => el);
        el = document.getElementById(`dbl-spr-${l}${i}`) || el;
        const e = $(".dbl-escena"), z = zoom() * (l === "a" ? 1.25 : 1);
        tamanoNativo(el, z, e.clientHeight * (l === "a" ? 0.42 : 0.3), e.clientWidth * 0.26);
        el.classList.toggle("dbl-tera", !!c.teracristal);
        if (c.teracristal) el.style.setProperty("--tera", COLOR_TERA[c.teracristal] || "#fff");
        const puesto = el.parentNode; let corona = puesto && puesto.querySelector(".tera-corona-fija");
        if (c.teracristal && puesto && !corona) { corona = document.createElement("img"); corona.className = "tera-corona-fija dbl-corona"; corona.alt = ""; puesto.appendChild(corona); }
        if (corona) { if (c.teracristal) { corona.src = urlTera(c.teracristal); corona.style.setProperty("--tera", COLOR_TERA[c.teracristal] || "#fff"); corona.style.bottom = (el.offsetHeight + 4) + "px"; } else corona.remove(); }
        el.style.opacity = visible ? "1" : "0";
    }

    // ---------- Animaciones ----------
    function ctxAnim(at, def) {
        const la = ladoDe(at), sa = spriteDe(at), sd = def ? spriteDe(def) : sa;
        const conAliado = la === "a";
        const c = {
            escena: $(".dbl-escena"), delante: document.getElementById("dbl-efectos"), detras: document.getElementById("dbl-anim-detras"), fondo: document.getElementById("dbl-anim-fondo"),
            aliadoEl: conAliado ? sa : sd, enemigoEl: conAliado ? sd : sa, atacanteEsAliado: conAliado, zoom: zoom(),
            grito: (tono) => AudioFX.grito(at.baseId, { rate: (tono || 100) / 100, vol: 0.5 }), sigue: () => activo,
        };
        return c;
    }
    async function animarMov(at, mov, def) {
        const propio = !def || def === at;
        const ctx = ctxAnim(at, propio ? null : def);
        if (propio) { ctx.aliadoEl = ctx.enemigoEl = spriteDe(at); }
        const clave = ALIAS_ANIM[mov.clave] || mov.clave;
        const sd = config && config.animaciones === "showdown";
        const pr = () => AnimMov.reproducir(clave, ctx);
        const sh = () => MovSD.reproducir(mov.clave, Object.assign({}, ctx, { clave, sonidosDe: (k) => AnimMov.sonidos(k, ctx) }), { mismo: propio });
        try {
            for (const f of sd ? [sh, pr] : [pr, sh]) { if (await f()) return; if (!activo) return; }
            await AnimMov.reproducir(animReserva(mov), ctx);
        } catch (_) {}
    }
    function golpeado(c, fuerte) {
        const s = spriteDe(c); if (!s) return;
        s.classList.add("recibe"); setTimeout(() => s.classList.remove("recibe"), 520);
        const d = (ladoDe(c) === "a" ? -1 : 1) * Math.max(4, Math.round(s.offsetWidth * 0.045)) * (fuerte ? 1.5 : 0.7);
        s.animate([{ translate: "0 0" }, { translate: `${d}px 0`, offset: 0.2 }, { translate: `${-d * 0.25}px 0`, offset: 0.6 }, { translate: "0 0" }], { duration: 340 / velJuego() });
    }
    // Cada golpe estalla con el color de su tipo (como en el combate individual).
    function impacto(c, tipo, fuerte) {
        if (typeof config !== "undefined" && config.animModernas === false) return;
        const s = spriteDe(c), e = $(".dbl-escena"), cont = document.getElementById("dbl-efectos"); if (!s || !e || !cont || !s.offsetWidth) return;
        const rs = s.getBoundingClientRect(), re = e.getBoundingClientRect(), x = rs.left - re.left + rs.width / 2, y = rs.top - re.top + rs.height / 2;
        const color = COLOR_TIPO_DBL[tipo] || "#fff", z = zoom();
        const anillo = document.createElement("img"); anillo.src = dbkURL("Graphics/Plugins/Deluxe Battle Kit/pulse.png"); anillo.alt = ""; anillo.className = "poder-anillo";
        anillo.style.cssText = `left:${x}px;top:${y}px;width:${Math.round(48 * z)}px;filter:drop-shadow(0 0 ${Math.round(3 * z)}px ${color}) drop-shadow(0 0 ${Math.round(7 * z)}px ${color})`;
        cont.appendChild(anillo);
        anillo.animate([{ transform: "translate(-50%,-50%) scale(.3)", opacity: 1 }, { transform: `translate(-50%,-50%) scale(${fuerte ? 2 : 1.4})`, opacity: 0 }], { duration: 380 / velJuego(), fill: "forwards" })
            .finished.then(() => anillo.remove(), () => anillo.remove());
    }
    const COLOR_TIPO_DBL = { normal: "#a8a77a", fire: "#ee8130", water: "#6390f0", electric: "#f7d02c", grass: "#7ac74c", ice: "#96d9d6", fighting: "#c22e28",
        poison: "#a33ea1", ground: "#e2bf65", flying: "#a98ff3", psychic: "#f95587", bug: "#a6b91a", rock: "#b6a136", ghost: "#735797", dragon: "#6f35fc",
        dark: "#705746", steel: "#b7b7ce", fairy: "#d685ad" };
    function temblor(f = 1) {
        const e = $(".dbl-escena"); if (!e || (typeof config !== "undefined" && config.camara === false)) return;
        const a = 4 * f; e.animate([0, 1, 2, 3, 4, 5].map((i) => ({ translate: `${(i % 2 ? -a : a) * (1 - i / 6)}px 0` })).concat([{ translate: "0 0" }]), { duration: 300 / velJuego() });
    }
    function actualizarPS(c) {
        const l = ladoDe(c), i = huecoDe(c); if (i < 0) return;
        const el = $(`[data-caja="${l}${i}"]`); if (!el) return;
        const pct = Math.max(0, (c.hp / c.hpMax) * 100), r = el.querySelector(".hp-relleno");
        if (r) { r.style.width = pct + "%"; r.className = `hp-relleno ${pct > 50 ? "verde" : pct > 20 ? "amarillo" : "rojo"}`; }
        const n = el.querySelector(".hp-num b"); if (n) n.textContent = c.hp;
    }
    async function salida(c, l, i) {
        await montar(l, i, false);
        const s = document.getElementById(`dbl-spr-${l}${i}`); if (!s) return;
        AudioFX.efecto("pb_rel", { vol: 0.4 });
        s.style.opacity = "1";
        await s.animate([{ transform: "scale(.2)", filter: "brightness(3)", opacity: 0 }, { transform: "scale(1.05)", filter: "brightness(1.6)", opacity: 1, offset: 0.6 }, { transform: "scale(1)", filter: "brightness(1)" }],
            { duration: 420 / velJuego(), easing: "ease-out" }).finished.catch(() => {});
        AudioFX.grito(c.baseId, { vol: 0.5 });
        pintarCaja(l, i);
    }
    async function debilitar(c) {
        const s = spriteDe(c), l = ladoDe(c), i = huecoDe(c);
        AudioFX.grito(c.baseId, { rate: 0.8, vol: 0.5 });
        await esperar(300);
        AudioFX.efecto("faint");
        if (s) await s.animate([{ translate: "0 0", opacity: 1 }, { translate: "0 40px", opacity: 0 }], { duration: 450 / velJuego(), fill: "forwards", easing: "ease-in" }).finished.catch(() => {});
        await decir(`¡${c.nombre} se ha debilitado!`, 900);
        if (s) { s.getAnimations().forEach((a) => a.cancel()); s.style.opacity = "0"; }
        const caja = $(`[data-caja="${l}${i}"]`); if (caja) caja.classList.add("fuera");
        if (l === "r") await repartirXP(c);
    }

    // ---------- Experiencia ----------
    async function repartirXP(enemigo) {
        if (!opts.darXP) return;
        const total = Math.round(xpPorVictoria(enemigo) * 1.5);   // (de un entrenador, como en los juegos)
        for (const c of vivos("a")) {
            const n = c.objeto === "lucky-egg" ? Math.floor(total * 1.5) : total;
            await decir(`${c.nombre} ha ganado ${n} puntos de experiencia.`, 650);
            c.xp = (c.xp || 0) + n;
            while (c.nivel < 100 && c.xp >= c.xpProx) {
                c.xp -= c.xpProx; c.nivel++;
                const antes = c.hpMax, sd = statsDeNivel(c.base, c.nivel, c.ev, c.naturaleza);
                c.stats = sd.stats; c.hpMax = sd.hpMax; c.hp = Math.min(c.hpMax, c.hp + (c.hpMax - antes));
                c.xpProx = xpNecesaria(c.nivel, c.factorExp || 1);
                AudioFX.efecto("level_up_fanfare", { vol: 0.5 });
                pintarCaja("a", huecoDe(c));
                await decir(`¡${c.nombre} ha subido al nivel ${c.nivel}!`, 900);
            }
        }
    }

    // ---------- Estados y características ----------
    const puedeSufrir = (c, tipo, fuente) => c.hp > 0 && !c.estado && !inmuneEstadoHab(c, tipo, fuente) &&
        !(ESTADOS[tipo].inmunes.some((t) => c.tipos.includes(t)) && !(tipo === "env" && fuente && fuente.habilidad === "corrosion"));
    async function ponerEstado(c, e, fuente) {
        if (!puedeSufrir(c, e.tipo, fuente)) return false;
        c.estado = { tipo: e.tipo, turnos: e.tipo === "dor" ? entreC(1, 3) : 0, grave: !!e.grave, n: 0 };
        try { await AnimMov.reproducir(ESTADOS[e.tipo].anim, ctxAnim(c)); } catch (_) {}
        pintarCaja(ladoDe(c), huecoDe(c));
        await decir(ESTADOS[e.tipo].pone(c.nombre), 950);
        return true;
    }
    const BLOQUEA_BAJADAS = new Set(["clear-body", "white-smoke", "full-metal-body"]);
    async function cambiarEtapas(c, stats, fuente) {
        let alguno = false;
        for (const [k, v] of Object.entries(stats)) {
            if (c.hp <= 0) break;
            if (v < 0 && fuente && fuente !== c && BLOQUEA_BAJADAS.has(c.habilidad)) { await decir(`¡${c.nombre} no deja que le bajen las características!`, 900); continue; }
            const antes = c.etapas[k], ahora = limitar(antes + (c.habilidad === "contrary" ? -v : c.habilidad === "simple" ? v * 2 : v), -6, 6);
            const d = ahora - antes;
            if (!d) { await decir(`¡${NOMBRE_STAT[k][0].toUpperCase() + NOMBRE_STAT[k].slice(1)} de ${c.nombre} no puede ${v > 0 ? "subir" : "bajar"} más!`, 850); continue; }
            c.etapas[k] = ahora; alguno = true;
            AudioFX.efecto(d > 0 ? "stat_up" : "stat_down", { vol: 0.5 });
            pintarCaja(ladoDe(c), huecoDe(c));
            const cuanto = Math.abs(d) >= 3 ? "muchísimo" : Math.abs(d) === 2 ? "mucho" : "";
            await decir(`¡${NOMBRE_STAT[k][0].toUpperCase() + NOMBRE_STAT[k].slice(1)} de ${c.nombre} ha ${d > 0 ? "subido" : "bajado"}${cuanto ? " " + cuanto : ""}!`, 850);
            if (d < 0 && fuente && fuente !== c && (c.habilidad === "defiant" || c.habilidad === "competitive")) await cambiarEtapas(c, { [c.habilidad === "defiant" ? "atk" : "spa"]: 2 }, c);
        }
        return alguno;
    }
    async function curarPS(c, cant, txt) {
        if (c.hp <= 0 || c.hp >= c.hpMax) return false;
        c.hp = Math.min(c.hpMax, c.hp + Math.max(1, Math.floor(cant)));
        AudioFX.efecto("restore", { vol: 0.5 }); actualizarPS(c);
        if (txt) await decir(txt, 850);
        return true;
    }
    // Baya Zidra / Aranja al quedarse con poca vida.
    async function bayaCura(c) {
        if (c.hp <= 0) return;
        if (c.objeto === "sitrus-berry" && c.hp <= c.hpMax / 2) { c.objeto = null; await curarPS(c, c.hpMax / 4, `¡${c.nombre} ha recuperado PS con su Baya Zidra!`); }
        else if (c.objeto === "oran-berry" && c.hp <= c.hpMax / 2) { c.objeto = null; await curarPS(c, 10, `¡${c.nombre} ha recuperado PS con su Baya Aranja!`); }
    }
    async function entrar(c) {   // habilidades al salir: Intimidación y las que cambian el tiempo
        const l = ladoDe(c);
        if (c.habilidad === "intimidate") {
            await decir(`¡${c.nombre} intimida a sus rivales!`, 900);
            for (const r of vivos(otro(l))) {
                if (["inner-focus", "oblivious", "own-tempo", "scrappy", "hyper-cutter", "clear-body", "white-smoke", "full-metal-body"].includes(r.habilidad)) { await decir(`¡A ${r.nombre} no le afecta!`, 800); continue; }
                await cambiarEtapas(r, { atk: -1 }, c);
            }
        }
        const cl = CLIMA_HAB[c.habilidad];
        if (cl && (!CAMPO.clima || CAMPO.clima.tipo !== cl)) await ponerClima(cl, c);
    }
    async function ponerClima(tipo, c) {
        CAMPO.clima = { tipo, turnos: c && ROCA_CLIMA[c.objeto] === tipo ? 8 : 5 };
        pintarClima();
        try { await AnimMov.reproducir(CLIMAS[tipo].anim, ctxAnim(c || vivos("a")[0])); } catch (_) {}
        await decir(CLIMAS[tipo].empieza, 950);
    }
    function pintarClima() {
        const f = document.getElementById("dbl-clima"), t = CAMPO.clima && CAMPO.clima.tipo; if (!f) return;
        f.className = "clima-fondo" + (t ? " activo t-" + t : "");
        f.style.backgroundImage = t ? `url("${urlClimaFx(t)}")` : "";
    }

    // ---------- Poderes: Megaevolución y Teracristal ----------
    async function megaevolucionar(c) {
        const info = megaDeC(c), s = spriteDe(c); if (!info || !s) return;
        const antes = c.nombre, l = ladoDe(c);
        await decir(info.ascenso ? `¡El ferviente deseo de ${l === "a" ? entrenador.nombre || "su entrenador" : opts.titulo} ha llegado hasta ${antes}!`
            : `¡La ${obj(c.objeto).nombre} de ${antes} está reaccionando a la Piedra Activadora!`, 1300);
        AudioFX.sonar(MEGA_SON(1), { vol: 0.6 });
        // La esfera de energía de PokéRogue lo envuelve (sus 13 fotogramas de 96×96), se agrieta y estalla.
        const cont = document.getElementById("dbl-efectos"), e = $(".dbl-escena"), rs = s.getBoundingClientRect(), re = e.getBoundingClientRect();
        const orbe = document.createElement("div");
        orbe.className = "anim-cel mega-cel";
        orbe.style.backgroundImage = `url("${MEGA_ORBE}")`;
        orbe.style.left = (rs.left - re.left + rs.width / 2) + "px"; orbe.style.top = (rs.top - re.top + rs.height / 2) + "px";
        orbe.style.transform = `translate(-50%,-50%) scale(${limitar(Math.max(rs.width, rs.height) / 60, 1.2, 5)})`;
        cont.appendChild(orbe);
        s.animate([{ filter: "brightness(1)" }, { filter: "brightness(0) invert(1)" }], { duration: 400 / velJuego(), fill: "forwards" });
        const cambio = (async () => { await aplicarMega(c); })().catch(() => {});
        for (let f = 0; f < 13 && activo; f++) { orbe.style.backgroundPosition = `-${(f % 5) * 96}px -${Math.floor(f / 5) * 96}px`; await esperar(80); }
        await cambio;
        orbe.remove();
        AudioFX.sonar(MEGA_SON(2), { vol: 0.65 }); temblor(1.6);
        await montar(l, huecoDe(c), true);
        const s2 = spriteDe(c);
        if (s2) s2.animate([{ filter: "brightness(0) invert(1)" }, { filter: "brightness(1)" }], { duration: 650 / velJuego() });
        AudioFX.gritoMega(info, c.baseId, { vol: 0.6 });
        pintarCaja(l, huecoDe(c));
        await decir(`¡${antes} ha megaevolucionado en ${c.nombre}!`, 1200);
        await entrar(c);
    }
    async function teracristalizar(c) {
        const t = c.teraTipo || c.tipos[0], l = ladoDe(c);
        AudioFX.efecto("shine", { vol: 0.55 });
        try { await AnimMov.reproducir("common-terastallize", ctxAnim(c)); } catch (_) {}
        c.tiposAntesTera = (c.tiposBase || c.tipos).slice();
        c.teracristal = t; c.tipos = [t]; c.protean = true;
        AudioFX.sonar(prURL("audio/battle_anims/PRSFX- Mirror Shatter.wav"), { vol: 0.5 });
        await montar(l, huecoDe(c), true);
        pintarCaja(l, huecoDe(c));
        await decir(`¡${c.nombre} se ha teracristalizado en el tipo ${TIPOS_ES[t]}!`, 1200);
    }
    const poderesDe = (c, l) => {
        if (poder[l] || !c || c.hp <= 0) return [];
        const out = [];
        if (c.puedeMega && !c.esMega) out.push("mega");
        if (!c.esMega && !c.teracristal) out.push("tera");
        return out;
    };

    // ---------- A quién alcanza cada movimiento ----------
    const SOBRE_SI = new Set(["user", "users-field", "user-and-allies", "all-allies", "user-or-ally", "ally", "entire-field", "all-pokemon", "opponents-field", "fainting-pokemon"]);
    const objetivoDe = (mov) => objetivos.get(mov.clave) || (mov.cat === "est" && (mov.curacion || mov.clima || (mov.cambios && mov.cambios.objetivo === "yo") || mov.especial === "proteccion") ? "user" : "selected-pokemon");
    const necesitaObjetivo = (mov) => !SOBRE_SI.has(objetivoDe(mov)) && !["all-opponents", "all-other-pokemon"].includes(objetivoDe(mov));
    function blancos(at, mov, elegido) {
        const l = ladoDe(at), rivales = vivos(otro(l)), t = objetivoDe(mov);
        if (SOBRE_SI.has(t)) return [at];
        if (t === "all-opponents") return rivales;
        if (t === "all-other-pokemon") return rivales.concat(vivos(l).filter((x) => x !== at));
        if (t === "random-opponent") return rivales.length ? [alAzarC(rivales)] : [];
        // Señuelo y Polvo Ira: los ataques de un solo objetivo van a por él (Polvo Ira no engaña a los de tipo Planta, Funda ni Gafa Protectora).
        const cebo = rivales.find((x) => x.senuelo && !(x.senuelo === "rage-powder" && (at.tipos.includes("grass") || at.habilidad === "overcoat" || at.objeto === "safety-goggles")));
        if (cebo) return [cebo];
        // Uno solo: el elegido o, si ya no está, el otro rival.
        if (elegido && elegido.hp > 0 && enCampo(elegido)) return [elegido];
        return rivales.length ? [rivales[0]] : [];
    }

    // ---------- Turno ----------
    // Lo que elige uno de tus Pokémon: acción, movimiento (con su poder) y a qué rival. «Atrás» vuelve al menú anterior; en el
    // segundo Pokémon, desde el principio, a corregir lo del primero. reservados: los que ya van a salir este turno.
    function elegir(c, i, puedeVolver, reservados) {
        return new Promise((acabar) => {
            const ui = $(".acciones-batalla"), mv = $(".menu-moves");
            elegirAuto = () => { elegirAuto = null; acabar({ tipo: "mov", mov: conPP(c)[0] || FORCEJEO, objetivo: vivos("r")[0] || null }); };
            const verAcciones = () => {
                mv.classList.add("oculta"); ui.classList.remove("oculta"); ui.classList.add("principal");
                const libres = banquillo("a").filter((p) => !reservados.has(p));
                ui.innerHTML = `<button class="accion-btn acc-luchar" data-a="luchar"><span class="acc-texto">Luchar</span></button>
                    <button class="accion-btn acc-cambiar" data-a="cambiar" ${libres.length ? "" : "disabled"}><span>Pokémon</span></button>
                    <button class="accion-btn acc-huir" data-a="${puedeVolver ? "volver" : "rendirse"}"><span>${puedeVolver ? "Atrás" : "Rendirse"}</span></button>`;
                ponerMensaje(`¿Qué debería hacer ${c.nombre}?`);
                ui.querySelector('[data-a="luchar"]').onclick = () => { AudioFX.ui("select"); verMovs(null); };
                ui.querySelector('[data-a="cambiar"]').onclick = () => { AudioFX.ui("select"); verCambio(); };
                const ult = ui.querySelector('[data-a="volver"], [data-a="rendirse"]');
                ult.onclick = () => {
                    if (ult.dataset.a === "volver") return acabar({ tipo: "volver" });
                    if (ult.dataset.seguro !== "1") { ult.dataset.seguro = "1"; ult.querySelector("span").textContent = "¿Seguro?"; return; }
                    acabar({ tipo: "rendirse" });
                };
            };
            const verMovs = (poderSel) => {
                ui.classList.add("oculta"); mv.classList.remove("oculta");
                const pod = poderesDe(c, "a");
                mv.innerHTML = (conPP(c).length ? c.movimientos.map((m, k) => `<button class="move-btn tipo-${m.tipo} ${m.ppAct <= 0 ? "agotado" : ""}" data-k="${k}" ${m.ppAct <= 0 ? "disabled" : ""}>
                        <span class="mb-fila"><span class="move-nombre">${m.nombre}</span>${etiquetaTipo(m.tipo, 2)}</span>
                        <span class="mb-fila mb-datos">${iconoCategoria(m.cat, 2)}<span class="mb-pot">${m.cat === "est" || !m.poder ? "—" : m.poder}</span>
                        <span class="mb-pista">${{ "all-opponents": "A los dos rivales", "all-other-pokemon": "A todos" }[objetivoDe(m)] || ""}</span>
                        <span class="mb-pp">PP <b>${m.ppAct}</b>/${m.pp}</span></span></button>`).join("")
                    : `<button class="move-btn tipo-normal" data-k="-1"><span class="mb-fila"><span class="move-nombre">Forcejeo</span></span></button>`)
                    + pod.map((p) => `<button class="move-poder p-${p} ${poderSel === p ? "activo" : ""}" data-p="${p}">${p === "mega" ? (megaDeC(c) && megaDeC(c).nombre) || "Megaevolución" : `Teracristal (${TIPOS_ES[c.teraTipo || c.tipos[0]]})`}</button>`).join("")
                    + `<button class="move-volver" data-volver>Atrás</button>`;
                ponerMensaje(`¿Qué movimiento usará ${c.nombre}?`);
                mv.querySelectorAll("[data-p]").forEach((b) => b.onclick = () => { AudioFX.ui("select"); verMovs(poderSel === b.dataset.p ? null : b.dataset.p); });
                mv.querySelector("[data-volver]").onclick = () => { AudioFX.ui("select"); verAcciones(); };
                mv.querySelectorAll("[data-k]").forEach((b) => b.onclick = () => {
                    const k = Number(b.dataset.k), m = k < 0 ? FORCEJEO : c.movimientos[k], rivales = vivos("r");
                    AudioFX.ui("select");
                    if (k >= 0 && necesitaObjetivo(m) && rivales.length > 1) return verObjetivo(m, poderSel);
                    acabar({ tipo: "mov", mov: m, objetivo: rivales[0] || null, poder: poderSel });
                });
            };
            const verObjetivo = (m, poderSel) => {
                const rivales = vivos("r");
                mv.innerHTML = rivales.map((r, k) => `<button class="move-btn dbl-blanco tipo-${r.tipos[0]}" data-r="${k}"><span class="mb-fila"><span class="move-nombre">${r.nombre}</span>${etiquetaTipo(r.tipos[0], 2)}</span>
                    <span class="mb-fila mb-datos"><span class="mb-pista">${Math.round((r.hp / r.hpMax) * 100)} % de PS${r.estado ? " · " + ESTADOS[r.estado.tipo].corto : ""}</span></span></button>`).join("")
                    + `<button class="move-volver" data-volver>Atrás</button>`;
                ponerMensaje(`¿A quién atacará ${c.nombre} con ${m.nombre}?`);
                mv.querySelectorAll("[data-r]").forEach((b) => {
                    const r = rivales[Number(b.dataset.r)];
                    b.onmouseenter = () => { const s = spriteDe(r); if (s) s.classList.add("dbl-apuntado"); };
                    b.onmouseleave = () => { const s = spriteDe(r); if (s) s.classList.remove("dbl-apuntado"); };
                    b.onclick = () => { const s = spriteDe(r); if (s) s.classList.remove("dbl-apuntado"); AudioFX.ui("select"); acabar({ tipo: "mov", mov: m, objetivo: r, poder: poderSel }); };
                });
                mv.querySelector("[data-volver]").onclick = () => { AudioFX.ui("select"); verMovs(poderSel); };
            };
            const verCambio = () => {
                ui.classList.add("oculta"); mv.classList.remove("oculta");
                const libres = banquillo("a").filter((p) => !reservados.has(p));
                mv.innerHTML = libres.map((p, k) => `<button class="move-btn dbl-blanco tipo-${p.tipos[0]}" data-b="${k}"><span class="mb-fila"><span class="move-nombre">${p.nombre}</span><span class="mb-pp">Nv. ${p.nivel}</span></span>
                    <span class="mb-fila mb-datos"><span class="mb-pista">PS ${p.hp}/${p.hpMax}${p.estado ? " · " + ESTADOS[p.estado.tipo].corto : ""}</span></span></button>`).join("")
                    + `<button class="move-volver" data-volver>Atrás</button>`;
                ponerMensaje(`¿Quién sale en lugar de ${c.nombre}?`);
                mv.querySelector("[data-volver]").onclick = () => { AudioFX.ui("select"); verAcciones(); };
                mv.querySelectorAll("[data-b]").forEach((b) => b.onclick = () => { AudioFX.ui("select"); acabar({ tipo: "cambio", sale: libres[Number(b.dataset.b)] }); });
            };
            verAcciones();
        });
    }
    // Tras un K.O.: a quién envías a ese hueco.
    function elegirReemplazo() {
        return new Promise((acabar) => {
            const ui = $(".acciones-batalla"), mv = $(".menu-moves");
            ui.classList.add("oculta"); mv.classList.remove("oculta");
            const libres = banquillo("a");
            mv.innerHTML = libres.map((p, k) => `<button class="move-btn dbl-blanco tipo-${p.tipos[0]}" data-b="${k}"><span class="mb-fila"><span class="move-nombre">${p.nombre}</span><span class="mb-pp">Nv. ${p.nivel}</span></span>
                <span class="mb-fila mb-datos"><span class="mb-pista">PS ${p.hp}/${p.hpMax}${p.estado ? " · " + ESTADOS[p.estado.tipo].corto : ""}</span></span></button>`).join("");
            ponerMensaje("¿A quién envías al combate?");
            mv.querySelectorAll("[data-b]").forEach((b) => b.onclick = () => { AudioFX.ui("select"); mv.classList.add("oculta"); acabar(libres[Number(b.dataset.b)]); });
            elegirAuto = () => { elegirAuto = null; mv.classList.add("oculta"); acabar(libres[0]); };
        });
    }
    // ---------- Multijugador ----------
    // Cada partida envía lo que eligen sus dos Pokémon (por hueco e índice) y las dos resuelven el turno igual. Las acciones se
    // rehacen desde ese formato también en la partida que las eligió, para que las dos partan de exactamente lo mismo.
    const serAccion = (a) => ({ hueco: huecoDe(a.c), tipo: a.tipo, k: a.tipo === "mov" ? (a.mov === FORCEJEO ? -1 : a.c.movimientos.indexOf(a.mov)) : null,
        obj: a.objetivo ? { mio: ladoDe(a.objetivo) === ladoDe(a.c), hueco: huecoDe(a.objetivo) } : null, poder: a.poder || null,
        sale: a.sale ? lados[ladoDe(a.c)].equipo.indexOf(a.sale) : -1 });
    function desAccion(l, x) {
        if (!x || typeof x !== "object") return null;
        const c = lados[l].en[x.hueco]; if (!c || c.hp <= 0) return null;
        if (x.tipo === "cambio") {
            const sale = lados[l].equipo[x.sale];
            return sale && sale.hp > 0 && !lados[l].en.includes(sale) ? { c, tipo: "cambio", sale } : null;
        }
        const m = c.movimientos[x.k], mov = x.k < 0 || !m || m.ppAct <= 0 ? FORCEJEO : m;
        const objetivo = x.obj ? lados[x.obj.mio ? l : otro(l)].en[x.obj.hueco] || null : null;
        return { c, tipo: "mov", mov, objetivo, poder: x.poder === "mega" || x.poder === "tera" ? x.poder : null };
    }
    const huellaD = () => { const h = (l) => lados[l].equipo.map((p) => p.hp).join(","); return opts.pvp.anfitrion ? h("a") + "|" + h("r") : h("r") + "|" + h("a"); };
    function relojEleccion(seg = 60) {
        pararRelojD();
        const el = $("#dbl-reloj"); let s = seg;
        const pintar = () => { if (el) { el.textContent = `${s} s`; el.classList.toggle("urgente", s <= 10); el.classList.remove("oculta"); } };
        pintar();
        relojD = setInterval(() => {
            if (!activo) return pararRelojD();
            s = Math.max(0, s - 1); pintar();
            if (s <= 0 && elegirAuto) elegirAuto();   // (se acabó el tiempo: elige el primero que pueda)
        }, 1000);
    }
    function pararRelojD() { clearInterval(relojD); relojD = null; elegirAuto = null; const el = $("#dbl-reloj"); if (el) el.classList.add("oculta"); }
    async function rivalSeVa(motivo) {
        if (!activo || acabando) return;
        pararRelojD();
        $(".acciones-batalla").classList.add("oculta"); $(".menu-moves").classList.add("oculta");
        await decir(motivo === "rendirse" ? `¡${opts.titulo} se ha rendido!` : `${opts.titulo} se ha desconectado.`, 1300);
        return fin(true);
    }
    // La IA: para cada uno de sus Pokémon, el movimiento y el rival con los que más daño hace (en proporción a sus PS).
    function eleccionIA(c) {
        const rivales = vivos("a"); if (!rivales.length) return null;
        // A veces apoya a su compañero (Refuerzo, Señuelo, Decoración…).
        const comp = vivos("r").find((x) => x !== c), ap = c.movimientos.filter((m) => APOYO.has(m.clave) && m.ppAct > 0 && m.clave !== "hold-hands");
        if (comp && ap.length && Math.random() < 0.3) { const m = ap[Math.floor(Math.random() * ap.length)]; return { tipo: "mov", mov: m, objetivo: m.clave === "quash" ? rivales[0] : comp }; }
        let mejor = null;
        for (const r of rivales) {
            const m = iaElegirMov(c, r, opts.ia || 0.85); if (!m) continue;
            const valor = m.cat === "est" ? 0.15 + Math.random() * 0.1 : Math.min(1.2, danioEsperado(c, r, m) / Math.max(1, r.hp)) * Math.min(1, m.prec || 1);
            if (!mejor || valor > mejor.valor) mejor = { tipo: "mov", mov: m, objetivo: r, valor };
        }
        if (mejor && !poder.r && opts.poderRival !== false) {
            const vivosR = lados.r.equipo.filter((x) => x.hp > 0).length;
            if (c.puedeMega && !c.esMega) mejor.poder = "mega";
            else if (opts.poderRival === "tera" && (vivosR <= 2 || c === lados.r.equipo[lados.r.equipo.length - 1])) mejor.poder = "tera";
        }
        return mejor;
    }
    async function jugarTurno() {
        // Tus elecciones (con «Atrás» para corregir la del primero).
        let acciones = [];
        const mios = lados.a.en.map((c, i) => ({ c, i })).filter((x) => x.c && x.c.hp > 0);
        if (opts.pvp) relojEleccion();
        for (let k = 0; k < mios.length; k++) {
            const { c, i } = mios[k];
            const a = await elegir(c, i, k > 0, new Set(acciones.filter((x) => x.tipo === "cambio").map((x) => x.sale)));
            if (!activo) return;
            if (a.tipo === "volver") { acciones.pop(); k -= 2; continue; }
            if (a.tipo === "rendirse") { pararRelojD(); if (opts.pvp) opts.pvp.enviar({ t: "rendirse" }); return fin(false, true); }
            acciones.push(Object.assign({ c }, a));
        }
        $(".acciones-batalla").classList.add("oculta"); $(".menu-moves").classList.add("oculta");
        if (opts.pvp) {
            pararRelojD();
            const mias = acciones.map(serAccion);
            opts.pvp.enviar({ t: "acciones2", turno, lista: mias, h: huellaD() });
            ponerMensaje(`Esperando a ${opts.titulo}…`);
            const r = await opts.pvp.recibir("acciones2");
            if (!activo) return;
            if (r.fin) return rivalSeVa(r.fin);
            if (r.h && r.h !== huellaD()) console.warn("Dobles online: partidas desincronizadas", r.h, huellaD());
            const propias = mias.map((x) => desAccion("a", x)).filter(Boolean), suyas = (Array.isArray(r.lista) ? r.lista : []).slice(0, 2).map((x) => desAccion("r", x)).filter(Boolean);
            acciones = opts.pvp.anfitrion ? propias.concat(suyas) : suyas.concat(propias);   // (en las dos partidas, el mismo orden)
        } else lados.r.en.forEach((c) => { if (c && c.hp > 0) { const a = eleccionIA(c); if (a) acciones.push(Object.assign({ c }, a)); } });
        // Cambios primero; luego los poderes (por velocidad) y los movimientos por prioridad y velocidad.
        const vel = (c) => velEfectiva(c) + desempate(c);
        for (const a of acciones.filter((x) => x.tipo === "cambio")) await cambiar(a.c, a.sale);
        for (const a of acciones.filter((x) => x.tipo === "mov" && x.poder).sort((x, y) => vel(y.c) - vel(x.c))) {
            const l = ladoDe(a.c); if (poder[l] || a.c.hp <= 0) continue;
            poder[l] = a.poder;
            if (a.poder === "mega") await megaevolucionar(a.c); else await teracristalizar(a.c);
            if (!activo) return;
        }
        const movs = acciones.filter((x) => x.tipo === "mov").sort((x, y) => ((y.mov.prio || 0) - (x.mov.prio || 0)) || (vel(y.c) - vel(x.c)));
        colaTurno = { lista: movs, i: 0, reordenar(c, modo) {
            const j = this.lista.findIndex((x, n) => n > this.i && x.c === c); if (j < 0) return false;
            const [x] = this.lista.splice(j, 1);
            if (modo === "ya") this.lista.splice(this.i + 1, 0, x); else this.lista.push(x);
            return true;
        } };
        for (colaTurno.i = 0; colaTurno.i < movs.length; colaTurno.i++) {
            const a = movs[colaTurno.i];
            if (!activo) return;
            if (a.c.hp <= 0 || !enCampo(a.c)) continue;
            await usarMovimiento(a.c, a.mov, a.objetivo);
            if (await revisarFin()) return;
        }
        colaTurno = null;
        await finDeTurno();
        if (await revisarFin()) return;
        await reemplazos();
        if (await revisarFin()) return;
        turno++;
        return jugarTurno();
    }
    async function cambiar(c, sale) {
        const l = ladoDe(c), i = huecoDe(c); if (i < 0 || !sale) return;
        await decir(l === "a" ? `¡Vuelve, ${c.nombre}!` : `${opts.titulo} retira a ${c.nombre}.`, 700);
        const s = spriteDe(c);
        if (s) await s.animate([{ transform: "scale(1)", opacity: 1 }, { transform: "scale(.4)", opacity: 0 }], { duration: 300 / velJuego(), fill: "forwards" }).finished.catch(() => {});
        Object.assign(c, { etapas: etapasCero(), protegido: false, confuso: 0, perecer: 0, mismoDestino: false });
        if (s) s.getAnimations().forEach((x) => x.cancel());
        lados[l].en[i] = sale;
        await decir(l === "a" ? `¡Adelante, ${sale.nombre}!` : `${opts.titulo} envía a ${sale.nombre}.`, 700);
        await salida(sale, l, i);
        await entrar(sale);
    }

    // ---------- Un movimiento ----------
    async function usarMovimiento(at, mov, elegido) {
        at._autoKO = false; at.mismoDestino = false;   // (Mismo Destino dura hasta su siguiente acción)
        await usarMovimientoBase(at, mov, elegido);
        if (!activo) return;
        // Explosión, Autodestrucción, Explosión Bruma y Sacrificio: el usuario se debilita tras su movimiento.
        if (at._autoKO) { at._autoKO = false; if (at.hp > 0) { at.hp = 0; actualizarPS(at); causaD = ladoDe(at); await debilitar(at); } }
        at.ultimoMovD = mov === FORCEJEO ? null : { mov, elegido };   // (para Mandato y para no repetir Mismo Destino)
    }
    async function usarMovimientoBase(at, mov, elegido) {
        // Lo que puede impedirle atacar: retroceso, sueño, congelación, parálisis y confusión.
        if (at.retrocede) { at.retrocede = false; return decir(`¡${at.nombre} ha retrocedido y no se ha podido mover!`, 900); }
        if (at.estado && at.estado.tipo === "dor") {
            if (--at.estado.turnos > 0) { try { await AnimMov.reproducir("common-sleep", ctxAnim(at)); } catch (_) {} return decir(`${at.nombre} está profundamente dormido.`, 850); }
            at.estado = null; pintarCaja(ladoDe(at), huecoDe(at)); await decir(`¡${at.nombre} se ha despertado!`, 800);
        }
        if (at.estado && at.estado.tipo === "con") {
            if (azarC() < 0.2 || mov.tipo === "fire") { at.estado = null; pintarCaja(ladoDe(at), huecoDe(at)); await decir(`¡${at.nombre} se ha descongelado!`, 800); }
            else return decir(`¡${at.nombre} está congelado!`, 850);
        }
        if (at.estado && at.estado.tipo === "par" && azarC() < 0.25) { try { await AnimMov.reproducir("common-paralysis", ctxAnim(at)); } catch (_) {} return decir(`¡${at.nombre} está paralizado! No se puede mover.`, 900); }
        if (at.confuso > 0) {
            at.confuso--;
            if (!at.confuso) await decir(`¡${at.nombre} ya no está confuso!`, 800);
            else {
                await decir(`${at.nombre} está confuso...`, 700);
                if (azarC() < 1 / 3) {
                    const dmg = Math.max(1, Math.floor((((2 * at.nivel / 5 + 2) * 40 * (at.stats.atk * multEtapa(at.etapas.atk)) / (at.stats.def * multEtapa(at.etapas.def))) / 50 + 2)));
                    at.hp = Math.max(0, at.hp - dmg); golpeado(at); AudioFX.golpe(1, false); actualizarPS(at);
                    await decir("¡Está tan confuso que se ha herido a sí mismo!", 900);
                    if (at.hp <= 0) await debilitar(at);
                    return;
                }
            }
        }
        if (mov !== FORCEJEO) mov.ppAct = Math.max(0, (mov.ppAct || 1) - 1);
        await decir(`¡${at.nombre} usó ${mov.nombre}!`, 650);
        if (AUTO_KO.has(mov.clave)) {
            const h = vivos("a").concat(vivos("r")).find((x) => x.habilidad === "damp");   // Humedad: nadie puede estallar
            if (h) return decir(`¡${h.nombre} impide que ${at.nombre} use ${mov.nombre} gracias a su Humedad!`, 1000);
            at._autoKO = true;   // (cae aunque falle o se protejan)
        }
        if (APOYO.has(mov.clave)) return apoyo(at, mov, elegido);
        const lista = blancos(at, mov, elegido);
        if (!lista.length) return decir("¡Pero no ha alcanzado a nadie!", 800);
        // Protección / Detección.
        if (mov.especial === "proteccion") {
            const seguidas = at.protecciones || 0;
            if (azarC() >= 1 / Math.pow(3, seguidas)) { at.protecciones = 0; return decir("¡Pero ha fallado!", 800); }
            at.protegido = true; at.protecciones = seguidas + 1;
            await animarMov(at, mov, at);
            return decir(`¡${at.nombre} se ha protegido!`, 850);
        }
        at.protecciones = 0;
        await animarMov(at, mov, lista[0] === at ? null : lista[0]);
        if (!activo) return;
        if (mov.cat === "est") return efectoEstado(at, mov, lista);
        const varios = lista.length > 1;
        let golpeoAlguno = false;
        for (const def of lista) {
            if (def.hp <= 0 || !activo) continue;
            if (def.protegido && def !== at) { await decir(`¡${def.nombre} se ha protegido!`, 800); continue; }
            if ((mov.prec || 1) < 1 && azarC() > mov.prec * multEtapa(at.etapas.prec || 0)) { await decir(`¡${def.nombre} ha esquivado el ataque!`, 800); continue; }
            const tipo = tipoDeMovimiento(at, mov), inm = inmunidadHab(def, at, mov, tipo);
            if (inm) { await decir(`¡${def.nombre} no se ha visto afectado gracias a ${nombreHabilidad(inm.h || def.habilidad)}!`, 950); continue; }
            const m = Object.assign({}, mov, { _tipo: tipo });
            const nGolpes = mov.golpes ? (mov.golpes[0] === mov.golpes[1] || at.habilidad === "skill-link" ? mov.golpes[1] : alAzarC([2, 2, 3, 3, 4, 5].filter((n) => n >= mov.golpes[0] && n <= mov.golpes[1]))) : 1;
            let total = 0, efect = 1, crit = false, golpes = 0, aguanta = null;
            for (let g = 0; g < nGolpes && def.hp > 0 && activo; g++) {
                const r = calcularDanio(at, def, m);
                efect = r.efect; crit = crit || r.crit; golpes++;
                if (!efect) break;
                let dmg = Math.max(1, Math.floor(r.dmg * (varios ? 0.75 : 1) * (at.refuerzo ? 1.5 : 1)));   // (Refuerzo: +50 %)
                if (dmg >= def.hp && def.hp === def.hpMax && (def.objeto === "focus-sash" || def.habilidad === "sturdy")) {
                    dmg = def.hp - 1; aguanta = def.habilidad === "sturdy" ? "Robustez" : "la Banda Aguante";
                    if (def.objeto === "focus-sash" && def.habilidad !== "sturdy") def.objeto = null;
                }
                def.hp = Math.max(0, def.hp - dmg); total += dmg;
                AudioFX.golpe(r.efect, r.crit); golpeado(def, r.crit || r.efect >= 2); impacto(def, tipo, r.crit || r.efect >= 2);
                if (r.crit || r.efect >= 2) temblor(r.crit ? 1.6 : 1.2);
                actualizarPS(def);
                await esperar(nGolpes > 1 ? 280 : 420);
            }
            if (!efect) { await decir(`No afecta a ${def.nombre}...`, 800); continue; }
            golpeoAlguno = true;
            if (crit) await decir(varios ? `¡Un golpe crítico a ${def.nombre}!` : "¡Un golpe crítico!", 700);
            if (efect >= 2) await decir(varios ? `¡Es muy eficaz contra ${def.nombre}!` : "¡Es muy eficaz!", 750);
            else if (efect < 1) await decir(varios ? `No es muy eficaz contra ${def.nombre}...` : "No es muy eficaz...", 750);
            if (golpes > 1) await decir(`¡Ha golpeado ${golpes} veces!`, 750);
            if (aguanta) await decir(`¡${def.nombre} ha aguantado el golpe gracias a ${aguanta}!`, 950);
            // Efectos secundarios.
            if (def.hp > 0) {
                if (mov.estado && azarC() < (mov.estado.prob || 0) * (at.habilidad === "serene-grace" ? 2 : 1)) await ponerEstado(def, mov.estado, at);
                if (mov.cambios && mov.cambios.objetivo !== "yo" && azarC() < (mov.cambios.prob || 1)) await cambiarEtapas(def, mov.cambios.stats, at);
                if (mov.retroceder && azarC() < mov.retroceder) def.retrocede = true;
                if (mov.confunde && !def.confuso && azarC() < mov.confunde) { def.confuso = entreC(2, 5); await decir(`¡${def.nombre} se ha quedado confuso!`, 850); }
                await bayaCura(def);
            }
            if (mov.drenaje > 0 && total > 0) await curarPS(at, total * mov.drenaje, `¡${def.nombre} ha perdido energía!`);
            if (mov.drenaje < 0 && total > 0 && at.habilidad !== "rock-head" && at.habilidad !== "magic-guard") {
                at.hp = Math.max(0, at.hp - Math.max(1, Math.floor(total * -mov.drenaje))); golpeado(at); actualizarPS(at);
                await decir(`¡${at.nombre} ha recibido daño de rebote!`, 850);
            }
            if (def.hp <= 0) await debilitar(def);
            // Mismo Destino: el que lo derriba cae con él.
            if (def.hp <= 0 && def.mismoDestino && at.hp > 0 && ladoDe(def) !== ladoDe(at)) {
                def.mismoDestino = false;
                await decir(`¡${def.nombre} se ha llevado consigo a ${at.nombre}!`, 1100);
                at.hp = 0; actualizarPS(at); causaD = ladoDe(def);
            }
            if (at.hp <= 0) { at._autoKO = false; await debilitar(at); return; }
        }
        if (mov.clave === "final-gambit" && golpeoAlguno) at._autoKO = true;   // Sacrificio: solo si llega a golpear
        if (golpeoAlguno && at.hp > 0) {
            if (mov.cambios && mov.cambios.objetivo === "yo" && azarC() < (mov.cambios.prob || 1)) await cambiarEtapas(at, mov.cambios.stats, at);
            if (at.objeto === "life-orb" && at.habilidad !== "magic-guard") {
                at.hp = Math.max(0, at.hp - Math.max(1, Math.floor(at.hpMax / 10))); actualizarPS(at);
                await decir(`¡${at.nombre} ha perdido algo de vida por la Vidasfera!`, 850);
                if (at.hp <= 0) await debilitar(at);
            }
            await bayaCura(at);
        }
    }
    async function efectoEstado(at, mov, lista) {
        if (mov.clave === "destiny-bond") {
            if (at.ultimoMovD && at.ultimoMovD.mov.clave === "destiny-bond") return decir("¡Pero ha fallado!", 800);   // (no dos veces seguidas)
            at.mismoDestino = true;
            return decir(`¡${at.nombre} quiere llevarse a su rival consigo!`, 950);
        }
        if (mov.clave === "perish-song") {
            const oyen = vivos("a").concat(vivos("r")).filter((c) => !c.perecer && c.habilidad !== "soundproof");
            if (!oyen.length) return decir("¡Pero ha fallado!", 800);
            oyen.forEach((c) => { c.perecer = 4; });
            cantoD = ladoDe(at);
            return decir("¡Todos los Pokémon que han oído la canción se debilitarán en tres turnos!", 1100);
        }
        if (mov.clima) return ponerClima(mov.clima, at);
        if (mov.curacion) {
            const cl = climaPara(at); let f = mov.curacion;
            if (["moonlight", "synthesis", "morning-sun"].includes(mov.clave) && cl) f = cl === "sol" ? 2 / 3 : 1 / 4;
            if (!(await curarPS(at, at.hpMax * f, `¡${at.nombre} ha recuperado PS!`))) await decir(`¡Los PS de ${at.nombre} están al máximo!`, 850);
            if (!mov.estado && !mov.cambios) return;
        }
        let hecho = false;
        for (const def of lista) {
            if (def.hp <= 0) continue;
            if (def !== at && def.protegido) { await decir(`¡${def.nombre} se ha protegido!`, 800); continue; }
            if (def !== at && (mov.prec || 1) < 1 && azarC() > mov.prec) { await decir(`¡${def.nombre} ha esquivado el ataque!`, 800); continue; }
            if (mov.estado) hecho = (await ponerEstado(def, mov.estado, at)) || hecho;
            if (mov.cambios) hecho = (await cambiarEtapas(mov.cambios.objetivo === "yo" ? at : def, mov.cambios.stats, at)) || hecho;
            if (mov.confunde && !def.confuso) { def.confuso = entreC(2, 5); hecho = true; await decir(`¡${def.nombre} se ha quedado confuso!`, 850); }
            if (mov.cambios && mov.cambios.objetivo === "yo") break;   // (sube lo suyo una sola vez)
        }
        if (!hecho && !mov.curacion) await decir(mov.estado || mov.cambios || mov.confunde ? "¡Pero ha fallado!" : "¡Pero no ha tenido efecto!", 800);
    }

    // Movimientos de apoyo al compañero (solo en los dobles).
    async function apoyo(at, mov, elegido) {
        const l = ladoDe(at), comp = vivos(l).find((x) => x !== at) || null, k = mov.clave;
        const falla = () => decir("¡Pero ha fallado!", 800);
        const anim = (def) => animarMov(at, mov, def);
        switch (k) {
            case "helping-hand":
                if (!comp) return falla();
                await anim(comp); comp.refuerzo = true;
                return decir(`¡${at.nombre} se prepara para ayudar a ${comp.nombre}!`, 950);
            case "follow-me": case "rage-powder":
                await anim(null); at.senuelo = k;
                return decir(`¡${at.nombre} se ha convertido en el centro de atención!`, 950);
            case "instruct": {
                if (!comp || !comp.ultimoMovD || comp.ultimoMovD.mov.ppAct <= 0 || APOYO.has(comp.ultimoMovD.mov.clave)) return falla();
                await anim(comp);
                await decir(`¡${comp.nombre} sigue las instrucciones de ${at.nombre}!`, 950);
                return usarMovimiento(comp, comp.ultimoMovD.mov, comp.ultimoMovD.elegido);
            }
            case "after-you": case "quash": {
                const obj = k === "quash" ? (elegido && elegido.hp > 0 && enCampo(elegido) ? elegido : vivos(otro(l))[0]) : comp;
                if (!obj || !colaTurno || !colaTurno.reordenar(obj, k === "after-you" ? "ya" : "ultimo")) return falla();
                await anim(obj);
                return decir(k === "after-you" ? `¡${obj.nombre} ha aceptado el ofrecimiento de ${at.nombre}!` : `¡El movimiento de ${obj.nombre} se ha retrasado!`, 950);
            }
            case "aromatic-mist": if (!comp) return falla(); await anim(comp); return cambiarEtapas(comp, { spd: 1 }, at);
            case "decorate": if (!comp) return falla(); await anim(comp); return cambiarEtapas(comp, { atk: 2, spa: 2 }, at);
            case "coaching": if (!comp) return falla(); await anim(comp); return cambiarEtapas(comp, { atk: 1, def: 1 }, at);
            case "dragon-cheer":
                if (!comp) return falla();
                await anim(comp); comp.critEtapa = Math.min(3, (comp.critEtapa || 0) + (comp.tipos.includes("dragon") ? 2 : 1));
                return decir(`¡Los ánimos de ${at.nombre} han venido arriba a ${comp.nombre}!`, 950);
            case "hold-hands":
                if (!comp) return falla();
                await anim(comp);
                return decir(`¡${at.nombre} y ${comp.nombre} se han dado la mano! ¡Qué bonito!`, 1000);
        }
        return falla();
    }

    // ---------- Fin de turno ----------
    async function finDeTurno() {
        const todos = vivos("a").concat(vivos("r"));
        todos.forEach((c) => { c.protegido = false; c.retrocede = false; c.refuerzo = false; c.senuelo = null; });
        const cl = CAMPO.clima;
        if (cl) {
            if (cl.tipo === "arena") {
                for (const c of todos.filter((x) => x.hp > 0 && !x.tipos.some((t) => ["rock", "ground", "steel"].includes(t)) && !["sand-veil", "sand-rush", "sand-force", "overcoat", "magic-guard"].includes(x.habilidad) && x.objeto !== "safety-goggles")) {
                    c.hp = Math.max(0, c.hp - Math.max(1, Math.floor(c.hpMax / 16))); golpeado(c); actualizarPS(c);
                    await decir(`¡La tormenta de arena zarandea a ${c.nombre}!`, 750);
                    if (c.hp <= 0) await debilitar(c);
                }
            }
            if (!cl.fijo && --cl.turnos <= 0) { CAMPO.clima = null; pintarClima(); await decir(CLIMAS[cl.tipo].fin, 900); }
            else await decir(CLIMAS[cl.tipo].sigue, 600);
        }
        for (const c of vivos("a").concat(vivos("r"))) {
            if (!activo) return;
            if (c.estado && ["que", "env"].includes(c.estado.tipo) && c.habilidad !== "magic-guard" && !(c.estado.tipo === "env" && c.habilidad === "poison-heal")) {
                const f = c.estado.tipo === "que" ? 1 / 16 : c.estado.grave ? Math.min(15, ++c.estado.n) / 16 : 1 / 8;
                c.hp = Math.max(0, c.hp - Math.max(1, Math.floor(c.hpMax * f)));
                try { await AnimMov.reproducir(ESTADOS[c.estado.tipo].anim, ctxAnim(c)); } catch (_) {}
                actualizarPS(c);
                await decir(c.estado.tipo === "que" ? `¡${c.nombre} se resiente de la quemadura!` : `¡El veneno resta PS a ${c.nombre}!`, 800);
                if (c.hp <= 0) { await debilitar(c); continue; }
            }
            if (c.objeto === "leftovers" || (c.objeto === "black-sludge" && c.tipos.includes("poison"))) await curarPS(c, c.hpMax / 16, `¡${c.nombre} ha recuperado unos pocos PS con ${obj(c.objeto).nombre}!`);
            await bayaCura(c);
        }
        // Canto Mortal: la cuenta atrás; a cero, se debilitan (si así se quedan los dos sin Pokémon, pierde el bando que cantó).
        const caen = [];
        for (const c of vivos("a").concat(vivos("r"))) {
            if (!activo || !(c.perecer > 0)) continue;
            c.perecer--;
            await decir(`¡El contador de Canto Mortal de ${c.nombre} ha bajado a ${c.perecer}!`, 800);
            if (c.perecer <= 0) caen.push(c);
        }
        if (caen.length) {
            causaD = cantoD;
            caen.forEach((c) => { c.hp = 0; actualizarPS(c); });
            for (const c of caen) await debilitar(c);
        }
    }
    // Los huecos vacíos se llenan con los del banquillo (tú eliges a quién; el rival, el siguiente).
    async function reemplazos() {
        for (const l of opts.pvp ? (opts.pvp.anfitrion ? ["a", "r"] : ["r", "a"]) : ["r", "a"]) {   // (online: primero el bando del anfitrión)
            for (let i = 0; i < 2; i++) {
                const c = lados[l].en[i];
                if (c && c.hp > 0) continue;
                const banco = banquillo(l); if (!banco.length) { lados[l].en[i] = null; continue; }
                let sale;
                if (l === "a") {
                    if (opts.pvp) relojEleccion(45);
                    sale = await elegirReemplazo();
                    if (opts.pvp) { pararRelojD(); opts.pvp.enviar({ t: "reemplazo2", hueco: i, eq: lados.a.equipo.indexOf(sale) }); }
                } else if (opts.pvp) {
                    ponerMensaje(`${opts.titulo} está eligiendo a quién enviar…`);
                    const r = await opts.pvp.recibir("reemplazo2");
                    if (!activo) return;
                    if (r.fin) return rivalSeVa(r.fin);
                    sale = lados.r.equipo[r.eq];
                    if (!sale || sale.hp <= 0 || lados.r.en.includes(sale)) sale = banco[0];
                } else sale = banco[0];
                if (!activo) return;
                $(".menu-moves").classList.add("oculta");
                lados[l].en[i] = sale;
                await decir(l === "a" ? `¡Adelante, ${sale.nombre}!` : `${opts.titulo} envía a ${sale.nombre}.`, 700);
                await salida(sale, l, i);
                await entrar(sale);
            }
        }
    }
    async function revisarFin() {
        if (!activo) return true;
        const quedaA = lados.a.equipo.some((c) => c.hp > 0), quedaR = lados.r.equipo.some((c) => c.hp > 0);
        if (quedaA && quedaR) return false;
        await fin(quedaA ? true : quedaR ? false : causaD === "r");   // (sin nadie en pie en los dos: pierde quien lo provocó)
        return true;
    }
    async function fin(gano, rendido = false) {
        if (!activo || acabando) return;
        acabando = true; pararRelojD();
        // Online: el resultado sale para el ranking ya (aunque luego se cierre el juego sin pulsar «Continuar»).
        if (opts.pvp && opts.pvp.alResultado) { try { opts.pvp.alResultado(!!gano); } catch (_) {} }
        $(".acciones-batalla").classList.add("oculta"); $(".menu-moves").classList.add("oculta");
        if (gano) {
            AudioFX.musicaSonar(opts.victoria || MUSICA.victoriaEntrenador);
            await decir(`¡Has vencido a ${opts.titulo}!`, 1100);
            if (opts.dialogoDerrota) await decir(`«${opts.dialogoDerrota}»`, 1300);
            if (opts.premio) await decir(`Has ganado ${dineroTexto(opts.premio)}.`, 1000);
        } else await decir(rendido ? "Te has rendido..." : "¡No te quedan Pokémon en condiciones de combatir!", 1200);
        const ui = $(".acciones-batalla");
        ui.classList.remove("oculta", "principal");
        ui.innerHTML = `<button class="accion-btn acc-luchar" data-acc="salir"><span class="acc-texto">Continuar</span></button>`;
        await new Promise((res) => { ui.querySelector("[data-acc=salir]").onclick = res; });
        await Promise.all(lados.a.equipo.concat(lados.r.equipo).map((p) => deshacerMega(p).catch(() => {})));
        cerrar();
        if (opts.alTerminar) opts.alTerminar({ gano, equipo: lados.a.equipo });
    }
    function teclaDobles(e) {
        if (!activo || e.target.closest("input, textarea")) return;
        const vis = (el) => el && !el.classList.contains("oculta");
        const menu = vis($(".menu-moves")) ? $(".menu-moves") : vis($(".acciones-batalla")) ? $(".acciones-batalla") : null;
        if (!menu) return;
        const salir = menu.querySelector("[data-acc='salir']");
        if (salir && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); salir.click(); return; }
        const volver = menu.querySelector("[data-volver], [data-a='volver']");
        if (volver && (e.key === "Escape" || e.key === "Backspace")) { e.preventDefault(); volver.click(); return; }
        if (/^[1-9]$/.test(e.key)) {
            const b = [...menu.querySelectorAll("button")].filter((x) => !x.disabled && !x.hasAttribute("data-volver"))[Number(e.key) - 1];
            if (b) { e.preventDefault(); b.click(); }
        }
    }
    function cerrar() {
        activo = false; msgTok++;
        document.removeEventListener("keydown", teclaDobles);
        CAMPO.clima = null; CAMPO.activos = () => []; CAMPO.lados = null; CAMPO.quedan = null; CAMPO.terreno = null;
        azarC = Math.random;
        [...lados.a.equipo, ...lados.r.equipo].forEach((p) => { p.teracristal = null; Object.assign(p, { tipos: p.tiposBase || p.tipos, habilidad: p.habBase || p.habilidad }); });
        AudioFX.pararMusica();
        const c = capa;
        c.classList.add("cerrando");
        setTimeout(() => { c.classList.remove("cerrando", "dbl"); c.classList.add("oculta"); c.innerHTML = ""; }, 340);
        document.body.style.overflow = "";
    }

    // ---------- Iniciar ----------
    async function iniciar(o) {
        opts = o; turno = 1; poder.a = poder.r = null; causaD = cantoD = null; colaTurno = null; acabando = false; elegirAuto = null;
        lados = { a: { equipo: o.aliados, en: [] }, r: { equipo: o.enemigos, en: [] } };
        ["a", "r"].forEach((l) => { lados[l].equipo.forEach((p) => { p.lado = l; p.etapas = p.etapas || etapasCero(); }); lados[l].en = lados[l].equipo.filter((p) => p.hp > 0).slice(0, 2); while (lados[l].en.length < 2) lados[l].en.push(null); });
        CAMPO.clima = o.climaInicial ? { tipo: o.climaInicial, turnos: 0, fijo: true } : null;
        CAMPO.activos = () => (lados ? vivos("a").concat(vivos("r")) : []);
        CAMPO.lados = { a: ladoNuevo(), r: ladoNuevo() }; CAMPO.terreno = null; CAMPO.espacioRaro = 0;
        CAMPO.quedan = (l) => lados[l].equipo.filter((p) => p.hp > 0).length;
        azarC = o.pvp ? semillaAzar(o.pvp.semilla) : Math.random;   // (online: el mismo azar en las dos partidas)
        if (o.pvp && o.pvp.alFin) o.pvp.alFin((motivo) => { if (activo && !acabando) rivalSeVa(motivo); });
        // A quién alcanza cada movimiento (PokéAPI), antes de empezar.
        await Promise.all([...o.aliados, ...o.enemigos].flatMap((p) => p.movimientos).filter((m) => m.clave && !objetivos.has(m.clave))
            .map((m) => conLimite(cargarMovimiento(m.clave), 6000).then((d) => { if (d && d.target) objetivos.set(m.clave, d.target.name); }).catch(() => {})));
        const falta = (window.cargaBatallaHasta || 0) - performance.now(); window.cargaBatallaHasta = 0;
        if (falta > 0) await esperar(falta * velJuego());
        construir(); activo = true;
        document.removeEventListener("keydown", teclaDobles); document.addEventListener("keydown", teclaDobles);
        AudioFX.musicaSonar(o.musicaEncuentro || o.musica || temaEntrenador());
        pintarClima();
        ["a", "r"].forEach((l) => [0, 1].forEach((i) => { const cj = $(`[data-caja="${l}${i}"]`); if (cj) cj.classList.add("fuera"); }));
        // El rival y sus dos primeros Pokémon.
        if (o.musica) AudioFX.musicaSonar(o.musica);
        // El entrenador rival se presenta (su sprite animado de PokéRogue) y se aparta para sacar a sus Pokémon.
        let ent = null;
        if (o.entrenadorSprite) {
            ent = document.createElement("canvas"); ent.className = "dbl-entrenador"; ent.id = "dbl-entrenador";
            $(".dbl-escena").appendChild(ent);
            await Promise.race([montarEntrenador(ent, o.entrenadorSprite, { fps: 24 }), esperar(2500)]).catch(() => {});
            ent = document.getElementById("dbl-entrenador") || ent;
            ent.dataset.nw = ent.width; ent.dataset.nh = ent.height;   // (un lienzo: su tamaño, para escalarlo como los sprites)
            tamanoNativo(ent, zoom() * 1.3, $(".dbl-escena").clientHeight * 0.55);
            ent.animate([{ opacity: 0, transform: "translateX(40px)" }, { opacity: 1, transform: "translateX(0)" }], { duration: 350 / velJuego(), fill: "both", easing: "ease-out" });
        }
        await decir(`¡${o.titulo} quiere luchar!`, 1000);
        if (o.dialogo) await decir(`«${o.dialogo}»`, 1200);
        if (ent) ent.animate([{ opacity: 1, transform: "translateX(0)" }, { opacity: 0, transform: "translateX(120px)" }], { duration: 420 / velJuego(), fill: "forwards", easing: "ease-in" })
            .finished.then(() => ent.remove(), () => ent.remove());
        for (const l of ["r", "a"]) {
            const [x, y] = lados[l].en;
            await decir(l === "r" ? `${o.titulo} envía a ${[x, y].filter(Boolean).map((c) => c.nombre).join(" y a ")}.` : `¡Adelante, ${[x, y].filter(Boolean).map((c) => c.nombre).join(" y ")}!`, 800);
            await Promise.all([0, 1].map((i) => lados[l].en[i] ? salida(lados[l].en[i], l, i) : null));
        }
        const orden = (c) => velEfectiva(c) + (o.pvp ? desempate(c) : 0);
        for (const c of [...vivos("a"), ...vivos("r")].sort((p, q) => orden(q) - orden(p))) { if (!activo) return; await entrar(c); }
        window.addEventListener("resize", reajustar);
        jugarTurno().catch((e) => { console.error(e); if (activo) fin(false); });
    }
    function reajustar() { if (!activo) return window.removeEventListener("resize", reajustar); ["a", "r"].forEach((l) => [0, 1].forEach((i) => { const s = document.getElementById(`dbl-spr-${l}${i}`); const c = lados[l].en[i]; if (s && c) { const e = $(".dbl-escena"); tamanoNativo(s, zoom() * (l === "a" ? 1.25 : 1), e.clientHeight * (l === "a" ? 0.42 : 0.3), e.clientWidth * 0.26); } })); }
    return { iniciar, activo: () => activo };
})();

// ===================== CÓMO SE JUEGAN =====================
// Las parejas de las rutas combaten en dobles (si tienes al menos dos Pokémon que puedan luchar).
const CLASES_DOBLES = new Set(["twins", "young_couple", "mysterious_sisters"]);
const puedeDobles = () => entrenador.equipo.filter((id) => entrenador.capturados[id] && entrenador.capturados[id].hp !== 0).length >= 2;
// Algunos rivales de dobles llevan un movimiento de apoyo al compañero que su especie puede aprender (Refuerzo, Señuelo…):
// sustituye a su movimiento de estado o, si no tiene, al de menos potencia.
async function darApoyo(equipo, prob = 0.4) {
    for (const c of equipo) {
        if (Math.random() > prob || c.movimientos.some((m) => APOYO.has(m.clave))) continue;
        try {
            const d = await cargarPokemon(c.baseId);
            const puede = [...new Set(d.moves.map((m) => m.move.name))].filter((n) => APOYO.has(n) && n !== "hold-hands");
            if (!puede.length) continue;
            const { nivel: _, ...m } = movDeAPI(await cargarMovimiento(puede[Math.floor(Math.random() * puede.length)]), 1);
            m.pp = m.pp || 20; m.ppAct = m.pp;
            let i = c.movimientos.findIndex((x) => x.cat === "est");
            if (i < 0) i = c.movimientos.length < 4 ? c.movimientos.length : c.movimientos.reduce((mi, x, k, l) => ((x.poder || 0) < (l[mi].poder || 0) ? k : mi), 0);
            c.movimientos[i] = m;
        } catch (_) {}
    }
}
async function combateEntrenadorDoble(cfg) {
    if (equipoDebilitado()) return avisoDebilitado();
    if (!puedeDobles()) return combateEntrenador(cfg);   // (con un solo Pokémon sano, como siempre)
    try {
        mostrarCargaBatalla(cfg.vs ? { vs: true, sprite: cfg.sprite, titulo: cfg.titulo } : {});
        AudioFX.musicaSonar(cfg.musicaEncuentro || cfg.musica || temaEntrenador());
        const D = dificultad();
        let specs = await ajustarEquipo(typeof cfg.specs === "function" ? await cfg.specs() : cfg.specs, cfg.pago || "ruta");
        if (specs.length < 2) { try { specs = specs.concat(await specsDeTipos(await tiposDelEquipo(specs), 1, specs[0].nivel, -2, 0)); } catch (_) {} }
        const premio = cfg.pago ? Math.round(pagoDe(cfg.pago, specs) * D.dinero * 1.2) * (llevaMonedaAmuleto() ? 2 : 1) : 0;   // (un dobles paga algo más)
        const antes = instantaneaNiveles();
        const [aliados, enemigos] = await Promise.all([prepararEquipo(await specsMiEquipo()), prepararEquipo(specs)]);
        specs.forEach((s) => marcarVisto(s.id));
        await darApoyo(enemigos);
        Dobles.iniciar({
            aliados, enemigos, titulo: cfg.titulo, entrenadorSprite: cfg.sprite, dialogo: cfg.dialogo, dialogoDerrota: cfg.dialogoDerrota, premio, ia: D.ia, darXP: true,
            musica: cfg.musica, musicaEncuentro: cfg.musicaEncuentro, victoria: cfg.victoria, fondo: cfg.fondo, climaInicial: cfg.clima || null, poderRival: cfg.poderRival ?? null,
            alTerminar: async (r) => {
                sincronizarEquipoCombate(r.equipo);
                if (r.gano) {
                    entrenador.batallasGanadas++; entrenador.entrenadoresVencidos = (entrenador.entrenadoresVencidos || 0) + 1;
                    entrenador.combatesDobles = (entrenador.combatesDobles || 0) + 1;
                    entrenador.dinero = (entrenador.dinero || 0) + premio; guardarEntrenador();
                    if (cfg.alGanar) await cfg.alGanar();
                } else perderDinero("Entrena a tu equipo y vuelve a intentarlo.");
                await trasSubirNivel(antes);
                renderAventura();
            },
        });
    } catch (_) { errorCombate(); }
}
