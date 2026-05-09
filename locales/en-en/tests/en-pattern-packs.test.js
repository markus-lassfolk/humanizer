/**
 * en-pattern-packs.test.js — English-only detectors 30–35 (36 is uniformity-only).
 */

import { describe, it, expect } from 'vitest';
import { analyze } from '../../../src/analyzer.js';

const en = { locale: 'en' };

function lyHeavyText() {
  const words = [
    'quickly',
    'quietly',
    'boldly',
    'slowly',
    'deeply',
    'kindly',
    'mostly',
    'fully',
    'truly',
    'madly',
    'sadly',
    'gladly',
    'frankly',
    'honestly',
    'tightly',
    'neatly',
    'badly',
    'coldly',
    'warmly',
    'firmly',
    'softly',
    'loudly',
    'nearly',
    'widely',
    'narrowly',
    'roughly',
    'smoothly',
    'sharply',
    'flatly',
  ];
  let t = 'The report covers regional sales. ';
  for (let i = 0; i < 120; i++) {
    t += `Managers ${words[i % words.length]} reviewed the figures. `;
  }
  return t;
}

describe('English pattern packs 30–35', () => {
  it('30 passive voice fires on templated passives', () => {
    const text = 'The module was developed in 2020 and has been implemented across every region.';
    const r = analyze(text, { ...en, patternsToCheck: [30] });
    expect(r.findings.length).toBeGreaterThan(0);
    expect(r.findings[0].patternId).toBe(30);
  });

  it('31 adverb density fires when -ly rate is high', () => {
    const r = analyze(lyHeavyText(), { ...en, patternsToCheck: [31] });
    expect(r.findings.length).toBe(1);
    expect(r.findings[0].patternId).toBe(31);
  });

  it('32 weasel words fire on hedges', () => {
    const text = 'Clearly, studies show that experts believe the outcome is basically certain.';
    const r = analyze(text, { ...en, patternsToCheck: [32] });
    expect(r.findings.length).toBeGreaterThan(0);
    expect(r.findings[0].patternId).toBe(32);
  });

  it('33 clichés fire on stock phrases', () => {
    const text =
      'At the end of the day, this paradigm shift is low-hanging fruit and a win-win situation.';
    const r = analyze(text, { ...en, patternsToCheck: [33] });
    expect(r.findings.length).toBeGreaterThan(0);
    expect(r.findings[0].patternId).toBe(33);
  });

  it('34 redundancy fires on tautologies', () => {
    const text = 'Enter your PIN number at the ATM machine near the LCD display.';
    const r = analyze(text, { ...en, patternsToCheck: [34] });
    expect(r.findings.length).toBeGreaterThan(0);
    expect(r.findings[0].patternId).toBe(34);
  });

  it('35 inclusive language is off unless strict', () => {
    const text = 'The chairman approved the merge on the master branch.';
    const off = analyze(text, { ...en, patternsToCheck: [35] });
    expect(off.findings.length).toBe(0);
    const on = analyze(text, { ...en, patternsToCheck: [35], strict: true });
    expect(on.findings.length).toBeGreaterThan(0);
    expect(on.findings[0].patternId).toBe(35);
  });

  it('clean short prose avoids 30–34', () => {
    const text = 'We shipped the fix Tuesday. Uptime is back to normal.';
    const r = analyze(text, { ...en, patternsToCheck: [30, 31, 32, 33, 34] });
    expect(r.findings.length).toBe(0);
  });
});
