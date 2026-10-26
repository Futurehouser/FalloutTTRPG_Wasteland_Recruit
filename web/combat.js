// Combat assistant: guides a fight step by step following the rulebook's combat rules
// (attack test vs Defense, successes / critical successes / complications, hit location,
// combat dice and damage effects, damage resistance, criticals), then hands out rewards.
const Combat = (() => {
  const root = () => $("cb-root");
  const LOCS = [[2, "Head"], [8, "Torso"], [11, "Left arm"], [14, "Right arm"], [17, "Left leg"], [20, "Right leg"]];
  const locFor = d => LOCS.find(([max]) => d <= max)[1];
  const RANGES = ["C", "M", "L", "X"], RANGE_NAME = { C: "Close", M: "Medium", L: "Long", X: "Extreme" };
  const TYPE_NAME = { p: "Physical", e: "Energy", r: "Radiation", po: "Poison" };
  const COMBAT_SKILLS = ["Small Guns", "Big Guns", "Energy Weapons", "Melee Weapons", "Unarmed", "Throwing", "Explosives"];
  const BUY_COST = [0, 1, 3, 6]; // AP for 0..3 bonus d20 (1 + 2 + 3)
  const d20 = () => 1 + Math.floor(Math.random() * 20);
  const d6 = () => 1 + Math.floor(Math.random() * 6);
  const num = (v, d = 0) => { const n = parseInt(v, 10); return isNaN(n) ? d : n; };
  const drVal = v => (v === "Imm" ? Infinity : num(v));
  const drTxt = v => (v === "Imm" || v === Infinity ? T("Imm") : v);
  const locTo = loc => T("the " + loc.toLowerCase()); // "the left arm" -> "el brazo izquierdo"

  let S = null;               // the whole combat state (saved after every change)
  let setup = null;           // setup form state
  let CUSTOM = [];            // user-made enemies

  // ------------------------------------------------------------------ persistence
  const save = () => Platform.saveJSON("combat_state", S);
  async function init() {
    CUSTOM = await Platform.loadJSON("custom_enemies", []);
    S = await Platform.loadJSON("combat_state", null);
    if (S && S.phase === "setup") S = null;
    if (S && S.player && !S.players) { // fight saved by a single-player version
      S.players = [Object.assign(S.player, { uid: "P0", status: S.player.hp > 0 ? "up" : "down" })];
      delete S.player;
      S.order = S.order.map(id => (id === "P" ? "P0" : id));
      if (S.turn && S.turn.actor === "P") S.turn.actor = "P0";
    }
  }
  const allTemplates = () => ENEMY_TEMPLATES.concat(CUSTOM.map(c => Object.assign({ group: "Your enemies" }, c)));

  function log(msg) { S.log.unshift(`R${S.round}: ${msg}`); S.log = S.log.slice(0, 60); }

  // ------------------------------------------------------------------ dice helpers (shared UI)
  function diceInputs(id, n, max) {
    return `<div class="dice-in" id="${id}">${Array.from({ length: n }, (_, i) =>
      `<input type="number" min="1" max="${max}" inputmode="numeric" placeholder="d${max}" data-i="${i}">`).join("")}
      <button class="btn" data-roll="${id}" data-max="${max}">&#127922; ${T("Roll for me")}</button></div>`;
  }
  function readDice(id, max) {
    const vals = [...document.querySelectorAll(`#${id} input`)].map(i => num(i.value, 0));
    if (vals.some(v => v < 1 || v > max)) { toast(T("Enter every die (1-{max}), or tap Roll for me", { max })); return null; }
    return vals;
  }
  function wireRolls() {
    root().querySelectorAll("[data-roll]").forEach(b => (b.onclick = () => {
      const max = +b.dataset.max;
      document.querySelectorAll(`#${b.dataset.roll} input`).forEach(i => (i.value = max === 20 ? d20() : d6()));
    }));
  }
  // d20 test: successes, crits, complications
  function scoreTest(rolls, tn, critMax) {
    let succ = 0, crits = 0, comps = 0;
    rolls.forEach(r => {
      if (r <= Math.max(1, critMax)) { succ += 2; crits++; } else if (r <= tn) succ++;
      if (r === 20) comps++;
    });
    return { succ, crits, comps };
  }
  // combat dice: total damage and number of Effects
  function scoreCD(faces) {
    return { total: faces.reduce((s, f) => s + CD_FACE_VALUE[f - 1], 0), effects: faces.filter(f => f >= 5).length };
  }
  const diceFaces = faces => `<div class="dice">${faces.map(f => {
    const v = CD_FACE_VALUE[f - 1];
    return `<span class="die ${f >= 5 ? "fx" : v === 0 ? "zero" : ""}">${v}${f >= 5 ? "*" : ""}</span>`;
  }).join("")}</div>`;
  const effectOf = (list, name) => {
    const e = (list || []).find(x => x.toLowerCase().startsWith(name.toLowerCase()));
    if (!e) return 0;
    const m = /(\d+)/.exec(e);
    return m ? +m[1] : 1;
  };

  // resolve damage against a target's DR; returns breakdown
  function resolveDamage({ total, effects, eff, type, dr, location }) {
    const vicious = effectOf(eff, "Vicious") ? effects : 0;
    const pierce = effectOf(eff, "Piercing") * effects;
    const res = drVal(dr[type]);
    const raw = total + vicious;
    const blocked = res === Infinity ? raw : Math.max(0, res - pierce);
    const dmg = Math.max(0, raw - blocked);
    let rad = 0;
    if (effectOf(eff, "Radioactive") && effects) {
      const rr = drVal(dr.r);
      rad = rr === Infinity ? 0 : Math.max(0, effects - rr);
    }
    const parts = [T("{n} rolled", { n: total })];
    if (vicious) parts.push(T("+{n} Vicious", { n: vicious }));
    if (res === Infinity) parts.push(T("immune to {type}", { type: T(TYPE_NAME[type]) }));
    else if (res) parts.push(T(pierce ? "-{b} DR ({res}, {p} ignored by Piercing)" : "-{b} DR ({res})", { b: blocked, res, p: pierce }));
    return { dmg, rad, crit: dmg >= 5, text: T("{parts} = <b>{dmg}</b> damage to {loc}", { parts: parts.join(", "), dmg, loc: locTo(location) }) +
      (rad ? " " + T("+ <b>{n}</b> radiation", { n: rad }) : "") };
  }

  // ------------------------------------------------------------------ SETUP
  const MAX_PARTY = 8;
  function newMember(i) {
    return { charId: "", name: T("Player {n}", { n: i + 1 }), hp: 10, maxHp: 10, def: 1, init: 10, dr: { p: 0, e: 0, r: 0, po: 0 },
             weapon: "", w: { skill: "Small Guns", tn: 10, crit: 1, cd: 3, type: "p", eff: [], pierce: 1, rate: 2, range: "C", ammo: 20 },
             meleeBonus: 0 };
  }
  function newSetup() { setup = { ap: 0, groups: [], members: [newMember(0)] }; }
  function fromCharacter(m, c) {
    const s = c.special, hp = c.maxHp || s.END + s.LCK;
    Object.assign(m, { charId: c.id, name: c.name, hp, maxHp: hp, def: s.AGI >= 9 ? 2 : 1, init: s.PER + s.AGI,
      meleeBonus: s.STR >= 11 ? 3 : s.STR >= 9 ? 2 : s.STR >= 7 ? 1 : 0 });
    updateTN(m);
  }
  function updateTN(m) {
    const c = ROSTER.find(x => x.id === m.charId);
    if (!c) return;
    const sk = m.w.skill;
    m.w.tn = (c.special[G.SKILL_ATTR[sk]] || 5) + (c.skills[sk] || 0);
    m.w.crit = (c.tags || []).includes(sk) ? Math.max(1, c.skills[sk] || 1) : 1;
  }
  function fromWeapon(m, name) {
    const w = WEAPONS_FOR_COMBAT[name];
    if (!w) return;
    const effs = (w.eff || "").replace("Persist.", "Persistent").split(",").map(x => x.trim()).filter(x => x && x !== "-");
    Object.assign(m.w, { skill: w.skill, cd: w.dmg, type: w.type === "Energy" ? "e" : "p",
      eff: effs.map(e => e.split(" ")[0]), pierce: effectOf(effs, "Piercing") || 1,
      rate: typeof w.rate === "number" ? w.rate : 0, range: ["C", "M", "L", "X"].includes(w.range) ? w.range : "C" });
    updateTN(m);
  }
  const isMelee = sk => sk === "Melee Weapons" || sk === "Unarmed";
  const isThrown = sk => sk === "Throwing" || sk === "Explosives";

  function readSetupForm() {
    const v = id => ($(id) ? $(id).value : "");
    if ($("cs-ap")) setup.ap = Math.min(6, Math.max(0, num(v("cs-ap"), 0)));
    setup.members.forEach((m, i) => {
      if (!$("cs-name-" + i)) return;
      Object.assign(m, { name: v("cs-name-" + i).trim() || T("Player {n}", { n: i + 1 }), hp: num(v("cs-hp-" + i), 10), maxHp: num(v("cs-maxhp-" + i), 10),
        def: num(v("cs-def-" + i), 1), init: num(v("cs-init-" + i), 10) });
      ["p", "e", "r", "po"].forEach(k => (m.dr[k] = v(`cs-dr-${k}-${i}`).trim().toLowerCase().startsWith("i") ? "Imm" : num(v(`cs-dr-${k}-${i}`), 0)));
      Object.assign(m.w, { skill: v("cs-skill-" + i), tn: num(v("cs-tn-" + i), 10), crit: num(v("cs-crit-" + i), 1), cd: num(v("cs-cd-" + i), 3),
        type: v("cs-type-" + i), rate: num(v("cs-rate-" + i), 0), range: v("cs-range-" + i), ammo: num(v("cs-ammo-" + i), 0),
        pierce: num(v("cs-pierce-" + i), 1), eff: [...document.querySelectorAll(`#cs-effs-${i} input:checked`)].map(x => x.value) });
      m.weapon = v("cs-weapon-" + i);
    });
  }

  function memberCard(m, i, chars) {
    const w = m.w;
    return `<div class="card member"><div class="member-head"><h4 style="margin:0">${T("Party member {n}", { n: i + 1 })}</h4>
        ${setup.members.length > 1 ? `<button class="btn danger" data-rmm="${i}" title="${T("Remove from the party")}">&#10005;</button>` : ""}</div>
      <div class="row"><div><label class="f">${T("Saved character (fills in the stats)")}</label><select data-mchar="${i}">
        <option value="">${T("Enter stats by hand")}</option>${chars.map(c => `<option value="${esc(c.id)}" ${c.id === m.charId ? "selected" : ""}>${esc(c.name)} (${T("level {n}", { n: c.level || 1 })})</option>`).join("")}</select></div>
        <div><label class="f">${T("Name")}</label><input type="text" id="cs-name-${i}" value="${esc(m.name)}"></div></div>
      <div class="row" style="margin-top:8px">
        <div><label class="f">${T("Current HP")}</label><input type="number" id="cs-hp-${i}" value="${m.hp}"></div>
        <div><label class="f">${T("Max HP")}</label><input type="number" id="cs-maxhp-${i}" value="${m.maxHp}"></div>
        <div><label class="f">${T("Defense")}</label><input type="number" id="cs-def-${i}" value="${m.def}"></div>
        <div><label class="f">${T("Initiative")}</label><input type="number" id="cs-init-${i}" value="${m.init}"></div></div>
      <div class="row" style="margin-top:8px">
        ${["p", "e", "r", "po"].map(k => `<div><label class="f">${T(TYPE_NAME[k] + " DR")}</label><input type="text" id="cs-dr-${k}-${i}" value="${drTxt(m.dr[k])}"></div>`).join("")}</div>
      <h4 style="margin:14px 0 6px">${T("Weapon")}</h4>
      <div class="row"><div><label class="f">${T("Weapon")}</label><select data-mweapon="${i}" id="cs-weapon-${i}"><option value="">${T("Custom weapon")}</option>
        ${Object.keys(WEAPONS_FOR_COMBAT).map(n => `<option value="${esc(n)}" ${n === m.weapon ? "selected" : ""}>${esc(T(n))}</option>`).join("")}</select></div>
        <div><label class="f">${T("Skill")}</label><select data-mskill="${i}" id="cs-skill-${i}">${COMBAT_SKILLS.map(k => `<option value="${k}" ${k === w.skill ? "selected" : ""}>${T(k)}</option>`).join("")}</select></div></div>
      <div class="row" style="margin-top:8px">
        <div><label class="f">${T("Target number")}</label><input type="number" id="cs-tn-${i}" value="${w.tn}"></div>
        <div><label class="f">${T("Critical on d20 ≤")}</label><input type="number" id="cs-crit-${i}" min="1" value="${w.crit}"></div>
        <div><label class="f">${T("Damage (CD)")}</label><input type="number" id="cs-cd-${i}" min="1" value="${w.cd}"></div>
        <div><label class="f">${T("Damage type")}</label><select id="cs-type-${i}">${Object.entries(TYPE_NAME).map(([k, n]) => `<option value="${k}" ${k === w.type ? "selected" : ""}>${T(n)}</option>`).join("")}</select></div></div>
      <div class="row" style="margin-top:8px">
        <div><label class="f">${T("Fire rate")}</label><input type="number" id="cs-rate-${i}" min="0" value="${w.rate}"></div>
        <div><label class="f">${T("Ideal range")}</label><select id="cs-range-${i}">${RANGES.map(r => `<option value="${r}" ${r === w.range ? "selected" : ""}>${T(RANGE_NAME[r])}</option>`).join("")}</select></div>
        <div><label class="f">${T("Ammo / throwables")}</label><input type="number" id="cs-ammo-${i}" min="0" value="${w.ammo}"></div>
        <div><label class="f">${T("Piercing rating")}</label><input type="number" id="cs-pierce-${i}" min="1" value="${w.pierce}"></div></div>
      <label class="f" style="margin-top:8px">${T("Damage effects")}</label>
      <div id="cs-effs-${i}" class="effs">${EFFECT_NAMES.map(e => `<label><input type="checkbox" value="${e}" ${w.eff.includes(e) ? "checked" : ""}> ${T(e)}</label>`).join("")}</div>
      <p class="hint" style="margin:8px 0 0">${isMelee(w.skill) ? T("Melee: the melee damage bonus (+{n} CD) is added automatically.", { n: m.meleeBonus }) : T("Ranged: extra ammo can be spent each turn, up to the fire rate.")}</p></div>`;
  }

  function renderSetup() {
    if (!setup) newSetup();
    const s = setup;
    const chars = ROSTER.slice().sort((a, b) => a.name.localeCompare(b.name));
    const groups = {};
    allTemplates().forEach(t => (groups[t.group] = groups[t.group] || []).push(t));
    const tplOptions = Object.entries(groups).map(([g, list]) => `<optgroup label="${esc(T(g))}">${list.map(t =>
      `<option value="${esc(t.id)}">${esc(T(t.name))} (${T("lvl")} ${t.level} ${esc(T(t.type))})</option>`).join("")}</optgroup>`).join("");
    const enemyList = s.groups.length ? s.groups.map((g, i) => {
      const t = allTemplates().find(x => x.id === g.id);
      return t ? `<div class="pcard"><div class="t"><b>${g.count} &times; ${esc(T(t.name))}</b>
        <small>${T("Level")} ${t.level} ${esc(T(t.type))} &middot; ${T("HP")} ${t.hp} &middot; ${T("Defense")} ${t.def} &middot; ${T("DR")} ${drTxt(t.dr.p)}/${drTxt(t.dr.e)}/${drTxt(t.dr.r)}/${drTxt(t.dr.po)} &middot; ${T("{n} XP each", { n: xpFor(t.level, t.type) })}</small></div>
        <button class="btn danger" data-rmg="${i}">&#10005;</button></div>` : "";
    }).join("") : `<div class="muted" style="font-size:13px">${T("No enemies added yet.")}</div>`;

    root().innerHTML = `
    <h4 class="sec" style="margin-top:4px">${T("1. The party ({n})", { n: s.members.length })}</h4>
    <p class="hint" style="margin:0 0 4px">${T("Add every player character. Each one gets their own turn and their own weapon. DR is from armor (use the torso values, or type Imm if immune).")}</p>
    ${s.members.map((m, i) => memberCard(m, i, chars)).join("")}
    <div class="bar"><button class="btn" id="cs-addm" ${s.members.length >= MAX_PARTY ? "disabled" : ""}>${T("+ Add party member")}</button>
      <div style="flex:1"><label class="f">${T("Group AP pool")}</label><input type="number" id="cs-ap" min="0" max="6" value="${s.ap}"></div></div>

    <div class="card"><h4 style="margin-top:0">${T("2. Enemies")}</h4>
      <div class="row"><div style="flex:3 1 200px"><label class="f">${T("Enemy")}</label><select id="cs-tpl">${tplOptions}</select></div>
        <div style="flex:1 1 70px"><label class="f">${T("How many")}</label><input type="number" id="cs-count" min="1" max="12" value="1"></div>
        <div style="flex:1 1 90px;align-self:end"><button class="btn primary" id="cs-add" style="width:100%">${T("+ Add")}</button></div></div>
      <div id="cs-groups" style="margin-top:8px">${enemyList}</div>
      <p class="hint" style="margin:8px 0 0">${T("The built-in enemies use this app's own stats, made with the rulebook's NPC formulas. To fight a creature exactly as printed in your book, add it below.")}</p>
      <details class="card" style="margin:8px 0 0"><summary style="cursor:pointer;font-weight:700">${T("Add your own enemy (from your book)")}</summary>${customForm()}</details></div>

    <button class="big" id="cs-start">${T("START COMBAT")}</button>`;
    wireSetup();
  }

  function customForm() {
    const list = CUSTOM.length ? CUSTOM.map((c, i) => `<div class="pcard"><div class="t"><b>${esc(c.name)}</b><small>${T("Level")} ${c.level} ${esc(T(c.type))} &middot; ${T("HP")} ${c.hp}</small></div>
      <button class="btn danger" data-rmc="${i}">&#10005;</button></div>`).join("") : "";
    const atkRow = n => `<div class="row" style="margin-top:6px">
      <div style="flex:2 1 120px"><label class="f">${T("Attack {n} name", { n })}</label><input type="text" id="ce-a${n}-name" placeholder="${n === 1 ? T("Claws") : T("(optional)")}"></div>
      <div><label class="f">${T("TN")}</label><input type="number" id="ce-a${n}-tn"></div>
      <div><label class="f">${T("Skill rank (crit)")}</label><input type="number" id="ce-a${n}-crit" value="1"></div>
      <div><label class="f">${T("Damage CD")}</label><input type="number" id="ce-a${n}-cd"></div>
      <div><label class="f">${T("Type")}</label><select id="ce-a${n}-type">${Object.entries(TYPE_NAME).map(([k, v]) => `<option value="${k}">${T(v)}</option>`).join("")}</select></div>
      <div style="flex:2 1 140px"><label class="f">${T("Effects (e.g. Piercing 1, Vicious)")}</label><input type="text" id="ce-a${n}-eff"></div>
      <div><label class="f">${T("Fire rate (ranged)")}</label><input type="number" id="ce-a${n}-rate" placeholder="${T("melee")}"></div></div>`;
    return `<div class="row" style="margin-top:8px">
      <div style="flex:2 1 160px"><label class="f">${T("Name")}</label><input type="text" id="ce-name"></div>
      <div><label class="f">${T("Level")}</label><input type="number" id="ce-level" value="1"></div>
      <div><label class="f">${T("Type")}</label><select id="ce-type">${Object.keys(XP_MULT).map(t => `<option value="${t}">${T(t)}</option>`).join("")}</select></div>
      <div><label class="f">${T("Kind")}</label><select id="ce-kind"><option value="creature">${T("Creature")}</option><option value="character">${T("Character")}</option></select></div></div>
    <div class="row" style="margin-top:6px">
      <div><label class="f">${T("HP")}</label><input type="number" id="ce-hp"></div>
      <div><label class="f">${T("Defense")}</label><input type="number" id="ce-def" value="1"></div>
      <div><label class="f">${T("Initiative")}</label><input type="number" id="ce-init"></div>
      ${["p", "e", "r", "po"].map(k => `<div><label class="f">${T(TYPE_NAME[k] + " DR")}</label><input type="text" id="ce-dr-${k}" value="0"></div>`).join("")}</div>
    ${atkRow(1)}${atkRow(2)}
    <div class="row" style="margin-top:6px">
      <div><label class="f">${T("Caps (d20s)")}</label><input type="number" id="ce-wealth" value="0"></div>
      <div><label class="f">${T("Junk (combat dice)")}</label><input type="number" id="ce-junk" value="0"></div>
      <div style="flex:3 1 200px"><label class="f">${T("Inventory / butchery / salvage notes")}</label><input type="text" id="ce-notes"></div></div>
    <button class="btn primary" id="ce-save" style="margin-top:8px">${T("Save enemy")}</button>
    <div style="margin-top:8px">${list}</div>`;
  }

  function wireSetup() {
    root().querySelectorAll("[data-mchar]").forEach(sel => (sel.onchange = () => {
      readSetupForm();
      const m = setup.members[+sel.dataset.mchar], c = ROSTER.find(x => x.id === sel.value);
      if (c) fromCharacter(m, c); else m.charId = "";
      renderSetup();
    }));
    root().querySelectorAll("[data-mweapon]").forEach(sel => (sel.onchange = () => {
      readSetupForm(); fromWeapon(setup.members[+sel.dataset.mweapon], sel.value); renderSetup();
    }));
    root().querySelectorAll("[data-mskill]").forEach(sel => (sel.onchange = () => {
      readSetupForm(); updateTN(setup.members[+sel.dataset.mskill]); renderSetup();
    }));
    root().querySelectorAll("[data-rmm]").forEach(b => (b.onclick = () => {
      readSetupForm(); setup.members.splice(+b.dataset.rmm, 1); renderSetup();
    }));
    $("cs-addm").onclick = () => {
      readSetupForm();
      if (setup.members.length < MAX_PARTY) setup.members.push(newMember(setup.members.length));
      renderSetup();
    };
    $("cs-add").onclick = () => {
      readSetupForm();
      const id = $("cs-tpl").value, count = Math.min(12, Math.max(1, num($("cs-count").value, 1)));
      const g = setup.groups.find(x => x.id === id);
      if (g) g.count = Math.min(12, g.count + count); else setup.groups.push({ id, count });
      renderSetup();
    };
    root().querySelectorAll("[data-rmg]").forEach(b => (b.onclick = () => { readSetupForm(); setup.groups.splice(+b.dataset.rmg, 1); renderSetup(); }));
    root().querySelectorAll("[data-rmc]").forEach(b => (b.onclick = async () => {
      readSetupForm();
      const c = CUSTOM[+b.dataset.rmc];
      if (!(await confirmBox(T('Delete your enemy "{name}"?', { name: c.name })))) return;
      CUSTOM.splice(+b.dataset.rmc, 1);
      setup.groups = setup.groups.filter(g => g.id !== c.id);
      await Platform.saveJSON("custom_enemies", CUSTOM);
      renderSetup();
    }));
    $("ce-save").onclick = async () => {
      readSetupForm();
      const v = id => $(id).value.trim();
      const name = v("ce-name");
      if (!name || !num(v("ce-hp"), 0) || !v("ce-a1-name") || !num(v("ce-a1-tn"), 0) || !num(v("ce-a1-cd"), 0)) {
        toast(T("Name, HP and attack 1 (name, TN, damage) are needed")); return;
      }
      const attacks = [1, 2].filter(n => v(`ce-a${n}-name`) && num(v(`ce-a${n}-tn`), 0)).map(n => atk(v(`ce-a${n}-name`), num(v(`ce-a${n}-tn`)),
        num(v(`ce-a${n}-crit`), 1), num(v(`ce-a${n}-cd`), 1), v(`ce-a${n}-type`),
        v(`ce-a${n}-eff`).split(",").map(x => x.trim()).filter(Boolean),
        v(`ce-a${n}-rate`) !== "" ? { ranged: true, rate: num(v(`ce-a${n}-rate`), 0), range: "M" } : {}));
      const drIn = k => (v("ce-dr-" + k).toLowerCase().startsWith("i") ? "Imm" : num(v("ce-dr-" + k), 0));
      const c = { id: "custom" + Date.now(), name, level: num(v("ce-level"), 1), type: v("ce-type"), kind: v("ce-kind"),
        hp: num(v("ce-hp"), 1), def: num(v("ce-def"), 1), init: num(v("ce-init"), 8),
        dr: { p: drIn("p"), e: drIn("e"), r: drIn("r"), po: drIn("po") }, attacks,
        wealth: num(v("ce-wealth"), 0), junk: num(v("ce-junk"), 0), notes: v("ce-notes") };
      CUSTOM.push(c);
      await Platform.saveJSON("custom_enemies", CUSTOM);
      toast(T("{name} saved to your enemies", { name }));
      renderSetup();
    };
    $("cs-start").onclick = start;
  }

  function start() {
    readSetupForm();
    if (!setup.groups.length) { toast(T("Add at least one enemy")); return; }
    const enemies = [];
    setup.groups.forEach(g => {
      const t = allTemplates().find(x => x.id === g.id);
      if (!t) return;
      for (let i = 1; i <= g.count; i++) enemies.push(Object.assign(JSON.parse(JSON.stringify(t)), {
        uid: "e" + enemies.length, name: g.count > 1 ? `${T(t.name)} ${i}` : T(t.name), maxHp: t.hp,
        status: "active", stunned: false, persist: null, letRipUsed: false }));
    });
    const players = setup.members.map((m, i) => {
      const w = Object.assign({ name: T(m.weapon || "Custom weapon") }, JSON.parse(JSON.stringify(m.w)));
      w.eff = w.eff.map(e => (e === "Piercing" ? `Piercing ${m.w.pierce}` : e));
      return { uid: "P" + i, charId: m.charId, name: m.name, hp: m.hp, maxHp: m.maxHp, def: m.def, init: m.init,
        dr: Object.assign({}, m.dr), meleeBonus: m.meleeBonus, ammo: m.w.ammo, stunned: false, persist: null,
        status: m.hp > 0 ? "up" : "down", w };
    });
    S = { phase: "fight", round: 1, ap: setup.ap, log: [], enemies, players };
    // initiative: highest first, party members win ties
    S.order = players.map(p => p.uid).concat(enemies.map(e => e.uid))
      .sort((a, b) => initOf(b) - initOf(a) || (isP(a) === isP(b) ? 0 : isP(a) ? -1 : 1));
    S.turnIdx = 0; S.turn = null;
    log(T("Combat starts. Initiative: {list}.", { list: S.order.map(id => `${nameOf(id)} (${initOf(id)})`).join(", ") }));
    beginTurn();
  }
  const isP = id => id[0] === "P";
  const enemy = uid => S.enemies.find(e => e.uid === uid);
  const pl = uid => S.players.find(p => p.uid === uid);
  const unit = id => (isP(id) ? pl(id) : enemy(id));
  const initOf = id => unit(id).init;
  const nameOf = id => unit(id).name;
  const alive = () => S.enemies.filter(e => e.status === "active");
  const standing = () => S.players.filter(p => p.status === "up");
  const actor = () => pl(S.turn.actor);

  // ------------------------------------------------------------------ turn flow
  function beginTurn() {
    if (checkVictory()) return;
    if (!standing().length) { S.phase = "defeat"; S.turn = null; log(T("The whole party is down.")); render(); return; }
    const id = S.order[S.turnIdx];
    if (isP(id) ? pl(id).status !== "up" : enemy(id).status !== "active") return endTurn();
    S.turn = { actor: id, step: isP(id) ? "aim" : "eatk" };
    if (unit(id).stunned) S.turn.step = "stunned";
    render();
  }
  function endTurn() {
    const id = S.turn && S.turn.actor;
    if (S.turn && S.turn.step === "stunned") unit(id).stunned = false;
    S.turnIdx++;
    if (S.turnIdx >= S.order.length) endRound();
    beginTurn();
  }
  function endRound() {
    // Persistent damage: applied again at the end of each round for as many rounds as Effects rolled
    S.enemies.filter(e => e.status === "active" && e.persist && e.persist.rounds > 0).forEach(e => {
      const faces = Array.from({ length: e.persist.cd }, d6), r = scoreCD(faces);
      const res = resolveDamage({ total: r.total, effects: 0, eff: [], type: e.persist.type, dr: e.dr, location: "body" });
      e.hp = Math.max(0, e.hp - res.dmg); e.persist.rounds--;
      log(T("{name} suffers persistent damage: {n} (HP {hp}/{max}).", { name: e.name, n: res.dmg, hp: e.hp, max: e.maxHp }));
      if (e.hp <= 0) { e.status = "killed"; log(T("{name} is killed by persistent damage.", { name: e.name })); }
    });
    S.players.filter(p => p.status === "up" && p.persist && p.persist.rounds > 0).forEach(p => {
      const faces = Array.from({ length: p.persist.cd }, d6), r = scoreCD(faces);
      const res = resolveDamage({ total: r.total, effects: 0, eff: [], type: p.persist.type, dr: p.dr, location: "body" });
      p.hp = Math.max(0, p.hp - res.dmg); p.persist.rounds--;
      log(T("{name} suffers persistent damage: {n} (HP {hp}/{max}).", { name: p.name, n: res.dmg, hp: p.hp, max: p.maxHp }));
      if (p.hp <= 0) { p.status = "down"; log(T("{name} goes down.", { name: p.name })); }
    });
    S.round++; S.turnIdx = 0;
    log(T("Round {n} begins.", { n: S.round }));
  }
  function checkVictory() {
    if (S.phase !== "fight") return true;
    if (alive().length) return false;
    S.phase = "victory"; S.turn = null;
    S.rewards = computeRewards();
    log(T("All enemies dealt with. Victory!"));
    render();
    return true;
  }

  // ------------------------------------------------------------------ rendering
  function bar(cur, max) {
    const pct = max ? Math.max(0, Math.min(100, (cur / max) * 100)) : 0;
    return `<div class="hpbar"><div style="width:${pct}%;background:${pct > 50 ? "var(--green)" : pct > 25 ? "var(--amber)" : "var(--red)"}"></div></div>`;
  }
  function combatantsHtml() {
    const cur = S.turn && S.turn.actor;
    const tags = o => [o.stunned ? T("Stunned") : "", o.persist && o.persist.rounds > 0 ? `${T("Persistent")} ${o.persist.rounds}` : ""].filter(Boolean)
      .map(t => `<span class="badge">${t}</span>`).join(" ");
    return S.order.map(id => {
      if (isP(id)) {
        const p = pl(id);
        const ctl = S.editHp === p.uid
          ? `<div class="deal"><input type="number" id="hp-${p.uid}" value="${p.hp}" min="0" max="${p.maxHp}" style="width:72px">
              <button class="btn primary" data-hpok="${p.uid}">${T("OK")}</button><button class="btn" data-hpno="1">${T("Cancel")}</button></div>`
          : `<button class="btn" data-sethp="${p.uid}" title="${T("Healing, stimpaks, reviving")}">${T("Set HP")}</button>`;
        return `<div class="fighter party ${cur === id ? "now" : ""} ${p.status !== "up" ? "down" : ""}"><div class="t"><b>${esc(p.name)}</b>
          ${p.status !== "up" ? `<span class="badge">${T("Down")}</span>` : ""} ${tags(p)}
          <small>${T("HP")} ${p.hp}/${p.maxHp} &middot; ${T("Defense")} ${p.def} &middot; ${T("DR")} ${drTxt(p.dr.p)}/${drTxt(p.dr.e)}/${drTxt(p.dr.r)}/${drTxt(p.dr.po)} &middot; ${esc(T(p.w.name))} &middot; ${T("Ammo")} ${p.ammo} &middot; ${T("Init")} ${p.init}</small>${bar(p.hp, p.maxHp)}</div>${ctl}</div>`;
      }
      const e = enemy(id);
      const st = e.status === "active" ? "" : `<span class="badge">${e.status === "killed" ? T("Killed") : T("Overcome")}</span>`;
      let btn;
      if (e.status !== "active") btn = `<button class="btn" data-undo="${e.uid}">${T("Undo")}</button>`;
      else if (S.dealing === e.uid) btn = `<div class="deal"><button class="btn danger" data-kill="${e.uid}">${T("Killed")}</button>
        <button class="btn" data-over="${e.uid}" title="${T("Fled, surrendered or avoided: XP but no loot")}">${T("Overcome")}</button>
        <button class="btn" data-dealno="1">${T("Cancel")}</button></div>`;
      else btn = `<button class="btn" data-deal="${e.uid}">${T("Dealt with?")}</button>`;
      return `<div class="fighter ${cur === e.uid ? "now" : ""} ${e.status !== "active" ? "down" : ""}"><div class="t"><b>${esc(e.name)}</b> ${st} ${tags(e)}
        <small>${T("HP")} ${e.hp}/${e.maxHp} &middot; ${T("Defense")} ${e.def} &middot; ${T("DR")} ${drTxt(e.dr.p)}/${drTxt(e.dr.e)}/${drTxt(e.dr.r)}/${drTxt(e.dr.po)} &middot; ${T("Init")} ${e.init}</small>${bar(e.hp, e.maxHp)}</div>${btn}</div>`;
    }).join("");
  }

  function render() {
    save();
    if (!S) return renderSetup();
    if (S.phase === "victory") return renderVictory();
    if (S.phase === "defeat") return renderDefeat();
    root().innerHTML = `
      <div class="badges"><span class="badge">${T("Round")} <b>${S.round}</b></span>
        <span class="badge">${T("Group AP")} <b>${S.ap}</b> <button class="mini" id="cb-apm">&minus;</button><button class="mini" id="cb-app">+</button></span>
        <span class="badge">${T("Turn:")} <b>${esc(nameOf(S.turn.actor))}</b></span>
        <span class="badge">${T("Party standing")} <b>${standing().length}/${S.players.length}</b></span></div>
      <div class="card" id="cb-turn">${turnHtml()}</div>
      <h4 class="sec">${T("Combatants (in initiative order)")}</h4>
      <div>${combatantsHtml()}</div>
      <p class="hint">${T("Use <b>Set HP</b> for healing, stimpaks or reviving a downed party member. Use <b>Dealt with?</b> when an enemy dies, flees, surrenders or is avoided: <b>Killed</b> enemies can be looted, <b>Overcome</b> ones only give XP.")}</p>
      <div class="bar"><button class="btn danger" id="cb-abandon">${T("Abandon combat")}</button></div>
      <details class="card"><summary style="cursor:pointer;font-weight:700">${T("Combat log")}</summary>
        <div class="log">${S.log.map(l => `<div>${l}</div>`).join("")}</div></details>`;
    $("cb-apm").onclick = () => { S.ap = Math.max(0, S.ap - 1); render(); };
    $("cb-app").onclick = () => { S.ap = Math.min(6, S.ap + 1); render(); };
    $("cb-abandon").onclick = async () => { if (await confirmBox(T("Abandon this combat? Progress is lost."), T("Abandon"))) { S = null; save(); renderSetup(); } };
    root().querySelectorAll("[data-deal]").forEach(b => (b.onclick = () => { S.dealing = b.dataset.deal; render(); }));
    root().querySelectorAll("[data-dealno]").forEach(b => (b.onclick = () => { S.dealing = null; render(); }));
    root().querySelectorAll("[data-kill]").forEach(b => (b.onclick = () => dealtWith(b.dataset.kill, "killed")));
    root().querySelectorAll("[data-over]").forEach(b => (b.onclick = () => dealtWith(b.dataset.over, "overcome")));
    root().querySelectorAll("[data-undo]").forEach(b => (b.onclick = () => {
      const e = enemy(b.dataset.undo); e.status = "active"; if (e.hp <= 0) e.hp = 1;
      log(T("{name} is back in the fight.", { name: e.name })); render();
    }));
    root().querySelectorAll("[data-sethp]").forEach(b => (b.onclick = () => { S.editHp = b.dataset.sethp; render(); }));
    root().querySelectorAll("[data-hpno]").forEach(b => (b.onclick = () => { S.editHp = null; render(); }));
    root().querySelectorAll("[data-hpok]").forEach(b => (b.onclick = () => {
      const p = pl(b.dataset.hpok);
      p.hp = Math.min(p.maxHp, Math.max(0, num($("hp-" + p.uid).value, p.hp)));
      const was = p.status;
      p.status = p.hp > 0 ? "up" : "down";
      log(T(was !== "up" && p.status === "up" ? "{name}'s HP set to {hp}: back in the fight." : "{name}'s HP set to {hp}.", { name: p.name, hp: p.hp }));
      S.editHp = null; render();
    }));
    wireTurn();
    wireRolls();
  }

  function dealtWith(uid, how) {
    const e = enemy(uid);
    e.status = how; S.dealing = null;
    log(T(how === "killed" ? "{name} is killed." : "{name} is overcome.", { name: e.name }));
    if (S.turn && S.turn.actor === uid) return endTurn();
    if (!checkVictory()) render();
  }

  // ------------------------------------------------------------------ the current turn
  function turnHtml() {
    const t = S.turn;
    if (t.step === "stunned") return `<h3>${T("{name} is stunned", { name: esc(nameOf(t.actor)) })}</h3><p>${T("They lose their normal actions this turn (AP can still be spent).")}</p>
      <button class="btn primary" id="t-end">${T("End turn")}</button>`;
    if (isP(t.actor)) { const p = actor(); return playerTurnHtml(t, p, p.w); }
    return enemyTurnHtml(t, enemy(t.actor));
  }

  function playerTurnHtml(t, p, w) {
    const ranged = !isMelee(w.skill);
    if (t.step === "aim") {
      const opts = alive().map(e => `<option value="${e.uid}" ${t.target === e.uid ? "selected" : ""}>${esc(e.name)} (${T("Def")} ${e.def}, ${T("HP")} ${e.hp})</option>`).join("");
      return `<h3>${T("{name}'s turn: attack with {w}", { name: esc(p.name), w: esc(T(w.name)) })}</h3>
        <p class="hint">${T("TN {tn}, critical on d20 ≤ {crit}. Step 1: choose the target and situation.", { tn: w.tn, crit: w.crit })}</p>
        <div class="row"><div><label class="f">${T("Target")}</label><select id="t-target">${opts}</select></div>
          ${ranged ? `<div><label class="f">${T("Distance to target")}</label><select id="t-range">${RANGES.map(r => `<option value="${r}">${T(RANGE_NAME[r])}</option>`).join("")}</select></div>` : ""}
          <div><label class="f">${T("Bonus d20 bought with AP")}</label><select id="t-buy">${[0, 1, 2, 3].map(n => `<option value="${n}">${n} (${BUY_COST[n]} ${T("AP")})</option>`).join("")}</select></div></div>
        <div class="effs" style="margin-top:8px">
          <label><input type="checkbox" id="t-called"> ${T("Aim at a specific hit location (+1 difficulty)")}</label>
          <select id="t-calledloc" style="width:auto">${LOCS.map(([, n]) => `<option value="${n}">${T(n)}</option>`).join("")}</select>
          <label><input type="checkbox" id="t-sneak"> ${T("Sneak attack (enemy unaware: -1 difficulty, Vicious)")}</label>
          ${ranged ? `<label><input type="checkbox" id="t-reach"> ${T("An enemy is within reach of {name} (+2 difficulty)", { name: esc(p.name) })}</label>` : ""}</div>
        <div class="bar"><button class="btn primary" id="t-next">${T("Next: roll to hit")}</button><button class="btn" id="t-end">${T("Do something else / end turn")}</button></div>`;
    }
    const e = enemy(t.target);
    if (t.step === "roll") return `<h3>${T("{name} rolls to hit {target}", { name: esc(p.name), target: esc(e.name) })}</h3>
      <p>${TP(t.diff, "Roll <b>{dice}d20</b>. Each die ≤ <b>{tn}</b> is 1 success, ≤ <b>{crit}</b> is 2 successes, a 20 is a complication. You need <b>{n}</b> success.",
        "Roll <b>{dice}d20</b>. Each die ≤ <b>{tn}</b> is 1 success, ≤ <b>{crit}</b> is 2 successes, a 20 is a complication. You need <b>{n}</b> successes.", { dice: t.dice, tn: w.tn, crit: w.crit })}</p>${diceInputs("t-d20", t.dice, 20)}
      <div class="bar"><button class="btn primary" id="t-check">${T("Check result")}</button></div>`;
    if (t.step === "loc") return `<h3>${T("Hit! Where did it land?")}</h3><p>${t.testText}</p>
      <p>${T("Roll 1d20 for the hit location (1-2 head, 3-8 torso, 9-11 left arm, 12-14 right arm, 15-17 left leg, 18-20 right leg).")}</p>
      ${diceInputs("t-loc", 1, 20)}<div class="bar"><button class="btn primary" id="t-locok">${T("Set location")}</button></div>`;
    if (t.step === "dmg") {
      const maxExtra = ranged && !isThrown(w.skill) ? Math.max(0, Math.min(w.rate, p.ammo - 1)) : 3;
      return `<h3>${T("Damage to {name} ({loc})", { name: esc(e.name), loc: T(t.location) })}</h3><p>${t.testText}</p>
        <p>${T("Base damage: <b>{n} CD</b>", { n: t.baseCd })}${t.sneakBonus ? " " + T("(includes +2 CD sneak attack)") : ""}.
        ${ranged && !isThrown(w.skill) ? T("Spend extra ammo (each shot adds +1 CD, up to the fire rate):") : T("Spend AP for extra damage (+1 CD each, up to 3):")}</p>
        <div class="row"><div><select id="t-extra">${Array.from({ length: maxExtra + 1 }, (_, i) => `<option value="${i}">+${i} ${T("CD")}${ranged && !isThrown(w.skill) ? ` (${T("{n} extra ammo", { n: i })})` : ` (${i} ${T("AP")})`}</option>`).join("")}</select></div>
          <div><button class="btn" id="t-setcd">${T("Set dice")}</button></div></div>
        <div id="t-cdwrap" style="margin-top:8px">${t.cdCount ? `<p>${T("Roll <b>{n}</b> combat dice (d6: 1=1, 2=2, 3-4=0, 5-6=1+Effect).", { n: t.cdCount })}</p>${diceInputs("t-cd", t.cdCount, 6)}
          <div class="bar"><button class="btn primary" id="t-apply">${T("Apply damage")}</button></div>` : ""}</div>`;
    }
    if (t.step === "burst") return `<h3>${TP(t.burstLeft, "Burst: {n} extra target", "Burst: {n} extra targets")}</h3><p>${t.resultText}</p>
      <p>${T("Each Effect lets the attack hit another enemy within Close range of {name} (1 extra ammo each). Pick who else got hit:", { name: esc(e.name) })}</p>
      <div class="effs">${alive().filter(x => x.uid !== t.target).map(x => `<label><input type="checkbox" class="t-bt" value="${x.uid}"> ${esc(x.name)}</label>`).join("") || `<span class='muted'>${T("No other enemies left.")}</span>`}</div>
      <div class="bar"><button class="btn primary" id="t-burst">${T("Apply to selected")}</button><button class="btn" id="t-noburst">${T("Skip")}</button></div>`;
    return `<h3>${t.hit ? T("Attack resolved") : T("Missed")}</h3><p>${t.resultText || t.testText}</p>
      <div class="bar"><button class="btn primary" id="t-end">${T("End turn")}</button></div>`;
  }

  function enemyTurnHtml(t, e) {
    if (t.step === "eatk") {
      const up = standing();
      const pick = t.victim && pl(t.victim) && pl(t.victim).status === "up" ? t.victim : choice(up).uid;
      return `<h3>${T("{name}'s turn", { name: esc(e.name) })}</h3>
        <div class="row"><div><label class="f">${T("It attacks…")}</label><select id="t-victim">${up.map(p =>
          `<option value="${p.uid}" ${p.uid === pick ? "selected" : ""}>${esc(p.name)} (${T("Def")} ${p.def}, ${T("HP")} ${p.hp}/${p.maxHp})</option>`).join("")}</select></div>
          <div><label class="f">${T("With")}</label><select id="t-atk">${e.attacks.map((a, i) =>
          `<option value="${i}">${esc(T(a.name))}: ${T("TN")} ${a.tn}, ${a.cd} ${T("CD")} ${T(TYPE_NAME[a.type])}${a.eff.length ? ", " + esc(a.eff.map(x => T(x)).join(", ")) : ""}${a.ranged ? ` (${T("ranged")})` : ""}</option>`).join("")}</select></div></div>
        ${e.attacks.some(a => a.ranged) && !e.letRipUsed ? `<label class="effs"><input type="checkbox" id="t-rip"> ${T("Let rip (once per combat, ranged only: +CD equal to fire rate, Burst for free)")}</label>` : ""}
        <p class="hint">${T("A random standing party member is pre-selected; change it to whoever the GM picks. It needs successes equal to that character's Defense.")}</p>
        <div class="bar"><button class="btn primary" id="t-enext">${T("Next: roll to hit")}</button><button class="btn" id="t-end">${T("It does something else / end turn")}</button></div>`;
    }
    const a = e.attacks[t.atk], v = pl(t.victim);
    if (t.step === "eroll") return `<h3>${T("{name} attacks {victim}: {atk}", { name: esc(e.name), victim: esc(v.name), atk: esc(T(a.name)) })}</h3>
      <p>${T("Roll <b>2d20</b> for it. Each die ≤ <b>{tn}</b> is 1 success, ≤ <b>{crit}</b> is 2. It needs <b>{n}</b> ({victim}'s Defense).", { tn: a.tn, crit: a.crit, n: t.diff, victim: esc(v.name) })}</p>
      ${diceInputs("t-d20", 2, 20)}<div class="bar"><button class="btn primary" id="t-echeck">${T("Check result")}</button></div>`;
    if (t.step === "eloc") return `<h3>${T("{name} is hit!", { name: esc(v.name) })}</h3><p>${t.testText}</p><p>${T("Roll 1d20 for the hit location.")}</p>
      ${diceInputs("t-loc", 1, 20)}<div class="bar"><button class="btn primary" id="t-elocok">${T("Set location")}</button></div>`;
    if (t.step === "edmg") return `<h3>${T("Damage to {name} ({loc})", { name: esc(v.name), loc: T(t.location) })}</h3><p>${t.testText}</p>
      <p>${T(t.rip ? "Roll <b>{n}</b> combat dice for {atk} (let rip included)." : "Roll <b>{n}</b> combat dice for {atk}.", { n: t.cdCount, atk: esc(T(a.name)) })}</p>
      ${diceInputs("t-cd", t.cdCount, 6)}<div class="bar"><button class="btn primary" id="t-eapply">${T("Apply damage")}</button></div>`;
    if (t.step === "down") return `<h3>${T("{name} is down!", { name: esc(v.name) })}</h3><p>${t.resultText}</p>
      <p>${T("At 0 HP a character is dying (see the Damage and Injury rules). If someone stabilizes or heals them, set their HP and they keep fighting.")}
      ${standing().length ? "" : `<b>${T("Nobody else in the party is standing.")}</b>`}</p>
      <div class="row"><div><label class="f">${T("{name}'s HP now", { name: esc(v.name) })}</label><input type="number" id="t-sethp" value="1"></div></div>
      <div class="bar"><button class="btn primary" id="t-revive">${T("Keep fighting")}</button><button class="btn danger" id="t-staydown">${T("They stay down")}</button></div>`;
    return `<h3>${t.hit ? T("Attack resolved") : T("It missed")}</h3><p>${t.resultText || t.testText}</p>
      <div class="bar"><button class="btn primary" id="t-end">${T("End turn")}</button></div>`;
  }

  function wireTurn() {
    const t = S.turn, on = (id, f) => { if ($(id)) $(id).onclick = f; };
    const p = isP(t.actor) ? actor() : null, w = p && p.w;
    on("t-end", endTurn);
    // ---------------- party member
    on("t-next", () => {
      const e = enemy($("t-target").value), buy = num($("t-buy").value);
      if (BUY_COST[buy] > S.ap) { toast(T("Not enough AP in the pool ({n})", { n: S.ap })); return; }
      S.ap -= BUY_COST[buy];
      let diff = e.def, notes = [T("Defense {n}", { n: e.def })];
      if (!isMelee(w.skill)) {
        const pen = Math.abs(RANGES.indexOf($("t-range").value) - RANGES.indexOf(w.range));
        if (pen) { diff += pen; notes.push(T("+{n} range", { n: pen })); }
        if ($("t-reach") && $("t-reach").checked) { diff += 2; notes.push(T("+2 enemy within reach")); }
      }
      const called = $("t-called").checked, sneak = $("t-sneak").checked;
      if (called) { diff += 1; notes.push(T("+1 called shot")); }
      if (sneak) { diff = Math.max(0, diff - 1); notes.push(T("-1 sneak attack")); }
      Object.assign(t, { target: e.uid, diff, diffNotes: notes.join(", "), dice: 2 + buy, called: called ? $("t-calledloc").value : null, sneak, step: "roll" });
      if (buy) log(T("{name} buys {n} bonus d20 for {ap} AP.", { name: p.name, n: buy, ap: BUY_COST[buy] }));
      render();
    });
    on("t-check", () => {
      const rolls = readDice("t-d20", 20);
      if (!rolls) return;
      const r = scoreTest(rolls, w.tn, w.crit), e = enemy(t.target);
      t.hit = r.succ >= t.diff;
      const extra = Math.max(0, r.succ - t.diff);
      t.testText = TP(r.succ, "Rolled {rolls}: <b>{n}</b> success vs difficulty {d} ({notes}).", "Rolled {rolls}: <b>{n}</b> successes vs difficulty {d} ({notes}).",
          { rolls: rolls.join(", "), d: t.diff, notes: t.diffNotes }) +
        (t.hit ? ` <b>${T("Hit!")}</b>${extra ? " " + TP(extra, "{n} extra success → +{n} AP.", "{n} extra successes → +{n} AP.") : ""}` : ` <b>${T("Miss.")}</b>`) +
        (r.comps ? ` <span style="color:var(--red)">${TP(r.comps, "{n} complication (the GM adds a problem, e.g. a jam).", "{n} complications (the GM adds a problem, e.g. a jam).")}</span>` : "");
      if (t.hit) S.ap = Math.min(6, S.ap + extra);
      log(T(t.hit ? (r.comps ? "{name} attacks {target}: {s}/{d} successes, hit, complication." : "{name} attacks {target}: {s}/{d} successes, hit.")
        : (r.comps ? "{name} attacks {target}: {s}/{d} successes, miss, complication." : "{name} attacks {target}: {s}/{d} successes, miss."),
        { name: p.name, target: e.name, s: r.succ, d: t.diff }));
      if (!isMelee(w.skill)) { p.ammo = Math.max(0, p.ammo - 1); }
      if (!t.hit) { t.step = "done"; return render(); }
      if (t.called) { t.location = t.called; startDmg(); } else t.step = "loc";
      render();
    });
    on("t-locok", () => { const r = readDice("t-loc", 20); if (!r) return; t.location = locFor(r[0]); startDmg(); render(); });
    on("t-setcd", () => {
      const extra = num($("t-extra").value);
      const usesAmmo = !isMelee(w.skill) && !isThrown(w.skill);
      if (!usesAmmo && extra > S.ap) { toast(T("Not enough AP in the pool ({n})", { n: S.ap })); return; }
      t.extra = extra; t.cdCount = t.baseCd + extra; render();
    });
    on("t-apply", () => {
      const faces = readDice("t-cd", 6);
      if (!faces) return;
      const usesAmmo = !isMelee(w.skill) && !isThrown(w.skill);
      if (usesAmmo) p.ammo = Math.max(0, p.ammo - t.extra); else if (t.extra) S.ap -= t.extra;
      applyPlayerDamage(faces);
      render();
    });
    on("t-burst", () => {
      const picked = [...document.querySelectorAll(".t-bt:checked")].map(i => i.value).slice(0, t.burstLeft);
      const lines = picked.map(uid => {
        if (p.ammo <= 0) return T("{name}: out of ammo", { name: esc(enemy(uid).name) });
        p.ammo--;
        return hitEnemy(enemy(uid), t.roll, t.effects, "torso");
      });
      t.resultText += "<br>" + T("Burst:") + " " + (lines.join("<br>") || T("no extra targets"));
      t.step = "done"; if (!checkVictory()) render();
    });
    on("t-noburst", () => { t.step = "done"; render(); });
    // ---------------- enemy
    on("t-enext", () => {
      const e = enemy(t.actor), a = e.attacks[num($("t-atk").value)];
      t.atk = num($("t-atk").value);
      t.victim = $("t-victim").value;
      t.rip = !!($("t-rip") && $("t-rip").checked && a.ranged);
      if (t.rip) e.letRipUsed = true;
      t.diff = pl(t.victim).def; t.step = "eroll"; render();
    });
    on("t-echeck", () => {
      const rolls = readDice("t-d20", 20);
      if (!rolls) return;
      const e = enemy(t.actor), a = e.attacks[t.atk], v = pl(t.victim), r = scoreTest(rolls, a.tn, a.crit);
      t.hit = r.succ >= t.diff;
      t.testText = TP(r.succ, "{name} rolled {rolls}: <b>{n}</b> success vs {victim}'s Defense {d}.", "{name} rolled {rolls}: <b>{n}</b> successes vs {victim}'s Defense {d}.",
          { name: esc(e.name), rolls: rolls.join(", "), victim: esc(v.name), d: t.diff }) + ` <b>${t.hit ? T("Hit!") : T("Miss.")}</b>` +
        (r.comps ? " " + T("It rolled a complication: something goes wrong for it.") : "");
      log(T(t.hit ? "{name} attacks {victim} with {atk}: hit." : "{name} attacks {victim} with {atk}: miss.", { name: e.name, victim: v.name, atk: T(a.name) }));
      t.step = t.hit ? "eloc" : "done"; render();
    });
    on("t-elocok", () => {
      const r = readDice("t-loc", 20); if (!r) return;
      const e = enemy(t.actor), a = e.attacks[t.atk];
      t.location = locFor(r[0]);
      t.cdCount = a.cd + (t.rip ? Math.max(1, a.rate) : 0);
      t.step = "edmg"; render();
    });
    on("t-eapply", () => {
      const faces = readDice("t-cd", 6);
      if (!faces) return;
      const e = enemy(t.actor), a = e.attacks[t.atk], v = pl(t.victim), r = scoreCD(faces);
      const res = resolveDamage({ total: r.total, effects: r.effects, eff: a.eff, type: a.type, dr: v.dr, location: t.location });
      v.hp = Math.max(0, v.hp - res.dmg);
      const notes = [];
      if (res.rad) { v.maxHp = Math.max(1, v.maxHp - res.rad); v.hp = Math.min(v.hp, v.maxHp); notes.push(T("radiation lowers {name}'s max HP to {n}", { name: esc(v.name), n: v.maxHp })); }
      if (r.effects && effectOf(a.eff, "Stun")) { v.stunned = true; notes.push(T("{name} is stunned next turn", { name: esc(v.name) })); }
      if (r.effects && effectOf(a.eff, "Persistent")) { v.persist = { rounds: r.effects, cd: a.cd, type: a.type }; notes.push(TP(r.effects, "persistent damage for {n} round", "persistent damage for {n} rounds")); }
      if (res.crit) notes.push(`<b>${T("critical hit: injury to {loc}", { loc: locTo(t.location) })}</b> (${injuryText(t.location)})`);
      t.resultText = diceFaces(faces) + res.text + "." + (notes.length ? " " + notes.join("; ") + "." : "") + " " + T("{name} has <b>{hp}/{max}</b> HP.", { name: esc(v.name), hp: v.hp, max: v.maxHp });
      log(T("{name} deals {n} damage to {victim} ({hp}/{max} HP).", { name: e.name, n: res.dmg, victim: v.name, hp: v.hp, max: v.maxHp }));
      if (v.hp <= 0) { v.status = "down"; t.step = "down"; } else t.step = "done";
      render();
    });
    on("t-revive", () => {
      const v = pl(t.victim);
      v.hp = Math.min(v.maxHp, Math.max(1, num($("t-sethp").value, 1))); v.status = "up";
      log(T("{name} keeps fighting with {n} HP.", { name: v.name, n: v.hp })); t.step = "done"; t.resultText = T("{name} is back on their feet.", { name: esc(v.name) }); render();
    });
    on("t-staydown", () => {
      const v = pl(t.victim);
      log(T("{name} is down.", { name: v.name })); t.step = "done"; t.resultText = T("{name} is down. Use Set HP if someone revives them later.", { name: esc(v.name) }); render();
    });
  }

  const INJURY = { Head: "lose a turn's actions or worse perception", Torso: "bleeding: 1 CD damage each turn", "Left arm": "drop what's held, arm unusable",
    "Right arm": "drop what's held, arm unusable", "Left leg": "fall prone, can't sprint", "Right leg": "fall prone, can't sprint" };
  const injuryText = loc => T(INJURY[loc] || "injury");

  function startDmg() {
    const p = actor(), w = p.w, t = S.turn;
    let base = w.cd + (isMelee(w.skill) ? p.meleeBonus : 0);
    t.sneakBonus = false;
    if (t.sneak && effectOf(w.eff, "Vicious")) { base += 2; t.sneakBonus = true; }
    t.baseCd = base; t.cdCount = 0; t.extra = 0; t.step = "dmg";
  }

  // apply rolled damage from the acting party member to one enemy; returns a description
  function hitEnemy(e, total, effects, location) {
    const w = actor().w;
    const eff = w.eff.concat(S.turn.sneak && !effectOf(w.eff, "Vicious") ? ["Vicious"] : []);
    const res = resolveDamage({ total, effects, eff, type: w.type, dr: e.dr, location });
    e.hp = Math.max(0, e.hp - res.dmg - res.rad);
    const notes = [];
    if (effects && effectOf(eff, "Stun")) { e.stunned = true; notes.push(T("stunned")); }
    if (effects && effectOf(eff, "Persistent")) { e.persist = { rounds: effects, cd: w.cd, type: w.type }; notes.push(TP(effects, "persistent for {n} round", "persistent for {n} rounds")); }
    if (effects && effectOf(eff, "Breaking") && drVal(e.dr[w.type]) !== Infinity) {
      e.dr[w.type] = Math.max(0, num(e.dr[w.type]) - effects); notes.push(T(TYPE_NAME[w.type] + " DR broken down to {n}", { n: e.dr[w.type] }));
    }
    if (res.crit) notes.push(`<b>${T("critical hit: injury to {loc}", { loc: locTo(location) })}</b>`);
    let txt = `${esc(e.name)}: ${res.text}${notes.length ? "; " + notes.join("; ") : ""}. ${T("HP")} <b>${e.hp}/${e.maxHp}</b>`;
    if (e.hp <= 0) { e.status = "killed"; txt += ` &rarr; <b>${T("{name} goes down!", { name: esc(e.name) })}</b> ${T("(use Undo if they were spared, then mark them Overcome)")}`; }
    log(T(e.hp <= 0 ? "{name} takes {n} damage ({hp}/{max} HP) and goes down." : "{name} takes {n} damage ({hp}/{max} HP).", { name: e.name, n: res.dmg + res.rad, hp: e.hp, max: e.maxHp }));
    return txt;
  }

  function applyPlayerDamage(faces) {
    const t = S.turn, w = actor().w, e = enemy(t.target), r = scoreCD(faces);
    t.roll = r.total; t.effects = r.effects;
    let txt = diceFaces(faces) + TP(r.effects, "{n} Effect.", "{n} Effects.") + " " + hitEnemy(e, r.total, r.effects, t.location);
    // Spread: one extra hit per Effect for half the rolled damage on a random location
    if (r.effects && effectOf(w.eff, "Spread") && e.status === "active") {
      const extra = [];
      for (let i = 0; i < r.effects && e.status === "active"; i++) extra.push(hitEnemy(e, Math.floor(r.total / 2), 0, locFor(d20())));
      txt += "<br>" + T("Spread:") + " " + extra.join("<br>");
    }
    t.resultText = txt;
    if (r.effects && effectOf(w.eff, "Burst") && alive().some(x => x.uid !== e.uid)) { t.burstLeft = r.effects; t.step = "burst"; }
    else t.step = "done";
    checkVictory();
  }

  // ------------------------------------------------------------------ rewards
  function computeRewards() {
    const lines = [], loot = [];
    let xp = 0, caps = 0;
    S.enemies.forEach(e => {
      const x = xpFor(e.level, e.type);
      xp += x;
      lines.push(T(e.status === "killed" ? "{name} (killed): <b>{n} XP</b>" : "{name} (overcome): <b>{n} XP</b>", { name: esc(e.name), n: x }));
      if (e.status !== "killed") return;
      if (e.wealth) {
        const rolls = Array.from({ length: e.wealth }, d20), sum = rolls.reduce((a, b) => a + b, 0);
        caps += sum; loot.push(T("{name}: <b>{n} caps</b> ({w}d20: {rolls})", { name: esc(e.name), n: sum, w: e.wealth, rolls: rolls.join(", ") }));
      }
      (e.inventory || []).forEach(i => loot.push(`${esc(e.name)}: ${esc(T(i))}`));
      e.attacks.filter(a => a.ranged && a.ammo).forEach(a => {
        const pool = (LOOT_POOLS.Ammunition || []).find(x => x[0] === a.ammo);
        const qty = pool ? pool[1] + scoreCD(Array.from({ length: pool[2] }, d6)).total : 1 + d6();
        loot.push(`${esc(e.name)}: <b>${qty}</b> ${esc(T(a.ammo))}`);
      });
      if (e.junk) {
        const faces = Array.from({ length: e.junk }, d6), fx = faces.filter(f => f >= 5).length;
        for (let i = 0; i < fx; i++) { const j = lootLookup("Junk", d20() + d20()); if (j) loot.push(T("{name}: {item} (junk)", { name: esc(e.name), item: esc(T(j.name)) })); }
      }
      if (e.butchery) loot.push(T("{name} can be butchered: {x}", { name: esc(e.name), x: esc(T(e.butchery)) }));
      if (e.salvage) loot.push(T("{name} can be salvaged: {x}", { name: esc(e.name), x: esc(T(e.salvage)) }));
      if (e.notes) loot.push(`${esc(e.name)}: ${esc(e.notes)}`);
    });
    return { xp, caps, lines, loot };
  }

  function renderVictory() {
    const R = S.rewards;
    const saved = S.players.filter(p => p.charId && ROSTER.find(c => c.id === p.charId));
    root().innerHTML = `<div class="card victory"><div class="vt">&#9733; ${T("VICTORY!")} &#9733;</div>
      <p>${TP(S.round, "All enemies were dealt with in {n} round.", "All enemies were dealt with in {n} rounds.")}</p>
      <ul class="tight">${S.players.map(p => `<li><b>${esc(p.name)}</b>: ${p.status === "up" ? `${p.hp}/${p.maxHp} ${T("HP")}` : T("down (needs help)")}, ${T("{n} ammo left", { n: p.ammo })}</li>`).join("")}</ul>
      <div class="badges"><span class="badge">${T("XP <b>{n}</b> each", { n: R.xp })}</span><span class="badge">${T("Caps")} <b>${R.caps}</b></span><span class="badge">${T("Items")} <b>${R.loot.length}</b></span></div>
      <h4>${T("Experience (every party member gets the total)")}</h4><ul class="tight">${R.lines.map(l => `<li>${l}</li>`).join("")}</ul>
      <h4>${T("Loot from the fallen (split it as the party decides)")}</h4>${R.loot.length ? `<ul class="tight">${R.loot.map(l => `<li>${l}</li>`).join("")}</ul>` : `<p class="muted">${T("Nothing to loot (only killed enemies can be looted).")}</p>`}
      <p class="hint">${T("Caps and junk were rolled for you: caps are d20s equal to each enemy's wealth, junk is combat dice where each Effect is one junk item from the Junk table.")}</p>
      <div class="bar">${saved.length ? `<button class="btn primary" id="cb-note">${saved.length === 1 ? T("Add rewards to the notes of {name}", { name: esc(saved[0].name) }) : T("Add rewards to the notes of {n} saved characters", { n: saved.length })}</button>` : ""}
        <button class="btn" id="cb-new">${T("New combat")}</button></div></div>`;
    if ($("cb-note")) $("cb-note").onclick = async () => {
      const plain = s => s.replace(/<[^>]+>/g, "");
      for (const p of saved) {
        const c = ROSTER.find(x => x.id === p.charId);
        c.notes = ((c.notes || "") + "\n\n" + T("Combat ({date}): +{xp} XP. Party loot: {caps} caps", { date: new Date().toLocaleDateString(LANG), xp: R.xp, caps: R.caps }) +
          (R.loot.length ? "; " + R.loot.map(plain).join("; ") : "") + ".").trim();
        await addToRoster(c);
      }
      $("cb-note").disabled = true; toast(T("Rewards added to {list}", { list: saved.map(p => p.name).join(", ") }));
    };
    $("cb-new").onclick = () => { S = null; save(); renderSetup(); };
  }
  function renderDefeat() {
    root().innerHTML = `<div class="card"><div class="vt" style="color:var(--red)">${T("DEFEAT")}</div>
      <p>${T("The whole party is down in round {n}: {list}. Nothing is looted from this fight.", { n: S.round, list: S.players.map(p => esc(p.name)).join(", ") })}</p>
      <div class="bar"><button class="btn" id="cb-new">${T("New combat")}</button></div></div>`;
    $("cb-new").onclick = () => { S = null; save(); renderSetup(); };
  }

  let ready = null;
  async function show() {
    if (!ready) ready = init();
    await ready;
    if (S) render(); else renderSetup();
  }
  // pre-fill the setup with enemies (from the Encounter Randomizer); "busy" if a fight is running
  async function prepare(groups) {
    if (!ready) ready = init();
    await ready;
    if (S && S.phase === "fight") return "busy";
    if (S) { S = null; save(); }
    if (!setup) newSetup();
    setup.groups = groups.map(g => ({ id: g.id, count: g.count })); // the party stays as it was
    return "ok";
  }
  return { show, prepare };
})();

// Weapons offered in the combat setup: the character-generator weapons (rulebook stats)
// minus the robot arm attachments, which only Mister Handy characters use.
const WEAPONS_FOR_COMBAT = Object.fromEntries(Object.entries(G.WEAPONS).filter(([n]) => !/ Arm$/.test(n)));

// the app may have opened straight on this page before this file finished loading
if (typeof currentPage !== "undefined" && currentPage === "combat") Combat.show();
