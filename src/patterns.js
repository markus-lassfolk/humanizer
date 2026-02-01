/**
 * patterns.js — All 24 AI writing pattern definitions with detection rules.
 *
 * Each pattern has:
 *   id          – Numeric id (1-24)
 *   name        – Short human-readable name
 *   category    – One of: content, language, style, communication, filler
 *   description – What the pattern is and why it matters
 *   detect(text)– Returns an array of { match, index, line, suggestion }
 *   weight      – How much this pattern contributes to the overall AI score (1-5)
 */

// ─── Helpers ─────────────────────────────────────────────

/** Find all regex matches with line numbers. */
function findMatches(text, regex, suggestion) {
  const results = [];
  const lines = text.split('\n');
  let offset = 0;

  for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    const line = lines[lineNum];
    let m;
    // Reset regex state for each line
    const lineRegex = new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : regex.flags + 'g');
    while ((m = lineRegex.exec(line)) !== null) {
      results.push({
        match: m[0],
        index: offset + m.index,
        line: lineNum + 1,
        column: m.index + 1,
        suggestion: typeof suggestion === 'function' ? suggestion(m[0]) : suggestion,
      });
    }
    offset += line.length + 1; // +1 for newline
  }
  return results;
}

/** Count occurrences of a regex in text. */
function countMatches(text, regex) {
  const matches = text.match(regex);
  return matches ? matches.length : 0;
}

/** Word count of text. */
function wordCount(text) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  return words.length;
}

// ─── AI Vocabulary Lists ─────────────────────────────────

const AI_VOCAB_HIGH = [
  'additionally', 'delve', 'tapestry', 'testament', 'underscore',
  'pivotal', 'landscape', 'intricate', 'intricacies', 'showcasing',
  'showcase', 'fostering', 'foster', 'garner', 'garnered',
  'interplay', 'enduring', 'vibrant', 'crucial', 'enhance',
  'enhanced', 'enhancing',
];

const AI_VOCAB_MEDIUM = [
  'furthermore', 'moreover', 'notably', 'comprehensive', 'multifaceted',
  'nuanced', 'paradigm', 'transformative', 'leveraging', 'leverage',
  'synergy', 'holistic', 'robust', 'streamline', 'streamlined',
  'utilize', 'utilizing', 'utilization', 'facilitate', 'facilitated',
  'facilitating', 'elucidate', 'illuminate', 'illuminate',
  'encompasses', 'encompassing', 'spearhead', 'spearheading',
  'underscores', 'underscoring', 'highlights', 'highlighting',
  'invaluable', 'groundbreaking', 'cutting-edge', 'innovative',
  'bolster', 'bolstering', 'catalyze', 'catalyst', 'cornerstone',
  'reimagine', 'reimagining', 'empower', 'empowering', 'empowerment',
  'harness', 'harnessing', 'navigate', 'navigating',
  'aligns', 'aligning', 'alignment', 'align with',
  'realm', 'poised', 'myriad',
];

const SIGNIFICANCE_PHRASES = [
  /marking a pivotal/gi, /pivotal moment/gi, /pivotal role/gi,
  /key role/gi, /crucial role/gi, /vital role/gi, /significant role/gi,
  /is a testament/gi, /stands as a testament/gi, /serves as a testament/gi,
  /serves as a reminder/gi,
  /reflects broader/gi, /broader trends/gi, /broader movement/gi,
  /evolving landscape/gi, /evolving world/gi,
  /setting the stage for/gi, /marking a shift/gi, /key turning point/gi,
  /indelible mark/gi, /deeply rooted/gi, /focal point/gi,
  /symbolizing its ongoing/gi, /enduring legacy/gi, /lasting impact/gi,
  /contributing to the/gi, /underscores the importance/gi,
  /highlights the significance/gi, /represents a shift/gi,
  /shaping the future/gi, /the evolution of/gi,
];

