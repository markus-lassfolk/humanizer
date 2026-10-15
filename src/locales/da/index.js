/**
 * locales/da/index.js — Danish locale profile.
 */

const {
  TIER_1_DA,
  TIER_2_DA,
  TIER_3_DA,
  AI_PHRASES_DA,
  FUNCTION_WORDS_DA,
  ABBREVIATIONS_DA,
  AUTOFIXES_DA,
  EMPIRICAL_EXTRA_DA,
} = require('./vocabulary');
const { DA_PATTERN_PACKS } = require('./pattern-packs');
const { DEFAULT_SCORING_KNOBS } = require('../scoring-defaults');

module.exports = {
  code: 'da',

  // Nordic typography uses ” and ’ as ordinary quotes (Pattern 18 would be noise).
  nativeCurlyQuotes: true,

  scoring: { ...DEFAULT_SCORING_KNOBS },

  tier1: TIER_1_DA,
  tier2: TIER_2_DA,
  tier3: TIER_3_DA,
  phrases: AI_PHRASES_DA,

  empiricalExtra: EMPIRICAL_EXTRA_DA,

  patternPacks: DA_PATTERN_PACKS,

  functionWords: FUNCTION_WORDS_DA,
  abbreviations: ABBREVIATIONS_DA,

  readability: 'lix',

  autofixes: AUTOFIXES_DA,

  ui: {
    tier1Prefix: 'AI-typisk ord niveau 1',
    tier2Prefix: 'AI-typisk ord niveau 2',
    tier3Prefix: 'AI-typisk ord niveau 3 (høj tæthed)',
    empiricalPrefix: 'Empirisk AI-signal (corpus log-odds)',
    vocabSuggestion: 'Skift til et enklere og mere konkret alternativ.',
  },
};
