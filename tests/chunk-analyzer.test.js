/**
 * chunk-analyzer.test.js — Overlapping window scoring for long mixed-origin docs.
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { analyze, analyzeChunked } from '../src/analyzer.js';
import {
  buildWindows,
  DEFAULTS,
  wordSpans,
  severityFromDocumentScore,
  classifyMultiChunkSeverity,
  topPatternsFromFindings,
  medianSorted,
  percentileSorted,
} from '../src/chunk-analyzer.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function padToWords(seed, target) {
  let s = '';
  const unit = seed.trim() + ' ';
  while (s.trim().split(/\s+/).filter(Boolean).length < target) s += unit;
  return s.trim();
}

describe('analyzeChunked', () => {
  it('document score matches plain analyze (idempotence)', () => {
    const text = 'Short text for parity. It has a few sentences. Nothing special here.';
    const plain = analyze(text, { locale: 'en' });
    const chunked = analyzeChunked(text, { locale: 'en' });
    expect(chunked.document.score).toBe(plain.score);
    expect(raw(chunked.document)).toBe(raw(plain));
  });

  it('short document uses single chunk and sensible severity', () => {
    const text = padToWords('The council met on Tuesday. They voted twelve to three.', 80);
    const r = analyzeChunked(text, { locale: 'en' });
    expect(r.chunks).toHaveLength(1);
    expect(r.aggregate.chunkCount).toBe(1);
    expect(r.aggregate.peak.score).toBe(r.aggregate.median.score);
    expect(['mostly-human', 'lightly-ai', 'heavily-ai']).toContain(r.aggregate.severity);
  });

  it('buildWindows covers document end with overlap', () => {
    const w = buildWindows(700, 300, 150, 180);
    expect(w[w.length - 1].end).toBe(700);
    expect(w.length).toBeGreaterThanOrEqual(2);
  });

  it('mixed long doc: partial-ai with peak in AI tail', () => {
    const humanSeed = fs.readFileSync(
      path.join(__dirname, 'fixtures', 'human-sample-1.txt'),
      'utf8',
    );
    const aiSeed = fs.readFileSync(path.join(__dirname, 'fixtures', 'ai-sample-1.txt'), 'utf8');
    const humanBlock = padToWords(humanSeed, 2000);
    const aiBlock = padToWords(aiSeed, 400);
    const text = `${humanBlock}\n\n${aiBlock}`;
    const r = analyzeChunked(text, { locale: 'en' });
    expect(r.chunks.length).toBeGreaterThan(3);
    expect(r.aggregate.severity).toBe('partial-ai');
    expect(r.aggregate.peak.score - r.aggregate.median.score).toBeGreaterThanOrEqual(30);
    const peakChunk = r.chunks[r.aggregate.peak.index];
    expect(peakChunk.startWord).toBeGreaterThanOrEqual(1500);
  });

  it('uniform AI-heavy doc: heavily-ai', () => {
    const aiSeed = fs.readFileSync(path.join(__dirname, 'fixtures', 'ai-sample-1.txt'), 'utf8');
    const text = padToWords(aiSeed, 1600);
    const r = analyzeChunked(text, { locale: 'en' });
    expect(r.aggregate.severity).toBe('heavily-ai');
    expect(r.aggregate.peak.score).toBeGreaterThanOrEqual(50);
    expect(r.aggregate.median.score).toBeGreaterThanOrEqual(50);
  });

  it('uniform human-heavy doc: mostly-human', () => {
    const humanSeed = fs.readFileSync(
      path.join(__dirname, 'fixtures', 'human-sample-1.txt'),
      'utf8',
    );
    const text = padToWords(humanSeed, 1600);
    const r = analyzeChunked(text, { locale: 'en' });
    expect(r.aggregate.severity).toBe('mostly-human');
    expect(r.aggregate.peak.score).toBeLessThan(DEFAULTS.lowScore);
  });

  it('forwards locale sv on mixed tail', () => {
    const humanSv = fs.readFileSync(
      path.join(__dirname, 'fixtures', 'sv-human-sample-1.txt'),
      'utf8',
    );
    const aiSv = fs.readFileSync(path.join(__dirname, 'fixtures', 'sv-ai-sample-1.txt'), 'utf8');
    const humanBlock = padToWords(humanSv, 2000);
    const aiBlock = padToWords(aiSv, 400);
    const text = `${humanBlock}\n\n${aiBlock}`;
    const r = analyzeChunked(text, { locale: 'sv' });
    expect(r.aggregate.severity).toBe('partial-ai');
    const peakChunk = r.chunks[r.aggregate.peak.index];
    expect(peakChunk.topPatterns.length).toBeGreaterThan(0);
  });
});

function raw(r) {
  return r.rawScore !== undefined ? r.rawScore : r.score;
}

// Additional tests for improved coverage

describe('chunk-analyzer internals', () => {
  it('wordSpans returns correct spans for text', () => {
    const spans = wordSpans('Hello world test');
    expect(spans).toHaveLength(3);
    expect(spans[0].start).toBe(0);
    expect(spans[0].end).toBe(5); // "Hello"
  });

  it('wordSpans handles empty text', () => {
    const spans = wordSpans('');
    expect(spans).toHaveLength(0);
  });

  it('buildWindows handles edge cases', () => {
    expect(buildWindows(0, 300, 150, 180)).toEqual([]);
    expect(buildWindows(100, 300, 150, 180)).toHaveLength(1);
    expect(buildWindows(100, 300, 150, 180)[0]).toEqual({ start: 0, end: 100 });
  });

  it('buildWindows merges tiny tail into last window', () => {
    const windows = buildWindows(500, 300, 150, 180);
    const lastWindow = windows[windows.length - 1];
    expect(lastWindow.end).toBe(500);
  });

  it('buildWindows creates overlapping windows', () => {
    const windows = buildWindows(900, 300, 150, 180);
    expect(windows.length).toBeGreaterThan(2);
    // Check overlap
    if (windows.length >= 2) {
      expect(windows[1].start).toBeLessThan(windows[0].end);
    }
  });

  it('severityFromDocumentScore classifies correctly', () => {
    expect(severityFromDocumentScore(10).severity).toBe('mostly-human');
    expect(severityFromDocumentScore(30).severity).toBe('lightly-ai');
    expect(severityFromDocumentScore(60).severity).toBe('lightly-ai');
    expect(severityFromDocumentScore(80).severity).toBe('heavily-ai');
  });

  it('classifyMultiChunkSeverity handles all cases', () => {
    // All low scores
    let result = classifyMultiChunkSeverity([10, 12, 15], DEFAULTS);
    expect(result.severity).toBe('mostly-human');

    // High peak and median
    result = classifyMultiChunkSeverity([55, 60, 65], DEFAULTS);
    expect(result.severity).toBe('heavily-ai');

    // High peak, low median (partial AI)
    result = classifyMultiChunkSeverity([15, 20, 70], DEFAULTS);
    expect(result.severity).toBe('partial-ai');

    // Lightly elevated
    result = classifyMultiChunkSeverity([30, 35, 40], DEFAULTS);
    expect(result.severity).toBe('lightly-ai');
  });

  it('topPatternsFromFindings returns top patterns by signal', () => {
    const findings = [
      { patternId: 1, patternName: 'Pattern 1', matchCount: 5, weight: 3 },
      { patternId: 2, patternName: 'Pattern 2', matchCount: 10, weight: 2 },
      { patternId: 3, patternName: 'Pattern 3', matchCount: 2, weight: 5 },
    ];
    const top = topPatternsFromFindings(findings, 2);
    expect(top).toHaveLength(2);
    expect(top[0].patternId).toBe(2); // 10*2 = 20
    expect(top[1].patternId).toBe(1); // 5*3 = 15
  });

  it('medianSorted calculates median correctly', () => {
    expect(medianSorted([1, 2, 3, 4, 5])).toBe(3);
    expect(medianSorted([1, 2, 3, 4])).toBe(3); // Rounds average
    expect(medianSorted([10])).toBe(10);
  });

  it('percentileSorted calculates percentiles correctly', () => {
    const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    expect(percentileSorted(data, 0.5)).toBe(5); // Uses decimal 0-1
    expect(percentileSorted(data, 0.95)).toBe(9); // floor((9) * 0.95) = 8, returns data[8] = 9
  });
});

describe('analyzeChunked options', () => {
  it('respects custom windowWords option', () => {
    const text = padToWords('Custom window size test.', 800);
    const result = analyzeChunked(text, { windowWords: 200, strideWords: 100, locale: 'en' });
    expect(result.chunks.length).toBeGreaterThan(0);
  });

  it('respects custom strideWords option', () => {
    const text = padToWords('Custom stride test.', 800);
    const result = analyzeChunked(text, { windowWords: 300, strideWords: 200, locale: 'en' });
    expect(result.chunks.length).toBeGreaterThan(0);
  });

  it('respects ignoreCode option', () => {
    const text = 'Some text.\n```javascript\nconst x = 1;\n```\nMore text.';
    const paddedText = padToWords(text, 700);
    const result = analyzeChunked(paddedText, { ignoreCode: true, locale: 'en' });
    expect(result.document.score).toBeDefined();
  });

  it('handles strict mode', () => {
    const text = padToWords('Strict mode test with various patterns.', 700);
    const result = analyzeChunked(text, { strict: true, locale: 'en' });
    expect(result.document.score).toBeDefined();
  });

  it('supports Swedish locale', () => {
    const text = 'Detta är en svensk text. Den innehåller svenska ord.';
    const paddedText = padToWords(text, 700);
    const result = analyzeChunked(paddedText, { locale: 'sv' });
    expect(result.document.score).toBeDefined();
    // localeProfile is not returned in document
  });

  it('includes severity in aggregate', () => {
    const aiText = fs.readFileSync(path.join(__dirname, 'fixtures', 'ai-sample-1.txt'), 'utf8');
    const paddedText = padToWords(aiText, 700);
    const result = analyzeChunked(paddedText, { locale: 'en' });
    expect(result.aggregate.severity).toBeDefined();
    expect(typeof result.aggregate.severity).toBe('string');
  });
});
