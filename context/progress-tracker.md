# Progress Tracker

Update this file after every meaningful implementation change.

## Current Phase

- Not started. Context files completed 2026-07-12; no code exists yet.

## Current Goal

- None yet. First step: decompose v1 into ordered build units (`context/specs/00-build-plan.md`) before writing any code.

## Completed

- None yet.

## In Progress

- None yet.

## Next Up

- Decompose the v1 features (see `project-overview.md` → In Scope) into ordered build units with per-unit specs.
- First likely build unit after planning: scaffold the pnpm workspace (`server/`, `web/`, `shared/`) with typecheck/lint/test/build scripts.

## Open Questions

- Post-rewrite leech state: after a leech's front is rewritten, what happens to its `box` and `lapses`? (If `lapses` stays ≥4, the card would immediately re-flag on its next lapse; a reset to 0 treats the rewrite as a new card front. Needs a user decision before implementing the rewrite flow.)
- Icon set: `@mui/icons-material` proposed as the zero-extra-dependency default; unconfirmed.
- Exact dev/prod port and the config-file format (vs env var) for the vault path.
- Actual vault path on Trevor's machine (needed only at runtime configuration, never hardcoded).
- Free-recall grading and scheduler feedback from recall: deferred "for now" — revisit after v1.

## Architecture Decisions

- Hono over Express for the server: lighter, TypeScript-first, fits the thin-scheduler ethos (decided during context drafting, 2026-07-12).
- gray-matter (frontmatter), unified/remark (markdown), KaTeX bundled locally (math) as the file/rendering toolchain — mainstream, minimal choices matching invariants 2 and 3.
- pnpm as the only package manager.

## Session Notes

- The interview record lives at `context/.init-adrian-state.md`; it can be deleted once Trevor is satisfied with the context files.
- Development must never touch the real vault: fixture folders for tests, a scratch vault for the dev server (see `ai-workflow-rules.md`).
