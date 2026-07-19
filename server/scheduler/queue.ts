import type { Card } from "@engram/shared";
import { isDue } from "./dates.ts";
import { isLeech } from "./leech.ts";

/** Daily review-queue cap, in weighted slots. */
export const QUEUE_CAP_WEIGHT = 25;
/** Floor-as-fill target: never an obligation, just a small queue on quiet days. */
export const QUEUE_FLOOR = 5;

/** Worked-problem retrieval is slow, so problem cards count double against the cap. */
export function cardWeight(card: Pick<Card, "type">): number {
  return card.type === "problem" ? 2 : 1;
}

function byDueAscending(a: Card, b: Card): number {
  return a.due < b.due ? -1 : a.due > b.due ? 1 : 0;
}

/**
 * Interleaves cards so no two consecutive share `source` where the mix allows.
 * Two regimes:
 * - When one source is so dominant that same-source runs are unavoidable
 *   (max group > ceil(n/2)), each source's cards get fractional target
 *   positions spread evenly across the queue, so minority sources break the
 *   dominant run as evenly as possible.
 * - Otherwise a greedy pick of the largest-remaining source (excluding the
 *   previous card's source) guarantees no two adjacent cards share a source.
 * Within a source, incoming order (overdue-ness) is preserved. Ties are
 * broken by the injected RNG.
 */
export function interleaveBySource(cards: Card[], rng: () => number): Card[] {
  const groups = new Map<string, Card[]>();
  for (const card of cards) {
    const group = groups.get(card.source);
    if (group === undefined) groups.set(card.source, [card]);
    else group.push(card);
  }

  const maxGroup = Math.max(0, ...[...groups.values()].map((group) => group.length));
  if (maxGroup > Math.ceil(cards.length / 2)) {
    const scored: { card: Card; score: number; jitter: number }[] = [];
    for (const group of groups.values()) {
      group.forEach((card, index) => {
        scored.push({ card, score: (index + 0.5) / group.length, jitter: rng() });
      });
    }
    scored.sort((a, b) => a.score - b.score || a.jitter - b.jitter);
    return scored.map((entry) => entry.card);
  }

  const result: Card[] = [];
  let lastSource: string | undefined;
  while (result.length < cards.length) {
    let eligible = [...groups.entries()].filter(
      ([source, group]) => group.length > 0 && source !== lastSource,
    );
    if (eligible.length === 0) {
      eligible = [...groups.entries()].filter(([, group]) => group.length > 0);
    }
    const maxRemaining = Math.max(...eligible.map(([, group]) => group.length));
    const top = eligible.filter(([, group]) => group.length === maxRemaining);
    const pick = top[Math.floor(rng() * top.length)] ?? top[0];
    if (pick === undefined) break;
    const [source, group] = pick;
    const card = group.shift();
    if (card === undefined) break;
    result.push(card);
    lastSource = source;
  }
  return result;
}

/**
 * Builds today's review queue:
 * 1. leeches are excluded (routed to the rewrite flow instead);
 * 2. due cards are selected most-overdue-first into the weighted cap —
 *    selection stops at the first card that does not fit, so no card is ever
 *    queued ahead of a more-overdue one; overflow simply stays due and
 *    carries to tomorrow by overdue-ness, with no extra state;
 * 3. if fewer than QUEUE_FLOOR cards are due, soonest-due upcoming cards are
 *    pulled forward to reach the floor (or all cards if fewer exist);
 * 4. the result is interleaved across sources.
 */
export function buildQueue(cards: Card[], today: string, rng: () => number = Math.random): Card[] {
  const candidates = cards.filter((card) => !isLeech(card));
  const due = candidates.filter((card) => isDue(card.due, today)).sort(byDueAscending);

  const selected: Card[] = [];
  let weight = 0;
  for (const card of due) {
    if (weight + cardWeight(card) > QUEUE_CAP_WEIGHT) break;
    selected.push(card);
    weight += cardWeight(card);
  }

  if (selected.length < QUEUE_FLOOR) {
    const upcoming = candidates
      .filter((card) => !isDue(card.due, today))
      .sort(byDueAscending)
      .slice(0, QUEUE_FLOOR - selected.length);
    selected.push(...upcoming);
  }

  return interleaveBySource(selected, rng);
}
