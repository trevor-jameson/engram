---
box: 2
due: 2026-07-18
lapses: 0
created: 2026-07-01
source: csapp
type: symptom-cause
---
Q: Random access into a huge array is slow even though the array fits in RAM and cache miss counters look normal. What's the likely cause?

A: TLB misses — the page-table working set exceeds TLB reach. Huge pages or better locality fix it.
