# Engram

## Overview

Engram is a local-first spaced-repetition flashcard app that runs as a thin scheduler over a folder of plain markdown files — one card per file, review state in YAML frontmatter — inside an Obsidian vault. It is built for a single user (Trevor, a 10-year teacher and software engineer studying CS/math textbooks) as the first feature of a larger, intended lifelong continuous-learning system supporting an autodidact habit; v1 is the flashcard leg of that system. The app makes no network calls, has no accounts, and stores nothing outside the vault, so the card content stays private and greppable with ordinary tools. It is designed around five scientific commitments to durable learning, documented in full in `learning-principles.md`: (1) cue-indexing — cards are indexed by situation, not term; (2) harvest, don't predict — cards come from demonstrated failures, not guessed importance; (3) successive relearning — each session opens with delayed free recall of prior material; (4) interleaving — the review queue shuffles across sources; (5) leech-as-bad-indexing — chronically failed cards get rewritten, not re-drilled.

## Goals

1. A daily review session (free recall + review queue + inbox triage) always completes in roughly 15 minutes or less, regardless of backlog size.
2. Card content and review state persist entirely as human-readable markdown+YAML files in the vault, with zero app state that cannot be rebuilt from those files.
3. Zero network requests and zero telemetry at runtime, verifiable by inspection of server code and network traffic.
4. Every card created through the app carries a required `source` field, with no code path that permits omitting it.
5. Cards with technical content (fenced code blocks, `$...$` and `$$...$$` KaTeX math) render correctly in-app using the same syntax Obsidian renders natively.

## Core User Flow

1. User starts the local server (`localhost`) and opens the app in a browser.
2. App loads the vault folder, parsing all card markdown files and their YAML frontmatter to rebuild the review-queue index in memory.
3. Session opens with a delayed free-recall prompt: "Last session: {sources studied} — brain dump before reviewing." User types a free-text recall attempt in-app; it is ungraded and saved verbatim to a session-log file in the vault.
4. App builds today's review queue: due cards selected most-overdue-first up to a cap of 25 (problem-type cards count 2 against the cap, all others count 1); if fewer than 5 cards are due, the queue is filled forward with the soonest-due cards to reach a floor of 5; the queue is then ordered so no two consecutive cards share the same `source` (ties broken randomly).
5. User reviews each card in the queue: sees the front, recalls the answer, reveals the back, and grades the attempt pass or lapse.
6. On each grade, the scheduler updates that card's frontmatter: pass moves the card up one Leitner box (interval increases), lapse moves it down one box (never resets to box 1); a lapse also increments the card's lifetime lapse count, and a 4th+ lifetime lapse flags the card as a leech, pulling it out of normal rotation.
7. User finishes the review queue (or it was empty/short, per the floor rule) and proceeds to inbox triage.
8. App shows any pending inbox captures (one-line raw text entries added any time during the day via the always-available capture action) and any leech-flagged cards awaiting rewrite.
9. For each inbox item, user either converts it into a new card by choosing a card-type template (symptom→cause, decision→trade-off, prediction, problem, or definition) and filling in a situation-shaped front, a back, and a required `source`, or discards it.
10. For each leech-flagged card, user is prompted to rewrite the front into a situation-shaped cue (or delete the card); once rewritten, the card re-enters normal rotation with fully reset scheduling state (`box` → 1, `lapses` → 0) — the rewrite created a new cue, so the card earns its intervals from scratch like a new card.
11. Session ends. Overflow due cards not reached today (if the cap was hit) carry forward to tomorrow, ordered by overdue-ness, with no backlog messaging or guilt mechanic. User closes the app/tab; the server keeps running or is stopped independently of session state, since all state lives in the vault files.

## Features

### Session Flow

- Delayed free-recall prompt at session start, typed in-app, ungraded, logged to a per-session file in the vault for later triage mining.
- Review queue with pass/lapse grading per card.
- End-of-session inbox triage: convert raw captures into cards via type templates, or discard.
- A 0-due day still runs free recall and inbox triage (never skipped just because no cards are due).

### Card Management

