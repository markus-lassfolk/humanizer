/**
 * locales/en/empirical-filter.js — English locale
 *
 * Pattern 7 does not load corpus-derived empirical n-grams for English
 * (`empiricalExtra` is always `[]` in the profile). This file exists so every
 * locale folder exposes the same modules; the helpers are inert stubs.
 */

/**
 * @param {string[]} _functionWords
 * @returns {Set<string>}
 */
function buildStopSet(_functionWords) {
  return new Set();
}

/**
 * @returns {false}
 */
function shouldStoreEnFrequencyKey() {
  return false;
}

/**
 * @returns {false}
 */
function shouldScoreEmpiricalExtra() {
  return false;
}

module.exports = {
  buildStopSet,
  shouldStoreEnFrequencyKey,
  shouldScoreEmpiricalExtra,
};
