# humanizer

Detect and remove signs of AI-generated writing. Makes text sound natural and human.

An [OpenClaw](https://github.com/nichochar/openclaw) skill and standalone CLI tool that scans text for 24 common AI writing patterns — from chatbot artifacts ("I hope this helps!") to significance inflation ("marking a pivotal moment in the evolution of...") — and provides actionable suggestions to fix them.

Based on [Wikipedia:Signs of AI writing](https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing) and [blader/humanizer](https://github.com/blader/humanizer).

## Install

### As an OpenClaw skill

Copy `SKILL.md` into your OpenClaw skills directory:

```bash
# Clone and copy
git clone https://github.com/brandonwise/humanizer.git
cp humanizer/SKILL.md ~/.config/openclaw/skills/humanizer.md
```

### As a standalone CLI tool

```bash
git clone https://github.com/brandonwise/humanizer.git
cd humanizer
npm install

# Score some text
echo "This serves as a testament to innovation." | node src/cli.js score
# → 38

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

## Usage

### CLI commands

```bash
# Quick score (0-100, higher = more AI-like)
echo "text" | humanizer score

# Full analysis with pattern matches
humanizer analyze -f draft.md

# JSON output for scripts
humanizer analyze --json < input.txt

# Humanization suggestions
humanizer humanize -f article.txt

# Apply safe auto-fixes (curly quotes, filler phrases, chatbot artifacts)
humanizer humanize --autofix -f article.txt

# Check only specific patterns
humanizer analyze --patterns 7,19,22 < text.txt

# Verbose output (all matches, not just top 5)
humanizer analyze --verbose -f long-document.md
```

### As an OpenClaw skill

When the skill is installed, ask your AI assistant:

- "Humanize this text: [paste text]"
- "Review this draft for AI writing patterns"
- "Make this sound more natural and human"
- "De-AI this article"
- "Score this text for AI patterns"

## The 24 patterns

| # | Pattern | Category | Example |
|---|---------|----------|---------|
| 1 | Significance inflation | Content | "marking a pivotal moment in the evolution of..." |
| 2 | Notability name-dropping | Content | "featured in NYT, BBC, CNN, and Forbes" |
| 3 | Superficial -ing analyses | Content | "...showcasing... reflecting... highlighting..." |
| 4 | Promotional language | Content | "nestled", "breathtaking", "stunning" |
| 5 | Vague attributions | Content | "Experts believe", "Studies show" |
| 6 | Formulaic challenges | Content | "Despite challenges... continues to thrive" |
| 7 | AI vocabulary | Language | "Additionally", "delve", "tapestry", "landscape" |
| 8 | Copula avoidance | Language | "serves as" instead of "is" |
| 9 | Negative parallelisms | Language | "It's not just X, it's Y" |
| 10 | Rule of three | Language | "innovation, inspiration, and insights" |
| 11 | Synonym cycling | Language | "protagonist... main character... central figure" |
| 12 | False ranges | Language | "from the Big Bang to dark matter" |
| 13 | Em dash overuse | Style | Too many — em dashes — in one — piece |
| 14 | Boldface overuse | Style | **Every** **other** **word** bolded |
| 15 | Inline-header lists | Style | "- **Topic:** Topic is..." |
| 16 | Title Case headings | Style | "## Every Word Capitalized Here" |
| 17 | Emoji overuse | Style | 🚀💡✅ in professional text |
| 18 | Curly quotes | Style | \u201Csmart quotes\u201D instead of "straight" |
| 19 | Chatbot artifacts | Comms | "I hope this helps!", "Let me know if..." |
| 20 | Cutoff disclaimers | Comms | "As of my last training update..." |
| 21 | Sycophantic tone | Comms | "Great question!", "You're absolutely right!" |
| 22 | Filler phrases | Filler | "In order to", "Due to the fact that" |
| 23 | Excessive hedging | Filler | "could potentially possibly" |
| 24 | Generic conclusions | Filler | "The future looks bright" |

## Before/after

**Before (AI score: 78):**
> Great question! Here is an overview of AI-assisted coding. AI-assisted coding serves as an enduring testament to the transformative potential of large language models, marking a pivotal moment in the evolution of software development. In today's rapidly evolving technological landscape, these groundbreaking tools are reshaping how engineers ideate, iterate, and deliver, underscoring their vital role in modern workflows. The future looks bright. I hope this helps!

**After (AI score: 4):**
> AI coding tools speed up boilerplate. In a 2024 Google study, developers using Codex finished simple functions 55% faster, but showed no improvement on debugging or architecture. I've used Copilot for a year. It's good at config files and test scaffolding. It's bad at knowing when it's wrong.

## How scoring works

The analyzer calculates a 0-100 "AI score" based on:

- **Density** — Weighted pattern matches per 100 words (logarithmic scale)
- **Breadth** — How many different pattern types are detected
- **Category diversity** — Hits across content, language, style, communication, and filler categories

Higher-weight patterns (chatbot artifacts, AI vocabulary) contribute more than lower-weight ones (title case, curly quotes).

| Score | Meaning |
|-------|---------|
| 0-19 | Mostly human-sounding |
| 20-44 | Lightly AI-touched |
| 45-69 | Moderately AI-influenced |
| 70-100 | Heavily AI-generated |

## Project structure

```
humanizer/
├── SKILL.md          # OpenClaw skill (the core deliverable)
├── src/
│   ├── patterns.js   # 24 pattern definitions with detection rules
│   ├── analyzer.js   # Text analysis engine and scoring
│   ├── humanizer.js  # Humanization suggestions and auto-fix
│   └── cli.js        # CLI interface
├── tests/            # Vitest test suite (55 tests)
├── references/       # Pattern catalogs, vocabulary lists, style guide
├── docs/             # Detailed documentation
└── scripts/          # Shell wrappers
```

## Contributing

See [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) for guidelines. The short version:

1. Fork and create a branch
2. Add/improve pattern detection (see `src/patterns.js`)
3. Write tests for your changes
4. Run `npm test` — all tests must pass
5. Open a PR

## License

[MIT](LICENSE)
