import { describe, expect, it } from "vitest";
import type { Card, CardType } from "@engram/shared";
import { buildQueue, cardWeight, interleaveBySource, QUEUE_CAP_WEIGHT, QUEUE_FLOOR } from "./queue.ts";

const TODAY = "2026-07-19";

/** Deterministic RNG (mulberry32) for reproducible tie-breaking. */
function seededRng(seed: number): () => number {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let counter = 0;
function makeCard(overrides: Partial<Card> = {}): Card {
  counter += 1;
  return {
    id: `card-${counter}`,
    box: 2,
    due: TODAY,
    lapses: 0,
    created: "2026-07-01",
    source: "src-a",
    type: "symptom-cause",
    body: "Q: q?\n\nA: a.\n",
    ...overrides,
  };
}

function cards(count: number, overrides: Partial<Card> = {}): Card[] {
  return Array.from({ length: count }, () => makeCard(overrides));
}

/** Days overdue per card id, spread so ordering is observable. */
function dueDaysAgo(daysAgo: number): string {
  const date = new Date(Date.parse(`${TODAY}T00:00:00Z`) - daysAgo * 86400000);
  return date.toISOString().slice(0, 10);
}

function maxAdjacentSameSource(queue: Card[]): number {
  let max = 0;
  let run = 0;
  for (let i = 1; i < queue.length; i++) {
    run = queue[i]?.source === queue[i - 1]?.source ? run + 1 : 0;
    max = Math.max(max, run);
  }
  return max;
}

describe("cardWeight", () => {
  it("counts problem cards double, everything else single", () => {
    const types: [CardType, number][] = [
      ["symptom-cause", 1],
      ["decision-tradeoff", 1],
      ["prediction", 1],
      ["definition", 1],
      ["problem", 2],
    ];
    for (const [type, weight] of types) {
      expect(cardWeight({ type })).toBe(weight);
    }
  });
});

describe("weighted cap", () => {
  it("fits 25 non-problem due cards and drops the 26th", () => {
    const due = Array.from({ length: 30 }, (_, i) =>
      makeCard({ due: dueDaysAgo(30 - i), source: `src-${i}` }),
    );
    const queue = buildQueue(due, TODAY, seededRng(1));
    expect(queue).toHaveLength(QUEUE_CAP_WEIGHT);
    const mostOverdueIds = due.slice(0, 25).map((card) => card.id);
    expect(queue.map((card) => card.id).sort()).toEqual(mostOverdueIds.sort());
  });

  it("fits only 12 problem cards (24 weight) of 13 due", () => {
    const due = Array.from({ length: 13 }, (_, i) =>
      makeCard({ type: "problem", due: dueDaysAgo(13 - i), source: `src-${i}` }),
    );
    const queue = buildQueue(due, TODAY, seededRng(1));
    expect(queue).toHaveLength(12);
  });

  it("stops at the boundary rather than queue-jumping a lighter, less overdue card", () => {
    // 24 singles, then a problem card (doesn't fit at weight 24), then another single.
    const singles = Array.from({ length: 24 }, (_, i) =>
      makeCard({ due: dueDaysAgo(40 - i), source: `src-${i}` }),
    );
    const problem = makeCard({ type: "problem", due: dueDaysAgo(10), source: "src-p" });
    const lighter = makeCard({ due: dueDaysAgo(5), source: "src-l" });
    const queue = buildQueue([...singles, problem, lighter], TODAY, seededRng(1));
    const ids = queue.map((card) => card.id);
    expect(queue).toHaveLength(24);
    expect(ids).not.toContain(problem.id);
    expect(ids).not.toContain(lighter.id);
  });

  it("admits a fitting problem card at the boundary", () => {
    const singles = Array.from({ length: 23 }, (_, i) =>
      makeCard({ due: dueDaysAgo(40 - i), source: `src-${i}` }),
    );
    const problem = makeCard({ type: "problem", due: dueDaysAgo(10), source: "src-p" });
    const queue = buildQueue([...singles, problem], TODAY, seededRng(1));
    expect(queue.map((card) => card.id)).toContain(problem.id);
    expect(queue).toHaveLength(24);
  });
});

describe("floor-as-fill", () => {
  it("pulls 5 soonest-due cards forward when 0 are due", () => {
    const upcoming = Array.from({ length: 10 }, (_, i) =>
      makeCard({ due: `2026-07-2${i}`, source: `src-${i}` }),
    );
    const queue = buildQueue(upcoming, TODAY, seededRng(1));
    expect(queue).toHaveLength(QUEUE_FLOOR);
    expect(queue.map((card) => card.due).sort()).toEqual([
      "2026-07-20",
      "2026-07-21",
      "2026-07-22",
      "2026-07-23",
      "2026-07-24",
    ]);
  });

  it("tops up 3 due cards with the 2 soonest-due upcoming", () => {
    const due = Array.from({ length: 3 }, (_, i) => makeCard({ source: `due-${i}` }));
    const upcoming = Array.from({ length: 4 }, (_, i) =>
      makeCard({ due: `2026-07-2${i + 1}`, source: `up-${i}` }),
    );
    const queue = buildQueue([...due, ...upcoming], TODAY, seededRng(1));
    expect(queue).toHaveLength(5);
    const upcomingInQueue = queue.filter((card) => card.due > TODAY).map((card) => card.due);
    expect(upcomingInQueue.sort()).toEqual(["2026-07-21", "2026-07-22"]);
  });

  it("does not fill when 5 or more are due", () => {
    const due = Array.from({ length: 5 }, (_, i) => makeCard({ source: `due-${i}` }));
    const upcoming = cards(3, { due: "2026-07-25" });
    expect(buildQueue([...due, ...upcoming], TODAY, seededRng(1))).toHaveLength(5);
  });

  it("returns all cards when fewer than 5 exist", () => {
    const queue = buildQueue(cards(3, { due: "2026-08-01" }), TODAY, seededRng(1));
    expect(queue).toHaveLength(3);
  });

  it("returns an empty queue for zero cards", () => {
    expect(buildQueue([], TODAY, seededRng(1))).toEqual([]);
  });
});

describe("leech exclusion", () => {
  it("excludes 4-lapse cards from the queue and from floor fill", () => {
    const leech = makeCard({ lapses: 4, due: dueDaysAgo(30), source: "leech-src" });
    const normal = Array.from({ length: 3 }, (_, i) =>
      makeCard({ lapses: 3, source: `src-${i}` }),
    );
    const upcomingLeech = makeCard({ lapses: 5, due: "2026-07-20", source: "leech-src-2" });
    const queue = buildQueue([leech, ...normal, upcomingLeech], TODAY, seededRng(1));
    const ids = queue.map((card) => card.id);
    expect(ids).not.toContain(leech.id);
    expect(ids).not.toContain(upcomingLeech.id);
    expect(queue).toHaveLength(3);
  });
});

describe("interleaving", () => {
  it("produces no adjacent same-source cards when the mix allows", () => {
    const queue = buildQueue(
      [
        ...cards(4, { source: "alpha" }),
        ...cards(4, { source: "beta" }),
        ...cards(4, { source: "gamma" }),
      ],
      TODAY,
      seededRng(7),
    );
    expect(queue).toHaveLength(12);
    expect(maxAdjacentSameSource(queue)).toBe(0);
  });

  it("spreads minority sources evenly through a dominant source", () => {
    const queue = interleaveBySource(
      [...cards(8, { source: "dominant" }), ...cards(2, { source: "minority" })],
      seededRng(3),
    );
    const positions = queue
      .map((card, index) => (card.source === "minority" ? index : -1))
      .filter((index) => index !== -1);
    expect(positions).toHaveLength(2);
    const [first, second] = positions;
    // Evenly spread targets for 2-of-10 are positions ~2 and ~7; allow slack
    // for tie-breaks but reject clustering at either end.
    expect(first).toBeGreaterThanOrEqual(1);
    expect(second).toBeLessThanOrEqual(8);
    expect((second ?? 0) - (first ?? 0)).toBeGreaterThanOrEqual(3);
  });

  it("is deterministic under a seeded RNG", () => {
    const input = [
      ...cards(5, { source: "alpha" }),
      ...cards(5, { source: "beta" }),
      ...cards(3, { source: "gamma" }),
    ];
    const a = buildQueue(input, TODAY, seededRng(42)).map((card) => card.id);
    const b = buildQueue(input, TODAY, seededRng(42)).map((card) => card.id);
    expect(a).toEqual(b);
  });

  it("keeps a card's within-source overdue order", () => {
    const older = makeCard({ source: "alpha", due: dueDaysAgo(9) });
    const newer = makeCard({ source: "alpha", due: dueDaysAgo(1) });
    const other = cards(2, { source: "beta" });
    const queue = buildQueue([newer, older, ...other], TODAY, seededRng(1));
    const alphaIds = queue.filter((card) => card.source === "alpha").map((card) => card.id);
    expect(alphaIds).toEqual([older.id, newer.id]);
  });
});
