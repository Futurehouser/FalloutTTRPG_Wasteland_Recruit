// Builds a random level-1 character following the Core Rulebook's six creation steps.
// JavaScript port of generator.py from the desktop version.

const LOCS = ["head", "larm", "rarm", "torso", "lleg", "rleg"];
const CD_FACES = [1, 2, 0, 0, 1, 1]; // combat die: 1, 2, blank, blank, 1+Effect, 1+Effect

const rnd = Math.random;
const choice = a => a[Math.floor(rnd() * a.length)];
const randint = (a, b) => a + Math.floor(rnd() * (b - a + 1));
function sample(a, k) {
  const c = a.slice();
  for (let i = c.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [c[i], c[j]] = [c[j], c[i]]; }
  return c.slice(0, k);
}
function wpick(opts, weights) {
  const tot = weights.reduce((s, w) => s + w, 0);
  let r = rnd() * tot;
  for (let i = 0; i < opts.length; i++) { r -= weights[i]; if (r < 0) return opts[i]; }
  return opts[opts.length - 1];
}
function rollCd(n) { let s = 0; for (let i = 0; i < n; i++) s += choice(CD_FACES); return s; }
const num = w => (typeof w === "number" ? w : 0);

function generate() {
  const c = { notes: [], gear: [], ammo: {}, weapons: [], worn: [], plating: null, arms: [], caps: 0,
              perks: [], extra_tags: [], survivor_traits: [], bonus_perk: false, no_pincer: false };
  c.origin = choice(Object.keys(G.ORIGINS));
  const o = G.ORIGINS[c.origin];
  c.race = o.race;
  c.archetype = choice(o.arch);
  const [aw, sw] = G.ARCHETYPES[c.archetype];

  c.pack = wpick(o.packs, o.packs.map(p => (G.PACK_AFFINITY[p].includes(c.archetype) ? 4 : 1)));
  c.gender = c.race === "robot" ? (c.pack === "Miss Nanny" ? "F" : "M") : choice(["M", "F"]);

  // ---- Step 1: Survivor traits
  if (c.origin === "Survivor") {
    const ts = Object.keys(G.SURVIVOR_TRAITS);
    if (rnd() < 0.35) { c.survivor_traits = [choice(ts)]; c.bonus_perk = true; }
    else c.survivor_traits = sample(ts, 2);
  }

  // ---- Step 2: S.P.E.C.I.A.L.
  c.special = {}; const cap = {};
  G.SPECIAL.forEach(a => { c.special[a] = 5; cap[a] = 10; });
  if (c.race === "mutant") {
    c.special.STR += 2; c.special.END += 2;
    Object.assign(cap, { STR: 12, END: 12, INT: 6, CHA: 6 });
  }
  let points = 5;
  const weights = {}; G.SPECIAL.forEach(a => (weights[a] = (aw[a] || 0) + 1));
  const dumps = choice([0, 1, 1, 2]);
  for (let i = 0; i < dumps; i++) {
    const cands = G.SPECIAL.filter(a => c.special[a] === 5 && !(aw[a] || 0));
    if (cands.length) { c.special[choice(cands)] = 4; points++; }
  }
  while (points) {
    const opts = G.SPECIAL.filter(a => c.special[a] < cap[a]);
    const a = wpick(opts, opts.map(x => weights[x] ** 2));
    c.special[a]++; points--;
  }
  if (c.survivor_traits.includes("Gifted")) {
    const opts = G.SPECIAL.filter(a => c.special[a] < cap[a]).sort((x, y) => weights[y] - weights[x]).slice(0, 4);
    sample(opts, 2).forEach(a => c.special[a]++);
  }

  // ---- Mister Handy arms
  if (c.race === "robot") {
    const attach = Object.keys(G.ARM_WEAPON);
    if (c.pack === "Miss Nanny") c.arms = ["Pincer", "Flamer", choice(attach.filter(x => x !== "Pincer" && x !== "Flamer"))];
    else if (c.pack === "Mister Farmhand") c.arms = ["Pincer", "Buzz-Saw", "Laser Emitter"];
    else if (c.pack === "Mister Gutsy") c.arms = ["10mm Auto Pistol", "Buzz-Saw", "Laser Emitter"];
    else if (c.pack === "Mister Handy") c.arms = ["Pincer", "Flamer", "Buzz-Saw"];
    else {
      const first = choice(["Pincer", "Buzz-Saw"]);
      c.arms = [first, "Buzz-Saw", choice(attach.filter(x => x !== first && x !== "Buzz-Saw"))];
    }
    if (!c.arms.includes("Pincer")) c.no_pincer = true;
  }

  // ---- Step 3: tag skills & ranks
  const skw = {};
  G.SKILL_NAMES.forEach(s => (skw[s] = (sw[s] || 0) * 3 + 1));
  if (c.no_pincer) ["Lockpick", "Repair", "Throwing", "Unarmed"].forEach(s => (skw[s] = 0));
  const pickTags = (n, pool) => {
    const chosen = [];
    for (let i = 0; i < n; i++) {
      const opts = pool.filter(s => !chosen.includes(s) && skw[s] > 0);
      chosen.push(wpick(opts, opts.map(s => skw[s] ** 2)));
    }
    return chosen;
  };
  c.tags = [];
  if (c.origin === "Brotherhood Initiate") { c.tags.push(...pickTags(1, ["Energy Weapons", "Science", "Repair"])); c.extra_tags = c.tags.slice(); }
  if (c.origin === "Ghoul") { c.tags.push("Survival"); c.extra_tags = ["Survival"]; }
  c.tags.push(...pickTags(3, G.SKILL_NAMES.filter(s => !c.tags.includes(s))));
  const extraN = (c.origin === "Vault Dweller" ? 1 : 0) + (c.survivor_traits.includes("Educated") ? 1 : 0);
  if (extraN) {
    const more = pickTags(extraN, G.SKILL_NAMES.filter(s => !c.tags.includes(s)));
    c.tags.push(...more); c.extra_tags.push(...more);
  }
  c.skills = {}; G.SKILL_NAMES.forEach(s => (c.skills[s] = 0));
  c.tags.forEach(s => (c.skills[s] = 2));
  c.skill_points = 9 + c.special.INT;
  let pts = c.skill_points;
  while (pts) {
    const opts = G.SKILL_NAMES.filter(s => c.skills[s] < 3 && skw[s] > 0);
    if (!opts.length) break;
    const s = wpick(opts, opts.map(x => skw[x] * (c.tags.includes(x) ? 2 : 1)));
    c.skills[s]++; pts--;
  }

  // ---- Step 4: perk(s)
  const fav = G.ARCHETYPES[c.archetype][2];
  for (let i = 0; i < (c.bonus_perk ? 2 : 1); i++) {
    const p = choosePerk(c, fav);
    if (p) c.perks.push([p, 1]);
  }

  equip(c);   // Step 6 before 5, armor feeds the DR values
  derive(c);  // Step 5
  makeName(c);
  gimmick(c);
  return c;
}

