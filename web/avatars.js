// Default profile pictures, one per kind of wastelander, used when a character has no photo.
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

  return { human, ghoul, mutant, robot };
})();

const avatarUrl = race => "data:image/svg+xml;charset=utf-8," + encodeURIComponent(AVATAR_SVG[race] || AVATAR_SVG.human);
// the picture to show for a saved character: their photo, or the default for their kind
const portraitFor = c => (c && c.photo) || avatarUrl((c && c.race) || raceFromOrigin(c && c.origin));
