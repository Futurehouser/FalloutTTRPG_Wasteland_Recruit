// Navigation and the six tools.
const $ = id => document.getElementById(id);
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
const SPECIAL_FULL = { STR: "Strength", PER: "Perception", END: "Endurance", CHA: "Charisma", INT: "Intelligence", AGI: "Agility", LCK: "Luck" };

function toast(msg) {
  const t = $("toast"); t.textContent = msg; t.classList.add("show");
  clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove("show"), 2800);
}
function confirmBox(text, yesLabel = "Delete") {
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
  if (id === "perks") fillCharSelect();
  if (id === "create") fillPerkList();
  if (id === "combat" && typeof Combat !== "undefined") Combat.show();
}
$("burger").onclick = () => document.body.classList.toggle("menu-open");
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
    const img = new Image(); img.src = cgUrl; img.alt = "Filled character sheet";
    img.onclick = () => view.classList.toggle("zoom");
    view.appendChild(img);
    $("cg-info").innerHTML = `<b>${esc(cgChar.name)}</b> &mdash; ${esc(cgChar.origin)} (${esc(cgChar.pack)}), ${esc(cgChar.archetype)}<br><span class="q">${esc(cgChar.gimmick_short)}</span>`;
    $("cg-save").disabled = $("cg-share").disabled = $("cg-keep").disabled = false;
  } catch (e) {
    $("cg-info").textContent = "Something went wrong: " + e;
  }
  $("cg-gen").disabled = false;
};
const cgFile = () => `${safeName(cgChar.name)}_${Date.now()}.png`;
$("cg-save").onclick = async () => cgUrl && toast(await Platform.saveImage(cgUrl, cgFile()));
$("cg-share").onclick = () => { if (cgUrl) { const r = Platform.shareImage(cgUrl, cgFile(), cgChar.name); if (r) toast(r); } };
$("cg-keep").onclick = async () => {
  if (!cgChar) return;
  const c = cgChar;
  const perks = c.perks.map(([p, r]) => `${p} (rank ${r})`).join(", ");
  await addToRoster({
    name: c.name, origin: c.origin, race: c.race, level: 1, special: Object.assign({}, c.special),
    maxHp: c.hp, carryWeight: c.carry_max,
    skills: Object.assign({}, c.skills), tags: c.tags.slice(), photo: null,
    notes: `${c.gimmick_long}\n\nArchetype: ${c.archetype}. Equipment pack: ${c.pack}. Perks: ${perks || "none"}.` +
           (c.survivor_traits.length ? ` Traits: ${c.survivor_traits.join(", ")}.` : ""),
  });
  $("cg-keep").disabled = true;
  toast(`${c.name} added to Saved Characters`);
};

// ------------------------------------------------------------------ 2. scavenging location
for (let i = 1; i <= 20; i++) $("sc-level").insertAdjacentHTML("beforeend", `<option>${i}</option>`);
const itemChips = items => items.map(i =>
  `<span class="chip" data-cat="${esc(i.cat)}">${esc(i.cat)} <b>${i.min}-${i.max}</b></span>`).join("");
const obstacleHtml = o => `<b>${esc(o.name)}</b>: ${esc(o.test)}. Takes ${esc(o.time)}.<br><span class="muted">Alternative: ${esc(o.alt)}.</span>`;

