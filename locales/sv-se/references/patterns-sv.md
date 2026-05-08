# Swedish AI writing patterns — full catalogue

Swedish-language counterpart to [`locales/generic/references/patterns.md`](../../generic/references/patterns.md). Every detector in `src/patterns.js` runs for `--locale sv`; this page lists the **Swedish signals** each one looks for. English signals still fire on Swedish text (Swedish AI output often mixes English loan words), but the bullets below show what is added on top via [`src/locales/sv/`](../../../src/locales/sv/) (`pattern-packs.js`, `vocabulary.js`, profile `index.js`).

> Implementation references:
> - Pattern engine: [`src/patterns.js`](../../../src/patterns.js)
> - Swedish profile: [`src/locales/sv/index.js`](../../../src/locales/sv/index.js)
> - Curated vocabulary background: [`swedish-ai-vocabulary.md`](swedish-ai-vocabulary.md)
> - Prescriptive corpus (Svarta listan / Klarspråk): [`svarta-listan.md`](svarta-listan.md)
> - Empirical n-grams (log-odds): [`empirical-sv-tiers.md`](empirical-sv-tiers.md)

## Content patterns (1-6)

### 1. Significance inflation

Swedish AI text inflates importance with metaphor and arv-prose.

**Signals (sv-pack):** *banar väg för*, *sätter tonen för*, *formar framtiden*, *speglar en bredare trend*, *ett bestående arv*, *kulminerar i*, *inledde en ny era*, *fortsätter att forma*, *står som en symbol/ledstjärna*, *markerar början på*, *ett vittnesbörd om*, *understryker vikten av*, plus the existing TIER_1 phrases (*vittnar om*, *ett bevis på*, *spelar en avgörande roll*, *banbrytande*).

**Before:**
> Statistiska centralbyråns grundande 1858 markerar en pivotal vändpunkt i den svenska statens utveckling och vittnar om en bredare samhällsförändring.

**After:**
> Statistiska centralbyrån grundades 1858 efter en proposition från finansminister J.A. Gripenstedt. Den första folkräkningen genomfördes samma år.

---

### 2. Notability name-dropping

Swedish AI text lists Swedish media to imply authority without making a specific claim.

**Signals (sv-pack):** *omnämnts/citerats/presenterats i [DN, SvD, Expressen, Aftonbladet, SVT, Sveriges Radio, TT, Dagens Industri, Sydsvenskan, GP, Resumé, Dagens Media]*, *medverkat i SVT/TV4/P1*, *aktiv närvaro i sociala medier*, *hyllats av branschen*.

**Before:**
> Hennes åsikter har omnämnts i Dagens Nyheter, SvD, Expressen och Aftonbladet, och hon har aktiv närvaro i sociala medier med över 50 000 följare.

**After:**
> I en intervju i DN i mars 2024 argumenterade hon för att AI-regleringen bör fokusera på utfall snarare än metoder.

---

### 3. Superficial -ing analyses (Swedish: *vilket / som*-bisatser)

Swedish has no -ing form for participial tails; LLMs use bisats med *vilket* / *som*.

**Signals (sv-pack):** `, vilket understryker / framhäver / återspeglar / symboliserar / stärker / signalerar / cementerar / förstärker / illustrerar / exemplifierar / representerar / belyser / visar på / tydliggör …` (eller motsvarande med *som*).

**Before:**
> Templet använder lokal kalksten, vilket symboliserar regionens geologiska identitet och återspeglar bygdens djupa förankring i traditionen.

**After:**
> Templet är byggt i kalksten från Brunflo. Arkitekten valde materialet eftersom Brunflo-kalken bryts 30 km från platsen.

---

### 4. Promotional language (turism-/PR-svenska)

**Signals (sv-pack):** *naturskön*, *pittoresk*, *betagande*, *magnifik*, *andlöst vacker*, *förtrollande*, *ett måste-besök*, *inbäddad i*, *ett rikt kulturarv*, *den naturliga skönheten*, *perfekt belägen*, *i hjärtat av*, *världsledande inom*, *unik möjlighet*. Plus existing TIER_1 entries (*världsberömd*, *toppmodern*, *i framkant*, *oöverträffad*, *gedigen*).

**Before:**
> Inbäddad i hjärtat av Bohuslän erbjuder den pittoreska byn en unik möjlighet att uppleva den naturliga skönheten i ett rikt kulturarv.

**After:**
> Byn ligger 8 km norr om Lysekil. Befolkning: 320. Hamnen är från 1840-talet och används fortfarande för småskaligt torskfiske.

