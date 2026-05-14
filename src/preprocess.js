/**
 * preprocess.js — Text preprocessing helpers.
 *
 * Used to optionally ignore code snippets when analyzing documentation.
 * We preserve line structure by masking non-newline characters so line
 * numbers in findings stay stable.
 */

const NON_NEWLINE = /[^\n]/g;
const FENCED_CODE_BLOCKS = /```[\s\S]*?```|~~~[\s\S]*?~~~/g;
const INLINE_CODE_SPANS = /`[^`\n]+`/g;
const ALL_CODE_SNIPPETS = /```[\s\S]*?```|~~~[\s\S]*?~~~|`[^`\n]+`/g;

function maskSnippet(snippet) {
  return snippet.replace(NON_NEWLINE, ' ');
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
  let processed = text;

  if (fenced) {
    processed = processed.replace(FENCED_CODE_BLOCKS, (m) => maskSnippet(m));
  }

  if (inline) {
    processed = processed.replace(INLINE_CODE_SPANS, (m) => maskSnippet(m));
  }

  return processed;
}

/**
 * Apply a text transform while preserving fenced and/or inline code snippets.
 *
 * @param {string} text
 * @param {(segment: string) => string} transform
 * @param {object} opts
 * @param {boolean} opts.fenced
 * @param {boolean} opts.inline
 * @returns {string}
 */
function applyOutsideCodeSnippets(text, transform, opts = {}) {
  if (!text || typeof text !== 'string') return '';
  if (typeof transform !== 'function') return text;

  const { fenced = true, inline = true } = opts;
  const pattern =
    fenced && inline ? ALL_CODE_SNIPPETS : fenced ? FENCED_CODE_BLOCKS : INLINE_CODE_SPANS;

  if (!fenced && !inline) return transform(text);

  let result = '';
  let lastIndex = 0;

  for (const match of text.matchAll(pattern)) {
    const start = match.index ?? 0;
    const snippet = match[0];
    result += transform(text.slice(lastIndex, start));
    result += snippet;
    lastIndex = start + snippet.length;
  }

  result += transform(text.slice(lastIndex));
  return result;
}

module.exports = {
  applyOutsideCodeSnippets,
  stripCodeSnippets,
};
