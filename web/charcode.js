// Character export and import as plain text. Export writes every detail of a saved character as readable
// "Key: value" lines and copies them to the clipboard; import reads the same text back (in English or Spanish,
// whichever language it was exported in) and builds the character again. Lists use " | " between entries,
// weapon and armor mods go in [square brackets] joined by " + ", and quantities are written as "x5".
const CharCode = (() => {
  const KEYS = {
    name: ["Name", "Nombre"], origin: ["Origin", "Origen"], kind: ["Kind", "Tipo"], level: ["Level", "Nivel"], xp: ["XP", "PX"],
    maxhp: ["Max HP", "PV máx."], carry: ["Carry weight (lbs)", "Carga (lb)"], caps: ["Caps", "Chapas"],
    picture: ["Profile picture", "Foto de perfil"], sprite: ["Walking sprite", "Muñeco animado"], special: ["S.P.E.C.I.A.L.", "S.P.E.C.I.A.L."],
    tags: ["Tag skills", "Habilidades etiquetadas"], skills: ["Skills", "Habilidades"], perks: ["Perks", "Ventajas"],
    weapons: ["Weapons", "Armas"], apparel: ["Armor and clothing", "Armadura y ropa"], robomods: ["Robot modules", "Módulos de robot"],
    items: ["Items", "Objetos"], notes: ["Notes", "Notas"], photo: ["Photo", "Foto"],
  };
  const HEAD = "WASTELAND RECRUIT";
  const es = () => typeof LANG !== "undefined" && LANG === "es";
  const key = id => KEYS[id][es() ? 1 : 0];
  const fold = s => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
  const KINDS = { human: ["Human", "Humano"], ghoul: ["Ghoul", "Necrófago"], mutant: ["Super Mutant", "Supermutante"], robot: ["Robot", "Robot"] };

  // a translated name back to the app's own (English) one
  let rev = null;
  function unT(s) {
    s = String(s).trim();
    if (!rev) { rev = {}; Object.entries(typeof ES !== "undefined" ? ES : {}).forEach(([k, v]) => { if (typeof v === "string" && !(fold(v) in rev)) rev[fold(v)] = k; }); }
    return rev[fold(s)] || s;
  }
  const list = s => String(s || "").split(/\s*\|\s*/).map(x => x.trim()).filter(Boolean);
  // "Name [mod + mod] x20" -> { name, mods, qty }
  function entry(s) {
    let custom = null;
    s = s.replace(/\s*\{(.*)\}/, (all, json) => { try { custom = JSON.parse("{" + json + "}"); } catch (e) { custom = null; } return ""; });
    let m = /^(.*?)\s*(?:\[(.*)\])?\s*(?:[x×]\s*(\d+))?$/i.exec(s.trim());
    const out = { name: custom ? m[1].trim() : unT(m[1]), mods: m[2] ? m[2].split(/\s+\+\s+/).map(x => unT(x)).filter(Boolean) : [], qty: m[3] ? +m[3] : null, custom };
    return out;
  }
  const withMods = (name, mods, custom) => custom ? `${name} ${JSON.stringify(custom).replace(/^\{/, "{").replace(/\|/g, "/")}`
    : T(name) + ((mods || []).length ? ` [${mods.map(x => T(x)).join(" + ")}]` : "");

  // ---------------------------------------------------------------- export
  function exportText(c) {
    const s = c.special || {}, race = c.race || raceFromOrigin(c.origin);
    const L = [`=== ${HEAD} · ${T("CHARACTER")} ===`];
    const add = (id, v) => { if (v !== "" && v != null) L.push(`${key(id)}: ${v}`); };
    add("name", c.name);
    add("origin", c.origin || "");
    add("kind", KINDS[race][es() ? 1 : 0]);
    add("level", c.level || 1);
    add("xp", c.xp || 0);
    add("maxhp", c.maxHp || T("Auto"));
    add("carry", c.carryWeight || T("Auto"));
    add("caps", c.caps || 0);
    if (typeof avatarFor === "function") { add("picture", T(CHOICE_NAMES[avatarFor(c)])); add("sprite", T(CHOICE_NAMES[spriteFor(c)])); }
    add("special", G.SPECIAL.map(a => `${T(a)} ${s[a] != null ? s[a] : 5}`).join(" · "));
    add("tags", (c.tags || []).map(x => T(x)).join(" | ") || "-");
    add("skills", G.SKILL_NAMES.filter(k => (c.skills || {})[k]).map(k => `${T(k)} ${c.skills[k]}`).join(" | ") || "-");
    add("perks", (c.perkCards || []).map(p => `${typeof perkName === "function" ? perkName(p.name) : T(p.name)} ${p.rank || 1}`).join(" | ") || "-");
    add("weapons", (c.weapons || []).map(w => withMods(w.name, w.mods, w.custom) + (w.ammo ? ` x${w.ammo}` : "")).join(" | ") || "-");
    add("apparel", (c.apparel || []).map(a => withMods(a.name, a.mods, a.custom)).join(" | ") || "-");
    if ((c.robomods || []).length || race === "robot") add("robomods", (c.robomods || []).map(x => T(x)).join(" | ") || "-");
    add("items", (c.items || []).map(i => `${T(i.name)} x${i.qty || 1}`).join(" | ") || "-");
    L.push(`${key("notes")}:`);
    if (c.notes) L.push(c.notes);
    if (c.photo) L.push(`${key("photo")}: ${c.photo}`);
    return L.join("\n");
  }

  // ---------------------------------------------------------------- import
  function idOf(label) {
    const f = fold(label);
    return Object.keys(KEYS).find(id => KEYS[id].some(k => fold(k) === f)) || null;
  }
  function parseText(text) {
    const lines = String(text || "").replace(/\r/g, "").split("\n");
    const v = {};
    let inNotes = false, notes = [];
    lines.forEach(line => {
      const m = /^\s*([^:]{1,40}):\s?(.*)$/.exec(line), id = m && !/^data$/i.test(m[1].trim()) ? idOf(m[1]) : null;
      if (id === "photo") { v.photo = m[2].trim(); inNotes = false; return; }
      if (inNotes) { notes.push(line); return; } // everything after "Notes:" belongs to the notes (until the photo)
      if (id === "notes") { inNotes = true; if (m[2].trim()) notes.push(m[2]); return; }
      if (id) v[id] = m[2].trim();
    });
    if (!v.name) throw new Error(T("This text has no character name. Paste the whole text you exported."));
    const num = (x, d) => { const n = parseInt(x, 10); return isNaN(n) ? d : n; };
    const c = { name: v.name.slice(0, 60), origin: (v.origin || "").slice(0, 40), level: Math.min(50, Math.max(1, num(v.level, 1))),
      xp: Math.max(0, num(v.xp, 0)), caps: Math.max(0, num(v.caps, 0)), special: {}, skills: {}, tags: [], perkCards: [],
      weapons: [], apparel: [], robomods: [], items: [], notes: notes.join("\n").trim().slice(0, 2000), photo: /^data:image\//.test(v.photo || "") ? v.photo : null };
    const mh = num(v.maxhp, NaN), cw = num(v.carry, NaN);
    c.maxHp = isNaN(mh) ? null : mh; c.carryWeight = isNaN(cw) ? null : cw;
    const kind = Object.keys(KINDS).find(k => KINDS[k].some(n => fold(n) === fold(v.kind || "")));
    c.race = kind || null;
    const race = kind || raceFromOrigin(c.origin);
    if (typeof CHOICE_NAMES !== "undefined") {
      const look = (s, choices) => { const f = fold(s || ""); return choices.find(k => fold(CHOICE_NAMES[k]) === f || fold(T(CHOICE_NAMES[k])) === f || (k === "human" && /^(vault dweller|morador del refugio)$/.test(f))) || null; };
      c.avatar = look(v.picture, AVATAR_CHOICES[race] || []); c.sprite = look(v.sprite, SPRITE_CHOICES[race] || []);
    }
    G.SPECIAL.forEach(a => (c.special[a] = 5));
    String(v.special || "").split(/\s*[·|,]\s*/).forEach(part => {
      const m = /^(.+?)\s+(\d+)$/.exec(part.trim());
      if (!m) return;
      const a = G.SPECIAL.find(x => fold(x) === fold(m[1]) || fold(T(x)) === fold(m[1]));
      if (a) c.special[a] = Math.min(12, Math.max(1, +m[2]));
    });
    const skill = s => G.SKILL_NAMES.find(k => fold(k) === fold(s) || fold(T(k)) === fold(s));
    G.SKILL_NAMES.forEach(k => (c.skills[k] = 0));
    list(v.skills).forEach(p => { const m = /^(.+?)\s+(\d+)\*?$/.exec(p), k = m && skill(m[1]); if (k) c.skills[k] = Math.min(6, +m[2]); });
    list(v.tags).forEach(p => { const k = skill(p); if (k && !c.tags.includes(k)) c.tags.push(k); });
    list(v.perks).forEach(p => {
      const m = /^(.+?)\s+(\d+)$/.exec(p), name = unT(m ? m[1] : p);
      const known = typeof TT_BY !== "undefined" && (TT_BY[name] || Object.values(TT_BY).find(t => fold(t.n) === fold(name) || fold(T(t.n)) === fold(name)));
      c.perkCards.push({ name: known ? known.n : name, rank: m ? Math.max(1, +m[2]) : 1 });
    });
    list(v.weapons).forEach(p => { const e = entry(p); c.weapons.push(Object.assign({ name: e.name, ammo: e.qty || 0, mods: e.mods }, e.custom ? { custom: e.custom } : {})); });
    list(v.apparel).forEach(p => { const e = entry(p); c.apparel.push(Object.assign({ name: e.name, mods: e.mods }, e.custom ? { custom: e.custom } : {})); });
    list(v.robomods).forEach(p => c.robomods.push(unT(p)));
    list(v.items).forEach(p => { const e = entry(p); c.items.push({ name: e.name, qty: e.qty || 1 }); });
    return c;
  }

  // ---------------------------------------------------------------- clipboard and the import box
  async function copy(text) {
    if (await Platform.copyText(text)) return true;
    // last resort: a hidden text box and the old copy command
    const ta = document.createElement("textarea");
    ta.value = text; ta.setAttribute("readonly", ""); ta.style.cssText = "position:fixed;left:-9999px;top:0";
    document.body.appendChild(ta); ta.select();
    let ok = false;
    try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
    ta.remove();
    return ok;
  }
  async function exportChar(c) {
    const text = exportText(c);
    if (await copy(text)) { toast(T("{name} copied to the clipboard", { name: c.name })); if (typeof Sfx !== "undefined") Sfx.play("success"); return; }
    // the device wouldn't let us copy: show the text so it can be copied by hand
    box(T("Copy {name}'s text", { name: c.name }), T("Your device didn't allow copying automatically. Select all this text and copy it."), text, null);
  }

  // the dialog: a big text box, with Paste and Import buttons (or just Close when showing an export)
  function box(title, hint, value, onImport) {
    let el = $("cc-dlg");
    if (!el) {
      el = document.createElement("div");
      el.className = "modal"; el.id = "cc-dlg";
      el.innerHTML = `<div class="box cc-box"><h3 id="cc-t"></h3><p class="hint" id="cc-h"></p><textarea id="cc-text" rows="14" spellcheck="false"></textarea>
        <div class="bar"><button type="button" class="btn" id="cc-no"></button><button type="button" class="btn" id="cc-paste"></button><button type="button" class="btn primary" id="cc-ok"></button></div></div>`;
      document.body.appendChild(el);
    }
    $("cc-t").textContent = title; $("cc-h").textContent = hint;
    $("cc-text").value = value || ""; $("cc-text").readOnly = !onImport;
    $("cc-no").textContent = onImport ? T("Cancel") : es() ? "Cerrar" : "Close"; // not T("Close"): in Spanish that word is the "Close" range
    $("cc-paste").textContent = "📋 " + T("Paste"); $("cc-paste").hidden = !onImport;
    $("cc-ok").textContent = T("Import"); $("cc-ok").hidden = !onImport;
    el.classList.add("show");
    if (onImport) setTimeout(() => $("cc-text").focus(), 30); else setTimeout(() => $("cc-text").select(), 30);
    const close = () => el.classList.remove("show");
    $("cc-no").onclick = close;
    $("cc-paste").onclick = async () => {
      const t = await Platform.readText();
      if (t) $("cc-text").value = t; else toast(T("Couldn't read the clipboard: long-press the box and choose Paste"));
    };
    $("cc-ok").onclick = () => {
      let c;
      try { c = parseText($("cc-text").value); } catch (e) { toast(e.message); if (typeof Sfx !== "undefined") Sfx.play("error"); return; }
      close(); onImport(c);
    };
  }
  const isOpen = () => $("cc-dlg") && $("cc-dlg").classList.contains("show");
  const closeBox = () => { if (isOpen()) $("cc-dlg").classList.remove("show"); };
  // ask for a character's text; onImport gets the new character (not saved yet)
  const ask = onImport => box(T("Import a character"),
    T("Paste the text of a character exported from Wasteland Recruit (the Export button on a profile), then tap Import."), "", onImport);

  return { exportText, parseText, exportChar, ask, isOpen, closeBox };
})();
