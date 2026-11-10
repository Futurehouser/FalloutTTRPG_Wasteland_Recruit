// Maps: quest maps drawn in the green-on-black style of the Fallout 3 Pip-Boy. A quest opens on its general
// map; each location mark opens that place's local map, with marks for the characters, enemies and things the
// quest puts there. Maps can be dragged and zoomed (mouse wheel, pinch or the + / - buttons), and every mark
// beeps when tapped.
//
// The layouts are this app's own approximation of what the quest describes (the rulebook has no maps for it),
// and the notes are short summaries in our own words. Spanish for this page's text sits next to the English
// (L("English", "Spanish") adds it to the same ES table lang_es.js fills).
const Maps = (() => {
  const L = (en, es) => { if (es && typeof ES !== "undefined" && !(en in ES)) ES[en] = es; return en; };

  // ---------------------------------------------------------------- drawing helpers (SVG strings, map units)
  function rng(seed) {
    return () => {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const D = {
    rect: (x, y, w, h, c = "bld") => `<rect class="${c}" x="${x}" y="${y}" width="${w}" height="${h}"/>`,
    line: (pts, c = "wall") => `<polyline class="${c}" points="${pts.map(p => p.join(",")).join(" ")}"/>`,
    path: (d, c) => `<path class="${c}" d="${d}"/>`,
    circ: (x, y, r, c) => `<circle class="${c}" cx="${x}" cy="${y}" r="${r}"/>`,
    ell: (x, y, rx, ry, c) => `<ellipse class="${c}" cx="${x}" cy="${y}" rx="${rx}" ry="${ry}"/>`,
    // a gap in a wall (a doorway): painted over the wall in the background colour
    door: (x1, y1, x2, y2) => `<line class="gap" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`,
    text: (x, y, t, c = "lbl") => `<text class="${c}" x="${x}" y="${y}">${String(T(t)).split("\n").map((s, i) =>
      `<tspan x="${x}" dy="${i ? "1.1em" : 0}">${esc(s)}</tspan>`).join("")}</text>`,
    grass(r, x0, y0, x1, y1, n, c = "grass") {
      let d = "";
      for (let i = 0; i < n; i++) {
        const x = x0 + r() * (x1 - x0), y = y0 + r() * (y1 - y0), h = 6 + r() * 10, lean = (r() - 0.5) * 8;
        d += `M${x.toFixed(1)} ${y.toFixed(1)}l${lean.toFixed(1)} ${(-h).toFixed(1)}`;
      }
      return `<path class="${c}" d="${d}"/>`;
    },
    trees(r, x0, y0, x1, y1, n, size = 14) {
      let s = "";
      for (let i = 0; i < n; i++) s += D.circ((x0 + r() * (x1 - x0)).toFixed(1), (y0 + r() * (y1 - y0)).toFixed(1), (size * (0.6 + r() * 0.6)).toFixed(1), "tree");
      return s;
    },
    rubble(r, x0, y0, x1, y1, n) {
      let s = "";
      for (let i = 0; i < n; i++) {
        const w = 14 + r() * 40, h = 10 + r() * 34;
        s += D.rect((x0 + r() * (x1 - x0 - w)).toFixed(1), (y0 + r() * (y1 - y0 - h)).toFixed(1), w.toFixed(1), h.toFixed(1), "ruin");
      }
      return s;
    },
    rows(x, y, w, h, gap = 16, c = "field") {
      let d = "";
      for (let yy = y; yy <= y + h; yy += gap) d += `M${x} ${yy}h${w}`;
      return `<rect class="field-edge" x="${x}" y="${y}" width="${w}" height="${h}"/><path class="${c}" d="${d}"/>`;
    },
    hills(x, y, rx, ry, n = 3) {
      let s = "";
      for (let i = 0; i < n; i++) s += D.ell(x, y, rx * (1 - i * 0.3), ry * (1 - i * 0.3), "contour");
      return s;
    },
    compass(x, y) {
      return `<g class="compass" transform="translate(${x},${y})"><circle r="34"/><path d="M0 -44L8 0L0 44L-8 0Z"/><path class="fill" d="M0 -44L8 0L-8 0Z"/>
        <text y="-52">${T(L("N", "N"))}</text></g>`;
    },
  };

  // ---------------------------------------------------------------- the quests
  const KIND = {
    loc: L("Location", "Lugar"), npc: L("Character", "Personaje"), enemy: L("Hostile", "Hostil"),
    dead: L("Body", "Cadáver"), item: L("Point of interest", "Punto de interés"), exit: L("Way out", "Salida"),
  };
  const QUESTS = [
    { id: "bang", name: L("With a Bang, or a Whimper", "Con un estallido o con un gemido"), start: "bang_world",
      blurb: L("Core rulebook, chapter eleven: a murder mystery in a G.E.C.K. town in the Commonwealth.",
               "Libro básico, capítulo once: un misterio de asesinato en un pueblo G.E.C.K. de la Commonwealth.") },
  ];

  const MAPS = {
    // ============================================================ general map
    bang_world: {
      title: L("The town and its surroundings", "El pueblo y sus alrededores"), w: 1600, h: 1000, seed: 11, back: null,
      draw: r => [
        D.hills(230, 170, 170, 80), D.hills(1180, 860, 210, 90), D.hills(1080, 150, 150, 60, 2), D.hills(560, 900, 160, 60, 2),
        D.path("M120 0C210 210 50 400 170 560S250 860 150 1000", "water"), D.path("M140 0C230 210 70 400 190 560S270 860 170 1000", "water"),
        D.text(95, 470, L("River", "Río"), "lbl lbl-dim lbl-v"),
        // the collapsed highway from the chapter art
        D.path("M0 312L380 270M440 263L760 228M830 220L1180 182M1240 175L1600 136", "highway"),
        D.path("M0 336L380 294M440 287L760 252M830 244L1180 206M1240 199L1600 160", "highway"),
        D.path("M380 270l12 -40M760 228l14 44M1180 182l-10 52", "trail"),
        D.text(980, 178, L("Collapsed highway", "Autopista derrumbada"), "lbl lbl-dim"),
        // ruins of Boston, far to the south-east
        D.rubble(r, 1330, 720, 1590, 990, 46), D.text(1460, 705, L("Ruins of Boston\n(far away)", "Ruinas de Boston\n(a lo lejos)"), "lbl lbl-dim"),
        D.grass(r, 980, 300, 1600, 700, 260), D.grass(r, 0, 380, 600, 1000, 160), D.grass(r, 0, 0, 1600, 300, 120),
        // the G.E.C.K. town: a green blob in the wasteland
        D.path("M590 420C600 340 700 330 780 345S960 360 975 450S990 640 930 700S760 760 670 735S560 640 575 560S580 470 590 420Z", "geck"),
        D.trees(r, 600, 360, 960, 730, 70, 11),
        D.path("M660 455L770 520L880 455M770 520L655 640M770 520L905 655M770 520L770 735", "road"),
        D.rect(700, 600, 26, 20), D.rect(820, 590, 30, 22), D.rect(735, 680, 24, 20), D.rect(610, 520, 22, 26), D.rect(930, 520, 22, 26), D.rect(800, 380, 28, 20), D.rect(720, 380, 24, 20),
        D.text(780, 330, L("The town", "El pueblo"), "lbl lbl-big"),
        // Joseph and Theresa's tarberry farm on the outskirts
        D.rows(270, 715, 250, 110, 14), D.rows(500, 560, 120, 90, 14),
        D.rect(320, 665, 46, 34), D.rect(452, 585, 40, 46),
        D.path("M375 690C450 690 520 640 600 610S650 560 660 540", "track"),
        D.text(395, 860, L("Tarberry farm", "Granja de bayabrea"), "lbl lbl-dim"),
        // the road out to the Institute compound
        D.path("M905 655C1040 600 1120 470 1210 420S1360 300 1420 265", "trail"),
        D.text(1190, 520, L("Half a day on foot", "Medio día a pie"), "lbl lbl-dim"),
        D.grass(r, 1330, 180, 1530, 330, 160, "grass grass-pale"),
        D.rect(1395, 222, 70, 52, "bld bld-steel"),
        D.compass(1520, 80),
      ],
      marks: [
        { x: 343, y: 682, n: L("Farmhouse", "Casa de la granja"), k: "loc", go: "bang_farm" },
        { x: 472, y: 608, n: L("Red barn", "Granero rojo"), k: "loc", go: "bang_farm" },
        { x: 770, y: 520, n: L("Town square", "Plaza del pueblo"), k: "loc", go: "bang_square" },
        { x: 660, y: 452, n: L("Pub", "Pub"), k: "loc", go: "bang_pub" },
        { x: 880, y: 452, n: L("Clinic", "Clínica"), k: "loc", go: "bang_clinic" },
        { x: 650, y: 642, n: L("Cold fusion\ngenerator", "Generador de\nfusión fría"), k: "loc", go: "bang_generator" },
        { x: 905, y: 655, n: L("Trade post", "Puesto comercial"), k: "loc", go: "bang_tradepost" },
        { x: 1430, y: 248, n: L("Institute\ncompound", "Complejo del\nInstituto"), k: "loc", go: "bang_compound" },
      ],
    },

    // ============================================================ act one: the farm
    bang_farm: {
      title: L("Joseph and Theresa's farm", "La granja de Joseph y Theresa"), w: 1000, h: 700, seed: 21, back: "bang_world",
      draw: r => [
        D.grass(r, 0, 0, 1000, 700, 420),
        D.rows(600, 390, 360, 260, 18), D.rows(50, 470, 150, 190, 18), D.rows(860, 90, 120, 240, 18),
        D.text(780, 680, L("Tarberry fields", "Campos de bayabrea"), "lbl lbl-dim"),
        D.path("M0 330C90 330 150 310 228 310", "track"), D.text(70, 300, L("Track to town", "Camino al pueblo"), "lbl lbl-dim lbl-s"),
        // the adobe farmhouse: living room, kitchen, bedroom
        D.rect(230, 190, 300, 240), D.line([[390, 190], [390, 430]]), D.line([[390, 310], [530, 310]]),
        D.door(390, 222, 390, 278), D.door(390, 350, 390, 398), D.door(230, 290, 230, 332), D.door(530, 228, 530, 262),
        D.text(310, 215, L("Living room", "Salón"), "lbl lbl-room"), D.text(460, 215, L("Kitchen", "Cocina"), "lbl lbl-room"),
        D.text(460, 425, L("Bedroom", "Dormitorio"), "lbl lbl-room"), D.text(380, 175, L("Farmhouse (adobe)", "Casa de adobe"), "lbl"),
        D.text(180, 312, L("Smashed\nfront door", "Puerta\ndestrozada"), "lbl lbl-dim lbl-s"),
        // bloody footprints: living room > kitchen > back door > barn
        D.path("M320 330L380 262L440 250L530 245L620 242L700 242", "steps"),
        D.text(612, 228, L("Bloody footprints", "Huellas de sangre"), "lbl lbl-dim lbl-s"),
        // the red barn and the windmill tower
        D.rect(700, 150, 200, 180, "bld bld-barn"), D.line([[700, 150], [800, 110], [900, 150]]), D.door(700, 205, 700, 285),
        D.text(800, 100, L("Red barn", "Granero rojo"), "lbl"),
        D.circ(600, 150, 26, "tower"), D.path("M600 150l-26 -26M600 150l26 -26M600 150l-26 26M600 150l26 26", "wall"), D.text(600, 205, L("Windmill", "Molino"), "lbl lbl-dim lbl-s"),
        D.compass(945, 80),
      ],
      marks: [
        { x: 396, y: 252, n: L("Theresa", "Theresa"), k: "dead",
          note: L("Old ghoul, killed and pinned to the wall by the kitchen archway with a garden hoe. Her face and arms are badly bruised.",
                  "Necrófaga anciana, asesinada y clavada a la pared junto al arco de la cocina con una azada. Tiene la cara y los brazos llenos de golpes.") },
        { x: 300, y: 380, n: L("Smashed photo frames", "Marcos rotos"), k: "item",
          note: L("The living room is wrecked. Every photo has been taken out of its frame.", "El salón está destrozado. Han sacado todas las fotos de sus marcos.") },
        { x: 470, y: 280, n: L("Empty gun rack", "Armero vacío"), k: "item",
          note: L("Under the counter with the overturned drawer. Whatever gun it held is gone.", "Bajo la encimera del cajón volcado. El arma que guardaba ha desaparecido.") },
        { x: 465, y: 375, n: L("Locket and torn photos", "Medallón y fotos rotas"), k: "item",
          note: L("Glass and torn-up photos on the bed; a tin locket with Joseph's photo on the pillow. Only Theresa's clothes are in the closet.",
                  "Cristales y fotos rotas sobre la cama; un medallón de lata con la foto de Joseph en la almohada. En el armario solo hay ropa de Theresa.") },
        { x: 800, y: 245, n: L("Joseph", "Joseph"), k: "enemy",
          note: L("Act one. Old ghoul in a psychotic break, hiding in the barn with a loaded double-barrelled shotgun. He fires as soon as the door opens and fights until killed.",
                  "Acto uno. Necrófago anciano en pleno brote psicótico, escondido en el granero con una escopeta de dos cañones cargada. Dispara en cuanto se abre la puerta y lucha hasta morir.") },
      ],
    },

    // ============================================================ act two: the town
    bang_square: {
      title: L("Town square", "Plaza del pueblo"), w: 1000, h: 700, seed: 31, back: "bang_world",
      draw: r => [
        D.path("M500 350L120 60M500 350L880 60M500 350L120 660M500 350L880 660M500 350L500 700", "road"),
        D.circ(500, 350, 235, "geck"), D.trees(r, 290, 150, 710, 560, 26, 9),
        D.circ(500, 350, 62, "stone"), D.circ(500, 350, 40, "water-fill"), D.circ(500, 350, 18, "stone"),
        D.text(500, 440, L("Marble fountain", "Fuente de mármol"), "lbl lbl-dim lbl-s"),
        D.circ(655, 255, 38, "tree tree-big"), D.circ(680, 280, 26, "tree tree-big"), D.text(668, 330, L("Old tree", "Árbol viejo"), "lbl lbl-dim lbl-s"),
        D.rect(330, 300, 40, 14, "bench"), D.rect(630, 390, 40, 14, "bench"), D.rect(420, 470, 40, 14, "bench"),
        D.rect(60, 250, 70, 60), D.rect(40, 360, 80, 70), D.rect(870, 260, 80, 60), D.rect(880, 380, 70, 70), D.rect(330, 600, 70, 60), D.rect(600, 600, 80, 60),
        D.text(500, 140, L("Founders' Day party\n(act one, at night)", "Fiesta del Día de los Fundadores\n(acto uno, de noche)"), "lbl lbl-dim lbl-s"),
        D.compass(945, 80),
      ],
      marks: [
        { x: 440, y: 290, n: L("Jesse Pedigrue", "Jesse Pedigrue"), k: "npc",
          note: L("The mayor (or the militia chief). Sends you to the farm on Founders' Day night, waits here for your report and asks you to dig quietly around town the next day.",
                  "El alcalde (o el jefe de la milicia). Os manda a la granja la noche del Día de los Fundadores, espera aquí vuestro informe y os pide que investiguéis con discreción al día siguiente.") },
        { x: 575, y: 430, n: L("Townsfolk", "Vecinos"), k: "npc",
          note: L("Act two. Locals by the fountain. Ask for rumours (CHA + Speech, difficulty 1): Joseph hadn't been seen for weeks, people whisper he went feral, and the doctor visited the farm.",
                  "Acto dos. Vecinos junto a la fuente. Preguntad por rumores (CAR + Conversación, dificultad 1): hacía semanas que no se veía a Joseph, se dice que se volvió feral y el médico visitó la granja.") },
        { x: 380, y: 420, n: L("Townsfolk", "Vecinos"), k: "npc",
          note: L("Human neighbours are scared their ghoul neighbours will 'go feral' too.", "Los vecinos humanos temen que sus vecinos necrófagos también se vuelvan ferales.") },
        { x: 155, y: 85, n: L("To the pub", "Al pub"), k: "exit", go: "bang_pub" },
        { x: 845, y: 85, n: L("To the clinic", "A la clínica"), k: "exit", go: "bang_clinic" },
        { x: 155, y: 625, n: L("To the generator", "Al generador"), k: "exit", go: "bang_generator" },
        { x: 845, y: 625, n: L("To the trade post", "Al puesto comercial"), k: "exit", go: "bang_tradepost" },
      ],
    },

    bang_pub: {
      title: L("Pub", "Pub"), w: 1000, h: 700, seed: 41, back: "bang_world",
      draw: r => [
        D.grass(r, 0, 0, 1000, 700, 120),
        D.rect(150, 120, 700, 480), D.door(450, 600, 550, 600),
        D.rect(690, 120, 160, 130, "bld bld-in"), D.door(690, 165, 690, 205), D.text(770, 195, L("Store room", "Almacén"), "lbl lbl-room"),
        D.circ(500, 340, 112, "counter"), D.circ(500, 340, 72, "floor"),
        ...[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => D.circ((500 + Math.cos(i * 0.63) * 135).toFixed(1), (340 + Math.sin(i * 0.63) * 135).toFixed(1), 9, "stool")),
        D.text(500, 476, L("Circular bar", "Barra circular"), "lbl lbl-dim lbl-s"),
        D.rect(200, 132, 44, 30, "box"), D.rect(270, 132, 44, 30, "box"), D.rect(340, 132, 44, 30, "box"), D.text(292, 190, L("Old jukeboxes", "Gramolas viejas"), "lbl lbl-dim lbl-s"),
        D.circ(240, 420, 26, "table"), D.circ(250, 520, 26, "table"), D.circ(760, 430, 26, "table"), D.circ(750, 530, 26, "table"),
        D.path("M160 128L240 150L320 128L400 150L480 128L560 150L640 128", "lights"),
        D.text(170, 300, L("Road signs", "Señales de\ncarretera"), "lbl lbl-dim lbl-s lbl-l"),
        D.text(500, 650, L("To the square", "A la plaza"), "lbl lbl-dim lbl-s"),
        D.compass(945, 80),
      ],
      marks: [
        { x: 500, y: 330, n: L("Bartender", "Camarero"), k: "npc",
          note: L("Only gossips through a drinking game: moonshine shots at 3 caps (plus tip). After each shot ask a question with END + Speech, difficulty 1 + shots drunk. Knows Theresa drank here a lot lately, Joseph attacked the doctor three nights ago, and many regulars act strange.",
                  "Solo cotillea con un juego de beber: chupitos de licor casero a 3 chapas (más propina). Tras cada chupito se pregunta con RES + Conversación, dificultad 1 + chupitos tomados. Sabe que Theresa bebía mucho aquí, que Joseph atacó al médico hace tres noches y que muchos clientes actúan raro.") },
        { x: 395, y: 245, n: L("Regulars", "Clientes"), k: "npc", note: L("Locals at the bar. They know no useful gossip.", "Vecinos en la barra. No saben nada útil.") },
        { x: 620, y: 450, n: L("Regulars", "Clientes"), k: "npc", note: L("Locals at the bar. They know no useful gossip.", "Vecinos en la barra. No saben nada útil.") },
        { x: 500, y: 620, n: L("To the square", "A la plaza"), k: "exit", go: "bang_square" },
      ],
    },

    bang_clinic: {
      title: L("Clinic", "Clínica"), w: 1000, h: 700, seed: 51, back: "bang_world",
      draw: r => [
        D.grass(r, 0, 0, 1000, 700, 110),
        D.rect(120, 150, 760, 410),
        D.line([[420, 150], [420, 330]]), D.line([[420, 380], [420, 560]]), D.line([[420, 330], [880, 330]]), D.line([[420, 380], [880, 380]]),
        D.line([[650, 150], [650, 330]]), D.line([[650, 380], [650, 560]]),
        D.door(230, 560, 310, 560), D.door(120, 260, 120, 310), D.door(420, 333, 420, 377),
        ...[[480, 330], [710, 330], [480, 380], [710, 380]].map(([x, y]) => `<line class="curtain" x1="${x}" y1="${y}" x2="${x + 110}" y2="${y}"/>`),
        D.text(270, 175, L("Sitting room", "Sala de espera"), "lbl lbl-room"), D.text(650, 362, L("Hallway", "Pasillo"), "lbl lbl-room"),
        D.text(535, 175, L("Room one", "Sala uno"), "lbl lbl-room"), D.text(765, 175, L("Room two", "Sala dos"), "lbl lbl-room"),
        D.text(535, 548, L("Room three", "Sala tres"), "lbl lbl-room"), D.text(765, 548, L("Room four", "Sala cuatro"), "lbl lbl-room"),
        ...[[450, 200], [680, 200], [450, 410], [680, 410]].map(([x, y]) => D.rect(x, y, 70, 40, "box") + D.rect(x + 110, y + 70, 60, 30, "box")),
        D.rect(215, 300, 110, 36, "counter"), D.rect(215, 245, 110, 22, "box"),
        D.text(270, 610, L("Front door", "Entrada"), "lbl lbl-dim lbl-s"), D.text(75, 250, L("Side\ndoor", "Puerta\nlateral"), "lbl lbl-dim lbl-s"),
        D.compass(945, 80),
      ],
      marks: [
        { x: 270, y: 318, n: L("Front desk", "Mostrador"), k: "item",
          note: L("Files show an alarming number of new cases of memory trouble and sudden irrational behaviour.", "Los expedientes muestran un número alarmante de casos nuevos de pérdida de memoria y conductas irracionales repentinas.") },
        { x: 270, y: 256, n: L("Supply cabinet", "Armario de suministros"), k: "item",
          note: L("Locked (PER + Lockpick, difficulty 2): 3 Mentats, 2 Stimpaks and 2 RadAway.", "Cerrado con llave (PER + Forzar cerraduras, dificultad 2): 3 Mentats, 2 Estimulantes y 2 Antirradiación.") },
        { x: 535, y: 260, n: L("Room one", "Sala uno"), k: "item", note: L("Empty and freshly cleaned. Each room has a desk, a bed and 2 Stimpaks in the cupboard.", "Vacía y recién limpiada. Cada sala tiene un escritorio, una cama y 2 Estimulantes en el armario.") },
        { x: 765, y: 260, n: L("Catatonic boy", "Niño catatónico"), k: "npc",
          note: L("Seven-year-old son of a local woodworker, staring at the ceiling. He only ever answers \"Who?\".", "Hijo de siete años de un carpintero del pueblo, mirando al techo. Solo responde \"¿Quién?\".") },
        { x: 535, y: 470, n: L("Bloody sheets", "Sábanas ensangrentadas"), k: "item", note: L("An empty room; the bed sheets are stained with fresh blood.", "Una sala vacía; las sábanas tienen sangre fresca.") },
        { x: 765, y: 470, n: L("Doctor", "Médico"), k: "npc",
          note: L("Sobbing over a clipboard. Calm them first ((CHA or INT) + Speech, difficulty 0). A hidden device in the cold fusion generator is stealing memories and sending a signal; the clipboard has its coordinates. They are losing their memory too.",
                  "Llora abrazado a una carpeta. Primero hay que calmarle ((CAR o INT) + Conversación, dificultad 0). Un dispositivo oculto en el generador de fusión fría roba recuerdos y emite una señal; la carpeta tiene sus coordenadas. Él también está perdiendo la memoria.") },
        { x: 210, y: 470, n: L("Jesse Pedigrue\n(synth replica)", "Jesse Pedigrue\n(réplica sintética)"), k: "enemy",
          note: L("Act two, encounter 2A: when you come back to the sitting room, the mayor and several townsfolk are synth replicas, and they open fire.",
                  "Acto dos, encuentro 2A: al volver a la sala de espera, el alcalde y varios vecinos son réplicas sintéticas y abren fuego.") },
        { x: 345, y: 455, n: L("Synth replicas", "Réplicas sintéticas"), k: "enemy",
          note: L("As many as there are player characters (Jesse included); more can come in through the door each turn. They burst into sparks when destroyed.",
                  "Tantas como personajes jugadores (Jesse incluido); pueden entrar más por la puerta cada turno. Estallan en chispas al ser destruidas.") },
      ],
    },

    bang_tradepost: {
      title: L("Trade post", "Puesto comercial"), w: 1000, h: 700, seed: 61, back: "bang_world",
      draw: r => [
        D.grass(r, 0, 0, 1000, 700, 260, "grass grass-pale"),
        D.path("M0 640C300 630 600 650 1000 620", "road"),
        D.rect(180, 160, 640, 400), D.door(450, 560, 560, 560), D.path("M820 300l0 60", "gap"),
        D.line([[240, 260], [520, 260], [520, 320]], "counter-l"),
        D.rect(600, 200, 180, 22, "box"), D.rect(600, 260, 180, 22, "box"), D.rect(600, 320, 180, 22, "box"), D.text(690, 375, L("Empty shelves", "Estantes vacíos"), "lbl lbl-dim lbl-s"),
        D.rect(220, 430, 40, 40, "box"), D.rect(270, 450, 40, 40, "box"), D.rect(230, 480, 40, 40, "box"), D.text(265, 545, L("Crates", "Cajas"), "lbl lbl-dim lbl-s"),
        D.text(380, 240, L("Counter", "Mostrador"), "lbl lbl-room"),
        D.text(500, 140, L("Edge of town", "Linde del pueblo"), "lbl lbl-dim"),
        D.compass(940, 80),
      ],
      marks: [
        { x: 380, y: 300, n: L("Quartermaster", "Intendente"), k: "npc",
          note: L("Runs the trade post. Argues with the scavenger over a payment and can't remember Joseph or Theresa, who sold him tarberries all the time: partial amnesia (INT + Medicine, difficulty 2).",
                  "Lleva el puesto comercial. Discute con el chatarrero por un pago y no recuerda a Joseph ni a Theresa, que le vendían bayabrea a menudo: amnesia parcial (INT + Medicina, dificultad 2).") },
        { x: 470, y: 410, n: L("Scavenger", "Chatarrero"), k: "enemy",
          note: L("Brutish scavenger from Diamond City in road leathers. Says he's owed half a Stimpak shipment, draws his gun, then shoots the quartermaster and tries to flee town. He also noticed Joseph had stopped recognizing him.",
                  "Chatarrero bruto de Diamond City con cuero de carretera. Dice que le deben medio cargamento de Estimulantes, saca el arma, dispara al intendente e intenta huir del pueblo. También notó que Joseph ya no le reconocía.") },
        { x: 960, y: 610, n: L("Road to the\ncompound", "Camino al\ncomplejo"), k: "exit", go: "bang_compound" },
      ],
    },

    bang_generator: {
      title: L("Cold fusion generator", "Generador de fusión fría"), w: 1000, h: 700, seed: 71, back: "bang_world",
      draw: r => [
        D.grass(r, 0, 0, 1000, 700, 160),
        D.rect(150, 110, 700, 480, "fence"),
        D.path("M640 330L1000 250M640 380L1000 420M360 350L0 300", "cable"), D.text(900, 230, L("Power lines\nto town", "Tendido eléctrico\nal pueblo"), "lbl lbl-dim lbl-s"),
        D.rect(360, 220, 280, 250), D.circ(500, 345, 80, "reactor"), D.circ(500, 345, 50, "reactor"), D.circ(500, 345, 20, "reactor-core"),
        D.door(470, 470, 530, 470),
        D.rect(200, 180, 110, 70, "bld bld-in"), D.text(255, 275, L("G.E.C.K. systems", "Sistemas del G.E.C.K."), "lbl lbl-dim lbl-s"),
        D.text(500, 200, L("Generator house", "Caseta del generador"), "lbl"),
        D.compass(945, 80),
      ],
      marks: [
        { x: 500, y: 345, n: L("Cold fusion core", "Núcleo de fusión fría"), k: "item",
          note: L("The town's only power source able to run the G.E.C.K. systems. Shutting it down stops the memory theft, but probably ends the settlement.",
                  "La única fuente de energía capaz de mover los sistemas del G.E.C.K. Apagarlo detiene el robo de recuerdos, pero probablemente acaba con el pueblo.") },
        { x: 590, y: 425, n: L("Hidden Vault-Tec\ndevice", "Dispositivo oculto\nde Vault-Tec"), k: "item",
          note: L("An experimental device hijacked by the Institute. It steals the townsfolk's memories and sends them by signal to a compound. It can't be reached without wrecking the generator.",
                  "Un dispositivo experimental secuestrado por el Instituto. Roba los recuerdos de los vecinos y los envía por señal a un complejo. No se puede llegar a él sin destrozar el generador.") },
      ],
    },

    // ============================================================ act three: the Institute compound
    bang_compound: {
      title: L("Institute compound (outside)", "Complejo del Instituto (exterior)"), w: 1000, h: 700, seed: 81, back: "bang_world",
      draw: r => [
        D.grass(r, 0, 0, 1000, 700, 900, "grass grass-pale"),
        D.path("M500 700C480 640 520 580 500 470", "trail"), D.text(500, 690, L("Trail from town", "Camino desde el pueblo"), "lbl lbl-dim lbl-s"),
        D.rect(330, 170, 340, 300, "bld bld-steel"), D.door(445, 470, 555, 470), D.line([[445, 476], [555, 476]], "wall wall-thin"),
        D.text(500, 155, L("Steel building, no windows", "Edificio de acero sin ventanas"), "lbl"),
        D.rect(645, 160, 34, 34, "box"), D.path("M650 170h24M650 178h24M650 186h24", "wall wall-thin"),
        ...[[420, 540], [580, 540], [500, 590]].map(([x, y]) => D.circ(x, y, 12, "barrel") + D.path(`M${x - 6} ${y - 14}q6 -14 0 -22q10 8 6 22`, "flame")),
        D.text(660, 600, L("Fire barrels", "Bidones con fuego"), "lbl lbl-dim lbl-s"),
        D.compass(945, 80),
      ],
      marks: [
        { x: 455, y: 515, n: L("Synth strider", "Zancudo sintético"), k: "enemy",
          note: L("Act three, encounter 3A. Guards posing as Gunners by the fire barrels: friendly until you're close, then they open fire. Half as many as the player characters (rounded up); a silent alarm warns the chief scientist.",
                  "Acto tres, encuentro 3A. Guardias que se hacen pasar por Gunners junto a los bidones: amables hasta que estáis cerca y entonces abren fuego. La mitad que personajes jugadores (redondeando hacia arriba); una alarma silenciosa avisa al científico jefe.") },
        { x: 560, y: 515, n: L("Synth strider", "Zancudo sintético"), k: "enemy",
          note: L("More guards can join each round. They fight to the death.", "Pueden unirse más guardias cada asalto. Luchan hasta la muerte.") },
        { x: 662, y: 178, n: L("Air duct", "Conducto de aire"), k: "exit", go: "bang_compound_in",
          note: L("A silent, open duct at the corner, big enough even for a super mutant. Sneaking in takes AGI + Sneak tests, and PER + Repair to spot it.",
                  "Un conducto abierto y silencioso en la esquina, tan grande que cabe hasta un supermutante. Colarse pide pruebas de AGI + Sigilo, y PER + Reparación para encontrarlo.") },
        { x: 500, y: 455, n: L("Metal door", "Puerta de metal"), k: "exit", go: "bang_compound_in" },
      ],
    },

    bang_compound_in: {
      title: L("Institute compound (inside)", "Complejo del Instituto (interior)"), w: 1000, h: 700, seed: 91, back: "bang_compound",
      draw: r => [
        D.rect(60, 60, 880, 580, "bld bld-hall"),
        ...[[200, 130], [500, 110], [800, 130], [200, 570], [800, 570]].map(([x, y]) => D.circ(x, y, 16, "lamp") +
          D.path(`M${x - 28} ${y}h-12M${x + 28} ${y}h12M${x} ${y - 28}v-12M${x} ${y + 28}v12`, "wall wall-thin")),
        D.circ(560, 350, 230, "geck"), D.trees(r, 380, 200, 740, 500, 14, 8),
        D.rect(380, 175, 70, 50), D.rect(680, 175, 70, 50), D.rect(380, 470, 70, 50), D.rect(680, 470, 70, 50),
        D.circ(655, 258, 30, "tree tree-big"), D.text(655, 305, L("Copied tree", "Árbol copiado"), "lbl lbl-dim lbl-s"),
        D.path("M560 350m0 -10a10 10 0 1 1 -10 10a20 20 0 1 1 20 20a30 30 0 1 1 -30 -30a40 40 0 1 1 40 40a50 50 0 1 1 -50 -50", "spiral"),
        D.text(560, 105, L("Fake town square under artificial sunlight", "Plaza falsa bajo luz solar artificial"), "lbl lbl-dim lbl-s"),
        D.text(185, 300, L("Edge of\nthe compound", "Borde del\ncomplejo"), "lbl lbl-dim lbl-s"),
        D.door(500, 640, 600, 640), D.rect(905, 70, 30, 30, "box"),
        D.compass(70, 40),
      ],
      marks: [
        { x: 560, y: 350, n: L("Information core", "Núcleo de información"), k: "item",
          note: L("The tall spiral machine downloading the townsfolk's memories. Defense 2, 15 HP. Destroying it blasts its zone with 5 DC energy damage, cripples the replicas and ends the threat to the town.",
                  "La alta máquina en espiral que descarga los recuerdos de los vecinos. Defensa 2, 15 PV. Destruirla causa 5 DC de daño de energía en su zona, inutiliza a las réplicas y acaba con la amenaza para el pueblo.") },
        { x: 470, y: 560, n: L("Chief Scientist", "Científico jefe"), k: "enemy",
          note: L("Frail Institute scientist in a lab coat. Shows you his 'miracle' and offers a bargain: leave the town and the G.E.C.K. to him. If you fight, he tries to flee and escapes after his third turn.",
                  "Científico del Instituto enclenque con bata. Os enseña su 'milagro' y ofrece un trato: abandonad el pueblo y dejadle el G.E.C.K. Si hay pelea, intenta huir y escapa tras su tercer turno.") },
        { x: 470, y: 300, n: L("Townsfolk replicas", "Réplicas de vecinos"), k: "enemy",
          note: L("Synth copies of people from town, living out fake lives. Encounter 3B: twice as many as the player characters, counting your own copies.",
                  "Copias sintéticas de gente del pueblo que viven vidas falsas. Encuentro 3B: el doble que personajes jugadores, contando vuestras copias.") },
        { x: 660, y: 420, n: L("Townsfolk replicas", "Réplicas de vecinos"), k: "enemy",
          note: L("Synth copies of people from town, living out fake lives. Encounter 3B: twice as many as the player characters, counting your own copies.",
                  "Copias sintéticas de gente del pueblo que viven vidas falsas. Encuentro 3B: el doble que personajes jugadores, contando vuestras copias.") },
        { x: 175, y: 400, n: L("Your replicas", "Vuestras réplicas"), k: "enemy",
          note: L("Unfinished copies of the player characters, wandering like zombies. Each gets +1 Defense against the character it copies.",
                  "Copias a medio hacer de los personajes jugadores, que deambulan como zombis. Cada una tiene +1 de Defensa contra el personaje que copia.") },
        { x: 920, y: 85, n: L("Air duct", "Conducto de aire"), k: "exit", go: "bang_compound" },
        { x: 550, y: 625, n: L("Metal door", "Puerta de metal"), k: "exit", go: "bang_compound" },
      ],
    },
  };

  // ---------------------------------------------------------------- state and rendering
  let questId = null, mapId = null, view = null, sel = -1, wired = false, audio = null;
  const root = () => $("mp-root");

  function beep(kind) {
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === "suspended") audio.resume();
      const t = audio.currentTime, o = audio.createOscillator(), g = audio.createGain();
      o.type = "square";
      o.frequency.setValueAtTime(kind === "enemy" ? 520 : kind === "loc" || kind === "exit" ? 1180 : 880, t);
      if (kind === "loc" || kind === "exit") o.frequency.setValueAtTime(1560, t + 0.05);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.08, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.11);
      o.connect(g).connect(audio.destination);
      o.start(t); o.stop(t + 0.12);
    } catch (e) { /* no sound available */ }
  }

  const ICON = {
    loc: `<path class="ic" d="M0 -11L11 0L0 11L-11 0Z"/><circle class="ic fill" r="3.5"/>`,
    npc: `<circle class="ic fill" r="7"/>`,
    enemy: `<circle class="ic" r="10"/><path class="ic fill blink" d="M0 -6L6 0L0 6L-6 0Z"/>`,
    dead: `<path class="ic" d="M-8 -8L8 8M8 -8L-8 8"/>`,
    item: `<rect class="ic" x="-6.5" y="-6.5" width="13" height="13"/>`,
    exit: `<circle class="ic" r="10"/><path class="ic fill" d="M-4 -6L6 0L-4 6Z"/>`,
  };
  function markSvg(m, i) {
    const lines = String(T(m.n)).split("\n");
    return `<g class="mk mk-${m.k}${i === sel ? " on" : ""}" data-mk="${i}" transform="translate(${m.x},${m.y})"><g class="mk-in">
      <circle class="hit" r="22"/>${ICON[m.k]}<text y="25">${lines.map((s, j) => `<tspan x="0" dy="${j ? "1.1em" : 0}">${esc(s)}</tspan>`).join("")}</text></g></g>`;
  }

  function renderList() {
    questId = null; mapId = null;
    root().innerHTML = `<div class="mp-list">${QUESTS.map(q => `<button type="button" class="mp-quest" data-q="${q.id}">
      <span class="mp-q-ic" aria-hidden="true">&#9673;</span><span><b>${esc(T(q.name))}</b><small>${esc(T(q.blurb))}</small></span></button>`).join("")}</div>`;
    root().querySelectorAll("[data-q]").forEach(b => (b.onclick = () => { beep("loc"); openQuest(b.dataset.q); }));
  }

  function openQuest(id) { questId = id; openMap(QUESTS.find(q => q.id === id).start); }

  function openMap(id) {
    mapId = id; sel = -1;
    const m = MAPS[id], q = QUESTS.find(x => x.id === questId);
    const r = rng(m.seed);
    root().innerHTML = `
      <div class="mp-head">
        <button type="button" class="btn mp-back" id="mp-back">&#9664;&#xFE0E; ${esc(T(m.back ? (m.back === "bang_world" ? L("General map", "Mapa general") : MAPS[m.back].title) : L("Quests", "Misiones")))}</button>
        <div class="mp-title"><small>${esc(T(q.name))}</small><b>${esc(T(m.title))}</b></div>
      </div>
      <div class="mp-stage" id="mp-stage">
        <svg class="mp-svg" id="mp-svg" xmlns="http://www.w3.org/2000/svg" width="${m.w}" height="${m.h}" viewBox="0 0 ${m.w} ${m.h}">
          <defs>
            <pattern id="mp-hatch" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="10" height="10" class="hatch-bg"/><line x1="0" y1="0" x2="0" y2="10" class="hatch"/></pattern>
            <pattern id="mp-grid" width="50" height="50" patternUnits="userSpaceOnUse"><path d="M50 0H0V50" class="grid"/></pattern>
          </defs>
          <rect width="${m.w}" height="${m.h}" fill="url(#mp-grid)"/>
          <g class="mp-decor">${m.draw(r).join("")}</g>
          <g class="mp-marks">${m.marks.map(markSvg).join("")}</g>
          <rect class="mp-frame" x="2" y="2" width="${m.w - 4}" height="${m.h - 4}"/>
        </svg>
        <div class="mp-zoom">
          <button type="button" class="btn" id="mp-in" aria-label="${T(L("Zoom in", "Acercar"))}">+</button>
          <button type="button" class="btn" id="mp-out" aria-label="${T(L("Zoom out", "Alejar"))}">&minus;</button>
          <button type="button" class="btn" id="mp-fit" aria-label="${T(L("Show the whole map", "Ver el mapa entero"))}">&#9974;</button>
        </div>
      </div>
      <div class="mp-info" id="mp-info">${esc(T(m.back ? L("Tap a mark to see who or what is there.", "Toca una marca para ver quién o qué hay ahí.")
        : L("Tap a location to open its local map. Drag to move the map; pinch, use the mouse wheel or the buttons to zoom.",
            "Toca un lugar para abrir su mapa local. Arrastra para mover el mapa; pellizca, usa la rueda del ratón o los botones para hacer zoom.")))}</div>
      <div class="mp-legend">${Object.keys(KIND).filter(k => m.marks.some(x => x.k === k)).map(k =>
        `<span><svg viewBox="-13 -13 26 26" width="20" height="20" class="mp-svg-mini">${ICON[k]}</svg>${esc(T(KIND[k]))}</span>`).join("")}</div>
      <p class="hint mp-note">${esc(T(L("An approximate map made by this app from what the quest describes; the rulebook has no map for it.",
        "Un mapa aproximado hecho por esta app a partir de lo que describe la misión; el libro no trae mapa.")))}</p>`;
    $("mp-back").onclick = back;
    $("mp-in").onclick = () => zoomBy(1.4);
    $("mp-out").onclick = () => zoomBy(1 / 1.4);
    $("mp-fit").onclick = () => { fit(true); };
    wireStage();
    fit(false);
  }

  // ---------------------------------------------------------------- pan and zoom
  const stage = () => $("mp-stage"), svg = () => $("mp-svg");
  function limits() {
    const m = MAPS[mapId], s = stage();
    const contain = Math.min(s.clientWidth / m.w, s.clientHeight / m.h);
    return { min: contain * 0.9, max: Math.max(4, contain * 8), contain, cover: Math.max(s.clientWidth / m.w, s.clientHeight / m.h) };
  }
  // whole map visible (button), or on opening: filling the frame, centred on the marks
  function fit(whole) {
    const m = MAPS[mapId], s = stage(), lim = limits();
    let z = lim.contain, cx = m.w / 2, cy = m.h / 2;
    if (!whole && m.marks.length) {
      // as close as possible while every mark (and room for its name) stays in the frame
      const xs = m.marks.map(k => k.x), ys = m.marks.map(k => k.y);
      const bw = Math.max(...xs) - Math.min(...xs) + 220, bh = Math.max(...ys) - Math.min(...ys) + 200;
      z = Math.max(lim.contain, Math.min(lim.cover, lim.contain * 2.2, s.clientWidth / bw, s.clientHeight / bh));
      cx = (Math.min(...xs) + Math.max(...xs)) / 2; cy = (Math.min(...ys) + Math.max(...ys)) / 2 + 20;
    }
    view = { z, x: s.clientWidth / 2 - cx * z, y: s.clientHeight / 2 - cy * z };
    apply();
  }
  function apply() {
    const m = MAPS[mapId], s = stage(), lim = limits();
    view.z = Math.min(lim.max, Math.max(lim.min, view.z));
    // keep part of the map on screen: no edge may pass the middle of the frame
    const w = m.w * view.z, h = m.h * view.z, sw = s.clientWidth, sh = s.clientHeight;
    view.x = w <= sw ? (sw - w) / 2 : Math.min(sw * 0.35, Math.max(sw * 0.65 - w, view.x));
    view.y = h <= sh ? (sh - h) / 2 : Math.min(sh * 0.35, Math.max(sh * 0.65 - h, view.y));
    svg().style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.z})`;
    // marks and their names keep a readable size on screen (between 11 and 20 px text)
    const ls = Math.min(20 / (14 * view.z), Math.max(11 / (14 * view.z), 1 / Math.pow(view.z, 0.65))).toFixed(3);
    if (ls !== view.ls) { // scaled around each mark's own point (a transform attribute, not CSS, so the origin is the mark)
      view.ls = ls;
      // the tap area never reaches past ~48 map units, so close marks (the town's) don't overlap when zoomed out
      const hit = Math.min(22, 48 / ls).toFixed(1);
      svg().querySelectorAll(".mk-in").forEach(g => { g.setAttribute("transform", `scale(${ls})`); g.querySelector(".hit").setAttribute("r", hit); });
    }
  }
  function zoomAt(f, px, py) {
    const z0 = view.z;
    view.z = z0 * f;
    const lim = limits();
    view.z = Math.min(lim.max, Math.max(lim.min, view.z));
    const k = view.z / z0;
    view.x = px - (px - view.x) * k;
    view.y = py - (py - view.y) * k;
    apply();
  }
  const zoomBy = f => { const s = stage(); zoomAt(f, s.clientWidth / 2, s.clientHeight / 2); };

  function wireStage() {
    const s = stage(), pts = new Map();
    let moved = 0, pinch = null, downMark = null;
    const local = e => { const b = s.getBoundingClientRect(); return { x: e.clientX - b.left, y: e.clientY - b.top }; };
    s.addEventListener("pointerdown", e => {
      if (e.target.closest(".mp-zoom")) return;
      s.setPointerCapture(e.pointerId);
      pts.set(e.pointerId, local(e));
      if (pts.size === 1) { moved = 0; downMark = e.target.closest("[data-mk]"); s.classList.add("drag"); }
      if (pts.size === 2) {
        const [a, b] = [...pts.values()];
        pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, z: view.z, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, vx: view.x, vy: view.y };
        downMark = null;
      }
    });
    s.addEventListener("pointermove", e => {
      if (!pts.has(e.pointerId)) return;
      const p = local(e), prev = pts.get(e.pointerId);
      pts.set(e.pointerId, p);
      if (pts.size === 1) {
        view.x += p.x - prev.x; view.y += p.y - prev.y;
        moved += Math.abs(p.x - prev.x) + Math.abs(p.y - prev.y);
        apply();
      } else if (pts.size === 2 && pinch) {
        const [a, b] = [...pts.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y) || 1, mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        const lim = limits(), z = Math.min(lim.max, Math.max(lim.min, pinch.z * d / pinch.d));
        // the map point that was under the fingers' midpoint stays under it
        const ux = (pinch.mx - pinch.vx) / pinch.z, uy = (pinch.my - pinch.vy) / pinch.z;
        view.z = z; view.x = mx - ux * z; view.y = my - uy * z;
        moved += 99;
        apply();
      }
    });
    const up = e => {
      if (!pts.has(e.pointerId)) return;
      pts.delete(e.pointerId);
      if (pts.size < 2) pinch = null;
      if (!pts.size) {
        s.classList.remove("drag");
        if (downMark && moved < 8 && e.type === "pointerup") tap(+downMark.dataset.mk);
        downMark = null;
      }
    };
    s.addEventListener("pointerup", up);
    s.addEventListener("pointercancel", up);
    s.addEventListener("wheel", e => { e.preventDefault(); const p = local(e); zoomAt(Math.exp(-e.deltaY * 0.0015), p.x, p.y); }, { passive: false });
    // keyboard: marks are reachable with Tab and open with Enter
    svg().querySelectorAll("[data-mk]").forEach(g => {
      g.setAttribute("tabindex", "0"); g.setAttribute("role", "button");
      g.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); tap(+g.dataset.mk); } });
    });
  }

  function tap(i) {
    const m = MAPS[mapId], mk = m.marks[i];
    beep(mk.k);
    if (mk.go && (mk.k === "loc" || !mk.note)) { openMap(mk.go); return; }
    sel = i;
    svg().querySelectorAll("[data-mk]").forEach(g => g.classList.toggle("on", +g.dataset.mk === i));
    $("mp-info").innerHTML = `<b>${esc(T(mk.n).replace(/\n/g, " "))}</b> <span class="mp-kind">${esc(T(KIND[mk.k]))}</span>
      ${mk.note ? `<div>${esc(T(mk.note))}</div>` : ""}
      ${mk.go ? `<button type="button" class="btn mp-go" id="mp-go">&#9654;&#xFE0E; ${esc(T(MAPS[mk.go].title))}</button>` : ""}`;
    if (mk.go) $("mp-go").onclick = () => { beep("exit"); openMap(mk.go); };
  }

  // back: local map > its parent map > quest list; false when already on the list (leave the page)
  function back() {
    if (!mapId) return false;
    const m = MAPS[mapId];
    beep("exit");
    if (m.back) openMap(m.back); else renderList();
    return true;
  }

  function show() {
    if (!wired) {
      wired = true;
      window.addEventListener("resize", () => { if (mapId && $("mp-stage")) apply(); });
    }
    if (mapId) openMap(mapId); else renderList();
  }

  return { show, back };
})();
