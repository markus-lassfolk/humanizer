# Humanizer

Humanizer is a local, explainable detector and cleanup assistant for AI-looking writing. It scores text, shows the patterns that fired, and suggests edits that make drafts sound more like a specific human wrote them.

It runs as:

- a **CLI** for files, stdin, folders, and CI gates;
- an **MCP server** for Claude Desktop, VS Code, Cursor, OpenClaw, and other MCP-capable tools;
- an **OpenClaw skill** for agent-native writing review;
- a small **Node.js API** for direct integration.

No hosted API key is required for the core analyzer.

## Quick start

```bash
git clone https://github.com/markus-lassfolk/humanizer.git
cd humanizer
npm ci

# English is the default locale
echo "This serves as a testament to innovation." | node src/cli.js score

# Swedish uses the explicit sv locale
echo "I dagens snabbt föränderliga digitala landskap..." | node src/cli.js analyze --locale sv

# Install the CLI command from this checkout
npm install -g .
humanizer humanize --autofix -f draft.md
```

## Supported languages

Humanizer currently ships two runtime analyzer locales:

| Runtime locale | Language | Status                  | What it includes                                                                                                                              |
| -------------- | -------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `en`           | English  | Default / stable        | 29 detectors, English vocabulary tiers, phrase packs, function words, Flesch-Kincaid readability                                              |
| `sv`           | Swedish  | Stable, explicit opt-in | Swedish vocabulary tiers, Swedish pattern packs, Svarta listan/Klarspråk autofixes, Swedish abbreviations, LIX readability, empirical n-grams |

Agent skill bundles are packaged by BCP-47-style folder:

| Skill bundle     | Runtime locale | Use for                         |
| ---------------- | -------------: | ------------------------------- |
| `locales/en-en/` |           `en` | International English guidance  |
| `locales/en-us/` |           `en` | US English packaging/guidance   |
| `locales/sv-se/` |           `sv` | Swedish guidance and references |

Humanizer does **not** silently auto-detect language today. Pass `--locale sv`, `HUMANIZER_LOCALE=sv`, or `locale: "sv"` in MCP/API calls for Swedish text.

See [docs/LANGUAGES.md](docs/LANGUAGES.md) for the language matrix and [docs/EXTENDING_LOCALES.md](docs/EXTENDING_LOCALES.md) for adding another language.

## CLI

```bash
# Quick score, 0-100 where higher means more AI-like
humanizer score < draft.txt

# Full report with pattern matches and statistics
humanizer analyze -f draft.md --verbose

# Markdown report for review artifacts
humanizer report article.md > humanizer-report.md

# Suggestions only
humanizer suggest draft.md

# Humanization guidance, with safe mechanical fixes
humanizer humanize --autofix -f draft.md

# Swedish
humanizer analyze --locale sv -f svensk-text.md
HUMANIZER_LOCALE=sv humanizer score svensk-text.md

# Scan a docs folder and fail CI if any file scores too high
humanizer scan docs --ext md,txt --fail-above 45

# Baseline-aware CI gate: fail only on regressions
humanizer scan docs --json > .humanizer-baseline.json
humanizer scan docs --baseline .humanizer-baseline.json --fail-on-regression
```

See [docs/CLI.md](docs/CLI.md) for the full command reference, config file format, CI examples, and locale examples.

## MCP server

The MCP server exposes four tools:

- `score`
- `analyze`
- `humanize`
- `stats`

Run it from this checkout:

```bash
cd mcp-server
npm install
node index.js
```

Claude Desktop example:

```json
{
  "mcpServers": {
    "humanizer": {
      "command": "node",
      "args": ["/absolute/path/to/humanizer/mcp-server/index.js"]
    }
  }
}
```

All MCP tools accept `locale: "en"` or `locale: "sv"`.

See [docs/MCP.md](docs/MCP.md) for Claude Desktop, VS Code/Cursor-style configs, tool schemas, and troubleshooting.

## OpenClaw and other agent systems

Humanizer can be used in agent systems in two ways:

1. **As a callable tool** via CLI or MCP.
2. **As always-on writing guidance** via `SKILL.md` and the locale skill fragments under `locales/<tag>/skill/`.

For OpenClaw-style skill installs, keep these files together so relative links work:

```text
humanizer/
├── SKILL.md
└── locales/
    ├── en-en/skill/en.md
    ├── en-us/skill/en.md
    └── sv-se/skill/sv.md
```

Manual install example:

```bash
mkdir -p ~/.openclaw/skills/humanizer
cp SKILL.md ~/.openclaw/skills/humanizer/SKILL.md
cp -R locales ~/.openclaw/skills/humanizer/
```

