/**
 * locales/nb/index.js — Norwegian (bokmål) locale profile.
 */

const {
  TIER_1_NB,
  TIER_2_NB,
  TIER_3_NB,
  AI_PHRASES_NB,
  FUNCTION_WORDS_NB,
  ABBREVIATIONS_NB,
  AUTOFIXES_NB,
  EMPIRICAL_EXTRA_NB,
} = require('./vocabulary');
const { NB_PATTERN_PACKS } = require('./pattern-packs');
const { DEFAULT_SCORING_KNOBS } = require('../scoring-defaults');

module.exports = {
  code: 'nb',

  // Nordic typography uses ” and ’ as ordinary quotes (Pattern 18 would be noise).
  nativeCurlyQuotes: true,

  scoring: { ...DEFAULT_SCORING_KNOBS },

  tier1: TIER_1_NB,
  tier2: TIER_2_NB,
  tier3: TIER_3_NB,
  phrases: AI_PHRASES_NB,

  empiricalExtra: EMPIRICAL_EXTRA_NB,

  patternPacks: NB_PATTERN_PACKS,

  functionWords: FUNCTION_WORDS_NB,
  abbreviations: ABBREVIATIONS_NB,

  readability: 'lix',

  autofixes: AUTOFIXES_NB,

  ui: {
    tier1Prefix: 'KI-typisk ord nivå 1',
    tier2Prefix: 'KI-typisk ord nivå 2',
    tier3Prefix: 'KI-typisk ord nivå 3 (høy tetthet)',
    empiricalPrefix: 'Empirisk KI-signal (corpus log-odds)',
    vocabSuggestion: 'Bytt til et enklere og mer konkret alternativ.',
  },
};
