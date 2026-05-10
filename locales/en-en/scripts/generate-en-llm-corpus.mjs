#!/usr/bin/env node
/**
 * Optional: generate extra AI-class docs via OpenAI API (not required for CI).
 * Writes to tests/fixtures/en-corpus/ai-llm/ (gitignored by convention).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, '..', '..', '..');
const outDir = path.join(REPO_ROOT, 'tests/fixtures/en-corpus/ai-llm');

function main() {
  if (!process.env.OPENAI_API_KEY) {
    console.error('Set OPENAI_API_KEY to use generate-en-llm-corpus.mjs');
    process.exit(1);
  }
  fs.mkdirSync(outDir, { recursive: true });
  console.error('LLM corpus generation is not wired in this repo snapshot; add API calls as needed.');
  process.exit(1);
}

main();
