// The web version on GitHub Pages (what iPhones use): keep a copy for offline use, ask the browser not to
// clear the saved characters, and show iPhone users how to put the app on their Home Screen.
// Does nothing in the Windows and Android apps, which load these same files from inside the app.
const WebApp = (() => {
  const isWeb = () => !window.AndroidBridge && !window.pywebview && /^https?:$/.test(location.protocol) && !/^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  const standalone = () => window.navigator.standalone === true || (window.matchMedia && matchMedia("(display-mode: standalone)").matches);
  const ios = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  if (isWeb()) {
    if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(() => {});
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  }

  // iPhone/iPad Safari, not yet on the Home Screen: a small note at the bottom, until it's closed
  function hint() {
    if (!isWeb() || !ios() || standalone()) return;
    try { if (localStorage.getItem("wr_a2hs_closed") === "1") return; } catch (e) { /* private mode */ }
    const d = document.createElement("div");
    d.id = "a2hs";
    d.innerHTML = `<span>${T("Install it on your iPhone: tap <b>Share</b> {icon} and then <b>Add to Home Screen</b>.", { icon: '<span aria-hidden="true">&#11014;&#65039;</span>' })}</span>
      <button class="btn" id="a2hs-x" aria-label="${T("Close this note")}">&#10005;</button>`;
    document.body.appendChild(d);
    $("a2hs-x").onclick = () => { d.remove(); try { localStorage.setItem("wr_a2hs_closed", "1"); } catch (e) { /* private mode */ } };
  }
  setTimeout(hint, 2500);

  return { isWeb, standalone, ios };
})();
