/**
 * locales/sv.js — Swedish locale profile.
 *
 * Vocabulary tiers, phrases, function words, and abbreviations for Swedish.
 *
 * Calibration notes:
 *  - Tier 1 words are strong AI signals in Swedish text (loan translations,
 *    chatbot clichés, "consultant sludge").
 *  - Tier 2 words are normal in isolation; flag at density ≥ 2 occurrences.
 *  - Tier 3 words are fine alone; flag only at density > 3% of total words.
 *  - Words like "stärka", "möjliggöra", "främja" appear in normal professional
 *    Swedish prose, so they are Tier 2/3, not Tier 1.
 *  - Swenglish loan-words ("best practices", "stakeholders") are Tier 1 when
 *    used in otherwise Swedish text.
 *
 * Empirical data (bundled references/sv-frequencies.json):
 *  - Weights on curated tier words (applyWeights).
 *  - empiricalExtra: multi-word n-grams for Pattern 7 (see sv-empirical-filter.js).
 */

const fs = require('fs');
const path = require('path');

// ─── Load empirical weights (Phase 4–5) ──────────────────

let EMPIRICAL_WEIGHTS = {};
try {
  const weightsPath = path.join(__dirname, '../../references/sv-frequencies.json');
  const raw = fs.readFileSync(weightsPath, 'utf8');
  const data = JSON.parse(raw);
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    EMPIRICAL_WEIGHTS = data;
  }
} catch {
  // Optional file — locale works without it
}

function weightForPhraseOrWord(key) {
  const k = String(key).toLowerCase();
  const entry = EMPIRICAL_WEIGHTS[k];
  if (entry && typeof entry.weight === 'number' && entry.weight > 0) {
    return entry.weight;
  }
  return 1;
}

function applyWeights(list) {
  return list.map((w) => {
    const wt = weightForPhraseOrWord(w);
    return wt === 1 ? w : { word: w, weight: wt };
  });
}

// ─── Tier 1: Dead Giveaways ─────────────────────────────

const TIER_1_SV_RAW = [
  // Loan-translated LLM idioms
  'fördjupa sig i',
  'fördjupa oss i',
  'djupdyka i',
  'djupdykning',
  'djupgående analys',
  'lågt hängande frukt',
  'ta ett holistiskt grepp',
  'holistiskt perspektiv',
  'sömlös',
  'sömlöst',
  'banbrytande',
  'transformativ',
  'transformativt',
  'katalysator',
  'värdeskapande',
  'mångfacetterad',
  'mångfacetterat',
  'väva samman',
  'väver samman',
  'vävt samman',
  'landskapet',
  'ekosystem',
  'spelar en central roll',
  'spelar en avgörande roll',
  'avgörande roll',
  'nyckelroll',

  // English Tier 1 calques / equivalents (conservative — avoid common human words)
  'en rik väv av',
  'ett lapptäcke av',
  'vittnar om',
  'ett bevis på',
  'intrikat',
  'intrikata',
  'vimlande',
  'påbörja en resa',
  'ger näring åt',
  'fånga uppmärksamhet',
  'samspelet mellan',
  'framhäva',
  'framhäver',
  'framhävt',
  'sömlös integration',
  'världsberömd',
  'omvälvande',
  'vändpunkt',
  'i framkant',
  'toppmodern',
  'oöverträffad',
  'oöverträffat',
  'oöverträffade',
  'gedigen',
  'gediget',
  'gedigna',
  'helhetsperspektiv',
  'effektivisera',
  'effektiviserar',
  'effektiviserat',
  'strömlinjeforma',
  'strömlinjeformar',
  'strömlinjeformat',
  'ta tillvara',
  'tillvaratar',
  'tillvaratagit',
  'dra nytta av',
  'ge förutsättningar',
  'ge möjligheter',
  'möjliggörande',
  'thought leader',
  'thought leadership',
  'tankeledarskap',
  'tankeledare',

  // Compound buzzwords / consultant Swedish
  'helhetslösning',
  'helhetslösningen',
  'helhetsgrepp',
  'framtidssäkra',
  'framtidssäkrar',
  'framtidssäkrat',
  'framtidssäkrad',
  'värdedriven',
  'värdedrivet',
  'värdedrivna',
  'kärnkompetenser',
  'kärnkompetens',
  'kärnvärden',
  'kärnvärde',
  'värdekedja',
  'kundresa',
  'medarbetarresa',
  'transformationsresa',

  // Swenglish
  'best practices',
  'best practice',
  'key takeaways',
  'key takeaway',
  'pain points',
  'pain point',
  'stakeholders',
  'stakeholder',
  'alignment',
  'learnings',
  'insights',
  'mindset',
  'roadmap',
  'framework',
  'use cases',
  'use case',
  'game changer',
  'game-changer',
  'game-changing',
];

