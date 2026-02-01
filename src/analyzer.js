/**
 * analyzer.js — Text analysis engine.
 *
 * Scans text for all 24 AI writing patterns and produces a scored report.
 */

const { patterns, wordCount } = require('./patterns');

// ─── Category weights for scoring ───────────────────────

const CATEGORY_LABELS = {
  content: 'Content patterns',
  language: 'Language & grammar',
  style: 'Style patterns',
  communication: 'Communication artifacts',
  filler: 'Filler & hedging',
};

// ─── Analysis Engine ─────────────────────────────────────

/**
 * Analyze text for AI writing patterns.
 *
 * @param {string} text  – The text to analyze
 * @param {object} opts  – Options: { verbose: bool, patternsToCheck: number[] }
 * @returns {object}     – Full analysis result
 */
function analyze(text, opts = {}) {
  const { verbose = false, patternsToCheck = null } = opts;

  if (!text || typeof text !== 'string') {
    return {
      score: 0,
      totalMatches: 0,
      wordCount: 0,
      categories: {},
      findings: [],
      summary: 'No text provided.',
    };
  }

  const words = wordCount(text);
  const findings = [];
  const categoryScores = {};

  // Initialize category accumulators
  for (const cat of Object.keys(CATEGORY_LABELS)) {
    categoryScores[cat] = { matches: 0, weightedScore: 0, patterns: [] };
  }

  // Run each pattern detector
  for (const pattern of patterns) {
    // Allow filtering to specific patterns
    if (patternsToCheck && !patternsToCheck.includes(pattern.id)) continue;

    const matches = pattern.detect(text);

    if (matches.length > 0) {
      const finding = {
        patternId: pattern.id,
        patternName: pattern.name,
        category: pattern.category,
        description: pattern.description,
        weight: pattern.weight,
        matchCount: matches.length,
        matches: verbose ? matches : matches.slice(0, 5), // Limit in non-verbose mode
        truncated: !verbose && matches.length > 5,
      };

      findings.push(finding);
      categoryScores[pattern.category].matches += matches.length;
      categoryScores[pattern.category].weightedScore += matches.length * pattern.weight;
      categoryScores[pattern.category].patterns.push(pattern.name);
    }
  }

  // Calculate total score (0-100)
  const score = calculateScore(findings, words);

  // Build category summary
  const categories = {};
  for (const [cat, label] of Object.entries(CATEGORY_LABELS)) {
    const data = categoryScores[cat];
    categories[cat] = {
      label,
      matches: data.matches,
      weightedScore: data.weightedScore,
      patternsDetected: data.patterns,
    };
  }

  const totalMatches = findings.reduce((sum, f) => sum + f.matchCount, 0);

  return {
    score,
    totalMatches,
    wordCount: words,
    categories,
    findings,
    summary: buildSummary(score, totalMatches, findings, words),
  };
}

/**
 * Calculate an AI score from 0-100.
 *
 * The score uses a density-based approach: more matches per word = higher score.
 * Pattern weights amplify high-signal patterns (chatbot artifacts, AI vocab).
 * The formula uses a logarithmic curve so scores don't just scale linearly.
 */
function calculateScore(findings, words) {
  if (words === 0 || findings.length === 0) return 0;

  // Sum all weighted hits
  let weightedTotal = 0;
  for (const f of findings) {
    weightedTotal += f.matchCount * f.weight;
  }

  // Density: weighted hits per 100 words
  const density = (weightedTotal / words) * 100;

  // Unique pattern count bonus (breadth of AI signals)
  const uniquePatterns = findings.length;
  const breadthBonus = Math.min(uniquePatterns * 2, 20); // up to 20 points for pattern variety

  // Category diversity bonus
  const categoriesHit = new Set(findings.map(f => f.category)).size;
  const categoryBonus = Math.min(categoriesHit * 3, 15); // up to 15 points for cross-category hits

  // Base score from density (logarithmic to avoid runaway scores)
  // density of 5 → ~30, density of 15 → ~50, density of 30 → ~65
  const densityScore = Math.min(Math.log2(density + 1) * 13, 65);

  const raw = densityScore + breadthBonus + categoryBonus;
  return Math.min(Math.round(raw), 100);
}

/**
 * Build a human-readable summary string.
 */
function buildSummary(score, totalMatches, findings, words) {
  if (totalMatches === 0) {
    return 'No AI writing patterns detected. The text looks human-written.';
  }

  const level = score >= 70 ? 'heavily AI-generated'
    : score >= 45 ? 'moderately AI-influenced'
    : score >= 20 ? 'lightly AI-touched'
    : 'mostly human-sounding';

  const uniquePatterns = findings.length;
  const topPatterns = findings
    .sort((a, b) => (b.matchCount * b.weight) - (a.matchCount * a.weight))
    .slice(0, 3)
    .map(f => f.patternName);

  return `Score: ${score}/100 (${level}). Found ${totalMatches} matches across ${uniquePatterns} pattern types in ${words} words. Top issues: ${topPatterns.join(', ')}.`;
}

// ─── Formatting ──────────────────────────────────────────

/**
 * Format analysis results as a human-readable report.
 */
function formatReport(result) {
  const lines = [];

  lines.push('╔══════════════════════════════════════════════╗');
  lines.push('║        AI WRITING PATTERN ANALYSIS           ║');
  lines.push('╚══════════════════════════════════════════════╝');
  lines.push('');

  // Score bar
  const filled = Math.round(result.score / 5);
  const bar = '█'.repeat(filled) + '░'.repeat(20 - filled);
  lines.push(`  Score: ${result.score}/100  [${bar}]`);
  lines.push(`  Words: ${result.wordCount}  |  Matches: ${result.totalMatches}`);
  lines.push('');
  lines.push(`  ${result.summary}`);
  lines.push('');

  // Category breakdown
  lines.push('── Categories ──────────────────────────────────');
  for (const [cat, data] of Object.entries(result.categories)) {
    if (data.matches > 0) {
      lines.push(`  ${data.label}: ${data.matches} matches (${data.patternsDetected.join(', ')})`);
    }
  }
  lines.push('');

  // Findings detail
  if (result.findings.length > 0) {
    lines.push('── Findings ────────────────────────────────────');
    for (const finding of result.findings) {
      lines.push('');
      lines.push(`  [${finding.patternId}] ${finding.patternName} (×${finding.matchCount}, weight: ${finding.weight})`);
      lines.push(`      ${finding.description}`);
      for (const match of finding.matches) {
        const loc = match.line ? `L${match.line}` : '';
        const preview = typeof match.match === 'string'
          ? match.match.substring(0, 80) + (match.match.length > 80 ? '...' : '')
          : '';
        lines.push(`      ${loc}: "${preview}"`);
        if (match.suggestion) {
          lines.push(`            → ${match.suggestion}`);
        }
      }
      if (finding.truncated) {
        lines.push(`      ... and ${finding.matchCount - finding.matches.length} more`);
      }
    }
  }

  lines.push('');
  lines.push('────────────────────────────────────────────────');
  return lines.join('\n');
}

/**
 * Format analysis results as JSON.
 */
function formatJSON(result) {
  return JSON.stringify(result, null, 2);
}

// ─── Quick Score ─────────────────────────────────────────

/**
 * Quick score — just returns the number.
 */
function score(text) {
  const result = analyze(text);
  return result.score;
}

// ─── Exports ─────────────────────────────────────────────

module.exports = {
  analyze,
  score,
  calculateScore,
  formatReport,
  formatJSON,
  CATEGORY_LABELS,
};
