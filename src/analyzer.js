/**
 * analyzer.js — Text analysis engine.
 *
 * Combines pattern detection with statistical analysis to produce a
 * comprehensive AI writing score. The score uses three signal types:
 *
 *   1. Pattern matches — vocabulary, phrases, structural patterns (29 detectors)
 *   2. Text statistics — burstiness, sentence variation, type-token ratio
 *   3. Category breadth — how many different AI signal types are present
 *
 * Based on research from:
 *   - Wikipedia:Signs of AI writing
 *   - Copyleaks stylistic fingerprint analysis (arxiv 2503.01659v1)
 *   - StyloAI 31-feature stylometric analysis
 */

const { patterns, wordCount } = require('./patterns');
const { computeStats, computeUniformityScore, tokenize } = require('./stats');
const { stripCodeSnippets } = require('./preprocess');
const { loadLocale } = require('./locales');
const { DEFAULT_SCORING_KNOBS, mergeScoringKnobs } = require('./locales/scoring-defaults');
const {
  normalizeAnalysisForOutput,
  normalizeStatsForOutput,
  formatMetric,
} = require('./metric-normalizer');
const { roundDisplayCount } = require('./utils');

// ─── Category Labels ────────────────────────────────────

const CATEGORY_LABELS = {
  content: 'Content patterns',
  language: 'Language & grammar',
  style: 'Style patterns',
  communication: 'Communication artifacts',
  filler: 'Filler & hedging',
};

const RELIABILITY_RECOMMENDED_WORDS = 150;

// ─── Analysis Engine ─────────────────────────────────────

/**
 * Analyze text for AI writing patterns and compute statistics.
 *
 * @param {string} text  — The text to analyze
 * @param {object} opts  — Options:
 *   - verbose {boolean}     Show all matches (not just top 5 per pattern)
 *   - patternsToCheck {number[]}  Only run specific pattern IDs
 *   - includeStats {boolean}  Include full text statistics (default: true)
 *   - ignoreCode {boolean}  Ignore fenced/inline code snippets before analysis
 *   - locale {string}       Locale code: 'en' (default) or 'sv'
 *   - strict {boolean}      Enable strict-mode inclusive-language hints (default: false)
 *   - withLm {boolean}      Apply optional n-gram uniformity boost (default: false)
 *   - config {object}       Custom config overrides
 * @returns {object}     — Full analysis result
 */
