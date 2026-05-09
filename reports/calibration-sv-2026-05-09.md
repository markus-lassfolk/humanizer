# Swedish calibration report (2026-05-09)

| Metric | Value |
|--------|-------|
| ROC-AUC | 1 |
| Optimal threshold (Youden J) | 28 |
| Mean score (human) | 5.48 |
| Mean score (AI) | 74.33 |

## Per genre (filename prefix `human-{genre}-` / `ai-{genre}-`)

| Genre | Mean human | Max human | Mean AI | #human | #ai |
|-------|------------|-----------|---------|--------|-----|
| academic | 2 | 2 | 74.57 | 7 | 7 |
| casual | 2 | 2 | 73.57 | 7 | 7 |
| fiction | 2 | 2 | 74.86 | 7 | 7 |
| government | 26.38 | 27 | 74.86 | 8 | 7 |
| marketing | 2 | 2 | 74.7 | 10 | 10 |
| misc | 5 | 5 | 69 | 1 | 1 |
| news | 3 | 3 | 74.57 | 7 | 7 |
| opinion | 3 | 3 | 73.57 | 7 | 7 |
| technical | 2 | 2 | 74.57 | 7 | 7 |

## Per-pattern (document-level recall = share of AI docs with ≥1 hit)

| Pattern ID | Precision | Recall (AI docs) | FP / 1k human words |
|------------|-----------|------------------|---------------------|
| 1 | 1 | 0.333 | 0 |
| 5 | 1 | 0.333 | 0 |
| 6 | 1 | 0.333 | 0 |
| 7 | 1 | 1 | 0 |
| 13 | 1 | 0.333 | 0 |
| 15 | 1 | 0.333 | 0 |
| 19 | 1 | 0.667 | 0 |
| 21 | 1 | 0.667 | 0 |
| 23 | 1 | 1 | 0 |
| 24 | 1 | 0.333 | 0 |
| 26 | 1 | 0.333 | 0 |
| 30 | 0.965 | 1 | 2.841 |
| 31 | 1 | 1 | 0 |
| 32 | 1 | 1 | 0 |
| 33 | 1 | 1 | 0 |
| 34 | 1 | 0.667 | 0 |

## Example false-positive snippets (human corpus)

### Pattern 30

- `human-government-01.txt`: "prövas"
- `human-government-02.txt`: "prövas"
- `human-government-03.txt`: "prövas"
- `human-government-04.txt`: "prövas"
- `human-government-05.txt`: "prövas"
- `human-government-06.txt`: "prövas"
- `human-government-07.txt`: "prövas"
- `human-government-gold-01.txt`: "prövas"
