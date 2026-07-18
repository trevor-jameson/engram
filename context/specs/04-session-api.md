# Unit 04 — Session & grading API

## Goal

A localhost-only Hono server exposing the review loop over HTTP: build
today's queue, serve cards, accept grades. Verifiable end-to-end with curl
against the scratch vault — no UI yet.

## Scope

Routes (all JSON; errors as `{ error: string }` + status; card IDs only,
never paths; input validated before route logic):

- `GET /api/queue` — parse vault → `buildQueue` → queue DTO: ordered card
  list (id, front, back, source, type, box, due) plus counts. Rebuilt from
  files on every call (invariant 1: restart-safe, no persisted index).
- `POST /api/cards/:id/grade` — body `{ result: "pass" | "lapse" }`;
  scheduler computes the patch, `updateFrontmatter` persists it; returns the
  updated card. 404 unknown id; 400 bad body; grading a leech-flagged card
  is rejected (409).
- `GET /api/cards/:id` — single card DTO.
- `GET /api/cards` — all cards (id + frontmatter summary; used later by
  triage/rewrite surfaces).

Server assembly: Hono app created in `server/api/`, bound to `127.0.0.1`
on the configured port; vault path from unit 01's config loader. Route
handlers delegate: parsing to `server/vault/`, scheduling to
`server/scheduler/` — no business logic in handlers.

## Out of scope

- Card creation/edit/delete routes (unit 08 adds creation via triage; edit/
  delete arrive with the flows that need them, units 08–09). Free recall,
  inbox, leech routes. Any static file serving for the web app (Vite dev
  server handles unit 05; production serving decided in unit 10 if needed).

## Verification

- Route tests (Hono's test client) against fixture vaults: queue shape,
  weighted cap and floor visible in output, grade→frontmatter change on
  disk, all error cases above.
- Manual curl session against the scratch vault: fetch queue, grade several
  cards pass/lapse, confirm frontmatter edits in the scratch files by eye,
  restart server, confirm queue rebuilds consistently (success criterion 11).
- Confirm the server makes zero outbound requests (code inspection: no fetch/
  http client imports outside localhost binding).
- Standard unit-completion checklist.
