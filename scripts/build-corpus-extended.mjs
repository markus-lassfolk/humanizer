#!/usr/bin/env node
/**
 * build-corpus-extended.mjs — Optional fetch of Swedish text for research.
 *
 * - Wikipedia Swedish recent pages (API) — small sample when online
 * - Writes to tests/fixtures/sv-corpus-extended/ (gitignored)
 *
 * Usage: node scripts/build-corpus-extended.mjs
 * Env:   WIKI_LIMIT=200 (default 80) max articles to pull
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const outDir = path.join(root, 'tests/fixtures/sv-corpus-extended');

function get(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { 'user-agent': 'humanizer-corpus-script/1.0' } }, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          get(res.headers.location).then(resolve).catch(reject);
          return;
        }
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => resolve(data));
      })
      .on('error', reject);
  });
}

async function main() {
  const limit = Math.min(500, Math.max(10, parseInt(process.env.WIKI_LIMIT || '80', 10)));
  fs.mkdirSync(outDir, { recursive: true });

  try {
    const listUrl = `https://sv.wikipedia.org/w/api.php?action=query&format=json&list=random&rnnamespace=0&rnlimit=${limit}`;
    const listJson = await get(listUrl);
    const titles = JSON.parse(listJson).query?.random?.map((x) => x.title) || [];
    if (titles.length === 0) {
      console.warn('No titles from Wikipedia; network may be blocked.');
      return;
    }

    let i = 0;
    for (const title of titles) {
      const extractUrl = `https://sv.wikipedia.org/w/api.php?action=query&format=json&prop=extracts&explaintext=1&titles=${encodeURIComponent(title)}`;
      const ex = await get(extractUrl);
      const pages = JSON.parse(ex).query?.pages || {};
      const page = Object.values(pages)[0];
      const text = page?.extract || '';
      if (text.length < 200) continue;
      const fname = `wiki-${String(++i).padStart(4, '0')}.txt`;
      fs.writeFileSync(
        path.join(outDir, fname),
        `# ${title}\n# Source: Swedish Wikipedia (CC BY-SA). Attribution: https://sv.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}\n\n${text.slice(0, 12000)}`,
        'utf8',
      );
    }
    console.log(`Wrote ${i} article extracts to ${path.relative(root, outDir)}`);
  } catch (e) {
    console.warn('build-corpus-extended failed (offline or API error):', e.message);
    process.exitCode = 0;
  }
}

main();
