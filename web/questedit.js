// Quest editor: "+ New quest" on the Quests page. The user writes their own quest with the same pieces as the
// quest guides: sections (summary, game master only, acts, conclusion, any other), and inside them headings,
// paragraphs, texts to read aloud (green on black), game master notes (yellow), skill tests, lists, rewards,
// clue tables and encounters. Encounters use any enemy the Combat Assistant knows, plus enemies made just for
// the quest. The quest page starts with tags for time, sessions, level and players, and can open a map from
// the Maps page.
//
// Saved on the device (Platform storage key "custom_quests"), as typed (one language):
//   [{ id, title, blurb, time, sessions, level, players, tags, map ("b:<built-in quest map>" | "m:<my map id>" | ""),
//      enemies: [{ id, name, level, type, kind, hp, def, init, dr: {p,e,r,po}, attacks: [{name, tn, crit, cd, type, eff, rate}], notes }],
//      sections: [{ id, kind: summary|gm|act|conclusion|other, t, b: [block...] }] }]
// blocks: {k:"h"|"p"|"say"|"gm", t} {k:"test", attr, skill, diff, t} {k:"ul"|"rewards", items:[...]}
//         {k:"clues", rows:[[clue, where, test, leads to]...]} {k:"enc", t, g:[[enemy id, how many]...]}
const QuestEdit = (() => {
  const L = (en, es) => { if (es && typeof ES !== "undefined" && !(en in ES)) ES[en] = es; return en; };
  let QS = [], loading = null, edit = null, enemyForm = null, saveTimer = null, savedAt = 0;
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const root = () => $("qs-root");

  function load() {
    return loading || (loading = Platform.loadJSON("custom_quests", []).then(v => { QS = Array.isArray(v) ? v : []; }));
  }
  const store = () => Platform.saveJSON("custom_quests", QS);
  // typing saves a moment later; adding, moving or deleting pieces saves straight away
  function dirty(now) {
    clearTimeout(saveTimer);
    const go = async () => { saveTimer = null; const ok = await store(); savedAt = Date.now(); const s = $("qe-saved"); if (s) s.textContent = ok ? T(L("Saved", "Guardado")) : T(L("Couldn't save", "No se pudo guardar")); };
    if (now) go(); else { const s = $("qe-saved"); if (s) s.textContent = T(L("Saving…", "Guardando…")); saveTimer = setTimeout(go, 600); }
  }

  // ---------------------------------------------------------------- labels
  const KINDS = {
    summary: [L("Summary", "Resumen"), L("Overview", "Resumen")],
    gm: [L("GM only", "Solo DJ"), L("The truth (GM only)", "La verdad (solo el DJ)")],
    act: [L("Act", "Acto"), L("Act {n}", "Acto {n}")],
    conclusion: [L("Conclusion", "Conclusión"), L("Conclusion", "Conclusión")],
    other: [L("Section", "Sección"), L("New section", "Nueva sección")],
  };
  const BLOCKS = {
    h: ["&#9472;", L("Heading", "Subtítulo")],
    p: ["&#182;", L("Paragraph", "Párrafo")],
    say: ["&#128172;", L("Read aloud", "Para leer en voz alta")],
    gm: ["&#9888;&#xFE0E;", L("GM note", "Nota para el DJ")],
    test: ["&#127922;&#xFE0E;", L("Skill test", "Prueba de habilidad")],
    ul: ["&#8226;", L("List", "Lista")],
    enc: ["&#9876;&#xFE0E;", L("Encounter", "Encuentro")],
    rewards: ["&#127873;&#xFE0E;", L("Rewards", "Recompensas")],
    clues: ["&#128269;&#xFE0E;", L("Clue table", "Tabla de pistas")],
  };
  const ATTRS = ["STR", "PER", "END", "CHA", "INT", "AGI", "LCK"];
  const SKILLS = () => (typeof G !== "undefined" && G.SKILLS ? G.SKILLS.map(s => s[0]) : []);
  const RULES = [["pcs", L("One per player character", "Uno por personaje jugador")], ["half", L("Half the player characters", "La mitad de los personajes jugadores")],
    ["twice", L("Twice the player characters", "El doble de personajes jugadores")], ["pcs-1", L("One less than the player characters", "Uno menos que los personajes jugadores")]];
  const DMG = { p: "Physical", e: "Energy", r: "Radiation", po: "Poison" };

  function newBlock(k) {
    if (k === "test") return { k, attr: "", skill: "", diff: 1, t: "" };
    if (k === "ul" || k === "rewards") return { k, items: [] };
    if (k === "clues") return { k, rows: [["", "", "", ""]] };
    if (k === "enc") return { k, t: "", g: [] };
    return { k, t: "" };
  }
  function newSection(q, kind) {
    const n = q ? q.sections.filter(s => s.kind === "act").length + 1 : 1;
    const t = T(KINDS[kind][1], { n });
    const b = { summary: ["p"], gm: ["gm"], act: ["say", "p", "test"], conclusion: ["p", "rewards", "clues"], other: ["p"] }[kind].map(newBlock);
    return { id: uid(), kind, t, b };
  }
  function newQuest() {
    const q = { id: uid(), title: "", blurb: "", time: "", sessions: 1, level: "", players: "", tags: "", map: "", enemies: [], sections: [] };
    ["summary", "gm", "act", "conclusion"].forEach(k => q.sections.push(newSection(q, k)));
    return q;
  }

  // ---------------------------------------------------------------- enemies
  // the quest's own enemies as Combat Assistant templates (shared by every quest, so the Combat Assistant knows them)
  function enemyTemplate(q, e) {
    return { id: "uq_" + q.id + "_" + e.id, name: e.name, group: "Quest enemies", level: e.level || 1, type: e.type || "Normal", kind: e.kind || "creature",
      hp: e.hp || 1, def: e.def || 1, init: e.init || 8, wealth: e.wealth || 0, junk: e.junk || 0, notes: e.notes || "",
      dr: Object.assign({ p: 0, e: 0, r: 0, po: 0 }, e.dr),
      attacks: (e.attacks || []).map(a => atk(a.name, a.tn, a.crit || 1, a.cd, a.type || "p", a.eff || [],
        a.rate == null || a.rate === "" ? {} : { ranged: true, rate: +a.rate || 0, range: "M" })) };
  }
  const templates = () => [].concat(...QS.map(q => (q.enemies || []).map(e => enemyTemplate(q, e))));
  // every enemy an encounter can use: this quest's, the Combat Assistant's lists, the user's own and the guides'
  let yours = [];
  async function loadYours() { yours = (await Platform.loadJSON("custom_enemies", [])) || []; }
  function pickable(q) {
    const groups = [[L("This quest's enemies", "Enemigos de esta misión"), (q.enemies || []).map(e => enemyTemplate(q, e))]];
    const by = {};
    ENEMY_TEMPLATES.forEach(t => (by[t.group] = by[t.group] || []).push(t));
    Object.entries(by).forEach(([g, list]) => groups.push([g, list]));
    if (yours.length) groups.push(["Your enemies", yours]);
    const guide = typeof questTemplates === "function" ? questTemplates().filter(t => !/^q_uq_|^uq_/.test(t.id)) : [];
    if (guide.length) groups.push([L("Enemies from the quest guides", "Enemigos de las guías de misiones"), guide]);
    return groups;
  }
  function findTemplate(id) {
    for (const q of QS) for (const e of q.enemies || []) if ("uq_" + q.id + "_" + e.id === id) return enemyTemplate(q, e);
    return ENEMY_TEMPLATES.find(t => t.id === id) || yours.find(t => t.id === id)
      || (typeof questTemplates === "function" ? questTemplates().find(t => t.id === id) : null) || null;
  }
  // the stats of a quest's own enemy, under its encounter
  function statHtml(id) {
    const t = findTemplate(id);
    if (!t || !/^uq_/.test(id)) return "";
    const cell = (k, v) => `<div><small>${esc(k)}</small><b>${esc(v)}</b></div>`;
    const dr = v => (v === "Imm" ? T(L("Immune", "Inmune")) : v);
    return `<details class="qs-ustat"><summary>${esc(t.name)} &middot; ${esc(T(L("stats", "estadísticas")))}</summary><div class="qs-stat">
      <div class="qs-stat-h"><b>${esc(t.name)}</b><small>${esc(T("Level"))} ${t.level} &middot; ${esc(T(t.type))} &middot; ${esc(T(t.kind === "character" ? "Character" : "Creature"))} (${xpFor(t.level, t.type)} ${esc(T(L("XP", "PX")))})</small></div>
      <div class="qs-grid qs-g3">${cell(T("HP"), t.hp)}${cell(T("Initiative"), t.init)}${cell(T("Defense"), t.def)}</div>
      <div class="qs-grid qs-g4">${["p", "e", "r", "po"].map(k => cell(T(DMG[k] + " DR"), dr(t.dr[k]))).join("")}</div>
      <h5>${esc(T(L("Attacks", "Ataques")))}</h5><ul>${t.attacks.map(a => `<li><b>${esc(a.name)}:</b> ${esc(T("TN"))} ${a.tn}, ${a.cd} ${esc(T(L("CD", "DC")))} ${esc(T(DMG[a.type] || "Physical"))}${a.eff.length ? ", " + esc(a.eff.join(", ")) : ""}${a.ranged ? `, ${esc(T(L("fire rate {n}", "cadencia {n}"), { n: a.rate }))}` : ""}</li>`).join("")}</ul>
      ${t.notes ? `<p>${esc(t.notes)}</p>` : ""}</div></details>`;
  }

  // ---------------------------------------------------------------- the quests as the Quests page shows them
  function book() {
    return QS.map(q => {
      const tags = [];
      const ses = parseInt(q.sessions, 10);
      if (ses || q.time) tags.push([ses ? TP(ses, L("{n} session", "{n} sesión"), L("{n} sessions", "{n} sesiones")) : "", q.time ? (ses ? `(${q.time})` : q.time) : ""].filter(Boolean).join(" "));
      if (q.level) tags.push(T(L("Level {n}", "Nivel {n}"), { n: q.level }));
      if (q.players) tags.push(T(L("{n} players", "{n} jugadores"), { n: q.players }));
      String(q.tags || "").split(",").map(s => s.trim()).filter(Boolean).forEach(s => tags.push(s));
      const blocks = s => [].concat(...s.b.map(b => {
        const has = x => String(x || "").trim();
        if (["h", "say", "gm"].includes(b.k)) return has(b.t) ? [[b.k, b.t.trim()]] : [];
        if (b.k === "p") return has(b.t) ? b.t.trim().split(/\n\s*\n/).map(x => ["p", x.trim()]) : [];
        if (b.k === "test") {
          const what = b.attr && b.skill ? `**${T(b.attr)} + ${T(b.skill)}, ${T(L("difficulty {n}", "dificultad {n}"), { n: b.diff })}**`
            : b.attr ? `**${T(b.attr)}, ${T(L("difficulty {n}", "dificultad {n}"), { n: b.diff })}**` : "";
          return what || has(b.t) ? [["test", [what, (b.t || "").trim()].filter(Boolean).join(what && has(b.t) ? ": " : "")]] : [];
        }
        if (b.k === "ul" || b.k === "rewards") { const it = (b.items || []).map(x => x.trim()).filter(Boolean); return it.length ? [[b.k, it]] : []; }
        if (b.k === "clues") { const r = (b.rows || []).filter(r => r.some(has)); return r.length ? [["clues", r]] : []; }
        if (b.k === "enc") { const g = (b.g || []).filter(x => findTemplate(x[0])); return g.length ? [["enc", { t: has(b.t) ? b.t : T(BLOCKS.enc[1]), g, full: true }]] : []; }
        return [];
      }));
      return { id: "u:" + q.id, mine: q.id, map: q.map || "", title: q.title.trim() || T(L("Untitled quest", "Misión sin título")),
        source: T(L("My quest", "Mi misión")), blurb: q.blurb || "", tags,
        sections: q.sections.map(s => ({ t: s.t || T(KINDS[s.kind][0]), gm: s.kind === "gm", b: blocks(s) })) };
    });
  }

  // ---------------------------------------------------------------- the editor
  const field = (label, html, cls = "") => `<div class="qe-f ${cls}"><label class="f">${esc(T(label))}</label>${html}</div>`;
  const inp = (path, v, ph = "", type = "text") => `<input type="${type}" data-p="${path}" value="${esc(v == null ? "" : v)}" placeholder="${esc(ph ? T(ph) : "")}"${type === "number" ? ' inputmode="numeric" min="0"' : ""}>`;
  const area = (path, v, ph = "", rows = 3) => `<textarea data-p="${path}" rows="${rows}" placeholder="${esc(ph ? T(ph) : "")}">${esc(v || "")}</textarea>`;
  const tools = (kind, i, n) => `<span class="qe-tools">
    <button type="button" class="btn" data-up="${kind}:${i}" ${i === 0 ? "disabled" : ""} aria-label="${esc(T(L("Move up", "Subir")))}">&#9650;&#xFE0E;</button>
    <button type="button" class="btn" data-down="${kind}:${i}" ${i === n - 1 ? "disabled" : ""} aria-label="${esc(T(L("Move down", "Bajar")))}">&#9660;&#xFE0E;</button>
    <button type="button" class="btn danger" data-del="${kind}:${i}" aria-label="${esc(T("Delete"))}">&#10005;&#xFE0E;</button></span>`;

  function blockHtml(q, si, b, bi, n) {
    const P = `s.${si}.b.${bi}`;
    let body = "";
    if (b.k === "h") body = inp(P + ".t", b.t, L("e.g. What the characters find", "p. ej. Lo que encuentran los personajes"));
    else if (b.k === "p") body = area(P + ".t", b.t, L("Write the text. **Two asterisks** make bold; an empty line starts a new paragraph.", "Escribe el texto. **Dos asteriscos** ponen negrita; una línea en blanco empieza otro párrafo."), 4);
    else if (b.k === "say") body = area(P + ".t", b.t, L("What you read or tell the players. An empty line starts a new paragraph.", "Lo que lees o cuentas a los jugadores. Una línea en blanco empieza otro párrafo."), 4);
    else if (b.k === "gm") body = area(P + ".t", b.t, L("A note only the game master sees: secrets, tips, what happens if…", "Una nota que solo ve el director de juego: secretos, consejos, qué pasa si…"), 3);
    else if (b.k === "test") body = `<div class="qe-row">
        ${field(L("Attribute", "Atributo"), `<select data-p="${P}.attr"><option value="">&mdash;</option>${ATTRS.map(a => `<option value="${a}"${b.attr === a ? " selected" : ""}>${esc(T(a))}</option>`).join("")}</select>`)}
        ${field(L("Skill", "Habilidad"), `<select data-p="${P}.skill"><option value="">&mdash;</option>${SKILLS().map(s => `<option value="${esc(s)}"${b.skill === s ? " selected" : ""}>${esc(T(s))}</option>`).join("")}</select>`)}
        ${field(L("Difficulty", "Dificultad"), `<select data-p="${P}.diff">${[0, 1, 2, 3, 4, 5].map(d => `<option${+b.diff === d ? " selected" : ""}>${d}</option>`).join("")}</select>`)}</div>
      ${area(P + ".t", b.t, L("What the test is for and what success or failure means", "Para qué es la prueba y qué significa tener éxito o fallar"), 2)}`;
    else if (b.k === "ul" || b.k === "rewards") body = `<textarea data-lines="${P}.items" rows="4" placeholder="${esc(T(b.k === "rewards"
      ? L("One reward per line: caps, items, XP, favours…", "Una recompensa por línea: chapas, objetos, PX, favores…") : L("One item per line", "Un elemento por línea")))}">${esc((b.items || []).join("\n"))}</textarea>`;
    else if (b.k === "clues") body = `<div class="qe-clues">${(b.rows || []).map((r, ri) => `<div class="qe-clue">
        ${[L("Clue", "Pista"), L("Where", "Dónde"), L("Test", "Prueba"), L("Leads to", "Lleva a")].map((lab, c) => inp(`${P}.rows.${ri}.${c}`, r[c], lab)).join("")}
        <button type="button" class="btn danger" data-rmrow="${si}.${bi}.${ri}" aria-label="${esc(T("Delete"))}">&#10005;&#xFE0E;</button></div>`).join("")}</div>
      <button type="button" class="btn" data-addrow="${si}.${bi}">+ ${esc(T(L("Add a clue", "Añadir una pista")))}</button>`;
    else if (b.k === "enc") {
      const groups = pickable(q);
      const opt = sel => groups.filter(([, l]) => l.length).map(([g, l]) => `<optgroup label="${esc(T(g))}">${l.map(t =>
        `<option value="${esc(t.id)}"${t.id === sel ? " selected" : ""}>${esc(T(t.name))} (${esc(T("lvl"))} ${t.level})</option>`).join("")}</optgroup>`).join("");
      const rule = r => `${Array.from({ length: 12 }, (_, i) => `<option value="${i + 1}"${r === i + 1 ? " selected" : ""}>${i + 1}</option>`).join("")}
        ${RULES.map(([k, lab]) => `<option value="${k}"${r === k ? " selected" : ""}>${esc(T(lab))}</option>`).join("")}`;
      body = `${inp(P + ".t", b.t, L("Encounter name, e.g. Ambush at the bridge", "Nombre del encuentro, p. ej. Emboscada en el puente"))}
        <div class="qe-enc">${(b.g || []).map((g, gi) => `<div class="qe-enc-row">
          <select data-encid="${si}.${bi}.${gi}">${opt(g[0])}</select>
          <select data-encn="${si}.${bi}.${gi}" aria-label="${esc(T(L("How many", "Cuántos")))}">${rule(g[1])}</select>
          <button type="button" class="btn danger" data-rmenc="${si}.${bi}.${gi}" aria-label="${esc(T("Delete"))}">&#10005;&#xFE0E;</button></div>`).join("")
          || `<p class="muted qe-small">${esc(T(L("No enemies yet.", "Aún no hay enemigos.")))}</p>`}</div>
        <div class="bar"><button type="button" class="btn" data-addenc="${si}.${bi}">+ ${esc(T(L("Add an enemy", "Añadir un enemigo")))}</button>
          <button type="button" class="btn" data-newenemy="${si}.${bi}">&#9998;&#xFE0E; ${esc(T(L("Create a new enemy", "Crear un enemigo nuevo")))}</button></div>`;
    }
    return `<div class="qe-blk qe-blk-${b.k}"><div class="qe-blk-h"><b>${BLOCKS[b.k][0]} ${esc(T(BLOCKS[b.k][1]))}</b>${tools("b" + si, bi, n)}</div>${body}</div>`;
  }

  async function render() {
    const q = QS.find(x => x.id === edit);
    if (!q) { edit = null; Quests.list(); return; }
    await loadYours();
    let maps = [];
    if (typeof MapEdit !== "undefined") { await MapEdit.load(); maps = MapEdit.quests(); }
    const builtIn = typeof Maps !== "undefined" && Maps.quests ? Maps.quests() : [];
    root().innerHTML = `
      <div class="qs-head qe-head">
        <button type="button" class="btn" id="qe-back">&#9664;&#xFE0E; ${esc(T(L("Quests", "Misiones")))}</button>
        <span class="muted qe-saved" id="qe-saved">${savedAt ? esc(T(L("Saved", "Guardado"))) : ""}</span>
        <button type="button" class="btn primary" id="qe-view">&#128065;&#xFE0E; ${esc(T(L("See the quest", "Ver la misión")))}</button>
      </div>
      <h3 class="qs-title">${esc(T(L("Quest editor", "Editor de misiones")))}</h3>
      <p class="hint">${esc(T(L("Everything is saved on this device as you type. Use **two asterisks** around words to make them bold.",
        "Todo se guarda en este dispositivo mientras escribes. Pon **dos asteriscos** alrededor de las palabras para ponerlas en negrita.")))}</p>
      <div class="card qe-card">
        ${field(L("Quest title", "Título de la misión"), inp("title", q.title, L("e.g. The Brahmin Came Home Alone", "p. ej. El brahmán volvió solo")))}
        ${field(L("Short description (shown in the quest list)", "Descripción breve (se ve en la lista de misiones)"), area("blurb", q.blurb, L("One or two sentences to hook the players", "Una o dos frases para enganchar a los jugadores"), 2))}
      </div>
      <div class="card qe-card"><h4 class="qe-h">&#127991;&#xFE0E; ${esc(T(L("Tags", "Etiquetas")))}</h4>
        <div class="qe-row">
          ${field(L("Sessions", "Sesiones"), inp("sessions", q.sessions, "1", "number"))}
          ${field(L("Time", "Duración"), inp("time", q.time, L("e.g. about 3 h", "p. ej. unas 3 h")))}
          ${field(L("Recommended level", "Nivel recomendado"), inp("level", q.level, L("e.g. 1-3", "p. ej. 1-3")))}
          ${field(L("Players", "Jugadores"), inp("players", q.players, L("e.g. 3-5", "p. ej. 3-5")))}
        </div>
        ${field(L("More tags, separated by commas", "Más etiquetas, separadas por comas"), inp("tags", q.tags, L("e.g. Rescue, Raiders, Commonwealth", "p. ej. Rescate, Saqueadores, Commonwealth")))}
        <p class="muted qe-small">${esc(T(L("The quest page also gets a button for every section, to jump straight to it.", "La página de la misión también tiene un botón por cada sección para saltar directamente a ella.")))}</p>
      </div>
      <div class="card qe-card"><h4 class="qe-h">&#128506;&#xFE0E; ${esc(T(L("Map", "Mapa")))}</h4>
        <select data-p="map"><option value="">${esc(T(L("No map", "Sin mapa")))}</option>
          ${maps.length ? `<optgroup label="${esc(T(L("My maps", "Mis mapas")))}">${maps.map(m => `<option value="m:${esc(m.id)}"${q.map === "m:" + m.id ? " selected" : ""}>${esc(m.name)}</option>`).join("")}</optgroup>` : ""}
          ${builtIn.length ? `<optgroup label="${esc(T(L("Quest guide maps", "Mapas de las guías")))}">${builtIn.map(m => `<option value="b:${esc(m.id)}"${q.map === "b:" + m.id ? " selected" : ""}>${esc(m.name)}</option>`).join("")}</optgroup>` : ""}
        </select>
        <p class="muted qe-small">${esc(T(L("Draw your own with Create Map on the Maps page; it shows up here.", "Dibuja el tuyo con Crear mapa en la página Mapas; aparecerá aquí.")))}
          <button type="button" class="btn qe-tomaps" id="qe-tomaps">&#128506;&#xFE0E; ${esc(T(L("Go to Maps", "Ir a Mapas")))}</button></p>
      </div>
      <div class="card qe-card"><h4 class="qe-h">&#9760;&#xFE0E; ${esc(T(L("This quest's enemies", "Enemigos de esta misión")))}</h4>
        <p class="muted qe-small">${esc(T(L("Creatures and characters made for this quest. Put them in any encounter; their stats show under it and the Combat Assistant can use them.",
          "Criaturas y personajes hechos para esta misión. Ponlos en cualquier encuentro; sus estadísticas salen debajo y el Asistente de combate puede usarlos.")))}</p>
        <div class="qe-enemies">${(q.enemies || []).map((e, i) => `<div class="pcard"><div class="t"><b>${esc(e.name)}</b>
          <small>${esc(T("Level"))} ${e.level} ${esc(T(e.type))} &middot; ${esc(T("HP"))} ${e.hp}</small></div>
          <button type="button" class="btn" data-editenemy="${i}" aria-label="${esc(T("Edit"))}">&#9998;&#xFE0E;</button>
          <button type="button" class="btn danger" data-rmenemy="${i}" aria-label="${esc(T("Delete"))}">&#10005;&#xFE0E;</button></div>`).join("")}</div>
        <div id="qe-enemy-form">${enemyForm ? enemyFormHtml() : `<button type="button" class="btn" id="qe-newenemy">+ ${esc(T(L("Create a new enemy", "Crear un enemigo nuevo")))}</button>`}</div>
      </div>
      <h4 class="qe-h qe-h-secs">&#128214;&#xFE0E; ${esc(T(L("Sections", "Secciones")))}</h4>
      ${q.sections.map((s, si) => `<div class="card qe-sec qe-sec-${s.kind}">
        <div class="qe-sec-h"><span class="qe-kind">${esc(T(KINDS[s.kind][0]))}</span>${tools("s", si, q.sections.length)}</div>
        ${field(L("Section title", "Título de la sección"), inp(`s.${si}.t`, s.t))}
        ${s.b.map((b, bi) => blockHtml(q, si, b, bi, s.b.length)).join("")}
        <div class="qe-add"><small>${esc(T(L("Add to this section:", "Añadir a esta sección:")))}</small>
          ${Object.entries(BLOCKS).map(([k, [ic, lab]]) => `<button type="button" class="btn" data-addblk="${si}.${k}">${ic} ${esc(T(lab))}</button>`).join("")}</div>
      </div>`).join("")}
      <div class="card qe-card qe-addsec"><small>${esc(T(L("Add a section:", "Añadir una sección:")))}</small>
        ${Object.keys(KINDS).map(k => `<button type="button" class="btn" data-addsec="${k}">+ ${esc(T(KINDS[k][0]))}</button>`).join("")}</div>
      <div class="bar qe-foot"><button type="button" class="btn danger" id="qe-delete">&#10005;&#xFE0E; ${esc(T(L("Delete this quest", "Borrar esta misión")))}</button>
        <button type="button" class="btn primary" id="qe-view2">&#128065;&#xFE0E; ${esc(T(L("See the quest", "Ver la misión")))}</button></div>`;
    wire(q);
  }

  // ---------------------------------------------------------------- enemy form
  function enemyFormHtml() {
    const e = enemyForm.e, a = i => (e.attacks || [])[i] || {};
    const num = (id, v, lab) => field(lab, `<input type="number" id="${id}" value="${esc(v == null ? "" : v)}" inputmode="numeric">`);
    const atkRow = i => `<div class="qe-row qe-atk">
      ${field(i === 0 ? L("Attack", "Ataque") : L("Attack {n} (optional)", "Ataque {n} (opcional)"), `<input type="text" id="qe-a${i}-name" value="${esc(a(i).name || "")}" placeholder="${esc(T(i === 0 ? L("e.g. Claws", "p. ej. Garras") : "(optional)"))}">`, "qe-wide")}
      ${num(`qe-a${i}-tn`, a(i).tn, "TN")}${num(`qe-a${i}-crit`, a(i).crit || 1, "Skill rank (crit)")}${num(`qe-a${i}-cd`, a(i).cd, "Damage CD")}
      ${field("Type", `<select id="qe-a${i}-type">${Object.entries(DMG).map(([k, v]) => `<option value="${k}"${(a(i).type || "p") === k ? " selected" : ""}>${esc(T(v))}</option>`).join("")}</select>`)}
      ${field("Effects (e.g. Piercing 1, Vicious)", `<input type="text" id="qe-a${i}-eff" value="${esc((a(i).eff || []).join(", "))}">`, "qe-wide")}
      ${num(`qe-a${i}-rate`, a(i).rate, "Fire rate (ranged)")}</div>`;
    return `<div class="qe-enemyform"><h5>${esc(T(enemyForm.i == null ? L("New enemy", "Enemigo nuevo") : L("Edit enemy", "Editar enemigo")))}</h5>
      <div class="qe-row">
        ${field("Name", `<input type="text" id="qe-e-name" value="${esc(e.name || "")}">`, "qe-wide")}
        ${num("qe-e-level", e.level || 1, "Level")}
        ${field("Type", `<select id="qe-e-type">${Object.keys(XP_MULT).map(t => `<option value="${t}"${(e.type || "Normal") === t ? " selected" : ""}>${esc(T(t))}</option>`).join("")}</select>`)}
        ${field("Kind", `<select id="qe-e-kind"><option value="creature">${esc(T("Creature"))}</option><option value="character"${e.kind === "character" ? " selected" : ""}>${esc(T("Character"))}</option></select>`)}
      </div>
      <div class="qe-row">${num("qe-e-hp", e.hp, "HP")}${num("qe-e-def", e.def || 1, "Defense")}${num("qe-e-init", e.init, "Initiative")}
        ${Object.entries(DMG).map(([k, v]) => field(v + " DR", `<input type="text" id="qe-e-dr-${k}" value="${esc(e.dr ? (e.dr[k] === "Imm" ? T(L("Immune", "Inmune")) : e.dr[k]) : 0)}">`)).join("")}</div>
      ${atkRow(0)}${atkRow(1)}${atkRow(2)}
      <div class="qe-row">${num("qe-e-wealth", e.wealth || 0, "Caps (d20s)")}${num("qe-e-junk", e.junk || 0, "Junk (combat dice)")}</div>
      ${field(L("Notes: special abilities, inventory, butchery…", "Notas: habilidades especiales, inventario, despiece…"), `<textarea id="qe-e-notes" rows="2">${esc(e.notes || "")}</textarea>`)}
      <div class="bar"><button type="button" class="btn" id="qe-e-cancel">${esc(T("Cancel"))}</button><button type="button" class="btn primary" id="qe-e-save">${esc(T("Save enemy"))}</button></div></div>`;
  }
  function readEnemy() {
    const v = id => ($(id) ? $(id).value.trim() : "");
    const n = (id, d) => { const x = parseInt(v(id), 10); return Number.isFinite(x) ? x : d; };
    const name = v("qe-e-name");
    if (!name || !n("qe-e-hp", 0) || !v("qe-a0-name") || !n("qe-a0-tn", 0) || !n("qe-a0-cd", 0)) { toast(T("Name, HP and attack 1 (name, TN, damage) are needed")); return null; }
    const drIn = k => (/^i/i.test(v("qe-e-dr-" + k)) ? "Imm" : n("qe-e-dr-" + k, 0));
    const attacks = [0, 1, 2].filter(i => v(`qe-a${i}-name`) && n(`qe-a${i}-tn`, 0)).map(i => ({ name: v(`qe-a${i}-name`), tn: n(`qe-a${i}-tn`, 1),
      crit: n(`qe-a${i}-crit`, 1), cd: n(`qe-a${i}-cd`, 1), type: v(`qe-a${i}-type`) || "p",
      eff: v(`qe-a${i}-eff`).split(",").map(x => x.trim()).filter(Boolean), rate: v(`qe-a${i}-rate`) === "" ? null : n(`qe-a${i}-rate`, 0) }));
    const level = Math.max(1, n("qe-e-level", 1));
    return { id: enemyForm.e.id || uid(), name, level, type: v("qe-e-type") || "Normal", kind: v("qe-e-kind") || "creature",
      hp: n("qe-e-hp", 1), def: n("qe-e-def", 1), init: n("qe-e-init", 8), dr: { p: drIn("p"), e: drIn("e"), r: drIn("r"), po: drIn("po") },
      attacks, wealth: n("qe-e-wealth", 0), junk: n("qe-e-junk", 0), notes: v("qe-e-notes") };
  }

  // ---------------------------------------------------------------- events
  function setPath(q, path, value) {
    const keys = path.split(".");
    let o = q;
    keys.slice(0, -1).forEach(k => (o = k === "s" ? o.sections : o[k]));
    const last = keys[keys.length - 1];
    o[last] = value;
  }
  function wire(q) {
    const r = root();
    r.querySelectorAll("[data-p]").forEach(el => {
      const upd = () => {
        let val = el.value;
        if (el.dataset.p === "sessions") val = Math.max(0, parseInt(val, 10) || 0);
        if (/\.diff$/.test(el.dataset.p)) val = +val;
        setPath(q, el.dataset.p, val);
        dirty(el.tagName === "SELECT");
      };
      el.addEventListener(el.tagName === "SELECT" ? "change" : "input", upd);
    });
    r.querySelectorAll("[data-lines]").forEach(el => el.addEventListener("input", () => { setPath(q, el.dataset.lines, el.value.split("\n")); dirty(); }));
    const restruct = fn => { fn(); dirty(true); render(); };
    const listOf = kind => (kind === "s" ? q.sections : q.sections[+kind.slice(1)].b);
    const move = (spec, d) => { const [kind, i] = spec.split(":"); const l = listOf(kind), j = +i + d; if (j < 0 || j >= l.length) return; [l[+i], l[j]] = [l[j], l[+i]]; };
    r.querySelectorAll("[data-up]").forEach(b => (b.onclick = () => restruct(() => move(b.dataset.up, -1))));
    r.querySelectorAll("[data-down]").forEach(b => (b.onclick = () => restruct(() => move(b.dataset.down, 1))));
    r.querySelectorAll("[data-del]").forEach(b => (b.onclick = async () => {
      const [kind, i] = b.dataset.del.split(":");
      const what = kind === "s" ? L("Delete the section “{name}” and everything in it?", "¿Borrar la sección «{name}» y todo lo que tiene?") : L("Delete this piece?", "¿Borrar esta pieza?");
      if (!(await confirmBox(T(what, { name: kind === "s" ? q.sections[+i].t : "" })))) return;
      restruct(() => listOf(kind).splice(+i, 1));
    }));
    r.querySelectorAll("[data-addblk]").forEach(b => (b.onclick = () => {
      const [si, k] = b.dataset.addblk.split(".");
      restruct(() => q.sections[+si].b.push(newBlock(k)));
      setTimeout(() => { const blks = root().querySelectorAll(`.qe-sec`)[+si].querySelectorAll(".qe-blk"); const last = blks[blks.length - 1]; if (last) { last.scrollIntoView({ block: "center" }); const f = last.querySelector("input,textarea,select"); if (f) f.focus({ preventScroll: true }); } }, 60);
    }));
    r.querySelectorAll("[data-addsec]").forEach(b => (b.onclick = () => {
      const k = b.dataset.addsec, s = newSection(q, k);
      // a new act goes after the last act (before the conclusion); the rest at the end
      const lastAct = q.sections.map(x => x.kind).lastIndexOf("act"), conc = q.sections.findIndex(x => x.kind === "conclusion");
      const at = k === "act" ? (lastAct >= 0 ? lastAct + 1 : conc >= 0 ? conc : q.sections.length) : k === "summary" ? 0 : q.sections.length;
      restruct(() => q.sections.splice(at, 0, s));
      setTimeout(() => { const el = root().querySelectorAll(".qe-sec")[at]; if (el) el.scrollIntoView({ block: "start" }); }, 60);
    }));
    const blk = spec => { const [si, bi] = spec.split("."); return q.sections[+si].b[+bi]; };
    r.querySelectorAll("[data-addrow]").forEach(b => (b.onclick = () => restruct(() => blk(b.dataset.addrow).rows.push(["", "", "", ""]))));
    r.querySelectorAll("[data-rmrow]").forEach(b => (b.onclick = () => { const [si, bi, ri] = b.dataset.rmrow.split("."); restruct(() => blk(si + "." + bi).rows.splice(+ri, 1)); }));
    r.querySelectorAll("[data-addenc]").forEach(b => (b.onclick = () => {
      const first = pickable(q).find(([, l]) => l.length);
      if (!first) return;
      restruct(() => blk(b.dataset.addenc).g.push([first[1][0].id, 1]));
    }));
    r.querySelectorAll("[data-rmenc]").forEach(b => (b.onclick = () => { const [si, bi, gi] = b.dataset.rmenc.split("."); restruct(() => blk(si + "." + bi).g.splice(+gi, 1)); }));
    r.querySelectorAll("[data-encid]").forEach(s => (s.onchange = () => { const [si, bi, gi] = s.dataset.encid.split("."); blk(si + "." + bi).g[+gi][0] = s.value; dirty(true); }));
    r.querySelectorAll("[data-encn]").forEach(s => (s.onchange = () => { const [si, bi, gi] = s.dataset.encn.split("."); blk(si + "." + bi).g[+gi][1] = /^\d+$/.test(s.value) ? +s.value : s.value; dirty(true); }));
    // enemies
    const openForm = (i, forEnc) => { enemyForm = { i, e: i == null ? {} : JSON.parse(JSON.stringify(q.enemies[i])), forEnc }; render().then(() => { const f = $("qe-enemy-form"); if (f) { f.scrollIntoView({ block: "start" }); const n = $("qe-e-name"); if (n) n.focus({ preventScroll: true }); } }); };
    if ($("qe-newenemy")) $("qe-newenemy").onclick = () => openForm(null);
    r.querySelectorAll("[data-newenemy]").forEach(b => (b.onclick = () => openForm(null, b.dataset.newenemy)));
    r.querySelectorAll("[data-editenemy]").forEach(b => (b.onclick = () => openForm(+b.dataset.editenemy)));
    r.querySelectorAll("[data-rmenemy]").forEach(b => (b.onclick = async () => {
      const e = q.enemies[+b.dataset.rmenemy], id = "uq_" + q.id + "_" + e.id;
      if (!(await confirmBox(T('Delete your enemy "{name}"?', { name: e.name })))) return;
      restruct(() => { q.enemies.splice(+b.dataset.rmenemy, 1); q.sections.forEach(s => s.b.forEach(x => { if (x.k === "enc") x.g = x.g.filter(g => g[0] !== id); })); });
    }));
    if ($("qe-e-cancel")) $("qe-e-cancel").onclick = () => { enemyForm = null; render(); };
    if ($("qe-e-save")) $("qe-e-save").onclick = () => {
      const e = readEnemy();
      if (!e) return;
      q.enemies = q.enemies || [];
      const forEnc = enemyForm.forEnc;
      if (enemyForm.i == null) q.enemies.push(e); else q.enemies[enemyForm.i] = e;
      if (forEnc) blk(forEnc).g.push(["uq_" + q.id + "_" + e.id, 1]); // made from an encounter: it goes straight into it
      enemyForm = null;
      toast(T("{name} saved to your enemies", { name: e.name }));
      restruct(() => {});
      if (forEnc) setTimeout(() => { const [si, bi] = forEnc.split("."); const el = root().querySelectorAll(".qe-sec")[+si]; const b2 = el && el.querySelectorAll(".qe-blk")[+bi]; if (b2) b2.scrollIntoView({ block: "center" }); }, 60);
    };
    // leaving
    $("qe-back").onclick = () => close();
    $("qe-view").onclick = $("qe-view2").onclick = () => { const id = edit; close(true); Quests.open("u:" + id); };
    $("qe-tomaps").onclick = () => { flush(); showPage("maps"); };
    $("qe-delete").onclick = async () => {
      if (!(await confirmBox(T(L("Delete the quest “{name}”? This can't be undone.", "¿Borrar la misión «{name}»? No se puede deshacer."), { name: q.title || T(L("Untitled quest", "Misión sin título")) })))) return;
      QS = QS.filter(x => x.id !== q.id);
      await store();
      edit = null; enemyForm = null;
      Quests.list();
    };
  }
  function flush() { if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; store(); } }

  // ---------------------------------------------------------------- entry points
  async function create() {
    await load();
    const q = newQuest();
    QS.push(q);
    await store();
    openEditor(q.id);
  }
  function openEditor(id) { edit = id; enemyForm = null; savedAt = 0; render().then(() => root().scrollIntoView({ block: "start" })); }
  function close(quiet) {
    flush();
    edit = null; enemyForm = null;
    if (!quiet) Quests.list();
    return true;
  }
  async function remove(id) { await load(); QS = QS.filter(q => q.id !== id); await store(); }
  load();

  return { load, book, templates, statHtml, findTemplate, loadYours, create, open: openEditor, close, remove, render,
    active: () => edit != null, quests: () => QS };
})();
