#!/usr/bin/env node
/**
 * Fetch random en.wikipedia.org extracts into locales/en-en/data/wiki-human/
 * (current API — NOT a pre-2023 corpus; see data/wiki-human/README.md).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '..', 'data', 'wiki-human');
const API = 'https://en.wikipedia.org/w/api.php';

const UA = 'HumanizerWikiSampler/1.0 (https://github.com/markus-lassfolk/humanizer; research corpus)';

async function fetchJson(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function randomTitles(n) {
  const url = `${API}?action=query&format=json&list=random&rnnamespace=0&rnlimit=${n}`;
  const data = await fetchJson(url);
  return (data.query?.random || []).map((r) => r.title);
}

async function extractPlain(title) {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    titles: title,
    prop: 'extracts',
    explaintext: '1',
    exsectionformat: 'plain',
  });
  const data = await fetchJson(`${API}?${params}`);
  const pages = data.query?.pages || {};
  const p = Object.values(pages)[0];
  if (!p || p.missing) return null;
  return p.extract || null;
}

function slug(s) {
  return s
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 80);
}

async function main() {
  const n = Math.min(200, Math.max(1, parseInt(process.argv[2] || '25', 10)));
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const titles = await randomTitles(n);
  let wrote = 0;
  for (const title of titles) {
    try {
      const text = await extractPlain(title);
      await new Promise((r) => setTimeout(r, 150));
      if (!text || text.length < 400) continue;
      const cap = 12000;
      const body = text.length > cap ? `${text.slice(0, cap)}\n\n[truncated]` : text;
      const name = `wiki-api-${slug(title) || 'page'}-${wrote}.txt`;
      fs.writeFileSync(path.join(OUT_DIR, name), `# ${title}\n\n${body}`, 'utf8');
      wrote++;
    } catch (e) {
      console.error(title, e.message);
    }
  }
  console.error(`Wrote ${wrote} files to ${OUT_DIR}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
