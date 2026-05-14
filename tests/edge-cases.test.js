/**
 * edge-cases.test.js — Edge case tests.
 *
 * Empty text, single word, unicode, non-English, very long text.
 */

import { describe, it, expect } from 'vitest';
import { analyze, score, formatMarkdown, formatReport } from '../src/analyzer.js';
import { computeStats } from '../src/stats.js';

// ─── Empty / Minimal Input ───────────────────────────────

describe('empty and minimal input', () => {
  it('handles empty string', () => {
    const result = analyze('');
    expect(result.score).toBe(0);
    expect(result.totalMatches).toBe(0);
    expect(result.wordCount).toBe(0);
  });

  it('handles whitespace-only string', () => {
    const result = analyze('   \n\n\t  ');
    expect(result.score).toBe(0);
  });

  it('handles null', () => {
    const result = analyze(null);
    expect(result.score).toBe(0);
  });

  it('handles undefined', () => {
    const result = analyze(undefined);
    expect(result.score).toBe(0);
  });

  it('handles single word — score is low', () => {
    const result = analyze('hello');
    expect(result.score).toBeLessThanOrEqual(15);
    expect(result.wordCount).toBe(1);
  });

  it('handles single character — score is low', () => {
    const result = analyze('x');
    expect(result.score).toBeLessThanOrEqual(15);
  });

  it('handles number-only input — score is low', () => {
    const result = analyze('12345');
    expect(result.score).toBeLessThanOrEqual(15);
  });

  it('statistics handles empty string', () => {
    const stats = computeStats('');
    expect(stats.sentenceCount).toBe(0);
    expect(stats.wordCount).toBe(0);
  });

  it('statistics handles single word', () => {
    const stats = computeStats('hello');
    expect(stats.wordCount).toBe(1);
    expect(stats.typeTokenRatio).toBe(1);
  });
});

// ─── Unicode & Special Characters ────────────────────────

