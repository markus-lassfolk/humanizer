/**
 * stats.js — Text statistics engine.
 *
 * Computes stylometric features that distinguish AI from human writing.
 * Based on academic research (Copyleaks arxiv 2503.01659v1, StyloAI):
 *
 *   - Sentence length statistics (mean, std dev, variation coefficient)
 *   - Burstiness score (humans write in bursts/lulls; AI is uniform)
 *   - Vocabulary diversity (type-token ratio)
 *   - Function word ratio
 *   - N-gram repetition density
 *   - Readability metrics (Flesch-Kincaid for 'en', LIX for 'sv')
 *   - Paragraph structure statistics
 *
 * Locale support: pass opts.localeProfile (from src/locales/) to use
 * locale-specific function words, abbreviations, and readability formula.
 */

const fs = require('fs');
const path = require('path');
const { FUNCTION_WORDS } = require('./vocabulary');

let _enLmCache;
function loadEnglishLm() {
  if (_enLmCache !== undefined) return _enLmCache;
  try {
    const p = path.join(__dirname, '../locales/en-en/references/en-ngram-lm.json');
    _enLmCache = JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    _enLmCache = null;
  }
  return _enLmCache;
}

let _svLmCache;
function loadSwedishLm() {
  if (_svLmCache !== undefined) return _svLmCache;
  try {
    const p = path.join(__dirname, '../locales/sv-se/references/sv-ngram-lm.json');
    _svLmCache = JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    _svLmCache = null;
  }
  return _svLmCache;
}

// ─── Sentence Splitting ─────────────────────────────────

/**
 * Protect a list of abbreviations from being treated as sentence-ending dots.
 * Replaces each abbreviation's dots with the ONE DOT LEADER (\u2024) so the
 * general splitter does not split on them.
 *
 * Abbreviations that contain internal dots (e.g. "t.ex", "bl.a") have ALL
 * their dots escaped. Simple abbreviations (e.g. "Mr", "Dr") only have their
 * trailing dot escaped.
 *
 * @param {string}   text          — Input text
 * @param {string[]} abbreviations — Abbreviation list from locale profile
 * @returns {string}               — Text with abbreviation dots protected
 */
function protectAbbreviations(text, abbreviations) {
  let result = text;
  for (const abbr of abbreviations) {
    // Escape any dots within the abbreviation for regex use
    const escaped = abbr.replace(/\./g, '\\.');
    // Build pattern: word boundary + abbreviation + trailing dot
    const regex = new RegExp(`\\b${escaped}\\.`, 'gi');
    // Replace every dot (internal + trailing) with the placeholder
    const placeholder = `${abbr.replace(/\./g, '\u2024')}\u2024`;
    result = result.replace(regex, placeholder);
  }
  return result;
}

/**
 * Split text into sentences. Handles abbreviations and edge cases better
 * than a naive split on period.
 *
 * @param {string}  text          — Input text
 * @param {object}  [localeProfile] — Locale profile (from src/locales/)
 * @returns {string[]}
 */
function splitSentences(text, localeProfile) {
  const abbreviations = localeProfile ? localeProfile.abbreviations : null;

  let cleaned = text;

  // Apply locale-specific abbreviation protection
  if (abbreviations && abbreviations.length > 0) {
    cleaned = protectAbbreviations(cleaned, abbreviations);
  } else {
    // English fallback (legacy behaviour)
    cleaned = protectAbbreviations(cleaned, [
      'Mr',
      'Mrs',
      'Ms',
      'Dr',
      'Prof',
      'Sr',
      'Jr',
      'etc',
      'e.g',
      'i.e',
      'fig',
      'no',
      'Inc',
      'vs',
      'approx',
      'dept',
      'est',
      'vol',
    ]);
  }

  // Language-agnostic: protect initials and numbered lists regardless of locale
  cleaned = cleaned
    .replace(/(?<!\p{L})(\p{L})\./gu, '$1\u2024') // initials: "J. K. Rowling", "Å. Andersson", "e. e. cummings"
    .replace(/(\d)\.(\d)/g, '$1\u2024$2') // decimals/time values: "14.30"
    .replace(/(^|\n)(\s*)(\d+)\.(?=\s+\S)/g, '$1$2$3\u2024'); // numbered lists at line/string start: "1. First"

  return cleaned
    .split(/(?<=[.!?])\s+|(?<=[.!?])$/)
    .map((s) => s.replace(/\u2024/g, '.').trim())
    .filter((s) => s.length > 0);
}

