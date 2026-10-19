/* =========================================================
   MOCHILA, TIENDA Y CENTRO POKÉMON
   Mochila por bolsillos (usar, dar y quitar objetos, MT, piedras),
   Tienda Pokémon con su dependiente (comprar y vender) y Centro Pokémon
   con la enfermera. Sprites de personajes: Pokémon Showdown; objetos: PokéAPI.
   Depende de data.js (objetos), battle.js (pantalla de equipo) y script.js.
   ========================================================= */

// ===================== INVENTARIO =====================
const cantidadObj = (k) => entrenador.mochila[k] || 0;
function meterObjeto(k, n = 1) { entrenador.mochila[k] = cantidadObj(k) + n; }
function sacarObjeto(k, n = 1) {
    const q = cantidadObj(k) - n;
    if (q > 0) entrenador.mochila[k] = q; else delete entrenador.mochila[k];
}
const quienLleva = (k) => Object.keys(entrenador.capturados).map(Number).filter((id) => entrenador.capturados[id].objeto === k);
const tieneObjeto = (k) => cantidadObj(k) > 0 || quienLleva(k).length > 0;
const objetoUnico = (k) => obj(k).bolsillo === "mt" || obj(k).bolsillo === "clave";
// Mete los premios en la mochila (las MT y los objetos clave no se repiten). Devuelve los que se han dado.
function darObjetos(lista) {
    const dados = lista.filter(([k]) => k && !(objetoUnico(k) && tieneObjeto(k)));
    dados.forEach(([k, n]) => meterObjeto(k, n));
    return dados;
}
const textoPremios = (lista) => lista.map(([k, n]) => (n > 1 ? `${n}× ` : "") + obj(k).nombre).join(", ");
function equiparObjeto(id, k) {
    const e = entrenador.capturados[id], antes = e.objeto;
    sacarObjeto(k);
    if (antes) meterObjeto(antes);
    e.objeto = k;
    guardarEntrenador(); AudioFX.ui("select");
    toast(`${nombreDe(id)} ahora lleva ${obj(k).nombre}.${antes ? ` ${obj(antes).nombre} ha vuelto a la mochila.` : ""}`);
}
function quitarObjeto(id) {
    const e = entrenador.capturados[id]; if (!e || !e.objeto) return;
    meterObjeto(e.objeto);
    toast(`Has guardado ${obj(e.objeto).nombre} en la mochila.`);
    e.objeto = null; guardarEntrenador();
}

// ===================== ELEGIR POKÉMON, OBJETO O MOVIMIENTO =====================
// Pantalla de equipo para elegir a quién va un objeto. etiqueta(id): «APTO», «NO APTO»… en lugar de los PS;
// valido(id, miembro): null si vale o el texto del aviso. Devuelve el id o null.
async function elegirDelEquipo(mensaje, { etiqueta, valido } = {}) {
    const ids = [...entrenador.equipo];
    const [etqs, miembros] = await Promise.all([etiqueta ? Promise.all(ids.map((id) => etiqueta(id))) : null, miembrosEquipo()]);
    return new Promise((resolve) => {
        abrirEquipoModal((cerrar, avisar) => ({
            mensaje, textoCancelar: "Atrás",
            etiqueta: etqs ? (i) => etqs[i] : undefined,
            alCancelar: () => { cerrar(); resolve(null); },
            alElegir: (i) => {
                const aviso = valido ? valido(ids[i], miembros[i]) : null;
                if (aviso) { AudioFX.ui("error"); avisar(aviso); return; }
                cerrar(); resolve(ids[i]);
            },
        }), miembros);
    });
}
function ventanaEleccion(titulo, cuerpo, alMontar) {
    return new Promise((resolve) => {
        const capa = document.createElement("div");
        capa.className = "capa-resumen";
        capa.innerHTML = `<div class="resumen elegir"><h3>${titulo}</h3>${cuerpo}<div class="res-acciones"><button class="btn-sec" data-no>Atrás</button></div></div>`;
        document.body.appendChild(capa);
        const fin = (v) => { capa.remove(); document.removeEventListener("keydown", onEsc); resolve(v); };
        const onEsc = (e) => { if (e.key === "Escape") fin(null); };
        document.addEventListener("keydown", onEsc);
        capa.querySelector("[data-no]").onclick = () => fin(null);
        capa.addEventListener("click", (e) => { if (e.target === capa) fin(null); });
        alMontar(capa, fin);
        AudioFX.ui("menu_open");
    });
}
// Objetos de la mochila que se pueden equipar.
function elegirObjetoMochila(titulo) {
    const lista = ordenarObjetos(Object.keys(entrenador.mochila).filter((k) => cantidadObj(k) > 0 && puedeLlevarse(k)));
    const cuerpo = lista.length
        ? `<div class="eo-lista">${lista.map((k) => `<button class="eo-fila" data-k="${k}"><img src="${urlObj(k)}" alt="">
            <span class="eo-info"><b>${obj(k).nombre}</b><span>${efectoCorto(k)}</span></span>
            <span class="eo-cant num-pk">${objetoUnico(k) ? "" : "×" + cantidadObj(k)}</span></button>`).join("")}</div>`
        : `<p class="nota">No tienes objetos para equipar. Cómpralos en la Tienda o encuéntralos explorando.</p>`;
    return ventanaEleccion(titulo, cuerpo, (capa, fin) => {
        capa.querySelectorAll("[data-k]").forEach((b) => b.onclick = () => { AudioFX.ui("select"); fin(b.dataset.k); });
    });
}
function elegirMovimientoFuera(id, titulo, valido) {
    const movs = entrenador.capturados[id].movimientos || [];
    const cuerpo = `<div class="apr-lista">${movs.map((x, i) => `<button class="apr-op" data-i="${i}" ${valido(x) ? "" : "disabled"}>${htmlMovFicha(x)}</button>`).join("")}</div>`;
    return ventanaEleccion(titulo, cuerpo, (capa, fin) => {
        capa.querySelectorAll("[data-i]").forEach((b) => b.onclick = () => { AudioFX.ui("select"); fin(Number(b.dataset.i)); });
    });
}

