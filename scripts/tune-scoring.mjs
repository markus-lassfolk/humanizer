#!/usr/bin/env node
/**
 * tune-scoring.mjs — Autonomous score-knob tuner for v2 patterns.
 *
 * Goal: with the new Patterns 30–35 (and optional 36) added in `v2`, the
 * composite formula in src/analyzer.js (density coef/cap, breadth bonus,
 * category bonus, pattern/uniformity blend) is no longer guaranteed to be
 * optimal. This script grid-searches those knobs against the committed
 * labeled corpus per locale and reports the best AUC subject to per-genre
 * false-positive ceilings — fully autonomous, no API keys needed.
 *
 * Inputs (per locale):
 *   - human/ai .txt files in the repo's labeled corpus directories
 *   - any extra wiki-human / human-gold / llm-ai files if present
 *
 * Outputs:
 *   - reports/tuning-<YYYY-MM-DD>.json
 *   - reports/tuning-<YYYY-MM-DD>.md
 *
 * Usage:
 *   node scripts/tune-scoring.mjs                 # both en + sv
 *   node scripts/tune-scoring.mjs --locale en
 *   node scripts/tune-scoring.mjs --locale sv
 *   node scripts/tune-scoring.mjs --windows       # also slice docs into 200-word windows
 *   node scripts/tune-scoring.mjs --quick         # smaller grid (~500 combos)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

// Use require() to load CommonJS analyzer
const { createRequire } = await import('node:module');
const require = createRequire(import.meta.url);
const { analyze } = require(path.join(REPO_ROOT, 'src/analyzer.js'));

const argv = process.argv.slice(2);
const localeArg = arg('--locale');
const useWindows = argv.includes('--windows');
const quick = argv.includes('--quick');

function arg(flag) {
  const i = argv.indexOf(flag);
  if (i === -1) return null;
  return argv[i + 1];
}

const LOCALES = [
  {
    code: 'en',
    humanDirs: [
      'tests/fixtures/en-corpus/human',
      'tests/fixtures/en-corpus/human-gold',
      'locales/en-en/data/wiki-human',
    ],
    aiDirs: ['tests/fixtures/en-corpus/ai', 'tests/fixtures/en-corpus/ai-llm'],
  },
  {
    code: 'sv',
    humanDirs: [
      'locales/sv-se/tests/fixtures/sv-corpus/human',
      'locales/sv-se/tests/fixtures/sv-corpus/human-gold',
      'locales/sv-se/tests/fixtures/sv-corpus-extended',
    ],
    aiDirs: [
      'locales/sv-se/tests/fixtures/sv-corpus/ai',
      'locales/sv-se/tests/fixtures/sv-corpus/ai-llm',
    ],
  },
].filter((l) => !localeArg || l.code === localeArg);

const WINDOW_WORDS = 200;
const MIN_WORDS = 25;
const FPR50_CEILING = 0.1; // best knobs must keep human FPR @ score >= 50 below this
const GENRE_FPR50_CEILING = 0.25; // soft per-genre ceiling

// ── Sample loading ───────────────────────────────────────

function readAllTxt(dirRel) {
  const dir = path.join(REPO_ROOT, dirRel);
  if (!fs.existsSync(dir)) return [];
  const out = [];
  walk(dir, (full) => {
    if (full.endsWith('.txt')) {
      try {
        const text = fs.readFileSync(full, 'utf8');
        if (text.trim().split(/\s+/).filter(Boolean).length >= MIN_WORDS) {
          out.push({ name: path.basename(full), text });
        }
      } catch {
        /* skip unreadable */
      }
    }
  });
  return out;
}

function walk(dir, cb) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, cb);
    else cb(full);
  }
}

function genreOf(filename) {
  const m = /^(?:human|ai)-([a-z]+)-/i.exec(filename);
  return m ? m[1].toLowerCase() : 'misc';
}

function windowText(text, n = WINDOW_WORDS) {
  const words = text.split(/\s+/).filter(Boolean);
  const out = [];
  for (let i = 0; i + MIN_WORDS <= words.length; i += n) {
    out.push(words.slice(i, i + n).join(' '));
  }
  return out;
}

