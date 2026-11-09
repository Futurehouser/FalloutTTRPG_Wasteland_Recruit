// Table Search: type part of a name and get the core rulebook's stats for weapons, weapon mods,
// apparel (clothing, armor, power armor, robot plating), apparel mods, consumables (food, drinks, chems), tools and utility
// items and robot modules. The tables live in tables_data.js; names match in English or Spanish, with or without accents.
// The Enemies table shows the app's own enemies (enemies.js, the same ones the Combat Assistant uses) plus the ones you saved
// with "Add your own enemy".
const Tables = (() => {
  const LIMIT = 60; // cards drawn at once; typing more narrows the list
  const KINDS = [
    { id: "all", label: "All" },
    { id: "w", label: "Weapons", list: "weapons" },
    { id: "m", label: "Weapon mods", list: "wmods" },
    { id: "a", label: "Armor and clothing", list: "apparel" },
    { id: "am", label: "Armor mods", list: "amods" },
    { id: "c", label: "Food, drinks and chems", list: "cons" },
    { id: "t", label: "Tools and utility items", list: "tools" },
    { id: "rm", label: "Robot modules", list: "robomods" },
    { id: "e", label: "Enemies (NPCs)" },
  ];
  const ORDER = { w: 0, m: 1, a: 2, am: 3, c: 4, t: 5, rm: 6, e: 7 };
  const DURATION = { instant: "Instant", brief: "Brief", lasting: "Lasting" };
  const TRAIT = {
    accurate: "Accurate", blast: "Blast", close_quarters: "Close Quarters", concealed: "Concealed", debilitating: "Debilitating",
    gatling: "Gatling", inaccurate: "Inaccurate", mine: "Mine", night_vision: "Night Vision", parry: "Parry", recon: "Recon",
    reliable: "Reliable", suppressed: "Suppressed", thrown: "Thrown", two_handed: "Two-Handed", unreliable: "Unreliable",
    burst: "Burst", breaking: "Breaking", persistent: "Persistent", piercing_x: "Piercing", radioactive: "Radioactive",
    spread: "Spread", stun: "Stun", vicious: "Vicious", arc: "Arc", freeze: "Freeze", tranquilize_x: "Tranquilize",
    ammo_hungry_x: "Ammo Hungry", aquatic: "Aquatic", bombard: "Bombard", delay_x: "Delay", fuel_x: "Fuel", limited: "Limited",
    placed: "Placed", recoil_x: "Recoil", slow_load: "Slow Load", surge: "Surge", unstable_radiation: "Unstable Radiation", wrangle: "Wrangle",
  };
  const SLOT = {
    receiver: "Receiver", barrel: "Barrel", melee: "Melee", muzzle: "Muzzle", capacitor: "Capacitor", grip: "Grip", nozzle: "Nozzle",
    dish: "Dish", stock: "Stock", sight: "Sight", propellantTank: "Propellant tank", magazine: "Magazine", fuel: "Fuel",
    upgrade: "Upgrade", material: "Material", system: "System", plating: "Plating", lining: "Lining",
  };
  const RANGE = { C: "Close", M: "Medium", L: "Long", X: "Extreme" };
  const DTYPE = { physical: "Physical", energy: "Energy", radiation: "Radiation", poison: "Poison" };

  let kind = "all", built = false, index = [], custom = [];
  let focus = ""; // the weapon whose mod was just tapped: its version of that mod comes first

  // "Tough Clothing" and "Ropa resistente" both become plain lowercase ASCII for matching
  const fold = s => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const trait = t => (t[1] ? `${T(TRAIT[t[0]] || t[0])} ${t[1]}` : T(TRAIT[t[0]] || t[0]));
  const traits = list => (list && list.length ? list.map(trait).join(", ") : "–");
  const lbs = w => (w === "" || w == null ? "–" : w > 0 && w < 1 ? "<1" : String(w));
  const signed = n => (n > 0 ? "+" + n : String(n).replace("-", "−"));
  const perks = s => String(s).split(/\s*[,;]\s*/).map(p => p.replace(/^(.*?)\s*(\d+)$/, (m, n, r) => `${T(n)} ${r}`)).join(", ");

  // both languages always match, whichever one the app is in
  const both = s => [s, ES[s] || s];
  function build() {
    if (built) return;
    built = true;
    KINDS.filter(k => k.list).forEach(k => TABLES[k.list].forEach(r => {
      r.k = k.id;
      const group = [r.g, r.top, r.sub, ...(r.g2 || [])].filter(Boolean);
      index.push({
        r,
        names: both(r.n).map(fold),
        hay: fold([...both(r.n), ...group.flatMap(both), r.slot ? both(SLOT[r.slot] || r.slot).join(" ") : ""].join(" | ")),
      });
    }));
  }
  // enemies are rebuilt each time the page opens, so enemies saved in the Combat Assistant show up
  async function buildEnemies() {
    try { custom = (await Platform.loadJSON("custom_enemies", [])) || []; } catch (e) { custom = []; }
    index = index.filter(e => e.r.k !== "e");
    ENEMY_TEMPLATES.concat(custom.map(c => Object.assign({ group: "Your enemies", mine: true }, c))).forEach(t => {
      const r = { k: "e", n: t.name, g: t.group, t };
      const words = [t.group, t.type, t.kind === "character" ? "Character" : "Creature", ...(t.attacks || []).map(a => a.name), ...(t.inventory || [])];
      index.push({ r, names: (t.mine ? [t.name] : both(t.name)).map(fold), hay: fold([...both(t.name), ...words.flatMap(both), "enemy enemigo npc pnj"].join(" | ")) });
    });
  }
  const enemyCount = () => ENEMY_TEMPLATES.length + custom.length;

  // lower is better: the name starts with the text, then a word in the name does, then the name holds it,
  // then only the group does (Small Guns, Combat Armor...)
  function score(e, words, whole) {
    let best = 9;
    for (const n of e.names) {
      if (n === whole) best = -1;
      else if (n.startsWith(whole)) best = Math.min(best, 0);
      else if (words.every(w => new RegExp("(^|[^a-z0-9])" + w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).test(n))) best = Math.min(best, 1);
      else if (words.every(w => n.includes(w))) best = Math.min(best, 2);
    }
    if (best === 9 && words.every(w => e.hay.includes(w))) best = 3;
    return best;
  }

  const fits = r => (focus && r.fits && r.fits.includes(focus) ? 1 : 0);
  const byLevel = (a, b) => a.t.level - b.t.level || T(a.n).localeCompare(T(b.n), LANG);
  function search(q, only = kind) {
    const whole = fold(q).trim().replace(/\s+/g, " ");
    const words = whole.split(" ").filter(Boolean);
    const pool = index.filter(e => only === "all" || e.r.k === only);
    if (!words.length) return only === "all" ? [] : pool.map(e => e.r).sort(only === "e" ? byLevel : (a, b) => T(a.n).localeCompare(T(b.n), LANG));
    return pool.map(e => ({ r: e.r, s: score(e, words, whole) })).filter(x => x.s < 9)
      .sort((a, b) => a.s - b.s || ORDER[a.r.k] - ORDER[b.r.k] || fits(b.r) - fits(a.r) || T(a.r.n).localeCompare(T(b.r.n), LANG)).map(x => x.r);
  }

  // ---------------- one card per item
  const stat = (label, value) => `<div class="ts-stat"><small>${T(label)}</small><b>${value}</b></div>`;
  const links = (names, cls) => names.map(n => `<button type="button" class="chip ${cls}" data-q="${esc(n)}">${esc(T(n))}</button>`).join("");
  function head(r, tag) {
    const en = LANG !== "en" && T(r.n) !== r.n ? `<span class="ts-en">${esc(r.n)}</span>` : "";
    return `<div class="ts-head"><h3>${esc(T(r.n))}</h3>${en}</div><div class="ts-tag">${tag}</div>`;
  }
  const common = r => stat("Weight", lbs(r.wt)) + stat("Cost", r.c === "" ? "–" : esc(r.c)) + stat("Rarity", esc(r.r));

  function weapon(r) {
    const melee = r.fr == null;
    let html = head(r, `${T("Weapon")} · ${esc(T(r.g))}`) + `<div class="ts-grid">` +
      stat("Damage", `${r.dmg} DC`) + stat("Damage effects", esc(traits(r.fx))) +
      stat("Damage type", esc(r.dt.map(t => T(DTYPE[t])).join(", ") || "–"));
    if (!melee) html += stat("Fire Rate", r.fr) + stat("Range", `${T(RANGE[r.rng])} (${r.rng})`);
    html += stat("Qualities", esc(traits(r.q)));
    if (r.ammo) html += stat("Ammo", esc(T(r.ammo)));
    html += common(r) + `</div>`;
    if (r.mods.length) html += `<h4>${T("Mods it accepts")}</h4><div class="ts-links">${links(r.mods, "ts-mod")}</div>`;
    return html;
  }

  function weaponMod(r) {
    const fx = [];
    if (r.dmg) fx.push(r.dmg[1] ? T("Damage becomes {n} DC", { n: r.dmg[0] }) : T("{n} DC damage", { n: signed(r.dmg[0]) }));
    if (r.fr) fx.push(T("Fire Rate {n}", { n: signed(r.fr) }));
    if (r.rng) fx.push(T(r.rng > 0 ? "Range one step longer" : "Range one step shorter") + (Math.abs(r.rng) > 1 ? ` (${signed(r.rng)})` : ""));
    if (r.add) fx.push(T("Gains {list}", { list: traits(r.add) }));
    if (r.rem) fx.push(T("Loses {list}", { list: traits(r.rem) }));
    if (r.dt) fx.push(T("Damage type: {t}", { t: r.dt.map(t => T(DTYPE[t])).join(", ") }));
    if (r.ammo) fx.push(T("Ammo: {a}", { a: T(r.ammo) }));
    if (r.eff) fx.push(T(r.eff));
    const groups = [r.g, ...(r.g2 || [])].map(g => esc(T(g))).join(", ");
    const only = r.fits.length && r.fits.length <= 2 ? ` · ${esc(T("for {w}", { w: r.fits.map(f => T(f)).join(", ") }))}` : "";
    let html = head(r, `${T("Weapon mod")} · ${groups} · ${esc(T(SLOT[r.slot] || r.slot))}${only}`);
    html += `<ul class="ts-fx">${(fx.length ? fx : [T("No change to the weapon's stats")]).map(f => `<li>${esc(f)}</li>`).join("")}</ul>`;
    html += `<div class="ts-grid">` + (r.pre ? stat("Name prefix", esc(r.pre)) : "") + stat("Perks needed", r.perks ? esc(perks(r.perks)) : T("None")) +
      stat("Weight", r.wt ? signed(r.wt) : "0") + stat("Cost", esc(r.c)) + stat("Rarity", esc(r.r)) + `</div>`;
    if (r.fits.length) html += `<h4>${T("Fits")}</h4><div class="ts-links">${links(r.fits, "ts-fit")}</div>`;
    return html;
  }

  function apparel(r) {
    const tag = [T("Robot armor"), T("Apparel")][r.robot ? 0 : 1] + " · " + esc(T(r.g)) + (r.top && r.top !== r.g ? ` (${esc(T(r.top))})` : "");
    let html = head(r, tag) + `<div class="ts-dr">` +
      `<div><small>${T("Physical DR")}</small><b>${r.p}</b></div><div><small>${T("Energy DR")}</small><b>${r.e}</b></div>` +
      `<div><small>${T("Radiation DR")}</small><b>${r.rad}</b></div></div><div class="ts-grid">` +
      stat("Covers", esc(r.locs.map(l => T(l)).join(", ") || "–"));
    if (r.hp) html += stat("HP", r.hp);
    if (r.carry) html += stat("Carry weight", signed(r.carry));
    return html + common(r) + `</div>`;
  }

  function apparelMod(r) {
    const dr = [["p", "Physical"], ["e", "Energy"], ["rad", "Radiation"]].filter(([k]) => r[k]).map(([k, l]) => `${T(l)} ${signed(r[k])}`);
    let html = head(r, `${T("Armor mod")} · ${esc(T(r.g))}`);
    const fx = [];
    if (dr.length) fx.push(T("Damage resistance: {list}", { list: dr.join(", ") }));
    if (r.hp) fx.push(T("{n} HP", { n: signed(r.hp) }));
    if (r.eff) fx.push(T(r.eff));
    html += `<ul class="ts-fx">${(fx.length ? fx : [T("No change to the armor's stats")]).map(f => `<li>${esc(f)}</li>`).join("")}</ul>`;
    return html + `<div class="ts-grid">` + (r.loc ? stat("Goes on", esc(T(r.loc))) : "") + stat("Type", esc(T(SLOT[r.slot] || r.slot))) +
      stat("Perks needed", r.perks ? esc(perks(r.perks)) : T("None")) + common(r) + `</div>`;
  }

  function consumable(r) {
    const fx = [];
    if (r.hp) fx.push(T("Heals {n} HP", { n: r.hp }));
    if (r.rads) fx.push(T("Heals {n} Radiation damage", { n: r.rads }));
    if (r.eff) fx.push(T(r.eff));
    let html = head(r, `${T("Consumable")} · ${esc(T(r.g))}${r.cooked ? ` · ${T("Cooked recipe")}` : ""}${r.butch ? ` · ${T("From butchering")}` : ""}`);
    html += `<ul class="ts-fx">${(fx.length ? fx : [T("No effect of its own")]).map(f => `<li>${esc(f)}</li>`).join("")}</ul><div class="ts-grid">`;
    if (r.g === "Food" || r.g === "Drink") html += stat("Irradiated", r.irr ? (r.irr > 1 ? T("Yes, roll {n} DC", { n: r.irr }) : T("Yes")) : T("No"));
    if (r.g === "Drink") html += stat("Alcoholic", r.alc ? T("Yes") : T("No"));
    if (r.g === "Chem") {
      html += stat("Addictive", r.add ? T("Yes ({n})", { n: r.add }) : T("No"));
      if (r.dur) html += stat("Duration", esc(T(DURATION[r.dur] || r.dur)));
    }
    return html + stat("Weight", r.wt === 0 ? "<1" : lbs(r.wt)) + stat("Cost", esc(r.c)) + stat("Rarity", esc(r.r)) + `</div>`;
  }

  const fxList = (fx, none) => `<ul class="ts-fx">${(fx.length ? fx : [T(none)]).map(f => `<li>${esc(f)}</li>`).join("")}</ul>`;
  function tool(r) {
    return head(r, T("Tools and utility items")) + fxList(r.eff ? [T(r.eff)] : [], "No effect of its own") + `<div class="ts-grid">` + common(r) + `</div>`;
  }
  function robotModule(r) {
    return head(r, T("Robot module")) + fxList(r.eff ? [T(r.eff)] : [], "No effect of its own") + `<div class="ts-grid">` +
      stat("Perks needed", r.perks ? esc(perks(r.perks)) : T("None")) +
      stat("Carry weight", r.wt ? signed(r.wt) : "0") + stat("Cost", esc(r.c)) + stat("Rarity", esc(r.r)) + `</div>`;
  }

  // ---------------- enemies
  const DR_KEYS = [["p", "Physical"], ["e", "Energy"], ["r", "Radiation"], ["po", "Poison"]];
  const imm = v => v === "Imm" || v === Infinity;
  const SPECIAL_KEYS = ["STR", "PER", "END", "CHA", "INT", "AGI", "LCK"];
  const RANGE_WORD = { C: "Close", M: "Medium", L: "Long", X: "Extreme" };
  function attackLine(a) {
    const bits = [T("TN {n}", { n: a.tn }), T("crit on {n} or less", { n: a.crit }), `${a.cd} DC ${T(DTYPE[{ p: "physical", e: "energy", r: "radiation", po: "poison" }[a.type]] || "Physical")}`];
    if (a.eff && a.eff.length) bits.push(a.eff.map(x => T(x.replace(/ \d+$/, "")) + (/ \d+$/.test(x) ? x.match(/ \d+$/)[0] : "")).join(", "));
    if (a.ranged) {
      bits.push(T("Fire Rate") + " " + (a.rate || 0));
      if (a.range) bits.push(T("Range") + " " + T(RANGE_WORD[a.range] || a.range));
      if (a.ammo) bits.push(T(a.ammo));
    } else bits.push(T("melee"));
    return `<li><b>${esc(T(a.name))}</b>: ${esc(bits.join(" · "))}</li>`;
  }
  function enemy(r) {
    const t = r.t, char = t.kind === "character";
    let html = head(r, `${T("Enemy")} · ${esc(T(t.group))} · ${T(char ? "Character" : "Creature")}`);
    html += `<div class="ts-grid">` + stat("Level", t.level) + stat("Type", esc(T(t.type))) + stat("XP", T("{n} XP each", { n: xpFor(t.level, t.type) })) +
      stat("HP", t.hp) + stat("Defense", t.def) + stat("Initiative", t.init) + `</div>`;
    html += `<div class="ts-dr ts-dr4">${DR_KEYS.map(([k, l]) => `<div><small>${T(l + " DR")}</small><b>${imm(t.dr[k]) ? T("Imm") : t.dr[k]}</b></div>`).join("")}</div>`;
    if (char && t.special) html += `<h4>S.P.E.C.I.A.L.</h4><div class="ts-grid ts-special">${SPECIAL_KEYS.map(k => stat(k, t.special[k])).join("")}</div>`;
    else if (t.body != null) html += `<div class="ts-grid">${stat("Body", t.body)}${stat("Mind", t.mind)}</div>`;
    if (t.attacks && t.attacks.length) html += `<h4>${T("Attacks")}</h4><ul class="ts-fx">${t.attacks.map(attackLine).join("")}</ul>`;
    // abilities that follow from the stats and the rulebook's NPC rules
    const ab = [];
    const immune = DR_KEYS.filter(([k]) => imm(t.dr[k])).map(([, l]) => T(l).toLowerCase());
    if (immune.length) ab.push(T("Immune to {list} damage", { list: immune.join(", ") }));
    if (t.type === "Mighty") ab.push(T("Mighty: twice the HP and XP of a normal creature"));
    if (t.type === "Legendary") ab.push(T("Legendary: three times the HP and XP of a normal creature"));
    if (t.type === "Notable") ab.push(T("Notable: extra HP equal to its Luck, +2 initiative, twice the XP"));
    if (t.type === "Major") ab.push(T("Major: extra HP equal to twice its Luck, +4 initiative, three times the XP"));
    if (char && t.meleeBonus) ab.push(T("Melee bonus: +{n} DC on melee attacks", { n: t.meleeBonus }));
    if (ab.length) html += `<h4>${T("Abilities")}</h4><ul class="ts-fx">${ab.map(a => `<li>${esc(a)}</li>`).join("")}</ul>`;
    const loot = [];
    if (t.inventory && t.inventory.length) loot.push(stat("Inventory", esc(t.inventory.map(i => T(i)).join(", "))));
    if (t.wealth) loot.push(stat("Caps (d20s)", t.wealth));
    if (t.junk) loot.push(stat("Junk (combat dice)", t.junk));
    if (t.butchery) loot.push(stat("Butchery", esc(T(t.butchery))));
    if (t.salvage) loot.push(stat("Salvage", esc(T(t.salvage))));
    if (t.notes) loot.push(stat("Notes", esc(t.notes)));
    if (loot.length) html += `<h4>${T("Loot")}</h4><div class="ts-grid ts-loot">${loot.join("")}</div>`;
    return html;
  }

  const card = r => `<div class="card ts-card ts-${r.k}" data-n="${esc(r.n)}">${{ w: weapon, m: weaponMod, a: apparel, am: apparelMod, c: consumable, t: tool, rm: robotModule, e: enemy }[r.k](r)}</div>`;

  function render() {
    const q = $("ts-q").value;
    const found = search(q);
    const box = $("ts-results");
    if (!q.trim() && kind === "all") {
      $("ts-count").textContent = T("Type a name, or pick a table to browse it.");
      box.innerHTML = "";
      return;
    }
    const elsewhere = !found.length && kind !== "all" ? search(q, "all").length : 0;
    if (elsewhere) {
      $("ts-count").innerHTML = `${esc(T("Nothing in this table matches \"{q}\".", { q: q.trim() }))}
        <button type="button" class="chip" id="ts-all">${T("Search all tables")} <b>${elsewhere}</b></button>`;
      $("ts-all").onclick = () => setKind("all");
      box.innerHTML = "";
      return;
    }
    $("ts-count").textContent = !found.length ? T("Nothing matches \"{q}\".", { q: q.trim() })
      : found.length > LIMIT ? T("{n} results. Showing the first {m}: keep typing to narrow it down.", { n: found.length, m: LIMIT })
      : TP(found.length, "{n} result", "{n} results");
    box.innerHTML = found.slice(0, LIMIT).map(card).join("");
  }

  function setKind(k) {
    kind = k;
    document.querySelectorAll("#ts-kinds button").forEach(b => b.classList.toggle("on", b.dataset.kind === k));
    render();
  }

  async function show() {
    build();
    await buildEnemies();
    const bar = $("ts-kinds");
    bar.innerHTML = KINDS.map(k => `<button type="button" class="chip" data-kind="${k.id}">${T(k.label)}${k.id === "all" ? "" : ` <b>${k.list ? TABLES[k.list].length : enemyCount()}</b>`}</button>`).join("");
    bar.querySelectorAll("button").forEach(b => (b.onclick = () => setKind(b.dataset.kind)));
    setKind(kind);
  }

  let timer = null;
  $("ts-q").oninput = () => { focus = ""; clearTimeout(timer); timer = setTimeout(render, 120); };
  $("ts-clear").onclick = () => { $("ts-q").value = ""; render(); $("ts-q").focus(); };
  // tapping a mod or weapon name on a card looks that one up
  $("ts-results").onclick = e => {
    const b = e.target.closest("[data-q]");
    if (!b) return;
    const mod = b.classList.contains("ts-mod");
    focus = mod ? b.closest(".ts-card").dataset.n : "";
    $("ts-q").value = T(b.dataset.q);
    setKind(mod ? "m" : "w");
    $("main").scrollTop = 0;
  };

  return { show };
})();
