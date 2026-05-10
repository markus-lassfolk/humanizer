/**
 * patterns.js — AI writing pattern detection engine.
 *
 * 29 pattern detectors organized into 5 categories, with a registry
 * that supports dynamic add/remove and custom word lists.
 *
 * Architecture:
 *   - Each pattern is an object with id, name, category, description,
 *     weight (1-5), and a detect(text, opts) function
 *   - detect() returns [{ match, index, line, column, suggestion, confidence }]
 *   - opts.localeProfile (from src/locales/) supplies tiers, phrases, and
 *     patternPacks[id] for localized regex lists / structured data. If a pack
 *     is missing or empty, that detector returns no matches for that locale.
 *   - localeProfile.phrases entries may carry an optional `category`
 *     tag ('chatbot' | 'sycophantic' | 'cutoff' | 'filler' | 'hedging' |
 *     'conclusion'). Patterns 19-24 dispatch by category. English
 *     phrases that lack a tag fall back to the original heuristic so
 *     default behaviour is unchanged.
 *   - The registry holds all patterns and provides query methods
 *   - Default English vocabulary lives in locales/en/vocabulary.js (shim: en-vocabulary.js)
 */

const { TIER_1, TIER_2, TIER_3, AI_PHRASES } = require('./locales/en-vocabulary');
const {
  SIGNIFICANCE_PHRASES,
  PROMOTIONAL_WORDS,
  VAGUE_ATTRIBUTION_PHRASES,
  CHALLENGES_PHRASES,
  COPULA_AVOIDANCE,
} = require('./locales/en-pattern-packs');
const { splitSentences } = require('./stats');

// ─── Helpers ─────────────────────────────────────────────

/**
 * Find all regex matches with line numbers and columns.
 * Returns [{ match, index, line, column, suggestion, confidence }]
 */
function findMatches(text, regex, suggestion, confidence = 'high') {
  const results = [];
  const lines = text.split('\n');
  let offset = 0;

  for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    const line = lines[lineNum];
    const lineRegex = new RegExp(
      regex.source,
      regex.flags.includes('g') ? regex.flags : `${regex.flags}g`,
    );
    let m;
    while ((m = lineRegex.exec(line)) !== null) {
      results.push({
        match: m[0],
        index: offset + m.index,
        line: lineNum + 1,
        column: m.index + 1,
        suggestion: typeof suggestion === 'function' ? suggestion(m[0]) : suggestion,
        confidence,
      });
    }
    offset += line.length + 1;
  }
  return results;
}

/** Count regex occurrences. */
function countMatches(text, regex) {
  const m = text.match(regex);
  return m ? m.length : 0;
}

/** Word count. */
function wordCount(text) {
  return text
    .trim()
    .split(/\s+/)
    .filter((token) => token && /[\p{L}\p{N}]/u.test(token)).length;
}

// ─── Vocabulary Detection Helpers ────────────────────────

/**
 * Build a case-insensitive word-boundary regex for a word.
 * Escapes special regex chars in the word.
 */
function wordRegex(word) {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // For multi-word phrases, don't use word boundaries on internal spaces
  if (word.includes(' ')) {
    return new RegExp(`\\b${escaped}\\b`, 'gi');
  }
  return new RegExp(`\\b${escaped}\\b`, 'gi');
}

