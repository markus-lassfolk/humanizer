#!/usr/bin/env node
/**
 * English corpus calibration → reports/calibration-en-latest.json
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, '..', '..', '..');
const EN_FIX = path.join(REPO_ROOT, 'tests/fixtures/en-corpus');

const require = createRequire(import.meta.url);
const { analyze } = require(path.join(REPO_ROOT, 'src/analyzer.js'));

function readDir(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.txt'))
    .map((f) => ({ path: path.join(dir, f), name: f, text: fs.readFileSync(path.join(dir, f), 'utf8') }));
}

function wordCount(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function genreFromFilename(name) {
  const base = name.replace(/\.txt$/i, '');
  const parts = base.split('-');
  if (parts[0] !== 'human' && parts[0] !== 'ai') return 'unknown';
  return parts[1] || 'unknown';
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

function macroF1AtThreshold(scores, labels, t) {
  let tp = 0,
    fp = 0,
    fn = 0,
    tn = 0;
  for (let i = 0; i < scores.length; i++) {
    const pred = scores[i] >= t ? 1 : 0;
    const y = labels[i];
    if (pred === 1 && y === 1) tp++;
    else if (pred === 1 && y === 0) fp++;
    else if (pred === 0 && y === 1) fn++;
    else tn++;
  }
  const prec = tp + fp > 0 ? tp / (tp + fp) : 0;
  const rec = tp + fn > 0 ? tp / (tp + fn) : 0;
  const f1 = prec + rec > 0 ? (2 * prec * rec) / (prec + rec) : 0;
  const precNeg = tn + fn > 0 ? tn / (tn + fn) : 0;
  const recNeg = tn + fp > 0 ? tn / (tn + fp) : 0;
  const f1Neg = precNeg + recNeg > 0 ? (2 * precNeg * recNeg) / (precNeg + recNeg) : 0;
  return (f1 + f1Neg) / 2;
}

function main() {
  const humanDir = path.join(EN_FIX, 'human');
  const humanGoldDir = path.join(EN_FIX, 'human-gold');
  const aiDir = path.join(EN_FIX, 'ai');
  const reportsDir = path.join(REPO_ROOT, 'reports');
  fs.mkdirSync(reportsDir, { recursive: true });

  const humanDocs = [...readDir(humanDir), ...readDir(humanGoldDir)];
  const aiDocs = readDir(aiDir);
  if (humanDocs.length === 0 || aiDocs.length === 0) {
    console.error('Missing en-corpus. Run: node locales/en-en/scripts/seed-en-corpus.mjs');
    process.exit(1);
  }

  const docs = [
    ...humanDocs.map((d) => ({ ...d, label: 0 })),
    ...aiDocs.map((d) => ({ ...d, label: 1 })),
  ];

  const scores = [];
  const labels = [];
  const patternHitsAi = {};
  const patternHitsHuman = {};
  const patternHumanWords = {};
  const fpExamples = {};
  const genreBuckets = {};

  let totalHumanWords = 0;
  for (const d of humanDocs) totalHumanWords += wordCount(d.text);

  for (const d of docs) {
    const verbose = d.label === 0;
    const result = analyze(d.text, { locale: 'en', verbose });
    scores.push(result.score);
    labels.push(d.label);

    const g = genreFromFilename(d.name);
    if (!genreBuckets[g]) genreBuckets[g] = { humanScores: [], aiScores: [] };
    if (d.label === 0) genreBuckets[g].humanScores.push(result.score);
    else genreBuckets[g].aiScores.push(result.score);

    for (const f of result.findings) {
      const pid = f.patternId;
      if (d.label === 1) {
        patternHitsAi[pid] = (patternHitsAi[pid] || 0) + f.matchCount;
      } else {
        patternHitsHuman[pid] = (patternHitsHuman[pid] || 0) + f.matchCount;
        patternHumanWords[pid] = (patternHumanWords[pid] || 0) + wordCount(d.text);
        if (!fpExamples[pid]) fpExamples[pid] = [];
        for (const m of f.matches.slice(0, 3)) {
          if (fpExamples[pid].length < 10) {
            fpExamples[pid].push({
              file: d.name,
              snippet: typeof m.match === 'string' ? m.match.slice(0, 80) : '',
            });
          }
        }
      }
    }
  }

  const aiAnalyses = aiDocs.map((d) => analyze(d.text, { locale: 'en' }));

  const auc = rocAuc(scores, labels);

  let bestJ = -1;
  let bestT = 50;
  for (let t = 0; t <= 100; t++) {
    let tp = 0,
      fp = 0,
      fn = 0,
      tn = 0;
    for (let i = 0; i < scores.length; i++) {
      const pred = scores[i] >= t ? 1 : 0;
      const y = labels[i];
      if (pred === 1 && y === 1) tp++;
      else if (pred === 1 && y === 0) fp++;
      else if (pred === 0 && y === 1) fn++;
      else tn++;
    }
    const sens = tp + fn > 0 ? tp / (tp + fn) : 0;
    const spec = tn + fp > 0 ? tn / (tn + fp) : 0;
    const j = sens + spec - 1;
    if (j > bestJ) {
      bestJ = j;
      bestT = t;
    }
  }

  const macroF1 = macroF1AtThreshold(scores, labels, bestT);

  const allPatternIds = new Set([
    ...Object.keys(patternHitsAi).map(Number),
    ...Object.keys(patternHitsHuman).map(Number),
  ]);

  const perPattern = {};
  for (const pid of allPatternIds) {
    const ai = patternHitsAi[pid] || 0;
    const hu = patternHitsHuman[pid] || 0;
    const total = ai + hu;
    const precision = total > 0 ? ai / total : 1;
    const fpr1k = totalHumanWords > 0 ? ((hu || 0) / totalHumanWords) * 1000 : 0;
    const aiDocHit = aiAnalyses.filter((r) => r.findings.some((x) => x.patternId === pid)).length;
    const recallDoc = aiDocs.length > 0 ? aiDocHit / aiDocs.length : 0;
    perPattern[pid] = {
      precision: Math.round(precision * 1000) / 1000,
      recallDocs: Math.round(recallDoc * 1000) / 1000,
      fprPer1kHumanWords: Math.round(fpr1k * 1000) / 1000,
      hitsAi: Math.round(ai * 1000) / 1000,
      hitsHuman: Math.round(hu * 1000) / 1000,
    };
  }

  const mean = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
  const humanScores = scores.filter((_, i) => labels[i] === 0);
  const aiScores = scores.filter((_, i) => labels[i] === 1);

  const perGenre = {};
  for (const [g, b] of Object.entries(genreBuckets)) {
    perGenre[g] = {
      meanScoreHuman: Math.round(mean(b.humanScores) * 100) / 100,
      meanScoreAi: Math.round(mean(b.aiScores) * 100) / 100,
      maxScoreHuman: b.humanScores.length ? Math.round(Math.max(...b.humanScores) * 100) / 100 : 0,
      countHuman: b.humanScores.length,
      countAi: b.aiScores.length,
    };
  }

  const date = new Date().toISOString().slice(0, 10);
  const jsonOut = {
    generatedAt: new Date().toISOString(),
    corpus: { humanDocs: humanDocs.length, aiDocs: aiDocs.length },
    auc: Math.round(auc * 1000) / 1000,
    macroF1: Math.round(macroF1 * 1000) / 1000,
    optimalThresholdYouden: bestT,
    yudenJ: Math.round(bestJ * 1000) / 1000,
    meanScoreHuman: Math.round(mean(humanScores) * 100) / 100,
    meanScoreAi: Math.round(mean(aiScores) * 100) / 100,
    perGenre,
    perPattern,
  };

  const md = [
    `# English calibration report (${date})`,
    '',
    `| Metric | Value |`,
    `|--------|-------|`,
    `| ROC-AUC | ${jsonOut.auc} |`,
    `| Macro-F1 (at Youden threshold) | ${jsonOut.macroF1} |`,
    `| Optimal threshold (Youden J) | ${bestT} |`,
    `| Mean score (human) | ${jsonOut.meanScoreHuman} |`,
    `| Mean score (AI) | ${jsonOut.meanScoreAi} |`,
    '',
    '## Per genre',
    '',
    '| Genre | Mean human | Max human | Mean AI | #human | #ai |',
    '|-------|------------|-----------|---------|--------|-----|',
  ];

  for (const g of Object.keys(perGenre).sort()) {
    const p = perGenre[g];
    md.push(
      `| ${g} | ${p.meanScoreHuman} | ${p.maxScoreHuman} | ${p.meanScoreAi} | ${p.countHuman} | ${p.countAi} |`,
    );
  }

  md.push(
    '',
    '## Per-pattern',
    '',
    '| Pattern ID | Precision | Recall (AI docs) | FP / 1k human words |',
    '|------------|-----------|------------------|---------------------|',
  );

  const sortedPids = [...allPatternIds].sort((a, b) => a - b);
  for (const pid of sortedPids) {
    const p = perPattern[pid];
    md.push(`| ${pid} | ${p.precision} | ${p.recallDocs} | ${p.fprPer1kHumanWords} |`);
  }

  fs.writeFileSync(path.join(reportsDir, `calibration-en-${date}.md`), md.join('\n'), 'utf8');
  fs.writeFileSync(path.join(reportsDir, 'calibration-en-latest.json'), JSON.stringify(jsonOut, null, 2), 'utf8');
  console.log(`Wrote reports/calibration-en-${date}.md`);
  console.log(`Wrote reports/calibration-en-latest.json (AUC=${jsonOut.auc}, macroF1=${jsonOut.macroF1})`);
}

main();
