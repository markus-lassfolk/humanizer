/**
 * english.test.js — Black-box English locale scoring on stable fixtures.
 */

import { describe, it, expect } from 'vitest';
import { score } from '../../../src/analyzer.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..', '..', '..');
const fixtures = path.join(root, 'tests', 'fixtures');

function load(name) {
  return fs.readFileSync(path.join(fixtures, name), 'utf8');
}

describe('English locale scoring (stable fixtures)', () => {
  it('known human samples score below marketing ceiling (40)', () => {
    expect(score(load('en-human-calibration.txt'))).toBeLessThan(25);
    expect(score(load('en-marketing-human.txt'))).toBeLessThan(40);
  });

  it('known AI-flavored sample scores high', () => {
    expect(score(load('en-ai-calibration.txt'))).toBeGreaterThanOrEqual(60);
  });

  it('AI sample scores well above human sample', () => {
    const d = score(load('en-ai-calibration.txt')) - score(load('en-human-calibration.txt'));
    expect(d).toBeGreaterThan(35);
  });
});
