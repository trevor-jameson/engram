# Progress Tracker

Update this file after every meaningful implementation change.

## Current Phase

- Planning complete (2026-07-18). Build plan and per-unit specs written to `context/specs/` (00-build-plan + units 01–10); no code exists yet.

## Current Goal

- Begin unit 01 (workspace scaffold & config) once Trevor has reviewed the build plan.

## Completed

- v1 decomposition: `context/specs/00-build-plan.md` and specs 01–10 (2026-07-18).

## In Progress

- None.

## Next Up

- Trevor reviews `context/specs/` — especially the three file-format proposals needing sign-off (card ID/naming in spec 02, session-log format in spec 07, inbox format in spec 08).
- Unit 01: scaffold the pnpm workspace (`server/`, `web/`, `shared/`) with typecheck/lint/test/build scripts, config loader, scratch vault.

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

## Session Notes

- The interview record lives at `context/.init-adrian-state.md`; it can be deleted once Trevor is satisfied with the context files.
- Development must never touch the real vault: fixture folders for tests, a scratch vault for the dev server (see `ai-workflow-rules.md`).
