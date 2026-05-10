/**
 * Locale-aware composite scoring knobs (pattern density, breadth, category blend).
 *
 * - DEFAULT_SCORING_KNOBS: used when a locale does not set `profile.scoring`
 * - SCORING_KNOBS_EN / SCORING_KNOBS_SV: explicit presets for shipped locales
 */

/** @typedef {{ densityCoef: number, densityCap: number, breadthMult: number, breadthCap: number, categoryMult: number, categoryCap: number, patternWeight: number }} ScoringKnobs */

/**
 * Baseline knobs that preserve current main-branch runtime behavior.
 * Density: log2(d+1) * 13 capped at 65
 * Breadth: findings * 2 capped at 20
 * Category: categories * 3 capped at 15
 * Composite: 70% pattern + 30% uniformity
 */
const DEFAULT_SCORING_KNOBS = {
  densityCoef: 13,
  densityCap: 65,
  breadthMult: 2,
  breadthCap: 20,
  categoryMult: 3,
  categoryCap: 15,
  patternWeight: 0.7,
};

const SCORING_KNOBS_EN = { ...DEFAULT_SCORING_KNOBS };
const SCORING_KNOBS_SV = { ...DEFAULT_SCORING_KNOBS };

/**
 * @param {object} profile locale profile from loadLocale()
 * @returns {ScoringKnobs}
 */
function mergeScoringKnobs(profile) {
  return { ...DEFAULT_SCORING_KNOBS, ...(profile?.scoring || {}) };
}

module.exports = {
  DEFAULT_SCORING_KNOBS,
  SCORING_KNOBS_EN,
  SCORING_KNOBS_SV,
  mergeScoringKnobs,
};
