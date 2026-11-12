// Tutorials: illustrated guides to the rulebook, one screen each. The wording is this app's own summary
// of the Fallout 2d20 rules (level table, Healing, Damage and Injury, Rounds and Turns, Zones and Distances,
// combat dice and damage effects, and how to create a character).
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

  // ---------------- 7. combat dice
  // the six faces of the d6 combat die: damage points and whether the face shows an Effect
  const CD = [{ pts: 1, fx: false }, { pts: 2, fx: false }, { pts: 0, fx: false }, { pts: 0, fx: false }, { pts: 1, fx: true }, { pts: 1, fx: true }];
  const MAX_DICE = 20;
  const die = (f, cls = "") => {
    const d = CD[f - 1];
    return `<span class="tu-die ${d.fx ? "fx" : d.pts ? "" : "blank"} ${cls}" aria-label="${f}">${d.pts ? `<b>${d.pts}</b>` : ""}${d.fx ? `<i>&#10040;</i>` : ""}</span>`;
  };
  function diceHtml() {
    const face = f => {
      const d = CD[f - 1];
      return `<div class="tu-face">${die(f)}<small>${T("Face {n}", { n: f })}</small>
        <b>${TP(d.pts, "{n} point", "{n} points")}</b><span>${d.fx ? T("+ 1 Effect") : "&nbsp;"}</span></div>`;
    };
    const fx = (name, text) => `<div class="tu-act"><span class="ic">&#10040;</span><div><b>${T(name)}</b><p>${T(text)}</p></div></div>`;
    return `<div class="card"><h3>${T("The six faces")}</h3>
      <p>${T("Damage is rolled with <b>combat dice</b> (DC): six-sided dice with special faces. Add up the points of every die: that total is the damage. Faces 5 and 6 also show an <b>Effect</b> symbol.")}</p>
      <div class="tu-faces">${[1, 2, 3, 4, 5, 6].map(face).join("")}</div>
      <div class="tu-chips dice">
        <span><b>0</b>${T("2 faces in 6")}</span><span><b>1</b>${T("3 faces in 6")}</span><span><b>2</b>${T("1 face in 6")}</span><span><b>&#10040;</b>${T("Effect: 1 roll in 3")}</span>
      </div>
      ${tip("&#128202;", T("On average each die is worth a little under <b>1 point</b> (5 points every 6 dice), and one die in three shows an Effect. So 6 DC averages about 5 damage and 2 Effects."))}
    </div>
    <div class="card"><h3>&#127922; ${T("Try a roll")}</h3>
      <div class="row tu-row">${stepper("tu-cd", 4, T("Combat dice to roll"))}
        <div class="tu-rollbtn"><button class="btn primary" type="button" id="tu-roll">&#127922; ${T("Roll")}</button></div></div>
      <div id="tu-roll-out"></div>
    </div>
    <div class="card"><h3>&#10040; ${T("What Effects do")}</h3>
      <p>${T("Effects only matter if the weapon has a <b>damage effect</b>. Each Effect you roll triggers them, and some get stronger with more Effects:")}</p>
      <div class="tu-acts">
        ${fx("Vicious", "+1 damage for each Effect.")}
        ${fx("Piercing X", "Ignore X points of the target's damage resistance for each Effect.")}
        ${fx("Radioactive", "The target also takes 1 Radiation damage for each Effect.")}
        ${fx("Burst", "Each Effect hits one more target close to the first one. Every extra target costs one more shot of ammo.")}
        ${fx("Spread", "Each Effect hits the target again in a random location, for half the damage rolled.")}
        ${fx("Breaking", "Each Effect wears down the target's cover by 1 die. If the target has no cover, the hit location loses 1 point of that damage type's resistance.")}
        ${fx("Persistent", "With at least one Effect, the target takes the weapon's damage again at the end of their next turns, for as many turns as Effects rolled. They can spend a major action on a test to stop it.")}
        ${fx("Stun", "With at least one Effect, the target can't take their normal actions on their next turn.")}
      </div>
      ${tip("&#9762;", T("Effects also show up outside combat: eating irradiated food, for example, means rolling 1 DC and taking 1 Radiation damage on an Effect."))}
    </div>`;
  }
  function diceRoll() {
    const n = clampN($("tu-cd").value, 1, MAX_DICE);
    $("tu-cd").value = n;
    const faces = Array.from({ length: n }, () => 1 + Math.floor(Math.random() * 6));
    const pts = faces.reduce((s, f) => s + CD[f - 1].pts, 0), fx = faces.filter(f => CD[f - 1].fx).length;
    $("tu-roll-out").innerHTML = `<div class="tu-rolled">${faces.map((f, i) => die(f, "rolling").replace("<span", `<span style="animation-delay:${i * 40}ms"`)).join("")}</div>
      <div class="tu-gains two">${gain(pts, TP(pts, "point of damage", "points of damage"), TP(n, "{n} die, average {a}", "{n} dice, average {a}", { a: fmt(Math.round(n * 50 / 6) / 10) }), "hp")}
        ${gain(fx, TP(fx, "Effect", "Effects"), fx ? T("Triggers the weapon's damage effects.") : T("No damage effects this time."), "perk")}</div>`;
  }
  function diceWire(root) {
    wireSteppers(root, 1, MAX_DICE, () => {});
    $("tu-roll").onclick = diceRoll;
    diceRoll();
  }

  // ---------------- 8. how to create your character (core rulebook, chapter three, pages 50-81)
  // Bilingual on the spot (B(english, spanish)) because it's a long guide.
  const B = (en, es) => (LANG === "es" ? es : en);
  const CR_ORIGINS = {
    survivor: { name: ["Survivor", "Superviviente"], cap: {}, plus: {} },
    vault: { name: ["Vault Dweller", "Morador del Refugio"], cap: {}, plus: {} },
    bos: { name: ["Brotherhood Initiate", "Iniciado de la Hermandad"], cap: {}, plus: {} },
    ghoul: { name: ["Ghoul", "Necrófago"], cap: {}, plus: {} },
    mutant: { name: ["Super Mutant", "Supermutante"], cap: { STR: 12, END: 12, INT: 6, CHA: 6 }, plus: { STR: 2, END: 2 } },
    handy: { name: ["Mister Handy", "Mister Handy"], cap: {}, plus: {} },
  };
  const CR_ATTR = ["STR", "PER", "END", "CHA", "INT", "AGI", "LCK"];
  const crState = { origin: "survivor", sp: { STR: 5, PER: 5, END: 5, CHA: 5, INT: 5, AGI: 5, LCK: 5 } };
  const crStep = (n, title, body, sheet) => `<div class="card tu-cstep"><h3><span class="tu-cn">${n}</span>${title}</h3>${body}
    ${sheet ? `<div class="tu-sheet"><b>&#128221; ${B("On your sheet", "En tu hoja")}</b><span>${sheet}</span></div>` : ""}</div>`;
  const crTable = (head, rows) => `<div class="tu-ctable"><div class="tu-crow tu-chead">${head.map(x => `<b>${x}</b>`).join("")}</div>${rows.map(r => `<div class="tu-crow">${r.map(x => `<span>${x}</span>`).join("")}</div>`).join("")}</div>`;

  function createHtml() {
    const sk = [["Athletics", "STR"], ["Barter", "CHA"], ["Big Guns", "END"], ["Energy Weapons", "PER"], ["Explosives", "PER"], ["Lockpick", "PER"], ["Medicine", "INT"],
      ["Melee Weapons", "STR"], ["Pilot", "PER"], ["Repair", "INT"], ["Science", "INT"], ["Small Guns", "AGI"], ["Sneak", "AGI"], ["Speech", "CHA"], ["Survival", "END"],
      ["Throwing", "AGI"], ["Unarmed", "STR"]];
    const tagItems = [["Athletics", B("Casual clothing, 1 Buffout", "Ropa informal, 1 Buffout")], ["Barter", B("2d20 extra caps", "2d20 chapas extra")],
      ["Big Guns", B("4+2 CD shots of flamer fuel", "4+2 DC disparos de combustible de lanzallamas")], ["Energy Weapons", B("Fusion cell with 6+3 CD shots", "Célula de fusión con 6+3 DC disparos")],
      ["Explosives", B("2 Molotov cocktails or 2 baseball grenades", "2 cócteles molotov o 2 granadas de béisbol")], ["Lockpick", B("4+2 CD bobby pins", "4+2 DC horquillas")],
      ["Medicine", B("1 first aid kit, 1 Stimpak", "1 botiquín, 1 Estimulante")], ["Melee Weapons", B("Machete or baseball bat", "Machete o bate de béisbol")],
      ["Pilot", B("Broken car parts (5 common scrap)", "Piezas de coche rotas (5 de chatarra común)")], ["Repair", B("Multi-tool", "Multiherramienta")],
      ["Science", B("Lab coat, 1 dose of Mentats", "Bata de laboratorio, 1 dosis de Mentats")], ["Small Guns", B("6+3 CD extra rounds of an ammo you already have", "6+3 DC balas extra de una munición que ya tengas")],
      ["Sneak", B("1 dose of Calmex", "1 dosis de Calmex")], ["Speech", B("Formal hat, formal clothing", "Sombrero formal, ropa formal")],
      ["Survival", B("2 purified water, 1 iguana on a stick", "2 aguas depuradas, 1 iguana en un palo")], ["Throwing", B("4+2 CD throwing knives or 2+1 CD tomahawks", "4+2 DC cuchillos arrojadizos o 2+1 DC tomahawks")],
      ["Unarmed", B("Knuckles", "Puño americano")]];
    return `<div class="card"><p>${B("Creating a character takes the six steps of the core rulebook's chapter three (pages 50-81). Have a blank character sheet and a pencil ready, and talk with your group and the GM first: the GM may limit the origins, and a party works best when its characters are good at different things.",
        "Crear un personaje lleva los seis pasos del capítulo tres del libro básico (páginas 50-81). Ten preparada una hoja de personaje en blanco y un lápiz, y habla antes con tu grupo y el DJ: el DJ puede limitar los orígenes, y un grupo funciona mejor cuando cada personaje destaca en algo distinto.")}</p>
      <div class="tu-cflow">${[B("Origin", "Origen"), "S.P.E.C.I.A.L.", B("Skills", "Habilidades"), B("Perk", "Ventaja"), B("Derived stats", "Estadísticas derivadas"), B("Equipment", "Equipo")]
        .map((x, i) => `<span><b>${i + 1}</b>${x}</span>`).join("")}</div>
      <div class="bar"><button class="btn" type="button" data-go-page="create">&#9998; ${B("Fill it in with Create Character", "Rellénalo con Crear personaje")}</button>
        <button class="btn" type="button" data-go-page="chargen">&#127922; ${B("Or roll one at random", "O genera uno al azar")}</button></div></div>

    ${crStep(1, B("Choose your origin", "Elige tu origen"), `<p>${B("Your origin is who you were before the adventure. It gives you a <b>trait</b> (a special rule), sometimes an extra tag skill or mutations, and decides which equipment packs you can pick in step 6.",
        "Tu origen es quién eras antes de la aventura. Te da un <b>rasgo</b> (una regla especial), a veces una habilidad etiquetada extra o mutaciones, y decide qué paquetes de equipo puedes elegir en el paso 6.")}</p>
      ${crTable([B("Origin", "Origen"), B("Trait, in short", "Rasgo, en resumen")], [
        [B("<b>Brotherhood Initiate</b> (p. 51)", "<b>Iniciado de la Hermandad</b> (p. 51)"), B("<i>The Chain That Binds:</i> one extra tag skill (Energy Weapons, Science or Repair); you must obey your superiors.", "<i>La cadena que ata:</i> una habilidad etiquetada extra (Armas de energía, Ciencia o Reparar); debes obedecer a tus superiores.")],
        [B("<b>Ghoul</b> (p. 52)", "<b>Necrófago</b> (p. 52)"), B("<i>Necrotic Post-Human:</i> immune to radiation, which heals you; Survival is tagged for free; some people distrust you.", "<i>Posthumano necrótico:</i> inmune a la radiación, que te cura; Supervivencia etiquetada gratis; alguna gente desconfía de ti.")],
        [B("<b>Super Mutant</b> (p. 53)", "<b>Supermutante</b> (p. 53)"), B("<i>Forced Evolution:</i> +2 STR and END (up to 12), INT and CHA at most 6, skills at most 4; immune to radiation and poison.", "<i>Evolución forzada:</i> +2 a FUE y RES (hasta 12), INT y CAR como mucho 6, habilidades como mucho 4; inmune a la radiación y al veneno.")],
        [B("<b>Mister Handy</b> (p. 54)", "<b>Mister Handy</b> (p. 54)"), B("<i>Mister Handy Robot:</i> 360° vision, immune to radiation and poison, no food or chems, hovers, three arm attachments, healed only by repairs.", "<i>Robot Mister Handy:</i> visión de 360°, inmune a la radiación y al veneno, sin comida ni drogas, flota, tres accesorios en los brazos, solo se cura con reparaciones.")],
        [B("<b>Survivor</b> (p. 56)", "<b>Superviviente</b> (p. 56)"), B("Pick <b>two traits</b> (Educated, Fast Shot, Gifted, Heavy Handed, Small Frame), or one trait and an extra perk.", "Elige <b>dos rasgos</b> (Educado, Disparo rápido, Talentoso, Mano dura, Cuerpo pequeño), o un rasgo y una ventaja extra.")],
        [B("<b>Vault Dweller</b> (p. 57)", "<b>Morador del Refugio</b> (p. 57)"), B("<i>Vault Kid:</i> one extra tag skill; easier END tests against disease; the GM may trigger a Vault experiment complication (and give you a Luck point).", "<i>Chico del Refugio:</i> una habilidad etiquetada extra; pruebas de RES contra enfermedades más fáciles; el DJ puede provocar una complicación de experimento del Refugio (y darte un punto de Suerte).")],
      ])}`, B("Write your origin and its trait in the traits box. Super mutants add their +2 to STR and END now.", "Escribe tu origen y su rasgo en el recuadro de rasgos. Los supermutantes suman ya su +2 a FUE y RES."))}

    ${crStep(2, B("Increase your S.P.E.C.I.A.L. attributes", "Aumenta tus atributos S.P.E.C.I.A.L."), `<p>${B("Every attribute starts at <b>5</b>. You have <b>5 points</b> to add, one point per rank, and no attribute can go above <b>10</b> (your origin may change that). You may lower an attribute to <b>4</b> to get one more point to spend elsewhere.",
        "Cada atributo empieza en <b>5</b>. Tienes <b>5 puntos</b> para repartir, un punto por rango, y ningún atributo puede pasar de <b>10</b> (tu origen puede cambiarlo). Puedes bajar un atributo a <b>4</b> para conseguir un punto más que gastar en otro.")}</p>
      <p class="hint">${B("Ready-made arrays (include the starting 5s, assign them in any order): <b>Balanced</b> 6, 6, 6, 6, 6, 5, 5 · <b>Focused</b> 8, 7, 6, 6, 5, 4, 4 · <b>Specialized</b> 9, 8, 5, 5, 5, 4, 4.",
        "Repartos listos (incluyen los 5 iniciales, asígnalos en cualquier orden): <b>Equilibrado</b> 6, 6, 6, 6, 6, 5, 5 · <b>Centrado</b> 8, 7, 6, 6, 5, 4, 4 · <b>Especializado</b> 9, 8, 5, 5, 5, 4, 4.")}</p>
      <div class="tu-cbuild"><label class="f" for="tu-corigin">${B("Try it: your origin", "Pruébalo: tu origen")}</label>
        <select id="tu-corigin">${Object.entries(CR_ORIGINS).map(([k, o]) => `<option value="${k}">${B(...o.name)}</option>`).join("")}</select>
        <div class="tu-csp">${CR_ATTR.map(a => `<div class="tu-ca"><b>${T(a)}</b><button class="btn" type="button" data-cr="${a}" data-d="1">+</button>
          <span id="tu-cv-${a}">5</span><button class="btn" type="button" data-cr="${a}" data-d="-1">&minus;</button></div>`).join("")}</div>
        <div id="tu-cout"></div>
        <div class="bar"><button class="btn" type="button" id="tu-creset">${B("Start again", "Empezar de nuevo")}</button></div></div>`,
      B("Write each attribute in its circle at the top of the sheet.", "Escribe cada atributo en su círculo en la parte de arriba de la hoja."))}

    ${crStep(3, B("Tag skills and buy skill ranks", "Etiqueta habilidades y compra rangos"), `<p>${B("Choose <b>three tag skills</b> (plus any your origin gives). Each tag skill starts at <b>rank 2</b>, every other skill at 0. With a tag skill, any d20 that rolls <b>equal to or under its rank</b> is a critical success: two successes instead of one.",
        "Elige <b>tres habilidades etiquetadas</b> (más las que te dé tu origen). Cada habilidad etiquetada empieza en <b>rango 2</b>, y las demás en 0. Con una habilidad etiquetada, cualquier d20 que saque <b>igual o menos que su rango</b> es un éxito crítico: dos éxitos en vez de uno.")}</p>
      <p>${B("Then you have <b>9 + INT</b> skill points to buy ranks, one point per rank. At level 1 no skill can go above <b>rank 3</b> (6 is the absolute maximum later).",
        "Después tienes <b>9 + INT</b> puntos de habilidad para comprar rangos, un punto por rango. A nivel 1 ninguna habilidad puede pasar de <b>rango 3</b> (6 es el máximo absoluto más adelante).")}</p>
      ${crTable([B("Skill", "Habilidad"), B("Usual attribute", "Atributo habitual")], sk.map(([s, a]) => [T(s), T(a)]))}
      <p class="hint">${B("A skill test: roll 2d20; each die equal to or under <b>attribute + skill rank</b> is a success. The attribute in the table is the usual one; the GM may ask for another (CHA + Barter to haggle, INT + Barter to value an item...).",
        "Una prueba de habilidad: tira 2d20; cada dado igual o menor que <b>atributo + rango de la habilidad</b> es un éxito. El atributo de la tabla es el habitual; el DJ puede pedir otro (CAR + Trueque para regatear, INT + Trueque para tasar un objeto...).")}</p>`,
      B("Mark the box of each tag skill and write the ranks in the skills table.", "Marca la casilla de cada habilidad etiquetada y escribe los rangos en la tabla de habilidades."))}

    ${crStep(4, B("Choose your first perk", "Elige tu primera ventaja"), `<p>${B("Pick <b>one perk</b> from the perks list (page 59) whose requirements you meet: a minimum S.P.E.C.I.A.L. and, for higher ranks, a minimum level. Survivors who took a single trait pick a second perk.",
        "Elige <b>una ventaja</b> de la lista (página 59) cuyos requisitos cumplas: un S.P.E.C.I.A.L. mínimo y, para rangos superiores, un nivel mínimo. Los supervivientes que eligieron un solo rasgo escogen una segunda ventaja.")}</p>
      <div class="bar"><button class="btn" type="button" data-go-page="perks">&#127183; ${B("Browse the perks", "Ver las ventajas")}</button></div>`,
      B("Write the perk and its rank in the perks box.", "Escribe la ventaja y su rango en el recuadro de ventajas."))}

    ${crStep(5, B("Calculate your derived statistics", "Calcula tus estadísticas derivadas"), `${crTable([B("Statistic", "Estadística"), B("How", "Cómo")], [
        [B("<b>Carry weight</b>", "<b>Capacidad de carga</b>"), B("150 lbs + STR × 10 (a Mister Handy always has 150 lbs).", "150 lb + FUE × 10 (un Mister Handy siempre tiene 150 lb).")],
        [B("<b>Defense</b>", "<b>Defensa</b>"), B("1, or 2 if AGI is 9 or more.", "1, o 2 si la AGI es 9 o más.")],
        [B("<b>Initiative</b>", "<b>Iniciativa</b>"), B("PER + AGI.", "PER + AGI.")],
        [B("<b>Health points</b>", "<b>Puntos de vida</b>"), B("END + LCK at level 1 (+1 each new level).", "RES + SUE a nivel 1 (+1 cada nivel nuevo).")],
        [B("<b>Melee damage</b>", "<b>Daño cuerpo a cuerpo</b>"), B("STR 7-8: +1 CD · STR 9-10: +2 CD · STR 11+: +3 CD.", "FUE 7-8: +1 DC · FUE 9-10: +2 DC · FUE 11+: +3 DC.")],
        [B("<b>Damage resistance</b>", "<b>Resistencia al daño</b>"), B("0 in all four types; armor and clothing (step 6) and perks raise it, location by location.", "0 en los cuatro tipos; la armadura y la ropa (paso 6) y las ventajas la suben, zona por zona.")],
        [B("<b>Luck points</b>", "<b>Puntos de Suerte</b>"), B("Your maximum is your LCK; you start every session with that many.", "Tu máximo es tu SUE; empiezas cada sesión con esa cantidad.")],
      ])}<p class="hint">${B("The calculator in step 2 shows all of these for the attributes you chose.", "La calculadora del paso 2 te muestra todas estas con los atributos que elegiste.")}</p>`,
      B("Fill in the boxes for HP, Defense, Initiative, Carry weight, Melee damage and Luck points. Damage resistance goes on the body diagram, once you have your armor.",
        "Rellena las casillas de PV, Defensa, Iniciativa, Capacidad de carga, Daño cuerpo a cuerpo y Puntos de Suerte. La resistencia al daño va en el dibujo del cuerpo, cuando tengas tu armadura."))}

    ${crStep(6, B("Choose your equipment", "Elige tu equipo"), `<p>${B("Pick <b>one equipment pack</b> for your origin: Brotherhood (p. 76), Mister Handy (p. 77), Super Mutant and Vault Dweller (p. 78), or a Wastelander pack for ghouls and survivors (Mercenary, Raider, Settler, Trader or Wanderer, p. 79). Then add a <b>personal trinket</b> (roll on the table on page 80, or make one up) and the <b>items for each tag skill</b>:",
        "Elige <b>un paquete de equipo</b> de tu origen: Hermandad (p. 76), Mister Handy (p. 77), Supermutante y Morador del Refugio (p. 78), o un paquete de Yermo para necrófagos y supervivientes (Mercenario, Saqueador, Colono, Comerciante o Vagabundo, p. 79). Después añade una <b>baratija personal</b> (tira en la tabla de la página 80, o invéntala) y los <b>objetos de cada habilidad etiquetada</b>:")}</p>
      ${crTable([B("Tag skill", "Habilidad etiquetada"), B("You get", "Recibes")], tagItems.map(([s, x]) => [T(s), x]))}
      <p class="hint">${B("If a piece of armor changes your damage resistance, update it now. Ammo written as \"6+3 CD\" means 6 rounds plus the roll of 3 combat dice.",
        "Si una pieza de armadura cambia tu resistencia al daño, actualízala ahora. La munición escrita como \"6+3 DC\" significa 6 balas más lo que saquen 3 dados de combate.")}</p>`,
      B("Weapons go in the weapons table (with their skill, damage, effects, fire rate and range), armor on the body diagram, and everything else, caps included, in the inventory.",
        "Las armas van en la tabla de armas (con su habilidad, daño, efectos, cadencia y alcance), la armadura en el dibujo del cuerpo, y todo lo demás, chapas incluidas, en el inventario."))}

    ${crStep("&#10003;", B("Finishing touches", "Toques finales"), `<ul class="tight">
        <li>${B("A <b>name</b>, a look and a personality: what do you want, what do you fear, who do you owe?", "Un <b>nombre</b>, un aspecto y una personalidad: ¿qué quieres, qué temes, a quién le debes algo?")}</li>
        <li>${B("<b>Level 1</b> and <b>0 XP</b>. You'll need 100 XP for level 2.", "<b>Nivel 1</b> y <b>0 PX</b>. Necesitarás 100 PX para el nivel 2.")}</li>
        <li>${B("Ask the GM if anything about the campaign changes the rules above.", "Pregunta al DJ si algo de la campaña cambia las reglas de arriba.")}</li></ul>
      ${tip("&#128161;", B("Save your character in the app with <b>Create Character</b>: it checks the rules for you, works out every derived statistic and draws the filled-in sheet.", "Guarda tu personaje en la app con <b>Crear personaje</b>: comprueba las reglas por ti, calcula todas las estadísticas derivadas y dibuja la hoja rellena."))}`)}`;
  }

  function createOut() {
    const o = CR_ORIGINS[crState.origin], sp = crState.sp;
    const base = a => 5 + (o.plus[a] || 0);
    const spent = CR_ATTR.reduce((n, a) => n + (sp[a] - base(a)), 0), left = 5 - spent;
    CR_ATTR.forEach(a => ($("tu-cv-" + a).textContent = sp[a]));
    const carry = crState.origin === "handy" ? 150 : 150 + sp.STR * 10;
    const melee = sp.STR >= 11 ? 3 : sp.STR >= 9 ? 2 : sp.STR >= 7 ? 1 : 0;
    $("tu-cout").innerHTML = `<p class="tu-left">${left === 0 ? B("<b>All 5 points spent.</b>", "<b>Los 5 puntos gastados.</b>")
        : left === 1 ? B("<b>1</b> point left to spend.", "Te queda <b>1</b> punto por gastar.")
        : left > 0 ? B("<b>{n}</b> points left to spend.", "Te quedan <b>{n}</b> puntos por gastar.").replace("{n}", left)
        : B("<b>{n}</b> points too many: lower something.", "<b>{n}</b> puntos de más: baja algo.").replace("{n}", -left)}</p>
      <div class="tu-gains">
        ${gain(sp.END + sp.LCK, T("HP"), "END + LCK".replace("END", T("END")).replace("LCK", T("LCK")), "hp")}
        ${gain(sp.AGI >= 9 ? 2 : 1, T("Defense"), B("2 with AGI 9+", "2 con AGI 9+"), "skill")}
        ${gain(sp.PER + sp.AGI, T("Initiative"), "PER + AGI", "perk")}
        ${gain(9 + sp.INT, B("Skill points", "Puntos de habilidad"), "9 + INT", "special")}
      </div>
      <div class="tu-gains three">
        ${gain(carry, B("Carry weight (lbs)", "Carga (lb)"), crState.origin === "handy" ? B("Always 150", "Siempre 150") : "150 + " + T("STR") + " × 10", "perk")}
        ${gain("+" + melee, B("Melee damage (CD)", "Daño c. a c. (DC)"), B("From STR", "Por FUE"), "hp")}
        ${gain(sp.LCK, B("Luck points", "Puntos de Suerte"), B("Each session", "Cada sesión"), "skill")}
      </div>`;
  }
  function createWire(root) {
    const reset = () => { const o = CR_ORIGINS[crState.origin]; CR_ATTR.forEach(a => (crState.sp[a] = 5 + (o.plus[a] || 0))); createOut(); };
    $("tu-corigin").value = crState.origin;
    $("tu-corigin").onchange = () => { crState.origin = $("tu-corigin").value; reset(); };
    $("tu-creset").onclick = reset;
    root.querySelectorAll("[data-cr]").forEach(b => (b.onclick = () => {
      const a = b.dataset.cr, d = Number(b.dataset.d), o = CR_ORIGINS[crState.origin];
      const min = 4 + (o.plus[a] || 0), max = o.cap[a] || 10, base = x => 5 + (o.plus[x] || 0);
      const left = 5 - CR_ATTR.reduce((n, x) => n + (crState.sp[x] - base(x)), 0);
      if (d > 0 && (left <= 0 || crState.sp[a] >= max)) return;
      if (d < 0 && crState.sp[a] <= min) return;
      crState.sp[a] += d;
      createOut();
    }));
    root.querySelectorAll("[data-go-page]").forEach(b => (b.onclick = () => showPage(b.dataset.goPage)));
    // an origin with a cap below the current value (super mutant INT/CHA 6) is handled by reset
    reset();
  }

  const GUIDES = [
    { id: "create", icon: "&#128221;", name: "How to create your character", blurb: "The six steps of the core rulebook, and how to fill in your sheet", html: createHtml, wire: createWire },
    { id: "level", icon: "&#11014;", name: "Leveling Up", blurb: "What you gain and how much XP you need", html: levelHtml, wire: levelWire },
    { id: "heal", icon: "&#10084;", name: "Regain Health", blurb: "Stimpaks, rest, and repairing Mister Handy", html: healHtml },
    { id: "dying", icon: "&#9760;", name: "Dying", blurb: "0 HP, staying alive and being stabilized", html: dyingHtml, wire: dyingWire },
    { id: "range", icon: "&#127919;", name: "Combat Range", blurb: "Zones, reach and weapon ranges", html: rangeHtml, wire: rangeWire },
    { id: "minor", icon: "&#128095;", name: "Minor Actions", blurb: "The quick things you do on your turn", html: minorHtml },
    { id: "major", icon: "&#9876;", name: "Major Actions", blurb: "The main thing you do on your turn", html: majorHtml },
    { id: "dice", icon: "&#127922;", name: "Combat Dice", blurb: "How many points each face is worth, and Effects", html: diceHtml, wire: diceWire },
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