// ─── Tier 2: Suspicious in Density ──────────────────────

const TIER_2_SV_RAW = [
  'utforska',
  'utforskar',
  'utforskade',
  'navigera',
  'navigerar',
  'navigerade',
  'möjliggöra',
  'möjliggör',
  'möjliggjort',
  'stärka',
  'stärker',
  'stärkt',
  'främja',
  'främjar',
  'främjat',
  'belysa',
  'belyser',
  'belyst',
  'lyfta fram',
  'lyfter fram',
  'lyft fram',
  'understryka',
  'understryker',
  'understrukit',
  'understryker vikten',
  'säkerställa',
  'säkerställer',
  'säkerställt',
  'optimera',
  'optimerar',
  'optimerat',
  'implementera',
  'implementerar',
  'implementerat',
  'implementering',
  'nyttja',
  'nyttjar',
  'nyttjat',
  'insikter',
  'holistisk',
  'holistiskt',
  'proaktiv',
  'proaktivt',
  'robust',
  'robusta',
  'skalbar',
  'skalbara',
  'resilient',
  'resiliens',
  'synergier',
  'synergi',
  'paradigm',
  'paradigmskifte',

  // Inflated nouns (cluster = AI)
  'optimering',
  'satsningar',
  'insatser',
  'lösningar',
  'verktyg',
  'resurser',
  'processer',
  'strukturer',
  'förutsättningar',
  'möjligheter',
  'utmaningar',

  // Bureaucratic / LLM-formal verbs (Svarta listan overlap)
  'erhålla',
  'erhåller',
  'erhållit',
  'innehava',
  'innehar',
  'innehaft',
  'föreligga',
  'föreligger',
  'förelegat',
  'vidta',
  'vidtar',
  'vidtagit',
  'åtgärda',
  'åtgärdar',
  'åtgärdat',
  'beakta',
  'beaktar',
  'beaktat',
  'genomföra',
  'genomför',
  'genomfört',

  // AI-typical adverbs / connectors (density-sensitive via Tier 2 rule)
  'följaktligen',
  'härvidlag',
  'därutöver',
  'vidare',
  'dessutom',
  'samtidigt som',
  'i takt med att',
  'emellertid',
  'dock',
  'således',
  'därför',
  'alltså',
];

// ─── Tier 3: Context-Dependent ──────────────────────────

const TIER_3_SV_RAW = [
  'viktig',
  'viktigt',
  'viktiga',
  'avgörande',
  'central',
  'centralt',
  'centrala',
  'effektiv',
  'effektivt',
  'effektiva',
  'effektivitet',
  'strategisk',
  'strategiskt',
  'strategiska',
  'innovativ',
  'innovativt',
  'innovation',
  'innovationer',
  'unik',
  'unikt',
  'unika',
  'komplex',
  'komplext',
  'komplexa',
  'komplexitet',
  'hållbar',
  'hållbart',
  'hållbara',
  'hållbarhet',
  'transparent',
  'transparens',
  'dynamisk',
  'dynamiskt',
  'dynamiska',
  'integrerad',
  'integrerat',
  'integrerade',
  'kontinuerlig',
  'kontinuerligt',
];

const TIER_1_SV = applyWeights(TIER_1_SV_RAW);
const TIER_2_SV = applyWeights(TIER_2_SV_RAW);
const TIER_3_SV = applyWeights(TIER_3_SV_RAW);

// ─── AI Phrases (Swedish) ────────────────────────────────

