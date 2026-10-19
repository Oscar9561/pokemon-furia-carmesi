/* =========================================================
   ZONA SAFARI · junto a Ciudad Hojarasca (como en los juegos clásicos)
   Se paga la entrada y se reciben Safari Balls para unos cuantos encuentros. Aquí no se combate: a cada Pokémon se le
   puede lanzar una Safari Ball, cebo (huye menos, pero cuesta más atraparlo) o barro (al revés), y en cualquier momento
   puede escapar. Las especies cambian cada semana. Gráficos: PokéRogue (cartel, cebo y barro) y PokéAPI (Safari Ball).
   ========================================================= */

const SAFARI_MEDALLAS = 2, SAFARI_CIUDAD = 3, SAFARI_BALLS = 20, SAFARI_PASOS = 10;
const precioSafari = () => 1500 + 250 * nMedallas();
const safariAbierto = () => nMedallas() >= SAFARI_MEDALLAS;
const semanaSafari = () => Math.floor((Date.now() / 86400000 + 3) / 7);   // (cambia los lunes)
// Niveles según cómo de avanzada va la aventura.
function nivelesSafari() {
    const g = GIMNASIOS[Math.max(0, Math.min(15, nMedallas() - 1))].nivel;
    return [Math.max(5, g - 6), g + 2];
}
// Las especies de esta semana: diez, las últimas más raras (siempre iguales en la misma semana y partida).
const _safari = new Map();
async function tablaSafari() {
    const [min, max] = nivelesSafari(), k = `${semanaSafari()}:${min}:${entrenador.creada || 0}`;
    if (_safari.has(k)) return _safari.get(k);
    const rnd = semilla("safari:" + k);
    const pool = poolBatalla().map((p) => p.id).filter((id) => !esLegendario(id) && especieApta(id, min, max));
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    const pesos = [22, 20, 18, 15, 12, 10, 8, 5, 3, 2];
    const t = { min, max, tabla: pool.slice(0, pesos.length).map((id, i) => ({ id, peso: pesos[i], raro: i >= 8 })) };
    if (t.tabla.length) _safari.set(k, t);
    return t;
}

// ===================== LA VISITA =====================
let safari = null;   // { balls, pasos, actual, capturas: [] } mientras dura (no se guarda: al salir, se acaba)
async function nuevoEncuentroSafari() {
    const t = await tablaSafari();
    let r = Math.random() * t.tabla.reduce((s, x) => s + x.peso, 0);
    const id = (t.tabla.find((x) => (r -= x.peso) < 0) || t.tabla[0]).id;
    const nivel = aleatorioEntre(t.min, t.max);
    let tasa = 45, vel = 60;
    try { tasa = (await cargarEspecie(id)).capture_rate || 45; } catch (_) {}
    try { (await cargarPokemon(id)).stats.forEach((s) => { if (s.stat.name === "speed") vel = s.base_stat; }); } catch (_) {}
    marcarVisto(id);
    safari.pasos--;
    safari.actual = { id, nivel, shiny: Math.random() < probShiny(), tasa, vel, cebo: 0, barro: 0 };
}
// Probabilidades (como en los juegos clásicos): el cebo la reduce a la mitad y hace que huya menos; el barro, al revés.
const capturaSafari = (a) => limitar((a.tasa / 255) * 0.85 * 2 ** (a.barro - a.cebo), 0.03, 0.92);
const huidaSafari = (a) => limitar((0.06 + a.vel / 600) * 2 ** (a.barro - a.cebo), 0.03, 0.8);

