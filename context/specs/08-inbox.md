# Unit 08 — Inbox capture & triage

## Sign-off required before starting

**Inbox storage format (proposal):** a single `inbox.md` file beside
`flashcards/` in the vault; each capture is one markdown list item
(`- <text>`) appended to the end — trivially editable by hand or from
Obsidian on any device that syncs the vault. Triage removes the item's line
when it is converted or discarded. No frontmatter, no timestamps in v1
(near-zero-friction beats metadata).

## Goal

Capture is always available from the header; triage at session end converts
captures into cards via type templates, with `source` impossible to omit.

## Ordered steps (respecting split rules)

1. **`server/vault/`**: inbox module — append a capture line, list current
   items, remove an item; card-creation entry point already exists
   (`writeCard`, unit 02) with new-card defaults from the scheduler's
   pure `newCardDefaults` (unit 03). Fixture tests.
2. **`server/api/`**:
   - `POST /api/inbox` `{ text }` → appended (400 on empty text).
   - `GET /api/inbox` → items.
   - `DELETE /api/inbox/:index-or-key` → discard.
   - `POST /api/cards` `{ front, back, source, type }` → validates all four
     (reject missing/empty `source` — no creation path may omit it, invariant
     6), writes the card file, returns the new card; optionally removes the
     originating inbox item in the same request.
3. **`web/`**:
   - Header capture field goes live: type a line, hit enter, field clears,
     quiet confirmation; available on every screen at all times.
   - Triage screen: lists pending inbox items and, per item, offers the five
     type templates (display names symptom→cause, decision→trade-off,
     prediction, problem, definition — slugs per `shared/`). Template layout
     makes situation-shaped fronts the path of least resistance: the four
     situation types listed first, definition last and never preselected.
     Each template gives front/back fields (problem: front = problem spec,
     back = worked solution) plus a required source field. Convert or
     discard; empty inbox → triage states so and the session ends.

## Out of scope

- Card editing UI (rewrite flow covers the one v1 edit surface, unit 09).
- Anki import, images, multi-deck anything.

## Verification

- Fixture tests: append/list/remove; creation rejects sourceless cards.
- Route tests for all endpoints incl. validation failures.
- Manual: capture from every screen mid-session; triage converts one item
  per type template; created card files verified by eye in the scratch vault
  and in Obsidian; discarding removes lines; success criterion 8 (no
  sourceless card writable via UI or curl).
- 0-due day: session runs recall → empty review → triage (success
  criterion 1 complete).
- Standard unit-completion checklist.