const AI_PHRASES_SV = [
  {
    pattern:
      /\bi dagens (snabbt föränderliga|digitala|moderna|komplexa|globala|alltmer komplexa)\b/gi,
    tier: 1,
    fix: '(ta bort eller specificera vad som faktiskt förändrats)',
  },
  { pattern: /\bi dagens värld\b/gi, tier: 2, fix: '(ta bort eller specificera)' },
  {
    pattern: /\bi en alltmer komplex(t)? (värld|marknad|miljö)\b/gi,
    tier: 1,
    fix: '(specificera)',
  },
  { pattern: /\bpå en alltmer komplex(t)? marknad\b/gi, tier: 1, fix: '(specificera marknaden)' },
  {
    pattern: /\bi en tid då\b/gi,
    tier: 1,
    fix: '(specificera tidpunkt eller ta bort inledningen)',
  },
  { pattern: /\bdet är just därför\b/gi, tier: 2, fix: '(kortare koppling: därför, så)' },
  {
    pattern: /\bgenom att .{3,120} kan vi\b/gi,
    tier: 2,
    fix: '(säg vad ni gör, utan instrumentell inramning)',
  },
  {
    pattern: /\batt förstå .{5,45} är avgörande\b/gi,
    tier: 1,
    fix: '(säg varför direkt, utan uppställning)',
  },
  {
    pattern: /\ben av de (viktigaste|främsta|mest centrala)\b/gi,
    tier: 2,
    fix: '(var konkret: vilken position, enligt vem?)',
  },
  { pattern: /\bför att svara på din fråga\b/gi, tier: 1, fix: '(börja med svaret)' },
  { pattern: /\blåt mig börja med\b/gi, tier: 1, fix: '(börja direkt)' },
  {
    pattern: /\btack för en (intressant|bra|viktig) (fråga|frågeställning)\b/gi,
    tier: 1,
    fix: '(ta bort)',
  },
  { pattern: /\b(vår|en) resa mot\b/gi, tier: 1, fix: '(ersätt med konkret mål eller process)' },
  { pattern: /\bpåbörja en resa\b/gi, tier: 1, fix: '(säg vad som startar, utan metafor)' },

  {
    pattern: /\bdet är viktigt att (notera|påpeka|framhålla) att\b/gi,
    tier: 1,
    fix: '(ta bort — säg bara vad det handlar om)',
  },
  { pattern: /\bdet bör noteras att\b/gi, tier: 1, fix: '(ta bort — säg bara vad det handlar om)' },
  { pattern: /\bdet är värt att notera att\b/gi, tier: 1, fix: '(ta bort — säg det direkt)' },
  { pattern: /\bdet är värt att nämna att\b/gi, tier: 1, fix: '(ta bort — säg det direkt)' },

  {
    pattern: /\bsammanfattningsvis (kan man säga|sagt|är det tydligt)\b/gi,
    tier: 1,
    fix: '(ta bort — avsluta med ett konkret faktum istället)',
  },
  { pattern: /\bsammanfattningsvis\b/gi, tier: 2, fix: '(avsluta med ett konkret faktum)' },
  { pattern: /\bframtiden ser ljus ut\b/gi, tier: 1, fix: '(avsluta med ett konkret faktum)' },
  {
    pattern: /\bfrämjar en (kultur|miljö|atmosfär) av\b/gi,
    tier: 1,
    fix: 'bygger / skapar / uppmuntrar',
  },

  {
    pattern: /\bdet handlar inte (bara|enbart) om .{3,60}, utan (också|även) om\b/gi,
    tier: 1,
    fix: 'Säg vad det handlar om direkt.',
  },

  {
    pattern: /\bgenom att (kombinera|förena|sammanföra) .{3,80} och\b/gi,
    tier: 2,
    fix: '(var specifik om vad kombinationen åstadkommer)',
  },

  { pattern: /\blåt oss (dyka ner i|utforska|ta en titt på)\b/gi, tier: 1, fix: '(börja direkt)' },
  { pattern: /\butan vidare omsvep\b/gi, tier: 1, fix: '(börja direkt)' },

  { pattern: /\bhoppas att detta (hjälper|besvarar)\b/gi, tier: 1, fix: '(ta bort)' },
  { pattern: /\bhör gärna av dig\b/gi, tier: 1, fix: '(ta bort)' },
  { pattern: /\btveka inte att\b/gi, tier: 1, fix: '(ta bort)' },
  { pattern: /\bfinn gärna\b/gi, tier: 1, fix: '(ta bort)' },
  { pattern: /\bvälkommen att (höra av|kontakta)\b/gi, tier: 1, fix: '(ta bort)' },

  { pattern: /\bbra fråga\b/gi, tier: 1, fix: '(ta bort)' },
  { pattern: /\butmärkt fråga\b/gi, tier: 1, fix: '(ta bort)' },
  {
    pattern: /\bdet är en (bra|utmärkt|intressant) (fråga|poäng|observation)\b/gi,
    tier: 1,
    fix: '(ta bort)',
  },

  { pattern: /\bexperter (menar|anser|säger)\b/gi, tier: 2, fix: 'Namnge experten och källan.' },
  { pattern: /\bstudier (visar|tyder på)\b/gi, tier: 2, fix: 'Citera den specifika studien.' },
  {
    pattern: /\bforskning (visar|tyder på)\b/gi,
    tier: 2,
    fix: 'Citera den specifika forskningen.',
  },

  { pattern: /\bi syfte att\b/gi, tier: 2, fix: 'för att / att' },
  { pattern: /\binom ramen för\b/gi, tier: 2, fix: 'i / under' },
  { pattern: /\bi dagsläget\b/gi, tier: 2, fix: 'nu / just nu' },
  {
    pattern: /\bmed anledning av (det faktum )?att\b/gi,
    tier: 1,
    fix: 'eftersom / för att',
  },
  { pattern: /\bpå grund av det faktum att\b/gi, tier: 1, fix: 'eftersom' },
  { pattern: /\bhar möjlighet att\b/gi, tier: 2, fix: 'kan' },
  { pattern: /\bdet finns (möjlighet|potential) att\b/gi, tier: 2, fix: '(specificera)' },

  // Svarta listan–style bureaucratese (phrase-level)
  { pattern: /\bavseende\b/gi, tier: 2, fix: 'om / för' },
  { pattern: /\bbeträffande\b/gi, tier: 2, fix: 'om / angående' },
  { pattern: /\bhuruvida\b/gi, tier: 2, fix: 'om' },
  { pattern: /\bförsåvitt\b/gi, tier: 2, fix: 'om / så länge' },
  { pattern: /\behuru\b/gi, tier: 2, fix: 'fastän / även om' },
  { pattern: /\benär\b/gi, tier: 2, fix: 'eftersom / när' },
  { pattern: /\bjämlikt\b/gi, tier: 2, fix: 'enligt' },
  { pattern: /\bhärvidlag\b/gi, tier: 2, fix: 'här' },
  { pattern: /\bicke\b/gi, tier: 2, fix: 'inte' },
  { pattern: /\bförefaller\b/gi, tier: 2, fix: 'verkar' },
  { pattern: /\bärende\b/gi, tier: 2, fix: 'fråga / ärende (om det är juridiskt)' },
];

