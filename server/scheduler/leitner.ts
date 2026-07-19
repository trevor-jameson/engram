import type { CardFrontmatter, GradeResult, SchedulerPatch } from "@engram/shared";
import { addDays } from "./dates.ts";

/** Softened-Leitner intervals in days, indexed by box - 1. */
export const BOX_INTERVALS_DAYS = [1, 2, 4, 8, 16, 32, 64] as const;

export const MIN_BOX = 1;
export const MAX_BOX = 7;

function dueForBox(box: number, today: string): string {
  const interval = BOX_INTERVALS_DAYS[box - 1];
  if (interval === undefined) throw new RangeError(`box out of range: ${box}`);
  return addDays(today, interval);
}

/**
 * Grades a review. Pass moves the card up one box (capped at 7); lapse moves
 * it down one box (floored at 1, never reset) and increments lifetime lapses.
 */
export function grade(
  card: Pick<CardFrontmatter, "box" | "lapses">,
  result: GradeResult,
  today: string,
): SchedulerPatch {
  if (result === "pass") {
    const box = Math.min(card.box + 1, MAX_BOX);
    return { box, due: dueForBox(box, today) };
  }
  const box = Math.max(card.box - 1, MIN_BOX);
  return { box, due: dueForBox(box, today), lapses: card.lapses + 1 };
}

/**
 * Post-rewrite reset for a leech: the rewrite created a new cue, so the card
 * earns its intervals from scratch. Called only from the user-initiated
 * rewrite path.
 */
export function resetForRewrite(today: string): SchedulerPatch {
  return { box: 1, lapses: 0, due: addDays(today, 1) };
}

/** Scheduling defaults for a newly created card. */
export function newCardDefaults(
  today: string,
): Pick<CardFrontmatter, "box" | "lapses" | "created" | "due"> {
  return { box: 1, lapses: 0, created: today, due: addDays(today, 1) };
}