function analyze(text, opts = {}) {
  const {
    verbose = false,
    patternsToCheck = null,
    includeStats = true,
    ignoreCode = false,
    locale = 'en',
    strict = false,
    withLm = false,
  } = opts;

  if (text === null || text === undefined || typeof text !== 'string') {
    return emptyResult();
  }

  // Normalize to NFC so that canonically equivalent Unicode forms (e.g. NFD
  // decomposed diacritics from some editors/OS integrations) are treated
  // identically to their NFC equivalents by all downstream detectors.
  text = text.normalize('NFC');

  // Validate locale for all string inputs to keep configuration errors consistent.
  const localeProfile = loadLocale(locale);
  const scoringKnobs = mergeScoringKnobs(localeProfile);

  const preparedText = ignoreCode ? stripCodeSnippets(text) : text;
  const normalizedText = preparedText.normalize('NFC');
  const trimmed = normalizedText.trim();
  if (trimmed.length === 0) return emptyResult();

  // Keep whitespace-based count for calibrated scoring thresholds.
  const calibratedWords = wordCount(trimmed);

  // ── Compute text statistics ────────────────────────
  const stats = includeStats ? computeStats(trimmed, localeProfile) : null;
  // Report/display count should be Unicode-aware and consistent with stats/tokenization.
  const reportWordCount = stats ? stats.wordCount : tokenize(trimmed).length;
  // Only compute uniformity for text with enough structure to be meaningful.
  // Track whether uniformity is applicable so the composite formula can adapt.
  const uniformityApplicable = !!(stats && stats.wordCount >= 20 && stats.sentenceCount >= 3);
  const baseUniformityScore = uniformityApplicable ? computeUniformityScore(stats) : 0;
  const lmUniformityBoost = withLm ? computeLmUniformityBoost(stats) : 0;
  const uniformityScore = Math.min(baseUniformityScore + lmUniformityBoost, 100);

  // ── Run pattern detectors ──────────────────────────
  const findings = [];
  const categoryScores = {};
  for (const cat of Object.keys(CATEGORY_LABELS)) {
    categoryScores[cat] = { matches: 0, weightedScore: 0, patterns: [] };
  }

  const activePatterns = patternsToCheck
    ? patterns.filter((p) => patternsToCheck.includes(p.id))
    : patterns;

  // detectOpts is passed to every pattern; only pattern 7 uses localeProfile.
  const detectOpts = { localeProfile, strict };

  for (const pattern of activePatterns) {
    const matches = pattern.detect(trimmed, detectOpts);
    if (matches.length > 0) {
      const weightedCount = matches.reduce((sum, m) => sum + (m.matchWeight ?? 1), 0);
      const finding = {
        patternId: pattern.id,
        patternName: pattern.name,
        category: pattern.category,
        description: pattern.description,
        weight: pattern.weight,
        matchCount: weightedCount,
        rawMatchCount: matches.length,
        matches: verbose ? matches : matches.slice(0, 5),
        truncated: !verbose && matches.length > 5,
      };

      findings.push(finding);
      categoryScores[pattern.category].matches += weightedCount;
      categoryScores[pattern.category].weightedScore += weightedCount * pattern.weight;
      categoryScores[pattern.category].patterns.push(pattern.name);
    }
  }

  // ── Calculate composite score ──────────────────────
  const patternScore = calculatePatternScore(findings, calibratedWords, scoringKnobs);
  const compositeScore = calculateCompositeScore(
    patternScore,
    uniformityScore,
    findings,
    scoringKnobs,
    uniformityApplicable,
  );
  const reliability = buildReliability({
    words: calibratedWords,
    stats,
    findings,
    patternScore,
    uniformityScore,
  });

  // ── Build category summary ─────────────────────────
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
    score: compositeScore,
    patternScore,
    uniformityScore,
    lmUniformityBoost,
    reliability,
    totalMatches,
    calibratedWordCount: calibratedWords,
    wordCount: reportWordCount,
    stats,
    categories,
    findings,
    summary: buildSummary(
      compositeScore,
      totalMatches,
      findings,
      reportWordCount,
      stats,
      reliability,
    ),
  };
}

function computeLmUniformityBoost(stats) {
  if (!stats || stats.wordCount < 20 || stats.sentenceCount < 3) return 0;

  let boost = 0;

  // Lightweight LM-style signal from repeated local n-gram patterns.
  if (stats.trigramRepetition > 0.12) boost += 8;
  else if (stats.trigramRepetition > 0.08) boost += 5;
  else if (stats.trigramRepetition > 0.05) boost += 2;

  if (stats.typeTokenRatio < 0.4) boost += 2;
  if (stats.sentenceLengthVariation < 0.25) boost += 2;

  return Math.min(boost, 12);
}

function buildReliability({ words, stats, findings, patternScore, uniformityScore }) {
  const reasons = [];
  const sentenceCount = stats?.sentenceCount || 0;
  let confidenceScore = 100;

  if (words < 80) {
    confidenceScore -= 40;
    reasons.push('Sample is very short (<80 words).');
  } else if (words < RELIABILITY_RECOMMENDED_WORDS) {
    confidenceScore -= 20;
    reasons.push(`Sample is shorter than recommended (${RELIABILITY_RECOMMENDED_WORDS}+ words).`);
  }

  if (sentenceCount > 0 && sentenceCount < 4) {
    confidenceScore -= 30;
    reasons.push('Fewer than 4 sentences limits rhythm analysis.');
  } else if (sentenceCount > 0 && sentenceCount < 7) {
    confidenceScore -= 12;
    reasons.push('Sentence count is low, so statistical signals are weaker.');
  }

  if (findings.length === 0) {
    confidenceScore -= 15;
    reasons.push('No AI pattern families were detected.');
  } else if (findings.length === 1) {
    confidenceScore -= 15;
    reasons.push('Only one AI pattern family was detected.');
  }

  if (uniformityScore === 0) {
    confidenceScore -= 10;
    reasons.push('Uniformity metrics were not applied (text too short or too sparse).');
  }

  if (patternScore >= 60 && findings.length >= 3 && words >= RELIABILITY_RECOMMENDED_WORDS) {
    confidenceScore += 5;
  }

  confidenceScore = Math.max(0, Math.min(100, Math.round(confidenceScore)));

  const level = confidenceScore >= 75 ? 'high' : confidenceScore >= 45 ? 'medium' : 'low';

  const recommendation =
    level === 'high'
      ? 'Signal quality is strong enough for decision support.'
      : `Treat this score as directional. Re-run on ${RELIABILITY_RECOMMENDED_WORDS}+ words across multiple paragraphs before making high-stakes calls.`;

  return {
    level,
    score: confidenceScore,
    reasons,
    recommendedMinWords: RELIABILITY_RECOMMENDED_WORDS,
    recommendation,
  };
}