---

### 5. Vague attributions

**Signals (sv-pack):** *enligt rapporter / källor / uppgifter*, *bedömare / analytiker menar*, *iakttagare har noterat*, *branschkällor uppger*, *personer med insyn / nära ärendet*, *det är allmänt känt / accepterat*, *brett erkänt*, *branschen är överens*, *det finns en bred konsensus*, *många forskare hävdar*. Plus phrase-level *experter (menar|anser|säger)* / *studier visar* / *forskning visar* (AI_PHRASES_SV_HAND).

**Before:**
> Enligt rapporter och bedömare menar branschen att en bred konsensus håller på att växa fram.

**After:**
> I en TT-intervju 2024-04-12 säger branschorganisationen Svensk Handels chefsekonom Joakim Bornold att kortbetalningarna ökade med 12 procent under kvartalet.

---

### 6. Formulaic challenges

**Signals (sv-pack):** *trots utmaningarna / svårigheterna / hindren*, *fortsätter att blomstra / växa / frodas*, *möter flera utmaningar*, *framtiden ser ljus ut* (also conclusion), *övervinna hinder*, *utmaningar och möjligheter*, *vädra stormen*, *trots dessa utmaningar*.

**Before:**
> Trots dessa utmaningar fortsätter företaget att blomstra, övervinner hinder och framtiden ser ljus ut.

**After:**
> Företagets EBITDA föll 18 procent 2023 efter att huvudkunden Volvo Cars dragit tillbaka sin order. Vd:n säger att de tre första kvartalen 2024 ligger 6 procent under fjolåret.

## Language patterns (7-12)

### 7. AI vocabulary (over 380 ord/fraser)

Pattern 7 är den **bredaste** detektorn. Swedish-locale aktiverar:

- **Tier 1 (107)** — alltid flaggade. Loan-translations (*sömlös, banbrytande, transformativ, mångfacetterad, holistiskt perspektiv*), Swenglish (*best practices, stakeholders, key takeaways, alignment*), och konsultsvenska (*helhetslösning, kundresa, värdedriven*).
- **Tier 2 (190)** — flaggas när ≥ 2 förekommer. Konsultverb (*möjliggöra, säkerställa, optimera, implementera*), AI-typiska adjektiv (*kunskapsdriven, datadriven, användarcentrerad, tvärfunktionell, välgrundad*), och formell-svenska nominaliseringar (*nulägesanalys, beslutsfattande, samverkanseffekter, helhetssyn*).
- **Tier 3 (84)** — endast vid > 3 % densitet. Vanliga ord som blir signal när de staplas (*viktig, central, effektiv, strategisk, hållbar, omfattande, betydelsefull*).
- **Phrases (167)** — handgjorda mönster i [`AI_PHRASES_SV_HAND`](../../../src/locales/sv/vocabulary.js) plus Svarta listan / Klarspråk via [`scripts/build-sv-locale-prescriptive.mjs`](../scripts/build-sv-locale-prescriptive.mjs).
- **Empiriska n-gram** — `empiricalExtra` från [`sv-frequencies.json`](sv-frequencies.json) (log-odds AI vs human) — flerordsmönster som inte fanns med i tier-listorna.

Suppression: phrases märkta `chatbot` / `sycophantic` / `cutoff` / `filler` / `hedging` / `conclusion` flyttas från Pattern 7 till Pattern 19-24 så samma signal inte räknas dubbelt.

---

### 8. Copula avoidance

**Signals (sv-pack):** *fungerar som*, *agerar som*, *utgör en/ett*, *tjänar som*, *framstår som*, *står som*, *innehar*, *vilar på*, *markerar*, *representerar*.

**Before:**
> Plattformen fungerar som ett centralt nav som utgör en kraftfull motor för värdeskapande.

**After:**
> Plattformen är ett betalningsnav. 312 banker använder den.

---

### 9. Negative parallelisms

**Signals (`sv/vocabulary.js` phrase):** *det handlar inte (bara|enbart) om X utan (också|även) om Y* (AI_PHRASES_SV_HAND). Engelsk grundform fångar fortfarande *not only X but also Y* om en svensk text använder den varianten.

**Before:**
> Det handlar inte bara om teknik, utan också om människor.

**After:**
> Vår nya plattform fungerar idag i 17 av 21 regioner. De återstående fyra startar i augusti.

---

### 10. Rule of three (sömlös, intuitiv, kraftfull)