function escapeForRegexPattern(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function synonymRegex(syn) {
  const normalized = String(syn).toLowerCase();
  const escaped = escapeForRegexPattern(normalized);
  if (normalized.includes(' ')) {
    return new RegExp(`(^|[^\\p{L}\\p{N}_])${escaped}([^\\p{L}\\p{N}_]|$)`, 'iu');
  }
  // Allow common noun inflection endings while still requiring word boundaries.
  return new RegExp(
    `(^|[^\\p{L}\\p{N}_])${escaped}(?:en|et|n|t|er|ar|or|a|s)?([^\\p{L}\\p{N}_]|$)`,
    'iu',
  );
}

/**
 * Normalize locale tier entry: string or { word, weight }.
 * @param {string|{word:string,weight?:number}} entry
 * @returns {{ word: string, weight: number }}
 */
function normalizeWordEntry(entry) {
  if (entry === null || entry === undefined) return { word: '', weight: 1 };
  if (typeof entry === 'string') return { word: entry, weight: 1 };
  const w = entry.word;
  const weight = typeof entry.weight === 'number' && entry.weight > 0 ? entry.weight : 1;
  return { word: w, weight };
}

/**
 * Scan text for words from a tier list. Returns matches with word-specific suggestions.
 * Supports weighted entries (matchWeight) for empirical calibration.
 */
function scanWordList(text, wordList, suggestionPrefix, confidence = 'high') {
  const results = [];
  for (const raw of wordList) {
    const { word, weight } = normalizeWordEntry(raw);
    if (!word) continue;
    const regex = wordRegex(word);
    const matches = findMatches(
      text,
      regex,
      `${suggestionPrefix}: "${word}". Use a simpler, more specific alternative.`,
      confidence,
    );
    for (const m of matches) {
      results.push({ ...m, matchWeight: weight });
    }
  }
  return results;
}

/**
 * Scan text for AI phrases. Returns matches with phrase-specific fixes.
 */
function scanPhrases(text, phrases, tierFilter = null) {
  const results = [];
  for (const { pattern, tier, fix } of phrases) {
    if (tierFilter !== null && tier !== tierFilter) continue;
    const matches = findMatches(
      text,
      pattern,
      fix.startsWith('(') ? fix : `Replace with: ${fix}`,
      tier === 1 ? 'high' : tier === 2 ? 'medium' : 'low',
    );
    results.push(...matches);
  }
  return results;
}

// ─── Locale Helpers ─────────────────────────────────────

/**
 * Active phrase list for the call (locale profile if present, else English).
 */
function phrasesForLocale(opts) {
  const profile = opts && opts.localeProfile;
  return profile && Array.isArray(profile.phrases) ? profile.phrases : AI_PHRASES;
}

/**
 * Pattern pack for `id` from the locale profile, or `null`.
 *
 * Shape is detector-specific (array of regex entries, synonym arrays for #11,
 * structured object for #10 / #16). No implicit English merge — the active
 * locale profile must supply the full pack (English uses locales/en.js).
 */
function getPatternPack(opts, id) {
  const profile = opts && opts.localeProfile;
  if (!profile || !profile.patternPacks) return null;
  const pack = profile.patternPacks[id];
  if (Array.isArray(pack) && pack.length === 0) return null;
  if (pack && typeof pack === 'object' && !Array.isArray(pack)) {
    if (Object.keys(pack).length === 0) return null;
  }
  return pack || null;
}

/**
 * Run findMatches for pack entries: RegExp or { regex, suggestion?, confidence?, fix? }.
 * Uses `fix` as the suggestion string when present (Pattern 27).
 */
function scanRegexPack(text, pack, defaultSuggestion, defaultConfidence = 'medium') {
  if (!Array.isArray(pack) || pack.length === 0) return [];
  const results = [];
  for (const entry of pack) {
    let regex;
    let suggestion;
    let confidence = defaultConfidence;
    if (entry instanceof RegExp) {
      regex = entry;
      suggestion = defaultSuggestion;
      confidence = defaultConfidence;
    } else if (entry && entry.regex instanceof RegExp) {
      regex = entry.regex;
      suggestion =
        entry.fix !== undefined && entry.fix !== null
          ? entry.fix
          : (entry.suggestion ?? defaultSuggestion);
      confidence = entry.confidence ?? defaultConfidence;
    } else {
      continue;
    }
    results.push(...findMatches(text, regex, suggestion, confidence));
  }
  return results;
}

/**
 * Infer phrase category from English fix-string heuristics for back-compat.
 *
 * Phrases that explicitly set `category` (e.g. all Swedish entries) win.
 * Returns one of: 'chatbot' | 'cutoff' | 'sycophantic' | 'filler' |
 * 'hedging' | 'conclusion' | null.
 */
function inferPhraseCategory(p) {
  if (!p) return null;
  if (p.category) return p.category;
  const fix = p.fix || '';
  const src = p.pattern && p.pattern.source ? p.pattern.source : '';

  if (fix === '(remove)' || fix === '(remove — start with the content)') {
    if (src.includes('training') || src.includes('details are') || src.includes('available')) {
      return 'cutoff';
    }
    if (
      src.includes('question') ||
      src.includes('point') ||
      src.includes('right') ||
      src.includes('observation')
    ) {
      return 'sycophantic';
    }
    return 'chatbot';
  }
  if (fix && fix.includes('address the substance')) {
    return 'sycophantic';
  }
  if (
    fix &&
    !fix.startsWith('(') &&
    [
      'to',
      'because',
      'now',
      'if',
      'can',
      'to / for',
      'first',
      'finally',
      'for / regarding',
      'because / since',
    ].includes(fix)
  ) {
    return 'filler';
  }
  if (
    fix &&
    (fix.includes('could') ||
      fix.includes('might') ||
      fix.includes('may ') ||
      fix.includes('perhaps') ||
      fix.includes('maybe'))
  ) {
    return 'hedging';
  }
  if (
    fix &&
    (fix.includes('specific fact') ||
      fix.includes('concrete') ||
      fix.includes('cite evidence') ||
      fix.includes('what you do know') ||
      fix.includes('what happens next'))
  ) {
    return 'conclusion';
  }
  return null;
}

function phrasesByCategory(phrases, ...categories) {
  const set = new Set(categories);
  return phrases.filter((p) => set.has(inferPhraseCategory(p)));
}

// ─── Language-agnostic pattern literals ──────────────────

const HIDDEN_UNICODE_CHARS = /(?:\u200B|\u200C|\u200D|\u2060|\uFEFF|\u00AD)/g;
const NON_BREAKING_SPACES = /(?:\u00A0|\u202F)/g;

// ─── Pattern Definitions ─────────────────────────────────

const patterns = [
  // ── CONTENT PATTERNS (1-6) ──────────────────────────────

  {
    id: 1,
    name: 'Significance inflation',
    category: 'content',
    description:
      'Inflated claims about significance, legacy, or broader trends. LLMs puff up importance of mundane things.',
    weight: 4,
    detect(text, opts = {}) {
      const pack = getPatternPack(opts, 1);
      return scanRegexPack(
        text,
        pack,
        'Remove inflated significance claim. State concrete facts instead.',
        'high',
      );
    },
  },

  {
    id: 2,
    name: 'Notability name-dropping',
    category: 'content',
    description:
      'Listing media outlets or sources to claim notability without providing context or specific claims.',
    weight: 3,
    detect(text, opts = {}) {
      const pack = getPatternPack(opts, 2);
      return scanRegexPack(
        text,
        pack,
        'Cite a specific claim from one named source instead of listing outlets.',
        'medium',
      );
    },
  },

  {
    id: 3,
    name: 'Superficial -ing analyses',
    category: 'content',
    description: 'Tacking "-ing" participial phrases onto sentences to fake depth.',
    weight: 4,
    detect(text, opts = {}) {
      const pack = getPatternPack(opts, 3);
      return scanRegexPack(
        text,
        pack,
        'Remove trailing -ing phrase. If the point matters, give it its own sentence with specifics.',
        'high',
      );
    },
  },

  {
    id: 4,
    name: 'Promotional language',
    category: 'content',
    description: 'Ad-copy language that sounds like a tourism brochure or press release.',
    weight: 3,
    detect(text, opts = {}) {
      const pack = getPatternPack(opts, 4);
      return scanRegexPack(
        text,
        pack,
        'Replace promotional language with neutral, factual description.',
        'high',
      );
    },
  },

  {
    id: 5,
    name: 'Vague attributions',
    category: 'content',
    description: 'Attributing claims to unnamed experts, industry reports, or vague authorities.',
    weight: 4,
    detect(text, opts = {}) {
      const pack = getPatternPack(opts, 5);
      return scanRegexPack(
        text,
        pack,
        "Name the specific source, study, or person. If you can't, remove the claim.",
        'high',
      );
    },
  },

  {
    id: 6,
    name: 'Formulaic challenges',
    category: 'content',
    description: 'Boilerplate "Despite challenges... continues to thrive" sections.',
    weight: 3,
    detect(text, opts = {}) {
      const pack = getPatternPack(opts, 6);
      return scanRegexPack(
        text,
        pack,
        'Replace with specific challenges and concrete outcomes.',
        'high',
      );
    },
  },

  // ── LANGUAGE PATTERNS (7-12) ────────────────────────────

  {
    id: 7,
    name: 'AI vocabulary',
    category: 'language',
    description:
      'Words and phrases that appear far more frequently in AI-generated text. 500+ words tracked across 3 tiers.',
    weight: 5,
    detect(text, opts = {}) {
      const profile = opts.localeProfile;

      // Use locale-specific vocabulary if a profile is provided, otherwise
      // fall back to the English vocabulary imported at the top of this file.
      const tier1 = profile ? profile.tier1 : TIER_1;
      const tier2 = profile ? profile.tier2 : TIER_2;
      const tier3 = profile ? profile.tier3 : TIER_3;
      const phrases = profile ? profile.phrases : AI_PHRASES;

      const results = [];
      const words = wordCount(text);

      // Tier 1: always flag
      results.push(...scanWordList(text, tier1, 'Tier 1 AI word', 'high'));

      // Empirical n-grams from bundled sv-frequencies.json (Swedish); excludes
      // stopwords and curated tier keys. Refresh: npm run corpus:logodds
      const empiricalExtra = profile && profile.empiricalExtra ? profile.empiricalExtra : [];
      if (empiricalExtra.length > 0) {
        results.push(
          ...scanWordList(
            text,
            empiricalExtra,
            'Empirical AI signal (corpus log-odds — npm run corpus:refresh to rebuild)',
            'medium',
          ),
        );
      }

      // Tier 2: flag if 2+ tier-2 words appear
      const tier2Matches = scanWordList(text, tier2, 'Tier 2 AI word', 'medium');
      if (tier2Matches.length >= 2) {
        results.push(...tier2Matches);
      }

      // Tier 3: flag only at high density (>3% of words are tier-3)
      if (words > 50) {
        const tier3Count = tier3.reduce((count, entry) => {
          const { word } = normalizeWordEntry(entry);
          const regex = wordRegex(word);
          return count + countMatches(text, regex);
        }, 0);
        const density = tier3Count / words;
        if (density > 0.03) {
          results.push(...scanWordList(text, tier3, 'Tier 3 AI word (high density)', 'low'));
        }
      }

      // AI phrases — Pattern 7 carries the broad LLM-cliché signal. Patterns
      // 19-24 own chatbot/sycophantic/cutoff/filler/hedging/conclusion so we
      // exclude those categories here to avoid double counting. Pure mechanical
      // substitutions (where `fix` is just a Swedish/English replacement word)
      // are also filtered out — they belong to the autofix flow, not scoring.
      const SUBSTITUTION_FIXES = new Set([
        'to',
        'because',
        'now',
        'if',
        'can',
        'first',
        'finally',
        'för att',
        'eftersom',
        'nu',
        'om',
        'kan',
        'först',
      ]);
      const SUPPRESSED_CATEGORIES = new Set([
        'chatbot',
        'sycophantic',
        'cutoff',
        'filler',
        'hedging',
        'conclusion',
      ]);
      const filteredPhrases = phrases.filter((p) => {
        if (!p || !p.fix) return false;
        if (SUBSTITUTION_FIXES.has(p.fix)) return false;
        const cat = inferPhraseCategory(p);
        if (cat && SUPPRESSED_CATEGORIES.has(cat)) return false;
        return true;
      });
      results.push(...scanPhrases(text, filteredPhrases));

      return results;
    },
  },

  {
    id: 8,
    name: 'Copula avoidance',
    category: 'language',
    description:
      'Using "serves as", "functions as", "boasts" instead of simple "is", "has", "are".',
    weight: 3,
    detect(text, opts = {}) {
      const pack = getPatternPack(opts, 8);
      return scanRegexPack(text, pack, 'Use simple "is", "are", or "has" instead.', 'high');
    },
  },

  {
    id: 9,
    name: 'Negative parallelisms',
    category: 'language',
    description:
      '"It\'s not just X, it\'s Y" or "Not only X but Y" constructions — overused by LLMs.',
    weight: 3,
    detect(text, opts = {}) {
      const pack = getPatternPack(opts, 9);
      return scanRegexPack(
        text,
        pack,
        'Rewrite directly. State what the thing IS, not what it "isn\'t just".',
        'high',
      );
    },
  },

  {
    id: 10,
    name: 'Rule of three',
    category: 'language',
    description: 'Forcing ideas into groups of three. LLMs love triads that sound "comprehensive".',
    weight: 2,
    detect(text, opts = {}) {
      const pack = getPatternPack(opts, 10);
      if (!pack) return [];
      const results = [];

      if (Array.isArray(pack)) {
        return scanRegexPack(
          text,
          pack,
          'Rule of three — pick one or two items that actually matter.',
          'medium',
        );
      }

      if (Array.isArray(pack.triadRegexes) && pack.triadRegexes.length > 0) {
        const sug = pack.triadSuggestions || [];
        pack.triadRegexes.forEach((regex, i) => {
          results.push(
            ...findMatches(
              text,
              regex,
              sug[i] || 'Rule of three — pick what actually matters.',
              'medium',
            ),
          );
        });
      }

      if (Array.isArray(pack.adjectives) && pack.adjectives.length >= 3) {
        const escaped = pack.adjectives
          .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
          .join('|');
        const conj = pack.conjunction || 'och';
        const adjRegex = new RegExp(
          `\\b(${escaped})(?:[a-zåäö]*)?,\\s+(${escaped})(?:[a-zåäö]*)?,?\\s+${conj}\\s+(${escaped})(?:[a-zåäö]*)?\\b`,
          'gi',
        );
        results.push(
          ...findMatches(
            text,
            adjRegex,
            pack.adjectiveSuggestion || 'Buzzy adjective triad. Pick one and make it specific.',
            'medium',
          ),
        );
      }

      if (pack.abstractNounRegex instanceof RegExp) {
        results.push(
          ...findMatches(
            text,
            pack.abstractNounRegex,
            pack.abstractNounSuggestion ||
              'Abstract noun triad. Pick the one or two that actually matter.',
            'medium',
          ),
        );
      }

      return results;
    },
  },

  {
    id: 11,
    name: 'Synonym cycling',
    category: 'language',
    description:
      'Referring to the same thing by different names in consecutive sentences to avoid repetition.',
    weight: 2,
    detect(text, opts = {}) {
      const pack = getPatternPack(opts, 11);
      if (!Array.isArray(pack) || pack.length === 0) return [];

      const synonymSets = pack;

      const results = [];
      const sentences = [];
      let searchFrom = 0;
      for (const sentence of splitSentences(text, opts.localeProfile)) {
        const content = sentence.trim();
        if (!content) continue;

        const foundIndex = text.indexOf(content, searchFrom);
        if (foundIndex !== -1) {
          sentences.push({
            text: content,
            lower: content.toLowerCase(),
            index: foundIndex,
          });
          searchFrom = foundIndex + content.length;
          continue;
        }

        // Fallback when splitter normalization prevents an exact indexOf hit.
        // Advance searchFrom to avoid duplicate offsets on repeated fallback.
        sentences.push({
          text: content,
          lower: content.toLowerCase(),
          index: searchFrom,
        });
        searchFrom += content.length + 1;
      }

      for (const synonyms of synonymSets) {
        const compiledSynonyms = synonyms.map((syn) => ({
          value: syn,
          regex: synonymRegex(syn),
        }));

        for (let i = 0; i < sentences.length - 1; i++) {
          const found = [];
          const foundSet = new Set();
          let firstHitIndex = null;
          for (let j = i; j < Math.min(i + 4, sentences.length); j++) {
            const lower = sentences[j].lower;
            for (const { value, regex } of compiledSynonyms) {
              if (regex.test(lower) && !foundSet.has(value)) {
                foundSet.add(value);
                found.push(value);
                if (firstHitIndex === null) firstHitIndex = j;
              }
            }
          }
          if (found.length >= 3) {
            const startIndex = sentences[firstHitIndex ?? i].index;
            results.push({
              match: `Synonym cycling: ${found.join(' → ')}`,
              index: startIndex,
              line: text.substring(0, startIndex).split('\n').length,
              column: 1,
              suggestion: `Pick one term and stick with it. Found "${found.join('", "')}" used as synonyms in nearby sentences.`,
              confidence: 'medium',
            });
            break;
          }
        }
      }
      return results;
    },
  },

  {
    id: 12,
    name: 'False ranges',
    category: 'language',
    description: '"From X to Y" where X and Y aren\'t on a meaningful scale.',
    weight: 2,
    detect(text, opts = {}) {
      const pack = getPatternPack(opts, 12);
      return scanRegexPack(
        text,
        pack,
        "False range — be specific about what you're actually covering.",
        'medium',
      );
    },
  },

  // ── STYLE PATTERNS (13-18) ──────────────────────────────

  {
    id: 13,
    name: 'Em dash overuse',
    category: 'style',
    description: 'LLMs overuse em dashes (—) as a crutch for punchy writing.',
    weight: 2,
    detect(text) {
      const emDashes = text.match(/—/g) || [];
      const words = wordCount(text);
      const ratio = words > 0 ? emDashes.length / (words / 100) : 0;

      if (ratio > 1.0 && emDashes.length >= 2) {
        return findMatches(
          text,
          /—/g,
          `High em dash density (${emDashes.length} in ${words} words). Replace most with commas, periods, or parentheses.`,
          'medium',
        );
      }
      return [];
    },
  },

  {
    id: 14,
    name: 'Boldface overuse',
    category: 'style',
    description:
      'Mechanical emphasis of phrases in bold. AI uses **bold** as a highlighting crutch.',
    weight: 2,
    detect(text) {
      const boldMatches = text.match(/\*\*[^*]+\*\*/g) || [];
      if (boldMatches.length >= 3) {
        return findMatches(
          text,
          /\*\*[^*]+\*\*/g,
          'Excessive boldface. Remove emphasis — let the writing carry the weight.',
          'medium',
        );
      }
      return [];
    },
  },

  {
    id: 15,
    name: 'Inline-header lists',
    category: 'style',
    description: 'Lists where each item starts with a bolded header followed by a colon.',
    weight: 3,
    detect(text) {
      const inlineHeaders = /^[*-]\s+\*\*[^*]+:\*\*\s/gm;
      const matches = text.match(inlineHeaders) || [];
      if (matches.length >= 2) {
        return findMatches(
          text,
          inlineHeaders,
          'Inline-header list pattern. Convert to a paragraph or use a simpler list.',
          'high',
        );
      }
      return [];
    },
  },

  {
    id: 16,
    name: 'Title Case headings',
    category: 'style',
    description: 'Capitalizing Every Main Word In Headings. AI chatbots default to this.',
    weight: 1,
    detect(text, opts = {}) {
      const pack = getPatternPack(opts, 16);
      const cfg = pack && pack.titleCase;
      if (!cfg) return [];

      const minWords = cfg.minWords ?? 3;
      const minRatio = cfg.minCapitalizedRatio ?? 0.7;
      const skipWords = cfg.skipWords;
      const suggestion =
        cfg.suggestion ||
        'Use sentence case for headings (only capitalize first word and proper nouns).';

      const headingRegex = /^#{1,6}\s+(.+)$/gm;
      const results = [];
      let m;
      while ((m = headingRegex.exec(text)) !== null) {
        const heading = m[1].trim();
        const words = heading.split(/\s+/);
        if (words.length >= minWords) {
          const capitalizedCount = words.filter(
            (w) => /^[A-Z]/.test(w) && !(skipWords && skipWords.test(w)),
          ).length;
          if (capitalizedCount / words.length > minRatio) {
            const lineNum = text.substring(0, m.index).split('\n').length;
            results.push({
              match: m[0],
              index: m.index,
              line: lineNum,
              column: 1,
              suggestion,
              confidence: 'medium',
            });
          }
        }
      }
      return results;
    },
  },

  {
    id: 17,
    name: 'Emoji overuse',
    category: 'style',
    description: 'Decorating headings or bullet points with emojis in professional/technical text.',
    weight: 2,
    detect(text) {
      const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{27BF}\u{2300}-\u{23FF}\u{2B50}]/gu;
      const emojiCount = countMatches(text, emojiRegex);
      if (emojiCount >= 3) {
        return findMatches(
          text,
          emojiRegex,
          'Remove emoji decoration from professional text.',
          'high',
        );
      }
      return [];
    },
  },

  {
    id: 18,
    name: 'Curly quotes',
    category: 'style',
    description:
      'ChatGPT uses Unicode curly quotes (\u201C\u201D\u2018\u2019) instead of straight quotes.',
    weight: 1,
    detect(text) {
      return findMatches(
        text,
        /[\u201C\u201D\u2018\u2019]/g,
        'Replace curly quotes with straight quotes.',
        'high',
      );
    },
  },

  // ── COMMUNICATION PATTERNS (19-21) ─────────────────────

  {
    id: 19,
    name: 'Chatbot artifacts',
    category: 'communication',
    description:
      'Leftover chatbot phrases: "I hope this helps!", "Let me know if...", "Here is an overview".',
    weight: 5,
    detect(text, opts = {}) {
      const phrases = phrasesForLocale(opts);
      return scanPhrases(text, phrasesByCategory(phrases, 'chatbot'));
    },
  },

  {
    id: 20,
    name: 'Cutoff disclaimers',
    category: 'communication',
    description: 'AI knowledge-cutoff disclaimers left in text.',
    weight: 4,
    detect(text, opts = {}) {
      const phrases = phrasesForLocale(opts);
      return scanPhrases(text, phrasesByCategory(phrases, 'cutoff'));
    },
  },

  {
    id: 21,
    name: 'Sycophantic tone',
    category: 'communication',
    description:
      'Overly positive, people-pleasing language: "Great question!", "You\'re absolutely right!".',
    weight: 4,
    detect(text, opts = {}) {
      const phrases = phrasesForLocale(opts);
      return scanPhrases(text, phrasesByCategory(phrases, 'sycophantic'));
    },
  },

  // ── FILLER & HEDGING (22-24) ────────────────────────────

  {
    id: 22,
    name: 'Filler phrases',
    category: 'filler',
    description:
      'Wordy filler that can be shortened: "in order to" → "to", "due to the fact that" → "because".',
    weight: 3,
    detect(text, opts = {}) {
      const phrases = phrasesForLocale(opts);
      return scanPhrases(text, phrasesByCategory(phrases, 'filler'));
    },
  },

  {
    id: 23,
    name: 'Excessive hedging',
    category: 'filler',
    description: 'Stacking qualifiers: "could potentially possibly", "might arguably perhaps".',
    weight: 3,
    detect(text, opts = {}) {
      const phrases = phrasesForLocale(opts);
      return scanPhrases(text, phrasesByCategory(phrases, 'hedging'));
    },
  },

  {
    id: 24,
    name: 'Generic conclusions',
    category: 'filler',
    description: 'Vague upbeat endings: "The future looks bright", "Exciting times lie ahead".',
    weight: 3,
    detect(text, opts = {}) {
      const phrases = phrasesForLocale(opts);
      return scanPhrases(text, phrasesByCategory(phrases, 'conclusion'));
    },
  },

  // ─── NEW PATTERNS (v2.2) ─────────────────────────────────

  {
    id: 25,
    name: 'Reasoning chain artifacts',
    category: 'communication',
    description:
      'Exposed chain-of-thought reasoning: "Let me think...", "Step 1:", "Breaking this down..."',
    weight: 4,
    detect(text, opts = {}) {
      const pack = getPatternPack(opts, 25);
      return scanRegexPack(
        text,
        pack,
        'Hide reasoning or make it natural: "Here\'s my take:" instead of "Let me think step by step:"',
        'high',
      );
    },
  },

  {
    id: 26,
    name: 'Excessive structure',
    category: 'style',
    description:
      'Over-formatted responses: too many headers, nested bullets, or numbered lists for simple content.',
    weight: 3,
    detect(text, opts = {}) {
      const results = [];
      const words = wordCount(text);

      // Count markdown headers
      const headers = (text.match(/^#{1,6}\s+.+$/gm) || []).length;
      // Count bullet points
      const bullets = (text.match(/^[\s]*[-*+]\s+/gm) || []).length;
      // Count numbered items
      const numbered = (text.match(/^[\s]*\d+\.\s+/gm) || []).length;

      // Flag if structure seems excessive for content length
      if (words < 300 && headers >= 3) {
        results.push({
          match: `${headers} headers in ${words} words`,
          index: 0,
          line: 1,
          column: 1,
          suggestion: 'Too many headers for short content. Use prose instead.',
          confidence: 'medium',
        });
      }
      if (words < 200 && bullets + numbered >= 8) {
        results.push({
          match: `${bullets + numbered} list items in ${words} words`,
          index: 0,
          line: 1,
          column: 1,
          suggestion: 'Excessive lists. Could this be a paragraph instead?',
          confidence: 'medium',
        });
      }

      const pack = getPatternPack(opts, 26);
      results.push(
        ...scanRegexPack(text, pack, 'Formulaic structure. Let content flow naturally.', 'medium'),
      );

      return results;
    },
  },

  {
    id: 27,
    name: 'Confidence calibration',
    category: 'communication',
    description:
      'Artificially hedged or over-confident phrasing: "I\'m confident that...", "It\'s worth noting..."',
    weight: 3,
    detect(text, opts = {}) {
      const pack = getPatternPack(opts, 27);
      return scanRegexPack(text, pack, 'State the fact plainly.', 'high');
    },
  },

  {
    id: 28,
    name: 'Acknowledgment loops',
    category: 'communication',
    description: 'Restating the question before answering: "You\'re asking about X. X is..."',
    weight: 4,
    detect(text, opts = {}) {
      const pack = getPatternPack(opts, 28);
      return scanRegexPack(text, pack, "Just answer. Don't restate the question.", 'high');
    },
  },

  {
    id: 29,
    name: 'Invisible unicode obfuscation',
    category: 'style',
    description:
      'Hidden unicode characters (zero-width chars, soft hyphens, non-breaking spaces) used to evade detectors or distort text.',
    weight: 4,
    detect(text) {
      const results = [
        ...findMatches(
          text,
          HIDDEN_UNICODE_CHARS,
          'Remove hidden unicode characters. Some tools insert these to game detectors.',
          'high',
        ),
      ];

      const nbspMatches = findMatches(
        text,
        NON_BREAKING_SPACES,
        'Replace non-breaking spaces with regular spaces unless formatting requires them.',
        'medium',
      );

      // A single NBSP is often harmless (copy/paste from docs).
      // Flag when density suggests obfuscation or accidental corruption.
      if (nbspMatches.length >= 2) {
        results.push(...nbspMatches);
      }

      return results;
    },
  },

  {
    id: 35,
    name: 'Inclusive-language hints (strict mode)',
    category: 'language',
    description:
      'Optional strict-mode hints for exclusionary or outdated wording such as "guys", "manpower", and "chairman".',
    weight: 1,
    detect(text, opts = {}) {
      if (!opts.strict) return [];

      const hints = [
        {
          regex: /\bguys\b/gi,
          suggestion: 'Use "everyone", "folks", or another inclusive group term.',
        },
        {
          regex: /\bmanpower\b/gi,
          suggestion: 'Use "staffing", "workforce", or "personnel".',
        },
        {
          regex: /\bchairman\b/gi,
          suggestion: 'Use "chair", "chairperson", or the role title.',
        },
        {
          regex: /\bmaster\/slave\b/gi,
          suggestion: 'Use "primary/replica" or "leader/follower".',
        },
      ];

      const results = [];
      for (const { regex, suggestion } of hints) {
        results.push(...findMatches(text, regex, suggestion, 'low'));
      }
      return results;
    },
  },
];

// ─── Pattern Registry ────────────────────────────────────

class PatternRegistry {
  constructor() {
    this._patterns = [...patterns];
    this._customWords = { tier1: [], tier2: [], tier3: [] };
  }

  /** Get all patterns. */
  all() {
    return this._patterns;
  }

  /** Get pattern by ID. */
  get(id) {
    return this._patterns.find((p) => p.id === id);
  }

  /** Get patterns by category. */
  byCategory(category) {
    return this._patterns.filter((p) => p.category === category);
  }

  /** Add a custom pattern. */
  add(pattern) {
    if (!pattern.id || !pattern.name || !pattern.detect) {
      throw new Error('Pattern must have id, name, and detect function');
    }
    this._patterns.push(pattern);
  }

  /** Remove a pattern by ID. */
  remove(id) {
    this._patterns = this._patterns.filter((p) => p.id !== id);
  }

  /** Add custom words to a tier. */
  addWords(tier, words) {
    const key = `tier${tier}`;
    if (!this._customWords[key]) throw new Error(`Invalid tier: ${tier}`);
    this._customWords[key].push(...words);
  }

  /** Get full vocabulary for a tier (built-in + custom). */
  getVocabulary(tier) {
    const builtIn = tier === 1 ? TIER_1 : tier === 2 ? TIER_2 : TIER_3;
    return [...builtIn, ...(this._customWords[`tier${tier}`] || [])];
  }

  /** List all pattern IDs and names. */
  list() {
    return this._patterns.map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      weight: p.weight,
    }));
  }

  /** Get categories. */
  categories() {
    return [...new Set(this._patterns.map((p) => p.category))];
  }
}

// Singleton registry
const registry = new PatternRegistry();

// ─── Exports ─────────────────────────────────────────────

module.exports = {
  patterns,
  registry,
  PatternRegistry,
  findMatches,
  countMatches,
  wordCount,
  normalizeWordEntry,
  scanWordList,
  scanPhrases,
  // Re-export vocabulary for backward compat
  TIER_1,
  TIER_2,
  TIER_3,
  AI_PHRASES,
  SIGNIFICANCE_PHRASES,
  PROMOTIONAL_WORDS,
  VAGUE_ATTRIBUTION_PHRASES,
  CHALLENGES_PHRASES,
  COPULA_AVOIDANCE,
};
