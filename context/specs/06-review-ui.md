# Unit 06 — Review flow UI & card rendering

## Goal

The core review experience: work through today's queue one card at a time —
front → reveal → grade — with full markdown, code-block, and KaTeX rendering.

## Scope

- **Card renderer** (shared component, reused by triage/rewrite later):
  unified/remark pipeline rendering card markdown at 1.125rem/1.7;
  fenced code blocks in ui-monospace on the paper-offset tint; `$...$` and
  `$$...$$` via locally bundled KaTeX (fonts/CSS bundled, zero network),
  math sized to match surrounding text. Renderer output must visually match
  what Obsidian shows for the same file (same syntax dialect).
- **Review screen**: shows front only; "Reveal" shows the back; Pass /
  Lapse buttons (success.main / error.main) appear only after reveal; grade
  calls `POST /api/cards/:id/grade` and advances to the next card.
- Card metadata (source, box, due) small, `text.secondary`, below content.
- Progress within the session shown quietly (e.g. "4 of 12") — informational
  only; no backlog counts, no overdue totals, no guilt mechanics anywhere.
- Empty-queue day: review step states there are no reviews today and moves
  on — the session continues to triage (never framed as a problem).
- Queue is fetched once at session start and worked through in order;
  grading failures surface an error and allow retry without losing position.

## Out of scope

- Free recall (unit 07), triage (unit 08), leech surfaces (unit 09).
- Any scheduler-feedback UI beyond pass/lapse. Images in cards.

## Verification

- Scratch-vault cards covering: plain prose, fenced code, inline `$...$`,
  block `$$...$$`, and a mixed card — all render correctly in both themes
  (success criterion 9). Same files verified visually in Obsidian.
- Full manual session: reveal-before-grade enforced, pass/lapse update
  scratch-vault frontmatter correctly, queue advances, completion hands off
  to the (placeholder) triage screen.
- Network panel: KaTeX assets load from localhost only.
- Component tests for the renderer (given markdown → expected structure)
  and the reveal/grade state machine.
- Standard unit-completion checklist.
