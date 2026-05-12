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
const FRONTMATTER = /^(?:---|\.\.\.)[ \t]*\r?\n[\s\S]*?\r?\n(?:---|\.\.\.)[ \t]*(?=\r?\n|$)/;
const MDX_ESM_LINE = /^\s*(?:import|export)\b[^\n]*(?:\n|$)/gm;
const MDX_COMPONENT_LINE = /^\s*<[A-Z][\w.:]*(?:\s+[\s\S]*?)?\/?>(?:\s*)$/gm;
const MARKDOWN_TABLE_ROW = /^\s*\|.*\|\s*$/gm;
const MARKDOWN_TABLE_SEPARATOR = /^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*$/gm;
const BLOCKQUOTE_LINE = /^\s*>.*$/gm;
const INDENTED_CODE_BLOCK = /^(?: {4}|\t).+$/gm;

function maskSnippet(snippet) {
  return snippet.replace(NON_NEWLINE, ' ');
}

function applyMask(text, regex) {
  return text.replace(regex, (m) => maskSnippet(m));
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
    processed = applyMask(processed, FENCED_CODE_BLOCKS);
  }

  if (inline) {
    processed = applyMask(processed, INLINE_CODE_SPANS);
  }

  return processed;
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

  const { code = true, frontmatter = true, mdx = true, tables = true, blockquotes = true } = opts;

  let processed = text;

  if (frontmatter) {
    processed = applyMask(processed, FRONTMATTER);
  }

  if (code) {
    processed = stripCodeSnippets(processed, { fenced: true, inline: true });
    processed = applyMask(processed, INDENTED_CODE_BLOCK);
  }

  if (mdx) {
    processed = applyMask(processed, MDX_ESM_LINE);
    processed = applyMask(processed, MDX_COMPONENT_LINE);
  }

  if (tables) {
    processed = applyMask(processed, MARKDOWN_TABLE_SEPARATOR);
    processed = applyMask(processed, MARKDOWN_TABLE_ROW);
  }

  if (blockquotes) {
    processed = applyMask(processed, BLOCKQUOTE_LINE);
  }

  return processed;
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

  const placeholders = [];
  const stash = (snippet) => {
    const token = `\uE000HUMANIZER_PROTECTED_${placeholders.length}\uE001`;
    placeholders.push({ token, snippet });
    return token;
  };

  let protectedText = text;
  protectedText = protectedText.replace(FRONTMATTER, stash);
  protectedText = protectedText.replace(FENCED_CODE_BLOCKS, stash);
  protectedText = protectedText.replace(INLINE_CODE_SPANS, stash);
  protectedText = protectedText.replace(INDENTED_CODE_BLOCK, stash);
  protectedText = protectedText.replace(MDX_ESM_LINE, stash);
  protectedText = protectedText.replace(MDX_COMPONENT_LINE, stash);
  protectedText = protectedText.replace(MARKDOWN_TABLE_SEPARATOR, stash);
  protectedText = protectedText.replace(MARKDOWN_TABLE_ROW, stash);
  protectedText = protectedText.replace(BLOCKQUOTE_LINE, stash);

  let transformed = transform(protectedText);

  for (const { token, snippet } of placeholders) {
    transformed = transformed.split(token).join(snippet);
  }

  return transformed;
}

module.exports = {
  stripCodeSnippets,
  stripMarkdownProtectedRegions,
  transformMarkdownProse,
};
