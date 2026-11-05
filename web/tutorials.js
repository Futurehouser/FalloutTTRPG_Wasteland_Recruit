// Tutorials: illustrated guides to the rulebook, one screen each. The wording is this app's own summary
// of the Fallout 2d20 rules (level table, Healing, Damage and Injury, Rounds and Turns, Zones and Distances).
const Tutorials = (() => {
  const MAX_LEVEL = 50;
  const xpTotal = l => 50 * l * (l - 1); // 0, 100, 300, 600, 1000...
  const fmt = n => n.toLocaleString(LANG);

  // ---------------- shared pieces
  const tip = (icon, html) => `<div class="tu-tip"><span>${icon}</span><div>${html}</div></div>`;
  const gain = (big, name, text, cls = "") => `<div class="tu-gain ${cls}"><b>${big}</b><span>${name}</span><small>${text}</small></div>`;
  const stepper = (id, value, label) => `<div class="tu-step"><label class="f" for="${id}">${label}</label><div>
    <button class="btn" type="button" data-step="-1" data-for="${id}" aria-label="-1">&minus;</button>
    <input type="number" id="${id}" value="${value}" inputmode="numeric">
    <button class="btn" type="button" data-step="1" data-for="${id}" aria-label="+1">+</button></div></div>`;
  // the actions you get on a turn: one free, one bought with AP, and the cap
  const budget = (cost, note) => `<div class="tu-budget">
    <div class="tu-pip on"><b>1</b><small>${T("Free every turn")}</small></div>
    <span class="tu-plus">+</span>
    <div class="tu-pip"><b>1</b><small>${cost}</small></div>
    <span class="tu-plus">=</span>
    <div class="tu-pip max"><b>2</b><small>${T("Most per turn")}</small></div>
  </div><p class="hint">${note}</p>`;
  const act = (icon, name, tag, text) => `<div class="tu-act"><span class="ic">${icon}</span><div>
    <b>${name}</b>${tag ? `<em>${tag}</em>` : ""}<p>${text}</p></div></div>`;
  const flow = steps => `<div class="tu-flow">${steps.map(s => `<div class="tu-node ${s[2] || ""}"><span>${s[0]}</span><div>${s[1]}</div></div>`).join('<div class="tu-arrow">&#9660;</div>')}</div>`;

  function wireSteppers(root, min, max, onChange) {
    root.querySelectorAll("[data-step]").forEach(b => (b.onclick = () => {
      const i = $(b.dataset.for);
      i.value = clampN(i.value, min, max) + Number(b.dataset.step);
      i.value = clampN(i.value, min, max);
      onChange();
    }));
  }
  const clampN = (v, min, max) => Math.min(max, Math.max(min, Math.round(Number(v)) || min));

  // ---------------- 1. leveling up
  function levelHtml() {
    return `<div class="card"><h3>${T("What you get every level")}</h3>
      <div class="tu-gains">
        ${gain("+1", T("Max HP"), T("Your health maximum goes up by 1."), "hp")}
        ${gain("+1", T("Skill rank"), T("Pick one skill and raise it by 1, up to rank 6."), "skill")}
        ${gain("+1", T("Perk"), T("Pick one new perk whose requirements you meet."), "perk")}
        ${gain("+0", "S.P.E.C.I.A.L.", T("No points by default. The <b>Intense Training</b> perk adds 1 to any attribute."), "special")}
      </div>
      ${tip("&#127183;", T("<b>Playing with Fallout 76 perk cards?</b> Then each level is <b>+1 to one S.P.E.C.I.A.L.</b> and <b>one new perk card</b>, as the Level up button in Saved Characters explains."))}
    </div>
    <div class="card"><h3>${T("How much XP do I need?")}</h3>
      <div class="row tu-row">${stepper("tu-lvl", 1, T("My current level"))}
        <div><label class="f" for="tu-xp">${T("My current XP (optional)")}</label><input type="number" id="tu-xp" min="0" inputmode="numeric"></div></div>
      <div id="tu-lvl-out"></div>
      ${tip("&#128161;", T("XP is a running total: it never goes back to 0 when you level up. The GM may also skip XP and simply tell you when the party levels up."))}
    </div>`;
  }
  function levelOut() {
    const n = clampN($("tu-lvl").value, 1, MAX_LEVEL), next = xpTotal(n + 1), step = next - xpTotal(n), raw = $("tu-xp").value;
    let prog = "";
    if (raw !== "") {
      const xp = Math.max(0, Number(raw) || 0), left = next - xp, pct = Math.max(0, Math.min(100, ((xp - xpTotal(n)) / step) * 100));
      prog = `<div class="tu-bar"><i style="width:${pct}%"></i></div>
        <p class="tu-left">${left > 0 ? T("You need <b>{n} XP</b> more to reach level {l}.", { n: fmt(left), l: n + 1 }) : T("You have enough XP: <b>time to level up!</b>")}</p>`;
    }
    const rows = [];
    for (let l = Math.max(1, n - 1); l <= n + 2; l++) {
      rows.push(`<div class="tu-rung ${l === n ? "now" : l === n + 1 ? "next" : ""}"><b>${T("Level {n}", { n: l })}</b><span>${fmt(xpTotal(l))} ${T("XP")}</span>
        <small>${l === n ? T("You are here") : l === n + 1 ? T("Next level") : ""}</small></div>`);
    }
    $("tu-lvl-out").innerHTML = `<div class="tu-gains two">
        ${gain(fmt(next), T("Total XP for level {n}", { n: n + 1 }), T("The number your XP has to reach."), "perk")}
        ${gain(fmt(step), T("XP in this level"), T("The gap between level {a} and {b}.", { a: n, b: n + 1 }), "skill")}
      </div>${prog}
      <div class="tu-ladder">${rows.reverse().join("")}</div>
      ${n > 1 ? `<p class="hint">${T("A level {n} character has gained <b>+{g} max HP</b>, <b>{g} skill ranks</b> and <b>{g} perks</b> since level 1.", { n, g: n - 1 })}</p>` : ""}`;
  }
  function levelWire(root) {
    wireSteppers(root, 1, MAX_LEVEL, levelOut);
    $("tu-lvl").oninput = levelOut; $("tu-xp").oninput = levelOut;
    $("tu-lvl").onchange = () => { $("tu-lvl").value = clampN($("tu-lvl").value, 1, MAX_LEVEL); levelOut(); };
    levelOut();
  }

  // ---------------- 2. regain health
  function healHtml() {
    return `<div class="card"><h3>&#9876; ${T("During combat")}</h3>
      <div class="tu-two">
        <div class="tu-box"><h4>&#128137; ${T("Stimpak")}<em>${T("Minor action")}</em></h4>
          <div class="tu-gains two"> ${gain("+4", T("HP"), T("or treats 1 injury"), "hp")}${gain("&#10003;", T("Dying?"), T("Stabilized at once"), "skill")}</div>
          <p>${T("Use <b>Take Chem</b> on yourself or a willing character within reach. You have to be holding it first.")}</p></div>
        <div class="tu-box"><h4>&#129657; ${T("First Aid")}<em>${T("Major action")}</em></h4>
          <p class="tu-test">INT + ${T("Medicine")}</p>
          <p>${T("Difficulty = <b>the patient's injuries</b>, +1 if you treat yourself. If you pass, choose one:")}</p>
          <ul class="tight"><li>${T("Heal HP equal to your <b>Medicine rank</b> (+1 HP per AP spent)")}</li><li>${T("Treat one injury")}</li><li>${T("Stabilize a dying patient")}</li></ul>
          <p>${T("Add a stimpak to the First Aid: <b>+4 HP</b>, and each AP heals <b>2 HP</b>.")}</p></div>
      </div>
      ${tip("&#9888;", T("Only a stable character can recover HP from First Aid. A treated injury stops penalizing but is not healed: if that spot takes damage, roll 1 DC, and on an Effect the wound reopens."))}
    </div>
    <div class="card"><h3>&#127749; ${T("Outside combat")}</h3>
      <div class="tu-gains">
        ${gain("&#128164; 6h", T("Sleep"), T("You recover <b>all</b> lost HP."), "hp")}
        ${gain("&#128716; 8h", T("Well Rested"), T("Safe and comfortable: <b>+2 max HP</b> until you next sleep."), "skill")}
        ${gain("&#127830;", T("Food and drink"), T("The HP listed on the item. Not during combat. Irradiated food: roll 1 DC, on an Effect take 1 Radiation."), "perk")}
        ${gain("&#9762;", T("Radiation"), T("Lowers your max HP and never heals by itself: you need <b>RadAway</b> or similar."), "special")}
      </div>
      <h4>${T("Healing injuries while you sleep")}</h4>
      <p>${T("Make an <b>END + Survival</b> test. Pass and you recover from 1 injury, plus 1 more for every 2 AP. The difficulty depends on your day:")}</p>
      <div class="tu-chips">
        <span><b>1</b>${T("Restful")}</span><span><b>2</b>${T("Light travel")}</span><span><b>3</b>${T("Travel, no combat")}</span><span><b>4</b>${T("Travel and combat")}</span>
      </div>
      <p class="hint">${T("Each untreated injury adds +1 to the complication range. You can only sleep once every 24 hours. Someone giving medical attention can assist that test with their own INT + Medicine, for up to as many patients as their Medicine rank.")}</p>
    </div>
    <div class="card tu-robot"><h3>&#129302; ${T("Mister Handy and other robots")}</h3>
      <p>${T("Machines don't heal on their own: they have to be <b>repaired</b>. The same goes for power armor and vehicles.")}</p>
      <div class="tu-no">
        <span>&#10060; ${T("Stimpaks and chems")}</span><span>&#10060; ${T("Sleep")}</span><span>&#10060; ${T("Food and drink")}</span><span>&#10060; ${T("Medical attention")}</span>
      </div>
      <div class="tu-two">
        <div class="tu-box"><h4>&#128295; ${T("Repair")}<em>${T("First Aid, major action")}</em></h4>
          <p class="tu-test">INT + ${T("Repair")}</p>
          <p>${T("Difficulty = <b>2 + the machine's injuries</b>. If you pass, choose one:")}</p>
          <ul class="tight"><li>${T("Restore HP equal to your <b>Repair rank</b>")}</li><li>${T("Treat one injury")}</li><li>${T("Stabilize a dying machine")}</li></ul></div>
        <div class="tu-box"><h4>&#129520; ${T("Robot repair kit")}<em>${T("Minor action")}</em></h4>
          <p>${T("Works just like a stimpak does for the living: the same <b>4 HP</b>, the same injury treatment, and it stabilizes a dying machine.")}</p>
          <h4>&#128336; ${T("One hour of work")}<em>${T("Outside combat")}</em></h4>
          <p>${T("Restores HP equal to <b>2 × the repairer's Repair rank</b>.")}</p></div>
      </div>
    </div>`;
  }

  // ---------------- 3. dying
  function dyingHtml() {
    return `<div class="card"><h3>${T("What happens at 0 HP")}</h3>
      ${flow([
        ["&#128165;", T("<b>You drop to 0 HP.</b> You take an injury where you were hit. If it was also a critical hit, that's 2 injuries.")],
        ["&#128564;", T("<b>You fall prone and start dying.</b> You're unconscious, you can't act, and First Aid can't give you HP back yet.")],
        ["&#127922;", T("<b>At the start of each of your turns</b> roll <b>END + Survival</b>. Difficulty = your injuries. Complications on 19-20.")],
      ])}
      <div class="tu-fork">
        <div class="tu-node good"><span>&#10003;</span><div>${T("<b>Pass:</b> you hold on, but you're still dying. Next turn, roll again.")}</div></div>
        <div class="tu-node bad"><span>&#9760;</span><div>${T("<b>Fail:</b> your character dies.")}</div></div>
      </div>
      ${tip("&#129656;", T("Any damage taken while dying adds <b>1 more injury</b>, so the next roll gets harder."))}
    </div>
    <div class="card"><h3>${T("How hard is it?")}</h3>
      <div class="tu-row">${stepper("tu-inj", 1, T("Injuries on the dying character"))}</div>
      <div id="tu-inj-out"></div>
    </div>
    <div class="card"><h3>${T("How to save them")}</h3>
      <div class="tu-two">
        <div class="tu-box"><h4>&#128137; ${T("Stimpak")}<em>${T("Minor action")}</em></h4><p>${T("<b>Stabilized at once.</b> No roll needed. It has to be within your reach and in your hand. Robots use a repair kit instead.")}</p></div>
        <div class="tu-box"><h4>&#129657; ${T("First Aid")}<em>${T("Major action")}</em></h4><p>${T("<b>INT + Medicine</b>. Difficulty = their injuries. For robots, <b>INT + Repair</b> at 2 + injuries.")}</p></div>
      </div>
      <h4>${T("Once stabilized")}</h4>
      ${flow([
        ["&#10084;", T("<b>Back to 1 HP</b>, no longer dying and no more rolls to survive. Still unconscious.")],
        ["&#9889;", T("<b>Spend AP right after:</b> 1 AP per extra HP, and 1 AP wakes them up so they can act.")],
      ])}
      ${tip("&#9762;", T("If radiation has lowered their max HP to 0, they can't be stabilized until the radiation is healed."))}
    </div>
    <div class="card"><h3>${T("What each injury does")}</h3>
      <p class="hint">${T("A hit for 5 or more damage after DR is a critical hit, which also causes an injury. It lasts until treated.")}</p>
      <div class="tu-acts two">
        ${act("&#129504;", T("Head"), "", T("You lose your normal actions next turn (AP can still buy them), and vision tests get +2 difficulty."))}
        ${act("&#129728;", T("Torso"), "", T("You bleed: at the end of each of your turns you take 2 DC physical damage, ignoring DR."))}
        ${act("&#128170;", T("Arm"), "", T("You drop what you're holding in that hand, and you can't use that arm for anything."))}
        ${act("&#129461;", T("Leg"), "", T("You fall prone. No more Sprint, and Move becomes a major action."))}
      </div>
    </div>`;
  }
  function dyingOut() {
    const n = clampN($("tu-inj").value, 1, 9);
    $("tu-inj-out").innerHTML = `<div class="tu-gains three">
      ${gain(n, T("Staying alive"), T("END + Survival, their own roll"), "hp")}
      ${gain(n, T("First Aid"), T("INT + Medicine, by an ally"), "skill")}
      ${gain(2 + n, T("Robot repair"), T("INT + Repair, by an ally"), "perk")}
    </div><p class="hint">${T("Difficulties for {n} injuries. Each extra injury makes all three 1 harder.", { n })}</p>`;
  }
  function dyingWire(root) {
    wireSteppers(root, 1, 9, dyingOut);
    $("tu-inj").oninput = dyingOut;
    $("tu-inj").onchange = () => { $("tu-inj").value = clampN($("tu-inj").value, 1, 9); dyingOut(); };
    dyingOut();
  }

  // ---------------- 4. combat range
  const BANDS = ["Close", "Medium", "Long", "Extreme"];
  function rangeHtml() {
    const zone = (cls, label, dist, inner) => `<div class="tu-zone ${cls}"><b>${T(label)}</b><small>${T(dist)}</small><div>${inner}</div></div>`;
    const opts = sel => BANDS.map((b, i) => `<option value="${i}" ${i === sel ? "selected" : ""}>${T(b)}</option>`).join("");
    return `<div class="card"><h3>${T("The map is split into zones")}</h3>
      <p>${T("A zone is a natural area, like a room or a stretch of street. Distance is simply <b>how many zones away</b> something is.")}</p>
      <div class="tu-zones">
        ${zone("z0", "Close", "Same zone", `<i class="tu-reach">&#129485;<u>${T("Reach")}</u></i>`)}
        ${zone("z1", "Medium", "1 zone away", "&#129503;")}
        ${zone("z2", "Long", "2 zones away", "&#129503;")}
        ${zone("z3", "Extreme", "3 or more zones", "&#129503;")}
        <div class="tu-move m1"><span>&#128095; ${T("Move: 1 zone")}</span></div>
        <div class="tu-move m2"><span>&#127939; ${T("Sprint: 2 zones")}</span></div>
      </div>
      ${tip("&#129306;", T("<b>Reach</b> is arm's length. It's where melee attacks work, and an enemy in reach adds <b>+2 difficulty</b> to any test that isn't a melee attack."))}
    </div>
    <div class="card"><h3>${T("Each weapon has an ideal range")}</h3>
      <p>${T("At its ideal range a weapon has no penalty. Every band away from it, <b>nearer or farther</b>, adds <b>+1 difficulty</b>. A sniper rifle is as awkward up close as a pistol is far away.")}</p>
      <div class="row tu-row">
        <div><label class="f" for="tu-wr">${T("My weapon's range")}</label><select id="tu-wr">${opts(0)}</select></div>
        <div><label class="f" for="tu-tr">${T("Distance to the target")}</label><select id="tu-tr">${opts(2)}</select></div>
      </div>
      <div id="tu-range-out"></div>
      <div class="tu-matrix" id="tu-matrix"></div>
      <p class="hint">${T("Add this to the target's Defense to get the difficulty of a ranged or thrown attack. Melee and unarmed attacks only reach targets within arm's length.")}</p>
    </div>
    <div class="card"><h3>&#129518; ${T("Being prone")}</h3>
      <div class="tu-gains two">
        ${gain("+1", T("Attackers at Medium or farther"), T("Harder for them to hit you."), "skill")}
        ${gain("&minus;1", T("Attackers at Close"), T("Easier for them to hit you, melee included."), "hp")}
      </div>
      <p class="hint">${T("You can drop prone at the end of a movement action, and re-roll cover dice while prone. You crawl: Move becomes a major action and you can't Sprint.")}</p>
    </div>`;
  }
  function rangeOut() {
    const wr = Number($("tu-wr").value), tr = Number($("tu-tr").value), d = Math.abs(wr - tr);
    $("tu-range-out").innerHTML = `<div class="tu-result ${d ? "" : "ok"}"><b>${d ? "+" + d : "0"}</b><span>${d ? T("extra difficulty") : T("Ideal range: no penalty")}</span></div>`;
    const head = `<span></span>${BANDS.map((b, i) => `<span class="h ${i === wr ? "on" : ""}">${T(b)}</span>`).join("")}`;
    const rows = BANDS.map((b, r) => `<span class="h side ${r === tr ? "on" : ""}">${T(b)}</span>` + BANDS.map((_, c) => {
      const v = Math.abs(r - c);
      return `<button type="button" class="${r === tr && c === wr ? "hit" : v ? "" : "zero"}" data-r="${r}" data-c="${c}">${v ? "+" + v : "0"}</button>`;
    }).join("")).join("");
    $("tu-matrix").innerHTML = `<small class="tu-axis">${T("Weapon range")} &#8594;</small><div class="tu-cells">${head}${rows}</div><small class="tu-axis">&#8593; ${T("Distance to the target")}</small>`;
    $("tu-matrix").querySelectorAll("button").forEach(b => (b.onclick = () => { $("tu-tr").value = b.dataset.r; $("tu-wr").value = b.dataset.c; rangeOut(); }));
  }
  function rangeWire() { $("tu-wr").onchange = rangeOut; $("tu-tr").onchange = rangeOut; rangeOut(); }

  // ---------------- 5. minor actions
  function minorHtml() {
    return `<div class="card"><h3>${T("How many do I get?")}</h3>
      ${budget(T("Costs 1 AP"), T("Do your actions in any order, but only one movement action per turn."))}</div>
    <div class="card"><h3>${T("The minor actions")}</h3><div class="tu-acts">
      ${act("&#127919;", T("Aim"), "", T("Re-roll 1d20 on the first attack you make this turn."))}
      ${act("&#127890;", T("Draw Item"), "", T("Take out something you carry, or pick up something within reach. You can put an item away at the same time."))}
      ${act("&#128682;", T("Interact"), "", T("Do something simple with your gear or surroundings, like opening a door or pushing a button."))}
      ${act("&#128095;", T("Move"), T("Movement"), T("Go up to 1 zone, to anywhere within Medium range. Or stand up if you're prone."))}
      ${act("&#128137;", T("Take Chem"), "", T("Use a chem you're holding on yourself or a willing character within reach. Not holding it? Draw it first."))}
    </div></div>`;
  }

  // ---------------- 6. major actions
  function majorHtml() {
    const attack = (name, test) => `<li><b>${name}</b><span>${test}</span></li>`;
    return `<div class="card"><h3>${T("How many do I get?")}</h3>
      ${budget(T("Costs 2 AP, +1 difficulty"), T("The extra major action costs 2 AP, and any test made with it is 1 harder."))}</div>
    <div class="card"><h3>${T("The major actions")}</h3><div class="tu-acts">
      ${act("&#9876;", T("Attack"), "", T("Hit a target with a melee or ranged attack. The tests are listed below."))}
      ${act("&#129309;", T("Assist"), "", T("Help another character on their next test. If you haven't acted yet, you can give up your turn to help an ally mid-round."))}
      ${act("&#128226;", T("Command an NPC"), "", T("Choose a major action for an allied NPC. You assist automatically: CHA + Speech for people, CHA + Survival for animals, INT + Science for robots."))}
      ${act("&#128737;", T("Defend"), "AGI + " + T("Athletics"), T("Difficulty = your current Defense. Pass for +1 Defense, and 2 AP buys another +1."))}
      ${act("&#129657;", T("First Aid"), "INT + " + T("Medicine"), T("Difficulty = the patient's injuries, +1 on yourself. Heal HP equal to your Medicine rank, treat an injury or stabilize someone."))}
      ${act("&#128170;", T("Rally"), "END + " + T("Survival"), T("Difficulty 0: keep every AP you generate. The GM may allow another test, like CHA + Speech to inspire your allies."))}
      ${act("&#9203;", T("Ready"), "", T("Say what you expect to happen and which major action you'll take. If it happens before your next turn, you act immediately, interrupting if needed."))}
      ${act("&#127939;", T("Sprint"), T("Movement"), T("Go up to 2 zones, to anywhere within Long range."))}
      ${act("&#127922;", T("Test"), "", T("Any other skill test the GM agrees to."))}
      ${act("&#128164;", T("Pass"), "", T("You choose to do nothing."))}
    </div></div>
    <div class="card"><h3>&#9876; ${T("Which test does my attack use?")}</h3>
      <ul class="tu-attacks">
        ${attack(T("Melee weapon"), "STR + " + T("Melee Weapons"))}
        ${attack(T("Unarmed"), "STR + " + T("Unarmed"))}
        ${attack(T("Small guns"), "AGI + " + T("Small Guns"))}
        ${attack(T("Big guns"), "END + " + T("Big Guns"))}
        ${attack(T("Energy weapons"), "PER + " + T("Energy Weapons"))}
        ${attack(T("Thrown"), "AGI + " + T("Throwing") + " / PER + " + T("Explosives"))}
      </ul>
      <p class="hint">${T("Difficulty = the target's Defense. Ranged and thrown attacks add the range modifier, and aiming at a specific body part adds +1.")}</p>
    </div>`;
  }

  const GUIDES = [
    { id: "level", icon: "&#11014;", name: "Leveling Up", blurb: "What you gain and how much XP you need", html: levelHtml, wire: levelWire },
    { id: "heal", icon: "&#10084;", name: "Regain Health", blurb: "Stimpaks, rest, and repairing Mister Handy", html: healHtml },
    { id: "dying", icon: "&#9760;", name: "Dying", blurb: "0 HP, staying alive and being stabilized", html: dyingHtml, wire: dyingWire },
    { id: "range", icon: "&#127919;", name: "Combat Range", blurb: "Zones, reach and weapon ranges", html: rangeHtml, wire: rangeWire },
    { id: "minor", icon: "&#128095;", name: "Minor Actions", blurb: "The quick things you do on your turn", html: minorHtml },
    { id: "major", icon: "&#9876;", name: "Major Actions", blurb: "The main thing you do on your turn", html: majorHtml },
  ];

  function list() {
    const root = $("tu-body");
    root.innerHTML = `<div class="tu-list">${GUIDES.map((g, i) => `<button class="tu-item" type="button" data-guide="${g.id}">
      <span class="n">${i + 1}</span><span class="ic">${g.icon}</span><span class="tx"><b>${T(g.name)}</b><small>${T(g.blurb)}</small></span><span class="go">&#8250;</span></button>`).join("")}</div>`;
    root.querySelectorAll("[data-guide]").forEach(b => (b.onclick = () => open(b.dataset.guide)));
    $("tu-hint").hidden = false;
  }
  function open(id) {
    const g = GUIDES.find(x => x.id === id), root = $("tu-body"), back = `<button class="btn tu-back" type="button">&#8249; ${T("All guides")}</button>`;
    root.innerHTML = `${back}<div class="tu-title"><span>${g.icon}</span><h3>${T(g.name)}</h3></div>${g.html()}${back}`;
    root.querySelectorAll(".tu-back").forEach(b => (b.onclick = () => { list(); $("main").scrollTop = 0; }));
    if (g.wire) g.wire(root);
    $("tu-hint").hidden = true;
    $("main").scrollTop = 0;
  }
  return { show: list };
})();
