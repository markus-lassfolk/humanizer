# Extending Humanizer with another language

Humanizer's detector engine is shared, but vocabulary, phrase packs, sentence splitting, readability, autofixes, and agent guidance are locale-specific.

This guide describes the shape of a new locale. Use `src/locales/en/` for the smallest example and `src/locales/sv/` + `locales/sv-se/` for a full empirical locale.

## Decide the locale names

Use two related names:

| Layer | Example | Purpose |
|---|---|---|
| Runtime locale | `sv` | CLI/API/MCP value: `--locale sv`, `locale: "sv"`. |
| Skill bundle folder | `sv-se` | Agent-facing docs and references under `locales/<tag>/`. |

For a new language, prefer a short runtime code first (`da`, `de`, `fr`) unless you truly need separate runtime behavior per region.

## Runtime files

Create a folder under `src/locales/<code>/` with the same module names as existing locales:

```text
src/locales/<code>/
├── index.js
├── vocabulary.js
├── pattern-packs.js
└── empirical-filter.js
```

Typical exports:

- vocabulary tiers: Tier 1 / Tier 2 / Tier 3;
- phrases and multi-word patterns;
- function words for type-token and stylometric analysis;
- abbreviations for sentence splitting;
- optional autofixes;
- optional empirical extras;
- readability choice or helper metadata;
- pattern packs keyed by detector id.

Register the locale in `src/locales/index.js`:

```js
const en = require('./en');
const sv = require('./sv');
const da = require('./da');

const LOCALES = { en, sv, da };
```

Add shims only if you need backwards-compatible require paths, for example:

```text
src/locales/da.js
src/locales/da-vocabulary.js
src/locales/da-pattern-packs.js
src/locales/da-empirical-filter.js
```

## Skill bundle files

Create an agent-facing bundle:

```text
locales/<tag>/
├── skill/<code>.md
└── references/
    └── ...
```

The skill file should explain:

- high-signal AI-ish vocabulary in that language;
- filler phrases and mechanical constructions;
- rewrite examples;
- tone guidance;
- CLI/MCP examples using the runtime locale code.

Then update the locale table in `SKILL.md` and [LANGUAGES.md](LANGUAGES.md).

## Pattern packs

Pattern packs let the shared 29 detectors use language-specific phrases and regexes.

Start with the detectors that are language-heavy:

- Pattern 1: significance inflation;
- Pattern 3: superficial `-ing`-style analysis or local equivalent;
- Pattern 4: promotional language;
- Pattern 5: vague attributions;
- Pattern 7: AI vocabulary;
- Pattern 8: copula avoidance / inflated verbs;
- Pattern 10: rule of three;
- Pattern 19-21: chatbot artifacts and sycophancy;
- Pattern 22-24: filler, hedging, generic conclusions;
- Pattern 25/27/28: reasoning artifacts, confidence padding, acknowledgement loops.

Not every pattern needs a locale pack on day one. Missing packs should mean “no locale-specific matches for this detector”, not “crash”.

## Readability and sentence splitting

Add locale-specific abbreviations. This matters; bad sentence splitting makes burstiness and readability noisy.

Examples:

- English protects `Mr.`, `Dr.`, `e.g.`, `i.e.`.
- Swedish protects `t.ex.`, `dvs.`, `bl.a.`, `m.fl.`, `SOU`, `prop.`.

If the language has a standard readability metric, wire it into `src/stats.js` through the locale profile. Swedish uses LIX.

## Autofixes

Autofixes should be safe mechanical replacements, not creative rewrites.

Good autofix candidates:

- bureaucratic filler → plain phrase;
- known blacklist phrases → clearer alternatives;
- repeated chatbot artifacts → removal;
- typographic obfuscation cleanup.

Avoid autofixing anything that changes meaning or legal/technical nuance.

## Tests

Add tests before calling a locale supported.

Minimum recommended tests:

- locale loader accepts the code and rejects unknown codes;
- CLI `--locale <code>` works;
- `score`, `analyze`, `humanize`, and `stats` run without throwing;
- representative AI-ish examples score higher than representative human examples;
- pattern packs fire for known phrases;
- sentence splitter handles common abbreviations;
- autofixes only change intended phrases.

For a full empirical locale, also add:

- calibration fixtures;
- regression tests;
- corpus scripts;
- generated artifact freshness checks.

## Documentation checklist

Update:

- `README.md` language table;
- `docs/LANGUAGES.md`;
- `docs/CLI.md` examples if user-facing;
- `docs/MCP.md` locale enum/docs if MCP schema changes;
- `SKILL.md` locale table;
- `src/locales/README.md` layout table;
- package files list if new artifacts must ship.

## Release checklist

```bash
npm run lint
npm run format:check
npm test
npm run check
node src/cli.js analyze --locale <code> -f path/to/sample.txt
```

If the MCP server exposes a hard-coded locale enum, update and test it too.
