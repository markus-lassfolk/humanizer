/**
 * swedish.test.js — Tests for Swedish locale support.
 *
 * Covers:
 *  1. Unicode-safe tokenization (å, ä, ö preserved)
 *  2. Swedish sentence splitting (abbreviations don't split)
 *  3. Swedish tier vocabulary detection via analyze({ locale: 'sv' })
 *  4. LIX readability metric computed for sv, FK for en
 *  5. Swedish function word ratio uses Swedish word list
 *  6. English default behaviour is identical before and after locale changes
 *  7. Swedish autofixes via autoFix({ locale: 'sv' })
 *  8. Formal / neutral Swedish prose does not score highly (calibration)
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createRequire } from 'module';
import { analyze, score } from '../../../src/analyzer.js';
import { autoFix } from '../../../src/humanizer.js';
import { tokenize, splitSentences, computeStats } from '../../../src/stats.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadFixture(name) {
  return fs.readFileSync(path.join(__dirname, '../../../tests/fixtures', name), 'utf-8');
}

describe('Swedish pattern packs 30–35 wiring', () => {
  it('locale profile exposes merged pattern packs for new detectors', () => {
    const { loadLocale } = require('../../../src/locales/index.js');
    const sv = loadLocale('sv');
    for (const id of [30, 31, 32, 33, 34, 35]) {
      const p = sv.patternPacks[id];
      expect(p, `patternPacks[${id}]`).toBeTruthy();
      if (id === 31) {
        expect(p.svAdverbDensity).toBe(true);
      } else {
        expect(Array.isArray(p) ? p.length : Object.keys(p).length).toBeGreaterThan(0);
      }
    }
  });
});

describe('Swedish empirical bundle', () => {
  it('locale exposes non-empty empiricalExtra (multi-word n-grams only)', () => {
    const { loadLocale } = require('../../../src/locales/index.js');
    const sv = loadLocale('sv');
    expect(Array.isArray(sv.empiricalExtra)).toBe(true);
    expect(sv.empiricalExtra.length).toBeGreaterThan(0);
    for (const entry of sv.empiricalExtra.slice(0, 8)) {
      const w = typeof entry === 'string' ? entry : entry.word;
      expect(w).toMatch(/\s/);
    }
  });

  it('English locale exposes empiricalExtra when en-frequencies is bundled', () => {
    const { loadLocale } = require('../../../src/locales/index.js');
    const en = loadLocale('en');
    expect(Array.isArray(en.empiricalExtra)).toBe(true);
    for (const entry of en.empiricalExtra) {
      const w = typeof entry === 'string' ? entry : entry.word;
      expect(typeof w).toBe('string');
      expect(w.length).toBeGreaterThan(0);
    }
  });
});

// ─── 1. Unicode-safe tokenization ────────────────────────

describe('tokenize — Unicode support', () => {
  it('preserves Swedish letters å, ä, ö', () => {
    const words = tokenize('Åsa äger öar i Östersjön.');
    expect(words).toContain('åsa');
    expect(words).toContain('äger');
    expect(words).toContain('öar');
    expect(words).toContain('östersjön');
  });

  it('preserves accented characters from other languages', () => {
    const words = tokenize('Françoise résumé naïve');
    expect(words).toContain('françoise');
    expect(words).toContain('résumé');
    expect(words).toContain('naïve');
  });

  it('still strips punctuation that is not inside words', () => {
    const words = tokenize('Hello, world! How are you?');
    expect(words).not.toContain(',');
    expect(words).not.toContain('!');
    expect(words).not.toContain('?');
    expect(words).toContain('hello');
    expect(words).toContain('world');
  });

  it('handles contractions and hyphens within words', () => {
    const words = tokenize("it's well-known");
    // Apostrophe inside a word is kept; leading/trailing stripped
    expect(words.join(' ')).toContain('well-known');
  });

  it('Swedish text: word count is not inflated by broken characters', () => {
    const text = 'Hunden sprang över ängen och skällde på grannens katter.';
    const words = tokenize(text);
    // Should tokenize to 9 real words, not more due to character splitting
    expect(words.length).toBe(9);
  });
});

// ─── 2. Sentence splitting with Swedish abbreviations ────

describe('splitSentences — Swedish abbreviations', () => {
  // Import loadLocale via the module
  let svProfile;
  beforeAll(async () => {
    const { loadLocale } = await import('../../../src/locales/index.js');
    svProfile = loadLocale('sv');
  });

  it('does not split on t.ex.', () => {
    const text = 'Vi använde flera verktyg, t.ex. Excel och Word. Resultaten var bra.';
    const sentences = splitSentences(text, svProfile);
    expect(sentences.length).toBe(2);
  });

  it('does not split on dvs.', () => {
    // dvs. followed by lowercase → abbreviation protected, no split mid-sentence
    const text =
      'Det gäller tekniska krav, dvs. de specifikationer som anges i bilagan. Se vidare avsnitt tre.';
    const sentences = splitSentences(text, svProfile);
    expect(sentences.length).toBe(2);
  });

  it('does not split on bl.a.', () => {
    const text =
      'Åtgärderna inkluderar bl.a. ny belysning och bättre skyltning. Kostnaderna redovisas separat.';
    const sentences = splitSentences(text, svProfile);
    expect(sentences.length).toBe(2);
  });

  it('does not split on m.m. when mid-sentence', () => {
    // m.m. followed by lowercase should NOT create a sentence split
    const text = 'Listan inkluderar tabeller, figurer m.m. som visas i bilagan. Se avsnitt tre.';
    const sentences = splitSentences(text, svProfile);
    expect(sentences.length).toBe(2);
  });

  it('does split on normal sentence-ending periods', () => {
    const text = 'Mötet börjar kl. 14. Vi ses då. Ta med anteckningarna.';
    const sentences = splitSentences(text, svProfile);
    // "kl. 14" should not split, yielding three sentences total.
    expect(sentences.length).toBe(3);
  });

  it('English locale does not protect Swedish abbreviations', () => {
    const { loadLocale } = require('../../../src/locales/index.js');
    const enProfile = loadLocale('en');
    const text = 'Vi använde t.ex. Excel. Resultaten var bra.';
    const sentences = splitSentences(text, enProfile);
    // Without sv abbreviation protection, t.ex. may cause a split
    // We just check it still returns an array without errors
    expect(Array.isArray(sentences)).toBe(true);
    expect(sentences.length).toBeGreaterThanOrEqual(1);
  });
});

// ─── 3. Swedish vocabulary detection ─────────────────────

describe('analyze — Swedish tier detection', () => {
  it('detects Tier 1 Swedish AI words in AI sample', () => {
    const text = loadFixture('sv-ai-sample-1.txt');
    const result = analyze(text, { locale: 'sv' });
    // Should detect pattern 7 (AI vocabulary) with matches
    const pattern7 = result.findings.find((f) => f.patternId === 7);
    expect(pattern7).toBeDefined();
    expect(pattern7.matchCount).toBeGreaterThan(3);
  });

  it('AI sample scores higher than human sample', () => {
    const aiText = loadFixture('sv-ai-sample-1.txt');
    const humanText = loadFixture('sv-human-sample-1.txt');
    const aiScore = score(aiText, { locale: 'sv' });
    const humanScore = score(humanText, { locale: 'sv' });
    expect(aiScore).toBeGreaterThan(humanScore);
  });

  it('detects "sömlös" as a Tier 1 signal', () => {
    const text =
      'Lösningen erbjuder sömlös integration med befintliga system och sömlöst samarbete.';
    const result = analyze(text, { locale: 'sv' });
    const pattern7 = result.findings.find((f) => f.patternId === 7);
    expect(pattern7).toBeDefined();
    const matched = pattern7.matches.some((m) => /sömlös/i.test(m.match));
    expect(matched).toBe(true);
  });

  it('detects "banbrytande" as a Tier 1 signal', () => {
    const text =
      'Vår banbrytande metodik transformerar hela organisationen på ett holistiskt sätt.';
    const result = analyze(text, { locale: 'sv' });
    const pattern7 = result.findings.find((f) => f.patternId === 7);
    expect(pattern7).toBeDefined();
  });

  it('detects Swedish AI phrases', () => {
    const text = 'I dagens snabbt föränderliga digitala landskap måste vi fördjupa oss i frågan.';
    const result = analyze(text, { locale: 'sv' });
    // Should hit the "I dagens snabbt föränderliga" phrase pattern
    expect(result.totalMatches).toBeGreaterThan(0);
  });

  it('detects Swenglish loan words as Tier 1', () => {
    const text =
      'Vi behöver samla alla stakeholders för att diskutera best practices och key takeaways.';
    const result = analyze(text, { locale: 'sv' });
    const pattern7 = result.findings.find((f) => f.patternId === 7);
    expect(pattern7).toBeDefined();
    expect(pattern7.matchCount).toBeGreaterThanOrEqual(3);
  });
});

// ─── 4. LIX readability ──────────────────────────────────

describe('computeStats — LIX for sv, FK for en', () => {
  let svProfile;
  let enProfile;
  beforeAll(async () => {
    const { loadLocale } = await import('../../../src/locales/index.js');
    svProfile = loadLocale('sv');
    enProfile = loadLocale('en');
  });

  it('computes LIX (not null) for sv locale', () => {
    const text =
      'Kommunen genomförde en utredning om tillgängligheten vid servicekontoret. Resultaten presenterades för kommunstyrelsen i april.';
    const stats = computeStats(text, svProfile);
    expect(stats.lix).not.toBeNull();
    expect(typeof stats.lix).toBe('number');
    expect(stats.lix).toBeGreaterThan(0);
  });

  it('computes FK (not null, lix is null) for en locale', () => {
    const text =
      'The city council reviewed the accessibility report at the April meeting. Results were presented to all members.';
    const stats = computeStats(text, enProfile);
    expect(stats.fleschKincaid).not.toBeNull();
    expect(stats.lix).toBeNull();
  });

  it('LIX is higher for complex text than simple text', () => {
    const complex =
      'Förvaltningsrättens avgörande fastslår att kommunens handläggning av tillståndsansökan strider mot förvaltningslagens bestämmelser om skyndsamhetskravet.';
    const simple = 'Vi gick dit. Det var bra. Vi kom hem.';
    const statsComplex = computeStats(complex, svProfile);
    const statsSimple = computeStats(simple, svProfile);
    expect(statsComplex.lix).toBeGreaterThan(statsSimple.lix);
  });
});

// ─── 5. Swedish function word ratio ──────────────────────

describe('computeStats — Swedish function words', () => {
  let svProfile;
  beforeAll(async () => {
    const { loadLocale } = await import('../../../src/locales/index.js');
    svProfile = loadLocale('sv');
  });

  it('functionWordRatio is > 0 for Swedish text with sv profile', () => {
    const text = 'Vi och de är på väg till ett möte med honom och henne.';
    const stats = computeStats(text, svProfile);
    expect(stats.functionWordRatio).toBeGreaterThan(0);
  });

  it('sv function word ratio is higher than en ratio for Swedish text', () => {
    const text = 'Vi och de är på väg till ett möte med honom och henne i den stora salen.';
    const { loadLocale } = require('../../../src/locales/index.js');
    const statsEn = computeStats(text, loadLocale('en'));
    const statsSv = computeStats(text, svProfile);
    // Swedish function words should match more in this Swedish sentence
    expect(statsSv.functionWordRatio).toBeGreaterThan(statsEn.functionWordRatio);
  });
});

// ─── 6. English default behaviour unchanged ───────────────

describe('English default behaviour regression', () => {
  it('analyze() without locale defaults to en and detects English AI words', () => {
    const text = 'This comprehensive guide delves into the intricacies of leveraging synergies.';
    const result = analyze(text);
    const pattern7 = result.findings.find((f) => f.patternId === 7);
    expect(pattern7).toBeDefined();
    expect(pattern7.matchCount).toBeGreaterThan(0);
  });

  it('analyze() with locale: "en" returns same score as no locale', () => {
    const text = 'This comprehensive guide delves into the intricacies of leveraging synergies.';
    const s1 = score(text);
    const s2 = score(text, { locale: 'en' });
    expect(s1).toBe(s2);
  });

  it('English AI sample still scores above 40 with en locale', () => {
    const text = loadFixture('ai-sample-1.txt');
    const s = score(text, { locale: 'en' });
    expect(s).toBeGreaterThan(40);
  });

  it('English human sample still scores below 30 with en locale', () => {
    const text = loadFixture('human-sample-1.txt');
    const s = score(text, { locale: 'en' });
    expect(s).toBeLessThan(30);
  });

  it('FK grade is returned (not null) for en locale', () => {
    const result = analyze('The weather was good today. We went for a walk.', { locale: 'en' });
    expect(result.stats.fleschKincaid).not.toBeNull();
    expect(result.stats.lix).toBeNull();
  });

  it('unknown locale throws an error', () => {
    expect(() => analyze('test', { locale: 'fr' })).toThrow(/Unknown locale/);
  });
});

// ─── 7. Swedish autofixes ─────────────────────────────────

describe('autoFix — Swedish locale', () => {
  it('replaces "nyttja" with "använda"', () => {
    const { text, fixes } = autoFix('Vi bör nyttja de resurser som finns tillgängliga.', {
      locale: 'sv',
    });
    expect(text).toContain('använda');
    expect(text).not.toContain('nyttja');
    expect(fixes.some((f) => f.includes('nyttja'))).toBe(true);
  });

  it('replaces "i syfte att" with "för att"', () => {
    const { text } = autoFix('Mötet hölls i syfte att diskutera budgeten.', { locale: 'sv' });
    expect(text).toContain('för att');
    expect(text).not.toContain('i syfte att');
  });

  it('replaces "i dagsläget" with "nu"', () => {
    const { text } = autoFix('I dagsläget saknar vi en tydlig strategi.', { locale: 'sv' });
    expect(text).toContain('nu');
    expect(text).not.toContain('i dagsläget');
  });

  it('replaces "på grund av det faktum att" with "eftersom"', () => {
    const { text } = autoFix('Vi pausade på grund av det faktum att systemet kraschade.', {
      locale: 'sv',
    });
    expect(text).toContain('eftersom');
  });

  it('removes "det är viktigt att notera att"', () => {
    const { text } = autoFix('Det är viktigt att notera att resultaten varierar.', {
      locale: 'sv',
    });
    expect(text).not.toContain('det är viktigt att notera att');
  });

  it('still applies English fixes in sv locale (curly quotes)', () => {
    const { text, fixes } = autoFix('\u201CHej\u201D', { locale: 'sv' });
    expect(text).toBe('"Hej"');
    expect(fixes.some((f) => f.includes('curly'))).toBe(true);
  });

  it('English autoFix does not apply Swedish fixes', () => {
    const { text } = autoFix('Vi bör nyttja resurserna.', { locale: 'en' });
    // With en locale, "nyttja" should NOT be replaced
    expect(text).toContain('nyttja');
  });
});

// ─── 8. Calibration: formal Swedish prose ────────────────

describe('Calibration — formal Swedish should not over-flag', () => {
  it('formal public-sector Swedish scores lower than AI sample', () => {
    const formalText = loadFixture('sv-formal-public-sector.txt');
    const aiText = loadFixture('sv-ai-sample-1.txt');
    const formalScore = score(formalText, { locale: 'sv' });
    const aiScoreVal = score(aiText, { locale: 'sv' });
    expect(formalScore).toBeLessThan(aiScoreVal);
  });

  it('human-written Swedish prose does not reach score 50', () => {
    const text = loadFixture('sv-human-sample-1.txt');
    const s = score(text, { locale: 'sv' });
    expect(s).toBeLessThan(50);
  });

  it('å, ä, ö in Swedish text are counted in word statistics', () => {
    const text = 'Åsa äter äpplen i österreich och har ögon som är öppna.';
    const result = analyze(text, { locale: 'sv' });
    // 11 real words: Åsa äter äpplen i österreich och har ögon som är öppna
    expect(result.wordCount).toBe(11);
  });
});
