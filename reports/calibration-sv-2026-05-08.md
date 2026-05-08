# Swedish calibration report (2026-05-08)

| Metric | Value |
|--------|-------|
| ROC-AUC | 1 |
| Optimal threshold (Youden J) | 6 |
| Mean score (human) | 2.08 |
| Mean score (AI) | 58.24 |

## Per genre (filename prefix `human-{genre}-` / `ai-{genre}-`)

| Genre | Mean human | Max human | Mean AI | #human | #ai |
|-------|------------|-----------|---------|--------|-----|
| academic | 2 | 2 | 58.14 | 7 | 7 |
| casual | 2 | 2 | 57.86 | 7 | 7 |
| fiction | 2 | 2 | 59 | 7 | 7 |
| government | 0.38 | 3 | 59 | 8 | 7 |
| misc | 5 | 5 | 55 | 1 | 1 |
| news | 3 | 3 | 58.14 | 7 | 7 |
| opinion | 3 | 3 | 57.86 | 7 | 7 |
| technical | 2 | 2 | 58.14 | 7 | 7 |

## Per-pattern (document-level recall = share of AI docs with ≥1 hit)

| Pattern ID | Precision | Recall (AI docs) | FP / 1k human words |
|------------|-----------|------------------|---------------------|
| 7 | 1 | 1 | 0 |
| 13 | 1 | 0.34 | 0 |
| 15 | 1 | 0.32 | 0 |

## Example false-positive snippets (human corpus)