function perkOk(c, name) {
  const [, req, flags] = G.PERKS[name];
  for (const a in req) if (c.special[a] < req[a]) return false;
  if (flags.gender && flags.gender !== c.gender) return false;
  if (flags.robot_no && c.race === "robot") return false;
  if (flags.pain_train && c.race !== "mutant") return false;
  const taken = c.perks.map(p => p[0]);
  if (taken.includes(name) || (flags.excl && taken.includes(flags.excl))) return false;
  return true;
}
function choosePerk(c, fav) {
  const opts = Object.keys(G.PERKS).filter(p => perkOk(c, p));
  return opts.length ? wpick(opts, opts.map(p => (fav.includes(p) ? 12 : 1))) : null;
}

const addGear = (c, item, wt = "-") => c.gear.push([item, wt]);
const addAmmo = (c, cal, base, cd) => (c.ammo[cal] = (c.ammo[cal] || 0) + base + rollCd(cd));

function equip(c) {
  const p = c.pack, arch = c.archetype;
  let trinket = false;
  if (p === "Brotherhood Initiate") {
    c.worn.push("Brotherhood Fatigues", "Brotherhood Hood");
    c.weapons.push("Combat Knife");
    if (arch === "Laser Jockey" || rnd() < 0.5) { c.weapons.push("Laser Pistol"); addAmmo(c, "Fusion Cell", 10, 5); }
    else { c.weapons.push("10mm Pistol"); addAmmo(c, "10mm", 10, 5); }
    addGear(c, "Brotherhood holotags", "<1");
  } else if (p === "Brotherhood Scribe") {
    c.worn.push("Brotherhood Scribe's Armor", "Brotherhood Scribe's Hat");
    c.weapons.push("Combat Knife");
    if (rnd() < 0.6) { c.weapons.push("Laser Pistol"); addAmmo(c, "Fusion Cell", 6, 3); }
    else { c.weapons.push("10mm Pistol"); addAmmo(c, "10mm", 6, 3); }
    addGear(c, "Brotherhood holotags", "<1");
  } else if (c.race === "robot") {
    c.plating = p === "Mister Gutsy" ? "Mister Gutsy Plating" : "Standard Plating";
    c.arms.forEach(a => {
      const w = G.ARM_WEAPON[a];
      c.weapons.push(w);
      if (G.WEAPONS[w].ammo) addAmmo(c, G.WEAPONS[w].ammo, 20, 0);
    });
    c.caps += p === "Mister Farmhand" ? 25 : 10;
    const extras = {
      "Miss Nanny": ["Behavioral analysis mod", "Hazard detection mod"],
      "Mister Farmhand": ["Bag of fertilizer", "Mutfruit", "Mutfruit"],
      "Mister Gutsy": ["Recon sensors mod"],
      "Mister Handy": ["Robot repair kit", "Integral boiler mod"],
      "Nurse Handy": ["Stimpak", "Diagnosis mod"],
    }[p];
    extras.forEach(e => addGear(c, e, e === "Stimpak" || e === "Mutfruit" ? "<1" : "-"));
  } else if (p === "Brute" || p === "Skirmisher") {
    c.worn.push("Raider Chest Piece", choice(["Raider Head Armor", "Raider Leg (L)", "Raider Arm (L)"]));
    if (p === "Brute") {
      c.weapons.push("Pipe Rifle"); addAmmo(c, ".38", 6, 3);
      c.weapons.push(choice(["Baseball Bat", "Machete"]));
    } else {
      c.weapons.push("Heavy Pipe Bolt-Action"); addAmmo(c, ".308", 8, 4);
      c.weapons.push("Board");
    }
    trinket = true; c.caps += 5;
  } else if (p === "Vault-Tec Resident") {
    c.worn.push("Vault Jumpsuit");
    addGear(c, "Vault-Tec canteen (1 Purified Water)", 1); addGear(c, "Pip-Boy");
    c.weapons.push("10mm Pistol", "Switchblade"); addAmmo(c, "10mm", 6, 3);
    addGear(c, "Stimpak", "<1"); addGear(c, "Stimpak", "<1");
    c.caps += 10;
  } else if (p === "Vault-Tec Security") {
    c.worn.push("Vault Jumpsuit", "Vault-Tec Security Armor", "Vault-Tec Security Helmet");
    addGear(c, "Vault-Tec canteen (1 Purified Water)", 1); addGear(c, "Pip-Boy");
    c.weapons.push("10mm Pistol", "Baton"); addAmmo(c, "10mm", 8, 4);
    addGear(c, "Stimpak", "<1");
  } else if (p === "Mercenary") {
    c.worn.push("Tough Clothing");
    if (rnd() < 0.5) c.worn.push("Leather Chest Piece");
    else c.worn.push(choice(["Leather Arm (L)", "Leather Arm (R)"]), choice(["Leather Leg (L)", "Leather Leg (R)"]));
    const rng = { Sharpshooter: ["Hunting Rifle", "Pipe Bolt-Action"], Gunslinger: ["10mm Pistol", ".44 Pistol"] }[arch]
      || ["10mm Pistol", ".44 Pistol", "Hunting Rifle", "Pipe Bolt-Action"];
    const gun = choice(rng);
    c.weapons.push(gun); addAmmo(c, G.WEAPONS[gun].ammo, 10, 5);
    c.weapons.push(choice(["Machete", "Baseball Bat", "Tire Iron"]));
    addGear(c, "Job notice (pays 50 caps)", "-");
    c.caps += 15;
  } else if (p === "Raider") {
    c.worn.push("Harness", "Raider Chest Piece", choice(["Raider Arm (L)", "Raider Arm (R)"]));
    c.weapons.push(choice(["Lead Pipe", "Pool Cue", "Tire Iron"]));
    c.weapons.push("Pipe Gun"); addAmmo(c, ".38", 10, 5);
    addGear(c, choice(["Jet", "RadAway"]), "<1");
    if (rnd() < 0.5) { c.weapons.push("Molotov Cocktail"); c.ammo.Molotov = (c.ammo.Molotov || 0) + 1; }
    else addGear(c, "Stimpak", "<1");
    c.caps += 15;
  } else if (p === "Settler") {
    c.worn.push("Tough Clothing");
    c.weapons.push(choice(["Switchblade", "Pipe Wrench", "Rolling Pin", "Knuckles"]));
    c.weapons.push("Pipe Gun"); addAmmo(c, ".38", 6, 3);
    addGear(c, "Food x2 (roll random food table)", "-");
    trinket = true; c.caps += 45;
  } else if (p === "Trader") {
    c.worn.push("Tough Clothing");
    if (rnd() < 0.5) c.worn.push("Leather Chest Piece"); else c.worn.push("Leather Arm (L)", "Leather Leg (R)");
    c.weapons.push("Pipe Gun"); addAmmo(c, ".38", 8, 4);
    trinket = true;
    addGear(c, "Wares: 3 rolls each ammo/aid/junk", "-");
    addGear(c, "Pack brahmin (carries the wares)", "-");
    c.caps += 50;
  } else if (p === "Wanderer") {
    c.worn.push("Drifter Outfit");
    c.weapons.push(choice(["Switchblade", "Pipe Wrench", "Rolling Pin", "Knuckles"]));
    c.weapons.push("Pipe Gun"); addAmmo(c, ".38", 8, 4);
    addGear(c, choice(["Jet", "RadAway"]), "<1");
    trinket = true; c.caps += 30;
  }

  c.trinket = trinket ? choice(G.TRINKETS) : null;
  if (c.trinket) addGear(c, c.trinket + " (trinket)", "<1");

  // tag skill items
  for (const s of c.tags) {
    if (s === "Athletics") { addGear(c, "Casual clothing", 2); addGear(c, "Buffout", "<1"); }
    else if (s === "Barter") { const b = randint(1, 20) + randint(1, 20); c.caps += b; c.notes.push(T("Barter tag: +{n} caps (2d20).", { n: b })); }
    else if (s === "Big Guns") addAmmo(c, "Flamer Fuel", 4, 2);
    else if (s === "Energy Weapons") addAmmo(c, "Fusion Cell", 6, 3);
    else if (s === "Explosives") {
      if (rnd() < 0.5) {
        if (!c.weapons.includes("Molotov Cocktail")) c.weapons.push("Molotov Cocktail");
        c.ammo.Molotov = (c.ammo.Molotov || 0) + 2;
      } else { c.weapons.push("Baseball Grenade"); c.ammo["Baseball Grenade"] = 2; }
    }
    else if (s === "Lockpick") addAmmo(c, "Bobby Pins", 4, 2);
    else if (s === "Medicine") { addGear(c, "First aid kit"); addGear(c, "Stimpak", "<1"); }
    else if (s === "Melee Weapons") {
      let m = choice(["Machete", "Baseball Bat"]);
      if (c.weapons.includes(m)) m = m === "Baseball Bat" ? "Machete" : "Baseball Bat";
      c.weapons.push(m);
    }
    else if (s === "Pilot") addGear(c, "Broken car parts (5 common scrap)");
    else if (s === "Repair") addGear(c, "Multi-Tool");
    else if (s === "Science") { addGear(c, "Lab coat", 2); addGear(c, "Mentats", "<1"); }
    else if (s === "Small Guns") {
      const cals = c.weapons.filter(w => G.WEAPONS[w].skill === "Small Guns").map(w => G.WEAPONS[w].ammo);
      if (cals.length) addAmmo(c, choice(cals), 6, 3);
      else c.notes.push(T("Small Guns tag: 6+3 CD ammo once you own a gun."));
    }
    else if (s === "Sneak") addGear(c, "Calmex", "<1");
    else if (s === "Speech") { addGear(c, "Formal hat", "<1"); addGear(c, "Formal clothing", 2); }
    else if (s === "Survival") { addGear(c, "Purified water", 1); addGear(c, "Purified water", 1); addGear(c, "Iguana on a stick", "<1"); }
    else if (s === "Throwing") {
      if (rnd() < 0.5) { c.weapons.push("Throwing Knives"); addAmmo(c, "Throwing Knives", 4, 2); }
      else { c.weapons.push("Tomahawks"); addAmmo(c, "Tomahawks", 2, 1); }
    }
    else if (s === "Unarmed") { if (c.race !== "robot") c.weapons.push("Knuckles"); else addGear(c, "Knuckles", "<1"); }
  }

  if (c.race !== "robot" && !c.weapons.some(w => G.WEAPONS[w].skill === "Unarmed")) c.weapons.push("Unarmed Strike");
  if (c.weapons.length > 5) {
    const key = w => (c.tags.includes(G.WEAPONS[w].skill) ? 0 : 2) + (w === "Unarmed Strike" ? 1 : 0);
    c.weapons.sort((a, b) => key(a) - key(b));
    c.weapons.slice(5).forEach(w => addGear(c, w, G.WEAPONS[w].wt));
    c.weapons = c.weapons.slice(0, 5);
  }
}

