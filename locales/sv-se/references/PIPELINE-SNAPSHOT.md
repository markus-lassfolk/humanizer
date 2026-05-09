# Swedish pipeline snapshot

<!-- sv-pipeline:snapshot:start -->
> **Auto-generated** by `locales/sv-se/scripts/sv-pipeline.mjs`. Do not edit between markers.

| Field | Value |
|-------|-------|
| Generated at (UTC) | 2026-05-09T10:58:46.640Z |
| Prescriptive autofixes | 65 |
| Prescriptive phrase rows | 210 |
| Pattern pack rows (weasel / cliché / redundancy / passive / inclusive) | 95 / 163 / 75 / 40 / 35 |
| Baseline corpus lines | 6000 |
| Frequency ranks (unique types) | 767 |
| Frequency ranks (total tokens) | 52352 |
| Prompt files | 230 |
| Corpus human / AI docs | 60 / 60 |
| Extended corpus (wiki) | 74 files in locales/sv-se/tests/fixtures/sv-corpus-extended (log-odds merges these into human side when present) |
| Frequency ranks used `sv-corpus-extended/` tokens | no (baseline + human + gold only) |
| sv-frequencies.json keys | 185 |
| Calibration AUC | 1 |
| Calibration mean score (human / AI) | 5.48 / 74.33 |
| Calibration corpus human / AI (report) | 61 / 60 |
| Government genre mean human (report) | 26.38 |
| Marketing genre mean human (report) | 2 |
| N-gram LM (sv-ngram-lm.json tokens) | 52352 |

## Outputs touched by a full run

| Artifact | Path |
|----------|------|
| Generated locale | `src/locales/generated/sv-prescriptive.js` |
| Baseline text | `locales/sv-se/references/baseline-corpus-sv.txt` |
| Human frequency ranks | `locales/sv-se/references/sv-human-frequency-ranks.json` |
| Empirical JSON + MD | `locales/sv-se/references/sv-frequencies.json`, `empirical-sv-tiers.md` |
| Calibration | `reports/calibration-sv-latest.json` (+ dated `.md`) |
| Synthetic corpus | `locales/sv-se/tests/fixtures/sv-corpus/human/`, `ai/` |
| Prompt bank | `locales/sv-se/tests/fixtures/sv-corpus/prompts/` |
| Swedish n-gram LM | `locales/sv-se/references/sv-ngram-lm.json` (optional, `--with-lm` / `npm run lm:build-sv`) |

## Last run flags

```json
{
  "resume": true,
  "force": false,
  "withExtended": false,
  "withLm": false,
  "freqIncludeExtended": false,
  "noFreqIncludeExtended": false,
  "effectiveFreqIncludeExtended": false,
  "noTest": false,
  "node": "v22.22.2"
}
```

## Resume / errors

- State file: `locales/sv-se/.pipeline/state.json` (gitignored)
- Full log: `locales/sv-se/.pipeline/last-run.log` (gitignored)
- Re-run with `--resume` after fixing a failure; use `--force` to ignore state.

<!-- sv-pipeline:snapshot:end -->









