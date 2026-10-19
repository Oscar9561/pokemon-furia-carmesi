/* =========================================================
   SERVICE WORKER · caché de los recursos
   - Lo de otras webs (datos de PokéAPI, sprites, animaciones y atlas de PokéRogue, EBDX…): se guarda la primera vez y
     después se sirve al momento, también sin conexión. Solo se guarda lo que esas webs dejan leer (CORS); lo de Pokémon
     Showdown y los sonidos (que se piden por partes) siguen yendo a la red como siempre.
   - Los archivos del propio juego: la página, siempre de la red (así cada actualización se ve al momento) y, sin conexión,
     la última copia. Los .js y .css publicados llevan su versión en el enlace (?v=…, lo pone publicar.py): esos no
     cambian nunca, así que se sirven de la caché al momento (y al llegar una versión nueva se borra la anterior).
   ========================================================= */
const RECURSOS = "fc-recursos-v2", JUEGO = "fc-juego-v1";
const EXTERNOS = [/^https:\/\/raw\.githubusercontent\.com\//, /^https:\/\/pokeapi\.co\/api\//];

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil((async () => {
    const vivas = new Set([RECURSOS, JUEGO]);
    for (const k of await caches.keys()) if (!vivas.has(k)) await caches.delete(k);   // (versiones anteriores)
    await self.clients.claim();
})()));

self.addEventListener("fetch", (e) => {
    const req = e.request;
    if (req.method !== "GET" || req.headers.has("range")) return;   // (audio y vídeo piden por partes: a la red)
    const url = new URL(req.url);
    if (url.origin === self.location.origin) {
        if (/\.(js|css)$/.test(url.pathname) && url.searchParams.has("v")) e.respondWith(versionado(req, url));
        else if (req.mode === "navigate" || /\.(js|css|html|woff2?)$/.test(url.pathname) || url.pathname.endsWith("/")) e.respondWith(primeroRed(req));
        return;
    }
    if (EXTERNOS.some((r) => r.test(req.url)) && !/\.(mp3|wav|ogg|m4a)$/i.test(url.pathname)) e.respondWith(primeroCache(req));
});

const RENOVAR = 14 * 24 * 3600 * 1000;   // (lo guardado hace más de dos semanas se vuelve a pedir, sin esperar, por si ha cambiado)
// Se guarda con la fecha en que se guardó (las cabeceras de otra web, como «Date», no siempre se pueden leer).
async function guardar(cache, url, res) {
    const h = new Headers(res.headers); h.set("x-guardado", String(Date.now()));
    return cache.put(url, new Response(await res.blob(), { status: res.status, statusText: res.statusText, headers: h }));
}
async function primeroCache(req) {
    const cache = await caches.open(RECURSOS);
    const guardada = await cache.match(req.url);
    if (guardada) {
        const fecha = Number(guardada.headers.get("x-guardado")) || 0;
        if (Date.now() - fecha > RENOVAR) fetch(req.url, { mode: "cors", credentials: "omit" }).then((r) => (r.ok ? guardar(cache, req.url, r) : null)).catch(() => {});
        return guardada;
    }
    // Se pide en modo CORS (aunque la página lo pidiera sin él) para poder guardarlo; si no se deja, tal cual y sin guardar.
    try {
        const res = await fetch(req.url, { mode: "cors", credentials: "omit" });
        if (res.ok) guardar(cache, req.url, res.clone()).catch(() => {});
        return res;
    } catch (_) {
        return fetch(req);
    }
}
async function primeroRed(req) {
    const cache = await caches.open(JUEGO);
    try {
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone()).catch(() => {});
        return res;
    } catch (err) {
        const guardada = await cache.match(req, { ignoreSearch: true });
        if (guardada) return guardada;
        throw err;
    }
}
// Un archivo del juego con su versión en el enlace: de la caché si ya está; si no, de la red, y se borran sus versiones viejas.
async function versionado(req, url) {
    const cache = await caches.open(JUEGO);
    const guardada = await cache.match(req);
    if (guardada) return guardada;
    const res = await fetch(req);
    if (res.ok) {
        cache.put(req, res.clone()).catch(() => {});
        cache.keys().then((ks) => ks.forEach((k) => {
            const u = new URL(k.url);
            if (u.pathname === url.pathname && u.searchParams.get("v") !== url.searchParams.get("v")) cache.delete(k);
        })).catch(() => {});
    }
    return res;
}
