/* =========================================================
   AUDIO · música, efectos y gritos REALES (nada sintetizado)
   Música y efectos: PokéRogue / Showdown · Gritos: PokéAPI.
   Cada canal (música, efectos y gritos) tiene su volumen en Opciones.
   Todo se descarga una sola vez y se guarda: lo que va a sonar pronto
   se precarga, para que suene al instante (sin esperar a internet).
   ========================================================= */

const AudioFX = (() => {
    const sonidoOn = () => (typeof config === "undefined" ? true : config.sonido);
    // Volumen de cada canal (0-100 en Opciones → 0-1).
    const canal = (nombre) => {
        const v = typeof config === "undefined" ? 100 : config["vol" + nombre];
        return Math.max(0, Math.min(1, (v == null ? 100 : v) / 100));
    };
    const volMusica = (v) => Math.min(1, v * canal("Musica"));
    const volEfecto = (v) => Math.min(1, v * canal("Efectos"));
    const volGrito = (v) => Math.min(1, v * canal("Gritos"));
    const VOL_MUSICA = 0.35, VOL_SE = 0.55;
    let musica = null, musicaUrl = null;

    // Cachés con las últimas usadas (las más viejas se sueltan): pistas de música, efectos y gritos.
    function cache(max) {
        const m = new Map();
        return (url, enUso) => {
            let a = m.get(url);
            if (a) { m.delete(url); m.set(url, a); return a; }   // la más reciente, al final
            a = new Audio(); a.preload = "auto"; a.src = url;
            a.addEventListener("error", () => { if (m.get(url) === a) m.delete(url); });   // si falla, otra vez se reintenta
            m.set(url, a);
            for (const [u, v] of m) {
                if (m.size <= max) break;
                if (v !== enUso) { v.removeAttribute("src"); v.load(); m.delete(u); }
            }
            return a;
        };
    }
    const pista = cache(16), baseSE = cache(80), baseGrito = cache(60);

    function pararMusica() {
        const a = musica;
        musica = null; musicaUrl = null;
        if (a) { try { a.pause(); } catch (_) {} if (a._fin) a._fin(); }
    }
    // Pista en bucle (si ya está sonando la misma, no la reinicia).
    function musicaSonar(url, { bucle = true, vol = VOL_MUSICA } = {}) {
        if (!url) return;
        if (!sonidoOn()) { pararMusica(); return; }
        if (musica && musicaUrl === url) { if (musica.paused) musica.play().catch(() => {}); return; }
        pararMusica();
        const a = pista(url, musica);
        a.loop = bucle; a._vol = vol; a.volume = volMusica(vol);
        try { a.currentTime = 0; } catch (_) {}
        musica = a; musicaUrl = url;
        a.play().catch(() => {});
    }
    // Fanfarria de una vez (corta la música). Resuelve al terminar (o si otra música la corta).
    function fanfarria(url, vol = 0.5) {
        return new Promise((res) => {
            if (!sonidoOn() || !url) return res();
            pararMusica();
            const a = pista(url, musica);
            a.loop = false; a._vol = vol; a.volume = volMusica(vol);
            try { a.currentTime = 0; } catch (_) {}
            musica = a; musicaUrl = url;
            const fin = () => {
                if (a._fin !== fin) return;
                a._fin = null;
                a.removeEventListener("ended", fin); a.removeEventListener("error", fin);
                if (musica === a) { musica = null; musicaUrl = null; }
                res();
            };
            a._fin = fin;
            a.addEventListener("ended", fin); a.addEventListener("error", fin);
            a.play().catch(fin);
        });
    }
    // Descarga de antemano las pistas que van a sonar pronto.
    function precargarMusica(urls) {
        if (!sonidoOn()) return;
        [...new Set(urls.filter(Boolean))].forEach((u) => pista(u, musica));
    }
    // Al mover el control de volumen, la música que suena cambia en el momento.
    function actualizarVolumen() { if (musica) musica.volume = volMusica(musica._vol == null ? VOL_MUSICA : musica._vol); }

    // Cada efecto o grito suena en una copia del audio ya descargado (así pueden solaparse).
    function copia(base, volumen, rate = 1) {
        const a = base.cloneNode();
        a.volume = volumen; a.preservesPitch = false; a.playbackRate = rate;
        return a;
    }
    function sonar(url, { vol = VOL_SE, rate = 1 } = {}) {
        if (!sonidoOn() || !url) return null;
        const a = copia(baseSE(url), volEfecto(vol), rate);
        a.play().catch(() => {});
        return a;
    }
    const efecto = (nombre, o) => sonar(urlSE(nombre), o);     // audio/se de PokéRogue
    const ui = (nombre, o) => sonar(urlUI(nombre), o);          // audio/ui de PokéRogue
    function precargarUrls(urls) { if (sonidoOn()) urls.filter(Boolean).forEach((u) => baseSE(u)); }
    const precargar = (nombres) => precargarUrls(nombres.map(urlSE));

    const urlDeGrito = (x) => (typeof x === "number" || /^\d+$/.test(x) ? urlGrito(x) : x);
    function grito(id, { rate = 1, vol = 0.6 } = {}) {
        if (!sonidoOn()) return null;
        const a = copia(baseGrito(urlGrito(id)), volGrito(vol), rate);
        a.play().catch(() => {});
        return a;
    }
    // Gritos que van a sonar pronto (ids de especie o URLs).
    function precargarGritos(lista) { if (sonidoOn()) [...new Set(lista.filter(Boolean))].forEach((x) => baseGrito(urlDeGrito(x))); }
    // Grito de una megaevolución (PokéRogue); si no lo encuentra, el de la especie.
    const sinGritoMega = new Set();
    function gritoMega(mega, id, { vol = 0.6 } = {}) {
        if (!sonidoOn()) return;
        const url = urlGritoMega(mega);
        if (sinGritoMega.has(url)) { grito(id, { vol }); return; }
        const a = copia(baseGrito(url), volGrito(vol));
        let hecho = false;
        const reserva = () => { if (!hecho) { hecho = true; sinGritoMega.add(url); grito(id, { vol }); } };
        a.addEventListener("error", reserva);
        a.play().then(() => { hecho = true; }).catch(reserva);
    }
    // Pitido de PS bajos en bucle (como en los juegos) mientras tu Pokémon esté en rojo.
    let alarmaA = null;
    function alarma(on) {
        if (on && sonidoOn() && !(typeof config !== "undefined" && config.alarmaPS === false)) {
            if (!alarmaA) { alarmaA = copia(baseSE(urlSE("low_hp")), volEfecto(0.16)); alarmaA.loop = true; alarmaA.play().catch(() => {}); }
        } else if (alarmaA) { alarmaA.pause(); alarmaA = null; }
    }
    // Efecto en bucle durante un tiempo (p. ej. la EXP: suena tanto como se llena la barra).
    function efectoDurante(nombre, ms, { vol = 0.4 } = {}) {
        if (!sonidoOn() || ms <= 0) return;
        const a = copia(baseSE(urlSE(nombre)), volEfecto(vol));
        a.loop = true;
        a.play().catch(() => {});
        setTimeout(() => { a.pause(); }, ms);
    }
    // Golpe según la efectividad (sonidos reales de PokéRogue).
    const golpe = (efect, crit) => efecto(crit || efect >= 2 ? "hit_strong" : efect > 0 && efect < 1 ? "hit_weak" : "hit");

    return { musicaSonar, pararMusica, fanfarria, precargarMusica, efecto, efectoDurante, ui, grito, gritoMega, precargarGritos, golpe,
        precargar, precargarUrls, sonar, alarma, actualizarVolumen, volEfecto, sonando: () => musicaUrl };
})();
