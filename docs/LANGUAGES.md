# Supported languages and locale model

Humanizer separates **runtime analyzer locales** from **agent skill bundles**.

- Runtime locales are what the CLI, API, and MCP server execute.
- Skill bundles are prompt/reference folders that help an agent apply the same rules while editing text.

## Runtime analyzer locales

| Locale code | Language | Default? | Status | Notes |
|---|---|---:|---|---|
| `en` | English | Yes | Stable | Vocabulary tiers, prescriptive autofix codegen, empirical n-grams (Pattern 7), patterns 30–35, function words, Flesch-Kincaid; optional `--with-lm` uniformity. See `locales/en-en/docs/ENGLISH-EXTENSION.md`. |
| `sv` | Swedish | No | Stable | Uses Swedish vocabulary tiers, Swedish pattern packs, Swedish abbreviations, LIX readability, empirical n-grams, and Svarta listan/Klarspråk autofixes. |

Use `en` unless you explicitly know the text is Swedish.

```bash
humanizer analyze -f english.md
humanizer analyze --locale sv -f svenska.md
HUMANIZER_LOCALE=sv humanizer score svenska.md
```

Programmatic use:

```js
const { analyze } = require('humanizer/src/analyzer');

const english = analyze(text, { locale: 'en' });
const swedish = analyze(text, { locale: 'sv' });
```

MCP use:

```json
{
  "text": "I dagens snabbt föränderliga digitala landskap...",
  "locale": "sv"
}
```

Unknown locale codes fail fast instead of silently falling back:

```text
Unknown locale "da". Supported locales: en, sv
```

## Agent skill bundles

| Folder | Runtime locale | Purpose |
|---|---:|---|
| `locales/en-en/` | `en` | International English skill guidance, references, **English empirical pipeline** (`scripts/`, `references/`). |
| `locales/en-us/` | `en` | US English packaging/guidance. The runtime analyzer is still `en`. |
| `locales/sv-se/` | `sv` | Swedish skill guidance, references, tests, corpus scripts, and empirical artifacts. |
| `locales/generic/` | n/a | Shared pattern catalogue and style references. |

The folder name can be BCP-47-style (`sv-se`), while the runtime locale can be shorter (`sv`). This lets packaging distinguish dialect or market-specific guidance without forcing separate analyzer implementations before they exist.

## Swedish bundle details

The Swedish locale is not just translated labels. It includes:

- Swedish vocabulary tiers and phrases;
- Swedish pattern packs layered over the shared detector engine;
- Swedish abbreviations for sentence splitting;
- LIX readability instead of Flesch-Kincaid;
- empirical n-grams from `locales/sv-se/references/sv-frequencies.json`;
- Svarta listan / Klarspråk / Swenglish autofixes;
- calibration and regression tests under `locales/sv-se/tests/`.

Useful Swedish references:

- `locales/sv-se/docs/SWEDISH-EXTENSION.md`
- `locales/sv-se/references/patterns-sv.md`
- `locales/sv-se/references/swedish-ai-vocabulary.md`
- `locales/sv-se/references/PIPELINE-SNAPSHOT.md`

Regenerate Swedish derived artifacts:

```bash
npm run sv:pipeline
```

Run the standard checks:

```bash
npm run check
```

## Language detection

Humanizer does not silently auto-detect language today. That is intentional: using the wrong vocabulary creates misleading scores.

Recommended behavior for integrations:

- default to `en`;
- expose a visible locale selector;
- pass `sv` explicitly for Swedish;
- if you add language detection in a wrapper, show the detected locale to the user and allow override.

## Mixed-language documents

For now, run the dominant language explicitly:

```bash
humanizer analyze --locale sv -f mostly-swedish.md
humanizer analyze --locale en -f mostly-english.md
```

For documents with large mixed sections, split the text by language and analyze each section with the matching locale.
