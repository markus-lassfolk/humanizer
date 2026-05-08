# Swedish language support (Maeve fork)

Fork baseline: [brandonwise/humanizer](https://github.com/brandonwise/humanizer). Upstream remains **English-first**; this fork ships a first-class **`sv`** locale.

## Coverage model: words, phrases, sentences

| Layer | Mechanism | Source |
|-------|-----------|--------|
| Mechanical replace | `autofixes` | TSV → `src/locales/generated/sv-prescriptive.js` |
| Phrase / regex flags | `phrases` | Hand-tuned scaffolds in `sv/vocabulary.js` + prescriptive TSV |
| Weighted tiers | `tier1`–`tier3` | `sv/vocabulary.js` + `locales/sv-se/references/sv-frequencies.json` weights |
| Empirical n-grams | `empiricalExtra` (Pattern 7) | `locales/sv-se/references/sv-frequencies.json` from log-odds (1–4-grams, filtered) |

**Sentences:** hand-maintained regexes in `AI_PHRASES_SV_HAND` catch variable slots (e.g. `genom att .{3,120} kan vi`). Prescriptive TSV adds hundreds of **fixed** multi-word phrases from Svarta listan and Klarspråk.

## What ships in v2.6+

| Area | Implementation |
|------|----------------|
| Locale profile | [`src/locales/sv/index.js`](../../../src/locales/sv/index.js) — wires `vocabulary.js` (tiers, hand phrases, prescriptive merge), `pattern-packs.js`, `empirical-filter.js` |
| **Pattern catalogue** | [`references/patterns-sv.md`](../references/patterns-sv.md) — Swedish-language walk-through of all 29 detectors with the SV signals they fire on |
| Prescriptive codegen | [`scripts/build-sv-locale-prescriptive.mjs`](../scripts/build-sv-locale-prescriptive.mjs) ← `references/*.tsv` |
| Tier vs frequency | [`references/sv-human-frequency-ranks.json`](../references/sv-human-frequency-ranks.json) + [`scripts/validate-sv-tiers.mjs`](../scripts/validate-sv-tiers.mjs) |
| Pattern 7 | `localeProfile.tier1/2/3` + `phrases` + **`empiricalExtra`** (built in [`sv/vocabulary.js`](../../../src/locales/sv/vocabulary.js)); rules in [`sv/empirical-filter.js`](../../../src/locales/sv/empirical-filter.js) (shim: `sv-empirical-filter.js`) |
| Empirical weights | [`references/sv-frequencies.json`](../references/sv-frequencies.json) |
| Gold corpus | [`tests/fixtures/sv-corpus/`](../tests/fixtures/sv-corpus/) — synthetic human/ai + `human-gold/` + `prompts/` (under `locales/sv-se/`) |
| Calibration | [`reports/calibration-sv-latest.json`](../../../reports/calibration-sv-latest.json) — global + **perGenre** stats |
| Extended corpus (optional) | [`scripts/build-corpus-extended.mjs`](../scripts/build-corpus-extended.mjs) → `locales/sv-se/tests/fixtures/sv-corpus-extended/` (gitignored) |

## CLI / API

- `node src/cli.js analyze --locale sv`
- `HUMANIZER_LOCALE=sv node src/cli.js score file.txt`
- Programmatic: `analyze(text, { locale: 'sv' })`, `autoFix(text, { locale: 'sv' })`

## What we commit vs keep local

**In GitHub:** curated locale data and small fixtures so the project works without running pipelines first (`references/*`, generated `sv-prescriptive.js`, `sv-corpus` human/ai/gold/prompts, calibration snapshot JSON, etc.).

**Gitignored (re-download / regenerate):** bulky or non-deterministic source material—Wikipedia extended extracts (`sv-corpus-extended/`), optional LLM outputs (`ai-llm/`), pipeline logs under `.pipeline/`, and optionally large hand-placed dumps under `locales/sv-se/data/raw/` if you add that layout for future corpora.

## Maintainer workflows

**One command (recommended):** regenerates prescriptive JS, baseline text, frequency ranks, prompts, synthetic corpus, log-odds, calibration; verifies each step; runs tests; writes [`references/PIPELINE-SNAPSHOT.md`](../references/PIPELINE-SNAPSHOT.md).

```bash
npm run sv:pipeline              # full run; fails fast with log under locales/sv-se/.pipeline/
npm run sv:pipeline -- --resume   # continue after a failed phase
npm run sv:pipeline -- --force      # ignore saved state
npm run sv:pipeline -- --dry-run    # list phases only
npm run sv:pipeline -- --with-extended   # Wikipedia fetch + freq ranks incl. extended/ + validate + log-odds merge
npm run sv:pipeline -- --freq-include-extended   # only extended-aware freq + validate (extended/*.txt must exist)
npm run sv:pipeline -- --with-extended --no-freq-include-extended   # Wikipedia for log-odds only; ranks stay baseline-only
```

**Going further (optional):** run `OPENAI_API_KEY=… npm run corpus:llm` before `corpus:logodds` for extra AI-class n-grams; consider larger human gold or corpus exports (e.g. Korp/SUC) for rank calibration; add post-checks (e.g. `uniqueTypes` growth after extended) if you want stricter CI.

Manual steps (same as the pipeline; use when debugging a single piece):

```bash
npm run locale:prescriptive && npm run locale:prescriptive -- --check
npm run materialize:baseline-corpus && npm run freq:baseline && npm run validate:sv-tiers
npm run prompts:seed && npm run corpus:seed
npm run corpus:logodds && npm run corpus:calibrate
# optional: npm run corpus:build
# optional: OPENAI_API_KEY=... npm run corpus:llm
```

## Sources of truth for vocabulary

1. **Prescriptive:** TSV files (Svarta listan, Klarspråk, Swenglish) → codegen; see [`references/svarta-listan.md`](../references/svarta-listan.md).
2. **Descriptive proxy:** [`references/baseline-corpus-sv.txt`](../references/baseline-corpus-sv.txt) + committed `human/` (+ optional `human-gold/`) → `sv-human-frequency-ranks.json`.
3. **Empirical:** Log-odds of AI-labelled vs human-labelled text → [`references/empirical-sv-tiers.md`](../references/empirical-sv-tiers.md) (optional `ai-llm/` merged into AI class).

## Regression gates

- `locales/sv-se/tests/calibration.sv.test.js` — fixture thresholds (`sv-ai-sample-1`, human samples, formal public sector).
- `locales/sv-se/tests/calibration.sv.regression.test.js` — committed `reports/calibration-sv-latest.json` (AUC ≥ 0.92, per-pattern precision ≥ 0.85 when enough hits, **government** human ceiling).
- `locales/sv-se/tests/sv-prescriptive-uptodate.test.js` — TSV and `sv-prescriptive.js` in sync.

## Related upstream work

Multilingual architecture improvements may still be proposed upstream; language-agnostic detector changes belong there, Swedish data and tests stay in this fork until merged.
