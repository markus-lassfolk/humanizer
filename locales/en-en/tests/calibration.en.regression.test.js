/**
 * calibration.en.regression.test.js — Gate on committed English calibration metrics.
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const reportPath = path.join(__dirname, '../../../reports/calibration-en-latest.json');

describe('English calibration regression (reports/calibration-en-latest.json)', () => {
  it('report exists and meets global floors', () => {
    expect(fs.existsSync(reportPath)).toBe(true);
    const data = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    expect(data.auc).toBeGreaterThanOrEqual(0.95);
    expect(data.macroF1).toBeGreaterThanOrEqual(0.8);
    expect(data.meanScoreHuman).toBeLessThan(25);
    expect(data.meanScoreAi).toBeGreaterThan(45);
  });

  it('marketing genre human mean stays under ceiling', () => {
    const data = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    const m = data.perGenre?.marketing?.meanScoreHuman;
    expect(m).toBeDefined();
    expect(m).toBeLessThanOrEqual(40);
  });

  it('active patterns maintain precision when enough hits', () => {
    const data = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    const { perPattern } = data;
    expect(perPattern).toBeTruthy();
    for (const [pid, stats] of Object.entries(perPattern)) {
      const total = (stats.hitsAi || 0) + (stats.hitsHuman || 0);
      if (total < 5) continue;
      expect(stats.precision, `pattern ${pid}`).toBeGreaterThanOrEqual(0.85);
    }
  });
});
