#!/usr/bin/env node
/**
 * Generate English calibration corpus: 50 human + 50 AI under tests/fixtures/en-corpus/
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, '..', '..', '..');
const FIX = path.join(REPO_ROOT, 'tests/fixtures/en-corpus');
const outHuman = path.join(FIX, 'human');
const outAi = path.join(FIX, 'ai');

const genres = ['news', 'opinion', 'fiction', 'technical', 'casual', 'marketing', 'academic'];

const humanBodies = {
  news: (i) =>
    `The town closed the pool in February after a filter leak. Repairs cost $18,000 and took eleven days. Attendance dropped by a quarter during the closure but returned within three weeks. The manager says they switched suppliers for spare parts.\nUpdate ${i}.`,
  opinion: (i) =>
    `The bus fare hike was expected but poorly explained. Officials cited fuel costs without showing how much went to maintenance versus operations. I still ride, but I vote differently than I did five years ago.\nLetter ${i}.`,
  fiction: (i) =>
    `She set the mug on the railing and watched the creek move slower than yesterday. Someone had left a bike under the bridge; no lock. She meant to call the city but remembered it was Saturday. Instead she wrote her neighbor a note about the fan noise.\nScene ${i}.`,
  technical: (i) =>
    `The job queue accepted duplicate messages with the same id. We added a unique key and rolled back 140 rows that collided. Deploy was at 22:14 and monitoring showed no new duplicates in the following six hours.\nNotes ${i}.`,
  casual: (i) =>
    `We were supposed to meet at the platform but the train was late, so we sat on the bench and ate the dry cookies. Maya talked about her interview and leaving her jacket in the elevator. I laughed loud and an older man looked over, then smiled.\nThread ${i}.`,
  marketing: (i) =>
    `Store hours: 9 a.m.–7 p.m. weekdays, 10–6 Saturday. Returns within 14 days with receipt. Shoe sizes 6–12 in stock; wide widths in section B. Parking behind the building, first hour free.\nFlyer ${i}.`,
  academic: (i) =>
    `The sample includes 38 interviews with teachers at three schools. Transcripts were coded thematically per chapter 3. Three quotes were removed for privacy. Section 5 reports results without prescribing school policy.\nMethod note ${i}.`,
};

const aiOpeners = [
  "In today's rapidly evolving digital landscape",
  'In an increasingly complex market',
  'In the modern interconnected world',
];

const aiMiddles = [
  () =>
    `it is important to note that organizations must delve into seamless integration and groundbreaking innovation. It is not merely about technology — it is about a holistic perspective and a transformative ecosystem that unlocks potential.`,
  () =>
    `By combining robust frameworks, proactive strategies, and value-creating processes, we can harness synergies among stakeholders. Best practices and key takeaways underscore the importance of alignment and moving the needle.`,
  () =>
    `Let us unpack how the end-to-end solution can be future-proofed through core competencies and a customer journey that reflects the organizational mindset. Without further ado, it is worth noting that the insights are multifaceted and pivotal.`,
];

const aiClosers = [
  () =>
    `In conclusion, the future looks bright for those who take a holistic approach. I hope this helps!`,
  () =>
    `That is an excellent question — feel free to leverage the opportunity to optimize the value chain. Great question!`,
  () =>
    `Thank you for this insightful query. We should utilize resilient structures and transformative catalysts. Let me know if you need anything else.`,
];

function buildAiText(genre, index) {
  const op = aiOpeners[index % aiOpeners.length];
  const mid = aiMiddles[index % aiMiddles.length]();
  const cl = aiClosers[index % aiClosers.length]();
  const structural =
    index % 3 === 0
      ? `\n\n## Overview\n\n- **Speed:** The process has been revolutionized — the outcome is groundbreaking.\n- **Quality:** Innovation, excellence, and quality drive us forward.\n`
      : index % 3 === 1
        ? `\n\nIt is not just a change — it is a transformation that showcases commitment, vision, and hope for the future.\n`
        : '';
  return `${op}, it is crucial that we navigate the complexities within ${genre}. ${mid}\n\n${cl}${structural}\n(Document ${index}, AI template.)`;
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
  fs.writeFileSync(
    path.join(outHuman, 'human-misc-01.txt'),
    'Dad left the keys in the freezer again. We borrowed the neighbor’s ladder and fished them through the window. Nobody got hurt but the cat stayed mad for three hours.\n',
    'utf8',
  );
  fs.writeFileSync(path.join(outAi, 'ai-misc-01.txt'), buildAiText('misc', 50), 'utf8');

  console.log(`Wrote 50 files to ${path.relative(REPO_ROOT, outHuman)}`);
  console.log(`Wrote 50 files to ${path.relative(REPO_ROOT, outAi)}`);
}

main();
