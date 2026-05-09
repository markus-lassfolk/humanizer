# humanizer

![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)
![Tests](https://img.shields.io/badge/tests-207%20passing-brightgreen)
![Node >= 18](https://img.shields.io/badge/node-%3E%3D18-brightgreen)

Detect and remove signs of AI-generated writing. Makes text sound natural and human.

An [OpenClaw](https://github.com/nichochar/openclaw) skill and standalone CLI tool that scans text for **29 AI writing patterns** using **500+ vocabulary terms** and **statistical text analysis** (burstiness, type-token ratio, readability metrics) — then provides actionable suggestions to fix them.

Based on [Wikipedia:Signs of AI writing](https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing), [Copyleaks stylistic fingerprint research](https://arxiv.org/abs/2503.01659), and [blader/humanizer](https://github.com/blader/humanizer).

## Install

### As an OpenClaw skill

```bash
git clone https://github.com/brandonwise/humanizer.git
cp humanizer/SKILL.md ~/.config/openclaw/skills/humanizer.md
mkdir -p ~/.config/openclaw/skills/locales
cp -r humanizer/locales ~/.config/openclaw/skills/
# Or copy only the skill fragments you need, e.g.:
# cp humanizer/locales/en-en/skill/en.md ~/.config/openclaw/skills/locales/en-en/skill/
```

### As a standalone CLI tool

```bash
git clone https://github.com/brandonwise/humanizer.git
cd humanizer
npm install

# Score some text
echo "This serves as a testament to innovation." | node src/cli.js score

# Full analysis
node src/cli.js analyze -f your-draft.md

# Humanize with auto-fixes
node src/cli.js humanize --autofix -f article.txt
```

### Global install

```bash
npm install -g .
humanizer score < draft.txt
humanizer analyze -f essay.md
humanizer humanize --autofix < article.txt
```

## Swedish empirical bundle (locale `sv`)

The Swedish locale targets **parity-or-better with English on every layer** of the engine — every one of the 29 detectors runs Swedish-tuned regex/phrase packs in addition to the English defaults.

| Layer | English | Swedish |
|-------|---------|---------|
| Pattern detection (1-29) | Engine + English regexes | Engine + English regexes **+ `patternPacks` for 1, 2, 3, 4, 5, 6, 8, 10, 11, 12, 25, 26, 27, 28** |
| Tier 1 (dead giveaways) | 84 | **107** |
| Tier 2 (suspicious in density) | 141 | **190** |
| Tier 3 (context-dependent) | 70 | **84** |
| Phrases (multi-word) | 109 | **167** (hand-tuned + Svarta listan / Klarspråk codegen) |
| Empirical n-grams (log-odds) | — | bundled `sv-frequencies.json` (Pattern 7 `empiricalExtra`) |
| Function words (stylometrics) | 100 | 102 |
| Autofixes | inline (English) | **65** Svarta listan / Klarspråk replacements |
| Readability metric | Flesch-Kincaid | **LIX** (Nordic) |
| Sentence splitter | English abbreviations | Swedish abbreviations (*t.ex., dvs., bl.a., m.fl., SOU, prop, NJA, …*) + Unicode-safe tokenizer for *å, ä, ö* |
| Pattern catalogue | [`locales/generic/references/patterns.md`](locales/generic/references/patterns.md) | [`locales/sv-se/references/patterns-sv.md`](locales/sv-se/references/patterns-sv.md) |

These artifacts ship in the repo and in the **npm package** (`locales/sv-se/`, `reports/`, root `scripts/`):

| Artifact | Role |
|----------|------|
| `locales/sv-se/references/sv-frequencies.json` | Weights for curated tier words + **extra** multi-word AI-like n-grams (Pattern 7) |
| `locales/sv-se/references/empirical-sv-tiers.md` | Human-readable log-odds table (incl. rows omitted from JSON) |
| `locales/sv-se/references/patterns-sv.md` | Per-pattern Swedish signal catalogue (counterpart to the English `patterns.md`) |
| `locales/sv-se/references/PIPELINE-SNAPSHOT.md` | Last **`npm run sv:pipeline`** run: verified counts and artifact paths |
| `reports/calibration-sv-latest.json` | Regression metrics for `locales/sv-se/tests/calibration.sv.regression.test.js` |

Refresh Swedish data end-to-end (codegen, corpora, empirical JSON, calibration, tests, snapshot doc):

```bash
npm run sv:pipeline
```

After changing corpus or Wikipedia extended data, use `--with-extended` (includes extended-aware frequency ranks unless you pass `--no-freq-include-extended`) or `--freq-include-extended` when `sv-corpus-extended/` is already built. See [`locales/sv-se/references/PIPELINE-SNAPSHOT.md`](locales/sv-se/references/PIPELINE-SNAPSHOT.md) for the last verified artifact counts.

```bash
npm run corpus:refresh   # minimal: seed + log-odds + calibrate only
```

`npm run check` also runs `locale:prescriptive --check` and `validate:sv-tiers`. See [`locales/sv-se/docs/SWEDISH-EXTENSION.md`](locales/sv-se/docs/SWEDISH-EXTENSION.md).

## Architecture

The scoring engine combines three signal types:

```
┌─────────────────────────────────────────────────┐
│              Composite Score (0-100)             │
├────────────────────┬────────────────────────────┤
│   Pattern Score    │    Uniformity Score         │
│   (70% weight)     │    (30% weight)             │
├────────────────────┼────────────────────────────┤
│ • 29 pattern       │ • Burstiness (sentence     │
│   detectors        │   length variation)         │
│ • 500+ vocabulary  │ • Type-token ratio          │
│   terms (3 tiers)  │ • Trigram repetition        │
│ • Density scoring  │ • Sentence length CoV       │
│ • Category breadth │ • Paragraph uniformity      │
└────────────────────┴────────────────────────────┘
```

**Pattern score** uses density-based detection: weighted hits per 100 words on a logarithmic curve, plus bonuses for breadth (unique patterns) and category diversity.

**Uniformity score** uses statistical analysis: human text has high burstiness (varied sentence lengths), diverse vocabulary, and low n-gram repetition. AI text is mechanically uniform.

## Statistical analysis

The stats engine computes metrics that differentiate AI from human writing:

| Metric | Human Writing | AI Writing | Why It Matters |
|--------|--------------|------------|----------------|
| **Burstiness** | 0.5–1.0 | 0.1–0.3 | Humans write in bursts — short sentences, then long ones. AI is metronomic. |
| **Type-token ratio** | 0.5–0.7 | 0.3–0.5 | Humans use more varied vocabulary. AI cycles through the same words. |
| **Sentence CoV** | 0.4–0.8 | 0.15–0.35 | Coefficient of variation in sentence length. Low = robotic uniformity. |
| **Trigram repetition** | < 0.05 | > 0.10 | AI reuses the same 3-word phrases more often. |
| **Readability (FK)** | Varies | 8–12 | AI tends to write at a consistent grade level. Humans vary. |

## CLI reference

### Commands

```bash
# Quick score (0-100, higher = more AI-like)
echo "text" | humanizer score

# Full analysis with pattern matches
humanizer analyze essay.txt

# Full markdown report (pipe to file)
humanizer report article.txt > report.md

# Suggestions grouped by priority
humanizer suggest draft.md

# Statistical analysis only
humanizer stats essay.txt

# Humanization suggestions with guidance
humanizer humanize -f article.txt

# Apply safe auto-fixes
humanizer humanize --autofix -f article.txt

# Scan an entire docs folder, rank risk, and show recurring pattern hotspots
humanizer scan docs --ext md,txt --fail-above 45

# Scan a large repo with reusable defaults + custom ignores
humanizer scan . --config .humanizer.json --ignore-dirs vendor,generated

# Baseline-aware scan: fail only on regressions vs a saved baseline
humanizer scan docs --json > .humanizer-baseline.json
humanizer scan docs --baseline .humanizer-baseline.json --fail-on-regression

# Compare draft revisions and see score delta
humanizer compare --before draft-v1.md --after draft-v2.md
```

### New core capabilities

- **Repo scan (`scan`)** — analyze a whole folder, rank files by risk, surface cross-file pattern hotspots, and optionally fail CI with `--fail-above`.
- **Baseline-aware scan gating** — compare a current scan to a saved baseline (`--baseline`) and fail only when files regress.
- **Config-driven scan defaults** — keep monorepo scan settings in one JSON file (`--config`) and layer one-off overrides from CLI.
- **Custom ignore controls** — skip noisy directories with `--ignore-dirs` or disable built-in excludes with `--no-default-ignore`.
- **Code-aware analysis mode (`--ignore-code`)** — ignore fenced code blocks and inline code snippets so technical docs do not get false positives from sample code.
- Confidence calibration: every analysis now includes a confidence rating (high/medium/low) with short-sample warnings to reduce false-positive overconfidence.
- **Draft compare (`compare`)** — compare two versions of text and show exactly which patterns improved or regressed.
- **Unicode obfuscation detection (pattern 29)** — flags hidden zero-width/soft-hyphen tricks and suspicious non-breaking-space density often used in detector-evasion text.

### Options

```bash
-f, --file <path>       Read text from file
--json                  Output as JSON
--verbose, -v           Show all matches
--autofix               Apply safe fixes (humanize only)
--patterns <ids>        Check specific pattern IDs (comma-separated)
--threshold <n>         Only show patterns with weight above n
--before <path>         Before file for compare command
--after <path>          After file for compare command
--ext <list>            Extensions for scan (e.g. md,txt,rst)
--min-words <n>         Skip files shorter than n words (scan)
--fail-above <n>        Exit non-zero if any scanned file score >= n
--baseline <file>       Compare scan against prior scan JSON output
--regression-threshold <n>  Minimum score delta to flag regression (default: 1)
--fail-on-regression    Exit non-zero if baseline regressions are found
--ignore-dirs <list>    Extra dirs to ignore when scanning (comma-separated)
--no-default-ignore     Disable built-in ignores (.git,node_modules,dist,...)
--ignore-code           Ignore fenced/inline code snippets during analysis
--config <file>         Load scan defaults from JSON (scan section)
--help, -h              Show help
```

### Scan config file (`--config`)

`--config` reads scan defaults from a JSON file under a top-level `scan` object.
CLI flags still win when both are provided.

```json
{
  "scan": {
    "extensions": ["md", "txt"],
    "minWords": 30,
    "failAbove": 45,
    "baseline": ".humanizer-baseline.json",
    "regressionThreshold": 3,
    "failOnRegression": true,
    "ignoreDirs": ["generated", "vendor"],
    "includeDefaultIgnore": true,
    "ignoreCode": true
  }
}
```

Then run:

```bash
humanizer scan . --config .humanizer.json
# or one-off:
humanizer analyze docs/guide.md --ignore-code
# or regression-only gate:
humanizer scan docs --baseline .humanizer-baseline.json --fail-on-regression
```

### Score badges

```
🟢 0-25    Mostly human-sounding
🟡 26-50   Lightly AI-touched
🟠 51-75   Moderately AI-influenced
🔴 76-100  Heavily AI-generated
```

## API (programmatic use)

```javascript
const { analyze, score } = require('humanizer');

// Quick score
const s = score('Your text here...');
console.log(s); // 0-100

// Full analysis
const result = analyze(text, {
  verbose: true,          // Show all matches
  patternsToCheck: [7, 19, 22], // Only specific patterns
  includeStats: true,     // Include statistical analysis
});

console.log(result.score);           // 0-100 composite
console.log(result.patternScore);    // Pattern-only score
console.log(result.uniformityScore); // Stats-based uniformity score
console.log(result.stats);           // { burstiness, typeTokenRatio, ... }
console.log(result.findings);        // Detailed pattern matches
console.log(result.categories);      // Per-category breakdown

// Humanize
const { humanize, autoFix } = require('humanizer/src/humanizer');

const suggestions = humanize(text, { autofix: true });
console.log(suggestions.critical);   // Dead giveaway issues
console.log(suggestions.important);  // Noticeable patterns
console.log(suggestions.guidance);   // Writing tips
console.log(suggestions.styleTips);  // Statistical style advice
console.log(suggestions.autofix.text); // Auto-fixed text

// Stats only
const { computeStats } = require('humanizer/src/stats');
const stats = computeStats(text);
console.log(stats.burstiness);       // Sentence variation
console.log(stats.typeTokenRatio);   // Vocabulary diversity
```

## Pattern catalog (top 24 shown)

| # | Pattern | Category | Weight | Example |
|---|---------|----------|--------|---------|
| 1 | Significance inflation | Content | 4 | "marking a pivotal moment in the evolution of..." |
| 2 | Notability name-dropping | Content | 3 | "featured in NYT, BBC, CNN, and Forbes" |
| 3 | Superficial -ing analyses | Content | 4 | "...showcasing... reflecting... highlighting..." |
| 4 | Promotional language | Content | 3 | "nestled", "breathtaking", "stunning" |
| 5 | Vague attributions | Content | 4 | "Experts believe", "Studies show" |
| 6 | Formulaic challenges | Content | 3 | "Despite challenges... continues to thrive" |
| 7 | AI vocabulary | Language | 5 | "Additionally", "delve", "tapestry" (500+ words) |
| 8 | Copula avoidance | Language | 3 | "serves as" instead of "is" |
| 9 | Negative parallelisms | Language | 3 | "It's not just X, it's Y" |
| 10 | Rule of three | Language | 2 | "innovation, inspiration, and insights" |
| 11 | Synonym cycling | Language | 2 | "protagonist... main character... central figure" |
| 12 | False ranges | Language | 2 | "from the Big Bang to dark matter" |
| 13 | Em dash overuse | Style | 2 | Too many — em dashes — in one — piece |
| 14 | Boldface overuse | Style | 2 | **Every** **other** **word** bolded |
| 15 | Inline-header lists | Style | 3 | "- **Topic:** Topic is..." |
| 16 | Title Case headings | Style | 1 | "## Every Word Capitalized Here" |
| 17 | Emoji overuse | Style | 2 | 🚀💡✅ in professional text |
| 18 | Curly quotes | Style | 1 | \u201Csmart quotes\u201D instead of "straight" |
| 19 | Chatbot artifacts | Comms | 5 | "I hope this helps!", "Let me know if..." |
| 20 | Cutoff disclaimers | Comms | 4 | "As of my last training update..." |
| 21 | Sycophantic tone | Comms | 4 | "Great question!", "You're absolutely right!" |
| 22 | Filler phrases | Filler | 3 | "In order to", "Due to the fact that" |
| 23 | Excessive hedging | Filler | 3 | "could potentially possibly" |
| 24 | Generic conclusions | Filler | 3 | "The future looks bright" |

## Vocabulary tiers

- **Tier 1** (Dead giveaways): 50+ words that appear 5-20x more in AI text. Always flagged. Examples: *delve, tapestry, vibrant, crucial, meticulous, seamless, groundbreaking*
- **Tier 2** (Suspicious in density): 80+ words flagged when 2+ appear. Examples: *furthermore, paradigm, holistic, utilize, facilitate, nuanced*
- **Tier 3** (Context-dependent): 60+ words flagged only at >3% density. Examples: *significant, effective, unique, compelling, exceptional*
- **Phrases**: 80+ multi-word patterns. Examples: *"In today's digital age"*, *"plays a crucial role"*, *"serves as a testament"*

## How scoring works

1. **Pattern detection** — Each of 29 detectors scans for regex matches. Matches are weighted 1-5.
2. **Density calculation** — Weighted matches per 100 words, on a logarithmic curve (prevents runaway scores).
3. **Breadth bonus** — More unique pattern types = higher score (up to +20).
4. **Category diversity** — Hits across content/language/style/communication/filler = higher score (up to +15).
5. **Statistical uniformity** — Low burstiness, low vocabulary diversity, high repetition add up to 100 uniformity points.
6. **Composite blend** — Pattern score (70%) + uniformity score (30%) = final score.

This transparent methodology means you can see exactly why text scored the way it did.

## What makes this different

| Feature | humanizer | GPTZero | Copyleaks | ZeroGPT |
|---------|-----------|---------|-----------|---------|
| Open source | ✅ | ❌ | ❌ | ❌ |
| Transparent scoring | ✅ Fully explainable | ❌ Black box | ❌ Black box | ❌ Black box |
| Actionable suggestions | ✅ Per-pattern guidance | ❌ Score only | ❌ Score only | ❌ Score only |
| Auto-fix | ✅ Safe mechanical fixes | ❌ | ❌ | ❌ |
| Statistical analysis | ✅ Burstiness, TTR, FK | ✅ Perplexity | ✅ Stylometric | ❌ |
| No API key needed | ✅ | ❌ | ❌ | ❌ |
| Works offline | ✅ | ❌ | ❌ | ❌ |
| Zero dependencies | ✅ | N/A | N/A | N/A |

## Before/after

**Before (AI score: 78):**
> Great question! Here is an overview of AI-assisted coding. AI-assisted coding serves as an enduring testament to the transformative potential of large language models, marking a pivotal moment in the evolution of software development. In today's rapidly evolving technological landscape, these groundbreaking tools are reshaping how engineers ideate, iterate, and deliver, underscoring their vital role in modern workflows. The future looks bright. I hope this helps!

**After (AI score: 4):**
> AI coding tools speed up boilerplate. In a 2024 Google study, developers using Codex finished simple functions 55% faster, but showed no improvement on debugging or architecture. I've used Copilot for a year. It's good at config files and test scaffolding. It's bad at knowing when it's wrong.

## Always-On Mode: Bake Into Your Agent's Personality

The skill works great on-demand, but the real power is making your AI **always** write like a human. Here's how to bake the humanizer principles into your agent's system prompt or personality file.

### For OpenClaw (SOUL.md)

Keep the Humanizer skill and `locales/` tree available (same install as above) so paths below resolve. Add this to your `SOUL.md` (or equivalent personality file). **No hardcoded word lists** — tiers and phrases live in the locale files and update with the project.

```markdown
## Writing Like a Human (Anti-AI Patterns)

Write like a sharp, opinionated human in **whatever language the user asked for** (including mixed or code-switched text). These rules are always on — not only when asked to "humanize."

### Locale-aware vocabulary (source of truth)

Do **not** maintain a static ban-list in this file. For each language you write in, follow the **Humanizer locale skill** for that language:

| Language | Open when writing in that language |
|----------|-------------------------------------|
| English | `locales/en-en/skill/en.md` (or `locales/en-us/skill/en.md` — same CLI `en`) |
| Swedish | `locales/sv-se/skill/sv.md` |
| Future locales | `locales/<tag>/skill/<code>.md` as added upstream |

**How to apply:**

1. Before drafting, skim the matching file(s) for **Tier 1 / 2 / 3 words**, **phrases**, and **swap tables** for that locale.
2. If a reply mixes languages, apply each locale’s rules to the **segments** written in that language.
3. Never **back-translate English anti-slop rules** into another language — use the **native** lists and examples in that locale’s file (e.g. Swedish clichés and plain-Swedish fixes live in `sv.md`, not translated from English).
4. When the humanizer skill is updated, re-read those files; they are the maintained catalog.

### Structural habits (any language)

1. No significance inflation — state facts; skip grand “turning point in the history of…” framing.
2. No vague attributions — name the source or drop the claim.
3. No rhetorical scaffolding tails (parallel -ing piles, fake symmetry, stuffed rule-of-threes) — see pattern list in `SKILL.md`.
4. Prefer straightforward **be**/**have**-style wording over ornate periphrasis; your locale file gives local examples.
5. No sycophancy — answer directly; skip praise for the question.
6. No chatbot sign-offs or training-cutoff disclaimers unless the user explicitly wants them.
7. No generic inspirational endings — close on something specific.

### Human texture

- Vary sentence length (short, then long, then short).
- Take stances; use concrete specifics (numbers, names, dates).
- Allow spoken rhythm where appropriate (contractions, occasional fragments, direct openers).
- Read it aloud mentally — if you would not say it to a colleague, do not write it.

### Optional check

When verifying draft text, run Humanizer with the **same locale** as the prose (`--locale` or `HUMANIZER_LOCALE`).
```

### For Claude (system prompt)

Add to your system prompt or `CLAUDE.md` — same idea: **principles here, word/phrase bans in locale files** you keep beside the project.

```
You write like a human, not a generic LLM. For English output, follow the
vocabulary tiers and phrases in locales/en-en/skill/en.md; for Swedish, follow
locales/sv-se/skill/sv.md. Apply the matching file to the language you are
writing in; do not use English-only bans when the user asked for another language.
Avoid significance inflation, vague "experts say", sycophancy, chatbot filler,
and generic inspirational endings. Prefer plain copular wording; vary sentence
length; use specific numbers and names. If a sentence would sound absurd aloud,
rewrite it.
```

### For ChatGPT (Custom Instructions)

Custom Instructions have no repo paths unless you paste them in. Use **habits** below, and optionally **attach or paste** the relevant sections from `locales/en-en/skill/en.md` and/or `locales/sv-se/skill/sv.md` (from this repo) so the model has concrete Tier 1/phrase lists without hardcoding them in GitHub’s README.

```
Write like a specific human. Match anti-AI vocabulary to the user’s language:
use the attached Humanizer locale notes for English and/or Swedish when provided.
If no attachment: still avoid throat-clearing, sycophancy, vague attributions,
chatbot sign-offs, stacked hype, and generic "everything will be amazing" endings;
prefer plain verbs, specifics (names, numbers), and varied sentence length.
```

### Verification

After baking in, test your agent by asking it to write about any topic. Then scan with the **matching locale**:

```bash
echo "Your agent's response here" | node src/cli.js score
# Swedish (or set HUMANIZER_LOCALE=sv)
echo "Din agents svar här …" | node src/cli.js score --locale sv
```

Target: consistently **under 25** on the humanizer score for that locale.

## Project structure

```
humanizer/
├── SKILL.md              # OpenClaw skill definition (core rules; links into locales/)
├── locales/
│   ├── generic/references/   # Language-agnostic pattern docs (e.g. patterns.md)
│   ├── en-en/                # English — international bundle (`skill/`, `references/`)
│   ├── en-us/                # English — US packaging bundle (same CLI `en` today)
│   └── sv-se/                # Swedish: references, scripts, tests, skill, docs
├── src/
│   ├── patterns.js       # 29 pattern detectors + pattern registry
│   ├── vocabulary.js     # 500+ AI words/phrases (3 tiers)
│   ├── stats.js          # Statistical analysis engine
│   ├── analyzer.js       # Composite scoring engine
│   ├── humanizer.js      # Suggestion engine + auto-fix
│   └── cli.js            # CLI with colored output
├── tests/                # Vitest — shared / English tests
│   ├── analyzer.test.js
│   ├── humanizer.test.js
│   └── …
├── scripts/              # Small shared shell helpers (locale-specific → locales/sv-se/scripts/)
└── docs/                 # Repo-wide documentation
```

**Deploy / packaging:** ship `src/` + `SKILL.md` + `locales/generic/` + any dialect folders you need (`en-en`, `en-us`, `sv-se`, …). Omit a folder (e.g. `sv-se`) if you do not want Swedish data, scripts, or tests in that artifact.

## Contributing

1. Fork and create a branch
2. Add/improve pattern detection (see `src/patterns.js`)
3. Write tests for your changes
4. Run `npm test` — all tests must pass
5. Open a PR

### Fork-only push policy

This clone of the repo is configured to **never push to the parent repository**
(`brandonwise/humanizer`). After cloning, run:

```bash
bash scripts/setup-git-guards.sh
```

That installs a tracked `pre-push` hook (in `.githooks/`) that aborts any push
whose URL matches the parent repo, pins `pushDefault` to `origin`, and rewrites
the push URL of any `upstream` remote to `no_push`. All work goes to the fork;
contributions back upstream happen via pull requests on github.com only.

## License

[MIT](LICENSE)

## Credits

This project is a fork of **[humanizer](https://github.com/brandonwise/humanizer)** by [Brandon Wise](https://github.com/brandonwise). Thanks to the original author and contributors for the core engine, pattern model, and tooling this work builds on.
