/**
 * Optional English score calibrator: logistic regression on heuristic features.
 * Artifact: locales/en-en/references/en-calibrator.json (from train-en-calibrator.mjs)
 */

const fs = require('fs');
const path = require('path');
const {
  CALIBRATION_FEATURE_NAMES,
  buildCalibrationFeatureVector,
} = require('./calibration-features');

/** @type {{ ready: boolean, cal: object|null }} */
let _cache = { ready: false, cal: null };

/**
 * ML calibration is opt-in: a small training set overfits easily (e.g. human fixtures scoring as AI).
 * Set HUMANIZER_ML_CALIBRATION=1 after training on a large wiki vs AI dataset.
 */
function mlCalibrationEnabled() {
  return process.env.HUMANIZER_ML_CALIBRATION === '1';
}

function calibratorPath() {
  return path.join(__dirname, '../locales/en-en/references/en-calibrator.json');
}

function loadEnCalibrator() {
  if (_cache.ready) return _cache.cal;
  _cache.ready = true;
  if (!mlCalibrationEnabled()) {
    _cache.cal = null;
    return null;
  }
  const p = calibratorPath();
  try {
    const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
    if (
      !raw ||
      !Array.isArray(raw.weights) ||
      typeof raw.bias !== 'number' ||
      !Array.isArray(raw.mean) ||
      !Array.isArray(raw.std) ||
      raw.weights.length !== CALIBRATION_FEATURE_NAMES.length
    ) {
      _cache.cal = null;
    } else {
      _cache.cal = raw;
    }
  } catch {
    _cache.cal = null;
  }
  return _cache.cal;
}

function invalidateEnCalibratorCache() {
  _cache = { ready: false, cal: null };
}

function sigmoid(z) {
  if (z > 35) return 1;
  if (z < -35) return 0;
  return 1 / (1 + Math.exp(-z));
}

/**
 * Standardize x using calibrator mean/std; compute P(AI); map to 0–100 display score.
 * @returns {number|null} null if no calibrator file
 */
function calibratedEnScoreFromFeatures(cal, featureVec) {
  let z = cal.bias;
  for (let i = 0; i < featureVec.length; i++) {
    const std = cal.std[i];
    const den = std > 1e-9 ? std : 1;
    z += cal.weights[i] * ((featureVec[i] - cal.mean[i]) / den);
  }
  const p = sigmoid(z);
  return Math.min(100, Math.max(0, Math.round(100 * p)));
}

/**
 * @param {object} analysisSlice — patternScore, uniformityScore, compositeHeuristic, totalMatches, wordCount, findings, stats, categories
 */
function applyEnglishCalibrator(analysisSlice) {
  const cal = loadEnCalibrator();
  if (!cal) return null;

  const findings = analysisSlice.findings || [];
  const vec = buildCalibrationFeatureVector({
    patternScore: analysisSlice.patternScore,
    uniformityScore: analysisSlice.uniformityScore,
    compositeHeuristic: analysisSlice.compositeHeuristic,
    totalMatches: analysisSlice.totalMatches,
    words: analysisSlice.wordCount,
    findingsCount: findings.length,
    stats: analysisSlice.stats,
    categories: analysisSlice.categories,
  });

  return calibratedEnScoreFromFeatures(cal, vec);
}

module.exports = {
  loadEnCalibrator,
  invalidateEnCalibratorCache,
  applyEnglishCalibrator,
  calibratedEnScoreFromFeatures,
  calibratorPath,
};
