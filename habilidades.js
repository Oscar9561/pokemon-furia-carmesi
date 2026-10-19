/* =========================================================
   HABILIDADES Y NATURALEZAS
   Cada Pokémon tiene una naturaleza (+10 % a una característica y
   −10 % a otra) y una habilidad de las de su especie (a veces, la
   oculta), y las dos actúan en combate como en los juegos.
   Nombres y descripciones oficiales en español (PokéAPI; los de la
   9.ª gen. que faltan, de la traducción de PokéRogue).
   ========================================================= */

// ===================== NATURALEZAS =====================
// [nombre, característica que sube, característica que baja] (en el orden de la tabla de los juegos).
const NATURALEZAS = {
    hardy: ["Fuerte", null, null], lonely: ["Huraña", "atk", "def"], brave: ["Audaz", "atk", "vel"], adamant: ["Firme", "atk", "spa"],
    naughty: ["Pícara", "atk", "spd"], bold: ["Osada", "def", "atk"], docile: ["Dócil", null, null], relaxed: ["Plácida", "def", "vel"],
    impish: ["Agitada", "def", "spa"], lax: ["Floja", "def", "spd"], timid: ["Miedosa", "vel", "atk"], hasty: ["Activa", "vel", "def"],
    serious: ["Seria", null, null], jolly: ["Alegre", "vel", "spa"], naive: ["Ingenua", "vel", "spd"], modest: ["Modesta", "spa", "atk"],
    mild: ["Afable", "spa", "def"], quiet: ["Mansa", "spa", "vel"], bashful: ["Tímida", null, null], rash: ["Alocada", "spa", "spd"],
    calm: ["Serena", "spd", "atk"], gentle: ["Amable", "spd", "def"], sassy: ["Grosera", "spd", "vel"], careful: ["Cauta", "spd", "spa"],
    quirky: ["Rara", null, null],
};
const naturalezaAleatoria = () => alAzar(Object.keys(NATURALEZAS));
const nombreNaturaleza = (n) => (NATURALEZAS[n] || ["—"])[0];
function multNaturaleza(n, stat) {
    const x = NATURALEZAS[n];
    return !x ? 1 : x[1] === stat ? 1.1 : x[2] === stat ? 0.9 : 1;
}
const STAT_CORTO = { atk: "Ataque", def: "Defensa", spa: "At. Esp.", spd: "Def. Esp.", vel: "Velocidad" };
// «Firme (+Ataque, −At. Esp.)» o «Fuerte (neutra)».
function textoNaturaleza(n) {
    const x = NATURALEZAS[n]; if (!x) return "—";
    return x[1] ? `${x[0]} (+${STAT_CORTO[x[1]]}, −${STAT_CORTO[x[2]]})` : `${x[0]} (neutra)`;
}

