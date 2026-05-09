#!/usr/bin/env node
/**
 * build-sv-locale-prescriptive.mjs — TSV → src/locales/generated/sv-prescriptive.js
 *
 * Reads:
 *   locales/sv-se/references/svarta-listan-full.tsv
 *   locales/sv-se/references/klarsprak-checklist.tsv
 *   locales/sv-se/references/swenglish-buzzwords.tsv
 *   locales/sv-se/references/weasel-words-sv.tsv
 *   locales/sv-se/references/cliches-sv.tsv
 *   locales/sv-se/references/redundancy-sv.tsv
 *   locales/sv-se/references/hedging-sv.tsv
 *   locales/sv-se/references/passive-voice-sv.tsv
 *   locales/sv-se/references/inclusive-language-sv.tsv
 *
 * Usage: node locales/sv-se/scripts/build-sv-locale-prescriptive.mjs [--check]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, '..', '..', '..');
const SV_REF = path.join(REPO_ROOT, 'locales/sv-se/references');
const outFile = path.join(REPO_ROOT, 'src/locales/generated/sv-prescriptive.js');

const TSV_FILES = [
  path.join(SV_REF, 'svarta-listan-full.tsv'),
  path.join(SV_REF, 'klarsprak-checklist.tsv'),
  path.join(SV_REF, 'swenglish-buzzwords.tsv'),
];

const TSV_PATTERN_PACKS = [
  path.join(SV_REF, 'weasel-words-sv.tsv'),
  path.join(SV_REF, 'cliches-sv.tsv'),
  path.join(SV_REF, 'redundancy-sv.tsv'),
  path.join(SV_REF, 'hedging-sv.tsv'),
  path.join(SV_REF, 'passive-voice-sv.tsv'),
  path.join(SV_REF, 'inclusive-language-sv.tsv'),
];

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function escapeForRegexLiteralBody(s) {
  return String(s).replace(/\//g, '\\/');
}

function parseTsvFile(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const rows = [];
  for (const line of text.split('\n')) {
    const t = line.trimEnd();
    if (!t.trim() || t.trimStart().startsWith('#')) continue;
    const cols = t.split('\t');
    while (cols.length < 7) cols.push('');
    rows.push({
      avoid: (cols[0] || '').trim(),
      prefer: (cols[1] || '').trim(),
      kind: (cols[2] || '').trim(),
      tier: (cols[3] || '').trim(),
      fix_hint: (cols[4] || '').trim(),
      pattern: (cols[5] || '').trim(),
      notes: (cols[6] || '').trim(),
    });
  }
  return rows;
}

function tierNumber(row) {
  if (row.kind === 'tier1_phrase') return 1;
  const n = parseInt(row.tier, 10);
  if (n === 1 || n === 2 || n === 3) return n;
  return 2;
}

function labelForAutofix(row) {
  if (!row.prefer) return `Removed "${row.avoid}"`;
  return `"${row.avoid}" → "${row.prefer}"`;
}

function buildAutofixPatternSource(row) {
  if (row.pattern) return row.pattern;
  return `\\b${escapeForRegexLiteralBody(escapeRegex(row.avoid))}\\b`;
}

function buildPhrasePatternSource(row) {
  if (row.pattern) return row.pattern;
  return `\\b${escapeForRegexLiteralBody(escapeRegex(row.avoid))}\\b`;
}

/** Multi-word or single word → bounded regex source */
function avoidToRegexSource(row) {
  if (row.pattern) return row.pattern;
  const a = row.avoid.trim();
  if (!a) return '';
  const parts = a.split(/\s+/).map(escapeRegex);
  if (parts.length === 1) return `\\b${escapeForRegexLiteralBody(parts[0])}\\b`;
  return `\\b${parts.map((p) => escapeForRegexLiteralBody(p)).join('\\s+')}\\b`;
}

const DEFAULT_WEASEL_SUG =
  'Byt ut påståendet mot belägg eller stryk utfyllnadsord.';
const DEFAULT_CLICHE_SUG = 'Säg vad du menar i enkel, konkret svenska.';
const DEFAULT_REDUNDANCY_SUG = 'Ta bort upprepningen eller förenkla.';
const DEFAULT_PASSIVE_SUG =
  'Överväg aktiv formulering om det klargör vem som gör vad.';
const DEFAULT_INCLUSIVE_SUG = 'Överväg mer inkluderande och saklig formulering.';

