// Fallout Radio: a Pip-Boy style RADIO tab. Picking a station opens its music on YouTube; the
// oscilloscope on the right keeps drawing a wandering wave like the Pip-Boy's signal display.
// Tapping the scope changes the wave's shape; every 10 taps the screen swaps to New Vegas amber and back.
const Radio = (() => {
  const $r = id => document.getElementById(id);
  const STATIONS = [
    { name: "Radio Galaxy", game: "Fallout 3", url: "https://www.youtube.com/watch?v=HBSmDAj9zrU" },
    { name: "Radio New Vegas", game: "Fallout: New Vegas", url: "https://www.youtube.com/watch?v=vn1i8xuef8g" },
    { name: "Diamond City Radio", game: "Fallout 4", url: "https://www.youtube.com/watch?v=Yy9La6YXNqI" },
  ];
  let current = -1, raf = null, waves = [], target = [], t = 0, taps = 0, shape = "sine", noise = 0.008;
  let amber = (() => { try { return localStorage.getItem("wr_radio_amber") === "1"; } catch (e) { return false; } })();

  // wave shapes the scope can switch between, each fed a phase in turns
  const SHAPES = {
    sine: p => Math.sin(2 * Math.PI * p),
    square: p => Math.tanh(5 * Math.sin(2 * Math.PI * p)),
    triangle: p => (2 / Math.PI) * Math.asin(Math.sin(2 * Math.PI * p)),
    saw: p => 2 * (p - Math.floor(p)) - 1,
    pulse: p => { const f = p - Math.floor(p); return f < 0.12 ? Math.sin(f / 0.12 * Math.PI) * 1.6 : 0; },
    am: p => Math.sin(2 * Math.PI * p) * Math.sin(2 * Math.PI * p * 0.11),
    static: p => Math.sin(2 * Math.PI * p) * 0.4,
  };

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
    const green = amber ? "#ffb642" : "#3dff86";
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
      waves.forEach(wv => (y += wv.amp * SHAPES[shape](wv.freq * u + wv.speed * t * 0.25)));
      y += (rnd() - 0.5) * noise;
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

  function setColor(flick) {
    const pip = document.querySelector("#page-radio .pip");
    if (!pip) return;
    pip.classList.toggle("amber", amber);
    if (flick) { pip.classList.remove("flick"); void pip.offsetWidth; pip.classList.add("flick"); }
  }

  // a tap on the scope picks a different wave shape at random; every 10th tap swaps green and amber
  function tap() {
    click();
    shape = sample(Object.keys(SHAPES).filter(k => k !== shape), 1)[0];
    noise = shape === "static" ? 0.12 + rnd() * 0.1 : rnd() < 0.3 ? 0.03 : 0.008;
    retune(current >= 0 || rnd() < 0.5);
    if (++taps % 10 === 0) {
      amber = !amber;
      try { localStorage.setItem("wr_radio_amber", amber ? "1" : "0"); } catch (e) { /* not saved */ }
      setColor(true);
    }
  }

  function show() {
    setColor(false);
    const sc = document.querySelector("#page-radio .rd-scope");
    if (sc && !sc.onclick) sc.onclick = tap;
    if (!waves.length) retune(false);
    render();
    if (!raf) raf = requestAnimationFrame(draw);
  }
  return { show, STATIONS };
})();
if (typeof currentPage !== "undefined" && currentPage === "radio") Radio.show();