// ===================== HABILIDADES =====================
// clave de PokéAPI → [nombre, descripción]
const HABILIDADES = {
    "adaptability": ["Adaptable", "Potencia aún más los movimientos cuyo tipo coincida con el suyo."],
    "aerilate": ["Piel Celeste", "Convierte los movimientos de tipo Normal en tipo Volador y aumenta ligeramente su potencia."],
    "aftermath": ["Detonación", "Daña al agresor que le ha dado el golpe de gracia con un movimiento de contacto."],
    "air-lock": ["Bucle Aire", "Neutraliza todos los efectos del tiempo atmosférico."],
    "analytic": ["Cálculo Final", "Aumenta la potencia de su movimiento si es el último en atacar."],
    "anger-point": ["Irascible", "Si recibe un golpe crítico, monta en cólera y sube su Ataque hasta el máximo."],
    "anger-shell": ["Coraza Ira", "Cuando un ataque reduce sus PS a la mitad, un arrebato de cólera reduce su defensa y su defensa especial, pero aumenta su ataque, su ataque especial y su velocidad."],
    "anticipation": ["Anticipación", "Prevé los movimientos peligrosos del rival."],
    "arena-trap": ["Trampa Arena", "Evita que el rival huya."],
    "armor-tail": ["Cola Armadura", "La extraña cola que le envuelve la cabeza impide al rival usar movimientos con prioridad contra él y sus aliados."],
    "aroma-veil": ["Velo Aroma", "Se protege a sí mismo y a sus aliados de ataques que impiden elegir movimientos."],
    "as-one-glastrier": ["Unidad Ecuestre", "El Pokémon tiene dos habilidades: Relincho Blanco de Glastrier y Nerviosismo de Calyrex."],
    "as-one-spectrier": ["Unidad Ecuestre", "El Pokémon tiene dos habilidades: Relincho Negro de Spectrier y Nerviosismo de Calyrex."],
    "aura-break": ["Rompeaura", "Invierte los efectos de las auras, por lo que baja la potencia de ciertos movimientos en vez de subirla."],
    "aura-guard": ["Aura Protectora", "Reduce a la mitad el daño que el Pokémon recibe de movimientos de contacto."],
    "bad-dreams": ["Mal Sueño", "Inflige daño a cualquier rival que esté dormido."],
    "ball-fetch": ["Recogebolas", "Si no lleva equipado ningún objeto, recupera la Poké Ball del primer intento de captura fallido."],
    "battery": ["Batería", "Potencia los ataques especiales de los aliados."],
    "battle-armor": ["Armadura Batalla", "La robusta coraza que lo protege bloquea los golpes críticos."],
    "battle-bond": ["Fuerte Afecto", "Al derrotar a un rival, los vínculos con su Entrenador se refuerzan y se convierte en Greninja Ash. Su Shuriken de Agua también se ve potenciado."],
    "beads-of-ruin": ["Abalorio Debacle", "Reduce un 25% la defensa especial de todos los demás Pokémon con el poder de sus abalorios malditos."],
    "beast-boost": ["Ultraimpulso", "Si derrota a un rival en ese turno, aumenta su característica más fuerte."],
    "berserk": ["Cólera", "Aumenta su Ataque Especial si sus PS se ven reducidos a la mitad debido a algún ataque."],
    "big-pecks": ["Sacapecho", "Impide que el rival le baje la Defensa."],
    "blaze": ["Mar Llamas", "Potencia sus movimientos de tipo Fuego cuando le quedan pocos PS."],
    "bulletproof": ["Antibalas", "No le afectan las bombas ni algunos proyectiles."],
    "cheek-pouch": ["Carrillo", "Recupera PS al comer cualquier baya."],
    "chilling-neigh": ["Relincho Blanco", "Al derrotar a un objetivo, emite un relincho gélido y aumenta su Ataque."],
    "chlorophyll": ["Clorofila", "Sube su Velocidad cuando hace sol."],
    "clear-body": ["Cuerpo Puro", "Evita que bajen sus características a causa de movimientos o habilidades de otros Pokémon."],
    "cloud-nine": ["Aclimatación", "Anula todos los efectos del tiempo atmosférico."],
    "color-change": ["Cambio Color", "Adopta el tipo del último movimiento del que es blanco."],
    "comatose": ["Letargo Perenne", "No despierta jamás de su profundo letargo e incluso ataca dormido."],
    "commander": ["Comandar", "Si al entrar en combate coincide con un Dondozo aliado, se cuela en el interior de su boca para tomar el control. Si está en combate, aumenta la probabilidad de que los siguientes combates sean combates dobles."],
    "competitive": ["Tenacidad", "Aumenta mucho su Ataque Especial cuando el rival le baja cualquiera de sus características."],
    "compound-eyes": ["Ojo Compuesto", "Aumenta la precisión de sus movimientos."],
    "contrary": ["Respondón", "Invierte los cambios en las características: bajan cuando les toca subir y suben cuando les toca bajar."],
    "corrosion": ["Corrosión", "Puede envenenar incluso a rivales de tipo Acero o Veneno."],
    "costar": ["Unísono", "Al entrar en combate, copia los cambios en las características de su aliado."],
    "cotton-down": ["Pelusa", "Al ser alcanzado por un ataque, suelta una pelusa de algodón que reduce la Velocidad de todos los demás Pokémon."],
    "cud-chew": ["Rumia", "Cuando ingiere una baya, la regurgita al final del siguiente turno y se la come por segunda vez."],
    "curious-medicine": ["Medicina Extraña", "Al entrar en combate, rezuma una substancia medicinal por la caracola que revierte los cambios en las características de los aliados."],
    "cursed-body": ["Cuerpo Maldito", "Puede anular el movimiento usado en su contra."],
    "cute-charm": ["Gran Encanto", "Puede causar enamoramiento al rival que lo toque."],
    "damp": ["Humedad", "Aumenta la humedad del entorno y evita que se puedan utilizar movimientos explosivos, tales como Autodestrucción."],
    "dancer": ["Pareja de Baile", "Puede copiar inmediatamente cualquier movimiento de baile que haya usado otro Pokémon presente en el combate."],
    "dark-aura": ["Aura Oscura", "Aumenta la potencia de todos los movimientos de tipo Siniestro."],
    "dauntless-shield": ["Escudo Recio", "Aumenta su Defensa al entrar en combate."],
    "dazzling": ["Cuerpo Vívido", "Desconcierta al rival y le impide utilizar movimientos con prioridad en su contra."],
    "defeatist": ["Flaqueza", "Se debilita tanto cuando sus PS se ven reducidos a la mitad que su Ataque y su Ataque Especial bajan."],
    "defiant": ["Competitivo", "Sube mucho su Ataque cuando el rival le baja las características."],
    "delta-stream": ["Ráfaga Delta", "Altera el clima para anular las vulnerabilidades del tipo Volador."],
    "desolate-land": ["Tierra del Ocaso", "Altera el clima para anular los ataques de tipo Agua."],
    "disguise": ["Disfraz", "Puede eludir un ataque valiéndose de la tela que le cubre el cuerpo una vez por combate."],
    "download": ["Descarga", "Compara la Defensa y la Defensa Especial del rival para ver cuál es inferior y aumenta su propio Ataque o Ataque Especial según sea lo más eficaz."],
    "dragonize": ["Piel Dragontina", "Convierte los movimientos de tipo Normal del Pokémon en movimientos de tipo Dragón y aumenta un 20 % su potencia."],
    "dragons-maw": ["Mandíbula Dragón", "Potencia los movimientos de tipo Dragón."],
    "drizzle": ["Llovizna", "Hace que llueva al entrar en combate."],
    "drought": ["Sequía", "Cuando entra en combate, el tiempo pasa a ser soleado."],
    "dry-skin": ["Piel Seca", "Pierde PS si hace sol y los recupera si llueve o recibe un movimiento de tipo Agua. Los movimientos de tipo Fuego, por su parte, le hacen más daño de lo normal."],
    "early-bird": ["Madrugar", "Si se duerme, tardará la mitad de tiempo en despertarse."],
    "earth-eater": ["Geofagia", "Si lo alcanza un movimiento de tipo Tierra, recupera ¼ de sus PS máximos en vez de sufrir daño."],
    "eelevate": ["Impulso Anguila", "Hace que el Pokémon flote y deje de estar en contacto con el suelo, lo que impide que le afecten los movimientos de tipo Tierra y las Púas, Púas tóxicas y Red Viscosa. Aumenta 1 nivel la característica más alta del Pokémon cuando debilita a un objetivo con un ataque."],
    "effect-spore": ["Efecto Espora", "Puede dormir, envenenar o paralizar al Pokémon con el que entre en contacto al recibir un ataque."],
    "electric-surge": ["Electrogénesis", "Crea un campo eléctrico al entrar en combate."],
    "electromorphosis": ["Dinamo", "Su cuerpo se carga de electricidad al recibir daño, lo que potencia su siguiente movimiento de tipo Eléctrico."],
    "embody-aspect": ["Evocarrecuerdos", "Al evocar recuerdos del pasado, la máscara que lleva brilla y aumenta una de sus características."],
    "emergency-exit": ["Retirada", "Abandona el terreno de combate cuando sus PS se ven reducidos a la mitad para evitar males mayores."],
    "fairy-aura": ["Aura Feérica", "Aumenta la potencia de todos los movimientos de tipo Hada."],
    "filter": ["Filtro", "Mitiga el daño que le infligen los movimientos supereficaces."],
    "fire-mane": ["Crin de Fuego", "Aumenta un 50 % la potencia de los movimientos de tipo Fuego del Pokémon."],
    "flame-body": ["Cuerpo Llama", "Puede quemar al mínimo contacto."],
    "flare-boost": ["Ímpetu Ardiente", "Aumenta la potencia de sus ataques especiales cuando sufre quemaduras."],
    "flash-fire": ["Absorbe Fuego", "Si le alcanza algún movimiento de tipo Fuego, potencia sus propios movimientos de dicho tipo."],
    "flower-gift": ["Don Floral", "Si hace sol, aumenta su Ataque y su Defensa Especial, así como los de sus aliados."],
    "flower-veil": ["Velo Flor", "Evita que los Pokémon de tipo Planta aliados sufran problemas de estado o que les bajen sus características."],
    "fluffy": ["Peluche", "Reduce a la mitad el daño provocado por los movimientos de contacto, pero duplica el infligido por los de tipo Fuego."],
    "forecast": ["Predicción", "Cambia a tipo Agua, Fuego o Hielo en función del tiempo atmosférico."],
    "forewarn": ["Alerta", "Indica el movimiento más potente del rival al entrar en combate."],
    "friend-guard": ["Compiescolta", "Reduce el daño que sufren los aliados."],
    "frisk": ["Cacheo", "Puede ver el objeto que lleva el rival al entrar en combate."],
    "full-metal-body": ["Guardia Metálica", "Evita que bajen sus características a causa de movimientos o habilidades de otros Pokémon."],
    "fur-coat": ["Pelaje Recio", "Reduce a la mitad el daño que recibe de ataques físicos del rival."],
    "gale-wings": ["Alas Vendaval", "Da prioridad a los movimientos de tipo Volador si sus PS están al máximo."],
    "galvanize": ["Piel Eléctrica", "Convierte los movimientos de tipo Normal en tipo Eléctrico y aumenta ligeramente su potencia."],
    "gluttony": ["Gula", "Cuando sus PS se ven reducidos a la mitad, engulle la baya que normalmente solo se comería cuando le quedasen pocos PS."],
    "good-as-gold": ["Cuerpo Áureo", "Su robusto cuerpo de oro inoxidable lo hace inmune frente a movimientos de estado de otros Pokémon."],
    "gooey": ["Baba", "Baja la Velocidad del rival cuando este le ataca con un movimiento de contacto."],
    "gorilla-tactics": ["Monotema", "Potencia su Ataque, pero solo puede usar el primer movimiento escogido."],
    "grass-pelt": ["Manto Frondoso", "Aumenta su Defensa si hay un campo de hierba en el terreno de combate."],
    "grassy-surge": ["Herbogénesis", "Crea un campo de hierba al entrar en combate."],
    "grim-neigh": ["Relincho Negro", "Al derrotar a un objetivo, emite un relincho aterrador y aumenta su Ataque Especial."],
    "guard-dog": ["Perro Guardián", "Aumenta su ataque si sufre los efectos de Intimidación. También anula movimientos y objetos que fuercen el cambio de Pokémon."],
    "gulp-missile": ["Tragamisil", "Tras usar Surf o Buceo, emerge con una presa en la boca. Al recibir daño, ataca escupiéndola al rival."],
    "guts": ["Agallas", "Si sufre un problema de estado, se viene arriba y aumenta su Ataque."],
    "hadron-engine": ["Motor Hadrónico", "Crea un campo eléctrico durante 5 turnos al entrar en combate. Aumenta un 30 % la potencia de los movimientos de tipo Eléctrico de los Pokémon que están en contacto con el suelo e impide que se queden dormidos. Mientras haya un campo eléctrico, su Ataque Especial aumenta un 33% gracias a su motor futurista."],
    "harvest": ["Cosecha", "Puede reutilizar varias veces una misma baya."],
    "healer": ["Alma Cura", "A veces cura los problemas de estado de un aliado."],
    "heatproof": ["Ignífugo", "Su cuerpo, resistente al calor, reduce a la mitad el daño recibido por movimientos de tipo Fuego."],
    "heavy-metal": ["Metal Pesado", "Duplica su peso."],
    "honey-gather": ["Recogemiel", "Puede que encuentre Miel una vez concluido el combate."],
    "hospitality": ["Hospitalidad", "Al entrar en combate, restaura ¼ PS de los PS máximos de su aliado como muestra de hospitalidad."],
    "huge-power": ["Potencia", "Duplica la potencia de sus ataques físicos."],
    "hunger-switch": ["Mutapetito", "Alterna entre su Forma Saciada y Forma Voraz al final de cada turno."],
    "hustle": ["Entusiasmo", "Aumenta su Ataque, pero reduce su Precisión."],
    "hydration": ["Hidratación", "Cura los problemas de estado si está lloviendo."],
    "hyper-cutter": ["Corte Fuerte", "Evita que el rival le baje el Ataque."],
    "ice-body": ["Gélido", "Recupera PS de forma gradual cuando hay tormentas de granizo."],
    "ice-face": ["Cara de Hielo", "Absorbe el daño de un ataque físico con el hielo de la cabeza, tras lo cual cambia de forma. El hielo se regenerará la próxima vez que granice."],
    "ice-scales": ["Escama de Hielo", "Las gélidas escamas que protegen su cuerpo reducen a la mitad el daño que le infligen los ataques especiales."],
    "illuminate": ["Iluminación", "Aumenta la probabilidad de encontrar Pokémon al iluminar el entorno."],
    "illusion": ["Ilusión", "Adopta el aspecto del último Pokémon del equipo al entrar en combate para desconcertar al rival."],
    "immunity": ["Inmunidad", "Su sistema inmunitario evita el envenenamiento."],
    "imposter": ["Impostor", "Se transforma en el Pokémon que tiene enfrente."],
    "infiltrator": ["Allanamiento", "Ataca sorteando la barrera o el sustituto del rival."],
    "innards-out": ["Revés", "Al caer debilitado, inflige al rival un daño equivalente a los PS que le quedaran."],
    "inner-focus": ["Fuerza Mental", "Gracias a su profunda concentración, no se amedrenta ante los ataques del rival."],
    "insomnia": ["Insomnio", "Su resistencia al sueño le impide quedarse dormido."],
    "intimidate": ["Intimidación", "Al entrar en combate amilana al rival de tal manera que su Ataque disminuye."],
    "intrepid-sword": ["Espada Indómita", "Aumenta su Ataque al entrar en combate."],
    "iron-barbs": ["Punta Acero", "Inflige daño al rival si este le golpea con un movimiento de contacto."],
    "iron-fist": ["Puño Férreo", "Aumenta la potencia de los puñetazos."],
    "justified": ["Justiciero", "Si le alcanza un movimiento de tipo Siniestro, aumenta el Ataque debido a su integridad."],
    "keen-eye": ["Vista Lince", "Su aguda vista evita que le disminuya la Precisión."],
    "klutz": ["Zoquete", "No puede usar objetos equipados."],
    "leaf-guard": ["Defensa Hoja", "Evita los problemas de estado si hace sol."],
    "levitate": ["Levitación", "Su capacidad de flotar sobre el suelo le proporciona inmunidad frente a los movimientos de tipo Tierra."],
    "libero": ["Líbero", "Cambia su tipo al del movimiento que va a usar."],
    "light-metal": ["Metal Liviano", "Reduce a la mitad su peso."],
    "lightning-rod": ["Pararrayos", "Atrae y neutraliza los movimientos de tipo Eléctrico, que además le suben el Ataque Especial."],
    "limber": ["Flexibilidad", "Evita ser paralizado gracias a la flexibilidad de su cuerpo."],
    "lingering-aroma": ["Olor Persistente", "Contagia la habilidad Olor Persistente al Pokémon que lo ataque con un movimiento de contacto."],
    "liquid-ooze": ["Lodo Líquido", "Exuda una sustancia tóxica de intenso hedor que hiere a quienes intentan drenarle PS."],
    "liquid-voice": ["Voz Fluida", "Hace que todos sus movimientos que usan sonido pasen a ser de tipo Agua."],
    "long-reach": ["Remoto", "Puede usar cualquier movimiento sin entrar en contacto con el rival."],
    "magic-bounce": ["Espejo Mágico", "Puede devolver los movimientos de estado lanzados por el rival, sin verse afectado por ellos."],
    "magic-guard": ["Muro Mágico", "Solo recibe daño de ataques."],
    "magician": ["Prestidigitador", "Roba el objeto del Pokémon al que alcance con un movimiento."],
    "magma-armor": ["Escudo Magma", "Gracias al magma candente que lo envuelve, no puede ser congelado."],
    "magnet-pull": ["Imán", "Su magnetismo atrae a los Pokémon de tipo Acero y les impide huir."],
    "marvel-scale": ["Escama Especial", "Sube su Defensa si sufre un problema de estado."],
    "mega-launcher": ["Megadisparador", "Aumenta la potencia de algunos movimientos de pulsos y auras."],
    "mega-sol": ["Megasolar", "El Pokémon puede usar movimientos con los mismos resultados que si hiciese sol, aunque realmente ese no sea el tiempo atmosférico actual."],
    "merciless": ["Ensañamiento", "Hace que sus movimientos asesten siempre un golpe crítico si el rival está envenenado."],
    "mimicry": ["Mimetismo", "Cambia su tipo según el campo que haya en el terreno de combate."],
    "minds-eye": ["Ojo Mental", "Alcanza a Pokémon de tipo Fantasma con movimientos de tipo Normal o Lucha. Su precisión no se puede reducir e ignora los cambios en la evasión del objetivo."],
    "minus": ["Menos", "Potencia su Ataque Especial si un Pokémon aliado tiene la habilidad Más o Menos."],
    "mirror-armor": ["Coraza Reflejo", "Refleja los efectos que reducen las características."],
    "misty-surge": ["Nebulogénesis", "Crea un campo de niebla al entrar en combate."],
    "mold-breaker": ["Rompemoldes", "Las habilidades del objetivo no afectan a los movimientos que emplea."],
    "moody": ["Veleta", "Una característica le sube mucho en cada turno, pero le baja otra."],
    "motor-drive": ["Electromotor", "Si le alcanza un movimiento de tipo Eléctrico, le sube la Velocidad en vez de sufrir daño."],
    "moxie": ["Autoestima", "Al debilitar a un objetivo, su confianza se refuerza de tal manera que aumenta su Ataque."],
    "multiscale": ["Multiescamas", "Reduce el daño que sufre si sus PS están al máximo."],
    "multitype": ["Multitipo", "Cambia su tipo al de la tabla o al del Cristal Z que lleve."],
    "mummy": ["Momia", "Contagia la habilidad Momia al rival que entre en contacto con él."],
    "mycelium-might": ["Poder Fúngico", "El Pokémon siempre actuará el último en su nivel de prioridad cuando usa movimientos de estado, pero estos no se ven afectados por la habilidad del objetivo."],
    "natural-cure": ["Cura Natural", "Cura sus problemas de estado al cambiarse con otro Pokémon."],
    "neuroforce": ["Fuerza Cerebral", "Potencia los ataques supereficaces."],
    "neutralizing-gas": ["Gas Reactivo", "Anula los efectos de las habilidades de los demás Pokémon presentes mientras esté en el terreno de combate."],
    "no-guard": ["Indefenso", "Al quedar ambos expuestos, tanto sus movimientos como los del rival acertarán siempre."],
    "normalize": ["Normalidad", "Hace que todos sus movimientos se vuelvan de tipo Normal y aumenten ligeramente su potencia."],
    "oblivious": ["Despiste", "Su indiferencia evita que sea provocado o caiga presa del enamoramiento."],
    "opportunist": ["Oportunista", "Copia las mejoras en las características del rival, aprovechándose de la situación."],
    "orichalcum-pulse": ["Latido Oricalco", "El tiempo pasa a ser soleado durante 5 turnos al entrar en combate. Aumenta un 50 % el daño que infligen los movimientos de tipo Fuego y reduce a la mitad el que infligen los de tipo Agua. Mientras haga mucho sol, su ataque aumenta un 33% gracias a su pulso primigenio."],
    "overcoat": ["Funda", "No le afectan las tormentas de arena, el granizo y los movimientos con polvos."],
    "overgrow": ["Espesura", "Potencia sus movimientos de tipo Planta cuando le quedan pocos PS."],
    "own-tempo": ["Ritmo Propio", "Como le gusta hacer las cosas a su manera, los rivales no logran confundirlo."],
    "parental-bond": ["Amor Filial", "Une fuerzas con su cría y ataca dos veces."],
    "pastel-veil": ["Velo Pastel", "Se protege a sí mismo y a sus aliados del envenenamiento."],
    "perish-body": ["Cuerpo Mortal", "Si le alcanza un movimiento de contacto, se debilitará al cabo de 3 turnos, así como su agresor, a menos que abandonen el terreno de combate."],
    "pickpocket": ["Hurto", "Si el rival usa un movimiento de contacto al atacar, le roba el objeto."],
    "pickup": ["Recogida", "Puede recoger objetos que el rival haya usado, o bien otros que encuentre en plena aventura."],
    "piercing-drill": ["Turbotaladro", "Cuando el Pokémon ataca con un movimiento de contacto, es capaz de alcanzar incluso a objetivos que se encuentran protegidos por algún efecto y les inflige ¼ del daño original. El resto de efectos no se ven afectados por esta habilidad y se activarán de forma habitual."],
    "pixilate": ["Piel Feérica", "Convierte los movimientos de tipo Normal en tipo Hada y aumenta ligeramente su potencia."],
    "plus": ["Más", "Potencia su Ataque Especial si un Pokémon aliado tiene la habilidad Más o Menos."],
    "poison-heal": ["Antídoto", "Si resulta envenenado, recupera PS en vez de perderlos."],
    "poison-point": ["Punto Tóxico", "Puede envenenar al mínimo contacto."],
    "poison-puppeteer": ["Títere Tóxico", "Los rivales que el usuario envenene con sus movimientos también sufrirán confusión."],
    "poison-touch": ["Toque Tóxico", "Puede envenenar al objetivo con solo tocarlo."],
    "power-construct": ["Agrupamiento", "Cuando sus PS se ven reducidos a la mitad, las células se reagrupan y adopta su Forma Completa."],
    "power-of-alchemy": ["Reacción Química", "Reacciona copiando la habilidad de un aliado debilitado."],
    "power-spot": ["Fuente Energía", "Potencia los movimientos de los Pokémon adyacentes."],
    "prankster": ["Bromista", "Sus movimientos de estado tienen prioridad alta."],
    "pressure": ["Presión", "Presiona al rival para que sus PP se acaben antes."],
    "primordial-sea": ["Mar del Albor", "Altera el clima para anular los ataques de tipo Fuego."],
    "prism-armor": ["Armadura Prisma", "Mitiga el daño que le infligen los movimientos supereficaces."],
    "propeller-tail": ["Hélice Caudal", "Impide que el rival pueda atraer ataques hacia sí mismo por efecto de su habilidad o sus movimientos."],
    "protean": ["Mutatipo", "Cambia su tipo al del movimiento que va a usar."],
    "protosynthesis": ["Paleosíntesis", "Si hace sol, aumenta un 30% su característica más alta, 50% si es su Velocidad."],
    "psychic-surge": ["Psicogénesis", "Crea un campo psíquico al entrar en combate."],
    "punk-rock": ["Punk Rock", "Potencia los movimientos que usan sonido y reduce a la mitad el daño que le infligen dichos movimientos."],
    "pure-power": ["Energía Pura", "Duplica la potencia de sus ataques físicos gracias al yoga."],
    "purifying-salt": ["Sal Purificadora", "Su sal pura lo protege de los problemas de estado y reduce a la mitad el daño que recibe de ataques de tipo Fantasma."],
    "quark-drive": ["Carga Cuark", "Si hace un campo eléctrico en el terreno de combate, aumenta un 30% su característica más alta, 50% si es su Velocidad."],
    "queenly-majesty": ["Regia Presencia", "Intimida al objetivo y le impide usar movimientos con prioridad."],
    "quick-draw": ["Mano Rápida", "A veces, puede atacar el primero."],
    "quick-feet": ["Pies Rápidos", "Aumenta la Velocidad si sufre problemas de estado."],
    "rain-dish": ["Cura Lluvia", "Recupera PS de forma gradual cuando llueve."],
    "rattled": ["Cobardía", "Si le alcanza un movimiento de tipo Siniestro, Bicho o Fantasma, el miedo hace que le suba la Velocidad."],
    "receiver": ["Receptor", "Adquiere la habilidad de un aliado debilitado."],
    "reckless": ["Audaz", "Potencia los movimientos que también dañan al usuario."],
    "refrigerate": ["Piel Helada", "Convierte los movimientos de tipo Normal en tipo Hielo y aumenta ligeramente su potencia."],
    "regenerator": ["Regeneración", "Recupera unos pocos PS al ser cambiado por otro Pokémon."],
    "ripen": ["Maduración", "Hace madurar las bayas, por lo que duplica sus efectos."],
    "rivalry": ["Rivalidad", "Si el objetivo es del mismo sexo, su competitividad le lleva a infligir más daño. Si es del sexo contrario, en cambio, el daño será menor."],
    "rks-system": ["Sistema Alfa", "Cambia su tipo según el disco que lleve instalado."],
    "rock-head": ["Cabeza Roca", "No puede dañarse con sus propios movimientos."],
    "rocky-payload": ["Transportarrocas", "Potencia un 50% los movimientos de tipo Roca."],
    "rough-skin": ["Piel Tosca", "Hiere con su piel áspera al rival que lo ataque con un movimiento de contacto."],
    "run-away": ["Fuga", "Puede escaparse de todos los Pokémon salvajes."],
    "sand-force": ["Poder Arena", "Potencia los movimientos de tipo Tierra, Acero y Roca durante las tormentas de arena."],
    "sand-rush": ["Ímpetu Arena", "Aumenta su Velocidad durante las tormentas de arena."],
    "sand-spit": ["Expulsarena", "Provoca una tormenta de arena al recibir un ataque."],
    "sand-stream": ["Chorro Arena", "Crea una tormenta de arena al entrar en combate."],
    "sand-veil": ["Velo Arena", "Aumenta su Evasión durante las tormentas de arena."],
    "sap-sipper": ["Herbívoro", "Neutraliza los movimientos de tipo Planta y sube su Ataque."],
    "schooling": ["Banco", "Forma bancos con sus congéneres cuando tiene muchos PS, lo cual le otorga más fuerza. Cuando le quedan pocos PS, el banco se dispersa."],
    "scrappy": ["Intrépido", "Puede alcanzar a Pokémon de tipo Fantasma con movimientos de tipo Normal o Lucha."],
    "screen-cleaner": ["Antibarrera", "Anula los efectos de Pantalla de Luz, Reflejo y Velo Aurora tanto de rivales como de aliados al entrar en combate."],
    "seed-sower": ["Disemillar", "Crea un campo de hierba durante 5 turnos al recibir un ataque. Aumenta un 30 % la potencia de los movimientos de tipo Planta de los Pokémon que están en contacto con el suelo y restaura ¹⁄₁₆ de sus PS máximos al final de cada turno."],
    "serene-grace": ["Dicha", "Aumenta la probabilidad de que los movimientos causen efectos secundarios."],
    "shadow-shield": ["Guardia Espectro", "Reduce el daño que sufre si sus PS están al máximo."],
    "shadow-tag": ["Sombra Trampa", "Impide que el enemigo huya o sea cambiado por otro."],
    "sharpness": ["Cortante", "Aumenta un 50% la potencia de los movimientos cortantes."],
    "shed-skin": ["Mudar", "Puede curar sus problemas de estado al mudar la piel."],
    "sheer-force": ["Potencia Bruta", "Sube la potencia de sus movimientos en detrimento de los efectos secundarios, que se ven anulados."],
    "shell-armor": ["Caparazón", "La robusta coraza que lo protege bloquea los golpes críticos."],
    "shield-dust": ["Polvo Escudo", "El polvo de escamas que lo envuelve lo protege de los efectos secundarios de los ataques recibidos."],
    "shields-down": ["Escudo Limitado", "Rompe su coraza cuando sus PS se ven reducidos a la mitad y adopta una forma ofensiva."],
    "simple": ["Simple", "Duplica los cambios en las características."],
    "skill-link": ["Encadenado", "Ejecuta siempre los movimientos múltiples con el número máximo de golpes."],
    "slow-start": ["Inicio Lento", "Baja a la mitad su Ataque y su Velocidad durante cinco turnos."],
    "slush-rush": ["Quitanieves", "Aumenta su Velocidad si está granizando."],
    "sniper": ["Francotirador", "Potencia los golpes críticos que asesta aún más de lo normal."],
    "snow-cloak": ["Manto Níveo", "Sube la Evasión cuando graniza."],
    "snow-warning": ["Nevada", "Invoca una tormenta de granizo al entrar en combate."],
    "solar-power": ["Poder Solar", "Si hace sol, aumenta su Ataque Especial, pero pierde PS en cada turno."],
    "solid-rock": ["Roca Sólida", "Mitiga el daño que le infligen los movimientos supereficaces."],
    "soul-heart": ["Coránima", "Aumenta su Ataque Especial cada vez que un Pokémon cae debilitado."],
    "soundproof": ["Insonorizar", "Su aislamiento acústico lo protege de movimientos que usan sonido."],
    "speed-boost": ["Impulso", "Aumenta su Velocidad en cada turno."],
    "spicy-spray": ["Salpicante", "Quema al atacante si recibe daño de un movimiento."],
    "stakeout": ["Vigilante", "Si el objetivo de su ataque es sustituido por otro, duplica el daño que infligirá."],
    "stall": ["Rezagado", "Ejecuta su movimiento tras todos los demás."],
    "stalwart": ["Acérrimo", "Impide que el rival pueda atraer ataques hacia sí mismo por efecto de su habilidad o sus movimientos."],
    "stamina": ["Firmeza", "Aumenta su Defensa al recibir un ataque."],
    "stance-change": ["Cambio Táctico", "Adopta la Forma Filo al lanzar un ataque, o bien la Forma Escudo si usa el movimiento Escudo Real."],
    "static": ["Electricidad Estática", "La electricidad estática que lo envuelve puede paralizar al mínimo contacto."],
    "steadfast": ["Impasible", "Cada vez que se amedrenta sube su Velocidad, debido a su voluntad inquebrantable."],
    "steam-engine": ["Combustible", "Si le alcanza un movimiento de tipo Fuego o Agua, le sube muchísimo la Velocidad."],
    "steelworker": ["Acero Templado", "Potencia los movimientos de tipo Acero."],
    "steely-spirit": ["Alma Acerada", "Potencia los movimientos de tipo Acero de los aliados."],
    "stench": ["Hedor", "Puede amedrentar al rival al atacarlo debido al mal olor que emana."],
    "sticky-hold": ["Viscosidad", "Los objetos se quedan pegados a su cuerpo, por lo que no pueden robárselos."],
    "storm-drain": ["Colector", "Atrae y neutraliza los movimientos de tipo Agua, que además le suben el Ataque Especial."],
    "strong-jaw": ["Mandíbula Fuerte", "Su robusta mandíbula le confiere una mordedura potente."],
    "sturdy": ["Robustez", "Evita que el rival pueda debilitarlo de un solo golpe cuando tiene los PS al máximo. También evita los movimientos fulminantes."],
    "suction-cups": ["Ventosas", "Sus ventosas se aferran al suelo, con lo cual anula movimientos y objetos que fuerzan el relevo."],
    "super-luck": ["Afortunado", "Su buena suerte aumenta la probabilidad de asestar golpes críticos."],
    "supersweet-syrup": ["Néctar Dulce", "Al entrar en combate , esparce un aroma dulzón a néctar que reduce la Evasión del rival."],
    "supreme-overlord": ["General Supremo", "Al entrar en combate, su ataque y su ataque especial aumentan un 10% por cada miembro del equipo que haya sido derrotado hasta el momento."],
    "surge-surfer": ["Cola Surf", "Duplica su Velocidad si hay un campo eléctrico en el terreno de combate."],
    "swarm": ["Enjambre", "Potencia sus movimientos de tipo Bicho cuando le quedan pocos PS."],
    "sweet-veil": ["Velo Dulce", "No cae dormido y evita también que sus aliados se duerman."],
    "swift-swim": ["Nado Rápido", "Sube su Velocidad cuando llueve."],
    "sword-of-ruin": ["Espada Debacle", "Reduce un 25% la Defensa de todos los demás Pokémon con el poder de su espada maldita."],
    "symbiosis": ["Simbiosis", "Pasa su objeto a un aliado que ya haya utilizado el suyo."],
    "synchronize": ["Sincronía", "Contagia el envenenamiento, las quemaduras o la parálisis al Pokémon que le cause ese estado."],
    "tablets-of-ruin": ["Tablilla Debacle", "Reduce un 25% el ataque de todos los demás Pokémon con el poder de sus tablillas malditas."],
    "tangled-feet": ["Tumbos", "Sube su Evasión si está confuso."],
    "tangling-hair": ["Rizos Rebeldes", "Baja la Velocidad del rival cuando este le ataca con un movimiento de contacto."],
    "technician": ["Experto", "Potencia sus movimientos más débiles."],
    "telepathy": ["Telepatía", "Elude los ataques de los aliados durante el combate."],
    "tera-shell": ["Teracaparazón", "Su caparazón encierra energía de todos los tipos. Gracias a ello, si sus PS están al máximo, el movimiento que lo alcance no será muy eficaz."],
    "tera-shift": ["Teracambio", "Al entrar en combate, adopta la Forma Teracristal tras absorber la energía de su alrededor."],
    "teraform-zero": ["Teraformación 0", "Anula todos los efectos del tiempo atmosférico y de los campos que haya en el terreno gracias a su poder oculto."],
    "teravolt": ["Terravoltaje", "Las habilidades del objetivo no afectan a los movimientos que emplea."],
    "thermal-exchange": ["Termoconversión", "Evita las quemaduras y, si lo alcanza un movimiento de tipo Fuego, aumenta su ataque."],
    "thick-fat": ["Sebo", "Gracias a la gruesa capa de grasa que lo protege, reduce a la mitad el daño que recibe de ataques de tipo Fuego o Hielo."],
    "tinted-lens": ["Cromolente", "Potencia los movimientos que no son muy eficaces, que infligen ahora un daño normal."],
    "torrent": ["Torrente", "Potencia sus movimientos de tipo Agua cuando le quedan pocos PS."],
    "tough-claws": ["Garra Dura", "Aumenta la potencia de los movimientos de contacto."],
    "toxic-boost": ["Ímpetu Tóxico", "Aumenta la potencia de sus ataques físicos cuando está envenenado."],
    "toxic-chain": ["Cadena Tóxica", "Gracias al poder de su cadena impregnada de toxinas, tiene un 30% de envenenar gravemente al Pokémon al que ataque."],
    "toxic-debris": ["Capa Tóxica", "Al recibir daño de un ataque físico, lanza una trampa de púas tóxicas a los pies del rival. Una capa de estas púas envenena a los Pokémon que entren en combate, mientras que dos capas lo envenenan gravemente. Los Pokémon de tipo Veneno absorben las púas y las eliminan del campo de batalla."],
    "trace": ["Calco", "Al entrar en combate copia la habilidad del rival."],
    "transistor": ["Transistor", "Potencia los movimientos de tipo Eléctrico."],
    "triage": ["Primer Auxilio", "Da prioridad a los movimientos que restauran PS."],
    "truant": ["Ausente", "Al ejecutar un movimiento, descansará en el turno siguiente."],
    "turboblaze": ["Turbollama", "Las habilidades del objetivo no afectan a los movimientos que emplea."],
    "unaware": ["Ignorante", "Pasa por alto las mejoras en las características del rival al atacar."],
    "unburden": ["Liviano", "Sube su Velocidad si usa o pierde el objeto que lleva."],
    "unnerve": ["Nerviosismo", "Pone nervioso al rival y le impide usar bayas."],
    "unseen-fist": ["Puño Invisible", "Si usa un movimiento de contacto, puede infligir daño al objetivo aunque este se proteja."],
    "vessel-of-ruin": ["Caldero Debacle", "Reduce un 25% el Ataque Especial de todos los demás Pokémon con el poder de su caldero maldito."],
    "victory-star": ["Tinovictoria", "Sube su Precisión y la de sus aliados."],
    "vital-spirit": ["Espíritu Vital", "Su determinación le impide quedarse dormido."],
    "volt-absorb": ["Absorbe Electricidad", "Si le alcanza un movimiento de tipo Eléctrico, recupera PS en vez de sufrir daño."],
    "wandering-spirit": ["Alma Errante", "Si le alcanza un movimiento de contacto, intercambia su habilidad con la del agresor."],
    "water-absorb": ["Absorbe Agua", "Si le alcanza un movimiento de tipo Agua, recupera PS en vez de sufrir daño."],
    "water-bubble": ["Pompa", "Reduce el daño que le provocan los movimientos de tipo Fuego y es inmune a las quemaduras."],
    "water-compaction": ["Hidrorrefuerzo", "Aumenta mucho su Defensa si le alcanza un movimiento de tipo Agua."],
    "water-veil": ["Velo Agua", "Evita las quemaduras gracias a la capa de agua que lo envuelve."],
    "weak-armor": ["Armadura Frágil", "Al recibir daño de un ataque físico, le baja la Defensa, pero le sube mucho la Velocidad."],
    "well-baked-body": ["Cuerpo Horneado", "Si lo alcanza un movimiento de tipo Fuego, aumenta mucho su defensa en vez de sufrir daño."],
    "white-smoke": ["Humo Blanco", "El humo blanco que lo protege evita que otros Pokémon le bajen las características."],
    "wimp-out": ["Huida", "Se asusta y abandona el terreno de combate cuando sus PS se ven reducidos a la mitad."],
    "wind-power": ["Energía Eólica", "Su cuerpo se carga de electricidad si es afectado por Viento Afín o lo alcanza un movimiento que usa viento, lo que potencia su siguiente movimiento de tipo Eléctrico."],
    "wind-rider": ["Surcavientos", "Si sopla un Viento Afín o lo alcanza un movimiento que usa viento, aumenta su ataque. Tampoco recibe daño de este último."],
    "wonder-guard": ["Superguarda", "Gracias a un poder misterioso, solo le hacen daño los movimientos supereficaces."],
    "wonder-skin": ["Piel Milagro", "Presenta una mayor resistencia ante los movimientos de estado."],
    "zen-mode": ["Modo Daruma", "Cambia de forma si sus PS se ven reducidos a la mitad."],
    "zero-to-hero": ["Cambio Heroico", "Adopta la Forma Heroica cuando se retira del combate."],
};
const nombreHabilidad = (k) => (HABILIDADES[k] && HABILIDADES[k][0]) || (k ? nombreBonito(k) : "—");
const descHabilidad = (k) => (HABILIDADES[k] && HABILIDADES[k][1]) || "";
// Habilidades de una especie (datos de PokéAPI): huecos 1 y 2 (normales) y 3 (la oculta).
function habilidadesDe(d) {
    const h = {};
    ((d && d.abilities) || []).forEach((a) => { h[a.is_hidden ? 3 : a.slot] = a.ability.name; });
    return h;
}
const habilidadDe = (d, hueco) => { const h = habilidadesDe(d); return h[hueco] || h[1] || h[2] || h[3] || null; };
// Hueco al azar: una de las normales y, a veces (probOculta), la oculta.
function huecoAleatorio(d, probOculta = 0) {
    const h = habilidadesDe(d);
    if (h[3] && Math.random() < probOculta) return 3;
    return h[2] && Math.random() < 0.5 ? 2 : 1;
}

