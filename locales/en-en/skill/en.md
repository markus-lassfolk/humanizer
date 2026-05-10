# Humanizer — English locale (`en`, `en-en`)

Default locale. Use when the input text is English (or when no `--locale` / `HUMANIZER_LOCALE` is set).

## Vocabulary + empirical layers

- **Tier 1 (Dead giveaways):** delve, tapestry, vibrant, crucial, comprehensive, meticulous, embark, robust, seamless, groundbreaking, leverage, synergy, transformative, paramount, multifaceted, myriad, cornerstone, reimagine, empower, catalyst, invaluable, bustling, nestled, realm, unpack, deep dive, actionable, impactful, learnings, bandwidth, net-net, value-add, thought leader *(plus weighted tiers from `en-frequencies.json` / codegen)*
- **Tier 2 (Suspicious in density):** furthermore, moreover, paradigm, holistic, utilize, facilitate, nuanced, illuminate, encompasses, catalyze, proactive, ubiquitous, quintessential, cadence, best practices
- **Phrases:** hand list + **prescriptive TSV merge** (`npm run locale:prescriptive-en`) — hundreds of fixed multi-word flags
- **Pattern 7 extras:** `empiricalExtra` from **`locales/en-en/references/en-frequencies.json`** (rebuild: `npm run corpus:logodds-en`)
- **New detectors (30–35):** passive clusters, `-ly` adverb density, weasel words, clichés, redundancy; **35** only with **`--strict`**
- **Optional LM:** **`--with-lm`** bumps uniformity using local **`en-ngram-lm.json`** (see `docs/CLI.md` / `ENGLISH-EXTENSION.md`)

## Phrase swaps (cut the fat)

- "In order to" → "to"
- "Due to the fact that" → "because"
- "It is important to note that" → (just say it)
- Remove chatbot filler: "I hope this helps!", "Great question!"

## Before/after example

**Before (AI-sounding):**
> Great question! Here is an overview of sustainable energy. Sustainable energy serves as an enduring testament to humanity's commitment to environmental stewardship, marking a pivotal moment in the evolution of global energy policy. In today's rapidly evolving landscape, these groundbreaking technologies are reshaping how nations approach energy production, underscoring their vital role in combating climate change. The future looks bright. I hope this helps!

**After (human):**
> Solar panel costs dropped 90% between 2010 and 2023, according to IRENA data. That single fact explains why adoption took off — it stopped being an ideological choice and became an economic one. Germany gets 46% of its electricity from renewables now. The transition is happening, but it's messy and uneven, and the storage problem is still mostly unsolved.

## CLI (English / default)

```bash
# Implicit locale en — same as omitting --locale
node src/cli.js analyze -f draft.md
node src/cli.js humanize --autofix -f article.txt
```

Explicit locale:

```bash
node src/cli.js analyze --locale en -f draft.md
node src/cli.js analyze --locale en --strict --with-lm -f draft.md
HUMANIZER_LOCALE=en node src/cli.js score article.txt
```

Full maintainer docs: [`docs/ENGLISH-EXTENSION.md`](../docs/ENGLISH-EXTENSION.md), pattern walk-through [`references/patterns-en.md`](../references/patterns-en.md).
