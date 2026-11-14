// Navigation and the tools.
const $ = id => document.getElementById(id);
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
const SPECIAL_FULL = { STR: "Strength", PER: "Perception", END: "Endurance", CHA: "Charisma", INT: "Intelligence", AGI: "Agility", LCK: "Luck" };

function toast(msg) {
  const t = $("toast"); t.textContent = msg; t.classList.add("show");
  clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove("show"), 2800);
}
function confirmBox(text, yesLabel = T("Delete")) {
  return new Promise(res => {
    $("modal-text").textContent = text; $("modal-yes").textContent = yesLabel;
    $("modal").classList.add("show");
    const done = v => { $("modal").classList.remove("show"); $("modal-yes").onclick = $("modal-no").onclick = null; res(v); };
    $("modal-yes").onclick = () => done(true);
    $("modal-no").onclick = () => done(false);
  });
}
const clamp = (v, lo, hi, d) => { v = parseInt(v, 10); return isNaN(v) ? d : Math.min(hi, Math.max(lo, v)); };
const safeName = s => (String(s).replace(/[^A-Za-z0-9 _-]+/g, "").trim().replace(/ /g, "_") || "character");

I18N.start(); // translate the page's own text and add the language pickers

// ------------------------------------------------------------------ navigation
let currentPage = "home";
function showPage(id) {
  document.querySelectorAll(".page").forEach(p => p.classList.toggle("active", p.id === "page-" + id));
  document.querySelectorAll("#nav button").forEach(b => b.classList.toggle("active", b.dataset.page === id));
  $("where").textContent = $("page-" + id).dataset.title;
  document.body.classList.remove("menu-open");
  $("main").scrollTop = 0;
  currentPage = id;
  if (id === "roster") renderRoster();
  if (id === "perks") { fillCharSelect(); perkSearch(); }
  if (id === "create") fillPerkList();
  if (id === "combat" && typeof Combat !== "undefined") Combat.show();
  if (id === "hack" && typeof Hack !== "undefined") Hack.show();
  if (id === "radio" && typeof Radio !== "undefined") Radio.show();
  if (id === "team" && typeof Team !== "undefined") Team.render();
  if (id === "tutorials" && typeof Tutorials !== "undefined") Tutorials.show();
  if (id === "elber" && typeof Elber !== "undefined") Elber.show();
  if (id === "tables" && typeof Tables !== "undefined") Tables.show();
  if (id === "dice" && typeof Dice !== "undefined") Dice.show();
  if (id === "maps" && typeof Maps !== "undefined") Maps.show();
  if (id === "quests" && typeof Quests !== "undefined") Quests.show();
  if (typeof Walkers !== "undefined") Walkers.update(); // sprites walk on Home and My Team, and in a running fight
}
$("burger").onclick = () => document.body.classList.toggle("menu-open");
$("go-home").onclick = () => showPage("home"); // the app's name at the top takes you Home
$("scrim").onclick = () => document.body.classList.remove("menu-open");
document.querySelectorAll("#nav button[data-page]").forEach(b => (b.onclick = () => showPage(b.dataset.page)));
document.querySelectorAll(".tile[data-go]").forEach(b => (b.onclick = () => showPage(b.dataset.go)));
$("app-version").textContent = APP_VERSION;
$("nav-update").onclick = () => { document.body.classList.remove("menu-open"); Updater.check(true); };
// Android back button: close menu / profile / modal before leaving the app
window.handleBack = () => {
  if ($("modal").classList.contains("show")) { $("modal-no").click(); return true; }
  if ($("upd-modal").classList.contains("show")) { $("upd-later").click(); return true; }
  if (document.body.classList.contains("menu-open")) { document.body.classList.remove("menu-open"); return true; }
  if (currentPage === "roster" && openProfileId) { closeProfile(); return true; }
  if (currentPage === "maps" && typeof Maps !== "undefined" && Maps.back()) return true; // local map > general map > quest list
  if (currentPage === "quests" && typeof Quests !== "undefined" && Quests.back()) return true; // quest > quest list
  if (currentPage !== "home") { showPage("home"); return true; }
  return false;
};

// ------------------------------------------------------------------ 1. random character
let cgChar = null, cgUrl = null;
$("cg-share").style.display = Platform.isAndroid() ? "" : "none";
$("cg-gen").onclick = async () => {
  $("cg-gen").disabled = true;
  try {
    cgChar = generate();
    const cv = await renderCharacter(cgChar);
    cgUrl = cv.toDataURL("image/png");
    const view = $("cg-view");
    view.innerHTML = ""; view.classList.remove("zoom");
    const img = new Image(); img.src = cgUrl; img.alt = T("Filled character sheet");
    img.onclick = () => view.classList.toggle("zoom");
    view.appendChild(img);
    $("cg-info").innerHTML = `<b>${esc(cgChar.name)}</b> &mdash; ${esc(T(cgChar.origin))} (${esc(T(cgChar.pack))}), ${esc(T(cgChar.archetype))}<br><span class="q">${esc(cgChar.gimmick_short)}</span>`;
    $("cg-save").disabled = $("cg-share").disabled = $("cg-keep").disabled = false;
  } catch (e) {
    $("cg-info").textContent = T("Something went wrong: {e}", { e });
  }
  $("cg-gen").disabled = false;
};
const cgFile = () => `${safeName(cgChar.name)}_${Date.now()}.png`;
$("cg-save").onclick = async () => cgUrl && toast(await Platform.saveImage(cgUrl, cgFile()));
$("cg-share").onclick = () => { if (cgUrl) { const r = Platform.shareImage(cgUrl, cgFile(), cgChar.name); if (r) toast(r); } };
$("cg-keep").onclick = async () => {
  if (!cgChar) return;
  const c = cgChar;
  const perks = c.perks.map(([p, r]) => T("{perk} (rank {r})", { perk: T(p), r })).join(", ");
  await addToRoster({
    name: c.name, origin: T(c.origin), race: c.race, level: 1, special: Object.assign({}, c.special),
    maxHp: c.hp, carryWeight: c.carry_max, caps: c.caps || 0,
    skills: Object.assign({}, c.skills), tags: c.tags.slice(), photo: null,
    weapons: [...new Set(c.weapons)].filter(n => WEAPONS_FOR_COMBAT[n]).map(n => ({ name: n, ammo: startAmmo(n, c.ammo), mods: [] })),
    apparel: (c.worn || []).filter(n => TABLES.apparel.some(a => a.n === n)).map(n => ({ name: n, mods: [] })),
    items: (c.gear || []).map(g => String(g[0])).filter(n => TABLES.cons.some(r => r.n === n) || TABLES.tools.some(r => r.n === n)).map(n => ({ name: n, qty: 1 })),
    notes: c.gimmick_long + "\n\n" + T("Archetype: {a}. Equipment pack: {p}. Perks: {perks}.", { a: T(c.archetype), p: T(c.pack), perks: perks || T("none") }) +
           (c.survivor_traits.length ? " " + T("Traits: {t}.", { t: c.survivor_traits.map(x => T(x)).join(", ") }) : ""),
  });
  $("cg-keep").disabled = true;
  toast(T("{name} added to Saved Characters", { name: c.name }));
};

// ------------------------------------------------------------------ 2. scavenging location
for (let i = 1; i <= 20; i++) $("sc-level").insertAdjacentHTML("beforeend", `<option>${i}</option>`);
const itemChips = items => items.map(i =>
  `<span class="chip" data-cat="${esc(i.cat)}">${esc(T(i.cat))} <b>${i.min}-${i.max}</b></span>`).join("");
