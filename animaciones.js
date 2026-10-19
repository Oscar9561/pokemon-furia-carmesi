/* =========================================================
   ANIMACIÓN 2D
   - Sprites de Pokémon animados: GIF de Blanco/Negro (PokéAPI) y Showdown,
     atlas animados de PokéRogue (Gen 6-9) o tiras de Pokémon Essentials
     (todas las especies y megas, de frente y de espalda). El 3D, solo de reserva.
   - Entrenadores animados (atlas de PokéRogue).
   - Reproductor de las animaciones de movimientos de PokéRogue (formato de
     Pokémon Essentials): cada movimiento con su animación y sus sonidos.
   ========================================================= */

// (una imagen que tarda más de 20 s cuenta como fallo: ver conLimite y pedirConLimite en data.js)
function cargarImagen(url, cors = false, ms = 20000) {
    return new Promise((res, rej) => {
        const i = new Image();
        if (cors) i.crossOrigin = "anonymous";   // para poder leer sus píxeles
        const t = setTimeout(() => { i.onload = i.onerror = null; rej(new Error("img (tiempo) " + url)); }, ms);
        i.onload = () => { clearTimeout(t); res(i); };
        i.onerror = () => { clearTimeout(t); rej(new Error("img " + url)); };
        i.src = url;
    });
}

