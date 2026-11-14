// Default profile pictures, used when a character has no photo: one per kind of wastelander, and humans can
// pick among four (vault dweller woman or man, raider, power armor).
// Original cartoon portraits drawn for this app (retro poster style, no game characters).

const AVATAR_RACES = { human: "Human", ghoul: "Ghoul", mutant: "Super Mutant", robot: "Robot" };

// guess the kind from an origin text like "Vault Dweller", "Ghoul" or "Mister Handy"
function raceFromOrigin(origin) {
  const o = String(origin || "").toLowerCase();
  if (/ghoul|necr[oó]fago/.test(o)) return "ghoul";
  if (/mutant/.test(o)) return "mutant";
  if (/handy|gutsy|nanny|robot|protectron|assaultron|synth|farmhand|nurse/.test(o)) return "robot";
  return "human";
}

const AVATAR_SVG = (() => {
  const L = 'stroke="#1b1b1b" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"';
  // sunburst poster background
  const rays = (c1, c2) => {
    let r = `<rect width="120" height="120" fill="${c1}"/>`;
    for (let i = 0; i < 16; i++) {
      const a1 = (i * 2 * Math.PI) / 16, a2 = a1 + Math.PI / 16;
      r += `<polygon points="60,70 ${(60 + 120 * Math.cos(a1)).toFixed(1)},${(70 + 120 * Math.sin(a1)).toFixed(1)} ${(60 + 120 * Math.cos(a2)).toFixed(1)},${(70 + 120 * Math.sin(a2)).toFixed(1)}" fill="${c2}"/>`;
    }
    return r;
  };
  const wrap = body => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">${body}</svg>`;

  const human = wrap(rays("#f3c13a", "#f7d56b") + `
    <path d="M18 120 C20 96 38 88 60 88 C82 88 100 96 102 120 Z" fill="#2f5fa8" ${L}/>
    <path d="M44 90 L60 106 L76 90" fill="none" stroke="#f3c13a" stroke-width="6" stroke-linejoin="round"/>
    <path d="M44 90 L60 106 L76 90" fill="none" ${L}/>
    <rect x="52" y="76" width="16" height="14" fill="#f1c39a" ${L}/>
    <ellipse cx="60" cy="56" rx="24" ry="27" fill="#f6cfa5" ${L}/>
    <ellipse cx="35" cy="58" rx="5" ry="7" fill="#f1c39a" ${L}/><ellipse cx="85" cy="58" rx="5" ry="7" fill="#f1c39a" ${L}/>
    <path d="M35 48 C33 26 50 20 62 22 C78 22 90 30 85 50 C80 40 72 34 60 36 C50 37 42 40 35 48 Z" fill="#7a4a24" ${L}/>
    <path d="M58 22 C66 12 82 16 84 26" fill="#7a4a24" ${L}/>
    <ellipse cx="50" cy="56" rx="3.2" ry="4.2" fill="#1b1b1b"/><ellipse cx="70" cy="56" rx="3.2" ry="4.2" fill="#1b1b1b"/>
    <path d="M45 47 Q50 44 55 47 M65 47 Q70 44 75 47" fill="none" ${L}/>
    <path d="M60 58 Q63 65 58 67" fill="none" stroke="#1b1b1b" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M48 72 Q60 82 72 72" fill="#fff" ${L}/>
    <circle cx="45" cy="66" r="3.5" fill="#f19a8a" opacity=".6"/><circle cx="75" cy="66" r="3.5" fill="#f19a8a" opacity=".6"/>`);

  const ghoul = wrap(rays("#8fa35a", "#a6b872") + `
    <path d="M18 120 C20 98 38 88 60 88 C82 88 100 98 102 120 Z" fill="#6b4a2e" ${L}/>
    <path d="M40 92 L52 120 M80 92 L68 120" stroke="#4a311c" stroke-width="4"/>
    <rect x="52" y="76" width="16" height="14" fill="#b88d5c" ${L}/>
    <path d="M36 54 C34 30 46 22 60 22 C76 22 87 32 84 56 C83 70 76 82 60 84 C44 82 37 70 36 54 Z" fill="#c69a63" ${L}/>
    <path d="M44 34 C48 30 52 33 50 38 C46 40 43 38 44 34 Z" fill="#9c6f3e"/>
    <path d="M70 66 C75 63 79 67 76 72 C72 74 68 71 70 66 Z" fill="#9c6f3e"/>
    <path d="M73 30 C78 31 79 37 75 39" fill="none" stroke="#8a2f22" stroke-width="2.5"/>
    <path d="M46 26 C44 18 40 16 38 18 M60 22 C61 13 58 10 55 12 M72 24 C76 16 80 16 81 19" fill="none" ${L}/>
    <circle cx="49" cy="54" r="7.5" fill="#5c3b20" ${L}/><circle cx="71" cy="54" r="7.5" fill="#5c3b20" ${L}/>
    <circle cx="49" cy="54" r="3" fill="#f4e7a1"/><circle cx="71" cy="54" r="3" fill="#f4e7a1"/>
    <path d="M57 62 L56 66 M63 62 L64 66" stroke="#1b1b1b" stroke-width="3" stroke-linecap="round"/>
    <path d="M46 73 Q60 79 74 73 L72 76 Q60 82 48 76 Z" fill="#3a2414" ${L}/>
    <path d="M52 74 L52 77 M57 75 L57 78 M63 75 L63 78 M68 74 L68 77" stroke="#efe4c2" stroke-width="2"/>`);

  const mutant = wrap(rays("#d9663a", "#e88a5a") + `
    <path d="M6 120 C8 92 30 82 60 82 C90 82 112 92 114 120 Z" fill="#6f8f3c" ${L}/>
    <path d="M26 92 L46 120" stroke="#5a3a1e" stroke-width="9"/><path d="M26 92 L46 120" stroke="#1b1b1b" stroke-width="2" opacity=".6"/>
    <path d="M30 56 C28 30 42 18 60 18 C78 18 92 30 90 56 C90 74 82 86 60 88 C38 86 30 74 30 56 Z" fill="#7fa648" ${L}/>
    <path d="M36 46 C46 40 54 42 58 47 M62 47 C66 42 74 40 84 46" fill="none" stroke="#1b1b1b" stroke-width="5" stroke-linecap="round"/>
    <circle cx="48" cy="52" r="3.6" fill="#f7e15a" ${L}/><circle cx="72" cy="52" r="3.6" fill="#f7e15a" ${L}/>
    <path d="M55 58 Q60 64 65 58" fill="#6c9440" ${L}/>
    <path d="M38 70 Q60 84 82 70 L80 78 Q60 90 40 78 Z" fill="#3a2a1a" ${L}/>
    <path d="M44 73 L46 66 L49 75 M71 75 L74 66 L76 73" fill="#f3ecd2" ${L}/>
    <path d="M44 28 L48 34 M70 26 L74 31" stroke="#5f8236" stroke-width="3" stroke-linecap="round"/>`);

  const robot = wrap(rays("#3fa39b", "#5cbab2") + `
    <path d="M24 120 L30 96 L90 96 L96 120 Z" fill="#8c98a3" ${L}/>
    <circle cx="45" cy="108" r="4" fill="#e04a3a" ${L}/><circle cx="60" cy="108" r="4" fill="#f3c13a" ${L}/><circle cx="75" cy="108" r="4" fill="#5ad16c" ${L}/>
    <rect x="50" y="84" width="20" height="14" fill="#6d7782" ${L}/>
    <path d="M60 24 L60 12" ${L}/><circle cx="60" cy="10" r="5" fill="#ff6b4a" ${L}/>
    <rect x="28" y="24" width="64" height="62" rx="16" fill="#c4ced6" ${L}/>
    <rect x="28" y="24" width="64" height="14" rx="7" fill="#dfe6eb" opacity=".8"/>
    <rect x="36" y="40" width="48" height="26" rx="9" fill="#18323a" ${L}/>
    <circle cx="50" cy="53" r="6" fill="#7df0e3"/><circle cx="70" cy="53" r="6" fill="#7df0e3"/>
    <circle cx="51.5" cy="51.5" r="2" fill="#fff"/><circle cx="71.5" cy="51.5" r="2" fill="#fff"/>
    <path d="M46 75 Q60 82 74 75" fill="none" ${L}/>
    <circle cx="23" cy="56" r="7" fill="#8c98a3" ${L}/><circle cx="97" cy="56" r="7" fill="#8c98a3" ${L}/>
    <circle cx="34" cy="30" r="1.8" fill="#1b1b1b"/><circle cx="86" cy="30" r="1.8" fill="#1b1b1b"/>
    <circle cx="34" cy="80" r="1.8" fill="#1b1b1b"/><circle cx="86" cy="80" r="1.8" fill="#1b1b1b"/>`);

  // the same vault dweller as "human", as a man: short hair, no ponytail, a heavier brow and a little stubble
  const human_m = wrap(rays("#f3c13a", "#f7d56b") + `
    <path d="M18 120 C20 96 38 88 60 88 C82 88 100 96 102 120 Z" fill="#2f5fa8" ${L}/>
    <path d="M44 90 L60 106 L76 90" fill="none" stroke="#f3c13a" stroke-width="6" stroke-linejoin="round"/>
    <path d="M44 90 L60 106 L76 90" fill="none" ${L}/>
    <rect x="51" y="76" width="18" height="14" fill="#f1c39a" ${L}/>
    <path d="M36 56 C36 36 46 29 60 29 C74 29 84 36 84 56 C84 72 76 84 60 84 C44 84 36 72 36 56 Z" fill="#f6cfa5" ${L}/>
    <path d="M42 70 C46 80 54 84 60 84 C66 84 74 80 78 70 C74 76 66 79 60 79 C54 79 46 76 42 70 Z" fill="#d9a77e" opacity=".55"/>
    <ellipse cx="35" cy="58" rx="5" ry="7" fill="#f1c39a" ${L}/><ellipse cx="85" cy="58" rx="5" ry="7" fill="#f1c39a" ${L}/>
    <path d="M35 50 C33 30 46 20 60 20 C76 20 88 28 85 50 C84 44 82 40 78 38 C70 34 66 38 58 35 C50 33 44 38 40 40 C37 43 36 46 35 50 Z" fill="#7a4a24" ${L}/>
    <path d="M36 50 L37 60 M84 50 L83 60" stroke="#7a4a24" stroke-width="4" stroke-linecap="round"/>
    <ellipse cx="50" cy="56" rx="3.2" ry="4" fill="#1b1b1b"/><ellipse cx="70" cy="56" rx="3.2" ry="4" fill="#1b1b1b"/>
    <path d="M44 47 L55 46 M65 46 L76 47" fill="none" stroke="#5a3418" stroke-width="4" stroke-linecap="round"/>
    <path d="M60 58 Q64 66 58 68" fill="none" stroke="#1b1b1b" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M50 73 Q60 79 70 73" fill="none" ${L}/>`);

  // a wasteland raider: mohawk, war paint, a scar, spiked leather
  const raider = wrap(rays("#c4502e", "#d9703f") + `
    <path d="M14 120 C16 96 36 86 60 86 C84 86 104 96 106 120 Z" fill="#5a3a22" ${L}/>
    <path d="M60 88 L60 120" stroke="#3e2716" stroke-width="3"/>
    <path d="M12 104 C14 92 24 86 36 88 L40 102 Z" fill="#8d959c" ${L}/><path d="M108 104 C106 92 96 86 84 88 L80 102 Z" fill="#8d959c" ${L}/>
    <path d="M20 92 L14 80 L26 89 M30 88 L28 75 L36 87 M100 92 L106 80 L94 89 M90 88 L92 75 L84 87" fill="#d6dadd" ${L}/>
    <path d="M42 96 L52 120 M78 96 L68 120" stroke="#2a1a0e" stroke-width="5"/>
    <rect x="52" y="74" width="16" height="14" fill="#d8a77b" ${L}/>
    <path d="M37 56 C36 36 46 28 60 28 C74 28 84 36 83 56 C83 72 75 84 60 85 C45 84 37 72 37 56 Z" fill="#e2b387" ${L}/>
    <path d="M40 44 C42 36 48 31 54 30 M80 44 C78 36 72 31 66 30" fill="none" stroke="#8a5a36" stroke-width="3" stroke-dasharray="1.5 3" stroke-linecap="round"/>
    <path d="M52 32 L50 14 L56 24 L58 8 L62 22 L66 9 L67 24 L72 15 L69 32 Z" fill="#b22e1e" ${L}/>
    <path d="M38 50 L82 50 L80 61 L40 61 Z" fill="#1b1b1b" opacity=".85"/>
    <circle cx="50" cy="55" r="3.6" fill="#f4e7a1"/><circle cx="70" cy="55" r="3.6" fill="#f4e7a1"/>
    <circle cx="50" cy="55" r="1.6" fill="#1b1b1b"/><circle cx="70" cy="55" r="1.6" fill="#1b1b1b"/>
    <path d="M72 64 L78 76" stroke="#9c3a2a" stroke-width="2.5" stroke-linecap="round"/><path d="M73 68 l4 -1 M75 72 l4 -1" stroke="#9c3a2a" stroke-width="1.6"/>
    <path d="M60 60 Q63 66 58 68" fill="none" stroke="#1b1b1b" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M47 73 Q60 81 73 72 Q60 77 47 73 Z" fill="#fff" ${L}/><rect x="56" y="74" width="4" height="4" fill="#1b1b1b"/>
    <ellipse cx="35" cy="58" rx="5" ry="7" fill="#d8a77b" ${L}/><ellipse cx="85" cy="58" rx="5" ry="7" fill="#d8a77b" ${L}/>
    <circle cx="85" cy="66" r="3" fill="none" stroke="#c9ced2" stroke-width="2"/>`);

  // a human in power armor: round steel helmet with a visor slit, a vented grille, filters and big pauldrons
  const powerarmor = wrap(rays("#4f6d7a", "#62838f") + `
    <path d="M10 120 C10 98 26 86 60 86 C94 86 110 98 110 120 Z" fill="#7d8466" ${L}/>
    <path d="M40 92 L80 92 L76 120 L44 120 Z" fill="#9aa181" ${L}/>
    <path d="M48 100 L72 100 M48 108 L72 108" stroke="#5d634b" stroke-width="3"/>
    <path d="M8 112 C6 94 16 84 34 86 L38 104 C30 108 20 112 8 112 Z" fill="#8c936f" ${L}/>
    <path d="M112 112 C114 94 104 84 86 86 L82 104 C90 108 100 112 112 112 Z" fill="#8c936f" ${L}/>
    <circle cx="20" cy="98" r="2" fill="#1b1b1b"/><circle cx="100" cy="98" r="2" fill="#1b1b1b"/>
    <path d="M30 62 C30 30 44 16 60 16 C76 16 90 30 90 62 L86 80 C78 90 42 90 34 80 Z" fill="#8a9070" ${L}/>
    <path d="M54 17 L66 17 L66 50 L54 50 Z" fill="#a3aa86" ${L}/>
    <rect x="34" y="34" width="9" height="6" rx="2" fill="#f7e15a" ${L}/>
    <path d="M36 48 L84 48 L82 60 L38 60 Z" fill="#1d2b30" ${L}/>
    <path d="M41 53 L79 53" stroke="#f3a13a" stroke-width="3.5" stroke-linecap="round"/>
    <path d="M44 64 L76 64 L72 84 L48 84 Z" fill="#5d634b" ${L}/>
    <path d="M52 67 L52 81 M57 67 L57 82 M63 67 L63 82 M68 67 L68 81" stroke="#2b2f22" stroke-width="2.5"/>
    <circle cx="35" cy="72" r="7" fill="#6b7156" ${L}/><circle cx="85" cy="72" r="7" fill="#6b7156" ${L}/>
    <circle cx="35" cy="72" r="2.5" fill="#2b2f22"/><circle cx="85" cy="72" r="2.5" fill="#2b2f22"/>
    <circle cx="40" cy="30" r="1.6" fill="#1b1b1b"/><circle cx="80" cy="30" r="1.6" fill="#1b1b1b"/><circle cx="60" cy="44" r="1.6" fill="#1b1b1b"/>`);

  return { human, ghoul, mutant, robot, human_m, raider, powerarmor };
})();

