/**
 * chunk-analyzer.test.js — Overlapping window scoring for long mixed-origin docs.
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { analyze, analyzeChunked } from '../src/analyzer.js';
import { buildWindows, DEFAULTS } from '../src/chunk-analyzer.js';

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
    const humanSeed = fs.readFileSync(path.join(__dirname, 'fixtures', 'human-sample-1.txt'), 'utf8');
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
    const humanSeed = fs.readFileSync(path.join(__dirname, 'fixtures', 'human-sample-1.txt'), 'utf8');
    const text = padToWords(humanSeed, 1600);
    const r = analyzeChunked(text, { locale: 'en' });
    expect(r.aggregate.severity).toBe('mostly-human');
    expect(r.aggregate.peak.score).toBeLessThan(DEFAULTS.lowScore);
  });

  it('forwards locale sv on mixed tail', () => {
    const humanSv = fs.readFileSync(path.join(__dirname, 'fixtures', 'sv-human-sample-1.txt'), 'utf8');
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
