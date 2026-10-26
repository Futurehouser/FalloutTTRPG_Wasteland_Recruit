// Hack a terminal: a RobCo password minigame in the style of Fallout 4. Words of the same length hide
// in a dump of memory garbage; a wrong guess costs one attempt and reports its Likeness (letters in
// the right position). Bracket pairs like (..) or [..] on one line remove a dud or reset the attempts.
const Hack = (() => {
  const $h = id => document.getElementById(id);
  const TRIES = 3, LINES = 16, COLS = 12; // two columns of 16 lines x 12 characters
  const LEVELS = { novice: [5, 10], advanced: [6, 12], expert: [7, 14], master: [8, 16] }; // word length, word count
  const JUNK = "!@#$%^&*-_=+;:'\",./?|\\~`";
  const OPEN = "([{<", CLOSE = ")]}>";

  // password lists (one string per language; words are grouped by length when used)
  const WORDS = {
    en: `STEEL PLANT POWER RADIO CHAIR HOUSE WATER NUKES GHOUL BRAIN SCRAP BLAST GUARD TOWER LASER ROBOT VAULT TRADE CRATE SKULL
      STORM TRUCK SMOKE FLAME HEART LIGHT NIGHT BONES METAL PLATE STONE SHARE SPARE STARE SCARE SNARE SHADE GRADE TRACE PLACE
      SPACE GRACE BRAVE GRAVE CRANE CRASH TRASH FLASH CLASH SLASH
      SYSTEM SECRET SIGNAL DANGER HUNTER RAIDER SETTLE BATTLE BOTTLE CATTLE RATTLE MUTANT RADIUM STRIKE STRIPE STROKE SPIRIT
      POISON PRISON PERSON REASON SEASON BEACON WEAPON CANNON CANYON TUNNEL FUNNEL BARREL BARTER MASTER MATTER LATTER LETTER
      BETTER BITTER BUTTER HAMMER HOLDER FOLDER CORNER BURNER TURRET TARGET GARDEN WARDEN HARDEN FROZEN ATOMIC ENERGY PLANET
      ROCKET POCKET SOCKET LOCKET
      BROTHER MACHINE NUCLEAR REACTOR FISSION WARFARE WELFARE SCANNER SPANNER MANNERS PLANNER CAPTAIN CERTAIN CURTAIN CONTAIN
      CONTROL COUNSEL SURVIVE SUPPORT PRIVATE PROTECT PROJECT PRODUCT CONDUCT CONSENT CONTENT CONTEXT CONTEST CONQUER MONSTER
      MINUTES MISSION MISSILE FASHION PASSION SESSION OPINION MILLION BILLION VILLAIN GENERAL MINERAL FEDERAL SPECIAL SEVERAL
      HOSTILE FERTILE DEFENSE OFFENSE LICENSE COMPASS CRYSTAL PATRIOT SOCIETY VARIETY ANXIETY FREEDOM KINGDOM
      SECURITY MILITARY ELEMENTS MOVEMENT MONUMENT DOCUMENT PLATFORM PROTOCOL TERMINAL CRIMINAL ORIGINAL NATIONAL RATIONAL
      INVASION DIVISION DECISION REVISION VISITORS MONITORS CONTROLS MUTATION ROTATION LOCATION VACATION DURATION ISOLATED
      INSULATE RADIATOR OPERATOR GENERATE SEPARATE DESOLATE ABSOLUTE ADEQUATE ACCURATE DELICATE OVERRIDE OVERSEER VOLATILE
      HOSPITAL CAPACITY PRESSURE TREASURE MEASURES FEATURES CREATURE CAPTURED FRACTURE`,
    es: `ARMAS BALAS CAJAS CASAS CAMAS PASOS VASOS RADIO PODER SALUD CARNE NUBES MUROS PUROS DUROS FUEGO JUEGO LUEGO RUEDA PLATA
      PLAZA PLAYA TORRE TORPE CORTE NORTE CAMPO ACERO MOTOR LUCES VOCES PECES NOCHE COCHE LECHE BOMBA TUMBA ROBOT CLAVE NAVES
      LLAVE GRAVE LETAL METAL NIVEL PAPEL CIELO HIELO SUELO DUELO VUELO PELEA MARCA BARCA CERCA
      ACCESO CODIGO PUERTA SUERTE MUERTE FUERTE TIEMPO CUERPO CUERDA MIEDOS RIESGO BUNKER SEGURO OSCURO FUTURO MADURO PLANTA
      CUARTO PUERTO MUERTO CIERTO CAMINO VECINO MOLINO MARINO PADRES MADRES FUSION NUCLEO ATOMOS CIUDAD VERDAD TORRES CRANEO
      PIEDRA MADERA CADENA CARGAS BALCON CAMION RACION NACION ESTADO ESPADA ESCUDO SENSOR MOTIVO ACTIVO NOCIVO SALIDA SUBIDA
      HERIDA BEBIDA COMIDA MEDIDA
      SISTEMA ARCHIVO PELIGRO SOLDADO REFUGIO ENERGIA BATERIA BANDERA MOTORES DESTINO CANCION PRISION ESTUDIO MENSAJE PERDIDA
      PARTIDA ABIERTO CABALLO MAQUINA MEMORIA CONTROL PROCESO REACTOR MUTANTE NUCLEAR RADIADO ATOMICO SECRETO DECRETO PLANETA
      CAPITAN GUARDIA SALVAJE PASAJES PAISAJE VIAJERO ARQUERO GUERRAS TIERRAS SIERRAS CERROJO ESPEJOS CONSEJO CONEJOS VENENOS
      TERRENO MODERNO
      CASTILLO HISTORIA VICTORIA PROGRESO PROYECTO CONCRETO CONTRATO TORMENTA LENGUAJE GUERRERO GOBIERNO INVIERNO INFIERNO
      DESIERTO TERMINAL MUTACION ESTACION OPERADOR GENERADO ELEVADOR PANTALLA BATALLAS MEDALLAS CABALLOS PERSONAL ESPECIAL
      ORIGINAL MATERIAL CRIMINAL HOSPITAL ENTRADAS SALVADOR DESTRUIR DESCARGA RECARGAR CERRADOS ARMADURA CRIATURA AVENTURA
      ESCRITOR ESPACIAL`,
  };
  const wordsOf = len => WORDS[LANG === "es" ? "es" : "en"].split(/\s+/).filter(w => w.length === len);
  const likeness = (a, b) => [...a].filter((ch, i) => ch === b[i]).length;

  // ------------------------------------------------------------------ sound (synthesized, no files)
  let audio = null;
  let soundOn = (() => { try { return localStorage.getItem("wr_hack_sound") !== "off"; } catch (e) { return true; } })();
  function tone(freq, start, dur, type = "square", vol = 0.06) {
    if (!soundOn) return;
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === "suspended") audio.resume();
      const t0 = audio.currentTime + start, osc = audio.createOscillator(), g = audio.createGain();
      osc.type = type; osc.frequency.setValueAtTime(freq, t0);
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(vol, t0 + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(g).connect(audio.destination);
      osc.start(t0); osc.stop(t0 + dur + 0.02);
    } catch (e) { /* no audio on this device */ }
  }
  const sfx = {
    tick: () => tone(2400, 0, 0.018, "square", 0.015),                        // moving over the screen
    beep: () => { tone(1250, 0, 0.05); tone(1650, 0.05, 0.06); },             // a word or bracket is entered
    denied: () => tone(190, 0.13, 0.16, "sawtooth", 0.04),                    // wrong password
    success: () => [880, 1175, 1480, 1760].forEach((f, i) => tone(f, 0.12 + i * 0.09, 0.12, "square", 0.06)),
    locked: () => [520, 390, 260].forEach((f, i) => tone(f, 0.15 + i * 0.16, 0.2, "sawtooth", 0.05)),
  };

  // ------------------------------------------------------------------ a new terminal
  let G = null; // the current game
  function newGame() {
    const [len, count] = LEVELS[$h("hk-level").value] || LEVELS.advanced;
    const all = wordsOf(len).sort(() => rnd() - 0.5);
    const answer = all[0];
    // decoys: favour words that share letters with the password, so the Likeness clues matter
    const pool = all.slice(1), picked = [];
    while (picked.length < count - 1 && pool.length) {
      const w = wpick(pool, pool.map(x => 1 + likeness(x, answer) ** 2));
      picked.push(w); pool.splice(pool.indexOf(w), 1);
    }
    const words = [answer, ...picked].sort(() => rnd() - 0.5);

    // memory dump: one word in each slice of the dump, garbage everywhere else
    const total = 2 * LINES * COLS, chars = Array.from({ length: total }, () => choice(JUNK)), owner = new Array(total).fill(-1);
    const seg = Math.floor(total / words.length);
    words.forEach((w, i) => {
      const at = i * seg + randint(1, seg - w.length - 1);
      [...w].forEach((ch, k) => { chars[at + k] = ch; owner[at + k] = i; });
    });
    // a few bracket pairs inside single lines, in the garbage between words
    for (let n = 0, guard = 0; n < randint(4, 6) && guard < 200; guard++) {
      const line = randint(0, 2 * LINES - 1), a = line * COLS + randint(0, COLS - 3), b = a + randint(2, COLS - 1 - (a % COLS));
      if (b >= (line + 1) * COLS) continue;
      if (owner.slice(a, b + 1).some(o => o >= 0)) continue;
      const k = randint(0, 3);
      chars[a] = OPEN[k]; chars[b] = CLOSE[k]; n++;
    }
    G = { words, answer, chars, owner, tries: TRIES, removed: new Set(), used: new Set(), log: [], over: false,
          start: 0xF000 + randint(0, 0xA0) * COLS, armed: null };
    render();
  }

  // the bracket sequence that starts at index i (same line, no letters in between), or null
  function bracketAt(i) {
    const k = OPEN.indexOf(G.chars[i]);
    if (k < 0 || G.used.has(i)) return null;
    const lineEnd = (Math.floor(i / COLS) + 1) * COLS;
    for (let j = i + 1; j < lineEnd; j++) {
      if (G.owner[j] >= 0 && !G.removed.has(G.owner[j])) return null;
      if (G.chars[j] === CLOSE[k]) return [i, j];
    }
    return null;
  }

  // ------------------------------------------------------------------ drawing
  const hex = n => "0x" + n.toString(16).toUpperCase();
  function charHtml(i) {
    const o = G.owner[i];
    if (o >= 0) return G.removed.has(o) ? `<span class="c">.</span>` : `<span class="c w" data-w="${o}" data-i="${i}">${G.chars[i]}</span>`;
    const ch = G.used.has(i) ? "." : G.chars[i];
    return `<span class="c${bracketAt(i) ? " b" : ""}" data-i="${i}">${esc(ch)}</span>`;
  }
  function columnHtml(col) {
    let h = "";
    for (let l = 0; l < LINES; l++) {
      const line = col * LINES + l;
      h += `<div class="hk-line"><span class="addr">${hex(G.start + line * COLS)}</span> `;
      for (let c = 0; c < COLS; c++) h += charHtml(line * COLS + c);
      h += "</div>";
    }
    return h;
  }
  function triesHtml() {
    return `${T("{n} ATTEMPT(S) LEFT:", { n: G.tries })} <span class="hk-blocks">${"&#9632; ".repeat(G.tries)}</span>`;
  }
  function logHtml() {
    return G.log.slice(-15).map(l => `<div>&gt;${esc(l)}</div>`).join("") +
      `<div class="hk-input">&gt;<span id="hk-sel">${esc(G.armed ? G.armed.text : "")}</span><span class="cursor">&#9608;</span></div>`;
  }
  function render() {
    $h("hk-screen").innerHTML = `
      <div class="hk-head">${T("ROBCO INDUSTRIES (TM) TERMLINK PROTOCOL")}<br>${T("ENTER PASSWORD NOW")}</div>
      <div class="hk-warn" id="hk-warn">${G.tries === 1 ? T("!!! WARNING: LOCKOUT IMMINENT !!!") : "&nbsp;"}</div>
      <div class="hk-tries" id="hk-tries">${triesHtml()}</div>
      <div class="hk-body"><div class="hk-dump" id="hk-dump"><div class="hk-col">${columnHtml(0)}</div><div class="hk-col">${columnHtml(1)}</div></div>
        <div class="hk-log" id="hk-log">${logHtml()}</div></div>
      <div class="hk-end" id="hk-end" hidden></div>`;
    wire();
  }
  const refresh = () => { // redraw after a guess without losing the screen's place
    $h("hk-dump").innerHTML = `<div class="hk-col">${columnHtml(0)}</div><div class="hk-col">${columnHtml(1)}</div>`;
    $h("hk-tries").innerHTML = triesHtml();
    $h("hk-warn").innerHTML = G.tries === 1 ? T("!!! WARNING: LOCKOUT IMMINENT !!!") : "&nbsp;";
    $h("hk-log").innerHTML = logHtml();
    $h("hk-log").scrollTop = 1e6;
    wire();
  };

  // what the pointer is on: a whole word, a bracket sequence or one character
  function targetOf(el) {
    const span = el && el.closest && el.closest("#hk-dump .c[data-i]");
    if (!span) return null;
    const i = +span.dataset.i;
    if (span.dataset.w != null) {
      const w = +span.dataset.w;
      return { kind: "word", w, text: G.words[w], cells: [...$h("hk-dump").querySelectorAll(`[data-w="${w}"]`)] };
    }
    const br = bracketAt(i);
    if (br) {
      const cells = [];
      for (let j = br[0]; j <= br[1]; j++) cells.push($h("hk-dump").querySelector(`[data-i="${j}"]`) || null);
      return { kind: "bracket", i, text: G.chars.slice(br[0], br[1] + 1).join(""), cells: cells.filter(Boolean) };
    }
    return { kind: "junk", text: G.chars[i], cells: [span] };
  }
  function highlight(t) {
    $h("hk-dump").querySelectorAll(".on").forEach(c => c.classList.remove("on"));
    if (t) t.cells.forEach(c => c.classList.add("on"));
    if ($h("hk-sel")) $h("hk-sel").textContent = t ? t.text : "";
  }

  function wire() {
    const dump = $h("hk-dump");
    let last = null;
    dump.onpointermove = e => {
      if (G.over || e.pointerType !== "mouse") return;
      const t = targetOf(e.target);
      const key = t ? t.cells[0] : null;
      if (key !== last) { last = key; if (t) sfx.tick(); G.armed = t; highlight(t); }
    };
    dump.onpointerleave = e => { if (e.pointerType === "mouse" && !G.over) { last = null; G.armed = null; highlight(null); } };
    dump.onclick = e => {
      if (G.over) return;
      const t = targetOf(e.target);
      if (!t) return;
      // touch: the first tap selects, a second tap on the same thing enters it
      if (!e.pointerType || e.pointerType !== "mouse") {
        const same = G.armed && G.armed.text === t.text && G.armed.cells[0] === t.cells[0];
        if (!same) { G.armed = t; highlight(t); sfx.tick(); return; }
      }
      enter(t);
    };
  }

  // ------------------------------------------------------------------ guesses
  function enter(t) {
    sfx.beep();
    G.armed = null;
    if (t.kind === "junk") { G.log.push(t.text, T("Error")); refresh(); return; }
    if (t.kind === "bracket") {
      G.used.add(t.i);
      const duds = G.words.map((w, i) => i).filter(i => G.words[i] !== G.answer && !G.removed.has(i));
      G.log.push(t.text);
      if ((G.tries < TRIES && rnd() < 0.3) || !duds.length) { G.tries = TRIES; G.log.push(T("Allowance replenished.")); }
      else { G.removed.add(choice(duds)); G.log.push(T("Dud removed.")); }
      refresh(); return;
    }
    if (t.text === G.answer) {
      G.over = true;
      G.log.push(t.text, T("Exact match!"), T("Please wait while system is accessed."));
      refresh(); sfx.success();
      setTimeout(() => finish(true), 900);
      return;
    }
    G.tries--;
    G.log.push(t.text, T("Entry denied."), T("Likeness={n}", { n: likeness(t.text, G.answer) }));
    if (G.tries <= 0) {
      G.over = true;
      G.log.push(T("Lockout in progress."));
      refresh(); sfx.locked();
      setTimeout(() => finish(false), 700);
    } else { refresh(); sfx.denied(); }
  }

  function finish(won) {
    const end = $h("hk-end");
    end.innerHTML = won
      ? `<div class="hk-big">${T("You hacked the terminal")}</div><div class="hk-sub">${T("Password: {w}", { w: esc(G.answer) })}</div>
         <button class="hk-btn" id="hk-again">[ ${T("Hack another terminal")} ]</button>`
      : `<div class="hk-big">${T("You failed")}</div><div class="hk-sub">${T("TERMINAL LOCKED. The password was {w}.", { w: esc(G.answer) })}</div>
         <button class="hk-btn" id="hk-again">[ ${T("Try again")} ]</button>`;
    end.hidden = false;
    $h("hk-again").onclick = () => { sfx.beep(); newGame(); };
  }

  function setup() {
    $h("hk-new").onclick = () => { sfx.beep(); newGame(); };
    $h("hk-level").onchange = newGame;
    const snd = $h("hk-sound");
    const paint = () => (snd.textContent = soundOn ? T("🔊 Sound on") : T("🔇 Sound off"));
    snd.onclick = () => {
      soundOn = !soundOn; paint();
      try { localStorage.setItem("wr_hack_sound", soundOn ? "on" : "off"); } catch (e) { /* only this session */ }
      sfx.beep();
    };
    paint();
  }
  function show() { if (!G) newGame(); }
  return { setup, show, newGame, likeness, wordsOf };
})();
Hack.setup();
if (typeof currentPage !== "undefined" && currentPage === "hack") Hack.show();
