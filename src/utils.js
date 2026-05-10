/**
 * utils.js — Shared utility functions
 */

/**
 * Round a numeric value for display, ensuring it's non-negative and finite.
 * @param {number} value - The value to round
 * @returns {number} - The rounded value (0 if not finite)
 */
function roundDisplayCount(value) {
  return Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
}

module.exports = {
  roundDisplayCount,
};
