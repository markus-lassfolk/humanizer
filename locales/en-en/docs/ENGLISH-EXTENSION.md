# English empirical + prescriptive extension (Maeve fork)

Fork baseline: [brandonwise/humanizer](https://github.com/brandonwise/humanizer). This split PR adds English assets/tooling under `locales/en-en/`; runtime wiring stays conservative on `main` unless explicitly enabled in separate runtime changes.

## Coverage model

| Layer                | Mechanism                                       | Source                                                            |
| -------------------- | ----------------------------------------------- | ----------------------------------------------------------------- |
| Mechanical replace   | `autofixes`                                     | TSV → `src/locales/generated/en-prescriptive.js`                  |
| Phrase / regex flags | `phrases`                                       | Hand scaffolds + prescriptive TSV merge in `en/vocabulary.js`     |
| Weighted tiers       | `tier1`–`tier3`                                 | `en/vocabulary.js` + empirical weights from `en-frequencies.json` |
| Empirical n-grams    | Tooling artifact (not runtime-wired by default) | `locales/en-en/references/en-frequencies.json` (log-odds output)  |
| Style packs          | `patternPacks`                                  | `en/pattern-packs.js` (incl. patterns 30–35)                      |
| LM uniformity        | Optional artifact for future/runtime tuning     | `locales/en-en/references/en-ngram-lm.json` (unigram cache)       |

## Layout

| Path                                   | Role                                                                                                                                |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `locales/en-en/references/`            | TSV sources, `en-human-frequency-ranks.json`, `en-frequencies.json`, `empirical-en-tiers.md`, `PIPELINE-SNAPSHOT.md`, `LICENSES.md` |
| `locales/en-en/scripts/`               | `build-en-locale-prescriptive.mjs`, `log-odds-en.mjs`, `calibration-report-en.mjs`, `en-pipeline.mjs`, …                            |
| `tests/` + `tests/fixtures/en-corpus/` | Existing project tests and EN corpus fixtures                                                                                       |
| `tests/fixtures/en-corpus/`            | Seeded human/ai docs, prompts, genres, `human-gold/`                                                                                |

## CLI / API

```bash
node src/cli.js analyze --strict --with-lm -f draft.md
analyze(text, { locale: 'en', strict: true, withLm: true })
```

## Maintainer workflows

**One command (recommended):**

```bash
npm run en:pipeline              # full run; log under locales/en-en/.pipeline/
npm run en:pipeline -- --resume  # skip completed phases
npm run en:pipeline -- --force   # re-run all phases
npm run en:pipeline -- --dry-run # list phases only
npm run en:pipeline -- --no-test # skip npm test at end
```

**Piecemeal:**

```bash
npm run locale:prescriptive-en && npm run locale:prescriptive-en -- --check
npm run materialize:baseline-corpus-en && npm run freq:baseline-en && npm run validate:en-tiers
npm run prompts:seed-en && npm run corpus:seed-en
npm run corpus:logodds-en && node locales/en-en/scripts/build-en-ngram-lm.mjs && npm run corpus:calibrate-en
# optional: OPENAI_API_KEY=... npm run corpus:llm-en
```

## ML score calibration (optional)

The default **0–100 score** is a hand-tuned heuristic (`rawScore` in `analyze()`). You can stack a **logistic regression** layer trained on **human vs AI-labeled** documents:

1. **Human text:** seed corpus `tests/fixtures/en-corpus/human/` + optional **Wikipedia** plain-text under `locales/en-en/data/wiki-human/` (see `data/wiki-human/README.md` for **pre-2023 dumps**).
2. **AI text:** `tests/fixtures/en-corpus/ai/` (expand with `generate-en-llm-corpus.mjs` or your own exports).
3. Build dataset: `npm run en:ml:dataset` → `ml-dataset-en.jsonl` (gitignored).
4. Train: `npm run en:ml:train` → `en-calibrator.json` (gitignored by default).
5. **Enable at runtime:** `HUMANIZER_ML_CALIBRATION=1` (CLI, tests, or MCP). Without this env var, the calibrator file is ignored so small training sets cannot break default scoring.

**Smoke-test API sample (not pre-2023):** `npm run en:wiki:sample` writes random current Wikipedia extracts into `data/wiki-human/`.

Training scripts use `analyze(..., { skipCalibration: true })` so labels are not leaked from an old calibrator.

## Regression gates (current)

- `npm run locale:prescriptive-en -- --check` — EN TSV/codegen consistency.
- `npm run validate:en-tiers` — Tier-1 frequency guard.
- `npm test` — repo-wide test suite.

## Pattern catalogue

See [`../references/patterns-en.md`](../references/patterns-en.md) and [`docs/PATTERNS.md`](../../../docs/PATTERNS.md).
