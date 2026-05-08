# Svarta listan — Swedish plain-language replacements

Authoritative legal wording: Statsrådsberedningen *Svarta listan: ord och fraser som kan ersättas i författningsspråk* (PM 2011:1). See [`svarta-listan-source-notes.md`](svarta-listan-source-notes.md).

## Machine-readable source (Phase A)

| File | Role |
|------|------|
| [`svarta-listan-full.tsv`](svarta-listan-full.tsv) | Avoid / prefer / `kind` rows → codegen |
| [`klarsprak-checklist.tsv`](klarsprak-checklist.tsv) | Klarspråk-style phrases and scaffolds |
| [`swenglish-buzzwords.tsv`](swenglish-buzzwords.tsv) | Fresh anglicisms / nyords |

Regenerate locale output:

```bash
npm run locale:prescriptive
```

This writes [`../../../src/locales/generated/sv-prescriptive.js`](../../../src/locales/generated/sv-prescriptive.js), merged from [`../../../src/locales/sv.js`](../../../src/locales/sv.js) as `AUTOFIXES_SV` and `AI_PHRASES_SV_PRESCRIPTIVE` (multi-word **phrases** and **sentence-level** flags, not only single words).

## See also

- [Språkrådet — Klarspråk](https://www.isof.se/svenska-spraket/svenska-spraket-i-finland/svenska-klarsprak)
- [`swedish-ai-vocabulary.md`](swedish-ai-vocabulary.md) — LLM-specific Swedish tells beyond Svarta listan
