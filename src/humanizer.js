/**
 * humanizer.js — Humanization engine.
 *
 * Takes analysis results and produces actionable rewrite suggestions.
 * Includes both:
 *   - autoFix: safe mechanical transforms (curly quotes, filler phrases, chatbot artifacts)
 *   - humanize: full suggestion report with prioritized guidance
 *
 * Humanization techniques based on 2025 research:
 *   - Sentence length variation (mix short with long)
 *   - Burstiness injection (fragments, questions, varied rhythm)
 *   - Concrete specificity (replace vague with numbers/names/dates)
 *   - First-person injection (where appropriate)
 *   - Opinion injection (humans have preferences, AI is neutral)
 */

const { analyze } = require('./analyzer');
const { loadLocale } = require('./locales');
const { transformMarkdownProse } = require('./preprocess');
const { roundDisplayCount } = require('./utils');

const HIDDEN_UNICODE_CHARS = /(?:\u200B|\u200C|\u200D|\u2060|\uFEFF|\u00AD)/;
const HIDDEN_UNICODE_CHARS_GLOBAL = /(?:\u200B|\u200C|\u200D|\u2060|\uFEFF|\u00AD)/g;
const NON_BREAKING_SPACES = /(?:\u00A0|\u202F)/;
const NON_BREAKING_SPACES_GLOBAL = /(?:\u00A0|\u202F)/g;

// ─── Automatic Fixes ─────────────────────────────────────

/**
 * Apply safe, mechanical fixes that don't require judgment.
 * Only transforms where the "right" answer is unambiguous.
 *
 * @param {string} text        — Input text
 * @param {object} [opts]      — Options
 * @param {string} [opts.locale='en'] — Locale code
 * @param {boolean} [opts.ignoreCode=false] — Enable markdown protection during fixes
 * @returns {{ text: string, fixes: string[] }}
 */
