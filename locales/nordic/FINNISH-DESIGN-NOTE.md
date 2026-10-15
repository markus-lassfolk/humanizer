# Finnish (`fi`) — scope note, not implemented

Finnish is out of scope for this PR series. This note records why the Nordic recipe (word-list regexes plus log-odds n-grams) does not carry over, and what it would need.

## Why the current approach fails

- **Agglutination.** One lemma has hundreds of surface forms: *mahdollisuus* → *mahdollisuudet, mahdollisuuksia, mahdollisuuksien, mahdollisuuksista, mahdollisuuksiin, mahdollisuuksilla …*, with consonant gradation (*kk→k*, *pp→p*, *t→d*) and vowel harmony on suffixes. A `\bword\b` regex lists one form; a tier list would need every inflection, and `\b` also fires inside compounds.
- **Compounding.** Finnish writes compounds as one token (*tietoturvallisuusratkaisu*). The AI-typical part is often one constituent (*ratkaisu*, *kokonaisvaltainen*), invisible to whole-token matching, and the Swedish/Norwegian/Danish trick of matching a compound's last part would need a real splitter.
- **No articles, free word order, cases instead of prepositions.** Phrase patterns built on prepositions ("i dagens …", "genom att …") have no counterpart; the equivalent signal sits in case endings (*-ssa/-ssä, -lla/-llä*) and in postpositions.
- **N-gram sparsity.** Unigram–trigram log-odds over surface forms split each lemma's counts across its inflections, so a ~60-text model sample gives almost no n-gram that reaches the "≥3 model texts" gate.
- **Readability.** LIX is defined for Germanic word lengths; Finnish words are much longer, so the "long word" (>6 chars) share is saturated. It would need a Finnish-calibrated measure.
- **Function words / abbreviations** also inflect (*ja, että, joka → jonka, jota, joiden …*).

## What an implementation would need

1. **Lemmatisation/morphology**, not regex: Voikko (libvoikko, with WASM or a Node binding) or Omorfi for lemmas and compound splitting; Turku neural parser as a heavier option. Everything downstream (tiers, phrases, empirical extras) would then be stored and matched at lemma level.
2. A tokenisation step in the analyzer that exposes `lemmas[]` next to the text. This is a **new locale capability** (`profile.tokenize(text) → {surface, lemma, start, end}`), because Pattern 7 and the phrase detectors currently run regexes on raw text.
3. Lemma-level log-odds (`build-wordlist.mjs` over lemmas, with compound constituents counted separately).
4. A human baseline: Traficom/NCSC-FI advisories, Suomen Kyberturvallisuuskeskus, Yle, Tietosuojavaltuutettu. Same fetch script works; the Nynorsk-style language filter would become a Finnish/Swedish split (Yle and authorities publish in both).
5. Pattern packs rewritten around constructions (passive *-taan*, nominalisations *-minen*, *mahdollistaa*/*tarjota* stacks), tested on lemma sequences.

Estimated cost: a dependency (Voikko), an analyzer capability, and its own calibration cycle; not a copy of `nb`/`da`.
