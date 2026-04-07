# Swedish language support (Maeve fork)

This repository is a fork of [brandonwise/humanizer](https://github.com/brandonwise/humanizer) maintained for **Swedish** and Nordic use cases. Upstream is **English-first**; see `docs/IMPROVEMENTS.md` (“Better non-English handling”).

## Goals

1. **Swedish pattern vocabulary** — Tiered word/phrase lists for LLM clichés in Swedish (direct translation artifacts, formal filler, sycophancy, “press release” tone).
2. **Swedish-aware statistics** — Replace or complement English `FUNCTION_WORDS` and English-only readability with metrics valid for Swedish (or language-selectable pipelines).
3. **Sentence segmentation** — Abbreviations and punctuation rules appropriate for Swedish prose.
4. **CLI / API** — `--locale sv` (or `HUMANIZER_LOCALE=sv`) to select the Swedish pipeline without breaking default English behavior.

## Workflow

- Track **`upstream/main`** via `git fetch upstream` and merge or rebase regularly.
- Prefer **contributions upstream** when changes are language-agnostic; keep Swedish-specific data and tests in this fork until a merge path exists.

## Related

- Upstream issue discussion may be opened for multilingual architecture alignment.
- OpenClaw integration in the maintainer’s environment uses `github:markus-lassfolk/humanizer` once this fork publishes tagged releases.
