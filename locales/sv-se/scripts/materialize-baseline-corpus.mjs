#!/usr/bin/env node
/**
 * One-shot helper: write locales/sv-se/references/baseline-corpus-sv.txt from varied Swedish sentences.
 * Run: node locales/sv-se/scripts/materialize-baseline-corpus.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, '..', '..', '..');
const SV_REF = path.join(REPO_ROOT, 'locales/sv-se/references');

const SENTENCES = [
  'Kommunen beslutade att renovera skolan innan höstterminen börjar.',
  'Patienten fick vänta tre timmar innan läkaren hann fram.',
  'Barnen lekte vid åkern medan föräldrarna pratade om priser på bränsle.',
  'Tåget stannade i Alvesta och många passagerare bytte till buss.',
  'Hon skrev ett kort till myndigheten och bad om prövning av ärendet.',
  'Vi lagade soppa på rotfrukter och serverade den med mörkt bröd.',
  'Biblioteket stängde tidigare på grund av strömavbrott i stadsdelen.',
  'Företaget flyttade lagret till ett mindre samhälle nära hamnen.',
  'Läraren förklarade reglerna tydligt utan onödiga omskrivningar.',
  'Snön smälte snabbt och gatorna blev blöta under fötterna.',
  'Debatten handlade om skatter, bostäder och kollektivtrafik i stan.',
  'Katten sov i fönstret medan regnet slog mot rutorna.',
  'Journalisten intervjuade boende om buller från byggarbetsplatsen.',
  'Nämnden skjuter upp beslutet tills nästa protokoll är klart.',
  'Grannen lånade stege och hjälpte till att byta takplåt.',
  'Apoteket hade slut på vissa receptbelagda läkemedel i två dagar.',
  'Musikerna repeterade i källaren innan spelningen på lördag.',
  'Cyklister klagade på halka längs strandpromenaden efter nattfrost.',
  'Skogen var tyst förutom hackspettens tickande mot en björk.',
  'Eleverna redovisade resultat i matte utan att använda fackjargong.',
  'Polisen varnade för halka på bron när temperaturen sjönk.',
  'Bonden sådde vårvete när marken äntligen torkat.',
  'Köket luktade kanel och nygräddade kakor inför kalaset.',
  'Tidningen publicerade en genomgång av kommunala avgifter.',
  'Piloten meddelade turbulens innan vi flög över fjällen.',
  'Sjukhuset anställde fler skötare för att korta kötiden.',
  'Vi hämtade ved i ladan och staplade den under tak.',
  'Domaren förklarade domen med enkla ord i salen.',
  'Fiskarna kom tidigt till hamnen med små sillfångster.',
  'Hon målade om hallen i ljusgrått och bytte listerna.',
  'Busschauffören stannade extra nära trottoarkanten för rullstolen.',
  'Föreningen ordnade loppis och sålde böcker för välgörenhet.',
  'Vinden knakade i taket men inga tegel lossnade.',
  'Programmeraren hittade felet i loggen och rullade tillbaka versionen.',
  'Morfar berättade om skolåren utan att måla upp sentimentala scener.',
  'Staden planterade träd längs cykelbanan för skugga på sommaren.',
  'Kocken skar grönsaker tunt och fräste dem i smör.',
  'Banken sänkte räntan på sparkontot och kunderna reagerade lugnt.',
  'Vi badade i sjön trots att vattnet var kallt i juni.',
  'Redaktören strök onödiga inledningar i insändaren.',
  'Barnmorskan mätte blodtryck och antecknade i journalen.',
  'Lastbilen fick motorstopp och orsakade kö på väg 40.',
  'Konstnären visade skisser utan överdrivna etiketter.',
  'Skidspåret preparerades sent på kvällen när temperaturen sjönk.',
  'Vi diskuterade matlådor, pendling och semesterplaner på jobbet.',
  'Hantverkaren bytte packningen och stängde av vattnet först.',
  'Prästen talade kort om solidaritet och praktiska insatser.',
  'Fåglarna återvände tidigt våren när snön försvann.',
  'Butiken reaade vinterkläder och skyltade med tydliga priser.',
  'Juristen sammanfattade avtalet utan kansliaktiga konstruktioner.',
  'Grävmaskinen hördes på avstånd när nya ledningar grävdes ner.',
  'Skötaren vattnade växthuset och noterade fuktigheten.',
  'Vi åt sill och potatis till midsommar utan högtidstal.',
  'Brandkåren övade räddning ur isvak med säker lina.',
  'Lantbrukaren klagade på torka men skörden blev ändå godkänd.',
  'Dottern läste högt ur en barnbok med enkla meningar.',
  'Kommunen informerade om sophämtning via sms till boende.',
  'Snickaren passade dörren och slipade listerna slätt.',
  'Vi promenerade längs ån och pratade om framtida renoveringar.',
  'Doktorn rekommenderade promenader istället för receptfria piller.',
  'Fönstret läckte i stormen och hyresvärden bytte lister.',
  'Studenter presenterade data i tabeller utan överdriven inramning.',
  'Bageriet sålde semlor en tisdag och kön ringlade ut på gatan.',
  'Vi bytte däck i garaget och kontrollerade bromsvätskan.',
  'Sjöfarten varnade för dimbankar nära öarna i skärgården.',
  'Lärarinnan skrev tydliga instruktioner på tavlan.',
  'Hunden sprang efter pinnen men haltade efter ett snedsteg.',
  'Myndigheten publicerade siffror utan att dölja osäkerheter.',
  'Vi grillade korv i parken och delade saft med grannar.',
  'Arkeologerna fann keramik och dokumenterade lagret noggrant.',
  'Sjuksköterskan tog prover och märkte rören med streckkod.',
  'Bussen var försenad men chauffören förklarade vägarbetet.',
  'Vi städade källaren och hittade kartonger från nittiotalet.',
  'Fjällstationen rapporterade om väderomslag och stark vind.',
  'Bonden levererade mjölk till mejeriet innan gryningen.',
  'Hon stickade en tröja medan radion sände nyheter om valresultat.',
  'Staden lade asfalt på cykelvägen och markerade kurvor tydligt.',
  'Fotografen justerade ljuset utan modeord i bildtexten.',
  'Vi köpte äpplen på gårdsbutiken och pressade must hemma.',
  'Elektrikern drog nya kablar och märkade säkringsskåpet.',
  'Barnen byggde snögubbe med morot och gammal hatt.',
  'Tidningen granskade upphandlingen utan spekulativa adjektiv.',
  'Vi lagade cykelkedjan och smorde växlarna med tunn olja.',
  'Skogshuggaren markerade träd som skulle gallras i vår.',
  'Sjuksköterskan förklarade biverkningar med vardagliga ord.',
  'Kommunen skyltade om tillfällig enkelriktning vid vattenskada.',
  'Vi åt frukost tidigt och hann med färjan.',
  'Domstolen publicerade domen i fulltext på webbplatsen.',
];

const lines = [];
for (let i = 0; i < 6000; i++) {
  lines.push(SENTENCES[i % SENTENCES.length]);
}

const out = path.join(SV_REF, 'baseline-corpus-sv.txt');
fs.writeFileSync(out, lines.join('\n'), 'utf8');
console.log(`Wrote ${path.relative(REPO_ROOT, out)} (${lines.length} lines)`);
