// Interface sounds: short Pip-Boy-style clicks synthesized with WebAudio (no sound files), played for every
// button, link, menu choice, checkbox, list entry and text box change in the app. Different tones for primary
// buttons, delete buttons, going back, opening a section and folding a section open or shut; toasts and
// confirmation boxes chime too. The parts of the app that already have their own sounds (terminal hacking, the
// maps and their editor, the dice roll, the radio dial and Talking Heads' answers) are left alone.
// The switch in the side menu turns all of them off (saved on this device).
const Sfx = (() => {
  const OWN = "#page-hack, #mp-root, #dr-roll, .rd-st, .eg-opt, #eg-say, #nav-sound, [data-own-sound]";
  let on = true, ctx = null, last = 0;
  try { on = localStorage.getItem("wr_sounds") !== "off"; } catch (e) { /* private mode: keep them on */ }

  function tone(f1, f2, secs, type, vol, delay) {
    const t0 = ctx.currentTime + (delay || 0), o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || "square";
    o.frequency.setValueAtTime(f1, t0);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + secs);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + secs);
    o.connect(g).connect(ctx.destination);
    o.start(t0); o.stop(t0 + secs + 0.02);
  }
  const SOUNDS = {
    click: () => tone(1500, 900, 0.035, "square", 0.03),
    primary: () => { tone(880, 0, 0.05, "square", 0.035); tone(1320, 0, 0.07, "square", 0.035, 0.05); },
    danger: () => tone(330, 170, 0.13, "sawtooth", 0.035),
    back: () => tone(1000, 560, 0.06, "triangle", 0.06),
    nav: () => { tone(620, 940, 0.06, "triangle", 0.06); tone(1240, 0, 0.04, "square", 0.02, 0.05); },
    open: () => tone(700, 1200, 0.05, "triangle", 0.06),
    shut: () => tone(1200, 700, 0.05, "triangle", 0.06),
    check: () => tone(1100, 1600, 0.04, "square", 0.025),
    uncheck: () => tone(1600, 1000, 0.04, "square", 0.025),
    select: () => tone(760, 1150, 0.05, "triangle", 0.055),
    type: () => tone(2300, 0, 0.018, "square", 0.012),
    toast: () => { tone(1700, 0, 0.05, "sine", 0.04); tone(2300, 0, 0.07, "sine", 0.035, 0.05); },
    alert: () => { tone(520, 0, 0.07, "square", 0.03); tone(520, 0, 0.07, "square", 0.03, 0.11); },
    success: () => { tone(990, 0, 0.06, "square", 0.03); tone(1320, 0, 0.06, "square", 0.03, 0.06); tone(1760, 0, 0.1, "square", 0.03, 0.12); },
    error: () => tone(240, 180, 0.18, "sawtooth", 0.04),
  };
  function play(kind) {
    if (!on) return;
    const now = performance.now();
    if (now - last < 45) return; // one sound per interaction (a label click also clicks its checkbox)
    last = now;
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === "suspended") ctx.resume();
      (SOUNDS[kind] || SOUNDS.click)();
    } catch (e) { /* no audio on this device */ }
  }

  // which sound a clicked element gets
  function kindOf(el) {
    if (el.closest("#nav, .tile")) return "nav";
    if (el.matches("summary")) return el.parentElement && el.parentElement.open ? "shut" : "open";
    if (el.matches(".danger, [data-del], [data-rmg], [data-rmm], [data-rmc], [data-wrm], [data-arm], [data-irm], [data-mrm], [data-rwx]")) return "danger";
    if (el.matches(".back, [id$='-back'], .tu-back, #go-home, #burger, #scrim, #cr-clear")) return "back";
    if (el.matches(".primary, .big")) return "primary";
    return "click";
  }
  const CLICKABLE = "button, a[href], summary, label.btn, [role=button], .entry, span.chip, .tile";
  document.addEventListener("click", e => {
    const el = e.target.closest(CLICKABLE);
    if (!el || el.disabled || el.closest(OWN)) return;
    api.play(kindOf(el));
  }, true);
  document.addEventListener("change", e => {
    const el = e.target;
    if (!el.matches || el.closest(OWN)) return;
    if (el.matches("input[type=checkbox], input[type=radio]")) api.play(el.checked ? "check" : "uncheck");
    else if (el.matches("select")) api.play("select");
    else if (el.matches("input[type=file]")) api.play("primary");
    else if (el.matches("input, textarea")) api.play("type");
  }, true);

  function setOn(v) {
    on = !!v;
    try { localStorage.setItem("wr_sounds", on ? "on" : "off"); } catch (e) { /* only this session */ }
    if (on) play("check");
  }
  const api = { play, setOn, isOn: () => on };
  return api;
})();
