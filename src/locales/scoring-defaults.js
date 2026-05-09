/**
 * Locale-aware composite scoring knobs (pattern density, breadth, category blend).
 *
 * Tuned on labeled corpora via `npm run tune:scoring` (see reports/tuning-*.md).
 *
 * - **DEFAULT_SCORING_KNOBS** — used for any locale that does not set `profile.scoring`
 *   (including future languages until they add overrides).
 * - **SCORING_KNOBS_EN** / **SCORING_KNOBS_SV** — explicit per-locale presets on `en` / `sv` profiles.
 */

/** @typedef {{ densityCoef: number, densityCap: number, breadthMult: number, breadthCap: number, categoryMult: number, categoryCap: number, patternWeight: number }} ScoringKnobs */

/** English-tuned defaults (also the fallback for new locales). */
const DEFAULT_SCORING_KNOBS = {
  densityCoef: 11,
  densityCap: 65,
  breadthMult: 3,
  breadthCap: 16,
  categoryMult: 5,
  categoryCap: 21,
  patternWeight: 0.8,
};

const SCORING_KNOBS_EN = { ...DEFAULT_SCORING_KNOBS };

const SCORING_KNOBS_SV = {
  densityCoef: 11,
  densityCap: 70,
  breadthMult: 2,
  breadthCap: 20,
  categoryMult: 2,
  categoryCap: 12,
  patternWeight: 0.8,
};

/**
 * @param {object} profile — locale profile from loadLocale()
 * @returns {ScoringKnobs}
 */
function mergeScoringKnobs(profile) {
  return { ...DEFAULT_SCORING_KNOBS, ...(profile.scoring || {}) };
}

module.exports = {
  DEFAULT_SCORING_KNOBS,
  SCORING_KNOBS_EN,
  SCORING_KNOBS_SV,
  mergeScoringKnobs,
};
