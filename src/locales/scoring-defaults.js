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

function coerceFiniteNumber(value, fallback) {
  if (value === null || value === undefined) return fallback;
  const coerced = Number(value);
  return Number.isFinite(coerced) ? coerced : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * @param {object} profile locale profile from loadLocale()
 * @returns {ScoringKnobs}
 */
function mergeScoringKnobs(profile) {
  const scoring = profile?.scoring;
  if (!scoring || typeof scoring !== 'object') {
    return { ...DEFAULT_SCORING_KNOBS };
  }

  return {
    densityCoef: coerceFiniteNumber(scoring.densityCoef, DEFAULT_SCORING_KNOBS.densityCoef),
    densityCap: coerceFiniteNumber(scoring.densityCap, DEFAULT_SCORING_KNOBS.densityCap),
    breadthMult: coerceFiniteNumber(scoring.breadthMult, DEFAULT_SCORING_KNOBS.breadthMult),
    breadthCap: coerceFiniteNumber(scoring.breadthCap, DEFAULT_SCORING_KNOBS.breadthCap),
    categoryMult: coerceFiniteNumber(scoring.categoryMult, DEFAULT_SCORING_KNOBS.categoryMult),
    categoryCap: coerceFiniteNumber(scoring.categoryCap, DEFAULT_SCORING_KNOBS.categoryCap),
    patternWeight: clamp(
      coerceFiniteNumber(scoring.patternWeight, DEFAULT_SCORING_KNOBS.patternWeight),
      0,
      1,
    ),
  };
}

module.exports = {
  DEFAULT_SCORING_KNOBS,
  SCORING_KNOBS_EN,
  SCORING_KNOBS_SV,
  mergeScoringKnobs,
};