// ─── Core Statistics ─────────────────────────────────────

/**
 * Tokenize text into words (lowercase).
 *
 * Uses Unicode property escapes (\p{L}, \p{N}) with the /u flag so that
 * letters outside ASCII — including Swedish å, ä, ö and other accented
 * characters — are preserved rather than stripped.
 *
 * @param {string} text
 * @returns {string[]}
 */
function tokenize(text) {
  return (
    text
      .toLowerCase()
      // Keep Unicode letters, digits, apostrophes, and hyphens between letters.
      // Replace everything else with a space.
      .replace(/[^\p{L}\p{N}'\-\s]/gu, ' ')
      // Collapse runs of hyphens/apostrophes that aren't surrounded by letters
      .replace(/(?<!\p{L})[-']|[-'](?!\p{L})/gu, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 0)
  );
}

/**
 * Compute all text statistics.
 *
 * @param {string}  text          — Input text
 * @param {object}  [localeProfile] — Locale profile (from src/locales/)
 * @returns {object}              — Statistics object
 */
function computeStats(text, localeProfile) {
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return emptyStats();
  }

  const words = tokenize(text);
  const sentences = splitSentences(text, localeProfile);
  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0);

  if (words.length === 0) return emptyStats();

  // ── Word-level stats ────────────────────────────────
  const wordCount = words.length;
  const uniqueWords = new Set(words);
  const typeTokenRatio = uniqueWords.size / wordCount;

  // Average word length
  const avgWordLength = words.reduce((sum, w) => sum + w.length, 0) / wordCount;

  // ── Sentence-level stats ────────────────────────────
  const sentenceLengths = sentences.map((s) => tokenize(s).length).filter((n) => n > 0);
  const sentenceCount = sentenceLengths.length;

  let avgSentenceLength = 0;
  let sentenceLengthStdDev = 0;
  let sentenceLengthVariation = 0;
  let burstiness = 0;

  if (sentenceCount > 1) {
    avgSentenceLength = sentenceLengths.reduce((a, b) => a + b, 0) / sentenceCount;

    // Sample standard deviation (Bessel correction, divide by n - 1)
    const variance =
      sentenceLengths.reduce((sum, len) => sum + Math.pow(len - avgSentenceLength, 2), 0) /
      (sentenceCount - 1);
    sentenceLengthStdDev = Math.sqrt(variance);

    // Coefficient of variation (std dev / mean) — our burstiness proxy
    sentenceLengthVariation = avgSentenceLength > 0 ? sentenceLengthStdDev / avgSentenceLength : 0;

    // Burstiness: based on consecutive sentence length differences
    // High burstiness = human (lots of variation between consecutive sentences)
    // Low burstiness = AI (uniform sentence length throughout)
    let consecutiveDiffSum = 0;
    for (let i = 1; i < sentenceLengths.length; i++) {
      consecutiveDiffSum += Math.abs(sentenceLengths[i] - sentenceLengths[i - 1]);
    }
    const avgConsecutiveDiff = consecutiveDiffSum / (sentenceLengths.length - 1);
    burstiness = avgSentenceLength > 0 ? avgConsecutiveDiff / avgSentenceLength : 0;
  } else if (sentenceCount === 1) {
    avgSentenceLength = sentenceLengths[0];
  }

  // ── Function word ratio ─────────────────────────────
  const activeFunctionWords = localeProfile ? localeProfile.functionWords : FUNCTION_WORDS;
  const functionWordSet = new Set(activeFunctionWords);
  const functionWordCount = words.filter((w) => functionWordSet.has(w)).length;
  const functionWordRatio = functionWordCount / wordCount;

  // ── N-gram repetition ───────────────────────────────
  const trigramRepetition = computeNgramRepetition(words, 3);

  // ── Paragraph stats ─────────────────────────────────
  const paragraphCount = paragraphs.length;
  const avgParagraphLength =
    paragraphCount > 0
      ? paragraphs.reduce((sum, p) => sum + tokenize(p).length, 0) / paragraphCount
      : 0;

  // ── Readability ─────────────────────────────────────
  const useReadability = localeProfile ? localeProfile.readability : 'flesch-kincaid';
  let fleschKincaid = null;
  let lix = null;

  if (useReadability === 'lix') {
    // LIX (Läsbarhetsindex) — standard Nordic readability metric.
    // LIX = words/sentences + (longWords * 100) / words
    // "Long word" = more than 6 characters.
    if (sentenceCount > 0) {
      const longWordCount = words.filter((w) => w.length > 6).length;
      lix = round(wordCount / sentenceCount + (longWordCount * 100) / wordCount);
    } else {
      lix = 0;
    }
  } else {
    // Flesch-Kincaid Grade Level approximation (English)
    const syllableCount = words.reduce((sum, w) => sum + estimateSyllables(w), 0);
    fleschKincaid =
      sentenceCount > 0
        ? round(0.39 * (wordCount / sentenceCount) + 11.8 * (syllableCount / wordCount) - 15.59)
        : 0;
  }

  return {
    wordCount,
    uniqueWordCount: uniqueWords.size,
    sentenceCount,
    paragraphCount,
    avgWordLength: round(avgWordLength),
    avgSentenceLength: round(avgSentenceLength),
    sentenceLengthStdDev: round(sentenceLengthStdDev),
    sentenceLengthVariation: round(sentenceLengthVariation),
    burstiness: round(burstiness),
    typeTokenRatio: round(typeTokenRatio),
    functionWordRatio: round(functionWordRatio),
    trigramRepetition: round(trigramRepetition),
    avgParagraphLength: round(avgParagraphLength),
    // Readability: one of these will be null depending on locale
    fleschKincaid,
    lix,
    sentenceLengths,
  };
}

