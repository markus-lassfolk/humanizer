# Humanizer — Swedish locale (`sv`)

When input text is in Swedish, use `locale: "sv"` (or `--locale sv` on the CLI, or `HUMANIZER_LOCALE=sv`). Apply this file together with the main Humanizer skill.

## What `sv` activates

- **Full 29-pattern catalogue (Swedish-tuned)** — every detector in `src/patterns.js` runs with Swedish regex packs and category-tagged phrases (loan translations, Swenglish, consultant Swedish, chatbot/sycophantic/cutoff/filler/hedging/conclusion phrases, Swedish media name-dropping, *vilket/som*-bisatser, copula avoidance, rule-of-three, synonym cycling, false ranges, reasoning chain, mall-rubriker, confidence calibration, acknowledgment loops). Full per-pattern breakdown: [`patterns-sv.md`](../references/patterns-sv.md).
- **Swedish AI vocabulary** — Tier 1 (107) loan-translated LLM clichés, Tier 2 (190) suspicious-in-density words, Tier 3 (84) context-dependent words, plus 167 phrase mönster — bigger than the English bundle. See [swedish-ai-vocabulary.md](../references/swedish-ai-vocabulary.md).
- **Formulaic phrases & bureaucratese** — regex-detected Swedish openers, chatbot/sycophancy strings, plus **TSV-driven** Svarta listan / Klarspråk phrases and autofixes (`npm run locale:prescriptive` → `src/locales/generated/sv-prescriptive.js`; see [svarta-listan.md](../references/svarta-listan.md))
- **Empirical data** — bundled `locales/sv-se/references/sv-frequencies.json` + `locales/sv-se/references/empirical-sv-tiers.md`: (1) **weights** on curated tier words when keys match, (2) **`empiricalExtra`** multi-word n-grams scored automatically in Pattern 7 (excludes unigrams; see `src/locales/sv/empirical-filter.js` (shim: `sv-empirical-filter.js`)). Log-odds can include **4-grams** and optional `locales/sv-se/tests/fixtures/sv-corpus/ai-llm/`. Maintainers: **`npm run sv:pipeline`** regenerates everything and updates `references/PIPELINE-SNAPSHOT.md`; or run `npm run corpus:logodds` / `corpus:refresh` alone.
- **Frequency sanity check** — `locales/sv-se/references/sv-human-frequency-ranks.json` + `npm run validate:sv-tiers` warn if a Tier 1 **unigram** is also ultra-common in the human baseline (see [SWEDISH-EXTENSION.md](../docs/SWEDISH-EXTENSION.md)).
- **LIX readability** — Nordic LIX index instead of Flesch-Kincaid. LIX >50 = hard, >60 = very hard.
- **Swedish sentence splitting** — abbreviations: t.ex., dvs., bl.a., m.m., m.fl., s.k., fr.o.m., t.o.m., plus legal/official (SOU, prop, kap, NJA, …)
- **Swedish function words** — expanded list (även, dock, därför, således, kanske, …) for stylometrics
- **Swedish autofixes** — full mechanical table from prescriptive TSV (65+ pairs): *i syfte att* → *för att*, *erhålla* → *få*, *träder i kraft* → *börjar gälla*, *i enlighet med* → *enligt*, etc.
- **Calibration tests** — `locales/sv-se/tests/calibration.sv.regression.test.js` (and related) lock scores against `locales/sv-se/tests/fixtures/sv-corpus/` and `reports/calibration-sv-latest.json`
- **Swedish guidance strings** — style tips and guidance in Swedish in the humanizer output

## Swedish rewrite principles

When rewriting Swedish AI text:

- Prefer **active voice** and **konkreta fakta** (concrete facts: datum, siffror, namn)
- Replace LLM-Swedish with plain Swedish: "möjliggöra" → "göra möjligt", "nyttja" → "använda", "i syfte att" → "för att"
- Avoid back-translating English suggestions into Swedish — find the **Swedish-native** equivalent instead
- Do NOT produce "consultant Swedish" as a replacement — that's just AI slop in a different register

## Before/after example (Swedish)

**Before (AI-sounding Swedish):**
> I dagens snabbt föränderliga digitala landskap är det viktigt att notera att organisationer behöver fördjupa sig i de mångfacetterade utmaningarna som sömlös integration medför. Banbrytande lösningar möjliggör för företag att navigera komplexiteten på ett holistiskt sätt.

**After (natural Swedish):**
> Integration av nya system tar tid och kostar pengar. Tre av fyra projekt i vår bransch spricker på tid, enligt en Gartner-rapport från 2024. Vanligaste orsaken är att kraven ändras under projektet, inte att tekniken inte fungerar.

## CLI (Swedish)

```bash
echo "I dagens snabbt föränderliga digitala landskap..." | node src/cli.js analyze --locale sv
node src/cli.js humanize --locale sv --autofix -f text.md
HUMANIZER_LOCALE=sv node src/cli.js score article.txt
```
