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
    console.log('OPENAI_API_KEY not set; skipping optional EN LLM corpus generation.');
    return;
  }
  fs.mkdirSync(outDir, { recursive: true });
  console.log('EN LLM corpus generation is not implemented in this split PR; no files generated.');
}

main();