// ===================== CLASES DE MOVIMIENTOS =====================
const MOVS_PUNO = new Set(["mega-punch", "fire-punch", "ice-punch", "thunder-punch", "comet-punch", "dizzy-punch", "dynamic-punch", "focus-punch",
    "mach-punch", "sky-uppercut", "meteor-mash", "hammer-arm", "bullet-punch", "drain-punch", "shadow-punch", "power-up-punch", "ice-hammer",
    "plasma-fists", "double-iron-bash", "surging-strikes", "wicked-blow", "jet-punch", "rage-fist", "headlong-rush"]);
const MOVS_MORDISCO = new Set(["bite", "crunch", "fire-fang", "ice-fang", "thunder-fang", "poison-fang", "psychic-fangs", "hyper-fang", "jaw-lock", "fishious-rend"]);
const MOVS_PULSO = new Set(["water-pulse", "aura-sphere", "dark-pulse", "dragon-pulse", "origin-pulse", "terrain-pulse", "heal-pulse"]);
const MOVS_SONIDO = new Set(["growl", "roar", "sing", "supersonic", "screech", "snore", "uproar", "hyper-voice", "metal-sound", "grass-whistle",
    "bug-buzz", "chatter", "echoed-voice", "relic-song", "snarl", "noble-roar", "disarming-voice", "parting-shot", "boomburst", "confide",
    "sparkling-aria", "clanging-scales", "clangorous-soul", "overdrive", "eerie-spell", "torch-song", "alluring-voice", "psychic-noise", "round", "perish-song"]);
