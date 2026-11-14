// My Team: the characters your players are using right now. Each one gets a little pixel-art
// wastelander (human, ghoul, super mutant or robot) that walks along the bottom of the Home and
// My Team pages (and of the Combat Assistant during a fight), stopping now and then to idle. The Combat Assistant can load the whole team.

// ------------------------------------------------------------------ sprites
// Original pixel art drawn in code: one walk cycle and one idle loop of 4 frames per look (the four kinds, plus a
// raider and power armor for humans and a floating Mister Handy for robots),
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
    // more looks for humans (a raider, and a big suit of power armor) and robots (a floating Mister Handy)
    raider: { legW: 3, legH: 8, torsoW: 8, torsoH: 8, headW: 8, headH: 8, armW: 2, armH: 8, lean: 0,
      c: { skin: "#e0b48a", skinD: "#b98a5f", hair: "#b22e1e", top: "#5a3a22", topD: "#3e2716", trim: "#c9ced2",
           legs: "#4a3a2c", legsD: "#33281e", boots: "#1e1914", eye: "#f4e7a1", hand: "#e0b48a" } },
    powerarmor: { legW: 4, legH: 9, torsoW: 12, torsoH: 11, headW: 9, headH: 9, armW: 4, armH: 11, lean: 0,
      c: { skin: "#a3aa86", skinD: "#6b7156", hair: "#5d634b", top: "#8a9070", topD: "#5d634b", trim: "#3a3e2e",
           legs: "#7d8466", legsD: "#5d634b", boots: "#3a3e2e", eye: "#f3a13a", hand: "#5d634b" } },
    handy: { c: { body: "#b9c3cb", lite: "#e3e9ee", dark: "#6d7782", line: "#3b434b", eye: "#f2f4f5", pupil: "#1b1b1b", fire1: "#ffd23f", fire2: "#ff7a2f" } },
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

  // Mister Handy: a metal sphere with three eye stalks and three arms, hovering on a downward jet
  function drawHandy(pose, i) {
    const c = RACES.handy.c, cv = document.createElement("canvas");
    cv.width = FW; cv.height = FH;
    const g = cv.getContext("2d");
    const px = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
    const cx = 16, cy = 20 + [0, 1, 1, 0][i % 4], r = 8;
    // the jet and its flame, which flickers frame to frame
    px(cx - 2, cy + r - 1, 5, 3, c.dark); px(cx - 1, cy + r + 2, 3, 1, c.line);
    const flame = [5, 7, 6, 8][i % 4];
    for (let k = 0; k < flame; k++) {
      const w = Math.max(1, 3 - Math.floor(k / 3));
      px(cx + 1 - Math.ceil(w / 2) + (k % 2 && k > 3 ? 1 : 0), cy + r + 3 + k, w, 1, k < 2 ? "#fff6c2" : k < 4 ? c.fire1 : c.fire2);
    }
    // the back arm, reaching down and back, with a claw
    const line = (x0, y0, x1, y1, col) => { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)); for (let k = 0; k <= n; k++) px(Math.round(x0 + ((x1 - x0) * k) / n), Math.round(y0 + ((y1 - y0) * k) / n), 1, 1, col); };
    const sw = pose.af || 0;
    line(cx - 5, cy + 4, cx - 9 - sw, cy + 11, c.dark); px(cx - 10 - sw, cy + 11, 1, 2, c.line); px(cx - 8 - sw, cy + 12, 1, 1, c.line);
    // the sphere
    for (let y = -r; y <= r; y++) {
      const half = Math.round(Math.sqrt(r * r - y * y));
      px(cx - half, cy + y, half * 2 + 1, 1, y > r - 3 ? c.dark : c.body);
      px(cx - half, cy + y, 1, 1, c.dark);
    }
    px(cx + 1, cy - 6, 4, 2, c.lite); px(cx + 4, cy - 4, 2, 2, c.lite);   // shine
    px(cx - r, cy, r * 2 + 1, 1, c.line);                                   // seam
    px(cx - 3, cy + 2, 2, 1, c.line); px(cx + 2, cy + 2, 2, 1, c.line);     // rivets
    // three eye stalks: back, top and front
    const eye = (sx, sy, ex, ey) => {
      for (let k = 0; k <= 3; k++) px(Math.round(sx + ((ex - sx) * k) / 3), Math.round(sy + ((ey - sy) * k) / 3), 1, 1, c.dark);
      px(ex - 1, ey - 1, 3, 3, c.line); px(ex - 1, ey - 1, 2, 2, pose.blink ? c.dark : c.eye);
      if (!pose.blink) px(ex, ey, 1, 1, c.pupil);
    };
    eye(cx - 3, cy - r + 1, cx - 7, cy - r - 3);
    eye(cx, cy - r, cx, cy - r - 4);
    eye(cx + 4, cy - r + 1, cx + 8, cy - r - 2);
    // the front arms: a pincer reaching forward and a buzzsaw lower down, swinging a little
    line(cx + 6, cy + 3, cx + 11 + sw, cy + 8, c.dark);
    px(cx + 11 + sw, cy + 7, 2, 1, c.line); px(cx + 11 + sw, cy + 9, 2, 1, c.line);                 // pincer
    line(cx + 3, cy + 6, cx + 7 - sw, cy + 12, c.dark);
    const sx = cx + 7 - sw, sy = cy + 13, spin = i % 2;
    px(sx - 1, sy - 1, 3, 3, "#8c98a3"); px(sx, sy, 1, 1, c.line);
    px(sx - 2, sy - 1 + spin, 1, 1, c.lite); px(sx + 2, sy + 1 - spin, 1, 1, c.lite); px(sx - 1 + spin, sy - 2, 1, 1, c.lite); // saw teeth
    return cv;
  }

  function drawFrame(race, pose, i) {
    if (race === "handy") return drawHandy(pose, i);
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
      if (race === "powerarmor") px(x0 - 1, y0, R.armW + 2, 2, dark ? c.trim : c.skin); // pauldron
    }

    // back limbs first, then body, then near limbs
    if (race === "powerarmor") { px(torsoL - 3, torsoTop + 1, 3, 7, c.trim); px(torsoL - 2, torsoTop + 2, 1, 2, "#f3c13a"); } // backpack and fusion core
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
    } else if (race === "raider") {
      for (let i = 0; i < R.torsoH - 1; i++) px(torsoL + 1 + Math.min(i, R.torsoW - 2), torsoTop + i, 1, 1, c.topD); // bandolier
      px(torsoL - 1, torsoTop - 1, 4, 2, c.trim); px(torsoL, torsoTop - 2, 1, 1, c.trim); px(torsoL + 2, torsoTop - 2, 1, 1, c.trim); // spiked shoulder
      px(torsoL, torsoTop + R.torsoH - 2, R.torsoW, 1, "#2a1a0e");  // belt
    } else if (race === "powerarmor") {
      px(torsoL + 1, torsoTop + 1, R.torsoW - 2, 1, c.skin);       // top highlight
      px(torsoL + 3, torsoTop + 3, R.torsoW - 4, 4, c.skin);       // chest plate
      px(torsoL + 4, torsoTop + 4, R.torsoW - 6, 1, c.topD); px(torsoL + 4, torsoTop + 6, R.torsoW - 6, 1, c.topD);
      px(torsoL, torsoTop + R.torsoH - 2, R.torsoW, 2, c.trim);    // waist joint
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
    if (race === "powerarmor") {
      px(headL, headTop + 1, R.headW, R.headH - 1, c.top);                    // helmet
      px(headL + 1, headTop, R.headW - 2, 1, c.top);
      px(headL + 3, headTop - 1, 2, 4, c.skin);                               // crest
      px(headL + 2, headTop + 3, R.headW - 2, 2, "#1d2b30");                  // visor slit
      px(headL + R.headW - 4, headTop + 3, 3, 1, pose.blink ? "#7a4a1e" : c.eye);
      px(headL + 3, headTop + 6, R.headW - 3, 3, c.topD);                     // grille
      px(headL + 4, headTop + 6, 1, 3, c.trim); px(headL + 6, headTop + 6, 1, 3, c.trim);
      px(headL, headTop + 5, 2, 2, c.trim);                                   // filter
      px(headL + 1, headTop + 2, 1, 1, pose.light ? "#f7e15a" : "#8a7a3a");   // headlamp
    } else if (race === "robot") {
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
      if (race === "raider") {
        px(headL, headTop, R.headW, 1, c.skinD);                             // shaved sides
        px(headL + 2, headTop - 2, 4, 2, c.hair); px(headL + 3, headTop - 3, 2, 1, c.hair); // mohawk
        px(headL + 2, eyeY, R.headW - 2, 1, "#1b1b1b");                      // war paint
        px(eyeX, eyeY, 1, 1, pose.blink ? "#1b1b1b" : c.eye);
        px(headL + R.headW, eyeY + 2, 1, 1, c.skin);                         // nose
        px(headL + R.headW - 3, headTop + R.headH - 2, 3, 1, "#7a2a1e");     // sneer
        px(headL + 3, headTop + R.headH - 3, 1, 2, "#9c3a2a");               // scar
      } else if (race === "human") {
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
    if (!cache[race]) cache[race] = { walk: WALK.map((p, i) => drawFrame(race, p, i)), idle: IDLE.map((p, i) => drawFrame(race, p, i)) };
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
  let cv = null, raf = null, last = 0, team = [], fight = [], talker = null, swallow = false;
  const scale = () => (window.innerWidth < 560 ? 2 : 3);
  const HEAD_TOP = { human: 16, ghoul: 16, mutant: 11, robot: 11, raider: 14, powerarmor: 10, handy: 8 }; // first drawn row of each sprite
  const look = k => k.sprite || k.race; // the sprite the character picked (raider, power armor, Mister Handy) or their kind's
  const JUMP = 0.35, FLASH = 0.4, FALL = 0.35, LIE = 1.0, FADE = 0.6, RESPAWN = 1.0, SPAWN = 0.45, EXPLODE = 1.4;

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
      return Object.assign(k, { race: c.race || raceFromOrigin(c.origin), sprite: spriteFor(c), name: c.name, maxHp: maxHpOf(c) });
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
        k.sprite = c ? spriteFor(c) : null;
        k.respawn = false;
        if (down) k.life = "gone";
      } else {
        if (p.hp < k.hp) hit(k, k.hp - p.hp);
        if (down && (k.life === "alive" || k.life === "spawning")) die(k, false);
        if (!down && k.life !== "alive" && k.life !== "spawning") revive(k); // healed back up
      }
      k.hp = p.hp; k.name = p.name;
      return k;
    });
    update();
  }

  // the one sprite on the Talking Heads page. It never comes back on its own, and onGone runs once it has vanished.
  function setTalker(c, onGone) {
    if (!c) talker = null;
    else talker = Object.assign(make("elber:" + c.id, c.race || raceFromOrigin(c.origin), c.name, window.innerWidth), { sprite: spriteFor(c), respawn: false, onGone });
    update();
  }
  function talkerHit(dies, n) {
    if (!talker) return;
    hit(talker, n || 1);
    if (dies) die(talker, false);
  }
  function talkerRevive() { if (talker) revive(talker); }

  // a short punch: a falling thump plus a burst of noise; robots also ring like struck metal
  let audio = null;
  function ctx() {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === "suspended") audio.resume();
    return audio;
  }
  function noise(a, secs) {
    const len = Math.floor(a.sampleRate * secs), buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const n = a.createBufferSource(); n.buffer = buf;
    return n;
  }
  function hitSound(race, big) {
    try {
      ctx();
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

  // going down: a dying groan that sinks in pitch, then the thud of the body hitting the floor
  function fallSound(race) {
    try {
      const a = ctx(), t0 = a.currentTime, base = { ghoul: 190, mutant: 115 }[race] || 230;
      const o = a.createOscillator(), f = a.createBiquadFilter(), og = a.createGain();
      o.type = "sawtooth"; o.frequency.setValueAtTime(base, t0); o.frequency.exponentialRampToValueAtTime(base * 0.4, t0 + FALL + 0.1);
      f.type = "lowpass"; f.frequency.value = race === "ghoul" ? 1500 : 850;
      og.gain.setValueAtTime(0.0001, t0); og.gain.exponentialRampToValueAtTime(0.2, t0 + 0.04); og.gain.exponentialRampToValueAtTime(0.001, t0 + FALL + 0.15);
      o.connect(f).connect(og).connect(a.destination); o.start(t0); o.stop(t0 + FALL + 0.2);
      const t1 = t0 + FALL;
      const b = a.createOscillator(), bg = a.createGain();
      b.type = "sine"; b.frequency.setValueAtTime(115, t1); b.frequency.exponentialRampToValueAtTime(35, t1 + 0.25);
      bg.gain.setValueAtTime(0.6, t1); bg.gain.exponentialRampToValueAtTime(0.001, t1 + 0.3);
      b.connect(bg).connect(a.destination); b.start(t1); b.stop(t1 + 0.32);
      const n = noise(a, 0.16), nf = a.createBiquadFilter(), ng = a.createGain();
      nf.type = "lowpass"; nf.frequency.value = 500;
      ng.gain.setValueAtTime(0.4, t1); ng.gain.exponentialRampToValueAtTime(0.001, t1 + 0.15);
      n.connect(nf).connect(ng).connect(a.destination); n.start(t1);
    } catch (e) { /* no audio on this device */ }
  }

  // a robot blowing up: a low boom, a roar of noise that darkens as it fades, and crackling debris
  function boomSound() {
    try {
      const a = ctx(), t0 = a.currentTime;
      const n = noise(a, 1.4), f = a.createBiquadFilter(), g = a.createGain();
      f.type = "lowpass"; f.frequency.setValueAtTime(5000, t0); f.frequency.exponentialRampToValueAtTime(140, t0 + 1.2);
      g.gain.setValueAtTime(0.6, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + 1.35);
      n.connect(f).connect(g).connect(a.destination); n.start(t0);
      const o = a.createOscillator(), og = a.createGain();
      o.type = "sine"; o.frequency.setValueAtTime(120, t0); o.frequency.exponentialRampToValueAtTime(28, t0 + 0.6);
      og.gain.setValueAtTime(0.7, t0); og.gain.exponentialRampToValueAtTime(0.001, t0 + 0.7);
      o.connect(og).connect(a.destination); o.start(t0); o.stop(t0 + 0.72);
      for (let i = 0; i < 7; i++) {
        const tc = t0 + 0.12 + Math.random() * 0.7, c = noise(a, 0.03), cf = a.createBiquadFilter(), cg = a.createGain();
        cf.type = "highpass"; cf.frequency.value = 2500;
        cg.gain.setValueAtTime(0.22, tc); cg.gain.exponentialRampToValueAtTime(0.001, tc + 0.03);
        c.connect(cf).connect(cg).connect(a.destination); c.start(tc);
      }
    } catch (e) { /* no audio on this device */ }
  }

  function hit(k, amount) {
    if (k.life !== "alive") return;
    hitSound(k.sprite === "powerarmor" ? "robot" : k.race, amount >= 5); // power armor rings like metal
    k.jump = JUMP; k.flash = FLASH;
    k.pops.push({ text: "-" + amount, t: 0 });
  }
  // Mr. Handy and the other robots blow up instead of falling over
  function die(k, respawn) {
    k.lt = 0; k.jump = 0; k.respawn = respawn;
    if (k.race === "robot") { k.life = "exploding"; k.boom = makeBoom(); boomSound(); }
    else { k.life = "falling"; fallSound(k.race); }
  }
  // the blast, in sprite pixels from the feet: fireballs that turn to smoke, and bits of metal that fly and land
  function makeBoom() {
    const rnd = (a, b) => a + Math.random() * (b - a), cy = -(Sprites.FH - HEAD_TOP.robot) / 2;
    const fire = Array.from({ length: 22 }, (_, i) => {
      const a = Math.random() * Math.PI * 2, v = rnd(4, 24);
      return { x: 0, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.8 - rnd(2, 8), r: rnd(3, 6), delay: i < 8 ? 0 : rnd(0, 0.3) };
    });
    const metal = ["#9aa4ac", "#6e7880", "#c8cfd4", "#d9a43a"];
    const bits = Array.from({ length: 10 }, () => ({ x: rnd(-3, 3), y: cy + rnd(-5, 5), vx: rnd(-30, 30), vy: rnd(-48, -18),
      a: 0, spin: rnd(-14, 14), w: Math.random() < 0.5 ? 2 : 1, h: Math.random() < 0.5 ? 2 : 1, c: metal[Math.floor(Math.random() * metal.length)] }));
    return { cy, fire, bits };
  }
  function revive(k) { k.life = "spawning"; k.lt = 0; k.hits = 0; k.x = 20 + Math.random() * Math.max(40, (cv ? cv.clientWidth : 300) - 80); }

  const onTeamPage = () => currentPage === "home" || currentPage === "team";
  const active = () => (onTeamPage() ? team : currentPage === "combat" ? fight : currentPage === "elber" && talker ? [talker] : []);

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
    const top = r.top + cv.clientHeight - dh - 4 + HEAD_TOP[look(k)] * s;
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

  function vanish(k) { k.life = "gone"; k.lt = 0; if (k.onGone) k.onGone(); }

  function step(k, dt, w, half) {
    k.jump = Math.max(0, k.jump - dt); k.flash = Math.max(0, k.flash - dt);
    k.pops.forEach(p => (p.t += dt)); k.pops = k.pops.filter(p => p.t < 0.9);
    if (k.life !== "alive") {
      k.lt += dt;
      if (k.life === "exploding") stepBoom(k.boom, dt, k.lt);
      if (k.life === "falling" && k.lt > FALL + LIE + FADE) vanish(k);
      else if (k.life === "exploding" && k.lt > EXPLODE) { vanish(k); k.boom = null; }
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

  function stepBoom(b, dt, lt) {
    const drag = Math.exp(-3 * dt);
    b.fire.forEach(p => {
      if (lt < p.delay) return;
      p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= drag; p.vy = p.vy * drag - 6 * dt; // smoke drifts up
    });
    b.bits.forEach(p => {
      if (p.rest) return;
      p.vy += 90 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.a += p.spin * dt;
      if (p.y >= 0) { // hit the floor: one small bounce, then lie there
        p.y = 0;
        if (Math.abs(p.vy) < 12) { p.rest = true; p.spin = 0; } else { p.vy *= -0.3; p.vx *= 0.5; p.spin *= 0.5; }
      }
    });
  }
  const FIRE = [[0.12, "#fff6d0"], [0.3, "#ffd23a"], [0.5, "#ff8a1e"], [0.68, "#d0381a"], [1, "#3a3530"]];
  function drawBoom(g, k, s, h) {
    const b = k.boom, lt = k.lt, fx = k.x, fy = h - 4, P = v => Math.round(v) * s; // snap to the sprite's pixel grid
    // scorch mark on the floor
    g.globalAlpha = Math.max(0, 1 - lt / EXPLODE) * 0.7; g.fillStyle = "#1a1410";
    g.beginPath(); g.ellipse(fx, h - 6, 14 * s, 3, 0, 0, Math.PI * 2); g.fill();
    // the first white flash
    if (lt < 0.1) { g.globalAlpha = 1 - lt / 0.1; g.fillStyle = "#fffbe8"; const r = 12 * s; g.fillRect(fx - r, fy + P(b.cy) - r / 2, r * 2, r); g.fillRect(fx - r / 2, fy + P(b.cy) - r, r, r * 2); }
    b.fire.forEach(p => {
      const age = (lt - p.delay) / 0.95;
      if (age < 0 || age >= 1) return;
      const r = Math.max(1, Math.round(p.r * (0.6 + age * 1.3))) * s, x = fx + P(p.x), y = fy + P(p.y);
      g.fillStyle = FIRE.find(c => age < c[0])[1];
      g.globalAlpha = age < 0.68 ? 1 : 1 - (age - 0.68) / 0.32;
      g.fillRect(x - r, y - r / 2, r * 2, r); g.fillRect(x - r / 2, y - r, r, r * 2); // a chunky pixel blob
    });
    g.globalAlpha = Math.min(1, (EXPLODE - lt) / 0.4);
    b.bits.forEach(p => {
      g.save(); g.translate(fx + p.x * s, fy + p.y * s - (p.h * s) / 2); g.rotate(p.a);
      g.fillStyle = p.c; g.fillRect((-p.w * s) / 2, (-p.h * s) / 2, p.w * s, p.h * s);
      g.restore();
    });
    g.globalAlpha = 1;
  }

  function draw(g, k, s, h) {
    if (k.life === "gone") return;
    if (k.life === "exploding") { drawBoom(g, k, s, h); drawPops(g, k, h - 4 - (Sprites.FH - HEAD_TOP.robot) * s, 1); return; }
    const dw = Sprites.FW * s, dh = Sprites.FH * s, sheet = Sprites.sheet(look(k));
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
    const headY = h - 4 - dh + HEAD_TOP[look(k)] * s - lift - drop;
    if (k.life === "alive" || k.life === "spawning") {
      g.font = "bold 11px Segoe UI, Roboto, sans-serif";
      g.textAlign = "center";
      const label = k.name.length > 16 ? k.name.slice(0, 15) + "…" : k.name;
      const tw = g.measureText(label).width + 8, ty = headY - 18;
      g.fillStyle = "#000a"; g.fillRect(Math.round(k.x - tw / 2), ty - 1, tw, 15);
      g.fillStyle = "#f0be28"; g.fillText(label, k.x, ty + 10);
    }
    drawPops(g, k, headY, alpha);
  }

  // damage numbers float up
  function drawPops(g, k, headY, alpha) {
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
  return { sync, setFight, update, setTalker, talkerHit, talkerRevive };
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
