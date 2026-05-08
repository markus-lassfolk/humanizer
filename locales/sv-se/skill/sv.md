# Humanizer — Swedish locale (`sv`)

When input text is in Swedish, use `locale: "sv"` (or `--locale sv` on the CLI, or `HUMANIZER_LOCALE=sv`). Apply this file together with the main Humanizer skill.

## What `sv` activates

- **Swedish AI vocabulary** — loan-translated LLM clichés (fördjupa sig i, sömlös, banbrytande, transformativ, mångfacetterad, ekosystem), Swenglish (best practices, stakeholders, learnings, pain points, alignment), consultant compounds (helhetslösning, kundresa, värdeskapande), and density-gated Tier 2/3 lists (see [swedish-ai-vocabulary.md](../references/swedish-ai-vocabulary.md))
- **Formulaic phrases & bureaucratese** — regex-detected Swedish openers, chatbot/sycophancy strings, plus **TSV-driven** Svarta listan / Klarspråk phrases and autofixes (`npm run locale:prescriptive` → `src/locales/generated/sv-prescriptive.js`; see [svarta-listan.md](../references/svarta-listan.md))
- **Empirical data** — bundled `locales/sv-se/references/sv-frequencies.json` + `locales/sv-se/references/empirical-sv-tiers.md`: (1) **weights** on curated tier words when keys match, (2) **`empiricalExtra`** multi-word n-grams scored automatically in Pattern 7 (excludes unigrams; see `src/locales/sv-empirical-filter.js`). Log-odds can include **4-grams** and optional `locales/sv-se/tests/fixtures/sv-corpus/ai-llm/`. Rebuild with `npm run corpus:logodds` or `npm run corpus:refresh`.
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
