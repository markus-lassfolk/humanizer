# Swedish AI vocabulary — words and phrases to flag

Swedish LLM output often mixes **loan translations** from English, **consultant Swedish**, **raw Swenglish**, and **bureaucratic** constructions. This reference mirrors the structure of [`ai-vocabulary.md`](ai-vocabulary.md) for the English list.

Implementation lives in [`src/locales/sv.js`](../src/locales/sv.js) (tiers + phrases) and optional empirical weights in [`sv-frequencies.json`](sv-frequencies.json).

## High-signal words / phrases (Tier 1–style)

| Pattern | Why it’s a signal | Better direction |
|---------|-------------------|------------------|
| fördjupa sig i / djupdyka i | Calque of “delve into” | *titta på*, *granska*, *läsa på om* |
| sömlös / sömlöst | Calque of “seamless” | Be specific about what works smoothly |
| banbrytande / transformativ | Inflation | Say what changed, with evidence |
| mångfacetterad | Calque of “multifaceted” | *komplex*, *på flera sätt*, or specify |
| väva samman / landskapet (abstract) / ekosystem (hype) | Metaphor pile-up | Concrete actors and systems |
| best practices, stakeholders, alignment, learnings, pain points | Swenglish in Swedish prose | Swedish equivalents or drop |
| helhetslösning, kundresa, värdeskapande | Consultant packaging | Plain description of work |
| I dagens snabbt föränderliga … | Empty opener | Cut or give one dated fact |
| Det är viktigt att notera att | Filler | Remove frame; state the fact |
| Låt oss dyka ner i / Utan vidare omsvep | Chat scaffolding | Start with content |
| Bra fråga! / Tack för en intressant fråga | Sycophancy | Remove |

## Medium-signal words (Tier 2 — flag when clustered)

| Word / family | Note |
|---------------|------|
| möjliggöra, säkerställa, optimera, implementera | Fine occasionally; clustered = AI |
| navigera, utforska, lyfta fram, understryka | Often paired with vague objects |
| robust, skalbar, resilient, synergi | Tech/business sludge when stacked |
| förutsättningar, utmaningar, möjligheter, insatser | Nominal overload |
| följaktligen, härvidlag, därutöver, emellertid | Stiff connectors in dense groups |

## Bureaucratic verbs (overlap with Svarta listan)

| Avoid | Prefer |
|-------|--------|
| erhålla | få |
| innehava | ha |
| föreligga | finnas |
| vidta åtgärder | agera / vidta [specific action] |
| beakta | ta hänsyn till |

## Chatbot / assistant phrases

- *Hoppas att detta hjälper*
- *Hör gärna av dig* / *Tveka inte att*
- *För att svara på din fråga …*
- *Låt mig börja med …*

## Generic conclusions

- *Sammanfattningsvis kan man säga …*
- *Framtiden ser ljus ut*
- *Det handlar inte bara om X utan också om Y* (when formulaic)

## Hedging stacks

Same as English: multiple modal verbs and epistemic softeners in one sentence — flag in combination (existing hedging detector + Swedish filler).

## Calibration

Tier boundaries are **partly empirical**: run `npm run corpus:logodds` after updating [`tests/fixtures/sv-corpus/`](../tests/fixtures/sv-corpus/) to refresh [`empirical-sv-tiers.md`](empirical-sv-tiers.md) and weights.
