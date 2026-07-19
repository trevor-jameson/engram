import { describe, expect, it } from "vitest";
import { addDays, isDue } from "./dates.ts";
import { BOX_INTERVALS_DAYS, grade, newCardDefaults, resetForRewrite } from "./leitner.ts";
import { isLeech, LEECH_THRESHOLD } from "./leech.ts";

const TODAY = "2026-07-19";

describe("dates", () => {
  it("adds days across month and year boundaries", () => {
    expect(addDays("2026-07-19", 1)).toBe("2026-07-20");
    expect(addDays("2026-07-31", 1)).toBe("2026-08-01");
    expect(addDays("2026-12-31", 64)).toBe("2027-03-05");
  });

  it("treats today and earlier as due", () => {
    expect(isDue("2026-07-19", TODAY)).toBe(true);
    expect(isDue("2026-01-01", TODAY)).toBe(true);
    expect(isDue("2026-07-20", TODAY)).toBe(false);
  });
});

describe("grade", () => {
  it.each([
    [1, 2],
    [2, 3],
    [3, 4],
    [4, 5],
    [5, 6],
    [6, 7],
  ])("pass moves box %i up to %i with the new box's interval", (from, to) => {
    const patch = grade({ box: from, lapses: 0 }, "pass", TODAY);
    expect(patch).toEqual({ box: to, due: addDays(TODAY, BOX_INTERVALS_DAYS[to - 1] ?? 0) });
  });

  it("pass at box 7 stays at 7 (64-day interval)", () => {
    expect(grade({ box: 7, lapses: 2 }, "pass", TODAY)).toEqual({
      box: 7,
      due: addDays(TODAY, 64),
    });
  });

  it.each([
    [7, 6],
    [6, 5],
    [5, 4],
    [4, 3],
    [3, 2],
    [2, 1],
  ])("lapse moves box %i down exactly one to %i — never reset to 1", (from, to) => {
    const patch = grade({ box: from, lapses: 0 }, "lapse", TODAY);
    expect(patch).toEqual({
      box: to,
      due: addDays(TODAY, BOX_INTERVALS_DAYS[to - 1] ?? 0),
      lapses: 1,
    });
  });

  it("lapse at box 1 stays at 1 and still increments lapses", () => {
    expect(grade({ box: 1, lapses: 3 }, "lapse", TODAY)).toEqual({
      box: 1,
      due: addDays(TODAY, 1),
      lapses: 4,
    });
  });

  it("does not schedule a pass into a lapse count change", () => {
    expect(grade({ box: 3, lapses: 2 }, "pass", TODAY)).not.toHaveProperty("lapses");
  });
});

describe("leech", () => {
  it("flags at 4+ lifetime lapses, not below", () => {
    expect(isLeech({ lapses: 3 })).toBe(false);
    expect(isLeech({ lapses: 4 })).toBe(true);
    expect(isLeech({ lapses: 9 })).toBe(true);
    expect(LEECH_THRESHOLD).toBe(4);
  });
});

describe("resetForRewrite", () => {
  it("fully resets scheduling state: box 1, lapses 0, due tomorrow", () => {
    expect(resetForRewrite(TODAY)).toEqual({ box: 1, lapses: 0, due: "2026-07-20" });
  });
});

describe("newCardDefaults", () => {
  it("starts at box 1, no lapses, created today, due tomorrow", () => {
    expect(newCardDefaults(TODAY)).toEqual({
      box: 1,
      lapses: 0,
      created: TODAY,
      due: "2026-07-20",
    });
  });
});
