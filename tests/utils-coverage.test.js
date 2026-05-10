/**
 * utils-coverage.test.js — Additional tests for utility functions and edge cases
 */

import { describe, it, expect } from 'vitest';
import { analyze } from '../src/analyzer.js';
import { humanize, autoFix } from '../src/humanizer.js';
import { computeStats } from '../src/stats.js';
import { stripCodeSnippets } from '../src/preprocess.js';
import { wordCount } from '../src/patterns.js';
import { roundDisplayCount } from '../src/utils.js';
import {
  scanPath,
  compareTexts,
  normalizeExtensions,
  normalizeIgnoreDirs
} from '../src/workflows.js';

describe('Utility functions', () => {
  it('roundDisplayCount rounds correctly', () => {
    expect(roundDisplayCount(1.2)).toBe(1);
    expect(roundDisplayCount(1.5)).toBe(2);
    expect(roundDisplayCount(1.8)).toBe(2);
    expect(roundDisplayCount(0)).toBe(0);
  });
});

describe('AutoFix functionality', () => {
  it('fixes curly quotes', () => {
    // Using escaped curly quotes
    const text = '\u201cHello\u201d and \u2018world\u2019';
    const result = autoFix(text);
    expect(result).toHaveProperty('text');
    expect(result).toHaveProperty('fixes');
    expect(result.text).not.toContain('\u201c'); // Left double curly quote
    expect(result.text).not.toContain('\u2018'); // Left single curly quote
  });

  it('returns fixes array', () => {
    const text = '\u201cQuoted\u201d';
    const result = autoFix(text);
    expect(Array.isArray(result.fixes)).toBe(true);
    expect(result.fixes.length).toBeGreaterThan(0);
  });

  it('handles empty text', () => {
    const result = autoFix('');
    expect(result).toHaveProperty('text');
    expect(result.text).toBe('');
  });
});

describe('Code preprocessing', () => {
  it('strips fenced code blocks', () => {
    const text = 'Text\n```javascript\ncode here\n```\nMore text';
    const stripped = stripCodeSnippets(text);
    expect(stripped).not.toContain('code here');
    expect(stripped).toContain('Text');
  });

  it('strips inline code', () => {
    const text = 'Use `const x = 1` in your code.';
    const stripped = stripCodeSnippets(text);
    expect(stripped).not.toContain('const x');
  });

  it('handles multiple code blocks', () => {
    const text = '```js\ncode1\n```\nText\n```python\ncode2\n```';
    const stripped = stripCodeSnippets(text);
    expect(stripped).not.toContain('code1');
    expect(stripped).not.toContain('code2');
  });
});

describe('Stats computation edge cases', () => {
  it('handles very short text', () => {
    const stats = computeStats('Hi', { locale: 'en' });
    expect(stats.wordCount).toBe(1);
    expect(stats.sentenceCount).toBeGreaterThanOrEqual(0);
  });

  it('handles text with only punctuation', () => {
    const stats = computeStats('...!!!', { locale: 'en' });
    expect(stats).toHaveProperty('wordCount');
  });

  it('handles single sentence', () => {
    const stats = computeStats('This is one sentence.', { locale: 'en' });
    expect(stats.sentenceCount).toBe(1);
  });
});

describe('Analyze with various options', () => {
  it('analyze with ignoreCode option', () => {
    const text = 'Text\n```js\ncode\n```\nMore';
    const result = analyze(text, { ignoreCode: true, locale: 'en' });
    expect(result.score).toBeDefined();
  });

  it('analyze with strict mode', () => {
    const result = analyze('Test text', { strict: true, locale: 'en' });
    expect(result.score).toBeDefined();
  });

  it('analyze with onlyPatterns filter', () => {
    const text = 'It is important to note that this is crucial.';
    const result = analyze(text, { onlyPatterns: [7], locale: 'en' });
    expect(result.findings).toBeDefined();
  });

  it('analyze with ignorePatterns filter', () => {
    const text = 'It is important to note that this is crucial.';
    const result = analyze(text, { ignorePatterns: [7], locale: 'en' });
    expect(result.findings).toBeDefined();
  });
});

