# Wikipedia-derived human English (optional, for ML + log-odds)

Use this folder for **plain-text extracts** of encyclopedic prose so the English pipeline can train on real human register without mixing in LLM text.

## Pre-2023 content (recommended)

Wikimedia publishes dated dumps. For English Wikipedia:

1. Pick a dump **dated before 2023** (e.g. `enwiki-20221201-pages-articles-multistream.xml.bz2` from [dumps.wikimedia.org](https://dumps.wikimedia.org/enwiki/)).
2. Extract plain text with [WikiExtractor](https://github.com/attardi/wikiextractor) or similar into many `.txt` files.
3. Copy or symlink a **sample** (hundreds to thousands of short files) into `locales/en-en/data/wiki-human/*.txt`.
4. Run:
   - `npm run en:ml:dataset` — includes these files as **label 0** (human)
   - `npm run en:ml:train` — refits `en-calibrator.json`
   - Optionally merge snippets into baseline / log-odds flows (see `ENGLISH-EXTENSION.md`).

Keep each file **roughly article-sized or smaller** (the dataset builder truncates very long files to avoid OOM).

## Quick sample (not pre-2023)

`npm run en:wiki:sample` fetches random **current** article extracts via the MediaWiki API (useful for smoke tests only; **not** a pre-2023 guarantee).
