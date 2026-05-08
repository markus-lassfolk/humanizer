/**
 * calibration.sv.test.js — Swedish locale calibration.
 */

import { describe, it, expect } from 'vitest';
import { score, analyze } from '../src/analyzer.js';
import { autoFix } from '../src/humanizer.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadFixture(name) {
  return fs.readFileSync(path.join(__dirname, 'fixtures', name), 'utf-8');
}

const svOpts = { locale: 'sv' };

describe('Swedish AI sample calibration', () => {
  it('sv-ai-sample-1.txt scores 55+ (composite)', () => {
    const text = loadFixture('sv-ai-sample-1.txt');
    expect(score(text, svOpts)).toBeGreaterThanOrEqual(55);
  });

  it('short Swedish LLM opener has strong pattern score (composite is length-sensitive)', () => {
    const text =
      'Bra fråga! Låt oss dyka ner i hur vi kan möjliggöra en mer resilient organisation genom synergier mellan avdelningarna.';
    const r = analyze(text, svOpts);
    expect(r.patternScore).toBeGreaterThanOrEqual(60);
  });
});

describe('Swedish human sample calibration', () => {
  it('sv-human-sample-1.txt scores under 25', () => {
    const text = loadFixture('sv-human-sample-1.txt');
    expect(score(text, svOpts)).toBeLessThan(25);
  });

  it('sv-formal-public-sector.txt scores under 30 (bureaucratic human Swedish)', () => {
    const text = loadFixture('sv-formal-public-sector.txt');
    expect(score(text, svOpts)).toBeLessThan(30);
  });
});

describe('Swedish relative scoring', () => {
  it('AI fixture scores well above human fixture', () => {
    const aiText = loadFixture('sv-ai-sample-1.txt');
    const humanText = loadFixture('sv-human-sample-1.txt');
    expect(score(aiText, svOpts) - score(humanText, svOpts)).toBeGreaterThan(25);
  });
});

describe('Swedish autoFix', () => {
  it('nyttja → använder in running text', () => {
    const { text } = autoFix('Vi ska nyttja det nya systemet i produktion.', svOpts);
    expect(text).toContain('använda');
  });
});
