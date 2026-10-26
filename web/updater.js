// Checks this app's GitHub Releases for a newer version and, only after the user agrees,
// asks the Windows or Android app to download and install it.
const Updater = (() => {
  const $u = id => document.getElementById(id);
  let busy = false;

  // "4.10.0" > "4.9.3"
  function compare(a, b) {
    const pa = String(a).split(".").map(n => parseInt(n, 10) || 0);
    const pb = String(b).split(".").map(n => parseInt(n, 10) || 0);
    for (let i = 0; i < 3; i++) if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) - (pb[i] || 0);
    return 0;
  }

  async function latestRelease() {
    const r = await fetch(`https://api.github.com/repos/${UPDATE_REPO}/releases/latest`,
      { headers: { Accept: "application/vnd.github+json" }, cache: "no-store" });
    if (r.status === 404) return null; // no release published yet
    if (!r.ok) throw new Error("GitHub answered " + r.status);
    return r.json();
  }

  const supported = () => Platform.isAndroid() || Platform.isDesktop();
  const wantedExt = () => (Platform.isAndroid() ? ".apk" : ".exe");

  function setStatus(text, pct) {
    $u("upd-status").textContent = text || "";
    const bar = $u("upd-bar");
    bar.hidden = pct == null;
    if (pct != null) bar.firstElementChild.style.width = Math.max(2, Math.min(100, pct)) + "%";
  }
  function close() { if (!busy) $u("upd-modal").classList.remove("show"); }

  // called by the native side while downloading / installing
  window.onUpdateProgress = pct => setStatus(T("Downloading… {n}%", { n: Math.round(pct) }), pct);
  window.onUpdateStatus = (msg, finished) => {
    setStatus(I18N.native(msg), null);
    if (finished) { busy = false; $u("upd-go").disabled = false; $u("upd-later").disabled = false; }
  };

  function ask(rel, version, asset) {
    $u("upd-title").textContent = T("Version {v} is available", { v: version });
    $u("upd-text").textContent = T("You have version {v}. Download and install the update now?", { v: APP_VERSION });
    const notes = (rel.body || "").trim();
    $u("upd-notes").textContent = notes.length > 600 ? notes.slice(0, 600) + "…" : notes;
    $u("upd-notes").hidden = !notes;
    setStatus("", null);
    $u("upd-go").disabled = $u("upd-later").disabled = $u("upd-skip").disabled = false;
    $u("upd-modal").classList.add("show");

    $u("upd-later").onclick = close;
    $u("upd-skip").onclick = async () => { await Platform.save("skip_version", version); close(); };
    $u("upd-go").onclick = async () => {
      busy = true;
      $u("upd-go").disabled = $u("upd-later").disabled = $u("upd-skip").disabled = true;
      setStatus(T("Starting download…"), 0);
      const r = await Platform.installUpdate(asset.browser_download_url, version, asset.digest || "");
      if (r === "NEED_PERMISSION") {
        busy = false;
        $u("upd-go").disabled = $u("upd-later").disabled = false;
        setStatus(T("Android needs your OK first: turn on “Allow from this source” for Wasteland Recruit, come back, and tap Update now again."), null);
      } else if (r && r.startsWith("ERROR")) {
        busy = false;
        $u("upd-go").disabled = $u("upd-later").disabled = $u("upd-skip").disabled = false;
        setStatus(T("Update failed: {1}", { 1: r.replace(/^ERROR:?\s*/, "") }), null);
      }
      // otherwise the native side reports progress and the result itself
    };
  }

  // manual = the user pressed "Check for updates" (then always say something)
  async function check(manual) {
    const say = msg => manual && toast(msg);
    if (!supported()) return say(T("Updates work in the Windows and Android apps."));
    let rel;
    try { rel = await latestRelease(); }
    catch (e) { return say(T("Couldn't reach GitHub to check for updates.")); }
    if (!rel) return say(T("No releases have been published yet."));
    const version = String(rel.tag_name || "").replace(/^v/i, "");
    if (compare(version, APP_VERSION) <= 0) return say(T("You're up to date (version {v}).", { v: APP_VERSION }));
    if (!manual && (await Platform.load("skip_version")) === version) return;
    const asset = (rel.assets || []).find(a => a.name.toLowerCase().endsWith(wantedExt()));
    if (!asset) return say(T("Version {v} is still being built. Try again in a few minutes.", { v: version }));
    ask(rel, version, asset);
  }

  return { check, compare };
})();
