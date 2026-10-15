/**
 * profiles.js — Named detector profiles.
 *
 * Slugs match HALO-core scripts/prose_style.py detector IDs so both tools
 * share one vocabulary. `security-prose` mirrors its
 * DEFAULT_DISABLED_FOR_SECURITY_PROSE: constructs that are normal in
 * security/incident writing and only add noise.
 */

const PATTERN_SLUGS = {
  10: 'rule_of_three',
  13: 'em_dash_overuse',
  14: 'boldface_overuse',
  15: 'inline_header_lists',
  18: 'curly_quotes',
  23: 'excessive_hedging',
  36: 'not_x_but_y',
  37: 'staged_run_up',
  38: 'one_line_closer',
};

const PROFILES = {
  'security-prose': {
    disabled: [
      'em_dash_overuse',
      'boldface_overuse',
      'inline_header_lists',
      'rule_of_three',
      'excessive_hedging',
      'curly_quotes',
    ],
  },
};

function disabledPatternIds(profile) {
  if (!profile) return new Set();
  const def = PROFILES[profile];
  if (!def) {
    throw new Error(`Unknown profile "${profile}". Available: ${Object.keys(PROFILES).join(', ')}`);
  }
  return new Set(
    Object.entries(PATTERN_SLUGS)
      .filter(([, slug]) => def.disabled.includes(slug))
      .map(([id]) => Number(id)),
  );
}

module.exports = { PATTERN_SLUGS, PROFILES, disabledPatternIds };
