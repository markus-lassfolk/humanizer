#!/usr/bin/env node
/**
 * seed-sv-corpus.mjs — Generate Swedish gold corpus for calibration (60 human + 60 AI).
 * Human class: original plain Swedish without deliberate AI markers.
 * AI class: synthetic text rich in Swedish AI vocabulary patterns.
 * Includes marketing genre (10 + 10) plus existing genres.
 *
 * Run from repo root: node locales/sv-se/scripts/seed-sv-corpus.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, '..', '..', '..');
const SV_FIX = path.join(REPO_ROOT, 'locales/sv-se/tests/fixtures');
const outHuman = path.join(SV_FIX, 'sv-corpus/human');
const outAi = path.join(SV_FIX, 'sv-corpus/ai');

const genres = ['news', 'opinion', 'fiction', 'technical', 'casual', 'government', 'academic'];

/** Original Swedish, human register — no consultant clichés. */
const humanBodies = {
  news: (i) =>
    `Kommunen stängde badhuset i februari efter ett läckage i filtret. Reparationen kostade 180 000 kronor och tog elva dagar. Besökarantalet sjönk med en fjärdedel under stängningen men var tillbaka på samma nivå inom tre veckor efter öppning. Verksamhetschefen säger att de bytt leverantör av reservdelar.\nVariant ${i}: fler kontroller görs nu varje måndag.`,
  opinion: (i) =>
    `Jag tycker höjningen av tunnelbanepriset var väntad men dåligt förklarad. Politikerna pekade på energikostnader utan att visa hur slaget fördelades mellan drift och underhåll. Jag åker fortfarande, men jag röstar inte på samma sätt som för fem år sedan.\nInsändare ${i}, undertecknad läsare.`,
  fiction: (i) =>
    `Hon ställde kaffemuggen på räcket och såg hur vattnet i ån rörde sig långsammare än i går. Någon hade lagt en cykel under bron; ingen lås. Hon tänkte ringa kommunen men kom på att det var lördag. Istället gick hon hem och skrev ett kort till grannen om ljudet från fläkten.\nAvsnitt ${i}.`,
  technical: (i) =>
    `Felet uppstod när jobbkön fick dubbla meddelanden med samma id. Vi lade in en unik nyckel i databasen och backade de 140 poster som krockat. Deploy skedde 22:14 och övervakningen visade inga nya dubbletter under de följande sex timmarna.\nReleaseanteckning ${i}.`,
  casual: (i) =>
    `Vi skulle träffas vid spåret men tåget var försenat så vi satte oss på bänken och åt de där torra kakorna. Maja berättade om jobbintervjun och att hon glömde jackan i hissen. Jag skrattade högt och en äldre man tittade men log sedan.\nSms-tråd ${i}, sammanställd.`,
  government: (i) =>
    `Nämnden beslutade att upphandlingen ska annonseras senast den 12 juni. Ansökningar prövas mot de kriterier som framgår av bilaga 2. Ett informationsmöte hålls den 3 juni klockan 14 i stadshuset, sal B. Handlingarna finns på kommunens webbplats under rubriken Upphandling.\nDiarienummer ${i}.`,
  academic: (i) =>
    `Materialet består av 38 intervjuer med lärare i tre skolor. Transkriptionen kodades tematiskt enligt metodbeskrivningen i kapitel 3. Tre citat har strukits av integritetsskäl. Resultatredogörelsen följer i avsnitt 5 utan normativa slutsatser om skolform.\nMetodnot ${i}.`,
  marketing: (i) =>
    `Välkommen till skördefesten på torget lördag 14 september kl. 11–15. Lokala odlare säljer äpplen, potatis och honung. Barnen kan måla pumpor mot en symbolisk avgift; intäkten går till skolbiblioteket. Toaletter finns i kulturhuset bredvid. Vid regn flyttas delar av marknaden in i saluhallen.\nEvenemangstext ${i}, kommunens kulturnämnd.`,
};

const aiOpeners = [
  'I dagens snabbt föränderliga digitala landskap',
  'I en alltmer komplex marknad',
  'I dagens moderna värld',
];

const adverbPad =
  ' Uppenbarligen naturligtvis självklart är det uppenbart att vi troligen antagligen förmodligen möjligen eventuellt successivt och uppenbarligen måste agera konsekvent.';

