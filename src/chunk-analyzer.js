/**
 * chunk-analyzer.js — Overlapping window scoring for long, mixed-origin documents.
 *
 * Wraps analyze() without changing its behavior. See docs/CHUNKED_SCORING.md.
 *
 * Lazy-requires `./analyzer` inside analyzeChunked to avoid circular init with analyzer.js.
 */

const { stripCodeSnippets } = require('./preprocess');

const DEFAULTS = {
  windowWords: 300,
  strideWords: 150,
  minDocWordsForChunking: 600,
  minLastWindowWords: 180, // 60% of windowWords
  partialAiPeakGap: 30,
  highScore: 50,
  lowScore: 20,
};

/**
 * Word-token spans in source text (whitespace-split, same spirit as patterns.wordCount).
 * @param {string} text
 * @returns {{ start: number, end: number }[]}
 */
function wordSpans(text) {
  const spans = [];
  const re = /\S+/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    spans.push({ start: m.index, end: m.index + m[0].length });
  }
  return spans;
}

function wordCountFromSpans(spans) {
  return spans.length;
}

function sliceByWordRange(text, spans, startIdx, endIdxExclusive) {
  if (spans.length === 0 || startIdx >= endIdxExclusive) return '';
  const lo = Math.max(0, startIdx);
  const hi = Math.min(spans.length, endIdxExclusive);
  if (lo >= hi) return '';
  const from = spans[lo].start;
  const to = spans[hi - 1].end;
  return text.slice(from, to);
}

/**
 * Build overlapping [startWord, endWord) windows covering the document.
 * Stride < window gives 50% overlap; tiny tail is merged into the previous window when < minLastWindowWords.
 * @param {number} totalWords
 * @param {number} windowWords
 * @param {number} strideWords
 * @param {number} minLastWindowWords
 * @returns {Array<{ start: number, end: number }>}
 */
function buildWindows(totalWords, windowWords, strideWords, minLastWindowWords) {
  if (totalWords === 0) return [];
  const windows = [];
  let start = 0;
  while (start < totalWords) {
    let end = Math.min(start + windowWords, totalWords);
    const nextStart = start + strideWords;
    if (end < totalWords && totalWords - end < minLastWindowWords && nextStart < totalWords) {
      end = totalWords;
    }
    windows.push({ start, end });
    if (end >= totalWords) break;
    start = nextStart;
  }
  dedupeWindows(windows);
  return windows;
}

function dedupeWindows(windows) {
  const seen = new Set();
  let write = 0;
  for (let i = 0; i < windows.length; i++) {
    const k = `${windows[i].start},${windows[i].end}`;
    if (seen.has(k)) continue;
    seen.add(k);
    windows[write++] = windows[i];
  }
  windows.length = write;
}

function medianSorted(sorted) {
  if (sorted.length === 0) return 0;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

function percentileSorted(sorted, p) {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p));
  return sorted[idx];
}

function topPatternsFromFindings(findings, limit = 3) {
  return findings
    .map((f) => ({
      patternId: f.patternId,
      patternName: f.patternName,
      signal: f.matchCount * f.weight,
    }))
    .sort((a, b) => b.signal - a.signal)
    .slice(0, limit)
    .map(({ patternId, patternName }) => ({ patternId, patternName }));
}

function rawScoreOf(result) {
  return result.rawScore !== undefined ? result.rawScore : result.score;
}

/**
 * Severity from whole-document score when only one chunk.
 * @param {number} score
 */
function severityFromDocumentScore(score) {
  if (score <= 19) {
    return {
      severity: 'mostly-human',
      severityReason: 'Single window; document score in mostly-human range.',
    };
  }
  if (score <= 44) {
    return {
      severity: 'lightly-ai',
      severityReason: 'Single window; document score suggests light AI-like signals.',
    };
  }
  if (score <= 69) {
    return {
      severity: 'lightly-ai',
      severityReason: 'Single window; document score suggests moderate AI influence.',
    };
  }
  return {
    severity: 'heavily-ai',
    severityReason: 'Single window; document score is heavily AI-like.',
  };
}

/**
 * @param {number[]} scores
 * @param {typeof DEFAULTS} cfg
 */