// ===================== USAR OBJETOS FUERA DE COMBATE =====================
const usableFuera = (k) => CURA_PS[k] != null || !!CURA_ESTADO[k] || !!REVIVIR[k] || !!VITAMINAS[k] || k === "rare-candy"
    || k === "pp-up" || k === "pp-max" || OBJ_EVOLUCION.has(k) || obj(k).bolsillo === "mt" || !!MENTAS[k] || k === "ability-capsule" || k === "ability-patch";
const puedeCurarFuera = (k, m) => (REVIVIR[k] ? m.hp <= 0
    : m.hp > 0 && ((CURA_PS[k] != null && m.hp < m.hpMax) || !!(CURA_ESTADO[k] && m.estado && CURA_ESTADO[k].includes(m.estado))));
async function usarObjetoFuera(k) {
    if (obj(k).bolsillo === "mt") return usarMT(k);
    if (OBJ_EVOLUCION.has(k)) return usarObjetoEvolucion(k);
    if (VITAMINAS[k]) return usarVitamina(k);
    if (k === "pp-up" || k === "pp-max") return usarMasPP(k);
    if (MENTAS[k]) return usarMenta(k);
    if (k === "ability-capsule" || k === "ability-patch") return usarCapsula(k);
    if (k === "rare-candy") {
        const id = await elegirDelEquipo("¿A quién le das el Caramelo Raro?", { valido: (x) => ((entrenador.capturados[x].nivel || 5) >= 100 ? "Ya está al nivel máximo." : null) });
        if (id == null) return false;
        await usarCaramelo(id);
        return true;
    }
    return usarMedicina(k);
}
async function usarMedicina(k) {
    const f = obj(k);
    if (k === "sacred-ash") {
        const caidos = entrenador.equipo.filter((id) => entrenador.capturados[id].hp === 0);
        if (!caidos.length) { AudioFX.ui("error"); toast("No tendría ningún efecto."); return false; }
        sacarObjeto(k);
        caidos.forEach((id) => { delete entrenador.capturados[id].hp; entrenador.capturados[id].estado = null; });
        guardarEntrenador(); AudioFX.efecto("restore");
        toast("¡Todo tu equipo se ha recuperado del debilitamiento!");
        return true;
    }
    const id = await elegirDelEquipo(`¿En qué Pokémon quieres usar ${f.nombre}?`, { valido: (_, m) => (puedeCurarFuera(k, m) ? null : "No tendría ningún efecto.") });
    if (id == null) return false;
    const e = entrenador.capturados[id], hpMax = await psMaxDe(id), hp = e.hp == null ? hpMax : e.hp;
    sacarObjeto(k);
    const frases = [];
    if (REVIVIR[k]) {
        e.hp = Math.max(1, Math.floor(hpMax * REVIVIR[k])); e.estado = null;
        frases.push(`¡${nombreDe(id)} se ha recuperado del debilitamiento!`);
    } else {
        if (CURA_PS[k] != null && hp < hpMax) { e.hp = Math.min(hpMax, hp + psQueCura(k, hpMax)); frases.push(`¡${nombreDe(id)} ha recuperado ${e.hp - hp} PS!`); }
        if (CURA_ESTADO[k] && e.estado && CURA_ESTADO[k].includes(e.estado)) { e.estado = null; frases.push(`¡${nombreDe(id)} se ha curado de su problema de estado!`); }
    }
    if (e.hp >= hpMax) delete e.hp;
    guardarEntrenador(); AudioFX.efecto("restore");
    toast(frases.join(" "));
    return true;
}
async function usarVitamina(k) {
    const st = VITAMINAS[k];
    const total = (e) => Object.values(e.ev || {}).reduce((a, b) => a + b, 0);
    const id = await elegirDelEquipo(`¿A quién le das ${obj(k).nombre}?`, {
        valido: (x) => { const e = entrenador.capturados[x]; return ((e.ev || {})[st] || 0) >= EV_MAX || total(e) >= EV_TOTAL ? "No tendría ningún efecto." : null; },
    });
    if (id == null) return false;
    const e = entrenador.capturados[id]; e.ev = e.ev || {};
    e.ev[st] = Math.min(EV_MAX, (e.ev[st] || 0) + Math.min(10, EV_TOTAL - total(e)));
    sacarObjeto(k); guardarEntrenador(); AudioFX.efecto("stat_up");
    toast(`¡${nombreDe(id)} ha ganado esfuerzo en ${EV_TXT[st]}! (${e.ev[st]}/${EV_MAX})`);
    return true;
}
async function usarMasPP(k) {
    const id = await elegirDelEquipo(`¿A quién le das ${obj(k).nombre}?`);
    if (id == null) return false;
    await asegurarMovimientos(id);
    const i = await elegirMovimientoFuera(id, "¿Qué movimiento quieres mejorar?", (m) => (m.ppUps || 0) < 3);
    if (i == null) return false;
    const m = entrenador.capturados[id].movimientos[i];
    m.ppBase = m.ppBase || m.pp || 20;
    m.ppUps = k === "pp-max" ? 3 : (m.ppUps || 0) + 1;
    m.pp = Math.floor(m.ppBase * (1 + 0.2 * m.ppUps));
    sacarObjeto(k); guardarEntrenador(); AudioFX.efecto("stat_up");
    toast(`¡Han aumentado los PP de ${m.nombre}! Ahora tiene ${m.pp}.`);
    return true;
}
// Mentas: le cambian la naturaleza (y con ella qué característica crece más y cuál menos).
async function usarMenta(k) {
    const nat = MENTAS[k];
    const id = await elegirDelEquipo(`¿A quién le das la ${obj(k).nombre}?`, {
        etiqueta: (x) => nombreNaturaleza(entrenador.capturados[x].naturaleza).toUpperCase(),
        valido: (x) => (entrenador.capturados[x].naturaleza === nat ? "Ya tiene esa naturaleza." : null),
    });
    if (id == null) return false;
    entrenador.capturados[id].naturaleza = nat;
    sacarObjeto(k); guardarEntrenador(); AudioFX.efecto("stat_up");
    toast(`¡${nombreDe(id)} ha olido la ${obj(k).nombre}! Ahora su naturaleza es ${textoNaturaleza(nat)}.`, 3600);
    return true;
}
// Cápsula Habilidad (cambia entre sus dos habilidades normales) y Parche Habilidad (le da la oculta).
async function usarCapsula(k) {
    const parche = k === "ability-patch", destino = {};
    await Promise.all(entrenador.equipo.map(async (id) => {
        try {
            const h = habilidadesDe(await cargarPokemon(id)), ahora = entrenador.capturados[id].habSlot || 1;
            destino[id] = parche ? (h[3] && ahora !== 3 && h[3] !== h[ahora] ? 3 : null) : (ahora !== 3 && h[1] && h[2] && h[1] !== h[2] ? (ahora === 1 ? 2 : 1) : null);
            if (destino[id]) destino[id] = { hueco: destino[id], hab: h[destino[id]] };
        } catch (_) { destino[id] = null; }
    }));
    const id = await elegirDelEquipo(`¿En qué Pokémon quieres usar ${obj(k).nombre}?`, {
        etiqueta: (x) => (destino[x] ? "APTO" : "NO APTO"),
        valido: (x) => (destino[x] ? null : "No tendría ningún efecto."),
    });
    if (id == null) return false;
    entrenador.capturados[id].habSlot = destino[id].hueco;
    sacarObjeto(k); guardarEntrenador(); AudioFX.efecto("stat_up");
    toast(`¡La habilidad de ${nombreDe(id)} ha cambiado a ${nombreHabilidad(destino[id].hab)}!`, 3600);
    return true;
}
async function usarObjetoEvolucion(k) {
    const destino = {};
    await Promise.all(entrenador.equipo.map(async (id) => { destino[id] = await evolucionConObjeto(id, k, entrenador.capturados[id].genero); }));
    const id = await elegirDelEquipo(`¿En qué Pokémon quieres usar ${obj(k).nombre}?`, {
        etiqueta: (x) => (destino[x] ? "APTO" : "NO APTO"),
        valido: (x) => (!destino[x] ? "No tendría ningún efecto."
            : entrenador.capturados[destino[x]] ? `Ya tienes a ${nombrePk(destino[x])}: no puede evolucionar.` : null),
    });
    if (id == null) return false;
    const nuevo = destino[id];
    sacarObjeto(k); guardarEntrenador();
    await completarEvolucion(id, nuevo);
    try {
        const d2 = await cargarPokemon(nuevo), e = entrenador.capturados[nuevo];
        for (const mov of await movimientosDeEvolucion(d2, e.nivel || 5, e.movimientos || [])) await ofrecerAprender(nuevo, mov);
    } catch (_) {}
    return true;
}
// Si puede aprender el movimiento de una MT (por MT, tutor o nivel en algún juego).
async function aprendeMT(id, mv) {
    try {
        const d = await cargarPokemon(id);
        return d.moves.some((m) => m.move.name === mv && m.version_group_details.some((v) => ["machine", "tutor", "level-up"].includes(v.move_learn_method.name)));
    } catch (_) { return false; }
}
async function usarMT(k) {
    const [mv] = MT[k], nombreMov = obj(k).nombre.replace(/^MT /, "");
    const estado = {};
    await Promise.all(entrenador.equipo.map(async (id) => {
        const e = entrenador.capturados[id];
        estado[id] = (e.movimientos || []).some((m) => m.clave === mv) ? "APRENDIDO" : (await aprendeMT(id, mv)) ? "APTO" : "NO APTO";
    }));
    const id = await elegirDelEquipo(`¿A quién quieres enseñarle ${nombreMov}?`, {
        etiqueta: (x) => estado[x],
        valido: (x) => (estado[x] === "APTO" ? null : estado[x] === "APRENDIDO" ? `${nombreDe(x)} ya conoce ${nombreMov}.` : `${nombreDe(x)} no puede aprender ${nombreMov}.`),
    });
    if (id == null) return false;
    try {
        const mov = movDeAPI(await cargarMovimiento(mv), entrenador.capturados[id].nivel || 5);
        await asegurarMovimientos(id);
        await ofrecerAprender(id, mov);
    } catch (_) { toast("No se pudo cargar el movimiento. ¿Tienes internet?"); return false; }
    return true;
}
async function darObjetoDesdeMochila(k) {
    const id = await elegirDelEquipo(`¿A quién le das ${obj(k).nombre}?`);
    if (id == null) return false;
    equiparObjeto(id, k);
    return true;
}

