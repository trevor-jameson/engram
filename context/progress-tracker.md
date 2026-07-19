# Progress Tracker

Update after every meaningful implementation change. Retention policy: `ai-workflow-rules.md` §Keeping Docs in Sync — keep this file to roughly one page; completed units compact to one line; durable decisions migrate to their owning context file.

## Current Phase

- Implementation, units 01–06 complete (2026-07-19).

## Next Up

- Unit 07: free recall & session log (`server/vault/` + `server/api/` + `web/`, split steps) per `context/specs/07-free-recall.md`.

## In Progress

- None.

## Open Questions

- Free-recall grading and scheduler feedback from recall: deferred "for now" — revisit after v1.

## Completed

- v1 decomposition: `context/specs/00-build-plan.md` and specs 01–10 (2026-07-18).
- Unit 01 — workspace scaffold & config: pnpm workspace, strict TS, ESLint, config loader, scratch vault (2026-07-18).
- Unit 02 — shared types & vault card I/O: parse/write/update with byte-stable frontmatter patching, 52 tests (2026-07-18).
- Unit 03 — scheduler core: pure Leitner/queue/leech functions, purity lint-enforced, 36 tests (2026-07-19).
- Unit 04 — session & grading API: Hono routes over vault+scheduler, injectable clock/RNG, 15 route tests (2026-07-19).
- Unit 05 — web shell & theme: full `ui-context.md` token themes, 720px column, recall→review→triage shell, typed API client (2026-07-19).
- Unit 06 — review flow UI & card rendering: shared `CardMarkdown` renderer (remark + GFM + locally bundled KaTeX), pure reveal/grade reducer, one-card-at-a-time `ReviewScreen` with retry-safe grading, 14 web tests, 5 scratch-vault render-check cards (2026-07-19).
- Context-drift mitigation pass: fact-ownership map + drift-repair rule in `ai-workflow-rules.md`, de-dup of restated facts across context files, `design-brief.md` retired (schema absorbed into `architecture.md`), `scripts/check-context-drift.sh` tripwire added to per-unit verification (2026-07-19).

## Dependency Justifications

All pre-pinned in the build plan / specs unless noted; zero-dep bias per `ai-workflow-rules.md`.

- Dev-only (unit 01): `typescript` ^5.9 (pinned — typescript-eslint 8.x cannot parse TS 7), `eslint`/`@eslint/js`/`typescript-eslint`, `vitest`, `vite`, `@types/node`. No runtime TS runner: Node 22.18+ type stripping.
- Runtime (unit 02): `gray-matter` — sole frontmatter parser/writer per `code-standards.md`.
- Runtime (unit 04): `hono` + `@hono/node-server` (official Node adapter; enforces loopback bind).
- Runtime (unit 05): `react`/`react-dom` + types, `@mui/material`, `@mui/icons-material`, `@vitejs/plugin-react`, `@emotion/react`/`@emotion/styled` (MUI's required styling peer — part of the MUI decision, not a new choice).
- Runtime (unit 06): `react-markdown` (the React binding of the pinned unified/remark pipeline — it is remark, not a second markdown library), `remark-math` + `rehype-katex` (the unified plugins that connect `$...$`/`$$...$$` to KaTeX), `katex` (pinned; bundled locally, zero network), `remark-gfm` (GFM extension of the same remark pipeline so renderer dialect matches Obsidian per spec 06).

## Session Notes

- Real vault established 2026-07-19: `~/engram-vault` (`flashcards/` + `logs/`), its own local-only git repo; `engram.config.json` written pointing at it. Dev server unaffected (its `dev` script pins `ENGRAM_VAULT_PATH=../scratch-vault`, which overrides the config). `/harvest-cards` now targets the real vault and commits there after writing.

- The interview record lives at `context/.init-adrian-state.md`; historical — it may reference the retired `design-brief.md`. Delete once Trevor no longer wants the record.
