import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { analyze } = require('../src/analyzer.js');
const { loadLocale, SUPPORTED_LOCALES } = require('../src/locales');
const { shouldScoreEmpiricalExtra, buildStopSet } = require('../src/locales/nb/empirical-filter');

const SAMPLES = {
  nb: {
    ai: 'I dagens digitale landskap er det viktig å merke seg at bedrifter må dykke ned i de mangefasetterte utfordringene. Banebrytende og sømløse løsninger låser opp potensialet.',
    human:
      'Nasjonal sikkerhetsmyndighet anbefaler at virksomheter styrker sikkerheten i viktige systemer. Tiltak må sikre at ressurser og verktøy er oppdatert, og at utfordringer følges opp.',
  },
  da: {
    ai: 'I nutidens digitale landskab er det vigtigt at bemærke, at virksomheder må dykke ned i de mangefacetterede udfordringer. Banebrydende og sømløse løsninger åbner op for potentialet.',
    human:
      'Center for Cybersikkerhed anbefaler, at virksomheder styrker sikkerheden i vigtige systemer. Indsatsen skal sikre, at ressurser og værktøj er opdateret, og at udfordringer følges op.',
  },
};

describe.each(['nb', 'da'])('%s locale', (code) => {
  it('is registered and loads with the full profile', () => {
    expect(SUPPORTED_LOCALES).toContain(code);
    const p = loadLocale(code);
    expect(p.code).toBe(code);
    expect(p.nativeCurlyQuotes).toBe(true);
    expect(p.readability).toBe('lix');
    expect(p.tier1.length).toBeGreaterThan(5);
    expect(p.phrases.length).toBeGreaterThan(5);
    expect(p.empiricalExtra.length).toBeGreaterThan(0);
  });

  it('scores calque-heavy text well above plain professional prose', () => {
    const ai = analyze(SAMPLES[code].ai, { locale: code }).score;
    const human = analyze(SAMPLES[code].human, { locale: code }).score;
    expect(ai).toBeGreaterThan(human + 10);
    expect(human).toBeLessThan(10);
  });

  it('does not flag native curly quotes (Pattern 18)', () => {
    const r = analyze('Han sa: ”Det er klart.” Det var ikke hans ’ide’.', { locale: code });
    expect(r.findings.some((f) => f.patternId === 18)).toBe(false);
  });
});

describe('nordic empirical filter', () => {
  it('keeps multi-word n-grams only and rejects stop-word-only grams', () => {
    const stop = buildStopSet(['og', 'i', 'det']);
    expect(shouldScoreEmpiricalExtra('sørge for at', 3, stop, new Set())).toBe(true);
    expect(shouldScoreEmpiricalExtra('resultatene', 9, stop, new Set())).toBe(false);
    expect(shouldScoreEmpiricalExtra('og i det', 9, stop, new Set())).toBe(false);
  });
});
