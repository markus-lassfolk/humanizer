# Swedish language support (Maeve fork)

Fork baseline: [brandonwise/humanizer](https://github.com/brandonwise/humanizer). Upstream remains **English-first**; this fork ships a first-class **`sv`** locale.

## Coverage model: words, phrases, sentences

| Layer | Mechanism | Source |
|-------|-----------|--------|
| Mechanical replace | `autofixes` | TSV → `src/locales/generated/sv-prescriptive.js` |
| Phrase / regex flags | `phrases` | Hand-tuned scaffolds in `sv.js` + prescriptive TSV |
| Weighted tiers | `tier1`–`tier3` | `sv.js` + `locales/sv-se/references/sv-frequencies.json` weights |
| Empirical n-grams | `empiricalExtra` (Pattern 7) | `locales/sv-se/references/sv-frequencies.json` from log-odds (1–4-grams, filtered) |

**Sentences:** hand-maintained regexes in `AI_PHRASES_SV_HAND` catch variable slots (e.g. `genom att .{3,120} kan vi`). Prescriptive TSV adds hundreds of **fixed** multi-word phrases from Svarta listan and Klarspråk.

## What ships in v2.6+

| Area | Implementation |
|------|----------------|
| Locale profile | [`src/locales/sv.js`](../../../src/locales/sv.js) — tiers, hand phrases, merged prescriptive phrases/autofixes |
| Prescriptive codegen | [`scripts/build-sv-locale-prescriptive.mjs`](../scripts/build-sv-locale-prescriptive.mjs) ← `references/*.tsv` |
| Tier vs frequency | [`references/sv-human-frequency-ranks.json`](../references/sv-human-frequency-ranks.json) + [`scripts/validate-sv-tiers.mjs`](../scripts/validate-sv-tiers.mjs) |
| Pattern 7 | `localeProfile.tier1/2/3` + `phrases` + **`empiricalExtra`**; [`src/locales/sv-empirical-filter.js`](../../../src/locales/sv-empirical-filter.js) |
| Empirical weights | [`references/sv-frequencies.json`](../references/sv-frequencies.json) |
| Gold corpus | [`tests/fixtures/sv-corpus/`](../tests/fixtures/sv-corpus/) — synthetic human/ai + `human-gold/` + `prompts/` (under `locales/sv-se/`) |
| Calibration | [`reports/calibration-sv-latest.json`](../../../reports/calibration-sv-latest.json) — global + **perGenre** stats |
| Extended corpus (optional) | [`scripts/build-corpus-extended.mjs`](../scripts/build-corpus-extended.mjs) → `locales/sv-se/tests/fixtures/sv-corpus-extended/` (gitignored) |

## CLI / API

- `node src/cli.js analyze --locale sv`
- `HUMANIZER_LOCALE=sv node src/cli.js score file.txt`
- Programmatic: `analyze(text, { locale: 'sv' })`, `autoFix(text, { locale: 'sv' })`

## Maintainer workflows

```bash
# Prescriptive tables → generated JS (also runs in npm run check)
npm run locale:prescriptive
npm run locale:prescriptive -- --check

# Human frequency proxy → ranks JSON (excludes sv-corpus-extended unless SV_FREQ_INCLUDE_EXTENDED=1)
npm run materialize:baseline-corpus   # optional: refresh locales/sv-se/references/baseline-corpus-sv.txt
npm run freq:baseline
npm run validate:sv-tiers

# Synthetic corpus + empirical pipeline
npm run corpus:refresh          # seed + log-odds + calibrate

# Prompt bank (~200) for optional LLM class
npm run prompts:seed

# Optional: real LLM outputs → locales/sv-se/tests/fixtures/sv-corpus/ai-llm/ (gitignored)
export OPENAI_API_KEY=...
npm run corpus:llm
npm run corpus:logodds && npm run corpus:calibrate

# Optional: Swedish Wikipedia extracts into extended/ (requires network)
npm run corpus:build
SV_FREQ_INCLUDE_EXTENDED=1 npm run freq:baseline
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
