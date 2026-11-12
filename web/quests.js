// Quests: game master guides for whole quests. A list of quest cards; tapping one opens the quest with its
// background, scenes, read-aloud descriptions, tests, encounters, stat blocks, rewards and endings, and a button
// that opens its maps on the Maps page.
//
// The quests themselves live in quest_*.js files, which push onto QUEST_BOOK with the helpers below. Every
// text is a pair [English, Spanish]; tx() picks the one for the current language.
//
// Blocks: ["h", t] subheading, ["p", t] paragraph, ["say", t] description to read or paraphrase to the players,
// ["gm", t] tip for the game master, ["test", t] a skill test, ["ul", [t, t...]] list, ["stat", id] stat block,
// ["clues", [[clue, where, test, points to]...]] clue table.
// ["enc", {t, g}] an encounter: its enemies [[stat id, how many]...] and a button that adds them to the Combat
// Assistant. How many: a number, "pcs" (one per player character), "half" (half the PCs, rounded up), "twice",
// "pcs-1" (one less than the PCs, at least 1) or "2|4:3" (2, or 3 with 4 or more PCs).
const QUEST_BOOK = [];
const QSTATS = {};
// combat data for the stat blocks, used by the Combat Assistant:
// { lvl, type, kind, hp?, wealth?, junk?, n? (name if not in QSTATS), a: [[name en, name es, TN, crit, CD, p|e|r|po, [effects], fire rate or null, range]] }
const QCOMBAT = {};
// the quest enemies as Combat Assistant templates (the same shape as ENEMY_TEMPLATES)
function questTemplates() {
  const es = typeof LANG !== "undefined" && LANG === "es";
  const pick = v => (Array.isArray(v) ? v[es ? 1 : 0] : v);
  const drv = v => (/^Imm/i.test(String(v)) ? "Imm" : parseInt(v, 10) || 0);
  return Object.entries(QCOMBAT).map(([id, c]) => {
    const s = QSTATS[id] || {};
    const dr = c.dr || s.dr || ["0", "0", "0", "0"];
    return { id: "q_" + id, name: pick(c.n || s.n), group: "Quest enemies", level: c.lvl, type: c.type, kind: c.kind,
      hp: c.hp || parseInt(s.hp, 10), def: s.def || 1, init: s.init || 10, wealth: c.wealth || 0, junk: c.junk || 0,
      dr: { p: drv(dr[0]), e: drv(dr[1]), r: drv(dr[2]), po: drv(dr[3]) },
      attacks: c.a.map(([en, es_, tn, crit, cd, type, eff, rate, range]) =>
        atk(es ? es_ : en, tn, crit, cd, type, eff || [], rate == null ? {} : { ranged: true, rate, range: range || "C" })) };
  });
}
const QB = {
  h: (en, es) => ["h", [en, es]],
  p: (en, es) => ["p", [en, es]],
  say: (en, es) => ["say", [en, es]],
  gm: (en, es) => ["gm", [en, es]],
  test: (en, es) => ["test", [en, es]],
  ul: (...items) => ["ul", items],
  stat: id => ["stat", id],
  clues: rows => ["clues", rows],
  enc: (en, es, g) => ["enc", { t: [en, es], g }],
};

