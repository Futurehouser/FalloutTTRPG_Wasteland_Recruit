// My Team: the characters your players are using right now. Each one gets a little pixel-art
// wastelander (human, ghoul, super mutant or robot) that walks along the bottom of the Home and
// My Team pages (and of the Combat Assistant during a fight), stopping now and then to idle. The Combat Assistant can load the whole team.

// ------------------------------------------------------------------ sprites
// Original pixel art drawn in code: one walk cycle and one idle loop of 4 frames per race,
// every frame facing right (the stage mirrors them to walk left).
const Sprites = (() => {
  const FW = 32, FH = 40, GROUND = 39, CX = 16;
  const RACES = {
    human: { legW: 3, legH: 8, torsoW: 8, torsoH: 8, headW: 8, headH: 8, armW: 2, armH: 8, lean: 0,
      c: { skin: "#f1c39a", skinD: "#d39b70", hair: "#6b3f1d", top: "#2f5fa8", topD: "#21457c", trim: "#f3c13a",
           legs: "#2f5fa8", legsD: "#21457c", boots: "#3a2a1e", eye: "#1b1b1b", hand: "#f1c39a" } },
    ghoul: { legW: 3, legH: 8, torsoW: 8, torsoH: 8, headW: 8, headH: 8, armW: 2, armH: 8, lean: 1,
      c: { skin: "#c69a63", skinD: "#8f6235", hair: "#4a311c", top: "#6b4a2e", topD: "#4a311c", trim: "#8c6a45",
           legs: "#4d4033", legsD: "#372e25", boots: "#2a211a", eye: "#f4e7a1", hand: "#c69a63" } },
    mutant: { legW: 4, legH: 9, torsoW: 12, torsoH: 11, headW: 9, headH: 9, armW: 3, armH: 11, lean: 1,
      c: { skin: "#7fa648", skinD: "#5a7d32", hair: "#5a7d32", top: "#7fa648", topD: "#5a7d32", trim: "#5a3a1e",
           legs: "#5a3a1e", legsD: "#422915", boots: "#2e2219", eye: "#f7e15a", hand: "#7fa648" } },
    robot: { legW: 2, legH: 9, torsoW: 10, torsoH: 9, headW: 8, headH: 7, armW: 2, armH: 9, lean: 0,
      c: { skin: "#b9c3cb", skinD: "#6d7782", hair: "#6d7782", top: "#9aa6b0", topD: "#66717c", trim: "#4f5963",
           legs: "#7d8892", legsD: "#59636d", boots: "#3b434b", eye: "#7df0e3", hand: "#59636d" } },
  };

  // pose: lf/lb = front/back foot offset, liftF/liftB = foot raised, af/ab = hand swing, bob = upper body drop
  const WALK = [
    { lf: 2, lb: -2, af: -2, ab: 2, bob: 1 },
    { lf: 0, lb: 0, liftB: 1, af: 0, ab: 0, bob: 0 },
    { lf: -2, lb: 2, af: 2, ab: -2, bob: 1 },
    { lf: 0, lb: 0, liftF: 1, af: 0, ab: 0, bob: 0 },
  ];
  const IDLE = [
    { lf: 0, lb: 0, af: 0, ab: 0, bob: 0 },
    { lf: 0, lb: 0, af: 0, ab: 0, bob: 0, light: 1 },
    { lf: 0, lb: 0, af: 0, ab: 0, bob: 1, light: 1 },
    { lf: 0, lb: 0, af: 0, ab: 0, bob: 1, blink: 1 },
  ];

  function drawFrame(race, pose) {
    const R = RACES[race], c = R.c;
    const cv = document.createElement("canvas");
    cv.width = FW; cv.height = FH;
    const g = cv.getContext("2d");
    const px = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
    const bob = pose.bob || 0;
    const hipY = GROUND - R.legH + 1;
    const torsoTop = hipY - R.torsoH + bob, torsoL = CX - (R.torsoW >> 1);
    const headTop = torsoTop - R.headH, headL = CX - (R.headW >> 1) + R.lean;

    function leg(off, lift, dark) {
      const x0 = CX - (R.legW >> 1) + (dark ? -1 : 1), foot = GROUND - (lift || 0), len = foot - hipY;
      for (let r = 0; r <= len; r++) {
        const x = x0 + Math.round((off * r) / len), y = hipY + r;
        const boot = r >= len - 1;
        px(x, y, R.legW, 1, boot ? c.boots : dark ? c.legsD : c.legs);
        if (r === len && race !== "robot") px(x + R.legW, y, 1, 1, c.boots); // toe
        if (r === len && race === "robot") px(x - 1, y, R.legW + 3, 1, c.boots); // flat foot plate
      }
    }
    function arm(swing, dark) {
      const x0 = CX - (R.armW >> 1) + (dark ? -1 : 0), y0 = torsoTop + 1;
      for (let r = 0; r < R.armH; r++) {
        const x = x0 + Math.round((swing * r) / R.armH), hand = r >= R.armH - 2;
        let col = hand ? c.hand : dark ? c.topD : c.top;
        if (race === "mutant" && !hand) col = dark ? c.skinD : c.skin;
        if (dark && hand) col = c.skinD;
        px(x, y0 + r, R.armW, 1, col);
      }
      if (race === "robot") px(x0 + swing - (dark ? 1 : 0), y0 + R.armH, 1, 1, c.trim); // claw
    }

    // back limbs first, then body, then near limbs
    arm(pose.ab, true);
    leg(pose.lb, pose.liftB, true);
    px(torsoL, torsoTop, R.torsoW, R.torsoH, c.top);
    px(torsoL, torsoTop, 1, R.torsoH, c.topD); // shaded back edge
    leg(pose.lf, pose.liftF, false);

    // torso details
    if (race === "human") {
      px(torsoL, torsoTop, R.torsoW, 1, c.trim);                  // collar
      px(torsoL + R.torsoW - 2, torsoTop, 1, R.torsoH, c.trim);   // zip stripe
      px(torsoL, torsoTop + R.torsoH - 2, R.torsoW, 1, "#5a4a2a"); // belt
    } else if (race === "ghoul") {
      px(torsoL + 2, torsoTop + 3, 2, 1, c.skinD); px(torsoL + 5, torsoTop + 5, 1, 2, c.skinD); // holes in the rags
      px(torsoL, torsoTop + R.torsoH - 1, R.torsoW, 1, c.topD);
      px(torsoL + 1, torsoTop + R.torsoH, 1, 1, c.top); px(torsoL + 5, torsoTop + R.torsoH, 1, 1, c.top); // frayed hem
    } else if (race === "mutant") {
      for (let i = 0; i < R.torsoH - 2; i++) px(torsoL + 2 + Math.round(i * 0.8), torsoTop + i, 2, 1, c.trim); // harness strap
      px(torsoL, torsoTop + R.torsoH - 2, R.torsoW, 2, c.trim);    // belt
      px(torsoL + R.torsoW - 3, torsoTop + 3, 2, 1, c.skinD);      // chest line
    } else {
      px(torsoL + 1, torsoTop + 1, R.torsoW - 2, 1, c.skin);       // highlight
      px(torsoL + R.torsoW - 5, torsoTop + 3, 4, 3, c.trim);       // front panel
      px(torsoL + R.torsoW - 4, torsoTop + 4, 1, 1, "#e04a3a");
      px(torsoL + R.torsoW - 3, torsoTop + 4, 1, 1, pose.light ? "#5ad16c" : "#f3c13a");
      px(torsoL, torsoTop + R.torsoH - 1, R.torsoW, 1, c.trim);
    }

    // head
    const eyeX = headL + R.headW - 3, eyeY = headTop + (R.headH >> 1) - (race === "mutant" ? 0 : 1);
    if (race === "robot") {
      px(headL, headTop, R.headW, R.headH, c.top);
      px(headL, headTop, R.headW, 1, c.skin);
      px(headL + 2, headTop + 2, R.headW - 2, 3, "#18323a");                 // visor
      px(headL + R.headW - 4, headTop + 3, 3, 1, pose.blink ? "#3a8f88" : c.eye);
      px(CX, headTop - 3, 1, 3, c.trim);                                     // antenna
      px(CX, headTop - 4, 1, 1, pose.light ? "#ff6b4a" : "#7a2a1e");
      px(headL - 1, headTop + 2, 1, 3, c.topD);                              // ear bolt
    } else {
      px(headL, headTop, R.headW, R.headH, c.skin);
      px(headL, headTop + R.headH - 1, 2, 1, c.skinD);                       // jaw shade
      px(headL + 2, headTop + (R.headH >> 1), 1, 2, c.skinD);                // ear
      px(eyeX, eyeY, 1, pose.blink ? 1 : 2, pose.blink ? c.skinD : c.eye);
      if (race === "human") {
        px(headL, headTop, R.headW, 2, c.hair); px(headL, headTop, 2, 5, c.hair); px(headL + R.headW - 1, headTop + 2, 1, 1, c.hair);
        px(headL + R.headW, eyeY + 2, 1, 1, c.skin);                         // nose
        px(headL + R.headW - 3, headTop + R.headH - 2, 2, 1, "#a8665a");     // mouth
      } else if (race === "ghoul") {
        px(eyeX - 1, eyeY - 1, 3, 1, c.skinD);                               // sunken brow
        px(headL + 1, headTop + 1, 2, 1, c.skinD); px(headL + 4, headTop + 2, 1, 2, c.skinD); px(headL + 5, headTop + R.headH - 3, 2, 1, c.skinD);
        px(headL + 2, headTop - 1, 1, 1, c.hair); px(headL + 5, headTop - 1, 1, 1, c.hair);   // last few hairs
        px(headL + R.headW - 3, headTop + R.headH - 2, 3, 1, "#3a2414");     // teeth gap
        px(headL + R.headW - 2, headTop + R.headH - 2, 1, 1, "#efe4c2");
      } else {
        px(eyeX - 2, eyeY - 1, 4, 1, c.skinD);                               // heavy brow
        px(headL + 1, headTop, R.headW - 2, 1, c.skinD);
        px(headL + R.headW, headTop + R.headH - 3, 1, 3, c.skin);            // big jaw
        px(headL + R.headW - 3, headTop + R.headH - 2, 3, 1, "#3a2a1a");
        px(headL + R.headW - 2, headTop + R.headH - 3, 1, 1, "#f3ecd2");     // tusk
      }
    }
    arm(pose.af, false);
    return cv;
  }

  const cache = {};
  function sheet(race) {
    if (!RACES[race]) race = "human";
    if (!cache[race]) cache[race] = { walk: WALK.map(p => drawFrame(race, p)), idle: IDLE.map(p => drawFrame(race, p)) };
    return cache[race];
  }
  return { sheet, FW, FH, races: Object.keys(RACES) };
})();

