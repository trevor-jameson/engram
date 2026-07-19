---
box: 1
due: 2026-07-17
lapses: 2
created: 2026-07-10
source: hennessy-patterson
type: prediction
---
Q: You sort an array before running a branchy filter loop over it. Predict the effect on runtime and why.

A: Faster — often dramatically. Sorting makes the branch outcome runs long and predictable, so the branch predictor stops mispredicting.
