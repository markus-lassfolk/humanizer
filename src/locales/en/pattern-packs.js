/**
 * locales/en/pattern-packs.js — English regex / structured data for pattern detectors.
 *
 * Detectors read `localeProfile.patternPacks[id]`; English is the canonical pack here.
 */

const SIGNIFICANCE_PHRASES = [
  /marking a pivotal/gi,
  /pivotal moment/gi,
  /pivotal role/gi,
  /key role/gi,
  /crucial role/gi,
  /vital role/gi,
  /significant role/gi,
  /is a testament/gi,
  /stands as a testament/gi,
  /serves as a testament/gi,
  /serves as a reminder/gi,
  /reflects broader/gi,
  /broader trends/gi,
  /broader movement/gi,
  /evolving landscape/gi,
  /evolving world/gi,
  /setting the stage for/gi,
  /marking a shift/gi,
  /key turning point/gi,
  /indelible mark/gi,
  /deeply rooted/gi,
  /focal point/gi,
  /symbolizing its ongoing/gi,
  /enduring legacy/gi,
  /lasting impact/gi,
  /contributing to the/gi,
  /underscores the importance/gi,
  /highlights the significance/gi,
  /represents a shift/gi,
  /shaping the future/gi,
  /the evolution of/gi,
  /rich tapestry/gi,
  /rich heritage/gi,
  /stands as a beacon/gi,
  /marks a milestone/gi,
  /paving the way/gi,
  /charting a course/gi,
];

const PROMOTIONAL_WORDS = [
  /\bnestled\b/gi,
  /\bin the heart of\b/gi,
  /\bbreathtaking\b/gi,
  /\bmust-visit\b/gi,
  /\bstunning\b/gi,
  /\brenowned\b/gi,
  /\bnatural beauty\b/gi,
  /\brich cultural heritage\b/gi,
  /\brich history\b/gi,
  /\bcommitment to\b/gi,
  /\bexemplifies\b/gi,
  /\bworld-class\b/gi,
  /\bstate-of-the-art\b/gi,
  /\bgame-changing\b/gi,
  /\bgame changer\b/gi,
  /\bunparalleled\b/gi,
  /\bprofound\b/gi,
  /\bbest-in-class\b/gi,
  /\btrailblazing\b/gi,
  /\bvisionary\b/gi,
  /\bcutting-edge\b/gi,
  /\bworldwide recognition\b/gi,
];

const VAGUE_ATTRIBUTION_PHRASES = [
  /\bexperts (believe|argue|say|suggest|note|agree|contend|have noted)\b/gi,
  /\bindustry (reports|observers|experts|analysts|leaders|insiders)\b/gi,
  /\bobservers have (cited|noted|pointed out)\b/gi,
  /\bsome critics argue\b/gi,
  /\bsome experts (say|believe|suggest)\b/gi,
  /\bseveral sources\b/gi,
  /\baccording to reports\b/gi,
  /\bwidely (regarded|considered|recognized|acknowledged)\b/gi,
  /\bit is widely (known|believed|accepted)\b/gi,
  /\bmany (experts|scholars|researchers|analysts) (believe|argue|suggest)\b/gi,
  /\bstudies (show|suggest|indicate|have shown)\b/gi,
  /\bresearch (shows|suggests|indicates|has shown)\b/gi,
  /\bsources close to\b/gi,
  /\bpeople familiar with\b/gi,
];

const CHALLENGES_PHRASES = [
  /despite (its|these|the|their) (challenges|setbacks|obstacles|difficulties|limitations)/gi,
  /faces (several|many|numerous|various) challenges/gi,
  /continues to thrive/gi,
  /continues to grow/gi,
  /future (outlook|prospects) (remain|look|appear)/gi,
  /challenges and (future|legacy|opportunities)/gi,
  /despite these (challenges|hurdles|obstacles)/gi,
  /overcoming (obstacles|challenges|adversity)/gi,
  /weather(ing|ed) the storm/gi,
];

