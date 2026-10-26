// Encounter Randomizer: a 2d20 roll + the party's level (and size) -> a random encounter while
// resting or travelling. The encounter table and texts are original to this app. Enemies come from
// the app's enemy list (built-in templates + enemies you entered from your book) and are only
// picked when they suit the party's level; group size follows an XP budget from the NPC XP table.
const Encounter = (() => {
  const $e = id => document.getElementById(id);

  // ---- 2d20 table (2 = worst luck, 40 = best). Resting shifts the roll up: camps are quieter.
  const TABLE = [
    { max: 4, kind: "fight", diff: "Deadly", factor: 1.6, title: "Ambush!",
      text: { travel: "The road narrows and the enemy is already waiting. They strike first.",
              rest: "Something found your camp in the dark. The watch spots it barely in time." },
      note: "Surprise: whoever is on watch makes a PER + Survival test (difficulty 2). On a failure, the enemies act first in round 1." },
    { max: 9, kind: "fight", diff: "Hard", factor: 1.2, title: "Hostile creatures",
      text: { travel: "Tracks, then noises, then teeth: you've wandered into something's hunting ground.",
              rest: "Scratching at the edge of the firelight. Something hungry has smelled your food." },
      group: ["Animals & insects", "Mutated humanoids"] },
    { max: 14, kind: "fight", diff: "Normal", factor: 1.0, title: "Hostile wastelanders",
      text: { travel: "A group up ahead spots you at the same moment you spot them. Nobody lowers their weapon.",
              rest: "Voices and boots close to camp: someone wants what you're carrying." },
      group: ["People", "Mutated humanoids", "Robots"],
      note: "They might be talked down: CHA + Speech (difficulty 3) before the first shot avoids the fight and still counts as overcoming them." },
    { max: 17, kind: "hazard", title: "Trouble in the air", options: [
      ["Radstorm", "A green-tinged storm rolls in. Find shelter (PER + Survival, difficulty 2) or everyone suffers 2 combat dice of radiation damage."],
      ["Booby-trapped path", "Someone rigged the way ahead. Spot it with PER + Survival (difficulty 2); disarm it with AGI + Explosives (difficulty 2) or suffer 4 combat dice of physical damage."],
      ["Toxic sludge", "The ground turns into reeking sludge. Cross carefully (AGI + Athletics, difficulty 1) or suffer 2 combat dice of poison damage."],
      ["Collapsing ruin", "The shelter you picked groans and starts to give way. Get out (AGI + Athletics, difficulty 2) or take 3 combat dice of physical damage."]] },
    { max: 24, kind: "quiet", title: "All quiet", text: {
      travel: "Hours of empty road, dust and distant thunder. You make good time.",
      rest: "The night passes without trouble. Everyone gets their rest." },
      note: "No encounter. A good moment for scavenging, crafting or roleplay." },
    { max: 28, kind: "people", title: "Travelers on the road", options: [
      ["Trader caravan", "A trader with two pack brahmin and a nervous guard. Willing to buy, sell and swap rumors."],
      ["Lost settlers", "A small family looking for a safe settlement. They can pay a little to be escorted."],
      ["Wandering doctor", "A traveling doctor offers to treat injuries for caps (or a favor)."],
      ["Scavenger crew", "Rival scavengers, armed but not looking for a fight. They'll trade a tip about a nearby ruin for supplies."]] },
    { max: 33, kind: "discovery", title: "Something worth exploring", options: [
      ["Abandoned shack", "A boarded-up shack with its door hanging open."],
      ["Crashed vertibird", "Twisted metal half-buried in the dirt, its cargo hatch still sealed."],
      ["Overturned truck", "A pre-War delivery truck on its side, cargo spilled across the road."],
      ["Hidden cellar", "A trapdoor half-buried under debris leads down into the dark."]],
      note: "Use the Scavenging Location tool to build it." },
    { max: 37, kind: "friendly", title: "A friendly face", options: [
      ["Friendly patrol", "A local militia patrol shares news of what's ahead and points out a safe route."],
      ["Stray dog", "A scruffy dog starts following the party. Treat it kindly and it might stay."],
      ["Old hermit", "A hermit offers a warm meal and a story that hints at a forgotten stash."]] },
    { max: 40, kind: "lucky", title: "Lucky find", options: [
      ["Forgotten stash", "A hidden supply cache, untouched for years. Roll twice in the Loot Roller: once on Ammunition, once on Chems."],
      ["Working vending machine", "It still has power, and drinks. Everyone gets a free Nuka-Cola."],
      ["Shortcut", "A safe shortcut: the journey takes half the time, and nobody is ambushed on the way."]] },
  ];

  let CUSTOM = [];
  async function loadCustom() { CUSTOM = await Platform.loadJSON("custom_enemies", []); }
  const allEnemies = () => ENEMY_TEMPLATES.concat(CUSTOM.map(c => Object.assign({ group: "Your enemies" }, c)));

  // which enemies suit the party: never more than 2 levels above it, and the big types
  // (Mighty / Legendary / Major) only at or below the party's level
  function suits(t, level) {
    if (t.level > level + 2) return false;
    if (["Mighty", "Legendary", "Major"].includes(t.type) && t.level > level) return false;
    return t.level >= Math.max(1, level - 6);
  }

  function pickEnemies(level, size, factor, groups) {
    let pool = allEnemies().filter(t => suits(t, level));
    const themed = groups ? pool.filter(t => groups.includes(t.group) || t.group === "Your enemies") : pool;
    if (themed.length) pool = themed;
    if (!pool.length) pool = allEnemies().slice().sort((a, b) => a.level - b.level).slice(0, 1); // fallback: weakest
    const budget = xpFor(level, "Normal") * size * factor;
    // favour enemies close to the party's level
    const main = wpick(pool, pool.map(t => 1 / Math.pow(1 + Math.abs(level - t.level), 2)));
    const out = [];
    const mainCount = Math.min(8, Math.max(1, Math.round((budget * 0.75) / xpFor(main.level, main.type))));
    out.push({ t: main, count: mainCount });
    let left = budget - mainCount * xpFor(main.level, main.type);
    const helpers = pool.filter(t => t !== main && t.group === main.group && t.level <= main.level);
    if (helpers.length && left > 0 && rnd() < 0.55) {
      const h = choice(helpers), n = Math.min(6, Math.floor(left / xpFor(h.level, h.type)));
      if (n > 0) out.push({ t: h, count: n });
    }
    return out;
  }

  function generate({ roll, level, size, mode }) {
    const shifted = Math.min(40, roll + (mode === "rest" ? 3 : 0));
    const row = TABLE.find(r => shifted <= r.max);
    const enc = { roll, shifted, level, size, mode, kind: row.kind, title: row.title, diff: row.diff || null, note: row.note || "" };
    if (row.options) { const [name, text] = choice(row.options); enc.subtitle = name; enc.text = text; }
    else enc.text = row.text[mode];
    if (row.kind === "fight") {
      enc.enemies = pickEnemies(level, size, row.factor, row.group);
      enc.xp = enc.enemies.reduce((s, e) => s + e.count * xpFor(e.t.level, e.t.type), 0);
    }
    return enc;
  }

  // ---- stat block for one enemy type
  const drT = v => (v === "Imm" ? T("Imm") : v);
  const TYPE = { p: "Physical", e: "Energy", r: "Radiation", po: "Poison" };
  function statBlock(t, count) {
    const atks = t.attacks.map(a => `<tr><td><b>${esc(T(a.name))}</b>${a.ranged ? ` <span class="muted">(${a.rate ? T("ranged, fire rate {n}", { n: a.rate }) : T("ranged")})</span>` : ""}</td>
      <td>${T("TN")} ${a.tn}</td><td>${a.cd} ${T("CD")} ${T(TYPE[a.type])}</td><td class="muted">${esc((a.eff || []).map(x => T(x)).join(", ") || "-")}</td></tr>`).join("");
    const extra = [t.butchery && T("Butchery: {x}", { x: T(t.butchery) }), t.salvage && T("Salvage: {x}", { x: T(t.salvage) }),
      t.inventory && T("Carries: {x}", { x: t.inventory.map(i => T(i)).join(", ") }), t.notes, t.wealth ? T("Caps: {n}d20", { n: t.wealth }) : ""].filter(Boolean);
    return `<div class="card statblock"><div class="sb-head"><h3>${count} &times; ${esc(T(t.name))}</h3>
        <span class="badge">${T("Level")} <b>${t.level}</b> ${esc(T(t.type))}</span><span class="badge">${T("{n} XP each", { n: xpFor(t.level, t.type) })}</span></div>
      <div class="sb-grid">
        <div class="stat"><b>${t.hp}</b><small>${T("HP")}</small></div><div class="stat"><b>${t.def}</b><small>${T("Defense")}</small></div>
        <div class="stat"><b>${t.init}</b><small>${T("Initiative")}</small></div>
        <div class="stat"><b>${drT(t.dr.p)}</b><small>${T("Phys. DR")}</small></div><div class="stat"><b>${drT(t.dr.e)}</b><small>${T("Energy DR")}</small></div>
        <div class="stat"><b>${drT(t.dr.r)}</b><small>${T("Rad. DR")}</small></div><div class="stat"><b>${drT(t.dr.po)}</b><small>${T("Poison DR")}</small></div></div>
      ${t.body ? `<div class="muted" style="font-size:13px;margin:6px 0">${T("Body")} ${t.body} &middot; ${T("Mind")} ${t.mind}</div>` : ""}
      ${t.special ? `<div class="muted" style="font-size:13px;margin:6px 0">${G.SPECIAL.map(k => `${T(k)} ${t.special[k]}`).join(" &middot; ")}</div>` : ""}
      <table class="lt">${atks}</table>
      ${extra.length ? `<div class="muted" style="font-size:13px;margin-top:6px">${extra.map(esc).join("<br>")}</div>` : ""}
      ${t.group === "Your enemies" ? "" : `<div class="muted" style="font-size:11px;margin-top:6px">${T("App estimate. Add the book's stat block under Combat Assistant → Add your own enemy.")}</div>`}</div>`;
  }

  // ---- page
  let last = null;
  function render(enc) {
    const out = $e("en-out");
    const icons = { fight: "&#9876;", hazard: "&#9888;", quiet: "&#127769;", people: "&#128100;", discovery: "&#128269;", friendly: "&#129309;", lucky: "&#127808;" };
    let h = `<div class="card"><div class="muted">${T("2d20 roll {n}", { n: enc.roll })}${enc.mode === "rest" ? ` (${T("+3 for resting = {n}", { n: enc.shifted })})` : ""} &middot; ${TP(enc.size, "party level {lvl}, {n} member", "party level {lvl}, {n} members", { lvl: enc.level })}</div>
      <h3 style="margin-top:6px">${icons[enc.kind] || ""} ${esc(T(enc.title))}${enc.subtitle ? `: ${esc(T(enc.subtitle))}` : ""}</h3>
      ${enc.diff ? `<div class="badges"><span class="badge">${T("Difficulty")} <b>${T(enc.diff)}</b></span><span class="badge">${T("Total <b>{n}</b> XP", { n: enc.xp })}</span></div>` : ""}
      <p>${esc(T(enc.text))}</p>${enc.note ? `<p class="hint">${esc(T(enc.note))}</p>` : ""}`;
    if (enc.enemies) {
      h += `<h4>${T("Enemies")}</h4><ul class="tight">${enc.enemies.map(e => `<li><b>${e.count} &times; ${esc(T(e.t.name))}</b> (${T("level {n}", { n: e.t.level })} ${esc(T(e.t.type))})</li>`).join("")}</ul>
        <div class="bar"><button class="btn primary" id="en-fight">&#9876; ${T("Fight this in the Combat Assistant")}</button></div></div>
        <h4 class="sec">${T("Enemy stats")}</h4>${enc.enemies.map(e => statBlock(e.t, e.count)).join("")}`;
    } else if (enc.kind === "discovery") {
      h += `<div class="bar"><button class="btn primary" id="en-scav">&#127962; ${T("Build it with the Scavenging Location tool")}</button></div></div>`;
    } else if (enc.kind === "lucky" && /Loot Roller/.test(enc.text)) {
      h += `<div class="bar"><button class="btn primary" id="en-loot">&#128176; ${T("Open the Loot Roller")}</button></div></div>`;
    } else h += `</div>`;
    out.innerHTML = h;
    if ($e("en-fight")) $e("en-fight").onclick = async () => {
      const r = await Combat.prepare(enc.enemies.map(e => ({ id: e.t.id, count: e.count })));
      if (r === "busy") { toast(T("A combat is already running: finish or abandon it first")); showPage("combat"); return; }
      showPage("combat");
      toast(T("Enemies added. Check your stats and weapon, then Start combat"));
    };
    if ($e("en-scav")) $e("en-scav").onclick = () => scavengeFromEncounter({ site: enc.subtitle, level: enc.level, text: enc.text });
    if ($e("en-loot")) $e("en-loot").onclick = () => showPage("loot");
  }

  function setup() {
    for (let i = 1; i <= 25; i++) $e("en-level").insertAdjacentHTML("beforeend", `<option ${i === 1 ? "selected" : ""}>${i}</option>`);
    $e("en-roll2").onclick = () => { $e("en-roll").value = randint(1, 20) + randint(1, 20); };
    $e("en-gen").onclick = async () => {
      const roll = parseInt($e("en-roll").value, 10);
      if (!(roll >= 2 && roll <= 40)) { toast(T("Enter your 2d20 total (2-40), or tap Roll 2d20 for me")); return; }
      await loadCustom();
      last = generate({ roll, level: +$e("en-level").value, size: Math.min(8, Math.max(1, parseInt($e("en-size").value, 10) || 4)),
                        mode: $e("en-mode").value });
      render(last);
    };
  }
  return { setup, generate, suits };
})();
Encounter.setup();
