#!/usr/bin/env node
/**
 * log-odds.mjs — Compare AI-labelled vs human-labelled Swedish corpora.
 * Uses log-frequency ratios with add-0.5 smoothing (Monroe-style informative prior lite).
 *
 * Reads: tests/fixtures/sv-corpus/human/, tests/fixtures/sv-corpus/ai/
 * Optional: tests/fixtures/sv-corpus-extended/*.txt (appended to human baseline)
 *
 * Writes:
 *   references/empirical-sv-tiers.md
 *   references/sv-frequencies.json
 *
 * Usage: node scripts/log-odds.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { tokenize } = require('../src/stats.js');
const { functionWords } = require(path.join(path.dirname(fileURLToPath(import.meta.url)), '../src/locales/sv.js'));
const {
  buildStopSet,
  shouldStoreSvFrequencyKey,
} = require(path.join(path.dirname(fileURLToPath(import.meta.url)), '../src/locales/sv-empirical-filter.js'));

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const swStopSet = buildStopSet(functionWords);

function readDirTxt(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.txt'))
    .map((f) => fs.readFileSync(path.join(dir, f), 'utf8'));
}

function ngrams(words, n) {
  const out = [];
  for (let i = 0; i <= words.length - n; i++) {
    out.push(words.slice(i, i + n).join(' '));
  }
  return out;
}

function countTokens(texts, n) {
  const counts = {};
  let total = 0;
  for (const text of texts) {
    const words = tokenize(text);
    const grams = n === 1 ? words : ngrams(words, n);
    for (const g of grams) {
      const k = g.toLowerCase();
      counts[k] = (counts[k] || 0) + 1;
      total += 1;
    }
  }
  return { counts, total };
}

function computeScores(aiCounts, aiTotal, huCounts, huTotal, minCombined = 5) {
  const keys = new Set([...Object.keys(aiCounts), ...Object.keys(huCounts)]);
  const rows = [];
  for (const w of keys) {
    const c1 = aiCounts[w] || 0;
    const c2 = huCounts[w] || 0;
    if (c1 + c2 < minCombined) continue;
    const r1 = (c1 + 0.5) / (aiTotal + 0.5);
    const r2 = (c2 + 0.5) / (huTotal + 0.5);
    const L = Math.log(r1 / r2);
    const se = Math.sqrt(1 / (c1 + 0.5) + 1 / (c2 + 0.5));
    const z = se > 0 ? L / se : 0;
    rows.push({ w, c1, c2, z, r1, r2 });
  }
  rows.sort((a, b) => b.z - a.z);
  return rows;
}

function main() {
  const humanDir = path.join(root, 'tests/fixtures/sv-corpus/human');
  const aiDir = path.join(root, 'tests/fixtures/sv-corpus/ai');
  const extDir = path.join(root, 'tests/fixtures/sv-corpus-extended');

  let humanTexts = readDirTxt(humanDir);
  const aiTexts = readDirTxt(aiDir);
  if (fs.existsSync(extDir)) {
    humanTexts = humanTexts.concat(readDirTxt(extDir));
  }

  if (aiTexts.length === 0 || humanTexts.length === 0) {
    console.error('Missing corpus under tests/fixtures/sv-corpus/ — run node scripts/seed-sv-corpus.mjs');
    process.exit(1);
  }

  const outJson = {};
  const md = [
    '# Empirical Swedish AI-tells (log-odds)',
    '',
    '| rank | ngram | z | AI count | Human count | suggested weight | in sv-frequencies.json |',
    '|------|-------|---|----------|-------------|------------------|-------------------------|',
  ];

  let rank = 0;
  for (const n of [1, 2, 3]) {
    const { counts: ac, total: at } = countTokens(aiTexts, n);
    const { counts: hc, total: ht } = countTokens(humanTexts, n);
    const rows = computeScores(ac, at, hc, ht);
    md.push('', `## ${n}-grams (top by z-score)`, '');
    for (const row of rows.slice(0, n === 1 ? 120 : 60)) {
      rank++;
      const weight = row.z > 2 ? Math.min(2.5, 1 + row.z / 5) : 1;
      const entry = {
        ai: row.c1,
        human: row.c2,
        zscore: Math.round(row.z * 1000) / 1000,
        weight: Math.round(weight * 1000) / 1000,
      };
      const store = shouldStoreSvFrequencyKey(row.w, n, row.z, swStopSet);
      if (store) {
        const prev = outJson[row.w];
        if (!prev || prev.zscore < entry.zscore) {
          outJson[row.w] = entry;
        }
      }
      if (rank <= 200) {
        md.push(
          `| ${rank} | ${row.w.replace(/\|/g, '\\|')} | ${row.z.toFixed(2)} | ${row.c1} | ${row.c2} | ${weight.toFixed(2)} | ${store ? 'yes' : 'no'} |`,
        );
      }
    }
  }

  const mdPath = path.join(root, 'references/empirical-sv-tiers.md');
  const jsonPath = path.join(root, 'references/sv-frequencies.json');
  fs.writeFileSync(mdPath, md.join('\n'), 'utf8');
  fs.writeFileSync(jsonPath, JSON.stringify(outJson, null, 2), 'utf8');
  console.log(`Wrote ${path.relative(root, mdPath)}`);
  console.log(`Wrote ${path.relative(root, jsonPath)} (${Object.keys(outJson).length} keys)`);
}

main();
