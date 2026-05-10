# Runtime locales (`src/locales`)

Each supported language uses the **same file names** under its own folder. Optional **shim files** at this directory’s root keep old `require()` paths working (e.g. `en-vocabulary.js` → `en/vocabulary.js`).

## Layout

| Path                               | Role                                                                         |
| ---------------------------------- | ---------------------------------------------------------------------------- |
| **`en/vocabulary.js`**             | English tiers, phrases, function words                                       |
| **`en/pattern-packs.js`**          | English `patternPacks` for detectors                                         |
| **`en/empirical-filter.js`**       | No-op stubs (English has no `empiricalExtra`)                                |
| **`en/index.js`**                  | English profile (`loadLocale('en')`)                                         |
| **`scoring-defaults.js`**          | `DEFAULT_SCORING_KNOBS` fallback + `mergeScoringKnobs(profile)`              |
| **`sv/vocabulary.js`**             | Swedish tiers, phrases, abbreviations, autofixes, **`empiricalExtra`** build |
| **`sv/pattern-packs.js`**          | Swedish `patternPacks` (English baseline + Swedish rows)                     |
| **`sv/empirical-filter.js`**       | Gates for corpus n-grams / Pattern 7 extras                                  |
| **`sv/index.js`**                  | Swedish profile (`loadLocale('sv')`)                                         |
| **`generated/sv-prescriptive.js`** | Built from TSV (prescriptive phrases + autofixes)                            |

## Shims (same names, all languages)

| English                  | Swedish                  |
| ------------------------ | ------------------------ |
| `en.js`                  | `sv.js`                  |
| `en-vocabulary.js`       | `sv-vocabulary.js`       |
| `en-pattern-packs.js`    | `sv-pattern-packs.js`    |
| `en-empirical-filter.js` | `sv-empirical-filter.js` |

Loader: **`index.js`** (`loadLocale`).

## Composite scoring (`scoring`)

Each locale profile may export optional `scoring`:
`{ densityCoef, densityCap, breadthMult, breadthCap, categoryMult, categoryCap, patternWeight }`.

If omitted, the analyzer uses `DEFAULT_SCORING_KNOBS` from `scoring-defaults.js`.
