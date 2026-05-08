#!/usr/bin/env node
/**
 * build-corpus-extended.mjs — Optional fetch of Swedish text for research.
 *
 * - Wikipedia Swedish (MediaWiki API) — respects rate limits / User-Agent policy
 * - Writes to tests/fixtures/sv-corpus-extended/ (gitignored)
 *
 * Usage: node scripts/build-corpus-extended.mjs
 * Env:
 *   WIKI_LIMIT=80   — max articles to pull (default 80)
 *   WIKI_DELAY_MS=400 — pause between API calls (default 400)
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const outDir = path.join(root, 'tests/fixtures/sv-corpus-extended');

/** Wikimedia requires a descriptive User-Agent with contact URL. */
const USER_AGENT =
  process.env.WIKI_USER_AGENT ||
  'HumanizerCorpus/1.0 (https://github.com/markus-lassfolk/humanizer; corpus build)';

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function get(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        headers: {
          'user-agent': USER_AGENT,
          accept: 'application/json',
        },
      },
      (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          const loc = res.headers.location;
          if (!loc) {
            reject(new Error(`Redirect without Location (${res.statusCode})`));
            return;
          }
          const next = loc.startsWith('http') ? loc : new URL(loc, url).href;
          get(next).then(resolve).catch(reject);
          return;
        }
        if (res.statusCode === 429) {
          const ra = parseInt(res.headers['retry-after'] || '10', 10);
          res.resume();
          reject(new Error(`HTTP 429 — retry after ${ra}s`));
          return;
        }
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => resolve({ status: res.statusCode, body: data }));
      },
    );
    req.on('error', reject);
  });
}

async function fetchJson(url) {
  const { status, body } = await get(url);
  if (status !== 200) {
    throw new Error(`HTTP ${status}: ${body.slice(0, 120)}`);
  }
  try {
    return JSON.parse(body);
  } catch {
    throw new Error(`Non-JSON response: ${body.slice(0, 200)}`);
  }
}

async function main() {
  const limit = Math.min(500, Math.max(10, parseInt(process.env.WIKI_LIMIT || '80', 10)));
  const delayMs = Math.max(0, parseInt(process.env.WIKI_DELAY_MS || '400', 10));
  fs.mkdirSync(outDir, { recursive: true });

  try {
    const listUrl = `https://sv.wikipedia.org/w/api.php?action=query&format=json&list=random&rnnamespace=0&rnlimit=${limit}`;
    const listData = await fetchJson(listUrl);
    await sleep(delayMs);
    const titles = listData.query?.random?.map((x) => x.title) || [];
    if (titles.length === 0) {
      console.warn('No titles from Wikipedia; check API response.');
      return;
    }

    let i = 0;
    for (const title of titles) {
      const extractUrl = `https://sv.wikipedia.org/w/api.php?action=query&format=json&prop=extracts&explaintext=1&titles=${encodeURIComponent(title)}`;
      let ex;
      try {
        ex = await fetchJson(extractUrl);
      } catch (e) {
        console.warn(`Skip "${title}": ${e.message}`);
        await sleep(delayMs);
        continue;
      }
      await sleep(delayMs);
      const pages = ex.query?.pages || {};
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
    console.warn('build-corpus-extended failed:', e.message);
    process.exitCode = 1;
  }
}

main();