/**
 * Compute n-gram repetition rate.
 * Returns the fraction of n-grams that appear more than once.
 * AI text tends to reuse similar n-grams more than human text.
 */
function computeNgramRepetition(words, n) {
  if (words.length < n) return 0;

  const ngrams = {};
  for (let i = 0; i <= words.length - n; i++) {
    const gram = words.slice(i, i + n).join(' ');
    ngrams[gram] = (ngrams[gram] || 0) + 1;
  }

  const totalNgrams = Object.keys(ngrams).length;
  if (totalNgrams === 0) return 0;

  const repeated = Object.values(ngrams).filter((c) => c > 1).length;
  return repeated / totalNgrams;
}

/**
 * Estimate syllable count for a word (English heuristic).
 * Not used for Swedish (LIX does not require syllable counting).
 */
function estimateSyllables(word) {
  word = word.toLowerCase().replace(/[^a-z]/g, '');
  if (word.length <= 3) return 1;

  // Count vowel groups
  const vowelGroups = word.match(/[aeiouy]+/g);
  let count = vowelGroups ? vowelGroups.length : 1;

  // Subtract silent e
  if (word.endsWith('e') && !word.endsWith('le')) count--;
  // Subtract for -ed that doesn't create a syllable
  if (word.endsWith('ed') && word.length > 3 && !/[aeiouy]ed$/.test(word)) count--;

  return Math.max(count, 1);
}

/**
 * Compute a "uniformity score" from text stats.
 * Higher = more uniform/AI-like. Lower = more varied/human-like.
 * Range: 0-100. Language-agnostic — based purely on structural metrics.
 */