// ===================== MOCHILA =====================
let bolsilloActual = "cura", objetoSel = null;
function accionesObjeto(k) {
    const acc = [];
    if (k === "exp-share") acc.push({ id: "repartir", txt: config.expShare ? "Desactivar" : "Activar" });
    else if (usableFuera(k)) acc.push({ id: "usar", txt: obj(k).bolsillo === "mt" ? "Enseñar" : "Usar" });
    if (puedeLlevarse(k)) acc.push({ id: "dar", txt: "Dar a un Pokémon" });
    return acc;
}
function pistaObjeto(k) {
    const f = obj(k);
    if (k === "exp-share") return config.expShare ? "Activado: todo el equipo gana experiencia." : "Desactivado: solo gana experiencia quien combate.";
    if (esBola(k)) return "Se lanza en combate contra Pokémon salvajes.";
    if (CURA_PP[k] && !CURA_PS[k]) return "Solo sirve en combate: los PP se recuperan al empezar cada uno.";
    if (OBJ_X[k] || k === "dire-hit") return "Solo se puede usar en combate.";
    if (f.bolsillo === "mt") return "Las MT no se gastan: puedes enseñarla a todos los que puedan aprenderla.";
    if (f.venta && !f.compra && !puedeLlevarse(k) && !usableFuera(k)) return `No tiene uso, pero en la Tienda te dan ${dineroTexto(f.venta)} por él.`;
    return "";
}
function detalleObjeto(k) {
    const f = obj(k), lleva = quienLleva(k), pista = pistaObjeto(k);
    return `<div class="bd-cab">
            <span class="bd-icono"><img src="${urlObj(k)}" alt=""></span>
            <div class="bd-tit"><b>${f.nombre}</b><span>${efectoCorto(k) || BOLSILLOS.find((b) => b.cat === f.bolsillo)?.nombre || ""}</span></div>
            ${objetoUnico(k) ? "" : `<span class="bd-cant num-pk">×${cantidadObj(k)}</span>`}
        </div>
        <p class="bd-desc">${f.desc}</p>
        ${pista ? `<p class="bd-pista">${pista}</p>` : ""}
        ${lleva.length ? `<p class="bd-pista">Lo lleva: ${lleva.map(nombreDe).join(", ")}.</p>` : ""}
        ${f.venta ? `<p class="bd-venta">Se vende por <b class="num-pk">${dineroTexto(f.venta)}</b></p>` : ""}
        <div class="bd-acciones">${accionesObjeto(k).map((a, i) => `<button class="${i ? "btn-sec" : "btn-grande"}" data-acc="${a.id}">${a.txt}</button>`).join("")}</div>`;
}
function renderMochila(cont) {
    const m = entrenador.mochila;
    const enBolsillo = (cat) => ordenarObjetos(Object.keys(m).filter((k) => m[k] > 0 && obj(k).bolsillo === cat));
    const b = BOLSILLOS.find((x) => x.cat === bolsilloActual) || BOLSILLOS[0];
    const lista = enBolsillo(b.cat);
    if (!lista.includes(objetoSel)) objetoSel = lista[0] || null;
    const conObjeto = entrenador.equipo.filter((id) => entrenador.capturados[id].objeto);
    cont.innerHTML = `
        <div class="cabecera-modo con-volver">
            <button class="btn-volver" data-volver>Atrás</button>
            <h2>Mochila</h2>
            <span class="cab-dinero"><small>Dinero</small><b class="num-pk">${dineroTexto(entrenador.dinero)}</b></span>
        </div>
        <div class="bolsa" data-bolsillo="${b.cat}">
            <nav class="bolsa-tabs">
                ${BOLSILLOS.map((x) => `<button class="bolsa-tab ${x.cat === b.cat ? "activa" : ""}" data-bolsillo="${x.cat}" title="${x.nombre}">
                    <img src="${urlItem(x.icono)}" alt=""><span>${x.nombre}</span></button>`).join("")}
            </nav>
            <div class="bolsa-cuerpo">
                <div class="bolsa-lista">
                    ${lista.length ? lista.map((k) => `<button class="bolsa-fila ${k === objetoSel ? "sel" : ""}" data-obj="${k}">
                        <img src="${urlObj(k)}" alt=""><span class="bf-nom">${obj(k).nombre}</span>
                        <span class="bf-cant num-pk">${objetoUnico(k) ? "" : "×" + m[k]}</span></button>`).join("")
                    : `<p class="bolsa-vacia">No tienes nada en este bolsillo.</p>`}
                </div>
                <aside class="bolsa-detalle">${objetoSel ? detalleObjeto(objetoSel) : `<p class="bolsa-vacia">Consigue objetos en la Tienda, venciendo a entrenadores y explorando la hierba alta.</p>`}</aside>
            </div>
            ${conObjeto.length ? `<div class="bolsa-equipados">
                <span class="hub-etq">Objetos equipados</span>
                ${conObjeto.map((id) => { const k = entrenador.capturados[id].objeto; return `<div class="be-fila">
                    ${htmlIcono(id, "be-poke", !!entrenador.capturados[id]?.shiny)}<span class="be-nom">${nombreDe(id)}</span>
                    <img class="be-obj" src="${urlObj(k)}" alt=""><span class="be-objnom">${obj(k).nombre}</span>
                    <button class="btn-mini" data-quitar="${id}">Guardar</button></div>`; }).join("")}
            </div>` : ""}
        </div>`;
    const repintar = () => { if (subAventura === "mochila") renderMochila(cont); };
    cont.querySelector("[data-volver]").onclick = () => { subAventura = "principal"; renderAventura(); };
    cont.querySelectorAll(".bolsa-tab").forEach((x) => x.onclick = () => { bolsilloActual = x.dataset.bolsillo; objetoSel = null; AudioFX.ui("select"); repintar(); });
    cont.querySelectorAll(".bolsa-fila").forEach((x) => x.onclick = () => {
        objetoSel = x.dataset.obj; AudioFX.ui("select");
        cont.querySelectorAll(".bolsa-fila").forEach((y) => y.classList.toggle("sel", y === x));
        const det = cont.querySelector(".bolsa-detalle");
        det.innerHTML = detalleObjeto(objetoSel); conectarAcciones(det);
        if (window.innerWidth < 760) det.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
    const conectarAcciones = (raiz) => raiz.querySelectorAll("[data-acc]").forEach((x) => x.onclick = async () => {
        const k = objetoSel, a = x.dataset.acc;
        if (a === "repartir") { config.expShare = !config.expShare; guardarConfig(); AudioFX.ui("select"); toast(`Repartir Experiencia ${config.expShare ? "activado" : "desactivado"}.`); return repintar(); }
        if (a === "usar" && await usarObjetoFuera(k)) repintar();
        if (a === "dar" && await darObjetoDesdeMochila(k)) repintar();
    });
    conectarAcciones(cont);
    cont.querySelectorAll("[data-quitar]").forEach((x) => x.onclick = () => { quitarObjeto(Number(x.dataset.quitar)); repintar(); });
    pintarIconos(cont);
}

// ===================== PERSONAJES CON LOS QUE SE HABLA (estilo de los fangames actuales) =====================
// Como en Pokémon Reminiscencia: el personaje sale en grande delante del escenario, con su placa de nombre,
// globos de emoción y «voz» mientras habla. Sprites reales: PokéRogue (animados) y Pokémon Showdown.
const PERSONAJES = {
    // Los dos animados y del mismo juego que el resto (Blanco/Negro, vía PokéRogue): el dependiente te ofrece una Poké Ball
    // y la enfermera lleva su uniforme rosa y su maletín.
    dependiente: { cargo: "Dependiente", nombre: "Andrés", atlas: "images/trainer/clerk_m_2", fps: 12, voz: 1.05, color: "#3f7fe0" },
    enfermera: { cargo: "Enfermera", nombre: "Joy", atlas: "images/trainer/doctor_f", fps: 12, voz: 1.5, color: "#e3609f" },
};
const EMOTES = {
    "!": prURL("images/mystery-encounters/encounter_exclaim.png"),   // PokéRogue
    corazon: `${SD_BASE}fx/heart.png`,                                // Showdown
    brillo: `${SD_BASE}fx/shine.png`,
};
const saludoHora = () => ({ dia: "¡Buenos días", tarde: "¡Buenas tardes", noche: "¡Buenas noches" }[claseHora()]);
const bienvenidoTxt = () => (entrenador.genero === "f" ? "Bienvenida" : "Bienvenido");
function personajeHTML(p) {
    return `<div class="vn-personaje entra ${p.atlas ? "animado" : "estatico"}">
        <div class="vn-cuerpo">${p.atlas ? `<canvas class="vn-sprite"></canvas>` : `<img class="vn-sprite" src="${SD_BASE}sprites/trainers/${p.sprite}.png" alt="${p.cargo}">`}</div>
        <img class="vn-emote" alt="">
    </div>`;
}
async function montarPersonaje(raiz, p) {
    if (!p.atlas) return;
    try { Atlas.animar(raiz.querySelector("canvas.vn-sprite"), await Atlas.cargar(prURL(p.atlas)), { fps: p.fps }); } catch (_) {}
}
// Globo de emoción sobre la cabeza («!», corazón, destello).
function emocion(raiz, tipo) {
    const e = raiz.querySelector(".vn-emote"); if (!e) return;
    e.src = EMOTES[tipo]; e.className = "vn-emote " + (tipo === "!" ? "exclamacion" : tipo);
    void e.offsetWidth; e.classList.add("ver");
    clearTimeout(e._t); e._t = setTimeout(() => e.classList.remove("ver"), 1700 / velJuego());
}
function gesto(raiz, clase, ms = 900) {
    const v = raiz.querySelector(".vn-personaje"); if (!v) return esperar(0);
    v.classList.remove(clase); void v.offsetWidth; v.classList.add(clase);
    return esperar(ms).then(() => v.classList.remove(clase));
}

// ===================== VENTANA DE DIÁLOGO =====================
// Texto letra a letra en una ventana de PokéRogue con la placa del que habla; se avanza tocando la ventana o con Intro.
function crearDialogo(raiz, p) {
    const caja = raiz.querySelector(".dlg"), texto = caja.querySelector(".dlg-texto"), menu = raiz.querySelector(".dlg-menu");
    const cuerpo = raiz.querySelector(".vn-personaje");
    let tw = null, alPulsar = null, vivo = true;
    caja.onclick = () => { if (alPulsar) alPulsar(); };
    const onKey = (e) => {
        if (!vivo || !raiz.isConnected) return document.removeEventListener("keydown", onKey);
        if (!menu.classList.contains("oculta")) return teclaMenu(e);
        const enControl = e.target && e.target.closest && e.target.closest("input, button, textarea");
        if (["Enter", " ", "z", "Z"].includes(e.key) && alPulsar && !enControl) { e.preventDefault(); alPulsar(); }
    };
    document.addEventListener("keydown", onKey);
    function escribir(txt) {
        return new Promise((res) => {
            clearInterval(tw); caja.classList.remove("listo");
            let i = 0;
            const acabar = () => { clearInterval(tw); texto.textContent = txt; alPulsar = null; if (cuerpo) cuerpo.classList.remove("habla"); res(); };
            alPulsar = acabar;   // tocar mientras escribe: aparece todo el texto
            texto.textContent = "";
            if (cuerpo) cuerpo.classList.add("habla");
            tw = setInterval(() => {
                if (!vivo) return clearInterval(tw);
                i++; texto.textContent = txt.slice(0, i);
                // «Voz» del personaje: un pitido suave cada pocas letras, con su propio tono.
                if (p && i % 3 === 0 && /[a-záéíóúñ0-9]/i.test(txt[i - 1])) AudioFX.ui("select", { vol: 0.07, rate: p.voz + Math.random() * 0.12 });
                if (i >= txt.length) acabar();
            }, 24 / velJuego());
        });
    }
    function teclaMenu(e) {
        const ops = [...menu.querySelectorAll("button")];
        const i = ops.indexOf(document.activeElement);
        if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); ops[(i + (e.key === "ArrowDown" ? 1 : ops.length - 1)) % ops.length].focus(); }
        else if (e.key === "Escape") { e.preventDefault(); ops[ops.length - 1].click(); }
    }
    function elegir(opciones) {
        return new Promise((res) => {
            menu.innerHTML = opciones.map((o, i) => `<button class="dlg-op" data-i="${i}">${o}</button>`).join("");
            menu.classList.remove("oculta");
            menu.querySelectorAll(".dlg-op").forEach((b) => {
                b.onclick = () => { AudioFX.ui("select"); menu.classList.add("oculta"); res(Number(b.dataset.i)); };
                b.onmouseenter = () => b.focus();
            });
            menu.querySelector(".dlg-op").focus({ preventScroll: true });
        });
    }
    return {
        // Escribe y espera a que se pulse para seguir.
        async decir(txt) {
            await escribir(txt);
            caja.classList.add("listo");
            await new Promise((res) => { alPulsar = () => { alPulsar = null; AudioFX.ui("select"); res(); }; });
            caja.classList.remove("listo");
        },
        comentar: escribir,   // escribe sin esperar
        async preguntar(txt, opciones) { await escribir(txt); return elegir(opciones); },
        cerrar() { vivo = false; clearInterval(tw); document.removeEventListener("keydown", onKey); },
    };
}
const dialogoHTML = (p) => `<div class="dlg-zona">
    ${p ? `<span class="dlg-nombre"><small>${p.cargo}</small>${p.nombre}</span>` : ""}
    <div class="dlg ventana-pk" role="status"><span class="dlg-texto"></span><span class="dlg-flecha"></span></div>
    <div class="dlg-menu ventana-pk oculta"></div>
</div>`;

