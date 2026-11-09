// Fallout TTRPG perks: the core rulebook perks (pp. 59-73) from ttrpg_perks.js, with the rulebook's ranks,
// requirements and description. Only the card pictures come from fallout.wiki, so everything works offline.
//
// Rulebook rules used here: a character takes one perk (or one more rank of a perk) per level; a perk needs
// its S.P.E.C.I.A.L. minimums and level; each extra rank needs `inc` more levels; some perks are not open to
// some origins (robots, ghouls...).

const TT_BY = Object.fromEntries(TT_PERKS.map(p => [p.n, p]));
// cards saved by older versions, from the Fallout 76 list: the rulebook perk they match, if any
const F76_TO_TT = {};
TT_PERKS.forEach(p => p.f76.forEach(n => (F76_TO_TT[n] = p.n)));
const ttPerk = name => TT_BY[name] || TT_BY[F76_TO_TT[name]] || null;

// the perk's small picture, or a placeholder for perks that don't have one yet
const perkThumb = (p, lazy) => p.thumb
  ? `<img src="${esc(p.thumb)}" alt="" ${lazy ? 'loading="lazy" ' : ""}referrerpolicy="no-referrer" onerror="this.style.visibility='hidden'">`
  : `<span class="pk-nopic" aria-hidden="true">&#9762;</span>`;

const TT_ATTRS = ["STR", "PER", "END", "CHA", "INT", "AGI", "LCK"];
const NOT_LABEL = { robot: "Not for robots", ghoul: "Not for ghouls", human: "Not for humans", mutant: "Not for super mutants" };
const rankLevel = (p, rank) => p.lvl + p.inc * (rank - 1);
const reqAttrs = p => TT_ATTRS.filter(k => p.req[k]).map(k => `${T(k)} ${p.req[k]}`);

// "STR 5, INT 6 · Level 2+ · each extra rank needs 4 more levels · Not for robots"
function reqText(p) {
  const bits = reqAttrs(p);
  if (p.lvl > 1 || p.inc) bits.push(T("Level {n}+", { n: p.lvl }));
  if (p.inc && p.max > 1) bits.push(T("each extra rank needs {n} more levels", { n: p.inc }));
  (p.not || []).forEach(n => bits.push(T(NOT_LABEL[n])));
  return bits.length ? bits.join(" · ") : T("No requirements");
}

const originKind = ch => ch.race || raceFromOrigin(ch.origin || "");

// what stops this character taking `rank` of perk p (empty = they meet every requirement)
function unmet(ch, p, rank) {
  const out = [];
  TT_ATTRS.forEach(k => { if (p.req[k] && (ch.special[k] || 0) < p.req[k]) out.push(`${T(k)} ${p.req[k]}`); });
  const lvl = rankLevel(p, rank);
  if ((ch.level || 1) < lvl) out.push(rank > 1 ? T("Rank {r} needs level {n}", { r: rank, n: lvl }) : T("Level {n}+", { n: lvl }));
  if ((p.not || []).includes(originKind(ch))) out.push(T(NOT_LABEL[originKind(ch)]));
  return out;
}

// a character's perks as rulebook names; old Fallout 76 cards with a rulebook match become that perk,
// the rest stay as they are (shown as Fallout 76 cards) so nothing the player saved is lost
function migratePerks(ch) {
  if (!ch.perkCards || !ch.perkCards.length) return false;
  const out = [];
  let changed = false;
  ch.perkCards.forEach(c => {
    const p = ttPerk(c.name);
    if (!p) { out.push(c); return; }
    const rank = Math.min(p.max, Math.max(1, c.rank || 1));
    if (c.name !== p.n || c.ranks || rank !== c.rank) changed = true;
    const have = out.find(x => x.name === p.n);
    if (have) { have.rank = Math.max(have.rank, rank); changed = true; } else out.push({ name: p.n, rank });
  });
  ch.perkCards = out;
  return changed;
}
const perkCardFrom = (p, rank = 1) => ({ name: p.n, rank });
const perksTaken = ch => (ch.perkCards || []).filter(c => TT_BY[c.name]).reduce((n, c) => n + (c.rank || 1), 0);

// which words in a perk description fit which 2d20 skill
const W = words => new RegExp("\\b(" + words + ")\\b", "i"); // whole words only
const SKILL_WORDS = {
  "Small Guns": W("small guns|pistols?|rifles?|revolver|one-handed ranged|ranged attacks?|ammunition|firearms|gun"),
  "Big Guns": W("big guns|heavy weapons?|miniguns?|gatling"),
  "Energy Weapons": W("energy weapons?|lasers?|plasma"),
  "Melee Weapons": W("melee|bashing|charge"),
  "Unarmed": W("unarmed|punch(es)?|fists?"),
  "Explosives": W("explosives?|blast"),
  "Throwing": W("thrown"),
  "Sneak": W("sneak|silenced|suppressed|detect you|hidden|darkness"),
  "Lockpick": W("locks?|lockpick(ing)?"),
  "Science": W("hack|computers?|science|robots?|chems recipes|energy weapons"),
  "Repair": W("repair|modify|mods|scrap|salvage|materials"),
  "Medicine": W("chems?|addict(ed|ion)?|heal|health"),
  "Speech": W("group|lead|friendly|animals?"),
  "Barter": W("buy|sell|price|caps|money"),
  "Survival": W("food|drinks?|irradiated|radiation|scavenging|sunlight|animals?|creature"),
  "Athletics": W("carry weight|sprint|STR \\+ Athletics"),
  "Pilot": W("power armor"),
};

// sorted candidates [{perk, rank, kind: "new"|"upgrade", score, reasons[]}] the character can take now
function perkCandidates(ch, perks) {
  const owned = {};
  (ch.perkCards || []).forEach(c => (owned[c.name] = c));
  const out = [];
  perks.forEach(p => {
    const have = owned[p.n];
    const rank = have ? have.rank + 1 : 1;
    if (rank > p.max || unmet(ch, p, rank).length) return;
    const attrs = reqAttrs(p);
    const reasons = [attrs.length ? T("meets {list}", { list: attrs.join(", ") }) : T("No attribute requirement")];
    let score = 1 + TT_ATTRS.reduce((s, k) => s + (p.req[k] ? ((ch.special[k] || 0) - p.req[k]) * 0.2 + p.req[k] * 0.15 : 0), 0);
    const text = p.desc.join(" ");
    Object.entries(SKILL_WORDS).forEach(([skill, re]) => {
      const r = (ch.skills || {})[skill] || 0, tag = (ch.tags || []).includes(skill);
      if ((r || tag) && re.test(text)) {
        score += r * 1.5 + (tag ? 3 : 0);
        reasons.push(T(tag ? "fits {skill} {r} (tag)" : "fits {skill} {r}", { skill: T(skill), r }));
      }
    });
    if (have) { score += 2.5; reasons.push(T("upgrades your rank {n} card", { n: have.rank })); }
    out.push({ perk: p, rank, kind: have ? "upgrade" : "new", score, reasons });
  });
  return out.sort((a, b) => b.score - a.score);
}

// weighted pick among the best few, so repeated presses give variety
function suggestPerk(ch, perks, exclude = []) {
  const all = perkCandidates(ch, perks).filter(c => !exclude.includes(c.perk.n));
  const top = all.slice(0, 12);
  if (!top.length) return { pick: null, total: 0 };
  return { pick: wpick(top, top.map(c => c.score * c.score)), total: all.length };
}
