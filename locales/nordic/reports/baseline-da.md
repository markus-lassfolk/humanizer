# Danish human-prose baseline (2026-10-15)

Corpus: 190 public pages, 168,045 words, fetched with `locales/nordic/scripts/fetch-human-baseline.mjs` from CFCS (samsik), DR, Datatilsynet.dk, Digst and FE. Texts are not in the repo (publisher licences). Scored with `analyze(text, { locale: 'da' })` via `locales/nordic/scripts/baseline-report.mjs`.

| | median | p90 | max |
| --- | --- | --- | --- |
| first draft of the word lists | 5 | 28 | 45 |
| after pruning (`HUMAN_COMMON_*`, empirical gate ≤0.5 % of human texts) | 4 | 17 | 34 |

First-draft fires in human text: `afgørende`/`er afgørende for`, `omfattende`, `innovative`, `har i dag`, `de første`, `at forbedre`. Those words are now in `HUMAN_COMMON_*` or were dropped from the phrase list.

## Model-output sample

63 synthetic LLM-default-style texts (Claude only, ~180 words each, written by a sub-agent; no API key spent). Median score 8, max 56. Formal-register model prose scores only a few points above agency prose at word level, so treat the score as a density signal rather than a detector. The empirical list (`da-frequencies.json`) is built only from n-grams seen in ≥3 model texts and ≤0.5 % of human texts, with every 4th human text held out; it is small by design.

To broaden the model side, run other models (needs an API key and the owner's OK) and rerun `build-wordlist.mjs`.
