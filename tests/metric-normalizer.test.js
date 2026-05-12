/**
 * metric-normalizer.test.js — output contract for unavailable/non-finite metrics.
 */

import { describe, it, expect } from 'vitest';
import { analyze, formatJSON, formatMarkdown, formatReport } from '../src/analyzer.js';
import { computeStats } from '../src/stats.js';
import {
  normalizeAnalysisForOutput,
  normalizeJsonValue,
  normalizeStatsForOutput,
} from '../src/metric-normalizer.js';

function expectNoJsSentinels(value) {
  const rendered = typeof value === 'string' ? value : JSON.stringify(value);
  expect(rendered).not.toMatch(/\bNaN\b/);
  expect(rendered).not.toMatch(/\bundefined\b/);
  expect(rendered).not.toMatch(/\bInfinity\b/);
}

describe('metric output normalization', () => {
  it('normalizes NaN, Infinity, -Infinity, and undefined to null in JSON-shaped values', () => {
    expect(
      normalizeJsonValue({
        nan: Number.NaN,
        pos: Number.POSITIVE_INFINITY,
        neg: Number.NEGATIVE_INFINITY,
        missing: undefined,
        nested: [1, Number.NaN, undefined],
      }),
    ).toEqual({ nan: null, pos: null, neg: null, missing: null, nested: [1, null, null] });
  });

  it('normalizes non-finite stat metrics to null with availability metadata', () => {
    const stats = normalizeStatsForOutput({
      ...computeStats('One sentence only.'),
      burstiness: Number.NaN,
      functionWordRatio: Number.POSITIVE_INFINITY,
      fleschKincaid: undefined,
    });

    expect(stats.burstiness).toBeNull();
    expect(stats.functionWordRatio).toBeNull();
    expect(stats.fleschKincaid).toBeNull();
    expect(stats.metricAvailability.burstiness).toHaveProperty('reason');
    expect(stats.metricAvailability.functionWordRatio).toHaveProperty('reason');
    expect(stats.metricAvailability.fleschKincaid).toHaveProperty('reason');
    expectNoJsSentinels(stats);
  });

  it('keeps analyze --json schema stable for short input', () => {
    const parsed = JSON.parse(formatJSON(analyze('Hej.')));

    expect(parsed).toHaveProperty('score');
    expect(parsed).toHaveProperty('stats');
    expect(parsed.stats).toHaveProperty('metricAvailability');
    expect(parsed.stats).toHaveProperty('burstiness', null);
    expect(parsed.stats).toHaveProperty('sentenceLengthStdDev', null);
    expect(parsed.stats).toHaveProperty('fleschKincaid', null);
    expect(parsed.stats.metricAvailability.burstiness.reason).toBe('requires at least 2 sentences');
    expect(parsed.stats.metricAvailability.fleschKincaid.reason).toBe('input too short');
    expectNoJsSentinels(parsed);
  });

  it('does not leak invalid tokens in representative report/analyze JSON outputs', () => {
    const result = analyze('Hej.');

    expectNoJsSentinels(formatReport(result));
    expectNoJsSentinels(formatMarkdown(result));
    expectNoJsSentinels(formatJSON(result));
  });

  it('normalizes complete analysis payloads consistently', () => {
    const normalized = normalizeAnalysisForOutput({
      score: Number.NaN,
      patternScore: Number.POSITIVE_INFINITY,
      uniformityScore: Number.NEGATIVE_INFINITY,
      stats: {
        ...computeStats('Short.'),
        typeTokenRatio: undefined,
      },
    });

    expect(normalized.score).toBeNull();
    expect(normalized.patternScore).toBeNull();
    expect(normalized.uniformityScore).toBeNull();
    expect(normalized.stats.typeTokenRatio).toBeNull();
    expect(normalized.stats.metricAvailability.typeTokenRatio).toHaveProperty('reason');
    expectNoJsSentinels(normalized);
  });
});
