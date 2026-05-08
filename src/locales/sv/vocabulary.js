/**
 * locales/sv/vocabulary.js — Swedish tiers, phrases, function words, abbreviations,
 * prescriptive autofixes, and empirical extras (Pattern 7).
 *
 * Calibration notes are unchanged from the former monolithic sv.js; see git history
 * or locales/sv-se/docs/SWEDISH-EXTENSION.md.
 */

const fs = require('fs');
const path = require('path');

const {
  AUTOFIXES_SV_PRESCRIPTIVE,
  AI_PHRASES_SV_PRESCRIPTIVE,
} = require('../generated/sv-prescriptive.js');

// ─── Load empirical weights (Phase 4–5) ──────────────────

let EMPIRICAL_WEIGHTS = {};
try {
  const weightsPath = path.join(__dirname, '../../../locales/sv-se/references/sv-frequencies.json');
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

  // Buzzwords / consultant verbs (cluster signal)
  'orkestrera',
  'orkestrerar',
  'orkestrerat',
  'kuratera',
  'kuraterar',
  'kuraterat',
  'designa',
  'designar',
  'designat',
  'iterera',
  'itererar',
  'itererat',
  'kalibrera',
  'kalibrerar',
  'kalibrerat',
  'driva framåt',
  'driver framåt',
  'driver framgång',
  'driver tillväxt',
  'driver innovation',
  'leverera värde',
  'levererar värde',
  'levererat värde',
  'skapa värde',
  'skapar värde',
  'frigöra (potential|värde|kapacitet)',
  'mobilisera',
  'mobiliserar',
  'mobiliserat',

  // AI-typical adjectives (cluster signal)
  'kraftfull',
  'kraftfullt',
  'kraftfulla',
  'mångsidig',
  'mångsidigt',
  'mångsidiga',
  'kunskapsdriven',
  'kunskapsdrivet',
  'kunskapsdrivna',
  'datadriven',
  'datadrivet',
  'datadrivna',
  'användarcentrerad',
  'användarcentrerat',
  'användarcentrerade',
  'kundcentrerad',
  'kundcentrerat',
  'kundcentrerade',
  'tvärfunktionell',
  'tvärfunktionellt',
  'tvärfunktionella',
  'gränsöverskridande',
  'flerdimensionell',
  'flerdimensionellt',
  'flerdimensionella',
  'målmedveten',
  'målmedvetet',
  'målmedvetna',
  'välgrundad',
  'välgrundat',
  'välgrundade',
  'väldokumenterad',
  'väldokumenterat',
  'väldokumenterade',
  'välutformad',
  'välutformat',
  'välutformade',

  // AI-typical formal nouns (Pattern 7 density signal)
  'helhetssyn',
  'helhetsbild',
  'samverkan',
  'samverkanseffekter',
  'iterativa processer',
  'iterativ process',
  'kontinuerlig förbättring',
  'kontinuerliga förbättringar',
  'kunskapsdelning',
  'beslutsstöd',
  'beslutsfattande',
  'effektiviseringsåtgärder',
  'genomförandeplan',
  'handlingsplan',
  'handlingsplaner',
  'målbild',
  'målbilden',
  'nulägesanalys',
  'nulägesbeskrivning',

  // Hedging / over-formal Swedish (cluster signal)
  'i sammanhanget',
  'i ljuset av',
  'i kontexten av',
  'mot bakgrund av',
  'i förhållande till',
  'när det gäller',
  'avseende på',
  'i fråga om',
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

  // Vague positive adjectives (only flagged at >3% density)
  'betydelsefull',
  'betydelsefullt',
  'betydelsefulla',
  'väsentlig',
  'väsentligt',
  'väsentliga',
  'välbalanserad',
  'välbalanserat',
  'välbalanserade',
  'väl avvägd',
  'väl avvägt',
  'väl avvägda',
  'tilltalande',
  'genomtänkt',
  'genomtänkta',
  'omfattande',
  'genomgripande',
  'genomgående',
  'mångfaldig',
  'mångfaldigt',
  'mångfaldiga',
  'rik',
  'rikt',
  'rika',
  'kraftig',
  'kraftigt',
  'kraftiga',
  'noggrann',
  'noggrant',
  'noggranna',
  'omsorgsfull',
  'omsorgsfullt',
  'omsorgsfulla',
  'välfungerande',
  'samordnad',
  'samordnat',
  'samordnade',
  'inflytelserik',
  'inflytelserikt',
  'inflytelserika',
  'remarkabel',
  'remarkabelt',
  'remarkabla',
  'enastående',
  'imponerande',
];

