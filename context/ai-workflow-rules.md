# AI Workflow Rules

## Approach

Build Engram incrementally using a spec-driven workflow. The seven files in `context/` (project-overview.md, architecture.md, code-standards.md, ai-workflow-rules.md, ui-context.md, progress-tracker.md, learning-principles.md) define what to build, how to build it, and the current state of progress. Read all context files in `context/` at the start of every session, before writing or editing any code. Always implement against these specs — do not infer or invent behavior from scratch. Update `context/progress-tracker.md` before ending any work session, regardless of whether the current unit is finished.

## Scoping Rules

- Work on exactly one build unit at a time.
- Never start a new build unit while the current unit is unverified.
- Prefer small, verifiable increments over large speculative changes.
- Do not combine unrelated system boundaries in a single implementation step. The system boundaries are `server/vault/` (filesystem code only), `server/scheduler/` (pure logic, no I/O), `server/api/` (Hono routes), `web/` (React UI, API-only), and `shared/` (shared types).
- Use pnpm for all package management. Never use npm.
- Justify any new dependency in writing in `context/progress-tracker.md` before adding it. Default to zero dependencies — keep the scheduler thin.

## When to Split Work

Split an implementation step if it combines:

- Changes to `server/scheduler/` with changes to any I/O-touching code (`server/vault/`, `server/api/`, `web/`)
- UI changes (`web/`) with API route changes (`server/api/`)
- Multiple unrelated API routes in `server/api/`
- Behavior not clearly defined in the context files
- A change to file formats (card frontmatter schema, session-log format) with any other implementation work — file-format changes require explicit user sign-off before implementation, as a separate step, since these files outlive the app

If a change cannot be verified end to end quickly, the scope is too broad — split it.

## Handling Missing Requirements

- Do not invent product behavior not defined in the context files.
- If a requirement is ambiguous, resolve it in the relevant context file before implementing.
- If a requirement is missing, add it as an open question in `progress-tracker.md` before continuing.

## Protected Files

Do not modify the following unless explicitly instructed:

- `context/*` — except `context/progress-tracker.md`, which must be updated at the end of every work session
- Anything inside a configured vault path
- `engram.config.json`, `.env`, and any other config file holding the vault path

Never write to the real vault during development. Run all file-I/O tests against fixture folders. Point the dev server at a scratch vault, never the real vault.

## Scheduler-Specific Rules

- Keep `server/scheduler/` pure: no I/O imports of any kind.
- Include unit tests with any change to `server/scheduler/` covering: box transitions, cap/floor behavior, problem-card weighting, and leech detection.

## Keeping Docs in Sync

Update the relevant context file whenever implementation changes:

- System architecture or boundaries → `architecture.md`
- Storage model decisions (card frontmatter schema, session-log format) → `architecture.md` — and get explicit user sign-off before implementing the change itself
- Code conventions or standards → `code-standards.md`
- Feature scope → `project-overview.md`
- Work completed, in-progress, or blocked, plus new dependency justifications and open questions → `progress-tracker.md`

## Before Moving to the Next Unit

A build unit is not "done" until all of the following pass:

1. Typecheck and lint pass (`pnpm typecheck`, `pnpm lint`).
2. Unit tests pass (`pnpm test`).
3. The six invariants defined in `context/architecture.md` hold. Verify in particular by round-tripping a card file through parse→write and confirming byte-stability except for intentionally changed frontmatter fields — this check exercises invariants 2 and 5 (the round-trip rule itself is a code-standards verification requirement, defined in `code-standards.md`).
4. Manually drive the affected flow in the browser against the scratch vault.
5. `pnpm build` passes.
6. `progress-tracker.md` reflects the completed work.

Do not begin the next build unit until every item above is satisfied for the current unit.