const obstacleHtml = o => `<b>${esc(T(o.name))}</b>: ${esc(o.test)}. ${T("Takes {time}.", { time: esc(o.time) })}<br><span class="muted">${T("Alternative: {alt}.", { alt: esc(o.alt) })}</span>`;

$("sc-gen").onclick = () => showLocation(generateLocation({ level: $("sc-level").value, scale: $("sc-scale").value, degree: $("sc-degree").value }));

// called by the Encounter Randomizer: build the place its discovery describes
function scavengeFromEncounter({ site, level, text }) {
  $("sc-level").value = String(Math.min(20, Math.max(1, level)));
  $("sc-scale").value = "Random"; $("sc-degree").value = "Random";
  showPage("scavenge");
  showLocation(generateLocation({ level, site, text }));
}

function showLocation(L) {
  let h = `<div class="card">${L.fromEncounter ? `<div class="from-enc">&#127956; ${T("From your encounter:")} <b>${esc(T(L.fromEncounter.site))}</b>${L.fromEncounter.text ? `. ${esc(T(L.fromEncounter.text))}` : ""}
      <br><span class="muted">${T("Tap Generate Location for a different random place.")}</span></div>` : ""}
    <h3>${esc(T(L.name))}</h3><div class="muted">${esc(T(L.type))}</div>
    <div class="badges"><span class="badge">${T("Level")} <b>${L.level}</b></span><span class="badge">${T("Scale")} <b>${T(L.scale)}</b></span>
    <span class="badge">${T("Degree")} <b>${T(L.degree)}</b></span></div>
    <h4>${T("Search")}</h4><div>${T("<b>PER + Survival</b>, difficulty <b>{d}</b>. Takes <b>{time}</b> (spend 2 AP to halve it). A success gives the minimum rolls in each category. Each AP spent buys 1 extra roll, up to the maximum.", { d: L.difficulty, time: T(L.time) })}</div>
    <h4>${T("Loot (min-max rolls)")}</h4><div>${itemChips(L.items)}</div>`;
  if (L.inhabitants) {
    const I = L.inhabitants;
    h += `<h4>${T("Inhabitants")}</h4><div><b>${I.count}</b> &times; ${esc(T(I.desc))} <span class="muted">(${esc(T(I.group))}, ${T("level {n}", { n: I.level })}${I.leader ? `, ${T("leader level {n}", { n: I.leader })}` : ""})</span><br>
      <span class="muted">${T("Sneaking in: AGI + Sneak opposed by their PER + Survival. Halve the number for big creatures, double it for small ones.")}</span></div>`;
  } else h += `<h4>${T("Inhabitants")}</h4><div class="muted">${T("None right now. A complication can still bring some in.")}</div>`;
  if (L.obstacle) h += `<h4>${T("Obstacle")}</h4><div>${obstacleHtml(L.obstacle)}</div>`;
  if (L.hazard) h += `<h4>${T("Hazard")}</h4><div><b>${esc(T(L.hazard.name))}</b> <span class="muted">(${esc(T(L.hazard.kind))})</span>: ${esc(T(L.hazard.text))}</div>`;
  if (L.nested) {
    const N = L.nested;
    h += `<h4>${T("Hidden spot (reveal after the first successful search)")}</h4><div><b>${esc(T(N.name))}</b>: ${T("Tiny, Untouched, level {n}. Takes 1 minute to search once it's open.", { n: N.level })}
      <br>${obstacleHtml(N.lock)}<div style="margin-top:6px">${itemChips(N.items)}</div></div>`;
  }
  h += `<h4>${T("Complication ideas")}</h4><ul class="tight">${L.complications.map(c => `<li>${esc(T(c))}</li>`).join("")}</ul></div>`;
  $("sc-out").innerHTML = h;
  $("sc-out").querySelectorAll(".chip").forEach(ch => (ch.onclick = () => {
    $("lt-cat").value = ch.dataset.cat; $("lt-roll").value = ""; $("lt-out").innerHTML = "";
    buildLootEditor(); showPage("loot");
  }));
}

// ------------------------------------------------------------------ 3. loot roller
LOOT_CATEGORIES.forEach(c => $("lt-cat").insertAdjacentHTML("beforeend", `<option value="${esc(c)}">${esc(T(c))}</option>`));
function showLoot(roll, dice) {
  const cat = $("lt-cat").value;
  const e = lootLookup(cat, roll);
  if (!e) { $("lt-out").innerHTML = `<div class="card">${T("Enter a number from 2 to 40.")}</div>`; return; }
  const diceTxt = dice ? ` <span class="muted">(${T("rolled {a} + {b}", { a: dice[0], b: dice[1] })})</span>` : "";
  let h = `<div class="card result"><div class="muted">${esc(T(cat))} &middot; ${T("roll")} <b>${roll}</b>${diceTxt}</div>
    <div class="item">${esc(T(e.name))}</div>`;
  if (e.cd) {
    h += `<div>${TP(e.cd, "Quantity: <b>{base}</b> + roll <b>{n} d6</b> (combat die).", "Quantity: <b>{base}</b> + roll <b>{n} d6</b> (combat dice).", { base: e.base })}</div>
      <div class="muted" style="font-size:13px">${T("Combat die faces: 1 = 1, 2 = 2, 3 or 4 = 0, 5 or 6 = 1 + Effect.")}</div>
      <button class="btn" id="lt-cd" style="margin-top:8px">&#127922; ${T("Roll the {n} d6 for me", { n: e.cd })}</button><div id="lt-cdout"></div>`;
  } else {
    h += `<div>${T("Quantity: <b>{n}</b>. No dice to roll.", { n: e.base || 1 })}</div>`;
  }
  h += `<div class="muted" style="font-size:13px;margin-top:8px">${T("Tip: a player can spend 1 Luck point to shift the 2d20 result by up to the location's level.")}</div></div>`;
  $("lt-out").innerHTML = h;
  if (e.cd) $("lt-cd").onclick = () => {
    const r = rollCombatDice(e.cd);
    const faces = r.faces.map(f => {
      const v = CD_FACE_VALUE[f - 1];
      return `<span class="die ${f >= 5 ? "fx" : v === 0 ? "zero" : ""}" title="${T("face {n}", { n: f })}">${v}${f >= 5 ? "*" : ""}</span>`;
    }).join("");
    $("lt-cdout").innerHTML = `<div class="dice">${faces}</div><div>${T("Total:")} <b>${e.base} + ${r.total} = ${e.base + r.total}</b> ${esc(T(e.name))} <span class="muted">(${T("* = Effect")})</span></div>`;
  };
}
$("lt-look").onclick = () => {
  const r = parseInt($("lt-roll").value, 10);
  showLoot(r >= 2 && r <= 40 ? r : NaN);
};
$("lt-roll").addEventListener("keydown", e => { if (e.key === "Enter") $("lt-look").click(); });
$("lt-random").onclick = () => {
  const a = randint(1, 20), b = randint(1, 20);
  $("lt-roll").value = a + b;
  showLoot(a + b, [a, b]);
};
$("lt-cat").onchange = () => { $("lt-out").innerHTML = ""; buildLootEditor(); };