$("sc-gen").onclick = () => {
  const L = generateLocation({ level: $("sc-level").value, scale: $("sc-scale").value, degree: $("sc-degree").value });
  let h = `<div class="card"><h3>${esc(L.name)}</h3><div class="muted">${esc(L.type)}</div>
    <div class="badges"><span class="badge">Level <b>${L.level}</b></span><span class="badge">Scale <b>${L.scale}</b></span>
    <span class="badge">Degree <b>${L.degree}</b></span></div>
    <h4>Search</h4><div><b>PER + Survival</b>, difficulty <b>${L.difficulty}</b>. Takes <b>${L.time}</b> (spend 2 AP to halve it).
      A success gives the minimum rolls in each category. Each AP spent buys 1 extra roll, up to the maximum.</div>
    <h4>Loot (min-max rolls)</h4><div>${itemChips(L.items)}</div>`;
  if (L.inhabitants) {
    const I = L.inhabitants;
    h += `<h4>Inhabitants</h4><div><b>${I.count}</b> &times; ${esc(I.desc)} <span class="muted">(${esc(I.group)}, level ${I.level}${I.leader ? `, leader level ${I.leader}` : ""})</span><br>
      <span class="muted">Sneaking in: AGI + Sneak opposed by their PER + Survival. Halve the number for big creatures, double it for small ones.</span></div>`;
  } else h += `<h4>Inhabitants</h4><div class="muted">None right now. A complication can still bring some in.</div>`;
  if (L.obstacle) h += `<h4>Obstacle</h4><div>${obstacleHtml(L.obstacle)}</div>`;
  if (L.hazard) h += `<h4>Hazard</h4><div><b>${esc(L.hazard.name)}</b> <span class="muted">(${esc(L.hazard.kind)})</span>: ${esc(L.hazard.text)}</div>`;
  if (L.nested) {
    const N = L.nested;
    h += `<h4>Hidden spot (reveal after the first successful search)</h4><div><b>${esc(N.name)}</b>: Tiny, Untouched, level ${N.level}.
      Takes 1 minute to search once it's open.<br>${obstacleHtml(N.lock)}<div style="margin-top:6px">${itemChips(N.items)}</div></div>`;
  }
  h += `<h4>Complication ideas</h4><ul class="tight">${L.complications.map(c => `<li>${esc(c)}</li>`).join("")}</ul></div>`;
  $("sc-out").innerHTML = h;
  $("sc-out").querySelectorAll(".chip").forEach(ch => (ch.onclick = () => {
    $("lt-cat").value = ch.dataset.cat; $("lt-roll").value = ""; $("lt-out").innerHTML = "";
    buildLootEditor(); showPage("loot");
  }));
};

