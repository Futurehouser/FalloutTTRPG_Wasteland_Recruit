// Random Fallout 76 perk, fetched live from fallout.wiki (nothing from the wiki is bundled in the app).
// The last successful download is cached so the feature still works offline.

const PERKS_PAGE = "https://fallout.wiki/wiki/Fallout_76_Perks";
const PERKS_API = "https://fallout.wiki/api.php?action=parse&page=Fallout_76_Perks&prop=text&format=json&formatversion=2&origin=*";
let PERKS = null;

function parsePerks(html) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const out = [];
  let group = "", special = "";
  const clean = el => el.textContent.replace(/\[edit\]/g, "").replace(/\s+/g, " ").trim();
  doc.querySelectorAll("h2, h3, table").forEach(el => {
    if (el.tagName === "H2") { group = clean(el); return; }
    if (el.tagName === "H3") { special = clean(el); return; }
    if (!el.classList.contains("ace-table")) return;
    if (!/Regular|Ghoul/i.test(group)) return;
    let cur = null;
    el.querySelectorAll("tr").forEach(tr => {
      const tds = [...tr.children].filter(c => c.tagName === "TD");
      if (!tds.length) return;
      const img = tds[0].querySelector("img");
      if (img && tds.length >= 5) {
        let src = img.getAttribute("src") || "";
        if (src.startsWith("//")) src = "https:" + src;
        const a = tds[1].querySelector("a");
        cur = {
          name: clean(tds[1]),
          special,
          group: /Ghoul/i.test(group) ? "Ghoul" : "Regular",
          level: clean(tds[2]),
          image: src.replace(/\/\d+px-/, "/300px-"),
          thumb: src,
          link: a ? "https://fallout.wiki" + a.getAttribute("href") : PERKS_PAGE,
          ranks: [{ rank: clean(tds[3]), desc: clean(tds[4]) }],
        };
        out.push(cur);
      } else if (cur && tds.length >= 2 && !tds[0].querySelector("img")) {
        cur.ranks.push({ rank: clean(tds[0]), desc: clean(tds[1]) });
      }
    });
  });
  return out.filter(p => p.name && p.ranks[0].desc);
}

// returns { perks, source: "online" | "cache" }
async function loadPerks() {
  if (PERKS) return { perks: PERKS, source: "online" };
  try {
    const r = await fetch(PERKS_API, { cache: "no-store" });
    if (!r.ok) throw new Error("HTTP " + r.status);
    const j = await r.json();
    const perks = parsePerks(j.parse.text);
    if (!perks.length) throw new Error(T("the wiki page layout has changed"));
    PERKS = perks;
    Platform.saveJSON("perks_cache", { t: Date.now(), perks });
    return { perks, source: "online" };
  } catch (e) {
    const c = await Platform.loadJSON("perks_cache", null);
    if (c && c.perks && c.perks.length) {
      PERKS = c.perks;
      return { perks: PERKS, source: "cache" };
    }
    throw new Error(T("Couldn't reach fallout.wiki ({e}). Check the internet connection.", { e: e.message }));
  }
}

// ------------------------------------------------------------------ suggestions for a saved character
// Fallout 76 rules (from the wiki page's overview): a card costs points equal to its rank, the cards
// in one S.P.E.C.I.A.L. can't cost more than that attribute, and you get one new card per level.

const SPECIAL_KEY = { Strength: "STR", Perception: "PER", Endurance: "END", Charisma: "CHA", Intelligence: "INT", Agility: "AGI", Luck: "LCK" };
const specialKey = name => SPECIAL_KEY[Object.keys(SPECIAL_KEY).find(k => (name || "").toLowerCase().startsWith(k.toLowerCase()))] || null;
const rankCost = (r, i) => { const m = /Cost:\s*(\d+)/i.exec(r.desc); return m ? +m[1] : parseInt(r.rank, 10) || i + 1; };
const perkLevel = p => parseInt(p.level, 10) || 1;

