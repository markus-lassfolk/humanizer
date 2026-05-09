#!/usr/bin/env node
/**
 * sv-pipeline.mjs — Run the full Swedish data pipeline with verification, logging, and resume.
 *
 * Usage:
 *   node locales/sv-se/scripts/sv-pipeline.mjs [options]
 *
 * Options:
 *   --resume              Skip phases that completed successfully in the last run
 *   --force               Ignore saved state; re-run all phases
 *   --dry-run             Print phases only; do not execute
 *   --no-test             Skip `npm test` at the end
 *   --with-extended       Wikipedia fetch + merge into log-odds; also runs freq:baseline with
 *                         SV_FREQ_INCLUDE_EXTENDED=1 + validate-sv-tiers after extended/ exists
 *                         (unless --no-freq-include-extended). Skips a redundant baseline-only freq/validate.
 *   --freq-include-extended   freq+validate with extended counts only (needs sv-corpus-extended/ populated)
 *   --no-freq-include-extended   With --with-extended: skip extended-aware freq/validate (faster, weaker ranks)
 *   --with-lm                    After corpus seed: rebuild sv-ngram-lm.json for Swedish --with-lm uniformity
 *
 * State: locales/sv-se/.pipeline/state.json (gitignored)
 * Log:   locales/sv-se/.pipeline/last-run.log (gitignored)
 * Report: locales/sv-se/references/PIPELINE-SNAPSHOT.md (committed; auto-generated body)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';
import { createRequire } from 'module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SV_SE = path.join(__dirname, '..');
const REPO_ROOT = path.join(SV_SE, '..', '..');
const PIPE_DIR = path.join(SV_SE, '.pipeline');
const STATE_PATH = path.join(PIPE_DIR, 'state.json');
const LOG_PATH = path.join(PIPE_DIR, 'last-run.log');
const SNAPSHOT_PATH = path.join(SV_SE, 'references', 'PIPELINE-SNAPSHOT.md');

const SV_FIX = path.join(SV_SE, 'tests', 'fixtures');
const PROMPTS_DIR = path.join(SV_FIX, 'sv-corpus', 'prompts');
const HUMAN_DIR = path.join(SV_FIX, 'sv-corpus', 'human');
const AI_DIR = path.join(SV_FIX, 'sv-corpus', 'ai');
const EXT_DIR = path.join(SV_FIX, 'sv-corpus-extended');

const EXPECTED_PROMPTS = 230;
const EXPECTED_CORPUS_DOCS = 60;

const SCRIPTS = {
  prescriptive: path.join(SV_SE, 'scripts', 'build-sv-locale-prescriptive.mjs'),
  materialize: path.join(SV_SE, 'scripts', 'materialize-baseline-corpus.mjs'),
  freq: path.join(SV_SE, 'scripts', 'build-sv-frequency-baseline.mjs'),
  validate: path.join(SV_SE, 'scripts', 'validate-sv-tiers.mjs'),
  prompts: path.join(SV_SE, 'scripts', 'seed-sv-prompts.mjs'),
  seed: path.join(SV_SE, 'scripts', 'seed-sv-corpus.mjs'),
  ngram: path.join(SV_SE, 'scripts', 'build-sv-ngram-lm.mjs'),
  extended: path.join(SV_SE, 'scripts', 'build-corpus-extended.mjs'),
  logodds: path.join(SV_SE, 'scripts', 'log-odds.mjs'),
  calibrate: path.join(SV_SE, 'scripts', 'calibration-report.mjs'),
};

const require = createRequire(import.meta.url);

/** When false (--dry-run), do not touch last-run.log (avoids test runs clobbering real logs). */
let logFileEnabled = true;

function parseArgs(argv) {
  return {
    resume: argv.includes('--resume'),
    force: argv.includes('--force'),
    dryRun: argv.includes('--dry-run'),
    noTest: argv.includes('--no-test'),
    withExtended: argv.includes('--with-extended'),
    freqIncludeExtended: argv.includes('--freq-include-extended'),
    noFreqIncludeExtended: argv.includes('--no-freq-include-extended'),
    withLm: argv.includes('--with-lm'),
  };
}