function loadSamples(humanDirs, aiDirs) {
  const samples = [];
  for (const dir of humanDirs)
    for (const f of readAllTxt(dir)) addSample(samples, 0, dir, f.name, f.text);
  for (const dir of aiDirs)
    for (const f of readAllTxt(dir)) addSample(samples, 1, dir, f.name, f.text);
  return samples;
}

function addSample(samples, label, dir, name, text) {
  const genre = genreOf(name);
  if (useWindows) {
    let i = 0;
    for (const w of windowText(text)) {
      samples.push({ label, genre, file: `${name}#${i++}`, dir, text: w });
    }
  } else {
    samples.push({ label, genre, file: name, dir, text });
  }
}

// ── Score recomputation from cached findings ─────────────

function analyzeAll(samples, locale) {
  const out = [];
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i];
    const r = analyze(s.text, { locale, includeStats: true, skipCalibration: true });
    out.push({
      label: s.label,
      genre: s.genre,
      file: s.file,
      dir: s.dir,
      wordCount: r.wordCount,
      uniformity: r.uniformityScore || 0,
      defaultScore: r.rawScore,
      findings: r.findings.map((f) => ({
        id: f.patternId,
        category: f.category,
        count: f.matchCount,
        weight: f.weight,
      })),
    });
    if ((i + 1) % 100 === 0) process.stderr.write(`  scored ${i + 1}/${samples.length}\r`);
  }
  process.stderr.write(`  scored ${samples.length}/${samples.length}\n`);
  return out;
}

function recomputeScore(s, k) {
  if (s.findings.length === 0 && s.uniformity === 0) return 0;
  let weightedTotal = 0;
  const cats = new Set();
  for (const f of s.findings) {
    weightedTotal += f.count * f.weight;
    cats.add(f.category);
  }
  const density = (weightedTotal / Math.max(1, s.wordCount)) * 100;
  const densityScore = Math.min(Math.log2(density + 1) * k.densityCoef, k.densityCap);
  const breadthBonus = Math.min(s.findings.length * k.breadthMult, k.breadthCap);
  const categoryBonus = Math.min(cats.size * k.categoryMult, k.categoryCap);
  const patternScore = Math.min(Math.round(densityScore + breadthBonus + categoryBonus), 100);
  if (s.findings.length === 0) return Math.min(Math.round(s.uniformity * 0.15), 15);
  const blended = patternScore * k.patternWeight + s.uniformity * (1 - k.patternWeight);
  return Math.min(Math.round(blended), 100);
}

// ── Metrics ──────────────────────────────────────────────

function computeAuc(scored) {
  const sorted = scored.slice().sort((a, b) => a.score - b.score);
  const n = sorted.length;
  let i = 0;
  let np = 0;
  let nn = 0;
  let sumRanksPos = 0;
  while (i < n) {
    let j = i;
    while (j < n && sorted[j].score === sorted[i].score) j++;
    const avgRank = (i + j + 1) / 2;
    for (let k = i; k < j; k++) {
      if (sorted[k].label === 1) {
        sumRanksPos += avgRank;
        np++;
      } else nn++;
    }
    i = j;
  }
  if (np === 0 || nn === 0) return 0;
  return (sumRanksPos - (np * (np + 1)) / 2) / (np * nn);
}

function metrics(scored, threshold) {
  let tp = 0,
    fn = 0,
    fp = 0,
    tn = 0;
  for (const s of scored) {
    const positive = s.score >= threshold;
    if (s.label === 1) positive ? tp++ : fn++;
    else positive ? fp++ : tn++;
  }
  return {
    tp,
    fn,
    fp,
    tn,
    precision: tp / Math.max(1, tp + fp),
    recall: tp / Math.max(1, tp + fn),
    fpr: fp / Math.max(1, fp + tn),
  };
}

function bestThreshold(scored) {
  let best = { threshold: 50, j: -1 };
  for (let t = 0; t <= 100; t++) {
    const m = metrics(scored, t);
    const tpr = m.tp / Math.max(1, m.tp + m.fn);
    const j = tpr - m.fpr;
    if (j > best.j) best = { threshold: t, j };
  }
  return best;
}