const Quests = (() => {
  const tx = v => (Array.isArray(v) ? (typeof LANG !== "undefined" && LANG === "es" ? v[1] : v[0]) : String(v == null ? "" : v));
  const es = () => typeof LANG !== "undefined" && LANG === "es";
  // light inline formatting inside the texts: **bold**
  const fmt = s => esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
  let open = null, encs = [];
  // how many of an enemy an encounter has, for a number of player characters
  function howMany(rule, pcs) {
    if (typeof rule === "number") return rule;
    if (rule === "pcs") return pcs;
    if (rule === "half") return Math.ceil(pcs / 2);
    if (rule === "twice") return pcs * 2;
    if (rule === "pcs-1") return Math.max(1, pcs - 1);
    const m = /^(\d+)\|(\d+):(\d+)$/.exec(rule);
    return m ? (pcs >= +m[2] ? +m[3] : +m[1]) : 1;
  }
  const dependsOnPcs = g => g.some(([, r]) => typeof r !== "number");
  const defaultPcs = () => { const n = typeof Team !== "undefined" ? Team.chars().length : 0; return n >= 1 ? Math.min(8, n) : 4; };
  const root = () => $("qs-root");

  function list() {
    open = null;
    root().innerHTML = `<div class="qs-list">${QUEST_BOOK.map(q => `
      <button type="button" class="qs-card" data-q="${q.id}">
        <span class="qs-card-top"><b>${esc(tx(q.title))}</b><span class="qs-src">${esc(tx(q.source))}</span></span>
        <span class="qs-blurb">${esc(tx(q.blurb))}</span>
        <span class="qs-tags">${q.tags.map(t => `<span>${esc(tx(t))}</span>`).join("")}</span>
      </button>`).join("")}</div>`;
    root().querySelectorAll("[data-q]").forEach(b => (b.onclick = () => show(b.dataset.q)));
  }

  // ---------------------------------------------------------------- stat blocks
  const DR_WORDS = { Immune: "Inmune", All: "Todo", Arms: "Brazos", Legs: "Piernas", Torso: "Torso", Head: "Cabeza" };
  const drText = v => (es() ? String(v).replace(/\b(Immune|All|Arms|Legs|Torso|Head)\b/g, w => DR_WORDS[w]) : String(v));
  function statBlock(id) {
    const s = QSTATS[id];
    if (!s) return "";
    const cell = (k, v) => `<div><small>${esc(k)}</small><b>${esc(v)}</b></div>`;
    const attrs = s.c
      ? `<div class="qs-grid qs-g5">${(es() ? ["CUERPO", "MENTE", "C. A C.", "ARMAS", "OTRAS"] : ["BODY", "MIND", "MELEE", "GUNS", "OTHER"]).map((k, i) => cell(k, s.c[i])).join("")}</div>`
      : `<div class="qs-grid qs-g7">${(es() ? ["FUE", "PER", "RES", "CAR", "INT", "AGI", "SUE"] : ["S", "P", "E", "C", "I", "A", "L"]).map((k, i) => cell(k, s.s[i])).join("")}</div>
         <div class="qs-skills">${s.skills.map(([k, n, tag]) => `<span>${esc(T(k))}${tag ? " &#9632;" : ""} <b>${n}</b></span>`).join("")}</div>`;
    const line = (title, items) => items && items.length ? `<h5>${esc(title)}</h5><ul>${items.map(t => `<li>${fmt(tx(t))}</li>`).join("")}</ul>` : "";
    return `<div class="qs-stat">
      <div class="qs-stat-h"><b>${esc(tx(s.n))}</b><small>${esc(tx(s.sub))}</small></div>
      ${attrs}
      <div class="qs-grid qs-g3">${cell(es() ? "PV" : "HP", s.hp)}${cell(es() ? "Iniciativa" : "Initiative", s.init)}${cell(es() ? "Defensa" : "Defense", s.def)}</div>
      <div class="qs-grid qs-g4">${(es() ? ["RD física", "RD energía", "RD radiación", "RD veneno"] : ["Phys. DR", "Energy DR", "Rad. DR", "Poison DR"]).map((k, i) => cell(k, drText(s.dr[i]))).join("")}</div>
      ${line(es() ? "Ataques" : "Attacks", s.atk)}${line(es() ? "Habilidades especiales" : "Special abilities", s.abil)}
      ${s.inv ? `<h5>${es() ? "Inventario" : "Inventory"}</h5><p>${fmt(tx(s.inv))}</p>` : ""}
      ${s.page ? `<p class="qs-page">${esc(T(L2("Core rulebook, page {n}", "Libro básico, página {n}"), { n: s.page }))}</p>` : ""}
    </div>`;
  }
  function L2(en, es_) { if (typeof ES !== "undefined" && !(en in ES)) ES[en] = es_; return en; }

  // ---------------------------------------------------------------- one quest
  function block(b) {
    const [k, v] = b;
    if (k === "h") return `<h4 class="qs-h">${esc(tx(v))}</h4>`;
    if (k === "p") return `<p>${fmt(tx(v))}</p>`;
    if (k === "say") return `<div class="qs-say"><small>${esc(T(L2("Read or paraphrase", "Lee o parafrasea")))}</small>${tx(v).split("\n\n").map(x => `<p>${fmt(x)}</p>`).join("")}</div>`;
    if (k === "gm") return `<div class="qs-gm"><small>${esc(T(L2("Game master", "Director de juego")))}</small><p>${fmt(tx(v))}</p></div>`;
    if (k === "test") return `<div class="qs-test">&#127922;&#xFE0E; ${fmt(tx(v))}</div>`;
    if (k === "ul") return `<ul class="qs-ul">${v.map(t => `<li>${fmt(tx(t))}</li>`).join("")}</ul>`;
    if (k === "stat") return statBlock(v);
    if (k === "enc") {
      const i = encs.push(v) - 1, pcsInput = dependsOnPcs(v.g);
      return `<div class="qs-enc" data-enc="${i}"><div class="qs-enc-h">&#9876;&#xFE0E; <b>${esc(tx(v.t))}</b></div>
        ${pcsInput ? `<label class="qs-enc-pcs">${esc(T(L2("Player characters", "Personajes jugadores")))}
          <input type="number" min="1" max="8" value="${defaultPcs()}" inputmode="numeric"></label>` : ""}
        <ul class="qs-enc-list"></ul>
        <button type="button" class="btn primary qs-enc-go">&#9876;&#xFE0E; ${esc(T(L2("Add to the Combat Assistant", "Añadir al Asistente de combate")))}</button></div>`;
    }
    if (k === "clues") return `<div class="qs-clues">${v.map(r => `<div class="qs-clue"><b>${fmt(tx(r[0]))}</b>
      <span>&#128205;&#xFE0E; ${fmt(tx(r[1]))}</span><span>&#127922;&#xFE0E; ${fmt(tx(r[2]))}</span><span>&#10140;&#xFE0E; ${fmt(tx(r[3]))}</span></div>`).join("")}</div>`;
    return "";
  }
  function show(id, sectionIndex) {
    const q = QUEST_BOOK.find(x => x.id === id);
    if (!q) return list();
    open = id;
    encs = [];
    root().innerHTML = `
      <div class="qs-head">
        <button type="button" class="btn" id="qs-back">&#9664;&#xFE0E; ${esc(T(L2("Quests", "Misiones")))}</button>
        ${q.map ? `<button type="button" class="btn qs-maps" id="qs-maps">&#128506;&#xFE0E; ${esc(T(L2("Open the maps", "Abrir los mapas")))}</button>` : ""}
      </div>
      <h3 class="qs-title">${esc(tx(q.title))}</h3>
      <p class="qs-sub">${esc(tx(q.source))}</p>
      <div class="qs-tags">${q.tags.map(t => `<span>${esc(tx(t))}</span>`).join("")}</div>
      <nav class="qs-toc">${q.sections.map((s, i) => `<button type="button" class="chip" data-sec="${i}">${esc(tx(s.t))}</button>`).join("")}</nav>
      ${q.sections.map((s, i) => `<details class="qs-sec" id="qs-sec-${i}"${i === 0 ? " open" : ""}><summary>${esc(tx(s.t))}</summary>
        <div class="qs-body">${s.b.map(block).join("")}</div></details>`).join("")}
      <button type="button" class="btn qs-top" id="qs-top">&#9650;&#xFE0E; ${esc(T(L2("Back to the top", "Volver arriba")))}</button>`;
    wireEncounters();
    $("qs-back").onclick = list;
    if (q.map) $("qs-maps").onclick = () => { showPage("maps"); if (typeof Maps !== "undefined") Maps.openQuest(q.map); };
    $("qs-top").onclick = () => root().scrollIntoView({ block: "start", behavior: "smooth" });
    root().querySelectorAll("[data-sec]").forEach(b => (b.onclick = () => {
      const d = $("qs-sec-" + b.dataset.sec);
      d.open = true;
      d.scrollIntoView({ block: "start", behavior: "smooth" });
    }));
    if (sectionIndex == null) root().scrollIntoView({ block: "start" });
  }

  function encGroups(el) {
    const v = encs[+el.dataset.enc], inp = el.querySelector("input");
    const pcs = inp ? Math.min(8, Math.max(1, parseInt(inp.value, 10) || 1)) : 4;
    return v.g.map(([id, rule]) => ({ id: "q_" + id, stat: id, count: Math.min(12, Math.max(1, howMany(rule, pcs))) }));
  }
  function wireEncounters() {
    root().querySelectorAll(".qs-enc").forEach(el => {
      const draw = () => {
        el.querySelector(".qs-enc-list").innerHTML = encGroups(el).map(g => {
          const s = QSTATS[g.stat], c = QCOMBAT[g.stat];
          return `<li><b>${g.count} &times;</b> ${esc(tx((c && c.n) || (s && s.n)))}</li>`;
        }).join("");
      };
      const inp = el.querySelector("input");
      if (inp) inp.oninput = draw;
      draw();
      el.querySelector(".qs-enc-go").onclick = async e => {
        if (typeof Combat === "undefined") return;
        const btn = e.currentTarget;
        btn.disabled = true; // the Combat Assistant may still be loading its saved fight
        const r = await Combat.prepare(encGroups(el).map(g => ({ id: g.id, count: g.count }))).finally(() => (btn.disabled = false));
        if (r === "busy") { toast(T("A combat is already running: finish or abandon it first")); showPage("combat"); return; }
        showPage("combat");
        toast(T("Enemies added. Check your stats and weapon, then Start combat"));
      };
    });
  }

  return {
    show: () => (open ? show(open, -1) : list()),
    back: () => { if (!open) return false; list(); return true; },
  };
})();