function buildLootEditor() {
  const cat = $("lt-cat").value, t = lootTable(cat);
  let h = `<table class="lt"><tr><th>2d20</th><th>${T("Item")}</th><th>${T("Qty")}</th><th>${T("Dice")}</th></tr>`;
  ROLLS.forEach(r => {
    const e = t[r];
    h += `<tr><td class="r">${r}</td><td><input type="text" data-r="${r}" data-k="name" value="${esc(T(e.name))}"></td>
      <td class="n"><input type="number" min="0" data-r="${r}" data-k="base" value="${e.base}"></td>
      <td class="n"><input type="number" min="0" max="20" data-r="${r}" data-k="cd" value="${e.cd}"></td></tr>`;
  });
  $("lt-table").innerHTML = h + "</table>";
}
$("lt-tsave").onclick = async () => {
  const cat = $("lt-cat").value, t = {};
  $("lt-table").querySelectorAll("input").forEach(inp => {
    const r = inp.dataset.r; t[r] = t[r] || {};
    t[r][inp.dataset.k] = inp.dataset.k === "name" ? inp.value.trim() || T("(nothing)") : Math.max(0, parseInt(inp.value, 10) || 0);
  });
  LOOT_OVERRIDES[cat] = t;
  toast((await Platform.saveJSON("loot_tables", LOOT_OVERRIDES)) ? T("{cat} table saved", { cat: T(cat) }) : T("Could not save the table"));
};
$("lt-treset").onclick = async () => {
  const cat = $("lt-cat").value;
  if (!(await confirmBox(T("Reset the {cat} table to the app's default? Your edits to it will be lost.", { cat: T(cat) }), T("Reset")))) return;
  delete LOOT_OVERRIDES[cat];
  await Platform.saveJSON("loot_tables", LOOT_OVERRIDES);
  buildLootEditor(); toast(T("{cat} table reset", { cat: T(cat) }));
};

// ------------------------------------------------------------------ 4. Fallout TTRPG perks (core rulebook)
let pkSkip = [];
const pkChar = () => ROSTER.find(x => x.id === $("pk-char").value) || null;

function fillCharSelect() {
  const sel = $("pk-char"), keep = sel.value;
  sel.innerHTML = `<option value="">${T("Nobody: fully random perk")}</option>` + ROSTER.slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(c => `<option value="${esc(c.id)}">${esc(c.name)} (${T("level {n}", { n: c.level || 1 })})</option>`).join("");
  sel.value = ROSTER.some(c => c.id === keep) ? keep : "";
  updateCharInfo();
}

function updateCharInfo() {
  const c = pkChar();
  pkSkip = [];
  $("pk-gen").textContent = c ? T("SUGGEST A PERK") : T("RANDOM PERK");
  if (!c) { $("pk-charinfo").innerHTML = ""; return; }
  const n = perksTaken(c), l = c.level || 1;
  $("pk-charinfo").innerHTML = TP(n, "{lvl}: level {l}, {n} perk taken (one per level)", "{lvl}: level {l}, {n} perks taken (one per level)", { lvl: `<b>${esc(c.name)}</b>`, l })
    + (n >= l ? `. <span style="color:var(--red)">${T("All picks for this level are used: level up first, or treat the suggestion as a plan")}</span>` : "");
}
$("pk-char").onchange = () => { updateCharInfo(); $("pk-out").innerHTML = ""; perkSearch(); };

// the perk's card: picture, rulebook ranks, requirements and description
function perkHtml(p, opts = {}) {
  const name = perkName(p.n), en = name !== p.n ? `<div class="muted pk-en">${esc(p.n)}</div>` : "";
  return `<div class="card perk">
    ${p.image ? `<img src="${esc(p.image)}" alt="${esc(name)}" referrerpolicy="no-referrer" onerror="if(this.src!=='${esc(p.thumb)}')this.src='${esc(p.thumb)}';else this.remove()">` : `<div class="pk-nopic big" aria-hidden="true">&#9762;</div>`}
    <div class="txt"><h3>${esc(name)}</h3>${en}
      <div class="badges"><span class="badge">${TP(p.max, "{n} rank", "{n} ranks")}</span>${opts.rank ? `<span class="badge"><b>${T("Rank {r} of {m}", { r: opts.rank, m: p.max })}</b></span>` : ""}</div>
      <div class="pk-req"><b>${T("Requirements")}:</b> ${esc(reqText(p))}</div>
      ${opts.extra || ""}
      <div class="pk-desc">${p.desc.map(d => `<p>${esc(T(d))}</p>`).join("")}</div>
      <div class="muted" style="font-size:12px;margin-top:10px">${T("Fallout 2d20 core rulebook")}${p.image && /^https?:/.test(p.image) ? ` &middot; ${T("Card art: fallout.wiki")}` : ""}${opts.footer ? ` &middot; ${opts.footer}` : ""}</div></div></div>`;
}

// the perks that pass the S.P.E.C.I.A.L. filter
function pkPool() {
  const s = $("pk-special").value;
  return TT_PERKS.filter(p => !s || (s === "none" ? !TT_ATTRS.some(k => p.req[k]) : p.req[s]));
}

async function addPerkTo(p, rank) {
  const c = pkChar();
  if (!c) return;
  c.perkCards = c.perkCards || [];
  const have = c.perkCards.find(x => x.name === p.n);
  if (have) have.rank = rank; else c.perkCards.push(perkCardFrom(p, rank));
  await addToRoster(c);
  toast(T("{perk} rank {r} added to {name}", { perk: perkName(p.n), r: rank, name: c.name }));
  $("pk-add").disabled = true; $("pk-add").textContent = T("Added ✓");
}

$("pk-gen").onclick = () => {
  const pool = pkPool(), ch = pkChar();
  if (!pool.length) { $("pk-out").innerHTML = `<div class="card">${T("No perks match those filters.")}</div>`; return; }
  if (!ch) {
    $("pk-out").innerHTML = perkHtml(choice(pool), { footer: TP(pool.length, "{n} perk in this pool", "{n} perks in this pool") });
    return;
  }
  let { pick, total } = suggestPerk(ch, pool, pkSkip);
  if (!pick && pkSkip.length) { pkSkip = []; ({ pick, total } = suggestPerk(ch, pool, pkSkip)); }
  if (!pick) {
    $("pk-out").innerHTML = `<div class="card">${T("Nothing fits {name} right now: the remaining perks need higher S.P.E.C.I.A.L., a higher level or another origin. Level up the character, or loosen the filter.", { name: esc(ch.name) })}</div>`;
    return;
  }
  pkSkip.push(pick.perk.n);
  const head = pick.kind === "upgrade" ? T("Rank up to <b>{n}</b>", { n: pick.rank }) : T("New perk");
  $("pk-out").innerHTML = perkHtml(pick.perk, {
    rank: pick.rank,
    extra: `<div class="why"><b>${head}</b> ${T("for {name}:", { name: esc(ch.name) })} ${pick.reasons.map(esc).join("; ")}.</div>
      <div class="bar" style="margin:8px 0"><button class="btn primary" id="pk-add">&#10010; ${T("Add to {name}", { name: esc(ch.name) })}</button>
      <button class="btn" id="pk-again">&#8635; ${T("Suggest another")}</button></div>`,
    footer: TP(total, "{n} perk fits this character", "{n} perks fit this character"),
  });
  $("pk-again").onclick = () => $("pk-gen").click();
  $("pk-add").onclick = async () => { await addPerkTo(pick.perk, pick.rank); const keep = pkSkip; fillCharSelect(); pkSkip = keep; perkSearch(); };
};