// ─── Scoring ─────────────────────────────────────────────

/**
 * Pattern-based score component (0-100).
 * Uses density, breadth, and category diversity.
 * @param {object} [knobs] see src/locales/scoring-defaults.js
 */
function calculatePatternScore(findings, words, knobs = DEFAULT_SCORING_KNOBS) {
  if (words === 0 || findings.length === 0) return 0;

  let weightedTotal = 0;
  for (const f of findings) {
    weightedTotal += f.matchCount * f.weight;
  }

  // Density: weighted hits per 100 words (log scale)
  const density = (weightedTotal / words) * 100;
  const densityScore = Math.min(Math.log2(density + 1) * knobs.densityCoef, knobs.densityCap);

  // Breadth: unique pattern types
  const breadthBonus = Math.min(findings.length * knobs.breadthMult, knobs.breadthCap);

  // Category diversity
  const categoriesHit = new Set(findings.map((f) => f.category)).size;
  const categoryBonus = Math.min(categoriesHit * knobs.categoryMult, knobs.categoryCap);

  return Math.min(Math.round(densityScore + breadthBonus + categoryBonus), 100);
}

/**
 * Composite score combining pattern detection and statistical analysis.
 *
 * Pattern vs uniformity weights come from knobs.patternWeight.
 * Stats alone are never enough to accuse without pattern hits.
 * When uniformity is not applicable (text too short for statistical analysis),
 * the composite equals the pattern score directly so short high-signal texts
 * are not penalised by a zero uniformity contribution.
 * @param {object} [knobs] see src/locales/scoring-defaults.js
 * @param {boolean} [uniformityApplicable] whether uniformity was actually computed
 */
function calculateCompositeScore(
  patternScore,
  uniformityScore,
  findings,
  knobs = DEFAULT_SCORING_KNOBS,
  uniformityApplicable = true,
) {
  if (patternScore === 0 && uniformityScore === 0) return 0;

  // If no patterns detected, uniformity alone isn't enough to accuse
  if (findings.length === 0) return Math.min(Math.round(uniformityScore * 0.15), 15);

  // When the text is too short to compute uniformity, rely entirely on the
  // pattern score — blending in a structural zero would silently penalise
  // short texts that carry clear AI vocabulary signals.
  // uniformityWeight is kept explicit (rather than inferred from patternWeight)
  // so the intent stays clear if this function is extended in the future.
  const patternWeight = uniformityApplicable ? knobs.patternWeight : 1.0;
  const uniformityWeight = uniformityApplicable ? 1 - knobs.patternWeight : 0.0;
  const blended = patternScore * patternWeight + uniformityScore * uniformityWeight;
  return Math.min(Math.round(blended), 100);
}

/**
 * Build human-readable summary.
 */