function main() {
  const check = process.argv.includes('--check');

  const allRows = [];
  for (const f of TSV_FILES) {
    if (!fs.existsSync(f)) {
      console.error(`Missing TSV: ${path.relative(REPO_ROOT, f)}`);
      process.exit(1);
    }
    allRows.push(...parseTsvFile(f));
  }

  const packRows = [];
  for (const f of TSV_PATTERN_PACKS) {
    if (!fs.existsSync(f)) {
      console.error(`Missing TSV: ${path.relative(REPO_ROOT, f)}`);
      process.exit(1);
    }
    packRows.push(...parseTsvFile(f));
  }

  /** Fix mis-tabbed rows where fix_hint ended up in `pattern` or `notes`. */
  function normalizePackRow(row) {
    const kinds = new Set([
      'weasel_word',
      'cliche_phrase',
      'redundancy_phrase',
      'inclusive_strict',
      'hedging_phrase',
    ]);
    if (!kinds.has(row.kind)) return row;
    if (row.pattern && !/^\\/.test(row.pattern.trim()) && /[.?!]|[\s]{2,}/.test(row.pattern)) {
      if (!row.fix_hint) row.fix_hint = row.pattern;
      row.pattern = '';
    }
    if (!row.fix_hint && row.notes && !/^\\/.test(row.notes.trim())) {
      row.fix_hint = row.notes;
      row.notes = '';
    }
    return row;
  }
  for (let i = 0; i < packRows.length; i++) packRows[i] = normalizePackRow(packRows[i]);

  const seenAutofix = new Set();
  const autofixes = [];
  const phrases = [];

  const weaselSources = [];
  const clicheSources = [];
  const redundancySources = [];
  const passiveSources = [];
  const inclusiveRows = [];

  for (const row of allRows) {
    if (!row.avoid && row.kind !== 'template') {
      console.error('Row missing avoid:', row);
      process.exit(1);
    }
    const kind = row.kind;
    if (!kind || kind === 'skip') continue;

    if (kind === 'autofix') {
      const key = `autofix:${row.avoid}`;
      if (seenAutofix.has(key)) {
        console.error(`Duplicate autofix avoid: ${row.avoid}`);
        process.exit(1);
      }
      seenAutofix.add(key);
      const patSrc = buildAutofixPatternSource(row);
      const replacement = row.prefer.replace(/\\n/g, '\n');
      autofixes.push({
        patternSrc: patSrc,
        replacement,
        label: labelForAutofix(row),
      });
    } else if (kind === 'phrase_flag' || kind === 'tier1_phrase' || kind === 'template') {
      const patSrc = buildPhrasePatternSource(row);
      const tier = tierNumber(row);
      const fix = row.fix_hint || row.prefer || '(omformulera)';
      phrases.push({ patternSrc: patSrc, tier, fix });
    } else {
      console.error(`Unknown kind "${kind}" for avoid "${row.avoid}"`);
      process.exit(1);
    }
  }

  for (const row of packRows) {
    const kind = row.kind;
    if (!kind || kind === 'skip') continue;
    if (!row.avoid && kind !== 'passive_pattern' && kind !== 'redundancy_phrase') {
      console.error('Pack row missing avoid:', row);
      process.exit(1);
    }

    if (kind === 'weasel_word') {
      const src = avoidToRegexSource(row);
      if (!src) continue;
      weaselSources.push({ patternSrc: src, suggestion: row.fix_hint || DEFAULT_WEASEL_SUG });
    } else if (kind === 'cliche_phrase') {
      const src = avoidToRegexSource(row);
      if (!src) continue;
      clicheSources.push({ patternSrc: src, suggestion: row.fix_hint || DEFAULT_CLICHE_SUG });
    } else if (kind === 'redundancy_phrase') {
      const src = row.pattern ? row.pattern : avoidToRegexSource(row);
      if (!src) continue;
      redundancySources.push({
        patternSrc: src,
        suggestion: row.fix_hint || DEFAULT_REDUNDANCY_SUG,
      });
    } else if (kind === 'passive_pattern') {
      if (!row.pattern) {
        console.error('passive_pattern missing pattern column:', row);
        process.exit(1);
      }
      passiveSources.push({
        patternSrc: row.pattern,
        suggestion: row.fix_hint || DEFAULT_PASSIVE_SUG,
      });
    } else if (kind === 'inclusive_strict') {
      const src = row.pattern ? row.pattern : avoidToRegexSource(row);
      if (!src) continue;
      inclusiveRows.push({
        patternSrc: src,
        fix: row.fix_hint || row.prefer || DEFAULT_INCLUSIVE_SUG,
      });
    } else if (kind === 'hedging_phrase') {
      const patSrc = row.pattern ? row.pattern : buildPhrasePatternSource(row);
      const tier = tierNumber(row);
      const fix = row.fix_hint || row.prefer || '(korta ner)';
      phrases.push({ patternSrc: patSrc, tier, fix, category: 'hedging' });
    } else {
      console.error(`Unknown pack kind "${kind}"`);
      process.exit(1);
    }
  }

  const afLines = autofixes.map(
    (a) =>
      `  { pattern: /${a.patternSrc}/gi, replacement: ${JSON.stringify(a.replacement)}, label: ${JSON.stringify(a.label)} },`,
  );

  const phLines = phrases.map((p) => {
    const cat = p.category ? `, category: ${JSON.stringify(p.category)}` : '';
    return `  { pattern: /${p.patternSrc}/gi, tier: ${p.tier}, fix: ${JSON.stringify(p.fix)}${cat} },`;
  });

  const weaselLines = weaselSources.map(
    (w) =>
      `  { regex: /${escapeForRegexLiteralBody(w.patternSrc)}/gi, suggestion: ${JSON.stringify(w.suggestion)}, confidence: 'medium' },`,
  );

  const clicheLines = clicheSources.map(
    (c) =>
      `  { regex: /${escapeForRegexLiteralBody(c.patternSrc)}/gi, suggestion: ${JSON.stringify(c.suggestion)}, confidence: 'low' },`,
  );

  const redundancyLines = redundancySources.map(
    (r) =>
      `  { regex: /${escapeForRegexLiteralBody(r.patternSrc)}/gi, suggestion: ${JSON.stringify(r.suggestion)}, confidence: 'medium' },`,
  );

  const passiveLines = passiveSources.map(
    (p) =>
      `  { regex: /${escapeForRegexLiteralBody(p.patternSrc)}/gi, suggestion: ${JSON.stringify(p.suggestion)}, confidence: 'medium' },`,
  );

  const inclusiveLines = inclusiveRows.map(
    (i) =>
      `  { regex: /${escapeForRegexLiteralBody(i.patternSrc)}/gi, suggestion: ${JSON.stringify(i.fix)}, confidence: 'low' },`,
  );

  const header = `/**
 * Generated by locales/sv-se/scripts/build-sv-locale-prescriptive.mjs — do not edit by hand.
 * Sources: svarta-listan-full.tsv, klarsprak-checklist.tsv, swenglish-buzzwords.tsv,
 * weasel-words-sv.tsv, cliches-sv.tsv, redundancy-sv.tsv, hedging-sv.tsv,
 * passive-voice-sv.tsv, inclusive-language-sv.tsv
 */
/* eslint-disable */
`;

  const body = `${header}
module.exports.AUTOFIXES_SV_PRESCRIPTIVE = [
${afLines.join('\n')}
];

module.exports.AI_PHRASES_SV_PRESCRIPTIVE = [
${phLines.join('\n')}
];

/** Pattern 32 — Swedish weasel / hedge phrases (regex pack entries) */
module.exports.WEASELS_SV = [
${weaselLines.join('\n')}
];

/** Pattern 33 — Swedish clichés */
module.exports.CLICHES_SV = [
${clicheLines.join('\n')}
];

/** Pattern 34 — redundant Swedish phrasing */
module.exports.REDUNDANCY_SV = [
${redundancyLines.join('\n')}
];

/** Pattern 30 — Swedish passive / formal passive clusters */
module.exports.PASSIVE_SV = [
${passiveLines.join('\n')}
];

/** Pattern 35 — inclusive language (strict mode only) */
module.exports.INCLUSIVE_SV = [
${inclusiveLines.join('\n')}
];
`;

  if (check) {
    if (!fs.existsSync(outFile)) {
      console.error('Missing generated file; run: npm run locale:prescriptive');
      process.exit(1);
    }
    const existing = fs.readFileSync(outFile, 'utf8');
    if (existing !== body) {
      console.error('sv-prescriptive.js is stale; run: npm run locale:prescriptive');
      process.exit(1);
    }
    console.log('sv-prescriptive.js is up to date');
    return;
  }

  const outDir = path.dirname(outFile);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  fs.writeFileSync(outFile, body, 'utf8');
  console.log(
    `Wrote ${path.relative(REPO_ROOT, outFile)} (${autofixes.length} autofixes, ${phrases.length} phrases, ${weaselSources.length} weasels, ${clicheSources.length} cliches, ${redundancySources.length} redundancy, ${passiveSources.length} passive, ${inclusiveRows.length} inclusive)`,
  );
}

main();
