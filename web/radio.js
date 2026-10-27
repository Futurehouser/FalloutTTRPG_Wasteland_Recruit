// Fallout Radio: a Pip-Boy style RADIO tab. Picking a station opens its music on YouTube; the
// oscilloscope on the right keeps drawing a wandering wave like the Pip-Boy's signal display.
const Radio = (() => {
  const $r = id => document.getElementById(id);
  const STATIONS = [
    { name: "Radio Galaxy", game: "Fallout 3", url: "https://www.youtube.com/watch?v=HBSmDAj9zrU" },
    { name: "Radio New Vegas", game: "Fallout: New Vegas", url: "https://www.youtube.com/watch?v=vn1i8xuef8g" },
    { name: "Diamond City Radio", game: "Fallout 4", url: "https://www.youtube.com/watch?v=Yy9La6YXNqI" },
  ];
  let current = -1, raf = null, waves = [], target = [], t = 0;

  // a click like the Pip-Boy's dial
  let audio = null;
  function click() {
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      const t0 = audio.currentTime, o = audio.createOscillator(), g = audio.createGain();
      o.type = "square"; o.frequency.setValueAtTime(1500, t0); o.frequency.exponentialRampToValueAtTime(700, t0 + 0.05);
      g.gain.setValueAtTime(0.05, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.07);
      o.connect(g).connect(audio.destination); o.start(t0); o.stop(t0 + 0.08);
    } catch (e) { /* no audio on this device */ }
  }

  // a new random mix of sine waves; a tuned station gets a stronger, busier signal
  function retune(strong) {
    target = Array.from({ length: 4 }, (_, i) => ({
      amp: (strong ? 0.14 + rnd() * 0.12 : 0.04 + rnd() * 0.05) / Math.pow(i + 1, 1.6),
      freq: (1.5 + rnd() * (strong ? 3 : 2)) * (i + 1),
      speed: (rnd() * 2 - 1) * (strong ? 4 : 1.5),
    }));
    if (!waves.length) waves = target.map(w => Object.assign({}, w));
  }

  function draw() {
    const cv = $r("rd-scope");
    if (!cv || currentPage !== "radio") { raf = null; return; }
    const dpr = window.devicePixelRatio || 1, w = cv.clientWidth, h = cv.clientHeight;
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    const g = cv.getContext("2d");
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    const green = "#3dff86";
    // frame with tick marks, like the Pip-Boy graph
    g.strokeStyle = green; g.globalAlpha = 0.85; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(1, 1); g.lineTo(1, h - 1); g.lineTo(w - 1, h - 1); g.stroke();
    g.globalAlpha = 0.6; g.lineWidth = 1;
    for (let i = 1; i < 10; i++) {
      const x = (w * i) / 10, y = (h * i) / 10, big = i % 5 === 0 ? 10 : 5;
      g.beginPath(); g.moveTo(x, h - 1); g.lineTo(x, h - 1 - big); g.moveTo(1, y); g.lineTo(1 + big, y); g.stroke();
    }
    g.globalAlpha = 0.12;
    g.beginPath(); g.moveTo(0, h / 2); g.lineTo(w, h / 2); g.stroke();
    // the signal: ease every wave towards its target, then add a little static
    waves.forEach((wv, i) => ["amp", "freq", "speed"].forEach(k => (wv[k] += (target[i][k] - wv[k]) * 0.03)));
    t += 1 / 60;
    g.globalAlpha = 1; g.lineWidth = 2; g.shadowColor = green; g.shadowBlur = 8; g.strokeStyle = green;
    g.beginPath();
    for (let x = 0; x <= w; x += 2) {
      const u = x / w;
      let y = 0;
      waves.forEach(wv => (y += wv.amp * Math.sin(2 * Math.PI * (wv.freq * u + wv.speed * t * 0.25))));
      y += (rnd() - 0.5) * 0.008;
      const py = h / 2 - y * h * 0.9;
      x ? g.lineTo(x, py) : g.moveTo(x, py);
    }
    g.stroke(); g.shadowBlur = 0;
    if (rnd() < 0.01) retune(current >= 0); // the signal drifts now and then
    raf = requestAnimationFrame(draw);
  }

  function render() {
    $r("rd-list").innerHTML = STATIONS.map((s, i) =>
      `<button class="rd-st ${i === current ? "on" : ""}" data-i="${i}"><span class="rd-dot">${i === current ? "&#9632;" : ""}</span>${esc(s.name)}</button>`).join("");
    const s = STATIONS[current];
    $r("rd-now").innerHTML = s
      ? `${T("Now playing on YouTube:")} <b>${esc(s.name)}</b> <span class="rd-game">(${esc(s.game)})</span>`
      : T("Select a station");
    $r("rd-list").querySelectorAll(".rd-st").forEach(b => (b.onclick = () => tune(+b.dataset.i)));
  }

  function tune(i) {
    click();
    current = i;
    retune(true);
    render();
    Platform.openUrl(STATIONS[i].url);
  }

  function show() {
    if (!waves.length) retune(false);
    render();
    if (!raf) raf = requestAnimationFrame(draw);
  }
  return { show, STATIONS };
})();
if (typeof currentPage !== "undefined" && currentPage === "radio") Radio.show();