// ---- every perk that passes the filter, narrowed by name (English or Spanish) or a word from its description
const pkFold = s => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const pkSort = p => perkName(p.n).replace(/^[¡¿]/, ""); // "¡Ciencia!" sorts under C
let pkTimer = null;
function perkSearch() {
  const box = $("pk-results"), ch = pkChar();
  const raw = $("pk-q").value.trim(), q = pkFold(raw), words = q.split(/\s+/);
  const found = pkPool().map(p => {
    const names = pkFold(p.n + " | " + perkName(p.n)), text = pkFold(p.desc.map(d => d + " " + T(d)).join(" "));
    const score = !q ? 0 : pkFold(p.n).startsWith(q) || pkFold(perkName(p.n)).startsWith(q) ? 0 : words.every(w => names.includes(w)) ? 1
      : words.every(w => (names + " " + text).includes(w)) ? 2 : 9;
    return { p, score };
  }).filter(x => x.score < 9).sort((a, b) => a.score - b.score || pkSort(a.p).localeCompare(pkSort(b.p), LANG));
  pkOrder = found.map(x => x.p.n);
  if (!found.length) {
    box.innerHTML = `<div class="muted pk-none">${q ? T("No perk matches \"{q}\".", { q: esc(raw) }) : T("No perks match those filters.")}</div>`;
    return;
  }
  const own = ch ? Object.fromEntries((ch.perkCards || []).map(c => [c.name, c.rank])) : {};
  box.innerHTML = `<div class="muted pk-count">${TP(found.length, q ? "{n} perk found" : "{n} perk with these filters", q ? "{n} perks found" : "{n} perks with these filters")}</div>` + found.map(({ p }) => {
    const rank = (own[p.n] || 0) + 1, no = ch && rank <= p.max && unmet(ch, p, rank).length;
    const mine = own[p.n] ? ` &middot; <b>${T("rank {n}", { n: own[p.n] })}</b>` : "";
    return `<button type="button" class="pcard pk-hit${no ? " pk-no" : ""}" data-name="${esc(p.n)}">${perkThumb(p, true)}
      <span class="t"><b>${esc(perkName(p.n))}</b><small>${esc(reqText(p))} &middot; ${TP(p.max, "{n} rank", "{n} ranks")}${mine}</small></span></button>`;
  }).join("");
  box.querySelectorAll(".pk-hit").forEach(b => (b.onclick = () => showFoundPerk(TT_BY[b.dataset.name])));
}
// the chosen perk, with a button to add it to the selected character when there is one, and arrows on both
// sides to step through the list as it is filtered and sorted right now (wrapping round at the ends)
let pkOrder = [];
function pkStep(name, dir) {
  const list = pkOrder.length ? pkOrder : TT_PERKS.map(p => p.n);
  const i = list.indexOf(name);
  return TT_BY[list[(i < 0 ? 0 : i + dir + list.length) % list.length]];
}
function showFoundPerk(p, scroll = true) {
  const ch = pkChar();
  let extra = "", rank = 1;
  if (ch) {
    const have = (ch.perkCards || []).find(c => c.name === p.n);
    rank = have ? have.rank + 1 : 1;
    const miss = rank <= p.max ? unmet(ch, p, rank) : [];
    const why = rank > p.max ? T("{name} already has this card at its top rank.", { name: esc(ch.name) })
      : !miss.length ? T("{name} meets the requirements.", { name: esc(ch.name) })
      : `${T("It doesn't meet the requirements for {name} right now, but you can still add it.", { name: esc(ch.name) })} (${esc(T("Needs {list}", { list: miss.join(", ") }))})`;
    extra = `<div class="why">${why}</div>` + (rank <= p.max ? `<div class="bar" style="margin:8px 0"><button class="btn primary" id="pk-add">&#10010; ${have
      ? T("Rank up to {n} on {name}", { n: rank, name: esc(ch.name) }) : T("Add to {name}", { name: esc(ch.name) })}</button></div>` : "");
  }
  $("pk-out").innerHTML = `<div class="pk-nav">
    <button type="button" class="pk-arrow" id="pk-prev" title="${T("Previous perk")}" aria-label="${T("Previous perk")}">&#9664;&#xFE0E;</button>
    ${perkHtml(p, { rank: ch ? Math.min(rank, p.max) : 0, extra, footer: T("Picked from the search") })}
    <button type="button" class="pk-arrow" id="pk-next" title="${T("Next perk")}" aria-label="${T("Next perk")}">&#9654;&#xFE0E;</button></div>`;
  if ($("pk-add")) $("pk-add").onclick = async () => { await addPerkTo(p, rank); fillCharSelect(); perkSearch(); };
  $("pk-prev").onclick = () => showFoundPerk(pkStep(p.n, -1), false);
  $("pk-next").onclick = () => showFoundPerk(pkStep(p.n, 1), false);
  if (scroll) $("pk-out").scrollIntoView({ behavior: "smooth", block: "start" });
}
// the keyboard's left and right arrows step through the perks too
document.addEventListener("keydown", e => {
  if (currentPage !== "perks" || !$("pk-prev") || e.altKey || e.ctrlKey || e.metaKey) return;
  if (/^(INPUT|SELECT|TEXTAREA)$/.test((document.activeElement || {}).tagName || "")) return;
  if (e.key === "ArrowLeft") { e.preventDefault(); $("pk-prev").click(); }
  if (e.key === "ArrowRight") { e.preventDefault(); $("pk-next").click(); }
});
$("pk-q").oninput = () => { clearTimeout(pkTimer); pkTimer = setTimeout(perkSearch, 150); };
$("pk-special").addEventListener("change", perkSearch);

// ------------------------------------------------------------------ 5. create / edit character
let ROSTER = [], editingId = null, crPhoto = null, crCards = [];
// the equipment being edited in the form (gear.js draws and changes it)
const emptyGear = () => ({ weapons: [], apparel: [], robomods: [], items: [] });
let crGear = emptyGear(), crGearEd = null;
function mountGear() {
  if (typeof Gear === "undefined") return; // gear.js loads after this file; startApp mounts it
  crGearEd = Gear.editor($("cr-gear"), crGear, () => crRace(),
    () => ({ carry: $("cr-carry").value !== "" ? clamp($("cr-carry").value, 0, 9999, 0) : crRace() === "robot" ? 150 : autoCarry(crSpecial()) }));
}
G.SPECIAL.forEach(a => $("cr-special").insertAdjacentHTML("beforeend",
  `<div><label for="cr-s-${a}" title="${T(SPECIAL_FULL[a])}">${T(a)}</label><input type="number" id="cr-s-${a}" min="1" max="12" value="5" inputmode="numeric"></div>`));
G.SKILLS.forEach(([s, a]) => $("cr-skills").insertAdjacentHTML("beforeend",
  `<div class="skill"><input type="checkbox" id="cr-t-${safeName(s)}" title="${T("Tag skill")}"><span>${esc(T(s))} <i>[${T(a)}]</i></span>
   <input type="number" id="cr-k-${safeName(s)}" min="0" max="6" value="0" inputmode="numeric"></div>`));

