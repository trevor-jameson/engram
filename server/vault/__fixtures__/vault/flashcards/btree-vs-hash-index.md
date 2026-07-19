---
box: 4
due: '2026-07-19'
lapses: 1
created: '2026-06-20'
source: ddia
type: decision-tradeoff
---
Q: Choosing between a B-tree and a hash index for a lookup table. What's the trade-off?

A: Hash: O(1) point lookups, no range scans, poor locality on disk. B-tree: log-time lookups but ordered — range scans, prefix queries, and good page locality. Default to B-tree unless the workload is purely point lookups.