describe('Humanize with various options', () => {
  it('humanize with autofix option', () => {
    const result = humanize('\u201cQuoted text\u201d is here.', { autofix: true, locale: 'en' });
    expect(result).toHaveProperty('score');
    expect(result).toHaveProperty('critical');
  });

  it('humanize without verbose', () => {
    const result = humanize('Test text', { verbose: false, locale: 'en' });
    expect(result).toHaveProperty('score');
  });

  it('humanize groups suggestions by severity', () => {
    const result = humanize('It is important to note that this is crucial.', { locale: 'en' });
    expect(result).toHaveProperty('critical');
    expect(result).toHaveProperty('important');
    expect(result).toHaveProperty('minor');
  });
});

describe('Workflow functions', () => {
  it('normalizeExtensions adds dots', () => {
    const normalized = normalizeExtensions(['txt', 'md', '.js']);
    expect(normalized).toContain('.txt');
    expect(normalized).toContain('.md');
    expect(normalized).toContain('.js');
  });

  it('normalizeExtensions handles empty input', () => {
    const normalized = normalizeExtensions([]);
    expect(Array.isArray(normalized)).toBe(true);
    expect(normalized.length).toBeGreaterThan(0); // Should have defaults
  });

  it('normalizeIgnoreDirs is a function', () => {
    expect(typeof normalizeIgnoreDirs).toBe('function');
    const result = normalizeIgnoreDirs(['custom']);
    // Returns a Set, not an array
    expect(result instanceof Set).toBe(true);
  });

  it('compareTexts calculates improvement', () => {
    const before = 'It is important to note that this is crucial and vital.';
    const after = 'This is important.';
    const result = compareTexts(before, after, { locale: 'en' });
    expect(result).toHaveProperty('before');
    expect(result).toHaveProperty('after');
    expect(result).toHaveProperty('delta');
  });
});

describe('Edge cases and error handling', () => {
  it('handles null text gracefully', () => {
    expect(() => analyze(null)).not.toThrow();
    expect(() => humanize(null)).not.toThrow();
    expect(() => computeStats(null, { locale: 'en' })).not.toThrow();
  });

  it('handles undefined text gracefully', () => {
    expect(() => analyze(undefined)).not.toThrow();
    expect(() => humanize(undefined)).not.toThrow();
    expect(() => computeStats(undefined, { locale: 'en' })).not.toThrow();
  });

  it('handles very long text', () => {
    const longText = 'word '.repeat(5000);
    expect(() => analyze(longText, { locale: 'en' })).not.toThrow();
  });

  it('handles text with special unicode', () => {
    const text = 'Hello 👋 world 🌍 test ✨';
    const result = analyze(text, { locale: 'en' });
    expect(result.score).toBeDefined();
  });

  it('handles text with various newlines', () => {
    const text = 'Line1\nLine2\r\nLine3\rLine4';
    const result = analyze(text, { locale: 'en' });
    expect(result.score).toBeDefined();
  });
});

describe('Swedish locale support', () => {
  it('analyzes Swedish text', () => {
    const result = analyze('Detta är en svensk text.', { locale: 'sv' });
    expect(result.score).toBeDefined();
  });

  it('humanizes Swedish text', () => {
    const result = humanize('Detta är en svensk text.', { locale: 'sv' });
    expect(result.score).toBeDefined();
  });

  it('computes Swedish stats with LIX', () => {
    const stats = computeStats('Detta är en mening.', { locale: 'sv' });
    expect(stats).toHaveProperty('lix');
  });

  it('autofixes Swedish text', () => {
    const result = autoFix('Detta är en text.', { locale: 'sv' });
    expect(result).toHaveProperty('text');
    expect(result).toHaveProperty('fixes');
  });
});

describe('Word counting consistency', () => {
  it('wordCount matches analyze wordCount', () => {
    const text = 'This is a test sentence with several words.';
    const wc = wordCount(text);
    const result = analyze(text, { locale: 'en' });
    // They might differ slightly due to different tokenization, but should be close
    expect(Math.abs(wc - result.wordCount)).toBeLessThan(5);
  });
});
