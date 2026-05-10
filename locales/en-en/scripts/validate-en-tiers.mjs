#!/usr/bin/env node
/**
 * Fail if a Tier 1 *unigram* is ultra-common in the human English baseline.
 * Env: EN_TIER_FREQ_MAX_RANK (default 8000)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, '..', '..', '..');
const EN_REF = path.join(REPO_ROOT, 'locales/en-en/references');

const require = createRequire(import.meta.url);
const en = require(path.join(REPO_ROOT, 'src/locales/en/index.js'));

function flattenTier(arr) {
  return arr.map((x) => (typeof x === 'string' ? x : x.word)).filter(Boolean);
}

function main() {
  const maxRankRaw = process.env.EN_TIER_FREQ_MAX_RANK;
  const maxRank = maxRankRaw === undefined ? 8000 : parseInt(maxRankRaw, 10);
  if (!Number.isFinite(maxRank) || Number.isNaN(maxRank) || maxRank <= 0) {
    console.error(
      `EN_TIER_FREQ_MAX_RANK must be a positive integer; got ${JSON.stringify(maxRankRaw)}.`,
    );
    process.exit(1);
  }
  const ranksPath = path.join(EN_REF, 'en-human-frequency-ranks.json');
  if (!fs.existsSync(ranksPath)) {
    console.error(`Missing ${path.relative(REPO_ROOT, ranksPath)} — run: npm run freq:baseline-en`);
    process.exit(1);
  }
  const data = JSON.parse(fs.readFileSync(ranksPath, 'utf8'));
  const ranks = data.ranks || data;
  const overridesPath = path.join(EN_REF, 'en-tier-overrides.json');
  const overrides = fs.existsSync(overridesPath)
    ? JSON.parse(fs.readFileSync(overridesPath, 'utf8'))
    : {};
  const ignore = new Set((overrides.ignoreFrequencyRank || []).map((w) => String(w).toLowerCase()));

  const tier1 = flattenTier(en.tier1);
  const unigrams = tier1.filter((w) => !/\s/.test(String(w).trim()));

  const violations = [];
  for (const w of unigrams) {
    const low = String(w).toLowerCase();
    if (ignore.has(low)) continue;
    const entry = ranks[low];
    if (!entry || typeof entry.rank !== 'number') continue;
    if (entry.rank <= maxRank) violations.push({ word: w, rank: entry.rank, count: entry.count });
  }

  if (violations.length > 0) {
    console.error(
      `Tier 1 unigrams in top ${maxRank} of human baseline (demote or add to locales/en-en/references/en-tier-overrides.json):`,
    );
    for (const v of violations) console.error(`  - ${v.word} (rank ${v.rank}, count ${v.count})`);
    process.exit(1);
  }
  console.log(
    `validate-en-tiers: OK (${unigrams.length} Tier 1 unigrams checked, maxRank=${maxRank})`,
  );
}

main();
