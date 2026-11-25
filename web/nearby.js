// My Team → Nearby: share your main character with other phones and PCs running Wasteland Recruit on the same
// Wi-Fi (or paired with this phone by Bluetooth), and add the ones they share to your Saved Characters.
// It only runs while the My Team page is open and the app is in front; sharing is off until you turn it on.
// The character travels as the same text as Export (no custom photo), so importing it works the same way.
const Nearby = (() => {
  let running = false, timer = null, deviceId = null, peers = [], added = new Set(), btNote = "";

  const main = () => ROSTER.find(c => c.main) || null;
  async function myId() {
    if (deviceId) return deviceId;
    deviceId = await Platform.load("device_id");
    if (!deviceId || !/^[a-z0-9-]{6,64}$/.test(deviceId)) {
      deviceId = "d" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
      await Platform.save("device_id", deviceId);
    }
    return deviceId;
  }
  async function wantShare() { return (await Platform.load("nearby_share")) === "on"; }

  // what the other devices see before adding the character
  function info(c) {
    const race = c.race || raceFromOrigin(c.origin);
    return JSON.stringify({ name: c.name, lvl: c.level || 1, origin: c.origin || "", race, avatar: typeof avatarFor === "function" ? avatarFor(c) : null,
      dev: Platform.isAndroid() ? "android" : "windows", v: APP_VERSION });
  }
  async function pushShare() {
    const c = main(), on = await wantShare();
    if (on && c) await Platform.nearby("share", info(c), CharCode.exportText(c));
    else await Platform.nearby("share", "", "");
  }

  async function start() {
    if (running || !Platform.canNearby()) { draw(); return; }
    running = true;
    const r = await Platform.nearby("open", await myId());
    if (r !== "OK") { running = false; draw(r); return; }
    await pushShare();
    poll();
    timer = setInterval(poll, 2000);
  }
  async function stop() {
    if (!running) return;
    running = false;
    clearInterval(timer); timer = null; peers = [];
    await Platform.nearby("close");
  }
  async function poll() {
    if (!running) return;
    let list = [];
    try { list = JSON.parse(await Platform.nearby("peers")) || []; } catch (e) { list = []; }
    peers = list.map(p => { let i = {}; try { i = JSON.parse(p.info) || {}; } catch (e) { i = {}; } return { id: String(p.id), via: p.via, i }; })
      .filter(p => typeof p.i.name === "string" && p.i.name.trim());
    draw();
  }

  async function add(p, btn) {
    btn.disabled = true;
    const text = await Platform.nearby("fetch", p.id);
    if (!text || text.startsWith("ERROR")) {
      btn.disabled = false;
      toast(T("Couldn't get {name}. Is My Team still open on the other device?", { name: p.i.name }));
      if (typeof Sfx !== "undefined") Sfx.play("error");
      return;
    }
    let c;
    try { c = CharCode.parseText(text); } catch (e) { btn.disabled = false; toast(e.message); return; }
    await importChar(c);
    added.add(p.id + "|" + p.i.name);
    if (typeof Sfx !== "undefined") Sfx.play("success");
    draw();
  }

  async function btSearch() {
    const r = await Platform.nearby("btSearch");
    const say = {
      NO_BT: "This device has no Bluetooth.", BT_OFF: "Bluetooth is off. Turn it on and try again.",
      NO_PAIRED: "No paired devices. Pair the phones in Android's Bluetooth settings first.",
      NEED_PERMISSION: "Allow Nearby devices for Wasteland Recruit, then tap Search again.",
    }[r];
    if (say) { btNote = T(say); toast(btNote); }
    else if (/^SEARCHING/.test(r)) { btNote = T("Asking {n} paired devices… It can take a few seconds.", { n: +r.split(" ")[1] || 0 }); toast(btNote); }
    else btNote = r;
    draw();
  }
  // Android answers the Bluetooth permission question here
  window.onNearbyPermission = ok => { if (ok) btSearch(); else { btNote = T("Without the Nearby devices permission only Wi-Fi works."); draw(); } };

  async function draw(err) {
    const box = $("nb-box");
    if (!box || currentPage !== "team") return;
    if (!Platform.canNearby()) {
      box.innerHTML = `<p class="muted">${T("Sharing with nearby devices works in the Android and Windows apps.")}</p>`;
      return;
    }
    const c = main(), on = await wantShare();
    const row = p => {
      const done = added.has(p.id + "|" + p.i.name), kind = { human: "Human", ghoul: "Ghoul", mutant: "Super Mutant", robot: "Robot" }[p.i.race] || "";
      return `<div class="card nb-peer"><div class="avatar" data-nbav="${esc(p.id)}"></div>
        <div class="nb-who"><b>${esc(String(p.i.name).slice(0, 60))}</b>
          <small>${T("Level")} ${Math.max(1, Math.min(50, parseInt(p.i.lvl, 10) || 1))}${p.i.origin ? ` &middot; ${esc(T(String(p.i.origin).slice(0, 40)))}` : kind ? ` &middot; ${esc(T(kind))}` : ""}
            &middot; ${p.via === "bt" ? "&#128246; Bluetooth" : `&#128225; ${T("Wi-Fi")}`}</small></div>
        <button class="btn ${done ? "" : "primary"}" data-nbadd="${esc(p.id)}" ${done ? "disabled" : ""}>${done ? `&#10003; ${T("Saved")}` : T("+ Add to saved characters")}</button></div>`;
    };
    box.innerHTML = `<label class="chk nb-share"><input type="checkbox" id="nb-on" ${on && c ? "checked" : ""} ${c ? "" : "disabled"}>
        <span>${c ? T("Share my main character, <b>{name}</b>, with nearby devices", { name: esc(c.name) }) : T("Share my main character with nearby devices")}</span></label>
      ${c ? "" : `<p class="muted nb-note">${T("You have no main character yet: open one in Saved Characters and tap <b>Set as my current main character</b>.")}</p>`}
      ${err ? `<p class="muted nb-note">${esc(String(err))}</p>` : ""}
      <div id="nb-list">${peers.length ? peers.map(row).join("")
        : `<p class="muted nb-note">${T("Looking for nearby devices… Open My Team on the other device too and turn on sharing there.")}</p>`}</div>
      ${Platform.canBluetooth() ? `<div class="bar"><button class="btn" id="nb-bt"><span aria-hidden="true">&#128246;</span> ${T("Search paired Bluetooth devices")}</button></div>
        <p class="muted nb-note">${esc(btNote || T("Bluetooth: pair the two phones first, then tap this button on both."))}</p>` : ""}`;
    box.querySelectorAll("[data-nbav]").forEach(el => {
      const p = peers.find(x => x.id === el.dataset.nbav);
      if (p) setAvatar(el, { race: p.i.race, avatar: p.i.avatar });
    });
    box.querySelectorAll("[data-nbadd]").forEach(b => (b.onclick = () => { const p = peers.find(x => x.id === b.dataset.nbadd); if (p) add(p, b); }));
    const cb = $("nb-on");
    if (cb) cb.onchange = async () => {
      await Platform.save("nearby_share", cb.checked ? "on" : "off");
      await pushShare();
      toast(T(cb.checked ? "Sharing {name} with nearby devices" : "Stopped sharing", { name: c ? c.name : "" }));
    };
    const bb = $("nb-bt");
    if (bb) bb.onclick = btSearch;
  }

  // the page and the app coming and going
  function page(id) { if (id === "team") start(); else stop(); }
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
    else if (currentPage === "team") start();
  });
  // a new main character, or a change to it, is shared straight away
  const refresh = () => { if (running) pushShare(); };

  return { page, refresh, draw };
})();