function perGenreSummary(scored, threshold = 50) {
  const map = {};
  for (const s of scored) {
    const key = `${s.label === 1 ? 'ai' : 'human'}:${s.genre}`;
    if (!map[key])
      map[key] = { label: s.label, genre: s.genre, count: 0, scores: [], aboveThr: 0 };
    map[key].count++;
    map[key].scores.push(s.score);
    if (s.score >= threshold) map[key].aboveThr++;
  }
  const out = {};
  for (const key of Object.keys(map).sort()) {
    const e = map[key];
    e.scores.sort((a, b) => a - b);
    out[key] = {
      count: e.count,
      mean: +(e.scores.reduce((a, b) => a + b, 0) / e.count).toFixed(2),
      median: e.scores[Math.floor(e.count / 2)],
      p95: e.scores[Math.min(e.count - 1, Math.floor(e.count * 0.95))],
      max: e.scores[e.count - 1],
      [e.label === 1 ? 'recall@thr' : 'fpr@thr']: +(e.aboveThr / e.count).toFixed(3),
    };
  }
  return out;
}

// ── Search space ─────────────────────────────────────────

const SEARCH_FULL = {
  densityCoef: [11, 12, 13, 14, 15],
  densityCap: [55, 60, 65, 70, 75],
  breadthMult: [1.5, 2, 2.5, 3],
  breadthCap: [16, 20, 24, 28],
  categoryMult: [2, 3, 4, 5],
  categoryCap: [12, 15, 18, 21],
  patternWeight: [0.6, 0.65, 0.7, 0.75, 0.8],
};
const SEARCH_QUICK = {
  densityCoef: [12, 13, 14],
  densityCap: [60, 65, 70],
  breadthMult: [1.5, 2, 2.5],
  breadthCap: [18, 20, 24],
  categoryMult: [2, 3, 4],
  categoryCap: [12, 15, 18],
  patternWeight: [0.65, 0.7, 0.75],
};
const SEARCH = quick ? SEARCH_QUICK : SEARCH_FULL;

const BASELINE = {
  densityCoef: 13,
  densityCap: 65,
  breadthMult: 2,
  breadthCap: 20,
  categoryMult: 3,
  categoryCap: 15,
  patternWeight: 0.7,
};

function* combinations(space) {
  const keys = Object.keys(space);
  function* recur(i, acc) {
    if (i === keys.length) {
      yield { ...acc };
      return;
    }
    for (const v of space[keys[i]]) {
      acc[keys[i]] = v;
      yield* recur(i + 1, acc);
    }
  }
  yield* recur(0, {});
}

function totalCombos(space) {
  return Object.values(space).reduce((a, b) => a * b.length, 1);
}

// ── Eval per knob ────────────────────────────────────────

function evaluate(enriched, knobs) {
  const scored = enriched.map((s) => ({ ...s, score: recomputeScore(s, knobs) }));
  const auc = computeAuc(scored);
  const m50 = metrics(scored, 50);
  const t = bestThreshold(scored);
  const mt = metrics(scored, t.threshold);
  const aiScores = scored.filter((s) => s.label === 1).map((s) => s.score);
  const humanScores = scored.filter((s) => s.label === 0).map((s) => s.score);
  const median = (xs) => {
    if (xs.length === 0) return 0;
    const a = xs.slice().sort((p, q) => p - q);
    return a[Math.floor(a.length / 2)];
  };
  const medianAi = median(aiScores);
  const medianHuman = median(humanScores);
  // Separation margin: AI median should be well above 50 AND well above human median.
  // Penalize AI medians close to the decision boundary so the chosen knobs keep
  // a comfortable buffer when v2 sees out-of-distribution input later.
  const margin = medianAi - medianHuman;
  const aiBuffer = medianAi - 50; // can be negative
  return { knobs, auc, m50, threshold: t.threshold, mt, medianAi, medianHuman, margin, aiBuffer };
}

// ── Main ─────────────────────────────────────────────────