// ===================== TIENDA POKÉMON =====================
const CATEGORIAS_TIENDA = [
    { id: "balls", nombre: "Poké Balls", icono: "poke-ball", filtro: (k, f) => f.bolsillo === "balls" },
    { id: "cura", nombre: "Botiquín", icono: "potion", filtro: (k, f) => f.bolsillo === "cura" },
    { id: "combate", nombre: "Combate", icono: "x-attack", filtro: (k) => !!OBJ_X[k] || k === "dire-hit" },
    { id: "equipables", nombre: "Equipables", icono: "leftovers", filtro: (k) => OBJ_LLEVABLES.has(k) },
    { id: "evolucion", nombre: "Evolución", icono: "fire-stone", filtro: (k) => OBJ_EVOLUCION.has(k) && !OBJ_LLEVABLES.has(k) },
    { id: "bayas", nombre: "Bayas", icono: "oran-berry", filtro: (k, f) => f.bolsillo === "bayas" },
    { id: "mt", nombre: "MT", icono: "tm-normal", filtro: (k, f) => f.bolsillo === "mt" },
];
const ESCAPARATE = ["poke-ball", "great-ball", "ultra-ball", "premier-ball", "potion", "super-potion", "hyper-potion", "max-potion",
    "antidote", "full-heal", "revive", "x-attack", "oran-berry", "sitrus-berry", "fire-stone", "water-stone",
    "thunder-stone", "leaf-stone", "leftovers", "life-orb", "rare-candy", "repeat-ball", "timer-ball", "dusk-ball"];
