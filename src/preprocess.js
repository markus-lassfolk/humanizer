/**
 * preprocess.js — Text preprocessing helpers.
 *
 * Used to optionally ignore code snippets when analyzing documentation.
 * We preserve line structure by masking non-newline characters so line
 * numbers in findings stay stable.
 */

const NON_NEWLINE = /[^\n]/g;
const INLINE_CODE_SPANS = /`[^`\n]+`/g;
const PROTECTED_TOKEN = /\uE000HUMANIZER_PROTECTED_(\d+)\uE001/g;

function maskSnippet(snippet) {
  return snippet.replace(NON_NEWLINE, ' ');
}

function isFenceLine(line) {
  const trimmed = line.trimStart();
  return trimmed.startsWith('```') || trimmed.startsWith('~~~');
}

function fenceMarker(line) {
  const trimmed = line.trimStart();
  if (trimmed.startsWith('```')) return '```';
  if (trimmed.startsWith('~~~')) return '~~~';
  return null;
}

function isMdxEsmLine(line) {
  const trimmed = line.trimStart();
  if (trimmed.startsWith('import ')) {
    return (
      trimmed.includes(' from ') || trimmed.startsWith("import '") || trimmed.startsWith('import "')
    );
  }

  if (!trimmed.startsWith('export ')) return false;
  return (
    trimmed.startsWith('export const ') ||
    trimmed.startsWith('export let ') ||
    trimmed.startsWith('export var ') ||
    trimmed.startsWith('export function ') ||
    trimmed.startsWith('export async function ') ||
    trimmed.startsWith('export class ') ||
    trimmed.startsWith('export default ') ||
    trimmed.startsWith('export type ') ||
    trimmed.startsWith('export interface ') ||
    trimmed.startsWith('export {') ||
    trimmed.startsWith('export *')
  );
}

function isMdxComponentLine(line) {
  const trimmed = line.trim();
  if (!trimmed.startsWith('<') || trimmed.includes('\n')) return false;
  const nameStart = trimmed.charCodeAt(1);
  if (!(nameStart >= 65 && nameStart <= 90)) return false;
  return trimmed.endsWith('>') && !trimmed.includes('><');
}

function isMarkdownTableRow(line) {
  const trimmed = line.trim();
  return trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.length >= 2;
}

function isMarkdownTableSeparator(line) {
  const trimmed = line.trim();
  if (!trimmed.includes('|') || !trimmed.includes('-')) return false;
  const cells = trimmed
    .split('|')
    .map((cell) => cell.trim())
    .filter(Boolean);
  if (cells.length < 2) return false;
  return cells.every((cell) => {
    let dashCount = 0;
    for (let i = 0; i < cell.length; i += 1) {
      const ch = cell[i];
      if (ch === '-') dashCount += 1;
      else if (ch !== ':') return false;
    }
    return dashCount >= 3;
  });
}

function isBlockquoteLine(line) {
  return line.trimStart().startsWith('>');
}

function isIndentedCodeLine(line) {
  return line.startsWith('    ') || line.startsWith('\t');
}

function addRange(ranges, start, end) {
  if (end > start) ranges.push({ start, end });
}

function addInlineCodeRanges(text, ranges) {
  let inProtected = 0;
  let match;
  INLINE_CODE_SPANS.lastIndex = 0;
  while ((match = INLINE_CODE_SPANS.exec(text)) !== null) {
    const start = match.index;
    const end = start + match[0].length;
    while (inProtected < ranges.length && ranges[inProtected].end <= start) inProtected += 1;
    if (inProtected < ranges.length && ranges[inProtected].start < end) continue;
    addRange(ranges, start, end);
  }
}

function mergeRanges(ranges) {
  ranges.sort((a, b) => a.start - b.start || b.end - a.end);
  const merged = [];
  for (const range of ranges) {
    const last = merged[merged.length - 1];
    if (!last || range.start > last.end) {
      merged.push({ ...range });
    } else if (range.end > last.end) {
      last.end = range.end;
    }
  }
  return merged;
}

