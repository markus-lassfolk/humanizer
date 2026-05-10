#!/usr/bin/env node
/**
 * Smoothed unigram LM from human English corpus → en-ngram-lm.json (for --with-lm).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, '..', '..', '..');
const EN_REF = path.join(REPO_ROOT, 'locales/en-en/references');
const FIX = path.join(REPO_ROOT, 'tests/fixtures/en-corpus');
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
  const base = path.join(EN_REF, 'baseline-corpus-en.txt');
  if (fs.existsSync(base)) chunks.push(fs.readFileSync(base, 'utf8'));
  chunks.push(...readDirTxt(path.join(FIX, 'human')));
  chunks.push(...readDirTxt(path.join(FIX, 'human-gold')));

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
    console.error(
      'No EN corpus tokens found. Generate baseline/corpus first (materialize-baseline-corpus-en + corpus seeds).',
    );
    process.exit(1);
  }
  const nu = Object.keys(uni).length;
  const denom = nTok + alpha * nu;
  if (!Number.isFinite(denom) || denom <= 0) {
    console.error(`Invalid EN LM denominator (nTok=${nTok}, nu=${nu}, alpha=${alpha}).`);
    process.exit(1);
  }
  const unigramP = {};
  for (const [t, c] of Object.entries(uni)) {
    unigramP[t] = (c + alpha) / denom;
  }
  const defaultUni = alpha / denom;

  const out = {
    _meta: { generatedAt: new Date().toISOString(), tokens: nTok, unigramTypes: nu },
    defaultUni,
    unigrams: unigramP,
  };
  const outPath = path.join(EN_REF, 'en-ngram-lm.json');
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2) + '\n', 'utf8');
  console.log(`Wrote ${path.relative(REPO_ROOT, outPath)}`);
}

main();
