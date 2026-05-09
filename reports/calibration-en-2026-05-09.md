# English calibration report (2026-05-09)

| Metric | Value |
|--------|-------|
| ROC-AUC | 1 |
| Macro-F1 (at Youden threshold) | 1 |
| Optimal threshold (Youden J) | 37 |
| Mean score (human) | 2.53 |
| Mean score (AI) | 65.2 |

## Per genre

| Genre | Mean human | Max human | Mean AI | #human | #ai |
|-------|------------|-----------|---------|--------|-----|
| academic | 2 | 2 | 65.29 | 7 | 7 |
| casual | 2 | 2 | 64.43 | 7 | 7 |
| editorial | 2 | 2 | 0 | 1 | 0 |
| fiction | 3 | 3 | 66.29 | 7 | 7 |
| marketing | 1 | 1 | 66.29 | 7 | 7 |
| misc | 36 | 36 | 59 | 1 | 1 |
| news | 2 | 2 | 65.29 | 7 | 7 |
| opinion | 2 | 2 | 64.43 | 7 | 7 |
| technical | 1 | 1 | 65.29 | 7 | 7 |

## Per-pattern

| Pattern ID | Precision | Recall (AI docs) | FP / 1k human words |
|------------|-----------|------------------|---------------------|
| 7 | 1 | 1 | 0 |
| 10 | 1 | 0.32 | 0 |
| 13 | 1 | 0.66 | 0 |
| 15 | 1 | 0.32 | 0 |
| 18 | 0 | 0 | 0.487 |
| 19 | 1 | 1 | 0 |
| 21 | 1 | 0.34 | 0 |
| 24 | 1 | 0.66 | 0 |
| 26 | 1 | 0.32 | 0 |