function buildSummary(finalScore, totalMatches, findings, words, stats, reliability = null) {
  if (totalMatches === 0 && finalScore < 10) {
    let summary = 'No significant AI writing patterns detected. The text looks human-written.';
    if (reliability && reliability.level !== 'high') {
      summary += ` Confidence: ${reliability.level}. ${reliability.recommendation}`;
    }
    return summary;
  }

  const level =
    finalScore >= 70
      ? 'heavily AI-generated'
      : finalScore >= 45
        ? 'moderately AI-influenced'
        : finalScore >= 20
          ? 'lightly AI-touched'
          : 'mostly human-sounding';

  if (totalMatches === 0) {
    let summary = `Score: ${finalScore}/100 (${level}). No AI pattern families were detected, but sentence-level uniformity signals were elevated across ${words} words.`;
    if (stats && stats.sentenceCount > 3 && stats.burstiness < 0.25) {
      summary += ' Sentence rhythm is very uniform (low burstiness) — typical of AI text.';
    }
    if (reliability && reliability.level !== 'high') {
      summary += ` Confidence: ${reliability.level}. ${reliability.recommendation}`;
    }
    return summary;
  }

  const topPatterns = [...findings]
    .sort((a, b) => b.matchCount * b.weight - a.matchCount * a.weight)
    .slice(0, 3)
    .map((f) => f.patternName);

  const displayMatches = roundDisplayCount(totalMatches);
  const matchWord = displayMatches === 1 ? 'match' : 'matches';
  const patternTypeWord = findings.length === 1 ? 'pattern type' : 'pattern types';
  let summary = `Score: ${finalScore}/100 (${level}). Found ${displayMatches} ${matchWord} across ${findings.length} ${patternTypeWord} in ${words} words.`;

  if (topPatterns.length > 0) {
    summary += ` Top issues: ${topPatterns.join(', ')}.`;
  }

  if (stats && stats.sentenceCount > 3) {
    if (stats.burstiness < 0.25) {
      summary += ' Sentence rhythm is very uniform (low burstiness) — typical of AI text.';
    }
    if (stats.typeTokenRatio < 0.4 && words > 100) {
      summary += ' Vocabulary diversity is low.';
    }
  }

  if (reliability && reliability.level !== 'high') {
    summary += ` Confidence: ${reliability.level}. ${reliability.recommendation}`;
  }

  return summary;
}

// ─── Quick Score ─────────────────────────────────────────

/**
 * Quick score — returns just the number (0-100).
 * Accepts same opts as analyze(), including locale.
 */
function score(text, opts = {}) {
  return analyze(text, opts).score;
}

// ─── Formatting ──────────────────────────────────────────

/**
 * Format analysis as human-readable terminal report.
 */
