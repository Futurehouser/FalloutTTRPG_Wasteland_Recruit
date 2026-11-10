// Map editor: "Create Map" on the Maps page. The user names a quest and draws its general map in the same
// green-on-black Pip-Boy style as the quest maps: marks dragged from the bar (locations, characters, enemies,
// bodies, points of interest, loot, hazards, ways out), each with a name shown below it and optional notes;
// straight, dashed and curved lines, circles, painted grass and an eraser, with undo and redo. Tapping a
// location mark offers to create its local map, which opens in the same editor.
//
// Custom maps are saved on the device (Platform storage key "custom_maps"):
//   [{ id, name, start, maps: { [mapId]: { id, title, back, w, h, items: [...] } } }]
// items: { id, t: "mark", k, x, y, n, note, go } | { id, t: "line", a, b, dash } | { id, t: "curve", a, b, c }
//        { id, t: "circle", c, r } | { id, t: "grass", pts, seed }   (points are [x, y] in map units)
const MapEdit = (() => {
  const { D, rng, ICON, KIND, beep, L } = Maps.kit;
  const KINDS = ["loc", "npc", "enemy", "dead", "item", "loot", "trap", "exit"];
  const HISTORY = 50; // undo steps kept per map
  const TOOLS = [
    ["move", L("Move", "Mover"), `<path d="M12 2v20M2 12h20M12 2l-3 3M12 2l3 3M12 22l-3-3M12 22l3-3M2 12l3-3M2 12l3 3M22 12l-3-3M22 12l-3 3"/>`],
    ["line", L("Line", "Línea"), `<path d="M4 20L20 4"/><circle cx="4" cy="20" r="1.6"/><circle cx="20" cy="4" r="1.6"/>`],
    ["dash", L("Dashed", "Discontinua"), `<path d="M4 20L20 4" stroke-dasharray="4 3"/>`],
    ["curve", L("Curve", "Curva"), `<path d="M3 19C6 5 18 5 21 19"/>`],
    ["circle", L("Circle", "Círculo"), `<circle cx="12" cy="12" r="8"/>`],
    ["grass", L("Grass", "Hierba"), `<path d="M4 21l-1-6M8 21l1-8M12 21l-1-11M16 21l2-8M20 21l1-5"/>`],
    ["erase", L("Eraser", "Borrador"), `<path d="M9 20l-6-6L13 4l7 7-9 9zM9 20h12M6 11l7 7"/>`],
  ];
  const HINT = {
    move: L("Drag the map to move it, and drag a mark to move the mark. Tap a mark to see it, edit it or open its local map.",
            "Arrastra el mapa para moverlo y arrastra una marca para cambiarla de sitio. Toca una marca para verla, editarla o abrir su mapa local."),
    mark: L("Drag a mark from the bar onto the map, or tap the map to place one here: {kind}.",
            "Arrastra una marca de la barra al mapa, o toca el mapa para poner una aquí: {kind}."),
    line: L("Tap where the line starts, then where it ends (or drag from one end to the other).",
            "Toca donde empieza la línea y luego donde termina (o arrastra de un extremo al otro)."),
    curve0: L("Tap where the curve starts.", "Toca donde empieza la curva."),
    curve1: L("Now tap where it ends.", "Ahora toca donde termina."),
    curve2: L("Touch the line and drag to bend it; let go to finish.", "Toca la línea y arrastra para curvarla; suelta para terminar."),
    circle: L("Tap the centre, then a point on the edge (or drag from the centre outwards).",
              "Toca el centro y luego un punto del borde (o arrastra desde el centro hacia fuera)."),
    grass: L("Drag over the map to paint grass.", "Arrastra sobre el mapa para pintar hierba."),
    erase: L("Tap or drag over anything to erase it.", "Toca o arrastra sobre cualquier cosa para borrarla."),
    zoom: L("Two fingers, the mouse wheel or the buttons zoom.", "Con dos dedos, la rueda del ratón o los botones haces zoom."),
  };

  let QS = null, loading = null;
  let qid = null, mid = null, tool = "move", view = null, sel = null, pend = null, dlg = null, wired = false;
  const hist = {};
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const Q = () => QS.find(q => q.id === qid);
  const M = () => Q().maps[mid];
  const r1 = v => Math.round(v * 10) / 10;
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const save = () => Platform.saveJSON("custom_maps", QS);

  function load() {
    return loading || (loading = Platform.loadJSON("custom_maps", []).then(v => { QS = Array.isArray(v) ? v : []; }));
  }
  const quests = () => QS || [];

  // ---------------------------------------------------------------- a small form dialog (name, notes...)
  function form(title, fields, okLabel) {
    let el = $("me-dlg");
    if (!el) {
      el = document.createElement("div");
      el.className = "modal"; el.id = "me-dlg";
      el.innerHTML = `<form class="box me-form" id="me-dlg-form"><h3 id="me-dlg-t"></h3><div id="me-dlg-f"></div>
        <div class="bar"><button type="button" class="btn" id="me-dlg-no"></button><button type="submit" class="btn primary" id="me-dlg-ok"></button></div></form>`;
      document.body.appendChild(el);
    }
    $("me-dlg-t").textContent = title;
    $("me-dlg-no").textContent = T("Cancel");
    $("me-dlg-ok").textContent = okLabel;
    $("me-dlg-f").innerHTML = fields.map(f => `<label for="me-f-${f.id}">${esc(f.label)}</label>` + (
      f.type === "area" ? `<textarea id="me-f-${f.id}" rows="4" placeholder="${esc(f.ph || "")}">${esc(f.value || "")}</textarea>`
      : f.type === "select" ? `<select id="me-f-${f.id}">${f.options.map(([v, t]) => `<option value="${v}"${v === f.value ? " selected" : ""}>${esc(t)}</option>`).join("")}</select>`
      : `<input type="text" id="me-f-${f.id}" maxlength="60" autocomplete="off" placeholder="${esc(f.ph || "")}" value="${esc(f.value || "")}">`)).join("");
    el.classList.add("show");
    const first = $("me-dlg-f").querySelector("input, textarea");
    if (first) setTimeout(() => { first.focus(); if (first.select) first.select(); }, 30);
    return new Promise(res => {
      const done = v => {
        el.classList.remove("show"); dlg = null;
        $("me-dlg-form").onsubmit = $("me-dlg-no").onclick = el.onkeydown = null;
        res(v);
      };
      dlg = done;
      $("me-dlg-form").onsubmit = e => {
        e.preventDefault();
        const v = {};
        fields.forEach(f => (v[f.id] = $("me-f-" + f.id).value));
        done(v);
      };
      $("me-dlg-no").onclick = () => done(null);
      el.onkeydown = e => { if (e.key === "Escape") { e.preventDefault(); done(null); } };
    });
  }

  // ---------------------------------------------------------------- quests
  function newMap(q, title, back, w, h) {
    const m = { id: uid(), title, back, w, h, items: [] };
    q.maps[m.id] = m;
    return m;
  }
  async function create() {
    await load();
    const v = await form(T(L("Create Map", "Crear mapa")), [{ id: "name", label: T(L("Quest name", "Nombre de la misión")),
      ph: T(L("e.g. The Vault 81 job", "p. ej. El encargo del Refugio 81")) }], T(L("Create", "Crear")));
    if (!v) return;
    const q = { id: uid(), name: v.name.trim() || T(L("Untitled quest", "Misión sin nombre")), maps: {} };
    q.start = newMap(q, L("General map", "Mapa general"), null, 1600, 1000).id;
    QS.unshift(q);
    save();
    tool = "move";
    open(q.id);
  }
  function open(id, mapId) {
    qid = id;
    openMap(mapId || Q().start);
  }
  function remove(id) {
    QS = QS.filter(q => q.id !== id);
    return save();
  }
  const mapTitle = (q, m) => (m.id === q.start ? T(m.title) : m.title);

  // ---------------------------------------------------------------- the editor page
  const toolBtn = (id, label, icon) => `<button type="button" class="me-tool" data-tool="${id}" aria-pressed="false" title="${esc(T(label))}">
    <svg viewBox="0 0 24 24" aria-hidden="true">${icon}</svg><span>${esc(T(label))}</span></button>`;

  function openMap(id) {
    mid = id; sel = null; pend = null;
    const q = Q(), m = M(), parent = m.back && q.maps[m.back];
    $("mp-root").innerHTML = `
      <div class="mp-head">
        <button type="button" class="btn mp-back" id="me-back">&#9664;&#xFE0E; ${esc(parent ? mapTitle(q, parent) : T(L("Quests", "Misiones")))}</button>
        <div class="mp-title"><small>${esc(q.name)}</small><b>${esc(mapTitle(q, m))}</b></div>
        <button type="button" class="btn me-rename" id="me-rename" title="${esc(T(L("Rename", "Cambiar nombre")))}" aria-label="${esc(T(L("Rename", "Cambiar nombre")))}">&#9998;&#xFE0E;</button>
      </div>
      <div class="me-bar">
        <div class="me-row" role="toolbar" aria-label="${esc(T(L("Marks", "Marcas")))}">${KINDS.map(k =>
          `<button type="button" class="me-tool me-mk" data-tool="${k}" aria-pressed="false" title="${esc(T(KIND[k]))}">
            <svg viewBox="-13 -13 26 26" class="mp-svg-mini" aria-hidden="true">${ICON[k]}</svg><span>${esc(T(KIND[k]))}</span></button>`).join("")}</div>
        <div class="me-row" role="toolbar" aria-label="${esc(T(L("Tools", "Herramientas")))}">${TOOLS.map(t => toolBtn(...t)).join("")}
          <button type="button" class="me-tool" id="me-undo" title="${esc(T(L("Undo", "Deshacer")))}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 14L4 9l5-5M4 9h10a6 6 0 010 12h-3"/></svg><span>${esc(T(L("Undo", "Deshacer")))}</span></button>
          <button type="button" class="me-tool" id="me-redo" title="${esc(T(L("Redo", "Rehacer")))}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 14l5-5-5-5M20 9H10a6 6 0 000 12h3"/></svg><span>${esc(T(L("Redo", "Rehacer")))}</span></button>
        </div>
      </div>
      <div class="mp-stage me-stage" id="me-stage">
        <svg class="mp-svg" id="me-svg" xmlns="http://www.w3.org/2000/svg" width="${m.w}" height="${m.h}" viewBox="0 0 ${m.w} ${m.h}">
          <defs><pattern id="me-grid" width="50" height="50" patternUnits="userSpaceOnUse"><path d="M50 0H0V50" class="grid"/></pattern></defs>
          <rect width="${m.w}" height="${m.h}" fill="url(#me-grid)"/>
          <g id="me-grass"></g><g id="me-lines"></g><g id="me-prev"></g><g id="me-marks"></g>
          <rect class="mp-frame" x="2" y="2" width="${m.w - 4}" height="${m.h - 4}"/>
        </svg>
        <div class="mp-zoom">
          <button type="button" class="btn" id="me-in" aria-label="${esc(T(L("Zoom in", "Acercar")))}">+</button>
          <button type="button" class="btn" id="me-out" aria-label="${esc(T(L("Zoom out", "Alejar")))}">&minus;</button>
          <button type="button" class="btn" id="me-fit" aria-label="${esc(T(L("Show the whole map", "Ver el mapa entero")))}">&#9974;</button>
        </div>
      </div>
      <div class="mp-info" id="me-info"></div>
      <p class="hint mp-note">${esc(T(L("Your maps are saved on this device as you draw.", "Tus mapas se guardan en este dispositivo mientras dibujas.")))}</p>`;
    $("me-back").onclick = () => { pend = null; back(); };
    $("me-rename").onclick = rename;
    $("me-undo").onclick = undo;
    $("me-redo").onclick = redo;
    $("me-in").onclick = () => zoomBy(1.4);
    $("me-out").onclick = () => zoomBy(1 / 1.4);
    $("me-fit").onclick = () => fit(true);
    wireBar();
    wireStage();
    if (!wired) {
      wired = true;
      window.addEventListener("resize", () => { if (qid && $("me-stage")) apply(); });
      document.addEventListener("keydown", keys);
    }
    fit();
    draw();
    setTool(tool);
    $("mp-root").scrollIntoView({ block: "start" }); // the bar and the whole frame on screen together
  }

  function keys(e) {
    if (!qid || !$("me-stage") || dlg || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    const k = e.key.toLowerCase();
    if ((e.ctrlKey || e.metaKey) && k === "z") { e.preventDefault(); e.shiftKey ? redo() : undo(); }
    else if ((e.ctrlKey || e.metaKey) && k === "y") { e.preventDefault(); redo(); }
    else if (k === "escape" && pend) { pend = null; preview(); info(); }
  }

  function setTool(t) {
    tool = t; pend = null;
    document.querySelectorAll("#mp-root [data-tool]").forEach(b => b.setAttribute("aria-pressed", b.dataset.tool === t ? "true" : "false"));
    $("me-stage").dataset.tool = t;
    preview();
    if (sel) { sel = null; draw(); }
    info();
  }

  function info() {
    const box = $("me-info");
    if (!box || sel) return;
    let h;
    if (KINDS.includes(tool)) h = T(HINT.mark, { kind: T(KIND[tool]) });
    else if (tool === "dash") h = T(HINT.line);
    else if (tool === "curve") h = T(!pend || !pend.a ? HINT.curve0 : !pend.b ? HINT.curve1 : HINT.curve2);
    else h = T(HINT[tool]);
    const name = KINDS.includes(tool) ? "" : T(TOOLS.find(t => t[0] === tool)[1]);
    box.innerHTML = `${name ? `<b>${esc(name)}:</b> ` : ""}${esc(h)} <span class="me-dim">${esc(T(HINT.zoom))}</span>`;
  }

  // ---------------------------------------------------------------- drawing the items
  function markSvg(it) {
    return `<g class="mk mk-${it.k}${it.id === sel ? " on" : ""}" data-id="${it.id}" transform="translate(${it.x},${it.y})" tabindex="0" role="button"
      aria-label="${esc((it.n || T(KIND[it.k])) + " (" + T(KIND[it.k]) + ")")}"><g class="mk-in"><circle class="hit" r="22"/>${ICON[it.k]}${it.go ? `<circle class="me-has" r="15"/>` : ""}
      ${it.n ? `<text y="25">${esc(it.n)}</text>` : ""}</g></g>`;
  }
  function grassSvg(it) {
    const r = rng(it.seed);
    return `<g data-id="${it.id}">${it.pts.map(([x, y]) => D.grass(r, x - 26, y - 22, x + 26, y + 26, 9)).join("")}</g>`;
  }
  function lineSvg(it, extra = "") {
    const id = it.id ? ` data-id="${it.id}"` : "";
    if (it.t === "line") return `<line class="me-ln${it.dash ? " me-dash" : ""}${extra}"${id} x1="${it.a[0]}" y1="${it.a[1]}" x2="${it.b[0]}" y2="${it.b[1]}"/>`;
    if (it.t === "curve") return `<path class="me-ln${extra}"${id} d="M${it.a} Q${it.c} ${it.b}"/>`;
    return `<circle class="me-ln${extra}"${id} cx="${it.c[0]}" cy="${it.c[1]}" r="${it.r}"/>`;
  }
  function draw() {
    const items = M().items;
    $("me-grass").innerHTML = items.filter(i => i.t === "grass").map(grassSvg).join("");
    $("me-lines").innerHTML = items.filter(i => i.t === "line" || i.t === "curve" || i.t === "circle").map(i => lineSvg(i)).join("");
    $("me-marks").innerHTML = items.filter(i => i.t === "mark").map(markSvg).join("");
    $("me-marks").querySelectorAll("[data-id]").forEach(g => g.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); showMark(byId(g.dataset.id), true); }
    }));
    if (view) { view.ls = null; apply(); }
    $("me-undo").disabled = !H().u.length;
    $("me-redo").disabled = !H().r.length;
  }
  const byId = id => M().items.find(i => String(i.id) === String(id));

  // the line, curve or circle being drawn, and the grass stroke being painted
  function preview(grassPts) {
    const g = $("me-prev");
    if (!g) return;
    let s = "";
    if (grassPts) s = grassSvg({ id: 0, pts: grassPts, seed: 7 });
    else if (pend && pend.a) {
      const dot = p => `<circle class="me-dot" cx="${p[0]}" cy="${p[1]}" r="${(6 / view.z).toFixed(1)}"/>`;
      s += dot(pend.a);
      if (pend.b) {
        if (pend.t === "circle") s += lineSvg({ t: "circle", c: pend.a, r: dist(pend.a, pend.b) }, " me-pv");
        else if (pend.t === "curve") {
          s += lineSvg({ t: "curve", a: pend.a, b: pend.b, c: pend.c || [(pend.a[0] + pend.b[0]) / 2, (pend.a[1] + pend.b[1]) / 2] }, " me-pv");
          s += dot(pend.b);
        } else s += lineSvg({ t: "line", a: pend.a, b: pend.b, dash: pend.t === "dash" }, " me-pv") + dot(pend.b);
      }
    }
    g.innerHTML = s;
  }

  // ---------------------------------------------------------------- history (undo / redo)
  const H = () => hist[qid + mid] || (hist[qid + mid] = { u: [], r: [] });
  const snap = () => JSON.stringify(M().items);
  function pushUndo(s) {
    const h = H();
    h.u.push(s);
    if (h.u.length > HISTORY) h.u.shift();
    h.r.length = 0;
  }
  function change(fn) {
    pushUndo(snap());
    fn(M().items);
    save(); draw();
  }
  function step(from, to) {
    const h = H();
    if (!h[from].length) return;
    h[to].push(snap());
    M().items = JSON.parse(h[from].pop());
    beep("item");
    sel = null; pend = null;
    save(); draw(); preview(); info();
  }
  const undo = () => step("u", "r"), redo = () => step("r", "u");

  // ---------------------------------------------------------------- marks
  const noteField = (k, value) => ({ id: "note", type: "area", value, label: T(L("Notes", "Notas")),
    ph: T(k === "npc" ? L("Who they are, what they want, what they know…", "Quién es, qué quiere, qué sabe…")
      : L("Anything you want to remember about it", "Lo que quieras recordar sobre esto")) });
  async function placeMark(k, p) {
    const v = await form(T(L("New mark: {kind}", "Nueva marca: {kind}"), { kind: T(KIND[k]) }),
      [{ id: "name", label: T(L("Name (shown below the mark)", "Nombre (sale debajo de la marca)")) }, noteField(k, "")], T(L("Place", "Poner")));
    if (!v) return;
    const it = { id: uid(), t: "mark", k, x: r1(p[0]), y: r1(p[1]), n: v.name.trim(), note: v.note.trim() };
    change(items => items.push(it));
    beep(k);
    showMark(it, false);
  }
  async function editMark(it) {
    const v = await form(T(L("Edit mark", "Editar marca")), [
      { id: "name", label: T(L("Name (shown below the mark)", "Nombre (sale debajo de la marca)")), value: it.n },
      { id: "k", type: "select", label: T(L("Type", "Tipo")), value: it.k, options: KINDS.map(k => [k, T(KIND[k])]) },
      noteField(it.k, it.note)], T(L("Save", "Guardar")));
    if (!v) return;
    change(() => { const m = byId(it.id); m.n = v.name.trim(); m.k = v.k; m.note = v.note.trim(); });
    showMark(byId(it.id), false);
  }
  async function makeLocal(it) {
    const q = Q(), m = newMap(q, it.n || T(L("Local map", "Mapa local")), mid, 1000, 700);
    change(() => (byId(it.id).go = m.id));
    beep("loc");
    openMap(m.id);
  }
  function showMark(it, tapped) {
    if (!it) return;
    if (tapped) beep(it.k);
    sel = it.id;
    $("me-marks").querySelectorAll("[data-id]").forEach(g => g.classList.toggle("on", g.dataset.id === String(it.id)));
    const local = it.go && Q().maps[it.go];
    $("me-info").innerHTML = `<b>${esc(it.n || T(KIND[it.k]))}</b> <span class="mp-kind">${esc(T(KIND[it.k]))}</span>
      ${it.note ? `<div class="me-note">${esc(it.note)}</div>` : ""}
      <div class="me-acts">
        ${local ? `<button type="button" class="btn" id="me-open">&#9654;&#xFE0E; ${esc(T(L("Open local map", "Abrir mapa local")))}</button>`
          : it.k === "loc" ? `<button type="button" class="btn" id="me-mklocal">+ ${esc(T(L("Create local map", "Crear mapa local")))}</button>` : ""}
        <button type="button" class="btn" id="me-edit">&#9998;&#xFE0E; ${esc(T(L("Edit", "Editar")))}</button>
        <button type="button" class="btn" id="me-del">&#10005;&#xFE0E; ${esc(T(L("Erase", "Borrar")))}</button>
      </div>`;
    if (local) $("me-open").onclick = () => { beep("loc"); openMap(it.go); };
    else if ($("me-mklocal")) $("me-mklocal").onclick = () => makeLocal(it);
    $("me-edit").onclick = () => editMark(it);
    $("me-del").onclick = () => { change(items => items.splice(items.findIndex(i => i.id === it.id), 1)); sel = null; info(); };
    if (tapped && it.k === "loc" && !local)
      confirmBox(T(L("Create a local map for “{name}”?", "¿Crear un mapa local para «{name}»?"), { name: it.n || T(KIND.loc) }), T(L("Create", "Crear")))
        .then(yes => { if (yes) makeLocal(it); });
  }

  async function rename() {
    const q = Q(), m = M(), isStart = m.id === q.start;
    const v = await form(T(isStart ? L("Quest name", "Nombre de la misión") : L("Map name", "Nombre del mapa")),
      [{ id: "name", label: T(L("Name", "Nombre")), value: isStart ? q.name : m.title }], T(L("Save", "Guardar")));
    if (!v || !v.name.trim()) return;
    if (isStart) q.name = v.name.trim(); else m.title = v.name.trim();
    save();
    openMap(mid);
  }

  // ---------------------------------------------------------------- the eraser
  function segDist(p, a, b) {
    const dx = b[0] - a[0], dy = b[1] - a[1], l = dx * dx + dy * dy;
    const t = l ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l)) : 0;
    return dist(p, [a[0] + t * dx, a[1] + t * dy]);
  }
  const bez = (a, c, b, t) => [0, 1].map(i => (1 - t) * (1 - t) * a[i] + 2 * t * (1 - t) * c[i] + t * t * b[i]);
  function hits(it, p, tol) {
    if (it.t === "mark") return dist(p, [it.x, it.y]) < Math.max(tol, 14 * (+view.ls || 1));
    if (it.t === "line") return segDist(p, it.a, it.b) < tol;
    if (it.t === "circle") return Math.abs(dist(p, it.c) - it.r) < tol;
    if (it.t === "grass") return it.pts.some(q => dist(p, q) < 26 + tol / 2);
    for (let i = 0; i < 24; i++) if (segDist(p, bez(it.a, it.c, it.b, i / 24), bez(it.a, it.c, it.b, (i + 1) / 24)) < tol) return true;
    return false;
  }

  // ---------------------------------------------------------------- pan and zoom (as on the quest maps)
  const stage = () => $("me-stage"), svg = () => $("me-svg");
  function limits() {
    const m = M(), s = stage();
    const contain = Math.min(s.clientWidth / m.w, s.clientHeight / m.h);
    return { min: contain * 0.9, max: Math.max(4, contain * 10), contain, cover: Math.max(s.clientWidth / m.w, s.clientHeight / m.h) };
  }
  // opening a map: filling the frame (on a phone the map is much wider than the screen); the button: the whole map
  function fit(whole) {
    const m = M(), s = stage(), lim = limits(), z = whole === true ? lim.contain : Math.min(lim.cover, lim.contain * 2.5);
    view = { z, x: (s.clientWidth - m.w * z) / 2, y: (s.clientHeight - m.h * z) / 2 };
    apply();
  }
  function apply() {
    const m = M(), s = stage(), lim = limits();
    view.z = Math.min(lim.max, Math.max(lim.min, view.z));
    const w = m.w * view.z, h = m.h * view.z, sw = s.clientWidth, sh = s.clientHeight;
    view.x = w <= sw ? (sw - w) / 2 : Math.min(sw * 0.35, Math.max(sw * 0.65 - w, view.x));
    view.y = h <= sh ? (sh - h) / 2 : Math.min(sh * 0.35, Math.max(sh * 0.65 - h, view.y));
    svg().style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.z})`;
    const ls = Math.min(20 / (14 * view.z), Math.max(11 / (14 * view.z), 1 / Math.pow(view.z, 0.65))).toFixed(3);
    if (ls !== view.ls) {
      view.ls = ls;
      const hit = Math.min(22, 48 / ls).toFixed(1);
      svg().querySelectorAll(".mk-in").forEach(g => { g.setAttribute("transform", `scale(${ls})`); g.querySelector(".hit").setAttribute("r", hit); });
      preview();
    }
  }
  function zoomAt(f, px, py) {
    const z0 = view.z, lim = limits();
    view.z = Math.min(lim.max, Math.max(lim.min, z0 * f));
    const k = view.z / z0;
    view.x = px - (px - view.x) * k;
    view.y = py - (py - view.y) * k;
    apply();
  }
  const zoomBy = f => { const s = stage(); zoomAt(f, s.clientWidth / 2, s.clientHeight / 2); };
  function toMap(clientX, clientY) {
    const b = stage().getBoundingClientRect(), m = M();
    return [r1(Math.max(0, Math.min(m.w, (clientX - b.left - view.x) / view.z))), r1(Math.max(0, Math.min(m.h, (clientY - b.top - view.y) / view.z)))];
  }

  // ---------------------------------------------------------------- the bar: tools, and marks dragged onto the map
  function wireBar() {
    document.querySelectorAll("#mp-root .me-tool[data-tool]").forEach(b => {
      const k = b.dataset.tool;
      b.onclick = e => { if (!KINDS.includes(k) || e.detail === 0) { beep("item"); setTool(k); } }; // keyboard, and the drawing tools
      if (!KINDS.includes(k)) return;
      b.addEventListener("pointerdown", e => {
        if (e.button) return;
        b.setPointerCapture(e.pointerId);
        const x0 = e.clientX, y0 = e.clientY;
        let ghost = null;
        const move = ev => {
          if (!ghost && Math.hypot(ev.clientX - x0, ev.clientY - y0) > 6) {
            ghost = document.createElement("div");
            ghost.className = "me-ghost";
            ghost.innerHTML = `<svg viewBox="-13 -13 26 26" class="mp-svg-mini">${ICON[k]}</svg>`;
            document.body.appendChild(ghost);
          }
          if (ghost) { ghost.style.left = ev.clientX + "px"; ghost.style.top = ev.clientY + "px"; }
        };
        const end = ev => {
          b.removeEventListener("pointermove", move); b.removeEventListener("pointerup", end); b.removeEventListener("pointercancel", end);
          if (ghost) {
            ghost.remove();
            const r = stage().getBoundingClientRect();
            if (ev.type === "pointerup" && ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom) {
              beep(k); placeMark(k, toMap(ev.clientX, ev.clientY));
            }
          } else if (ev.type === "pointerup") { beep("item"); setTool(k); }
        };
        b.addEventListener("pointermove", move); b.addEventListener("pointerup", end); b.addEventListener("pointercancel", end);
      });
    });
  }

  // ---------------------------------------------------------------- the map: what a touch does with each tool
  function wireStage() {
    const s = stage(), pts = new Map();
    let g = null, pinch = null;
    const local = e => { const b = s.getBoundingClientRect(); return { x: e.clientX - b.left, y: e.clientY - b.top }; };
    const DRAW = ["line", "dash", "curve", "circle"];
    const tolerance = () => Math.max(6, 14 / view.z);

    s.addEventListener("pointerdown", e => {
      if (e.target.closest(".mp-zoom")) return;
      s.setPointerCapture(e.pointerId);
      const p = local(e);
      pts.set(e.pointerId, p);
      if (pts.size === 2) { // two fingers: zoom and move, and whatever the first finger began is dropped
        if (g && g.kind === "mark") { M().items = JSON.parse(g.snap); draw(); }
        if (g && g.kind === "erase") draw();
        if (g && (g.kind === "grass" || g.kind === "draw")) preview();
        g = null;
        const [a, b] = [...pts.values()];
        pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, z: view.z, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, vx: view.x, vy: view.y };
        return;
      }
      if (pts.size > 2) return;
      const P = toMap(e.clientX, e.clientY), mk = e.target.closest("[data-id]");
      g = { p0: p, moved: 0, P };
      if (e.button === 1 || e.button === 2) g.kind = "pan";
      else if ((tool === "move" || KINDS.includes(tool)) && mk && mk.closest("#me-marks")) // a mark: tap to see it, drag to move it
        Object.assign(g, { kind: "mark", id: mk.dataset.id, snap: snap() });
      else if (tool === "move") g.kind = "pan";
      else if (KINDS.includes(tool)) g.kind = "place";
      else if (tool === "grass") { g.kind = "grass"; g.pts = [P]; preview(g.pts); }
      else if (tool === "erase") { g.kind = "erase"; g.hit = new Set(); erase(P); }
      else if (DRAW.includes(tool)) {
        g.kind = "draw";
        if (!pend || pend.t !== tool) pend = { t: tool };
        if (pend.t === "curve" && pend.b) { // bend: the curve passes through the finger where it touched the line
          const dx = pend.b[0] - pend.a[0], dy = pend.b[1] - pend.a[1], l = dx * dx + dy * dy || 1;
          pend.tt = Math.max(0.15, Math.min(0.85, ((P[0] - pend.a[0]) * dx + (P[1] - pend.a[1]) * dy) / l));
          g.bend = true; bend(P);
        } else if (!pend.a) { pend.a = P; g.first = true; }
        else { pend.b = P; g.second = true; }
        preview(); info();
      }
      if (g.kind === "pan") s.classList.add("drag");
    });

    function bend(P) {
      const t = pend.tt, u = 1 - t;
      pend.c = [0, 1].map(i => r1((P[i] - u * u * pend.a[i] - t * t * pend.b[i]) / (2 * t * u)));
    }
    function erase(P) {
      const tol = tolerance();
      M().items.forEach(it => {
        if (g.hit.has(it.id) || !hits(it, P, tol)) return;
        g.hit.add(it.id);
        const el = svg().querySelector(`[data-id="${it.id}"]`);
        if (el) el.classList.add("me-gone");
      });
    }

    s.addEventListener("pointermove", e => {
      if (!pts.has(e.pointerId)) return;
      const p = local(e), prev = pts.get(e.pointerId);
      pts.set(e.pointerId, p);
      if (pts.size === 2 && pinch) {
        const [a, b] = [...pts.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y) || 1, mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        const lim = limits(), z = Math.min(lim.max, Math.max(lim.min, pinch.z * d / pinch.d));
        const ux = (pinch.mx - pinch.vx) / pinch.z, uy = (pinch.my - pinch.vy) / pinch.z;
        view.z = z; view.x = mx - ux * z; view.y = my - uy * z;
        apply();
        return;
      }
      if (!g || pts.size !== 1) return;
      g.moved = Math.max(g.moved, Math.hypot(p.x - g.p0.x, p.y - g.p0.y));
      const P = toMap(e.clientX, e.clientY);
      if (g.kind === "pan" || (g.kind === "place" && g.moved > 8)) {
        g.kind = "pan"; s.classList.add("drag");
        view.x += p.x - prev.x; view.y += p.y - prev.y;
        apply();
      } else if (g.kind === "mark" && g.moved > 6) {
        const it = byId(g.id);
        it.x = P[0]; it.y = P[1];
        const el = $("me-marks").querySelector(`[data-id="${g.id}"]`);
        if (el) el.setAttribute("transform", `translate(${it.x},${it.y})`);
      } else if (g.kind === "grass") {
        if (dist(P, g.pts[g.pts.length - 1]) > 22) { g.pts.push(P); preview(g.pts); }
      } else if (g.kind === "erase") erase(P);
      else if (g.kind === "draw") {
        if (g.bend) bend(P);
        else if (g.first && g.moved > 8) pend.b = P;
        else if (g.second) pend.b = P;
        preview();
      }
    });

    function finish(e) {
      const ok = e.type === "pointerup";
      if (g.kind === "mark") {
        if (g.moved > 6 && ok) { pushUndo(g.snap); save(); draw(); showMark(byId(g.id), false); }
        else if (g.moved > 6) { M().items = JSON.parse(g.snap); draw(); }
        else if (ok) showMark(byId(g.id), true);
      } else if (g.kind === "place" && ok) placeMark(tool, g.P);
      else if (g.kind === "grass") {
        preview();
        if (ok) { const it = { id: uid(), t: "grass", pts: g.pts, seed: Math.floor(Math.random() * 1e9) }; change(items => items.push(it)); }
      } else if (g.kind === "erase") {
        if (ok && g.hit.size) { const gone = g.hit; change(items => M().items = items.filter(i => !gone.has(i.id))); beep("enemy"); if (gone.has(sel)) { sel = null; info(); } }
        else draw();
      } else if (g.kind === "draw") {
        if (!ok) { pend = null; preview(); info(); return; }
        const done = g.bend || (!(pend.t === "curve") && (g.second || (g.first && pend.b)));
        if (done) commit();
        preview(); info();
      }
    }
    function commit() {
      const c = pend; pend = null;
      let it = null;
      if ((c.t === "line" || c.t === "dash") && dist(c.a, c.b) > 3) it = { t: "line", a: c.a, b: c.b, dash: c.t === "dash" };
      else if (c.t === "circle" && dist(c.a, c.b) > 3) it = { t: "circle", c: c.a, r: r1(dist(c.a, c.b)) };
      else if (c.t === "curve" && c.c) it = { t: "curve", a: c.a, b: c.b, c: c.c };
      if (it) { it.id = uid(); change(items => items.push(it)); beep("item"); }
    }
    const up = e => {
      if (!pts.has(e.pointerId)) return;
      pts.delete(e.pointerId);
      if (pts.size < 2) pinch = null;
      if (!pts.size) {
        s.classList.remove("drag");
        if (g) finish(e);
        g = null;
      }
    };
    s.addEventListener("pointerup", up);
    s.addEventListener("pointercancel", up);
    s.addEventListener("contextmenu", e => e.preventDefault());
    s.addEventListener("wheel", e => { e.preventDefault(); const p = local(e); zoomAt(Math.exp(-e.deltaY * 0.0015), p.x, p.y); }, { passive: false });
  }

  // back: a dialog or a half-drawn line first, then local map > its parent > the quest list; false when not editing
  function back() {
    if (!qid) return false;
    if (dlg) { dlg(null); return true; }
    if (pend) { pend = null; preview(); info(); return true; }
    const q = Q(), m = q && M();
    beep("exit");
    if (m && m.back && q.maps[m.back]) openMap(m.back);
    else { qid = null; mid = null; Maps.kit.renderList(); }
    return true;
  }
  const active = () => qid !== null;
  const reopen = () => openMap(mid);

  return { load, quests, create, open, remove, back, active, reopen };
})();
