/**
 * locales/index.js — Locale loader.
 *
 * Returns the active locale profile by name. Throws on unknown locales so
 * callers fail fast rather than silently using the wrong vocabulary.
 *
 * Supported locales: 'en' (default), 'sv', 'nb', 'da'
 */

const en = require('./en');
const sv = require('./sv');
const nb = require('./nb');
const da = require('./da');

const LOCALES = { en, sv, nb, da };

/**
 * Load a locale profile by code.
 *
 * @param {string} [name='en'] — Locale code ('en' | 'sv' | 'nb' | 'da')
 * @returns {object}           — Locale profile
 */
function loadLocale(name = 'en') {
  const locale = LOCALES[name];
  if (!locale) {
    throw new Error(
      `Unknown locale "${name}". Supported locales: ${Object.keys(LOCALES).join(', ')}`,
    );
  }
  return locale;
}

module.exports = { loadLocale, SUPPORTED_LOCALES: Object.keys(LOCALES) };
