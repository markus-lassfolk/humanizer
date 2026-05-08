# Swedish calibration corpus (`locales/sv-se/tests/fixtures/sv-corpus/`)

## Committed vs gitignored

Directories under this folder (`human/`, `ai/`, `human-gold/`, `prompts/`) are **committed** so tests and calibration work from a fresh clone. Bulk or fetched source text lives elsewhere: `sv-corpus-extended/` (Wikipedia), `ai-llm/` (API), and optional `locales/sv-se/data/raw/` are **gitignored**; scripts fold their content into **committed** outputs like `references/sv-frequencies.json` when you run the pipeline.

## Summary

| Directory | Files | Class | Source |
|-----------|-------|-------|--------|
| `human/` | 50 | Human-written (synthetic original) | `locales/sv-se/scripts/seed-sv-corpus.mjs` |
| `human-gold/` | 1+ | Human-style licensed/original excerpts | Curated (see file headers) |
| `ai/` | 50 | AI-like (synthetic, marker-heavy) | `locales/sv-se/scripts/seed-sv-corpus.mjs` |
| `prompts/` | 200 | Swedish generation instructions | `locales/sv-se/scripts/seed-sv-prompts.mjs` |
| `ai-llm/` | (optional) | Multi-model LLM outputs | `locales/sv-se/scripts/generate-sv-llm-corpus.mjs` (gitignored) |

## License

Synthetic dirs (`human/`, `ai/`, `prompts/`) are **MIT** (same as the project). `human-gold/` files carry a short license note in each file.

## Human class (`human/`)

Original Swedish prose across seven genres (news, opinion, fiction, technical, casual, government, academic) plus one misc snippet. Written to avoid deliberate AI vocabulary; may still contain ordinary formal words (e.g. *beslutade*, *redogörelse*).

## Human gold (`human-gold/`)

Extra **human** documents for calibration and log-odds (formal register, real-world structure). Filenames use `human-{genre}-gold-…` so genre stats match the `human-{genre}-NN` convention.

## AI class (`ai/`)

Template-generated Swedish saturated with patterns from `src/locales/sv/` (vocabulary + pattern packs) (loan translations, Swenglish, chatbot phrases). Used as **positive labels** for ROC/calibration — not a sample of a specific commercial LLM until you add `ai-llm/`.

## Prompts (`prompts/`)

YAML-frontmatter prompt bank for `npm run corpus:llm`. Does not change the default synthetic `ai/` corpus unless you generate and merge LLM outputs yourself.

## Regeneration

```bash
node locales/sv-se/scripts/seed-sv-corpus.mjs
node locales/sv-se/scripts/seed-sv-prompts.mjs
```

## Extended research corpus

Optional larger dumps (Wikipedia-sv, Korp) go to `locales/sv-se/tests/fixtures/sv-corpus-extended/` via `locales/sv-se/scripts/build-corpus-extended.mjs` (gitignored). For **committed** human frequency ranks, extended text is opt-in: `SV_FREQ_INCLUDE_EXTENDED=1 npm run freq:baseline`.
