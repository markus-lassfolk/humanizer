#!/usr/bin/env node
/**
 * seed-sv-prompts.mjs — Write 230 Swedish generation prompts (YAML frontmatter + body).
 * Used by optional LLM corpus generation and to diversify synthetic seed when present.
 *
 * Run: node locales/sv-se/scripts/seed-sv-prompts.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, '..', '..', '..');
const SV_FIX = path.join(REPO_ROOT, 'locales/sv-se/tests/fixtures');
const outDir = path.join(SV_FIX, 'sv-corpus/prompts');
const genres = [
  'news',
  'opinion',
  'fiction',
  'technical',
  'casual',
  'government',
  'academic',
  'marketing',
];

const bodies = {
  news: (i) =>
    `Skriv en kort nyhetsartikel (${i}) om en konkret händelse i en svensk kommun. Undvik modeord och konsultjargong. Ca 120–180 ord.`,
  opinion: (i) =>
    `Skriv en insändare (${i}) med tydlig ståndpunkt om en vardagsfråga (bostad, trafik eller skola). Håll tonen personlig men saklig. Ca 120–180 ord.`,
  fiction: (i) =>
    `Skriv ett kort prosastycke (${i}) med scen, dialog eller inre monolog. Konkret sensorik, inga metaforhögar. Ca 120–180 ord.`,
  technical: (i) =>
    `Skriv en kort teknisk anteckning (${i}) om ett fel, en deploy eller en mätning. Siffror, tidpunkt, åtgärd — utan buzzwords. Ca 120–180 ord.`,
  casual: (i) =>
    `Skriv ett informellt stycke (${i}) som vardaglig berättelse mellan vänner eller familj. Ca 120–180 ord.`,
  government: (i) =>
    `Skriv ett neutralt myndighetstextstycke (${i}): beslut, inbjudan eller information till medborgare. Klarspråk, inga engelska modeord. Ca 120–180 ord.`,
  academic: (i) =>
    `Skriv ett kort metod-/resultatstycke (${i}) från en humanistisk eller samhällsvetenskaplig studie. Undvik hype och tomma abstraktioner. Ca 120–180 ord.`,
  marketing: (i) =>
    `Skriv en saklig men värmande text (${i}) för en kommunal evenemangssida eller välgörenhetsinsamling: datum, plats, praktisk info. Undvik genrens mest slitna superlativ. Ca 100–160 ord.`,
  product: (i) =>
    `Skriv produkttext (${i}) för en tjänst eller vara: vad den gör, för vem, pris eller villkor om relevant. Direkt, utan floskler. Ca 80–140 ord.`,
  email: (i) =>
    `Skriv ett kort affärsmejl (${i}) på svenska: tydlig begäran eller svar, utan onödig artighetsfyllnad. Ca 80–120 ord.`,
  summary: (i) =>
    `Sammanfatta ett påhittat beslut eller protokollutdrag (${i}) i fem meningar. Inga inledningsfraser som "sammanfattningsvis".`,
};

const extraGenres = ['product', 'email', 'summary'];
const allGenres = [...genres, ...extraGenres];

function ensureDir(d) {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

function main() {
  ensureDir(outDir);
  const manifest = { version: 1, prompts: [] };
  let n = 0;
  while (n < 230) {
    n++;
    const genre = allGenres[(n - 1) % allGenres.length];
    const fn = `prompt-${String(n).padStart(3, '0')}.txt`;
    const bodyFn = bodies[genre] || bodies.news;
    const body = bodyFn(Math.floor((n - 1) / allGenres.length) + 1);
    const content = `---\ngenre: ${genre}\nid: ${n}\ntarget_words: 150\n---\n\n${body}\n`;
    fs.writeFileSync(path.join(outDir, fn), content, 'utf8');
    manifest.prompts.push({ file: fn, genre, id: n });
  }
  fs.writeFileSync(
    path.join(SV_FIX, 'sv-corpus/prompts-manifest.json'),
    JSON.stringify(manifest, null, 2),
    'utf8',
  );
  console.log(`Wrote ${n} prompts to ${path.relative(REPO_ROOT, outDir)}`);
}

main();