**Signals (sv-pack):** triader av *sömlös, intuitiv, kraftfull, innovativ, dynamisk, robust, omfattande, skalbar, agil, effektiv, engagerande, meningsfull, transformativ, hållbar, inkluderande, tillgänglig, modern, banbrytande, flexibel, användarvänlig*. Abstrakta substantivtriader (*-tion, -het, -ning, -skap, -else, -isering*).

**Before:**
> En sömlös, intuitiv och kraftfull lösning som ger digitalisering, optimering och innovation.

**After:**
> Plattformen läser in 1 200 fakturor per minut. Den ersätter ett system från 2008.

---

### 11. Synonym cycling

**Sv synonymfamiljer (sv-pack):** *företag / organisation / verksamhet / bolag / koncern / aktör / entitet*, *stad / metropol / ort / kommun / tätort*, *land / nation / stat / rike*, *problem / utmaning / hinder / svårighet / frågeställning / dilemma*, *lösning / metod / tillvägagångssätt / strategi / ramverk / ansats*, *verktyg / instrument / mekanism / apparat / system / redskap / hjälpmedel*, *byggnad / struktur / anläggning / fastighet / komplex*, *huvudkaraktär / protagonist / centralfigur / huvudperson*.

**Before:**
> Företaget sökte en lösning. Bolaget valde en metod. Organisationen implementerade ramverket.

**After:**
> Volvo Cars valde en metod. Den implementerades i juni 2024.

---

### 12. False ranges

**Signals (sv-pack):** dubbla *från X till Y, från A till B*, abstrakta spann *från (begynnelsen|gryningen|antikens|stenåldern) … till (modern tid|nutid|den digitala eran)*, *spänner över X till Y*, *från X till Y — och allt däremellan*.

**Before:**
> Från antikens Grekland till den digitala tidsåldern har människan sökt mening.

**After:**
> Aristoteles Nikomakiska etik (ca 340 f.Kr.) tar upp samma fråga: vad är ett bra liv?

## Style patterns (13-18)

Patterns 13-18 är **språkagnostiska** — de fungerar likadant på svensk text utan extra paket.

| # | Pattern | Vad som flaggas på svenska |
|---|---------|----------------------------|
| 13 | Em dash overuse | Tät förekomst av tankstreck (—) i svensk text |
| 14 | Boldface overuse | ≥ 3 **fetade** ord/fraser |
| 15 | Inline-header lists | `- **Rubrik:** beskrivning` |
| 16 | Title Case headings | Engelskt mönster — flaggas sällan på svenska eftersom svensk titelstil är mening med stor första bokstav |
| 17 | Emoji overuse | ≥ 3 emoji i professionell text |
| 18 | Curly quotes | "smarta citationstecken" istället för "raka" |

## Communication patterns (19-21, 25, 27, 28)

### 19. Chatbot artifacts

**Sv-fraser (kategori `chatbot`):** *för att svara på din fråga*, *låt mig börja med*, *låt oss dyka ner i / utforska / ta en titt på*, *utan vidare omsvep*, *hoppas att detta hjälper / besvarar*, *hör gärna av dig*, *tveka inte att*, *välkommen att höra av / kontakta*, *jag hjälper gärna till*, *finns det något jag kan hjälpa*, *vill du att jag ska*, *här är en kort översikt / sammanfattning / guide*.

---

### 20. Cutoff disclaimers

Engelska cutoff-fraser fångas direkt; svenska AI-utdata speglar dem sällan ord-för-ord. Pattern 20 förblir därför primärt engelsk-driven men dispatchas via samma category-mekanism, så ev. svenska *(min senaste uppdatering / min kunskapscutoff)* går att lägga till framöver utan att röra `patterns.js`.

---

### 21. Sycophantic tone

**Sv-fraser (kategori `sycophantic`):** *bra fråga*, *utmärkt fråga*, *det är en bra/utmärkt/intressant fråga/poäng/observation*, *du har helt/absolut rätt*, *du lyfter en viktig/bra/värdefull poäng*, *vilken insiktsfull/skarpsinnig fråga / kommentar / reflektion*, *tack för en intressant/bra/viktig fråga*.

---

### 25. Reasoning chain artifacts

**Sv-pack:** *låt mig/oss tänka igenom det här*, *låt oss bryta ner det / dela upp frågan*, *för att närma oss det här systematiskt / metodiskt / logiskt*, *steg 1/2/3/ett/två/tre:*, *först ska vi överväga / fundera över / titta på*, *här är mitt tankesätt / resonemang*, *jag tänker högt*.