// photo if there is one, otherwise the default picture for the character's kind
function setAvatar(el, c) {
  el.innerHTML = `<img src="${portraitFor(c)}" alt="">`;
}
const crRace = () => $("cr-race").value || raceFromOrigin($("cr-origin").value);
// the picture and walking sprite chosen in the form (null: the kind's default); only the kind's own choices are offered
let crLookAv = null, crLookSp = null;
const crAvatar = () => { setAvatar($("cr-avatar"), { photo: crPhoto, race: crRace(), avatar: crLookAv }); renderLooks(); if (crGearEd) crGearEd.redraw(); };
function renderLooks() {
  const race = crRace(), av = avatarFor({ race, avatar: crLookAv }), sp = spriteFor({ race, sprite: crLookSp });
  $("cr-avpick").innerHTML = AVATAR_CHOICES[race].map(k => `<button type="button" class="look ${k === av ? "on" : ""}" data-av="${k}" aria-pressed="${k === av}">
    <img src="${avatarUrl(k)}" alt=""><span>${esc(T(CHOICE_NAMES[k]))}</span></button>`).join("");
  $("cr-sppick").innerHTML = SPRITE_CHOICES[race].map(k => `<button type="button" class="look ${k === sp ? "on" : ""}" data-sp="${k}" aria-pressed="${k === sp}">
    <canvas width="64" height="80" data-sprite="${k}"></canvas><span>${esc(T(k === "human" ? "Vault dweller" : CHOICE_NAMES[k]))}</span></button>`).join("");
  $("cr-avpick").querySelectorAll("[data-av]").forEach(b => (b.onclick = () => { crLookAv = b.dataset.av; crAvatar(); }));
  $("cr-sppick").querySelectorAll("[data-sp]").forEach(b => (b.onclick = () => { crLookSp = b.dataset.sp; renderLooks(); }));
  drawLooks();
}
// the sprite previews walk while the Create Character page is open
let lookFrame = 0;
function drawLooks() {
  if (typeof Sprites === "undefined") return; // team.js loads after this file
  document.querySelectorAll("#cr-sppick canvas").forEach(cv => {
    const g = cv.getContext("2d"), f = Sprites.sheet(cv.dataset.sprite).walk[lookFrame % 4];
    g.imageSmoothingEnabled = false; g.clearRect(0, 0, cv.width, cv.height); g.drawImage(f, 0, 0, cv.width, cv.height);
  });
}
setInterval(() => { if (currentPage === "create" && !document.hidden) { lookFrame++; drawLooks(); } }, 180);
const autoMaxHp = s => s.END + s.LCK;
const autoCarry = s => 150 + 10 * s.STR;
function crAutoHints() {
  const s = crSpecial();
  $("cr-maxhp").placeholder = T("Auto: {n}", { n: autoMaxHp(s) });
  $("cr-carry").placeholder = T("Auto: {n}", { n: autoCarry(s) });
  if (crGearEd) crGearEd.redraw(); // the carry weight changed
}
function resetForm() {
  editingId = null; crPhoto = null; crCards = []; crLookAv = null; crLookSp = null;
  crGear = emptyGear(); mountGear();
  $("cr-title").textContent = T("Create Character");
  $("cr-hint").innerHTML = T("Fill in your character and save it. It will appear under <b>Saved Characters</b>.");
  $("cr-levelup").hidden = true;
  $("cr-name").value = ""; $("cr-origin").value = ""; $("cr-level").value = 1; $("cr-notes").value = "";
  $("cr-race").value = ""; $("cr-maxhp").value = ""; $("cr-carry").value = ""; $("cr-caps").value = 0;
  G.SPECIAL.forEach(a => ($("cr-s-" + a).value = 5));
  G.SKILL_NAMES.forEach(s => { $("cr-k-" + safeName(s)).value = 0; $("cr-t-" + safeName(s)).checked = false; });
  crAvatar(); crAutoHints();
  $("cr-save").textContent = T("SAVE CHARACTER");
  $("cr-clear").textContent = T("Clear form");
  renderCrCards();
}
function fillForm(c, levelUp = false) {
  editingId = c.id; crPhoto = c.photo || null; crLookAv = c.avatar || null; crLookSp = c.sprite || null;
  crGear = { weapons: (c.weapons || []).map(w => ({ name: w.name, ammo: w.ammo || 0, mods: (w.mods || []).slice() })),
    apparel: (c.apparel || []).map(a => ({ name: a.name, mods: (a.mods || []).slice() })),
    robomods: (c.robomods || []).slice(), items: (c.items || []).map(i => ({ name: i.name, qty: i.qty || 1 })) };
  mountGear();
  crCards = JSON.parse(JSON.stringify(c.perkCards || []));
  $("cr-title").textContent = T(levelUp ? "Level up {name}" : "Edit {name}", { name: c.name });
  $("cr-hint").innerHTML = T("Change anything you need, then press <b>Save changes</b>. Nothing is changed until you save.");
  $("cr-name").value = c.name; $("cr-origin").value = c.origin || ""; $("cr-notes").value = c.notes || "";
  $("cr-race").value = c.race || "";
  $("cr-maxhp").value = c.maxHp || ""; $("cr-carry").value = c.carryWeight || ""; $("cr-caps").value = c.caps || 0;
  $("cr-level").value = Math.min(50, (c.level || 1) + (levelUp ? 1 : 0));
  G.SPECIAL.forEach(a => ($("cr-s-" + a).value = c.special[a]));
  G.SKILL_NAMES.forEach(s => {
    $("cr-k-" + safeName(s)).value = c.skills[s] || 0;
    $("cr-t-" + safeName(s)).checked = (c.tags || []).includes(s);
  });
  crAvatar(); crAutoHints();
  const lu = $("cr-levelup");
  lu.hidden = !levelUp;
  if (levelUp) lu.innerHTML = `&#11014; <b>${T("{name}: level {a} → {b}", { name: esc(c.name), a: c.level || 1, b: $("cr-level").value })}</b><br>
    ${T("Raise whatever went up this level (S.P.E.C.I.A.L., skill ranks, perk cards, notes), then press <b>Save changes</b>. By the rulebook that's +1 max HP, +1 to one skill rank and one new perk (or one more rank) whose requirements you meet. Use <b>Fallout TTRPG Perks</b> afterwards for a suggestion.")}`;
  $("cr-save").textContent = T("SAVE CHANGES");
  $("cr-clear").textContent = T("Cancel editing");
  renderCrCards();
}

// ---- perk cards inside the form
function crSpecial() {
  const sp = {};
  G.SPECIAL.forEach(a => (sp[a] = clamp($("cr-s-" + a).value, 1, 12, 5)));
  return sp;
}
function renderCrCards() {
  const box = $("cr-cards");
  if (!crCards.length) {
    box.innerHTML = `<div class="muted" style="font-size:13px">${T("No perks yet. Add them here, or from the Fallout TTRPG Perks page.")}</div>`;
    return;
  }
  const who = { special: crSpecial(), level: clamp($("cr-level").value, 1, 50, 1), race: crRace() };
  box.innerHTML = crCards.map((c, i) => {
    const p = TT_BY[c.name], rm = `<button class="btn danger" data-rm="${i}" title="${T("Remove")}">&#10005;</button>`;
    if (!p) return `<div class="pcard"><img src="${esc(c.thumb || c.image || "")}" alt="" referrerpolicy="no-referrer" onerror="this.style.visibility='hidden'">
      <div class="t"><b>${esc(c.name)}</b><small>${T("Fallout 76 card, not in the rulebook")}</small></div>${rm}</div>`;
    const miss = unmet(who, p, c.rank);
    return `<div class="pcard">${perkThumb(p)}
      <div class="t"><b>${esc(perkName(p.n))}</b><small>${esc(reqText(p))}</small>${miss.length ? `<small style="color:var(--red);white-space:normal">${T("Requirements not met")}: ${esc(miss.join(", "))}</small>` : ""}</div>
      <select data-i="${i}" title="${T("Rank")}">${Array.from({ length: p.max }, (_, k) => `<option value="${k + 1}" ${k + 1 === c.rank ? "selected" : ""}>${T("Rank {n}", { n: k + 1 })}</option>`).join("")}</select>${rm}</div>`;
  }).join("");
  box.querySelectorAll("select[data-i]").forEach(sel => (sel.onchange = () => { crCards[+sel.dataset.i].rank = +sel.value; renderCrCards(); }));
  box.querySelectorAll("[data-rm]").forEach(b => (b.onclick = () => { crCards.splice(+b.dataset.rm, 1); renderCrCards(); }));
}
[...G.SPECIAL.map(a => "cr-s-" + a), "cr-level", "cr-race", "cr-origin"].forEach(id => $(id).addEventListener("input", renderCrCards));

