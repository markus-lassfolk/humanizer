/**
 * locales/en/index.js — English locale profile (default).
 */

const {
  TIER_1,
  TIER_2,
  TIER_3,
  AI_PHRASES,
  FUNCTION_WORDS,
  AUTOFIXES_EN,
} = require('./vocabulary');
const { PATTERN_PACKS_EN } = require('./pattern-packs');
const { SCORING_KNOBS_EN } = require('../scoring-defaults');

module.exports = {
  code: 'en',

  // Locale-specific scoring knobs merged over DEFAULT_SCORING_KNOBS.
  scoring: SCORING_KNOBS_EN,

  tier1: TIER_1,
  tier2: TIER_2,
  tier3: TIER_3,
  phrases: AI_PHRASES,

  functionWords: FUNCTION_WORDS,

  abbreviations: [
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
    'Inc',
    'vs',
    'approx',
    'dept',
    'est',
    'vol',
  ],

  readability: 'flesch-kincaid',

  autofixes: AUTOFIXES_EN,

  empiricalExtra: [],

  patternPacks: PATTERN_PACKS_EN,
};
