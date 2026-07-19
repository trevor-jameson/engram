export const CARD_TYPES = [
  "symptom-cause",
  "decision-tradeoff",
  "prediction",
  "problem",
  "definition",
] as const;

export type CardType = (typeof CARD_TYPES)[number];

/** Review-state frontmatter of a card file. Dates are YYYY-MM-DD strings. */
export interface CardFrontmatter {
  box: number;
  due: string;
  lapses: number;
  created: string;
  source: string;
  type: CardType;
}

/** A parsed card. `id` is the filename without `.md`; `body` is the raw Q:/A: markdown. */
export interface Card extends CardFrontmatter {
  id: string;
  body: string;
}

export interface CardBodyParts {
  front: string;
  back: string;
}

/**
 * Splits a card body per the signed-off format: the front runs from the line
 * beginning `Q:` up to the first later line beginning `A:`; the back is
 * everything from that `A:` line on. Returns undefined when the body does not
 * follow the format.
 */
export function splitCardBody(body: string): CardBodyParts | undefined {
  const lines = body.split("\n");
  const qIndex = lines.findIndex((line) => line.startsWith("Q:"));
  if (qIndex === -1) return undefined;
  const aOffset = lines.slice(qIndex + 1).findIndex((line) => line.startsWith("A:"));
  if (aOffset === -1) return undefined;
  const aIndex = qIndex + 1 + aOffset;

  const firstQLine = lines[qIndex] ?? "";
  const front = [firstQLine.slice("Q:".length), ...lines.slice(qIndex + 1, aIndex)]
    .join("\n")
    .trim();
  const firstALine = lines[aIndex] ?? "";
  const back = [firstALine.slice("A:".length), ...lines.slice(aIndex + 1)].join("\n").trim();

  if (front === "") return undefined;
  return { front, back };
}

export type GradeResult = "pass" | "lapse";

/** The only frontmatter fields the scheduler may mutate. */
export type SchedulerPatch = Partial<Pick<CardFrontmatter, "box" | "due" | "lapses">>;

export type CardErrorCode =
  | "invalid-id"
  | "invalid-yaml"
  | "invalid-frontmatter"
  | "invalid-body"
  | "id-collision"
  | "not-found"
  | "vault-missing";

/** Typed error surfaced by vault I/O. Never carries filesystem paths. */
export interface CardError {
  code: CardErrorCode;
  message: string;
  cardId?: string;
}
