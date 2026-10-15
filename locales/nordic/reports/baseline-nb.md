# Norwegian (bokmål) human-prose baseline (2026-10-15)

Corpus: 149 public pages, 88,307 words (Nynorsk pages removed by a marker-word grep), fetched with `locales/nordic/scripts/fetch-human-baseline.mjs` from NSM (via nsm.no), NRK, Datatilsynet and Nkom. Texts are not in the repo (publisher licences). Scored with `analyze(text, { locale: 'nb' })` via `locales/nordic/scripts/baseline-report.mjs`.

| | median | p90 | max |
| --- | --- | --- | --- |
| first draft of the word lists | 4 | 25 | 36 |
| after pruning (`HUMAN_COMMON_*`, empirical gate ≤0.5 % of human texts) | 3 | 15 | 36 |

First-draft fires in human text: NSM, `oppsummert` (5 texts), `det er ingen tvil om at`, `avgjørende` (8), `omfattende`, `robust`. Those words are now in `HUMAN_COMMON_*` or were dropped from the phrase list.

## Model-output sample

65 synthetic LLM-default-style texts (Claude only, ~180 words each, written by a sub-agent; no API key spent). Median score 5, max 47. Formal-register model prose scores only a few points above agency prose at word level, so treat the score as a density signal rather than a detector. The empirical list (`nb-frequencies.json`) is built only from n-grams seen in ≥3 model texts and ≤0.5 % of human texts, with every 4th human text held out; it is small by design.

To broaden the model side, run other models (needs an API key and the owner's OK) and rerun `build-wordlist.mjs`.