const COPULA_AVOIDANCE = [
  /\bserves as( a)?\b/gi,
  /\bstands as( a)?\b/gi,
  /\bmarks a\b/gi,
  /\brepresents a\b/gi,
  /\bboasts (a|an|over|more)\b/gi,
  /\bfeatures (a|an|over|more)\b/gi,
  /\boffers (a|an)\b/gi,
  /\bfunctions as\b/gi,
  /\bacts as( a)?\b/gi,
  /\boperates as( a)?\b/gi,
];

const MEDIA_LIST_REGEX =
  /\b(cited|featured|covered|mentioned|reported|published|recognized|highlighted) (in|by) .{0,20}(The New York Times|BBC|CNN|The Washington Post|The Guardian|Wired|Forbes|Reuters|Bloomberg|Financial Times|The Verge|TechCrunch|The Hindu|Al Jazeera|Time|Newsweek|The Economist|Nature|Science).{0,100}(,\s*(and\s+)?(The New York Times|BBC|CNN|The Washington Post|The Guardian|Wired|Forbes|Reuters|Bloomberg|Financial Times|The Verge|TechCrunch|The Hindu|Al Jazeera|Time|Newsweek|The Economist|Nature|Science))+/gi;

const ING_PHRASES =
  /,\s*(highlighting|underscoring|emphasizing|ensuring|reflecting|symbolizing|contributing to|cultivating|fostering|encompassing|showcasing|demonstrating|illustrating|representing|signaling|indicating|solidifying|reinforcing|cementing|underscoring|bolstering|reaffirming|illuminating|epitomizing)\b[^.]{5,}/gi;

const NEG_PARALLEL =
  /\b(it'?s|this is) not (just|merely|only|simply) .{3,60}(,|;|—)\s*(it'?s|this is|but)\b/gi;
const NOT_ONLY = /\bnot only .{3,60} but (also )?\b/gi;

const BUZZ_ADJ_EN = [
  'seamless',
  'intuitive',
  'powerful',
  'innovative',
  'dynamic',
  'robust',
  'comprehensive',
  'cutting-edge',
  'scalable',
  'agile',
  'efficient',
  'effective',
  'engaging',
  'impactful',
  'meaningful',
  'transformative',
  'sustainable',
  'resilient',
  'inclusive',
  'accessible',
];

const BUZZY_TRIAD_ABSTRACT =
  /\b(\w+tion|\w+ity|\w+ment|\w+ness|\w+ance|\w+ence),\s+(\w+tion|\w+ity|\w+ment|\w+ness|\w+ance|\w+ence),\s+and\s+(\w+tion|\w+ity|\w+ment|\w+ness|\w+ance|\w+ence)\b/gi;

const ADJ_TRIAD_EN = new RegExp(
  `\\b(${BUZZ_ADJ_EN.join('|')}),\\s+(${BUZZ_ADJ_EN.join('|')}),\\s+and\\s+(${BUZZ_ADJ_EN.join('|')})\\b`,
  'gi',
);

const SYNONYM_SETS_EN = [
  ['protagonist', 'main character', 'central figure', 'hero', 'lead character', 'lead'],
  ['company', 'firm', 'organization', 'enterprise', 'corporation', 'establishment', 'entity'],
  ['city', 'metropolis', 'urban center', 'municipality', 'locale', 'township'],
  ['building', 'structure', 'edifice', 'facility', 'complex', 'establishment'],
  ['tool', 'instrument', 'mechanism', 'apparatus', 'device', 'utility'],
  ['country', 'nation', 'state', 'republic', 'sovereign state'],
  ['problem', 'challenge', 'issue', 'obstacle', 'hurdle', 'difficulty'],
  ['solution', 'approach', 'methodology', 'framework', 'strategy', 'paradigm'],
];