If your agent platform only supports one prompt file, merge `SKILL.md` with the relevant locale file, for example `locales/sv-se/skill/sv.md` for Swedish.

See [docs/AGENTS.md](docs/AGENTS.md) for OpenClaw, Claude/Cursor-style agents, CI bots, and always-on writing rules.

## Programmatic use

```js
const { analyze, score } = require('humanizer/src/analyzer');
const { humanize } = require('humanizer/src/humanizer');

const result = analyze(text, {
  locale: 'sv', // 'en' by default
  verbose: true,
  includeStats: true,
  ignoreCode: true,
});

console.log(result.score);
console.log(result.findings);

const suggestions = humanize(text, {
  locale: 'sv',
  autofix: true,
});
```

## How scoring works

Humanizer blends pattern detection with statistical text analysis:

- **Pattern score** — 29 detectors for AI-ish content, language, style, communication, and filler patterns.
- **Vocabulary tiers** — per-locale words and phrases weighted by severity.
- **Uniformity score** — burstiness, type-token ratio, sentence length variation, trigram repetition, and readability.
- **Composite score** — pattern score weighted at 70% plus uniformity score weighted at 30%.

Score guide:

|  Score | Meaning                  |
| -----: | ------------------------ |
|   0-25 | Mostly human-sounding    |
|  26-50 | Lightly AI-touched       |
|  51-75 | Moderately AI-influenced |
| 76-100 | Heavily AI-generated     |

For the full detector catalogue, see [docs/PATTERNS.md](docs/PATTERNS.md) and `locales/generic/references/patterns.md`.

## Repository map

```text
humanizer/
├── README.md
├── SKILL.md                         # Agent skill entry point
├── docs/
│   ├── AGENTS.md                    # OpenClaw and agent integration
│   ├── CLI.md                       # CLI reference
│   ├── EXTENDING_LOCALES.md         # Add a new language
│   ├── LANGUAGES.md                 # Supported language matrix
│   ├── MCP.md                       # MCP server setup and tools
│   └── INTEGRATIONS.md              # Other integrations / API / GPT notes
├── locales/
│   ├── en-en/                       # English skill bundle
│   ├── en-us/                       # US English skill bundle
│   ├── generic/                     # Shared pattern references
│   └── sv-se/                       # Swedish docs, references, scripts, tests
├── mcp-server/                      # MCP stdio server
├── src/
│   ├── cli.js
│   ├── analyzer.js
│   ├── humanizer.js
│   ├── patterns.js
│   ├── stats.js
│   └── locales/                     # Runtime locale profiles: en, sv
└── tests/
```

## Development

```bash
npm ci
npm test
npm run lint
npm run format:check
npm run check
```

Swedish locale maintainers can regenerate derived Swedish artifacts with:

```bash
npm run sv:pipeline
```

After changing corpus or Wikipedia extended data, use `--with-extended` (includes extended-aware frequency ranks unless you pass `--no-freq-include-extended`) or `--freq-include-extended` when `sv-corpus-extended/` is already built. See [`locales/sv-se/references/PIPELINE-SNAPSHOT.md`](locales/sv-se/references/PIPELINE-SNAPSHOT.md) for the last verified artifact counts.

```bash
npm run corpus:refresh   # minimal: seed + log-odds + calibrate only
```

`npm run check` also runs Swedish and English prescriptive generation checks plus tier validators (`locale:prescriptive`, `validate:sv-tiers`, `locale:prescriptive-en`, `validate:en-tiers`). See [`locales/sv-se/docs/SWEDISH-EXTENSION.md`](locales/sv-se/docs/SWEDISH-EXTENSION.md) for the full Swedish empirical pipeline.

For **always-on** persona wiring (OpenClaw `SOUL.md`, Claude, ChatGPT) with locale-aware guidance, see [docs/AGENTS.md](docs/AGENTS.md) and the skill files under `locales/<tag>/skill/`.

## Contributing

- Add or improve detectors in `src/patterns.js`.
- Add language-specific runtime data under `src/locales/<code>/`.
- Add agent-facing guidance under `locales/<tag>/skill/`.
- Add tests for every detector, locale, and CLI behavior you change.
- Run `npm run check` before opening a PR.

This fork is configured to avoid pushing to the original parent repository. If needed, run:

```bash
bash scripts/setup-git-guards.sh
```

## License

[MIT](LICENSE)

## Credits

This project is a fork of **[humanizer](https://github.com/brandonwise/humanizer)** by [Brandon Wise](https://github.com/brandonwise). Thanks to the original author and contributors for the core engine, pattern model, and tooling this work builds on.
