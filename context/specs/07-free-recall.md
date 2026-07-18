# Unit 07 — Free recall & session log

## Format sign-off

Signed off by Trevor 2026-07-18.

**Session-log format:** one markdown file per session at
`logs/<YYYY-MM-DD>.md` beside `flashcards/` in the vault. Frontmatter:
`date`, `sources` (list of `source` values that appeared in that session's
queue). Body: `## Free recall` followed by the verbatim brain dump. The file
is a plain Obsidian note; triage mining of it stays manual in v1 (the file
is simply there to read). Re-running a session the same day appends a second
`## Free recall` section rather than overwriting.

## Goal

Every session opens with the delayed free-recall prompt, and the dump is
persisted to the vault; the prompt names the sources from the previous
session.

## Ordered steps (respecting split rules)

1. **`server/vault/`**: session-log read/write module — write today's log
   (create or append), read the most recent prior log (for its `sources`).
   Fixture tests; format per the signed-off proposal; round-trip stability
   applies to logs too.
2. **`server/api/`**: `GET /api/session/recall-context` → `{ lastSources:
   string[] | null }` (null on first-ever session); `POST /api/session/recall`
   → body `{ text: string }`, writes the log (empty text allowed — skipping
   the dump is permitted, never punished; sources recorded either way).
3. **`web/`**: recall screen — prompt "Last session: {sources} — brain dump
   before reviewing" (first-session variant when null), a plain textarea,
   one continue action that submits and advances to review. Ungraded, no
   scoring UI of any kind.

## Out of scope

- Grading or scheduler feedback from recall text (explicitly deferred).
- In-app display of past logs; triage mining automation.

## Verification

- Fixture tests for log write/append/read-latest.
- Route tests for both endpoints, including first-session null case.
- Manual: run two sessions against the scratch vault on simulated
  consecutive days; second session's prompt names the first session's
  sources; log files render correctly in Obsidian.
- A 0-due day still presents recall (success criterion 1, first half).
- Standard unit-completion checklist.