// ─── Function Words (Swedish) ────────────────────────────

const FUNCTION_WORDS_SV = [
  'och',
  'att',
  'det',
  'som',
  'är',
  'i',
  'på',
  'för',
  'med',
  'av',
  'en',
  'ett',
  'den',
  'de',
  'har',
  'men',
  'eller',
  'om',
  'till',
  'från',
  'vid',
  'kan',
  'ska',
  'var',
  'han',
  'hon',
  'vi',
  'ni',
  'jag',
  'du',
  'mig',
  'dig',
  'sig',
  'vår',
  'er',
  'deras',
  'hans',
  'hennes',
  'sin',
  'sina',
  'sitt',
  'inte',
  'också',
  'bara',
  'redan',
  'så',
  'när',
  'då',
  'hur',
  'vad',
  'vem',
  'vilken',
  'vilket',
  'vilka',
  'detta',
  'dessa',
  'denna',
  'här',
  'där',
  'nu',
  'sedan',
  'än',
  'både',
  'samt',
  'även',
  'dock',
  'endast',
  'samtidigt',
  'därför',
  'således',
  'vidare',
  'alltså',
  'dessutom',
  'faktiskt',
  'kanske',
  'troligen',
  'möjligen',
  'ju',
  'jo',
  'nog',
  'väl',
  'ej',
  'ännu',
  'alltid',
  'aldrig',
  'ofta',
  'ibland',
  'sällan',
  'mer',
  'mest',
  'mycket',
  'lite',
  'alla',
  'allt',
  'ingen',
  'inget',
  'inga',
  'varje',
  'varandra',
  'man',
  'dem',
  'dom',
];

// ─── Abbreviations (Swedish) ─────────────────────────────

