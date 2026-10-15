#!/usr/bin/env node
/**
 * build-ranks.mjs — top-N unigram frequency ranks from a pre-2022 human corpus.
 * Usage: node build-ranks.mjs <nb|da> <humanDir> <outJson> [topN=10000]
 * Texts: *.txt split on a line containing only =====. Corpus stays out of the repo; only ranks are kept.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const { tokenize } = require(path.join(root, 'src/stats.js'));

const [lang, dir, out, topArg] = process.argv.slice(2);
const topN = parseInt(topArg || '10000', 10);
const tf = new Map();
let total = 0;
for (const f of fs.readdirSync(dir).filter((n) => n.endsWith('.txt'))) {
  for (const w of tokenize(fs.readFileSync(path.join(dir, f), 'utf8'))) {
    tf.set(w, (tf.get(w) || 0) + 1);
    total++;
  }
}
const ranks = {};
[...tf.entries()]
  .sort((a, b) => b[1] - a[1])
  .slice(0, topN)
  .forEach(([w, c], i) => (ranks[w] = { rank: i + 1, count: c }));
fs.writeFileSync(
  out,
  JSON.stringify({ _meta: { lang, totalTokens: total, uniqueTypes: tf.size, topN }, ranks }),
);
console.log(`${lang}: ${total} tokens, ${tf.size} types, top ${topN} -> ${out}`);
