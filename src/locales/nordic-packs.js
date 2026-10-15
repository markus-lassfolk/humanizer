/**
 * locales/nordic-packs.js — shared builder for nb/da pattern packs and empirical extras.
 * Each locale supplies a data spec; English packs stay as the base (mixed-language text).
 */

const fs = require('fs');
const path = require('path');
const { PATTERN_PACKS_EN } = require('./en/pattern-packs');
const { buildStopSet, shouldScoreEmpiricalExtra } = require('./sv/empirical-filter');

const rows = (rex, suggestion, confidence = 'high') =>
  rex.map((regex) => ({ regex, suggestion, confidence }));

/**
 * @param {object} s spec: { 1,4,5,6,8,12,25,28: RegExp[], 27: [[RegExp, fix]], msg: {1,4,5,6,8,12,25,28: string},
 *   adjectives, conjunction, abstractNounRegex, synonyms }
 */
function buildPacks(s) {
  const out = { ...PATTERN_PACKS_EN };
  for (const id of [1, 4, 5, 6, 8, 12, 25, 28]) {
    out[id] = [...PATTERN_PACKS_EN[id], ...rows(s[id], s.msg[id], id === 12 ? 'medium' : 'high')];
  }
  out[10] = {
    ...PATTERN_PACKS_EN[10],
    adjectives: s.adjectives,
    conjunction: s.conjunction,
    abstractNounRegex: s.abstractNounRegex,
    abstractNounSuggestion: s.msg.abstractNoun,
    adjectiveSuggestion: s.msg.adjective,
  };
  out[11] = [...PATTERN_PACKS_EN[11], ...s.synonyms];
  out[27] = [...PATTERN_PACKS_EN[27], ...s[27].map(([regex, fix]) => ({ regex, fix }))];
  return out;
}

/** Load `<localeDir>/references/<file>`; optional — locale works without it. */
function loadWeights(file) {
  try {
    const d = JSON.parse(fs.readFileSync(path.join(__dirname, '../../locales', file), 'utf8'));
    return d && typeof d === 'object' && !Array.isArray(d) ? d : {};
  } catch {
    return {};
  }
}

const weightOf = (weights, key) => {
  const e = weights[String(key).toLowerCase()];
  return e && typeof e.weight === 'number' && e.weight > 0 ? e.weight : 1;
};

const applyWeights = (weights, list) =>
  list.map((w) => (weightOf(weights, w) === 1 ? w : { word: w, weight: weightOf(weights, w) }));

/** Pattern 7 empirical extras: multi-word n-grams, same gates as sv, capped at 100. */
function buildEmpiricalExtra(weights, functionWords, exclusive) {
  const stop = buildStopSet(functionWords);
  const ex = new Set([...exclusive].map((s) => String(s).toLowerCase()));
  return Object.entries(weights)
    .filter(
      ([k, v]) =>
        v && typeof v.zscore === 'number' && shouldScoreEmpiricalExtra(k, v.zscore, stop, ex),
    )
    .sort((a, b) => b[1].zscore - a[1].zscore)
    .slice(0, 100)
    .map(([k, v]) =>
      v.weight > 0 && Math.abs(v.weight - 1) > 1e-9 ? { word: k, weight: v.weight } : k,
    );
}

module.exports = { buildPacks, loadWeights, applyWeights, buildEmpiricalExtra };
