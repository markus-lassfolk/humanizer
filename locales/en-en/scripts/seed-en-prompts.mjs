#!/usr/bin/env node
/**
 * ~200 English generation prompts under tests/fixtures/en-corpus/prompts/
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, '..', '..', '..');
const FIX = path.join(REPO_ROOT, 'tests/fixtures/en-corpus');
const outDir = path.join(FIX, 'prompts');
const genres = ['news', 'opinion', 'fiction', 'technical', 'casual', 'marketing', 'academic'];

const bodies = {
  news: (i) =>
    `Write a short news item (${i}) about a concrete local event. Avoid consultant jargon. About 120–180 words.`,
  opinion: (i) =>
    `Write an op-ed (${i}) on an everyday issue (housing, transit, or schools). Personal but factual tone. 120–180 words.`,
  fiction: (i) =>
    `Write a short prose scene (${i}) with concrete detail. No metaphor piles. 120–180 words.`,
  technical: (i) =>
    `Write a brief technical note (${i}) about a bug, deploy, or measurement. Include numbers and timestamps. No buzzwords. 120–180 words.`,
  casual: (i) =>
    `Write an informal vignette (${i}) between friends or family. 120–180 words.`,
  marketing: (i) =>
    `Write plain retail/service copy (${i}): hours, policy, facts. No hype adjectives. 80–140 words.`,
  academic: (i) =>
    `Write a short methods/results paragraph (${i}) for a social-science paper. Avoid hype. 120–180 words.`,
  product: (i) =>
    `Write product copy (${i}): what it does, for whom, price if relevant. Direct. 80–140 words.`,
  email: (i) =>
    `Write a short business email (${i}): clear ask or reply, minimal filler. 80–120 words.`,
  summary: (i) =>
    `Summarize a fictional decision memo (${i}) in five sentences. No “in conclusion” openers.`,
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
  while (n < 200) {
    n++;
    const genre = allGenres[(n - 1) % allGenres.length];
    const fn = `prompt-${String(n).padStart(3, '0')}.txt`;
    const bodyFn = bodies[genre] || bodies.news;
    const body = bodyFn(Math.floor((n - 1) / allGenres.length) + 1);
    const content = `---\ngenre: ${genre}\nid: ${n}\ntarget_words: 150\n---\n\n${body}\n`;
    fs.writeFileSync(path.join(outDir, fn), content, 'utf8');
    manifest.prompts.push({ file: fn, genre, id: n });
  }
  fs.writeFileSync(path.join(FIX, 'prompts-manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
  console.log(`Wrote ${n} prompts to ${path.relative(REPO_ROOT, outDir)}`);
}

main();