function derive(c) {
  const s = c.special, perkNames = c.perks.map(p => p[0]);
  if (c.race === "robot") c.carry_max = 150 + G.ROBOT_PLATING[c.plating].carry;
  else if (c.survivor_traits.includes("Small Frame")) c.carry_max = 150 + 5 * s.STR;
  else c.carry_max = 150 + 10 * s.STR;
  if (perkNames.includes("Strong Back") && c.race !== "robot") c.carry_max += 25;
  c.defense = s.AGI >= 9 ? 2 : 1;
  c.initiative = s.PER + s.AGI;
  c.hp = s.END + s.LCK;
  c.melee_bonus = s.STR <= 6 ? 0 : s.STR <= 8 ? 1 : s.STR <= 10 ? 2 : 3;
  if (c.survivor_traits.includes("Heavy Handed")) c.melee_bonus++;
  c.luck_points = s.LCK - (c.survivor_traits.includes("Gifted") ? 1 : 0);

  c.dr = {}; LOCS.forEach(l => (c.dr[l] = { p: 0, e: 0, r: 0 }));
  if (c.race === "robot") {
    const pl = G.ROBOT_PLATING[c.plating];
    LOCS.forEach(l => { c.dr[l].p += pl.p; c.dr[l].e += pl.e; });
  }
  c.worn.forEach(item => {
    const a = G.APPAREL[item];
    a.locs.forEach(l => { c.dr[l].p += a.p; c.dr[l].e += a.e; c.dr[l].r += a.r; });
  });
  const bonus = { Toughness: "p", Refractor: "e", "Rad Resistance": "r" };
  perkNames.forEach(p => { if (bonus[p]) LOCS.forEach(l => c.dr[l][bonus[p]]++); });
  c.rad_immune = ["ghoul", "mutant", "robot"].includes(c.race);
  c.poison_immune = ["mutant", "robot"].includes(c.race);
  c.poison_dr = perkNames.includes("Snakeater") ? 2 : 0;

  let load = 0;
  c.worn.forEach(i => (load += num(G.APPAREL[i].wt)));
  c.weapons.forEach(w => (load += num(G.WEAPONS[w].wt)));
  c.gear.forEach(([, w]) => (load += num(w)));
  c.carry_now = load;
}