const MOVS_BALA = new Set(["acid-spray", "aura-sphere", "barrage", "beak-blast", "bullet-seed", "egg-bomb", "electro-ball", "energy-ball", "focus-blast",
    "gyro-ball", "ice-ball", "magnet-bomb", "mist-ball", "mud-bomb", "octazooka", "pollen-puff", "pyro-ball", "rock-blast", "rock-wrecker",
    "searing-shot", "seed-bomb", "shadow-ball", "sludge-bomb", "weather-ball", "zap-cannon", "syrup-bomb"]);
const MOVS_CORTE = new Set(["cut", "razor-leaf", "slash", "fury-cutter", "air-cutter", "aerial-ace", "leaf-blade", "night-slash", "air-slash", "x-scissor",
    "psycho-cut", "cross-poison", "sacred-sword", "secret-sword", "razor-shell", "solar-blade", "behemoth-blade", "stone-axe", "ceaseless-edge",
    "kowtow-cleave", "bitter-blade", "aqua-cutter", "population-bomb", "psyblade", "tachyon-cutter", "mighty-cleave"]);
const MOVS_VIENTO = new Set(["gust", "razor-wind", "twister", "air-cutter", "heat-wave", "hurricane", "icy-wind", "petal-blizzard", "fairy-wind",
    "whirlwind", "blizzard", "sandstorm", "bleakwind-storm", "wildbolt-storm", "sandsear-storm", "springtide-storm"]);
