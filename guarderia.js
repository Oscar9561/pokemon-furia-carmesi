/* =========================================================
   GUARDERÍA POKÉMON · Villa Lúmina
   - Deja hasta dos Pokémon de tu equipo: con el tiempo (real) suben de nivel, uno cada 15 minutos, hasta el nivel del más
     fuerte de tu equipo. Al recogerlos se paga 100 ₽ y 100 ₽ más por nivel ganado.
   - Si los dos se llevan bien (mismo grupo huevo y sexos opuestos, o uno es Ditto), cada cierto tiempo aparece un huevo
     de la primera especie de su familia (la de la madre). Llevas hasta tres huevos a la vez; eclosionan tras unos cuantos
     combates (más los de las especies que tardan más en los juegos).
   - Si de un huevo nace una especie que ya tienes, la criadora se queda con la cría y te da un Caramelo Raro (en esta
     partida cada especie es un único Pokémon). Si nace variocolor y el tuyo no lo es, pasa a serlo... ¡por su hermano!
   Eclosión como en PokéRogue y con sus gráficos y sonidos: el huevo tiembla, se agrieta, estalla entre rayos de luz y
   salen sus fragmentos.
   ========================================================= */

const GUARDERIA_LUGAR = "villa-lumina", MAX_HUEVOS = 3, MIN_POR_NIVEL = 15;
const CRIADORA = { cargo: "Criadora Experta", nombre: "Paz", atlas: "images/trainer/expert_pokemon_breeder", fps: 12, voz: 1.15, color: "#ec407a" };
const prSE = (n) => prURL(`audio/se/${n}.wav`);
// Estado en la partida: los dos de la guardería (los que vuelven al equipo por otro camino salen de ella), cuándo entraron
// y con qué nivel, el huevo que espera y los huevos que llevas.
function guarderia() {
    if (!entrenador.guarderia || typeof entrenador.guarderia !== "object") entrenador.guarderia = {};
    const g = entrenador.guarderia;
    if (!Array.isArray(g.ids)) g.ids = [];
    if (!g.entrada || typeof g.entrada !== "object") g.entrada = {};
    if (!g.nivelEntrada || typeof g.nivelEntrada !== "object") g.nivelEntrada = {};
    g.ids = g.ids.filter((id) => entrenador.capturados[id] && !entrenador.equipo.includes(id)).slice(0, 2);
    if (!Array.isArray(entrenador.huevos)) entrenador.huevos = [];
    return g;
}
const enLaGuarderia = (id) => !!(entrenador && entrenador.guarderia && Array.isArray(entrenador.guarderia.ids) && entrenador.guarderia.ids.includes(id) && !entrenador.equipo.includes(id));
const nivelMaxEquipo = () => Math.max(1, ...entrenador.equipo.map((id) => (entrenador.capturados[id] && entrenador.capturados[id].nivel) || 1));
function nivelesGanados(id) {
    const g = guarderia(), e = entrenador.capturados[id]; if (!e) return 0;
    const min = Math.min(24 * 60, Math.max(0, (Date.now() - (g.entrada[id] || Date.now())) / 60000));
    const desde = g.nivelEntrada[id] || e.nivel || 1, tope = Math.min(100, Math.max(desde, nivelMaxEquipo()));
    return Math.max(0, Math.min(Math.floor(min / MIN_POR_NIVEL), tope - desde));
}
const precioRecoger = (id) => 100 + 100 * nivelesGanados(id);

