/**
 * Optional LM uniformity boost — run with WITH_LM=1.
 */
import { describe, it, expect } from 'vitest';
import { analyze } from '../../../src/analyzer.js';
import { computeLmUniformityBoost } from '../../../src/stats.js';

const runLm = process.env.WITH_LM === '1';

describe.skipIf(!runLm)('LM uniformity (WITH_LM=1)', () => {
  it('computeLmUniformityBoost returns a bounded boost for long text', () => {
    const text = `${'The council met on Tuesday and approved the budget after a short debate. '.repeat(12)}`;
    const b = computeLmUniformityBoost(text);
    expect(b).toBeGreaterThanOrEqual(0);
    expect(b).toBeLessThanOrEqual(28);
  });

  it('withLm can increase composite score vs baseline when uniformity applies', () => {
    const text = `${'The team shipped the patch, monitored errors, and rolled forward carefully. '.repeat(10)}`;
    const base = analyze(text, { locale: 'en', withLm: false });
    const lm = analyze(text, { locale: 'en', withLm: true });
    expect(lm.uniformityScore).toBeGreaterThanOrEqual(base.uniformityScore);
  });
});