const ABBREVIATIONS_SV = [
  't.ex',
  'dvs',
  'bl.a',
  'm.m',
  'o.s.v',
  'fr.o.m',
  't.o.m',
  'm.fl',
  's.k',
  'ca',
  'kl',
  'nr',
  'fig',
  'dr',
  'prof',
  'dir',
  'red',
  'sid',
  'vol',
  'etc',
  'vs',
  'jfr',
  'mom',
  'kap',
  'resp',
  'ev',
  'tkr',
  'mkr',
  'mnkr',
  'mdkr',
  'e.d',
  'e.Kr',
  'f.Kr',
  'SOU',
  'prop',
  'JK',
  'JO',
  'NJA',
  'RÅ',
  'SkL',
];

// ─── Locale-specific autofixes (Swedish) ─────────────────
// Statsrådsberedningen PM 2011:1 "Svarta listan" and klarspråk pairs (mechanical).

const AUTOFIXES_SV = [
  {
    pattern: /\bi syfte att\b/gi,
    replacement: 'för att',
    label: '"i syfte att" → "för att"',
  },
  {
    pattern: /\bpå grund av det faktum att\b/gi,
    replacement: 'eftersom',
    label: '"på grund av det faktum att" → "eftersom"',
  },
  {
    pattern: /\bmed anledning av att\b/gi,
    replacement: 'eftersom',
    label: '"med anledning av att" → "eftersom"',
  },
  {
    pattern: /\bdet är viktigt att notera att\b/gi,
    replacement: '',
    label: 'Removed "det är viktigt att notera att"',
  },
  {
    pattern: /\bi dagsläget\b/gi,
    replacement: 'nu',
    label: '"i dagsläget" → "nu"',
  },
  {
    pattern: /\binom ramen för\b/gi,
    replacement: 'inom',
    label: '"inom ramen för" → "inom"',
  },
  {
    pattern: /\bgenomföra en analys av\b/gi,
    replacement: 'analysera',
    label: '"genomföra en analys av" → "analysera"',
  },
  { pattern: /\berhålla\b/gi, replacement: 'få', label: '"erhålla" → "få"' },
  { pattern: /\berhåller\b/gi, replacement: 'får', label: '"erhåller" → "får"' },
  { pattern: /\berhållit\b/gi, replacement: 'fått', label: '"erhållit" → "fått"' },
  { pattern: /\binnehava\b/gi, replacement: 'ha', label: '"innehava" → "ha"' },
  { pattern: /\binnehar\b/gi, replacement: 'har', label: '"innehar" → "har"' },
  { pattern: /\binnehaft\b/gi, replacement: 'haft', label: '"innehaft" → "haft"' },
  { pattern: /\bföreligga\b/gi, replacement: 'finnas', label: '"föreligga" → "finnas"' },
  { pattern: /\bföreligger\b/gi, replacement: 'finns', label: '"föreligger" → "finns"' },
  { pattern: /\bförelegat\b/gi, replacement: 'funits', label: '"förelegat" → "funits"' },
  { pattern: /\bvidmakthålla\b/gi, replacement: 'behålla', label: '"vidmakthålla" → "behålla"' },
  {
    pattern: /\bvidmakthåller\b/gi,
    replacement: 'behåller',
    label: '"vidmakthåller" → "behåller"',
  },
  {
    pattern: /\bvidmakthållit\b/gi,
    replacement: 'behållit',
    label: '"vidmakthållit" → "behållit"',
  },
  { pattern: /\bbibringa\b/gi, replacement: 'ge', label: '"bibringa" → "ge"' },
  { pattern: /\bbibringar\b/gi, replacement: 'ger', label: '"bibringar" → "ger"' },
  { pattern: /\bbibragit\b/gi, replacement: 'gett', label: '"bibragit" → "gett"' },
  { pattern: /\båvila\b/gi, replacement: 'ligga på', label: '"åvila" → "ligga på"' },
  { pattern: /\båvilade\b/gi, replacement: 'låg på', label: '"åvilade" → "låg på"' },
  { pattern: /\båsamka\b/gi, replacement: 'orsaka', label: '"åsamka" → "orsaka"' },
  { pattern: /\båsamkar\b/gi, replacement: 'orsakar', label: '"åsamkar" → "orsakar"' },
  { pattern: /\båsamkat\b/gi, replacement: 'orsakat', label: '"åsamkat" → "orsakat"' },
  {
    pattern: /\btillse att\b/gi,
    replacement: 'se till att',
    label: '"tillse att" → "se till att"',
  },
  { pattern: /\binkomma med\b/gi, replacement: 'lämna in', label: '"inkomma med" → "lämna in"' },
  {
    pattern: /\binkommer med\b/gi,
    replacement: 'lämnar in',
    label: '"inkommer med" → "lämnar in"',
  },
  {
    pattern: /\binkommit med\b/gi,
    replacement: 'lämnat in',
    label: '"inkommit med" → "lämnat in"',
  },
  { pattern: /\bvidta åtgärder\b/gi, replacement: 'agera', label: '"vidta åtgärder" → "agera"' },
  { pattern: /\båberopa\b/gi, replacement: 'hänvisa till', label: '"åberopa" → "hänvisa till"' },
  {
    pattern: /\båberopar\b/gi,
    replacement: 'hänvisar till',
    label: '"åberopar" → "hänvisar till"',
  },
  {
    pattern: /\båberopat\b/gi,
    replacement: 'hänvisat till',
    label: '"åberopat" → "hänvisat till"',
  },
  { pattern: /\bemellertid\b/gi, replacement: 'men', label: '"emellertid" → "men"' },
  { pattern: /\benvar\b/gi, replacement: 'var och en', label: '"envar" → "var och en"' },
  {
    pattern: /\bikraftträdande\b/gi,
    replacement: 'börjar gälla',
    label: '"ikraftträdande" → "börjar gälla"',
  },
  { pattern: /\bföljaktligen\b/gi, replacement: 'alltså', label: '"följaktligen" → "alltså"' },
  {
    pattern: /\bnyttja\b/gi,
    replacement: 'använda',
    label: '"nyttja" → "använda"',
  },
  {
    pattern: /\bnyttjar\b/gi,
    replacement: 'använder',
    label: '"nyttjar" → "använder"',
  },
  {
    pattern: /\bnyttjat\b/gi,
    replacement: 'använt',
    label: '"nyttjat" → "använt"',
  },
];

