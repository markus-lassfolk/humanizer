#!/usr/bin/env node
/**
 * eval-separation.mjs — human-vs-model score separation for a nordic locale.
 * Usage: node eval-separation.mjs <nb|da> <humanDir> <aiDir> [holdoutModel,...]
 * Both dirs hold *.txt files with texts split on a line containing only =====. Human texts are
 * sampled (every 10th) to keep the run short. Reports median/p90 per file (one file = one model).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const { analyze } = require(path.join(root, 'src/analyzer.js'));

const [lang, humanDir, aiDir] = process.argv.slice(2);
const q = (a, p) => a[Math.min(a.length - 1, Math.floor(p * a.length))];
const scoreFile = (f, step = 1) => {
  const texts = fs
    .readFileSync(f, 'utf8')
    .split(/\n=====\n/)
    .map((t) => t.trim())
    .filter(Boolean)
    .filter((_, i) => i % step === 0);
  const s = texts.map((t) => analyze(t, { locale: lang }).score).sort((a, b) => a - b);
  return `${path.basename(f, '.txt').padEnd(24)} n=${String(s.length).padStart(4)} median=${q(s, 0.5)} p90=${q(s, 0.9)}`;
};
const list = (d) =>
  fs
    .readdirSync(d)
    .filter((n) => n.endsWith('.txt'))
    .map((n) => path.join(d, n));
console.log('-- human');
for (const f of list(humanDir)) console.log(scoreFile(f, 10));
console.log('-- models');
for (const f of list(aiDir)) console.log(scoreFile(f));
