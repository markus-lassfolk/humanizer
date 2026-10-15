/**
 * locales/da/pattern-packs.js — Danish pattern pack data on top of the English baseline.
 * Rows are deliberately narrow: only constructions the human baseline never produced.
 */

const { buildPacks } = require('../nordic-packs');

const DA_PATTERN_PACKS = buildPacks({
  1: [
    /\bbaner vej(en)? for\b/gi,
    /\b(former|formede|omformer) fremtiden\b/gi,
    /\bet (varigt|vedvarende) (aftryk|eftermæle)\b/gi,
    /\bmarkerer (begyndelsen|starten) på\b/gi,
    /\bstår som (et vidnesbyrd|et bevis|en symbolsk)\b/gi,
    /\bunderstreger (vigtigheden|betydningen|værdien) af\b/gi,
    /\ben rig (væv|tradition|historie) af\b/gi,
  ],
  4: [
    /\bnaturskøn[ne]?\b/gi,
    /\bmalerisk[e]?\b/gi,
    /\bimponerende udsigt\b/gi,
    /\ben unik mulighed\b/gi,
    /\bverdensførende\b/gi,
    /\bperfekt beliggenhed\b/gi,
    /\ben (perle|skat) af\b/gi,
  ],
  5: [
    /\bifølge (flere|forskellige) (kilder|eksperter|analytikere)\b/gi,
    /\b(eksperter|analytikere|observatører) (mener|hævder|påpeger|tror)\b/gi,
    /\bdet er (almindeligt kendt|bredt anerkendt|velkendt),? at\b/gi,
    /\bmange (forskere|eksperter) (mener|hævder|påpeger)\b/gi,
    /\bbranchen er enig\b/gi,
  ],
  6: [
    /\btrods (udfordringerne|modgangen|forhindringerne)\b/gi,
    /\bfortsætter med at (blomstre|vokse|trives|udvikle sig)\b/gi,
    /\bstår over for (flere|mange|en række) (udfordringer|forhindringer)\b/gi,
    /\bfremtiden (ser|er) (lys|lovende)\b/gi,
    /\boverkomme (forhindringer|modgang)\b/gi,
  ],
  8: [
    /\bfungerer som (et|en)\b/gi,
    /\bagerer som\b/gi,
    /\bfremstår som (et|en)\b/gi,
    /\bindtager (en|et)\b/gi,
    /\brepræsenterer (en|et)\b/gi,
  ],
  12: [
    /\bfra .{3,40} til .{3,40},\s*fra .{3,40} til .{3,40}/gi,
    /\bfra (tidernes morgen|antikken|stenalderen) .{3,80} til (i dag|nutidens|vor tid)\b/gi,
    /\bog alt (imellem|derimellem)\b/gi,
  ],
  25: [
    /\blad os (tænke|resonnere) (igennem|over) (dette|sagen)\b/gi,
    /\blad os bryde (dette )?ned\b/gi,
    /\btrin (1|2|3|4|5|et|to|tre|fire|fem):/gi,
    /\bjeg tænker højt\b/gi,
  ],
  27: [
    [/\bjeg er (sikker|overbevist) på,? at\b/gi, 'Sig sagen uden at indlede med sikkerhed.'],
    [/\bdet er værd at (bemærke|nævne|påpege),? at\b/gi, 'Sig det direkte.'],
    [/\binteressant nok,?\s/gi, 'Lad læseren afgøre om det er interessant.'],
    [/\bforbløffende nok,?\s/gi, 'Sig sagen; overraskelsen fremgår af sig selv.'],
    [/\buden tvivl,?\s/gi, 'Fjern eller giv belæg.'],
    [/\buomtvisteligt\b/gi, 'Fjern eller giv belæg.'],
  ],
  28: [
    /\bnår det gælder dit spørgsmål\b/gi,
    /\bsom svar på dit spørgsmål\b/gi,
    /\bdit spørgsmål (handler|drejer sig) om\b/gi,
    /\bjeg forstår,? at du (undrer dig over|spørger om)\b/gi,
    /\bdu undrer dig over (om|hvordan|hvorfor)\b/gi,
  ],
  msg: {
    1: 'Fjern overdreven betydningsmarkering. Angiv konkrete fakta.',
    4: 'Byt reklamesprog ud med neutral, saglig beskrivelse.',
    5: 'Angiv kilde, undersøgelse eller person. Kan du ikke det, fjern påstanden.',
    6: 'Byt ud med konkrete udfordringer og målbare udfald.',
    8: 'Brug enkle verber: «er», «har».',
    12: 'Unødvendigt bredt spænd. Vær konkret om hvad der dækkes.',
    25: 'Skjul ræsonnementet eller formuler det naturligt.',
    28: 'Svar direkte uden først at gentage spørgsmålet.',
    abstractNoun: 'Abstrakt substantivtrio. Vælg det, der faktisk betyder noget.',
    adjective: 'Buzzy adjektivtrio. Vælg ét og vær konkret.',
  },
  adjectives: [
    'sømløs',
    'intuitiv',
    'kraftfuld',
    'innovativ',
    'dynamisk',
    'robust',
    'omfattende',
    'skalerbar',
    'agil',
    'effektiv',
    'engagerende',
    'meningsfuld',
    'transformativ',
    'bæredygtig',
    'inkluderende',
    'tilgængelig',
    'moderne',
    'banebrydende',
    'fleksibel',
    'brugervenlig',
  ],
  conjunction: 'og',
  abstractNounRegex:
    /\b(\w+(?:tion|hed|ing|skab|else|isering)),\s+(\w+(?:tion|hed|ing|skab|else|isering))\s+og\s+(\w+(?:tion|hed|ing|skab|else|isering))\b/gi,
  synonyms: [
    ['virksomhed', 'selskab', 'koncern', 'foretagende', 'enhed'],
    ['problem', 'udfordring', 'forhindring', 'vanskelighed', 'dilemma'],
    ['løsning', 'metode', 'tilgang', 'strategi', 'rammeværk'],
    ['værktøj', 'instrument', 'mekanisme', 'redskab', 'hjælpemiddel'],
    ['person', 'individ', 'menneske', 'aktør'],
  ],
});

module.exports = { DA_PATTERN_PACKS };
