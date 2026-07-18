# Unit 10 — v1 acceptance pass

## Goal

Demonstrate every success criterion in `project-overview.md` against a
scratch vault, plus the invariants, before Engram touches the real vault.

## Scope

Verification only — no new features. Fixes discovered here are patches to
earlier units and follow the normal unit-completion checklist.

## The pass

Walk success criteria 1–12 in order, each as an observed behavior (not a
code-reading argument), recording results in `progress-tracker.md`:

1. Zero-due session still runs recall → triage.
2. Pass moves exactly one box up with matching `due` (read frontmatter
   before/after).
3. Lapse moves exactly one box down (never to 1 from ≥3) and increments
   `lapses`.
4. 4th lapse → excluded from next queue, present in rewrite flow.
5. 26+ weighted due → queue ≤ 25 weighted slots; excluded cards lead
   tomorrow's queue.
6. <5 due → filled to 5 with soonest-due.
7. No adjacent same-source cards where the mix allows.
8. Sourceless card creation impossible via UI and via curl.
9. Code fence + `$$...$$` card renders correctly in-app; same file correct
   in Obsidian.
10. **Network-off test**: disable machine network (or firewall the process);
    full session completes. Also verify the built web bundle contains no
    external URLs (grep dist output for `https?://` references to
    non-localhost hosts).
11. Kill and restart the server mid-day; queue rebuilds identically from
    files alone.
12. Every app-written file opened in Obsidian renders as a valid note.

Then confirm the six `architecture.md` invariants each have a concrete
passing check among the above (map them explicitly in the tracker).

## First real run

After the pass: Trevor creates `engram.config.json` pointing at the real
vault (his machine, his action — the app never writes this file), seeds or
authors initial cards, and runs the first real session. Any friction found
becomes tracker items, not ad-hoc fixes.

## Exit

`progress-tracker.md` updated: v1 declared complete, acceptance results
recorded, deferred items (metrics, recall grading, archival, "fired in real
life") listed under a v2 heading.
