import type { CardFrontmatter } from "@engram/shared";

/**
 * Lifetime-lapse threshold for leech flagging. Deliberately more aggressive
 * than Anki's 8: the leech flow is rewrite-or-delete, so catching badly
 * indexed fronts early is cheap (see learning-principles.md §5).
 */
export const LEECH_THRESHOLD = 4;

/** Leech status is derived from frontmatter on read; no `leech` field is ever written. */
export function isLeech(card: Pick<CardFrontmatter, "lapses">): boolean {
  return card.lapses >= LEECH_THRESHOLD;
}
