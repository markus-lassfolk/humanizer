# Third-party sources for English prescriptive TSVs

Curated and transformed into Humanizer TSV format under `locales/en-en/references/`.  
Patterns and ideas are attributed below; Humanizer does not ship upstream source code.

| Source                                                                                                | License                          | Files                                                                 |
| ----------------------------------------------------------------------------------------------------- | -------------------------------- | --------------------------------------------------------------------- |
| [proselint](https://github.com/amperser/proselint) (weasel_words, cliches, redundancy, hedging ideas) | BSD-3-Clause                     | `weasel-words.tsv`, `cliches.tsv`, `redundancy.tsv`, `hedging.tsv`    |
| [write-good](https://github.com/btford/write-good) (weasel / passive-voice ideas)                     | MIT                              | `weasel-words.tsv`                                                    |
| [alex](https://github.com/get-alex/alex) (inclusive language)                                         | MIT                              | `inclusive-language.tsv`                                              |
| [Vale Microsoft Writing Style Guide](https://github.com/errata-ai/Microsoft)                          | MIT                              | `microsoft-style-guide.tsv` (sampled rules)                           |
| [Vale Google Developer Documentation Style Guide](https://github.com/errata-ai/Google)                | MIT                              | `google-developer-style.tsv` (sampled rules)                          |
| [Vale Mozilla](https://github.com/errata-ai/Mozilla)                                                  | MPL-2.0                          | `mozilla-style.tsv` (sampled rules; transformed to plain suggestions) |
| Plain Language / US plainlanguage.gov / Strunk-style wordiness                                        | Public domain / government works | `plain-english.tsv`                                                   |
| Corporate jargon / buzzword lists (curated)                                                           | CC0 / factual lists              | `corporate-jargon.tsv`                                                |

**HC3 / RAID / GPT-Wiki-Intro / Wikipedia / BNC** corpus samples referenced by EN tooling are maintained via local fixture-generation scripts and `locales/en-en/data/wiki-human/README.md`.