// ------------------------------------------------------------------ the walking stage
// Home and My Team show the team; the Combat Assistant shows whoever is in the running fight.
// Tapping a sprite (Home / My Team only) hits it: it jumps and flashes red, and after as many hits
// as the character's max HP it falls, vanishes and comes back a second later. In a fight the sprites
// react to the damage the Combat Assistant applies, and a downed character stays gone.
const Walkers = (() => {
  let cv = null, raf = null, last = 0, team = [], fight = [], swallow = false;
  const scale = () => (window.innerWidth < 560 ? 2 : 3);
  const HEAD_TOP = { human: 16, ghoul: 16, mutant: 11, robot: 11 }; // first drawn row of each sprite
  const JUMP = 0.35, FLASH = 0.4, FALL = 0.35, LIE = 1.0, FADE = 0.6, RESPAWN = 1.0, SPAWN = 0.45;

  function make(id, race, name, width) {
    return { id, race, name, x: 20 + Math.random() * Math.max(40, width - 80), dir: Math.random() < 0.5 ? -1 : 1,
             speed: 26 + Math.random() * 18, state: "walk", timer: 2 + Math.random() * 4, frame: 0, ft: 0,
             life: "alive", lt: 0, respawn: true, hits: 0, jump: 0, flash: 0, pops: [] };
  }
  const maxHpOf = c => c.maxHp || c.special.END + c.special.LCK;

  function sync(chars) {
    const keep = {};
    team.forEach(w => (keep[w.id] = w));
    team = chars.map(c => {
      const k = keep[c.id] || make(c.id, null, c.name, window.innerWidth);
      return Object.assign(k, { race: c.race || raceFromOrigin(c.origin), name: c.name, maxHp: maxHpOf(c) });
    });
    update();
  }

  // the Combat Assistant reports its party after every change; null when no fight is running
  function setFight(players, fightId) {
    if (!players) { fight = []; update(); return; }
    const keep = {};
    fight.forEach(w => (keep[w.id] = w));
    fight = players.map(p => {
      const id = (fightId || "fight") + ":" + p.uid, c = ROSTER.find(x => x.id === p.charId);
      let k = keep[id];
      const down = p.status !== "up" || p.hp <= 0;
      if (!k) {
        k = make(id, c ? c.race || raceFromOrigin(c.origin) : "human", p.name, window.innerWidth);
        k.respawn = false;
        if (down) k.life = "gone";
      } else {
        if (p.hp < k.hp) hit(k, k.hp - p.hp);
        if (down && (k.life === "alive" || k.life === "spawning")) die(k, false);
        if (!down && (k.life === "gone" || k.life === "falling")) revive(k); // healed back up
      }
      k.hp = p.hp; k.name = p.name;
      return k;
    });
    update();
  }

  // a short punch: a falling thump plus a burst of noise; robots also ring like struck metal
  let audio = null;
  function hitSound(race, big) {
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === "suspended") audio.resume();
      const t0 = audio.currentTime, vol = big ? 0.5 : 0.35;
      const o = audio.createOscillator(), og = audio.createGain();
      o.type = "sine"; o.frequency.setValueAtTime(race === "mutant" ? 130 : 180, t0); o.frequency.exponentialRampToValueAtTime(45, t0 + 0.14);
      og.gain.setValueAtTime(vol, t0); og.gain.exponentialRampToValueAtTime(0.001, t0 + 0.18);
      o.connect(og).connect(audio.destination); o.start(t0); o.stop(t0 + 0.2);
      const len = Math.floor(audio.sampleRate * 0.08), buf = audio.createBuffer(1, len, audio.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const n = audio.createBufferSource(), f = audio.createBiquadFilter(), ng = audio.createGain();
      n.buffer = buf; f.type = "lowpass"; f.frequency.value = race === "robot" ? 3500 : 1600; ng.gain.value = vol * 0.8;
      n.connect(f).connect(ng).connect(audio.destination); n.start(t0);
      if (race === "robot") {
        const m = audio.createOscillator(), mg = audio.createGain();
        m.type = "triangle"; m.frequency.setValueAtTime(1250, t0);
        mg.gain.setValueAtTime(0.12, t0); mg.gain.exponentialRampToValueAtTime(0.001, t0 + 0.35);
        m.connect(mg).connect(audio.destination); m.start(t0); m.stop(t0 + 0.36);
      }
    } catch (e) { /* no audio on this device */ }
  }

  function hit(k, amount) {
    if (k.life !== "alive") return;
    hitSound(k.race, amount >= 5);
    k.jump = JUMP; k.flash = FLASH;
    k.pops.push({ text: "-" + amount, t: 0 });
  }
  function die(k, respawn) { k.life = "falling"; k.lt = 0; k.jump = 0; k.respawn = respawn; }
  function revive(k) { k.life = "spawning"; k.lt = 0; k.hits = 0; k.x = 20 + Math.random() * Math.max(40, (cv ? cv.clientWidth : 300) - 80); }

  const onTeamPage = () => currentPage === "home" || currentPage === "team";
  const active = () => (onTeamPage() ? team : currentPage === "combat" ? fight : []);

  function update() {
    cv = cv || $("walkers");
    if (!cv) return;
    const on = active().length > 0;
    cv.hidden = !on;
    document.body.classList.toggle("walkers-on", on);
    if (on && !raf) { last = performance.now(); raf = requestAnimationFrame(tick); }
  }

  // ---------------- tapping a sprite (Home / My Team)
  function box(k) {
    const s = scale(), r = cv.getBoundingClientRect(), dh = Sprites.FH * s;
    const top = r.top + cv.clientHeight - dh - 4 + HEAD_TOP[k.race] * s;
    return { l: r.left + k.x - 9 * s, r: r.left + k.x + 9 * s, t: top, b: r.top + cv.clientHeight - 2 };
  }
  window.addEventListener("pointerdown", e => {
    if (!cv || cv.hidden || !onTeamPage()) return;
    const k = team.slice().sort((a, b) => b.x - a.x).find(k => {
      if (k.life !== "alive") return false;
      const b = box(k);
      return e.clientX >= b.l && e.clientX <= b.r && e.clientY >= b.t && e.clientY <= b.b;
    });
    if (!k) return;
    e.stopPropagation(); // the tile or button under the sprite doesn't get it
    swallow = true; setTimeout(() => (swallow = false), 500);
    k.hits++;
    hit(k, 1);
    if (k.hits >= k.maxHp) die(k, true);
  }, true);
  window.addEventListener("click", e => { if (swallow) { swallow = false; e.stopPropagation(); e.preventDefault(); } }, true);

  // a red copy of a frame, for the hit flash
  const reds = new WeakMap();
  function red(img) {
    let r = reds.get(img);
    if (!r) {
      r = document.createElement("canvas"); r.width = img.width; r.height = img.height;
      const g = r.getContext("2d");
      g.drawImage(img, 0, 0);
      g.globalCompositeOperation = "source-atop"; g.fillStyle = "rgba(255,40,30,.75)"; g.fillRect(0, 0, r.width, r.height);
      reds.set(img, r);
    }
    return r;
  }

  function step(k, dt, w, half) {
    k.jump = Math.max(0, k.jump - dt); k.flash = Math.max(0, k.flash - dt);
    k.pops.forEach(p => (p.t += dt)); k.pops = k.pops.filter(p => p.t < 0.9);
    if (k.life !== "alive") {
      k.lt += dt;
      if (k.life === "falling" && k.lt > FALL + LIE + FADE) { k.life = "gone"; k.lt = 0; }
      else if (k.life === "gone" && k.respawn && k.lt > RESPAWN) revive(k);
      else if (k.life === "spawning" && k.lt > SPAWN) { k.life = "alive"; k.lt = 0; }
      return;
    }
    // walk, and now and then stop to idle; turn at the edges or on a whim
    k.timer -= dt;
    if (k.timer <= 0) {
      if (k.state === "walk") { k.state = "idle"; k.timer = 1.5 + Math.random() * 3; }
      else { k.state = "walk"; k.timer = 2.5 + Math.random() * 5; if (Math.random() < 0.4) k.dir = -k.dir; }
      k.frame = 0;
    }
    if (k.state === "walk" && !k.jump) {
      k.x += k.dir * k.speed * dt;
      if (k.x < half) { k.x = half; k.dir = 1; }
      if (k.x > w - half) { k.x = w - half; k.dir = -1; }
    }
    k.x = Math.min(Math.max(k.x, half), Math.max(half, w - half));
    k.ft += dt;
    const fps = k.state === "walk" ? 8 : 2.5;
    if (k.ft >= 1 / fps) { k.ft = 0; k.frame = (k.frame + 1) % 4; }
  }

  function draw(g, k, s, h) {
    if (k.life === "gone") return;
    const dw = Sprites.FW * s, dh = Sprites.FH * s, sheet = Sprites.sheet(k.race);
    let img = k.life === "alive" ? sheet[k.state][k.frame] : sheet.idle[0];
    if (k.flash && Math.floor(k.flash * 16) % 2 === 0) img = red(img);
    const lift = k.jump ? Math.sin((Math.PI * (JUMP - k.jump)) / JUMP) * 7 * s : 0;
    let angle = 0, alpha = 1, drop = 0;
    if (k.life === "falling") {
      angle = k.dir * (Math.PI / 2) * Math.min(1, k.lt / FALL);
      if (k.lt > FALL + LIE) { const f = (k.lt - FALL - LIE) / FADE; alpha = (Math.floor(k.lt * 14) % 2 ? 0.25 : 1) * (1 - f); }
    }
    if (k.life === "spawning") { const p = k.lt / SPAWN; alpha = p; drop = (1 - p) * 14 * s; }
    g.globalAlpha = alpha;
    g.fillStyle = "#0006";
    g.beginPath(); g.ellipse(k.x, h - 6, dw * (angle ? 0.4 : 0.24) * (lift ? 0.75 : 1), 3, 0, 0, Math.PI * 2); g.fill();
    g.save();
    g.translate(k.x, h - 4 - lift - drop); // the feet
    g.rotate(angle);
    g.scale(k.dir < 0 ? -1 : 1, 1);
    g.drawImage(img, -dw / 2, -dh, dw, dh);
    g.restore();
    const headY = h - 4 - dh + HEAD_TOP[k.race] * s - lift - drop;
    if (k.life === "alive" || k.life === "spawning") {
      g.font = "bold 11px Segoe UI, Roboto, sans-serif";
      g.textAlign = "center";
      const label = k.name.length > 16 ? k.name.slice(0, 15) + "…" : k.name;
      const tw = g.measureText(label).width + 8, ty = headY - 18;
      g.fillStyle = "#000a"; g.fillRect(Math.round(k.x - tw / 2), ty - 1, tw, 15);
      g.fillStyle = "#f0be28"; g.fillText(label, k.x, ty + 10);
    }
    // damage numbers float up
    g.font = "900 15px Segoe UI, Roboto, sans-serif"; g.textAlign = "center";
    k.pops.forEach((p, i) => {
      g.globalAlpha = alpha * (1 - p.t / 0.9);
      g.fillStyle = "#000"; g.fillText(p.text, k.x + 13 + i * 4 + 1, headY - 20 - p.t * 30 + 1);
      g.fillStyle = "#ff4a3a"; g.fillText(p.text, k.x + 13 + i * 4, headY - 20 - p.t * 30);
    });
    g.globalAlpha = 1;
  }

  function tick(now) {
    const list = active();
    if (!list.length) { raf = null; update(); return; }
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    const s = scale(), w = cv.clientWidth, h = cv.clientHeight, dpr = window.devicePixelRatio || 1;
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    const g = cv.getContext("2d");
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    g.imageSmoothingEnabled = false;
    const half = (Sprites.FW * s) / 2;
    list.forEach(k => step(k, dt, w, half));
    // draw back to front so nobody's name tag hides under a neighbour
    list.slice().sort((a, b) => a.x - b.x).forEach(k => draw(g, k, s, h));
    raf = requestAnimationFrame(tick);
  }
  return { sync, setFight, update };
})();