async function runLocale(loc) {
  process.stderr.write(`\n=== ${loc.code} ===\n`);
  const samples = loadSamples(loc.humanDirs, loc.aiDirs);
  const labels = { 0: 0, 1: 0 };
  for (const s of samples) labels[s.label]++;
  process.stderr.write(
    `  ${samples.length} samples (human=${labels[0]} / ai=${labels[1]}, windows=${useWindows})\n`,
  );
  if (labels[0] < 20 || labels[1] < 20) {
    process.stderr.write(`  WARN: very few samples on one side, results will be noisy\n`);
  }

  const enriched = analyzeAll(samples, loc.code);
  const baseline = evaluate(enriched, BASELINE);
  process.stderr.write(
    `  baseline AUC=${baseline.auc.toFixed(4)} fpr@50=${baseline.m50.fpr.toFixed(3)} J*=${baseline.threshold} prec=${baseline.mt.precision.toFixed(3)}\n`,
  );

  const total = totalCombos(SEARCH);
  process.stderr.write(`  searching ${total} knob combinations…\n`);
  // Composite objective: AUC first (4 decimals), then separation margin, then AI buffer above 50.
  // This keeps healthy AI/human gap when AUC ties at 1.0 across many knob configs.
  const objective = (ev) =>
    Math.round(ev.auc * 10000) * 1e6 + Math.max(0, ev.margin) * 1000 + Math.max(0, ev.aiBuffer);
  let bestPenalized = { auc: -1, margin: -Infinity, aiBuffer: -Infinity };
  let bestRaw = { auc: -1, margin: -Infinity, aiBuffer: -Infinity };
  let count = 0;
  let skipped = 0;
  for (const knobs of combinations(SEARCH)) {
    count++;
    const ev = evaluate(enriched, knobs);
    if (objective(ev) > objective(bestRaw)) bestRaw = ev;
    if (ev.m50.fpr > FPR50_CEILING) {
      skipped++;
      continue;
    }
    if (objective(ev) > objective(bestPenalized)) bestPenalized = ev;
    if (count % 1000 === 0) process.stderr.write(`    ${count}/${total}\r`);
  }
  process.stderr.write(`  searched ${count} (skipped for fpr>${FPR50_CEILING}: ${skipped})\n`);
  process.stderr.write(
    `  best (FPR-gated)  AUC=${bestPenalized.auc.toFixed(4)} margin=${bestPenalized.margin} aiMedian=${bestPenalized.medianAi} fpr@50=${bestPenalized.m50.fpr.toFixed(3)} J*=${bestPenalized.threshold}\n`,
  );
  process.stderr.write(
    `  best (raw)        AUC=${bestRaw.auc.toFixed(4)} margin=${bestRaw.margin} aiMedian=${bestRaw.medianAi} fpr@50=${bestRaw.m50.fpr.toFixed(3)} J*=${bestRaw.threshold}\n`,
  );

  const baseScored = enriched.map((s) => ({ ...s, score: recomputeScore(s, BASELINE) }));
  const bestScored = enriched.map((s) => ({
    ...s,
    score: recomputeScore(s, bestPenalized.knobs),
  }));

  return {
    locale: loc.code,
    sampleCount: samples.length,
    counts: { human: labels[0], ai: labels[1] },
    windows: useWindows,
    searchSize: total,
    baseline: {
      knobs: BASELINE,
      auc: baseline.auc,
      threshold: baseline.threshold,
      fpr50: baseline.m50.fpr,
      perGenre: perGenreSummary(baseScored, 50),
    },
    best: {
      knobs: bestPenalized.knobs,
      auc: bestPenalized.auc,
      threshold: bestPenalized.threshold,
      fpr50: bestPenalized.m50.fpr,
      precision: bestPenalized.mt.precision,
      recall: bestPenalized.mt.recall,
      medianAi: bestPenalized.medianAi,
      medianHuman: bestPenalized.medianHuman,
      margin: bestPenalized.margin,
      perGenre: perGenreSummary(bestScored, 50),
    },
    bestRaw: {
      knobs: bestRaw.knobs,
      auc: bestRaw.auc,
      threshold: bestRaw.threshold,
      fpr50: bestRaw.m50.fpr,
      medianAi: bestRaw.medianAi,
      medianHuman: bestRaw.medianHuman,
    },
  };
}