function computeUniformityScore(stats) {
  if (stats.wordCount === 0) return 0;

  let score = 0;

  // Low burstiness = more AI-like (max 25 points)
  // Human burstiness is typically 0.5-1.0, AI is 0.1-0.3
  if (stats.burstiness < 0.2) score += 25;
  else if (stats.burstiness < 0.35) score += 18;
  else if (stats.burstiness < 0.5) score += 10;
  else if (stats.burstiness < 0.65) score += 5;

  // Low sentence length variation = more AI-like (max 25 points)
  // Human CoV is typically 0.4-0.8, AI is 0.15-0.35
  if (stats.sentenceLengthVariation < 0.2) score += 25;
  else if (stats.sentenceLengthVariation < 0.35) score += 18;
  else if (stats.sentenceLengthVariation < 0.5) score += 10;
  else if (stats.sentenceLengthVariation < 0.65) score += 5;

  // Low type-token ratio = more repetitive/AI-like (max 20 points)
  // But very short texts naturally have high TTR, so only penalize for longer texts
  if (stats.wordCount > 100) {
    if (stats.typeTokenRatio < 0.35) score += 20;
    else if (stats.typeTokenRatio < 0.45) score += 12;
    else if (stats.typeTokenRatio < 0.55) score += 5;
  }

  // High trigram repetition = more AI-like (max 15 points)
  if (stats.trigramRepetition > 0.15) score += 15;
  else if (stats.trigramRepetition > 0.1) score += 10;
  else if (stats.trigramRepetition > 0.05) score += 5;

  // Abnormally uniform paragraph lengths (max 15 points)
  // Only check if we have multiple paragraphs
  if (stats.paragraphCount >= 3 && stats.sentenceCount > 5) {
    if (stats.sentenceLengthStdDev < 3 && stats.avgSentenceLength > 10) {
      score += 15;
    }
  }

  return Math.min(score, 100);
}

/**
 * Optional boost when text has unusually uniform per-token surprise under a human unigram LM.
 * Used with --with-lm for English or Swedish. Range ~0–28.
 * @param {string} text
 * @param {string} [locale='en']  'en' | 'sv'
 * @returns {number}
 */
function computeLmUniformityBoost(text, locale = 'en') {
  const lm = locale === 'sv' ? loadSwedishLm() : loadEnglishLm();
  if (!lm || !lm.unigrams || !text) return 0;
  const words = tokenize(text);
  if (words.length < 40) return 0;
  const nlls = [];
  for (const w of words) {
    const p = lm.unigrams[w] || lm.defaultUni || 1e-10;
    nlls.push(-Math.log(p));
  }
  const mean = nlls.reduce((a, b) => a + b, 0) / nlls.length;
  let v = 0;
  for (const x of nlls) v += (x - mean) ** 2;
  v /= nlls.length;
  let boost = 0;
  if (v < 0.28) boost += 12;
  else if (v < 0.45) boost += 6;
  if (mean < 6.8) boost += 10;
  return Math.min(boost, 28);
}

function emptyStats() {
  return {
    wordCount: 0,
    uniqueWordCount: 0,
    sentenceCount: 0,
    paragraphCount: 0,
    avgWordLength: 0,
    avgSentenceLength: 0,
    sentenceLengthStdDev: 0,
    sentenceLengthVariation: 0,
    burstiness: 0,
    typeTokenRatio: 0,
    functionWordRatio: 0,
    trigramRepetition: 0,
    avgParagraphLength: 0,
    fleschKincaid: null,
    lix: null,
    sentenceLengths: [],
  };
}

function round(n) {
  return Math.round(n * 1000) / 1000;
}

// ─── Exports ─────────────────────────────────────────────

module.exports = {
  computeStats,
  computeUniformityScore,
  computeLmUniformityBoost,
  computeNgramRepetition,
  splitSentences,
  tokenize,
  estimateSyllables,
  protectAbbreviations,
};
