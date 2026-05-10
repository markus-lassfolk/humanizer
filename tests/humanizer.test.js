/**
 * humanizer.test.js — Tests for the humanization engine.
 */

import { describe, it, expect } from 'vitest';
import { humanize, autoFix, formatSuggestions, buildGuidance } from '../src/humanizer.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadFixture(name) {
  return fs.readFileSync(path.join(__dirname, 'fixtures', name), 'utf-8');
}

function makeSuggestion(index, group = 'Important pattern') {
  return {
    pattern: group,
    patternId: 1,
    category: 'style',
    weight: 2,
    text: `${group} match ${index}`,
    line: index + 1,
    column: 1,
    suggestion: `Fix ${index}`,
    confidence: 'high',
  };
}

// ─── autoFix ─────────────────────────────────────────────

describe('autoFix', () => {
  it('replaces curly double quotes with straight quotes', () => {
    const { text, fixes } = autoFix('He said \u201Chello\u201D to her.');
    expect(text).toBe('He said "hello" to her.');
    expect(fixes.length).toBeGreaterThan(0);
  });

  it('replaces curly single quotes with straight quotes', () => {
    const { text } = autoFix('It\u2019s a fine day.');
    expect(text).toBe("It's a fine day.");
  });

  it('replaces "in order to" with "to"', () => {
    const { text } = autoFix('In order to succeed, we must work hard.');
    expect(text).toMatch(/to succeed/i);
    expect(text).not.toContain('In order to');
  });

  it('replaces "due to the fact that" with "because"', () => {
    const { text } = autoFix('We stopped due to the fact that it was raining.');
    expect(text).toContain('because');
    expect(text).not.toContain('due to the fact that');
  });

  it('replaces "at this point in time" with "now"', () => {
    const { text } = autoFix('At this point in time, we are ready.');
    expect(text).toMatch(/now/i);
  });

  it('replaces "in the event that" with "if"', () => {
    const { text } = autoFix('In the event that you need help, call us.');
    expect(text).toMatch(/if/i);
    expect(text).not.toContain('In the event that');
  });

  it('replaces "has the ability to" with "can"', () => {
    const { text } = autoFix('The system has the ability to process data.');
    expect(text).toContain('can');
  });

  it('removes chatbot opening artifacts', () => {
    const { text, fixes } = autoFix('Great question! Here is the answer to your question.');
    expect(text).not.toContain('Great question!');
    expect(fixes.some((f) => f.includes('chatbot'))).toBe(true);
  });

  it('removes chatbot closing artifacts', () => {
    const { text, fixes } = autoFix('The answer is 42. I hope this helps!');
    expect(text).not.toContain('I hope this helps');
    expect(fixes.some((f) => f.includes('chatbot'))).toBe(true);
  });

  it('removes hidden unicode obfuscation characters', () => {
    const { text, fixes } = autoFix(
      'de\u200Btector eva\u00ADsion with\u00A0non-breaking\u202Fspaces',
    );
    expect(text).toBe('detector evasion with non-breaking spaces');
    expect(fixes.some((f) => f.includes('hidden unicode'))).toBe(true);
    expect(fixes.some((f) => f.includes('non-breaking'))).toBe(true);
  });

  it('handles text with no fixable issues', () => {
    const { text, fixes } = autoFix('The cat sat on the mat.');
    expect(text).toBe('The cat sat on the mat.');
    expect(fixes.length).toBe(0);
  });

  it('applies multiple fixes in one pass', () => {
    const input =
      'Great question! In order to help, due to the fact that you asked, here\u2019s the answer. I hope this helps!';
    const { text, fixes } = autoFix(input);
    expect(fixes.length).toBeGreaterThanOrEqual(3);
    expect(text).not.toContain('In order to');
    expect(text).not.toContain('\u2019');
  });

  it('preserves sentence-start capitalization in replacements', () => {
    const { text } = autoFix('Due to the fact that we shipped early, customers noticed.');
    expect(text).toContain('Because we shipped early');
  });

  it('preserves sentence-start capitalization for locale autofixes', () => {
    const { text } = autoFix('I dagsläget saknar vi en tydlig strategi.', { locale: 'sv' });
    expect(text.startsWith('Nu')).toBe(true);
    expect(text).not.toContain('i dagsläget');
    expect(text).not.toContain('I dagsläget');
  });

  it('locale prescriptive autofixes are applied on repeated autoFix calls', () => {
    // Verifies that module-level regex lastIndex state doesn't cause misses across calls.
    const input = 'I dagsläget saknar vi en tydlig strategi.';
    const first = autoFix(input, { locale: 'sv' });
    const second = autoFix(input, { locale: 'sv' });
    expect(first.text).toBe(second.text);
    expect(first.fixes).toEqual(second.fixes);
    expect(first.text).toContain('Nu');
    expect(first.text).not.toContain('dagsläget');
  });
});

