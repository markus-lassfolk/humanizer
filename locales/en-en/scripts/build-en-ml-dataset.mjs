#!/usr/bin/env node
/**
 * Build JSONL of calibration features for English ML (human=0, AI=1).
 * Sources: tests/fixtures/en-corpus human/ai, human-gold, optional locales/en-en/data/wiki-human/*.txt
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, '..', '..', '..');
const require = createRequire(import.meta.url);
const { analyze } = require(path.join(REPO_ROOT, 'src/analyzer.js'));
const { CALIBRATION_FEATURE_NAMES } = require(path.join(REPO_ROOT, 'src/calibration-features.js'));

const CORPUS = path.join(REPO_ROOT, 'tests/fixtures/en-corpus');
const WIKI_HUMAN = path.join(REPO_ROOT, 'locales/en-en/data/wiki-human');
const OUT = path.join(REPO_ROOT, 'locales/en-en/references/ml-dataset-en.jsonl');

const MAX_CHARS = 80000;

function readTxts(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.txt'))
    .map((f) => ({
      path: path.join(dir, f),
      name: f,
      text: fs.readFileSync(path.join(dir, f), 'utf8'),
    }));
}

function main() {
  const humanDirs = [path.join(CORPUS, 'human'), path.join(CORPUS, 'human-gold'), WIKI_HUMAN];
  const human = humanDirs.flatMap(readTxts);
  const ai = readTxts(path.join(CORPUS, 'ai'));
  if (human.length === 0 || ai.length === 0) {
    console.error('Need human and AI .txt sources. Run seed-en-corpus and/or en:wiki:sample');
    process.exit(1);
  }

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  const stream = fs.createWriteStream(OUT, { flags: 'w' });

  let rows = 0;
  const writeRow = (name, text, label) => {
    const t = text.length > MAX_CHARS ? text.slice(0, MAX_CHARS) : text;
    const r = analyze(t, { locale: 'en', skipCalibration: true, withLm: false });
    if (!r.calibrationFeatures) return;
    const obj = {
      file: name,
      label,
      y: label,
      features: Object.fromEntries(CALIBRATION_FEATURE_NAMES.map((k, i) => [k, r.calibrationFeatures[i]])),
      rawScore: r.rawScore,
    };
    stream.write(`${JSON.stringify(obj)}\n`);
    rows++;
  };

  for (const d of human) writeRow(d.name, d.text, 0);
  for (const d of ai) writeRow(d.name, d.text, 1);

  stream.end();
  console.error(`Wrote ${rows} rows to ${OUT}`);
}

main();