function ensurePipeDir() {
  if (!fs.existsSync(PIPE_DIR)) fs.mkdirSync(PIPE_DIR, { recursive: true });
}

function logLine(msg, alsoConsole = true) {
  if (logFileEnabled) {
    const line = `[${new Date().toISOString()}] ${msg}\n`;
    ensurePipeDir();
    fs.appendFileSync(LOG_PATH, line, 'utf8');
  }
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

function runNode(scriptPath, args = [], extraEnv = {}) {
  const r = spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: REPO_ROOT,
    env: { ...process.env, ...extraEnv },
    stdio: 'inherit',
  });
  if (r.error) throw r.error;
  if (r.status !== 0) {
    throw new Error(`exit code ${r.status} for ${path.relative(REPO_ROOT, scriptPath)}`);
  }
}

function countTxt(dir) {
  if (!fs.existsSync(dir)) return 0;
  return fs.readdirSync(dir).filter((f) => f.endsWith('.txt')).length;
}

function assertFile(p, minBytes = 1) {
  if (!fs.existsSync(p)) throw new Error(`Missing file: ${path.relative(REPO_ROOT, p)}`);
  const st = fs.statSync(p);
  if (st.size < minBytes) throw new Error(`Too small (${st.size} B): ${path.relative(REPO_ROOT, p)}`);
}

function verifyPrescriptive() {
  const gen = path.join(REPO_ROOT, 'src', 'locales', 'generated', 'sv-prescriptive.js');
  assertFile(gen, 500);
  const mod = require(gen);
  const nAf = mod.AUTOFIXES_SV_PRESCRIPTIVE?.length ?? 0;
  const nPh = mod.AI_PHRASES_SV_PRESCRIPTIVE?.length ?? 0;
  if (nAf < 1) throw new Error(`AUTOFIXES_SV_PRESCRIPTIVE empty (${nAf})`);
  if (nPh < 1) throw new Error(`AI_PHRASES_SV_PRESCRIPTIVE empty (${nPh})`);
  const nW = mod.WEASELS_SV?.length ?? 0;
  const nC = mod.CLICHES_SV?.length ?? 0;
  const nR = mod.REDUNDANCY_SV?.length ?? 0;
  const nP = mod.PASSIVE_SV?.length ?? 0;
  const nI = mod.INCLUSIVE_SV?.length ?? 0;
  if (nW < 50) throw new Error(`WEASELS_SV too few (${nW})`);
  if (nC < 100) throw new Error(`CLICHES_SV too few (${nC})`);
  if (nR < 50) throw new Error(`REDUNDANCY_SV too few (${nR})`);
  if (nP < 20) throw new Error(`PASSIVE_SV too few (${nP})`);
  if (nI < 10) throw new Error(`INCLUSIVE_SV too few (${nI})`);
  return { autofixes: nAf, phrases: nPh, weasels: nW, cliches: nC, redundancy: nR, passive: nP, inclusive: nI };
}

function verifyBaselineCorpus() {
  const p = path.join(SV_SE, 'references', 'baseline-corpus-sv.txt');
  assertFile(p, 10_000);
  const lines = fs.readFileSync(p, 'utf8').split('\n').filter(Boolean).length;
  if (lines < 500) throw new Error(`baseline-corpus-sv.txt too few lines: ${lines}`);
  return { baselineLines: lines };
}

function verifyFreqJson() {
  const p = path.join(SV_SE, 'references', 'sv-human-frequency-ranks.json');
  assertFile(p, 500);
  const data = JSON.parse(fs.readFileSync(p, 'utf8'));
  const ranks = data.ranks || data;
  const meta = data._meta;
  const nTypes = meta?.uniqueTypes ?? Object.keys(ranks).length;
  const tokens = meta?.totalTokens ?? 0;
  if (nTypes < 100) throw new Error(`Frequency ranks too sparse: ${nTypes} types`);
  if (tokens < 5000) throw new Error(`Frequency ranks too few tokens: ${tokens}`);
  return { uniqueTypes: nTypes, totalTokens: tokens };
}

