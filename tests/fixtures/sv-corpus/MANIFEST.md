# Swedish calibration corpus (`tests/fixtures/sv-corpus/`)

## Summary

| Directory | Files | Class | Source |
|-----------|-------|-------|--------|
| `human/` | 50 | Human-written (synthetic original) | `scripts/seed-sv-corpus.mjs` |
| `ai/` | 50 | AI-like (synthetic, marker-heavy) | `scripts/seed-sv-corpus.mjs` |

## License

All text in this directory was **generated for this repository** as test data. You may treat it as **MIT** (same as the project) for redistribution.

## Human class (`human/`)

Original Swedish prose across seven genres (news, opinion, fiction, technical, casual, government, academic) plus one misc snippet. Written to avoid deliberate AI vocabulary; may still contain ordinary formal words (e.g. *beslutade*, *redogörelse*).

## AI class (`ai/`)

Template-generated Swedish saturated with patterns from `src/locales/sv.js` (loan translations, Swenglish, chatbot phrases). Used as **positive labels** for ROC/calibration — not a sample of a specific commercial LLM.

## Regeneration

```bash
node scripts/seed-sv-corpus.mjs
```

## Extended research corpus

Optional larger dumps (Wikipedia-sv, Korp) go to `tests/fixtures/sv-corpus-extended/` via `scripts/build-corpus-extended.mjs` (gitignored).
