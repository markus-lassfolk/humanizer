/**
 * metric-normalizer.js — stable output contract for computed metrics.
 *
 * Public CLI/report outputs must not leak JavaScript sentinel values such as
 * NaN, Infinity, -Infinity, or undefined. Numeric metrics that are unavailable
 * for an input are represented as null in JSON and as explicit human-readable
 * text in terminal/markdown output.
 */

const DEFAULT_UNAVAILABLE_REASON = 'metric unavailable';
const SHORT_INPUT_REASON = 'input too short';
const SPARSE_SENTENCE_REASON = 'requires at least 2 sentences';

const GENERAL_STAT_KEYS = [
  'avgWordLength',
  'avgParagraphLength',
  'functionWordRatio',
  'trigramRepetition',
];

const SENTENCE_VARIATION_KEYS = [
  'avgSentenceLength',
  'sentenceLengthStdDev',
  'sentenceLengthVariation',
  'burstiness',
];

const VOCABULARY_DIVERSITY_KEYS = ['typeTokenRatio'];
const READABILITY_KEYS = ['fleschKincaid', 'lix'];

/**
 * Return true when a value is a finite number that can be safely serialized and
 * displayed as a metric.
 *
 * @param {unknown} value
 * @returns {boolean}
 */
function isFiniteMetric(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Build an unavailable marker used alongside normalized JSON metrics.
 *
 * @param {string} reason
 * @returns {{available: false, reason: string}}
 */
function unavailable(reason = DEFAULT_UNAVAILABLE_REASON) {
  return { available: false, reason };
}

/**
 * Normalize any JSON-like value so non-finite numbers and undefined-derived
 * values become explicit nulls. Arrays and objects keep their shape.
 *
 * @param {unknown} value
 * @returns {unknown}
 */
function normalizeJsonValue(value) {
  if (value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (Array.isArray(value)) return value.map((item) => normalizeJsonValue(item));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, normalizeJsonValue(entry)]),
    );
  }
  return value;
}

/**
 * Normalize stats for CLI/JSON output. Counts and structural fields remain
 * numeric. Derived metrics become null when they are non-finite or when the
 * sample is too short to make that metric meaningful.
 *
 * JSON contract:
 * - unavailable numeric metrics are null;
 * - `metricAvailability.<metric>` explains each null metric;
 * - no NaN/Infinity/-Infinity/undefined values are emitted.
 *
 * @param {object|null|undefined} stats
 * @returns {object|null}
 */
function normalizeStatsForOutput(stats) {
  if (!stats || typeof stats !== 'object') return null;

  const normalized = normalizeJsonValue(stats);
  const availability = {};
  const wordCount = Number.isFinite(stats.wordCount) ? stats.wordCount : 0;
  const sentenceCount = Number.isFinite(stats.sentenceCount) ? stats.sentenceCount : 0;

  for (const key of [
    ...GENERAL_STAT_KEYS,
    ...SENTENCE_VARIATION_KEYS,
    ...VOCABULARY_DIVERSITY_KEYS,
  ]) {
    if (!isFiniteMetric(stats[key])) {
      normalized[key] = null;
      availability[key] = unavailable(DEFAULT_UNAVAILABLE_REASON);
    }
  }

  for (const key of GENERAL_STAT_KEYS) {
    if (wordCount === 0) {
      normalized[key] = null;
      availability[key] = unavailable(SHORT_INPUT_REASON);
    }
  }

  if (wordCount === 0) {
    for (const key of VOCABULARY_DIVERSITY_KEYS) {
      normalized[key] = null;
      availability[key] = unavailable(SHORT_INPUT_REASON);
    }
  }

  if (sentenceCount === 0) {
    for (const key of SENTENCE_VARIATION_KEYS) {
      normalized[key] = null;
      availability[key] = unavailable(SHORT_INPUT_REASON);
    }
  } else if (sentenceCount < 2) {
    for (const key of ['sentenceLengthStdDev', 'sentenceLengthVariation', 'burstiness']) {
      normalized[key] = null;
      availability[key] = unavailable(SPARSE_SENTENCE_REASON);
    }
  }

  for (const key of READABILITY_KEYS) {
    if (stats[key] === null || stats[key] === undefined) {
      normalized[key] = null;
      availability[key] = unavailable('not applicable for locale');
    } else if (!isFiniteMetric(stats[key])) {
      normalized[key] = null;
      availability[key] = unavailable(DEFAULT_UNAVAILABLE_REASON);
    }
  }

  if (wordCount < 3) {
    for (const key of READABILITY_KEYS) {
      if (stats[key] !== null && stats[key] !== undefined) {
        normalized[key] = null;
        availability[key] = unavailable(SHORT_INPUT_REASON);
      }
    }
  }

  normalized.metricAvailability = availability;
  return normalized;
}

/**
 * Normalize a complete analysis/suggestion payload for JSON output.
 *
 * @param {object} result
 * @returns {object}
 */
function normalizeAnalysisForOutput(result) {
  const { stats, ...rest } = result;
  const normalized = normalizeJsonValue(rest);
  if (stats !== undefined) {
    normalized.stats = normalizeStatsForOutput(stats);
  }
  return normalized;
}

/**
 * Format a metric for human-readable output using normalized metric metadata.
 *
 * @param {object} stats Normalized stats object from normalizeStatsForOutput()
 * @param {string} key Metric key
 * @param {string} [unit] Optional suffix for available values
 * @returns {string}
 */
function formatMetric(stats, key, unit = '') {
  const value = stats?.[key];
  if (value === null || value === undefined) {
    const reason = stats?.metricAvailability?.[key]?.reason || DEFAULT_UNAVAILABLE_REASON;
    return `unavailable (${reason})`;
  }
  return `${value}${unit}`;
}

module.exports = {
  normalizeJsonValue,
  normalizeStatsForOutput,
  normalizeAnalysisForOutput,
  formatMetric,
};
