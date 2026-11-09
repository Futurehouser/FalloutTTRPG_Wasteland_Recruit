// Dice Roller: pick a die (d20, combat die or plain d6) and how many, then roll. The dice tumble and
// flicker through faces before they land, with a rattle. d20 rolls can also count successes against a
// target number, the way a Fallout 2d20 skill test does.
const Dice = (() => {
  const MAX = 30;
  const SPIN_MS = 650;   // how long the dice tumble before landing
  const STAGGER_MS = 45; // each die lands a moment after the one before
  const KEEP = 6;        // past rolls listed under the result
  const CD = [1, 2, 0, 0, 1, 1]; // combat die faces 1-6: points; 5 and 6 also show an Effect
  const TYPES = {
    d20: { label: "d20", sides: 20, blurb: "Skill tests" },
    cd: { label: "Combat die", sides: 6, blurb: "Damage: points and Effects" },
    d6: { label: "d6", sides: 6, blurb: "A plain six-sided die" },
  };
  let type = "d20", rolling = false, history = [], wired = false;

  const rnd = n => 1 + Math.floor(Math.random() * n);
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, Math.round(Number(v)) || lo));

  // ---------------- sound: a short rattle of clicks, then a thud as the dice land
  let audio = null;
  function click(at, freq, vol) {
    const t = audio.currentTime + at, o = audio.createOscillator(), g = audio.createGain();
    o.type = "triangle"; o.frequency.setValueAtTime(freq, t); o.frequency.exponentialRampToValueAtTime(freq * 0.5, t + 0.04);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    o.connect(g).connect(audio.destination); o.start(t); o.stop(t + 0.06);
  }
  function rattle(n) {
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === "suspended") audio.resume();
      const clicks = Math.min(14, 5 + n);
      for (let i = 0; i < clicks; i++) click((i / clicks) * (SPIN_MS / 1000) + Math.random() * 0.02, 900 + Math.random() * 900, 0.06);
      click(SPIN_MS / 1000 + 0.02, 160, 0.18);
    } catch (e) { /* no audio on this device */ }
  }

  // ---------------- drawing one die
  function face(kind, v) {
    if (kind === "cd") {
      const pts = CD[v - 1], fx = v >= 5;
      return `${pts ? `<b>${pts}</b>` : ""}${fx ? "<i>&#10040;</i>" : ""}`;
    }
    return `<b>${v}</b>`;
  }
  function dieClass(kind, v, crit, target) {
    const c = ["dr-die", "dr-" + kind];
    if (kind === "cd") c.push(v >= 5 ? "fx" : CD[v - 1] ? "" : "blank");
    if (kind === "d20" && v != null) {
      if (v === 20) c.push("bad");
      else if (v <= crit) c.push("crit");
      else if (target && v <= target) c.push("ok");
      else if (target) c.push("miss");
    }
    return c.join(" ");
  }

  // ---------------- what the roll adds up to
  function summary(kind, vals, target, crit) {
    const g = (big, name, note, cls) => `<div class="tu-gain ${cls}"><b>${big}</b><span>${name}</span><small>${note}</small></div>`;
    if (kind === "cd") {
      const pts = vals.reduce((s, v) => s + CD[v - 1], 0), fx = vals.filter(v => v >= 5).length;
      return g(pts, TP(pts, "point of damage", "points of damage"), TP(vals.length, "{n} die, average {a}", "{n} dice, average {a}", { a: (Math.round(vals.length * 50 / 6) / 10).toLocaleString(LANG) }), "hp") +
        g(fx, TP(fx, "Effect", "Effects"), fx ? T("Triggers the weapon's damage effects.") : T("No damage effects this time."), "perk");
    }
    const sum = vals.reduce((s, v) => s + v, 0);
    if (kind === "d6") return g(sum, T("Total"), T("Highest {h}, lowest {l}", { h: Math.max(...vals), l: Math.min(...vals) }), "perk");
    const comps = vals.filter(v => v === 20).length;
    const crits = vals.filter(v => v !== 20 && v <= crit).length;
    let html = "";
    if (target) {
      const succ = vals.reduce((s, v) => s + (v === 20 ? 0 : v <= crit ? 2 : v <= target ? 1 : 0), 0);
      html += g(succ, TP(succ, "success", "successes"), crits ? TP(crits, "{n} critical counts double", "{n} criticals count double") : T("Each die at or under {t} is a success", { t: target }), "skill");
    } else {
      html += g(sum, T("Total"), T("Highest {h}, lowest {l}", { h: Math.max(...vals), l: Math.min(...vals) }), "perk");
    }
    html += g(comps, TP(comps, "complication", "complications"), comps ? T("A 20 brings trouble.") : T("No 20s rolled."), "hp");
    return html;
  }

  // ---------------- rolling
  function roll() {
    if (rolling) return;
    const n = clamp($("dr-n").value, 1, MAX), kind = type, sides = TYPES[kind].sides;
    $("dr-n").value = n;
    const target = kind === "d20" ? clamp($("dr-target").value, 0, 40) || 0 : 0;
    const crit = kind === "d20" ? Math.max(1, clamp($("dr-tag").value, 0, 6)) : 0;
    const vals = Array.from({ length: n }, () => rnd(sides));
    rolling = true;
    $("dr-roll").disabled = true;
    rattle(n);
    const tray = $("dr-tray");
    tray.innerHTML = vals.map((_, i) => `<span class="${dieClass(kind, null)} tumbling" style="animation-delay:${i * STAGGER_MS}ms">${face(kind, rnd(sides))}</span>`).join("");
    $("dr-sum").innerHTML = "";
    const dice = [...tray.children];
    const flicker = setInterval(() => dice.forEach(d => {
      if (!d.classList.contains("tumbling")) return;
      const v = rnd(sides);
      d.className = dieClass(kind, null) + " tumbling";
      if (kind === "cd") d.classList.add(...(v >= 5 ? ["fx"] : CD[v - 1] ? [] : ["blank"]));
      d.innerHTML = face(kind, v);
    }), 70);
    dice.forEach((d, i) => setTimeout(() => {
      d.className = dieClass(kind, vals[i], crit, target) + " landed";
      d.innerHTML = face(kind, vals[i]);
    }, SPIN_MS + i * STAGGER_MS));
    setTimeout(() => {
      clearInterval(flicker);
      rolling = false;
      $("dr-roll").disabled = false;
      $("dr-sum").innerHTML = summary(kind, vals, target, crit);
      history.unshift({ kind, vals, target, crit });
      history = history.slice(0, KEEP);
      renderHistory();
    }, SPIN_MS + n * STAGGER_MS + 60);
  }

  function renderHistory() {
    const box = $("dr-history");
    box.hidden = history.length < 2;
    $("dr-past").innerHTML = history.slice(1).map(h => {
      const what = `${h.vals.length}${h.kind === "cd" ? " DC" : h.kind}`;
      const res = h.kind === "cd" ? `${h.vals.reduce((s, v) => s + CD[v - 1], 0)} · ${h.vals.filter(v => v >= 5).length} ✸`
        : h.vals.join(", ");
      return `<li><b>${esc(what)}</b><span>${esc(res)}</span></li>`;
    }).join("");
  }

  function setType(k) {
    type = k;
    document.querySelectorAll("#dr-types button").forEach(b => b.classList.toggle("on", b.dataset.type === k));
    $("dr-test").hidden = k !== "d20";
    $("dr-tray").innerHTML = ""; $("dr-sum").innerHTML = "";
    $("dr-hint").textContent = T(TYPES[k].blurb);
  }

  function show() {
    if (wired) return;
    wired = true;
    $("dr-types").innerHTML = Object.entries(TYPES).map(([k, t]) =>
      `<button type="button" data-type="${k}"><span class="dr-die dr-${k} ${k === "cd" ? "fx" : ""}">${face(k, k === "d20" ? 20 : 6)}</span><b>${T(t.label)}</b></button>`).join("");
    document.querySelectorAll("#dr-types button").forEach(b => (b.onclick = () => setType(b.dataset.type)));
    document.querySelectorAll("#page-dice [data-step]").forEach(b => (b.onclick = () => {
      const i = $(b.dataset.for), lo = Number(i.min), hi = Number(i.max);
      i.value = clamp(clamp(i.value, lo, hi) + Number(b.dataset.step), lo, hi);
    }));
    $("dr-roll").onclick = roll;
    setType(type);
  }

  return { show };
})();
