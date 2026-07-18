# Engram v1 Build Plan

Ordered build units for v1. One unit at a time; a unit is done only when every
item in `ai-workflow-rules.md` → "Before Moving to the Next Unit" passes. Each
unit has a spec file in this folder; implement against the spec, not from
memory. If a spec conflicts with a context file, the context file wins — fix
the spec first.

## Unit order

| # | Unit | Spec | Boundaries touched |
|---|------|------|--------------------|
| 01 | Workspace scaffold & config | `01-scaffold.md` | repo root, `server/`, `web/`, `shared/` (empty shells) |
| 02 | Shared types & vault card I/O | `02-vault-io.md` | `shared/`, `server/vault/` |
| 03 | Scheduler core (pure) | `03-scheduler.md` | `server/scheduler/`, `shared/` |
| 04 | Session & grading API | `04-session-api.md` | `server/api/` |
| 05 | Web shell & theme | `05-web-shell.md` | `web/` |
| 06 | Review flow UI & card rendering | `06-review-ui.md` | `web/` |
| 07 | Free recall & session log | `07-free-recall.md` | `server/vault/`, `server/api/`, `web/` (split steps) |
| 08 | Inbox capture & triage | `08-inbox.md` | `server/vault/`, `server/api/`, `web/` (split steps) |
| 09 | Leech rewrite flow | `09-leech-rewrite.md` | `server/api/`, `web/` (split steps) |
| 10 | v1 acceptance pass | `10-acceptance.md` | none (verification only) |

Dependency chain is strictly linear: each unit assumes all earlier units are
done and verified.

## Rules that shape every unit

- Units 07–09 each touch multiple boundaries; their specs break work into
  ordered steps so no single implementation step mixes `server/scheduler/`
  with I/O code, or `web/` with `server/api/` (per `ai-workflow-rules.md` →
  "When to Split Work").
- All file-I/O tests run against fixture folders; the dev server points at a
  scratch vault, never the real vault.
- New dependencies beyond those already pinned (Hono, gray-matter,
  unified/remark, KaTeX, MUI + @mui/icons-material, React, Vite, and the
  dev toolchain of unit 01) require written justification in
  `progress-tracker.md` first.

## File-format decisions (all signed off 2026-07-18)

These formats outlive the app (`code-standards.md`); any future change again
requires explicit user sign-off. The adopted formats live in the unit specs:

1. **Card file naming / card ID scheme** — `02-vault-io.md`. Amendment:
   leech rewrites never rename the file.
2. **Session-log file format** — `07-free-recall.md`.
3. **Inbox capture storage format** — `08-inbox.md`. Amendment: inbox items
   are deleted by exact line-content match, never by index.

The card frontmatter schema itself (`box`, `due`, `lapses`, `created`,
`source`, `type`) is already signed off in `architecture.md`.

## Explicitly not planned in v1

Everything under `project-overview.md` → Out of Scope. No unit may sneak in
metrics dashboards, recall grading, multi-deck support, images, imports,
mobile polish, or any network-touching capability.