function verifyPrompts() {
  if (!fs.existsSync(PROMPTS_DIR)) throw new Error('Missing prompts/ directory');
  const prompts = fs.readdirSync(PROMPTS_DIR).filter((f) => /^prompt-\d{3}\.txt$/.test(f));
  if (prompts.length !== EXPECTED_PROMPTS) {
    throw new Error(`Expected ${EXPECTED_PROMPTS} prompt-NNN.txt, got ${prompts.length}`);
  }
  const man = path.join(SV_FIX, 'sv-corpus', 'prompts-manifest.json');
  assertFile(man, 50);
  const m = JSON.parse(fs.readFileSync(man, 'utf8'));
  if (!Array.isArray(m.prompts) || m.prompts.length !== EXPECTED_PROMPTS) {
    throw new Error(`prompts-manifest.json expected ${EXPECTED_PROMPTS} entries, got ${m.prompts?.length}`);
  }
  return { promptFiles: prompts.length };
}

function verifyCorpusSeed() {
  const h = countTxt(HUMAN_DIR);
  const a = countTxt(AI_DIR);
  if (h !== EXPECTED_CORPUS_DOCS) {
    throw new Error(`Expected ${EXPECTED_CORPUS_DOCS} human/*.txt, got ${h}`);
  }
  if (a !== EXPECTED_CORPUS_DOCS) {
    throw new Error(`Expected ${EXPECTED_CORPUS_DOCS} ai/*.txt, got ${a}`);
  }
  return { humanDocs: h, aiDocs: a };
}

function verifyExtended() {
  const n = countTxt(EXT_DIR);
  if (n < 1) throw new Error('sv-corpus-extended/ empty after corpus:build');
  return { extendedFiles: n };
}

function verifyLogOdds() {
  const jp = path.join(SV_SE, 'references', 'sv-frequencies.json');
  const md = path.join(SV_SE, 'references', 'empirical-sv-tiers.md');
  assertFile(jp, 20);
  assertFile(md, 200);
  const data = JSON.parse(fs.readFileSync(jp, 'utf8'));
  const keys = Object.keys(data).length;
  return { frequencyKeys: keys };
}

function verifyCalibrate() {
  const p = path.join(REPO_ROOT, 'reports', 'calibration-sv-latest.json');
  assertFile(p, 100);
  const data = JSON.parse(fs.readFileSync(p, 'utf8'));
  if (typeof data.auc !== 'number') throw new Error('calibration-sv-latest.json missing auc');
  if (data.meanScoreHuman === undefined) throw new Error('calibration missing meanScoreHuman');
  if (!data.perGenre) throw new Error('calibration missing perGenre');
  if (data.perGenre.marketing === undefined) {
    throw new Error('calibration missing perGenre.marketing (run seed-sv-corpus with marketing genre)');
  }
  return {
    auc: data.auc,
    meanScoreHuman: data.meanScoreHuman,
    meanScoreAi: data.meanScoreAi,
    humanDocs: data.corpus?.humanDocs,
    aiDocs: data.corpus?.aiDocs,
    governmentMeanHuman: data.perGenre?.government?.meanScoreHuman,
    marketingMeanHuman: data.perGenre?.marketing?.meanScoreHuman,
  };
}

function verifyNgramLm() {
  const p = path.join(SV_SE, 'references', 'sv-ngram-lm.json');
  assertFile(p, 500);
  const data = JSON.parse(fs.readFileSync(p, 'utf8'));
  const tok = data._meta?.tokens ?? 0;
  if (tok < 1000) throw new Error(`sv-ngram-lm.json too few tokens: ${tok}`);
  return { lmTokens: tok };
}

function runTests() {
  const r = spawnSync('npm', ['test'], { cwd: REPO_ROOT, stdio: 'inherit', shell: true });
  if (r.status !== 0) throw new Error(`npm test exit ${r.status}`);
}

function phaseDone(state, id, details = {}) {
  state.phases[id] = {
    status: 'ok',
    finishedAt: new Date().toISOString(),
    ...details,
  };
  saveState(state);
}

function shouldSkip(state, id, opts) {
  if (opts.force) return false;
  if (!opts.resume) return false;
  return state.phases[id]?.status === 'ok';
}

