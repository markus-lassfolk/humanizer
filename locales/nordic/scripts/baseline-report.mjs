#!/usr/bin/env node
/**
 * baseline-report.mjs — Score a local human-prose corpus with analyze(..., {locale}).
 *
 * Usage: node baseline-report.mjs <locale> <corpusDir> [--json]
 * Reports median/p90/max score and which patterns/phrases fire on how many texts.
 * Texts starting with a URL line (from fetch-human-baseline.mjs) have it stripped.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const { analyze } = require(path.join(root, 'src/analyzer.js'));

const [locale, dir, flag] = process.argv.slice(2);
const q = (a, p) => a[Math.min(a.length - 1, Math.floor(p * a.length))];
const rows = [];
const fires = new Map();
for (const f of fs.readdirSync(dir).filter((n) => n.endsWith('.txt'))) {
  const text = fs.readFileSync(path.join(dir, f), 'utf8').replace(/^https?:\/\/\S+\n\n/, '');
  const r = analyze(text, { locale });
  rows.push({ f, score: r.score, words: r.wordCount });
  for (const x of r.findings) {
    for (const m of x.matches) {
      const key = `P${x.patternId} ${x.patternName} :: ${m.match.toLowerCase()}`;
      const e = fires.get(key) ?? { n: 0, files: new Set() };
      e.n++;
      e.files.add(f);
      fires.set(key, e);
    }
  }
}
const s = rows.map((r) => r.score).sort((a, b) => a - b);
const out = {
  locale,
  texts: rows.length,
  words: rows.reduce((a, r) => a + r.words, 0),
  median: q(s, 0.5),
  p90: q(s, 0.9),
  max: s[s.length - 1],
  worst: [...rows].sort((a, b) => b.score - a.score).slice(0, 5),
  top: [...fires]
    .sort((a, b) => b[1].files.size - a[1].files.size)
    .slice(0, 40)
    .map(([k, v]) => ({ k, texts: v.files.size, hits: v.n })),
};
console.log(flag === '--json' ? JSON.stringify(out, null, 2) : out);
