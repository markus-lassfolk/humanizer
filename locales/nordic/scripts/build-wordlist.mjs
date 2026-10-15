#!/usr/bin/env node
/**
 * build-wordlist.mjs — Empirical model-output n-grams for a Nordic locale.
 *
 * Usage: node build-wordlist.mjs <lang> <humanDir> <aiDir> <outJson>
 *
 * Keeps unigrams to trigrams that are over-represented in model output, gated like the sv
 * empirical filter (log-odds z, add-0.5 smoothing) plus two document-level guards that matter
 * with small corpora:
 *   - the n-gram occurs in >= MIN_AI_DOCS model texts (kills single-prompt topic words);
 *   - it occurs in <= MAX_HUMAN_DOC_RATE of human texts (a word that 3% of human prose uses
 *     is not an AI tell, whatever its z-score).
 * AI-only evidence is further checked on a human holdout (every 4th human text) before the
 * n-gram is stored.
 *
 * Multi-text files in aiDir are split on a line containing only =====.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const { tokenize } = require(path.join(root, 'src/stats.js'));
const { buildStopSet, shouldStoreSvFrequencyKey } = require(
  path.join(root, 'src/locales/sv/empirical-filter.js'),
);

const [lang, humanDir, aiDir, outJson] = process.argv.slice(2);
const MIN_AI_DOCS = 3;
const MAX_HUMAN_DOC_RATE = 0.005;

const { functionWords } = require(path.join(root, `src/locales/${lang}/index.js`));
const stop = buildStopSet(functionWords);

// A text may start with a <<topic:ID>> line; df then counts distinct topics, not texts, so an
// n-gram that only one prompt topic produces never reaches MIN_AI_DOCS.
const groupOf = new Map();
const readTexts = (dir) =>
  fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.txt'))
    .flatMap((f) =>
      fs
        .readFileSync(path.join(dir, f), 'utf8')
        .replace(/^https?:\/\/\S+\n\n/, '')
        .split(/\n=====\n/)
        .map((t) => t.trim())
        .filter(Boolean)
        .map((t, i) => {
          const m = t.match(/^<<topic:([^>]+)>>\n/);
          const text = m ? t.slice(m[0].length) : t;
          groupOf.set(text, m ? m[1] : `${f}#${i}`);
          return text;
        }),
    );

function grams(text, n) {
  const w = tokenize(text);
  const out = [];
  for (let i = 0; i + n <= w.length; i++) out.push(w.slice(i, i + n).join(' '));
  return out;
}

function count(texts, n) {
  const tf = new Map();
  const df = new Map();
  let total = 0;
  for (const t of texts) {
    const g = grams(t, n);
    total += g.length;
    for (const k of g) tf.set(k, (tf.get(k) || 0) + 1);
    const grp = groupOf.get(t) ?? t;
    for (const k of new Set(g)) {
      if (!df.has(k)) df.set(k, new Set());
      df.get(k).add(grp);
    }
  }
  return { tf, df: new Map([...df].map(([k, v]) => [k, v.size])), total };
}

const human = readTexts(humanDir);
const ai = readTexts(aiDir);
const holdout = human.filter((_, i) => i % 4 === 0);
const out = {};
for (const n of [1, 2, 3]) {
  const H = count(human, n);
  const A = count(ai, n);
  const HO = count(holdout, n);
  for (const [k, c1] of A.tf) {
    const c2 = H.tf.get(k) || 0;
    if (c1 + c2 < 5 || (A.df.get(k) || 0) < MIN_AI_DOCS) continue;
    if ((H.df.get(k) || 0) / human.length > MAX_HUMAN_DOC_RATE) continue;
    if ((HO.df.get(k) || 0) > 0) continue;
    const r1 = (c1 + 0.5) / (A.total + 0.5);
    const r2 = (c2 + 0.5) / (H.total + 0.5);
    const z = Math.log(r1 / r2) / Math.sqrt(1 / (c1 + 0.5) + 1 / (c2 + 0.5));
    if (!shouldStoreSvFrequencyKey(k, n, z, stop)) continue;
    out[k] = {
      ai: c1,
      human: c2,
      aiDocs: A.df.get(k),
      zscore: Math.round(z * 1000) / 1000,
      weight: Math.round(Math.min(2.5, 1 + z / 5) * 1000) / 1000,
    };
  }
}
const sorted = Object.fromEntries(Object.entries(out).sort((a, b) => b[1].zscore - a[1].zscore));
fs.mkdirSync(path.dirname(outJson), { recursive: true });
fs.writeFileSync(outJson, `${JSON.stringify(sorted, null, 2)}\n`);
console.log(
  `${lang}: ${human.length} human / ${ai.length} model texts -> ${Object.keys(sorted).length} n-grams`,
);
