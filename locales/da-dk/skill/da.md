# Humanizer — Danish locale (`da`)

When input text is in Danish, use `locale: "da"` (or `--locale da` on the CLI, or `HUMANIZER_LOCALE=da`). Apply this file together with the main Humanizer skill.

## What `da` activates

- **Pattern catalogue** — English packs stay as the base (mixed-language text); Danish rows are added for significance inflation, promotional language, vague attribution, challenges/outlook formulas, copula avoidance, false ranges, reasoning-chain, confidence markers and chatbot acknowledgements, plus buzzy adjective triads and abstract-noun triads.
- **Vocabulary** — curated Tier 1–3 words and phrases built from Nordic LLM calques ("dykke ned i", "i dagens digitale landskap"), **not** translated from the English list. Words that plain professional prose uses (see `HUMAN_COMMON_*` in `src/locales/da/vocabulary.js`) are deliberately excluded.
- **Empirical data** — `locales/da-dk/references/da-frequencies.json`: unigram–trigram log-odds against a human baseline (CFCS, DR, Datatilsynet, Digst, FE), gated like the sv filter (≥3 model texts, ≤0.5 % of human texts, holdout check). Multi-word n-grams only are scored (Pattern 7 `empiricalExtra`).
- **LIX readability**, native curly quotes (Pattern 18 off), da abbreviations and function words, and mechanical autofixes (fx: «dykke ned i» → «se på», «banebrydende» → «ny»).

## Rewrite principles

- Prefer concrete facts (dates, numbers, names) over inflated framing.
- Do not back-translate English suggestions; use the native plain-language equivalent.
- Do not replace AI-isms with consultant-speak.

## Before/after

**Before:**
> I nutidens digitale landskab er det vigtigt at bemærke, at virksomheder må dykke ned i de mangefacetterede udfordringer, som sømløs integration medfører. Banebrydende løsninger åbner op for potentialet.

**After:**
> Tre ud af fire projekter overskrider tiden, oftest fordi kravene ændres undervejs.

## Limits

Model-output sample is small and from one model family; formal-register model prose is hard to separate from agency prose at word level, so the score is a density signal, not a detector. See [`references/README.md`](../references/README.md).