const MOVS_POLVO = new Set(["sleep-powder", "stun-spore", "poison-powder", "spore", "cotton-spore", "rage-powder", "magic-powder", "powder"]);
const MOVS_CONTACTO_ESP = new Set(["draining-kiss", "grass-knot", "petal-dance", "trump-card", "wring-out", "infestation", "electro-drift"]);
const esContacto = (mov, atacante) => !(atacante && atacante.habilidad === "long-reach") &&
    ((mov.cat === "fis" && !SIN_CONTACTO.has(mov.clave)) || MOVS_CONTACTO_ESP.has(mov.clave));
// Movimientos de estado dirigidos al rival (provocan un estado o le cambian las características).
const apuntaAlRival = (mov) => mov.cat === "est" && !!(mov.estado || mov.confunde || ["drenadoras", "mofa", "bostezo", "otraVez", "dividir",
    "anular", "atraccion", "bloqueo", "fijar", "legado", "transformar"].includes(mov.especial) ||
    (mov.cambios && mov.cambios.objetivo !== "yo"));
// Efectos secundarios (los que anula Potencia Bruta y dobla Dicha).
const tieneSecundarios = (mov) => mov.cat !== "est" &&
    !!(mov.estado || mov.confunde || mov.retroceder || (mov.cambios && (mov.cambios.objetivo !== "yo" || Object.values(mov.cambios.stats).some((v) => v > 0))));