- One markdown file per card; YAML frontmatter holds `box` (1–7), `due`, `lapses`, `created`, `source` (required), and `type`.
- The `type` field stores one of the slugs `symptom-cause`, `decision-tradeoff`, `prediction`, `problem`, `definition`; the arrows used elsewhere in these docs (symptom→cause, decision→trade-off) are display names for these slugs.
- Card CRUD operates directly on the vault folder: create, edit, delete are file reads/writes.
- Card-type templates: symptom→cause, decision→trade-off, prediction, problem (front = problem spec, back = worked solution — first-class for math), definition (available but deliberately chosen, never the default).
- Always-available, near-zero-friction one-line inbox capture, decoupled from full card authoring.

### Scheduler

- Softened Leitner system: boxes 1–7 mapped to intervals of 1, 2, 4, 8, 16, 32, 64 days.
- Pass moves a card up one box; lapse moves it down one box (never resets to box 1).
- Review-queue cap of 25/day; card creation itself is unbounded.
- Floor-as-fill of 5: if fewer than 5 cards are due, soonest-due cards are pulled forward to fill the queue to 5; this is never framed as an obligation.
- Queue ordering: most-overdue-first up to the cap, then reordered so no two consecutive cards share `source` (ties random); `type: problem` cards count 2 against the cap, all other types count 1.
- Overflow beyond the cap carries to the next day, ordered by overdue-ness; no backlog-guilt UI or messaging.
- Leech detection: a card with 4+ lifetime lapses is flagged, removed from normal rotation, and routed to the rewrite flow until rewritten or deleted.

### Rendering

- Markdown rendering including fenced code blocks.
- KaTeX math rendering for `$...$` (inline) and `$$...$$` (block) syntax, matching Obsidian's native math syntax; KaTeX is bundled locally (no CDN/network fetch).

## Scope

### In Scope

1. Daily session flow: delayed free recall, review queue, inbox triage.
2. Card CRUD over the vault folder: markdown+YAML parsing and writing, type-template card creation, inbox capture.
3. Softened Leitner scheduler: boxes, demotion/promotion, cap/floor selection, problem-type double-weighting, leech flagging.
4. Leech rewrite flow: surfacing flagged cards and prompting a new situation-shaped front.
5. Markdown + code block + KaTeX rendering (`$...$` / `$$...$$`), KaTeX bundled locally.

### Out of Scope

- Authentication, accounts, multi-user support — permanently, not just for v1.
- Any network calls, telemetry, or cloud sync of any kind — permanently; vault sync (e.g. via Obsidian Sync, Syncthing, git) is the user's own concern, not the app's.
- Metrics dashboard, including retention-per-box statistics (deferred to v2; the leech list is effectively covered in v1 via the rewrite flow).
- "Fired in real life" tap/mechanic (aspirational idea, unscheduled).
- Grading or scheduler feedback derived from the free-recall step (deferred; free recall is captured but not graded for now).
- Mobile support or responsive layout polish.
- Images embedded in cards.
- Anki import.
- Multiple decks or source-based archival (v1 only lays groundwork via the required `source` field; archival that retires cards by source is post-v1).

## Success Criteria

1. Starting the app with zero due cards still walks the user through free recall and inbox triage before the session ends.
2. Grading a card pass moves it exactly one Leitner box up and updates its `due` date to match that box's interval, verifiable by reading the card's frontmatter before and after.
3. Grading a card lapse moves it exactly one Leitner box down (never to box 1) and increments its lifetime lapse count in the frontmatter.
4. A card that reaches 4 lifetime lapses is excluded from the normal review queue on the next session and appears in the rewrite flow instead.
5. With more than 25 cards due, the review queue presented to the user contains at most 25 weighted slots (problem cards counting as 2), and the excluded due cards reappear at the top of tomorrow's queue.
6. With fewer than 5 cards due, the queue is filled to 5 using the soonest-due not-yet-due cards.
7. No two consecutive cards in a rendered queue share the same `source` value, except when ties are unavoidable (fewer distinct sources than queue length).
8. Attempting to create a card without a `source` value is rejected or blocked by the UI — no card file is written without one.
9. A card containing a fenced code block and a `$$...$$` math block renders both correctly (formatted code block, typeset math) in the browser.
10. With the machine's network access disabled, the app still starts, serves the UI, and completes a full session (free recall, review, triage) without error.
11. Deleting the app's in-memory/rebuildable index (if any) and restarting the server reconstructs an identical review queue from the vault folder alone.
12. Every markdown file the app writes remains a valid Obsidian note: opening the vault in Obsidian shows correctly rendered frontmatter, code blocks, and math for any card the app has created or modified.
