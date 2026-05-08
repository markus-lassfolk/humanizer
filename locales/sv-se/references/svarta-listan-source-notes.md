# Svarta listan — source notes

The substitution rows in [`svarta-listan-full.tsv`](svarta-listan-full.tsv) are aligned with **Statsrådsberedningen**, *Svarta listan: ord och fraser som kan ersättas i författningsspråk* (PM 2011:1), and related **klarspråk** guidance from Språkrådet / Regeringskansliet.

- **Authoritative legal wording** remains in the official publication (Regeringskansliet). This repository stores only a **structured transformation table** (avoid → prefer, flags, notes) for tooling, not a reproduction of the full PM text.
- **Språkrådet / ISOF:** [Klarspråk](https://www.isof.se/svenska-spraket/svenska-spraket-i-finland/svenska-klarsprak) and *Myndigheternas skrivregler* are complementary prescriptive sources for phrase-level checks in [`klarsprak-checklist.tsv`](klarsprak-checklist.tsv).

Regenerate locale snippets: `npm run locale:prescriptive`.
