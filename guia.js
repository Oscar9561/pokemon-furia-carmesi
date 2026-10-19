/* =========================================================
   GUÍA DEL JUEGO Y NOVEDADES
   - Guía (Opciones → Ayuda): cómo funciona cada cosa (región, Furiosos, tiempo, poderes, pesca, Safari, Metro…).
   - Novedades: al abrir el juego tras una actualización, una ventana con lo nuevo (una sola vez por versión, y solo a
     quien ya tenía partida). Iconos: los de los objetos (PokéAPI y pokesprite).
   ========================================================= */

// [icono (clave de objeto o URL), título, texto]
const GUIA = [
    ["town-map", "La región de Aurelia", "Viaja por el mapa de pueblo en pueblo. En las rutas hay hierba alta (Pokémon salvajes y entrenadores), objetos escondidos y, a veces, encuentros especiales. Para retar a cada líder hay que cumplir antes sus retos (combates, capturas, nivel…). Con las 16 medallas te espera la Liga Pokémon."],
    ["red-shard", "Pokémon Furiosos", "A veces un salvaje aparece envuelto en un aura carmesí: tiene más nivel, sube todas sus características al entrar y pelea como un entrenador. Es más difícil de atrapar, pero al calmarlo suelta un objeto valioso. Salen más de noche y, sobre todo, con lluvia."],
    ["damp-rock", "El tiempo de cada día", "Cada ruta tiene su tiempo del día (lluvia, sol, arena o nieve, según el paisaje). Los combates de allí empiezan con ese tiempo y salen más Pokémon del tipo que le va: Agua con lluvia, Fuego con sol… El parte del tiempo está en las noticias de cada pueblo."],
    ["mega-ring", "Poderes en combate", "Megaevolución (con su megapiedra), movimiento Z (con su cristal), Dinamax o Gigamax (el doble de PS y Maximovimientos durante 3 turnos) y Teracristal (pasa a ser de su teratipo hasta el final): se activan en el menú de movimientos y solo se puede usar uno por combate. En la hierba alta, cada encuentro cuenta como un combate nuevo. Sus cinemáticas se quitan en Opciones."],
    ["good-rod", "Pesca", "Los pescadores de Villa Lumina, Puerto Marea y Ciudad Faro regalan cañas. Donde haya agua, lanza la caña, espera y tira en cuanto salga el «!». Cuanto mejor es la caña, más fuertes son los Pokémon. Las Cebo Ball funcionan mucho mejor con lo que pescas."],
    ["safari-ball", "Zona Safari", "Junto a Ciudad Hojarasca (con 2 medallas). Pagas la entrada y recibes Safari Balls: no hay combates, se lanza la ball, cebo (huyen menos) o barro (más fáciles de atrapar, pero huyen más). Las especies cambian cada lunes."],
    ["vs-recorder", "Metro Batalla", "En Ciudad Voltia (con 8 medallas): combates seguidos con tres Pokémon a nivel 50, sin mochila. En el combate 21 espera el Jefe de Metro. Las victorias dan Puntos de Batalla para el Canje: mentas, cápsulas de habilidad y objetos que no vende nadie."],
    ["dragoninite", "Torre Prisma y megapiedras nuevas", "Junto a Ciudad Voltia (con 6 medallas) está la Torre Prisma, donde Lem estudia las megapiedras de Luminalia: Dragonite, Greninja, Starmie, Garchomp Z, Zygarde... Te regala una al conocerte, vende las demás y te reta a un combate."],
    ["rainbow-wing", "Legendarios de Aurelia", "Cada zona especial esconde un Pokémon legendario: Celebi en el Bosque Eterno, Lugia en las Islas Remolino, Ho-Oh en la Torre Campana, Heatran en la Fragua Magma... y, para los Campeones, Rayquaza en el Pilar Celeste y Darkrai en la Isla Luna Nueva."],
    ["grass-mail", "Encargos de los vecinos", "En cada pueblo hay un vecino que busca algo: un Pokémon de cierto tipo y nivel, un fósil, muchas especies en la Pokédex... Enséñaselo (en tu equipo) y te dará un premio."],
    [urlEntrenadorFoto("cynthia"), "Torneo Corona", "En el Estadio Corona, junto a la Liga, los Campeones de todas las regiones juegan cada día un torneo de tres rondas. Tu equipo se cura antes de cada combate; ganar la final da una megapiedra de Luminalia."],
    ["lucky-egg", "Guardería Pokémon", "En Villa Lúmina puedes dejar hasta dos Pokémon: suben un nivel cada 15 minutos (hasta el del más fuerte de tu equipo). Si son del mismo grupo huevo y de distinto sexo (o uno es Ditto), a veces aparece un huevo: llévatelo y eclosionará tras unos combates. Nace la primera especie de la familia de la madre."],
    ["vs-seeker", "Combates dobles", "Las parejas de entrenadores (Gemelas, Parejas, Hermanas Misteriosas) combaten dos contra dos. Cada uno de tus Pokémon elige su movimiento y a qué rival ataca; los que alcanzan a varios (Onda Ígnea, Avalancha, Surf, Terremoto…) golpean a todos los que tocan con algo menos de fuerza, y Terremoto y Surf también a tu compañero. En el Combate rápido puedes elegir el formato doble. Con un compañero al lado sirven los movimientos de apoyo (Refuerzo, Señuelo, Polvo Ira, Cede Paso, Último Lugar, Mandato, Decoración…): tus Pokémon los aprenden en «Recordar»."],
    ["vs-recorder", "Combates online", "En Online eliges formato (Individual o Dobles) y buscas rival o creas una sala y le pasas el código o el enlace a un amigo. Todos luchan a nivel 50. Al acabar podéis pedir la revancha y añadiros como amigos: verás cuándo están en Online y podrás retarlos. El ranking mundial va por temporadas de un mes (los puntos vuelven a 1000 cada mes) y quien cierra el juego a mitad de combate pierde igualmente."],
    ["poke-radar", "Encuentros misteriosos", "Cada día pasan cosas raras en algunas rutas: un cofre misterioso, un vendedor de Pokémon, una terminal de intercambio, un sueño extraño… Las noticias de los pueblos dicen dónde."],
    [ICONO_LOGROS, "Logros y misiones", "En «Logros» tienes tres misiones nuevas cada día, los logros de toda la partida (con premio) y el historial con tus estadísticas y el Salón de la Fama."],
    ["shiny-charm", "Pokédex", "La ficha de cada Pokémon dice dónde encontrarlo en tu partida: en qué rutas (y si solo de noche), dónde se pesca, si está en la Zona Safari esta semana…"],
    ["exp-share", "Consejos", "El juego es difícil en todas las dificultades: entrena, lleva objetos equipados y aprovecha los tipos. Tras una derrota vuelves al último Centro Pokémon y pierdes algo de dinero. En Opciones puedes acelerar los combates y quitar las cinemáticas."],
];
// Lo nuevo de cada actualización (la primera, la más reciente).
const NOVEDADES = [
    { version: "2026-10-17b", titulo: "Dobles online, revancha y amigos", lista: [
        ["vs-seeker", "Combates dobles online."],
        ["vs-recorder", "Revancha al acabar y amigos a los que retar."],
        ["exp-share", "Temporadas mensuales en el ranking mundial."],
        ["poke-ball", "Nuevos movimientos: Explosión, Autodestrucción, Sacrificio, Mismo Destino y Canto Mortal."],
        ["muscle-band", "Movimientos de apoyo en los combates dobles: Refuerzo, Señuelo, Cede Paso…"],
        ["town-map", "Pasa tu partida a otro móvil u ordenador con un código."],
    ] },
    { version: "2026-10-17", titulo: "Instálalo como aplicación", lista: [
        ["poke-ball", "Instala el juego en tu móvil desde Opciones → Pantalla."],
        ["vs-seeker", "Invita a un amigo a tu sala con un enlace."],
        ["vs-recorder", "Quien abandona un combate online, lo pierde."],
        ["town-map", "Copias de seguridad de tu partida."],
    ] },
    { version: "2026-10-14", titulo: "Beta abierta", lista: [
        ["vs-seeker", "Combates online: «Buscar rival» y salas con código."],
        ["vs-recorder", "Ranking mundial."],
        ["grass-mail", "Cuéntanos qué falla desde Opciones → Informar de un error."],
    ] },
    { version: "2026-10-13", titulo: "Todos los movimientos y animaciones modernas", lista: [
        ["tm-normal", "Unos 100 movimientos más con su efecto: Rompecoraza, Maldición, Relevo, Truco, Metrónomo, Mimético, Esquema, Aguante, Gravedad, Empapar, Tormento, Fisura, Lanzamiento... Los Pokémon ya los aprenden."],
        ["expert-belt", "Animaciones modernas: el atacante arremete o carga energía de su tipo, la cámara se acerca al objetivo y cada golpe estalla con el color de su tipo (se quitan en Opciones)."],
        [prURL("images/items/mega_bracelet.png"), "En combate, los datos de un Pokémon megaevolucionado son los de su mega: su imagen, sus tipos, su habilidad y sus estadísticas."],
        ["poke-ball", "Portada nueva: el Pokémon del día, tu siguiente objetivo, las últimas novedades y todo lo que hay en el juego."],
    ] },
    { version: "2026-10-11e", titulo: "Megas animadas y retoques", lista: [
        ["dragoninite", "Las 45 megas de Leyendas Z-A y Megadimensión, ahora con sprites 2D animados de frente, de espalda y variocolor."],
        ["vs-seeker", "Combates dobles: el entrenador rival se presenta antes de sacar a sus Pokémon, y en el móvil las fichas ya no tapan a nadie."],
        ["exp-share", "En el móvil, la ficha de cada Pokémon muestra sus cuatro pestañas (Recordar ya se puede usar) y la cría que sale del huevo se ve más grande."],
    ] },
    { version: "2026-10-11d", titulo: "¡Combates dobles!", lista: [
        ["vs-seeker", "Combates dobles: dos contra dos, con movimientos que alcanzan a ambos rivales (o a todos), Protección, cambios, Megaevolución y Teracristal. Las Gemelas, las Parejas y las Hermanas Misteriosas de las rutas combaten así, y el Combate rápido tiene formato doble."],
        ["cherish-ball", "Regalo Misterioso (Opciones → Partida): todos los Pokémon que megaevolucionan y todas sus megapiedras, también las X, Y y Z."],
        [prURL("images/items/tera_orb.png"), "Detalles de los poderes: la joya del teratipo flota sobre el Pokémon teracristalizado, brasas rojas salen del gigante dinamaxizado y la ficha de una mega lleva su símbolo."],
    ] },
    { version: "2026-10-11c", titulo: "Guardería y Mega-Rayquaza", lista: [
        ["lucky-egg", "Guardería Pokémon en Villa Lúmina: tus Pokémon suben de nivel con el tiempo y, si se llevan bien, aparecen huevos que eclosionan tras unos combates."],
        ["oval-charm", "Logros nuevos de la Guardería, con el Amuleto Oval (huevos el doble de rápido) y el Amuleto Iris de premio."],
        [prURL("images/items/mega_bracelet.png"), "Mega-Rayquaza: en el Pilar Celeste, la guardiana dracónida enseña Ascenso Draco a tu Rayquaza. Con él megaevoluciona sin megapiedra."],
    ] },
    { version: "2026-10-11b", titulo: "¡Aurelia crece!", lista: [
        ["dragoninite", "45 megaevoluciones nuevas de Leyendas Pokémon Z-A y Megadimensión: Mega-Dragonite, Mega-Greninja, Mega-Starmie, Mega-Garchomp Z, Mega-Zygarde..."],
        [urlEntrenadorFoto("clemont"), "Torre Prisma (junto a Ciudad Voltia, con 6 medallas): Lem estudia las megapiedras nuevas, te regala una, las vende y te reta."],
        ["rainbow-wing", "Siete zonas nuevas con legendarios: Bosque Eterno (Celebi), Islas Remolino (Lugia), Torre Campana (Ho-Oh), Fragua Magma (Heatran), Pilar Celeste (Rayquaza) e Isla Luna Nueva (Darkrai)."],
        [urlEntrenadorFoto("cynthia"), "Torneo Corona en el Estadio Corona: tras ser Campeón, tres combates contra 13 Campeones de todas las regiones (Rojo, Cintia, Lionel, Dianta...)."],
        ["grass-mail", "Un vecino nuevo en cada pueblo con un encargo, y 33 clases de entrenador nuevas por las rutas."],
    ] },
    { version: "2026-10-11", titulo: "Ataques con más fuerza", lista: [
        [prURL("images/items/dynamax_band.png"), "Maximovimientos: el Pokémon gigante ruge y absorbe la energía roja, la escena se oscurece y el golpe estalla con anillos de energía. Cada Gigamovimiento tiene ya su propia animación."],
        ["https://raw.githubusercontent.com/msikma/pokesprite/master/icons/key-item/z-ring.png", "Los movimientos Z también estallan en el objetivo con la energía de su tipo."],
        ["muscle-band", "Los ataques de varios golpes muestran su animación en cada golpe, y los golpes fuertes echan hacia atrás al Pokémon que los recibe."],
    ] },
    { version: "2026-10-10b", titulo: "Poderes con más espectáculo", lista: [
        [prURL("images/items/dynamax_band.png"), "Dinamax y Gigamax: la energía roja converge en el Pokémon, la Poké Ball estalla en anillos de energía y el cielo se tiñe de rojo mientras dura."],
        [prURL("images/items/tera_orb.png"), "Teracristal: el cristal cubre al Pokémon de abajo arriba, se rompe en esquirlas de su color y la joya de su teratipo brilla sobre él."],
    ] },
    { version: "2026-10-10", titulo: "¡Bienvenido a Pokémon Furia Carmesí!", lista: [
        ["red-shard", "Pokémon Furiosos: salvajes con aura carmesí, más fuertes y con premio."],
        ["damp-rock", "Tiempo atmosférico en cada ruta, que se lleva a los combates."],
        ["good-rod", "Pesca con Caña Vieja, Buena y Supercaña."],
        ["safari-ball", "Zona Safari junto a Ciudad Hojarasca."],
        ["vs-recorder", "Metro Batalla en Ciudad Voltia, con Ingo y el Canje de PB (mentas, cápsulas…)."],
        ["poke-radar", "Diez encuentros misteriosos que cambian cada día."],
        [ICONO_LOGROS, "Logros, misiones diarias, historial y Salón de la Fama."],
        ["medal-box", "Revanchas de los líderes cuando eres Campeón."],
        ["shiny-charm", "Pokédex con dónde encontrar cada Pokémon y Caja con buscador."],
        ["exp-share", "Carga mucho más rápida a partir de la segunda vez."],
    ] },
];
const iconoGuia = (k) => (/^https?:/.test(k) ? k : urlObj(k));
// Un personaje en la guía: su sprite de entrenador de Showdown (una imagen suelta, no un atlas animado).
function urlEntrenadorFoto(k) { return `${SD_BASE}sprites/trainers/${k}.png`; }
function ventanaAyuda(titulo, cuerpo) {
    const capa = document.createElement("div");
    capa.className = "capa-resumen";
    capa.innerHTML = `<div class="resumen guia"><h3>${titulo}</h3><div class="guia-cuerpo">${cuerpo}</div>
        <div class="res-acciones"><button class="btn-grande" data-ok>Entendido</button></div></div>`;
    document.body.appendChild(capa); document.body.style.overflow = "hidden";
    const cerrar = () => { capa.remove(); document.removeEventListener("keydown", tecla); if (!document.querySelector(".capa-resumen, .capa-pe, .capa-opciones")) document.body.style.overflow = ""; };
    const tecla = (e) => { if (e.key === "Escape") cerrar(); };
    document.addEventListener("keydown", tecla);
    capa.querySelector("[data-ok]").onclick = cerrar;
    capa.addEventListener("click", (e) => { if (e.target === capa) cerrar(); });
    AudioFX.ui("menu_open");
}
// Qué datos guarda el juego y dónde (desde Opciones → Ayuda y el pie de la portada).
function abrirPrivacidad() {
    const tema = (ic, t, txt) => `<section class="guia-tema"><img src="${iconoGuia(ic)}" alt=""><div><b>${t}</b><p>${txt}</p></div></section>`;
    ventanaAyuda("Privacidad", [
        tema("town-map", "Tu partida", "Se guarda solo en este dispositivo."),
        tema("vs-seeker", "Si juegas online", "Se guardan tu nombre de entrenador y tus resultados para el ranking mundial."),
        tema("grass-mail", "Si envías un informe", "Lo lee el creador del juego para arreglar el fallo."),
        tema("poke-ball", "Sin anuncios", "No hay publicidad ni seguimiento. Las imágenes y los sonidos se cargan de webs de la comunidad Pokémon."),
        tema("escape-rope", "Borrar tus datos", "Para quitarte del ranking mundial, pídelo en un informe."),
    ].join(""));
}
function abrirGuia() {
    ventanaAyuda("Guía del juego", GUIA.map(([ic, t, txt]) => `<section class="guia-tema"><img src="${iconoGuia(ic)}" alt=""><div><b>${t}</b><p>${txt}</p></div></section>`).join(""));
}
// Las de las versiones que aún no ha visto (desde Opciones, las de la última).
function abrirNovedades(entradas = [NOVEDADES[0]]) {
    const lista = entradas.flatMap((n) => n.lista);
    ventanaAyuda(entradas.length === 1 ? entradas[0].titulo : "Novedades", `<p class="nota">Novedades de esta versión:</p>`
        + lista.map(([ic, txt]) => `<section class="guia-tema corta"><img src="${iconoGuia(ic)}" alt=""><p>${txt}</p></section>`).join("")
        + `<p class="nota">Todo está explicado en Opciones → Guía del juego.</p>`);
}
// Al abrir el juego: las novedades, una vez por versión y solo a quien ya tenía partida (a quien empieza no le hace falta).
function novedadesAlEmpezar() {
    let vistas = null; try { vistas = localStorage.getItem("novedades_vistas"); } catch (_) {}
    const ultima = NOVEDADES[0].version;
    if (vistas === ultima) return;
    try { localStorage.setItem("novedades_vistas", ultima); } catch (_) {}
    const tenia = RANURAS.some((n) => { const d = leerRanura(n); return d && d.starter; });
    const i = NOVEDADES.findIndex((n) => n.version === vistas), nuevas = NOVEDADES.slice(0, i < 0 ? NOVEDADES.length : i);
    if (tenia && nuevas.length) setTimeout(() => abrirNovedades(nuevas.slice(0, 1)), 900);   // (solo la última: lo demás, en Opciones)
}