function renderSafari(cont) {
    if (!safariAbierto()) { subAventura = "principal"; return renderAventura(); }
    if (!safari) return renderEntradaSafari(cont);
    const a = safari.actual;
    AudioFX.musicaSonar(mus("mystery_encounter_fun_and_games"));
    cont.innerHTML = `
        <div class="cabecera-modo con-volver">
            <button class="btn-volver" data-salir>Salir</button>
            <h2>Zona Safari</h2>
        </div>
        <section class="safari-escena hora-${claseHora()}" style="background-image:url('${urlFondo("g6-meadow")}')">
            <div class="sz-poke"><img class="sz-sprite" id="sz-sprite" alt=""><div class="sz-efecto"></div></div>
            <img class="sz-bola" src="${urlItem("safari-ball")}" alt="">
            <div class="sz-datos ventana-pk"><span><img src="${urlItem("safari-ball")}" alt=""> <b class="num-pk">×${safari.balls}</b></span><span>Pasos <b class="num-pk">${safari.pasos}</b></span></div>
        </section>
        <p class="sz-texto ventana-pk" data-texto>¡Un ${nombrePk(a.id)} salvaje (Nv. ${a.nivel}) apareció!</p>
        <div class="sz-acciones">
            <button class="btn-grande" data-acc="bola" ${safari.balls ? "" : "disabled"}><img src="${urlItem("safari-ball")}" alt="">Safari Ball</button>
            <button class="btn-sec" data-acc="cebo">Cebo</button>
            <button class="btn-sec" data-acc="barro">Barro</button>
            <button class="btn-sec" data-acc="huir">Huir</button>
        </div>`;
    const esc = cont.querySelector(".safari-escena"), sprite = document.getElementById("sz-sprite");
    const texto = cont.querySelector("[data-texto]"), botones = [...cont.querySelectorAll(".sz-acciones button")];
    montarPokemon(sprite, a.id, { shiny: a.shiny }).then((el) => el && tamanoNativo(el, 2, 190, 260));
    AudioFX.grito(a.id, { vol: 0.55 });
    let ocupado = false;
    // (si sales o cambias de pantalla en mitad de una animación, lo que quedaba de la acción se corta)
    const visita = safari, ABORTO = {};
    const espera = async (ms) => { await esperar(ms); if (safari !== visita || !esc.isConnected) throw ABORTO; };
    const decirSZ = (t, ms = 900) => { texto.textContent = t; return espera(ms / Math.min(2, velJuego())); };
    const bloquear = (si) => { ocupado = si; botones.forEach((b) => { b.disabled = si || (b.dataset.acc === "bola" && !safari.balls); }); };
    const siguiente = async () => {
        if (!safari.pasos || !safari.balls) return terminarSafari(cont, safari.balls ? "Se acabó el tiempo de la visita." : "No te quedan Safari Balls.");
        await nuevoEncuentroSafari(); renderSafari(cont);
    };
    // Tras cada acción (si no se ha capturado), puede escapar.
    const quizaHuye = async () => {
        if (Math.random() < huidaSafari(a)) {
            AudioFX.efecto("flee"); esc.classList.add("huye");
            await decirSZ(`¡El ${nombrePk(a.id)} salvaje ha huido!`, 1300);
            return siguiente();
        }
        await decirSZ(`¿Qué vas a hacer?`, 200); bloquear(false);
    };
    // Cebo y barro: el gráfico de PokéRogue sobre el Pokémon.
    const lanzarCosa = async (que) => {
        const fx = cont.querySelector(".sz-efecto"), cv = document.createElement("canvas");
        cv.className = "sz-cosa " + que; fx.innerHTML = ""; fx.appendChild(cv);
        try { const at = await Atlas.cargar(prURL("images/mystery-encounters/safari_zone_" + que)); cv.width = at.w; cv.height = at.h; Atlas.animar(cv, at, { fps: 8, bucle: true }); } catch (_) {}
        AudioFX.efecto("pb_throw", { vol: 0.5 });
    };
    const accion = (acc) => accionSZ(acc).catch((e) => { if (e !== ABORTO) throw e; });
    const accionSZ = async (acc) => {
        if (ocupado) return; bloquear(true);
        if (acc === "huir") { AudioFX.efecto("flee"); await decirSZ("Te alejas sin hacer ruido…", 800); return siguiente(); }
        if (acc === "cebo") {
            a.cebo = Math.min(3, a.cebo + 1); await lanzarCosa("bait");
            await decirSZ(`¡${nombrePk(a.id)} está comiendo! Parece más tranquilo…`, 1300); return quizaHuye();
        }
        if (acc === "barro") {
            a.barro = Math.min(3, a.barro + 1); await lanzarCosa("mud");
            await decirSZ(`¡${nombrePk(a.id)} se ha enfadado! Será más fácil atraparlo… si no huye.`, 1400); return quizaHuye();
        }
        // Safari Ball: vuela, lo absorbe con luz y se menea (de 0 a 3 veces) antes de cerrarse o de que se escape.
        safari.balls--; cont.querySelector(".sz-datos b").textContent = "×" + safari.balls;
        await decirSZ(`¡Lanzas una Safari Ball!`, 300);
        AudioFX.efecto("pb_throw"); esc.classList.add("lanza"); await espera(500);
        AudioFX.efecto("pb_rel"); esc.classList.add("dentro"); await espera(450);
        const exito = Math.random() < capturaSafari(a), meneos = exito ? 3 : Math.floor(Math.random() * 3);
        if (exito) await capturarSafari(a);   // (ya es tuyo, aunque salgas antes de que acabe la animación)
        for (let i = 0; i < meneos; i++) { AudioFX.efecto("pb_move"); esc.classList.remove("menea"); void esc.offsetWidth; esc.classList.add("menea"); await espera(650); }
        if (exito) {
            AudioFX.efecto("pb_lock"); await decirSZ("¡Clic!", 600);
            AudioFX.fanfarria(MUSICA.captura);
            await decirSZ(`¡Ya está! ¡${nombrePk(a.id)} atrapado!`, 1600);
            return siguiente();
        }
        AudioFX.efecto("pb_rel"); esc.classList.remove("lanza", "dentro", "menea");
        await decirSZ(["¡Oh, no! ¡El Pokémon se ha escapado!", "¡Vaya! ¡Parecía que lo tenías!", "¡Argh! ¡Casi lo consigues!"][meneos], 1000);
        if (!safari.balls) return terminarSafari(cont, "No te quedan Safari Balls.");
        return quizaHuye();
    };
    botones.forEach((b) => b.onclick = () => accion(b.dataset.acc));
    cont.querySelector("[data-salir]").onclick = () => terminarSafari(cont, "Has salido de la Zona Safari.");
}
// El capturado entra como cualquier captura (con su Safari Ball).
async function capturarSafari(a) {
    const [c] = await prepararEquipo([{ id: a.id, nivel: a.nivel, shiny: a.shiny, probOculta: 0.15 }]);
    c.bolaCaptura = "safari-ball";
    entrenador.safariCapturas = (entrenador.safariCapturas || 0) + 1;
    if (safari) safari.capturas.push(a.id);
    registrarCaptura(c);
}
function terminarSafari(cont, motivo) {
    const n = safari ? safari.capturas.length : 0;
    safari = null;
    guardarEntrenador();
    toast(`${motivo} ${n ? `Has atrapado ${n} Pokémon.` : "No has atrapado ninguno esta vez."}`, 3600);
    subAventura = "safari"; renderSafari(cont);
}
// La entrada: el cartel, lo que se ve esta semana y el precio.
function renderEntradaSafari(cont) {
    AudioFX.musicaSonar(mus("meadow"));
    const precio = precioSafari();
    cont.innerHTML = `
        <div class="cabecera-modo con-volver">
            <button class="btn-volver" data-volver>Salir</button>
            <h2>Zona Safari</h2>
        </div>
        <section class="lugar-cabecera safari-entrada">
            <img class="lc-fondo" src="${urlFondo("g6-meadow")}" alt="">
            <div class="lc-escena"><canvas class="safari-cartel" id="safari-cartel"></canvas></div>
            <div class="lc-info">
                <span class="hub-etq">Junto a ${GIMNASIOS[SAFARI_CIUDAD - 1].ciudad}</span>
                <h2>Zona Safari</h2>
                <p>Aquí no se combate: lánzales Safari Balls, cebo o barro. ¡Y date prisa, que se escapan!</p>
            </div>
        </section>
        <section class="metro-viaje">
            <span class="hub-etq">Esta semana se han visto</span>
            <div class="lg-especies" data-especies><div class="cargando"></div></div>
            <p class="nota">Entrada: ${dineroTexto(precio)} · ${SAFARI_BALLS} Safari Balls y ${SAFARI_PASOS} encuentros. Las especies cambian cada lunes.</p>
            <div class="metro-acciones"><button class="btn-grande" data-entrar>Entrar (${dineroTexto(precio)})</button></div>
        </section>`;
    pintarIconos(cont);
    Atlas.cargar(prURL("images/mystery-encounters/safari_zone")).then((a) => { const cv = document.getElementById("safari-cartel"); if (!cv) return; cv.width = a.w; cv.height = a.h; Atlas.dibujar(cv, a, 0); tamanoNativo(cv, 2); }).catch(() => {});
    tablaSafari().then((t) => {
        const caja = cont.querySelector("[data-especies]"); if (!caja || !caja.isConnected) return;
        const vistos = new Set(entrenador.vistos || []);
        caja.innerHTML = t.tabla.map((x) => {
            const cap = !!entrenador.capturados[x.id], visto = cap || vistos.has(x.id);
            return `<span class="lg-especie ${visto ? "" : "desconocida"} ${cap ? "capturada" : ""} ${x.raro ? "rara" : ""}" title="${visto ? nombrePk(x.id) : "???"}${x.raro ? " · raro" : ""}">${htmlIcono(x.id, "lg-icono")}${cap ? `<img class="lg-capt" src="${urlItem("poke-ball")}" alt="">` : ""}</span>`;
        }).join("") + `<small class="lg-pesca-nv">Nv. ${t.min}-${t.max}</small>`;
        pintarIconos(caja);
    }).catch(() => {});
    cont.querySelector("[data-volver]").onclick = () => { subAventura = "principal"; renderAventura(); };
    cont.querySelector("[data-entrar]").onclick = async () => {
        if ((entrenador.dinero || 0) < precio) { AudioFX.ui("error"); return toast("No tienes dinero suficiente para la entrada.", 2600); }
        entrenador.dinero -= precio; guardarEntrenador();
        safari = { balls: SAFARI_BALLS, pasos: SAFARI_PASOS, actual: null, capturas: [] };
        AudioFX.ui("select");
        await nuevoEncuentroSafari();
        renderSafari(cont);
    };
}