const stockTienda = (cat) => ordenarObjetos(Object.keys(OBJETOS).filter((k) => { const f = obj(k); return f.compra > 0 && f.medallas <= nMedallas() && cat.filtro(k, f); }));
const proximosTienda = () => Object.keys(OBJETOS).filter((k) => { const f = obj(k); return f.compra > 0 && f.medallas > nMedallas() && f.medallas < 99; }).length;
const vendibles = (cat) => ordenarObjetos(Object.keys(entrenador.mochila).filter((k) => cantidadObj(k) > 0 && obj(k).bolsillo === cat && obj(k).venta > 0));

// Cada tienda: quién atiende, cómo se ve, qué vende y con qué se paga. La del Metro Batalla (Puntos de Batalla) la añade metro.js.
const TIENDAS = {
    dinero: {
        P: () => PERSONAJES.dependiente, titulo: "Tienda Pokémon", cartel: "TIENDA POKéMON", lugar: "a la Tienda Pokémon", escaparate: () => ESCAPARATE,
        musica: () => mus("mystery_encounter_gen_5_gts"), categorias: CATEGORIAS_TIENDA, stock: stockTienda, precio: (k) => obj(k).compra,
        saldo: () => entrenador.dinero || 0, cobrar: (n) => { entrenador.dinero -= n; }, fmt: (n) => dineroTexto(n), etqSaldo: "Dinero",
        vende: true, volver: "principal", pide: "¿Qué necesitas? Tómate tu tiempo.", sinSaldo: "Lo siento, pero no tienes dinero suficiente.",
    },
};
function renderTienda(cont, tipo = "dinero") {
    const T = TIENDAS[tipo] || TIENDAS.dinero, P = T.P();
    cont.innerHTML = `
        <div class="cabecera-modo con-volver">
            <button class="btn-volver" data-volver>Salir</button>
            <h2>${T.titulo}</h2>
        </div>
        <div class="local tienda" style="--color-npc:${P.color}">
            <div class="local-cabeza">
            <div class="local-escena">
                <div class="local-fondo">
                    <div class="local-pared"><span class="local-cartel">${T.cartel}</span></div>
                    <div class="local-estantes">${T.escaparate().map((k) => `<img src="${urlObj(k)}" alt="">`).join("")}</div>
                    <div class="local-mostrador"></div>
                    <div class="local-suelo"></div>
                </div>
                ${personajeHTML(P)}
                <div class="local-dinero ventana-pk"><small>${T.etqSaldo}</small><b class="num-pk" data-dinero>${T.fmt(T.saldo())}</b></div>
                ${dialogoHTML(P)}
            </div>
            </div>
            <div class="catalogo oculta"></div>
        </div>`;
    const local = cont.querySelector(".local"), cat = local.querySelector(".catalogo");
    montarPersonaje(local, P);
    const dlg = crearDialogo(local, P);
    let modo = null, catId = "balls", sel = null, cant = 1, ocupado = false;
    AudioFX.musicaSonar(T.musica());
    const pintarDinero = () => { local.querySelector("[data-dinero]").textContent = T.fmt(T.saldo()); };
    const salir = async () => {
        cat.classList.add("oculta"); local.classList.remove("en-catalogo"); modo = null;
        gesto(local, "reverencia");
        await dlg.decir("¡Gracias por tu visita! ¡Vuelve cuando quieras!");
        dlg.cerrar(); subAventura = T.volver; renderAventura();
    };
    cont.querySelector("[data-volver]").onclick = () => { dlg.cerrar(); subAventura = T.volver; renderAventura(); };

    // Que la ventana de diálogo se vea (en el móvil puede haber quedado arriba).
    const verDialogo = () => { const r = local.querySelector(".dlg-zona").getBoundingClientRect(); if (r.top < 0 || r.bottom > innerHeight) local.querySelector(".dlg-zona").scrollIntoView({ behavior: "smooth", block: "center" }); };
    async function menuPrincipal(txt) {
        cat.classList.add("oculta"); local.classList.remove("en-catalogo"); modo = null;
        const r = await dlg.preguntar(txt, T.vende ? ["Comprar", "Vender", "Nada, gracias"] : ["Canjear", "Nada, gracias"]);
        if (r === 0) abrir("comprar", T.pide);
        else if (T.vende && r === 1) {
            if (!BOLSILLOS.some((b) => vendibles(b.cat).length)) { await dlg.decir("Vaya, no llevas nada que yo pueda comprarte."); return menuPrincipal("¿Puedo ayudarte en algo más?"); }
            abrir("vender", "¿Qué quieres venderme? Te lo pago a la mitad de su precio.");
        } else salir();
    }
    function categorias() {
        return modo === "comprar"
            ? T.categorias.filter((c) => T.stock(c).length)
            : BOLSILLOS.filter((b) => vendibles(b.cat).length).map((b) => ({ id: b.cat, nombre: b.nombre, icono: b.icono }));
    }
    const listaDe = (c) => (modo === "comprar" ? T.stock(c) : vendibles(c.id));
    const precio = (k) => (modo === "comprar" ? T.precio(k) : obj(k).venta);
    const maximo = (k) => (modo === "comprar" ? (objetoUnico(k) ? 1 : Math.max(1, Math.min(99, Math.floor(T.saldo() / T.precio(k))))) : cantidadObj(k));
    function abrir(m, txt) {
        modo = m; sel = null; cant = 1;
        const cs = categorias();
        if (!cs.some((c) => c.id === catId)) catId = cs[0] ? cs[0].id : null;
        pintarCatalogo();
        cat.classList.remove("oculta"); local.classList.add("en-catalogo");
        dlg.comentar(txt);
    }
    function pintarCatalogo() {
        const cs = categorias();
        if (!cs.length) return menuPrincipal("Ya no te queda nada que venderme. ¿Algo más?");
        if (!cs.some((c) => c.id === catId)) catId = cs[0].id;
        const c = cs.find((x) => x.id === catId), lista = listaDe(c);
        if (sel && !lista.includes(sel)) sel = null;
        const faltan = modo === "comprar" && T.vende ? proximosTienda() : 0;
        cat.innerHTML = `
            <div class="cat-tabs">${cs.map((x) => `<button class="cat-tab ${x.id === catId ? "activa" : ""}" data-cat="${x.id}"><img src="${urlObj(x.icono)}" alt=""><span>${x.nombre}</span></button>`).join("")}</div>
            <div class="cat-cuerpo">
                <div class="cat-lista">
                    ${lista.map((k) => `<button class="cat-fila ${k === sel ? "sel" : ""}" data-k="${k}">
                        <img src="${urlObj(k)}" alt="">
                        <span class="cf-nom">${obj(k).nombre}<small>${efectoCorto(k)}</small></span>
                        <span class="cf-precio num-pk">${modo === "comprar" ? T.fmt(precio(k)) : dineroTexto(precio(k))}</span>
                    </button>`).join("")}
                    ${faltan ? `<p class="cat-nota">Con más medallas tendremos ${faltan} productos más.</p>` : ""}
                </div>
                <div class="cat-detalle">${sel ? detalleVenta(sel) : `<p class="cat-vacio">${modo === "comprar" ? "Elige un producto para ver su descripción." : "Elige lo que quieras vender."}</p>`}</div>
            </div>
            <div class="cat-pie"><button class="btn-sec" data-atras>Terminar</button></div>`;
        cat.classList.toggle("ocupado", ocupado);
        cat.querySelectorAll(".cat-tab").forEach((b) => b.onclick = () => { if (ocupado) return; catId = b.dataset.cat; sel = null; AudioFX.ui("select"); pintarCatalogo(); });
        cat.querySelectorAll(".cat-fila").forEach((b) => b.onclick = () => { if (ocupado) return; elegirProducto(b.dataset.k); });
        cat.querySelector("[data-atras]").onclick = () => { if (!ocupado) menuPrincipal("¿Puedo ayudarte en algo más?"); };
        conectarDetalle();
    }
    function detalleVenta(k) {
        const f = obj(k), ya = modo === "comprar" && objetoUnico(k) && tieneObjeto(k);
        return `<div class="cd-cab"><span class="bd-icono"><img src="${urlObj(k)}" alt=""></span>
                <div class="bd-tit"><b>${f.nombre}</b><span>${modo === "comprar" ? "En la mochila" : "Tienes"}: <b class="num-pk">${cantidadObj(k)}</b></span></div></div>
            <p class="bd-desc">${f.desc}</p>
            ${ya ? `<p class="bd-pista">Ya la tienes. ¡Las MT no se gastan!</p>` : `
            <div class="cd-compra">
                <div class="cd-cant">
                    <button data-cant="-1" aria-label="Menos">−</button><b class="num-pk">×${String(cant).padStart(2, "0")}</b><button data-cant="1" aria-label="Más">+</button>
                    ${objetoUnico(k) ? "" : `<button class="cd-diez" data-cant="10">+10</button>`}
                </div>
                <div class="cd-total"><small>Total</small><b class="num-pk">${modo === "comprar" ? T.fmt(precio(k) * cant) : dineroTexto(precio(k) * cant)}</b></div>
            </div>
            <button class="btn-grande" data-confirmar>${modo === "comprar" ? "Comprar" : "Vender"}</button>`}`;
    }
    function conectarDetalle() {
        cat.querySelectorAll("[data-cant]").forEach((b) => b.onclick = () => {
            if (ocupado || !sel) return;
            const d = Number(b.dataset.cant);
            cant = limitar(d === 10 ? cant + 10 : cant + d, 1, maximo(sel));
            AudioFX.ui("select");
            cat.querySelector(".cat-detalle").innerHTML = detalleVenta(sel); conectarDetalle();
        });
        const bc = cat.querySelector("[data-confirmar]");
        if (bc) bc.onclick = () => { if (!ocupado) confirmar(); };
    }
    function elegirProducto(k) {
        sel = k; cant = 1; AudioFX.ui("select");
        cat.querySelectorAll(".cat-fila").forEach((b) => b.classList.toggle("sel", b.dataset.k === k));
        cat.querySelector(".cat-detalle").innerHTML = detalleVenta(k); conectarDetalle();
        const f = obj(k);
        if (modo === "vender") dlg.comentar(`¿${f.nombre}? Puedo darte ${dineroTexto(f.venta)} por cada una.`);
        else if (f.bolsillo === "mt") dlg.comentar(objetoUnico(k) && tieneObjeto(k) ? "Esa MT ya la tienes: ¡se puede usar las veces que quieras!" : `La ${f.nombre}. Se puede usar tantas veces como quieras.`);
        else dlg.comentar(`${f.nombre}, ¿verdad? ¿Cuántas unidades quieres?`);
        if (window.innerWidth < 760) cat.querySelector(".cat-detalle").scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
    async function confirmar() {
        const k = sel, f = obj(k), n = cant, total = precio(k) * n;
        ocupado = true; cat.classList.add("ocupado");
        const texto = modo === "comprar"
            ? `Serán ${T.fmt(total)} por ${n > 1 ? `${n}× ` : ""}${f.nombre}. ¿Te parece bien?`
            : `Te daré ${dineroTexto(total)} por ${n > 1 ? `${n}× ` : ""}${f.nombre}. ¿Trato hecho?`;
        verDialogo();
        const r = await dlg.preguntar(texto, ["Sí", "No"]);
        ocupado = false;
        if (r !== 0) { pintarCatalogo(); dlg.comentar(modo === "comprar" ? "De acuerdo. ¿Necesitas otra cosa?" : "Vale. ¿Quieres venderme otra cosa?"); return; }
        if (modo === "comprar") {
            if (T.saldo() < total) { AudioFX.ui("error"); pintarCatalogo(); dlg.comentar(T.sinSaldo); return; }
            T.cobrar(total); meterObjeto(k, n);
            const honor = esBola(k) && n >= 10 ? Math.floor(n / 10) : 0;   // regalo por comprar 10 Poké Balls
            if (honor) meterObjeto("premier-ball", honor);
            guardarEntrenador(); AudioFX.efecto("buy"); pintarDinero(); cant = 1; pintarCatalogo();
            emocion(local, "corazon"); gesto(local, "contenta", 700);
            dlg.comentar(honor ? `¡Aquí tienes! Y como te llevas tantas, te regalo ${honor > 1 ? `${honor} Honor Balls` : "una Honor Ball"}.` : "¡Aquí tienes! ¡Muchas gracias!");
        } else {
            entrenador.dinero = (entrenador.dinero || 0) + total; sacarObjeto(k, n);
            guardarEntrenador(); AudioFX.efecto("buy"); pintarDinero(); cant = 1;
            if (!cantidadObj(k)) sel = null;
            pintarCatalogo();
            emocion(local, "brillo");
            dlg.comentar("¡Trato hecho! Aquí tienes tu dinero.");
        }
    }
    (async () => {
        await esperar(350);
        emocion(local, "!");
        await dlg.decir(`${saludoHora()}, ${entrenador.nombre || "entrenador"}! ${bienvenidoTxt()} ${T.lugar}.`);
        menuPrincipal("¿En qué puedo ayudarte?");
    })();
}

// ===================== CENTRO POKÉMON =====================
function renderCentro(cont) {
    const P = PERSONAJES.enfermera;
    cont.innerHTML = `
        <div class="cabecera-modo con-volver">
            <button class="btn-volver" data-volver>Salir</button>
            <h2>Centro Pokémon</h2>
        </div>
        <div class="local centro" style="--color-npc:${P.color}">
            <div class="local-escena">
                <div class="local-fondo">
                    <div class="local-pared"><span class="local-cartel">CENTRO POKéMON</span><span class="local-emblema"></span></div>
                    <div class="local-mostrador"></div>
                    <div class="local-suelo"></div>
                </div>
                <div class="centro-maquina">${Array.from({ length: 6 }, (_, i) => {
                    const id = entrenador.equipo[i];
                    return `<span class="cm-hueco">${id ? `<img class="cm-bola" src="${urlObj(entrenador.capturados[id].bola || "poke-ball")}" alt="">` : ""}</span>`;
                }).join("")}</div>
                ${personajeHTML(P)}
                <div class="centro-destello"></div>
                ${dialogoHTML(P)}
            </div>
        </div>`;
    const local = cont.querySelector(".local");
    montarPersonaje(local, P);
    const dlg = crearDialogo(local, P);
    const volver = () => { dlg.cerrar(); subAventura = "principal"; renderAventura(); };
    cont.querySelector("[data-volver]").onclick = volver;
    (async () => {
        await esperar(350);
        emocion(local, "!");
        await dlg.decir(`¡Hola, ${entrenador.nombre || "entrenador"}! ${bienvenidoTxt()} al Centro Pokémon.`);
        const herido = equipoHerido();
        const r = await dlg.preguntar(herido
            ? "Aquí curamos a tus Pokémon para que recuperen toda su energía. ¿Quieres que los cure?"
            : "Tus Pokémon tienen buen aspecto, pero ¿quieres que les eche un vistazo?", ["Sí", "No"]);
        if (r === 0) {
            dlg.comentar("De acuerdo. Déjame tus Pokémon un momento...");
            for (const b of local.querySelectorAll(".cm-bola")) {
                if (!local.isConnected) return;
                b.classList.add("puesta"); AudioFX.efecto("pb_tray_ball", { vol: 0.4 });
                await esperar(300);
            }
            curarEquipo();
            local.querySelector(".centro-maquina").classList.add("curando");
            local.querySelector(".centro-destello").classList.add("activo");
            await Promise.all([AudioFX.fanfarria(MUSICA.curar), esperar(1900)]);
            if (!local.isConnected) return;
            local.querySelector(".centro-maquina").classList.remove("curando");
            local.querySelector(".centro-destello").classList.remove("activo");
            emocion(local, "brillo");
            await dlg.decir("¡Gracias por esperar! Tus Pokémon ya están en plena forma.");
        }
        gesto(local, "reverencia");
        await dlg.decir("¡Esperamos volver a verte!");
        if (local.isConnected) volver();
    })();
}
