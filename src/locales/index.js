/**
 * locales/index.js — Locale loader.
 *
 * Returns the active locale profile by name. Throws on unknown locales so
 * callers fail fast rather than silently using the wrong vocabulary.
 *
 * Supported locales: 'en' (default), 'sv'
 */

const en = require('./en');
const sv = require('./sv');

const LOCALES = { en, sv };

/**
 * Load a locale profile by code.
 *
 * @param {string} [name='en'] — Locale code ('en' | 'sv')
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