const aiMiddles = [
  () =>
    `det är viktigt att notera att organisationen behöver fördjupa sig i sömlös integration och banbrytande innovation. Det handlar inte bara om teknik, utan också om ett holistiskt perspektiv och ett transformativt ekosystem. Beslutet hanteras centralt och leveransen säkerställs genom att processen genomförs stegvis. Uppenbarligen menar flera experter att studier visar att lösningen är banbrytande. Vi anger PIN-kod kod och kontrollerar ATM-maskin i samma leverans.${adverbPad}`,
  () =>
    `Genom att kombinera robusta ramverk, proaktiva strategier och värdeskapande processer kan vi möjliggöra synergier mellan stakeholders. Best practices och key takeaways understryker vikten av alignment. Arbetet utreds av teamet och resultaten implementeras när förändringen drivs av ledningen. Naturligtvis är det allmänt känt att branschen är överens om paradigmskiftet. Det är en kort sammanfattning av slutresultatet som är helt unikt.${adverbPad}`,
  () =>
    `Låt oss dyka ner i hur helhetslösningen kan framtidssäkras genom kärnkompetenser och en kundresa som speglar organisationens mindset. Utan vidare omsvep är det värt att nämna att insikterna är mångfacetterade. Uppenbarligen, naturligtvis och självklart är det uppenbart att vi måste agera snabbt och tydligt när utmaningarna hanteras proaktivt och strategin genomförs konsekvent. Många anser att det i stort sett är självklart att innovationen är transformativ och banbrytande.${adverbPad}`,
];

const aiClosers = [
  () =>
    `Sammanfattningsvis kan man säga att framtiden ser ljus ut för dem som tar ett holistiskt grepp. Hoppas att detta hjälper!`,
  () =>
    `Det är en utmärkt fråga — nyttja gärna möjligheten att optimera värdekedjan. Bra fråga!`,
  () =>
    `Tack för en intressant frågeställning. Vi bör nyttja resilienta strukturer och transformativa katalysatorer. Hör gärna av dig.`,
];

function buildAiText(genre, index) {
  const op = aiOpeners[index % aiOpeners.length];
  const mid = aiMiddles[index % aiMiddles.length]();
  const cl = aiClosers[index % aiClosers.length]();
  const structural =
    index % 3 === 0
      ? `\n\n## Översikt\n\n- **Hastighet:** Processen har revolutionerats — resultatet är banbrytande.\n- **Kvalitet:** Innovation, excellens och kvalitet driver oss framåt.\n`
      : index % 3 === 1
        ? `\n\nDet är inte bara en förändring — det är en transformation som visar på engagemang, vision och framtidstro.\n`
        : '';
  return `${op} är det avgörande att vi navigerar komplexiteten inom ${genre}. ${mid}\n\n${cl}${structural}\n(Dokument ${index}, AI-mall.)`;
}

function ensureDir(d) {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

function main() {
  ensureDir(outHuman);
  ensureDir(outAi);

  let n = 0;
  for (const g of genres) {
    for (let i = 1; i <= 7; i++) {
      n++;
      const name = `human-${g}-${String(i).padStart(2, '0')}.txt`;
      fs.writeFileSync(path.join(outHuman, name), humanBodies[g](i), 'utf8');
      const aiName = `ai-${g}-${String(i).padStart(2, '0')}.txt`;
      fs.writeFileSync(path.join(outAi, aiName), buildAiText(g, n), 'utf8');
    }
  }
  // 49 files — add one more pair for round 50
  fs.writeFileSync(
    path.join(outHuman, 'human-misc-50.txt'),
    'Pappa glömde nyckeln i frysen igen. Vi fick låna grannens stege och hämta den genom fönstret. Ingen skadades men katten blev arg i tre timmar.\n',
    'utf8',
  );
  fs.writeFileSync(path.join(outAi, 'ai-misc-50.txt'), buildAiText('misc', 50), 'utf8');

  for (let i = 1; i <= 10; i++) {
    const id = String(i).padStart(2, '0');
    fs.writeFileSync(
      path.join(outHuman, `human-marketing-${id}.txt`),
      humanBodies.marketing(i),
      'utf8',
    );
    fs.writeFileSync(
      path.join(outAi, `ai-marketing-${id}.txt`),
      buildAiText('marketing', 50 + i),
      'utf8',
    );
  }

  console.log(`Wrote 60 files to ${path.relative(REPO_ROOT, outHuman)}`);
  console.log(`Wrote 60 files to ${path.relative(REPO_ROOT, outAi)}`);
}

main();
