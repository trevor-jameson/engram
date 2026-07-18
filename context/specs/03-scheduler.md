# Unit 03 — Scheduler core (pure)

## Goal

All Leitner, queue-building, and leech logic as pure functions in
`server/scheduler/`, fully unit-tested. No I/O imports of any kind.

## Scope

Functions receive and return in-memory data (`Card[]`, dates, DTOs from
`shared/`); they never read or write files.

- **Box transitions** (`grade(card, result, today)` → frontmatter patch):
  - Intervals by box: 1→1d, 2→2d, 3→4d, 4→8d, 5→16d, 6→32d, 7→64d.
  - Pass: box +1 (capped at 7); `due` = today + new box's interval.
  - Lapse: box −1 (floored at 1, never reset to 1 from higher boxes in one
    step); `lapses` +1; `due` = today + new box's interval.
- **Leech detection**: `lapses >= 4` (lifetime) → leech. Leeches are excluded
  from queue building and routed to the rewrite flow (unit 09). Detection is
  derived from frontmatter on read — no `leech` field is written.
- **Queue building** (`buildQueue(cards, today)`):
  1. Exclude leeches.
  2. Select due cards most-overdue-first into a weighted cap of 25:
     `type: problem` counts 2, all others 1. Overflow simply stays due
     (carries to tomorrow by overdue-ness — no extra state).
  3. Floor-as-fill 5: if fewer than 5 due, pull forward soonest-due
     not-yet-due cards to reach 5 (or all cards if fewer exist).
  4. Interleave: reorder so no two consecutive cards share `source` where the
     mix allows; when one source dominates, spread minority sources as evenly
     as possible and accept same-source runs rather than dropping cards.
     Ties broken randomly (accept an injectable RNG for testability).
- **Leech reset** (`resetForRewrite(card, today)` → patch): `box` → 1,
  `lapses` → 0, `due` = today + 1d. Called only from the user-initiated
  rewrite path (unit 09).
- **New-card defaults**: box 1, lapses 0, `created` = today, `due` = today
  + 1d.

## Out of scope

- Persisting any of the above (vault I/O calls it, unit 04+). Free-recall or
  inbox logic.

## Verification

Unit tests must cover (this list is the `ai-workflow-rules.md` minimum, made
concrete):

- Pass at box 7 stays at 7; lapse at box 1 stays at 1.
- Lapse from box N lands at N−1, never 1 (for N ≥ 3), and increments lapses.
- Weighted cap: 25 non-problem cards fit; 13 problem cards = 26 weight → 12
  fit; mixed cases at the boundary.
- Floor-as-fill: 0 due → 5 pulled forward; 3 due → 2 pulled forward; 5+ due
  → no fill. 0 cards total → empty queue (session still runs, unit 04).
- Interleave: no adjacent same-source when sources allow; dominant-source
  case spreads minorities evenly; deterministic under a seeded RNG.
- Leech: 3 lapses not flagged, 4 flagged; flagged cards absent from queue;
  `resetForRewrite` produces box 1 / lapses 0.
- Purity: lint rule or test asserting `server/scheduler/` imports nothing
  from `fs`, `server/vault/`, or network modules.
