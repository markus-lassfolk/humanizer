# English AI writing patterns — catalogue

English uses **all** detectors in `src/patterns.js` (1–36). Patterns **1–29** match the shared catalog in [`locales/generic/references/patterns.md`](../../generic/references/patterns.md). This page summarizes **English-specific packs and add-ons** (empirical tiers, prescriptive phrases, and **30–36**).

> Implementation: [`src/locales/en/vocabulary.js`](../../../src/locales/en/vocabulary.js), [`src/locales/en/pattern-packs.js`](../../../src/locales/en/pattern-packs.js), generated [`src/locales/generated/en-prescriptive.js`](../../../src/locales/generated/en-prescriptive.js), empirical [`en-frequencies.json`](./en-frequencies.json), ranks [`en-human-frequency-ranks.json`](./en-human-frequency-ranks.json).

## Prescriptive + tiers (Pattern 7)

- **Tiers 1–3** — high-signal AI words; density rules for tier 3.
- **Phrases** — merged from hand lists + `AI_PHRASES_EN_PRESCRIPTIVE` (TSV codegen).
- **`empiricalExtra`** — n-grams from `en-frequencies.json` after `log-odds-en.mjs`, gated by `en/empirical-filter.js`.

## Style / language packs (30–35)

### 30. Passive voice density

**Signals:** `was/were/has been/...` + common past participles in formal clusters (`was developed`, `has been implemented`, …).

**Before:** The feature was developed in Q1 and has been deployed to all regions.

**After:** We shipped the feature in Q1 and rolled it out region by region.

---

### 31. Adverb density (-ly)

**Signals:** Share of tokens ending in `-ly` (with allow-list); needs ≥ ~80 words.

**Before:** (Padding) The team quickly, quietly, and thoroughly reviewed the data, carefully noting findings.

**After:** The team reviewed the data and listed three findings.

---

### 32. Weasel words

**Signals:** Hedges and unattributed claims: *clearly, obviously, studies show, experts believe*, …

**Before:** Clearly, research shows this is basically optimal.

**After:** In the 2023 trial (n=120), error rate dropped 18% vs baseline.

---

### 33. Clichés

**Signals:** Stock idioms (*at the end of the day, paradigm shift, low-hanging fruit*, …) — density-based list.

**Before:** At the end of the day, it’s a win-win and we should move the needle.

**After:** We cut latency 12% and closed the top three customer tickets.

---

### 34. Redundant phrasing

**Signals:** Tautologies (*PIN number, ATM machine, free gift*, …).

**Before:** Enter your PIN number at the ATM machine.

**After:** Enter your PIN at the ATM.

---

### 35. Inclusive language (strict)

**Signals:** Optional; **only with** `--strict` / `strict: true`. Low-confidence wording hints (*chairman → chair*, *master branch → main*, …).

---

### 36. LM uniformity (n-gram)

**Not a pattern hit.** With `--with-lm`, the analyzer may **raise uniformity score** using `en-ngram-lm.json` (surprise variance on unigrams). No extra pattern rows in findings.

## Autofix

Safe mechanical replacements ship as `AUTOFIXES_EN` from prescriptive TSVs (plain English, style-guide samples, weasel/cliché/redundancy lists, etc.). Run `humanize --autofix` for mechanical cleanup; nuanced edits still need the author.
