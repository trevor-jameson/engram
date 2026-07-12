# Design Brief — carried over from prior design discussion (2026-07-12)

Context transferred from a conversation between Trevor and Claude in `../claude`.
Treat the **Decided** sections as prior user answers: confirm briefly rather than re-ask.
The **Still open** section lists questions this brief deliberately does not answer.
Deeper rationale lives in `../claude/learning-notes/` (7 Obsidian notes on the learning
science behind these choices); read them only if a design decision needs its "why."

## User & motivation (decided)

- Single user (Trevor), personal use, forever — no multi-user, no auth, no accounts.
- Privacy is a core motivation: he left Anki specifically to keep personal data local.
  **No network calls, no telemetry, no cloud sync** (vault sync is the user's concern, not the app's).
- Spaced repetition is a *keystone habit* for him. Design consequence: protecting the
  daily habit outranks clearing the backlog. Sessions must stay short and completable.
- He is a 10-year teacher + software engineer studying CS and math textbooks; cards
  will be technical (including math problems), so the format must handle code blocks
  and ideally math notation.

## Learning-plan abstraction the app serves (decided)

The app is the flashcard leg of a larger study protocol (closed-book recaps + practice
problems happen outside the app). Its scientific commitments:

1. **Encoding specificity / cue-indexing** — retrieval succeeds when the card front
   matches the question future-Trevor will actually be holding. Fronts are situations,
   not terms. Word→definition is the deliberate exception, never the default.
2. **Harvest, don't predict** — cards are sourced from demonstrated failures (gaps in
   recaps, errors in problems, real-life lookup events), not from "important-seeming" terms.
3. **Successive relearning** — each session opens with delayed free recall of the
   previous session's material.
4. **Interleaving** — review queue shuffles across sources/subjects, never blocked by topic.
5. **Desirable difficulty with feedback** — a chronically failed card is assumed to be
   *indexed wrong* (bad front), not unlearned → leech flow rewrites it.

## Card model (decided)

One card per markdown file; YAML frontmatter holds review state; body is Q/A.
Files are the single source of truth — human-editable, Obsidian-linkable, greppable.
Any index/cache the app keeps must be rebuildable from the files.

Reference schema (field names negotiable, semantics not):

```markdown
---
box: 3            # Leitner box 1–7
due: 2026-07-19
lapses: 1
created: 2026-07-12
source: "CLRS §11.2"
type: symptom-cause   # symptom-cause | decision-tradeoff | prediction | problem | definition
---
Q: Hash table lookups degrade toward O(n) as it fills — what two design choices govern when?
A: Load factor threshold + collision strategy (chaining degrades gracefully; open addressing cliffs near 0.7–0.8).
```

Card types: **symptom→cause**, **decision→trade-off**, **prediction**, **problem**
(front = problem spec, back = worked solution/checklist; first-class for math),
**definition** (allowed but must be deliberately chosen).

## Scheduler (decided)

- Softened Leitner: boxes with intervals **1, 2, 4, 8, 16, 32, 64 days**.
- Pass → up one box; lapse → **down one box** (not reset to box 1).
- **Leech detection: 4+ lifetime lapses** flags the card for rewrite (surface it in a
  dedicated flow prompting a new situation-shaped front), removing it from normal
  rotation until rewritten or deleted.

## Daily session flow (decided)

1. **Delayed free-recall prompt**: "Last session: {sources studied} — brain dump before
   reviewing." (Grading/storage mechanics: open question.)
2. **Review queue**: due cards, capped ~20–30, interleaved across sources. Overflow
   carries to tomorrow ordered by overdue-ness. Never guilt-trip about backlog.
3. **Inbox triage at session end**: convert raw captures into cards. Card creation UI
   presents the card-type templates, not a blank front — situation-shaped must be the
   path of least resistance.

**Inbox capture** is its own always-available, near-zero-friction action (one raw text
line, e.g. a lookup failure noticed during work), decoupled from card authoring.

## Metrics (decided, keep minimal)

- Retention rate per box (validates intervals).
- Leech list.
- Optional/aspirational: a "fired in real life" tap recording that a card's knowledge
  surfaced usefully at work — the only metric measuring the system's actual purpose.

## Candidate invariants (proposed — confirm with user)

1. Card files are the sole source of truth; all app state is rebuildable from the folder.
2. Every file the app writes remains valid, human-readable markdown that Obsidian renders.
3. The app makes zero network requests.
4. A daily session is always completable in ≤ ~15 minutes (cap enforces this).
5. The scheduler never deletes or rewrites card content — only frontmatter state; content
   changes are user actions.

## Still open (ask the user — do not assume)

- Interface form factor (CLI / TUI / Obsidian plugin / local web app) and stack.
- Exact free-recall prompt mechanics (graded? stored where? shown how?).
- Queue cap number; interleaving rule specifics.
- Whether math rendering (LaTeX) is v1 or later.
- v1 scope boundaries and out-of-scope list.
- All visual design (tokens, typography, layout) and process rules.