function fillPerkList() {
  $("cr-perklist").innerHTML = TT_PERKS.map(p => `<option value="${esc(perkName(p.n))}">${esc(reqText(p))}</option>`).join("");
}
$("cr-cardadd").onclick = () => {
  const name = pkFold($("cr-cardname").value.trim());
  if (!name) return;
  const p = TT_PERKS.find(x => pkFold(x.n) === name || pkFold(perkName(x.n)) === name);
  if (!p) { toast(T("Pick a perk name from the list")); return; }
  if (crCards.some(c => c.name === p.n)) { toast(T("{perk} is already on this character", { perk: perkName(p.n) })); return; }
  crCards.push(perkCardFrom(p, 1));
  $("cr-cardname").value = "";
  renderCrCards();
};
$("cr-cardname").addEventListener("keydown", e => { if (e.key === "Enter") $("cr-cardadd").click(); });

// shrink photos so the saved list stays small
function shrinkPhoto(file) {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onerror = rej;
    fr.onload = () => {
      const im = new Image();
      im.onerror = () => rej(new Error(T("That file isn't an image this device can read.")));
      im.onload = () => {
        const max = 480, k = Math.min(1, max / Math.max(im.width, im.height));
        const cv = document.createElement("canvas");
        cv.width = Math.round(im.width * k); cv.height = Math.round(im.height * k);
        cv.getContext("2d").drawImage(im, 0, 0, cv.width, cv.height);
        res(cv.toDataURL("image/jpeg", 0.85));
      };
      im.src = fr.result;
    };
    fr.readAsDataURL(file);
  });
}
$("cr-photo").onchange = async e => {
  const f = e.target.files && e.target.files[0];
  if (!f) return;
  try { crPhoto = await shrinkPhoto(f); crAvatar(); }
  catch (err) { toast(err.message || T("Couldn't load that photo")); }
  e.target.value = "";
};
$("cr-nophoto").onclick = () => { crPhoto = null; crAvatar(); };
$("cr-race").onchange = crAvatar;
$("cr-origin").addEventListener("input", () => { if (!$("cr-race").value) crAvatar(); });
G.SPECIAL.forEach(a => $("cr-s-" + a).addEventListener("input", crAutoHints));
crAvatar(); crAutoHints();
$("cr-clear").onclick = () => {
  const id = editingId;
  resetForm();
  if (id) { openProfileId = id; showPage("roster"); }
};

$("cr-save").onclick = async () => {
  const name = $("cr-name").value.trim();
  if (!name) { toast(T("Give your character a name first")); $("cr-name").focus(); return; }
  const before = editingId ? ROSTER.find(x => x.id === editingId) : null;
  const c = {
    ...(before || {}), // keep anything this form doesn't show
    id: editingId || "c" + Date.now() + Math.floor(Math.random() * 1000),
    name, origin: $("cr-origin").value.trim(), level: clamp($("cr-level").value, 1, 50, 1),
    special: {}, skills: {}, tags: [], photo: crPhoto, notes: $("cr-notes").value.trim(),
    perkCards: crCards, race: $("cr-race").value || null,
    avatar: avatarFor({ race: crRace(), avatar: crLookAv }), sprite: spriteFor({ race: crRace(), sprite: crLookSp }),
    weapons: crGear.weapons, apparel: crGear.apparel, robomods: crGear.robomods, items: crGear.items,
    caps: clamp($("cr-caps").value, 0, 9999999, 0),
    maxHp: $("cr-maxhp").value === "" ? null : clamp($("cr-maxhp").value, 1, 999, null),
    carryWeight: $("cr-carry").value === "" ? null : clamp($("cr-carry").value, 0, 9999, null),
  };
  G.SPECIAL.forEach(a => (c.special[a] = clamp($("cr-s-" + a).value, 1, 12, 5)));
  G.SKILL_NAMES.forEach(s => {
    c.skills[s] = clamp($("cr-k-" + safeName(s)).value, 0, 6, 0);
    if ($("cr-t-" + safeName(s)).checked) c.tags.push(s);
  });
  const wasEditing = !!editingId;
  await addToRoster(c);
  if (typeof Team !== "undefined") Team.prune(); // a team member's new sprite starts walking at once
  toast(T(wasEditing ? "{name} updated" : "{name} saved", { name }));
  resetForm();
  openProfileId = c.id;
  showPage("roster");
};

// ------------------------------------------------------------------ 6. saved characters
let openProfileId = null;
async function loadRoster() {
  ROSTER = await Platform.loadJSON("roster", []);
  // perks saved from the old Fallout 76 list become their rulebook perk
  if (ROSTER.map(migratePerks).some(Boolean)) await storeRoster();
}
async function storeRoster() {
  const ok = await Platform.saveJSON("roster", ROSTER);
  if (!ok) toast(T("Warning: could not save the character list"));
  return ok;
}
async function addToRoster(c) {
  c.id = c.id || "c" + Date.now() + Math.floor(Math.random() * 1000);
  c.updated = Date.now();
  const i = ROSTER.findIndex(x => x.id === c.id);
  if (i >= 0) ROSTER[i] = c; else ROSTER.push(c);
  await storeRoster();
}
function closeProfile() { openProfileId = null; renderRoster(); }
// only one character can be "my current main character": marking one unmarks the rest
async function setMain(c, on) {
  ROSTER.forEach(x => delete x.main);
  if (on) c.main = true;
  await storeRoster();
  toast(T(on ? "{name} is now your main character" : "{name} is no longer your main character", { name: c.name }));
  renderRoster();
}
const mainBadge = c => (c.main ? `<span class="main-badge">&#9733; ${T("My current main character")}</span>` : "");

function derived(c) {
  const s = c.special;
  return [
    [T(c.maxHp ? "Max HP" : "Max HP (auto, level 1)"), c.maxHp || autoMaxHp(s)], [T("Initiative"), s.PER + s.AGI],
    [T("Defense"), s.AGI >= 9 ? 2 : 1], [T(c.carryWeight ? "Carry weight" : "Carry weight (auto)"), (c.carryWeight || autoCarry(s)) + " " + T("lbs")],
    [T("Melee bonus"), s.STR >= 11 ? T("+{n} CD", { n: 3 }) : s.STR >= 9 ? T("+{n} CD", { n: 2 }) : s.STR >= 7 ? T("+{n} CD", { n: 1 }) : T("none")], [T("Luck points"), s.LCK],
  ];
}