// ===================== COMPATIBILIDAD Y HUEVOS =====================
// 0: no se llevan · 1: se llevan bien (un huevo cada 40 min) · 2: muy bien, son de la misma especie (cada 20 min)
async function compatibilidad(a, b) {
    if (!a || !b) return 0;
    const ea = entrenador.capturados[a], eb = entrenador.capturados[b];
    const [sa, sb] = await Promise.all([cargarEspecie(a), cargarEspecie(b)]);
    const grupos = (s) => s.egg_groups.map((x) => x.name);
    if (grupos(sa).includes("no-eggs") || grupos(sb).includes("no-eggs")) return 0;
    const ditto = (id) => id === 132;
    if (ditto(a) && ditto(b)) return 0;
    if (ditto(a) || ditto(b)) return 1;
    if (!ea.genero || !eb.genero || ea.genero === eb.genero) return 0;
    if (!grupos(sa).some((x) => grupos(sb).includes(x))) return 0;
    return a === b ? 2 : 1;
}
// La madre (o el que no es Ditto) decide la especie: la primera de su familia.
async function especieDelHuevo(a, b) {
    const madre = a === 132 ? b : b === 132 ? a : entrenador.capturados[a].genero === "f" ? a : b;
    const esp = await cargarEspecie(madre), ec = await pedir(esp.evolution_chain.url);
    const raiz = sacarId(ec.chain.species.url);
    return raiz && raiz <= TOTAL_NACIONAL ? raiz : madre;
}
// Color del huevo (los cuatro de PokéRogue) según lo fuerte que es su especie.
async function tierHuevo(id) {
    try { const t = (await cargarPokemon(id)).stats.reduce((s, x) => s + x.base_stat, 0); return t < 300 ? 0 : t < 400 ? 1 : t < 500 ? 2 : 3; } catch (_) { return 0; }
}
async function combatesParaEclosionar(id) {
    try { return limitar(Math.round((await cargarEspecie(id)).hatch_counter / 4), 3, 15); } catch (_) { return 6; }
}
// ¿Ha aparecido un huevo? (uno a la vez esperando en la guardería)
async function revisarHuevo() {
    const g = guarderia();
    if (g.huevo || g.ids.length < 2) return g.huevo;
    let c = 0; try { c = await compatibilidad(g.ids[0], g.ids[1]); } catch (_) { return null; }
    if (!c) { g.huevoDesde = 0; return null; }
    if (!g.huevoDesde) { g.huevoDesde = Date.now(); guardarEntrenador(); return null; }
    if (Date.now() - g.huevoDesde < (c === 2 ? 20 : 40) * 60000 / (tieneObjeto("oval-charm") ? 2 : 1)) return null;   // (con el Amuleto Oval, el doble de rápido)
    try {
        const especie = await especieDelHuevo(g.ids[0], g.ids[1]);
        g.huevo = { especie, tier: await tierHuevo(especie), combates: await combatesParaEclosionar(especie), shiny: Math.random() < probShiny() * 2 };
        g.huevoDesde = Date.now(); guardarEntrenador();
    } catch (_) {}
    return g.huevo;
}
// Tras cada combate, los huevos que llevas están un poco más cerca de abrirse.
function avanzarHuevos() {
    if (!Array.isArray(entrenador.huevos) || !entrenador.huevos.length) return;
    entrenador.huevos.forEach((h) => { h.combates = Math.max(0, (h.combates || 0) - 1); });
}

