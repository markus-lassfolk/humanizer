#!/usr/bin/env node
/**
 * fetch-human-baseline.mjs — Crawl public pages into a local human-prose corpus.
 *
 * Usage: node fetch-human-baseline.mjs <config.json> <outDir>
 * config: [{ "name": "certse", "lang": "sv", "seeds": [url], "link": "regex", "max": 40 }]
 *
 * The output is for local analysis only. Do not commit it: the source texts keep
 * their publishers' licences. Commit scripts and summary statistics only.
 */
import fs from 'fs';
import path from 'path';

const [cfgPath, outDir] = process.argv.slice(2);
if (!cfgPath || !outDir) {
  console.error('usage: fetch-human-baseline.mjs <config.json> <outDir>');
  process.exit(2);
}
const UA = 'Mozilla/5.0 (humanizer-baseline-research)';

async function get(url) {
  try {
    const res = await fetch(url, {
      headers: { 'user-agent': UA },
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok || !/html|xml/.test(res.headers.get('content-type') || '')) return null;
    return await res.text();
  } catch {
    return null;
  }
}

const ENT = {
  '&nbsp;': ' ',
  '&amp;': '&',
  '&quot;': '"',
  '&#39;': "'",
  '&lt;': '<',
  '&gt;': '>',
  '&aring;': 'å',
  '&auml;': 'ä',
  '&ouml;': 'ö',
};

export function htmlToText(html) {
  let h = html.replace(
    /<(script|style|nav|header|footer|aside|form|noscript|svg)\b[\s\S]*?<\/\1>/gi,
    ' ',
  );
  const m = h.match(/<(main|article)\b[\s\S]*?<\/\1>/i);
  if (m) h = m[0];
  const paras = [...h.matchAll(/<(p|li|h[1-4])\b[^>]*>([\s\S]*?)<\/\1>/gi)]
    .map((x) =>
      x[2]
        .replace(/<[^>]+>/g, ' ')
        .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
        .replace(/&[a-z]+;|&#39;/gi, (e) => ENT[e.toLowerCase()] ?? ' ')
        .replace(/\s+/g, ' ')
        .trim(),
    )
    .filter((p) => p.length >= 40);
  return paras.join('\n\n');
}

function links(html, base, rx) {
  const out = new Set();
  for (const m of html.matchAll(/href="([^"#]+)"|<(?:link|loc)>([^<#]+)</g)) {
    try {
      const u = new URL((m[1] ?? m[2]).replace(/&amp;/g, '&'), base).href;
      if (rx.test(u)) out.add(u);
    } catch {
      /* skip bad href */
    }
  }
  return [...out];
}

const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
for (const src of cfg) {
  const rx = new RegExp(src.link);
  const dir = path.join(outDir, src.lang);
  fs.mkdirSync(dir, { recursive: true });
  const queue = [...src.seeds];
  const seen = new Set(queue);
  let saved = 0;
  while (queue.length && saved < src.max) {
    const url = queue.shift();
    const html = await get(url);
    if (!html) continue;
    for (const l of links(html, url, rx)) if (!seen.has(l)) (seen.add(l), queue.push(l));
    const text = htmlToText(html);
    if (text.split(/\s+/).length < (src.minWords ?? 150)) continue;
    fs.writeFileSync(
      path.join(dir, `${src.name}-${String(++saved).padStart(3, '0')}.txt`),
      `${url}\n\n${text}\n`,
    );
  }
  console.log(`${src.name} (${src.lang}): ${saved} texts`);
}
