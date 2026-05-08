#!/usr/bin/env node
/**
 * generate-sv-llm-corpus.mjs — Optional Swedish LLM outputs for richer log-odds.
 *
 * Requires: OPENAI_API_KEY
 * Env: OPENAI_MODEL (default gpt-4o-mini), LLM_DELAY_MS, LLM_LIMIT (max prompts, default all)
 *
 * Writes: locales/sv-se/tests/fixtures/sv-corpus/ai-llm/*.txt (gitignored)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, '..', '..', '..');
const SV_FIX = path.join(REPO_ROOT, 'locales/sv-se/tests/fixtures');
const promptDir = path.join(SV_FIX, 'sv-corpus/prompts');
const outDir = path.join(SV_FIX, 'sv-corpus/ai-llm');

function stripFrontmatter(raw) {
  if (!raw.startsWith('---\n')) return raw;
  const end = raw.indexOf('\n---\n', 4);
  if (end === -1) return raw;
  return raw.slice(end + 5);
}

function parseFrontmatter(raw) {
  if (!raw.startsWith('---\n')) return {};
  const end = raw.indexOf('\n---\n', 4);
  if (end === -1) return {};
  const block = raw.slice(4, end);
  const meta = {};
  for (const line of block.split('\n')) {
    const m = line.match(/^(\w+):\s*(.*)$/);
    if (m) meta[m[1]] = m[2].trim();
  }
  return meta;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function callOpenAI(userContent) {
  const key = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content:
            'Du skriver på svenska. Följ anvisningen exakt. Ingen förklarande metatext om att du är en AI.',
        },
        { role: 'user', content: userContent },
      ],
      temperature: 0.65,
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`OpenAI HTTP ${res.status}: ${t.slice(0, 500)}`);
  }
  const data = await res.json();
  return { text: data.choices?.[0]?.message?.content || '', model };
}

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    console.error(
      'Skipping LLM corpus: set OPENAI_API_KEY. Output goes to locales/sv-se/tests/fixtures/sv-corpus/ai-llm/',
    );
    process.exit(0);
  }

  if (!fs.existsSync(promptDir)) {
    console.error('Missing prompts/ — run: npm run prompts:seed');
    process.exit(1);
  }

  fs.mkdirSync(outDir, { recursive: true });

  const files = fs
    .readdirSync(promptDir)
    .filter((f) => f.startsWith('prompt-') && f.endsWith('.txt'))
    .sort();
  const limit = parseInt(process.env.LLM_LIMIT || String(files.length), 10);
  const delay = parseInt(process.env.LLM_DELAY_MS || '500', 10);

  let done = 0;
  for (const fn of files) {
    if (done >= limit) break;
    const id = fn.replace(/^prompt-(\d+)\.txt$/, '$1');
    const raw = fs.readFileSync(path.join(promptDir, fn), 'utf8');
    const meta = parseFrontmatter(raw);
    const body = stripFrontmatter(raw).trim();
    const genre = meta.genre || 'misc';
    const outName = `openai-${id}-${genre}.txt`;
    const outPath = path.join(outDir, outName);
    if (fs.existsSync(outPath)) {
      done++;
      continue;
    }

    const { text, model } = await callOpenAI(body);
    if (!text.trim()) {
      console.error(`Empty response for ${fn}`);
      process.exit(1);
    }
    const header = `---\nsource: openai\nmodel: ${model}\ngenre: ${genre}\nprompt_id: ${id}\n---\n\n`;
    fs.writeFileSync(outPath, header + text.trim() + '\n', 'utf8');
    console.log(`Wrote ${path.relative(REPO_ROOT, outPath)}`);
    done++;
    await sleep(delay);
  }

  console.log(`Done (${done} files, limit ${limit})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