function autoFix(text, opts = {}) {
  const { locale = 'en', ignoreCode = false } = opts;
  if (text === null || text === undefined || typeof text !== 'string') {
    return { text, fixes: [] };
  }

  const localeProfile = loadLocale(locale);
  const fixes = [];
  const originalText = text;
  const normalized = text.normalize('NFC');
  if (normalized !== originalText) {
    fixes.push('Normalized Unicode to NFC (composed form)');
  }

  // Filler phrase replacements (unambiguous)
  const safeFills = [
    { from: /\bin order to\b/gi, to: 'to', label: '"in order to" → "to"' },
    {
      from: /\bdue to the fact that\b/gi,
      to: 'because',
      label: '"due to the fact that" → "because"',
    },
    { from: /\bat this point in time\b/gi, to: 'now', label: '"at this point in time" → "now"' },
    { from: /\bin the event that\b/gi, to: 'if', label: '"in the event that" → "if"' },
    { from: /\bhas the ability to\b/gi, to: 'can', label: '"has the ability to" → "can"' },
    { from: /\bfor the purpose of\b/gi, to: 'to', label: '"for the purpose of" → "to"' },
    { from: /\bfirst and foremost\b/gi, to: 'first', label: '"first and foremost" → "first"' },
    {
      from: /\bin light of the fact that\b/gi,
      to: 'because',
      label: '"in light of the fact that" → "because"',
    },
    { from: /\bin the realm of\b/gi, to: 'in', label: '"in the realm of" → "in"' },
    { from: /\butilize\b/gi, to: 'use', label: '"utilize" → "use"' },
    { from: /\butilizing\b/gi, to: 'using', label: '"utilizing" → "using"' },
    { from: /\butilization\b/gi, to: 'use', label: '"utilization" → "use"' },
  ];

  // Chatbot artifact removal (start/end of text)
  const chatbotStart = [
    /^(Here is|Here's) (a |an |the )?(comprehensive |brief |quick )?(overview|summary|breakdown|list|guide|explanation|look)[^.]*\.\s*/i,
    /^(Of course|Certainly|Absolutely|Sure)!\s*/i,
    /^(Great|Excellent|Good|Wonderful|Fantastic) question!\s*/i,
    /^(That's|That is) a (great|excellent|good|wonderful|fantastic) (question|point)!\s*/i,
  ];

  const chatbotEnd = [
    /\s*(I hope this helps|Let me know if you('d| would) like|Feel free to|Don't hesitate to|Is there anything else)[^.]*[.!]\s*$/i,
    /\s*Happy to help[.!]?\s*$/i,
  ];

  const applyFixes = (input) => {
    let next = input;

    // Curly quotes → straight quotes
    if (/[\u201C\u201D]/.test(next)) {
      next = next.replace(/[\u201C\u201D]/g, '"');
      fixes.push('Replaced curly double quotes with straight quotes');
    }
    if (/[\u2018\u2019]/.test(next)) {
      next = next.replace(/[\u2018\u2019]/g, "'");
      fixes.push('Replaced curly single quotes with straight quotes');
    }

    // Hidden obfuscation chars → remove/normalize
    if (HIDDEN_UNICODE_CHARS.test(next)) {
      next = next.replace(HIDDEN_UNICODE_CHARS_GLOBAL, '');
      fixes.push('Removed hidden unicode characters (zero-width/soft hyphen)');
    }
    if (NON_BREAKING_SPACES.test(next)) {
      next = next.replace(NON_BREAKING_SPACES_GLOBAL, ' ');
      fixes.push('Normalized non-breaking spaces to regular spaces');
    }

    // Filler phrase replacements
    for (const { from, to, label } of safeFills) {
      if (from.test(next)) {
        next = next.replace(from, (match) => preserveReplacementCase(match, to));
        fixes.push(label);
      }
    }

    // Locale-specific autofixes (e.g. Swedish mechanical replacements)
    if (localeProfile.autofixes && localeProfile.autofixes.length > 0) {
      for (const { pattern, replacement, label } of localeProfile.autofixes) {
        if (pattern.test(next)) {
          next = next.replace(pattern, (match) => preserveReplacementCase(match, replacement));
          fixes.push(label);
        }
      }
    }

    // Chatbot artifact removal (start of text)
    for (const regex of chatbotStart) {
      if (regex.test(next)) {
        next = next.replace(regex, '');
        fixes.push('Removed chatbot opening artifact');
      }
    }

    // Chatbot artifact removal (end of text)
    for (const regex of chatbotEnd) {
      if (regex.test(next)) {
        next = next.replace(regex, '');
        fixes.push('Removed chatbot closing artifact');
      }
    }

    return next;
  };

  const result = ignoreCode
    ? transformMarkdownProse(normalized, applyFixes)
    : applyFixes(normalized);

  return { text: result.trim(), fixes };
}

function preserveReplacementCase(match, replacement) {
  if (!match || !replacement) return replacement;

  if (match === match.toUpperCase()) {
    return replacement.toUpperCase();
  }

  if (/^\p{Lu}/u.test(match)) {
    return replacement.charAt(0).toUpperCase() + replacement.slice(1);
  }

  return replacement;
}

// ─── Suggestion Engine ───────────────────────────────────

/**
 * Generate humanization suggestions.
 *
 * @param {string} text    — Input text
 * @param {object} opts    — Options:
 *   - autofix {boolean}   Apply safe auto-fixes
 *   - verbose {boolean}   Show all matches
 *   - includeStats {boolean}  Include statistical suggestions
 *   - ignoreCode {boolean}  Ignore fenced/inline code snippets during analysis
 *   - analysisText {string} Preprocessed text to use for analysis only
 *   - analysisIgnoreCode {boolean} Whether analysisText still needs code stripping
 *   - autofixPreserveCode {boolean} When autofix is on, skip fixes inside fenced/inline Markdown code
 *   - autofixIgnoreCode {boolean}   Alias intent for autofix code preservation (legacy)
 *   - ignoreFrontmatter {boolean} Ignore YAML frontmatter during analysis
 *   - ignoreMdx {boolean}        Ignore MDX import/export lines and JSX component tags
 *   - ignoreBlockquotes {boolean} Ignore Markdown blockquote lines (> …)
 *   - proseOnly {boolean}        Shorthand for ignoreFrontmatter + ignoreMdx + ignoreBlockquotes
 *   - locale {string}     Locale code: 'en' (default) or 'sv'
 *   - strict {boolean}    Enable pattern 35 (inclusive-language hints)
 *   - withLm {boolean}    Add n-gram LM uniformity boost
 * @returns {object}       — Suggestions report
 */
function humanize(text, opts = {}) {
  const {
    autofix = false,
    includeStats = true,
    ignoreCode = false,
    analysisText = null,
    analysisIgnoreCode = ignoreCode,
    autofixPreserveCode = false,
    autofixIgnoreCode = false,
    ignoreFrontmatter = false,
    ignoreMdx = false,
    ignoreBlockquotes = false,
    proseOnly = false,
    locale = 'en',
    verbose = true,
    strict = false,
    withLm = false,
  } = opts;

  const analysis = analyze(analysisText ?? text, {
    verbose,
    includeStats,
    ignoreCode: analysisIgnoreCode,
    ignoreFrontmatter,
    ignoreMdx,
    ignoreBlockquotes,
    proseOnly,
    locale,
    strict,
    withLm,
  });

  // Group by priority
  const critical = []; // weight 4-5: dead giveaways
  const important = []; // weight 2-3: noticeable
  const minor = []; // weight 1: subtle

  for (const finding of analysis.findings) {
    const suggestions = finding.matches.map((m) => ({
      pattern: finding.patternName,
      patternId: finding.patternId,
      category: finding.category,
      weight: finding.weight,
      text: m.match,
      line: m.line,
      column: m.column,
      suggestion: m.suggestion,
      confidence: m.confidence || 'high',
      matchWeight: m.matchWeight ?? 1,
      findingMatchCount: finding.matchCount,
    }));

    if (finding.weight >= 4) critical.push(...suggestions);
    else if (finding.weight >= 2) important.push(...suggestions);
    else minor.push(...suggestions);
  }

  // Auto-fix
  let fixedText = null;
  let appliedFixes = [];
  if (autofix) {
    const preserveCodeInAutofix = ignoreCode || autofixPreserveCode || autofixIgnoreCode;
    const result = autoFix(text, { locale, ignoreCode: preserveCodeInAutofix });
    fixedText = result.text;
    appliedFixes = result.fixes;
  }

  // Build guidance (pattern-based + statistical)
  const guidanceItems = buildGuidance(analysis, locale);
  const styleTips = includeStats && analysis.stats ? buildStyleTips(analysis.stats, locale) : [];

  return {
    score: analysis.score,
    patternScore: analysis.patternScore,
    uniformityScore: analysis.uniformityScore,
    lmUniformityBoost: analysis.lmUniformityBoost || 0,
    reliability: analysis.reliability,
    wordCount: analysis.wordCount,
    totalIssues: analysis.totalMatches,
    stats: analysis.stats,
    critical,
    important,
    minor,
    autofix: autofix ? { text: fixedText, fixes: appliedFixes } : null,
    guidance: guidanceItems.map((item) => (typeof item === 'string' ? item : item.text)),
    guidanceItems,
    styleTips,
  };
}

/**
 * Build pattern-based guidance.
 * @param {object} analysis  — Analysis result
 * @param {string} [locale='en'] — Locale code
 * @returns {Array<{text: string, patternIds: number[]}>} — Guidance items with associated pattern IDs
 */
function buildGuidance(analysis, locale = 'en') {
  const tips = [];
  const ids = new Set(analysis.findings.map((f) => f.patternId));
  const sv = locale === 'sv';

  if (ids.has(1) || ids.has(4)) {
    tips.push({
      text: sv
        ? 'Ersätt svulstig och reklamspråkig text med konkreta fakta. Vad hände? Ange datum, siffror, namn.'
        : 'Replace inflated/promotional language with concrete facts. What specifically happened? Give dates, numbers, names.',
      patternIds: [1, 4],
    });
  }
  if (ids.has(3)) {
    tips.push({
      text: sv
        ? 'Ta bort -ing-fraser på slutet av meningar. Om poängen är viktig nog att nämna, ge den en egen mening.'
        : 'Cut trailing -ing phrases. If the point matters enough to mention, give it its own sentence.',
      patternIds: [3],
    });
  }
  if (ids.has(5)) {
    tips.push({
      text: sv
        ? 'Namnge dina källor. "Experter säger" betyder ingenting — vem sa det, när och var?'
        : 'Name your sources. "Experts say" means nothing — who said it, when, and where?',
      patternIds: [5],
    });
  }
  if (ids.has(6)) {
    tips.push({
      text: sv
        ? 'Ersätt schablonmässiga "trots utmaningar"-avsnitt med specifika problem och konkreta resultat.'
        : 'Replace formulaic "despite challenges" sections with specific problems and concrete outcomes.',
      patternIds: [6],
    });
  }
  if (ids.has(7)) {
    tips.push({
      text: sv
        ? 'Byt ut AI-typiska ord mot enklare alternativ. "Sömlös" → (specificera). "Banbrytande" → (vad är det konkret?). "Nyttja" → "använda".'
        : 'Swap AI vocabulary for plainer words. "Delve" → "look at". "Tapestry" → (be specific). "Showcase" → "show".',
      patternIds: [7],
    });
  }
  if (ids.has(8)) {
    tips.push({
      text: sv
        ? 'Använd "är" och "har" fritt. "Fungerar som" och "stoltserar med" är onödigt krångliga.'
        : 'Use "is" and "has" freely. "Serves as" and "boasts" are needlessly fancy.',
      patternIds: [8],
    });
  }
  if (ids.has(9)) {
    tips.push({
      text: sv
        ? 'Ta bort "inte bara X, utan även Y"-konstruktioner. Säg bara vad saken är.'
        : 'Drop "not just X, it\'s Y" frames. Just say what the thing is.',
      patternIds: [9],
    });
  }
  if (ids.has(10)) {
    tips.push({
      text: sv
        ? 'Bryt upp trepartsuppräkningar. Du behöver inte alltid tre av allt.'
        : "Break up triads. You don't always need three of everything.",
      patternIds: [10],
    });
  }
  if (ids.has(13)) {
    tips.push({
      text: sv
        ? 'Minska tankstrecken. Använd kommatecken, punkter eller parenteser för variation.'
        : 'Ease up on em dashes. Use commas, periods, or parentheses for variety.',
      patternIds: [13],
    });
  }
  if (ids.has(14) || ids.has(15)) {
    tips.push({
      text: sv
        ? 'Ta bort mekanisk fet-formatering och listliknande rubriker i löptext. Låt prosan göra jobbet.'
        : 'Strip mechanical bold formatting and inline-header lists. Let prose do the work.',
      patternIds: [14, 15],
    });
  }
  if (ids.has(17)) {
    tips.push({
      text: sv
        ? 'Ta bort emojis från professionell text. De signalerar chattbot-output.'
        : 'Remove emojis from professional text. They signal chatbot output.',
      patternIds: [17],
    });
  }
  if (ids.has(19) || ids.has(21)) {
    tips.push({
      text: sv
        ? 'Ta bort chattbot-utfyllnad ("Hoppas det hjälper!", "Bra fråga!"). Leverera bara innehållet.'
        : 'Remove chatbot filler ("I hope this helps!", "Great question!"). Just deliver the content.',
      patternIds: [19, 21],
    });
  }
  if (ids.has(20)) {
    tips.push({
      text: sv
        ? 'Ta bort friskrivningar om kunskapsavstängningsdatum. Forskar du eller låter du bli påståendet.'
        : 'Delete knowledge-cutoff disclaimers. Either research it or leave it out.',
      patternIds: [20],
    });
  }
  if (ids.has(22) || ids.has(23)) {
    tips.push({
      text: sv
        ? 'Skär ned på utfyllnad och mjukisformuleringar. "I syfte att" → "för att". En kvalificering per påstående räcker.'
        : 'Trim filler and hedging. "In order to" → "to". One qualifier per claim is enough.',
      patternIds: [22, 23],
    });
  }
  if (ids.has(24)) {
    tips.push({
      text: sv
        ? 'Klipp bort generiska avslutningar. Avsluta med ett konkret faktum istället för "framtiden ser ljus ut".'
        : 'Cut generic conclusions. End with a specific fact instead of "the future looks bright".',
      patternIds: [24],
    });
  }
  if (ids.has(29)) {
    tips.push({
      text: sv
        ? 'Ta bort dolda Unicode-tecken (nollbredd, mjukt bindestreck, hårt blanksteg). De kan störa läsbarheten och likna försök att lura detektorer.'
        : 'Remove hidden unicode characters (zero-width, soft hyphen, NBSP). They can break readability and look like detector-gaming obfuscation.',
      patternIds: [29],
    });
  }

  const guidanceSeverityScore =
    typeof analysis.rawScore === 'number' && Number.isFinite(analysis.rawScore)
      ? analysis.rawScore
      : analysis.score;

  if (guidanceSeverityScore >= 50) {
    tips.push({
      text: sv
        ? 'Överväg att skriva om från grunden. När AI-mönster är så täta räcker det inte att lappa enskilda fraser — själva strukturen behöver omarbetas.'
        : "Consider rewriting from scratch. When AI patterns are this dense, patching individual phrases isn't enough — the structure itself needs rethinking.",
      patternIds: [],
    });
  }

  return tips;
}

/**
 * Build statistical style tips based on text metrics.
 * These suggest structural improvements beyond word choice.
 * @param {object} stats   — Stats from computeStats()
 * @param {string} [locale='en'] — Locale code
 */
function buildStyleTips(stats, locale = 'en') {
  const tips = [];
  const sv = locale === 'sv';

  // Burstiness
  if (stats.burstiness < 0.25 && stats.sentenceCount > 4) {
    tips.push({
      metric: 'burstiness',
      value: stats.burstiness,
      tip: sv
        ? 'Meningsrytmen är mycket jämn. Blanda korta, kärnfulla meningar (3–8 ord) med längre flödande sådana (20+). Fragment fungerar också. Så här.'
        : 'Sentence rhythm is very uniform. Mix short punchy sentences (3-8 words) with longer flowing ones (20+). Fragments work too. Like this.',
    });
  }

  // Sentence length variation
  if (stats.sentenceLengthVariation < 0.3 && stats.sentenceCount > 4) {
    tips.push({
      metric: 'sentenceLengthVariation',
      value: stats.sentenceLengthVariation,
      tip: sv
        ? `Meningarna är ungefär ${Math.round(stats.avgSentenceLength)} ord långa. Variera rytmen — växla mellan korta och långa.`
        : `Sentences are all roughly ${Math.round(stats.avgSentenceLength)} words. Vary your rhythm — alternate between short and long.`,
    });
  }

  // Very long average sentences
  if (stats.avgSentenceLength > 28) {
    tips.push({
      metric: 'avgSentenceLength',
      value: stats.avgSentenceLength,
      tip: sv
        ? 'Medelmeningslängden är ganska lång. Dela upp några meningar i kortare. Varje tanke behöver inte en bisats.'
        : 'Average sentence is quite long. Break some into shorter ones. Not every thought needs a subordinate clause.',
    });
  }

  // Low vocabulary diversity
  if (stats.typeTokenRatio < 0.4 && stats.wordCount > 100) {
    tips.push({
      metric: 'typeTokenRatio',
      value: stats.typeTokenRatio,
      tip: sv
        ? 'Ordförrådet är repetitivt. Försök variera ordvalen — men synonym-cykla inte (det är också ett AI-tecken).'
        : "Vocabulary is repetitive. Try using more varied word choices — but don't synonym-cycle (that's also an AI tell).",
    });
  }

  // High trigram repetition
  if (stats.trigramRepetition > 0.1 && stats.wordCount > 100) {
    tips.push({
      metric: 'trigramRepetition',
      value: stats.trigramRepetition,
      tip: sv
        ? 'Upprepade treordsfraser hittades. Variera meningsstrukturerna.'
        : 'Repeated 3-word phrases detected. Vary your sentence structures.',
    });
  }

  // LIX readability tip (Swedish only)
  if (sv && stats.lix !== null && stats.sentenceCount > 2) {
    if (stats.lix > 60) {
      tips.push({
        metric: 'lix',
        value: stats.lix,
        tip: `LIX ${stats.lix} — mycket svår text. Förkorta meningar och byt ut långa ord mot kortare alternativ.`,
      });
    } else if (stats.lix > 50) {
      tips.push({
        metric: 'lix',
        value: stats.lix,
        tip: `LIX ${stats.lix} — svår text. Överväg kortare meningar och enklare ordval.`,
      });
    }
  }

  // Add humanization techniques if text scores poorly
  if (tips.length >= 2) {
    tips.push({
      metric: 'general',
      value: null,
      tip: sv
        ? 'Testa högt-läsning: läs texten högt. Om den låter konstig eller robotaktig, skriv om de delarna tills de låter som något du faktiskt skulle säga.'
        : "Try the read-aloud test: read the text out loud. If it sounds weird or robotic, rewrite those parts until they sound like something you'd actually say.",
    });
    tips.push({
      metric: 'general',
      value: null,
      tip: sv
        ? 'Lägg till förstapersonsperspektiv där det passar: "Jag märkte", "Vi observerade", "Enligt min erfarenhet". Riktiga människor skriver från en synvinkel.'
        : 'Add first-person perspective where it fits: "I found", "We noticed", "In my experience". Real humans write from a point of view.',
    });
  }

  return tips;
}

// ─── Report Formatting ──────────────────────────────────

/**
 * Format humanization suggestions as readable terminal output.
 */
function formatSuggestions(result) {
  const lines = [];

  lines.push('');
  lines.push('╔══════════════════════════════════════════════════╗');
  lines.push('║           HUMANIZATION SUGGESTIONS               ║');
  lines.push('╚══════════════════════════════════════════════════╝');
  lines.push('');

  const filled = Math.round(result.score / 5);
  const bar = '█'.repeat(filled) + '░'.repeat(20 - filled);
  lines.push(`  AI Score: ${result.score}/100  [${bar}]`);
  lines.push(
    `  Issues: ${roundDisplayCount(result.totalIssues)}  |  Pattern: ${result.patternScore}  |  Uniformity: ${result.uniformityScore}`,
  );
  if (result.reliability) {
    lines.push(
      `  Confidence: ${formatReliabilityLabel(result.reliability.level)} (${result.reliability.score}/100)`,
    );
  }
  lines.push('');

  if (result.critical.length > 0) {
    lines.push('── CRITICAL (dead giveaways) ───────────────────────');
    for (const s of result.critical) {
      lines.push(`  L${s.line}: [${s.pattern}] "${truncate(s.text, 60)}" [${s.confidence}]`);
      lines.push(`       → ${s.suggestion}`);
    }
    lines.push('');
  }

  if (result.important.length > 0) {
    lines.push('── IMPORTANT (noticeable patterns) ─────────────────');
    for (const s of result.important) {
      lines.push(`  L${s.line}: [${s.pattern}] "${truncate(s.text, 60)}"`);
      lines.push(`       → ${s.suggestion}`);
    }
    lines.push('');
  }

  if (result.minor.length > 0) {
    lines.push('── MINOR (subtle tells) ────────────────────────────');
    for (const s of result.minor) {
      lines.push(`  L${s.line}: [${s.pattern}] "${truncate(s.text, 60)}"`);
      lines.push(`       → ${s.suggestion}`);
    }
    lines.push('');
  }

  if (result.autofix) {
    lines.push('── AUTO-FIXES APPLIED ──────────────────────────────');
    for (const fix of result.autofix.fixes) {
      lines.push(`  ✓ ${fix}`);
    }
    lines.push('');
  }

  if (result.guidance.length > 0) {
    lines.push('── GUIDANCE ────────────────────────────────────────');
    for (const tip of result.guidance) {
      const tipText = typeof tip === 'string' ? tip : tip.text;
      lines.push(`  • ${tipText}`);
    }
    lines.push('');
  }

  if (result.styleTips.length > 0) {
    lines.push('── STYLE TIPS (statistical) ────────────────────────');
    for (const t of result.styleTips) {
      const metric = t.value !== null ? ` [${t.metric}: ${t.value}]` : '';
      lines.push(`  ◦ ${t.tip}${metric}`);
    }
    lines.push('');
  }

  lines.push('════════════════════════════════════════════════════');
  return lines.join('\n');
}

function truncate(str, len) {
  if (typeof str !== 'string') return '';
  return str.length > len ? `${str.substring(0, len)}...` : str;
}

function formatReliabilityLabel(level) {
  if (level === 'high') return 'High confidence';
  if (level === 'medium') return 'Medium confidence';
  return 'Low confidence';
}

// ─── Exports ─────────────────────────────────────────────

module.exports = {
  humanize,
  autoFix,
  formatSuggestions,
  buildGuidance,
  buildStyleTips,
};