---

### 27. Confidence calibration

**Sv-pack:** *jag är säker/övertygad på att*, *det är värt att notera/nämna/påpeka att*, *intressant nog*, *förvånande nog*, *viktigt nog*, *noterbart*, *obestridligen*, *utan tvekan*, *med all säkerhet/sannolikhet*, *otvivelaktigt*.

---

### 28. Acknowledgment loops

**Sv-pack:** *när det gäller / kommer till din fråga*, *som svar på din fråga*, *för att besvara din fråga*, *din fråga handlar om*, *jag förstår att du undrar / frågar*, *frågan om huruvida / hur / varför*, *du undrar om / över / kring*.

## Filler & hedging (22, 23, 24, 26)

### 22. Filler phrases

Fångas via prescriptive autofixes från [Svarta listan](svarta-listan.md): *i syfte att → för att*, *erhålla → få*, *föreligga → finnas*, *vidta åtgärder → agera/specifik åtgärd*, *innehava → ha*, m.fl. (~65 par i [`sv-prescriptive.js`](../../../src/locales/generated/sv-prescriptive.js)).

---

### 23. Excessive hedging

**Sv-fraser (kategori `hedging`):** *skulle potentiellt / möjligen / eventuellt kunna*, *kan möjligen / potentiellt / eventuellt / kanske*, *möjligen / kanske potentiellt / eventuellt*, *troligtvis / sannolikt möjligen / kanske*.

---

### 24. Generic conclusions

**Sv-fraser (kategori `conclusion`):** *sammanfattningsvis (kan man säga)*, *framtiden ser ljus ut*, *spännande tider väntar*, *möjligheterna är oändliga / gränslösa / enorma*, *ett steg i rätt riktning*, *bara framtiden får utvisa*, *fortsätter resan / sin resa mot*.

---

### 26. Excessive structure

**Sv-pack:** mall-rubriker — `# Översikt`, `# Sammanfattning`, `# Introduktion`, `# Bakgrund`, `# Huvudpunkter / Nyckelpunkter`, `# Slutsats`, `# Inledning`, `# Avslutning`. Övriga heuristiker (för många rubriker / punktlistor i kort text) är språkagnostiska.

## Style / pattern 29

### 29. Invisible unicode obfuscation

Språkagnostisk. Flaggar zero-width-tecken, mjuka bindestreck och tät förekomst av non-breaking spaces även i svensk text — viktigt eftersom NBSP före `%`, *kr*, etc. förekommer naturligt på svenska, så detektorn kräver hög densitet innan den slår ut.

## Statistical signals (samma som engelska)

Samma engine, men med svensk anpassning:

| Mått | Implementering på sv |
|------|----------------------|
| **Tokenisering** | Unicode-säker (`å, ä, ö` bevaras) — se [`stats.js`](../../../src/stats.js) |
| **Meningsdelning** | Skyddar svenska förkortningar (*t.ex., dvs., bl.a., m.m., m.fl., s.k., fr.o.m., t.o.m., SOU, prop, NJA, …*) |
| **Funktionsord** | 102 svenska funktionsord (jfr 100 engelska) — *och, att, det, som, är, i, på, för, …* |
| **Burstighet, TTR, n-gram-repetition, meningslängdens variationskoefficient** | Språkagnostiska — fungerar direkt |
| **Läsbarhet** | **LIX** istället för Flesch-Kincaid; LIX > 50 = svår, > 60 = mycket svår |

## Composite blend (oförändrat)

| Steg | Vad det gör |
|------|-------------|
| **Pattern detection** | Alla 29 detektorer + svenska packs |
| **Density** | Vägda träffar per 100 ord på logaritmisk kurva (ingen runaway) |
| **Breadth bonus** | Antal unika pattern-typer (max +20) |
| **Category diversity** | Träffar i content / language / style / communication / filler (max +15) |
| **Statistical uniformity** | Burstighet, TTR, n-gram-repetition, meningslängd-CoV (max 100) |
| **Composite blend** | Pattern × 0.7 + Uniformity × 0.3 = slutscore |

Resultat: med svenska packs aktiverade träffar ett typiskt syntetiskt AI-prov **6-8 olika pattern-typer** över tre kategorier (content/language/communication), vilket ger fullt breadth + category-bonus utöver den höga Pattern 7-densiteten. Se [`reports/calibration-sv-latest.json`](../../../reports/calibration-sv-latest.json) för aktuella mätvärden.