/** Read-only: rebuild metrics from artifacts on disk (correct after --resume). */
function readSnapshotMetrics() {
  const m = { generatedAt: new Date().toISOString() };
  Object.assign(m, verifyPrescriptive());
  Object.assign(m, verifyBaselineCorpus());
  Object.assign(m, verifyFreqJson());
  Object.assign(m, verifyPrompts());
  Object.assign(m, verifyCorpusSeed());
  Object.assign(m, verifyLogOdds());
  const c = verifyCalibrate();
  Object.assign(m, {
    auc: c.auc,
    meanScoreHuman: c.meanScoreHuman,
    meanScoreAi: c.meanScoreAi,
    calHumanDocs: c.humanDocs,
    calAiDocs: c.aiDocs,
    governmentMeanHuman: c.governmentMeanHuman,
    marketingMeanHuman: c.marketingMeanHuman,
  });
  const lmPath = path.join(SV_SE, 'references', 'sv-ngram-lm.json');
  if (fs.existsSync(lmPath)) {
    try {
      Object.assign(m, verifyNgramLm());
    } catch {
      /* optional artifact */
    }
  }
  return m;
}

function writeSnapshot(opts, metrics) {
  const rel = (p) => path.relative(REPO_ROOT, p);
  const extNote = fs.existsSync(EXT_DIR)
    ? `${countTxt(EXT_DIR)} files in ${rel(EXT_DIR)} (log-odds merges these into human side when present)`
    : '0 (folder absent or empty — log-odds uses committed human + gold + baseline text only)';

  const body = `<!-- sv-pipeline:snapshot:start -->
> **Auto-generated** by \`locales/sv-se/scripts/sv-pipeline.mjs\`. Do not edit between markers.

| Field | Value |
|-------|-------|
| Generated at (UTC) | ${metrics.generatedAt} |
| Prescriptive autofixes | ${metrics.autofixes} |
| Prescriptive phrase rows | ${metrics.phrases} |
| Pattern pack rows (weasel / cliché / redundancy / passive / inclusive) | ${metrics.weasels ?? 'n/a'} / ${metrics.cliches ?? 'n/a'} / ${metrics.redundancy ?? 'n/a'} / ${metrics.passive ?? 'n/a'} / ${metrics.inclusive ?? 'n/a'} |
| Baseline corpus lines | ${metrics.baselineLines} |
| Frequency ranks (unique types) | ${metrics.uniqueTypes} |
| Frequency ranks (total tokens) | ${metrics.totalTokens} |
| Prompt files | ${metrics.promptFiles} |
| Corpus human / AI docs | ${metrics.humanDocs} / ${metrics.aiDocs} |
| Extended corpus (wiki) | ${extNote} |
| Frequency ranks used \`sv-corpus-extended/\` tokens | ${opts.effectiveFreqIncludeExtended ? '**yes** (SV_FREQ_INCLUDE_EXTENDED=1)' : 'no (baseline + human + gold only)'} |
| sv-frequencies.json keys | ${metrics.frequencyKeys} |
| Calibration AUC | ${metrics.auc} |
| Calibration mean score (human / AI) | ${metrics.meanScoreHuman} / ${metrics.meanScoreAi} |
| Calibration corpus human / AI (report) | ${metrics.calHumanDocs} / ${metrics.calAiDocs} |
| Government genre mean human (report) | ${metrics.governmentMeanHuman ?? 'n/a'} |
| Marketing genre mean human (report) | ${metrics.marketingMeanHuman ?? 'n/a'} |
| N-gram LM (sv-ngram-lm.json tokens) | ${metrics.lmTokens ?? 'n/a (run with --with-lm or npm run lm:build-sv)'} |

## Outputs touched by a full run

| Artifact | Path |
|----------|------|
| Generated locale | \`src/locales/generated/sv-prescriptive.js\` |
| Baseline text | \`locales/sv-se/references/baseline-corpus-sv.txt\` |
| Human frequency ranks | \`locales/sv-se/references/sv-human-frequency-ranks.json\` |
| Empirical JSON + MD | \`locales/sv-se/references/sv-frequencies.json\`, \`empirical-sv-tiers.md\` |
| Calibration | \`reports/calibration-sv-latest.json\` (+ dated \`.md\`) |
| Synthetic corpus | \`locales/sv-se/tests/fixtures/sv-corpus/human/\`, \`ai/\` |
| Prompt bank | \`locales/sv-se/tests/fixtures/sv-corpus/prompts/\` |
| Swedish n-gram LM | \`locales/sv-se/references/sv-ngram-lm.json\` (optional, \`--with-lm\` / \`npm run lm:build-sv\`) |

## Last run flags

\`\`\`json
${JSON.stringify({ ...opts, node: process.version }, null, 2)}
\`\`\`

## Resume / errors

- State file: \`locales/sv-se/.pipeline/state.json\` (gitignored)
- Full log: \`locales/sv-se/.pipeline/last-run.log\` (gitignored)
- Re-run with \`--resume\` after fixing a failure; use \`--force\` to ignore state.

<!-- sv-pipeline:snapshot:end -->
`;

  const markerStart = '<!-- sv-pipeline:snapshot:start -->';
  const markerEnd = '<!-- sv-pipeline:snapshot:end -->';

  let out = '';
  if (fs.existsSync(SNAPSHOT_PATH)) {
    const prev = fs.readFileSync(SNAPSHOT_PATH, 'utf8');
    const i0 = prev.indexOf(markerStart);
    const i1 = prev.indexOf(markerEnd);
    if (i0 !== -1 && i1 !== -1 && i1 > i0) {
      out = prev.slice(0, i0) + body + prev.slice(i1 + markerEnd.length);
    } else {
      out = `# Swedish pipeline snapshot\n\n${body}\n`;
    }
  } else {
    out = `# Swedish pipeline snapshot\n\n${body}\n`;
  }
  fs.writeFileSync(SNAPSHOT_PATH, out, 'utf8');
  logLine(`Wrote ${path.relative(REPO_ROOT, SNAPSHOT_PATH)}`);
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  const effectiveFreqIncludeExtended =
    !opts.noFreqIncludeExtended && (opts.freqIncludeExtended || opts.withExtended);
  logFileEnabled = !opts.dryRun;
  ensurePipeDir();
  if (logFileEnabled && (!opts.resume || opts.force)) {
    fs.writeFileSync(LOG_PATH, '', 'utf8');
  }

  logLine(
    `sv-pipeline start (resume=${opts.resume}, force=${opts.force}, dryRun=${opts.dryRun}, withLm=${opts.withLm})`,
  );

  let state = loadState();
  if (opts.force) {
    state = { version: 1, runId: `run-${Date.now()}`, phases: {} };
    saveState(state);
  } else if (!opts.resume) {
    state = { version: 1, runId: `run-${Date.now()}`, phases: {} };
    saveState(state);
  }

  const phases = [
    {
      id: 'prescriptive',
      label: 'TSV → sv-prescriptive.js + --check',
      run: () => {
        runNode(SCRIPTS.prescriptive, []);
        runNode(SCRIPTS.prescriptive, ['--check']);
      },
      verify: () => verifyPrescriptive(),
    },
    {
      id: 'materialize',
      label: 'baseline-corpus-sv.txt',
      run: () => runNode(SCRIPTS.materialize, []),
      verify: () => verifyBaselineCorpus(),
    },
  ];

  if (!effectiveFreqIncludeExtended) {
    phases.push(
      {
        id: 'freq',
        label: 'sv-human-frequency-ranks.json',
        run: () => runNode(SCRIPTS.freq, [], {}),
        verify: () => verifyFreqJson(),
      },
      {
        id: 'validate_tiers',
        label: 'validate-sv-tiers',
        run: () => runNode(SCRIPTS.validate, []),
        verify: () => ({}),
      },
    );
  }

  phases.push(
    {
      id: 'prompts',
      label: `${EXPECTED_PROMPTS} prompts + manifest`,
      run: () => runNode(SCRIPTS.prompts, []),
      verify: () => verifyPrompts(),
    },
    {
      id: 'corpus_seed',
      label: `${EXPECTED_CORPUS_DOCS}+${EXPECTED_CORPUS_DOCS} synthetic corpus`,
      run: () => runNode(SCRIPTS.seed, []),
      verify: () => verifyCorpusSeed(),
    },
  );

  if (opts.withLm) {
    phases.push({
      id: 'ngram_lm',
      label: 'sv-ngram-lm.json (Swedish --with-lm)',
      run: () => runNode(SCRIPTS.ngram, []),
      verify: () => verifyNgramLm(),
    });
  }

  if (opts.withExtended) {
    phases.push({
      id: 'corpus_extended',
      label: 'Wikipedia extended (network)',
      run: () => runNode(SCRIPTS.extended, []),
      verify: () => verifyExtended(),
    });
  }

  if (effectiveFreqIncludeExtended) {
    if (!fs.existsSync(EXT_DIR) || countTxt(EXT_DIR) < 1) {
      logLine(
        'ERROR: frequency step needs locales/sv-se/tests/fixtures/sv-corpus-extended/*.txt. Run --with-extended first, or npm run corpus:build.',
      );
      process.exit(1);
    }
    phases.push({
      id: 'freq_extended',
      label: 'freq baseline + extended token counts (SV_FREQ_INCLUDE_EXTENDED=1)',
      run: () => runNode(SCRIPTS.freq, [], { SV_FREQ_INCLUDE_EXTENDED: '1' }),
      verify: () => verifyFreqJson(),
    });
    phases.push({
      id: 'validate_tiers_after_extended',
      label: 'validate-sv-tiers (after extended ranks)',
      run: () => runNode(SCRIPTS.validate, []),
      verify: () => ({}),
    });
  }

  phases.push(
    {
      id: 'logodds',
      label: 'log-odds → sv-frequencies.json',
      run: () => runNode(SCRIPTS.logodds, []),
      verify: () => verifyLogOdds(),
    },
    {
      id: 'calibrate',
      label: 'calibration report',
      run: () => runNode(SCRIPTS.calibrate, []),
      verify: () => verifyCalibrate(),
    },
  );

  try {
    for (const ph of phases) {
      if (opts.dryRun) {
        console.error(`[dry-run] would run: ${ph.id} — ${ph.label}`);
        continue;
      }
      if (shouldSkip(state, ph.id, opts)) {
        logLine(`SKIP ${ph.id} (resume)`);
        continue;
      }
      logLine(`RUN ${ph.id}: ${ph.label}`);
      try {
        ph.run();
        const extra = ph.verify();
        logLine(`OK ${ph.id} ${JSON.stringify(extra)}`);
        phaseDone(state, ph.id, { detail: extra });
      } catch (stepErr) {
        const sm = stepErr instanceof Error ? stepErr.message : String(stepErr);
        state.phases[ph.id] = { status: 'failed', error: sm, at: new Date().toISOString() };
        saveState(state);
        throw stepErr;
      }
    }

    if (!opts.dryRun && !opts.noTest) {
      if (shouldSkip(state, 'npm_test', opts)) {
        logLine('SKIP npm_test (resume)');
      } else {
        logLine('RUN npm_test');
        runTests();
        phaseDone(state, 'npm_test', {});
        logLine('OK npm_test');
      }
    }

    if (!opts.dryRun) {
      const metrics = readSnapshotMetrics();
      writeSnapshot(
        {
          resume: opts.resume,
          force: opts.force,
          withExtended: opts.withExtended,
          withLm: opts.withLm,
          freqIncludeExtended: opts.freqIncludeExtended,
          noFreqIncludeExtended: opts.noFreqIncludeExtended,
          effectiveFreqIncludeExtended,
          noTest: opts.noTest,
        },
        metrics,
      );
    }

    logLine('sv-pipeline finished OK');
    console.error('\nsv-pipeline: success. See locales/sv-se/references/PIPELINE-SNAPSHOT.md');
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    logLine(`FATAL: ${msg}`);
    state.lastError = { phase: state.phases, message: msg, at: new Date().toISOString() };
    saveState(state);
    console.error(`\nsv-pipeline FAILED: ${msg}`);
    console.error(`Log: ${path.relative(REPO_ROOT, LOG_PATH)}`);
    console.error('Fix the issue, then: node locales/sv-se/scripts/sv-pipeline.mjs --resume');
    process.exit(1);
  }
}

main();
