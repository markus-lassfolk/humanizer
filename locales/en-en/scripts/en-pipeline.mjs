#!/usr/bin/env node
/**
 * English data pipeline — prescriptive, baseline, corpus seeds, frequencies, log-odds, LM, calibration, tests.
 * Usage: node locales/en-en/scripts/en-pipeline.mjs [--resume] [--force] [--dry-run] [--no-test]
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { spawnSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EN_SE = path.join(__dirname, '..');
const REPO_ROOT = path.join(EN_SE, '..', '..');
const PIPE_DIR = path.join(EN_SE, '.pipeline');
const STATE_PATH = path.join(PIPE_DIR, 'state.json');
const LOG_PATH = path.join(PIPE_DIR, 'last-run.log');
const SNAPSHOT_PATH = path.join(EN_SE, 'references', 'PIPELINE-SNAPSHOT.md');

const SCRIPTS = {
  bootstrap: path.join(EN_SE, 'scripts', 'bootstrap-en-tsvs.mjs'),
  prescriptive: path.join(EN_SE, 'scripts', 'build-en-locale-prescriptive.mjs'),
  materialize: path.join(EN_SE, 'scripts', 'materialize-baseline-corpus-en.mjs'),
  freq: path.join(EN_SE, 'scripts', 'build-en-frequency-baseline.mjs'),
  validate: path.join(EN_SE, 'scripts', 'validate-en-tiers.mjs'),
  prompts: path.join(EN_SE, 'scripts', 'seed-en-prompts.mjs'),
  seed: path.join(EN_SE, 'scripts', 'seed-en-corpus.mjs'),
  logodds: path.join(EN_SE, 'scripts', 'log-odds-en.mjs'),
  ngram: path.join(EN_SE, 'scripts', 'build-en-ngram-lm.mjs'),
  calibrate: path.join(EN_SE, 'scripts', 'calibration-report-en.mjs'),
};

function parseArgs(argv) {
  return {
    resume: argv.includes('--resume'),
    force: argv.includes('--force'),
    dryRun: argv.includes('--dry-run'),
    noTest: argv.includes('--no-test'),
  };
}

function ensurePipeDir() {
  if (!fs.existsSync(PIPE_DIR)) fs.mkdirSync(PIPE_DIR, { recursive: true });
}

function logLine(msg, alsoConsole = true) {
  ensurePipeDir();
  fs.appendFileSync(LOG_PATH, `[${new Date().toISOString()}] ${msg}\n`, 'utf8');
  if (alsoConsole) console.error(msg);
}

function loadState() {
  if (!fs.existsSync(STATE_PATH)) return { version: 1, phases: {} };
  try {
    return JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
  } catch {
    return { version: 1, phases: {} };
  }
}

function saveState(state) {
  ensurePipeDir();
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2), 'utf8');
}

function runNode(scriptPath, args = []) {
  const r = spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: REPO_ROOT,
    stdio: 'inherit',
  });
  if (r.status !== 0) throw new Error(`exit ${r.status}: ${path.relative(REPO_ROOT, scriptPath)}`);
}

function shouldSkip(state, id, opts) {
  if (opts.force) return false;
  if (!opts.resume) return false;
  return state.phases[id]?.status === 'ok';
}

function phaseDone(state, id) {
  state.phases[id] = { status: 'ok', finishedAt: new Date().toISOString() };
  saveState(state);
}

function writeSnapshot(metrics) {
  const body = `<!-- en-pipeline:snapshot:start -->
> **Auto-generated** by \`locales/en-en/scripts/en-pipeline.mjs\`. Do not edit between markers.

| Field | Value |
|-------|-------|
| Generated at (UTC) | ${metrics.generatedAt} |
| Prescriptive autofixes | ${metrics.autofixes ?? '—'} |
| Prescriptive phrase rows | ${metrics.phrases ?? '—'} |
| Baseline corpus lines | ${metrics.baselineLines ?? '—'} |
| Frequency ranks (unique types) | ${metrics.uniqueTypes ?? '—'} |
| Frequency ranks (total tokens) | ${metrics.totalTokens ?? '—'} |
| Prompt files | ${metrics.promptFiles ?? '—'} |
| Corpus human / AI docs | ${metrics.humanDocs ?? '—'} / ${metrics.aiDocs ?? '—'} |
| en-frequencies.json keys | ${metrics.frequencyKeys ?? '—'} |
| Calibration AUC | ${metrics.auc ?? '—'} |
| Calibration macro-F1 | ${metrics.macroF1 ?? '—'} |
| Calibration mean score (human / AI) | ${metrics.meanScoreHuman ?? '—'} / ${metrics.meanScoreAi ?? '—'} |
| Marketing genre mean human | ${metrics.marketingMeanHuman ?? '—'} |

## Outputs

| Artifact | Path |
|----------|------|
| Generated locale | \`src/locales/generated/en-prescriptive.js\` |
| Baseline text | \`locales/en-en/references/baseline-corpus-en.txt\` |
| Human frequency ranks | \`locales/en-en/references/en-human-frequency-ranks.json\` |
| Empirical JSON + MD | \`locales/en-en/references/en-frequencies.json\`, \`empirical-en-tiers.md\` |
| N-gram LM | \`locales/en-en/references/en-ngram-lm.json\` |
| Calibration | \`reports/calibration-en-latest.json\` |
| Synthetic corpus | \`tests/fixtures/en-corpus/human/\`, \`ai/\` |
| Prompt bank | \`tests/fixtures/en-corpus/prompts/\` |

<!-- en-pipeline:snapshot:end -->
`;
  fs.writeFileSync(SNAPSHOT_PATH, body, 'utf8');
}

async function main() {
  const opts = parseArgs(process.argv);
  if (!opts.dryRun) {
    ensurePipeDir();
    fs.writeFileSync(LOG_PATH, '', 'utf8');
  }

  const state = loadState();
  const phases = [
    ['bootstrap', () => runNode(SCRIPTS.bootstrap)],
    ['prescriptive', () => runNode(SCRIPTS.prescriptive)],
    ['materialize', () => runNode(SCRIPTS.materialize)],
    ['seed', () => runNode(SCRIPTS.seed)],
    ['prompts', () => runNode(SCRIPTS.prompts)],
    ['freq', () => runNode(SCRIPTS.freq)],
    ['validate', () => runNode(SCRIPTS.validate)],
    ['logodds', () => runNode(SCRIPTS.logodds)],
    ['ngram', () => runNode(SCRIPTS.ngram)],
    ['calibrate', () => runNode(SCRIPTS.calibrate)],
  ];

  if (opts.dryRun) {
    console.log('Phases:', phases.map(([id]) => id).join(', '));
    return;
  }

  for (const [id, fn] of phases) {
    if (shouldSkip(state, id, opts)) {
      logLine(`skip ${id} (resume)`);
      continue;
    }
    logLine(`phase ${id}...`);
    fn();
    phaseDone(state, id);
  }

  const gen = path.join(REPO_ROOT, 'src/locales/generated/en-prescriptive.js');
  const genUrl = path.isAbsolute(gen) ? pathToFileURL(gen).href : pathToFileURL(path.resolve(gen)).href;
  const mod = await import(genUrl);
  const autofixes = mod.AUTOFIXES_EN_PRESCRIPTIVE?.length ?? 0;
  const phrases = mod.AI_PHRASES_EN_PRESCRIPTIVE?.length ?? 0;
  const baselineLines = fs
    .readFileSync(path.join(EN_SE, 'references/baseline-corpus-en.txt'), 'utf8')
    .split('\n')
    .filter(Boolean).length;
  const freqData = JSON.parse(
    fs.readFileSync(path.join(EN_SE, 'references/en-human-frequency-ranks.json'), 'utf8'),
  );
  const cal = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'reports/calibration-en-latest.json'), 'utf8'));
  const ef = JSON.parse(fs.readFileSync(path.join(EN_SE, 'references/en-frequencies.json'), 'utf8'));

  writeSnapshot({
    generatedAt: new Date().toISOString(),
    autofixes,
    phrases,
    baselineLines,
    uniqueTypes: freqData._meta?.uniqueTypes,
    totalTokens: freqData._meta?.totalTokens,
    promptFiles: 200,
    humanDocs: cal.corpus?.humanDocs,
    aiDocs: cal.corpus?.aiDocs,
    frequencyKeys: Object.keys(ef).length,
    auc: cal.auc,
    macroF1: cal.macroF1,
    meanScoreHuman: cal.meanScoreHuman,
    meanScoreAi: cal.meanScoreAi,
    marketingMeanHuman: cal.perGenre?.marketing?.meanScoreHuman,
  });

  if (!opts.noTest) {
    const r = spawnSync('npm', ['test'], { cwd: REPO_ROOT, stdio: 'inherit', shell: true });
    if (r.status !== 0) process.exit(r.status);
  }
  console.error('en-pipeline: done');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
