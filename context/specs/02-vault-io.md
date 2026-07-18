# Unit 02 — Shared types & vault card I/O

## Sign-off required before starting

**Card ID / file naming scheme (proposal):** a card's ID is its filename
without the `.md` extension, unique within the vault's `flashcards/` folder.
Files created by the app are named `<kebab-slug-of-front>-<YYYYMMDDHHmmss>.md`
(slug truncated ~40 chars) to guarantee uniqueness without an ID field in
frontmatter. Hand-authored files with any name are valid cards; their basename
is their ID. The API and web layer only ever see IDs, never paths.

## Goal

`server/vault/` can enumerate, parse, validate, and write card files with
byte-stable round-trips; `shared/` defines the types both sides will use.

## Scope

- `shared/`: `Card` (id + frontmatter fields + body), `CardType` slug union
  (`symptom-cause | decision-tradeoff | prediction | problem | definition`),
  frontmatter schema type (`box` 1–7, `due`, `lapses`, `created`, `source`,
  `type`), and error shapes.
- `server/vault/`:
  - `listCards()` — enumerate `flashcards/` under the configured vault path.
  - `readCard(id)` / `parseCard(raw)` — gray-matter parse + boundary
    validation (reject missing/invalid frontmatter fields with typed errors;
    never trust parsed YAML shape).
  - `writeCard(card)` — full-card write (creation/edit path).
  - `updateFrontmatter(id, patch)` — the scheduler-facing write: mutates only
    `box`, `due`, `lapses`; body and remaining frontmatter byte-identical.
  - `deleteCard(id)`.
- Invalid card files (bad YAML, missing fields) are surfaced as typed
  errors/skipped-with-report, never silently dropped, and never "fixed" by
  rewriting the user's file.

## Out of scope

- Session logs and inbox storage (units 07/08). Scheduling logic. HTTP.

## Verification

- Fixture-folder tests: parse valid cards of every type; reject each missing
  required field; reject `source`-less writes at the API of this module.
- Round-trip test: read → `updateFrontmatter` → write produces a file
  byte-identical outside the intentionally changed fields — including
  preserved body whitespace, code fences, and `$$...$$` blocks.
- Open a written fixture card in Obsidian (manual): frontmatter, code block,
  and math render correctly.
- Standard unit-completion checklist (`ai-workflow-rules.md`).
