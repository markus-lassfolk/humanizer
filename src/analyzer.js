/**
 * analyzer.js — Text analysis engine.
 *
 * Combines pattern detection with statistical analysis to produce a
 * comprehensive AI writing score. The score uses three signal types:
 *
 *   1. Pattern matches — vocabulary, phrases, structural patterns (36 detectors; 36 is LM-only)
 *   2. Text statistics — burstiness, sentence variation, type-token ratio
 *   3. Category breadth — how many different AI signal types are present
 *
 * Based on research from:
 *   - Wikipedia:Signs of AI writing
 *   - Copyleaks stylistic fingerprint analysis (arxiv 2503.01659v1)
 *   - StyloAI 31-feature stylometric analysis
 */

const { patterns, wordCount } = require('./patterns');
const { computeStats, computeUniformityScore, computeLmUniformityBoost } = require('./stats');
const { stripCodeSnippets } = require('./preprocess');
const { loadLocale } = require('./locales');
const { DEFAULT_SCORING_KNOBS, mergeScoringKnobs } = require('./locales/scoring-defaults');
const { buildCalibrationFeatureVector } = require('./calibration-features');
const { applyEnglishCalibrator } = require('./score-calibration-en');

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
 *   - strict {boolean}      Enable pattern 35 (inclusive-language hints) for en/sv
 *   - withLm {boolean}      Add n-gram LM uniformity boost (en: en-ngram-lm.json, sv: sv-ngram-lm.json)
 *   - skipCalibration {boolean}  If true, skip English ML calibrator (for training datasets)
 *   - config {object}       Custom config overrides
 * @returns {object}     — Full analysis result (`score` = heuristic, or ML-calibrated when
 *                        HUMANIZER_ML_CALIBRATION=1 and en-calibrator.json exists; `rawScore` is always the heuristic composite)
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
    skipCalibration = false,
  } = opts;

  if (!text || typeof text !== 'string') {
    return emptyResult();
  }

  const preparedText = ignoreCode ? stripCodeSnippets(text) : text;
  const trimmed = preparedText.trim();
  if (trimmed.length === 0) return emptyResult();

  // Load locale profile (throws on unknown locale codes)
  const localeProfile = loadLocale(locale);
  const scoringKnobs = mergeScoringKnobs(localeProfile);

  const words = wordCount(trimmed);

  // ── Compute text statistics ────────────────────────
  const stats = includeStats ? computeStats(trimmed, localeProfile) : null;
  const reportWordCount = stats?.wordCount ?? words;
  // Only compute uniformity for text with enough structure to be meaningful
  let uniformityScore =
    stats && stats.wordCount >= 20 && stats.sentenceCount >= 3 ? computeUniformityScore(stats) : 0;
  if (stats && withLm && (locale === 'en' || locale === 'sv') && uniformityScore > 0) {
    const lb = computeLmUniformityBoost(trimmed, locale);
    if (lb > 0) uniformityScore = Math.min(100, uniformityScore + lb);
  }

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
  const detectOpts = { localeProfile, strictInclusive: Boolean(strict) };

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
        rawMatchCount: matches.length,
        matchCount: weightedCount,
        matches: verbose ? matches : matches.slice(0, 5),
        truncated: !verbose && matches.length > 5,
      };

      findings.push(finding);
      categoryScores[pattern.category].matches += weightedCount;
      categoryScores[pattern.category].weightedScore += weightedCount * pattern.weight;
      categoryScores[pattern.category].patterns.push(pattern.name);
    }
  }

  // ── Calculate composite score (knobs from locale profile; see scoring-defaults.js) ──
  const patternScore = calculatePatternScore(findings, words, scoringKnobs);
  const compositeHeuristic = calculateCompositeScore(
    patternScore,
    uniformityScore,
    findings,
    scoringKnobs,
  );

  const reliability = buildReliability({
    words: reportWordCount,
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

  let finalScore = compositeHeuristic;
  if (locale === 'en' && !skipCalibration) {
    const calibrated = applyEnglishCalibrator({
      patternScore,
      uniformityScore,
      compositeHeuristic,
      totalMatches,
      wordCount: words,
      findings,
      stats,
      categories,
    });
    if (calibrated !== null) finalScore = calibrated;
  }

  const calibrationFeatures =
    locale === 'en'
      ? buildCalibrationFeatureVector({
          patternScore,
          uniformityScore,
          compositeHeuristic,
          totalMatches,
          words,
          findingsCount: findings.length,
          stats,
          categories,
        })
      : null;

  return {
    score: finalScore,
    rawScore: compositeHeuristic,
    patternScore,
    uniformityScore,
    reliability,
    totalMatches,
    wordCount: reportWordCount,
    stats,
    categories,
    findings,
    calibrationFeatures,
    summary: buildSummary(
      finalScore,
      totalMatches,
      findings,
      reportWordCount,
      stats,
      reliability,
    ),
  };
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
 * @param {object} [knobs] — see `mergeScoringKnobs` / `DEFAULT_SCORING_KNOBS`
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
 * Pattern vs uniformity weights come from `knobs.patternWeight` (default 0.8 / 0.2).
 * Stats alone are never enough to accuse without pattern hits.
 * @param {object} [knobs] — see `mergeScoringKnobs` / `DEFAULT_SCORING_KNOBS`
 */
function calculateCompositeScore(
  patternScore,
  uniformityScore,
  findings,
  knobs = DEFAULT_SCORING_KNOBS,
) {
  if (patternScore === 0 && uniformityScore === 0) return 0;

  // If no patterns detected, uniformity alone isn't enough to accuse
  if (findings.length === 0) return Math.min(Math.round(uniformityScore * 0.15), 15);

  const pw = knobs.patternWeight;
  const uw = 1 - pw;
  const blended = patternScore * pw + uniformityScore * uw;
  return Math.min(Math.round(blended), 100);
}

function roundDisplayCount(value) {
  return Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
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

  let summary = `Score: ${finalScore}/100 (${level}). Found ${roundDisplayCount(totalMatches)} matches across ${findings.length} pattern types in ${words} words.`;

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
    const s = result.stats;
    lines.push('── Text Statistics ─────────────────────────────────');
    lines.push(`  Sentences: ${s.sentenceCount}  |  Paragraphs: ${s.paragraphCount}`);
    lines.push(`  Avg sentence length: ${s.avgSentenceLength} words (σ ${s.sentenceLengthStdDev})`);
    lines.push(`  Burstiness: ${s.burstiness} ${burstinessLabel(s.burstiness)}`);
    lines.push(
      `  Vocabulary diversity (TTR): ${s.typeTokenRatio} ${ttrLabel(s.typeTokenRatio, s.wordCount)}`,
    );
    lines.push(`  Function word ratio: ${s.functionWordRatio}`);
    lines.push(`  Trigram repetition: ${s.trigramRepetition}`);
    if (s.lix !== null) {
      lines.push(`  Readability (LIX): ${s.lix}`);
    } else if (s.fleschKincaid !== null) {
      lines.push(`  Readability (FK grade): ${s.fleschKincaid}`);
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
    const s = result.stats;
    lines.push('## Text statistics');
    lines.push('');
    lines.push('| Metric | Value | Assessment |');
    lines.push('|--------|-------|------------|');
    lines.push(
      `| Avg sentence length | ${s.avgSentenceLength} words | ${s.avgSentenceLength > 25 ? 'Long' : s.avgSentenceLength < 12 ? 'Short' : 'Normal'} |`,
    );
    lines.push(
      `| Sentence variation | σ ${s.sentenceLengthStdDev} | ${s.sentenceLengthStdDev > 8 ? 'High (human-like)' : s.sentenceLengthStdDev < 4 ? 'Low (AI-like)' : 'Moderate'} |`,
    );
    lines.push(`| Burstiness | ${s.burstiness} | ${burstinessLabel(s.burstiness)} |`);
    lines.push(
      `| Vocabulary diversity | ${s.typeTokenRatio} | ${ttrLabel(s.typeTokenRatio, s.wordCount)} |`,
    );
    lines.push(
      `| Trigram repetition | ${s.trigramRepetition} | ${s.trigramRepetition > 0.1 ? 'High (AI-like)' : 'Normal'} |`,
    );
    if (s.lix !== null) {
      const lixLabel =
        s.lix > 60
          ? 'Very hard'
          : s.lix > 50
            ? 'Hard'
            : s.lix > 40
              ? 'Medium'
              : s.lix > 30
                ? 'Easy'
                : 'Very easy';
      lines.push(`| Readability | LIX ${s.lix} | ${lixLabel} |`);
    } else if (s.fleschKincaid !== null) {
      lines.push(
        `| Readability | FK grade ${s.fleschKincaid} | ${s.fleschKincaid > 12 ? 'Academic' : s.fleschKincaid > 8 ? 'Standard' : 'Easy'} |`,
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
function formatJSON(result) {
  return JSON.stringify(result, null, 2);
}

// ─── Label Helpers ───────────────────────────────────────

function scoreLabel(s) {
  if (s >= 70) return 'Heavily AI-generated';
  if (s >= 45) return 'Moderately AI-influenced';
  if (s >= 20) return 'Lightly AI-touched';
  return 'Mostly human-sounding';
}

function burstinessLabel(b) {
  if (b >= 0.7) return '(high — human-like)';
  if (b >= 0.45) return '(moderate)';
  if (b >= 0.25) return '(low — somewhat uniform)';
  return '(very low — AI-like uniformity)';
}

function ttrLabel(ttr, wc) {
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
    rawScore: 0,
    calibrationFeatures: null,
    patternScore: 0,
    uniformityScore: 0,
    reliability: {
      level: 'low',
      score: 0,
      reasons: ['No text provided.'],
      recommendedMinWords: RELIABILITY_RECOMMENDED_WORDS,
      recommendation: `Provide at least ${RELIABILITY_RECOMMENDED_WORDS} words for stable scoring.`,
    },
    totalMatches: 0,
    wordCount: 0,
    stats: null,
    categories: {},
    findings: [],
    summary: 'No text provided.',
  };
}

// ─── Exports ─────────────────────────────────────────────

module.exports = {
  analyze,
  score,
  calculatePatternScore,
  calculateCompositeScore,
  DEFAULT_SCORING_KNOBS,
  formatReport,
  formatMarkdown,
  formatJSON,
  CATEGORY_LABELS,
};
