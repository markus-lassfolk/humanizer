/**
 * preprocess.js — Text preprocessing helpers.
 *
 * Used to optionally ignore code snippets, YAML frontmatter, MDX/JSX
 * components, and blockquotes when analyzing documentation. We preserve
 * line structure by masking non-newline characters so line numbers in
 * findings stay stable.
 */

const NON_NEWLINE = /[^\n]/g;
const FENCED_CODE_BLOCKS = /```[\s\S]*?```|~~~[\s\S]*?~~~/g;
const INLINE_CODE_SPANS = /`[^`\n]+`/g;

// YAML frontmatter: optional \r\n line endings, must start at document start
const FRONTMATTER_RE = /^---\r?\n[\s\S]*?\n---(?:\r?\n|$)/;

// MDX import/export lines
const MDX_IMPORT_EXPORT_RE = /^(?:import|export)\s+.+$/gm;

// JSX/MDX component tags starting with uppercase (self-closing and opening)
// Matches single-line tags only to avoid catastrophic backtracking.
const MDX_SELF_CLOSING_TAG_RE = /<[A-Z][a-zA-Z0-9.]*(?:\s[^>]*)?\s*\/>/g;
const MDX_OPEN_TAG_RE = /<[A-Z][a-zA-Z0-9.]*(?:\s[^>]*)?\s*>/g;

// Blockquote lines: lines beginning with one or more > characters
const BLOCKQUOTE_LINE_RE = /^>.*$/gm;

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
 * Strip (mask) YAML frontmatter while preserving line breaks.
 *
 * Frontmatter is defined as a block delimited by `---` lines at the very
 * start of the document (e.g. Jekyll/Hugo/MDX metadata).
 *
 * @param {string} text
 * @returns {string}
 */
function stripFrontmatter(text) {
  if (!text || typeof text !== 'string') return '';
  return text.replace(FRONTMATTER_RE, (m) => maskSnippet(m));
}

/**
 * Strip (mask) MDX/JSX component tags and import/export statements while
 * preserving line breaks.
 *
 * Masked regions:
 *   - `import … ;` / `export …` lines (MDX module system)
 *   - Self-closing JSX component tags: `<Component prop="value" />`
 *   - Opening JSX component tags:      `<Component prop="value">`
 *
 * Only single-line tags are matched to avoid catastrophic backtracking.
 *
 * @param {string} text
 * @returns {string}
 */
function stripMdxComponents(text) {
  if (!text || typeof text !== 'string') return '';
  let processed = text;
  processed = processed.replace(MDX_IMPORT_EXPORT_RE, (m) => maskSnippet(m));
  processed = processed.replace(MDX_SELF_CLOSING_TAG_RE, (m) => maskSnippet(m));
  processed = processed.replace(MDX_OPEN_TAG_RE, (m) => maskSnippet(m));
  return processed;
}

/**
 * Strip (mask) Markdown blockquote lines while preserving line breaks.
 *
 * Blockquote lines start with one or more `>` characters (quoted third-party
 * or vendor text that is not authored by the current writer).
 *
 * @param {string} text
 * @returns {string}
 */
function stripBlockquotes(text) {
  if (!text || typeof text !== 'string') return '';
  return text.replace(BLOCKQUOTE_LINE_RE, (m) => maskSnippet(m));
}

module.exports = {
  stripCodeSnippets,
  stripFrontmatter,
  stripMdxComponents,
  stripBlockquotes,
};
