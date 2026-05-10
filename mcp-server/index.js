#!/usr/bin/env node
/**
 * Humanizer MCP Server
 * 
 * Exposes AI writing detection and humanization tools via Model Context Protocol.
 * Works with Claude Desktop, ChatGPT, VS Code, and other MCP clients.
 *
 * All tools accept an optional "locale" parameter: "en" (default) or "sv".
 * When analyzing Swedish text, pass locale: "sv" to use Swedish vocabulary
 * tiers, LIX readability, and Swedish-aware sentence splitting.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

// Import humanizer modules
import { analyze, scoreLabel } from '../src/analyzer.js';
import { humanize, autoFix } from '../src/humanizer.js';
import { computeStats } from '../src/stats.js';
import { loadLocale } from '../src/locales/index.js';

const LOCALE_DESCRIPTION =
  'Language locale: "en" (default) or "sv" for Swedish. Use "sv" when the input text is in Swedish.';

// Resolve the server name + version from the root package.json so the
// reported server metadata can never drift from the published version.
// We try the repository root first (the canonical source of truth for the
// "humanizer" package) and fall back to mcp-server/package.json so the
// server still starts when run from a partial install.
const __dirname = dirname(fileURLToPath(import.meta.url));

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

const rootPkg = readJson(resolve(__dirname, '..', 'package.json'));
const localPkg = readJson(resolve(__dirname, 'package.json'));
const pkg = rootPkg ?? localPkg ?? { name: 'humanizer', version: '0.0.0' };

const server = new Server(
  {
    name: 'humanizer',
    version: pkg.version,
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

// Define available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'score',
        description:
          'Quick AI score (0-100). Higher = more AI-like. 0-19 human, 20-44 light AI touch, 45-69 moderate, 70-100 heavy AI.',
        inputSchema: {
          type: 'object',
          properties: {
            text: {
              type: 'string',
              description: 'Text to analyze for AI patterns',
            },
            locale: {
              type: 'string',
              description: LOCALE_DESCRIPTION,
              enum: ['en', 'sv'],
              default: 'en',
            },
          },
          required: ['text'],
        },
      },
      {
        name: 'analyze',
        description:
          'Full AI writing analysis with pattern matches, scores by category, and statistical analysis (burstiness, vocabulary diversity, readability). Supports locale: "sv" for Swedish.',
        inputSchema: {
          type: 'object',
          properties: {
            text: {
              type: 'string',
              description: 'Text to analyze',
            },
            verbose: {
              type: 'boolean',
              description: 'Include all pattern matches (default: false)',
              default: false,
            },
            locale: {
              type: 'string',
              description: LOCALE_DESCRIPTION,
              enum: ['en', 'sv'],
              default: 'en',
            },
          },
          required: ['text'],
        },
      },
      {
        name: 'humanize',
        description:
          'Get suggestions to make text sound more human. Groups issues by priority (critical, important, guidance) with specific fixes. Supports locale: "sv" for Swedish.',
        inputSchema: {
          type: 'object',
          properties: {
            text: {
              type: 'string',
              description: 'Text to humanize',
            },
            autofix: {
              type: 'boolean',
              description: 'Apply safe mechanical fixes automatically (default: false)',
              default: false,
            },
            locale: {
              type: 'string',
              description: LOCALE_DESCRIPTION,
              enum: ['en', 'sv'],
              default: 'en',
            },
          },
          required: ['text'],
        },
      },
      {
        name: 'stats',
        description:
          'Statistical text analysis only: burstiness, type-token ratio, sentence variation, trigram repetition, readability score (LIX for Swedish, Flesch-Kincaid for English).',
        inputSchema: {
          type: 'object',
          properties: {
            text: {
              type: 'string',
              description: 'Text to analyze statistically',
            },
            locale: {
              type: 'string',
              description: LOCALE_DESCRIPTION,
              enum: ['en', 'sv'],
              default: 'en',
            },
          },
          required: ['text'],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const locale = args.locale || 'en';

  try {
    switch (name) {
      case 'score': {
        const result = analyze(args.text, { locale });
        const s = result.score;
        const badge = s <= 19 ? '🟢' : s <= 44 ? '🟡' : s <= 69 ? '🟠' : '🔴';
        const label = scoreLabel(s);
        let text = `${badge} AI Score: ${s}/100 — ${label}`;
        if (locale !== 'en') text += `\n\nLocale: ${locale}`;
        if (result.reliability) {
          const r = result.reliability;
          text += `\n\nConfidence: ${r.level} (${r.score}/100)`;
          if (r.level !== 'high') text += `\n${r.recommendation}`;
        }
        return { content: [{ type: 'text', text }] };
      }

      case 'analyze': {
        const result = analyze(args.text, {
          verbose: args.verbose || false,
          includeStats: true,
          locale,
        });

        let output = `## AI Analysis\n\n`;
        output += `**Score:** ${result.score}/100\n`;
        output += `**Pattern Score:** ${result.patternScore}/100\n`;
        output += `**Uniformity Score:** ${result.uniformityScore}/100\n`;
        if (locale !== 'en') output += `**Locale:** ${locale}\n`;
        if (result.reliability) {
          const r = result.reliability;
          output += `**Confidence:** ${r.level} (${r.score}/100)`;
          if (r.reasons?.length > 0) output += ` — ${r.reasons.join(' ')}`;
          output += '\n';
        }
        output += '\n';

        if (result.categories) {
          output += `### Category Breakdown\n`;
          for (const [, data] of Object.entries(result.categories)) {
            if (data.matches > 0) {
              output += `- **${data.label}:** ${data.matches} matches\n`;
            }
          }
          output += '\n';
        }

        if (result.stats) {
          output += `### Statistical Signals\n`;
          output += `- Words: ${result.stats.wordCount} | Sentences: ${result.stats.sentenceCount} | Paragraphs: ${result.stats.paragraphCount}\n`;
          output += `- Avg sentence length: ${result.stats.avgSentenceLength} words\n`;
          output += `- Burstiness: ${result.stats.burstiness?.toFixed(2) || 'N/A'} (human: 0.5-1.0, AI: 0.1-0.3)\n`;
          output += `- Type-Token Ratio: ${result.stats.typeTokenRatio?.toFixed(2) || 'N/A'} (human: 0.5-0.7, AI: 0.3-0.5)\n`;
          if (result.stats.lix !== null) {
            output += `- Readability (LIX): ${result.stats.lix?.toFixed(1) || 'N/A'}\n`;
          } else {
            output += `- Readability (FK): ${result.stats.fleschKincaid?.toFixed(1) || 'N/A'}\n`;
          }
        }

        if (args.verbose && result.findings?.length > 0) {
          output += `\n### Pattern Matches\n`;
          for (const f of result.findings.slice(0, 10)) {
            output += `- **${f.patternName}:** ${f.matchCount} match(es) (weight: ${f.weight})\n`;
          }
          if (result.findings.length > 10) {
            output += `\n...and ${result.findings.length - 10} more\n`;
          }
        }

        return { content: [{ type: 'text', text: output }] };
      }

      case 'humanize': {
        const suggestions = humanize(args.text, { autofix: args.autofix || false, locale });

        let output = `## Humanization Suggestions\n\n`;
        if (locale !== 'en') output += `*Locale: ${locale}*\n\n`;
        output += `**AI Score:** ${suggestions.score}/100 | **Issues:** ${suggestions.totalIssues}\n`;
        if (suggestions.reliability) {
          const r = suggestions.reliability;
          output += `**Confidence:** ${r.level} (${r.score}/100)`;
          if (r.level !== 'high') output += ` — ${r.recommendation}`;
          output += '\n';
        }
        output += '\n';

        if (suggestions.critical?.length > 0) {
          output += `### 🔴 Critical (Dead giveaways)\n`;
          for (const s of suggestions.critical.slice(0, 10)) {
            output += `- Line ${s.line}: \`${s.text?.substring(0, 60) || ''}\` → ${s.suggestion}\n`;
          }
          output += '\n';
        }

        if (suggestions.important?.length > 0) {
          output += `### 🟠 Important (Noticeable patterns)\n`;
          for (const s of suggestions.important.slice(0, 10)) {
            output += `- Line ${s.line}: \`${s.text?.substring(0, 60) || ''}\` → ${s.suggestion}\n`;
          }
          output += '\n';
        }

        if (suggestions.minor?.length > 0) {
          output += `### 🟡 Minor (Subtle tells)\n`;
          for (const s of suggestions.minor.slice(0, 8)) {
            output += `- Line ${s.line}: \`${s.text?.substring(0, 60) || ''}\` → ${s.suggestion}\n`;
          }
          if (suggestions.minor.length > 8) {
            output += `- ...and ${suggestions.minor.length - 8} more\n`;
          }
          output += '\n';
        }

        if (suggestions.guidance?.length > 0) {
          output += `### 💡 Guidance (Writing tips)\n`;
          for (const s of suggestions.guidance) {
            output += `- ${s}\n`;
          }
          output += '\n';
        }

        if (suggestions.styleTips?.length > 0) {
          output += `### 📊 Style Tips (Statistical)\n`;
          for (const t of suggestions.styleTips) {
            const metric = t.value !== null ? ` [${t.metric}: ${t.value}]` : '';
            output += `- ${t.tip}${metric}\n`;
          }
          output += '\n';
        }

        if (args.autofix && suggestions.autofix?.text) {
          output += `### ✅ Auto-fixed Text\n\n${suggestions.autofix.text}\n`;
        }

        return { content: [{ type: 'text', text: output }] };
      }

      case 'stats': {
        const localeProfile = loadLocale(locale);
        const stats = computeStats(args.text, localeProfile);

        let output = `## Statistical Analysis\n`;
        if (locale !== 'en') output += `*Locale: ${locale}*\n`;
        output += `\n`;
        output += `**Words:** ${stats.wordCount} | **Sentences:** ${stats.sentenceCount} | **Paragraphs:** ${stats.paragraphCount}\n`;
        output += `**Avg sentence length:** ${stats.avgSentenceLength} words (σ ${stats.sentenceLengthStdDev})\n\n`;
        output += `| Metric | Value | Human Range | AI Range |\n`;
        output += `|--------|-------|-------------|----------|\n`;
        output += `| Burstiness | ${stats.burstiness?.toFixed(3) || 'N/A'} | 0.5-1.0 | 0.1-0.3 |\n`;
        output += `| Type-Token Ratio | ${stats.typeTokenRatio?.toFixed(3) || 'N/A'} | 0.5-0.7 | 0.3-0.5 |\n`;
        output += `| Sentence Variation | ${stats.sentenceLengthVariation?.toFixed(3) || 'N/A'} | 0.4-0.8 | 0.15-0.35 |\n`;
        output += `| Trigram Repetition | ${stats.trigramRepetition?.toFixed(3) || 'N/A'} | <0.05 | >0.10 |\n`;
        if (stats.lix !== null) {
          output += `| LIX Readability | ${stats.lix?.toFixed(1) || 'N/A'} | 20-40 | varies |\n`;
        } else {
          output += `| Flesch-Kincaid | ${stats.fleschKincaid?.toFixed(1) || 'N/A'} | varies | 8-12 |\n`;
        }

        return { content: [{ type: 'text', text: output }] };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [{ type: 'text', text: `Error: ${error.message}` }],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Humanizer MCP server running on stdio');
}

main().catch(console.error);
