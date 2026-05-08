/**
 * locales/en.js — English locale profile.
 *
 * Re-exports the existing vocabulary data so the locale system has a
 * consistent shape without duplicating any content. English remains the
 * default when no locale is specified.
 */

const { TIER_1, TIER_2, TIER_3, AI_PHRASES, FUNCTION_WORDS } = require('../vocabulary');

module.exports = {
  code: 'en',

  // ── Vocabulary tiers ──────────────────────────────────
  tier1: TIER_1,
  tier2: TIER_2,
  tier3: TIER_3,
  phrases: AI_PHRASES,

  // ── Stylometric data ──────────────────────────────────
  functionWords: FUNCTION_WORDS,

  // ── Sentence splitting ────────────────────────────────
  // Simple abbreviations: matched as \b(word)\. in splitSentences.
  abbreviations: [
    'Mr',
    'Mrs',
    'Ms',
    'Dr',
    'Prof',
    'Sr',
    'Jr',
    'etc',
    'vs',
    'approx',
    'dept',
    'est',
    'vol',
  ],

  // ── Readability metric ────────────────────────────────
  readability: 'flesch-kincaid',

  // ── Locale-specific autofixes ─────────────────────────
  // English autofixes live in humanizer.js (safeFills). No extra ones here.
  autofixes: [],

  /** Reserved for English empirical n-grams (unused; Swedish uses sv.js). */
  empiricalExtra: [],
};
