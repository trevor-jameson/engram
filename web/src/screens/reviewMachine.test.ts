import { describe, expect, it } from "vitest";
import {
  initialReviewState,
  reviewReducer,
  type ReviewEvent,
  type ReviewState,
} from "./reviewMachine.ts";

function run(events: ReviewEvent[], from: ReviewState = initialReviewState): ReviewState {
  return events.reduce(reviewReducer, from);
}

describe("reviewReducer", () => {
  it("starts on the front of the first card", () => {
    expect(initialReviewState).toEqual({
      index: 0,
      revealed: false,
      grading: false,
      error: undefined,
    });
  });

  it("reveal shows the back and is idempotent", () => {
    const once = run([{ type: "reveal" }]);
    expect(once.revealed).toBe(true);
    expect(run([{ type: "reveal" }], once)).toEqual(once);
  });

  it("ignores grading before reveal (reveal-before-grade enforced)", () => {
    expect(run([{ type: "grade-start" }])).toEqual(initialReviewState);
  });

  it("grading starts only after reveal and ignores double submission", () => {
    const grading = run([{ type: "reveal" }, { type: "grade-start" }]);
    expect(grading.grading).toBe(true);
    expect(run([{ type: "grade-start" }], grading)).toEqual(grading);
  });

  it("a successful grade advances to the next card's front", () => {
    const next = run([{ type: "reveal" }, { type: "grade-start" }, { type: "grade-success" }]);
    expect(next).toEqual({ index: 1, revealed: false, grading: false, error: undefined });
  });

  it("a failed grade keeps position and reveal so the card can be retried", () => {
    const failed = run([
      { type: "reveal" },
      { type: "grade-start" },
      { type: "grade-failure", message: "disk full" },
    ]);
    expect(failed).toEqual({ index: 0, revealed: true, grading: false, error: "disk full" });
  });

  it("retry after failure clears the error and can complete", () => {
    const failed = run([
      { type: "reveal" },
      { type: "grade-start" },
      { type: "grade-failure", message: "disk full" },
    ]);
    const retrying = run([{ type: "grade-start" }], failed);
    expect(retrying).toEqual({ index: 0, revealed: true, grading: true, error: undefined });
    expect(run([{ type: "grade-success" }], retrying).index).toBe(1);
  });
});