const TIER_1_SV = applyWeights(TIER_1_SV_RAW);
const TIER_2_SV = applyWeights(TIER_2_SV_RAW);
const TIER_3_SV = applyWeights(TIER_3_SV_RAW);

// ─── AI Phrases (Swedish) ────────────────────────────────
// Hand-tuned sentence scaffolds + loan-translation clichés; prescriptive Svarta/Klarspråk follow.
//
// `category` lets Patterns 19-24 dispatch the right Swedish phrases. Categories
// in this file:
//   chatbot      → Pattern 19
//   sycophantic  → Pattern 21
//   conclusion   → Pattern 24
//   hedging      → Pattern 23
// Untagged phrases stay in Pattern 7 (broad LLM-cliché signal).

const AI_PHRASES_SV_HAND = [
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
  {
    pattern: /\bför att svara på din fråga\b/gi,
    tier: 1,
    fix: '(börja med svaret)',
    category: 'chatbot',
  },
  {
    pattern: /\blåt mig börja med\b/gi,
    tier: 1,
    fix: '(börja direkt)',
    category: 'chatbot',
  },
  {
    pattern: /\btack för en (intressant|bra|viktig) (fråga|frågeställning)\b/gi,
    tier: 1,
    fix: '(ta bort)',
    category: 'sycophantic',
  },
  { pattern: /\b(vår|en) resa mot\b/gi, tier: 1, fix: '(ersätt med konkret mål eller process)' },
  { pattern: /\bpåbörja en resa\b/gi, tier: 1, fix: '(säg vad som startar, utan metafor)' },

  {
    pattern: /\bdet är viktigt att (notera|påpeka|framhålla) att\b/gi,
    tier: 1,
    fix: '(ta bort — säg bara vad det handlar om)',
  },
  { pattern: /\bdet är värt att notera att\b/gi, tier: 1, fix: '(ta bort — säg det direkt)' },
  { pattern: /\bdet är värt att nämna att\b/gi, tier: 1, fix: '(ta bort — säg det direkt)' },

  {
    pattern: /\bsammanfattningsvis (kan man säga|sagt|är det tydligt)\b/gi,
    tier: 1,
    fix: '(ta bort — avsluta med ett konkret faktum istället)',
    category: 'conclusion',
  },
  {
    pattern: /\bsammanfattningsvis\b/gi,
    tier: 2,
    fix: '(avsluta med ett konkret faktum)',
    category: 'conclusion',
  },
  {
    pattern: /\bframtiden ser ljus ut\b/gi,
    tier: 1,
    fix: '(avsluta med ett konkret faktum)',
    category: 'conclusion',
  },
  {
    pattern: /\bspännande tider väntar\b/gi,
    tier: 1,
    fix: '(avsluta med ett konkret faktum)',
    category: 'conclusion',
  },
  {
    pattern: /\bmöjligheterna är (oändliga|gränslösa|enorma)\b/gi,
    tier: 1,
    fix: '(var konkret om vad som faktiskt är möjligt)',
    category: 'conclusion',
  },
  {
    pattern: /\bett steg i rätt riktning\b/gi,
    tier: 1,
    fix: '(var konkret om utfallet)',
    category: 'conclusion',
  },
  {
    pattern: /\bbara framtiden får utvisa\b/gi,
    tier: 2,
    fix: '(avsluta med vad ni faktiskt vet)',
    category: 'conclusion',
  },
  {
    pattern: /\bfortsätter (resan|sin resa) mot\b/gi,
    tier: 1,
    fix: '(var konkret om nästa steg)',
    category: 'conclusion',
  },
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

  {
    pattern: /\blåt oss (dyka ner i|utforska|ta en titt på)\b/gi,
    tier: 1,
    fix: '(börja direkt)',
    category: 'chatbot',
  },
  {
    pattern: /\butan vidare omsvep\b/gi,
    tier: 1,
    fix: '(börja direkt)',
    category: 'chatbot',
  },

  {
    pattern: /\bhoppas att detta (hjälper|besvarar)\b/gi,
    tier: 1,
    fix: '(ta bort)',
    category: 'chatbot',
  },
  { pattern: /\bhör gärna av dig\b/gi, tier: 1, fix: '(ta bort)', category: 'chatbot' },
  { pattern: /\btveka inte att\b/gi, tier: 1, fix: '(ta bort)', category: 'chatbot' },
  { pattern: /\bfinn gärna\b/gi, tier: 1, fix: '(ta bort)', category: 'chatbot' },
  {
    pattern: /\bvälkommen att (höra av|kontakta)\b/gi,
    tier: 1,
    fix: '(ta bort)',
    category: 'chatbot',
  },
  {
    pattern: /\bjag hjälper gärna till\b/gi,
    tier: 1,
    fix: '(ta bort)',
    category: 'chatbot',
  },
  {
    pattern: /\bfinns det (något|annat) (jag kan hjälpa|du undrar över)\b/gi,
    tier: 1,
    fix: '(ta bort)',
    category: 'chatbot',
  },
  {
    pattern: /\bvill du att jag (ska|skall)\b/gi,
    tier: 1,
    fix: '(ta bort)',
    category: 'chatbot',
  },
  {
    pattern: /\bhär (är|kommer) (en|ett) (kort )?(översikt|sammanfattning|guide|genomgång)\b/gi,
    tier: 1,
    fix: '(ta bort — börja direkt med innehållet)',
    category: 'chatbot',
  },

  { pattern: /\bbra fråga\b/gi, tier: 1, fix: '(ta bort)', category: 'sycophantic' },
  { pattern: /\butmärkt fråga\b/gi, tier: 1, fix: '(ta bort)', category: 'sycophantic' },
  {
    pattern: /\bdet är en (bra|utmärkt|intressant) (fråga|poäng|observation)\b/gi,
    tier: 1,
    fix: '(ta bort)',
    category: 'sycophantic',
  },
  {
    pattern: /\bdu har (helt|absolut) rätt\b/gi,
    tier: 1,
    fix: '(ta bort eller bemöt sakfrågan)',
    category: 'sycophantic',
  },
  {
    pattern: /\bdu lyfter en (viktig|bra|värdefull|intressant) (poäng|fråga|punkt)\b/gi,
    tier: 1,
    fix: '(ta bort eller bemöt sakfrågan)',
    category: 'sycophantic',
  },
  {
    pattern: /\bvilken (insiktsfull|skarpsinnig|intressant) (fråga|kommentar|reflektion)\b/gi,
    tier: 1,
    fix: '(ta bort)',
    category: 'sycophantic',
  },

  { pattern: /\bexperter (menar|anser|säger)\b/gi, tier: 2, fix: 'Namnge experten och källan.' },
  { pattern: /\bstudier (visar|tyder på)\b/gi, tier: 2, fix: 'Citera den specifika studien.' },
  {
    pattern: /\bforskning (visar|tyder på)\b/gi,
    tier: 2,
    fix: 'Citera den specifika forskningen.',
  },

  { pattern: /\bdet finns potential att\b/gi, tier: 2, fix: '(specificera)' },

  // Hedging stacks (Pattern 23) — Swedish equivalents of "could potentially / might possibly"
  {
    pattern: /\bskulle (potentiellt|möjligen|eventuellt) kunna\b/gi,
    tier: 1,
    fix: 'kan / kanske',
    category: 'hedging',
  },
  {
    pattern: /\bkan (möjligen|potentiellt|eventuellt|kanske)\b/gi,
    tier: 1,
    fix: 'kan / kanske',
    category: 'hedging',
  },
  {
    pattern: /\b(möjligen|kanske) (potentiellt|eventuellt)\b/gi,
    tier: 1,
    fix: 'kanske',
    category: 'hedging',
  },
  {
    pattern: /\b(troligtvis|sannolikt) (möjligen|kanske)\b/gi,
    tier: 1,
    fix: 'troligen',
    category: 'hedging',
  },
];

const AI_PHRASES_SV = [...AI_PHRASES_SV_HAND, ...AI_PHRASES_SV_PRESCRIPTIVE];

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
// Generated from locales/sv-se/references/svarta-listan-full.tsv (+ friends); regenerate: npm run locale:prescriptive

const AUTOFIXES_SV = [...AUTOFIXES_SV_PRESCRIPTIVE];

// ─── Empirical extras (Pattern 7) ─────────────────────────
// N-grams from locales/sv-se/references/sv-frequencies.json not already in curated tiers.
// Regenerate: npm run corpus:logodds

const { buildStopSet, shouldScoreEmpiricalExtra } = require('./empirical-filter');

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

module.exports = {
  TIER_1_SV_RAW,
  TIER_2_SV_RAW,
  TIER_3_SV_RAW,
  TIER_1_SV,
  TIER_2_SV,
  TIER_3_SV,
  AI_PHRASES_SV,
  FUNCTION_WORDS_SV,
  ABBREVIATIONS_SV,
  AUTOFIXES_SV,
  EMPIRICAL_EXTRA_SV,
};
