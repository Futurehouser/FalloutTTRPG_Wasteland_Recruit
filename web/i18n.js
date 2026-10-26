// Languages: Spanish (default) and English. The app's text is written in English and every visible
// string goes through T(); lang_es.js maps that English text to Spanish. Changing the language
// saves the choice and reloads the page, so everything is drawn again in the new language.
const LANGS = {
  es: { name: "Español", flag: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 20"><rect width="30" height="20" fill="#c60b1e"/><rect y="5" width="30" height="10" fill="#ffc400"/></svg>' },
  en: { name: "English", flag: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 30"><clipPath id="c"><path d="M30,15h30v15zv15h-30zh-30v-15zv-15h30z"/></clipPath><rect width="60" height="30" fill="#012169"/><path d="M0,0L60,30M60,0L0,30" stroke="#fff" stroke-width="6"/><path d="M0,0L60,30M60,0L0,30" clip-path="url(#c)" stroke="#c8102e" stroke-width="4"/><path d="M30,0v30M0,15h60" stroke="#fff" stroke-width="10"/><path d="M30,0v30M0,15h60" stroke="#c8102e" stroke-width="6"/></svg>' },
};
const LANG = (() => {
  try { const l = localStorage.getItem("wr_lang"); return LANGS[l] ? l : "es"; } catch (e) { return "es"; }
})();
const ES = {}; // English text -> Spanish text, filled by lang_es.js

// T("Level {n}", { n: 3 }) -> "Nivel 3" in Spanish, "Level 3" in English
function T(key, vars) {
  let s = LANG === "es" && ES[key] != null ? ES[key] : key;
  if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
  return s;
}
// one / many forms: TP(n, "{n} round", "{n} rounds")
const TP = (n, one, many, vars) => T(n === 1 ? one : many, Object.assign({ n }, vars));
// a comma-separated list of game terms ("Close Qtrs, Reliable")
const TL = s => String(s).split(/\s*,\s*/).map(x => T(x)).join(", ");

const I18N = (() => {
  const norm = s => s.replace(/\s+/g, " ").trim();
  const ATTRS = ["placeholder", "title", "aria-label", "alt", "data-title"];

  // the page's own HTML: translate each text piece and the attributes people read
  function translatePage(root) {
    document.documentElement.lang = LANG;
    if (LANG === "en") return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: n => (n.parentElement.closest("script, style") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(n => {
      const k = norm(n.data);
      if (!k || ES[k] == null) return;
      const p = n.parentElement;
      if (p.tagName === "OPTION" && !p.hasAttribute("value")) p.value = k; // keep the value the code reads
      n.data = (/^\s/.test(n.data) ? " " : "") + ES[k] + (/\s$/.test(n.data) ? " " : "");
    });
    root.querySelectorAll("*").forEach(el => ATTRS.forEach(a => {
      const v = el.getAttribute(a);
      if (v && ES[norm(v)] != null) el.setAttribute(a, ES[norm(v)]);
    }));
  }

  async function setLang(l) {
    if (l === LANG || !LANGS[l]) return;
    try { localStorage.setItem("wr_lang", l); } catch (e) { /* the saved copy below still works */ }
    await Platform.save("lang", l);
    const page = typeof currentPage !== "undefined" ? currentPage : "";
    history.replaceState(null, "", location.pathname + location.search + (page && page !== "home" ? "#" + page : ""));
    location.reload(); // reopen on the same tool
  }

  const flagUrl = l => "data:image/svg+xml;charset=utf-8," + encodeURIComponent(LANGS[l].flag);
  function picker() {
    return `<div class="lang-pick" role="group" aria-label="Idioma / Language">${Object.keys(LANGS).map(l =>
      `<button type="button" class="${l === LANG ? "on" : ""}" data-lang="${l}" aria-pressed="${l === LANG}">
        <img src="${flagUrl(l)}" alt="">${LANGS[l].name}</button>`).join("")}</div>`;
  }
  function addPickers() {
    document.querySelector(".home-title").insertAdjacentHTML("beforeend", picker());
    document.querySelector(".drawer .foot").insertAdjacentHTML("beforebegin", `<div class="lang-side">${picker()}</div>`);
    document.querySelectorAll(".lang-pick [data-lang]").forEach(b => (b.onclick = () => setLang(b.dataset.lang)));
  }

  // localStorage can be wiped (private windows, the Windows app's web view): the copy saved
  // through Platform wins, and the page reloads once if it says otherwise
  async function syncSaved() {
    const saved = await Platform.load("lang");
    if (LANGS[saved] && saved !== LANG) setLang(saved);
  }

  function start() {
    translatePage(document.body);
    addPickers();
    syncSaved();
  }

  // messages written by the Windows / Android side of the updater
  const NATIVE = [
    [/^Downloaded version (.+)\. Confirm the install on the next screen\.$/, "Downloaded version {1}. Confirm the install on the next screen."],
    [/^Update failed: (.*)$/s, "Update failed: {1}"],
    [/^Install failed: (.*)$/s, "Install failed: {1}"],
    [/^Updated to (.+)\. Restarting…$/, "Updated to {1}. Restarting…"],
  ];
  function native(msg) {
    msg = String(msg || "");
    for (const [re, key] of NATIVE) {
      const m = re.exec(msg);
      if (m) return T(key, { 1: m[1] });
    }
    return T(msg);
  }

  return { start, translatePage, setLang, native };
})();
