# Humanizer — Norwegian (bokmål) locale (`nb`)

When input text is in Norwegian (bokmål), use `locale: "nb"` (or `--locale nb` on the CLI, or `HUMANIZER_LOCALE=nb`). Apply this file together with the main Humanizer skill.

## What `nb` activates

- **Pattern catalogue** — English packs stay as the base (mixed-language text); Norwegian (bokmål) rows are added for significance inflation, promotional language, vague attribution, challenges/outlook formulas, copula avoidance, false ranges, reasoning-chain, confidence markers and chatbot acknowledgements, plus buzzy adjective triads and abstract-noun triads.
- **Vocabulary** — curated Tier 1–3 words and phrases built from Nordic LLM calques ("dykke ned i", "i dagens digitale landskap"), **not** translated from the English list. Words that plain professional prose uses (see `HUMAN_COMMON_*` in `src/locales/nb/vocabulary.js`) are deliberately excluded.
- **Empirical data** — `locales/nb-no/references/nb-frequencies.json`: unigram–trigram log-odds against a human baseline (NSM, NRK, Datatilsynet, Nkom), gated like the sv filter (≥3 model texts, ≤0.5 % of human texts, holdout check). Multi-word n-grams only are scored (Pattern 7 `empiricalExtra`).
- **LIX readability**, native curly quotes (Pattern 18 off), nb abbreviations and function words, and mechanical autofixes (fx: «dykke ned i» → «se på», «banebrytende» → «ny»).

## Rewrite principles

- Prefer concrete facts (dates, numbers, names) over inflated framing.
- Do not back-translate English suggestions; use the native plain-language equivalent.
- Do not replace AI-isms with consultant-speak.

## Before/after

**Before:**
> I dagens digitale landskap er det viktig å merke seg at bedrifter må dykke ned i de mangefasetterte utfordringene som sømløs integrasjon medfører. Banebrytende løsninger låser opp potensialet.

**After:**
> Tre av fire prosjekter går over tid, oftest fordi kravene endres underveis.

## Limits

Model-output sample is small and from one model family; formal-register model prose is hard to separate from agency prose at word level, so the score is a density signal, not a detector. See [`references/README.md`](../references/README.md).