function protectedRanges(text, opts = {}) {
  const { code = true, frontmatter = true, mdx = true, tables = true, blockquotes = true } = opts;
  const ranges = [];
  let offset = 0;
  let lineNumber = 0;
  let inFence = false;
  let fence = null;
  let fenceStart = 0;
  let frontmatterOpen = false;
  let frontmatterStart = 0;
  let frontmatterDone = false;

  for (let lineStart = 0; lineStart < text.length; ) {
    const newlineIndex = text.indexOf('\n', lineStart);
    const nextLineStart = newlineIndex === -1 ? text.length : newlineIndex + 1;
    const lineWithNewline = text.slice(lineStart, nextLineStart);
    const line = newlineIndex === -1 ? lineWithNewline : lineWithNewline.slice(0, -1);
    const lineEnd = offset + lineWithNewline.length;
    const contentEnd = line.endsWith('\r')
      ? lineEnd - (lineWithNewline.endsWith('\n') ? 2 : 1)
      : lineEnd - (lineWithNewline.endsWith('\n') ? 1 : 0);
    const trimmed = line.trim();

    if (
      frontmatter &&
      !frontmatterDone &&
      lineNumber === 0 &&
      (trimmed === '---' || trimmed === '...')
    ) {
      frontmatterOpen = true;
      frontmatterStart = offset;
      offset = lineEnd;
      lineNumber += 1;
      lineStart = nextLineStart;
      continue;
    }

    if (frontmatterOpen) {
      if (trimmed === '---' || trimmed === '...') {
        addRange(ranges, frontmatterStart, contentEnd);
        frontmatterOpen = false;
        frontmatterDone = true;
        offset = lineEnd;
        lineNumber += 1;
        lineStart = nextLineStart;
        continue;
      }
      // If we encounter a code fence, MDX import/export, Markdown table,
      // or blockquote while waiting for frontmatter close,
      // treat the opening delimiter as a thematic break (not frontmatter).
      if (
        isFenceLine(line) ||
        isMdxEsmLine(line) ||
        isMarkdownTableSeparator(line) ||
        isMarkdownTableRow(line) ||
        isBlockquoteLine(line)
      ) {
        frontmatterOpen = false;
        frontmatterDone = true;
        // Fall through to process this line normally
      } else {
        offset = lineEnd;
        lineNumber += 1;
        lineStart = nextLineStart;
        continue;
      }
    }

    if (code && inFence) {
      if (line.trimStart().startsWith(fence)) {
        addRange(ranges, fenceStart, contentEnd);
        inFence = false;
        fence = null;
      }
      offset = lineEnd;
      lineNumber += 1;
      lineStart = nextLineStart;
      continue;
    }

    if (code && isFenceLine(line)) {
      inFence = true;
      fence = fenceMarker(line);
      fenceStart = offset;
      offset = lineEnd;
      lineNumber += 1;
      lineStart = nextLineStart;
      continue;
    }

    if (code && isIndentedCodeLine(line)) addRange(ranges, offset, contentEnd);
    else if (mdx && (isMdxEsmLine(line) || isMdxComponentLine(line))) {
      addRange(ranges, offset, contentEnd);
    } else if (tables && (isMarkdownTableSeparator(line) || isMarkdownTableRow(line))) {
      addRange(ranges, offset, contentEnd);
    } else if (blockquotes && isBlockquoteLine(line)) addRange(ranges, offset, contentEnd);

    offset = lineEnd;
    lineNumber += 1;
    lineStart = nextLineStart;
  }

  // A lone opening delimiter is valid Markdown thematic-break syntax, not frontmatter.
  // Only mask frontmatter after observing a closing delimiter in the loop above.
  if (code && inFence) addRange(ranges, fenceStart, text.length);
  if (code) addInlineCodeRanges(text, ranges);

  return mergeRanges(ranges);
}

function maskRanges(text, ranges) {
  if (ranges.length === 0) return text;
  let result = '';
  let cursor = 0;
  for (const { start, end } of ranges) {
    result += text.slice(cursor, start);
    result += maskSnippet(text.slice(start, end));
    cursor = end;
  }
  result += text.slice(cursor);
  return result;
}

/**
 * Strip (mask) code snippets while preserving original line breaks.
 *
 * @param {string} text
 * @param {object} opts
 * @param {boolean} opts.fenced  Mask fenced code blocks (default true)
 * @param {boolean} opts.inline  Mask inline backtick code spans (default true)
 * @returns {string}
 */
function stripCodeSnippets(text, opts = {}) {
  if (!text || typeof text !== 'string') return '';

  const { fenced = true, inline = true } = opts;
  const ranges = [];

  if (fenced) {
    ranges.push(
      ...protectedRanges(text, {
        code: true,
        frontmatter: false,
        mdx: false,
        tables: false,
        blockquotes: false,
      }).filter((range) => {
        const snippet = text.slice(range.start, range.end);
        if (!snippet.includes('\n')) return false;
        if (range.end !== text.length) return true;
        const lastLine = text.slice(Math.max(0, text.lastIndexOf('\n', text.length - 2) + 1));
        return lastLine.trimStart().startsWith('```') || lastLine.trimStart().startsWith('~~~');
      }),
    );
  }

  if (inline) {
    addInlineCodeRanges(text, ranges);
  }

  return maskRanges(text, mergeRanges(ranges));
}

/**
 * Mask Markdown/MDX regions that are literal, metadata, structural, or quoted
 * material rather than prose authored by the current document writer.
 *
 * The masking preserves line/column stability for diagnostics while removing
 * false-positive text from scoring/statistics.
 *
 * @param {string} text
 * @param {object} opts
 * @param {boolean} opts.code  Mask code spans/blocks (default true)
 * @param {boolean} opts.frontmatter  Mask YAML-style frontmatter (default true)
 * @param {boolean} opts.mdx  Mask MDX imports/exports and JSX component lines (default true)
 * @param {boolean} opts.tables  Mask Markdown table rows (default true)
 * @param {boolean} opts.blockquotes  Mask Markdown blockquotes (default true)
 * @returns {string}
 */
function stripMarkdownProtectedRegions(text, opts = {}) {
  if (!text || typeof text !== 'string') return '';
  return maskRanges(text, protectedRanges(text, opts));
}

/**
 * Apply a transform only outside Markdown protected regions, then restore the
 * original protected snippets byte-for-byte.
 *
 * @param {string} text
 * @param {(unprotectedText: string) => string} transform
 * @returns {string}
 */
function transformMarkdownProse(text, transform) {
  if (!text || typeof text !== 'string') return transform(text || '');

  const ranges = protectedRanges(text);
  const placeholders = new Map();
  let protectedText = '';
  let cursor = 0;

  for (const { start, end } of ranges) {
    const index = placeholders.size;
    const token = `\uE000HUMANIZER_PROTECTED_${index}\uE001`;
    protectedText += text.slice(cursor, start);
    protectedText += token;
    placeholders.set(String(index), text.slice(start, end));
    cursor = end;
  }
  protectedText += text.slice(cursor);

  return transform(protectedText).replace(PROTECTED_TOKEN, (token, index) =>
    placeholders.has(index) ? placeholders.get(index) : token,
  );
}

module.exports = {
  stripCodeSnippets,
  stripMarkdownProtectedRegions,
  transformMarkdownProse,
};
