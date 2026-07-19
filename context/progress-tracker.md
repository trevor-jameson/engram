# Progress Tracker

Update after every meaningful implementation change. Retention policy: `ai-workflow-rules.md` §Keeping Docs in Sync — keep this file to roughly one page; completed units compact to one line; durable decisions migrate to their owning context file.

## Current Phase

- Implementation, units 01–05 complete (2026-07-19).

## Next Up

- Unit 06: review flow UI & card rendering (`web/` — one-card-at-a-time review, markdown + code + KaTeX rendering, pass/lapse grading) per `context/specs/06-review-ui.md`.

## In Progress

- None.

## Open Questions

- Actual vault path on Trevor's machine (runtime configuration only, never hardcoded — goes in `engram.config.json` at first run).
- Free-recall grading and scheduler feedback from recall: deferred "for now" — revisit after v1.

## Completed

- v1 decomposition: `context/specs/00-build-plan.md` and specs 01–10 (2026-07-18).
- Unit 01 — workspace scaffold & config: pnpm workspace, strict TS, ESLint, config loader, scratch vault (2026-07-18).
- Unit 02 — shared types & vault card I/O: parse/write/update with byte-stable frontmatter patching, 52 tests (2026-07-18).
- Unit 03 — scheduler core: pure Leitner/queue/leech functions, purity lint-enforced, 36 tests (2026-07-19).
- Unit 04 — session & grading API: Hono routes over vault+scheduler, injectable clock/RNG, 15 route tests (2026-07-19).
- Unit 05 — web shell & theme: full `ui-context.md` token themes, 720px column, recall→review→triage shell, typed API client (2026-07-19).
- Context-drift mitigation pass: fact-ownership map + drift-repair rule in `ai-workflow-rules.md`, de-dup of restated facts across context files, `design-brief.md` retired (schema absorbed into `architecture.md`), `scripts/check-context-drift.sh` tripwire added to per-unit verification (2026-07-19).

## Dependency Justifications

All pre-pinned in the build plan / specs unless noted; zero-dep bias per `ai-workflow-rules.md`.

- Dev-only (unit 01): `typescript` ^5.9 (pinned — typescript-eslint 8.x cannot parse TS 7), `eslint`/`@eslint/js`/`typescript-eslint`, `vitest`, `vite`, `@types/node`. No runtime TS runner: Node 22.18+ type stripping.
- Runtime (unit 02): `gray-matter` — sole frontmatter parser/writer per `code-standards.md`.
- Runtime (unit 04): `hono` + `@hono/node-server` (official Node adapter; enforces loopback bind).
- Runtime (unit 05): `react`/`react-dom` + types, `@mui/material`, `@mui/icons-material`, `@vitejs/plugin-react`, `@emotion/react`/`@emotion/styled` (MUI's required styling peer — part of the MUI decision, not a new choice).

## Session Notes

- The interview record lives at `context/.init-adrian-state.md`; historical — it may reference the retired `design-brief.md`. Delete once Trevor no longer wants the record.