// ===================== ECLOSIÓN =====================
let eclosionando = false;
async function eclosionPendiente() {
    if (eclosionando || !entrenador || !Array.isArray(entrenador.huevos)) return;
    if (document.querySelector(".capa-batalla:not(.oculta), .capa-conversa, .capa-resumen, .capa-eclosion, .capa-evolucion")) return;
    const i = entrenador.huevos.findIndex((h) => h.combates <= 0); if (i < 0) return;
    const h = entrenador.huevos.splice(i, 1)[0];
    eclosionando = true;
    try { await escenaEclosion(h); nacer(h); } finally { eclosionando = false; guardarEntrenador(); }
    if (entrenador.huevos.some((x) => x.combates <= 0)) setTimeout(eclosionPendiente, 400);
    else renderAventura();
}
function nacer(h) {
    const id = h.especie, prev = entrenador.capturados[id];
    entrenador.eclosiones = (entrenador.eclosiones || 0) + 1;
    marcarVisto(id);
    if (prev) {
        if (h.shiny && !prev.shiny) { prev.shiny = true; toast(`¡La cría era variocolor! La criadora la cuida y tu ${nombreDe(id)} se ha contagiado de su brillo.`, 5200); }
        else { meterObjeto("rare-candy", 1); toast(`Ya tienes un ${nombrePk(id)}: la criadora se queda con la cría y te da un Caramelo Raro.`, 4600); }
        return;
    }
    entrenador.capturados[id] = { nivel: 1, xp: 0, objeto: null, genero: generoAleatorio(id), bola: "poke-ball", movimientos: null, nivelCaptura: 1, shiny: !!h.shiny,
        naturaleza: naturalezaAleatoria(), habSlot: Math.random() < 0.15 ? 3 : Math.random() < 0.5 ? 1 : 2, lugarCaptura: GUARDERIA_LUGAR, nacido: true };
    if (entrenador.equipo.length < 6) entrenador.equipo.push(id);
    asegurarMovimientos(id);
    toast(`¡${nombrePk(id)} ha nacido!${h.shiny ? " ¡Es variocolor!" : ""} ${entrenador.equipo.includes(id) ? "Se une a tu equipo." : "Está en tu Caja."}`, 4200);
}
// La escena: el huevo tiembla tres veces (cada vez más agrietado), estalla en luz y sale la cría entre sus fragmentos.
async function escenaEclosion(h) {
    const capa = document.createElement("div");
    capa.className = "capa-eclosion";
    capa.innerHTML = `<canvas class="ec-rayos"></canvas>
        <div class="ec-huevo"><canvas class="ec-cascara"></canvas><canvas class="ec-grieta"></canvas></div>
        <div class="ec-poke"><img class="ec-sprite" alt=""></div>
        <div class="ec-flash"></div>
        <div class="ventana-pk ec-texto">¿Eh...?</div>`;
    document.body.appendChild(capa); document.body.style.overflow = "hidden";
    AudioFX.musicaSonar(mus("heal"));
    const q = (s) => capa.querySelector(s), k = Math.min(6, Math.max(3, Math.round(Math.min(innerWidth, innerHeight) / 110)));
    capa.style.setProperty("--k", k);
    let huevo, grieta, rayos, trozos;
    try { [huevo, grieta, rayos, trozos] = await Promise.all(["egg", "egg_crack", "egg_lightrays", "egg_shard"].map((n) => Atlas.cargar(prURL(`images/egg/${n}`)))); }
    catch (_) { capa.remove(); return; }
    const cas = q(".ec-cascara"), gr = q(".ec-grieta"), ry = q(".ec-rayos");
    cas.width = huevo.w; cas.height = huevo.h; Atlas.dibujar(cas, huevo, Math.min(3, h.tier || 0));
    gr.width = grieta.w; gr.height = grieta.h;
    ry.width = rayos.w; ry.height = rayos.h;
    const tiembla = async (fuerza, n) => {
        for (let i = 0; i < n; i++) {
            await q(".ec-huevo").animate([{ transform: "translateX(0)" }, { transform: `translateX(${fuerza}px)` }, { transform: `translateX(${-fuerza}px)` }, { transform: "translateX(0)" }], { duration: 160, easing: "ease-in-out" }).finished;   // (con transform: su translate lo centra)
        }
    };
    await esperar(700);
    q(".ec-texto").textContent = "¿Eh...?";
    for (const fase of [1, 2, 3]) {
        await tiembla(2 + fase * 2, 2 + fase);
        Atlas.dibujar(gr, grieta, fase);
        AudioFX.sonar(prSE("egg_crack"), { vol: 0.6 });
        await esperar(fase === 3 ? 450 : 650);
    }
    // ¡Se abre!
    Atlas.dibujar(gr, grieta, 4);
    await tiembla(10, 4);
    AudioFX.sonar(prSE("egg_hatch"), { vol: 0.7 });
    capa.classList.add("abierto");
    let fr = 0; const giro = setInterval(() => { Atlas.dibujar(ry, rayos, fr++ % 4); }, 90);
    Atlas.dibujar(ry, rayos, 0);
    q(".ec-flash").animate([{ opacity: 1 }, { opacity: 0 }], { duration: 900, easing: "ease-out", fill: "forwards" });
    q(".ec-huevo").style.visibility = "hidden";
    // Fragmentos de su cáscara (los de su color), que salen disparados y caen.
    const base = Math.min(3, h.tier || 0) * 4;
    for (let i = 0; i < 18; i++) {
        const c = document.createElement("canvas"); c.className = "ec-trozo";
        c.width = trozos.w; c.height = trozos.h; Atlas.dibujar(c, trozos, base + (i % 4));
        capa.appendChild(c);
        const ang = (i / 18) * Math.PI * 2 + Math.random() * 0.3, v = (90 + Math.random() * 120) * k / 4;
        const dx = Math.cos(ang) * v, dy = Math.sin(ang) * v - 40 * k / 4;
        c.animate([{ transform: "translate(-50%,-50%) translate(0,0) rotate(0)", opacity: 1 },
                   { transform: `translate(-50%,-50%) translate(${dx}px, ${dy + 160 * k / 4}px) rotate(${Math.random() * 720 - 360}deg)`, opacity: 0 }],
            { duration: 1100 + Math.random() * 400, easing: "cubic-bezier(.2,.6,.4,1)", fill: "forwards" });
    }
    const spr = q(".ec-sprite");
    await montarPokemon(spr, h.especie, { shiny: !!h.shiny }).then((el) => el && tamanoNativo(el, Math.max(3, k), 280, 280)).catch(() => {});
    capa.classList.add("con-poke");
    AudioFX.grito(h.especie, { vol: 0.6 });
    AudioFX.fanfarria(MUSICA.captura);
    if (h.shiny) setTimeout(() => AudioFX.efecto("sparkle", { vol: 0.6 }), 400);
    q(".ec-texto").innerHTML = `¡Ha nacido ${nombrePk(h.especie)}!${h.shiny ? " <b>¡Es variocolor!</b>" : ""}`;
    await new Promise((res) => {
        const fin = () => { document.removeEventListener("keydown", tecla); res(); };
        const tecla = (e) => { if (["Enter", " ", "Escape"].includes(e.key)) fin(); };
        setTimeout(() => { capa.addEventListener("click", fin, { once: true }); document.addEventListener("keydown", tecla); }, 900);
    });
    clearInterval(giro);
    capa.classList.add("cerrando"); await esperar(250);
    capa.remove();
    if (!document.querySelector(".capa-resumen, .capa-pe, .capa-conversa")) document.body.style.overflow = "";
}

