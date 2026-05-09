/**
 * locales/en/empirical-filter.js — Rules for English empirical n-grams (Pattern 7 + pipeline).
 *
 * Used when writing `locales/en-en/references/en-frequencies.json` (log-odds) and when
 * building `empiricalExtra` in `vocabulary.js`.
 */

/**
 * @param {string[]} functionWords
 * @returns {Set<string>}
 */
function buildStopSet(functionWords) {
  return new Set(functionWords.map((w) => String(w).toLowerCase()));
}

/**
 * Whether an n-gram may be stored in en-frequencies.json.
 *
 * @param {string} key
 * @param {1|2|3|4} nGramOrder
 * @param {number} z
 * @param {Set<string>} stopSet
 */
function shouldStoreEnFrequencyKey(key, nGramOrder, z, stopSet) {
  const k = String(key).toLowerCase().trim();
  if (!k || k.length > 120) return false;
  if (nGramOrder === 1) {
    if (k.length <= 3) return false;
    if (stopSet.has(k)) return false;
    return z >= 2.2;
  }
  const parts = k.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return false;
  if (parts.every((p) => stopSet.has(p))) return false;
  if (nGramOrder === 2) return z >= 2.8;
  if (nGramOrder === 3) return z >= 2.3;
  if (nGramOrder === 4) {
    if (parts.length !== 4) return false;
    return z >= 4.0;
  }
  return false;
}

/**
 * Stricter gate for Pattern 7 empirical extra matches (multi-word only).
 *
 * @param {string} key
 * @param {number} z
 * @param {Set<string>} stopSet
 * @param {Set<string>} tierExclusiveSet lowercase curated tier phrases/words
 */
function shouldScoreEmpiricalExtra(key, z, stopSet, tierExclusiveSet) {
  const k = String(key).toLowerCase().trim();
  if (!k || k.length > 120) return false;
  if (tierExclusiveSet.has(k)) return false;
  if (!k.includes(' ')) return false;
  const parts = k.split(/\s+/).filter(Boolean);
  if (parts.length < 2 || parts.length > 4) return false;
  if (parts.every((p) => stopSet.has(p))) return false;
  if (parts.length === 2) return z >= 4.0;
  return z >= 2.3;
}

module.exports = {
  buildStopSet,
  shouldStoreEnFrequencyKey,
  shouldScoreEmpiricalExtra,
};
