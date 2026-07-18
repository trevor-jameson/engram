# Unit 09 — Leech rewrite flow

## Goal

Cards with 4+ lifetime lapses leave normal rotation and get surfaced for a
situation-shaped front rewrite (or deletion); a rewrite fully resets
scheduling state.

## Ordered steps (respecting split rules)

1. **`server/api/`**:
   - `GET /api/leeches` → leech-flagged cards (detection is the unit 03 pure
     function over parsed cards; nothing stored).
   - `POST /api/cards/:id/rewrite` `{ front, back? }` → user-initiated edit:
     writes the new front (and back if provided) via `writeCard`, applies
     `resetForRewrite` (box → 1, lapses → 0, due = tomorrow). Rejects empty
     front (400); 404 unknown id; 409 if the card is not currently a leech.
   - `DELETE /api/cards/:id` → deletes the card file (used from this flow;
     available generally).
2. **`web/`**: rewrite surface, presented during the triage step (after
   inbox items, per the core-flow order): each leech shown with its current
   front/back and lapse count, flagged with `warning.main` (never
   `error.main` — a leech is a card-quality signal, not a failure). Per
   card: edit the front into a situation-shaped cue (renderer preview via
   the unit 06 component), save-rewrite, or delete. Copy stays neutral and
   non-moralizing; the framing is "this front isn't firing", per
   `learning-principles.md` §5.

## Constraints

- The scheduler never touches body content; the rewrite endpoint is a
  user-initiated edit path (invariant 5 holds because the user typed it).
- A rewritten card re-enters normal rotation immediately (due tomorrow, box
  1); it must reappear in queues and be re-flaggable only after 4 fresh
  lapses.

## Out of scope

- General card-edit browsing UI; leech statistics/history.

## Verification

- Route tests: leech list matches fixture lapse counts; rewrite resets
  frontmatter exactly (box 1, lapses 0) and preserves untouched fields;
  non-leech rewrite 409; delete removes the file.
- Manual: drive a scratch-vault card to 4 lapses via the UI; confirm it
  vanishes from the next queue and appears in the rewrite surface (success
  criterion 4); rewrite it; confirm file contents by eye and its return to
  rotation the next day.
- Standard unit-completion checklist.