function renderRoster() {
  const list = $("ro-list"), prof = $("ro-profile");
  const c = openProfileId && ROSTER.find(x => x.id === openProfileId);
  if (c) {
    list.innerHTML = "";
    const skills = G.SKILLS.filter(([s]) => c.skills[s] || (c.tags || []).includes(s));
    prof.innerHTML = `<button class="btn" id="ro-back">&larr; ${T("All characters")}</button>
      <div class="card${c.main ? " is-main" : ""}"><div class="profile-head"><div class="avatar" id="ro-av"></div>
        <div style="min-width:0"><h3>${esc(c.name)}</h3><div class="muted">${esc(c.origin || T("Unknown origin"))} &middot; ${T("Level")} ${c.level || 1}</div>${mainBadge(c)}</div></div>
        <button class="btn main-toggle${c.main ? " on" : ""}" id="ro-main">${c.main ? `&#9733; ${T("Main character (tap to unmark)")}` : `&#9734; ${T("Set as my current main character")}`}</button>
        <h4>S.P.E.C.I.A.L.</h4><div class="statgrid">${G.SPECIAL.map(a => `<div class="stat"><b>${c.special[a]}</b><small>${T(SPECIAL_FULL[a])}</small></div>`).join("")}</div>
        <h4>${T("Derived (from S.P.E.C.I.A.L., before gear and perks)")}</h4>
        <div class="derived">${derived(c).map(([k, v]) => `<div class="stat"><b style="font-size:17px">${v}</b><small>${k}</small></div>`).join("")}</div>
        <h4>${T("Skills")}</h4>${skills.length ? `<table class="lt">${skills.map(([s, a]) => `<tr><td>${(c.tags || []).includes(s) ? "&#9733; " : ""}${esc(T(s))} <span class="muted">[${T(a)}]</span></td>
          <td style="text-align:right"><b>${c.skills[s] || 0}</b></td><td style="text-align:right" class="muted">${T("TN")} ${c.special[a] + (c.skills[s] || 0)}</td></tr>`).join("")}</table>
          <div class="muted" style="font-size:12px;margin-top:4px">${T("★ = Tag skill. TN = attribute + skill rank.")}</div>`
          : `<div class="muted">${T("No skill ranks yet.")}</div>`}
        <h4>${T("Perks")}</h4>
        ${(c.perkCards || []).length ? (c.perkCards || []).map(pc => {
          const p = TT_BY[pc.name];
          if (!p) return `<div class="pcard"><img src="${esc(pc.thumb || pc.image || "")}" alt="" referrerpolicy="no-referrer" onerror="this.style.visibility='hidden'">
            <div class="t"><b>${esc(pc.name)}</b> <span class="muted">${T("Fallout 76 card, not in the rulebook")}</span></div></div>`;
          return `<div class="pcard">${perkThumb(p)}
            <div class="t"><b>${esc(perkName(p.n))}</b> <span class="muted">${T("Rank {r} of {m}", { r: pc.rank, m: p.max })}</span>
            <small style="white-space:normal">${p.desc.map(d => esc(T(d))).join(" ")}</small></div></div>`;
        }).join("") : `<div class="muted">${T("No perks yet. Tap <b>Suggest a perk</b> to get one picked for this character.")}</div>`}
        <div class="caps-show">&#129689; ${T("Caps")} <b>${(c.caps || 0).toLocaleString(LANG)}</b></div>
        <h4>${T("Weapons")}</h4><div id="ro-weapons"></div>
        <div class="row" style="margin-top:8px"><div style="flex:3 1 200px"><select id="ro-wpick">${Object.keys(WEAPONS_FOR_COMBAT)
          .sort((a, b) => T(a).localeCompare(T(b))).map(n => `<option value="${esc(n)}">${esc(T(n))}</option>`).join("")}</select></div>
          <div style="flex:1 1 110px"><button class="btn" id="ro-wadd" style="width:100%">${T("+ Add weapon")}</button></div></div>
        <div class="muted" style="font-size:12px;margin-top:6px">${T("The Combat Assistant arms this character with these weapons, and they can switch between them on their turn.")}</div>
        ${typeof Gear !== "undefined" ? Gear.summary(c, c.carryWeight || ((c.race || raceFromOrigin(c.origin)) === "robot" ? 150 : autoCarry(c.special))) : ""}
        <div class="muted" style="font-size:12px;margin-top:6px">${T("Change weapons, armor, mods and items with <b>Edit</b>.")}</div>
        ${c.notes ? `<h4>${T("Notes")}</h4><div style="white-space:pre-wrap;font-size:14px;line-height:1.45">${esc(c.notes)}</div>` : ""}
        <div class="bar" style="margin-top:16px"><button class="btn primary" id="ro-lvl">&#11014; ${T("Level up")}</button>
          <button class="btn" id="ro-sug">&#9733; ${T("Suggest a perk")}</button></div>
        <div class="bar"><button class="btn" id="ro-edit">&#9998; ${T("Edit")}</button><button class="btn danger" id="ro-del">&#128465; ${T("Delete")}</button></div>
      </div>`;
    setAvatar($("ro-av"), c);
    renderWeapons(c);
    $("ro-wadd").onclick = async () => {
      const n = $("ro-wpick").value;
      if (!WEAPONS_FOR_COMBAT[n]) return;
      c.weapons = (c.weapons || []).filter(w => WEAPONS_FOR_COMBAT[w.name]);
      if (c.weapons.some(w => w.name === n)) { toast(T("{name} already has that weapon", { name: c.name })); return; }
      c.weapons.push({ name: n, ammo: startAmmo(n), mods: [] });
      await storeRoster(); renderWeapons(c);
    };
    $("ro-back").onclick = closeProfile;
    $("ro-main").onclick = () => setMain(c, !c.main);
    $("ro-edit").onclick = () => { fillForm(c); showPage("create"); };
    $("ro-lvl").onclick = () => {
      if ((c.level || 1) >= 50) { toast(T("Already at the maximum level (50)")); return; }
      fillForm(c, true); showPage("create");
    };
    $("ro-sug").onclick = () => { showPage("perks"); $("pk-char").value = c.id; updateCharInfo(); $("pk-out").innerHTML = ""; $("pk-gen").click(); };
    $("ro-del").onclick = () => deleteChar(c);
    return;
  }
  prof.innerHTML = "";
  if (!ROSTER.length) {
    list.innerHTML = `<div class="empty">${T("No saved characters yet.<br><br>Create one in <b>Create Character</b>, or tap <b>Add to saved</b> after generating a random one.")}</div>`;
    return;
  }
  const sorted = ROSTER.slice().sort((a, b) => !!b.main - !!a.main || a.name.localeCompare(b.name)); // the main character first
  list.innerHTML = `<p class="hint">${TP(sorted.length, "{n} character. Tap one to see the profile.", "{n} characters. Tap one to see the profile.")}</p><div class="list">` +
    sorted.map(c => `<div class="entry${c.main ? " is-main" : ""}" data-id="${esc(c.id)}"><div class="avatar" data-av="${esc(c.id)}"></div><div style="flex:1;min-width:0">
      <b>${esc(c.name)}</b>${mainBadge(c)}<small>${esc(c.origin || T("Unknown origin"))} &middot; ${T("Lvl")} ${c.level || 1}${(c.perkCards || []).length ? ` &middot; ${TP(c.perkCards.length, "{n} perk", "{n} perks")}` : ""}</small><br>
      <small>${G.SPECIAL.map(a => `${T(a)} ${c.special[a]}`).join(" &middot; ")}</small></div>
      <button class="btn star-btn${c.main ? " on" : ""}" data-star="${esc(c.id)}" title="${T(c.main ? "Main character (tap to unmark)" : "Set as my current main character")}"
        aria-label="${T(c.main ? "Main character (tap to unmark)" : "Set as my current main character")}" aria-pressed="${!!c.main}">${c.main ? "&#9733;" : "&#9734;"}</button>
      <button class="btn danger" data-del="${esc(c.id)}" title="${T("Delete")}" style="flex:none;padding:8px 11px">&#128465;</button></div>`).join("") + "</div>";
  list.querySelectorAll("[data-av]").forEach(el => setAvatar(el, ROSTER.find(x => x.id === el.dataset.av)));
  list.querySelectorAll(".entry").forEach(el => (el.onclick = e => {
    if (e.target.closest("[data-del], [data-star]")) return;
    openProfileId = el.dataset.id; renderRoster(); $("main").scrollTop = 0;
  }));
  list.querySelectorAll("[data-del]").forEach(b => (b.onclick = () => deleteChar(ROSTER.find(x => x.id === b.dataset.del))));
  list.querySelectorAll("[data-star]").forEach(b => (b.onclick = () => { const c = ROSTER.find(x => x.id === b.dataset.star); setMain(c, !c.main); }));
}

// ammo a weapon starts with: what a random character rolled for its caliber, or a handful
const isMeleeSkill = sk => sk === "Melee Weapons" || sk === "Unarmed";
function startAmmo(name, rolled) {
  const w = WEAPONS_FOR_COMBAT[name];
  if (!w || isMeleeSkill(w.skill)) return 0;
  if (rolled) return rolled[w.ammo] || rolled[name] || (/Molotov/.test(name) ? rolled.Molotov : 0) || 0;
  return w.skill === "Throwing" || w.skill === "Explosives" ? 3 : 20;
}
function renderWeapons(c) {
  const box = $("ro-weapons");
  const RANGE = { C: "Close", M: "Medium", L: "Long", X: "Extreme" };
  const ws = (c.weapons || []).filter(w => WEAPONS_FOR_COMBAT[w.name]);
  box.innerHTML = ws.length ? ws.map((w, i) => {
    const d = (typeof Gear !== "undefined" && Gear.weaponStats(w)) || WEAPONS_FOR_COMBAT[w.name], melee = isMeleeSkill(d.skill);
    return `<div class="pcard wpn"><div class="t"><b>${esc(T(w.name))}</b>${(w.mods || []).length ? ` <span class="muted">+ ${w.mods.map(m => esc(T(m))).join(", ")}</span>` : ""}
      <small>${typeof Gear !== "undefined" ? Gear.weaponLine(d) : `${T(d.skill)} &middot; ${d.dmg} ${T("CD")}`}</small></div>
      ${melee ? "" : `<label class="wpn-ammo"><small>${T(d.skill === "Throwing" || d.skill === "Explosives" ? "Throwables" : "Ammo")}</small><input type="number" min="0" max="9999" data-wammo="${i}" value="${w.ammo || 0}"></label>`}
      <button class="btn danger" data-wrm="${i}" title="${T("Remove weapon")}">&#10005;</button></div>`;
  }).join("") : `<div class="muted">${T("No weapons yet. Pick one below and tap <b>+ Add weapon</b>.")}</div>`;
  box.querySelectorAll("[data-wrm]").forEach(b => (b.onclick = async () => {
    c.weapons = ws.filter((_, i) => i !== +b.dataset.wrm);
    await storeRoster(); renderWeapons(c);
  }));
  box.querySelectorAll("[data-wammo]").forEach(inp => (inp.onchange = async () => {
    ws[+inp.dataset.wammo].ammo = clamp(inp.value, 0, 9999, 0);
    c.weapons = ws;
    await storeRoster();
  }));
}

async function deleteChar(c) {
  if (!c || !(await confirmBox(T("Delete {name}? This can't be undone.", { name: c.name })))) return;
  ROSTER = ROSTER.filter(x => x.id !== c.id);
  await storeRoster();
  Team.prune(); // their sprite leaves with them
  if (editingId === c.id) resetForm();
  openProfileId = null; renderRoster();
  toast(T("{name} deleted", { name: c.name }));
}

// ------------------------------------------------------------------ home: rearrange the tiles
// Mouse: click and drag. Touch: press and hold (~350 ms), then drag; a quick swipe still scrolls.
const Tiles = (() => {
  const grid = document.querySelector(".tiles");
  const order = () => [...grid.querySelectorAll(".tile")].map(t => t.dataset.go);
  const DEFAULT = order();
  const apply = ids => {
    const all = ids.filter(id => DEFAULT.includes(id)).concat(DEFAULT.filter(id => !ids.includes(id))); // new tools go last
    all.forEach(id => grid.appendChild(grid.querySelector(`.tile[data-go="${id}"]`)));
  };
  let drag = null, pending = null, justDragged = false;

  function begin(tile, x, y) {
    const r = tile.getBoundingClientRect();
    const ghost = tile.cloneNode(true);
    ghost.classList.add("tile-ghost");
    Object.assign(ghost.style, { width: r.width + "px", height: r.height + "px", left: "0px", top: "0px" });
    document.body.appendChild(ghost);
    tile.classList.add("dragging");
    drag = { tile, ghost, dx: x - r.left, dy: y - r.top };
    move(x, y);
    if (navigator.vibrate) try { navigator.vibrate(15); } catch (e) { /* not supported */ }
  }
  function move(x, y) {
    drag.ghost.style.transform = `translate(${x - drag.dx}px, ${y - drag.dy}px) scale(1.05)`;
    const over = document.elementFromPoint(x, y);
    const target = over && over.closest(".tiles .tile");
    if (target && target !== drag.tile) {
      const tiles = [...grid.children];
      grid.insertBefore(drag.tile, tiles.indexOf(target) < tiles.indexOf(drag.tile) ? target : target.nextSibling);
    }
    const main = $("main"), edge = 70;
    if (y < edge) main.scrollBy(0, -12); else if (y > window.innerHeight - edge) main.scrollBy(0, 12);
  }
  function end() {
    if (!drag) return;
    drag.ghost.remove();
    drag.tile.classList.remove("dragging");
    drag = null;
    justDragged = true; setTimeout(() => (justDragged = false), 350);
    Platform.saveJSON("home_order", order());
  }

  // mouse
  grid.addEventListener("pointerdown", e => {
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    const tile = e.target.closest(".tile");
    if (tile) pending = { tile, x: e.clientX, y: e.clientY };
  });
  window.addEventListener("pointermove", e => {
    if (e.pointerType !== "mouse") return;
    if (drag) { e.preventDefault(); move(e.clientX, e.clientY); return; }
    if (pending && Math.hypot(e.clientX - pending.x, e.clientY - pending.y) > 6) { begin(pending.tile, e.clientX, e.clientY); pending = null; }
  });
  window.addEventListener("pointerup", e => { if (e.pointerType === "mouse") { pending = null; end(); } });

  // touch: long press starts the drag
  let timer = null, start = null;
  grid.addEventListener("touchstart", e => {
    const tile = e.target.closest(".tile");
    if (!tile || e.touches.length > 1) return;
    const t = e.touches[0];
    start = { x: t.clientX, y: t.clientY };
    timer = setTimeout(() => { timer = null; begin(tile, start.x, start.y); }, 350);
  }, { passive: true });
  grid.addEventListener("touchmove", e => {
    const t = e.touches[0];
    if (drag) { e.preventDefault(); move(t.clientX, t.clientY); return; }
    if (timer && Math.hypot(t.clientX - start.x, t.clientY - start.y) > 10) { clearTimeout(timer); timer = null; } // it's a scroll
  }, { passive: false });
  const touchEnd = e => { if (timer) { clearTimeout(timer); timer = null; } if (drag) { e.preventDefault(); end(); } };
  grid.addEventListener("touchend", touchEnd, { passive: false });
  grid.addEventListener("touchcancel", touchEnd, { passive: false });

  // a drop must not also count as a tap on the tile
  grid.addEventListener("click", e => { if (justDragged) { e.stopPropagation(); e.preventDefault(); } }, true);
  grid.addEventListener("contextmenu", e => e.preventDefault());
  $("tiles-reset").onclick = () => { apply(DEFAULT); Platform.saveJSON("home_order", null); toast(T("Tiles back in their original order")); };

  async function restore() {
    const saved = await Platform.loadJSON("home_order", null);
    if (Array.isArray(saved)) apply(saved);
  }
  return { restore, order };
})();

// ------------------------------------------------------------------ start
// Runs once every script has loaded: My Team and the combat assistant live in files after this one,
// and in the apps the saved data is ready at once, so starting earlier would reach them too soon.
async function startApp() {
  const start = location.hash.slice(1);
  showPage($("page-" + start) ? start : "home");
  // one failing load must not keep the others (or My Team) waiting
  await Promise.all([loadRoster(), loadLootOverrides(), Tiles.restore()].map(p => p.catch(e => console.error(e))));
  await Team.load();
  if (currentPage === "combat") Combat.show(); // a fight opened before the sprites were ready
  if (currentPage === "elber") Elber.show();   // opened before the saved characters were read
  mountGear();
  if (currentPage === "roster") renderRoster(); // same for Saved Characters
  if (currentPage === "perks") fillCharSelect();
  buildLootEditor();
  setTimeout(() => Updater.check(false), 1500); // ask about new versions on startup
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", startApp); else startApp();
