/**
 * Pure state machine for the review flow: front → reveal → grade → next card.
 * Reveal-before-grade is enforced here (grading events are ignored while the
 * back is hidden), and a grading failure keeps the position so the same card
 * can be retried.
 */
export interface ReviewState {
  /** Position in the fetched queue; equals the queue length once complete. */
  index: number;
  revealed: boolean;
  /** A grade request is in flight; further grade attempts are ignored. */
  grading: boolean;
  error: string | undefined;
}

export const initialReviewState: ReviewState = {
  index: 0,
  revealed: false,
  grading: false,
  error: undefined,
};

export type ReviewEvent =
  | { type: "reveal" }
  | { type: "grade-start" }
  | { type: "grade-success" }
  | { type: "grade-failure"; message: string };

export function reviewReducer(state: ReviewState, event: ReviewEvent): ReviewState {
  switch (event.type) {
    case "reveal":
      return state.revealed ? state : { ...state, revealed: true };
    case "grade-start":
      if (!state.revealed || state.grading) return state;
      return { ...state, grading: true, error: undefined };
    case "grade-success":
      return { index: state.index + 1, revealed: false, grading: false, error: undefined };
    case "grade-failure":
      return { ...state, grading: false, error: event.message };
  }
}