// La característica más alta (Ultraimpulso, Paleosíntesis).
function mejorStat(c) {
    let k = "atk";
    ["def", "spa", "spd", "vel"].forEach((s) => { if (c.stats[s] > c.stats[k]) k = s; });
    return k;
}

// ===================== CAMPO: TIEMPO ATMOSFÉRICO =====================
// El motor de combate pone el tiempo y quién está en el campo; aquí se consulta.
const CAMPO = { clima: null, activos: () => [] };   // clima: { tipo: "lluvia" | "sol" | "arena" | "nieve", turnos }
const CLIMAS = {
    lluvia: { nombre: "Lluvia", empieza: "¡Ha empezado a llover!", sigue: "Sigue lloviendo…", fin: "¡Ha dejado de llover!", anim: "common-rain", mov: "rain-dance",
        ambiente: "Está lloviendo.", fx: "weather-raindance.jpg" },
    sol: { nombre: "Sol", empieza: "¡El sol pega fuerte!", sigue: "Hace mucho sol…", fin: "¡El sol vuelve a brillar como siempre!", anim: "common-sunny", mov: "sunny-day",
        ambiente: "El sol pega fuerte.", fx: "weather-sunnyday.jpg" },
    arena: { nombre: "Tormenta de arena", empieza: "¡Se ha desatado una tormenta de arena!", sigue: "La tormenta de arena arrecia…", fin: "¡La tormenta de arena ha amainado!", anim: "common-sandstorm", mov: "sandstorm",
        ambiente: "Sopla una tormenta de arena.", fx: "weather-sandstorm.png" },
    nieve: { nombre: "Nieve", empieza: "¡Ha empezado a nevar!", sigue: "Sigue nevando…", fin: "¡Ha dejado de nevar!", anim: "common-snow", mov: "hail",
        ambiente: "Está nevando.", fx: "weather-hail.png" },
};
// Imagen del tiempo (la de Pokémon Showdown) que se ve sobre el escenario o sobre el lugar de la región.
const urlClimaFx = (t) => (CLIMAS[t] ? `https://play.pokemonshowdown.com/fx/${CLIMAS[t].fx}` : "");
const CLIMA_MOV = { "rain-dance": "lluvia", "sunny-day": "sol", sandstorm: "arena", hail: "nieve", snowscape: "nieve" };
const CLIMA_HAB = { drizzle: "lluvia", drought: "sol", "sand-stream": "arena", "snow-warning": "nieve", "orichalcum-pulse": "sol" };
const ROCA_CLIMA = { "damp-rock": "lluvia", "heat-rock": "sol", "smooth-rock": "arena", "icy-rock": "nieve" };
const ANULA_CLIMA = new Set(["cloud-nine", "air-lock"]);
function climaEnCampo() {
    const c = CAMPO.clima; if (!c) return null;
    return CAMPO.activos().some((p) => p && p.hp > 0 && ANULA_CLIMA.has(p.habilidad)) ? null : c.tipo;
}
// El tiempo tal como le afecta a ese Pokémon: con el Parasol Multiuso, ni el sol ni la lluvia.
// Megasolar (Mega-Meganium): sus movimientos funcionan como si hiciera sol, haga el tiempo que haga.
const climaDeAtaque = (c) => (c && c.habilidad === "mega-sol" ? "sol" : climaEnCampo());
function climaPara(c) {
    const cl = climaEnCampo();
    return c && c.objeto === "utility-umbrella" && (cl === "sol" || cl === "lluvia") ? null : cl;
}
// ===================== CAMPO: TERRENOS =====================
// CAMPO.terreno: { tipo: "electrico" | "hierba" | "niebla" | "psiquico", turnos }. Solo afectan a los que tocan el suelo.
// Textos de PokéRogue y fondos de Pokémon Showdown (los de los juegos).
const TERRENOS = {
    electrico: { nombre: "Campo Eléctrico", tipo: "electric", img: "electricterrain", anim: "common-electric-terrain",
        empieza: "¡Se ha formado un campo de corriente eléctrica en el terreno de combate!", fin: "El campo de corriente eléctrica ha desaparecido." },
    hierba: { nombre: "Campo de Hierba", tipo: "grass", img: "grassyterrain", anim: "common-grassy-terrain",
        empieza: "¡El terreno de combate se ha cubierto de hierba!", fin: "La hierba ha desaparecido." },
    niebla: { nombre: "Campo de Niebla", tipo: "fairy", img: "mistyterrain", anim: "common-misty-terrain",
        empieza: "¡La niebla ha envuelto el terreno de combate!", fin: "La niebla se ha disipado." },
    psiquico: { nombre: "Campo Psíquico", tipo: "psychic", img: "psychicterrain", anim: "common-psychic-terrain",
        empieza: "¡El terreno de combate se ha vuelto muy extraño!", fin: "Ha desaparecido la extraña sensación que se percibía en el terreno de combate." },
};
const TERRENO_MOV = { "electric-terrain": "electrico", "grassy-terrain": "hierba", "misty-terrain": "niebla", "psychic-terrain": "psiquico" };
const TERRENO_HAB = { "electric-surge": "electrico", "grassy-surge": "hierba", "misty-surge": "niebla", "psychic-surge": "psiquico", "hadron-engine": "electrico" };
const terrenoEnCampo = () => (CAMPO.terreno ? CAMPO.terreno.tipo : null);

// ===================== EFECTOS EN EL CÁLCULO =====================
const ROMPE_MOLDES = new Set(["mold-breaker", "teravolt", "turboblaze"]);
// Habilidad de quien recibe el movimiento: la ignoran Rompemoldes (y Poder Fúngico, con los de estado).
const habDef = (def, atk, mov) =>
    (atk && atk !== def && (ROMPE_MOLDES.has(atk.habilidad) || (atk.habilidad === "mycelium-might" && mov && mov.cat === "est")) ? null : def.habilidad);
const PIEL = { pixilate: "fairy", refrigerate: "ice", aerilate: "flying", galvanize: "electric", dragonize: "dragon" };
const APURO = { overgrow: "grass", blaze: "fire", torrent: "water", swarm: "bug" };
// Tipo con el que sale un movimiento (Piel Feérica, Normalidad, Voz Fluida, Meteorobola…).
function tipoDeMovimiento(c, mov) {
    if (mov.clave === "weather-ball") { const cl = climaDeAtaque(c); if (cl) return { lluvia: "water", sol: "fire", arena: "rock", nieve: "ice" }[cl]; }
    if (mov.clave === "terrain-pulse" && terrenoEnCampo() && enSuelo(c)) return TERRENOS[terrenoEnCampo()].tipo;
    if (mov.clave === "tera-blast" && c.teracristal) return c.teracristal;
    if (mov.esMax) return mov.tipo;   // (el Maximovimiento ya va con su tipo)
    if (mov.clave === "natural-gift" && c && TIPO_REGALO[c.objeto]) return TIPO_REGALO[c.objeto];
    if (c && c.electrificado) return "electric";   // Electrificación
    if (CAMPO.diluvio && mov.tipo === "normal") return "electric";   // Cortina Plasma
    if (c.habilidad === "normalize") return "normal";
    if (mov.tipo === "normal" && PIEL[c.habilidad]) return PIEL[c.habilidad];
    if (c.habilidad === "liquid-voice" && MOVS_SONIDO.has(mov.clave)) return "water";
    return mov.tipo;
}
// Efectividad con Intrépido / Ojo Mental (Normal y Lucha alcanzan a los Fantasma) y Teracaparazón.
function efectividadHab(tipo, def, atk, mov) {
    let tipos = def.tipos;
    if (atk && (atk.habilidad === "scrappy" || atk.habilidad === "minds-eye") && (tipo === "normal" || tipo === "fighting")) tipos = tipos.filter((t) => t !== "ghost");
    if (tipo === "ground" && (def.objeto === "iron-ball" || def.arraigo || CAMPO.gravedad > 0)) tipos = tipos.filter((t) => t !== "flying");   // (en el suelo)
    if (tipo === "ground" && !(CAMPO.gravedad > 0) && (def.levitando > 0 || def.telequinesis > 0)) return 0;   // (Levitón, Telequinesis)
    if (def.identificado && (tipo === "normal" || tipo === "fighting")) tipos = tipos.filter((t) => t !== "ghost");   // Rastreo, Profecía
    if (def.ojoMilagro && tipo === "psychic") tipos = tipos.filter((t) => t !== "dark");   // Gran Ojo
    if (def.objeto === "ring-target") tipos = tipos.filter((t) => efectividad(tipo, [t]) !== 0);   // Blanco: sin inmunidades
    let e = tipos.length ? efectividad(tipo, tipos) : 1;
    if (habDef(def, atk, mov) === "tera-shell" && def.hp >= def.hpMax && e > 0) e = Math.min(e, 0.5);
    return e;
}
// ¿Anula la habilidad del objetivo el movimiento? → { h, efecto?: "cura" | "fuego", stats? } o null.
function inmunidadHab(def, atk, mov, tipo) {
    if (def === atk) return null;
    const h = habDef(def, atk, mov); if (!h) return null;
    const danino = mov.cat !== "est";
    switch (h) {
        case "levitate": case "eelevate": return tipo === "ground" && danino && def.objeto !== "iron-ball" && !def.arraigo ? { h } : null;
        case "flash-fire": return tipo === "fire" ? { h, efecto: "fuego" } : null;
        case "water-absorb": case "dry-skin": return tipo === "water" ? { h, efecto: "cura" } : null;
        case "volt-absorb": return tipo === "electric" ? { h, efecto: "cura" } : null;
        case "earth-eater": return tipo === "ground" ? { h, efecto: "cura" } : null;
        case "storm-drain": return tipo === "water" ? { h, stats: { spa: 1 } } : null;
        case "lightning-rod": return tipo === "electric" ? { h, stats: { spa: 1 } } : null;
        case "motor-drive": return tipo === "electric" ? { h, stats: { vel: 1 } } : null;
        case "sap-sipper": return tipo === "grass" ? { h, stats: { atk: 1 } } : null;
        case "well-baked-body": return tipo === "fire" && danino ? { h, stats: { def: 2 } } : null;
        case "wind-rider": return MOVS_VIENTO.has(mov.clave) ? { h, stats: { atk: 1 } } : null;
        case "soundproof": return MOVS_SONIDO.has(mov.clave) ? { h } : null;
        case "bulletproof": return MOVS_BALA.has(mov.clave) ? { h } : null;
        case "overcoat": return MOVS_POLVO.has(mov.clave) ? { h } : null;
        case "good-as-gold": return apuntaAlRival(mov) ? { h } : null;
        case "wonder-guard": return danino && efectividadHab(tipo, def, atk, mov) < 2 ? { h } : null;
        case "queenly-majesty": case "dazzling": case "armor-tail": return (mov.prioEf || 0) > 0 ? { h } : null;
    }
    return null;
}
// Paleosíntesis (con sol) y Carga Cuark (con Campo Eléctrico), activas; también con la Energía Potenciadora.
const paradojaActiva = (c, h = c.habilidad) => (h === "protosynthesis" && (climaEnCampo() === "sol" || !!c.potenciado)) ||
    (h === "quark-drive" && (terrenoEnCampo() === "electrico" || !!c.potenciado));