// ------------------------------------------------------------------ 3. loot roller
LOOT_CATEGORIES.forEach(c => $("lt-cat").insertAdjacentHTML("beforeend", `<option>${esc(c)}</option>`));
function showLoot(roll, dice) {
  const cat = $("lt-cat").value;
  const e = lootLookup(cat, roll);
  if (!e) { $("lt-out").innerHTML = `<div class="card">Enter a number from 2 to 40.</div>`; return; }
  const diceTxt = dice ? ` <span class="muted">(rolled ${dice[0]} + ${dice[1]})</span>` : "";
  let h = `<div class="card result"><div class="muted">${esc(cat)} &middot; roll <b>${roll}</b>${diceTxt}</div>
    <div class="item">${esc(e.name)}</div>`;
  if (e.cd) {
    h += `<div>Quantity: <b>${e.base}</b> + roll <b>${e.cd} d6</b> (combat ${e.cd === 1 ? "die" : "dice"}).</div>
      <div class="muted" style="font-size:13px">Combat die faces: 1 = 1, 2 = 2, 3 or 4 = 0, 5 or 6 = 1 + Effect.</div>
      <button class="btn" id="lt-cd" style="margin-top:8px">&#127922; Roll the ${e.cd} d6 for me</button><div id="lt-cdout"></div>`;
  } else {
    h += `<div>Quantity: <b>${e.base || 1}</b>. No dice to roll.</div>`;
  }
  h += `<div class="muted" style="font-size:13px;margin-top:8px">Tip: a player can spend 1 Luck point to shift the 2d20 result by up to the location's level.</div></div>`;
  $("lt-out").innerHTML = h;
  if (e.cd) $("lt-cd").onclick = () => {
    const r = rollCombatDice(e.cd);
    const faces = r.faces.map(f => {
      const v = CD_FACE_VALUE[f - 1];
      return `<span class="die ${f >= 5 ? "fx" : v === 0 ? "zero" : ""}" title="face ${f}">${v}${f >= 5 ? "*" : ""}</span>`;
    }).join("");
    $("lt-cdout").innerHTML = `<div class="dice">${faces}</div><div>Total: <b>${e.base} + ${r.total} = ${e.base + r.total}</b> ${esc(e.name)} <span class="muted">(* = Effect)</span></div>`;
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
  let h = `<table class="lt"><tr><th>2d20</th><th>Item</th><th>Qty</th><th>Dice</th></tr>`;
  ROLLS.forEach(r => {
    const e = t[r];
    h += `<tr><td class="r">${r}</td><td><input type="text" data-r="${r}" data-k="name" value="${esc(e.name)}"></td>
      <td class="n"><input type="number" min="0" data-r="${r}" data-k="base" value="${e.base}"></td>
      <td class="n"><input type="number" min="0" max="20" data-r="${r}" data-k="cd" value="${e.cd}"></td></tr>`;
  });
  $("lt-table").innerHTML = h + "</table>";
}
$("lt-tsave").onclick = async () => {
  const cat = $("lt-cat").value, t = {};
  $("lt-table").querySelectorAll("input").forEach(inp => {
    const r = inp.dataset.r; t[r] = t[r] || {};
    t[r][inp.dataset.k] = inp.dataset.k === "name" ? inp.value.trim() || "(nothing)" : Math.max(0, parseInt(inp.value, 10) || 0);
  });
  LOOT_OVERRIDES[cat] = t;
  toast((await Platform.saveJSON("loot_tables", LOOT_OVERRIDES)) ? `${cat} table saved` : "Could not save the table");
};
$("lt-treset").onclick = async () => {
  const cat = $("lt-cat").value;
  if (!(await confirmBox(`Reset the ${cat} table to the app's default? Your edits to it will be lost.`, "Reset"))) return;
  delete LOOT_OVERRIDES[cat];
  await Platform.saveJSON("loot_tables", LOOT_OVERRIDES);
  buildLootEditor(); toast(`${cat} table reset`);
};

// ------------------------------------------------------------------ 4. random perk / suggestion
let pkSkip = [];
const pkChar = () => ROSTER.find(x => x.id === $("pk-char").value) || null;

function fillCharSelect() {
  const sel = $("pk-char"), keep = sel.value;
  sel.innerHTML = `<option value="">Nobody: fully random perk</option>` + ROSTER.slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(c => `<option value="${esc(c.id)}">${esc(c.name)} (level ${c.level || 1})</option>`).join("");
  sel.value = ROSTER.some(c => c.id === keep) ? keep : "";
  updateCharInfo();
}

// small S.P.E.C.I.A.L. grid: points spent on perk cards / attribute value
function pointsGrid(special, cards) {
  const used = pointsUsed({ perkCards: cards });
  return `<div class="pts">${G.SPECIAL.map(k => {
    const u = used[k] || 0, max = special[k] || 0, over = u > max;
    return `<div class="${u >= max ? "full" : ""}" style="${over ? "border-color:var(--red)" : ""}" title="${SPECIAL_FULL[k]}">
      ${k}<br><b style="${over ? "color:var(--red)" : ""}">${u}/${max}</b></div>`;
  }).join("")}</div>`;
}
const cardsOwned = c => (c.perkCards || []).reduce((n, x) => n + x.rank, 0);

function updateCharInfo() {
  const c = pkChar();
  pkSkip = [];
  $("pk-gen").textContent = c ? "SUGGEST A PERK" : "RANDOM PERK";
  if (!c) { $("pk-charinfo").innerHTML = ""; return; }
  const owned = cardsOwned(c), lvl = c.level || 1;
  $("pk-charinfo").innerHTML = `<b>${esc(c.name)}</b>: level ${lvl}, ${owned} perk card${owned === 1 ? "" : "s"} picked
    (Fallout 76 gives one per level${owned >= lvl ? `. <span style="color:var(--red)">All picks for this level are used: level up first, or treat the suggestion as a plan</span>` : ""}).
    Points spent per S.P.E.C.I.A.L.:${pointsGrid(c.special, c.perkCards || [])}
    ${isGhoul(c) ? "Ghoul origin: Ghoul perks are included." : "Ghoul perks are only suggested if the character's origin says Ghoul."}`;
}
$("pk-char").onchange = () => { updateCharInfo(); $("pk-out").innerHTML = ""; };

function perkHtml(p, opts = {}) {
  const ranks = p.ranks.map((r, i) => `<div class="rank" style="${opts.rank === i + 1 ? "border-left-color:var(--green)" : opts.rank ? "opacity:.6" : ""}">
    <b>Rank ${esc(r.rank)}</b>${opts.rank === i + 1 ? " &larr; suggested" : ""}: ${esc(r.desc)}</div>`).join("");
  return `<div class="card perk">
    <img src="${esc(p.image)}" alt="${esc(p.name)} perk card" referrerpolicy="no-referrer" onerror="if(this.src!=='${esc(p.thumb)}')this.src='${esc(p.thumb)}'">
    <div class="txt"><h3>${esc(p.name)}</h3>
      <div class="badges"><span class="badge"><b>${esc(p.special)}</b></span><span class="badge">${esc(p.group)} perk</span>
      <span class="badge">Unlocks at level <b>${esc(p.level)}</b></span><span class="badge">${p.ranks.length} rank${p.ranks.length > 1 ? "s" : ""}</span></div>
      ${opts.extra || ""}${ranks}
      <div class="muted" style="font-size:12px;margin-top:10px">Source: <a href="${esc(p.link)}" target="_blank" rel="noopener">fallout.wiki</a>
      &middot; ${opts.footer || ""}</div></div></div>`;
}

$("pk-gen").onclick = async () => {
  $("pk-gen").disabled = true;
  $("pk-out").innerHTML = `<div class="card muted">Loading perks from fallout.wiki&hellip;</div>`;
  try {
    const { perks, source } = await loadPerks();
    const g = $("pk-group").value, s = $("pk-special").value;
    const pool = perks.filter(p => (!g || p.group === g) && (!s || p.special.toLowerCase().startsWith(s.toLowerCase())));
    const off = source === "cache" ? " &middot; offline copy" : "";
    if (!pool.length) { $("pk-out").innerHTML = `<div class="card">No perks match those filters.</div>`; return; }
    const ch = pkChar();
    if (!ch) {
      $("pk-out").innerHTML = perkHtml(choice(pool), { footer: `${pool.length} perks in this pool${off}` });
      return;
    }
    let { pick, total } = suggestPerk(ch, pool, pkSkip);
    if (!pick && pkSkip.length) { pkSkip = []; ({ pick, total } = suggestPerk(ch, pool, pkSkip)); }
    if (!pick) {
      $("pk-out").innerHTML = `<div class="card">Nothing fits ${esc(ch.name)} right now: every S.P.E.C.I.A.L. is out of free points,
        or the remaining perks need a higher level. Level up the character (Saved Characters &rarr; Level up), or loosen the filters.</div>`;
      return;
    }
    pkSkip.push(pick.perk.name);
    const head = pick.kind === "upgrade" ? `Rank up to <b>${pick.rank}</b>` : "New perk card";
    $("pk-out").innerHTML = perkHtml(pick.perk, {
      rank: pick.rank,
      extra: `<div class="why"><b>${head}</b> for ${esc(ch.name)}: ${pick.reasons.map(esc).join("; ")}.</div>
        <div class="bar" style="margin:8px 0"><button class="btn primary" id="pk-add">&#10010; Add to ${esc(ch.name)}</button>
        <button class="btn" id="pk-again">&#8635; Suggest another</button></div>`,
      footer: `${total} perk${total === 1 ? "" : "s"} fit this character${off}`,
    });
    $("pk-again").onclick = () => $("pk-gen").click();
    $("pk-add").onclick = async () => {
      const c = pkChar();
      if (!c) return;
      c.perkCards = c.perkCards || [];
      const have = c.perkCards.find(x => x.name === pick.perk.name);
      if (have) have.rank = pick.rank; else c.perkCards.push(perkCardFrom(pick.perk, pick.rank));
      await addToRoster(c);
      toast(`${pick.perk.name} rank ${pick.rank} added to ${c.name}`);
      $("pk-add").disabled = true; $("pk-add").textContent = "Added ✓";
      const keep = pkSkip; fillCharSelect(); pkSkip = keep;
    };
  } catch (e) {
    $("pk-out").innerHTML = `<div class="card">${esc(e.message)}</div>`;
  } finally {
    $("pk-gen").disabled = false;
  }
};

// ------------------------------------------------------------------ 5. create / edit character
let ROSTER = [], editingId = null, crPhoto = null, crCards = [];
G.SPECIAL.forEach(a => $("cr-special").insertAdjacentHTML("beforeend",
  `<div><label for="cr-s-${a}" title="${SPECIAL_FULL[a]}">${a}</label><input type="number" id="cr-s-${a}" min="1" max="12" value="5" inputmode="numeric"></div>`));
G.SKILLS.forEach(([s, a]) => $("cr-skills").insertAdjacentHTML("beforeend",
  `<div class="skill"><input type="checkbox" id="cr-t-${safeName(s)}" title="Tag skill"><span>${esc(s)} <i>[${a}]</i></span>
   <input type="number" id="cr-k-${safeName(s)}" min="0" max="6" value="0" inputmode="numeric"></div>`));

// photo if there is one, otherwise the default picture for the character's kind
function setAvatar(el, c) {
  el.innerHTML = `<img src="${portraitFor(c)}" alt="">`;
}
const crRace = () => $("cr-race").value || raceFromOrigin($("cr-origin").value);
const crAvatar = () => setAvatar($("cr-avatar"), { photo: crPhoto, race: crRace() });
const autoMaxHp = s => s.END + s.LCK;
const autoCarry = s => 150 + 10 * s.STR;
function crAutoHints() {
  const s = crSpecial();
  $("cr-maxhp").placeholder = `Auto: ${autoMaxHp(s)}`;
  $("cr-carry").placeholder = `Auto: ${autoCarry(s)}`;
}
function resetForm() {
  editingId = null; crPhoto = null; crCards = [];
  $("cr-title").textContent = "Create Character";
  $("cr-hint").innerHTML = "Fill in your character and save it. It will appear under <b>Saved Characters</b>.";
  $("cr-levelup").hidden = true;
  $("cr-name").value = ""; $("cr-origin").value = ""; $("cr-level").value = 1; $("cr-notes").value = "";
  $("cr-race").value = ""; $("cr-maxhp").value = ""; $("cr-carry").value = "";
  G.SPECIAL.forEach(a => ($("cr-s-" + a).value = 5));
  G.SKILL_NAMES.forEach(s => { $("cr-k-" + safeName(s)).value = 0; $("cr-t-" + safeName(s)).checked = false; });
  crAvatar(); crAutoHints();
  $("cr-save").textContent = "SAVE CHARACTER";
  $("cr-clear").textContent = "Clear form";
  renderCrCards();
}
function fillForm(c, levelUp = false) {
  editingId = c.id; crPhoto = c.photo || null;
  crCards = JSON.parse(JSON.stringify(c.perkCards || []));
  $("cr-title").textContent = (levelUp ? "Level up " : "Edit ") + c.name;
  $("cr-hint").innerHTML = "Change anything you need, then press <b>Save changes</b>. Nothing is changed until you save.";
  $("cr-name").value = c.name; $("cr-origin").value = c.origin || ""; $("cr-notes").value = c.notes || "";
  $("cr-race").value = c.race || "";
  $("cr-maxhp").value = c.maxHp || ""; $("cr-carry").value = c.carryWeight || "";
  $("cr-level").value = Math.min(50, (c.level || 1) + (levelUp ? 1 : 0));
  G.SPECIAL.forEach(a => ($("cr-s-" + a).value = c.special[a]));
  G.SKILL_NAMES.forEach(s => {
    $("cr-k-" + safeName(s)).value = c.skills[s] || 0;
    $("cr-t-" + safeName(s)).checked = (c.tags || []).includes(s);
  });
  crAvatar(); crAutoHints();
  const lu = $("cr-levelup");
  lu.hidden = !levelUp;
  if (levelUp) lu.innerHTML = `&#11014; <b>${esc(c.name)}: level ${c.level || 1} &rarr; ${$("cr-level").value}</b><br>
    Raise whatever went up this level (S.P.E.C.I.A.L., skill ranks, perk cards, notes), then press <b>Save changes</b>.
    In Fallout 76 terms that's +1 to one S.P.E.C.I.A.L. and one new perk card. Use <b>Random FO76 Perk</b> afterwards for a suggestion.`;
  $("cr-save").textContent = "SAVE CHANGES";
  $("cr-clear").textContent = "Cancel editing";
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
    box.innerHTML = `<div class="muted" style="font-size:13px">No perk cards yet. Add them here, or from the Random FO76 Perk page.</div>`;
  } else {
    box.innerHTML = crCards.map((c, i) => `<div class="pcard"><img src="${esc(c.thumb || c.image)}" alt="" referrerpolicy="no-referrer">
      <div class="t"><b>${esc(c.name)}</b><small>${esc(c.special)} &middot; unlocks at level ${c.level}</small></div>
      <select data-i="${i}" title="Rank">${c.ranks.map((r, k) => `<option value="${k + 1}" ${k + 1 === c.rank ? "selected" : ""}>Rank ${k + 1} (cost ${r.cost})</option>`).join("")}</select>
      <button class="btn danger" data-rm="${i}" title="Remove">&#10005;</button></div>`).join("");
  }
  box.insertAdjacentHTML("beforeend", `<div class="muted" style="font-size:12px;margin-top:6px">Points spent / S.P.E.C.I.A.L. value (red = over the limit):</div>` + pointsGrid(crSpecial(), crCards));
  box.querySelectorAll("select[data-i]").forEach(sel => (sel.onchange = () => { crCards[+sel.dataset.i].rank = +sel.value; renderCrCards(); }));
  box.querySelectorAll("[data-rm]").forEach(b => (b.onclick = () => { crCards.splice(+b.dataset.rm, 1); renderCrCards(); }));
}
G.SPECIAL.forEach(a => $("cr-s-" + a).addEventListener("input", renderCrCards));