function classifyMultiChunkSeverity(scores, cfg) {
  const sorted = scores.slice().sort((a, b) => a - b);
  const peak = sorted[sorted.length - 1];
  const median = medianSorted(sorted);

  if (peak < cfg.lowScore) {
    return {
      severity: 'mostly-human',
      severityReason: `Peak chunk score (${peak}) is below ${cfg.lowScore}; no strong AI-like window.`,
      peakScore: peak,
      medianScore: median,
    };
  }
  if (peak >= cfg.highScore && median >= cfg.highScore) {
    return {
      severity: 'heavily-ai',
      severityReason: `Both peak (${peak}) and median (${median}) are at or above ${cfg.highScore}.`,
      peakScore: peak,
      medianScore: median,
    };
  }
  if (peak >= cfg.highScore && peak - median >= cfg.partialAiPeakGap) {
    return {
      severity: 'partial-ai',
      severityReason: `Peak (${peak}) is high but median (${median}) is much lower — likely a mixed-origin document.`,
      peakScore: peak,
      medianScore: median,
    };
  }
  return {
    severity: 'lightly-ai',
    severityReason: `Elevated signals without a strong peak-vs-median gap (peak ${peak}, median ${median}).`,
    peakScore: peak,
    medianScore: median,
  };
}

/**
 * @param {string} text
 * @param {object} [opts]
 * @param {number} [opts.windowWords]
 * @param {number} [opts.strideWords]
 * @param {number} [opts.minDocWordsForChunking]
 * @param {number} [opts.minLastWindowWords]
 * @param {number} [opts.partialAiPeakGap]
 * @param {number} [opts.highScore]
 * @param {number} [opts.lowScore]
 * @param {boolean} [opts.ignoreCode]
 * @param {string} [opts.locale]
 * @param {boolean} [opts.strict]
 * @param {boolean} [opts.withLm]
 * @param {boolean} [opts.includeStats]
 * @param {boolean} [opts.verbose]
 * @returns {object}
 */
function analyzeChunked(text, opts = {}) {
  const { analyze } = require('./analyzer');
  const cfg = {
    ...DEFAULTS,
    windowWords: opts.windowWords ?? DEFAULTS.windowWords,
    strideWords: opts.strideWords ?? DEFAULTS.strideWords,
    minDocWordsForChunking: opts.minDocWordsForChunking ?? DEFAULTS.minDocWordsForChunking,
    minLastWindowWords: opts.minLastWindowWords ?? DEFAULTS.minLastWindowWords,
    partialAiPeakGap: opts.partialAiPeakGap ?? DEFAULTS.partialAiPeakGap,
    highScore: opts.highScore ?? DEFAULTS.highScore,
    lowScore: opts.lowScore ?? DEFAULTS.lowScore,
  };

  const analyzeOpts = {
    verbose: opts.verbose ?? false,
    patternsToCheck: opts.patternsToCheck ?? null,
    includeStats: opts.includeStats !== false,
    ignoreCode: Boolean(opts.ignoreCode),
    locale: opts.locale ?? 'en',
    strict: Boolean(opts.strict),
    withLm: Boolean(opts.withLm),
  };

  if (!text || typeof text !== 'string') {
    const empty = analyze('', analyzeOpts);
    return {
      document: empty,
      chunks: [],
      aggregate: {
        chunkCount: 0,
        windowWords: cfg.windowWords,
        strideWords: cfg.strideWords,
        peak: { score: 0, index: -1 },
        median: { score: 0, index: -1 },
        low: { score: 0, index: -1 },
        p95: 0,
        severity: 'mostly-human',
        severityReason: 'Empty input.',
      },
    };
  }

  const prepared = analyzeOpts.ignoreCode ? stripCodeSnippets(text) : text;
  const trimmed = prepared.trim();
  const spans = wordSpans(trimmed);
  const totalWords = wordCountFromSpans(spans);

  const document = analyze(trimmed, analyzeOpts);

  let ranges;
  if (totalWords < cfg.minDocWordsForChunking) {
    ranges = [{ start: 0, end: totalWords }];
  } else {
    ranges = buildWindows(totalWords, cfg.windowWords, cfg.strideWords, cfg.minLastWindowWords);
  }

  const chunks = [];
  for (let i = 0; i < ranges.length; i++) {
    const { start, end } = ranges[i];
    const chunkText = sliceByWordRange(trimmed, spans, start, end);
    const r = analyze(chunkText, analyzeOpts);
    chunks.push({
      index: i,
      startWord: start,
      endWord: end,
      wordCount: end - start,
      score: r.score,
      rawScore: rawScoreOf(r),
      patternScore: r.patternScore,
      uniformityScore: r.uniformityScore,
      topPatterns: topPatternsFromFindings(r.findings),
    });
  }

  const scores = chunks.map((c) => c.score);
  const sortedScores = scores.slice().sort((a, b) => a - b);
  const peakScore = sortedScores[sortedScores.length - 1];
  const lowScoreVal = sortedScores[0];
  const medianScoreVal = medianSorted(sortedScores);
  const p95 = percentileSorted(sortedScores, 0.95);

  const peakIdx = scores.indexOf(peakScore);
  const lowIdx = scores.indexOf(lowScoreVal);
  const indexed = scores.map((s, i) => ({ s, i })).sort((a, b) => a.s - b.s);
  const mid = Math.floor(indexed.length / 2);
  const medianIdx = indexed[mid].i;

  let severity;
  let severityReason;
  if (chunks.length <= 1) {
    const s = severityFromDocumentScore(document.score);
    severity = s.severity;
    severityReason = s.severityReason;
  } else {
    const c = classifyMultiChunkSeverity(scores, cfg);
    severity = c.severity;
    severityReason = c.severityReason;
  }

  return {
    document,
    chunks,
    aggregate: {
      chunkCount: chunks.length,
      windowWords: cfg.windowWords,
      strideWords: cfg.strideWords,
      peak: { score: peakScore, index: peakIdx },
      median: { score: medianScoreVal, index: medianIdx >= 0 ? medianIdx : 0 },
      low: { score: lowScoreVal, index: lowIdx },
      p95,
      severity,
      severityReason,
    },
  };
}

