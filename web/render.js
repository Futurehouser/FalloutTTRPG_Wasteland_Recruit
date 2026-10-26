// Draws a generated character onto the blank character sheet (canvas port of render.py).

const S = 2;
const INK = "rgb(28,38,92)", RED = "rgb(150,30,30)";
const HAND = { fam: "'Segoe Print', casual, 'Coming Soon', 'Comic Sans MS', cursive", w: "normal" };
const HANDB = { fam: "'Segoe Print', casual, 'Coming Soon', 'Comic Sans MS', cursive", w: "bold" };
const UI = { fam: "sans-serif", w: "600" };
const UIB = { fam: "sans-serif", w: "bold" };

const LOC_BOX = {
  head: [411, 339, 478], larm: [295, 408, 359], rarm: [531, 408, 595],
  torso: [411, 477, 478], lleg: [301, 546, 366], rleg: [525, 546, 590],
};
const LOC_TITLE = {
  head: [362, 313, 487, 328, "OPTICS (1-2)"], larm: [244, 382, 369, 397, "ARM 1 (9-11)"],
  rarm: [479, 382, 604, 397, "ARM 2 (12-14)"], torso: [362, 451, 487, 466, "MAIN BODY (3-8)"],
  lleg: [250, 520, 375, 535, "ARM 3 (15-17)"], rleg: [473, 520, 599, 535, "THRUSTER (18-20)"],
};
const SPECIAL_POS = { STR: [72, 184], PER: [156, 184], END: [241, 184], CHA: [326, 184], INT: [411, 184], AGI: [496, 184], LCK: [580, 178] };
const SKILL_Y0 = 286.5, SKILL_DY = 18.35;
const WEAPON_Y = [662, 695, 728, 761, 794];
const PERK_ROWS = [76, 132, 189, 245, 302, 358, 415, 471, 528, 584, 641, 697];
const PERK_ROW_H = 56;

let SHEET_IMG = null;
function loadSheet() {
  return new Promise((res, rej) => {
    if (SHEET_IMG) return res(SHEET_IMG);
    const im = new Image();
    im.onload = () => { SHEET_IMG = im; res(im); };
    im.onerror = rej;
    im.src = SHEET_DATA;
  });
}

function setFont(ctx, f, size) { ctx.font = `${f.w} ${size * S}px ${f.fam}`; }

function makeDrawer(ctx) {
  const d = {};
  d.text = (x, y, s, f = UI, size = 9, anchor = "lm", fill = INK, maxw = null) => {
    s = String(s);
    setFont(ctx, f, size);
    while (maxw && size > 4 && ctx.measureText(s).width > maxw * S) { size -= 0.5; setFont(ctx, f, size); }
    ctx.fillStyle = fill;
    ctx.textAlign = anchor[0] === "l" ? "left" : anchor[0] === "r" ? "right" : "center";
    ctx.textBaseline = "middle";
    ctx.fillText(s, x * S, y * S);
  };
  d.lines = (s, w) => {
    const words = s.split(/\s+/), out = [];
    let cur = "";
    for (const wd of words) {
      const t = cur ? cur + " " + wd : wd;
      if (ctx.measureText(t).width > w * S && cur) { out.push(cur); cur = wd; } else cur = t;
    }
    if (cur) out.push(cur);
    return out;
  };
  d.wrap = (x, y, w, h, s, f = UI, size = 8, fill = INK, lh = 1.15, vcenter = false) => {
    let lines;
    while (true) {
      setFont(ctx, f, size);
      lines = d.lines(s, w);
      if (lines.length * size * lh <= h || size <= 4.5) break;
      size -= 0.5;
    }
    if (vcenter) y += (h - lines.length * size * lh) / 2;
    ctx.fillStyle = fill; ctx.textAlign = "left"; ctx.textBaseline = "top";
    lines.forEach((ln, i) => ctx.fillText(ln, x * S, (y + i * size * lh) * S));
    return y + lines.length * size * lh;
  };
  d.check = (x, y) => {
    const r = 3.2;
    ctx.strokeStyle = INK; ctx.lineWidth = 1.6 * S; ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo((x - r) * S, y * S); ctx.lineTo((x - 0.5) * S, (y + r) * S); ctx.lineTo((x + r + 1) * S, (y - r - 1) * S);
    ctx.stroke();
  };
  d.relabel = (x0, y0, x1, y1, label) => {
    ctx.fillStyle = "#1a1a1a"; ctx.fillRect(x0 * S, y0 * S, (x1 - x0) * S, (y1 - y0) * S);
    d.text((x0 + x1) / 2, (y0 + y1) / 2, T(label), UIB, 6.5, "mm", "#fff", x1 - x0 - 4);
  };
  return d;
}

