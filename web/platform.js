// Storage / file helpers that work the same on the Windows app (pywebview),
// the Android app (AndroidBridge) and a plain browser (localStorage fallback).
const Platform = (() => {
  const isAndroid = () => !!window.AndroidBridge;
  const isDesktop = () => !!(window.pywebview && window.pywebview.api && window.pywebview.api.load);

  const ready = new Promise(resolve => {
    if (window.AndroidBridge) return resolve();
    const hasApi = () => !!(window.pywebview && window.pywebview.api && window.pywebview.api.load);
    if (hasApi()) return resolve();
    window.addEventListener("pywebviewready", () => resolve());
    // the Windows app's "ready" event can fire before this script runs, so also watch for its API itself.
    // A plain browser has no pywebview at all: give up after 1.5 s (15 s if the Windows app is still starting)
    const t0 = Date.now();
    const poll = setInterval(() => {
      const waited = Date.now() - t0;
      if (hasApi() || waited > 15000 || (!window.pywebview && waited > 1500)) { clearInterval(poll); resolve(); }
    }, 50);
  });

  async function load(key) {
    await ready;
    try {
      if (isAndroid()) return AndroidBridge.load(key) || null;
      if (isDesktop()) return (await window.pywebview.api.load(key)) || null;
      return localStorage.getItem("wr_" + key);
    } catch (e) {
      return null;
    }
  }

  async function save(key, text) {
    await ready;
    try {
      if (isAndroid()) return !AndroidBridge.save(key, text).startsWith("ERROR");
      if (isDesktop()) return (await window.pywebview.api.save(key, text)) === "OK";
      localStorage.setItem("wr_" + key, text);
      return true;
    } catch (e) {
      return false;
    }
  }

  async function loadJSON(key, fallback) {
    const t = await load(key);
    if (!t) return fallback;
    try { return JSON.parse(t); } catch (e) { return fallback; }
  }
  const saveJSON = (key, obj) => save(key, JSON.stringify(obj));

  // returns a message for the user
  async function saveImage(dataUrl, name) {
    await ready;
    if (isAndroid()) {
      const r = AndroidBridge.saveImage(dataUrl, name);
      return r.startsWith("ERROR") ? r : T("Saved to Pictures/Fallout Characters");
    }
    if (isDesktop()) {
      const r = await window.pywebview.api.save_image(dataUrl, name);
      return r.startsWith("ERROR") ? r : T("Saved: {file}", { file: r });
    }
    const a = document.createElement("a");
    a.href = dataUrl; a.download = name; a.click();
    return T("Downloaded {file}", { file: name });
  }

  // Download + install a new version. Returns "STARTED", "NEED_PERMISSION" or "ERROR: ...".
  // Progress and the final result arrive through window.onUpdateProgress / window.onUpdateStatus.
  async function installUpdate(url, version, digest) {
    await ready;
    try {
      if (isAndroid()) return AndroidBridge.installUpdate(url, version);
      if (isDesktop()) return await window.pywebview.api.install_update(url, version, digest);
    } catch (e) {
      return "ERROR: " + e.message;
    }
    return "ERROR: updates only work in the Windows and Android apps";
  }

  const canShare = () => isAndroid();
  function shareImage(dataUrl, name, title) {
    if (!isAndroid()) return T("Sharing works in the Android app.");
    const r = AndroidBridge.shareImage(dataUrl, name, title);
    return r.startsWith("ERROR") ? r : "";
  }

  // open a web link outside the app: the Windows app hands it to the default browser, Android opens it
  // in YouTube / the browser (the app sends every non-local link there), a plain browser uses a new tab
  async function openUrl(url) {
    if (isDesktop() && window.pywebview.api.open_url) {
      try { if ((await window.pywebview.api.open_url(url)) === "OK") return; } catch (e) { /* fall back below */ }
    }
    if (isAndroid()) { location.href = url; return; }
    const w = window.open(url, "_blank"); // "noopener" would make this return null even when it worked
    if (w) w.opener = null; else location.href = url;
  }

  // the clipboard: the apps' own (the web view's often refuses), then the browser's. true when it worked.
  async function copyText(text) {
    await ready;
    try {
      if (isAndroid() && AndroidBridge.copyText) return AndroidBridge.copyText(text) === "OK";
      if (isDesktop() && window.pywebview.api.copy_text) return (await window.pywebview.api.copy_text(text)) === "OK";
    } catch (e) { /* try the browser's */ }
    try { if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); return true; } } catch (e) { /* refused */ }
    return false;
  }
  async function readText() {
    await ready;
    try {
      if (isAndroid() && AndroidBridge.readText) return AndroidBridge.readText() || "";
      if (isDesktop() && window.pywebview.api.read_text) return (await window.pywebview.api.read_text()) || "";
    } catch (e) { /* try the browser's */ }
    try { if (navigator.clipboard && navigator.clipboard.readText) return await navigator.clipboard.readText(); } catch (e) { /* refused */ }
    return "";
  }

  // nearby sharing (My Team): other copies of the app on the same Wi-Fi, and paired phones over Bluetooth (Android).
  // op is open / close / share / peers / fetch / btSearch; every call returns a string ("OK", JSON, text or "ERROR: ...").
  const NEARBY = { open: ["nearbyOpen", "nearby_open"], close: ["nearbyClose", "nearby_close"], share: ["nearbyShare", "nearby_share"],
    peers: ["nearbyPeers", "nearby_peers"], fetch: ["nearbyFetch", "nearby_fetch"], btSearch: ["nearbyBtSearch", null] };
  const canNearby = () => (isAndroid() && typeof AndroidBridge.nearbyOpen === "function") || (isDesktop() && !!window.pywebview.api.nearby_open);
  const canBluetooth = () => isAndroid() && typeof AndroidBridge.nearbyBtSearch === "function";
  async function nearby(op, ...args) {
    await ready;
    const [a, d] = NEARBY[op] || [];
    try {
      if (isAndroid() && a && typeof AndroidBridge[a] === "function") return String(AndroidBridge[a](...args));
      if (isDesktop() && d && window.pywebview.api[d]) return String(await window.pywebview.api[d](...args));
    } catch (e) {
      return "ERROR: " + e.message;
    }
    return "ERROR: not available";
  }

  return { ready, load, save, loadJSON, saveJSON, saveImage, canShare, shareImage, installUpdate, openUrl, isAndroid, isDesktop, copyText, readText,
    canNearby, canBluetooth, nearby };
})();