const PROMOTIONAL_WORDS = [
  /\bnestled\b/gi, /\bin the heart of\b/gi, /\bbreathtaking\b/gi,
  /\bmust-visit\b/gi, /\bstunning\b/gi, /\brenowned\b/gi,
  /\bgroundbreaking\b/gi, /\bnatural beauty\b/gi,
  /\brich cultural heritage\b/gi, /\brich history\b/gi,
  /\bcommitment to\b/gi, /\bexemplifies\b/gi,
  /\bworld-class\b/gi, /\bstate-of-the-art\b/gi,
  /\bseamless\b/gi, /\bgame-changing\b/gi, /\bgame changer\b/gi,
  /\bunparalleled\b/gi, /\bprofound\b/gi,
];

const VAGUE_ATTRIBUTION_PHRASES = [
  /\bexperts (believe|argue|say|suggest|note|agree|contend)\b/gi,
  /\bindustry (reports|observers|experts|analysts|leaders)\b/gi,
  /\bobservers have (cited|noted|pointed out)\b/gi,
  /\bsome critics argue\b/gi, /\bsome experts (say|believe|suggest)\b/gi,
  /\bseveral sources\b/gi, /\baccording to reports\b/gi,
  /\bwidely (regarded|considered|recognized|acknowledged)\b/gi,
  /\bit is widely (known|believed|accepted)\b/gi,
  /\bmany (experts|scholars|researchers|analysts) (believe|argue|suggest)\b/gi,
  /\bstudies (show|suggest|indicate|have shown)\b/gi,
  /\bresearch (shows|suggests|indicates|has shown)\b/gi,
];

const CHALLENGES_PHRASES = [
  /despite (its|these|the|their) (challenges|setbacks|obstacles|difficulties)/gi,
  /faces (several|many|numerous|various) challenges/gi,
  /continues to thrive/gi, /continues to grow/gi,
  /future (outlook|prospects) (remain|look|appear)/gi,
  /challenges and (future|legacy|opportunities)/gi,
  /despite these (challenges|hurdles|obstacles)/gi,
];

const COPULA_AVOIDANCE = [
  /\bserves as( a)?\b/gi, /\bstands as( a)?\b/gi,
  /\bmarks a\b/gi, /\brepresents a\b/gi,
  /\bboasts (a|an|over|more)\b/gi, /\bfeatures (a|an|over|more)\b/gi,
  /\boffers (a|an)\b/gi, /\bfunctions as\b/gi,
  /\bacts as( a)?\b/gi, /\boperates as( a)?\b/gi,
];

const CHATBOT_ARTIFACTS = [
  /\bI hope this helps\b/gi, /\blet me know if\b/gi,
  /\bwould you like me to\b/gi, /\bfeel free to\b/gi,
  /\bdon't hesitate to\b/gi, /\bhappy to help\b/gi,
  /\bhere is (a |an |the )?(overview|summary|breakdown|list|guide)/gi,
  /\bOf course!/gi, /\bCertainly!/gi, /\bAbsolutely!/gi,
  /\bI'd be happy to\b/gi, /\bIs there anything else\b/gi,
];

const SYCOPHANTIC_PHRASES = [
  /\bgreat question\b/gi, /\bexcellent (question|point)\b/gi,
  /\bthat's a (great|excellent|wonderful|fantastic|good) (question|point)\b/gi,
  /\byou're absolutely right\b/gi, /\byou raise a (great|good|excellent|valid) point\b/gi,
  /\bthat's an insightful\b/gi, /\byou've hit (on|upon)\b/gi,
  /\bwhat a (great|wonderful|fantastic)\b/gi,
];

