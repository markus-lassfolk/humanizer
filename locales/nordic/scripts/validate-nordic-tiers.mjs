#!/usr/bin/env node
/**
 * validate-nordic-tiers.mjs — fail if a nb/da Tier 1 unigram is also in the top N of the
 * pre-2022 human frequency ranks (words real writers use freely are not AI tells).
 * Usage: node validate-nordic-tiers.mjs   (env NORDIC_TIER_FREQ_MAX_RANK, default 5000)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const maxRank = parseInt(process.env.NORDIC_TIER_FREQ_MAX_RANK || '5000', 10);
const REF = {
  nb: 'nb-no/references/nb-human-frequency-ranks.json',
  da: 'da-dk/references/da-human-frequency-ranks.json',
};

let bad = 0;
for (const lang of ['nb', 'da']) {
  const { ranks } = JSON.parse(fs.readFileSync(path.join(root, 'locales', REF[lang]), 'utf8'));
  const loc = require(path.join(root, `src/locales/${lang}/index.js`));
  const words = loc.tier1
    .map((x) => (typeof x === 'string' ? x : x.word))
    .filter((w) => w && !/\s/.test(w));
  const hits = words.filter((w) => ranks[w.toLowerCase()]?.rank <= maxRank);
  for (const w of hits)
    console.error(`${lang}: Tier 1 "${w}" is rank ${ranks[w.toLowerCase()].rank} in human text`);
  bad += hits.length;
  console.log(
    `validate-nordic-tiers ${lang}: ${words.length} Tier 1 unigrams, ${hits.length} too common (maxRank=${maxRank})`,
  );
}
process.exit(bad ? 1 : 0);