// ===================== PANTALLA =====================
async function renderGuarderia(cont) {
    const g = guarderia();
    AudioFX.musicaSonar(mus("heal"));
    const huevo = await revisarHuevo().catch(() => null);
    const slot = (id, i) => {
        if (!id) return `<article class="gd-hueco"><span class="hub-etq">Hueco ${i + 1}</span><p>Vacío</p>
            <button class="btn-sec" data-dejar ${entrenador.equipo.length <= 1 ? "disabled" : ""}>Dejar un Pokémon</button></article>`;
        const e = entrenador.capturados[id], gan = nivelesGanados(id), desde = g.nivelEntrada[id] || e.nivel;
        return `<article class="gd-hueco lleno">
            <span class="hub-etq">Hueco ${i + 1}</span>
            ${htmlIcono(id, "gd-icono", !!e.shiny)}
            <b>${nombreDe(id)}</b><small>Nv. ${desde}${gan ? ` → <span class="gd-sube">${desde + gan}</span>` : ""} ${e.genero === "f" ? "♀" : e.genero === "m" ? "♂" : ""}</small>
            <button class="btn-sec" data-recoger="${id}" ${entrenador.equipo.length >= 6 ? "disabled" : ""}>Recoger · ${dineroTexto(precioRecoger(id))}</button>
        </article>`;
    };
    let relacion = "Deja dos Pokémon y te diré si se llevan bien.";
    if (g.ids.length === 2) {
        const c = await compatibilidad(g.ids[0], g.ids[1]).catch(() => 0);
        relacion = c === 2 ? "Se llevan de maravilla: ¡a lo mejor encontramos algo pronto!" : c === 1 ? "Se llevan bien. Quién sabe, igual aparece algo." : "Prefieren jugar con otros Pokémon...";
    }
    const huevos = entrenador.huevos;
    cont.innerHTML = `
        <div class="cabecera-modo con-volver">
            <button class="btn-volver" data-volver>Salir</button>
            <h2>Guardería Pokémon</h2>
        </div>
        <section class="lugar-cabecera guarderia-cabecera">
            <img class="lc-fondo" src="${urlFondo("g6-meadow")}" alt="">
            <div class="lc-escena"><canvas class="metro-agente" id="gd-criadora"></canvas></div>
            <div class="lc-info">
                <span class="hub-etq">${CRIADORA.cargo} ${CRIADORA.nombre}</span>
                <h2>Guardería Pokémon</h2>
                <p>Tus Pokémon suben de nivel mientras están aquí: uno cada ${MIN_POR_NIVEL} minutos, hasta el nivel del más fuerte de tu equipo.</p>
            </div>
        </section>
        <div class="gd-huecos">${[0, 1].map((i) => slot(g.ids[i], i)).join("")}</div>
        <p class="nota gd-relacion">${relacion}</p>
        ${huevo ? `<section class="gd-huevo-nuevo">
            <canvas class="gd-huevo-cv" data-tier="${huevo.tier}"></canvas>
            <div><span class="hub-etq">¡Sorpresa!</span><p>Hemos encontrado un huevo junto a tus Pokémon. ¿Te lo llevas?</p></div>
            <button class="btn-grande" data-llevar ${huevos.length >= MAX_HUEVOS ? "disabled" : ""}>${huevos.length >= MAX_HUEVOS ? `Ya llevas ${MAX_HUEVOS}` : "Llevármelo"}</button>
        </section>` : ""}
        <section class="metro-viaje">
            <span class="hub-etq">Tus huevos (${huevos.length}/${MAX_HUEVOS})</span>
            <div class="gd-huevos">${huevos.length ? huevos.map((x) => `<div class="gd-mi-huevo"><canvas class="gd-huevo-cv" data-tier="${x.tier}"></canvas>
                <small>${x.combates <= 0 ? "¡Se mueve!" : x.combates <= 2 ? "Se oyen ruidos" : x.combates <= 5 ? "A veces se mueve" : "Le falta mucho"}</small></div>`).join("")
                : `<p class="nota">No llevas ningún huevo. Eclosionan tras varios combates.</p>`}</div>
        </section>`;
    pintarIconos(cont);
    montarEntrenador(document.getElementById("gd-criadora"), "expert_pokemon_breeder", { bucle: true, fps: 12 }).then((el) => el && tamanoNativo(el, 2, 130)).catch(() => {});
    Atlas.cargar(prURL("images/egg/egg")).then((a) => cont.querySelectorAll(".gd-huevo-cv").forEach((cv) => { cv.width = a.w; cv.height = a.h; Atlas.dibujar(cv, a, Number(cv.dataset.tier) || 0); })).catch(() => {});
    cont.querySelector("[data-volver]").onclick = () => { subAventura = "principal"; renderAventura(); };
    cont.querySelectorAll("[data-dejar]").forEach((b) => b.onclick = async () => {
        if (entrenador.equipo.length <= 1) return toast("Necesitas al menos un Pokémon en tu equipo.");
        const id = await elegirDelEquipo("¿A quién dejas en la Guardería?", { valido: () => (entrenador.equipo.length <= 1 ? "Necesitas al menos un Pokémon en tu equipo." : null) });
        if (!id) return;
        const e = entrenador.capturados[id];
        entrenador.equipo = entrenador.equipo.filter((x) => x !== id); delete e.hp; e.estado = null;
        g.ids.push(id); g.entrada[id] = Date.now(); g.nivelEntrada[id] = e.nivel || 1; g.huevoDesde = 0;
        guardarEntrenador(); AudioFX.ui("select"); toast(`${nombreDe(id)} se queda en la Guardería.`);
        renderGuarderia(cont);
    });
    cont.querySelectorAll("[data-recoger]").forEach((b) => b.onclick = async () => {
        const id = Number(b.dataset.recoger), precio = precioRecoger(id), gan = nivelesGanados(id), e = entrenador.capturados[id];
        if ((entrenador.dinero || 0) < precio) { AudioFX.ui("error"); return toast("No tienes dinero suficiente para recogerlo."); }
        if (entrenador.equipo.length >= 6) return toast("Tu equipo está lleno.");
        entrenador.dinero -= precio;
        if (gan) { e.nivel = Math.min(100, (g.nivelEntrada[id] || e.nivel) + gan); e.xp = 0; }
        g.ids = g.ids.filter((x) => x !== id); delete g.entrada[id]; delete g.nivelEntrada[id]; g.huevoDesde = 0;
        entrenador.equipo.push(id); guardarEntrenador();
        AudioFX.efecto(gan ? "level_up_fanfare" : "pb_rel", { vol: 0.5 });
        toast(gan ? `¡${nombreDe(id)} ha subido ${gan} ${gan === 1 ? "nivel" : "niveles"} en la Guardería! (Nv. ${e.nivel})` : `${nombreDe(id)} vuelve a tu equipo.`, 3600);
        renderGuarderia(cont);
    });
    const bl = cont.querySelector("[data-llevar]");
    if (bl) bl.onclick = () => {
        if (entrenador.huevos.length >= MAX_HUEVOS || !g.huevo) return;
        entrenador.huevos.push(g.huevo); g.huevo = null; g.huevoDesde = Date.now();
        guardarEntrenador(); AudioFX.efecto("item_fanfare"); toast("¡Te llevas el huevo! Cuídalo bien: eclosionará tras unos cuantos combates.", 3600);
        renderGuarderia(cont);
    };
}
// La guardería, en la pantalla de Villa Lúmina.
const _tarjetasAntesGuarderia = typeof tarjetasLugarExtra === "function" ? tarjetasLugarExtra : null;
tarjetasLugarExtra = (L) => {
    const previas = _tarjetasAntesGuarderia ? _tarjetasAntesGuarderia(L) : [];
    if (L.id !== GUARDERIA_LUGAR) return previas;
    const g = guarderia(), aviso = !!g.huevo;
    return previas.concat([{ html: `<button class="lg-tarjeta lg-edificio guarderia" data-sub="guarderia">
            <canvas class="lg-npc" data-sprite="expert_pokemon_breeder"></canvas>
            <div class="lg-info"><span class="hub-etq">Edificio</span><h4>Guardería Pokémon</h4><p>${g.ids.length ? `Cuida de ${g.ids.map(nombreDe).join(" y ")}.` : "Deja a tus Pokémon y subirán de nivel."}${aviso ? " ¡Tienen algo para ti!" : ""}</p></div>
            ${aviso ? '<i class="lg-exclama">!</i>' : ""}
        </button>` }]);
};
LOGROS.push(
    { id: "huevo-1", nombre: "¡Ha nacido!", desc: "Haz eclosionar un huevo de la Guardería.", icono: "lucky-egg", meta: 1, valor: () => entrenador.eclosiones || 0, premio: [["oval-charm", 1]] },
    { id: "huevo-20", nombre: "Criador experto", desc: "Haz eclosionar 20 huevos.", icono: "oval-charm", meta: 20, valor: () => entrenador.eclosiones || 0, premio: [["shiny-charm", 1]] },
);