function formatReport(result) {
  const lines = [];

  lines.push('');
  lines.push('╔══════════════════════════════════════════════════╗');
  lines.push('║          AI WRITING PATTERN ANALYSIS             ║');
  lines.push('╚══════════════════════════════════════════════════╝');
  lines.push('');

  // Score bar
  const filled = Math.round(result.score / 5);
  const bar = '█'.repeat(filled) + '░'.repeat(20 - filled);
  lines.push(`  Score: ${result.score}/100  [${bar}]`);
  lines.push(
    `  Words: ${result.wordCount}  |  Matches: ${roundDisplayCount(result.totalMatches)}  |  Pattern: ${result.patternScore}  |  Uniformity: ${result.uniformityScore}`,
  );
  if (result.reliability) {
    lines.push(
      `  Confidence: ${reliabilityLabel(result.reliability.level)} (${result.reliability.score}/100)`,
    );
  }
  lines.push('');
  lines.push(`  ${result.summary}`);
  lines.push('');

  // Stats section
  if (result.stats) {
    const s = normalizeStatsForOutput(result.stats);
    lines.push('── Text Statistics ─────────────────────────────────');
    lines.push(`  Sentences: ${s.sentenceCount}  |  Paragraphs: ${s.paragraphCount}`);
    lines.push(
      `  Avg sentence length: ${formatMetric(s, 'avgSentenceLength', ' words')} (σ ${formatMetric(s, 'sentenceLengthStdDev')})`,
    );
    lines.push(`  Burstiness: ${formatMetric(s, 'burstiness')} ${burstinessLabel(s.burstiness)}`);
    lines.push(
      `  Vocabulary diversity (TTR): ${formatMetric(s, 'typeTokenRatio')} ${ttrLabel(s.typeTokenRatio, s.wordCount)}`,
    );
    lines.push(`  Function word ratio: ${formatMetric(s, 'functionWordRatio')}`);
    lines.push(`  Trigram repetition: ${formatMetric(s, 'trigramRepetition')}`);
    if (result.stats.lix !== null) {
      lines.push(`  Readability (LIX): ${formatMetric(s, 'lix')}`);
    } else {
      lines.push(`  Readability (FK grade): ${formatMetric(s, 'fleschKincaid')}`);
    }
    lines.push('');
  }

  // Category breakdown
  lines.push('── Categories ──────────────────────────────────────');
  for (const [, data] of Object.entries(result.categories)) {
    if (data.matches > 0) {
      lines.push(
        `  ${data.label}: ${roundDisplayCount(data.matches)} matches (${data.patternsDetected.join(', ')})`,
      );
    }
  }
  lines.push('');

  // Findings detail
  if (result.findings.length > 0) {
    lines.push('── Findings ────────────────────────────────────────');
    for (const finding of result.findings) {
      lines.push('');
      lines.push(
        `  [${finding.patternId}] ${finding.patternName} (×${roundDisplayCount(finding.matchCount)}, weight: ${finding.weight})`,
      );
      lines.push(`      ${finding.description}`);
      for (const match of finding.matches) {
        const loc = match.line ? `L${match.line}:${match.column || ''}` : '';
        const preview =
          typeof match.match === 'string'
            ? match.match.substring(0, 80) + (match.match.length > 80 ? '...' : '')
            : '';
        const conf = match.confidence ? ` [${match.confidence}]` : '';
        lines.push(`      ${loc}: "${preview}"${conf}`);
        if (match.suggestion) {
          lines.push(`            → ${match.suggestion}`);
        }
      }
      if (finding.truncated) {
        const totalRaw = finding.rawMatchCount ?? finding.matchCount ?? finding.matches.length;
        lines.push(
          `      ... and ${Math.max(0, roundDisplayCount(totalRaw) - finding.matches.length)} more`,
        );
      }
    }
  }

  lines.push('');
  lines.push('════════════════════════════════════════════════════');
  return lines.join('\n');
}

/**
 * Format analysis as markdown report.
 */