// ------------------------------------------------------------------ the My Team page
const Team = (() => {
  const MAX = 8;
  let TEAM = [];        // [{ id, player }]
  let loaded = false;   // nothing is shown or saved before the saved team has been read
  const chars = () => TEAM.map(t => ROSTER.find(c => c.id === t.id)).filter(Boolean);

  // called once the saved characters are loaded
  async function load() {
    try {
      const saved = await Platform.loadJSON("team", null);
      if (Array.isArray(saved) && saved.some(t => t && ROSTER.some(c => c.id === t.id))) TEAM = saved.filter(t => t && t.id);
      else TEAM = ROSTER.filter(c => c.team).sort((a, b) => a.team - b.team).map(c => ({ id: c.id, player: c.player || "" })); // the backup in the profiles
    } catch (e) { console.error(e); }
    loaded = true; // never leave the page stuck on "Loading…"
    Walkers.sync(chars());
    render(); // the page may already be open
  }
  // saved twice: in its own file, and as a mark on each member's profile in case that file can't be read
  async function store() {
    let marked = false;
    ROSTER.forEach(c => {
      const i = TEAM.findIndex(t => t.id === c.id), team = i + 1, player = i >= 0 ? TEAM[i].player || "" : "";
      if ((c.team || 0) === team && (c.player || "") === player) return;
      if (team) Object.assign(c, { team, player }); else { delete c.team; delete c.player; }
      marked = true;
    });
    const ok = await Platform.saveJSON("team", TEAM);
    if (marked) await storeRoster();
    if (!ok) toast(T("Warning: could not save the team"));
  }
  // drop characters that were deleted from Saved Characters
  function prune() {
    if (!loaded) return;
    const before = TEAM.length;
    TEAM = TEAM.filter(t => ROSTER.some(c => c.id === t.id));
    if (TEAM.length !== before) store();
  }
  function changed() { store(); Walkers.sync(chars()); render(); }

  function add(id) {
    if (!loaded || !id || TEAM.some(t => t.id === id)) return;
    if (TEAM.length >= MAX) { toast(T("A team can have up to {n} characters", { n: MAX })); return; }
    TEAM.push({ id, player: "" });
    const c = ROSTER.find(x => x.id === id);
    toast(T("{name} joined the team", { name: c ? c.name : "" }));
    changed();
  }
  function remove(id) {
    if (!loaded) return;
    const c = ROSTER.find(x => x.id === id);
    TEAM = TEAM.filter(t => t.id !== id);
    if (c) toast(T("{name} left the team", { name: c.name }));
    changed();
  }

  function weaponLine(c) {
    const ws = (c.weapons || []).filter(w => typeof WEAPONS_FOR_COMBAT === "undefined" || WEAPONS_FOR_COMBAT[w.name]);
    return ws.length ? ws.map(w => `<span class="chip">${esc(T(w.name))}</span>`).join("") : `<span class="muted">${T("No weapons set. Add them in the character's profile.")}</span>`;
  }

  function render() {
    if (currentPage !== "team") return;
    if (!loaded) { $("tm-add").disabled = true; $("tm-list").innerHTML = `<div class="empty">${T("Loading…")}</div>`; return; }
    const sel = $("tm-pick"), free = ROSTER.filter(c => !TEAM.some(t => t.id === c.id)).sort((a, b) => a.name.localeCompare(b.name));
    sel.innerHTML = free.length
      ? free.map(c => `<option value="${esc(c.id)}">${esc(c.name)} (${T("level {n}", { n: c.level || 1 })})</option>`).join("")
      : `<option value="">${T(ROSTER.length ? "Everyone is already on the team" : "No saved characters yet")}</option>`;
    $("tm-add").disabled = !free.length || TEAM.length >= MAX;
    const list = $("tm-list"), team = chars();
    if (!team.length) {
      list.innerHTML = `<div class="empty">${T("Nobody on the team yet.<br><br>Pick a saved character above and tap <b>Add to team</b>. Each one gets a little wastelander walking along the bottom of the screen.")}</div>`;
      return;
    }
    list.innerHTML = `<p class="hint">${TP(team.length, "{n} character on the team.", "{n} characters on the team.")}</p>` + team.map(c => {
      const t = TEAM.find(x => x.id === c.id), s = c.special, hp = c.maxHp || autoMaxHp(s);
      return `<div class="card tm-card"><div class="tm-head"><div class="avatar" data-av="${esc(c.id)}"></div>
          <div class="tm-who"><b>${esc(c.name)}</b><small>${esc(c.origin || T("Unknown origin"))} &middot; ${T("Level")} ${c.level || 1}</small>
            <input type="text" class="tm-player" data-player="${esc(c.id)}" maxlength="40" placeholder="${T("Played by…")}" value="${esc(t.player || "")}"></div>
          <div class="tm-btns"><button class="btn" data-open="${esc(c.id)}" title="${T("Open profile")}">&#128100;</button>
            <button class="btn danger" data-rm="${esc(c.id)}" title="${T("Remove from the team")}">&#10005;</button></div></div>
        <div class="statgrid tm-special">${G.SPECIAL.map(a => `<div class="stat"><b>${s[a]}</b><small>${T(a)}</small></div>`).join("")}</div>
        <div class="tm-derived"><span>${T("HP")} <b>${hp}</b></span><span>${T("Defense")} <b>${s.AGI >= 9 ? 2 : 1}</b></span>
          <span>${T("Initiative")} <b>${s.PER + s.AGI}</b></span><span>${T("Luck points")} <b>${s.LCK}</b></span></div>
        <div class="tm-weapons">${weaponLine(c)}</div></div>`;
    }).join("");
    list.querySelectorAll("[data-av]").forEach(el => setAvatar(el, ROSTER.find(x => x.id === el.dataset.av)));
    list.querySelectorAll("[data-rm]").forEach(b => (b.onclick = () => remove(b.dataset.rm)));
    list.querySelectorAll("[data-open]").forEach(b => (b.onclick = () => { openProfileId = b.dataset.open; showPage("roster"); }));
    list.querySelectorAll("[data-player]").forEach(inp => (inp.onchange = () => {
      const t = TEAM.find(x => x.id === inp.dataset.player);
      if (t) { t.player = inp.value.trim(); store(); }
    }));
  }

  $("tm-add").onclick = () => add($("tm-pick").value);
  return { load, render, chars, prune: () => { prune(); Walkers.sync(chars()); }, MAX };
})();