async function renderCharacter(c) {
  const im = await loadSheet();
  const W = im.width * S, SH = im.height * S, BAND = 150 * S;
  const cv = document.createElement("canvas");
  cv.width = W; cv.height = SH + BAND;
  const ctx = cv.getContext("2d");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(im, 0, 0, W, SH);
  const d = makeDrawer(ctx), t = d.text;

  // header
  t(260, 70, c.name, HANDB, 15, "mm", INK, 176);
  t(260, 86, `“${c.epithet}” • ${T(c.archetype)}`, HAND, 7.5, "mm", RED, 176);
  t(452, 43, "0", HAND, 8.5);
  t(452, 61, "100", HAND, 8.5);
  t(452, 84, `${T(c.origin)} • ${T(c.pack)}`, HAND, 8, "lm", INK, 150);
  t(583, 66, "1", HANDB, 22, "mm");

  G.SPECIAL.forEach(a => t(SPECIAL_POS[a][0], SPECIAL_POS[a][1], c.special[a], HANDB, 24, "mm"));
  t(596, 229, c.luck_points, HANDB, 13, "mm");

  // the printed sheet is in English: write the skill names in the app's language over it
  if (LANG !== "en") G.SKILLS.forEach(([s, a], i) => {
    const y = SKILL_Y0 + i * SKILL_DY, bg = ctx.getImageData(146 * S, (y - 6) * S, 1, 1).data;
    ctx.fillStyle = `rgb(${bg[0]},${bg[1]},${bg[2]})`;
    ctx.fillRect(37 * S, (y - 7) * S, 109 * S, 14 * S);
    const name = T(s), attr = ` [${T(a)}]`, f = { fam: "sans-serif", w: "normal" };
    let size = 8.5;
    setFont(ctx, f, size);
    while (size > 5 && ctx.measureText(name + attr).width > 105 * S) setFont(ctx, f, (size -= 0.5));
    ctx.textAlign = "left"; ctx.textBaseline = "middle";
    ctx.fillStyle = "#333"; ctx.fillText(name, 41 * S, y * S);
    ctx.fillStyle = "rgb(214,150,105)"; ctx.fillText(attr, 41 * S + ctx.measureText(name).width, y * S);
  });

  G.SKILL_NAMES.forEach((s, i) => {
    const y = SKILL_Y0 + i * SKILL_DY;
    if (c.tags.includes(s)) d.check(157, y);
    if (c.skills[s]) t(202, y + 1, c.skills[s], HANDB, 10, "mm");
  });

  t(338, 273, c.melee_bonus ? `+${c.melee_bonus}` : "0", HANDB, 10, "mm");
  t(471, 273, c.defense, HANDB, 11, "mm");
  t(602, 273, c.initiative, HANDB, 11, "mm");
  t(327, 328, c.poison_immune ? T("Imm") : c.poison_dr, HANDB, c.poison_immune ? 8.5 : 10, "mm", INK, 34);
  t(574, 323, c.hp, HANDB, 10, "mm");
  t(574, 339, c.hp, HANDB, 10, "mm");

  if (c.race === "robot") for (const k in LOC_TITLE) d.relabel(...LOC_TITLE[k]);
  for (const loc in LOC_BOX) {
    const [px, y, rx] = LOC_BOX[loc], dr = c.dr[loc];
    t(px, y, dr.p, HANDB, 9, "mm");
    t(px, y + 18, dr.e, HANDB, 9, "mm");
    t(rx, y, c.rad_immune ? T("Imm") : dr.r, HANDB, c.rad_immune ? 7.5 : 9, "mm");
  }

  const hasIronFist = c.perks.some(p => p[0] === "Iron Fist");
  c.weapons.slice(0, 5).forEach((w, i) => {
    const wd = G.WEAPONS[w], y = WEAPON_Y[i];
    const tn = c.special[G.SKILL_ATTR[wd.skill]] + c.skills[wd.skill];
    t(39, y, T(w), UI, 7.5, "lm", INK, 86);
    t(150, y, T(wd.skill), UI, 6.5, "mm", INK, 42);
    t(188, y, tn, HANDB, 10, "mm");
    if (c.tags.includes(wd.skill)) d.check(216, y);
    let dmg = wd.dmg;
    if (wd.skill === "Melee Weapons" || wd.skill === "Unarmed") {
      const b = c.melee_bonus + (wd.skill === "Unarmed" && hasIronFist ? 1 : 0);
      if (b) dmg = `${dmg}+${b}`;
    }
    t(271, y, dmg, HANDB, 9.5, "lm", INK, 19);
    d.wrap(293, y - 11, 52, 22, TL(wd.eff), UI, 6.5, INK, 1.15, true);
    t(367, y, T(wd.type), UI, 7, "mm", INK, 38);
    t(405, y, wd.rate, UI, 8, "mm");
    t(438, y, wd.range, UI, 8, "mm");
    d.wrap(458, y - 11, 71, 22, TL(wd.qual), UI, 6.5, INK, 1.15, true);
    let ammo = wd.ammo;
    if (w === "Molotov Cocktail") ammo = "Molotov";
    else if (["Baseball Grenade", "Throwing Knives", "Tomahawks"].includes(w)) ammo = w;
    const qty = ammo ? c.ammo[ammo] : undefined;
    t(552, y, qty !== undefined ? qty : "-", HAND, 8.5, "mm");
    t(595, y, wd.wt, UI, 8, "mm");
  });

  t(845, 60, c.caps, HANDB, 15, "mm");
  Object.keys(c.ammo).sort().forEach((cal, i) => {
    const y = 143 + i * 15;
    if (y > 290) return;
    t(700, y, T(cal), UI, 8, "lm", INK, 122);
    t(852, y, c.ammo[cal], HAND, 9, "mm");
  });

  const gear = c.worn.map(i => [T("{item} (worn)", { item: T(i) }), G.APPAREL[i].wt]);
  if (c.plating) gear.push([T("{item} (installed)", { item: T(c.plating) }), "-"]);
  const trinket = / \(trinket\)$/;
  gear.push(...c.gear.map(([nm, wt]) => [trinket.test(nm) ? T("{item} (trinket)", { item: T(nm.replace(trinket, "")) }) : T(nm), wt]));
  const merged = [];
  gear.forEach(([nm, wt]) => {
    const m = merged.find(x => x[0] === nm);
    if (m) m[2]++; else merged.push([nm, wt, 1]);
  });
  merged.forEach(([nm, wt, n], i) => {
    const y = 362 + i * 15.5;
    if (y > 742) return;
    t(699, y, n > 1 ? `${nm} x${n}` : nm, UI, 7.5, "lm", INK, 143);
    t(862, y, typeof wt === "number" ? wt * n : wt, UI, 7.5, "mm");
  });
  t(862, 766, c.carry_now, HANDB, 10, "mm");
  t(862, 795, c.carry_max, HANDB, 10, "mm");

  const rows = traitRows(c).map(([n, e]) => [n, "-", e]);
  c.perks.forEach(([p, r]) => rows.push([T(p), r, T(G.PERKS[p][3])]));
  rows.push([T("Quirk"), "-", c.gimmick_short]);
  rows.slice(0, PERK_ROWS.length).forEach(([nm, rank, eff], i) => {
    const y = PERK_ROWS[i];
    d.wrap(895, y + 3, 91, PERK_ROW_H - 8, nm, UIB, 7.5);
    t(1004, y + PERK_ROW_H / 2 - 2, rank, HANDB, 10, "mm");
    d.wrap(1024, y + 3, 247, PERK_ROW_H - 8, eff, UI, 7.5);
  });

  // dossier band
  const y0 = SH / S;
  ctx.fillStyle = "#ece9e0"; ctx.fillRect(0, SH, W, BAND);
  ctx.fillStyle = "#1a1a1a"; ctx.fillRect(0, SH, W, 22 * S);
  const list = a => a.map(x => T(x)).join(", ");
  t(36, y0 + 11, T("WASTELAND DOSSIER"), UIB, 10, "lm", "#f0be28");
  t(W / S - 36, y0 + 11, T("Archetype: {a}   |   Origin: {o}   |   Pack: {p}", { a: T(c.archetype), o: T(c.origin), p: T(c.pack) }), UI, 8, "rm", "#e6e6e6");
  d.wrap(36, y0 + 30, 600, 115, c.gimmick_long, HAND, 9, INK, 1.35);
  const notes = [T("Tag skills: {list}.", { list: list(c.tags) }), T("Skill points spent: {n} (9 + INT).", { n: c.skill_points })];
  if (c.extra_tags.length) notes.push(T("Origin/trait bonus tag(s): {list}.", { list: list(c.extra_tags) }));
  notes.push(...c.notes);
  if (c.race === "robot") notes.push(T("Robot hit locations are relabelled on the sheet. Carry weight is fixed by the chassis."));
  if (c.rad_immune) notes.push(T("Radiation DR shows 'Imm' because this origin is immune to radiation damage."));
  notes.push(T("Combat-dice ammo amounts were already rolled. Gear marked '-' has no listed weight."));
  d.wrap(680, y0 + 30, 590, 115, notes.join("  •  "), UI, 7.5, "#3c3c3c", 1.4);
  return cv;
}
