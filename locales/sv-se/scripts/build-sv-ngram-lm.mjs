#!/usr/bin/env node
/**
 * Smoothed unigram LM from Swedish human corpus → sv-ngram-lm.json (for --with-lm, locale sv).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, '..', '..', '..');
const SV_REF = path.join(REPO_ROOT, 'locales/sv-se/references');
const FIX = path.join(REPO_ROOT, 'locales/sv-se/tests/fixtures');
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
  const base = path.join(SV_REF, 'baseline-corpus-sv.txt');
  if (fs.existsSync(base)) chunks.push(fs.readFileSync(base, 'utf8'));
  chunks.push(...readDirTxt(path.join(FIX, 'sv-corpus/human')));
  const gold = path.join(FIX, 'sv-corpus/human-gold');
  if (fs.existsSync(gold)) chunks.push(...readDirTxt(gold));

  const uni = {};
  let nTok = 0;
  const alpha = 0.5;
  for (const text of chunks) {
    const w = tokenize(text);
    for (const t of w) {
      uni[t] = (uni[t] || 0) + 1;
      nTok++;
    }
  }

  if (nTok === 0) {
    throw new Error('No corpus data found: cannot build language model from empty corpus');
  }

  const nu = Object.keys(uni).length;
  const denom = nTok + alpha * nu;
  if (!Number.isFinite(denom) || denom <= 0) {
    throw new Error(
      `Invalid denominator for LM probabilities (nTok=${nTok}, nu=${nu}, alpha=${alpha})`,
    );
  }
  const unigramP = {};
  for (const [t, c] of Object.entries(uni).sort(([a], [b]) => a.localeCompare(b, 'sv'))) {
    unigramP[t] = (c + alpha) / denom;
  }
  const defaultUni = alpha / denom;

  const out = {
    _meta: { generatedAt: new Date().toISOString(), tokens: nTok, unigramTypes: nu, locale: 'sv' },
    defaultUni,
    unigrams: unigramP,
  };
  const outPath = path.join(SV_REF, 'sv-ngram-lm.json');
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2) + '\n', 'utf8');
  console.log(`Wrote ${path.relative(REPO_ROOT, outPath)}`);
}

main();
