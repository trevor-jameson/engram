# Progress Tracker

Update this file after every meaningful implementation change.

## Current Phase

- Implementation, units 01–04 complete (2026-07-19).

## Current Goal

- Begin unit 05 (web shell & theme) per `context/specs/05-web-shell.md`.

## Completed

- v1 decomposition: `context/specs/00-build-plan.md` and specs 01–10 (2026-07-18).
- Unit 01 — workspace scaffold & config (2026-07-18): pnpm workspace (`server/`, `web/`, `shared/`), strict TS everywhere (base tsconfig with `erasableSyntaxOnly` so Node 22.18+ runs server TS natively — no runner dependency), ESLint flat config with `no-explicit-any` as error, root scripts `typecheck`/`lint`/`test`/`build`/`dev`. Config loader `server/vault/config.ts` (file → env-override → defaults, fails fast without a vault path; 9 unit tests against fixture configs). `engram.config.example.json` committed; `engram.config.json` and `scratch-vault/` gitignored. Scratch vault created with 3 hand-written sample cards (code fence + KaTeX coverage). Verified: all four root scripts pass; `pnpm dev` starts server bound to 127.0.0.1:4321 against the scratch vault (via `ENGRAM_VAULT_PATH`) and the Vite placeholder on 127.0.0.1:5173.

- Unit 02 — shared types & vault card I/O (2026-07-18): `shared/` exports `Card`, `CardType`/`CARD_TYPES`, `CardFrontmatter`, `CardError` shapes, and `splitCardBody` (the signed-off `Q:`/`A:` split). `server/vault/cards.ts` implements `openVault(vaultPath)` → `listCards` (invalid files reported, never dropped or rewritten), `readCard`, `parseCard` (gray-matter + boundary validation of every frontmatter field; unquoted YAML dates normalized to `YYYY-MM-DD` strings), `writeCard` (rejects source-less or non-`Q:/A:` cards), `updateFrontmatter` (scheduler-facing; only `box`/`due`/`lapses`), `deleteCard`, and `generateCardId` (signed-off `<slug>-<YYYYMMDDHHmmss>` scheme). Card IDs validated against path traversal; API surface never exposes paths. 52 tests pass, all file I/O against fixture folders/temp dirs. Verified byte-stability end-to-end on a copy of the scratch vault: patching `box`+`due` changed exactly those two lines, body (incl. `$$...$$`) byte-identical.

- Unit 03 — scheduler core (2026-07-19): pure functions in `server/scheduler/` — `dates.ts` (`addDays`, `isDue`), `leitner.ts` (`grade` pass/lapse with box cap/floor and per-box due dates, `resetForRewrite`, `newCardDefaults`), `leech.ts` (`isLeech`, threshold 4, derived on read — never written), `queue.ts` (`buildQueue`: leech exclusion → weighted cap 25 most-overdue-first with problem cards counting 2 → floor-as-fill 5 → source interleaving with injectable RNG). `SchedulerPatch`/`GradeResult` moved to `shared/` so the scheduler needs no vault import. Purity enforced by a scoped ESLint `no-restricted-imports` rule (fs/http/net/child_process and `**/vault/**` banned in `server/scheduler/`), negative-tested. 36 scheduler tests; suite total 88, all green.

- Unit 04 — session & grading API (2026-07-19): `server/api/app.ts` exposes `createApp(vault, { today?, rng? })` (injectable clock/RNG for deterministic tests) with `GET /api/queue` (rebuilt from files per request; DTOs with split front/back plus `{ due, queued, overflow }` counts), `GET /api/cards` (frontmatter summaries + invalid-file report), `GET /api/cards/:id`, and `POST /api/cards/:id/grade` (validates body, 404 unknown id, 400 bad input, 409 leech; scheduler computes patch, `updateFrontmatter` persists). `VaultError` codes map centrally to HTTP statuses via `app.onError`. DTO types (`CardDTO`, `CardSummary`, `QueueResponse`, `CardsResponse`, `QueueCounts`) live in `shared/`; `server/api/dto.ts` derives `leech` via the scheduler. `server/index.ts` now serves the Hono app on 127.0.0.1 via `@hono/node-server`. 15 route tests (103 total). Manually verified with curl against the scratch vault: queue, pass/lapse grading visible in frontmatter on disk, queue rebuilt consistently after restart (success criterion 11); grep confirms no outbound-request code in `server/`.

## In Progress

- None.

## Next Up