async function fillPerkList() {
  try {
    const { perks } = await loadPerks();
    $("cr-perklist").innerHTML = perks.map(p => `<option value="${esc(p.name)}">${esc(p.special)}${p.group === "Ghoul" ? " (Ghoul)" : ""}</option>`).join("");
    $("cr-cardnote").textContent = "";
  } catch (e) {
    $("cr-cardnote").textContent = "The perk list downloads from fallout.wiki: connect to the internet once to add cards here.";
  }
}
$("cr-cardadd").onclick = async () => {
  const name = $("cr-cardname").value.trim().toLowerCase();
  if (!name) return;
  let perks = [];
  try { perks = (await loadPerks()).perks; } catch (e) { toast("Perk list not available offline yet"); return; }
  const p = perks.find(x => x.name.toLowerCase() === name);
  if (!p) { toast("Pick a perk name from the list"); return; }
  if (crCards.some(c => c.name === p.name)) { toast(`${p.name} is already on this character`); return; }
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
      im.onerror = () => rej(new Error("That file isn't an image this device can read."));
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
  catch (err) { toast(err.message || "Couldn't load that photo"); }
  e.target.value = "";
};
$("cr-nophoto").onclick = () => { crPhoto = null; crAvatar(); };
$("cr-race").onchange = crAvatar;
$("cr-origin").addEventListener("input", () => { if (!crPhoto && !$("cr-race").value) crAvatar(); });
G.SPECIAL.forEach(a => $("cr-s-" + a).addEventListener("input", crAutoHints));
crAvatar(); crAutoHints();
$("cr-clear").onclick = () => {
  const id = editingId;
  resetForm();
  if (id) { openProfileId = id; showPage("roster"); }
};

