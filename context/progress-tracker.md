# Progress Tracker

Update this file after every meaningful implementation change.

## Current Phase

- Implementation, unit 01 complete (2026-07-18).

## Current Goal

- Begin unit 02 (shared types & vault card I/O) per `context/specs/02-vault-io.md`.

## Completed

- v1 decomposition: `context/specs/00-build-plan.md` and specs 01–10 (2026-07-18).
- Unit 01 — workspace scaffold & config (2026-07-18): pnpm workspace (`server/`, `web/`, `shared/`), strict TS everywhere (base tsconfig with `erasableSyntaxOnly` so Node 22.18+ runs server TS natively — no runner dependency), ESLint flat config with `no-explicit-any` as error, root scripts `typecheck`/`lint`/`test`/`build`/`dev`. Config loader `server/vault/config.ts` (file → env-override → defaults, fails fast without a vault path; 9 unit tests against fixture configs). `engram.config.example.json` committed; `engram.config.json` and `scratch-vault/` gitignored. Scratch vault created with 3 hand-written sample cards (code fence + KaTeX coverage). Verified: all four root scripts pass; `pnpm dev` starts server bound to 127.0.0.1:4321 against the scratch vault (via `ENGRAM_VAULT_PATH`) and the Vite placeholder on 127.0.0.1:5173.

## In Progress

- None.

## Next Up

- Unit 02: `shared/` Card types + `server/vault/` card I/O (list/read/parse/write/updateFrontmatter/delete) with byte-stable round-trips.

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
- File formats signed off 2026-07-18: card ID = filename sans `.md`, app-created files `<front-slug>-<timestamp>.md` (rewrites never rename); session log `logs/YYYY-MM-DD.md` with `date`/`sources` frontmatter, append on same-day re-run; inbox = single `inbox.md`, one list item per capture, no metadata, deletion by exact line match. Details in `context/specs/` 02/07/08.

## Session Notes

- The interview record lives at `context/.init-adrian-state.md`; it can be deleted once Trevor is satisfied with the context files.
- Development must never touch the real vault: fixture folders for tests, a scratch vault for the dev server (see `ai-workflow-rules.md`).
