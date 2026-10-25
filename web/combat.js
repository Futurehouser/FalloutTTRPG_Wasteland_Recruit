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
  const drTxt = v => (v === "Imm" || v === Infinity ? "Imm" : v);

  let S = null;               // the whole combat state (saved after every change)
  let setup = null;           // setup form state
  let CUSTOM = [];            // user-made enemies

  // ------------------------------------------------------------------ persistence
  const save = () => Platform.saveJSON("combat_state", S);
  async function init() {
    CUSTOM = await Platform.loadJSON("custom_enemies", []);
    S = await Platform.loadJSON("combat_state", null);
    if (S && S.phase === "setup") S = null;
  }
  const allTemplates = () => ENEMY_TEMPLATES.concat(CUSTOM.map(c => Object.assign({ group: "Your enemies" }, c)));

  function log(msg) { S.log.unshift(`R${S.round}: ${msg}`); S.log = S.log.slice(0, 60); }

  // ------------------------------------------------------------------ dice helpers (shared UI)
  function diceInputs(id, n, max) {
    return `<div class="dice-in" id="${id}">${Array.from({ length: n }, (_, i) =>
      `<input type="number" min="1" max="${max}" inputmode="numeric" placeholder="d${max}" data-i="${i}">`).join("")}
      <button class="btn" data-roll="${id}" data-max="${max}">&#127922; Roll for me</button></div>`;
  }
  function readDice(id, max) {
    const vals = [...document.querySelectorAll(`#${id} input`)].map(i => num(i.value, 0));
    if (vals.some(v => v < 1 || v > max)) { toast(`Enter every die (1-${max}), or tap Roll for me`); return null; }
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
    const parts = [`${total} rolled`];
    if (vicious) parts.push(`+${vicious} Vicious`);
    if (res === Infinity) parts.push(`immune to ${TYPE_NAME[type]}`);
    else if (res) parts.push(`-${blocked} DR (${res}${pierce ? `, ${pierce} ignored by Piercing` : ""})`);
    return { dmg, rad, crit: dmg >= 5, text: `${parts.join(", ")} = <b>${dmg}</b> damage to the ${location.toLowerCase()}` + (rad ? ` + <b>${rad}</b> radiation` : "") };
  }

  // ------------------------------------------------------------------ SETUP
  function newSetup() {
    setup = { charId: "", name: "You", hp: 10, maxHp: 10, def: 1, init: 10, dr: { p: 0, e: 0, r: 0, po: 0 }, ap: 0,
              weapon: "", w: { skill: "Small Guns", tn: 10, crit: 1, cd: 3, type: "p", eff: [], pierce: 1, rate: 2, range: "C", ammo: 20 },
              meleeBonus: 0, groups: [] };
  }
  function fromCharacter(c) {
    const s = c.special;
    const hp = c.maxHp || s.END + s.LCK;
    Object.assign(setup, { charId: c.id, name: c.name, hp, maxHp: hp,
      def: s.AGI >= 9 ? 2 : 1, init: s.PER + s.AGI, meleeBonus: s.STR >= 11 ? 3 : s.STR >= 9 ? 2 : s.STR >= 7 ? 1 : 0 });
    updateTN();
  }
  function updateTN() {
    const c = ROSTER.find(x => x.id === setup.charId);
    if (!c) return;
    const sk = setup.w.skill;
    setup.w.tn = (c.special[G.SKILL_ATTR[sk]] || 5) + (c.skills[sk] || 0);
    setup.w.crit = (c.tags || []).includes(sk) ? Math.max(1, c.skills[sk] || 1) : 1;
  }
  function fromWeapon(name) {
    const w = WEAPONS_FOR_COMBAT[name];
    if (!w) return;
    const effs = (w.eff || "").replace("Persist.", "Persistent").split(",").map(x => x.trim()).filter(x => x && x !== "-");
    Object.assign(setup.w, { skill: w.skill, cd: w.dmg, type: w.type === "Energy" ? "e" : "p",
      eff: effs.map(e => e.split(" ")[0]), pierce: effectOf(effs, "Piercing") || 1,
      rate: typeof w.rate === "number" ? w.rate : 0, range: ["C", "M", "L", "X"].includes(w.range) ? w.range : "C" });
    updateTN();
  }
  const isMelee = sk => sk === "Melee Weapons" || sk === "Unarmed";
  const isThrown = sk => sk === "Throwing" || sk === "Explosives";

  function readSetupForm() {
    const v = id => $(id) ? $(id).value : "";
    Object.assign(setup, { name: v("cs-name").trim() || "You", hp: num(v("cs-hp"), 10), maxHp: num(v("cs-maxhp"), 10),
      def: num(v("cs-def"), 1), init: num(v("cs-init"), 10), ap: Math.min(6, Math.max(0, num(v("cs-ap"), 0))) });
    ["p", "e", "r", "po"].forEach(k => (setup.dr[k] = v("cs-dr-" + k).trim().toLowerCase().startsWith("i") ? "Imm" : num(v("cs-dr-" + k), 0)));
    Object.assign(setup.w, { skill: v("cs-skill"), tn: num(v("cs-tn"), 10), crit: num(v("cs-crit"), 1), cd: num(v("cs-cd"), 3),
      type: v("cs-type"), rate: num(v("cs-rate"), 0), range: v("cs-range"), ammo: num(v("cs-ammo"), 0), pierce: num(v("cs-pierce"), 1),
      eff: [...document.querySelectorAll("#cs-effs input:checked")].map(i => i.value) });
    setup.weapon = v("cs-weapon");
  }

  function renderSetup() {
    if (!setup) newSetup();
    const s = setup, w = s.w;
    const chars = ROSTER.slice().sort((a, b) => a.name.localeCompare(b.name));
    const groups = {};
    allTemplates().forEach(t => (groups[t.group] = groups[t.group] || []).push(t));
    const tplOptions = Object.entries(groups).map(([g, list]) => `<optgroup label="${esc(g)}">${list.map(t =>
      `<option value="${esc(t.id)}">${esc(t.name)} (lvl ${t.level} ${esc(t.type)})</option>`).join("")}</optgroup>`).join("");
    const enemyList = s.groups.length ? s.groups.map((g, i) => {
      const t = allTemplates().find(x => x.id === g.id);
      return t ? `<div class="pcard"><div class="t"><b>${g.count} &times; ${esc(t.name)}</b>
        <small>Level ${t.level} ${esc(t.type)} &middot; HP ${t.hp} &middot; Defense ${t.def} &middot; DR ${drTxt(t.dr.p)}/${drTxt(t.dr.e)}/${drTxt(t.dr.r)}/${drTxt(t.dr.po)} &middot; ${xpFor(t.level, t.type)} XP each</small></div>
        <button class="btn danger" data-rmg="${i}">&#10005;</button></div>` : "";
    }).join("") : `<div class="muted" style="font-size:13px">No enemies added yet.</div>`;

    root().innerHTML = `
    <div class="card"><h4 style="margin-top:0">1. You</h4>
      <div class="row"><div><label class="f">Saved character (fills in your stats)</label><select id="cs-char">
        <option value="">Enter my stats by hand</option>${chars.map(c => `<option value="${esc(c.id)}" ${c.id === s.charId ? "selected" : ""}>${esc(c.name)} (level ${c.level || 1})</option>`).join("")}</select></div>
        <div><label class="f">Name</label><input type="text" id="cs-name" value="${esc(s.name)}"></div></div>
      <div class="row" style="margin-top:8px">
        <div><label class="f">Current HP</label><input type="number" id="cs-hp" value="${s.hp}"></div>
        <div><label class="f">Max HP</label><input type="number" id="cs-maxhp" value="${s.maxHp}"></div>
        <div><label class="f">Defense</label><input type="number" id="cs-def" value="${s.def}"></div>
        <div><label class="f">Initiative</label><input type="number" id="cs-init" value="${s.init}"></div></div>
      <div class="row" style="margin-top:8px">
        ${["p", "e", "r", "po"].map(k => `<div><label class="f">${TYPE_NAME[k]} DR</label><input type="text" id="cs-dr-${k}" value="${drTxt(s.dr[k])}"></div>`).join("")}
        <div><label class="f">Group AP pool</label><input type="number" id="cs-ap" min="0" max="6" value="${s.ap}"></div></div>
      <p class="hint" style="margin:8px 0 0">DR is from your armor (use your torso values, or type Imm if immune).</p></div>

    <div class="card"><h4 style="margin-top:0">2. Your weapon</h4>
      <div class="row"><div><label class="f">Weapon</label><select id="cs-weapon"><option value="">Custom weapon</option>
        ${Object.keys(WEAPONS_FOR_COMBAT).map(n => `<option ${n === s.weapon ? "selected" : ""}>${esc(n)}</option>`).join("")}</select></div>
        <div><label class="f">Skill</label><select id="cs-skill">${COMBAT_SKILLS.map(k => `<option ${k === w.skill ? "selected" : ""}>${k}</option>`).join("")}</select></div></div>
      <div class="row" style="margin-top:8px">
        <div><label class="f">Target number (attribute + skill)</label><input type="number" id="cs-tn" value="${w.tn}"></div>
        <div><label class="f">Critical on d20 &le;</label><input type="number" id="cs-crit" min="1" value="${w.crit}"></div>
        <div><label class="f">Damage (combat dice)</label><input type="number" id="cs-cd" min="1" value="${w.cd}"></div>
        <div><label class="f">Damage type</label><select id="cs-type">${Object.entries(TYPE_NAME).map(([k, n]) => `<option value="${k}" ${k === w.type ? "selected" : ""}>${n}</option>`).join("")}</select></div></div>
      <div class="row" style="margin-top:8px">
        <div><label class="f">Fire rate</label><input type="number" id="cs-rate" min="0" value="${w.rate}"></div>
        <div><label class="f">Ideal range</label><select id="cs-range">${RANGES.map(r => `<option value="${r}" ${r === w.range ? "selected" : ""}>${RANGE_NAME[r]}</option>`).join("")}</select></div>
        <div><label class="f">Ammo / throwables you carry</label><input type="number" id="cs-ammo" min="0" value="${w.ammo}"></div>
        <div><label class="f">Piercing rating</label><input type="number" id="cs-pierce" min="1" value="${w.pierce}"></div></div>
      <label class="f" style="margin-top:8px">Damage effects</label>
      <div id="cs-effs" class="effs">${EFFECT_NAMES.map(e => `<label><input type="checkbox" value="${e}" ${w.eff.includes(e) ? "checked" : ""}> ${e}</label>`).join("")}</div>
      <p class="hint" style="margin:8px 0 0">${isMelee(w.skill) ? `Melee: your melee damage bonus (+${s.meleeBonus} CD) is added automatically.` : "Ranged: you choose how much extra ammo to spend each turn, up to the fire rate."}</p></div>

    <div class="card"><h4 style="margin-top:0">3. Enemies</h4>
      <div class="row"><div style="flex:3 1 200px"><label class="f">Enemy</label><select id="cs-tpl">${tplOptions}</select></div>
        <div style="flex:1 1 70px"><label class="f">How many</label><input type="number" id="cs-count" min="1" max="12" value="1"></div>
        <div style="flex:1 1 90px;align-self:end"><button class="btn primary" id="cs-add" style="width:100%">+ Add</button></div></div>
      <div id="cs-groups" style="margin-top:8px">${enemyList}</div>
      <p class="hint" style="margin:8px 0 0">The built-in enemies use this app's own stats, made with the rulebook's NPC formulas.
        To fight a creature exactly as printed in your book, add it below.</p>
      <details class="card" style="margin:8px 0 0"><summary style="cursor:pointer;font-weight:700">Add your own enemy (from your book)</summary>${customForm()}</details></div>

    <button class="big" id="cs-start">START COMBAT</button>`;
    wireSetup();
  }

  function customForm() {
    const list = CUSTOM.length ? CUSTOM.map((c, i) => `<div class="pcard"><div class="t"><b>${esc(c.name)}</b><small>Level ${c.level} ${esc(c.type)} &middot; HP ${c.hp}</small></div>
      <button class="btn danger" data-rmc="${i}">&#10005;</button></div>`).join("") : "";
    const atkRow = n => `<div class="row" style="margin-top:6px">
      <div style="flex:2 1 120px"><label class="f">Attack ${n} name</label><input type="text" id="ce-a${n}-name" placeholder="${n === 1 ? "Claws" : "(optional)"}"></div>
      <div><label class="f">TN</label><input type="number" id="ce-a${n}-tn"></div>
      <div><label class="f">Skill rank (crit)</label><input type="number" id="ce-a${n}-crit" value="1"></div>
      <div><label class="f">Damage CD</label><input type="number" id="ce-a${n}-cd"></div>
      <div><label class="f">Type</label><select id="ce-a${n}-type">${Object.entries(TYPE_NAME).map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}</select></div>
      <div style="flex:2 1 140px"><label class="f">Effects (e.g. Piercing 1, Vicious)</label><input type="text" id="ce-a${n}-eff"></div>
      <div><label class="f">Fire rate (ranged)</label><input type="number" id="ce-a${n}-rate" placeholder="melee"></div></div>`;
    return `<div class="row" style="margin-top:8px">
      <div style="flex:2 1 160px"><label class="f">Name</label><input type="text" id="ce-name"></div>
      <div><label class="f">Level</label><input type="number" id="ce-level" value="1"></div>
      <div><label class="f">Type</label><select id="ce-type">${Object.keys(XP_MULT).map(t => `<option>${t}</option>`).join("")}</select></div>
      <div><label class="f">Kind</label><select id="ce-kind"><option value="creature">Creature</option><option value="character">Character</option></select></div></div>
    <div class="row" style="margin-top:6px">
      <div><label class="f">HP</label><input type="number" id="ce-hp"></div>
      <div><label class="f">Defense</label><input type="number" id="ce-def" value="1"></div>
      <div><label class="f">Initiative</label><input type="number" id="ce-init"></div>
      ${["p", "e", "r", "po"].map(k => `<div><label class="f">${TYPE_NAME[k]} DR</label><input type="text" id="ce-dr-${k}" value="0"></div>`).join("")}</div>
    ${atkRow(1)}${atkRow(2)}
    <div class="row" style="margin-top:6px">
      <div><label class="f">Caps (d20s)</label><input type="number" id="ce-wealth" value="0"></div>
      <div><label class="f">Junk (combat dice)</label><input type="number" id="ce-junk" value="0"></div>
      <div style="flex:3 1 200px"><label class="f">Inventory / butchery / salvage notes</label><input type="text" id="ce-notes"></div></div>
    <button class="btn primary" id="ce-save" style="margin-top:8px">Save enemy</button>
    <div style="margin-top:8px">${list}</div>`;
  }

  function wireSetup() {
    $("cs-char").onchange = () => {
      readSetupForm();
      const c = ROSTER.find(x => x.id === $("cs-char").value);
      if (c) fromCharacter(c); else setup.charId = "";
      renderSetup();
    };
    $("cs-weapon").onchange = () => { readSetupForm(); fromWeapon($("cs-weapon").value); renderSetup(); };
    $("cs-skill").onchange = () => { readSetupForm(); updateTN(); renderSetup(); };
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
      if (!(await confirmBox(`Delete your enemy "${c.name}"?`))) return;
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
        toast("Name, HP and attack 1 (name, TN, damage) are needed"); return;
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
      toast(`${name} saved to your enemies`);
      renderSetup();
    };
    $("cs-start").onclick = start;
  }

  function start() {
    readSetupForm();
    if (!setup.groups.length) { toast("Add at least one enemy"); return; }
    const enemies = [];
    setup.groups.forEach(g => {
      const t = allTemplates().find(x => x.id === g.id);
      for (let i = 1; i <= g.count; i++) enemies.push(Object.assign(JSON.parse(JSON.stringify(t)), {
        uid: "e" + enemies.length, name: g.count > 1 ? `${t.name} ${i}` : t.name, maxHp: t.hp,
        status: "active", stunned: false, persist: null, letRipUsed: false }));
    });
    const s = setup;
    S = { phase: "fight", round: 1, ap: s.ap, log: [], enemies,
      player: { charId: s.charId, name: s.name, hp: s.hp, maxHp: s.maxHp, def: s.def, init: s.init, dr: Object.assign({}, s.dr),
        meleeBonus: s.meleeBonus, ammo: s.w.ammo, stunned: false, persist: null,
        w: Object.assign({ name: s.weapon || "Your weapon" }, JSON.parse(JSON.stringify(s.w))) } };
    S.player.w.eff = S.player.w.eff.map(e => (e === "Piercing" ? `Piercing ${s.w.pierce}` : e));
    // initiative: highest first, the player wins ties
    S.order = ["P"].concat(enemies.map(e => e.uid))
      .sort((a, b) => initOf(b) - initOf(a) || (a === "P" ? -1 : b === "P" ? 1 : 0));
    S.turnIdx = 0; S.turn = null;
    log(`Combat starts. Initiative: ${S.order.map(id => `${nameOf(id)} (${initOf(id)})`).join(", ")}.`);
    beginTurn();
  }
  const enemy = uid => S.enemies.find(e => e.uid === uid);
  const initOf = id => (id === "P" ? S.player.init : enemy(id).init);
  const nameOf = id => (id === "P" ? S.player.name : enemy(id).name);
  const alive = () => S.enemies.filter(e => e.status === "active");

  // ------------------------------------------------------------------ turn flow
  function beginTurn() {
    if (checkVictory()) return;
    const id = S.order[S.turnIdx];
    if (id !== "P" && enemy(id).status !== "active") return endTurn();
    S.turn = { actor: id, step: id === "P" ? "aim" : "eatk" };
    if (id === "P" && S.player.stunned) S.turn.step = "stunned";
    if (id !== "P" && enemy(id).stunned) S.turn.step = "stunned";
    render();
  }
  function endTurn() {
    const id = S.turn && S.turn.actor;
    if (S.turn && S.turn.step === "stunned") {
      if (id === "P") S.player.stunned = false; else enemy(id).stunned = false;
    }
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
      log(`${e.name} suffers persistent damage: ${res.dmg} (HP ${e.hp}/${e.maxHp}).`);
      if (e.hp <= 0) { e.status = "killed"; log(`${e.name} is killed by persistent damage.`); }
    });
    const p = S.player;
    if (p.persist && p.persist.rounds > 0) {
      const faces = Array.from({ length: p.persist.cd }, d6), r = scoreCD(faces);
      const res = resolveDamage({ total: r.total, effects: 0, eff: [], type: p.persist.type, dr: p.dr, location: "body" });
      p.hp = Math.max(0, p.hp - res.dmg); p.persist.rounds--;
      log(`You suffer persistent damage: ${res.dmg} (HP ${p.hp}/${p.maxHp}).`);
    }
    S.round++; S.turnIdx = 0;
    log(`Round ${S.round} begins.`);
  }
  function checkVictory() {
    if (S.phase !== "fight") return true;
    if (alive().length) return false;
    S.phase = "victory"; S.turn = null;
    S.rewards = computeRewards();
    log("All enemies dealt with. Victory!");
    render();
    return true;
  }

  // ------------------------------------------------------------------ rendering
  function bar(cur, max) {
    const pct = max ? Math.max(0, Math.min(100, (cur / max) * 100)) : 0;
    return `<div class="hpbar"><div style="width:${pct}%;background:${pct > 50 ? "var(--green)" : pct > 25 ? "var(--amber)" : "var(--red)"}"></div></div>`;
  }
  function combatantsHtml() {
    const p = S.player, cur = S.turn && S.turn.actor;
    const tags = o => [o.stunned ? "Stunned" : "", o.persist && o.persist.rounds > 0 ? `Persistent ${o.persist.rounds}` : ""].filter(Boolean)
      .map(t => `<span class="badge">${t}</span>`).join(" ");
    return S.order.map(id => {
      if (id === "P") return `<div class="fighter ${cur === "P" ? "now" : ""}"><div class="t"><b>${esc(p.name)}</b> <span class="muted">(you)</span> ${tags(p)}
        <small>HP ${p.hp}/${p.maxHp} &middot; Defense ${p.def} &middot; DR ${drTxt(p.dr.p)}/${drTxt(p.dr.e)}/${drTxt(p.dr.r)}/${drTxt(p.dr.po)} &middot; Ammo ${p.ammo} &middot; Init ${p.init}</small>${bar(p.hp, p.maxHp)}</div></div>`;
      const e = enemy(id);
      const st = e.status === "active" ? "" : `<span class="badge">${e.status === "killed" ? "Killed" : "Overcome"}</span>`;
      let btn;
      if (e.status !== "active") btn = `<button class="btn" data-undo="${e.uid}">Undo</button>`;
      else if (S.dealing === e.uid) btn = `<div class="deal"><button class="btn danger" data-kill="${e.uid}">Killed</button>
        <button class="btn" data-over="${e.uid}" title="Fled, surrendered or avoided: XP but no loot">Overcome</button>
        <button class="btn" data-dealno="1">Cancel</button></div>`;
      else btn = `<button class="btn" data-deal="${e.uid}">Dealt with?</button>`;
      return `<div class="fighter ${cur === e.uid ? "now" : ""} ${e.status !== "active" ? "down" : ""}"><div class="t"><b>${esc(e.name)}</b> ${st} ${tags(e)}
        <small>HP ${e.hp}/${e.maxHp} &middot; Defense ${e.def} &middot; DR ${drTxt(e.dr.p)}/${drTxt(e.dr.e)}/${drTxt(e.dr.r)}/${drTxt(e.dr.po)} &middot; Init ${e.init}</small>${bar(e.hp, e.maxHp)}</div>${btn}</div>`;
    }).join("");
  }

  function render() {
    save();
    if (!S) return renderSetup();
    if (S.phase === "victory") return renderVictory();
    if (S.phase === "defeat") return renderDefeat();
    root().innerHTML = `
      <div class="badges"><span class="badge">Round <b>${S.round}</b></span>
        <span class="badge">Group AP <b>${S.ap}</b> <button class="mini" id="cb-apm">&minus;</button><button class="mini" id="cb-app">+</button></span>
        <span class="badge">Turn: <b>${esc(nameOf(S.turn.actor))}</b></span></div>
      <div class="card" id="cb-turn">${turnHtml()}</div>
      <h4 class="sec">Combatants (in initiative order)</h4>
      <div>${combatantsHtml()}</div>
      <p class="hint">Use <b>Dealt with?</b> when an enemy dies, flees, surrenders or is avoided. <b>Killed</b> enemies can be looted, <b>Overcome</b> ones only give XP.</p>
      <div class="bar"><button class="btn danger" id="cb-abandon">Abandon combat</button></div>
      <details class="card"><summary style="cursor:pointer;font-weight:700">Combat log</summary>
        <div class="log">${S.log.map(l => `<div>${l}</div>`).join("")}</div></details>`;
    $("cb-apm").onclick = () => { S.ap = Math.max(0, S.ap - 1); render(); };
    $("cb-app").onclick = () => { S.ap = Math.min(6, S.ap + 1); render(); };
    $("cb-abandon").onclick = async () => { if (await confirmBox("Abandon this combat? Progress is lost.", "Abandon")) { S = null; save(); renderSetup(); } };
    root().querySelectorAll("[data-deal]").forEach(b => (b.onclick = () => { S.dealing = b.dataset.deal; render(); }));
    root().querySelectorAll("[data-dealno]").forEach(b => (b.onclick = () => { S.dealing = null; render(); }));
    root().querySelectorAll("[data-kill]").forEach(b => (b.onclick = () => dealtWith(b.dataset.kill, "killed")));
    root().querySelectorAll("[data-over]").forEach(b => (b.onclick = () => dealtWith(b.dataset.over, "overcome")));
    root().querySelectorAll("[data-undo]").forEach(b => (b.onclick = () => {
      const e = enemy(b.dataset.undo); e.status = "active"; if (e.hp <= 0) e.hp = 1;
      log(`${e.name} is back in the fight.`); render();
    }));
    wireTurn();
    wireRolls();
  }

  function dealtWith(uid, how) {
    const e = enemy(uid);
    e.status = how; S.dealing = null;
    log(`${e.name} is ${how}.`);
    if (S.turn && S.turn.actor === uid) return endTurn();
    if (!checkVictory()) render();
  }

  // ------------------------------------------------------------------ the current turn
  function turnHtml() {
    const t = S.turn, p = S.player, w = p.w;
    if (t.step === "stunned") return `<h3>${esc(nameOf(t.actor))} is stunned</h3><p>They lose their normal actions this turn (AP can still be spent).</p>
      <button class="btn primary" id="t-end">End turn</button>`;
    if (t.actor === "P") return playerTurnHtml(t, p, w);
    return enemyTurnHtml(t, enemy(t.actor), p);
  }

  function playerTurnHtml(t, p, w) {
    const ranged = !isMelee(w.skill);
    if (t.step === "aim") {
      const opts = alive().map(e => `<option value="${e.uid}" ${t.target === e.uid ? "selected" : ""}>${esc(e.name)} (Def ${e.def}, HP ${e.hp})</option>`).join("");
      return `<h3>Your turn: attack with ${esc(w.name)}</h3>
        <p class="hint">TN ${w.tn}, critical on d20 &le; ${w.crit}. Step 1: choose the target and situation.</p>
        <div class="row"><div><label class="f">Target</label><select id="t-target">${opts}</select></div>
          ${ranged ? `<div><label class="f">Distance to target</label><select id="t-range">${RANGES.map(r => `<option value="${r}">${RANGE_NAME[r]}</option>`).join("")}</select></div>` : ""}
          <div><label class="f">Bonus d20 bought with AP</label><select id="t-buy">${[0, 1, 2, 3].map(n => `<option value="${n}">${n} (${BUY_COST[n]} AP)</option>`).join("")}</select></div></div>
        <div class="effs" style="margin-top:8px">
          <label><input type="checkbox" id="t-called"> Aim at a specific hit location (+1 difficulty)</label>
          <select id="t-calledloc" style="width:auto">${LOCS.map(([, n]) => `<option>${n}</option>`).join("")}</select>
          <label><input type="checkbox" id="t-sneak"> Sneak attack (enemy unaware: -1 difficulty, Vicious)</label>
          ${ranged ? `<label><input type="checkbox" id="t-reach"> An enemy is within reach of me (+2 difficulty)</label>` : ""}</div>
        <div class="bar"><button class="btn primary" id="t-next">Next: roll to hit</button><button class="btn" id="t-end">Do something else / end turn</button></div>`;
    }
    const e = enemy(t.target);
    if (t.step === "roll") return `<h3>Roll to hit ${esc(e.name)}</h3>
      <p>Roll <b>${t.dice}d20</b>. Each die &le; <b>${w.tn}</b> is 1 success, &le; <b>${w.crit}</b> is 2 successes, a 20 is a complication.
      You need <b>${t.diff}</b> success${t.diff === 1 ? "" : "es"}.</p>${diceInputs("t-d20", t.dice, 20)}
      <div class="bar"><button class="btn primary" id="t-check">Check result</button></div>`;
    if (t.step === "loc") return `<h3>Hit! Where did it land?</h3><p>${t.testText}</p>
      <p>Roll 1d20 for the hit location (1-2 head, 3-8 torso, 9-11 left arm, 12-14 right arm, 15-17 left leg, 18-20 right leg).</p>
      ${diceInputs("t-loc", 1, 20)}<div class="bar"><button class="btn primary" id="t-locok">Set location</button></div>`;
    if (t.step === "dmg") {
      const maxExtra = ranged && !isThrown(w.skill) ? Math.max(0, Math.min(w.rate, p.ammo - 1)) : 3;
      return `<h3>Damage to ${esc(e.name)} (${t.location})</h3><p>${t.testText}</p>
        <p>Base damage: <b>${t.baseCd} CD</b>${t.sneakBonus ? " (includes +2 CD sneak attack)" : ""}.
        ${ranged && !isThrown(w.skill) ? "Spend extra ammo (each shot adds +1 CD, up to the fire rate):" : "Spend AP for extra damage (+1 CD each, up to 3):"}</p>
        <div class="row"><div><select id="t-extra">${Array.from({ length: maxExtra + 1 }, (_, i) => `<option value="${i}">+${i} CD${ranged && !isThrown(w.skill) ? ` (${i} extra ammo)` : ` (${i} AP)`}</option>`).join("")}</select></div>
          <div><button class="btn" id="t-setcd">Set dice</button></div></div>
        <div id="t-cdwrap" style="margin-top:8px">${t.cdCount ? `<p>Roll <b>${t.cdCount}</b> combat dice (d6: 1=1, 2=2, 3-4=0, 5-6=1+Effect).</p>${diceInputs("t-cd", t.cdCount, 6)}
          <div class="bar"><button class="btn primary" id="t-apply">Apply damage</button></div>` : ""}</div>`;
    }
    if (t.step === "burst") return `<h3>Burst: ${t.burstLeft} extra target${t.burstLeft > 1 ? "s" : ""}</h3><p>${t.resultText}</p>
      <p>Each Effect lets the attack hit another enemy within Close range of ${esc(e.name)} (1 extra ammo each). Pick who else got hit:</p>
      <div class="effs">${alive().filter(x => x.uid !== t.target).map(x => `<label><input type="checkbox" class="t-bt" value="${x.uid}"> ${esc(x.name)}</label>`).join("") || "<span class='muted'>No other enemies left.</span>"}</div>
      <div class="bar"><button class="btn primary" id="t-burst">Apply to selected</button><button class="btn" id="t-noburst">Skip</button></div>`;
    // done
    return `<h3>${t.hit ? "Attack resolved" : "Missed"}</h3><p>${t.resultText || t.testText}</p>
      <div class="bar"><button class="btn primary" id="t-end">End turn</button></div>`;
  }

  function enemyTurnHtml(t, e, p) {
    if (t.step === "eatk") {
      return `<h3>${esc(e.name)} attacks you</h3>
        <div class="row"><div><label class="f">Attack</label><select id="t-atk">${e.attacks.map((a, i) =>
          `<option value="${i}">${esc(a.name)}: TN ${a.tn}, ${a.cd} CD ${TYPE_NAME[a.type]}${a.eff.length ? ", " + esc(a.eff.join(", ")) : ""}${a.ranged ? " (ranged)" : ""}</option>`).join("")}</select></div></div>
        ${e.attacks.some(a => a.ranged) && !e.letRipUsed ? `<label class="effs"><input type="checkbox" id="t-rip"> Let rip (once per combat, ranged only: +CD equal to fire rate, Burst for free)</label>` : ""}
        <p class="hint">It needs successes equal to your Defense (${p.def}).</p>
        <div class="bar"><button class="btn primary" id="t-enext">Next: roll to hit</button><button class="btn" id="t-end">It does something else / end turn</button></div>`;
    }
    const a = e.attacks[t.atk];
    if (t.step === "eroll") return `<h3>${esc(e.name)}: ${esc(a.name)}</h3>
      <p>Roll <b>2d20</b> for it. Each die &le; <b>${a.tn}</b> is 1 success, &le; <b>${a.crit}</b> is 2. It needs <b>${t.diff}</b>.</p>
      ${diceInputs("t-d20", 2, 20)}<div class="bar"><button class="btn primary" id="t-echeck">Check result</button></div>`;
    if (t.step === "eloc") return `<h3>You're hit!</h3><p>${t.testText}</p><p>Roll 1d20 for where you're hit.</p>
      ${diceInputs("t-loc", 1, 20)}<div class="bar"><button class="btn primary" id="t-elocok">Set location</button></div>`;
    if (t.step === "edmg") return `<h3>Damage to you (${t.location})</h3><p>${t.testText}</p>
      <p>Roll <b>${t.cdCount}</b> combat dice for ${esc(a.name)}${t.rip ? " (let rip included)" : ""}.</p>
      ${diceInputs("t-cd", t.cdCount, 6)}<div class="bar"><button class="btn primary" id="t-eapply">Apply damage</button></div>`;
    if (t.step === "down") return `<h3>You're down!</h3><p>${t.resultText}</p>
      <p>At 0 HP you're dying (see the Damage and Injury rules). If someone stabilizes or heals you, set your HP and keep fighting.</p>
      <div class="row"><div><label class="f">Your HP now</label><input type="number" id="t-sethp" value="1"></div></div>
      <div class="bar"><button class="btn primary" id="t-revive">Keep fighting</button><button class="btn danger" id="t-defeat">End combat (defeat)</button></div>`;
    return `<h3>${t.hit ? "Attack resolved" : "It missed"}</h3><p>${t.resultText || t.testText}</p>
      <div class="bar"><button class="btn primary" id="t-end">End turn</button></div>`;
  }

  function wireTurn() {
    const t = S.turn, p = S.player, w = p.w, on = (id, f) => { if ($(id)) $(id).onclick = f; };
    on("t-end", endTurn);
    // ---------------- player
    on("t-next", () => {
      const e = enemy($("t-target").value), buy = num($("t-buy").value);
      if (BUY_COST[buy] > S.ap) { toast(`Not enough AP in the pool (${S.ap})`); return; }
      S.ap -= BUY_COST[buy];
      let diff = e.def, notes = [`Defense ${e.def}`];
      if (!isMelee(w.skill)) {
        const pen = Math.abs(RANGES.indexOf($("t-range").value) - RANGES.indexOf(w.range));
        if (pen) { diff += pen; notes.push(`+${pen} range`); }
        if ($("t-reach") && $("t-reach").checked) { diff += 2; notes.push("+2 enemy within reach"); }
      }
      const called = $("t-called").checked, sneak = $("t-sneak").checked;
      if (called) { diff += 1; notes.push("+1 called shot"); }
      if (sneak) { diff = Math.max(0, diff - 1); notes.push("-1 sneak attack"); }
      Object.assign(t, { target: e.uid, diff, diffNotes: notes.join(", "), dice: 2 + buy, called: called ? $("t-calledloc").value : null, sneak, step: "roll" });
      if (buy) log(`You buy ${buy} bonus d20 for ${BUY_COST[buy]} AP.`);
      render();
    });
    on("t-check", () => {
      const rolls = readDice("t-d20", 20);
      if (!rolls) return;
      const r = scoreTest(rolls, w.tn, w.crit), e = enemy(t.target);
      t.hit = r.succ >= t.diff;
      const extra = Math.max(0, r.succ - t.diff);
      t.testText = `Rolled ${rolls.join(", ")}: <b>${r.succ}</b> success${r.succ === 1 ? "" : "es"} vs difficulty ${t.diff} (${t.diffNotes}).` +
        (t.hit ? ` <b>Hit!</b>${extra ? ` ${extra} extra success${extra > 1 ? "es" : ""} &rarr; +${extra} AP.` : ""}` : " <b>Miss.</b>") +
        (r.comps ? ` <span style="color:var(--red)">${r.comps} complication${r.comps > 1 ? "s" : ""} (the GM adds a problem, e.g. a jam).</span>` : "");
      if (t.hit) S.ap = Math.min(6, S.ap + extra);
      log(`You attack ${e.name}: ${r.succ}/${t.diff} successes, ${t.hit ? "hit" : "miss"}${r.comps ? ", complication" : ""}.`);
      if (!isMelee(w.skill)) { p.ammo = Math.max(0, p.ammo - 1); }
      if (!t.hit) { t.step = "done"; return render(); }
      if (t.called) { t.location = t.called; startDmg(); } else t.step = "loc";
      render();
    });
    on("t-locok", () => { const r = readDice("t-loc", 20); if (!r) return; t.location = locFor(r[0]); startDmg(); render(); });
    on("t-setcd", () => {
      const extra = num($("t-extra").value);
      const usesAmmo = !isMelee(w.skill) && !isThrown(w.skill);
      if (!usesAmmo && extra > S.ap) { toast(`Not enough AP in the pool (${S.ap})`); return; }
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
        if (p.ammo <= 0) return `${esc(enemy(uid).name)}: out of ammo`;
        p.ammo--;
        return hitEnemy(enemy(uid), t.roll, t.effects, "torso", true);
      });
      t.resultText += "<br>Burst: " + (lines.join("<br>") || "no extra targets");
      t.step = "done"; if (!checkVictory()) render();
    });
    on("t-noburst", () => { t.step = "done"; render(); });
    // ---------------- enemy
    on("t-enext", () => {
      const e = enemy(t.actor), a = e.attacks[num($("t-atk").value)];
      t.atk = num($("t-atk").value);
      t.rip = !!($("t-rip") && $("t-rip").checked && a.ranged);
      if (t.rip) e.letRipUsed = true;
      t.diff = p.def; t.step = "eroll"; render();
    });
    on("t-echeck", () => {
      const rolls = readDice("t-d20", 20);
      if (!rolls) return;
      const e = enemy(t.actor), a = e.attacks[t.atk], r = scoreTest(rolls, a.tn, a.crit);
      t.hit = r.succ >= t.diff;
      t.testText = `${esc(e.name)} rolled ${rolls.join(", ")}: <b>${r.succ}</b> success${r.succ === 1 ? "" : "es"} vs your Defense ${t.diff}. ${t.hit ? "<b>Hit!</b>" : "<b>Miss.</b>"}` +
        (r.comps ? " It rolled a complication: something goes wrong for it." : "");
      log(`${e.name} attacks with ${a.name}: ${t.hit ? "hit" : "miss"}.`);
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
      const e = enemy(t.actor), a = e.attacks[t.atk], r = scoreCD(faces);
      const res = resolveDamage({ total: r.total, effects: r.effects, eff: a.eff, type: a.type, dr: p.dr, location: t.location });
      p.hp = Math.max(0, p.hp - res.dmg);
      const notes = [];
      if (res.rad) { p.maxHp = Math.max(1, p.maxHp - res.rad); p.hp = Math.min(p.hp, p.maxHp); notes.push(`radiation lowers your max HP to ${p.maxHp}`); }
      if (r.effects && effectOf(a.eff, "Stun")) { p.stunned = true; notes.push("you're stunned next turn"); }
      if (r.effects && effectOf(a.eff, "Persistent")) { p.persist = { rounds: r.effects, cd: a.cd, type: a.type }; notes.push(`persistent damage for ${r.effects} round(s)`); }
      if (res.crit) notes.push(`<b>critical hit: injury to your ${t.location.toLowerCase()}</b> (${injuryText(t.location)})`);
      t.resultText = diceFaces(faces) + res.text + "." + (notes.length ? " " + notes.join("; ") + "." : "") + ` You have <b>${p.hp}/${p.maxHp}</b> HP.`;
      log(`${e.name} deals ${res.dmg} damage to you (${p.hp}/${p.maxHp} HP).`);
      t.step = p.hp <= 0 ? "down" : "done"; render();
    });
    on("t-revive", () => { p.hp = Math.max(1, num($("t-sethp").value, 1)); log(`You keep fighting with ${p.hp} HP.`); t.step = "done"; t.resultText = "Back on your feet."; render(); });
    on("t-defeat", () => { S.phase = "defeat"; log("You were defeated."); render(); });
  }

  const INJURY = { Head: "lose a turn's actions or worse perception", Torso: "bleeding: 1 CD damage each turn", "Left arm": "drop what's held, arm unusable",
    "Right arm": "drop what's held, arm unusable", "Left leg": "fall prone, can't sprint", "Right leg": "fall prone, can't sprint" };
  const injuryText = loc => INJURY[loc] || "injury";

  function startDmg() {
    const p = S.player, w = p.w, t = S.turn;
    let base = w.cd + (isMelee(w.skill) ? p.meleeBonus : 0);
    t.sneakBonus = false;
    if (t.sneak && effectOf(w.eff, "Vicious")) { base += 2; t.sneakBonus = true; }
    t.baseCd = base; t.cdCount = 0; t.extra = 0; t.step = "dmg";
  }

  // apply rolled damage to one enemy; returns a description
  function hitEnemy(e, total, effects, location, quiet) {
    const w = S.player.w;
    const eff = w.eff.concat(S.turn.sneak && !effectOf(w.eff, "Vicious") ? ["Vicious"] : []);
    const res = resolveDamage({ total, effects, eff, type: w.type, dr: e.dr, location });
    e.hp = Math.max(0, e.hp - res.dmg - res.rad);
    const notes = [];
    if (effects && effectOf(eff, "Stun")) { e.stunned = true; notes.push("stunned"); }
    if (effects && effectOf(eff, "Persistent")) { e.persist = { rounds: effects, cd: w.cd, type: w.type }; notes.push(`persistent for ${effects} round(s)`); }
    if (effects && effectOf(eff, "Breaking") && drVal(e.dr[w.type]) !== Infinity) {
      e.dr[w.type] = Math.max(0, num(e.dr[w.type]) - effects); notes.push(`${TYPE_NAME[w.type]} DR broken down to ${e.dr[w.type]}`);
    }
    if (res.crit) notes.push(`<b>critical hit: injury to the ${location.toLowerCase()}</b>`);
    let txt = `${esc(e.name)}: ${res.text}${notes.length ? "; " + notes.join("; ") : ""}. HP <b>${e.hp}/${e.maxHp}</b>`;
    if (e.hp <= 0) { e.status = "killed"; txt += ` &rarr; <b>${esc(e.name)} goes down!</b> (use Undo if you spared them, then mark them Overcome)`; }
    log(`${e.name} takes ${res.dmg + res.rad} damage (${e.hp}/${e.maxHp} HP)${e.hp <= 0 ? " and goes down" : ""}.`);
    if (quiet) return txt;
    return txt;
  }

  function applyPlayerDamage(faces) {
    const t = S.turn, w = S.player.w, e = enemy(t.target), r = scoreCD(faces);
    t.roll = r.total; t.effects = r.effects;
    let txt = diceFaces(faces) + `${r.effects} Effect${r.effects === 1 ? "" : "s"}. ` + hitEnemy(e, r.total, r.effects, t.location);
    // Spread: one extra hit per Effect for half the rolled damage on a random location
    if (r.effects && effectOf(w.eff, "Spread") && e.status === "active") {
      const extra = [];
      for (let i = 0; i < r.effects && e.status === "active"; i++) extra.push(hitEnemy(e, Math.floor(r.total / 2), 0, locFor(d20()), true));
      txt += "<br>Spread: " + extra.join("<br>");
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
      lines.push(`${esc(e.name)} (${e.status === "killed" ? "killed" : "overcome"}): <b>${x} XP</b>`);
      if (e.status !== "killed") return;
      if (e.wealth) {
        const rolls = Array.from({ length: e.wealth }, d20), sum = rolls.reduce((a, b) => a + b, 0);
        caps += sum; loot.push(`${esc(e.name)}: <b>${sum} caps</b> (${e.wealth}d20: ${rolls.join(", ")})`);
      }
      (e.inventory || []).forEach(i => loot.push(`${esc(e.name)}: ${esc(i)}`));
      e.attacks.filter(a => a.ranged && a.ammo).forEach(a => {
        const pool = (LOOT_POOLS.Ammunition || []).find(x => x[0] === a.ammo);
        const qty = pool ? pool[1] + scoreCD(Array.from({ length: pool[2] }, d6)).total : 1 + d6();
        loot.push(`${esc(e.name)}: <b>${qty}</b> ${esc(a.ammo)}`);
      });
      if (e.junk) {
        const faces = Array.from({ length: e.junk }, d6), fx = faces.filter(f => f >= 5).length;
        for (let i = 0; i < fx; i++) { const j = lootLookup("Junk", d20() + d20()); if (j) loot.push(`${esc(e.name)}: ${esc(j.name)} (junk)`); }
      }
      if (e.butchery) loot.push(`${esc(e.name)} can be butchered: ${esc(e.butchery)}`);
      if (e.salvage) loot.push(`${esc(e.name)} can be salvaged: ${esc(e.salvage)}`);
      if (e.notes) loot.push(`${esc(e.name)}: ${esc(e.notes)}`);
    });
    return { xp, caps, lines, loot };
  }

  function renderVictory() {
    const R = S.rewards, p = S.player;
    root().innerHTML = `<div class="card victory"><div class="vt">&#9733; VICTORY! &#9733;</div>
      <p>All enemies were dealt with in ${S.round} round${S.round > 1 ? "s" : ""}. ${p.name === "You" ? "You end" : esc(p.name) + " ends"} the fight with ${p.hp}/${p.maxHp} HP and ${p.ammo} ammo left.</p>
      <div class="badges"><span class="badge">XP <b>${R.xp}</b></span><span class="badge">Caps <b>${R.caps}</b></span><span class="badge">Items <b>${R.loot.length}</b></span></div>
      <h4>Experience (every player character gets the total)</h4><ul class="tight">${R.lines.map(l => `<li>${l}</li>`).join("")}</ul>
      <h4>Loot from the fallen</h4>${R.loot.length ? `<ul class="tight">${R.loot.map(l => `<li>${l}</li>`).join("")}</ul>` : `<p class="muted">Nothing to loot (only killed enemies can be looted).</p>`}
      <p class="hint">Caps and junk were rolled for you: caps are d20s equal to each enemy's wealth, junk is combat dice where each Effect is one junk item from the Junk table.</p>
      <div class="bar">${p.charId && ROSTER.find(c => c.id === p.charId) ? `<button class="btn primary" id="cb-note">Add rewards to ${esc(p.name)}'s notes</button>` : ""}
        <button class="btn" id="cb-new">New combat</button></div></div>`;
    if ($("cb-note")) $("cb-note").onclick = async () => {
      const c = ROSTER.find(x => x.id === p.charId);
      const plain = s => s.replace(/<[^>]+>/g, "");
      c.notes = ((c.notes || "") + `\n\nCombat (${new Date().toLocaleDateString()}): +${R.xp} XP, +${R.caps} caps.` +
        (R.loot.length ? " Loot: " + R.loot.map(plain).join("; ") + "." : "")).trim();
      await addToRoster(c);
      $("cb-note").disabled = true; toast(`Rewards added to ${c.name}'s notes`);
    };
    $("cb-new").onclick = () => { S = null; save(); renderSetup(); };
  }
  function renderDefeat() {
    root().innerHTML = `<div class="card"><div class="vt" style="color:var(--red)">DEFEAT</div>
      <p>${esc(S.player.name)} fell in round ${S.round}. Survivors may still loot nothing from this fight.</p>
      <div class="bar"><button class="btn" id="cb-new">New combat</button></div></div>`;
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
    setup.groups = groups.map(g => ({ id: g.id, count: g.count }));
    return "ok";
  }
  return { show, prepare };
})();

// Weapons offered in the combat setup: the character-generator weapons (rulebook stats)
// minus the robot arm attachments, which only Mister Handy characters use.
const WEAPONS_FOR_COMBAT = Object.fromEntries(Object.entries(G.WEAPONS).filter(([n]) => !/ Arm$/.test(n)));

// the app may have opened straight on this page before this file finished loading
if (typeof currentPage !== "undefined" && currentPage === "combat") Combat.show();
