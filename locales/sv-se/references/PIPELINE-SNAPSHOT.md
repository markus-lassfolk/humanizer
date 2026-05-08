# Swedish pipeline snapshot

<!-- sv-pipeline:snapshot:start -->
> **Auto-generated** by `locales/sv-se/scripts/sv-pipeline.mjs`. Do not edit between markers.

| Field | Value |
|-------|-------|
| Generated at (UTC) | 2026-05-08T22:25:54.360Z |
| Prescriptive autofixes | 65 |
| Prescriptive phrase rows | 114 |
| Baseline corpus lines | 6000 |
| Frequency ranks (unique types) | 740 |
| Frequency ranks (total tokens) | 51872 |
| Prompt files | 200 |
| Corpus human / AI docs | 50 / 50 |
| Extended corpus (wiki) | 74 files in locales/sv-se/tests/fixtures/sv-corpus-extended (log-odds merges these into human side when present) |
| Frequency ranks used `sv-corpus-extended/` tokens | no (baseline + human + gold only) |
| sv-frequencies.json keys | 198 |
| Calibration AUC | 1 |
| Calibration mean score (human / AI) | 2.08 / 66.16 |
| Calibration corpus human / AI (report) | 51 / 50 |
| Government genre mean human (report) | 0.38 |

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

## Last run flags

```json
{
  "resume": false,
  "force": false,
  "withExtended": false,
  "freqIncludeExtended": false,
  "noFreqIncludeExtended": false,
  "effectiveFreqIncludeExtended": false,
  "noTest": true,
  "node": "v22.22.2"
}
```

## Resume / errors

- State file: `locales/sv-se/.pipeline/state.json` (gitignored)
- Full log: `locales/sv-se/.pipeline/last-run.log` (gitignored)
- Re-run with `--resume` after fixing a failure; use `--force` to ignore state.

<!-- sv-pipeline:snapshot:end -->








