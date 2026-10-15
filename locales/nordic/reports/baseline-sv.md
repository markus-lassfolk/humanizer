# Swedish human-prose baseline (2026-10-15)

Corpus: 111 public pages, 68,317 words, fetched with `locales/nordic/scripts/fetch-human-baseline.mjs`
from CERT-SE (50), MCF (20), IMY (15), PTS (11) and Försvarsmakten (15). The texts are not in the
repo (publisher licences); re-fetch with the script. Scored with `analyze(text, { locale: 'sv' })`
via `locales/nordic/scripts/baseline-report.mjs`. Note: MSB's cyber content has moved to MCF, so
MCF stands in for MSB.

| | median | p90 | max |
| --- | --- | --- | --- |
| before tuning | 31 | 44 | 57 |
| after tuning | 4 | 27 | 42 |

## What fired before tuning (texts out of 111)

Pattern 7 (vocabulary): `stärka` 28, `genom att` 23, `verktyg` 10, `stärkt` 9, `vidare` 8,
`lösningar` 7, `resurser` 7, `genomföra` 7, `stärker` 7, `därför` 6, `utmaningar` 5, `insatser` 5,
`samverkan` 5, `säkerställa` 4, `icke` 4, `dock` 4. Pattern 18 (curly quotes): 36 texts, because ”
and ’ are ordinary Swedish typography. Pattern 8 (`utgör en`): 7. Pattern 11 (synonym cycling
företag/organisation/verksamhet/aktör): 2.

## Tuning (`src/locales/sv`)

- `nativeCurlyQuotes` profile flag turns off Pattern 18 for sv.
- `HUMAN_COMMON_SV` in `vocabulary.js` drops words and phrases that fire in at least 3 of 111 human
  texts from the tiers, phrases and empirical extras. The AI-only n-gram evidence for them came from
  a synthetic corpus, not from human Swedish.
- Removed the `utgör en/ett` row from Pattern 8 and the generic organisation nouns from the Pattern 11
  synonym set.

## Residual (after tuning)

`på grund av` 5, `beslutsfattande` 3, `därutöver` 3, `ekosystem` 2, `i princip` 2, `säkerställer` 2.
The p90 of 27 and max of 42 come from short texts (60 to 200 words) where one or two Pattern 7 hits
dominate; the worst files are Försvarsmakten and CERT-SE news items. Full numbers: `baseline-sv-after.json`.
The shipped sv calibration tests (AI corpus still scores above human) stay green.