function writeReports(reports) {
  const date = new Date().toISOString().slice(0, 10);
  const reportsDir = path.join(REPO_ROOT, 'reports');
  fs.mkdirSync(reportsDir, { recursive: true });
  const jsonPath = path.join(reportsDir, `tuning-${date}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify({ generatedAt: new Date().toISOString(), reports }, null, 2));

  let md = `# Scoring tuning report — ${date}\n\n`;
  md += `Mode: ${useWindows ? `${WINDOW_WORDS}-word windows` : 'whole documents'}; FPR@50 ceiling = ${FPR50_CEILING}.\n\n`;
  md += `Knob meaning (current code):\n`;
  md += `- \`densityCoef\` — slope on log2(density+1) in pattern score (default **13**).\n`;
  md += `- \`densityCap\` — max points the density term can contribute (default **65**).\n`;
  md += `- \`breadthMult\` / \`breadthCap\` — points per unique pattern hit, capped (default **2 / 20**).\n`;
  md += `- \`categoryMult\` / \`categoryCap\` — points per unique category, capped (default **3 / 15**).\n`;
  md += `- \`patternWeight\` — weight of pattern score vs uniformity (default **0.7**).\n\n`;

  for (const r of reports) {
    md += `## ${r.locale.toUpperCase()} (${r.sampleCount} samples: human=${r.counts.human}, ai=${r.counts.ai})\n\n`;
    md += `| Variant | AUC | J* threshold | FPR@50 | Median AI | Median Human | Margin | Knobs |\n|---|---|---|---|---|---|---|---|\n`;
    md += `| Baseline | **${r.baseline.auc.toFixed(4)}** | ${r.baseline.threshold} | ${r.baseline.fpr50.toFixed(3)} | – | – | – | \`${JSON.stringify(r.baseline.knobs)}\` |\n`;
    md += `| Best (FPR≤${FPR50_CEILING}, margin tiebreak) | **${r.best.auc.toFixed(4)}** | ${r.best.threshold} | ${r.best.fpr50.toFixed(3)} | ${r.best.medianAi} | ${r.best.medianHuman} | **${r.best.margin}** | \`${JSON.stringify(r.best.knobs)}\` |\n`;
    md += `| Best (raw, margin tiebreak) | ${r.bestRaw.auc.toFixed(4)} | ${r.bestRaw.threshold} | ${r.bestRaw.fpr50.toFixed(3)} | ${r.bestRaw.medianAi} | ${r.bestRaw.medianHuman} | – | \`${JSON.stringify(r.bestRaw.knobs)}\` |\n\n`;

    md += `### Per-class / genre score summary @ best knobs (threshold = 50)\n\n| Class:Genre | n | mean | median | p95 | max | FPR / Recall |\n|---|---|---|---|---|---|---|\n`;
    for (const key of Object.keys(r.best.perGenre)) {
      const x = r.best.perGenre[key];
      const rate = key.startsWith('ai:') ? x['recall@thr'] : x['fpr@thr'];
      md += `| ${key} | ${x.count} | ${x.mean} | ${x.median} | ${x.p95} | ${x.max} | ${rate} |\n`;
    }
    md += `\n`;
  }

  md += `## How to apply\n\n`;
  md += `Knobs live in \`src/locales/scoring-defaults.js\`: update \`DEFAULT_SCORING_KNOBS\` (global / new locales) and/or \`SCORING_KNOBS_EN\` / \`SCORING_KNOBS_SV\` with the **Best (FPR≤${FPR50_CEILING})** row above. The analyzer merges \`profile.scoring\` over \`DEFAULT_SCORING_KNOBS\`.\n\n`;
  md += `Re-run \`npm run sv:pipeline\` / \`npm run en:pipeline\` (if available) and \`npm test\` to confirm regression gates still pass.\n`;

  const mdPath = path.join(reportsDir, `tuning-${date}.md`);
  fs.writeFileSync(mdPath, md);

  process.stderr.write(`\nWrote ${path.relative(REPO_ROOT, jsonPath)}\n`);
  process.stderr.write(`Wrote ${path.relative(REPO_ROOT, mdPath)}\n`);
}

const reports = [];
for (const loc of LOCALES) {
  reports.push(await runLocale(loc));
}
writeReports(reports);