function makeName(c) {
  const g = c.gender;
  if (c.race === "human") {
    const first = choice(G.HUMAN_FIRST[g]);
    c.name = `${first} ${choice(G.HUMAN_LAST.filter(x => x !== first))}`;
  } else if (c.race === "ghoul") {
    const first = choice(G.GHOUL_FIRST[g]), last = choice(G.GHOUL_LAST.filter(x => x !== first));
    c.name = rnd() < 0.35 ? `${first} "${choice(G.GHOUL_NICK)}" ${last}` : `${first} ${last}`;
  } else if (c.race === "mutant") {
    const [n1, n2] = sample(G.MUTANT_NAMES, 2), r = rnd();
    if (r < 0.4) c.name = `${choice(G.MUTANT_TITLES)} ${n1}`;
    else if (r < 0.7) c.name = n1.slice(0, Math.max(2, Math.floor(n1.length / 2) + 1)) + n2.slice(Math.floor(n2.length / 2)).toLowerCase();
    else c.name = n1;
  } else {
    const [a, b] = sample(G.ROBOT_NAMES, 2);
    const base = rnd() < 0.5 ? a.slice(0, Math.max(2, Math.floor(a.length / 2))) + b.slice(Math.floor(b.length / 2)) : a;
    const title = G.ROBOT_TITLES[c.pack];
    const tag = `${choice("ACEGKMRTVX")}${choice("BDLNPSZ")}-${randint(1, 99)}`;
    c.name = choice([`${title} ${base}`, base, `${base} (${tag})`]);
  }
}

