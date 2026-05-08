/**
 * locales/en/index.js — English locale profile (default).
 */

const { TIER_1, TIER_2, TIER_3, AI_PHRASES, FUNCTION_WORDS } = require('./vocabulary');
const { PATTERN_PACKS_EN } = require('./pattern-packs');

module.exports = {
  code: 'en',

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
    'vs',
    'approx',
    'dept',
    'est',
    'vol',
  ],

  readability: 'flesch-kincaid',

  autofixes: [],

  empiricalExtra: [],

  patternPacks: PATTERN_PACKS_EN,
};
