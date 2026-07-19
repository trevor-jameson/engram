# Code Standards

## General

- Keep modules small and single-purpose; do not combine vault I/O, scheduling logic, and HTTP handling in one file.
- Fix root causes; do not layer workarounds on top of parsing or scheduling bugs.
- Do not mix unrelated concerns in one component or route.
- Dependency policy (zero-dep bias, written justification) and package-manager rule (pnpm only): owned by `ai-workflow-rules.md` §Scoping Rules.
- Never rewrite card body content programmatically. The scheduler mutates only the review-state frontmatter fields (`box`, `due`, `lapses`); card creation and user-initiated edit endpoints are the only code paths that write the full frontmatter block or body content.
- File-format change sign-off rule: owned by `ai-workflow-rules.md` §When to Split Work.
- Server builds are typecheck-only (`tsc --noEmit`); nothing emits or executes `dist/` — Node 22.18+ runs server TS source directly via type stripping.

## TypeScript

- Enable and enforce strict mode throughout the project.
- Do not use `any`; define explicit interfaces or narrowly scoped types for all data shapes.
- Validate unknown external input (parsed YAML frontmatter, request bodies, file contents) at system boundaries before trusting it.
- Define shared types (Card, SessionLog, queue DTOs) in `shared/` and import them from both `server/` and `web/`; do not duplicate type definitions across the two.

## server/vault (filesystem access)

- Confine all filesystem reads and writes to `server/vault/`; no other folder may import `fs` or construct vault paths.
- Use gray-matter as the only frontmatter parser/writer; do not introduce a second frontmatter library.
- Preserve markdown files as valid, human-readable markdown that renders correctly in Obsidian.
- Guarantee card parse-to-write round-trips are byte-stable except for intentionally changed frontmatter fields; verify this per unit of work.
- Require every card write to include a complete frontmatter block matching the card schema owned by `architecture.md` §Storage Model.
- Require every card-creation path to set `source`; no creation path may omit it.
- Run all file-I/O tests against fixture folders, never the real vault.
- Point the dev server at a scratch vault, never the user's real vault.

## server/scheduler (pure logic)

- Write scheduler code as pure functions only; do not import fs, vault paths, or network modules into `server/scheduler/`.
- Cover box transitions, cap/floor behavior, problem-card weighting, and leech detection with unit tests for any change to this folder.
- Do not let scheduler functions read or write files directly; they receive and return in-memory data structures only.

## server/api (Hono routes)

- Bind the server to localhost only.
- Validate and parse request input before any route logic runs.
- Expose card IDs in all API responses; never expose filesystem paths.
- Keep route handlers focused on a single responsibility; delegate parsing to `server/vault/` and scheduling to `server/scheduler/`.
- Return JSON from every route: success responses carry the resource or DTO directly; error responses return `{ error: string }` with an appropriate HTTP status code.
- Make zero network requests to anything outside localhost from the server (no CDNs, no telemetry, no external APIs).

## web (React / Vite / MUI)

- Talk to the API only; never construct or reference filesystem paths in `web/`.
- Add client-side state and effects only where browser interactivity requires them.
- Bundle KaTeX and all other assets locally; make zero network requests to any external host, including fonts and CDNs.
- Use unified/remark as the only markdown rendering pipeline; do not introduce a second markdown library.

## Styling

- Source all colors from the MUI theme palette (light/dark system themes); do not hardcode hex values in components — reference theme tokens (e.g. `theme.palette.primary.main`).
- Use `theme.shape.borderRadius: 8` as the default radius; use 12 for cards and dialogs.
- Do not exceed MUI elevation 2 for shadows.
- Render card content markdown at 1.125rem/1.7 line height.
- Render code blocks in ui-monospace.

## Data and Storage

Storage model, card/log/inbox file formats, and the no-database rule are owned by `architecture.md` §Storage Model. Standards on top of it:

- Do not introduce a second store for anything derivable from the vault files.
- Keep card body content under user control; the app never generates or rewrites body content.

## File Organization

Folder boundaries are owned by `architecture.md` §System Boundaries. The per-folder sections above are the enforcement rules for those boundaries, not a second definition of them.
