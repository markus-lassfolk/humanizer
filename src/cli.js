#!/usr/bin/env node

/**
 * cli.js — Command-line interface for the humanizer.
 *
 * Usage:
 *   node src/cli.js analyze < input.txt        # Full analysis report
 *   node src/cli.js score < input.txt           # Just the score (0-100)
 *   node src/cli.js humanize < input.txt        # Humanization suggestions
 *   node src/cli.js humanize --autofix < input.txt  # Apply safe auto-fixes
 *   node src/cli.js analyze --json < input.txt  # JSON output
 *   node src/cli.js analyze -f file.txt         # Read from file
 *   echo "text" | node src/cli.js score         # Pipe text
 */

const fs = require('fs');
const { analyze, score, formatReport, formatJSON } = require('./analyzer');
const { humanize, formatSuggestions } = require('./humanizer');

// ─── CLI Arg Parsing ─────────────────────────────────────

const args = process.argv.slice(2);
const command = args[0];

const flags = {
  json: args.includes('--json'),
  verbose: args.includes('--verbose') || args.includes('-v'),
  autofix: args.includes('--autofix'),
  help: args.includes('--help') || args.includes('-h'),
  file: null,
  patterns: null,
};

// Parse -f / --file flag
const fileIdx = args.indexOf('-f') !== -1 ? args.indexOf('-f') : args.indexOf('--file');
if (fileIdx !== -1 && args[fileIdx + 1]) {
  flags.file = args[fileIdx + 1];
}

// Parse --patterns flag (comma-separated pattern IDs)
const patIdx = args.indexOf('--patterns');
if (patIdx !== -1 && args[patIdx + 1]) {
  flags.patterns = args[patIdx + 1].split(',').map(Number).filter(n => n > 0);
}

// ─── Help ────────────────────────────────────────────────

function showHelp() {
  console.log(`
humanizer — Detect and remove AI writing patterns

Usage:
  humanizer <command> [options]

Commands:
  analyze      Full analysis report with pattern matches
  score        Quick score (0-100, higher = more AI-like)
  humanize     Humanization suggestions with guidance

Options:
  -f, --file <path>    Read text from file (otherwise reads stdin)
  --json               Output as JSON (analyze/humanize)
  --verbose, -v        Show all matches (not just top 5 per pattern)
  --autofix            Apply safe mechanical fixes (humanize only)
  --patterns <ids>     Only check specific pattern IDs (comma-separated)
  --help, -h           Show this help

Examples:
  echo "This is a testament to..." | humanizer score
  humanizer analyze -f essay.txt
  humanizer analyze --json < draft.md
  humanizer humanize --autofix -f article.txt
  humanizer analyze --patterns 7,19,22 < text.txt

Patterns (24 total):
  Content (1-6):    Significance inflation, notability, -ing analyses,
                    promotional language, vague attributions, challenges
  Language (7-12):  AI vocabulary, copula avoidance, negative parallelisms,
                    rule of three, synonym cycling, false ranges
  Style (13-18):    Em dashes, boldface, inline-headers, title case,
                    emojis, curly quotes
  Communication (19-21): Chatbot artifacts, cutoff disclaimers, sycophancy
  Filler (22-24):   Filler phrases, excessive hedging, generic conclusions
`);
}

// ─── Read Input ──────────────────────────────────────────

function readInput() {
  return new Promise((resolve, reject) => {
    if (flags.file) {
      try {
        const text = fs.readFileSync(flags.file, 'utf-8');
        resolve(text);
      } catch (err) {
        reject(new Error(`Could not read file: ${flags.file} (${err.message})`));
      }
      return;
    }

    // Read from stdin
    if (process.stdin.isTTY) {
      reject(new Error('No input. Pipe text or use -f <file>. Run with --help for usage.'));
      return;
    }

    let data = '';
    process.stdin.setEncoding('utf-8');
    process.stdin.on('data', chunk => { data += chunk; });
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', reject);
  });
}

// ─── Main ────────────────────────────────────────────────

async function main() {
  if (flags.help || !command) {
    showHelp();
    process.exit(command ? 0 : 1);
  }

  let text;
  try {
    text = await readInput();
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }

  if (!text.trim()) {
    console.error('Error: Empty input.');
    process.exit(1);
  }

  const opts = {
    verbose: flags.verbose,
    patternsToCheck: flags.patterns,
  };

  switch (command) {
    case 'analyze': {
      const result = analyze(text, opts);
      if (flags.json) {
        console.log(formatJSON(result));
      } else {
        console.log(formatReport(result));
      }
      break;
    }

    case 'score': {
      const s = score(text);
      if (flags.json) {
        console.log(JSON.stringify({ score: s }));
      } else {
        console.log(s);
      }
      break;
    }

    case 'humanize': {
      const result = humanize(text, { autofix: flags.autofix, verbose: flags.verbose });
      if (flags.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(formatSuggestions(result));
        if (flags.autofix && result.autofix) {
          console.log('\n── AUTO-FIXED TEXT ──────────────────────────────\n');
          console.log(result.autofix.text);
          console.log('\n────────────────────────────────────────────────');
        }
      }
      break;
    }

    default:
      console.error(`Unknown command: ${command}. Run with --help for usage.`);
      process.exit(1);
  }
}

main().catch(err => {
  console.error(`Fatal: ${err.message}`);
  process.exit(1);
});
