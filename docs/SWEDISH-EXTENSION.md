# Swedish language support (Maeve fork)

Fork baseline: [brandonwise/humanizer](https://github.com/brandonwise/humanizer). Upstream remains **English-first**; this fork ships a first-class **`sv`** locale.

## What ships in v2.6

| Area | Implementation |
|------|----------------|
| Locale profile | [`src/locales/sv.js`](../src/locales/sv.js) — tiers, phrases, `functionWords`, `abbreviations`, `autofixes`, `readability: 'lix'` |
| Pattern 7 (AI vocabulary) | Uses `localeProfile.tier1/2/3` + `phrases` + **`empiricalExtra`** (multi-word n-grams from the JSON); supports `{ word, weight }` and `matchWeight` in scoring |
| Phrase detection | Swedish `(ta bort …)` fixes are **not** filtered out (English-only noise filter still applies to `en`) |
| Empirical weights | [`references/sv-frequencies.json`](../references/sv-frequencies.json) boosts curated tier hits when keys match |
| Empirical extras | Same JSON drives **automatic** Pattern 7 matches for high–log-odds **2–4 word** phrases not already in tiers (see [`src/locales/sv-empirical-filter.js`](../src/locales/sv-empirical-filter.js)); unigrams are excluded to avoid stopword skew |
| npm bundle | `package.json` **`files`** includes `references/`, `reports/`, `scripts/` so installs ship empirical tables and refresh tooling |
| Gold corpus | [`tests/fixtures/sv-corpus/`](../tests/fixtures/sv-corpus/) — 50 human + 50 AI synthetic docs + [`MANIFEST.md`](../tests/fixtures/sv-corpus/MANIFEST.md) |
| Calibration report | [`reports/calibration-sv-latest.json`](../reports/calibration-sv-latest.json) — ROC-AUC, means, per-pattern stats |
| Extended corpus (optional) | [`scripts/build-corpus-extended.mjs`](../scripts/build-corpus-extended.mjs) → `tests/fixtures/sv-corpus-extended/` (gitignored) |

## CLI / API

- `node src/cli.js analyze --locale sv`
- `HUMANIZER_LOCALE=sv node src/cli.js score file.txt`
- Programmatic: `analyze(text, { locale: 'sv' })`, `autoFix(text, { locale: 'sv' })`

## Maintainer workflows

```bash
# Regenerate synthetic corpus, log-odds table, and calibration JSON/MD
npm run corpus:refresh

# Pieces
npm run corpus:seed
npm run corpus:logodds
npm run corpus:calibrate

# Optional: pull Swedish Wikipedia extracts into extended/ (requires network)
npm run corpus:build
```

## Sources of truth for vocabulary

1. **Prescriptive:** Statsrådsberedningen *Svarta listan* (PM 2011:1) — autofixes + phrase-level flags ([`references/svarta-listan.md`](../references/svarta-listan.md)).
2. **English calques:** Tier 1 in [`src/vocabulary.js`](../src/vocabulary.js) mapped to Swedish in `sv.js`.
3. **Empirical:** Log-odds of AI-labelled vs human-labelled corpus tokens → [`references/empirical-sv-tiers.md`](../references/empirical-sv-tiers.md).

## Regression gates

- `tests/calibration.sv.test.js` — fixture thresholds (`sv-ai-sample-1`, human samples, formal public sector).
- `tests/calibration.sv.regression.test.js` — committed `reports/calibration-sv-latest.json` (AUC ≥ 0.92, per-pattern precision ≥ 0.85 when enough hits).

## Related upstream work

Multilingual architecture improvements may still be proposed upstream; language-agnostic detector changes belong there, Swedish data and tests stay in this fork until merged.
