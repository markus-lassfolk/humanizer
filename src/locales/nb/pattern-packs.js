/**
 * locales/nb/pattern-packs.js — Norwegian (bokmål) pattern pack data on top of the English baseline.
 * Rows are deliberately narrow: only constructions the human baseline never produced.
 */

const { buildPacks } = require('../nordic-packs');

const NB_PATTERN_PACKS = buildPacks({
  1: [
    /\bbaner (vei|veien) for\b/gi,
    /\b(former|formet|omformer) fremtiden\b/gi,
    /\bet (varig|vedvarende) (avtrykk|arv)\b/gi,
    /\bmarkerer (begynnelsen|starten) på\b/gi,
    /\bstår som (et vitnesbyrd|et bevis|en symbolsk)\b/gi,
    /\bunderstreker (viktigheten|betydningen|verdien) av\b/gi,
    /\ben rik (vev|tradisjon|historie) av\b/gi,
  ],
  4: [
    /\bnaturskjønn[et]?\b/gi,
    /\bmalerisk[e]?\b/gi,
    /\bimponerende utsikt\b/gi,
    /\ben unik mulighet\b/gi,
    /\bverdensledende\b/gi,
    /\bperfekt beliggenhet\b/gi,
    /\ben (perle|skatt) av\b/gi,
  ],
  5: [
    /\bifølge (flere|ulike) (kilder|eksperter|analytikere)\b/gi,
    /\b(eksperter|analytikere|observatører) (mener|hevder|påpeker|tror)\b/gi,
    /\bdet er (allment kjent|bredt anerkjent|velkjent) at\b/gi,
    /\bmange (forskere|eksperter) (mener|hevder|påpeker)\b/gi,
    /\bbransjen er enig\b/gi,
  ],
  6: [
    /\btross (utfordringene|motgangen|hindringene)\b/gi,
    /\bfortsetter å (blomstre|vokse|trives|utvikle seg)\b/gi,
    /\bstår overfor (flere|mange|en rekke) (utfordringer|hindringer)\b/gi,
    /\bfremtiden (ser|er) (lys|lovende)\b/gi,
    /\bovervinne (hindringer|motgang)\b/gi,
  ],
  8: [
    /\bfungerer som (et|en)\b/gi,
    /\bagerer som\b/gi,
    /\bframstår som (et|en)\b/gi,
    /\binnehar (en|et)\b/gi,
    /\brepresenterer (en|et)\b/gi,
  ],
  12: [
    /\bfra .{3,40} til .{3,40},\s*fra .{3,40} til .{3,40}/gi,
    /\bfra (tidenes morgen|antikken|steinalderen) .{3,80} til (i dag|dagens|vår tid)\b/gi,
    /\bog alt (imellom|som ligger mellom)\b/gi,
  ],
  25: [
    /\bla oss (tenke|resonnere) (gjennom|over) (dette|saken)\b/gi,
    /\bla oss bryte (ned|dette ned)\b/gi,
    /\btrinn (1|2|3|4|5|én|to|tre|fire|fem):/gi,
    /\bjeg tenker høyt\b/gi,
  ],
  27: [
    [/\bjeg er (sikker|overbevist) på at\b/gi, 'Si saken uten å innlede med sikkerhet.'],
    [/\bdet er verdt å (merke seg|nevne|påpeke) at\b/gi, 'Si det rett ut.'],
    [/\binteressant nok,?\s/gi, 'La leseren avgjøre om det er interessant.'],
    [/\bforbausende nok,?\s/gi, 'Si saken; overraskelsen framgår av seg selv.'],
    [/\buten tvil,?\s/gi, 'Fjern eller gi belegg.'],
    [/\buomtvistelig\b/gi, 'Fjern eller gi belegg.'],
  ],
  28: [
    /\bnår det gjelder (ditt|ditt egentlige) spørsmål\b/gi,
    /\bsom svar på spørsmålet ditt\b/gi,
    /\bspørsmålet ditt (handler|gjelder) om\b/gi,
    /\bjeg forstår at du (lurer på|spør om)\b/gi,
    /\bdu lurer på (om|hvordan|hvorfor)\b/gi,
  ],
  msg: {
    1: 'Fjern overdreven betydningsmarkering. Oppgi konkrete fakta.',
    4: 'Bytt reklamespråk mot nøytral, saklig beskrivelse.',
    5: 'Oppgi kilde, studie eller person. Kan du ikke det, fjern påstanden.',
    6: 'Bytt ut mot konkrete utfordringer og målbare utfall.',
    8: 'Bruk enkle verb: «er», «har».',
    12: 'Unødvendig bredt spenn. Vær konkret om hva som dekkes.',
    25: 'Skjul resonnementet eller formuler det naturlig.',
    28: 'Svar rett på sak uten å gjenta spørsmålet først.',
    abstractNoun: 'Abstrakt substantivtrio. Velg det som faktisk betyr noe.',
    adjective: 'Buzzy adjektivtrio. Velg ett og vær konkret.',
  },
  adjectives: [
    'sømløs',
    'intuitiv',
    'kraftfull',
    'innovativ',
    'dynamisk',
    'robust',
    'omfattende',
    'skalerbar',
    'agil',
    'effektiv',
    'engasjerende',
    'meningsfull',
    'transformativ',
    'bærekraftig',
    'inkluderende',
    'tilgjengelig',
    'moderne',
    'banebrytende',
    'fleksibel',
    'brukervennlig',
  ],
  conjunction: 'og',
  abstractNounRegex:
    /\b(\w+(?:sjon|het|ing|skap|else|isering)),\s+(\w+(?:sjon|het|ing|skap|else|isering))\s+og\s+(\w+(?:sjon|het|ing|skap|else|isering))\b/gi,
  synonyms: [
    ['selskap', 'foretak', 'konsern', 'virksomhet', 'enhet'],
    ['problem', 'utfordring', 'hindring', 'vanskelighet', 'dilemma'],
    ['løsning', 'metode', 'tilnærming', 'strategi', 'rammeverk'],
    ['verktøy', 'instrument', 'mekanisme', 'redskap', 'hjelpemiddel'],
    ['person', 'individ', 'menneske', 'aktør'],
  ],
});

module.exports = { NB_PATTERN_PACKS };