// Característica de ataque: Energía Pura, Agallas, Poder Solar… (y las Debacle del rival).
function multAtaqueHab(c, fisico, rival) {
    const h = c.habilidad, cl = climaPara(c); let m = 1;
    if (fisico) {
        if (h === "huge-power" || h === "pure-power") m *= 2;
        if (h === "hustle" || h === "gorilla-tactics") m *= 1.5;
        if (h === "guts" && c.estado) m *= 1.5;
        if (h === "toxic-boost" && c.estado && c.estado.tipo === "env") m *= 1.5;
        if (h === "orichalcum-pulse" && cl === "sol") m *= 4 / 3;
        if (h === "flower-gift" && cl === "sol") m *= 1.5;
        if (h === "slow-start" && (c.turnosEnCampo || 0) < 5) m *= 0.5;
        if (rival && rival.habilidad === "tablets-of-ruin" && h !== "tablets-of-ruin") m *= 0.75;
    } else {
        if (h === "solar-power" && cl === "sol") m *= 1.5;
        if (h === "flare-boost" && c.estado && c.estado.tipo === "que") m *= 1.5;
        if (h === "hadron-engine" && terrenoEnCampo() === "electrico") m *= 4 / 3;
        if (rival && rival.habilidad === "vessel-of-ruin" && h !== "vessel-of-ruin") m *= 0.75;
    }
    if (h === "defeatist" && c.hp <= c.hpMax / 2) m *= 0.5;
    if (paradojaActiva(c) && mejorStat(c) === (fisico ? "atk" : "spa")) m *= 1.3;
    if (h === "supreme-overlord" && c.caidos) m *= 1 + 0.1 * Math.min(5, c.caidos);
    return m;
}
// Característica de defensa: Escama Especial, Pelaje Recio, la nieve (Hielo) y la arena (Roca)… (y las Debacle del atacante).
function multDefensaHab(def, fisico, atk) {
    const h = habDef(def, atk), cl = climaEnCampo(); let m = 1;
    if (fisico) {
        if (h === "marvel-scale" && def.estado) m *= 1.5;
        if (h === "fur-coat") m *= 2;
        if (cl === "nieve" && def.tipos.includes("ice")) m *= 1.5;
        if (atk && atk.habilidad === "sword-of-ruin" && def.habilidad !== "sword-of-ruin") m *= 0.75;
    } else {
        if (h === "flower-gift" && cl === "sol") m *= 1.5;
        if (cl === "arena" && def.tipos.includes("rock")) m *= 1.5;
        if (atk && atk.habilidad === "beads-of-ruin" && def.habilidad !== "beads-of-ruin") m *= 0.75;
    }
    if (paradojaActiva(def, h) && mejorStat(def) === (fisico ? "def" : "spd")) m *= 1.3;
    if (h === "grass-pelt" && fisico && terrenoEnCampo() === "hierba") m *= 1.5;
    return m;
}
// Potencia del movimiento: Experto, Puño Férreo, Mandíbula Fuerte, Espesura…
function multPoderHab(c, mov, tipo, def) {
    const h = c.habilidad, cl = climaDeAtaque(c); let m = 1;
    if (h === "technician" && mov.poder <= 60) m *= 1.5;
    if (h === "iron-fist" && MOVS_PUNO.has(mov.clave)) m *= 1.2;
    if (h === "strong-jaw" && MOVS_MORDISCO.has(mov.clave)) m *= 1.5;
    if (h === "mega-launcher" && MOVS_PULSO.has(mov.clave)) m *= 1.5;
    if (h === "tough-claws" && esContacto(mov, c)) m *= 1.3;
    if (h === "sharpness" && MOVS_CORTE.has(mov.clave)) m *= 1.5;
    if (h === "punk-rock" && MOVS_SONIDO.has(mov.clave)) m *= 1.3;
    if (h === "reckless" && mov.drenaje < 0) m *= 1.2;
    if (h === "sheer-force" && tieneSecundarios(mov)) m *= 1.3;
    if (h === "water-bubble" && tipo === "water") m *= 2;
    if ((h === "steelworker" || h === "steely-spirit") && tipo === "steel") m *= 1.5;
    if (h === "transistor" && tipo === "electric") m *= 1.3;
    if (h === "dragons-maw" && tipo === "dragon") m *= 1.5;
    if (h === "rocky-payload" && tipo === "rock") m *= 1.5;
    if (h === "fire-mane" && tipo === "fire") m *= 1.5;
    if (h === "sand-force" && cl === "arena" && ["rock", "ground", "steel"].includes(tipo)) m *= 1.3;
    if (APURO[h] === tipo && c.hp <= c.hpMax / 3) m *= 1.5;
    if (h === "flash-fire" && c.fuegoAbsorbido && tipo === "fire") m *= 1.5;
    if ((PIEL[h] && tipo !== mov.tipo) || h === "normalize") m *= 1.2;
    if ((h === "electromorphosis" || h === "wind-power") && c.cargado && tipo === "electric") m *= 2;
    if (h === "analytic" && mov._ultimo) m *= 1.3;
    if (h === "rivalry" && def && c.genero && def.genero) m *= c.genero === def.genero ? 1.25 : 0.75;   // Rivalidad
    if (h === "stakeout" && def && def.recienLlegado) m *= 2;   // Vigilante: contra el que acaba de salir
    if (mov.clave === "weather-ball" && cl) m *= 2;
    if ((mov.clave === "solar-beam" || mov.clave === "solar-blade") && cl && cl !== "sol") m *= 0.5;
    const hd = def ? habDef(def, c, mov) : null;
    if (hd === "heatproof" && tipo === "fire") m *= 0.5;
    if (hd === "dry-skin" && tipo === "fire") m *= 1.25;
    return m;
}
// Daño final: Filtro, Multiescamas, Sebo, Cromolente, Francotirador… y la lluvia y el sol.
function multDanioHab(atk, def, mov, tipo, efect, crit) {
    let m = 1; const h = atk.habilidad, hd = habDef(def, atk, mov);
    if (h === "tinted-lens" && efect > 0 && efect < 1) m *= 2;
    if (h === "sniper" && crit) m *= 1.5;
    if (h === "neuroforce" && efect >= 2) m *= 1.25;
    if ((hd === "filter" || hd === "solid-rock" || def.habilidad === "prism-armor") && efect >= 2) m *= 0.75;
    if ((hd === "multiscale" || def.habilidad === "shadow-shield") && def.hp >= def.hpMax) m *= 0.5;
    if (hd === "thick-fat" && (tipo === "fire" || tipo === "ice")) m *= 0.5;
    if (hd === "water-bubble" && tipo === "fire") m *= 0.5;
    if (hd === "purifying-salt" && tipo === "ghost") m *= 0.5;
    if (hd === "fluffy") { if (esContacto(mov, atk)) m *= 0.5; if (tipo === "fire") m *= 2; }
    if (hd === "aura-guard" && esContacto(mov, atk)) m *= 0.5;
    if (hd === "ice-scales" && mov.cat === "esp") m *= 0.5;
    if (hd === "punk-rock" && MOVS_SONIDO.has(mov.clave)) m *= 0.5;
    m *= multAura(tipo);
    // Ráfaga Delta (Mega-Rayquaza): mientras está en el campo, las debilidades del tipo Volador desaparecen.
    if (def.tipos.includes("flying") && ["electric", "ice", "rock"].includes(tipo) && CAMPO.activos().some((p) => p && p.hp > 0 && p.habilidad === "delta-stream")) m *= 0.5;
    // (con el Parasol Multiuso, el sol y la lluvia no cambian el daño que recibe; con Megasolar, quien ataca lo hace como con sol)
    const cl = h === "mega-sol" && def.objeto !== "utility-umbrella" ? "sol" : climaPara(def);
    if (cl === "lluvia") m *= tipo === "water" ? 1.5 : tipo === "fire" ? 0.5 : 1;
    if (cl === "sol") m *= tipo === "fire" ? 1.5 : tipo === "water" ? 0.5 : 1;
    const tr = terrenoEnCampo();
    if (tr && tr !== "niebla" && TERRENOS[tr].tipo === tipo && enSuelo(atk)) m *= 1.3;
    if (tr === "niebla" && tipo === "dragon" && enSuelo(def)) m *= 0.5;
    if (tr === "hierba" && ["earthquake", "bulldoze", "magnitude"].includes(mov.clave) && enSuelo(def)) m *= 0.5;
    return m;
}
const sinCriticos = (def, atk) => { const h = habDef(def, atk); return h === "battle-armor" || h === "shell-armor" || !!(CAMPO.lados && def.lado && CAMPO.lados[def.lado] && CAMPO.lados[def.lado].conjuro > 0); };
// Velocidad: Nado Rápido, Clorofila, Ímpetu Arena, Quitanieves, Pies Rápidos, Liviano, Inicio Lento…
function multVelHab(c) {
    const h = c.habilidad, cl = climaPara(c); let m = 1;
    if ((h === "swift-swim" && cl === "lluvia") || (h === "chlorophyll" && cl === "sol") || (h === "sand-rush" && cl === "arena") || (h === "slush-rush" && cl === "nieve")) m *= 2;
    if (h === "quick-feet" && c.estado) m *= 1.5;
    if (h === "unburden" && c.ligero) m *= 2;
    if (h === "slow-start" && (c.turnosEnCampo || 0) < 5) m *= 0.5;
    if (h === "protosynthesis" && paradojaActiva(c) && mejorStat(c) === "vel") m *= 1.5;
    if (h === "surge-surfer" && terrenoEnCampo() === "electrico") m *= 2;
    if (h === "quark-drive" && paradojaActiva(c) && mejorStat(c) === "vel") m *= 1.5;
    return m;
}
// Prioridad: Bromista, Alas Vendaval, Primer Auxilio.
function prioridadHab(c, mov) {
    let p = mov.prio || 0; const h = c.habilidad;
    if (h === "prankster" && mov.cat === "est") p += 1;
    if (h === "gale-wings" && mov.tipo === "flying" && c.hp >= c.hpMax) p += 1;
    if (h === "triage" && (mov.curacion || mov.drenaje > 0)) p += 3;
    if (mov.clave === "grassy-glide" && terrenoEnCampo() === "hierba" && enSuelo(c)) p += 1;
    return p;
}
const vaUltimo = (c, mov) => c.habilidad === "stall" || c.objeto === "lagging-tail" || (c.habilidad === "mycelium-might" && mov.cat === "est");
// Precisión: Ojo Compuesto, Entusiasmo, Indefenso, Velo Arena…; y el tiempo (Trueno y Vendaval con lluvia, Ventisca con nieve).
function precisionFinal(atk, def, mov) {
    if (atk.habilidad === "no-guard" || def.habilidad === "no-guard") return Infinity;
    const cl = climaEnCampo(), clDef = climaPara(def);
    if ((mov.clave === "thunder" || mov.clave === "hurricane") && clDef === "lluvia") return Infinity;
    if (mov.clave === "blizzard" && cl === "nieve") return Infinity;
    let p = (mov.clave === "thunder" || mov.clave === "hurricane") && clDef === "sol" ? 0.5 : mov.prec || 1;
    const h = atk.habilidad, hd = habDef(def, atk, mov);
    if (h === "compound-eyes") p *= 1.3;
    if (h === "hustle" && mov.cat === "fis") p *= 0.8;
    if (h === "victory-star") p *= 1.1;
    if ((hd === "sand-veil" && cl === "arena") || (hd === "snow-cloak" && cl === "nieve")) p *= 0.8;
    if (hd === "wonder-skin" && apuntaAlRival(mov)) p = Math.min(p, 0.5);
    return p;
}
// ¿Evita este problema de estado? → la habilidad que lo impide, "sol" (nadie se congela con sol) o false.
const HAB_SIN_ESTADO = { par: ["limber"], dor: ["insomnia", "vital-spirit", "sweet-veil"], env: ["immunity", "pastel-veil"],
    que: ["water-veil", "water-bubble", "thermal-exchange"], con: ["magma-armor"] };