- Unit 05: web shell & theme (`web/` — React + MUI, light/dark system themes, layout shell).

## Open Questions

- Actual vault path on Trevor's machine (needed only at runtime configuration, never hardcoded — goes in `engram.config.json` at first run).
- Free-recall grading and scheduler feedback from recall: deferred "for now" — revisit after v1.

## Architecture Decisions

- Hono over Express for the server: lighter, TypeScript-first, fits the thin-scheduler ethos (decided during context drafting, 2026-07-12).
- gray-matter (frontmatter), unified/remark (markdown), KaTeX bundled locally (math) as the file/rendering toolchain — mainstream, minimal choices matching invariants 2 and 3.
- pnpm as the only package manager.
- Leech post-rewrite state: full reset — `box` → 1, `lapses` → 0. The rewrite created a new cue, so the card earns its intervals from scratch (decided 2026-07-18).
- Configuration: `engram.config.json` in the repo root (gitignored) holds `vaultPath` and `port` (default 4321); `ENGRAM_VAULT_PATH` / `ENGRAM_PORT` env vars override when set (decided 2026-07-18).
- Icon set confirmed: `@mui/icons-material` (decided 2026-07-18).
- Unit 01 dependencies (all dev-only, pre-justified in `specs/01-scaffold.md`): `typescript` (pinned ^5.9 — typescript-eslint 8.x cannot parse under TS 7, which pnpm resolved first), `eslint` + `@eslint/js` + `typescript-eslint` (lint, enforces no-`any`), `vitest` (test runner), `vite` (web dev/build), `@types/node`. No runtime dependencies yet: the unit-01 placeholder server uses `node:http`; Hono is added in unit 04 when real routes exist. Node 22.18+ type stripping runs server TS directly, so no tsx/ts-node.
- Unit 02: `gray-matter` added as the server's first runtime dependency (pre-pinned in the build plan; sole frontmatter parser/writer per code-standards). `@engram/shared` consumed as a workspace source package (`exports` → `index.ts`; Node type stripping resolves it through the pnpm symlink, no build step).
- Unit 02: `updateFrontmatter` writes surgically — it replaces only the patched `box`/`due`/`lapses` lines in the raw frontmatter text rather than re-serializing through gray-matter, because js-yaml re-serialization would reformat user-authored YAML (date quoting, spacing) and break the byte-stability rule. gray-matter remains the only parser, and the writer for app-authored files (`writeCard`).
- Unit 02: server `build` script changed from emitting `dist/` to `tsc --noEmit` — nothing executes compiled output (Node runs TS source via type stripping), and emitting would complicate cross-package imports for no consumer.
- Unit 03: at the weighted-cap boundary, queue selection stops at the first card that does not fit (strict overdue-ness priority) rather than skipping it for a later lighter card — no card is ever queued ahead of a more-overdue one, and overflow carries by overdue-ness exactly as specced (decided 2026-07-19; the spec left the boundary case open).
- Unit 03: interleaving is two-regime — when the dominant source exceeds ceil(n/2), fractional-position spreading places minority cards evenly and accepts unavoidable same-source runs; otherwise a greedy largest-remaining-source pick guarantees zero adjacent same-source cards. RNG is injectable for deterministic tests.
- Unit 04: `hono` + `@hono/node-server` added (Hono pre-pinned; the node adapter is Hono's official way to bind a Node listener and is what enforces the 127.0.0.1-only bind). "Today" is computed in the machine's local timezone at the API layer — a session at 11pm belongs to the local day, and the pure scheduler just receives the string.
- Server bind host made configurable (2026-07-19, Trevor's request): `host` in `engram.config.json` / `ENGRAM_HOST` env override, default `127.0.0.1`. Default preserves the localhost-only invariant; a non-loopback value is an explicit user override. `architecture.md` config paragraph updated accordingly.
- File formats signed off 2026-07-18: card ID = filename sans `.md`, app-created files `<front-slug>-<timestamp>.md` (rewrites never rename); session log `logs/YYYY-MM-DD.md` with `date`/`sources` frontmatter, append on same-day re-run; inbox = single `inbox.md`, one list item per capture, no metadata, deletion by exact line match. Details in `context/specs/` 02/07/08.

## Session Notes

- The interview record lives at `context/.init-adrian-state.md`; it can be deleted once Trevor is satisfied with the context files.
- Development must never touch the real vault: fixture folders for tests, a scratch vault for the dev server (see `ai-workflow-rules.md`).
