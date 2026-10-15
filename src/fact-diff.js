/**
 * fact-diff.js — Compare a rewrite against its source and report facts that
 * were lost or invented: identifiers, numbers, dates, [E#] citations and
 * estimative / claim-strength words.
 */

const FACT_RE = [
  /CVE-\d{4}-\d{4,7}/gi,
  /\bT\d{4}(?:\.\d{3})?\b/g,
  /\b(?:\d{1,3}\.){3}\d{1,3}(?:\/\d{1,2})?\b/g,
  /\b[a-f0-9]{32,64}\b/gi,
  /\bhxxps?:\/\/\S+/gi,
  /\b[\w-]+(?:\[\.\]|\.)(?:com|net|org|io|ru|cn|aspx|php|exe|dll)\b/gi,
  /\b\d{4}-\d{2}-\d{2}\b/g,
  /\b(?:USD|\$)\s?\d[\d.,]*\s?(?:million|billion)?/gi,
  /\b\d+(?:[.,]\d+)?\s?%/g,
  /\b(?:APT|UNC|UTA|TA|FIN)\d+\b/g,
];

const ESTIMATIVE =
  /\b(?:almost certainly|highly likely|very likely|likely|unlikely|probably|probable|possibly|remote chance|realistic possibility|(?:low|moderate|medium|high)[- ]confidence|assess(?:es|ed)?|may|might|could|overwhelmingly|explicitly|unconditionally|therefore|already|precisely|sannolikt|troligen|möjligen|kan komma att)\b/gi;

function facts(text) {
  const s = new Set();
  for (const re of FACT_RE) {
    for (const m of text.matchAll(re)) s.add(m[0].toLowerCase().replace(/\s+/g, ''));
  }
  return s;
}

function cites(text) {
  return new Set([...text.matchAll(/\[(E\d+)\]/g)].map((m) => m[1]));
}

function estimative(text) {
  const counts = new Map();
  for (const m of text.matchAll(ESTIMATIVE)) {
    const k = m[0].toLowerCase().replace(/-/g, ' ');
    counts.set(k, (counts.get(k) || 0) + 1);
  }
  return counts;
}

const minus = (a, b) => [...a].filter((x) => !b.has(x));

function factDiff(source, rewrite) {
  const sf = facts(source);
  const rf = facts(rewrite);
  const sc = cites(source);
  const rc = cites(rewrite);
  const se = estimative(source);
  const re = estimative(rewrite);
  const lostEst = [];
  const inventedEst = [];
  for (const k of new Set([...se.keys(), ...re.keys()])) {
    const d = (se.get(k) || 0) - (re.get(k) || 0);
    if (d > 0) lostEst.push(k);
    if (d < 0) inventedEst.push(k);
  }
  const result = {
    lost: minus(sf, rf),
    invented: minus(rf, sf),
    citesLost: minus(sc, rc),
    citesInvented: minus(rc, sc),
    estimativeLost: lostEst,
    estimativeInvented: inventedEst,
  };
  result.ok = Object.values(result).every((v) => v.length === 0);
  return result;
}

module.exports = { factDiff, FACT_RE, ESTIMATIVE };