const CUTOFF_DISCLAIMERS = [
  /\bas of (my|this) (last|latest)\b/gi,
  /\bas of \d{4}\b/gi,
  /\bup to my (last )?training\b/gi,
  /\bwhile (specific )?details are (limited|scarce)\b/gi,
  /\bbased on available information\b/gi,
  /\bbased on (my|current) (knowledge|information|understanding)\b/gi,
  /\bI (don't|do not) have (access to|information about) (real-time|current)\b/gi,
];

const FILLER_PHRASES = [
  { pattern: /\bin order to\b/gi, fix: 'to' },
  { pattern: /\bdue to the fact that\b/gi, fix: 'because' },
  { pattern: /\bat this point in time\b/gi, fix: 'now' },
  { pattern: /\bin the event that\b/gi, fix: 'if' },
  { pattern: /\bhas the ability to\b/gi, fix: 'can' },
  { pattern: /\bit is important to note that\b/gi, fix: '(remove — just state the fact)' },
  { pattern: /\bit is worth noting that\b/gi, fix: '(remove — just state the fact)' },
  { pattern: /\bit should be noted that\b/gi, fix: '(remove — just state the fact)' },
  { pattern: /\bin today's (rapidly )?(evolving|changing)\b/gi, fix: '(remove or be specific about what changed)' },
  { pattern: /\bin today's world\b/gi, fix: '(remove or be specific)' },
  { pattern: /\bat the end of the day\b/gi, fix: '(remove or replace with specific conclusion)' },
  { pattern: /\bwhen it comes to\b/gi, fix: 'for' },
  { pattern: /\bthe fact of the matter is\b/gi, fix: '(remove — just state it)' },
  { pattern: /\bin terms of\b/gi, fix: 'for / about / regarding' },
  { pattern: /\bfor the purpose of\b/gi, fix: 'to / for' },
  { pattern: /\bin light of the fact that\b/gi, fix: 'because / since' },
  { pattern: /\bin the realm of\b/gi, fix: 'in' },
  { pattern: /\bat its core\b/gi, fix: '(remove or be specific)' },
  { pattern: /\bfirst and foremost\b/gi, fix: 'first' },
  { pattern: /\blast but not least\b/gi, fix: 'finally' },
];

const HEDGING_WORDS = [
  /\bcould potentially\b/gi, /\bmight possibly\b/gi,
  /\bcould possibly\b/gi, /\bpotentially could\b/gi,
  /\bit could be argued\b/gi, /\bone could argue\b/gi,
  /\bsomewhat arguably\b/gi, /\bperhaps potentially\b/gi,
  /\bmay potentially\b/gi, /\bcould conceivably\b/gi,
  /\bone might suggest\b/gi, /\bit is possible that\b/gi,
  /\bthere is a possibility\b/gi, /\bthere is potential for\b/gi,
];

const GENERIC_CONCLUSIONS = [
  /\bthe future (looks|is) bright\b/gi,
  /\bexciting times (lie|lay) ahead\b/gi,
  /\bcontinue (this|their|our) journey\b/gi,
  /\bjourney toward(s)? excellence\b/gi,
  /\ba (major|significant|important) step (in|toward)/gi,
  /\bstep in the right direction\b/gi,
  /\bonly time will tell\b/gi,
  /\bremains to be seen\b/gi,
  /\bthe possibilities are (endless|limitless)\b/gi,
  /\bpoised for (growth|success|greatness)\b/gi,
  /\bthe sky('s| is) the limit\b/gi,
  /\bwatch this space\b/gi,
  /\bstay tuned\b/gi,
];

// ─── Pattern Definitions ─────────────────────────────────

const patterns = [
  // ── CONTENT PATTERNS (1-6) ──────────────────────────────

  {
    id: 1,
    name: 'Significance inflation',
    category: 'content',
    description: 'Inflated claims about significance, legacy, or broader trends. LLMs puff up importance of mundane things.',
    weight: 4,
    detect(text) {
      const results = [];
      for (const regex of SIGNIFICANCE_PHRASES) {
        results.push(...findMatches(text, regex, 'Remove inflated significance claim. State concrete facts instead.'));
      }
      return results;
    },
  },

  {
    id: 2,
    name: 'Notability name-dropping',
    category: 'content',
    description: 'Listing media outlets or sources to claim notability without providing context or specific claims.',
    weight: 3,
    detect(text) {
      // Detect comma-separated lists of media outlets
      const mediaList = /\b(cited|featured|covered|mentioned|reported|published) (in|by) .{0,20}(The New York Times|BBC|CNN|The Washington Post|The Guardian|Wired|Forbes|Reuters|Bloomberg|Financial Times|The Verge|TechCrunch|The Hindu|Al Jazeera).{0,100}(,\s*(and\s+)?(The New York Times|BBC|CNN|The Washington Post|The Guardian|Wired|Forbes|Reuters|Bloomberg|Financial Times|The Verge|TechCrunch|The Hindu|Al Jazeera))+/gi;
      const results = findMatches(text, mediaList, 'Instead of listing outlets, cite one specific claim from one source.');

      // "active social media presence"
      results.push(...findMatches(text, /\bactive social media presence\b/gi, 'Remove — not meaningful without specific context.'));
      results.push(...findMatches(text, /\bwritten by a leading expert\b/gi, 'Name the expert and their specific credential.'));
      return results;
    },
  },

  {
    id: 3,
    name: 'Superficial -ing analyses',
    category: 'content',
    description: 'Tacking "-ing" participial phrases onto sentences to fake depth (highlighting, showcasing, reflecting...).',
    weight: 4,
    detect(text) {
      // Detect trailing -ing phrases used as superficial analysis
      const ingPhrases = /,\s*(highlighting|underscoring|emphasizing|ensuring|reflecting|symbolizing|contributing to|cultivating|fostering|encompassing|showcasing|demonstrating|illustrating|representing|signaling|indicating|solidifying|reinforcing|cementing)\b[^.]{5,}/gi;
      return findMatches(text, ingPhrases, 'Remove trailing -ing phrase. If the point matters, give it its own sentence with specifics.');
    },
  },

  {
    id: 4,
    name: 'Promotional language',
    category: 'content',
    description: 'Ad-copy language that sounds like a tourism brochure or press release.',
    weight: 3,
    detect(text) {
      const results = [];
      for (const regex of PROMOTIONAL_WORDS) {
        results.push(...findMatches(text, regex, 'Replace promotional language with neutral, factual description.'));
      }
      return results;
    },
  },

  {
    id: 5,
    name: 'Vague attributions',
    category: 'content',
    description: 'Attributing claims to unnamed experts, industry reports, or vague authorities.',
    weight: 4,
    detect(text) {
      const results = [];
      for (const regex of VAGUE_ATTRIBUTION_PHRASES) {
        results.push(...findMatches(text, regex, 'Name the specific source, study, or person. If you can\'t, remove the claim.'));
      }
      return results;
    },
  },

  {
    id: 6,
    name: 'Formulaic challenges',
    category: 'content',
    description: 'Boilerplate "Despite challenges... continues to thrive" sections.',
    weight: 3,
    detect(text) {
      const results = [];
      for (const regex of CHALLENGES_PHRASES) {
        results.push(...findMatches(text, regex, 'Replace with specific challenges and concrete outcomes.'));
      }
      return results;
    },
  },

  // ── LANGUAGE PATTERNS (7-12) ────────────────────────────

  {
    id: 7,
    name: 'AI vocabulary',
    category: 'language',
    description: 'Words and phrases that appear far more in AI-generated text than human writing.',
    weight: 5,
    detect(text) {
      const results = [];
      const lower = text.toLowerCase();

      for (const word of AI_VOCAB_HIGH) {
        const regex = new RegExp(`\\b${word}\\b`, 'gi');
        const matches = findMatches(text, regex, `"${word}" is a high-frequency AI word. Use a simpler/more specific alternative.`);
        results.push(...matches);
      }

      // Only flag medium-frequency words if there are several (density check)
      const mediumCount = AI_VOCAB_MEDIUM.reduce((count, word) => {
        const regex = new RegExp(`\\b${word}\\b`, 'gi');
        return count + countMatches(text, regex);
      }, 0);

      const words = wordCount(text);
      const density = words > 0 ? mediumCount / words : 0;

      // Flag individual medium words only if density is high (>2%)
      if (density > 0.02) {
        for (const word of AI_VOCAB_MEDIUM) {
          const regex = new RegExp(`\\b${word}\\b`, 'gi');
          const matches = findMatches(text, regex, `"${word}" is common in AI text. Consider a simpler word.`);
          results.push(...matches);
        }
      }

      return results;
    },
  },

  {
    id: 8,
    name: 'Copula avoidance',
    category: 'language',
    description: 'Using "serves as", "functions as", "boasts" instead of simple "is", "has", "are".',
    weight: 3,
    detect(text) {
      const results = [];
      for (const regex of COPULA_AVOIDANCE) {
        results.push(...findMatches(text, regex, 'Use simple "is", "are", or "has" instead.'));
      }
      return results;
    },
  },

  {
    id: 9,
    name: 'Negative parallelisms',
    category: 'language',
    description: '"It\'s not just X, it\'s Y" or "Not only X but Y" constructions — overused by LLMs.',
    weight: 3,
    detect(text) {
      const negParallel = /\b(it'?s|this is) not (just|merely|only|simply) .{3,60}(,|;|—)\s*(it'?s|this is|but)\b/gi;
      const notOnly = /\bnot only .{3,60} but (also )?\b/gi;
      return [
        ...findMatches(text, negParallel, 'Rewrite directly. State what the thing IS, not what it "isn\'t just".'),
        ...findMatches(text, notOnly, 'Simplify. Remove the "not only...but also" frame.'),
      ];
    },
  },

  {
    id: 10,
    name: 'Rule of three',
    category: 'language',
    description: 'Forcing ideas into groups of three. LLMs love triads that sound "comprehensive".',
    weight: 2,
    detect(text) {
      // Match three comma-separated items followed by "and" — the classic triad
      // This looks for abstract/buzzy triads, not just any list of three things
      const buzzyTriad = /\b(\w+tion|\w+ity|\w+ment|\w+ness|\w+ance|\w+ence),\s+(\w+tion|\w+ity|\w+ment|\w+ness|\w+ance|\w+ence),\s+and\s+(\w+tion|\w+ity|\w+ment|\w+ness|\w+ance|\w+ence)\b/gi;
      const results = findMatches(text, buzzyTriad, 'Rule of three with abstract nouns. Pick the one or two that actually matter.');

      // Also check for triads of adjectives
      const adjTriad = /\b(seamless|intuitive|powerful|innovative|dynamic|robust|comprehensive|cutting-edge|scalable|agile|efficient|effective|engaging|impactful|meaningful),\s+(seamless|intuitive|powerful|innovative|dynamic|robust|comprehensive|cutting-edge|scalable|agile|efficient|effective|engaging|impactful|meaningful),\s+and\s+(seamless|intuitive|powerful|innovative|dynamic|robust|comprehensive|cutting-edge|scalable|agile|efficient|effective|engaging|impactful|meaningful)/gi;
      results.push(...findMatches(text, adjTriad, 'Buzzy adjective triad. Pick one and make it specific.'));

      return results;
    },
  },

  {
    id: 11,
    name: 'Synonym cycling',
    category: 'language',
    description: 'Referring to the same thing by different names in consecutive sentences to avoid repetition.',
    weight: 2,
    detect(text) {
      // Check for common synonym cycles
      const synonymSets = [
        ['protagonist', 'main character', 'central figure', 'hero', 'lead character'],
        ['company', 'firm', 'organization', 'enterprise', 'corporation', 'establishment'],
        ['city', 'metropolis', 'urban center', 'municipality', 'locale'],
        ['building', 'structure', 'edifice', 'facility', 'complex'],
        ['tool', 'instrument', 'mechanism', 'apparatus', 'device'],
      ];

      const results = [];
      const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);

      for (const synonyms of synonymSets) {
        for (let i = 0; i < sentences.length - 1; i++) {
          const found = [];
          for (let j = i; j < Math.min(i + 4, sentences.length); j++) {
            const lower = sentences[j].toLowerCase();
            for (const syn of synonyms) {
              if (lower.includes(syn) && !found.includes(syn)) {
                found.push(syn);
              }
            }
          }
          if (found.length >= 3) {
            results.push({
              match: `Synonym cycling: ${found.join(' → ')}`,
              index: text.indexOf(sentences[i]),
              line: text.substring(0, text.indexOf(sentences[i])).split('\n').length,
              column: 1,
              suggestion: `Pick one term and stick with it. Found "${found.join('", "')}" used as synonyms in nearby sentences.`,
            });
            break; // Don't double-report the same set
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
    detect(text) {
      // Detect "from X to Y, from A to B" double-range patterns
      const doubleRange = /\bfrom .{3,40} to .{3,40},\s*from .{3,40} to .{3,40}/gi;
      const results = findMatches(text, doubleRange, 'False range — X and Y probably aren\'t on a meaningful scale. Just list the topics.');

      // Single false ranges with abstract nouns
      const abstractRange = /\bfrom (the )?(dawn|birth|inception|beginning|advent|emergence|rise) .{3,60} to (the )?(modern|current|present|contemporary|latest|cutting-edge|digital)/gi;
      results.push(...findMatches(text, abstractRange, 'Unnecessarily broad range. Be specific about what you\'re actually covering.'));

      return results;
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
      const results = [];

      // More than 1 em dash per 100 words is suspicious
      if (ratio > 1.0 && emDashes.length >= 2) {
        // Find each em dash
        const emDashRegex = /—/g;
        const matches = findMatches(text, emDashRegex,
          `High em dash density (${emDashes.length} in ${words} words). Replace most with commas, periods, or parentheses.`);
        results.push(...matches);
      }

      return results;
    },
  },

  {
    id: 14,
    name: 'Boldface overuse',
    category: 'style',
    description: 'Mechanical emphasis of phrases in bold. AI uses **bold** as a highlighting crutch.',
    weight: 2,
    detect(text) {
      const boldMatches = text.match(/\*\*[^*]+\*\*/g) || [];
      if (boldMatches.length >= 3) {
        return findMatches(text, /\*\*[^*]+\*\*/g,
          'Excessive boldface. Remove emphasis — let the writing carry the weight.');
      }
      return [];
    },
  },

  {
    id: 15,
    name: 'Inline-header lists',
    category: 'style',
    description: 'Lists where each item starts with a bolded header followed by a colon, repeating the header word.',
    weight: 3,
    detect(text) {
      const inlineHeaders = /^[*\-]\s+\*\*[^*]+:\*\*\s/gm;
      const matches = text.match(inlineHeaders) || [];
      if (matches.length >= 2) {
        return findMatches(text, inlineHeaders,
          'Inline-header list pattern. Convert to a paragraph or use a simpler list.');
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
    detect(text) {
      // Match markdown headings with title case (3+ capitalized words)
      const headingRegex = /^#{1,6}\s+(.+)$/gm;
      const results = [];
      let m;
      while ((m = headingRegex.exec(text)) !== null) {
        const heading = m[1].trim();
        const words = heading.split(/\s+/);
        if (words.length >= 3) {
          const capitalizedCount = words.filter(w => /^[A-Z]/.test(w) && !/^(I|AI|API|CLI|URL|HTML|CSS|JS|TS|NPM|NYC|USA|UK|EU)\b/.test(w)).length;
          const ratio = capitalizedCount / words.length;
          if (ratio > 0.7) {
            const lineNum = text.substring(0, m.index).split('\n').length;
            results.push({
              match: m[0],
              index: m.index,
              line: lineNum,
              column: 1,
              suggestion: 'Use sentence case for headings (only capitalize first word and proper nouns).',
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
      // Match emojis at the start of lines, headings, or before bold text
      const emojiDecorations = /^[\s#*-]*[\u{1F300}-\u{1F9FF}\u{2600}-\u{27BF}\u{2300}-\u{23FF}\u{2B50}\u{2934}-\u{2935}\u{25AA}-\u{25FE}\u{FE00}-\u{FEFF}]/gmu;
      const emojiCount = countMatches(text, /[\u{1F300}-\u{1F9FF}\u{2600}-\u{27BF}]/gu);

      if (emojiCount >= 3) {
        return findMatches(text, /[\u{1F300}-\u{1F9FF}\u{2600}-\u{27BF}\u{2300}-\u{23FF}\u{2B50}]/gu,
          'Remove emoji decoration from professional text.');
      }
      return [];
    },
  },

  {
    id: 18,
    name: 'Curly quotes',
    category: 'style',
    description: 'ChatGPT uses Unicode curly quotes (\u201C\u201D\u2018\u2019) instead of straight quotes.',
    weight: 1,
    detect(text) {
      const curlyQuotes = /[\u201C\u201D\u2018\u2019]/g;
      return findMatches(text, curlyQuotes, 'Replace curly quotes with straight quotes.');
    },
  },

  // ── COMMUNICATION PATTERNS (19-21) ─────────────────────

  {
    id: 19,
    name: 'Chatbot artifacts',
    category: 'communication',
    description: 'Leftover chatbot phrases: "I hope this helps!", "Let me know if...", "Here is an overview".',
    weight: 5,
    detect(text) {
      const results = [];
      for (const regex of CHATBOT_ARTIFACTS) {
        results.push(...findMatches(text, regex, 'Remove chatbot artifact — this is conversational filler, not content.'));
      }
      return results;
    },
  },

  {
    id: 20,
    name: 'Cutoff disclaimers',
    category: 'communication',
    description: 'AI knowledge-cutoff disclaimers left in text: "As of my last training...", "While details are limited...".',
    weight: 4,
    detect(text) {
      const results = [];
      for (const regex of CUTOFF_DISCLAIMERS) {
        results.push(...findMatches(text, regex, 'Remove knowledge-cutoff disclaimer. Either find the info or omit the claim.'));
      }
      return results;
    },
  },

  {
    id: 21,
    name: 'Sycophantic tone',
    category: 'communication',
    description: 'Overly positive, people-pleasing language: "Great question!", "You\'re absolutely right!".',
    weight: 4,
    detect(text) {
      const results = [];
      for (const regex of SYCOPHANTIC_PHRASES) {
        results.push(...findMatches(text, regex, 'Remove sycophantic filler. Just address the substance.'));
      }
      return results;
    },
  },

  // ── FILLER & HEDGING (22-24) ────────────────────────────

  {
    id: 22,
    name: 'Filler phrases',
    category: 'filler',
    description: 'Wordy filler that can be shortened: "in order to" → "to", "due to the fact that" → "because".',
    weight: 3,
    detect(text) {
      const results = [];
      for (const { pattern, fix } of FILLER_PHRASES) {
        results.push(...findMatches(text, pattern, `Replace with "${fix}".`));
      }
      return results;
    },
  },

  {
    id: 23,
    name: 'Excessive hedging',
    category: 'filler',
    description: 'Stacking qualifiers: "could potentially possibly", "might arguably perhaps".',
    weight: 3,
    detect(text) {
      const results = [];
      for (const regex of HEDGING_WORDS) {
        results.push(...findMatches(text, regex, 'Remove stacked hedging. One qualifier is enough — or commit to the claim.'));
      }
      return results;
    },
  },

  {
    id: 24,
    name: 'Generic conclusions',
    category: 'filler',
    description: 'Vague upbeat endings: "The future looks bright", "Exciting times lie ahead".',
    weight: 3,
    detect(text) {
      const results = [];
      for (const regex of GENERIC_CONCLUSIONS) {
        results.push(...findMatches(text, regex, 'Replace with a specific forward-looking statement or just end.'));
      }
      return results;
    },
  },
];

// ─── Exports ─────────────────────────────────────────────

module.exports = {
  patterns,
  AI_VOCAB_HIGH,
  AI_VOCAB_MEDIUM,
  SIGNIFICANCE_PHRASES,
  PROMOTIONAL_WORDS,
  VAGUE_ATTRIBUTION_PHRASES,
  CHALLENGES_PHRASES,
  COPULA_AVOIDANCE,
  CHATBOT_ARTIFACTS,
  SYCOPHANTIC_PHRASES,
  CUTOFF_DISCLAIMERS,
  FILLER_PHRASES,
  HEDGING_WORDS,
  GENERIC_CONCLUSIONS,
  findMatches,
  countMatches,
  wordCount,
};
