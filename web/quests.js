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
const QUEST_BOOK = [];
const QSTATS = {};
const QB = {
  h: (en, es) => ["h", [en, es]],
  p: (en, es) => ["p", [en, es]],
  say: (en, es) => ["say", [en, es]],
  gm: (en, es) => ["gm", [en, es]],
  test: (en, es) => ["test", [en, es]],
  ul: (...items) => ["ul", items],
  stat: id => ["stat", id],
  clues: rows => ["clues", rows],
};

const Quests = (() => {
  const tx = v => (Array.isArray(v) ? (typeof LANG !== "undefined" && LANG === "es" ? v[1] : v[0]) : String(v == null ? "" : v));
  const es = () => typeof LANG !== "undefined" && LANG === "es";
  // light inline formatting inside the texts: **bold**
  const fmt = s => esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
  let open = null;
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
    if (k === "clues") return `<div class="qs-clues">${v.map(r => `<div class="qs-clue"><b>${fmt(tx(r[0]))}</b>
      <span>&#128205;&#xFE0E; ${fmt(tx(r[1]))}</span><span>&#127922;&#xFE0E; ${fmt(tx(r[2]))}</span><span>&#10140;&#xFE0E; ${fmt(tx(r[3]))}</span></div>`).join("")}</div>`;
    return "";
  }
  function show(id, sectionIndex) {
    const q = QUEST_BOOK.find(x => x.id === id);
    if (!q) return list();
    open = id;
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

  return {
    show: () => (open ? show(open, -1) : list()),
    back: () => { if (!open) return false; list(); return true; },
  };
})();
