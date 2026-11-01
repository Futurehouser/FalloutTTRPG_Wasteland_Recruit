// My Team: the characters your players are using right now. Each one gets a little pixel-art
// wastelander (human, ghoul, super mutant or robot) that walks along the bottom of the Home and
// My Team pages, stopping now and then to idle. The Combat Assistant can load the whole team.

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
const Walkers = (() => {
  let cv = null, raf = null, last = 0, list = [];
  const scale = () => (window.innerWidth < 560 ? 2 : 3);
  const HEAD_TOP = { human: 16, ghoul: 16, mutant: 11, robot: 11 }; // first drawn row of each sprite

  function sync(chars) {
    const keep = {};
    list.forEach(w => (keep[w.id] = w));
    const width = window.innerWidth;
    list = chars.map(c => {
      const race = c.race || raceFromOrigin(c.origin);
      const old = keep[c.id];
      if (old) { old.race = race; old.name = c.name; return old; }
      return { id: c.id, race, name: c.name, x: 20 + Math.random() * Math.max(40, width - 80), dir: Math.random() < 0.5 ? -1 : 1,
               speed: 26 + Math.random() * 18, state: "walk", timer: 2 + Math.random() * 4, frame: 0, ft: 0 };
    });
    update();
  }

  function visible() { return list.length > 0 && (currentPage === "home" || currentPage === "team"); }

  function update() {
    cv = cv || $("walkers");
    if (!cv) return;
    const on = visible();
    cv.hidden = !on;
    document.body.classList.toggle("walkers-on", on);
    if (on && !raf) { last = performance.now(); raf = requestAnimationFrame(tick); }
  }

  function tick(now) {
    if (!visible()) { raf = null; update(); return; }
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    const s = scale(), w = cv.clientWidth, h = cv.clientHeight, dpr = window.devicePixelRatio || 1;
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    const g = cv.getContext("2d");
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    g.imageSmoothingEnabled = false;
    const half = (Sprites.FW * s) / 2;
    list.forEach(k => {
      // walk, and now and then stop to idle; turn at the edges or on a whim
      k.timer -= dt;
      if (k.timer <= 0) {
        if (k.state === "walk") { k.state = "idle"; k.timer = 1.5 + Math.random() * 3; }
        else { k.state = "walk"; k.timer = 2.5 + Math.random() * 5; if (Math.random() < 0.4) k.dir = -k.dir; }
        k.frame = 0;
      }
      if (k.state === "walk") {
        k.x += k.dir * k.speed * dt;
        if (k.x < half) { k.x = half; k.dir = 1; }
        if (k.x > w - half) { k.x = w - half; k.dir = -1; }
      }
      k.x = Math.min(Math.max(k.x, half), Math.max(half, w - half));
      k.ft += dt;
      const fps = k.state === "walk" ? 8 : 2.5;
      if (k.ft >= 1 / fps) { k.ft = 0; k.frame = (k.frame + 1) % 4; }
    });
    // draw back to front so nobody's name tag hides under a neighbour
    list.slice().sort((a, b) => a.x - b.x).forEach(k => {
      const img = Sprites.sheet(k.race)[k.state][k.frame];
      const dw = Sprites.FW * s, dh = Sprites.FH * s, x = Math.round(k.x - dw / 2), y = h - dh - 4;
      g.fillStyle = "#0006";
      g.beginPath(); g.ellipse(k.x, h - 6, dw * 0.24, 3, 0, 0, Math.PI * 2); g.fill();
      g.save();
      if (k.dir < 0) { g.translate(x + dw, y); g.scale(-1, 1); g.drawImage(img, 0, 0, dw, dh); }
      else g.drawImage(img, x, y, dw, dh);
      g.restore();
      g.font = "bold 11px Segoe UI, Roboto, sans-serif";
      g.textAlign = "center";
      const label = k.name.length > 16 ? k.name.slice(0, 15) + "…" : k.name;
      const tw = g.measureText(label).width + 8, ty = y + HEAD_TOP[k.race] * s - 18;
      g.fillStyle = "#000a"; g.fillRect(Math.round(k.x - tw / 2), ty - 1, tw, 15);
      g.fillStyle = "#f0be28"; g.fillText(label, k.x, ty + 10);
    });
    raf = requestAnimationFrame(tick);
  }
  return { sync, update };
})();

// ------------------------------------------------------------------ the My Team page
const Team = (() => {
  const MAX = 8;
  let TEAM = []; // [{ id, player }]
  const chars = () => TEAM.map(t => ROSTER.find(c => c.id === t.id)).filter(Boolean);

  async function load() {
    TEAM = await Platform.loadJSON("team", []);
    if (!Array.isArray(TEAM)) TEAM = [];
    prune(false);
    Walkers.sync(chars());
  }
  const store = () => Platform.saveJSON("team", TEAM);
  // drop characters that were deleted from Saved Characters
  function prune(save = true) {
    const before = TEAM.length;
    TEAM = TEAM.filter(t => ROSTER.some(c => c.id === t.id));
    if (save && TEAM.length !== before) store();
  }
  function changed() { store(); Walkers.sync(chars()); render(); }

  function add(id) {
    if (!id || TEAM.some(t => t.id === id)) return;
    if (TEAM.length >= MAX) { toast(T("A team can have up to {n} characters", { n: MAX })); return; }
    TEAM.push({ id, player: "" });
    const c = ROSTER.find(x => x.id === id);
    toast(T("{name} joined the team", { name: c ? c.name : "" }));
    changed();
  }
  function remove(id) {
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
    prune();
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