function gimmick(c) {
  const s = c.special;
  const jitter = {}; G.SPECIAL.forEach(a => (jitter[a] = rnd()));
  const top = G.SPECIAL.slice().sort((a, b) => s[b] - s[a] || jitter[a] - jitter[b])[0];
  const low = G.SPECIAL.slice().sort((a, b) => s[a] - s[b] || jitter[a] - jitter[b])[0];
  // the quirk text is written in the app's language when the character is rolled
  c.epithet = T(choice(G.EPITHETS[top]));
  const high = T(choice(G.HIGH_LINES[top]));
  const lowLine = T((s[low] <= 4 || (s[low] <= 5 && s[top] - s[low] >= 4))
    ? choice(G.LOW_LINES[low]) : "and is annoyingly decent at everything else");
  const perk = c.perks.length ? c.perks[0][0] : null;
  const perkLine = perk ? (G.PERK_LINES[perk] ? T(G.PERK_LINES[perk]) : T("Swears by their {perk} instincts.", { perk: T(perk) })) : "";
  c.gimmick_short = T('"{ep}": {high}, {low}. {perk}', { ep: c.epithet, high, low: lowLine, perk: perkLine });
  const trinket = c.trinket && T(c.trinket);
  const tr = trinket ? " " + T("Never parts with {t}.", { t: trinket[0].toLowerCase() + trinket.slice(1) }) : "";
  c.gimmick_long = T('{name}, known as "{ep}", {high}, {low}. {perk}', { name: c.name, ep: c.epithet, high, low: lowLine, perk: perkLine }) +
    " " + T(choice(G.ORIGIN_LINES[c.origin])) + tr;
}

function traitRows(c) {
  const rows = [];
  if (G.ORIGIN_TRAITS[c.origin]) rows.push(G.ORIGIN_TRAITS[c.origin].map(x => T(x)));
  c.survivor_traits.forEach(t => rows.push([T("Trait: {t}", { t: T(t) }), T(G.SURVIVOR_TRAITS[t])]));
  if (c.race === "robot") {
    if (c.no_pincer) rows.push([T("No Pincer"), T("No unarmed attacks; can't manipulate objects, Lockpick, Repair or Throw.")]);
    rows.push([T("Arms: {list}", { list: c.arms.map(a => T(a)).join(", ") }), T("Optics 1-2, Body 3-8, Arm1 9-11, Arm2 12-14, Arm3 15-17, Thruster 18-20.")]);
  }
  return rows;
}
