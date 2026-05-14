/**
 * locales/sv/index.js — Swedish locale profile.
 */

const {
  TIER_1_SV,
  TIER_2_SV,
  TIER_3_SV,
  AI_PHRASES_SV,
  FUNCTION_WORDS_SV,
  ABBREVIATIONS_SV,
  AUTOFIXES_SV,
  EMPIRICAL_EXTRA_SV,
} = require('./vocabulary');
const { SV_PATTERN_PACKS } = require('./pattern-packs');
const { SCORING_KNOBS_SV } = require('../scoring-defaults');

module.exports = {
  code: 'sv',

  // Locale-specific scoring knobs merged over DEFAULT_SCORING_KNOBS.
  scoring: SCORING_KNOBS_SV,

  tier1: TIER_1_SV,
  tier2: TIER_2_SV,
  tier3: TIER_3_SV,
  phrases: AI_PHRASES_SV,

  empiricalExtra: EMPIRICAL_EXTRA_SV,

  /**
   * Full packs for `sv`: English baseline (`../en/pattern-packs`) plus Swedish rows.
   */
  patternPacks: SV_PATTERN_PACKS,

  functionWords: FUNCTION_WORDS_SV,
  abbreviations: ABBREVIATIONS_SV,

  readability: 'lix',

  autofixes: AUTOFIXES_SV,

  ui: {
    tier1Prefix: 'AI-typiskt ord nivå 1',
    tier2Prefix: 'AI-typiskt ord nivå 2',
    tier3Prefix: 'AI-typiskt ord nivå 3 (hög densitet)',
    empiricalPrefix: 'Empirisk AI-signal (corpus log-odds)',
    vocabSuggestion: 'Byt till ett enklare och mer konkret alternativ.',
  },
};
