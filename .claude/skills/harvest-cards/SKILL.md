---
name: harvest-cards
description: Mine the current Claude session for demonstrated knowledge gaps, surprises, and notable technical learnings; draft flashcards per the Engram schema; write user-approved cards to the real vault's flashcards/ folder.
---

# harvest-cards — session-to-flashcards triage

Turn this session's conversation into Engram flashcards. You are running the app's
own inbox-triage step manually, with the session transcript as the inbox. Trevor is
the gatekeeper: you draft, he selects; never write an unapproved card.

Read `context/learning-principles.md` before drafting if it isn't already in
context — fronts that violate it are wrong even if factually accurate.

## Step 1 — Harvest candidates from the session

Scan the full current conversation for card material, in three tiers (tag each
candidate with its tier):

1. **Demonstrated gap** — Trevor asked for an explanation, was corrected, made or
   observed a real mistake (including mistakes you made that he had to understand),
   or went off to research something. Strongest evidence; prioritize these.
2. **Surprise** — Trevor explicitly reacted to something as new ("I hadn't
   considered this").
3. **Notable** — transferable technical knowledge surfaced in the session with no
   explicit reaction. Weakest tier; include only genuinely non-obvious items.

Scope: **everything technical** — AI-workflow knowledge, bash, git, TypeScript,
architecture patterns, anything. Do NOT harvest: project-specific trivia already
recorded in `context/` or the code (that's what those files are for), opinions,
or facts Trevor demonstrably already knew.

## Step 2 — Draft cards

For each candidate, draft a card obeying the schema and principles:

- **Situation-shaped front** (cue-indexing): the front is the moment future-Trevor
  will be in — a symptom, a decision, a prediction prompt — never "What is X?".
  Recreate the *actual situation from this session* where possible; it is a
  ground-truth retrieval context.
- **Type** is one of `symptom-cause`, `decision-tradeoff`, `prediction`, `problem`,
  `definition`. Use `definition` only when a term→meaning card is deliberately the
  right shape.
- **Back**: the answer plus the one-line "why", concise. Code in fenced blocks,
  math in `$...$`/`$$...$$` if needed.
- **Body format**: `Q:` line(s), blank line, `A:` line(s) — front runs from `Q:`
  to the first line beginning `A:` (see `context/architecture.md` §Storage Model
  for the authoritative schema and a reference card).

## Step 3 — Present for selection

Present all drafts in chat as a numbered list, each showing tier, `type`, and the
full `Q:`/`A:` text. Then ask Trevor which to create (select/edit/reject —
`AskUserQuestion` with multiSelect is fine for ≤4 candidates; a numbered list and
a plain "which ones?" otherwise). Apply any edits he gives verbatim.

## Step 4 — Write approved cards

Determine the target: read `vaultPath` from `engram.config.json` in the repo root
and write to `<vaultPath>/flashcards/`. Harvested cards are *study content* — the
"never write to the real vault" rule in `ai-workflow-rules.md` governs development
(tests, dev server), not this user-invoked study action. Only if no
`engram.config.json` exists, fall back to `scratch-vault/flashcards/` and tell
Trevor the cards landed in the disposable dev vault.

The real vault is a local git repo (`~/engram-vault`, initialized 2026-07-19).
After writing, commit the new cards there:
`git -C <vaultPath> add -A && git -C <vaultPath> commit -m "Harvest cards from Claude session <YYYY-MM-DD>."`

Per card:

- **Filename**: `<kebab-slug-of-front>-<YYYYMMDDHHmmss>.md` — slug from the front's
  key words, truncated ~40 chars; timestamp = now, incremented by one second per
  file if writing several in the same second (IDs must be unique).
- **Frontmatter** (exact field order and shapes — match existing cards):

  ```markdown
  ---
  box: 1
  due: <tomorrow, YYYY-MM-DD>
  lapses: 0
  created: <today, YYYY-MM-DD>
  source: claude-sessions
  type: <chosen type>
  ---
  ```

  `box: 1`, `lapses: 0`, `created` = today, `due` = today + 1 — these mirror
  `newCardDefaults` in `server/scheduler/leitner.ts`; if that function changes,
  follow it, not this file.
- **`source` is always `claude-sessions`** (fixed provenance label — decided
  2026-07-19). Never invent per-topic or per-date sources.

## Step 5 — Verify and report

- Confirm each written file parses: `Q:` before `A:`, complete frontmatter, valid
  YAML (quote `source`/string values only if YAML requires it; match the style of
  existing cards in the folder).
- Report the written filenames and a one-line summary per card. Do not update
  `context/progress-tracker.md` — harvesting cards is study content, not
  implementation progress.