// which pictures and which walking sprites each kind of character can pick (the first one is the default)
const AVATAR_CHOICES = { human: ["human", "human_m", "raider", "powerarmor"], ghoul: ["ghoul"], mutant: ["mutant"], robot: ["robot"] };
const SPRITE_CHOICES = { human: ["human", "raider", "powerarmor"], ghoul: ["ghoul"], mutant: ["mutant"], robot: ["robot", "handy"] };
const CHOICE_NAMES = { human: "Vault dweller (woman)", human_m: "Vault dweller (man)", raider: "Raider", powerarmor: "Power armor",
  ghoul: "Ghoul", mutant: "Super Mutant", robot: "Robot", handy: "Mister Handy" };
const raceOf = c => (c && c.race) || raceFromOrigin(c && c.origin);
const pickFor = (list, want) => (list.includes(want) ? want : list[0]);
const avatarFor = c => pickFor(AVATAR_CHOICES[raceOf(c)] || AVATAR_CHOICES.human, c && c.avatar);
const spriteFor = c => pickFor(SPRITE_CHOICES[raceOf(c)] || SPRITE_CHOICES.human, c && c.sprite);

const avatarUrl = race => "data:image/svg+xml;charset=utf-8," + encodeURIComponent(AVATAR_SVG[race] || AVATAR_SVG.human);
// the picture to show for a saved character: their photo, or the default for their kind
const portraitFor = c => (c && c.photo) || avatarUrl(avatarFor(c));
