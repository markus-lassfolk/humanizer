/**
 * humanizer.js — Core humanization logic.
 *
 * Takes analysis results and produces specific rewrite suggestions.
 * This doesn't auto-rewrite (AI text needs human judgment to fix well),
 * but it provides actionable, pattern-specific guidance.
 */

const { analyze } = require('./analyzer');
const { FILLER_PHRASES } = require('./patterns');

// ─── Automatic Fixes (safe to apply mechanically) ────────

/**
 * Apply safe, mechanical fixes that don't require judgment.
 * These are transformations where the "right" answer is unambiguous.
 *
 * @param {string} text — Input text
 * @returns {{ text: string, fixes: string[] }}
 */
function autoFix(text) {
  let result = text;
  const fixes = [];

  // Fix curly quotes → straight quotes
  if (/[\u201C\u201D]/.test(result)) {
    result = result.replace(/[\u201C\u201D]/g, '"');
    fixes.push('Replaced curly double quotes with straight quotes');
  }
  if (/[\u2018\u2019]/.test(result)) {
    result = result.replace(/[\u2018\u2019]/g, "'");
    fixes.push('Replaced curly single quotes with straight quotes');
  }

  // Fix filler phrases (unambiguous replacements)
  const safeFills = [
    { from: /\bin order to\b/gi, to: 'to', label: '"in order to" → "to"' },
    { from: /\bdue to the fact that\b/gi, to: 'because', label: '"due to the fact that" → "because"' },
    { from: /\bat this point in time\b/gi, to: 'now', label: '"at this point in time" → "now"' },
    { from: /\bin the event that\b/gi, to: 'if', label: '"in the event that" → "if"' },
    { from: /\bhas the ability to\b/gi, to: 'can', label: '"has the ability to" → "can"' },
    { from: /\bfor the purpose of\b/gi, to: 'to', label: '"for the purpose of" → "to"' },
    { from: /\bfirst and foremost\b/gi, to: 'first', label: '"first and foremost" → "first"' },
  ];

  for (const { from, to, label } of safeFills) {
    if (from.test(result)) {
      result = result.replace(from, to);
      fixes.push(label);
    }
  }

  // Remove chatbot artifacts at start/end
  const chatbotStart = [
    /^(Here is|Here's) (a |an |the )?(overview|summary|breakdown|list|guide|explanation)[^.]*\.\s*/i,
    /^(Of course|Certainly|Absolutely|Sure)!\s*/i,
    /^(Great|Excellent|Good|Wonderful|Fantastic) question!\s*/i,
  ];
  for (const regex of chatbotStart) {
    if (regex.test(result)) {
      result = result.replace(regex, '');
      fixes.push('Removed chatbot opening artifact');
    }
  }

  const chatbotEnd = [
    /\s*(I hope this helps|Let me know if you('d| would) like|Feel free to|Don't hesitate to|Is there anything else)[^.]*[.!]\s*$/i,
  ];
  for (const regex of chatbotEnd) {
    if (regex.test(result)) {
      result = result.replace(regex, '');
      fixes.push('Removed chatbot closing artifact');
    }
  }

  // Remove leading/trailing whitespace artifacts
  result = result.trim();

  return { text: result, fixes };
}

// ─── Suggestion Engine ───────────────────────────────────

/**
 * Generate humanization suggestions for the given text.
 *
 * @param {string} text    — Input text to humanize
 * @param {object} opts    — Options: { autofix: bool, verbose: bool }
 * @returns {object}       — Suggestions report
 */
function humanize(text, opts = {}) {
  const { autofix = false, verbose = false } = opts;

  // Run analysis
  const analysis = analyze(text, { verbose: true });

  // Group suggestions by priority
  const critical = [];  // Score 4-5: these scream "AI"
  const important = []; // Score 2-3: noticeable AI patterns
  const minor = [];     // Score 1: subtle tells

  for (const finding of analysis.findings) {
    const suggestions = finding.matches.map(m => ({
      pattern: finding.patternName,
      patternId: finding.patternId,
      category: finding.category,
      text: m.match,
      line: m.line,
      column: m.column,
      suggestion: m.suggestion,
    }));

    if (finding.weight >= 4) {
      critical.push(...suggestions);
    } else if (finding.weight >= 2) {
      important.push(...suggestions);
    } else {
      minor.push(...suggestions);
    }
  }

  // Apply auto-fixes if requested
  let fixedText = null;
  let appliedFixes = [];
  if (autofix) {
    const result = autoFix(text);
    fixedText = result.text;
    appliedFixes = result.fixes;
  }

  return {
    score: analysis.score,
    wordCount: analysis.wordCount,
    totalIssues: analysis.totalMatches,
    critical,
    important,
    minor,
    autofix: autofix ? { text: fixedText, fixes: appliedFixes } : null,
    guidance: buildGuidance(analysis),
  };
}

/**
 * Build high-level guidance based on what patterns were found.
 */
function buildGuidance(analysis) {
  const tips = [];

  const patternIds = new Set(analysis.findings.map(f => f.patternId));

  // Content guidance
  if (patternIds.has(1) || patternIds.has(4)) {
    tips.push('Replace inflated/promotional language with concrete facts. What specifically happened? Give dates, numbers, names.');
  }
  if (patternIds.has(5)) {
    tips.push('Name your sources. "Experts say" means nothing — who said it, when, and where?');
  }
  if (patternIds.has(3)) {
    tips.push('Cut trailing -ing phrases. If the point matters enough to mention, give it its own sentence.');
  }
  if (patternIds.has(6)) {
    tips.push('Replace formulaic "despite challenges" sections with specific problems and concrete outcomes.');
  }

  // Language guidance
  if (patternIds.has(7)) {
    tips.push('Swap AI vocabulary ("delve", "tapestry", "landscape", "showcase") for plainer words.');
  }
  if (patternIds.has(8)) {
    tips.push('Use "is" and "has" freely. "Serves as" and "boasts" are needlessly fancy.');
  }
  if (patternIds.has(10)) {
    tips.push('Break up triads. You don\'t always need three of everything — sometimes one or two is better.');
  }

  // Style guidance
  if (patternIds.has(13)) {
    tips.push('Ease up on em dashes. Use commas, periods, or parentheses for variety.');
  }
  if (patternIds.has(14) || patternIds.has(15)) {
    tips.push('Strip mechanical bold formatting and inline-header lists. Let prose do the work.');
  }
  if (patternIds.has(17)) {
    tips.push('Remove emojis from professional text. They signal chatbot output.');
  }

  // Communication guidance
  if (patternIds.has(19) || patternIds.has(21)) {
    tips.push('Remove chatbot filler ("I hope this helps!", "Great question!"). Just deliver the content.');
  }
  if (patternIds.has(20)) {
    tips.push('Delete knowledge-cutoff disclaimers. Either research it or leave it out.');
  }

  // Filler guidance
  if (patternIds.has(22) || patternIds.has(23)) {
    tips.push('Trim filler and hedging. "In order to" → "to". One qualifier per claim is enough.');
  }
  if (patternIds.has(24)) {
    tips.push('Cut generic conclusions. End with a specific fact or forward-looking detail instead of "the future looks bright".');
  }

  // Meta guidance
  if (analysis.score >= 50) {
    tips.push('Consider rewriting from scratch. When AI patterns are this dense, patching individual phrases often isn\'t enough — the structure itself needs rethinking.');
  }

  return tips;
}

// ─── Report Formatting ──────────────────────────────────

/**
 * Format humanization suggestions as a readable report.
 */
function formatSuggestions(result) {
  const lines = [];

  lines.push('╔══════════════════════════════════════════════╗');
  lines.push('║         HUMANIZATION SUGGESTIONS             ║');
  lines.push('╚══════════════════════════════════════════════╝');
  lines.push('');

  const filled = Math.round(result.score / 5);
  const bar = '█'.repeat(filled) + '░'.repeat(20 - filled);
  lines.push(`  AI Score: ${result.score}/100  [${bar}]`);
  lines.push(`  Issues found: ${result.totalIssues}`);
  lines.push('');

  if (result.critical.length > 0) {
    lines.push('── CRITICAL (these scream "AI") ────────────────');
    for (const s of result.critical) {
      lines.push(`  L${s.line}: [${s.pattern}] "${truncate(s.text, 60)}"`);
      lines.push(`       → ${s.suggestion}`);
    }
    lines.push('');
  }

  if (result.important.length > 0) {
    lines.push('── IMPORTANT (noticeable AI patterns) ──────────');
    for (const s of result.important) {
      lines.push(`  L${s.line}: [${s.pattern}] "${truncate(s.text, 60)}"`);
      lines.push(`       → ${s.suggestion}`);
    }
    lines.push('');
  }

  if (result.minor.length > 0) {
    lines.push('── MINOR (subtle tells) ────────────────────────');
    for (const s of result.minor) {
      lines.push(`  L${s.line}: [${s.pattern}] "${truncate(s.text, 60)}"`);
      lines.push(`       → ${s.suggestion}`);
    }
    lines.push('');
  }

  if (result.autofix) {
    lines.push('── AUTO-FIXES APPLIED ──────────────────────────');
    for (const fix of result.autofix.fixes) {
      lines.push(`  ✓ ${fix}`);
    }
    lines.push('');
  }

  if (result.guidance.length > 0) {
    lines.push('── GUIDANCE ────────────────────────────────────');
    for (const tip of result.guidance) {
      lines.push(`  • ${tip}`);
    }
    lines.push('');
  }

  lines.push('────────────────────────────────────────────────');
  return lines.join('\n');
}

function truncate(str, len) {
  if (typeof str !== 'string') return '';
  return str.length > len ? str.substring(0, len) + '...' : str;
}

// ─── Exports ─────────────────────────────────────────────

module.exports = {
  humanize,
  autoFix,
  formatSuggestions,
};
