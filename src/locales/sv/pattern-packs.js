/**
 * locales/sv/pattern-packs.js — Swedish pattern pack data (merged with English baseline).
 */

const { PATTERN_PACKS_EN } = require('../en/pattern-packs');

// ─── Pattern packs (Swedish) ─────────────────────────────
// Built on English packs so mixed Swenglish text still gets English signals;
// Swedish-only regex rows are appended per pattern. See en-pattern-packs.js.

/** @param {RegExp[]} rex @param {string} suggestion @param {'high'|'medium'|'low'} [confidence] */
function svPackMap(rex, suggestion, confidence = 'high') {
  return rex.map((regex) => ({ regex, suggestion, confidence }));
}

const SV_PATTERN_PACKS = {
  ...PATTERN_PACKS_EN,

  1: [
    ...PATTERN_PACKS_EN[1],
    ...svPackMap(
      [
        /\bbanar väg(en)? för\b/gi,
        /\bsätter (tonen|standarden) för\b/gi,
        /\b(formar|formade|omformar) framtiden\b/gi,
        /\bspeglar (en )?(bredare|större) (trend|rörelse|samhällsförändring|utveckling)\b/gi,
        /\bett (bestående|varaktigt) (arv|avtryck)\b/gi,
        /\bkulminerar i\b/gi,
        /\binledde en ny era\b/gi,
        /\bfortsätter att forma\b/gi,
        /\bstår som (en symbol|ett bevis|en ledstjärna)\b/gi,
        /\bmarkerar (början|inledningen) på\b/gi,
        /\bär ett (vittnesbörd|bevis) om\b/gi,
        /\b(en) (rik|mångfacetterad) (väv|tradition|historia) av\b/gi,
        /\bett (tydligt )?bevis på (kraften|värdet|betydelsen|styrkan) (i|hos|av)\b/gi,
        /\bunderstryker (vikten|betydelsen|värdet) av\b/gi,
      ],
      'Ta bort överdriven betydelsemarkering. Ange konkreta fakta i stället.',
      'high',
    ),
  ],

  2: [
    ...PATTERN_PACKS_EN[2],
    {
      regex:
        /\b(omnämnts|omtalats|nämnts|citerats|presenterats|framhållits|porträtterats) (i|av|på) [^.]{0,40}(DN|Dagens Nyheter|SvD|Svenska Dagbladet|Expressen|Aftonbladet|SVT|Sveriges Television|Sveriges Radio|TT|Dagens Industri|DI|Sydsvenskan|Göteborgs-Posten|GP|Dagens Media|Resumé)\b/gi,
      suggestion:
        'Citera ett konkret påstående från en namngiven källa i stället för att lista medier.',
      confidence: 'medium',
    },
    {
      regex:
        /\bhar (varit|medverkat som) (gäst|talare|panelist) (i|hos|på) (SVT|TV4|P1|P3|P4|Sveriges Radio)\b/gi,
      suggestion:
        'Citera ett konkret påstående från en namngiven källa i stället för att lista medier.',
      confidence: 'medium',
    },
    {
      regex:
        /\bhar (medverkat|deltagit|figurerat) i [^.]{0,40}(DN|SvD|Aftonbladet|Expressen|SVT|TV4|TT|Dagens Industri)\b/gi,
      suggestion:
        'Citera ett konkret påstående från en namngiven källa i stället för att lista medier.',
      confidence: 'medium',
    },
    {
      regex: /\baktiv (närvaro|profil) (i|på) sociala medier\b/gi,
      suggestion:
        'Citera ett konkret påstående från en namngiven källa i stället för att lista medier.',
      confidence: 'medium',
    },
    {
      regex: /\bhar (omnämnts|hyllats|prisats) av [^.]{0,40}(branschen|kollegor|kritiker)\b/gi,
      suggestion:
        'Citera ett konkret påstående från en namngiven källa i stället för att lista medier.',
      confidence: 'medium',
    },
  ],

  3: [
    ...PATTERN_PACKS_EN[3],
    {
      regex:
        /,\s*(vilket|som)\s+(understryker|framhäver|återspeglar|symboliserar|stärker|signalerar|cementerar|förstärker|illustrerar|exemplifierar|representerar|belyser|visar på|tydliggör)\b[^.]{5,}/gi,
      suggestion:
        'Bryt ut bisatsen — om poängen är viktig, ge den en egen mening med konkreta detaljer.',
      confidence: 'high',
    },
  ],

  4: [
    ...PATTERN_PACKS_EN[4],
    ...svPackMap(
      [
        /\bnaturskön[at]?\b/gi,
        /\bpittoresk[at]?\b/gi,
        /\bbetagande\b/gi,
        /\bmagnifik[at]?\b/gi,
        /\bandlöst (vacker|vackra|vackert)\b/gi,
        /\bförtrollande\b/gi,
        /\bett (måste-besök|måste|absolut måste)\b/gi,
        /\binbäddad[t]? (i|bland|mellan)\b/gi,
        /\bett rikt (kulturarv|arv)\b/gi,
        /\bden naturliga skönheten\b/gi,
        /\bperfekt belägen\b/gi,
        /\bi (hjärtat|kärnan) av\b/gi,
        /\bvärldsledande inom\b/gi,
        /\bett pärlband av\b/gi,
        /\bunik[at]? möjlighet\b/gi,
      ],
      'Byt ut marknadsföringsspråk mot neutral, saklig beskrivning.',
      'high',
    ),
  ],

  5: [
    ...PATTERN_PACKS_EN[5],
    ...svPackMap(
      [
        /\benligt (rapporter|källor|uppgifter|flera källor|många bedömare)\b/gi,
        /\bbedömare (menar|tror|hävdar|säger|påpekar)\b/gi,
        /\banalytiker (menar|säger|tror|hävdar|påpekar)\b/gi,
        /\biakttagare har (noterat|påpekat|nämnt|framhållit)\b/gi,
        /\bbranschkällor uppger\b/gi,
        /\bpersoner (med insyn|nära ärendet|nära processen|nära förhandlingarna)\b/gi,
        /\bvissa (kritiker|forskare|experter|analytiker|bedömare) (hävdar|menar|säger|tror)\b/gi,
        /\bdet är (allmänt känt|allmänt accepterat|välkänt|allmänt erkänt)\b/gi,
        /\b(allmänt|brett) (erkänd|accepterad|erkänt|accepterat)\b/gi,
        /\bbranschen (är överens|menar|tror)\b/gi,
        /\bdet finns (en )?(bred|allmän|växande) konsensus\b/gi,
        /\bmånga (forskare|experter|analytiker|bedömare) (hävdar|menar|säger|tror)\b/gi,
      ],
      'Ange källa, studie eller person. Om du inte kan det — ta bort påståendet.',
      'high',
    ),
  ],

  6: [
    ...PATTERN_PACKS_EN[6],
    ...svPackMap(
      [
        /\btrots (utmaningarna|svårigheterna|hindren|motgångarna|dessa utmaningar|dessa hinder)\b/gi,
        /\bfortsätter att (blomstra|växa|frodas|utvecklas|expandera)\b/gi,
        /\bmöter (flera|många|olika|en rad) (utmaningar|hinder|svårigheter)\b/gi,
        /\b(framtidsutsikter|framtidsutsikterna|framtiden) (ser|ter sig) (ljus|ljusa|positiv|positiva|lovande)\b/gi,
        /\bövervinna (hinder|motgångar|utmaningar|svårigheter)\b/gi,
        /\butmaningar och (möjligheter|framtid|arv)\b/gi,
        /\b(har|hade) (vädrat|red ut|rid(it|er) ut) stormen\b/gi,
        /\b(står|stod) emot (stormen|prövningarna)\b/gi,
      ],
      'Byt ut mot konkreta utmaningar och mätbara utfall.',
      'high',
    ),
  ],

  8: [
    ...PATTERN_PACKS_EN[8],
    ...svPackMap(
      [
        /\bfungerar som\b/gi,
        /\bagerar som\b/gi,
        /\butgör (en|ett)\b/gi,
        /\btjänar som\b/gi,
        /\bframstår som\b/gi,
        /\b(står|stod) som\b/gi,
        /\bfunktionerar som\b/gi,
        /\binnehar (en|ett)\b/gi,
        /\bvilar på (en|ett)\b/gi,
        /\bmarkerar (en|ett)\b/gi,
        /\brepresenterar (en|ett)\b/gi,
      ],
      'Använd enkla formuleringar: "är", "har", "är" i stället för omskrivningar.',
      'high',
    ),
  ],

  10: {
    ...PATTERN_PACKS_EN[10],
    adjectives: [
      'sömlös',
      'intuitiv',
      'kraftfull',
      'innovativ',
      'dynamisk',
      'robust',
      'omfattande',
      'skalbar',
      'agil',
      'effektiv',
      'engagerande',
      'meningsfull',
      'transformativ',
      'hållbar',
      'inkluderande',
      'tillgänglig',
      'modern',
      'banbrytande',
      'flexibel',
      'kraftfull',
      'användarvänlig',
    ],
    conjunction: 'och',
    abstractNounRegex:
      /\b(\w+(?:tion|het|ning|skap|else|isering)),\s+(\w+(?:tion|het|ning|skap|else|isering)),\s+och\s+(\w+(?:tion|het|ning|skap|else|isering))\b/gi,
    abstractNounSuggestion: 'Abstrakt substantivtrio. Välj det som faktiskt spelar roll.',
    adjectiveSuggestion: 'Buzzy adjektivtrio. Välj ett och var konkret.',
  },

  11: [
    ...PATTERN_PACKS_EN[11],
    ['företag', 'organisation', 'verksamhet', 'bolag', 'koncern', 'aktör', 'entitet'],
    ['stad', 'metropol', 'ort', 'kommun', 'tätort', 'centralort'],
    ['land', 'nation', 'stat', 'rike'],
    ['problem', 'utmaning', 'hinder', 'svårighet', 'frågeställning', 'dilemma'],
    ['lösning', 'metod', 'tillvägagångssätt', 'strategi', 'ramverk', 'ansats', 'angreppssätt'],
    ['verktyg', 'instrument', 'mekanism', 'apparat', 'system', 'redskap', 'hjälpmedel'],
    ['byggnad', 'struktur', 'anläggning', 'fastighet', 'komplex'],
    ['person', 'individ', 'människa', 'aktör', 'aktörer'],
    ['huvudkaraktär', 'protagonist', 'centralfigur', 'huvudperson', 'rollfigur'],
  ],

  12: [
    ...PATTERN_PACKS_EN[12],
    ...svPackMap(
      [
        /\bfrån .{3,40} till .{3,40},\s*från .{3,40} till .{3,40}/gi,
        /\bfrån (begynnelsen|gryningen|tidens början|de tidigaste|antikens|stenåldern) .{3,80} till (modern tid|nutid|våra dagar|den digitala (eran|tidsåldern)|i dag|idag)\b/gi,
        /\bspänner (över|från) .{3,40} till .{3,40}\b/gi,
        /\b(allt )?från .{3,30} till .{3,30}\s*—\s*och allt däremellan\b/gi,
      ],
      'Onödigt brett spann. Var konkret om vad ni faktiskt täcker.',
      'medium',
    ),
  ],

  25: [
    ...PATTERN_PACKS_EN[25],
    ...svPackMap(
      [
        /\blåt (mig|oss) (tänka|resonera) (igenom|kring|över) (det här|detta|saken)\b/gi,
        /\b(låt oss|vi ska) (bryta ner|dela upp) (det här|detta|frågan)\b/gi,
        /\bför att (närma oss|angripa|hantera) (det här|detta) (systematiskt|metodiskt|logiskt)\b/gi,
        /\bsteg (1|2|3|4|5|ett|två|tre|fyra|fem):/gi,
        /\bförst (ska|skall) vi (överväga|fundera över|titta på)\b/gi,
        /\b(här är|så här ser) (mitt|mitt eget) (tankesätt|resonemang|tankearbete) (ut)?\b/gi,
        /\bjag (tänker|funderar) (högt|kring det här)\b/gi,
      ],
      'Dölj resonemang eller formulera naturligt — säg t.ex. "Min bedömning:" i stället för att exponera steg-för-steg-tänkande.',
      'high',
    ),
  ],

  26: [
    ...PATTERN_PACKS_EN[26],
    {
      regex:
        /^#+\s*(översikt|sammanfattning|introduktion|bakgrund|huvudpunkter|nyckelpunkter|slutsats|inledning|avslutning)\s*:?\s*$/gim,
      suggestion: 'Mallrubrik. Låt innehållet flyta naturligt.',
      confidence: 'medium',
    },
  ],

  27: [
    ...PATTERN_PACKS_EN[27],
    {
      regex: /\bjag är (säker|övertygad) på (att|om)\b/gi,
      fix: 'Säg sakfrågan utan att inleda med säkerhet.',
    },
    {
      regex: /\bdet (är|kan vara) värt att (notera|nämna|påpeka) att\b/gi,
      fix: 'Säg det rakt.',
    },
    { regex: /\bintressant nog,?\b/gi, fix: 'Låt läsaren avgöra om det är intressant.' },
    { regex: /\bförvånande nog,?\b/gi, fix: 'Säg sakfrågan; överraskningen framgår av sig själv.' },
    { regex: /\bviktigt nog,?\b/gi, fix: 'Låt läsaren bedöma vikten.' },
    { regex: /\bnoterbart,?\s/gi, fix: 'Säg det noterbara direkt.' },
    {
      regex: /\bobestridligen,?\s/gi,
      fix: 'Ta bort eller ge belägg.',
    },
    { regex: /\butan tvekan,?\s/gi, fix: 'Ta bort eller ge belägg.' },
    { regex: /\bmed all (säkerhet|sannolikhet)\b/gi, fix: 'Ta bort eller var konkret.' },
    { regex: /\botvivelaktigt,?\s/gi, fix: 'Ta bort eller ge belägg.' },
  ],

  28: [
    ...PATTERN_PACKS_EN[28],
    ...svPackMap(
      [
        /\bnär det (gäller|kommer till) din fråga\b/gi,
        /\bsom svar på din fråga\b/gi,
        /\bför att (besvara|svara på) din fråga\b/gi,
        /\bdin fråga (handlar|gäller) (om|kring)\b/gi,
        /\bjag (förstår|uppfattar) att du (undrar|frågar|är nyfiken på)\b/gi,
        /\bfrågan om (huruvida|hur|varför|vad|när)\b/gi,
        /\bvad gäller din fråga (om|kring)\b/gi,
        /\bdu undrar (om|över|kring)\b/gi,
      ],
      'Svara rakt på sak utan att upprepa frågan först.',
      'high',
    ),
  ],
};

module.exports = { SV_PATTERN_PACKS };