// ─── humanize ────────────────────────────────────────────

describe('humanize', () => {
  it('returns a valid suggestion object', () => {
    const result = humanize('This is a testament to great things.');
    expect(result).toHaveProperty('score');
    expect(result).toHaveProperty('reliability');
    expect(result).toHaveProperty('critical');
    expect(result).toHaveProperty('important');
    expect(result).toHaveProperty('minor');
    expect(result).toHaveProperty('guidance');
    expect(result).toHaveProperty('totalIssues');
    expect(result).toHaveProperty('styleTips');
  });

  it('categorizes issues by severity', () => {
    const text = loadFixture('ai-sample-1.txt');
    const result = humanize(text);
    expect(result.critical.length).toBeGreaterThan(0);
    expect(result.important.length).toBeGreaterThan(0);
  });

  it('provides guidance tips', () => {
    const text = loadFixture('ai-sample-1.txt');
    const result = humanize(text);
    expect(result.guidance.length).toBeGreaterThan(0);
    expect(result.guidance.some((g) => typeof g === 'string' && g.length > 10)).toBe(true);
  });

  it('returns autofix results when requested', () => {
    const text = 'In order to help, I hope this helps!';
    const result = humanize(text, { autofix: true });
    expect(result.autofix).not.toBeNull();
    expect(result.autofix.text).not.toContain('In order to');
    expect(result.autofix.fixes.length).toBeGreaterThan(0);
  });

  it('returns null autofix when not requested', () => {
    const result = humanize('Some text here.', { autofix: false });
    expect(result.autofix).toBeNull();
  });

  it('scores human text low', () => {
    const text = loadFixture('human-sample-1.txt');
    const result = humanize(text);
    expect(result.score).toBeLessThan(30);
  });

  it('each suggestion has required fields', () => {
    const text = loadFixture('ai-sample-1.txt');
    const result = humanize(text);
    const allSuggestions = [...result.critical, ...result.important, ...result.minor];
    for (const s of allSuggestions) {
      expect(s).toHaveProperty('pattern');
      expect(s).toHaveProperty('patternId');
      expect(s).toHaveProperty('category');
      expect(s).toHaveProperty('suggestion');
      expect(s).toHaveProperty('line');
    }
  });

  it('includes style tips for AI-like text', () => {
    const text = loadFixture('ai-sample-1.txt');
    const result = humanize(text);
    expect(result.styleTips).toBeDefined();
    expect(Array.isArray(result.styleTips)).toBe(true);
  });

  it('respects verbose option for returned suggestions', () => {
    const text = '“a” “b” “c” “d” “e” “f” “g”';
    const compact = humanize(text, { verbose: false });
    const verbose = humanize(text, { verbose: true });

    expect(compact.minor.length).toBe(5);
    expect(verbose.minor.length).toBeGreaterThan(compact.minor.length);
  });

  it('defaults verbose mode to preserve legacy full suggestion output', () => {
    const text = '“a” “b” “c” “d” “e” “f” “g”';
    const defaultResult = humanize(text);
    const verboseResult = humanize(text, { verbose: true });
    const compact = humanize(text, { verbose: false });

    expect(defaultResult.minor.length).toBe(verboseResult.minor.length);
    expect(defaultResult.minor.length).toBeGreaterThan(compact.minor.length);
  });

  it('passes strict option through to analysis', () => {
    const text = 'Guys, we need more manpower. The chairman approved this.';
    const resultDefault = humanize(text);
    const resultStrict = humanize(text, { strict: true });
    expect(resultStrict.totalIssues).toBeGreaterThan(resultDefault.totalIssues);
    expect(
      [...resultStrict.critical, ...resultStrict.important, ...resultStrict.minor].some(
        (s) => s.patternId === 35,
      ),
    ).toBe(true);
  });

  it('withLm adds optional n-gram uniformity boost for repetitive text', () => {
    const text =
      'This process is very clear and very clear and very clear. This process is very clear and very clear and very clear. This process is very clear and very clear and very clear.';
    const resultDefault = humanize(text);
    const resultWithLm = humanize(text, { withLm: true });
    expect(resultWithLm.lmUniformityBoost).toBeGreaterThan(0);
    expect(resultWithLm.uniformityScore).toBeGreaterThanOrEqual(resultDefault.uniformityScore);
  });
});