function formatMarkdown(result) {
  const lines = [];

  lines.push('# AI writing pattern analysis');
  lines.push('');
  lines.push(`**Score: ${result.score}/100** — ${scoreLabel(result.score)}`);
  if (result.reliability) {
    lines.push(
      `**Confidence:** ${reliabilityLabel(result.reliability.level)} (${result.reliability.score}/100)`,
    );
  }
  lines.push('');
  lines.push(
    `Words: ${result.wordCount} | Matches: ${roundDisplayCount(result.totalMatches)} | Pattern score: ${result.patternScore} | Uniformity score: ${result.uniformityScore}`,
  );
  lines.push('');
  lines.push(result.summary);
  lines.push('');

  if (result.stats) {
    const s = normalizeStatsForOutput(result.stats);
    lines.push('## Text statistics');
    lines.push('');
    lines.push('| Metric | Value | Assessment |');
    lines.push('|--------|-------|------------|');
    lines.push(
      `| Avg sentence length | ${formatMetric(s, 'avgSentenceLength', ' words')} | ${s.avgSentenceLength === null ? 'Unavailable' : s.avgSentenceLength > 25 ? 'Long' : s.avgSentenceLength < 12 ? 'Short' : 'Normal'} |`,
    );
    lines.push(
      `| Sentence variation | σ ${formatMetric(s, 'sentenceLengthStdDev')} | ${s.sentenceLengthStdDev === null ? 'Unavailable' : s.sentenceLengthStdDev > 8 ? 'High (human-like)' : s.sentenceLengthStdDev < 4 ? 'Low (AI-like)' : 'Moderate'} |`,
    );
    lines.push(
      `| Burstiness | ${formatMetric(s, 'burstiness')} | ${burstinessLabel(s.burstiness)} |`,
    );
    lines.push(
      `| Vocabulary diversity | ${formatMetric(s, 'typeTokenRatio')} | ${ttrLabel(s.typeTokenRatio, s.wordCount)} |`,
    );
    lines.push(
      `| Trigram repetition | ${formatMetric(s, 'trigramRepetition')} | ${s.trigramRepetition !== null && s.trigramRepetition > 0.1 ? 'High (AI-like)' : s.trigramRepetition === null ? 'Unavailable' : 'Normal'} |`,
    );
    if (result.stats.lix !== null) {
      const lixLabel =
        s.lix === null
          ? 'Unavailable'
          : s.lix > 60
            ? 'Very hard'
            : s.lix > 50
              ? 'Hard'
              : s.lix > 40
                ? 'Medium'
                : s.lix > 30
                  ? 'Easy'
                  : 'Very easy';
      lines.push(`| Readability | LIX ${formatMetric(s, 'lix')} | ${lixLabel} |`);
    } else {
      lines.push(
        `| Readability | FK grade ${formatMetric(s, 'fleschKincaid')} | ${s.fleschKincaid === null ? 'Unavailable' : s.fleschKincaid > 12 ? 'Academic' : s.fleschKincaid > 8 ? 'Standard' : 'Easy'} |`,
      );
    }
    lines.push('');
  }

  if (result.findings.length > 0) {
    lines.push('## Findings');
    lines.push('');
    for (const finding of result.findings) {
      lines.push(
        `### ${finding.patternId}. ${finding.patternName} (×${roundDisplayCount(finding.matchCount)})`,
      );
      lines.push(`*${finding.description}*`);
      lines.push('');
      for (const match of finding.matches) {
        const loc = match.line ? `Line ${match.line}` : '';
        lines.push(
          `- ${loc}: \`${typeof match.match === 'string' ? match.match.substring(0, 80) : ''}\``,
        );
        if (match.suggestion) lines.push(`  - ${match.suggestion}`);
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}

/**
 * Format analysis as JSON.
 */
function formatJSON(result, options = {}) {
  return JSON.stringify(normalizeAnalysisForOutput(result, options), null, 2);
}

// ─── Label Helpers ───────────────────────────────────────

function scoreLabel(s) {
  if (s >= 70) return 'Heavily AI-generated';
  if (s >= 45) return 'Moderately AI-influenced';
  if (s >= 20) return 'Lightly AI-touched';
  return 'Mostly human-sounding';
}

function burstinessLabel(b) {
  if (b === null || b === undefined) return '';
  if (b >= 0.7) return '(high — human-like)';
  if (b >= 0.45) return '(moderate)';
  if (b >= 0.25) return '(low — somewhat uniform)';
  return '(very low — AI-like uniformity)';
}

function ttrLabel(ttr, wc) {
  if (ttr === null || ttr === undefined) return '';
  if (wc < 100) return '(too short to assess)';
  if (ttr >= 0.6) return '(high — diverse vocabulary)';
  if (ttr >= 0.45) return '(moderate)';
  return '(low — repetitive vocabulary)';
}

function reliabilityLabel(level) {
  if (level === 'high') return 'High confidence';
  if (level === 'medium') return 'Medium confidence';
  return 'Low confidence';
}

function emptyResult() {
  return {
    score: 0,
    patternScore: 0,
    uniformityScore: 0,
    lmUniformityBoost: 0,
    reliability: {
      level: 'low',
      score: 0,
      reasons: ['No text provided.'],
      recommendedMinWords: RELIABILITY_RECOMMENDED_WORDS,
      recommendation: `Provide at least ${RELIABILITY_RECOMMENDED_WORDS} words for stable scoring.`,
    },
    totalMatches: 0,
    calibratedWordCount: 0,
    wordCount: 0,
    stats: null,
    categories: {},
    findings: [],
    summary: 'No text provided.',
  };
}

// ─── Exports ─────────────────────────────────────────────

const { analyzeChunked } = require('./chunk-analyzer');

module.exports = {
  analyze,
  analyzeChunked,
  score,
  calculatePatternScore,
  calculateCompositeScore,
  formatReport,
  formatMarkdown,
  formatJSON,
  scoreLabel,
  CATEGORY_LABELS,
};
