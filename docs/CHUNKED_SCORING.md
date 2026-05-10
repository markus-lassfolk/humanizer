# Chunked scoring (long documents)

For **long, mixed-origin** text (e.g. a 20k-word report with one AI-drafted section), a single whole-document score **dilutes** strong local signals: pattern density is computed over **all** words.

**Chunked analysis** runs the normal `analyze()` on **overlapping word windows**, then reports:

- **Peak / median / low** chunk scores (and p95)
- **Severity** — `mostly-human` | `lightly-ai` | `partial-ai` | `heavily-ai`  
  `partial-ai` means a **high peak** with a **much lower median** (typical “paste-in” AI block).

The **headline** `score` from `analyze()` is **unchanged**. Chunking is **additive** (`analyzeChunked`, CLI `--chunked`, API `chunked`).

## Defaults

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| `windowWords` | 300 | Enough tokens for burstiness / TTR / uniformity; still localizes a section. |
| `strideWords` | 150 | 50% overlap so a human/AI boundary is not split across only weak windows. |
| `minDocWordsForChunking` | 600 | Below ~2 windows, distribution stats are misleading → **one chunk** (whole doc). |
| `minLastWindowWords` | 180 | 60% of window; tiny tails merge into the previous window when needed. |
| `partialAiPeakGap` | 30 | Peak − median must exceed this for `partial-ai` (reduces noise). |

Override any of these via `analyzeChunked(text, { windowWords, strideWords, ... })`.

## API

- **Programmatic:** `analyzeChunked` from [`src/analyzer.js`](../src/analyzer.js) (re-exported from [`src/chunk-analyzer.js`](../src/chunk-analyzer.js)).
- **CLI:** `--chunked` (force), `--no-chunked` (disable). **Auto** when word count ≥ 600 (after `--ignore-code` masking).
- **HTTP:** `POST /api/analyze`, `/api/score`, `/api/humanize` accept optional `chunked` and `ignoreCode`; response may include `chunks` and `aggregate`. See [`api-server/openapi.yaml`](../api-server/openapi.yaml).

## Related

- Full-document behavior (no sampling): [README.md](../README.md) scoring section.
- Locale-specific composite weights still apply **per chunk** via `mergeScoringKnobs`.
