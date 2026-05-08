# Svarta listan — Swedish plain-language replacements

This document summarizes **mechanical** substitutions aligned with Statsrådsberedningens *Svarta listan: ord och fraser som kan ersättas i författningsspråk* (PM 2011:1). The official publication is the legal reference; this table is a **practical subset** wired into [`src/locales/sv.js`](../src/locales/sv.js) as `AUTOFIXES_SV` and related `AI_PHRASES_SV` entries.

**Attribution:** Regeringskansliet / Statsrådsberedningen — see Språkrådet and Regeringskansliet publications for the authoritative list.

## Autofix mappings (implemented)

| Avoid (formal / kansli) | Prefer (klarspråk) |
|-------------------------|---------------------|
| i syfte att | för att |
| på grund av det faktum att | eftersom |
| med anledning av att | eftersom |
| erhålla / erhåller / erhållit | få / får / fått |
| innehava / innehar / innehaft | ha / har / haft |
| föreligga / föreligger / förelegat | finnas / finns / funits |
| vidmakthålla (+ böjningar) | behålla (+ böjningar) |
| bibringa / bibringar / bibragit | ge / ger / gett |
| åvila / åvilade | ligga på / låg på |
| åsamka / åsamkar / åsamkat | orsaka / orsakar / orsakat |
| tillse att | se till att |
| inkomma med (+ böjningar) | lämna in (+ böjningar) |
| vidta åtgärder | agera |
| åberopa (+ böjningar) | hänvisa till (+ böjningar) |
| emellertid | men |
| envar | var och en |
| ikraftträdande | börjar gälla |
| följaktligen | alltså |
| nyttja / nyttjar / nyttjat | använda / använder / använt |
| genomföra en analys av | analysera |
| i dagsläget | nu |
| inom ramen för | inom |
| det är viktigt att notera att | _(remove — say the substance)_ |

## Phrase-level flags (not always auto-fixed)

These often need context; they appear in `AI_PHRASES_SV` with rewrite hints rather than blind replacement:

- *avseende*, *beträffande* → *om / för / angående*
- *huruvida* → *om*
- *försåvitt* → *om / så länge*
- *ehuru* → *fastän / även om*
- *enär* → *eftersom / när*
- *jämlikt* → *enligt*
- *härvidlag* → *här*
- *icke* → *inte*
- *förefaller* → *verkar*
- *ärende* → *fråga* (except fixed legal sense *ärende*)

## See also

- [Språkrådet — Klarspråk](https://www.isof.se/svenska-spraket/svenska-spraket-i-finland/svenska-klarsprak)
- [`references/swedish-ai-vocabulary.md`](swedish-ai-vocabulary.md) — LLM-specific Swedish tells beyond Svarta listan