// ===================== ATLAS (TexturePacker / Aseprite) =====================
const Atlas = (() => {
    const cache = new Map();
    function cargar(base) {
        if (cache.has(base)) return cache.get(base);
        const p = (async () => {
            const r = await pedirConLimite(base + ".json");
            if (!r.ok) throw new Error("atlas " + r.status);
            const d = await r.json();
            const t = d.textures ? d.textures[0] : d;
            const frames = Array.isArray(t.frames)
                ? t.frames.slice()
                : Object.keys(t.frames).map((k) => Object.assign({ filename: k }, t.frames[k]));
            frames.sort((a, b) => (parseInt(a.filename, 10) || 0) - (parseInt(b.filename, 10) || 0));
            const img = await cargarImagen(base + ".png");
            // Caja común a todos los frames (algunos, como el lanzamiento del jugador, cambian de tamaño).
            const tam = (f) => f.sourceSize || { w: f.frame.w, h: f.frame.h };
            return { img, frames, w: Math.max(...frames.map((f) => tam(f).w)), h: Math.max(...frames.map((f) => tam(f).h)) };
        })();
        cache.set(base, p);
        p.catch(() => cache.delete(base));
        return p;
    }
    function dibujar(canvas, a, k) {
        const f = a.frames[Math.max(0, Math.min(a.frames.length - 1, k))];
        const s = f.spriteSourceSize || { x: 0, y: 0 };
        const ss = f.sourceSize || { w: f.frame.w, h: f.frame.h };
        const ctx = canvas.getContext("2d");
        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // Anclado abajo y al centro (como el origen 0.5, 1 de PokéRogue).
        const dx = Math.floor((a.w - ss.w) / 2) + s.x, dy = a.h - ss.h + s.y;
        ctx.drawImage(a.img, f.frame.x, f.frame.y, f.frame.w, f.frame.h, dx, dy, f.frame.w, f.frame.h);
    }
    // Tira de fotogramas cuadrados en horizontal (formato de Pokémon Essentials), a 10 por segundo como en su juego.
    // Se recorta al contorno común de todos los fotogramas: así el Pokémon queda apoyado en el suelo, como con los demás.
    function cargarTira(url, ms = 100) {
        const k = "tira:" + url;
        if (cache.has(k)) return cache.get(k);
        const p = (async () => {
            let img, leible = true;
            try { img = await cargarImagen(url, true); } catch (_) { img = await cargarImagen(url); leible = false; }
            const h = img.naturalHeight, n = Math.max(1, Math.floor(img.naturalWidth / h));
            let caja = { x: 0, y: 0, w: h, h };
            if (leible) {
                try {
                    const cv = document.createElement("canvas"); cv.width = n * h; cv.height = h;
                    const g = cv.getContext("2d", { willReadFrequently: true });
                    g.drawImage(img, 0, 0);
                    const d = g.getImageData(0, 0, n * h, h).data, W = n * h;
                    let x0 = h, y0 = h, x1 = -1, y1 = -1;
                    for (let y = 0; y < h; y++) {
                        for (let x = 0, fx = 0; x < W; x++, fx = fx + 1 === h ? 0 : fx + 1) {
                            if (d[(y * W + x) * 4 + 3] > 8) { if (fx < x0) x0 = fx; if (fx > x1) x1 = fx; if (y < y0) y0 = y; y1 = y; }
                        }
                    }
                    if (x1 >= 0) caja = { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
                } catch (_) { /* sin permiso para leer sus píxeles: la tira entera */ }
            }
            const frames = Array.from({ length: n }, (_, i) => ({ filename: String(i), frame: { x: i * h + caja.x, y: caja.y, w: caja.w, h: caja.h }, duration: ms }));
            return { img, frames, w: caja.w, h: caja.h };
        })();
        cache.set(k, p);
        p.catch(() => cache.delete(k));
        return p;
    }
    // Anima el atlas en el canvas (en bucle o una sola vez, quedándose en el último frame).
    function animar(canvas, a, { fps = 10, bucle = true } = {}) {
        canvas.width = a.w; canvas.height = a.h;
        const token = {}; canvas._tok = token;
        let i = 0, t0 = 0;
        dibujar(canvas, a, 0);
        if (a.frames.length < 2) return;
        const tick = (t) => {
            if (!canvas.isConnected || canvas._tok !== token) return;
            if (!t0) t0 = t;
            if (t - t0 >= (a.frames[i].duration || 1000 / fps)) {
                t0 = t; i++;
                if (i >= a.frames.length) { if (!bucle) return; i = 0; }
                dibujar(canvas, a, i);
            }
            requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    }
    return { cargar, cargarTira, animar, dibujar };
})();
// Carga el recurso de un candidato de sprite: imagen (GIF/PNG), atlas de PokéRogue o tira de Essentials.
const cargarCandidato = (c) => (c.tipo === "img" ? cargarImagen(c.url) : c.tipo === "tira" ? Atlas.cargarTira(c.url) : Atlas.cargar(c.url));

// ===================== MONTAJE DE SPRITES =====================
// Tamaño en pantalla = píxeles nativos × zoom (con alto máximo): pixel art nítido y proporcionado.
function tamanoNativo(el, zoom, maxH = Infinity, maxW = Infinity) {
    if (!el) return el;
    const e = Number(el.dataset.escala) || 1;   // p. ej. los sprites 3D, algo más pequeños para igualar a los 2D
    const w = (Number(el.dataset.nw) || el.naturalWidth) * e, h = (Number(el.dataset.nh) || el.naturalHeight) * e;
    if (!w || !h) return el;
    const z = Math.min(zoom, maxH / h, maxW / w);
    el.style.width = Math.round(w * z) + "px"; el.style.height = Math.round(h * z) + "px";
    return el;
}
const _montajes = {};
let _idSprite = 0;
const cancelarReposo = (x) => {
    if (x && x._reposo) { x._reposo.forEach((a) => { try { a.cancel(); } catch (_) {} }); x._reposo = null; }
};
function sustituirElemento(viejo, nuevo) {
    nuevo.id = viejo.id; nuevo.className = viejo.className; nuevo.style.cssText = viejo.style.cssText;
    cancelarReposo(viejo);
    viejo.replaceWith(nuevo);
    return nuevo;
}
// Marca los sprites que no tienen animación (sin inventarles ninguna: solo se muestran quietos).
function reposoSprite(el, estatico) {
    cancelarReposo(el); cancelarReposo(el.closest(".soporte"));
    el.classList.toggle("sprite-quieto", !!estatico);
}
// Monta en `el` el primer candidato que cargue (img animada o atlas en canvas).
async function montarSprite(el, candidatos, { fps = 10 } = {}) {
    if (!el.id) el.id = "spr-" + ++_idSprite;
    const clave = el.id;
    const turno = (_montajes[clave] = (_montajes[clave] || 0) + 1);
    const vigente = () => _montajes[clave] === turno;
    const montar = (c, recurso) => {
        const actual = document.getElementById(clave) || el;
        if (c.tipo === "img") {
            const img = actual.tagName === "IMG" ? actual : sustituirElemento(actual, document.createElement("img"));
            img.src = c.url;
            img.dataset.nw = recurso.naturalWidth; img.dataset.nh = recurso.naturalHeight;
            if (c.escala) img.dataset.escala = c.escala; else delete img.dataset.escala;
            reposoSprite(img, !/\.gif$/i.test(c.url));
            return img;
        }
        const cv = actual.tagName === "CANVAS" ? actual : sustituirElemento(actual, document.createElement("canvas"));
        Atlas.animar(cv, recurso, { fps });
        cv.dataset.nw = recurso.w; cv.dataset.nh = recurso.h;
        delete cv.dataset.escala;
        reposoSprite(cv, recurso.frames.length < 2);
        return cv;
    };
    // Un sprite fijo solo se descarta si más adelante hay uno animado marcado como preferente (p. ej. el 3D opcional).
    let reserva = null;
    for (let i = 0; i < candidatos.length; i++) {
        const c = candidatos[i];
        try {
            const recurso = await cargarCandidato(c);
            if (!vigente()) return document.getElementById(clave) || el;
            const fijo = c.tipo === "img" ? !/\.gif$/i.test(c.url) : recurso.frames.length < 2;
            if (fijo && candidatos.slice(i + 1).some((x) => x.animado)) { reserva = reserva || { c, recurso }; continue; }
            return montar(c, recurso);
        } catch (_) { /* siguiente candidato */ }
    }
    if (reserva && vigente()) return montar(reserva.c, reserva.recurso);
    return document.getElementById(clave) || el;
}
// Deja en caché el primer candidato que exista (para que el sprite aparezca al instante cuando haga falta).
// (Como al montarlo: uno fijo no vale si más adelante hay uno animado preferente, p. ej. el Gigamax en 3D.)
async function precargarSprite(candidatos) {
    for (let i = 0; i < candidatos.length; i++) {
        const c = candidatos[i];
        try {
            const r = await cargarCandidato(c);
            const fijo = c.tipo === "img" ? !/\.gif$/i.test(c.url) : r.frames.length < 2;
            if (fijo && candidatos.slice(i + 1).some((x) => x.animado)) continue;
            return;
        } catch (_) { /* siguiente */ }
    }
}
// mega: la megaevolución (entrada de MEGAS o su nombre de Showdown).
function montarPokemon(el, id, { espalda = false, shiny = false, mega = null, gmax = false } = {}) {
    const cand = gmax ? candidatosGmax(id, espalda, shiny) : mega ? candidatosMega(mega, espalda, shiny) : [];
    return montarSprite(el, cand.length ? cand : candidatosSprite(id, espalda, shiny));
}
// Entrenador animado (reproduce su animación una vez y se queda en la pose final).
async function montarEntrenador(el, clave, { bucle = false, fps = 24 } = {}) {
    try {
        const a = await Atlas.cargar(urlEntrenadorPR(clave));
        const actual = document.getElementById(el.id) || el;
        const cv = actual.tagName === "CANVAS" ? actual : sustituirElemento(actual, document.createElement("canvas"));
        Atlas.animar(cv, a, { fps, bucle });
        cv.dataset.nw = a.w; cv.dataset.nh = a.h;
        return cv;
    } catch (_) { return el; }
}

// ===================== ICONOS DEL EQUIPO (PokéRogue) =====================
// Los iconos pequeños del menú de equipo y de las cajas, por generación.
const IconosPK = (() => {
    const cache = new Map();
    const genDe = (id) => (id <= 151 ? 1 : id <= 251 ? 2 : id <= 386 ? 3 : id <= 493 ? 4 : id <= 649 ? 5 : id <= 721 ? 6 : id <= 809 ? 7 : id <= 905 ? 8 : 9);
    function cargarGen(g) {
        if (cache.has(g)) return cache.get(g);
        const base = prURL(`images/pokemon_icons_${g}`);
        const p = (async () => {
            const r = await pedirConLimite(base + ".json");
            if (!r.ok) throw new Error("iconos " + r.status);
            const d = await r.json();
            const t = d.textures ? d.textures[0] : d;
            const frames = {};
            (Array.isArray(t.frames) ? t.frames : Object.keys(t.frames).map((k) => Object.assign({ filename: k }, t.frames[k])))
                .forEach((f) => { frames[f.filename] = f; });
            return { img: await cargarImagen(base + ".png"), frames };
        })();
        cache.set(g, p);
        p.catch(() => cache.delete(g));
        return p;
    }
    // forma: clave de otra forma (p. ej. «6-mega-x» para Mega-Charizard X).
    async function dibujar(canvas, id, shiny, formaClave = null) {
        const a = await cargarGen(genDe(id));
        // Misma clave que sus sprites (formas como 487-altered); la variocolor lleva "s" tras el número.
        const k = formaClave || clavePR(id), [num, ...forma] = k.split("-");
        const f = a.frames[shiny ? `${num}s${forma.length ? "-" + forma.join("-") : ""}` : k] || a.frames[k] || a.frames[String(id)];
        if (!f) throw new Error("sin icono");
        const ss = f.sourceSize || { w: 40, h: 30 }, o = f.spriteSourceSize || { x: 0, y: 0 };
        canvas.width = ss.w; canvas.height = ss.h;
        const ctx = canvas.getContext("2d");
        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, ss.w, ss.h);
        ctx.drawImage(a.img, f.frame.x, f.frame.y, f.frame.w, f.frame.h, o.x, o.y, f.frame.w, f.frame.h);
        return canvas;
    }
    return { dibujar };
})();
const htmlIcono = (id, clase = "", shiny = false, forma = null) =>
    `<canvas class="icono-pk ${clase}" data-icono="${id}" ${shiny ? 'data-shiny="1"' : ""} ${forma ? `data-forma="${forma}"` : ""} width="40" height="30"></canvas>`;
// Dibuja todos los iconos pendientes (si falta alguno, pone el sprite pequeño de PokéAPI).
function pintarIconos(raiz = document) {
    raiz.querySelectorAll("canvas[data-icono]:not([data-listo])").forEach((cv) => {
        cv.dataset.listo = "1";
        const id = Number(cv.dataset.icono);
        const intentar = (forma) => IconosPK.dibujar(cv, id, cv.dataset.shiny === "1", forma);
        intentar(cv.dataset.forma || null).catch(() => (cv.dataset.forma ? intentar(null) : Promise.reject())).catch(() => {
            const img = document.createElement("img");
            img.className = cv.className; img.alt = ""; img.src = urlSpritePeq(id);
            cv.replaceWith(img);
        });
    });
}

// ===================== ANIMACIONES DE MOVIMIENTOS =====================
const AnimMov = (() => {
    const cacheAnim = new Map(), cacheGraf = new Map(), cacheSnd = new Map();
    const TAM = 96, MS_FRAME = 50;   // celdas 96×96 · 3 frames a 60 fps

    function cargarAnim(nombre) {
        if (cacheAnim.has(nombre)) return cacheAnim.get(nombre);
        const p = pedirConLimite(prURL("battle-anims/" + nombre + ".json")).then((r) => (r.ok ? r.json() : null)).catch(() => null);
        cacheAnim.set(nombre, p);
        return p;
    }
    // (los únicos dos fondos que sus animaciones nombran y no están en su repositorio: ni se piden)
    const NO_EXISTEN = new Set(["PRAS-Dragon Dance BG", "PRAS- Extrasensory BG"]);
    function cargarGrafico(nombre) {
        if (cacheGraf.has(nombre)) return cacheGraf.get(nombre);
        const p = NO_EXISTEN.has(nombre) ? Promise.resolve(null) : cargarImagen(prURL("images/battle_anims/" + nombre + ".png")).catch(() => null);
        cacheGraf.set(nombre, p);
        return p;
    }
    // (el único sonido que sus animaciones piden y no está en su repositorio: el siguiente de la misma serie)
    const SONIDO_QUE_FALTA = { "PRSFX- Celebrate1.wav": "PRSFX- Celebrate2.wav" };
    function audioBase(nombre) {
        const url = prURL("audio/battle_anims/" + (SONIDO_QUE_FALTA[nombre] || nombre));
        let a = cacheSnd.get(url);
        if (!a) { a = new Audio(url); a.preload = "auto"; cacheSnd.set(url, a); }
        return a;
    }
    function sonido(nombre, vol, tono) {
        if (typeof config !== "undefined" && !config.sonido) return;
        const a = audioBase(nombre).cloneNode();
        a.volume = AudioFX.volEfecto(Math.max(0, Math.min(1, ((vol == null ? 100 : vol) / 100) * 0.8)));
        a.preservesPitch = false;
        a.playbackRate = Math.max(0.5, Math.min(2, (tono || 100) / 100));
        a.play().catch(() => {});
    }
    // Tono [r, g, b, gris] como en PokéRogue: primero pasa a gris y luego suma el color (filtro SVG exacto).
    const filtroTono = (() => {
        const ns = "http://www.w3.org/2000/svg", hechos = new Set();
        let svg = null;
        return (tn) => {
            const [r = 0, g = 0, b = 0, gr = 0] = tn;
            const id = `tono_${r}_${g}_${b}_${gr}`.replace(/-/g, "m");
            if (!hechos.has(id)) {
                if (!svg) {
                    svg = document.createElementNS(ns, "svg");
                    svg.setAttribute("width", "0"); svg.setAttribute("height", "0");
                    svg.style.cssText = "position:absolute;width:0;height:0";
                    document.body.appendChild(svg);
                }
                const s = Math.min(1, Math.max(0, gr / 255)), q = 1 - s, L = [0.299, 0.587, 0.114];
                const fila = (i, off) => L.map((l, j) => (q * (i === j ? 1 : 0) + s * l).toFixed(4)).join(" ") + ` 0 ${(off / 255).toFixed(4)}`;
                const f = document.createElementNS(ns, "filter");
                f.setAttribute("id", id); f.setAttribute("color-interpolation-filters", "sRGB");
                const m = document.createElementNS(ns, "feColorMatrix");
                m.setAttribute("type", "matrix");
                m.setAttribute("values", `${fila(0, r)} ${fila(1, g)} ${fila(2, b)} 0 0 0 1 0`);
                f.appendChild(m); svg.appendChild(f); hechos.add(id);
            }
            return `url(#${id})`;
        };
    })();
    const variantes = (d) => (Array.isArray(d) ? d : [d]).filter(Boolean);
    const eventosDe = (a) => Object.values(a.frameTimedEvents || {}).flat();

    // Precarga animaciones, gráficos y sonidos de una lista de movimientos.
    function precargar(nombres) {
        // (con el nombre de su animación: Paisaje Nevado es la de la nieve…)
        const alias = (n) => (typeof ALIAS_ANIM !== "undefined" && ALIAS_ANIM[n]) || n;
        return Promise.all([...new Set(nombres.filter(Boolean).map(alias))].map(async (n) => {
            const d = await cargarAnim(n); if (!d) return;
            variantes(d).forEach((a) => {
                if (a.graphic) cargarGrafico(a.graphic);
                eventosDe(a).forEach((ev) => {
                    if (!ev.resourceName) return;
                    if (ev.eventType === "AnimTimedSoundEvent") audioBase(ev.resourceName);
                    else if (ev.eventType === "AnimTimedAddBgEvent") cargarGrafico(ev.resourceName);
                });
            });
        }));
    }
    async function existe(nombre) { return !!(await cargarAnim(nombre)); }

    // ctx: { escena, delante, detras, fondo, aliadoEl, enemigoEl, atacanteEsAliado, grito(tono), sigue() }
    async function reproducir(nombre, ctx) {
        const LIMITE = 6000;   // (si su animación no llega en 6 s, se sigue sin ella)
        const datos = await conLimite(cargarAnim(nombre), LIMITE);
        if (!datos) return false;
        const vs = Array.isArray(datos) ? datos : null;
        const anim = vs ? (ctx.atacanteEsAliado ? vs[0] : (vs[1] || vs[0])) : datos;
        if (!anim || !anim.frames || !anim.frames.length) return false;
        // Variante del rival (autoría con el aliado abajo-izquierda): mismas posiciones.
        const opp = !!(vs && !ctx.atacanteEsAliado && vs[1]);
        const uEl = (ctx.atacanteEsAliado || opp) ? ctx.aliadoEl : ctx.enemigoEl;
        const tEl = (ctx.atacanteEsAliado || opp) ? ctx.enemigoEl : ctx.aliadoEl;
        if (!uEl || !tEl) return false;

        const re = ctx.escena.getBoundingClientRect();
        const centro = (el) => { const r = el.getBoundingClientRect(); return { x: r.left - re.left + r.width / 2, y: r.top - re.top + r.height / 2 }; };
        const U = centro(uEl), T = centro(tEl);
        // En PokéRogue un píxel de la animación es un píxel del sprite: aquí, el zoom de los sprites.
        const k = ctx.zoom || ((Math.abs(T.x - U.x) / 128 + Math.abs(T.y - U.y) / 64) / 2) || 2;
        const escCel = k;
        const W = re.width, H = re.height, invertido = T.x < U.x, sx = W / 320, sy = H / 180;
        const mapa = (c) => {
            const fx = c.x || 0, fy = c.y || 0;
            switch (c.focus || 1) {
                case 1: return { x: T.x + (fx - 128) * k, y: T.y + (fy + 64) * k, inv: false };   // objetivo
                case 2: return { x: U.x + fx * k, y: U.y + fy * k, inv: false };                 // usuario
                case 4: return { x: ((fx + 106) / 320) * W, y: ((fy + 116) / 180) * H, inv: false }; // pantalla
                default: return { x: U.x + (fx / 128) * (T.x - U.x), y: U.y + (fy / -64) * (T.y - U.y), inv: invertido }; // línea usuario→objetivo
            }
        };

        const img = anim.graphic ? await conLimite(cargarGrafico(anim.graphic), LIMITE) : null;
        const cols = img ? Math.max(1, Math.floor(img.naturalWidth / TAM)) : 1;
        // Fondos de la animación listos antes de empezar.
        const fondos = {};
        await Promise.all(eventosDe(anim).filter((e) => e.eventType === "AnimTimedAddBgEvent" && e.resourceName)
            .map(async (e) => { fondos[e.resourceName] = await conLimite(cargarGrafico(e.resourceName), LIMITE); }));

        const cels = [];
        // Más fluidas que en su juego: entre un fotograma y el siguiente el navegador interpola posición, giro, tamaño
        // y opacidad (se ve a 60 fps en vez de a 20), con los mismos gráficos.
        const paso = MS_FRAME / velJuego();
        const TRANS = `left ${paso}ms linear, top ${paso}ms linear, transform ${paso}ms linear, opacity ${paso}ms linear`;
        const nuevaCel = () => {
            const d = document.createElement("div");
            d.className = "anim-cel";
            if (img) d.style.backgroundImage = `url("${img.src}")`;
            if (anim.hue) d.style.filter = `hue-rotate(${anim.hue}deg)`;
            d._visto = false;
            return d;
        };
        let bg = null, bgPos = null;   // bgPos: adónde va el fondo (en píxeles de la pantalla de 320×180 de PokéRogue)
        const ejecutar = (ev) => {
            if (ev.eventType === "AnimTimedSoundEvent") {
                if (ev.resourceName) sonido(ev.resourceName, ev.volume, ev.pitch);
                else if (ctx.grito) ctx.grito(ev.pitch);
            } else if (ev.eventType === "AnimTimedAddBgEvent") {
                const fi = ev.resourceName && fondos[ev.resourceName];
                if (ev.resourceName && !fi) return;   // fondo inexistente en el repositorio: se omite
                if (bg) bg.remove();
                bg = document.createElement("div");
                bg.className = "anim-bg";
                if (fi) {
                    bg.style.backgroundImage = `url("${fi.src}")`;
                    bg.style.backgroundSize = `${fi.naturalWidth * 1.25 * sx}px ${fi.naturalHeight * 1.25 * sy}px`;
                } else bg.style.background = "#000";   // sin imagen: la pantalla se oscurece
                // Igual que en PokéRogue: un mosaico de 896×576 (a escala 1,25) con su esquina en (bgX − 320, bgY − 284),
                // en su pantalla de 320×180 (aquí, la escena). Así la ola de Surf sube desde abajo y cubre el campo.
                bg.style.right = "auto"; bg.style.bottom = "auto";
                bg.style.width = 1120 * sx + "px"; bg.style.height = 720 * sy + "px";
                bgPos = { x: (ev.bgX || 0) - 320, y: (ev.bgY || 0) - 284 };
                bg.style.left = bgPos.x * sx + "px"; bg.style.top = bgPos.y * sy + "px";
                bg.style.opacity = (ev.opacity || 0) / 255;
                ctx.fondo.appendChild(bg);
            } else if (ev.eventType === "AnimTimedUpdateBgEvent" && bg) {
                void bg.offsetWidth;   // si se acaba de crear (p. ej. en el mismo fotograma, como en Surf), que parta de su sitio inicial
                const ms = ((ev.duration || 0) * MS_FRAME) / velJuego();
                const destino = { x: ev.bgX !== undefined ? (ev.bgX || 0) * 0.5 - 320 : bgPos.x, y: ev.bgY !== undefined ? (ev.bgY || 0) * 0.5 - 284 : bgPos.y };
                const mueve = Math.abs(destino.x - bgPos.x) > 0.5 || Math.abs(destino.y - bgPos.y) > 0.5;
                // En estas animaciones los eventos que solo desplazan el fondo traen opacidad 0 (un dato que faltaba): se ignora,
                // salvo en el último, que es el que lo desvanece. Si no, el fondo de Psíquico, Confusión, Trueno o Terremoto no se veía.
                const opacidad = ev.opacity !== undefined && !(ev.opacity === 0 && mueve && ev !== ultimaOpacidad) ? (ev.opacity || 0) / 255 : null;
                bg.style.transition = `opacity ${ms}ms linear, left ${ms}ms linear, top ${ms}ms linear`;
                if (opacidad !== null) bg.style.opacity = opacidad;
                bg.style.left = destino.x * sx + "px"; bg.style.top = destino.y * sy + "px";
                bgPos = destino;
            }
        };
        const guardar = (el) => ({ t: el.style.transform, o: el.style.opacity, f: el.style.filter });
        const restaurar = (el, s) => { el.style.transform = s.t; el.style.opacity = s.o; el.style.filter = s.f; };
        const mover = (el, C, c) => {
            if (!c) { el.style.opacity = "0"; return; }   // como en PokéRogue: si el fotograma no lo incluye, no se ve
            const p = mapa(c);
            const zx = ((c.zoomX == null ? 100 : c.zoomX) / 100) * (c.mirror ? -1 : 1), zy = (c.zoomY == null ? 100 : c.zoomY) / 100;
            el.style.transform = `translate(${(p.x - C.x).toFixed(1)}px,${(p.y - C.y).toFixed(1)}px) rotate(${-(c.angle || 0)}deg) scale(${zx},${zy})`;
            el.style.opacity = c.visible === false ? 0 : (c.opacity == null ? 255 : c.opacity) / 255;
            const tn = c.tone;
            el.style.filter = Array.isArray(tn) && (tn[0] || tn[1] || tn[2] || tn[3]) ? filtroTono(tn) : "";
        };
        const su = guardar(uEl), st = guardar(tEl);
        // Los Pokémon también se mueven con suavidad durante la animación.
        const transU = uEl.style.transition, transT = tEl.style.transition;
        uEl.style.transition = tEl.style.transition = `transform ${paso}ms linear, opacity ${paso}ms linear`;
        const evs = anim.frameTimedEvents || {};
        const orden = (a, b) => (a.eventType === "AnimTimedAddBgEvent" ? -1 : 0) - (b.eventType === "AnimTimedAddBgEvent" ? -1 : 0);
        const ultimaOpacidad = Object.keys(evs).map(Number).sort((a, b) => a - b).flatMap((f) => evs[f].slice().sort(orden))
            .filter((e) => e.eventType === "AnimTimedUpdateBgEvent" && e.opacity !== undefined).pop();
        try {
            for (let f = 0; f < anim.frames.length; f++) {
                if (ctx.sigue && !ctx.sigue()) break;
                (evs[f] || []).slice().sort(orden).forEach(ejecutar);
                let g = 0, cu = null, ct = null;
                for (const c of anim.frames[f]) {
                    if (c.target === 2) {
                        if (!img) continue;
                        const d = cels[g] || (cels[g] = nuevaCel()); g++;
                        // Prioridad (como en PokéRogue): 0, detrás de todo · 2, justo detrás del Pokémon al que sigue (o sobre
                        // el fondo de la animación, si lo hay) · 1 y 3, delante (3: justo delante de su Pokémon).
                        const capa = c.priority === 0 || (c.priority === 2 && (bg || c.focus === 1 || c.focus === 2)) ? ctx.detras : ctx.delante;
                        if (d.parentNode !== capa) { d.style.transition = "none"; d._visto = false; capa.appendChild(d); }
                        // Si reaparece (o aparece por primera vez), va directo a su sitio; si no, se desliza desde el anterior.
                        const aparece = !d._visto && c.visible !== false;
                        if (aparece) d.style.transition = "none";
                        const p = mapa(c), fr = c.graphicFrame || 0;
                        const sx = ((c.zoomX == null ? 100 : c.zoomX) / 100) * (c.mirror ? -1 : 1) * (p.inv ? -1 : 1) * escCel;
                        const sy = ((c.zoomY == null ? 100 : c.zoomY) / 100) * escCel;
                        d.style.backgroundPosition = `-${(fr % cols) * TAM}px -${Math.floor(fr / cols) * TAM}px`;
                        d.style.left = p.x + "px"; d.style.top = p.y + "px";
                        d.style.transform = `translate(-50%,-50%) rotate(${-(c.angle || 0)}deg) scale(${sx},${sy})`;
                        d.style.opacity = (c.opacity == null ? 255 : c.opacity) / 255;
                        d.style.visibility = c.visible === false ? "hidden" : "visible";
                        d.style.mixBlendMode = c.blendType === 1 ? "plus-lighter" : c.blendType === 2 ? "difference" : "normal";
                        if (aparece) { void d.offsetWidth; d.style.transition = TRANS; }
                        d._visto = c.visible !== false;
                    } else if (c.target === 0) cu = c;
                    else if (c.target === 1) ct = c;
                }
                for (let k = g; k < cels.length; k++) { cels[k].style.visibility = "hidden"; cels[k]._visto = false; }
                mover(uEl, U, cu); mover(tEl, T, ct);
                await esperar(MS_FRAME);
            }
        } finally {
            cels.forEach((d) => d.remove());
            if (bg) { const b = bg; b.style.transition = "opacity 150ms linear"; b.style.opacity = 0; setTimeout(() => b.remove(), 160); }
            uEl.style.transition = transU; tEl.style.transition = transT;
            restaurar(uEl, su); restaurar(tEl, st);
        }
        return true;
    }
    // Solo los sonidos de una animación (cuando se ve la de Showdown), cada uno en su fotograma, como en PokéRogue.
    async function sonidos(nombre, ctx) {
        const datos = await conLimite(cargarAnim(nombre), 6000); if (!datos) return false;
        const vs = Array.isArray(datos) ? datos : null;
        const anim = vs ? (ctx.atacanteEsAliado ? vs[0] : (vs[1] || vs[0])) : datos;
        const evs = (anim && anim.frameTimedEvents) || {};
        Object.keys(evs).forEach((f) => evs[f].forEach((ev) => {
            if (ev.eventType !== "AnimTimedSoundEvent") return;
            setTimeout(() => {
                if (ctx.sigue && !ctx.sigue()) return;
                if (ev.resourceName) sonido(ev.resourceName, ev.volume, ev.pitch);
                else if (ctx.grito) ctx.grito(ev.pitch);
            }, (Number(f) * MS_FRAME) / velJuego());
        }));
        return true;
    }
    return { reproducir, precargar, existe, sonidos };
})();

// ===================== ANIMACIONES DE MOVIMIENTOS DE POKÉMON SHOWDOWN =====================
// Las animaciones de cada movimiento de Showdown (partículas con perspectiva, como en Blanco/Negro), tal cual,
// en nuestra escena: su escenario de 640×360 (tu Pokémon en z = 0 y el rival en z = 200) se ajusta a donde
// están de verdad los dos Pokémon. Los efectos son sus imágenes reales (fx) y los sonidos, los de PokéRogue.
const MovSD = (() => {
    let carga = null, fxListos = false;
    function cargar() {
        if (window.SD_ANIMS) return Promise.resolve(window.SD_ANIMS);
        if (!carga) carga = new Promise((res, rej) => {
            const s = document.createElement("script");
            // (con la misma versión que los demás archivos publicados, para que la caché lo guarde: son 645 KB)
            const v = (/[?&]v=(\d+)/.exec((document.querySelector('script[src*="animaciones.js"]') || { getAttribute: () => "" }).getAttribute("src") || "") || [])[1];
            s.src = "animaciones-showdown.js" + (v ? `?v=${v}` : "");
            s.onload = () => (window.SD_ANIMS ? res(window.SD_ANIMS) : rej(new Error("sd")));
            s.onerror = () => { carga = null; rej(new Error("sd")); };
            document.head.appendChild(s);
        });
        return carga;
    }
    // Deja cargadas las animaciones y sus imágenes antes del primer ataque.
    async function precargar() {
        const A = await cargar();
        if (fxListos) return;
        fxListos = true;
        Object.values(A.BattleEffects).forEach((e) => { if (e.url) cargarImagen(e.url).catch(() => {}); });
    }
    const idSD = (clave) => String(clave || "").replace(/[^a-z0-9]/g, "");
    function existe(clave) { const A = window.SD_ANIMS; return !!(A && A.BattleMoveAnims[idSD(clave)]); }

    // Curvas de sus transiciones (las mismas que Showdown añade a jQuery).
    const CURVA = {
        linear: (x) => x,
        swing: (x) => 0.5 - Math.cos(x * Math.PI) / 2,
        quadUp: (x) => 1 - (1 - x) * (1 - x),
        quadDown: (x) => x * x,
        ballisticUp: (x) => -3 * x * x + 4 * x,
        ballisticDown: (x) => { x = 1 - x; return 1 - (-3 * x * x + 4 * x); },
    };
    const PROPS = ["left", "top", "width", "height", "opacity"];
    // Posición en su escenario (copia de BattleScene.pos de Showdown).
    function pos(loc, obj) {
        loc = Object.assign({ x: 0, y: 0, z: 0, scale: 1, opacity: 1 }, loc);
        if (!loc.xscale && loc.xscale !== 0) loc.xscale = loc.scale;
        if (!loc.yscale && loc.yscale !== 0) loc.yscale = loc.scale;
        let left = 210, top = 245;
        let scale = obj.gen === 5 ? 2.0 - loc.z / 200 : 1.5 - 0.5 * (loc.z / 200);
        if (scale < 0.1) scale = 0.1;
        left += (410 - 190) * (loc.z / 200);
        top += (135 - 245) * (loc.z / 200);
        left += Math.floor(loc.x * scale);
        top -= Math.floor(loc.y * scale);
        const width = Math.floor(obj.w * scale * loc.xscale), height = Math.floor(obj.h * scale * loc.yscale);
        const hoffset = Math.floor((obj.h - (obj.y || 0) * 2) * scale * loc.yscale);
        left -= Math.floor(width / 2);
        top -= Math.floor(hoffset / 2);
        return { left, top, width, height, opacity: loc.opacity };
    }
    // Destino con la curva de cada propiedad (copia de BattleScene.posT).
    function posT(loc, obj, transition, oldLoc) {
        const p = pos(loc, obj), old = oldLoc ? pos(oldLoc, obj) : p;
        const c = { left: "linear", top: "linear", width: "linear", height: "linear", opacity: "linear" };
        if (transition === "ballistic") c.top = p.top < old.top ? "ballisticUp" : "ballisticDown";
        if (transition === "ballisticUnder") c.top = p.top < old.top ? "ballisticDown" : "ballisticUp";
        if (transition === "ballistic2") c.top = p.top < old.top ? "quadUp" : "quadDown";
        if (transition === "ballistic2Back") c.top = loc.z > 0 ? "quadUp" : "quadDown";
        if (transition === "ballistic2Under") c.top = p.top < old.top ? "quadDown" : "quadUp";
        if (transition === "swing") c.left = c.top = c.width = c.height = "swing";
        if (transition === "accel") c.left = c.top = c.width = c.height = "quadDown";
        if (transition === "decel") c.left = c.top = c.width = c.height = "quadUp";
        return { p, c };
    }

    // Cada «actor» (un efecto, un fondo o un Pokémon) guarda una cola de pasos, como las colas de jQuery:
    // se ejecutan uno detrás de otro y luego se convierten en tramos con su tiempo exacto.
    function actor(inicial) { return { cola: [], ini: inicial }; }
    function tramos(a) {
        let t = 0, estado = Object.assign({}, a.ini);
        const out = [];
        for (const paso of a.cola) {
            if (paso.tipo === "espera") { t += paso.ms; continue; }
            const hasta = Object.assign({}, estado, paso.hasta);
            out.push({ t0: t, t1: t + (paso.ms || 0), desde: estado, hasta, curva: paso.curva || {} });
            t += paso.ms || 0; estado = hasta;
        }
        a.tramos = out; a.fin = t; a.estado0 = Object.assign({}, a.ini);
        return a;
    }
    function valorEn(a, t) {
        let e = a.estado0;
        for (const s of a.tramos) {
            if (t < s.t0) break;
            if (t >= s.t1) { e = s.hasta; continue; }
            const k = (t - s.t0) / Math.max(1, s.t1 - s.t0), r = {};
            PROPS.forEach((p) => {
                if (s.hasta[p] === undefined) return;
                const a0 = s.desde[p] === undefined ? s.hasta[p] : s.desde[p];
                r[p] = a0 + (s.hasta[p] - a0) * (CURVA[s.curva[p]] || CURVA.linear)(k);
            });
            return Object.assign({}, s.desde, r);
        }
        return e;
    }

    // ctx: { escena, delante, fondo, aliadoEl, enemigoEl, atacanteEsAliado, sigue, clave, sonidosDe }
    async function reproducir(clave, ctx, { grupo = "move", mismo = false } = {}) {
        let A;
        try { A = await conLimite(cargar(), 10000); } catch (_) { return false; }
        if (!A) return false;
        const lista = grupo === "status" ? A.BattleStatusAnims : grupo === "other" ? A.BattleOtherAnims : A.BattleMoveAnims;
        const entrada = lista[grupo === "move" ? idSD(clave) : clave];
        if (!entrada || !entrada.anim) return false;
        const esc = ctx.escena; if (!esc) return false;
        const re = esc.getBoundingClientRect();
        const centro = (el) => { const r = el.getBoundingClientRect(); return { x: r.left - re.left + r.width / 2, y: r.top - re.top + r.height / 2 }; };
        const AL = centro(ctx.aliadoEl), EN = centro(ctx.enemigoEl);
        // Del escenario de Showdown al nuestro: su Pokémon (210, 245) y su rival (430, 135) van donde están los nuestros.
        const fx = (EN.x - AL.x) / 220 || 2, fy = (AL.y - EN.y) / 110 || 2;
        const mx = (x) => AL.x + (x - 210) * fx, my = (y) => AL.y + (y - 245) * fy;
        const k = (fx + fy) / 2;
        // Nuestros Pokémon salen algo más grandes que en Showdown (sobre todo el rival): sus efectos crecen igual.
        const extra = (cy) => 1.05 + 0.5 * Math.max(0, Math.min(1, (245 - cy) / 110));

        const actores = [];
        const crearPokemon = (el, rival) => {
            const a = actor({});
            const sp = { w: Number(el.dataset.nw) || el.naturalWidth || 96, h: Number(el.dataset.nh) || el.naturalHeight || 96, gen: 5, url: el.tagName === "IMG" ? el.src : "", clon: el };
            const home = { x: 0, y: 0, z: rival ? 200 : 0 };
            a.ini = pos(home, sp);
            const o = {
                x: 0, y: 0, z: home.z, sp, isFrontSprite: rival, isMissedPokemon: false,
                behind(off) { return this.z + (this.isFrontSprite ? 1 : -1) * off; },
                leftof(off) { return this.x + (this.isFrontSprite ? 1 : -1) * off; },
                behindx(off) { return this.x + (this.isFrontSprite ? 1 : -1) * off; },
                behindy(off) { return this.y + (this.isFrontSprite ? -1 : 1) * off; },
                delay(ms) { a.cola.push({ tipo: "espera", ms }); return this; },
                anim(end, transition) {
                    end = Object.assign({ x: this.x, y: this.y, z: this.z, scale: 1, opacity: 1, time: 500 }, end);
                    const d = posT(end, sp, transition, home);
                    a.cola.push({ tipo: "anim", hasta: d.p, curva: d.c, ms: end.time });
                    return this;
                },
            };
            a.pokemon = { el, home: a.ini, o };
            actores.push(a);
            return o;
        };
        const yo = crearPokemon(ctx.atacanteEsAliado ? ctx.aliadoEl : ctx.enemigoEl, !ctx.atacanteEsAliado);
        const otro = mismo ? yo : crearPokemon(ctx.atacanteEsAliado ? ctx.enemigoEl : ctx.aliadoEl, ctx.atacanteEsAliado);
        const escena = {
            timeOffset: 0, gen: 9, acceleration: 1, animating: true,
            battle: { mySide: { x: 0, y: 0, z: 0 }, gen: 9 },
            wait(ms) { this.timeOffset += ms; },
            showEffect(efecto, start, end, transition, after) {
                const e = typeof efecto === "string" ? A.BattleEffects[efecto] : efecto;
                if (!e || (!e.url && !e.clon)) return { nulo: true };
                const a = actor({ opacity: 0 });
                a.efecto = e;
                actores.push(a);
                return this.animateEffect(a, e, start, end, transition, after);
            },
            animateEffect(a, efecto, start, end, transition, after) {
                if (!a || a.nulo) return a;
                const e = typeof efecto === "string" ? A.BattleEffects[efecto] : efecto;
                start = Object.assign({}, start); end = Object.assign({}, end);
                if (!start.time) start.time = 0;
                if (!end.time) end.time = start.time + 500;
                start.time += this.timeOffset; end.time += this.timeOffset;
                if (!end.scale && end.scale !== 0 && start.scale) end.scale = start.scale;
                if (!end.xscale && end.xscale !== 0 && start.xscale) end.xscale = start.xscale;
                if (!end.yscale && end.yscale !== 0 && start.yscale) end.yscale = start.yscale;
                end = Object.assign({}, start, end);
                const ini = pos(start, e), dest = posT(end, e, transition, start);
                if (!a.cola.length) {
                    a.cola.push({ tipo: "anim", hasta: Object.assign({}, ini, { opacity: 0 }), ms: 0 });
                    if (start.time) a.cola.push({ tipo: "espera", ms: start.time });
                    a.cola.push({ tipo: "anim", hasta: { opacity: ini.opacity }, ms: 1 });
                } else a.cola.push({ tipo: "anim", hasta: ini, ms: 0 });
                a.cola.push({ tipo: "anim", hasta: dest.p, curva: dest.c, ms: Math.max(0, end.time - start.time) });
                if (after === "fade") a.cola.push({ tipo: "anim", hasta: { opacity: 0 }, ms: 100 });
                if (after === "explode") {
                    ["scale", "xscale", "yscale"].forEach((s) => { if (end[s]) end[s] *= 3; });
                    end.opacity = 0;
                    a.cola.push({ tipo: "anim", hasta: pos(end, e), ms: 200 });
                }
                return a;
            },
            backgroundEffect(bg, duracion, opacidad = 1, retraso = 0) {
                const a = actor({ opacity: 0 });
                a.fondo = bg;
                a.cola.push({ tipo: "espera", ms: retraso }, { tipo: "anim", hasta: { opacity: opacidad }, ms: 250 },
                    { tipo: "espera", ms: Math.max(0, duracion - 250) }, { tipo: "anim", hasta: { opacity: 0 }, ms: 250 });
                actores.push(a);
            },
        };
        try { entrada.anim(escena, [yo, otro]); } catch (_) { return false; }
        if (!actores.some((a) => a.cola.length)) return false;

        // Elementos: efectos delante de los Pokémon y fondos entre el escenario y ellos.
        actores.forEach((a) => {
            tramos(a);
            if (a.pokemon) { a.guardado = { t: a.pokemon.el.style.transform, o: a.pokemon.el.style.opacity }; return; }
            if (a.fondo !== undefined) {
                a.el = document.createElement("div");
                a.el.className = "sd-fondo";
                a.el.style.background = a.fondo;
                a.el.style.backgroundSize = "cover";
                a.el.style.opacity = "0";
                ctx.fondo.appendChild(a.el);
                return;
            }
            if (a.efecto.clon && a.efecto.clon.tagName === "CANVAS") {
                a.el = document.createElement("canvas");
                a.el.width = a.efecto.clon.width; a.el.height = a.efecto.clon.height;
                try { a.el.getContext("2d").drawImage(a.efecto.clon, 0, 0); } catch (_) {}
            } else {
                a.el = document.createElement("img");
                a.el.src = a.efecto.url || (a.efecto.clon && a.efecto.clon.src) || "";
                a.el.alt = "";
            }
            a.el.className = "sd-efecto" + (a.efecto.clon ? " sd-clon" : "");
            a.el.style.opacity = "0";
            ctx.delante.appendChild(a.el);
        });
        const total = Math.max(...actores.map((a) => a.fin), 0);
        if (ctx.clave && ctx.sonidosDe) ctx.sonidosDe(ctx.clave);
        const pintar = (t) => {
            actores.forEach((a) => {
                const v = valorEn(a, t);
                if (a.pokemon) {
                    const h = a.pokemon.home, el = a.pokemon.el;
                    const cx = v.left + v.width / 2, cy = v.top + v.height / 2, hx = h.left + h.width / 2, hy = h.top + h.height / 2;
                    const sx = h.width ? v.width / h.width : 1, sy = h.height ? v.height / h.height : 1;
                    el.style.transform = `translate(${((cx - hx) * fx).toFixed(1)}px,${((cy - hy) * fy).toFixed(1)}px) scale(${sx.toFixed(3)},${sy.toFixed(3)})`;
                    el.style.opacity = String(Math.max(0, Math.min(1, v.opacity)));
                    return;
                }
                if (!a.el) return;
                a.el.style.opacity = String(Math.max(0, Math.min(1, v.opacity || 0)));
                if (a.fondo !== undefined) return;
                const cx = v.left + v.width / 2, cy = v.top + v.height / 2, f = k * extra(cy);
                const w = Math.abs(v.width) * f, h2 = Math.abs(v.height) * f;
                a.el.style.width = w.toFixed(1) + "px"; a.el.style.height = h2.toFixed(1) + "px";
                a.el.style.left = (mx(cx) - w / 2).toFixed(1) + "px"; a.el.style.top = (my(cy) - h2 / 2).toFixed(1) + "px";
            });
        };
        // Con temporizador (y no requestAnimationFrame, que se para con la pestaña oculta): el combate nunca se queda esperando.
        await new Promise((res) => {
            const t0 = performance.now();
            const paso = () => {
                const t = (performance.now() - t0) * velJuego();
                if ((ctx.sigue && !ctx.sigue()) || t >= total) return res();
                pintar(t);
                setTimeout(paso, 16);
            };
            pintar(0);
            setTimeout(paso, 16);
        });
        actores.forEach((a) => {
            if (a.pokemon) { a.pokemon.el.style.transform = a.guardado.t; a.pokemon.el.style.opacity = a.guardado.o; }
            else if (a.el) a.el.remove();
        });
        return true;
    }
    return { cargar, precargar, reproducir, existe, idSD };
})();