// ─── Empirical extras (Pattern 7) ─────────────────────────
// N-grams from references/sv-frequencies.json not already in curated tiers.
// Regenerate: npm run corpus:logodds

const { buildStopSet, shouldScoreEmpiricalExtra } = require('./sv-empirical-filter.js');

const SW_STOP_FOR_EMPIRICAL = buildStopSet(FUNCTION_WORDS_SV);
const TIER_KEYS_LOWER = new Set(
  [...TIER_1_SV_RAW, ...TIER_2_SV_RAW, ...TIER_3_SV_RAW].map((s) => String(s).toLowerCase()),
);

const EMPIRICAL_EXTRA_MAX = 100;

function buildEmpiricalExtraList(weights) {
  const rows = [];
  for (const [key, v] of Object.entries(weights)) {
    if (!v || typeof v.zscore !== 'number') continue;
    if (!shouldScoreEmpiricalExtra(key, v.zscore, SW_STOP_FOR_EMPIRICAL, TIER_KEYS_LOWER)) {
      continue;
    }
    const w = typeof v.weight === 'number' && v.weight > 0 ? v.weight : 1;
    rows.push({ key, z: v.zscore, w });
  }
  rows.sort((a, b) => b.z - a.z);
  return rows
    .slice(0, EMPIRICAL_EXTRA_MAX)
    .map(({ key, w }) => (Math.abs(w - 1) < 1e-9 ? key : { word: key, weight: w }));
}

const EMPIRICAL_EXTRA_SV = buildEmpiricalExtraList(EMPIRICAL_WEIGHTS);

// ─── Export ───────────────────────────────────────────────

module.exports = {
  code: 'sv',

  tier1: TIER_1_SV,
  tier2: TIER_2_SV,
  tier3: TIER_3_SV,
  phrases: AI_PHRASES_SV,

  /** Corpus-derived n-grams (not in tiers) scored in Pattern 7 */
  empiricalExtra: EMPIRICAL_EXTRA_SV,

  functionWords: FUNCTION_WORDS_SV,
  abbreviations: ABBREVIATIONS_SV,

  readability: 'lix',

  autofixes: AUTOFIXES_SV,
};
