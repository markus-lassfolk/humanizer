/**
 * Optional Swedish LM uniformity boost — run with WITH_LM=1 (needs sv-ngram-lm.json).
 */
import { describe, it, expect } from 'vitest';
import { analyze } from '../../../src/analyzer.js';
import { computeLmUniformityBoost } from '../../../src/stats.js';

const runLm = process.env.WITH_LM === '1';

describe.skipIf(!runLm)('LM uniformity Swedish (WITH_LM=1)', () => {
  it('computeLmUniformityBoost is bounded for long Swedish text', () => {
    const text = `${'Kommunen redovisade beslutet i april och skickade kallelsen i god tid. '.repeat(15)}`;
    const b = computeLmUniformityBoost(text, 'sv');
    expect(b).toBeGreaterThanOrEqual(0);
    expect(b).toBeLessThanOrEqual(28);
  });

  it('withLm does not lower uniformity vs baseline for sv', () => {
    const text = `${'Handläggaren dokumenterade ärendet, arkiverade bilagorna och skickade bekräftelse samma dag. '.repeat(12)}`;
    const base = analyze(text, { locale: 'sv', withLm: false });
    const lm = analyze(text, { locale: 'sv', withLm: true });
    expect(lm.uniformityScore).toBeGreaterThanOrEqual(base.uniformityScore);
  });
});