$("cr-save").onclick = async () => {
  const name = $("cr-name").value.trim();
  if (!name) { toast("Give your character a name first"); $("cr-name").focus(); return; }
  const before = editingId ? ROSTER.find(x => x.id === editingId) : null;
  const c = {
    ...(before || {}), // keep anything this form doesn't show
    id: editingId || "c" + Date.now() + Math.floor(Math.random() * 1000),
    name, origin: $("cr-origin").value.trim(), level: clamp($("cr-level").value, 1, 50, 1),
    special: {}, skills: {}, tags: [], photo: crPhoto, notes: $("cr-notes").value.trim(),
    perkCards: crCards, race: $("cr-race").value || null,
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
  toast(wasEditing ? `${name} updated` : `${name} saved`);
  resetForm();
  openProfileId = c.id;
  showPage("roster");
};

// ------------------------------------------------------------------ 6. saved characters
let openProfileId = null;
async function loadRoster() { ROSTER = await Platform.loadJSON("roster", []); }
async function storeRoster() {
  const ok = await Platform.saveJSON("roster", ROSTER);
  if (!ok) toast("Warning: could not save the character list");
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

function derived(c) {
  const s = c.special;
  return [
    [c.maxHp ? "Max HP" : "Max HP (auto, level 1)", c.maxHp || autoMaxHp(s)], ["Initiative", s.PER + s.AGI],
    ["Defense", s.AGI >= 9 ? 2 : 1], [c.carryWeight ? "Carry weight" : "Carry weight (auto)", (c.carryWeight || autoCarry(s)) + " lbs"],
    ["Melee bonus", s.STR >= 11 ? "+3 CD" : s.STR >= 9 ? "+2 CD" : s.STR >= 7 ? "+1 CD" : "none"], ["Luck points", s.LCK],
  ];
}

function renderRoster() {
  const list = $("ro-list"), prof = $("ro-profile");
  const c = openProfileId && ROSTER.find(x => x.id === openProfileId);
  if (c) {
    list.innerHTML = "";
    const skills = G.SKILLS.filter(([s]) => c.skills[s] || (c.tags || []).includes(s));
    prof.innerHTML = `<button class="btn" id="ro-back">&larr; All characters</button>
      <div class="card"><div class="profile-head"><div class="avatar" id="ro-av"></div>
        <div style="min-width:0"><h3>${esc(c.name)}</h3><div class="muted">${esc(c.origin || "Unknown origin")} &middot; Level ${c.level || 1}</div></div></div>
        <h4>S.P.E.C.I.A.L.</h4><div class="statgrid">${G.SPECIAL.map(a => `<div class="stat"><b>${c.special[a]}</b><small>${SPECIAL_FULL[a]}</small></div>`).join("")}</div>
        <h4>Derived (from S.P.E.C.I.A.L., before gear and perks)</h4>
        <div class="derived">${derived(c).map(([k, v]) => `<div class="stat"><b style="font-size:17px">${v}</b><small>${k}</small></div>`).join("")}</div>
        <h4>Skills</h4>${skills.length ? `<table class="lt">${skills.map(([s, a]) => `<tr><td>${(c.tags || []).includes(s) ? "&#9733; " : ""}${esc(s)} <span class="muted">[${a}]</span></td>
          <td style="text-align:right"><b>${c.skills[s] || 0}</b></td><td style="text-align:right" class="muted">TN ${c.special[a] + (c.skills[s] || 0)}</td></tr>`).join("")}</table>
          <div class="muted" style="font-size:12px;margin-top:4px">&#9733; = Tag skill. TN = attribute + skill rank.</div>`
          : `<div class="muted">No skill ranks yet.</div>`}
        <h4>Fallout 76 perk cards</h4>
        ${(c.perkCards || []).length ? (c.perkCards || []).map(pc => `<div class="pcard"><img src="${esc(pc.thumb || pc.image)}" alt="" referrerpolicy="no-referrer">
          <div class="t"><b>${esc(pc.name)}</b> <span class="muted">rank ${pc.rank} &middot; ${esc(pc.special)} &middot; cost ${cardCost(pc)}</span>
          <small style="white-space:normal">${esc((pc.ranks[pc.rank - 1] || {}).desc || "")}</small></div></div>`).join("")
          + `<div class="muted" style="font-size:12px;margin-top:6px">Points spent / S.P.E.C.I.A.L. value:</div>` + pointsGrid(c.special, c.perkCards)
          : `<div class="muted">None yet. Tap <b>Suggest a perk</b> to get one picked for this character.</div>`}
        ${c.notes ? `<h4>Notes</h4><div style="white-space:pre-wrap;font-size:14px;line-height:1.45">${esc(c.notes)}</div>` : ""}
        <div class="bar" style="margin-top:16px"><button class="btn primary" id="ro-lvl">&#11014; Level up</button>
          <button class="btn" id="ro-sug">&#9733; Suggest a perk</button></div>
        <div class="bar"><button class="btn" id="ro-edit">&#9998; Edit</button><button class="btn danger" id="ro-del">&#128465; Delete</button></div>
      </div>`;
    setAvatar($("ro-av"), c);
    $("ro-back").onclick = closeProfile;
    $("ro-edit").onclick = () => { fillForm(c); showPage("create"); };
    $("ro-lvl").onclick = () => {
      if ((c.level || 1) >= 50) { toast("Already at the maximum level (50)"); return; }
      fillForm(c, true); showPage("create");
    };
    $("ro-sug").onclick = () => { showPage("perks"); $("pk-char").value = c.id; updateCharInfo(); $("pk-out").innerHTML = ""; $("pk-gen").click(); };
    $("ro-del").onclick = () => deleteChar(c);
    return;
  }
  prof.innerHTML = "";
  if (!ROSTER.length) {
    list.innerHTML = `<div class="empty">No saved characters yet.<br><br>Create one in <b>Create Character</b>, or tap <b>Add to saved</b> after generating a random one.</div>`;
    return;
  }
  const sorted = ROSTER.slice().sort((a, b) => a.name.localeCompare(b.name));
  list.innerHTML = `<p class="hint">${sorted.length} character${sorted.length > 1 ? "s" : ""}. Tap one to see the profile.</p><div class="list">` +
    sorted.map(c => `<div class="entry" data-id="${esc(c.id)}"><div class="avatar" data-av="${esc(c.id)}"></div><div style="flex:1;min-width:0">
      <b>${esc(c.name)}</b><small>${esc(c.origin || "Unknown origin")} &middot; Lvl ${c.level || 1}${(c.perkCards || []).length ? ` &middot; ${c.perkCards.length} perk card${c.perkCards.length > 1 ? "s" : ""}` : ""}</small><br>
      <small>${G.SPECIAL.map(a => `${a} ${c.special[a]}`).join(" &middot; ")}</small></div>
      <button class="btn danger" data-del="${esc(c.id)}" title="Delete" style="flex:none;padding:8px 11px">&#128465;</button></div>`).join("") + "</div>";
  list.querySelectorAll("[data-av]").forEach(el => setAvatar(el, ROSTER.find(x => x.id === el.dataset.av)));
  list.querySelectorAll(".entry").forEach(el => (el.onclick = e => {
    if (e.target.closest("[data-del]")) return;
    openProfileId = el.dataset.id; renderRoster(); $("main").scrollTop = 0;
  }));
  list.querySelectorAll("[data-del]").forEach(b => (b.onclick = () => deleteChar(ROSTER.find(x => x.id === b.dataset.del))));
}

async function deleteChar(c) {
  if (!c || !(await confirmBox(`Delete ${c.name}? This can't be undone.`))) return;
  ROSTER = ROSTER.filter(x => x.id !== c.id);
  await storeRoster();
  if (editingId === c.id) resetForm();
  openProfileId = null; renderRoster();
  toast(`${c.name} deleted`);
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
  $("tiles-reset").onclick = () => { apply(DEFAULT); Platform.saveJSON("home_order", null); toast("Tiles back in their original order"); };

  async function restore() {
    const saved = await Platform.loadJSON("home_order", null);
    if (Array.isArray(saved)) apply(saved);
  }
  return { restore, order };
})();

// ------------------------------------------------------------------ start
(async () => {
  const start = location.hash.slice(1);
  showPage($("page-" + start) ? start : "home");
  await Promise.all([loadRoster(), loadLootOverrides(), Tiles.restore()]);
  buildLootEditor();
  setTimeout(() => Updater.check(false), 1500); // ask about new versions on startup
})();