const REASONING_PATTERNS_EN = [
  /\blet me think( about this| through this| step by step)?\b/gi,
  /\blet's (think|reason|work) (about|through|this out)\b/gi,
  /\bbreaking (this|it) down\b/gi,
  /\bto approach this (systematically|methodically|logically)\b/gi,
  /\breasoning through (this|the problem|it)\b/gi,
  /\bworking through the logic\b/gi,
  /\bstep ([1-9]|one|two|three|four|five):/gi,
  /\bfirst,? let'?s consider\b/gi,
  /\bthinking about this (carefully|logically|systematically)\b/gi,
  /\bhere'?s my (thought process|reasoning|thinking)\b/gi,
];

const STRUCTURE_HEADERS_EN =
  /^#+\s*(overview|key (points|takeaways)|summary|conclusion|introduction|background)\s*:?\s*$/gim;

const CONFIDENCE_CALIBRATION_EN = [
  {
    regex: /\bI'?m confident (that|in)\b/gi,
    fix: 'State the fact without prefacing confidence',
  },
  { regex: /\bit'?s worth (noting|mentioning|pointing out) that\b/gi, fix: 'Just say it' },
  { regex: /\binterestingly (enough)?,?\b/gi, fix: 'Let reader decide if interesting' },
  { regex: /\bsurprisingly,?\s/gi, fix: 'State the fact; surprise is implied' },
  { regex: /\bimportantly,?\s/gi, fix: 'Let reader judge importance' },
  { regex: /\bsignificantly,?\s/gi, fix: 'Be specific about the significance' },
  { regex: /\bnotably,?\s/gi, fix: 'Just state the notable thing' },
  { regex: /\bcertainly,?\s/gi, fix: 'Remove or state with evidence' },
  { regex: /\bundoubtedly,?\s/gi, fix: 'Remove or cite evidence' },
  { regex: /\bwithout (a )?doubt,?\s/gi, fix: 'Remove or cite evidence' },
];

const ACKNOWLEDGMENT_LOOPS_EN = [
  /\byou'?re asking (about|whether|if|how|why|what)\b/gi,
  /\bthe question of (whether|how|why|what)\b/gi,
  /\bwhen it comes to your question\b/gi,
  /\bin (terms of|response to|answer to) your question\b/gi,
  /\bto (answer|address) your question\b/gi,
  /\byour question (about|regarding|concerning)\b/gi,
  /\bthat'?s a (great|good|interesting) question\. (the|it|so)\b/gi,
  /\bI understand you'?re (asking|wondering|curious)\b/gi,
];

/** Past-participle-heavy passive templates common in AI/formal prose (English). */
const PASSIVE_VOICE_EN = [
  /\b(?:was|were)\s+(?:developed|implemented|created|designed|built|written|delivered|established|conducted|performed|achieved|completed|undertaken|initiated|launched|deployed|integrated|validated|verified|examined|assessed|evaluated|determined|identified|defined|outlined|highlighted|emphasized|demonstrated|illustrated|presented|introduced|proposed|suggested|recommended)\b/gi,
  /\b(?:has|have)\s+been\s+(?:developed|implemented|created|designed|built|written|delivered|established|conducted|performed|achieved|completed|launched|deployed|integrated|validated|verified|examined|assessed|evaluated|identified|defined|highlighted|demonstrated|presented|proposed|suggested|recommended)\b/gi,
  /\b(?:is|are)\s+being\s+(?:developed|implemented|created|designed|built|deployed|integrated|validated|examined|evaluated)\b/gi,
];

const WEASEL_TERMS_EN = [
  'clearly',
  'obviously',
  'certainly',
  'undoubtedly',
  'arguably',
  'basically',
  'literally',
  'virtually',
  'essentially',
  'fundamentally',
  'generally',
  'typically',
  'usually',
  'many experts',
  'most experts',
  'some experts',
  'experts say',
  'experts believe',
  'studies show',
  'research shows',
  'it is widely believed',
  'people say',
  'everyone knows',
  'common knowledge',
];

const CLICHE_TERMS_EN = [
  'think outside the box',
  'at the end of the day',
  'par for the course',
  'the whole nine yards',
  'read between the lines',
  'the best of both worlds',
  'only time will tell',
  'tip of the iceberg',
  'the elephant in the room',
  'wake-up call',
  'win-win situation',
  'move the goalposts',
  'low-hanging fruit',
  'paradigm shift',
  'perfect storm',
  'silver bullet',
  'needle in a haystack',
  'when life gives you lemons',
  'actions speak louder than words',
  'better late than never',
  'the calm before the storm',
  'cut corners',
  'hit the nail on the head',
  'let sleeping dogs lie',
  'on the ball',
  'spill the beans',
  'the ball is in your court',
  'under the weather',
  'break the ice',
  'cost an arm and a leg',
  'piece of cake',
  'speak of the devil',
  'once in a blue moon',
  'the last straw',
  'add insult to injury',
  'beat around the bush',
  'bite the bullet',
  'burn the midnight oil',
  'cry over spilled milk',
  'jump on the bandwagon',
  'kill two birds with one stone',
  'let the cat out of the bag',
  'miss the boat',
  'on cloud nine',
  'out of the blue',
  'pull yourself up by your bootstraps',
  'see eye to eye',
  'through thick and thin',
  'time flies',
];

const REDUNDANCY_REGEX_EN = [
  /\bPIN number\b/gi,
  /\bATM machine\b/gi,
  /\bLCD display\b/gi,
  /\bUPC code\b/gi,
  /\bplease RSVP\b/gi,
  /\bnull and void\b/gi,
  /\badvance planning\b/gi,
  /\bfree gift\b/gi,
  /\bend result\b/gi,
  /\bbasic fundamentals\b/gi,
  /\bclose proximity\b/gi,
  /\bconsensus of opinion\b/gi,
];

const INCLUSIVE_LANGUAGE_EN = [
  { regex: /\bchairman\b/gi, fix: 'Use “chair” or a specific title' },
  { regex: /\bchairwoman\b/gi, fix: 'Use “chair” or a specific title' },
  { regex: /\bmanpower\b/gi, fix: 'Use “workforce” or “staff”' },
  { regex: /\bmankind\b/gi, fix: 'Use “humanity” or “people”' },
  { regex: /\bman-made\b/gi, fix: 'Use “human-made” or “synthetic”' },
  { regex: /\bmaster slave\b/gi, fix: 'Use neutral technical terms (e.g. primary/replica)' },
  { regex: /\bmaster branch\b/gi, fix: 'Prefer “main branch” if that is your policy' },
];

/** @param {RegExp[]} regexes @param {string} suggestion @param {'high'|'medium'|'low'} [confidence] */
function asRegexPack(regexes, suggestion, confidence = 'high') {
  return regexes.map((regex) => ({ regex, suggestion, confidence }));
}

const PATTERN_PACKS_EN = {
  1: asRegexPack(
    SIGNIFICANCE_PHRASES,
    'Remove inflated significance claim. State concrete facts instead.',
    'high',
  ),

  2: [
    {
      regex: MEDIA_LIST_REGEX,
      suggestion: 'Instead of listing outlets, cite one specific claim from one source.',
      confidence: 'high',
    },
    {
      regex: /\bactive social media presence\b/gi,
      suggestion: 'Remove — not meaningful without specific context.',
      confidence: 'high',
    },
    {
      regex: /\bwritten by a leading expert\b/gi,
      suggestion: 'Name the expert and their specific credential.',
      confidence: 'medium',
    },
    {
      regex: /\bhas been (featured|recognized|acknowledged) (by|in)\b/gi,
      suggestion: 'Cite the specific feature with a concrete claim.',
      confidence: 'medium',
    },
  ],

  3: [
    {
      regex: ING_PHRASES,
      suggestion:
        'Remove trailing -ing phrase. If the point matters, give it its own sentence with specifics.',
      confidence: 'high',
    },
  ],

  4: asRegexPack(
    PROMOTIONAL_WORDS,
    'Replace promotional language with neutral, factual description.',
    'high',
  ),

  5: asRegexPack(
    VAGUE_ATTRIBUTION_PHRASES,
    "Name the specific source, study, or person. If you can't, remove the claim.",
    'high',
  ),

  6: asRegexPack(
    CHALLENGES_PHRASES,
    'Replace with specific challenges and concrete outcomes.',
    'high',
  ),

  8: asRegexPack(COPULA_AVOIDANCE, 'Use simple "is", "are", or "has" instead.', 'high'),

  9: [
    {
      regex: NEG_PARALLEL,
      suggestion: 'Rewrite directly. State what the thing IS, not what it "isn\'t just".',
      confidence: 'high',
    },
    {
      regex: NOT_ONLY,
      suggestion: 'Simplify. Remove the "not only...but also" frame.',
      confidence: 'medium',
    },
  ],

  10: {
    triadRegexes: [BUZZY_TRIAD_ABSTRACT, ADJ_TRIAD_EN],
    triadSuggestions: [
      'Rule of three with abstract nouns. Pick the one or two that actually matter.',
      'Buzzy adjective triad. Pick one and make it specific.',
    ],
  },

  11: SYNONYM_SETS_EN,

  12: [
    {
      regex: /\bfrom .{3,40} to .{3,40},\s*from .{3,40} to .{3,40}/gi,
      suggestion:
        "False range — X and Y probably aren't on a meaningful scale. Just list the topics.",
      confidence: 'high',
    },
    {
      regex:
        /\bfrom (the )?(dawn|birth|inception|beginning|advent|emergence|rise|earliest) .{3,60} to (the )?(modern|current|present|contemporary|latest|cutting-edge|digital|future)/gi,
      suggestion: "Unnecessarily broad range. Be specific about what you're actually covering.",
      confidence: 'medium',
    },
  ],

  16: {
    titleCase: {
      minWords: 3,
      minCapitalizedRatio: 0.7,
      skipWords:
        /^(I|AI|API|CLI|URL|HTML|CSS|JS|TS|NPM|NYC|USA|UK|EU|LLM|GPT|SaaS|IoT|CEO|CTO|VP|PR|HR|IT|UI|UX)\b/,
      suggestion: 'Use sentence case for headings (only capitalize first word and proper nouns).',
    },
  },

  25: asRegexPack(
    REASONING_PATTERNS_EN,
    'Hide reasoning or make it natural: "Here\'s my take:" instead of "Let me think step by step:"',
    'high',
  ),

  26: [
    {
      regex: STRUCTURE_HEADERS_EN,
      suggestion: 'Formulaic structure. Let content flow naturally.',
      confidence: 'medium',
    },
  ],

  27: CONFIDENCE_CALIBRATION_EN,

  28: asRegexPack(ACKNOWLEDGMENT_LOOPS_EN, "Just answer. Don't restate the question.", 'high'),

  30: asRegexPack(
    PASSIVE_VOICE_EN,
    'Prefer active voice when the actor matters (“we shipped”, “the team fixed”).',
    'medium',
  ),

  32: WEASEL_TERMS_EN.map((w) => ({
    regex: new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi'),
    suggestion: 'Name evidence or delete the hedge.',
    confidence: 'medium',
  })),

  33: CLICHE_TERMS_EN.map((w) => ({
    regex: new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi'),
    suggestion: 'Say what you mean in plain language.',
    confidence: 'low',
  })),

  34: asRegexPack(REDUNDANCY_REGEX_EN, 'Remove redundant wording.', 'medium'),

  35: INCLUSIVE_LANGUAGE_EN.map(({ regex, fix }) => ({
    regex,
    suggestion: fix,
    confidence: 'low',
  })),
};

module.exports = {
  PATTERN_PACKS_EN,
  SIGNIFICANCE_PHRASES,
  PROMOTIONAL_WORDS,
  VAGUE_ATTRIBUTION_PHRASES,
  CHALLENGES_PHRASES,
  COPULA_AVOIDANCE,
  PASSIVE_VOICE_EN,
  WEASEL_TERMS_EN,
  CLICHE_TERMS_EN,
};
