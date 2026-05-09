#!/usr/bin/env node
/**
 * Train logistic regression on ml-dataset-en.jsonl → en-calibrator.json
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, '..', '..', '..');
const require = createRequire(import.meta.url);
const { CALIBRATION_FEATURE_NAMES } = require(path.join(REPO_ROOT, 'src/calibration-features.js'));

const DATA = path.join(REPO_ROOT, 'locales/en-en/references/ml-dataset-en.jsonl');
const OUT = path.join(REPO_ROOT, 'locales/en-en/references/en-calibrator.json');

function sigmoid(z) {
  if (z > 35) return 1;
  if (z < -35) return 0;
  return 1 / (1 + Math.exp(-z));
}

function rocAuc(scores, labels) {
  const nPos = labels.filter((y) => y === 1).length;
  const nNeg = labels.filter((y) => y === 0).length;
  if (nPos === 0 || nNeg === 0) return 0.5;
  let good = 0;
  const total = nPos * nNeg;
  for (let i = 0; i < scores.length; i++) {
    if (labels[i] !== 1) continue;
    for (let j = 0; j < scores.length; j++) {
      if (labels[j] !== 0) continue;
      if (scores[i] > scores[j]) good += 1;
      else if (scores[i] === scores[j]) good += 0.5;
    }
  }
  return good / total;
}

function main() {
  if (!fs.existsSync(DATA)) {
    console.error(`Missing ${DATA}. Run: npm run en:ml:dataset`);
    process.exit(1);
  }

  const lines = fs.readFileSync(DATA, 'utf8').trim().split('\n').filter(Boolean);
  const rows = lines.map((ln) => JSON.parse(ln));
  const n = rows.length;
  const d = CALIBRATION_FEATURE_NAMES.length;

  const X = rows.map((r) => CALIBRATION_FEATURE_NAMES.map((k) => r.features[k] ?? 0));
  const y = rows.map((r) => r.y);

  const mean = new Array(d).fill(0);
  for (let j = 0; j < d; j++) {
    for (let i = 0; i < n; i++) mean[j] += X[i][j];
    mean[j] /= n;
  }
  const std = new Array(d).fill(0);
  for (let j = 0; j < d; j++) {
    let v = 0;
    for (let i = 0; i < n; i++) v += (X[i][j] - mean[j]) ** 2;
    std[j] = Math.sqrt(v / n) || 1;
  }

  const Xs = X.map((row) => row.map((val, j) => (val - mean[j]) / std[j]));

  let w = new Array(d).fill(0);
  let b = 0;
  const lr = 0.35;
  const epochs = 8000;
  const lambda = 1e-4;

  for (let e = 0; e < epochs; e++) {
    const gw = new Array(d).fill(0);
    let gb = 0;
    for (let i = 0; i < n; i++) {
      let z = b;
      for (let j = 0; j < d; j++) z += w[j] * Xs[i][j];
      const p = sigmoid(z);
      const err = p - y[i];
      gb += err;
      for (let j = 0; j < d; j++) gw[j] += err * Xs[i][j];
    }
    gb /= n;
    for (let j = 0; j < d; j++) {
      gw[j] = gw[j] / n + lambda * w[j];
      w[j] -= lr * gw[j];
    }
    b -= lr * gb;
  }

  const probs = Xs.map((row) => {
    let z = b;
    for (let j = 0; j < d; j++) z += w[j] * row[j];
    return sigmoid(z);
  });
  const predScores = probs.map((p) => Math.round(100 * p));

  const auc = rocAuc(predScores, y);
  const rawAuc = rocAuc(
    rows.map((r) => r.rawScore),
    y,
  );

  const artifact = {
    version: 1,
    model: 'logistic_regression',
    featureNames: [...CALIBRATION_FEATURE_NAMES],
    mean,
    std,
    weights: w,
    bias: b,
    trainedAt: new Date().toISOString(),
    trainingRows: n,
    metrics: {
      aucProbRank: auc,
      aucRawHeuristic: rawAuc,
    },
  };

  fs.writeFileSync(OUT, JSON.stringify(artifact, null, 2), 'utf8');
  console.error(`Wrote ${OUT} (n=${n}, aucCalibrated≈${auc.toFixed(3)}, aucRaw≈${rawAuc.toFixed(3)})`);
  console.error('Enable at runtime: HUMANIZER_ML_CALIBRATION=1 (validate on held-out human text first).');
}

main();
