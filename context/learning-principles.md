# Learning Principles — the "why" behind every design decision

Engram is not a generic flashcard tool — and not only a flashcard app: flashcards are
the first feature of an intended lifelong continuous-learning system. Every scheduling rule, UI default, and scope
decision traces back to five commitments from the learning-science literature. Agents
(and forgetful future Trevor): read this before proposing changes to session flow, card
templates, or the scheduler — a change that violates one of these is wrong even if it
"improves" the app by conventional standards.

Source: distilled 2026-07-12 from Trevor's learning notes (Obsidian vault,
`learning-notes/`: Encoding-Specificity Principle, Cue-Indexed External Memory,
Harvesting Retrieval Cues, Retrieval Practice Protocol, Tip-of-the-Tongue and
Externalized Memory).

## 1. Cue-indexing (encoding specificity)

**The science.** Retrieval succeeds when the cues present at recall overlap the features
encoded alongside the memory trace (Tulving & Thomson, 1973). Memory is not "stored then
searched by content" — access is cue-dependent. A trace can exist and be unreachable
because the current cue shares no features with the encoding context. This is why
recognition usually beats free recall — the answer itself is typically a rich cue — but
Tulving & Thomson's own headline result cuts deeper: recognition can *fail* for words a
subject can still recall, because a cue matching the encoding context can outperform even
a copy of the answer. Cue–context overlap, not cue strength in the abstract, is what
matters. It's also why you can know something cold at your desk and blank in a meeting.

**The rule.** Index by the cue you'll have at retrieval time, not by topic. At the moment
of remembrance you are never holding a topic name — you're holding a symptom, a decision,
or a question. Database analogy: index a table on the columns in the WHERE clause of
anticipated queries, not on what the row "is about."

**Example.** Topic-indexed (bad): *"Q: What is the L3 cache?"* Nobody ever encounters
"L3 cache" in the wild. Situation-indexed (good): *"Q: A loop's throughput drops ~10×
once the working set exceeds a few MB, no algorithmic change. First hypothesis?"*
Everyone encounters the slowdown.

**In the app.** Card fronts default to situation shapes — the card types symptom→cause,
decision→trade-off, prediction, and problem are the concrete forms a real-world cue takes.
The definition type exists but must be deliberately chosen, never the default. The
card-creation UI presents these templates, not a blank front: situation-shaped must be
the path of least resistance.

## 2. Harvest, don't predict

**The design bet.** You can't predict future retrieval cues — but you don't have to.
Every retrieval failure is a ground-truth sample of a real retrieval context, delivered
free. A tip-of-the-tongue moment (a real, well-documented retrieval state — Brown &
McNeill, 1966) or an "I know I've read this" lookup hands you the exact cue that fired at
a moment of genuine need. Analogy: logging cache misses to decide what to prefetch.
"Retrospective indexing beats prospective prediction" is an extrapolation from
encoding specificity, not itself an established finding — but it follows directly:
harvested cues have guaranteed overlap with at least one real retrieval context;
predicted ones don't. Predicting "important-seeming" terms is only the cold-start
heuristic.

**In the app.** The inbox is a lookup log: an always-available, near-zero-friction,
one-line capture of what you were doing and what question you were actually holding when
retrieval failed. Triage at session end converts these near-verbatim into card fronts.
Cards are sourced from demonstrated failures — gaps in closed-book recaps, errors in
practice problems, real-life lookup events — not from terms that merely look important
while reading.

## 3. Spaced free recall (retrieval practice, not re-exposure)

**The science.** Summarizing and rereading are re-exposure, not retrieval — both rated
low-utility in the standard review (Dunlosky et al., 2013, which rates practice testing
and distributed practice highest). The struggle of pulling content from memory *is* the
encoding mechanism. Free recall after a delay, checked against the source afterward
(feedback is what corrects errors and keeps unretrieved material from decaying further),
is among the highest-utility moves, and repeating it across spaced sessions compounds it
(Karpicke & Roediger, 2008; Karpicke & Blunt, 2011). Terminology note: the literature's
*successive relearning* (Rawson & Dunlosky, 2011) specifically means retrieval **to
criterion** with feedback, repeated across spaced sessions — which is what the flashcard
scheduler itself implements. The brain dump is the complementary move: spaced *free*
recall, uncued.

**In the app.** Every session opens with a delayed free-recall prompt: "Last session:
{sources studied} — brain dump before reviewing." Typed in-app and ungraded — no score,
because the retrieval act itself is the point — but not unchecked: the dump is saved to a
session-log file in the vault, and the triage step surfaces it alongside the source
material, so gaps and errors get seen against the source and mined for new cards. That's
principle 2 feeding on principle 3, and it doubles as the feedback pass the science
requires.

## 4. Interleaving

**The science.** Blocked practice (all cards on one topic, then the next) inflates
in-session performance while producing weaker retention and discrimination than mixing —
the difficulty of switching is desirable (Kornell & Bjork, 2008; Rohrer & Taylor, 2007).
Honest caveat: the strong discrimination evidence is for *confusable* categories (problem
types, styles); for unrelated topics the benefit of mixing is mostly spacing and
contextual variety. Both effects point the same direction, and real retrieval contexts
are always interleaved: work never asks you questions grouped by textbook chapter.

**In the app.** The review queue shuffles across sources, never blocks by topic: after
selecting due cards by overdue-ness, the queue is ordered so no two consecutive cards
share a `source` where the mix allows it — when one source dominates the due queue (e.g.,
the day after a big import), the scheduler spreads the minority sources as evenly as
possible and accepts same-source runs rather than dropping due cards. This also shapes
scope philosophy — a session mixes current and old material by design, which is why
per-topic/per-deck sessions were rejected.

## 5. Leech-as-bad-indexing (desirable difficulty with feedback)

**The science.** A chronically failed card is assumed to be *indexed wrong* — a bad,
situation-less front — not evidence that the fact is unlearnable or the mind is weak.
Retrieval failure ≠ storage failure: a trace can be available but inaccessible to the
current cue (Tulving & Pearlstone, 1966). Chronic lapsing can also mean the encoding
never took or interference is winning — but in every one of those cases the fix is a
better front, not more reps on the bad one. Endless re-drilling of a badly cued card is
wasted difficulty (difficulty is only desirable when retrieval eventually succeeds and
strengthens the trace you'll actually query).

**In the app.** A card with 4+ lifetime lapses is flagged as a leech and removed from
normal rotation — not punished with more frequent review. (The threshold is a design
choice, deliberately more aggressive than Anki's default of 8: because our leech flow is
rewrite-or-delete rather than suspend-and-forget, catching bad fronts early is cheap.)
The leech flow prompts a rewrite: find a fresher, situation-shaped front (or delete the
card). Related deck hygiene: a card that never fires in real life for months is also
indexed wrong or not worth knowing. Treat the deck like an index under query-pattern
analysis, not an archive. This is also why the lapse color is softened, not alarm-red,
and why the app never guilt-trips about backlog: lapsing is the system working, not the
user failing.

## The synthesis

Memory access is cue-dependent, so the whole system reduces to: **encode in the form of
the future question, harvest real questions from real failures, and let daily work
re-index what prediction missed.** The app is the flashcard leg of a larger study
protocol (closed-book recaps and interleaved practice problems happen outside it); its
job is to be a thin, trustworthy scheduler over that loop — and to protect the daily
habit that keeps the loop alive, which is why sessions are capped, completable in ≤15
minutes, and never moralizing. (Session caps are habit design, not a memory-science
claim.)
