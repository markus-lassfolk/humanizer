# CLI usage

The CLI is the quickest way to score drafts, review files, humanize text, and gate documentation in CI.

## Install

From a local checkout:

```bash
git clone https://github.com/markus-lassfolk/humanizer.git
cd humanizer
npm ci
npm install -g .
```

Or run without global install:

```bash
node src/cli.js --help
npm start -- --help
```

The installed binary is `humanizer`.

## Commands

```bash
humanizer <command> [file] [options]
```

| Command | Purpose |
|---|---|
| `score` | Print a quick 0-100 AI-likeness score. |
| `analyze` | Full pattern and statistical analysis. |
| `humanize` | Suggestions for making text sound more human; optionally apply safe autofixes. |
| `report` | Markdown report suitable for redirecting to a file. |
| `suggest` | Suggestions only, grouped by priority. |
| `stats` | Statistical signals only. |
| `scan` | Scan many files in a directory and rank by score. |
| `compare` | Compare two draft versions and show score delta. |

## Common examples

```bash
# stdin
cat draft.md | humanizer score

echo "This serves as a testament to innovation." | humanizer analyze

# file input
humanizer analyze -f draft.md
humanizer analyze draft.md

# verbose pattern matches
humanizer analyze -f draft.md --verbose

# JSON output
humanizer analyze -f draft.md --json

# Markdown report
humanizer report article.md > humanizer-report.md

# Suggestions only
humanizer suggest draft.md

# Safe mechanical autofixes
humanizer humanize --autofix -f draft.md

# Stats only
humanizer stats essay.txt
```

## Locale selection

English is the default runtime locale.

```bash
humanizer analyze -f english.md
humanizer analyze --locale en -f english.md
```

Use Swedish explicitly:

```bash
humanizer analyze --locale sv -f svensk-text.md
humanizer humanize --locale sv --autofix -f svensk-text.md
HUMANIZER_LOCALE=sv humanizer score svensk-text.md
```

Supported runtime locales today are `en` and `sv`. See [LANGUAGES.md](LANGUAGES.md).

## Scan folders and CI gates

```bash
# Scan Markdown and text files
humanizer scan docs --ext md,txt

# Fail if any scanned file scores 45 or above
humanizer scan docs --ext md,txt --fail-above 45

# Ignore code examples in Markdown
humanizer scan docs --ext md --ignore-code

# Add project-specific ignores
humanizer scan . --ignore-dirs generated,vendor,tmp

# Disable built-in ignores (.git, node_modules, dist, etc.)
humanizer scan . --no-default-ignore
```

## Baseline-aware scans

Use a baseline when you want CI to fail only on regressions instead of legacy content.

```bash
humanizer scan docs --json > .humanizer-baseline.json
humanizer scan docs --baseline .humanizer-baseline.json --fail-on-regression
```

Tighten the regression threshold:

```bash
humanizer scan docs \
  --baseline .humanizer-baseline.json \
  --regression-threshold 3 \
  --fail-on-regression
```

## Config file

`--config` reads scan defaults from a JSON file under a top-level `scan` object. CLI flags override config values.

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

Run:

```bash
humanizer scan . --config .humanizer.json
```

## Compare drafts

```bash
humanizer compare --before draft-v1.md --after draft-v2.md
```

Use this after editing to verify that the score went down and to see which pattern categories improved or regressed.

## Metric availability contract

Human-readable `report` and `stats` output never prints JavaScript sentinel values such as `NaN`, `Infinity`, `-Infinity`, or `undefined`. If a metric cannot be computed reliably, the CLI prints an explicit unavailable value, for example `unavailable (input too short)` or `unavailable (requires at least 2 sentences)`.

JSON output uses a stable schema for unavailable metrics:

- non-finite numeric values (`NaN`, `Infinity`, `-Infinity`) and undefined-derived values serialize as `null`;
- normalized stats include `metricAvailability`, keyed by metric name, with `{ "available": false, "reason": "..." }` metadata for each null metric;
- counts and structural fields such as `wordCount`, `sentenceCount`, `paragraphCount`, and `sentenceLengths` remain present.

Example for a one-sentence input:

```json
{
  "stats": {
    "wordCount": 1,
    "sentenceCount": 1,
    "burstiness": null,
    "fleschKincaid": null,
    "metricAvailability": {
      "burstiness": { "available": false, "reason": "requires at least 2 sentences" },
      "fleschKincaid": { "available": false, "reason": "input too short" }
    }
  }
}
```

## Options

```text
-f, --file <path>       Read text from file (otherwise stdin)
--json                  Output JSON
--verbose, -v           Show all matches
--autofix               Apply safe fixes (humanize only)
--patterns <ids>        Only check specific pattern IDs, comma-separated
--threshold <n>         Only include findings/suggestions with weight >= threshold
--before <path>         Before file for compare
--after <path>          After file for compare
--ext <list>            File extensions for scan, e.g. md,txt,rst
--min-words <n>         Skip files shorter than n words during scan
--fail-above <n>        Exit non-zero if any scanned file score >= n
--baseline <file>       Compare scan JSON against a prior baseline
--regression-threshold <n>
                        Minimum score delta to flag a regression
--fail-on-regression    Exit non-zero if baseline regressions are found
--ignore-dirs <list>    Extra dirs to ignore, comma-separated
--no-default-ignore     Disable built-in ignores
--ignore-code           Ignore fenced and inline code snippets
--locale <code>         en (default) or sv
--config <file>         Load scan defaults from JSON
--help, -h              Show help
```

## Exit codes

- `0`: command completed and no configured gate failed.
- non-zero: invalid input/options, file errors, or a configured gate failed (`--fail-above`, `--fail-on-regression`).
