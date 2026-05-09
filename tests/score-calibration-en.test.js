/**
 * English ML calibrator is opt-in via HUMANIZER_ML_CALIBRATION=1.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { analyze } from '../src/analyzer.js';

const require = createRequire(import.meta.url);
const { invalidateEnCalibratorCache } = require('../src/score-calibration-en.js');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const origEnv = process.env.HUMANIZER_ML_CALIBRATION;

afterEach(() => {
  if (origEnv === undefined) delete process.env.HUMANIZER_ML_CALIBRATION;
  else process.env.HUMANIZER_ML_CALIBRATION = origEnv;
  invalidateEnCalibratorCache();
});

describe('English ML calibrator gate', () => {
  it('does not change score when HUMANIZER_ML_CALIBRATION is unset', () => {
    delete process.env.HUMANIZER_ML_CALIBRATION;
    invalidateEnCalibratorCache();
    const text = fs.readFileSync(path.join(__dirname, 'fixtures', 'human-sample-1.txt'), 'utf8');
    const r = analyze(text, { locale: 'en' });
    expect(r.rawScore).toBe(r.score);
  });
});
