#!/usr/bin/env node
/**
 * English log-odds n-grams: tests/fixtures/en-corpus → en-frequencies.json
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, '..', '..', '..');
const EN_SE = path.join(REPO_ROOT, 'locales/en-en');
const EN_REF = path.join(EN_SE, 'references');
const EN_FIX = path.join(REPO_ROOT, 'tests/fixtures/en-corpus');

const require = createRequire(import.meta.url);
const { tokenize } = require(path.join(REPO_ROOT, 'src/stats.js'));
const { functionWords } = require(path.join(REPO_ROOT, 'src/locales/en/index.js'));
const { buildStopSet, shouldStoreEnFrequencyKey } = require(
  path.join(REPO_ROOT, 'src/locales/en-empirical-filter.js'),
);
const enStopSet = buildStopSet(functionWords);

function shouldStoreFallback(key, n, z, stopSet) {
  if (!Number.isFinite(z) || z < 2) return false;
  if (n === 1 && stopSet.has(key)) return false;
  return true;
}

function escapeMarkdownCell(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

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
  const humanDir = path.join(EN_FIX, 'human');
  const humanGoldDir = path.join(EN_FIX, 'human-gold');
  const aiDir = path.join(EN_FIX, 'ai');
  const aiLlmDir = path.join(EN_FIX, 'ai-llm');

  let humanTexts = readDirTxt(humanDir);
  if (fs.existsSync(humanGoldDir)) {
    humanTexts = humanTexts.concat(readDirTxt(humanGoldDir));
  }
  let aiTexts = readDirTxt(aiDir);
  if (fs.existsSync(aiLlmDir)) {
    const extra = readDirTxt(aiLlmDir);
    aiTexts = aiTexts.concat(extra);
    if (extra.length) console.error(`log-odds-en: merged ${extra.length} files from ai-llm/`);
  }

  if (aiTexts.length === 0 || humanTexts.length === 0) {
    console.error('Missing en-corpus — run: node locales/en-en/scripts/seed-en-corpus.mjs');
    process.exit(1);
  }

  const outJson = {};
  const md = [
    '# Empirical English AI-tells (log-odds)',
    '',
    '| rank | ngram | z | AI count | Human count | suggested weight | in en-frequencies.json |',
    '|------|-------|---|----------|-------------|------------------|-------------------------|',
  ];

  let rank = 0;
  for (const n of [1, 2, 3, 4]) {
    const minCombined = n >= 4 ? 12 : 5;
    const { counts: ac, total: at } = countTokens(aiTexts, n);
    const { counts: hc, total: ht } = countTokens(humanTexts, n);
    const rows = computeScores(ac, at, hc, ht, minCombined);
    const topN = n === 1 ? 120 : n === 4 ? 40 : 60;
    md.push('', `## ${n}-grams (top by z-score)`, '');
    for (const row of rows.slice(0, topN)) {
      rank++;
      const weight = row.z > 2 ? Math.min(2.5, 1 + row.z / 5) : 1;
      const entry = {
        ai: row.c1,
        human: row.c2,
        zscore: Math.round(row.z * 1000) / 1000,
        weight: Math.round(weight * 1000) / 1000,
      };
      const store =
        shouldStoreEnFrequencyKey(row.w, n, row.z, enStopSet) ||
        shouldStoreFallback(row.w, n, row.z, enStopSet);
      if (store) {
        const prev = outJson[row.w];
        if (!prev || prev.zscore < entry.zscore) {
          outJson[row.w] = entry;
        }
      }
      if (rank <= 200) {
        md.push(
          `| ${rank} | ${escapeMarkdownCell(row.w)} | ${row.z.toFixed(2)} | ${row.c1} | ${row.c2} | ${weight.toFixed(2)} | ${store ? 'yes' : 'no'} |`,
        );
      }
    }
  }

  const mdPath = path.join(EN_REF, 'empirical-en-tiers.md');
  const jsonPath = path.join(EN_REF, 'en-frequencies.json');
  fs.writeFileSync(mdPath, md.join('\n'), 'utf8');
  fs.writeFileSync(jsonPath, JSON.stringify(outJson, null, 2), 'utf8');
  console.log(`Wrote ${path.relative(REPO_ROOT, mdPath)}`);
  console.log(`Wrote ${path.relative(REPO_ROOT, jsonPath)} (${Object.keys(outJson).length} keys)`);
}

main();
