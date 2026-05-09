/**
 * calibration.en.test.js — Fixture thresholds for English locale.
 */

import { describe, it, expect } from 'vitest';
import { score, analyze } from '../../../src/analyzer.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..', '..', '..');
const fixtures = path.join(root, 'tests', 'fixtures');

function load(name) {
  return fs.readFileSync(path.join(fixtures, name), 'utf8');
}

const en = { locale: 'en' };

describe('English calibration fixtures', () => {
  it('synthetic AI academic doc scores in AI band', () => {
    const text = load('en-corpus/ai/ai-academic-01.txt');
    expect(score(text, en)).toBeGreaterThanOrEqual(55);
  });

  it('synthetic human academic doc stays low', () => {
    const text = load('en-corpus/human/human-academic-01.txt');
    expect(score(text, en)).toBeLessThan(25);
  });

  it('pattern 7 still contributes on obvious LLM opener', () => {
    const text = load('en-ai-calibration.txt');
    const r = analyze(text, { ...en, patternsToCheck: [7] });
    expect(r.findings.length).toBe(1);
    expect(r.findings[0].matchCount).toBeGreaterThan(0);
  });
});
