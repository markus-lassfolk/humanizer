#!/usr/bin/env node
/**
 * build-sv-frequency-baseline.mjs — Human-proxy unigram ranks for Swedish tier validation.
 *
 * Aggregates (in order):
 *   locales/sv-se/references/baseline-corpus-sv.txt
 *   locales/sv-se/tests/fixtures/sv-corpus/human/*.txt
 *   locales/sv-se/tests/fixtures/sv-corpus/human-gold/*.txt (optional)
 *   locales/sv-se/tests/fixtures/sv-corpus-extended/*.txt — only if SV_FREQ_INCLUDE_EXTENDED=1 (local dev)
 *
 * Writes locales/sv-se/references/sv-human-frequency-ranks.json
 *
 * Usage: node locales/sv-se/scripts/build-sv-frequency-baseline.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, '..', '..', '..');
const SV_SE = path.join(REPO_ROOT, 'locales/sv-se');
const SV_REF = path.join(SV_SE, 'references');
const SV_FIX = path.join(SV_SE, 'tests/fixtures');

const require = createRequire(import.meta.url);
const { tokenize } = require(path.join(REPO_ROOT, 'src/stats.js'));

function readDirTxt(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.txt'))
    .map((f) => fs.readFileSync(path.join(dir, f), 'utf8'));
}

function main() {
  const chunks = [];
  const baseFile = path.join(SV_REF, 'baseline-corpus-sv.txt');
  if (!fs.existsSync(baseFile)) {
    console.error(`Missing ${path.relative(REPO_ROOT, baseFile)}`);
    process.exit(1);
  }
  chunks.push(fs.readFileSync(baseFile, 'utf8'));
  chunks.push(...readDirTxt(path.join(SV_FIX, 'sv-corpus/human')));
  chunks.push(...readDirTxt(path.join(SV_FIX, 'sv-corpus/human-gold')));
  if (process.env.SV_FREQ_INCLUDE_EXTENDED === '1') {
    chunks.push(...readDirTxt(path.join(SV_FIX, 'sv-corpus-extended')));
  }

  const counts = {};
  let total = 0;
  for (const text of chunks) {
    for (const w of tokenize(text)) {
      const k = w.toLowerCase();
      if (!k) continue;
      counts[k] = (counts[k] || 0) + 1;
      total += 1;
    }
  }

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const out = {};
  let rank = 0;
  for (const [word, count] of sorted) {
    rank += 1;
    out[word] = {
      rank,
      count,
      perMillion: total > 0 ? Math.round((count / total) * 1e6) : 0,
    };
  }

  const meta = {
    generatedAt: new Date().toISOString(),
    totalTokens: total,
    uniqueTypes: sorted.length,
    sources: [
      'locales/sv-se/references/baseline-corpus-sv.txt',
      'locales/sv-se/tests/fixtures/sv-corpus/human/',
      'locales/sv-se/tests/fixtures/sv-corpus/human-gold/ (if present)',
      'locales/sv-se/tests/fixtures/sv-corpus-extended/ (if present)',
    ],
  };

  const jsonPath = path.join(SV_REF, 'sv-human-frequency-ranks.json');
  fs.writeFileSync(jsonPath, JSON.stringify({ _meta: meta, ranks: out }, null, 2), 'utf8');
  console.log(
    `Wrote ${path.relative(REPO_ROOT, jsonPath)} (${meta.uniqueTypes} types, ${meta.totalTokens} tokens)`,
  );
}

main();
