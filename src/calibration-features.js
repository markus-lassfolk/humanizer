/**
 * Fixed feature vector for English ML score calibration (logistic layer on top of heuristics).
 * Order must match en-calibrator.json featureNames.
 */

const FEATURE_NAMES = [
  'patternScore',
  'uniformityScore',
  'compositeHeuristic',
  'log1pTotalMatches',
  'log1pWordCount',
  'findingsCount',
  'burstiness',
  'typeTokenRatio',
  'functionWordRatio',
  'trigramRepetition',
  'avgSentenceLength',
  'matchesContent',
  'matchesLanguage',
  'matchesStyle',
  'matchesCommunication',
  'matchesFiller',
];

/**
 * @param {object} p
 * @param {number} p.patternScore
 * @param {number} p.uniformityScore
 * @param {number} p.compositeHeuristic
 * @param {number} p.totalMatches
 * @param {number} p.words
 * @param {number} p.findingsCount
 * @param {object|null} p.stats
 * @param {object} p.categories — analyze() categories object
 * @returns {number[]}
 */
function buildCalibrationFeatureVector(p) {
  const s = p.stats || {};
  const cat = p.categories || {};
  const m = (name) => cat[name]?.matches ?? 0;

  return [
    p.patternScore ?? 0,
    p.uniformityScore ?? 0,
    p.compositeHeuristic ?? 0,
    Math.log1p(p.totalMatches ?? 0),
    Math.log1p(p.words ?? 0),
    p.findingsCount ?? 0,
    s.burstiness ?? 0,
    s.typeTokenRatio ?? 0,
    s.functionWordRatio ?? 0,
    s.trigramRepetition ?? 0,
    s.avgSentenceLength ?? 0,
    m('content'),
    m('language'),
    m('style'),
    m('communication'),
    m('filler'),
  ];
}

/**
 * @param {Record<string, number>} map
 */
function featureVectorFromRecord(map) {
  return FEATURE_NAMES.map((n) => map[n] ?? 0);
}

module.exports = {
  CALIBRATION_FEATURE_NAMES: FEATURE_NAMES,
  buildCalibrationFeatureVector,
  featureVectorFromRecord,
};
