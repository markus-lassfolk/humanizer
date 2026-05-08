/**
 * calibration.sv.regression.test.js — Gate on committed Swedish calibration metrics.
 *
 * Regenerate baseline: `npm run corpus:refresh`
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const reportPath = path.join(__dirname, '../reports/calibration-sv-latest.json');

describe('Swedish calibration regression (committed reports/calibration-sv-latest.json)', () => {
  it('report exists and meets ROC-AUC floor', () => {
    expect(fs.existsSync(reportPath)).toBe(true);
    const data = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    expect(data.auc).toBeGreaterThanOrEqual(0.92);
    expect(data.meanScoreHuman).toBeLessThan(25);
    expect(data.meanScoreAi).toBeGreaterThan(45);
  });

  it('active patterns maintain precision on synthetic corpus', () => {
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