describe('unicode and special characters', () => {
  it('handles emoji text', () => {
    const result = analyze('🎉 Hello world! 🚀 Great day! ✅ Done!');
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it('handles Chinese text', () => {
    const result = analyze('这是一个测试。人工智能正在改变世界。');
    expect(result.score).toBeGreaterThanOrEqual(0);
  });

  it('handles Japanese text', () => {
    const result = analyze('これはテストです。AIは世界を変えています。');
    expect(result.score).toBeGreaterThanOrEqual(0);
  });

  it('handles Arabic text', () => {
    const result = analyze('هذا اختبار. الذكاء الاصطناعي يغير العالم.');
    expect(result.score).toBeGreaterThanOrEqual(0);
  });

  it('handles mixed unicode and ASCII', () => {
    const text = 'The café is très bien. Über cool. Naïve approach.';
    const result = analyze(text);
    expect(result.score).toBeGreaterThanOrEqual(0);
  });

  it('handles HTML entities', () => {
    const result = analyze('This &amp; that &lt;tag&gt; content.');
    expect(result.score).toBeGreaterThanOrEqual(0);
  });

  it('handles special whitespace characters', () => {
    const result = analyze('Hello\u00A0world\u2003test\u200Bhidden');
    expect(result.score).toBeGreaterThanOrEqual(0);
  });

  it('statistics handles non-English gracefully', () => {
    const stats = computeStats('这是一个测试。人工智能正在改变世界。');
    expect(stats.sentenceCount).toBeGreaterThanOrEqual(0);
  });

  // NFD decomposed diacritics (å, ä, ö as combining sequences) must produce
  // the same score and pattern matches as their NFC equivalents.
  it('NFD Swedish text scores same as NFC equivalent', () => {
    const nfc = 'Det \u00E4r en s\u00F6ml\u00F6s l\u00F6sning.';
    const nfd = nfc.normalize('NFD');
    expect(nfd.normalize('NFC')).toBe(nfc);
    const resultNfc = analyze(nfc, { locale: 'sv' });
    const resultNfd = analyze(nfd, { locale: 'sv' });
    expect(resultNfd.score).toBe(resultNfc.score);
    expect(resultNfd.totalMatches).toBe(resultNfc.totalMatches);
  });

  it('NFD Swedish text with å, ä, ö matches same pattern IDs as NFC', () => {
    // Include "på" so NFD contains decomposed å (a + combining ring above), not only ä/ö.
    const nfc = 'Det är avgörande att föränderliga lösningar fungerar. Jämföra och välja på mötet.';
    const nfd = nfc.normalize('NFD');
    expect(nfd.normalize('NFC')).toBe(nfc);
    const resultNfc = analyze(nfc, { locale: 'sv' });
    const resultNfd = analyze(nfd, { locale: 'sv' });
    const nfcIds = resultNfc.findings.map((f) => f.patternId).sort();
    const nfdIds = resultNfd.findings.map((f) => f.patternId).sort();
    expect(nfdIds).toEqual(nfcIds);
    expect(nfd).toContain('\u030A');
  });
});

// ─── Very Long Text ──────────────────────────────────────

describe('very long text', () => {
  it('handles 1000 identical sentences', () => {
    const text = Array(1000).fill('The cat sat on the mat.').join(' ');
    const result = analyze(text);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it('handles text with thousands of newlines', () => {
    const text = Array(500).fill('Line of text.\n').join('');
    const result = analyze(text);
    expect(result.score).toBeGreaterThanOrEqual(0);
  });

  it('statistics handles very long text', () => {
    const text = Array(500).fill('The cat sat on the mat.').join(' ');
    const stats = computeStats(text);
    expect(stats.wordCount).toBeGreaterThan(100);
    expect(stats.typeTokenRatio).toBeLessThan(0.1);
  });
});

// ─── Malformed Input ─────────────────────────────────────

describe('malformed input', () => {
  it('handles text with only punctuation — score is low', () => {
    const result = analyze('...!!!???---');
    expect(result.score).toBeLessThanOrEqual(15);
  });

  it('reports zero words for punctuation-only input', () => {
    const result = analyze('--- ... !!!');
    expect(result.wordCount).toBe(0);
  });

  it('does not count punctuation-only tokens as words', () => {
    const result = analyze('Hello --- world !!!');
    expect(result.wordCount).toBe(2);
  });

  it('handles extremely long single word', () => {
    const word = 'a'.repeat(10000);
    const result = analyze(word);
    expect(result.score).toBeGreaterThanOrEqual(0);
  });

  it('handles text with excessive whitespace', () => {
    const result = analyze('Hello     world     this     is     spaced');
    expect(result.wordCount).toBeGreaterThanOrEqual(4);
  });

  it('handles markdown-heavy text', () => {
    const text =
      '# Heading\n\n**bold** _italic_ ~~strike~~ `code`\n\n- item 1\n- item 2\n- item 3\n\n> blockquote\n\n```\ncode block\n```';
    const result = analyze(text);
    expect(result.score).toBeGreaterThanOrEqual(0);
  });

  it('handles text with URLs', () => {
    const text =
      'Check out https://example.com and http://test.org/path?query=1&foo=bar for more info.';
    const result = analyze(text);
    expect(result.score).toBeGreaterThanOrEqual(0);
  });
});

// ─── Score Bounds ────────────────────────────────────────

describe('score bounds', () => {
  it('score is always 0-100', () => {
    const inputs = [
      '',
      'hello',
      'The cat sat.',
      'Additionally, this serves as a testament.',
      'Great question! I hope this helps! Let me know!',
    ];

    for (const input of inputs) {
      const s = score(input);
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(100);
    }
  });

  it('maximum AI text does not exceed 100', () => {
    const text = `Great question! Here is a comprehensive overview.

Additionally, this serves as a testament to the transformative tapestry of the evolving landscape. In today's rapidly evolving digital age, these groundbreaking tools — nestled at the forefront of innovation — are showcasing the vibrant interplay of technology, highlighting its pivotal role and underscoring the crucial importance of seamless synergy.

Experts believe it plays a crucial role. Studies show improvement. Industry reports suggest growth. Despite challenges, the ecosystem continues to thrive. It's not just a tool, it's a revolution.

In order to help, due to the fact that you asked, at this point in time, it is important to note that the future looks bright. Exciting times lie ahead. I hope this helps! Let me know if you'd like me to expand.`;

    const s = score(text);
    expect(s).toBeLessThanOrEqual(100);
    expect(s).toBeGreaterThanOrEqual(60);
  });
});

// ─── NaN / undefined guards in report output ─────────────

describe('report output — no NaN or undefined for short/edge inputs', () => {
  const shortInputs = [
    ['single word', 'hello'],
    ['single sentence', 'Hello.'],
    ['one-word with period', 'Hej.'],
    ['two words', 'hello world'],
    ['numbers only', '12345'],
    ['single character', 'x'],
  ];

  for (const [label, text] of shortInputs) {
    it(`formatMarkdown contains no "NaN" or "undefined" for: ${label}`, () => {
      const result = analyze(text);
      const md = formatMarkdown(result);
      expect(md).not.toContain('NaN');
      expect(md).not.toContain('undefined');
    });

    it(`formatReport contains no "NaN" or "undefined" for: ${label}`, () => {
      const result = analyze(text);
      const report = formatReport(result);
      expect(report).not.toContain('NaN');
      expect(report).not.toContain('undefined');
    });

    it(`analyze JSON contains no non-finite stats values for: ${label}`, () => {
      const result = analyze(text);
      if (result.stats) {
        for (const [key, val] of Object.entries(result.stats)) {
          if (Array.isArray(val)) continue;
          if (val === null) continue;
          expect(
            typeof val === 'number' && !Number.isFinite(val),
            `stats.${key} should not be non-finite (got ${val})`,
          ).toBe(false);
        }
      }
    });
  }

  it('analyze returns null stats for empty text', () => {
    const result = analyze('');
    expect(result.stats).toBeNull();
  });

  it('analyze stats.fleschKincaid is null or finite when input has no sentences', () => {
    // Punctuation-only text tokenizes to zero words → stats is null in analyze()
    const result = analyze('...');
    // Either stats is null (no words) or FK is null / a finite number
    if (result.stats !== null) {
      const fk = result.stats.fleschKincaid;
      expect(fk === null || Number.isFinite(fk)).toBe(true);
    }
  });
});
