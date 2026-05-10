#!/usr/bin/env node
/**
 * Human-proxy unigram ranks for English tier validation.
 * Writes locales/en-en/references/en-human-frequency-ranks.json
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

function readDirTxt(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.txt'))
    .map((f) => fs.readFileSync(path.join(dir, f), 'utf8'));
}

function main() {
  const chunks = [];
  const baseFile = path.join(EN_REF, 'baseline-corpus-en.txt');
  if (!fs.existsSync(baseFile)) {
    console.error(`Missing ${path.relative(REPO_ROOT, baseFile)} — run: node locales/en-en/scripts/materialize-baseline-corpus-en.mjs`);
    process.exit(1);
  }
  chunks.push(fs.readFileSync(baseFile, 'utf8'));
  chunks.push(...readDirTxt(path.join(EN_FIX, 'human')));
  chunks.push(...readDirTxt(path.join(EN_FIX, 'human-gold')));

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
      'locales/en-en/references/baseline-corpus-en.txt',
      'tests/fixtures/en-corpus/human/',
      'tests/fixtures/en-corpus/human-gold/',
    ],
  };

  const jsonPath = path.join(EN_REF, 'en-human-frequency-ranks.json');
  fs.writeFileSync(jsonPath, JSON.stringify({ _meta: meta, ranks: out }, null, 2), 'utf8');
  console.log(
    `Wrote ${path.relative(REPO_ROOT, jsonPath)} (${meta.uniqueTypes} types, ${meta.totalTokens} tokens)`,
  );
}

main();