/**
 * @param {ReturnType<typeof analyzeChunked>} chunked
 */
function formatChunkedTextAppendix(chunked) {
  const { aggregate, chunks } = chunked;
  const lines = [];
  lines.push('');
  lines.push('── Chunk distribution ───────────────────────────');
  lines.push(
    `  Chunks: ${aggregate.chunkCount} (window ≈ ${aggregate.windowWords} words, stride ${aggregate.strideWords})`,
  );
  lines.push(`  Severity: ${aggregate.severity} — ${aggregate.severityReason}`);
  lines.push(
    `  Peak: ${aggregate.peak.score} (chunk #${aggregate.peak.index}, words ${chunks[aggregate.peak.index]?.startWord ?? '?'}-${chunks[aggregate.peak.index]?.endWord ?? '?'})`,
  );
  lines.push(
    `  Median: ${aggregate.median.score} (chunk #${aggregate.median.index}) | Low: ${aggregate.low.score} (chunk #${aggregate.low.index}) | p95: ${aggregate.p95}`,
  );
  const hist = simpleHistogram(scoresForHist(chunks), 5);
  if (hist) lines.push(`  ${hist}`);
  return lines.join('\n');
}

function scoresForHist(chunks) {
  return chunks.map((c) => c.score);
}

/** Tiny ASCII histogram of chunk scores (0–100 → 5 buckets). */
function simpleHistogram(scores, buckets = 5) {
  if (!scores.length) return '';
  const counts = Array(buckets).fill(0);
  for (const s of scores) {
    const b = Math.min(buckets - 1, Math.floor((s / 100) * buckets));
    counts[b]++;
  }
  const max = Math.max(...counts, 1);
  const bars = counts.map((n) => '█'.repeat(Math.round((n / max) * 8) || (n > 0 ? 1 : 0)));
  return `Histogram [0-20|21-40|41-60|61-80|81-100]: ${bars.join(' ')}`;
}

/**
 * Flatten chunked result for JSON APIs: all `analyze()` fields plus `chunks` and `aggregate`.
 * @param {ReturnType<typeof analyzeChunked>} chunked
 */
function mergeChunkedForJSON(chunked) {
  return {
    ...chunked.document,
    chunks: chunked.chunks,
    aggregate: chunked.aggregate,
  };
}

module.exports = {
  analyzeChunked,
  formatChunkedTextAppendix,
  mergeChunkedForJSON,
  DEFAULTS,
  buildWindows,
  wordSpans,
};