function inmuneEstadoHab(c, tipo, fuente) {
    const h = fuente && fuente !== c ? habDef(c, fuente) : c.habilidad, cl = climaEnCampo();
    if (h === "comatose" || h === "purifying-salt" || (h === "leaf-guard" && climaPara(c) === "sol")) return h;
    if (tipo === "con" && cl === "sol") return "sol";
    const tr = terrenoEnCampo();
    if (tr && enSuelo(c) && (tr === "niebla" || (tr === "electrico" && tipo === "dor"))) return "terreno";
    return (HAB_SIN_ESTADO[tipo] || []).includes(h) ? h : false;
}
// Nerviosismo: el rival no puede comer bayas.
const nervioso = (c) => CAMPO.activos().some((p) => p && p !== c && p.hp > 0 && (p.habilidad === "unnerve" || p.habilidad === "as-one-glastrier" || p.habilidad === "as-one-spectrier"));
// Aura Oscura / Aura Feérica: potencian los de su tipo de todos los que están en el campo.
// (con Rompeaura en el campo —Mega-Zygarde—, las auras debilitan en vez de potenciar)
const multAura = (tipo) => (CAMPO.activos().some((p) => p && p.hp > 0 && ((tipo === "dark" && p.habilidad === "dark-aura") || (tipo === "fairy" && p.habilidad === "fairy-aura")))
    ? (CAMPO.activos().some((p) => p && p.hp > 0 && p.habilidad === "aura-break") ? 0.75 : 4 / 3) : 1);
// Habilidades que no se copian (Calco) ni se contagian (Momia).
const NO_COPIABLES = new Set(["trace", "multitype", "stance-change", "schooling", "comatose", "shields-down", "disguise", "rks-system", "battle-bond",
    "power-construct", "ice-face", "gulp-missile", "neutralizing-gas", "hunger-switch", "zero-to-hero", "commander", "illusion", "imposter",
    "flower-gift", "forecast", "zen-mode", "as-one-glastrier", "as-one-spectrier", "tera-shift", "mummy", "lingering-aroma", "wonder-guard"]);
const STAT_LARGO = { atk: "Ataque", def: "Defensa", spa: "Ataque Especial", spd: "Defensa Especial", vel: "Velocidad" };
// Mensaje al entrar en combate de las habilidades que solo avisan (su efecto va en el cálculo).
const ANUNCIO_HAB = {
    pressure: (n) => `¡${n} ejerce Presión!`,
    "mold-breaker": (n) => `¡${n} rompió el molde!`,
    teravolt: (n) => `¡${n} desprende un aura chisporroteante!`,
    turboblaze: (n) => `¡${n} desprende un aura llameante!`,
    unnerve: () => "¡El equipo rival está tan nervioso que no puede comer bayas!",
    "as-one-glastrier": () => "¡El equipo rival está tan nervioso que no puede comer bayas!",
    "as-one-spectrier": () => "¡El equipo rival está tan nervioso que no puede comer bayas!",
    "cloud-nine": () => "Los efectos del tiempo atmosférico se han neutralizado.",
    "air-lock": () => "Los efectos del tiempo atmosférico se han neutralizado.",
    "slow-start": (n) => `¡${n} no está a pleno rendimiento!`,
    comatose: (n) => `¡${n} está sumido en un profundo letargo!`,
    "sword-of-ruin": (n) => `¡${n} ha mermado la Defensa de los demás Pokémon con Espada Debacle!`,
    "beads-of-ruin": (n) => `¡${n} ha mermado la Defensa Especial de los demás Pokémon con Abalorio Debacle!`,
    "tablets-of-ruin": (n) => `¡${n} ha mermado el Ataque de los demás Pokémon con Tablilla Debacle!`,
    "vessel-of-ruin": (n) => `¡${n} ha mermado el Ataque Especial de los demás Pokémon con Caldero Debacle!`,
    "hadron-engine": (n) => `¡${n} ha puesto en marcha su motor futurista!`,
    "dark-aura": (n) => `¡${n} irradia un aura oscura!`,
    "fairy-aura": (n) => `¡${n} irradia un aura feérica!`,
    "delta-stream": () => "¡Unas misteriosas turbulencias protegen a los Pokémon de tipo Volador!",
};
// Cambios de características según la habilidad: Respondón (al revés), Simple (el doble) y las que impiden bajadas.
// → { stats, bloqueo: [característica, habilidad] | null }
function cambiosConHab(c, stats, porRival, fuente) {
    const h = porRival && fuente ? habDef(c, fuente) : c.habilidad;
    const out = {}; let bloqueo = null;
    Object.entries(stats).forEach(([k, v]) => {
        if (c.habilidad === "contrary") v = -v;
        if (c.habilidad === "simple") v *= 2;
        if (v < 0 && porRival && (h === "clear-body" || h === "white-smoke" || h === "full-metal-body" || h === "mirror-armor" ||
            (h === "hyper-cutter" && k === "atk") || (h === "big-pecks" && k === "def"))) { bloqueo = bloqueo || [k, h]; return; }
        out[k] = v;
    });
    return { stats: out, bloqueo };
}
