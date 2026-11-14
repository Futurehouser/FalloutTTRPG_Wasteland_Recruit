// Gear: a character's equipment, picked from the Table Search tables (tables_data.js): weapons with their mods,
// armor and clothing with their mods, robot modules, and everything else they carry (food, drinks, chems, tools
// and utility items). Mods change the stats automatically: a weapon mod can change the damage, fire rate, range,
// damage type, ammo, effects and qualities; an armor mod adds damage resistance (and HP for power armor).
//
// Saved on the character:
//   weapons:  [{ name, ammo, mods: [mod name...] }]   (the Combat Assistant arms the character with these)
//   apparel:  [{ name, mods: [mod name...] }]
//   robomods: [module name...]
//   items:    [{ name, qty }]                          (consumables and tools)
const Gear = (() => {
  const EFFECTS = new Set(["vicious", "burst", "piercing_x", "stun", "spread", "breaking", "radioactive", "persistent", "arc", "freeze", "tranquilize_x"]);
  const TRAIT = {
    accurate: "Accurate", blast: "Blast", close_quarters: "Close Quarters", concealed: "Concealed", debilitating: "Debilitating",
    gatling: "Gatling", inaccurate: "Inaccurate", mine: "Mine", night_vision: "Night Vision", parry: "Parry", recon: "Recon",
    reliable: "Reliable", suppressed: "Suppressed", thrown: "Thrown", two_handed: "Two-Handed", unreliable: "Unreliable",
    burst: "Burst", breaking: "Breaking", persistent: "Persistent", piercing_x: "Piercing", radioactive: "Radioactive",
    spread: "Spread", stun: "Stun", vicious: "Vicious", arc: "Arc", freeze: "Freeze", tranquilize_x: "Tranquilize",
  };
  const SLOT = { receiver: "Receiver", barrel: "Barrel", melee: "Melee", muzzle: "Muzzle", capacitor: "Capacitor", grip: "Grip", nozzle: "Nozzle",
    dish: "Dish", stock: "Stock", sight: "Sight", propellantTank: "Propellant tank", magazine: "Magazine", fuel: "Fuel",
    upgrade: "Upgrade", material: "Material", system: "System", plating: "Plating", lining: "Lining" };
  const RANGE = { C: "Close", M: "Medium", L: "Long", X: "Extreme" };
  const RANGES = ["C", "M", "L", "X"];
  const BODY = ["Head", "Torso", "Left arm", "Right arm", "Left leg", "Right leg"];
  const SKILL_ORDER = ["Small Guns", "Energy Weapons", "Big Guns", "Melee Weapons", "Unarmed", "Throwing", "Explosives"];

  const find = (list, n) => (typeof TABLES !== "undefined" ? TABLES[list].find(x => x.n === n) : null);
  const traitName = ([k, v]) => T(TRAIT[k] || k) + (v != null ? " " + v : "");
  const lbs = w => (w > 0 && w < 1 ? "<1" : String(Math.round(w * 10) / 10));

  // ---------------------------------------------------------------- weapons
  const wmodFor = (weapon, mod) => TABLES.wmods.find(m => m.n === mod && m.fits.includes(weapon));
  function weaponSlots(weapon) {
    const out = {};
    TABLES.wmods.filter(m => m.fits.includes(weapon)).forEach(m => {
      out[m.slot] = out[m.slot] || [];
      if (!out[m.slot].some(x => x.n === m.n)) out[m.slot].push(m);
    });
    return out;
  }
  // the weapon from the tables with its mods applied
  function moddedWeapon(name, mods) {
    const b = find("weapons", name);
    if (!b) return null;
    const r = { n: name, g: b.g, dmg: b.dmg, fx: b.fx.map(x => x.slice()), q: b.q.map(x => x.slice()), dt: b.dt.slice(),
      fr: b.fr, rng: b.rng, ammo: b.ammo, wt: b.wt, c: b.c, notes: [] };
    const used = {};
    (mods || []).forEach(mn => {
      const m = wmodFor(name, mn);
      if (!m || used[m.slot]) return; // one mod per slot
      used[m.slot] = 1;
      if (m.dmg) r.dmg = m.dmg[1] ? m.dmg[0] : r.dmg + m.dmg[0];
      if (m.fr && r.fr != null) r.fr = Math.max(0, r.fr + m.fr);
      if (m.rng && r.rng) r.rng = RANGES[Math.min(3, Math.max(0, RANGES.indexOf(r.rng) + m.rng))];
      (m.rem || []).forEach(t => { r.fx = r.fx.filter(x => x[0] !== t[0]); r.q = r.q.filter(x => x[0] !== t[0]); });
      (m.add || []).forEach(t => {
        const list = EFFECTS.has(t[0]) ? r.fx : r.q, i = list.findIndex(x => x[0] === t[0]);
        if (i >= 0) list[i] = t.slice(); else list.push(t.slice());
      });
      if (m.dt) r.dt = m.dt.slice();
      if (m.ammo) r.ammo = m.ammo;
      r.wt += m.wt || 0; r.c += m.c || 0;
      if (m.eff) r.notes.push(m.eff);
    });
    r.dmg = Math.max(1, r.dmg);
    r.wt = Math.max(0, Math.round(r.wt * 10) / 10);
    return r;
  }
  // in the shape the Combat Assistant uses (WEAPONS_FOR_COMBAT)
  const toCombat = r => ({
    skill: r.g, dmg: r.dmg, type: r.dt.includes("energy") && !r.dt.includes("physical") ? "Energy" : "Phys",
    eff: r.fx.length ? r.fx.map(([k, v]) => (TRAIT[k] || k) + (v != null ? " " + v : "")).join(", ") : "-",
    rate: r.fr == null ? "-" : r.fr, range: r.rng || "-", qual: r.q.map(([k, v]) => (TRAIT[k] || k) + (v != null ? " " + v : "")).join(", "),
    wt: r.wt, ammo: r.ammo || null, notes: r.notes,
  });
  // the stats of a character's weapon, mods included
  function weaponStats(w) {
    const mods = (w && w.mods) || [];
    if (mods.length && find("weapons", w.name)) return toCombat(moddedWeapon(w.name, mods));
    return typeof WEAPONS_FOR_COMBAT !== "undefined" ? WEAPONS_FOR_COMBAT[w.name] : null;
  }
  const isMelee = s => s.skill === "Melee Weapons" || s.skill === "Unarmed";
  function weaponLine(s) {
    if (!s) return "";
    const parts = [T(s.skill), `${s.dmg} ${T("CD")} ${T(s.type === "Energy" ? "Energy" : "Physical")}`];
    if (s.eff && s.eff !== "-") parts.push(TL(s.eff));
    if (!isMelee(s) && typeof s.rate === "number") parts.push(`${T("Fire rate")} ${s.rate}`);
    if (!isMelee(s) && RANGE[s.range]) parts.push(T(RANGE[s.range]));
    if (s.qual) parts.push(TL(s.qual));
    if (s.ammo) parts.push(T(s.ammo));
    if (s.wt != null && s.wt !== "") parts.push(`${lbs(+s.wt || 0)} ${T("lbs")}`);
    return parts.map(esc).join(" &middot; ") + ((s.notes || []).length ? `<br><i>${s.notes.map(n => esc(T(n))).join(" · ")}</i>` : "");
  }

  // ---------------------------------------------------------------- armor and clothing
  const hasLoc = (a, re) => a.locs.some(l => re.test(l));
  function locOk(a, loc) {
    if (!loc || loc === "All Locations") return true;
    return loc.split(/\s*,\s*/).some(l => /Torso/.test(l) ? hasLoc(a, /Torso/) : /Arm/.test(l) ? hasLoc(a, /arm/i)
      : /Leg/.test(l) ? hasLoc(a, /leg/i) : /Head|Helm/.test(l) ? hasLoc(a, /Head/) : true);
  }
  // can this armor mod go on this piece?
  function amodFits(a, m) {
    if (m.kind === "armor") {
      if (a.top !== "Armor") return false;
      if (m.slot === "material") return m.g === a.g + " Material" && (m.loc === "Torso" ? hasLoc(a, /Torso/) : !(a.locs.length === 1 && a.locs[0] === "Torso"));
      // a chest piece takes the "(Torso)" version of an upgrade when there is one
      if (a.locs.length === 1 && a.locs[0] === "Torso" && m.loc !== "Torso" && TABLES.amods.some(x => x.n === m.n + " (Torso)")) return false;
      return locOk(a, m.loc) && (m.loc !== "Torso" || hasLoc(a, /Torso/));
    }
    if (m.kind === "clothing") {
      if (m.g === "Vault Jumpsuit Mods") return /Jumpsuit/.test(a.n);
      return ["Clothing", "Outfits", "Headgear"].includes(a.top);
    }
    if (m.kind === "powerArmor") {
      if (a.top !== "Power Armor" || !a.locs.length) return false;
      const model = m.g.split(" / ")[1];
      if (model && model !== "All Power Armor" && model !== a.g) return false;
      if (m.loc === "Helm, Arms, Legs") return !hasLoc(a, /Torso/);
      return locOk(a, m.loc);
    }
    return false;
  }
  const amodFor = (a, mod) => TABLES.amods.find(m => m.n === mod && amodFits(a, m));
  function apparelSlots(name) {
    const a = find("apparel", name), out = {};
    if (!a) return out;
    TABLES.amods.filter(m => amodFits(a, m)).forEach(m => {
      out[m.slot] = out[m.slot] || [];
      if (!out[m.slot].some(x => x.n === m.n)) out[m.slot].push(m);
    });
    return out;
  }
  function moddedApparel(name, mods) {
    const a = find("apparel", name);
    if (!a) return null;
    const r = { n: name, top: a.top, g: a.g, p: a.p, e: a.e, rad: a.rad, hp: a.hp || 0, locs: a.locs, wt: a.wt || 0, carry: a.carry || 0, robot: a.robot, notes: [] };
    const used = {};
    (mods || []).forEach(mn => {
      const m = amodFor(a, mn);
      if (!m || used[m.slot]) return;
      used[m.slot] = 1;
      r.p += m.p || 0; r.e += m.e || 0; r.rad += m.rad || 0; r.hp += m.hp || 0; r.wt += m.wt || 0;
      if (m.eff) r.notes.push(m.eff);
    });
    return r;
  }
  // damage resistance on each body location, adding up everything worn there (clothing under armor stacks)
  function bodyDR(apparel) {
    const out = {};
    (apparel || []).forEach(it => {
      const r = moddedApparel(it.name, it.mods);
      if (!r) return;
      r.locs.forEach(l => {
        out[l] = out[l] || { p: 0, e: 0, rad: 0 };
        out[l].p += r.p; out[l].e += r.e; out[l].rad += r.rad;
      });
    });
    return out;
  }
  const drOrder = dr => BODY.filter(l => dr[l]).concat(Object.keys(dr).filter(l => !BODY.includes(l)));
  function drTable(dr) {
    const locs = drOrder(dr);
    if (!locs.length) return "";
    return `<table class="lt gx-dr"><tr><th></th><th>${T("Phys.")}</th><th>${T("Energy")}</th><th>${T("Rad.")}</th></tr>${locs.map(l =>
      `<tr><td>${esc(T(l))}</td><td>${dr[l].p}</td><td>${dr[l].e}</td><td>${dr[l].rad}</td></tr>`).join("")}</table>`;
  }

  // ---------------------------------------------------------------- items
  const itemRow = n => find("cons", n) || find("tools", n);
  function itemNote(r) {
    if (!r) return "";
    const fx = [];
    if (r.hp) fx.push(T("Heals {n} HP", { n: r.hp }));
    if (r.rads) fx.push(T("Heals {n} Radiation damage", { n: r.rads }));
    if (r.eff) fx.push(T(r.eff));
    return fx.join(" · ");
  }

  // load and capacity
  function load(c) {
    let wt = 0, extra = 0;
    (c.weapons || []).forEach(w => { const s = weaponStats(w); if (s && typeof s.wt === "number") wt += s.wt; });
    (c.apparel || []).forEach(a => { const r = moddedApparel(a.name, a.mods); if (r) { wt += r.wt; extra += r.carry; } });
    (c.items || []).forEach(i => { const r = itemRow(i.name); if (r) wt += (r.wt || 0) * (i.qty || 1); });
    return { wt: Math.round(wt * 10) / 10, extra };
  }

  // ---------------------------------------------------------------- pickers
  const opt = (n, label) => `<option value="${esc(n)}">${esc(label || T(n))}</option>`;
  function weaponOptions() {
    const groups = {};
    TABLES.weapons.forEach(w => (groups[w.g] = groups[w.g] || []).push(w.n));
    if (typeof WEAPONS_FOR_COMBAT !== "undefined") Object.entries(WEAPONS_FOR_COMBAT).forEach(([n, w]) => {
      if (!find("weapons", n)) (groups[w.skill] = groups[w.skill] || []).push(n);
    });
    return SKILL_ORDER.filter(g => groups[g]).map(g => `<optgroup label="${esc(T(g))}">${groups[g].sort((a, b) => T(a).localeCompare(T(b))).map(n => opt(n)).join("")}</optgroup>`).join("");
  }
  function apparelOptions(race) {
    const groups = {};
    TABLES.apparel.filter(a => (race === "robot" ? true : !a.robot) && a.top !== "Dog Armor").forEach(a => {
      const g = a.top === "Armor" || a.top === "Power Armor" ? a.g : a.top;
      (groups[g] = groups[g] || []).push(a.n);
    });
    return Object.keys(groups).sort((a, b) => T(a).localeCompare(T(b))).map(g =>
      `<optgroup label="${esc(T(g))}">${groups[g].sort((a, b) => T(a).localeCompare(T(b))).map(n => opt(n)).join("")}</optgroup>`).join("");
  }
  function itemOptions() {
    const groups = {};
    TABLES.cons.forEach(r => (groups[r.g] = groups[r.g] || []).push(r.n));
    groups["Tools and utility items"] = TABLES.tools.map(r => r.n);
    return Object.keys(groups).map(g => `<optgroup label="${esc(T(g))}">${groups[g].sort((a, b) => T(a).localeCompare(T(b))).map(n => opt(n)).join("")}</optgroup>`).join("");
  }
  const modSelect = (attr, i, slot, mods, current) => `<label class="gx-mod"><small>${esc(T(SLOT[slot] || slot))}</small>
    <select ${attr}="${i}" data-slot="${slot}"><option value="">${esc(T("No mod"))}</option>${mods.map(m =>
      `<option value="${esc(m.n)}"${current === m.n ? " selected" : ""}>${esc(T(m.n))}</option>`).join("")}</select></label>`;
  const currentIn = (mods, list) => (list || []).find(n => mods.some(m => m.n === n)) || "";
  function setSlot(item, slotMods, value) {
    item.mods = (item.mods || []).filter(n => !slotMods.some(m => m.n === n));
    if (value) item.mods.push(value);
  }

  // ---------------------------------------------------------------- the editor (Create Character / Edit)
  // st: { weapons, apparel, robomods, items }, race(): the character's kind, info(): { special, carry }
  function editor(root, st, race, info) {
    const draw = () => {
      const rc = race(), robot = rc === "robot";
      const wl = st.weapons.map((w, i) => {
        const s = weaponStats(w), slots = find("weapons", w.name) ? weaponSlots(w.name) : {};
        return `<div class="gx-item"><div class="gx-top"><b>${esc(T(w.name))}</b><button type="button" class="btn danger" data-wrm="${i}" title="${esc(T("Remove"))}">&#10005;</button></div>
          <small class="gx-stats">${weaponLine(s)}</small>
          ${Object.keys(slots).length ? `<div class="gx-mods">${Object.entries(slots).map(([slot, mods]) => modSelect("data-wmod", i, slot, mods, currentIn(mods, w.mods))).join("")}</div>` : ""}
          ${s && !isMelee(s) ? `<label class="gx-qty"><small>${esc(T(s.skill === "Throwing" || s.skill === "Explosives" ? "Throwables" : "Ammo"))}</small><input type="number" min="0" max="9999" data-wammo="${i}" value="${w.ammo || 0}"></label>` : ""}</div>`;
      }).join("") || `<div class="muted">${esc(T("No weapons yet."))}</div>`;
      const al = st.apparel.map((a, i) => {
        const r = moddedApparel(a.name, a.mods), slots = apparelSlots(a.name);
        return `<div class="gx-item"><div class="gx-top"><b>${esc(T(a.name))}</b><button type="button" class="btn danger" data-arm="${i}" title="${esc(T("Remove"))}">&#10005;</button></div>
          <small class="gx-stats">${r ? `${esc(T("DR"))} ${r.p}/${r.e}/${r.rad} (${esc(T("Phys."))}/${esc(T("Energy"))}/${esc(T("Rad."))}) &middot; ${esc(r.locs.map(l => T(l)).join(", ") || T("Frame"))}${r.hp ? ` &middot; ${r.hp} ${esc(T("HP"))}` : ""}${r.carry ? ` &middot; +${r.carry} ${esc(T("lbs"))} ${esc(T("carry"))}` : ""} &middot; ${lbs(r.wt)} ${esc(T("lbs"))}${r.notes.length ? `<br><i>${r.notes.map(n => esc(T(n))).join(" · ")}</i>` : ""}` : ""}</small>
          ${Object.keys(slots).length ? `<div class="gx-mods">${Object.entries(slots).map(([slot, mods]) => modSelect("data-amod", i, slot, mods, currentIn(mods, a.mods))).join("")}</div>` : ""}</div>`;
      }).join("") || `<div class="muted">${esc(T("No armor or clothing yet."))}</div>`;
      const ml = st.robomods.map((n, i) => { const r = find("robomods", n);
        return `<div class="gx-item"><div class="gx-top"><b>${esc(T(n))}</b><button type="button" class="btn danger" data-mrm="${i}" title="${esc(T("Remove"))}">&#10005;</button></div>
          <small class="gx-stats">${r && r.eff ? esc(T(r.eff)) : ""}</small></div>`; }).join("") || `<div class="muted">${esc(T("No robot modules yet."))}</div>`;
      const il = st.items.map((it, i) => { const r = itemRow(it.name);
        return `<div class="gx-item gx-row"><div class="gx-grow"><b>${esc(T(it.name))}</b><small class="gx-stats">${esc(itemNote(r))}${r ? ` &middot; ${lbs(r.wt || 0)} ${esc(T("lbs"))}` : ""}</small></div>
          <label class="gx-qty"><small>${esc(T("How many"))}</small><input type="number" min="1" max="999" data-iqty="${i}" value="${it.qty || 1}"></label>
          <button type="button" class="btn danger" data-irm="${i}" title="${esc(T("Remove"))}">&#10005;</button></div>`; }).join("") || `<div class="muted">${esc(T("No items yet."))}</div>`;
      const ld = load(st), inf = info(), cap = inf.carry + ld.extra;
      root.innerHTML = `
        <h4>${esc(T("Weapons"))}</h4>
        <div class="gx-add"><select id="gx-wpick">${weaponOptions()}</select><button type="button" class="btn" id="gx-wadd">${esc(T("+ Add"))}</button></div>
        <div class="gx-list">${wl}</div>
        <h4>${esc(T("Armor and clothing"))}</h4>
        <div class="gx-add"><select id="gx-apick">${apparelOptions(rc)}</select><button type="button" class="btn" id="gx-aadd">${esc(T("+ Add"))}</button></div>
        <div class="gx-list">${al}</div>
        ${st.apparel.length ? `<p class="muted gx-sub">${esc(T("Damage resistance by location (everything worn there added up):"))}</p>${drTable(bodyDR(st.apparel))}` : ""}
        ${robot || st.robomods.length ? `<h4>${esc(T("Robot modules"))}</h4>
          <div class="gx-add"><select id="gx-mpick">${TABLES.robomods.map(r => opt(r.n)).join("")}</select><button type="button" class="btn" id="gx-madd">${esc(T("+ Add"))}</button></div>
          <div class="gx-list">${ml}</div>` : ""}
        <h4>${esc(T("Food, drinks, chems, tools and other items"))}</h4>
        <div class="gx-add"><select id="gx-ipick">${itemOptions()}</select><input type="number" id="gx-iqty" min="1" max="999" value="1" aria-label="${esc(T("How many"))}"><button type="button" class="btn" id="gx-iadd">${esc(T("+ Add"))}</button></div>
        <div class="gx-list">${il}</div>
        <p class="gx-load ${ld.wt > cap ? "over" : ""}">${esc(T("Carried: {w} of {c} lbs", { w: lbs(ld.wt), c: cap }))}${ld.wt > cap ? " &middot; " + esc(T("over-encumbered")) : ""}</p>`;
      // keep the pickers where they were
      ["gx-wpick", "gx-apick", "gx-mpick", "gx-ipick"].forEach(id => { if ($(id) && keep[id]) $(id).value = keep[id]; });
      wire();
    };
    const keep = {};
    const remember = () => ["gx-wpick", "gx-apick", "gx-mpick", "gx-ipick"].forEach(id => { if ($(id)) keep[id] = $(id).value; });
    const redraw = () => { remember(); draw(); };
    function wire() {
      $("gx-wadd").onclick = () => {
        const n = $("gx-wpick").value, s = weaponStats({ name: n });
        st.weapons.push({ name: n, ammo: s && !isMelee(s) ? (s.skill === "Throwing" || s.skill === "Explosives" ? 3 : 20) : 0, mods: [] });
        redraw();
      };
      $("gx-aadd").onclick = () => { st.apparel.push({ name: $("gx-apick").value, mods: [] }); redraw(); };
      if ($("gx-madd")) $("gx-madd").onclick = () => { const n = $("gx-mpick").value; if (!st.robomods.includes(n)) st.robomods.push(n); redraw(); };
      $("gx-iadd").onclick = () => {
        const n = $("gx-ipick").value, q = Math.min(999, Math.max(1, parseInt($("gx-iqty").value, 10) || 1)), have = st.items.find(i => i.name === n);
        if (have) have.qty = Math.min(999, (have.qty || 1) + q); else st.items.push({ name: n, qty: q });
        redraw();
      };
      root.querySelectorAll("[data-wrm]").forEach(b => (b.onclick = () => { st.weapons.splice(+b.dataset.wrm, 1); redraw(); }));
      root.querySelectorAll("[data-arm]").forEach(b => (b.onclick = () => { st.apparel.splice(+b.dataset.arm, 1); redraw(); }));
      root.querySelectorAll("[data-mrm]").forEach(b => (b.onclick = () => { st.robomods.splice(+b.dataset.mrm, 1); redraw(); }));
      root.querySelectorAll("[data-irm]").forEach(b => (b.onclick = () => { st.items.splice(+b.dataset.irm, 1); redraw(); }));
      root.querySelectorAll("[data-wmod]").forEach(sel => (sel.onchange = () => {
        const w = st.weapons[+sel.dataset.wmod];
        setSlot(w, weaponSlots(w.name)[sel.dataset.slot] || [], sel.value); redraw();
      }));
      root.querySelectorAll("[data-amod]").forEach(sel => (sel.onchange = () => {
        const a = st.apparel[+sel.dataset.amod];
        setSlot(a, apparelSlots(a.name)[sel.dataset.slot] || [], sel.value); redraw();
      }));
      root.querySelectorAll("[data-wammo]").forEach(inp => (inp.onchange = () => { st.weapons[+inp.dataset.wammo].ammo = Math.min(9999, Math.max(0, parseInt(inp.value, 10) || 0)); }));
      root.querySelectorAll("[data-iqty]").forEach(inp => (inp.onchange = () => { st.items[+inp.dataset.iqty].qty = Math.min(999, Math.max(1, parseInt(inp.value, 10) || 1)); redraw(); }));
    }
    draw();
    return { redraw };
  }

  // ---------------------------------------------------------------- the profile (read only)
  function summary(c, carry) {
    const ap = c.apparel || [], mods = c.robomods || [], items = c.items || [];
    if (!ap.length && !mods.length && !items.length) return "";
    const ld = load(c), cap = carry + ld.extra;
    let h = "";
    if (ap.length) {
      h += `<h4>${esc(T("Armor and clothing"))}</h4>` + ap.map(a => {
        const r = moddedApparel(a.name, a.mods);
        return `<div class="pcard"><div class="t"><b>${esc(T(a.name))}</b>${(a.mods || []).length ? ` <span class="muted">+ ${a.mods.map(m => esc(T(m))).join(", ")}</span>` : ""}
          <small>${r ? `${esc(T("DR"))} ${r.p}/${r.e}/${r.rad} &middot; ${esc(r.locs.map(l => T(l)).join(", ") || T("Frame"))}${r.hp ? ` &middot; ${r.hp} ${esc(T("HP"))}` : ""}` : ""}</small></div></div>`;
      }).join("") + `<p class="muted gx-sub">${esc(T("Damage resistance by location (physical / energy / radiation):"))}</p>${drTable(bodyDR(ap))}`;
    }
    if (mods.length) h += `<h4>${esc(T("Robot modules"))}</h4>` + mods.map(n => { const r = find("robomods", n);
      return `<div class="pcard"><div class="t"><b>${esc(T(n))}</b><small style="white-space:normal">${r && r.eff ? esc(T(r.eff)) : ""}</small></div></div>`; }).join("");
    if (items.length) h += `<h4>${esc(T("Items"))}</h4><div class="gx-chips">${items.map(i =>
      `<span class="chip" title="${esc(itemNote(itemRow(i.name)))}">${esc(T(i.name))}${(i.qty || 1) > 1 ? ` <b>&times;${i.qty}</b>` : ""}</span>`).join("")}</div>`;
    h += `<p class="gx-load ${ld.wt > cap ? "over" : ""}">${esc(T("Carried: {w} of {c} lbs", { w: lbs(ld.wt), c: cap }))}</p>`;
    return h;
  }

  // the torso's damage resistance, for the Combat Assistant (which uses one value per type)
  function torsoDR(c) {
    const dr = bodyDR(c.apparel || []), t = dr.Torso;
    return t ? { p: t.p, e: t.e, r: t.rad } : null;
  }

  // every weapon in the tables can be used in the Combat Assistant
  function registerWeapons() {
    if (typeof TABLES === "undefined" || typeof WEAPONS_FOR_COMBAT === "undefined") return;
    TABLES.weapons.forEach(w => { if (!WEAPONS_FOR_COMBAT[w.n]) WEAPONS_FOR_COMBAT[w.n] = toCombat(moddedWeapon(w.n, [])); });
  }
  registerWeapons();

  // ---------------------------------------------------------------- giving loot to a character
  // Loot names (from the Loot Roller or an enemy's inventory) don't always match the tables exactly
  // ("Pipe gun", "10mm rounds"), so they're matched loosely. Caps go to the caps, ammo to a weapon that
  // fires it, weapons and armor to their lists, and everything else to the items.
  const fold = s => String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  const sing = s => s.replace(/s$/, "");
  function findLoose(names, name) {
    const f = fold(name);
    return names.find(n => { const g = fold(n); return g === f || g === sing(f) || sing(g) === sing(f); }) || null;
  }
  const ammoKey = s => fold(s).replace(/\brounds?\b/g, "").replace(/s\b/g, "").replace(/\s+/g, " ").trim();
  const ammoSame = (a, b) => { const x = ammoKey(a), y = ammoKey(b); return !!x && !!y && (x === y || x.startsWith(y + " ") || y.startsWith(x + " ")); };
  const AMMO_WORDS = /round|shell|cell|cartridge|fuel|spike|flare|missile|nuke|dart|syringe/;
  // returns what it became: "caps", "ammo", "weapon", "apparel" or "item"
  function give(c, name, qty) {
    qty = Math.max(1, parseInt(qty, 10) || 1);
    c.weapons = c.weapons || []; c.apparel = c.apparel || []; c.items = c.items || [];
    const f = fold(name);
    if (/^(bottle )?caps?$/.test(f) || f === "bottle caps") { c.caps = (c.caps || 0) + qty; return "caps"; }
    if (AMMO_WORDS.test(f)) {
      const w = c.weapons.find(x => { const s = weaponStats(x); return s && s.ammo && ammoSame(name, s.ammo); });
      if (w) { w.ammo = (w.ammo || 0) + qty; return "ammo"; }
    }
    const wn = findLoose(Object.keys(typeof WEAPONS_FOR_COMBAT !== "undefined" ? WEAPONS_FOR_COMBAT : {}).concat(TABLES.weapons.map(x => x.n)), name);
    if (wn) {
      const s = weaponStats({ name: wn });
      if (s && (s.skill === "Throwing" || s.skill === "Explosives")) { // grenades, knives, Molotovs: one entry, the count is its "ammo"
        const have = c.weapons.find(x => x.name === wn);
        if (have) have.ammo = (have.ammo || 0) + qty; else c.weapons.push({ name: wn, ammo: qty, mods: [] });
      } else for (let i = 0; i < qty; i++) c.weapons.push({ name: wn, ammo: 0, mods: [] });
      return "weapon";
    }
    const an = findLoose(TABLES.apparel.map(x => x.n), name);
    if (an) { for (let i = 0; i < qty; i++) c.apparel.push({ name: an, mods: [] }); return "apparel"; }
    const iname = findLoose(TABLES.cons.map(x => x.n).concat(TABLES.tools.map(x => x.n)), name) || String(name);
    const have = c.items.find(i => fold(i.name) === fold(iname));
    if (have) have.qty = (have.qty || 1) + qty; else c.items.push({ name: iname, qty });
    return "item";
  }

  return { editor, summary, weaponStats, weaponLine, torsoDR, load, isMelee, give };
})();