describe('buildGuidance', () => {
  it('uses rawScore to gate rewrite-from-scratch guidance when available', () => {
    const tipText = 'Consider rewriting from scratch.';

    const suppressedByCalibratedScore = buildGuidance({ score: 20, rawScore: 72, findings: [] });
    expect(suppressedByCalibratedScore.some((tip) => tip.includes(tipText))).toBe(true);

    const lowRawScore = buildGuidance({ score: 90, rawScore: 30, findings: [] });
    expect(lowRawScore.some((tip) => tip.includes(tipText))).toBe(false);
  });
});

// ─── formatSuggestions ───────────────────────────────────

describe('formatSuggestions', () => {
  it('produces readable output', () => {
    const text = loadFixture('ai-sample-1.txt');
    const result = humanize(text);
    const output = formatSuggestions(result);
    expect(typeof output).toBe('string');
    expect(output).toContain('HUMANIZATION SUGGESTIONS');
    expect(output).toContain('AI Score:');
    expect(output).toContain('Confidence:');
  });

  it('includes guidance section', () => {
    const text = loadFixture('ai-sample-1.txt');
    const result = humanize(text);
    const output = formatSuggestions(result);
    expect(output).toContain('GUIDANCE');
  });

  it('does not cap grouped important/minor suggestions with hidden remainder lines', () => {
    const important = Array.from({ length: 16 }, (_, index) => makeSuggestion(index, 'Important'));
    const minor = Array.from({ length: 11 }, (_, index) => makeSuggestion(index, 'Minor'));

    const output = formatSuggestions({
      score: 72,
      patternScore: 68,
      uniformityScore: 52,
      reliability: { level: 'high', score: 90 },
      totalIssues: 27,
      critical: [],
      important,
      minor,
      autofix: null,
      guidance: [],
      styleTips: [],
    });

    expect(output).toContain('Important match 15');
    expect(output).toContain('Minor match 10');
    expect(output).not.toContain('... and');
  });

  it('rounds displayed issue totals for consistent output', () => {
    const output = formatSuggestions({
      score: 10,
      patternScore: 12,
      uniformityScore: 8,
      reliability: null,
      totalIssues: 7.6,
      critical: [makeSuggestion(0, 'Critical')],
      important: [],
      minor: [],
      autofix: null,
      guidance: [],
      styleTips: [],
    });

    expect(output).toContain('Issues: 8  |  Pattern: 12  |  Uniformity: 8');
  });
});