// saved form of a perk card on a character
function perkCardFrom(p, rank = 1) {
  return { name: p.name, special: p.special, group: p.group, rank, image: p.image, thumb: p.thumb, link: p.link,
           level: perkLevel(p), ranks: p.ranks.map((r, i) => ({ rank: r.rank, desc: r.desc, cost: rankCost(r, i) })) };
}
const cardCost = c => (c.ranks[c.rank - 1] || c.ranks[c.ranks.length - 1] || { cost: c.rank }).cost;

function pointsUsed(ch) {
  const used = {};
  (ch.perkCards || []).forEach(c => { const k = specialKey(c.special); if (k) used[k] = (used[k] || 0) + cardCost(c); });
  return used;
}

// which words in a perk description fit which 2d20 skill
const W = words => new RegExp("\\b(" + words + ")\\b", "i"); // whole words only ("automatic" must not match "automatically")
const SKILL_WORDS = {
  "Small Guns": W("pistols?|rifles?|shotguns?|ballistic|automatic|non-automatic|guns?|semi-automatic"),
  "Big Guns": W("heavy guns?|heavy weapons?|miniguns?|gatling"),
  "Energy Weapons": W("energy weapons?|lasers?|plasma"),
  "Melee Weapons": W("melee|one-handed|two-handed|bash(ing)?|block"),
  "Unarmed": W("unarmed|punch(es)?|fists?"),
  "Explosives": W("explosives?|explosions?|grenades?|mines?"),
  "Throwing": W("thrown|throw(ing)?|grenades?"),
  "Sneak": W("sneak(ing)?|stealth|detected|detection|hidden|silenced"),
  "Lockpick": W("locks?|lockpick(ing)?|pick"),
  "Science": W("hack(ing)?|terminals?|craft(ing)?|chems?"),
  "Repair": W("repair(ing)?|condition|craft(ing)?|scrap(ping)?|junk"),
  "Medicine": W("stimpaks?|heal(ing|s)?|chems?|diseases?|addiction|health"),
  "Speech": W("persuade|teammates?|team|friendly"),
  "Barter": W("prices?|vendors?|caps|buy(ing)?|sell(ing)?|trade"),
  "Survival": W("food|water|drinks?|hunger|thirst|rads?|radiation|cook(ing)?"),
  "Athletics": W("carry weight|carry|jump|sprint(ing)?|action points|AP"),
  "Pilot": W("power armor|fusion cores?"),
};

function isGhoul(ch) { return /ghoul|necr[oó]fago/i.test(ch.origin || ""); }

// returns sorted candidate list [{perk, rank, kind: "new"|"upgrade", score, reasons[]}]
function perkCandidates(ch, perks) {
  const level = ch.level || 1, used = pointsUsed(ch), owned = {};
  (ch.perkCards || []).forEach(c => (owned[c.name] = c));
  const out = [];
  perks.forEach(p => {
    const k = specialKey(p.special);
    if (!k) return;
    if (p.group === "Ghoul" && !isGhoul(ch)) return;
    if (perkLevel(p) > level) return;
    const have = owned[p.name];
    const rank = have ? have.rank + 1 : 1;
    if (rank > p.ranks.length) return;
    const extra = rankCost(p.ranks[rank - 1], rank - 1) - (have ? cardCost(have) : 0);
    const free = (ch.special[k] || 0) - (used[k] || 0);
    if (extra > free) return;
    const reasons = [TP(free, "{sp} has {n} free point (of {max})", "{sp} has {n} free points (of {max})", { sp: T(p.special), max: ch.special[k] })];
    let score = 1 + free * 0.5 + (ch.special[k] || 0) * 0.3;
    const text = p.ranks.map(r => r.desc).join(" ");
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
  const all = perkCandidates(ch, perks).filter(c => !exclude.includes(c.perk.name));
  const top = all.slice(0, 12);
  if (!top.length) return { pick: null, total: 0 };
  return { pick: wpick(top, top.map(c => c.score * c.score)), total: all.length };
}
