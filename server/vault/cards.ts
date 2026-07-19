import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import {
  CARD_TYPES,
  splitCardBody,
  type Card,
  type CardError,
  type CardFrontmatter,
  type CardType,
  type SchedulerPatch,
} from "@engram/shared";

export class VaultError extends Error {
  readonly cardError: CardError;

  constructor(cardError: CardError) {
    super(cardError.message);
    this.name = "VaultError";
    this.cardError = cardError;
  }
}

const FLASHCARDS_DIR = "flashcards";
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export interface ListCardsResult {
  cards: Card[];
  /** Files that are not valid cards — reported, never silently dropped or rewritten. */
  errors: CardError[];
}

export interface Vault {
  listCards(): ListCardsResult;
  readCard(id: string): Card;
  writeCard(card: Card): void;
  updateFrontmatter(id: string, patch: SchedulerPatch): Card;
  rewriteBody(id: string, front: string, back?: string): Card;
  deleteCard(id: string): void;
}

function fail(cardError: CardError): never {
  throw new VaultError(cardError);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** js-yaml parses unquoted `2026-07-18` as a UTC Date; normalize both forms to YYYY-MM-DD. */
function normalizeDate(value: unknown): string | undefined {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === "string" && DATE_RE.test(value)) return value;
  return undefined;
}

function isCardType(value: unknown): value is CardType {
  return typeof value === "string" && (CARD_TYPES as readonly string[]).includes(value);
}

function validateFrontmatter(data: unknown, cardId: string): CardFrontmatter {
  const problems: string[] = [];
  const record = isRecord(data) ? data : {};
  if (!isRecord(data)) problems.push("frontmatter is not a YAML mapping");

  const box = record["box"];
  if (typeof box !== "number" || !Number.isInteger(box) || box < 1 || box > 7) {
    problems.push('"box" must be an integer between 1 and 7');
  }
  const due = normalizeDate(record["due"]);
  if (due === undefined) problems.push('"due" must be a YYYY-MM-DD date');
  const created = normalizeDate(record["created"]);
  if (created === undefined) problems.push('"created" must be a YYYY-MM-DD date');
  const lapses = record["lapses"];
  if (typeof lapses !== "number" || !Number.isInteger(lapses) || lapses < 0) {
    problems.push('"lapses" must be a non-negative integer');
  }
  const source = record["source"];
  if (typeof source !== "string" || source.trim() === "") {
    problems.push('"source" is required and must be a non-empty string');
  }
  const type = record["type"];
  if (!isCardType(type)) {
    problems.push(`"type" must be one of: ${CARD_TYPES.join(", ")}`);
  }

  if (problems.length > 0) {
    fail({ code: "invalid-frontmatter", cardId, message: problems.join("; ") });
  }
  return {
    box: box as number,
    due: due as string,
    lapses: lapses as number,
    created: created as string,
    source: source as string,
    type: type as CardType,
  };
}

/** Parses raw card-file text into a Card. Throws VaultError with a typed CardError. */
export function parseCard(raw: string, id: string): Card {
  let parsed: { data: unknown; content: string };
  try {
    parsed = matter(raw);
  } catch (cause) {
    fail({
      code: "invalid-yaml",
      cardId: id,
      message: `frontmatter is not valid YAML: ${cause instanceof Error ? cause.message : String(cause)}`,
    });
  }
  const frontmatter = validateFrontmatter(parsed.data, id);
  if (splitCardBody(parsed.content) === undefined) {
    fail({
      code: "invalid-body",
      cardId: id,
      message: 'body must contain a "Q:" line followed by an "A:" line, with a non-empty front',
    });
  }
  return { id, ...frontmatter, body: parsed.content };
}

function validateCard(card: Card): void {
  validateFrontmatter(
    {
      box: card.box,
      due: card.due,
      lapses: card.lapses,
      created: card.created,
      source: card.source,
      type: card.type,
    },
    card.id,
  );
  if (splitCardBody(card.body) === undefined) {
    fail({
      code: "invalid-body",
      cardId: card.id,
      message: 'body must contain a "Q:" line followed by an "A:" line, with a non-empty front',
    });
  }
}

function validateId(id: string): void {
  if (id === "" || id.includes("/") || id.includes("\\") || id.includes("..")) {
    fail({ code: "invalid-id", cardId: id, message: "card IDs must not be empty or contain path segments" });
  }
}

function formatYamlValue(value: number | string): string {
  return String(value);
}

/**
 * Replaces only the patched keys' lines inside the frontmatter block, leaving
 * every other byte of the file untouched. This is what guarantees the
 * byte-stable round-trip the code standards require; gray-matter re-serialization
 * would reformat user-authored YAML.
 */
function patchFrontmatterLines(raw: string, patch: SchedulerPatch, cardId: string): string {
  const lines = raw.split("\n");
  if (lines[0]?.trim() !== "---") {
    fail({ code: "invalid-frontmatter", cardId, message: "file does not start with a frontmatter block" });
  }
  let end = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i]?.trim() === "---") {
      end = i;
      break;
    }
  }
  if (end === -1) {
    fail({ code: "invalid-frontmatter", cardId, message: "frontmatter block is not closed" });
  }
  for (const [key, value] of Object.entries(patch)) {
    const keyRe = new RegExp(`^${key}\\s*:`);
    let replaced = false;
    for (let i = 1; i < end; i++) {
      const line = lines[i];
      if (line !== undefined && keyRe.test(line)) {
        lines[i] = `${key}: ${formatYamlValue(value)}`;
        replaced = true;
        break;
      }
    }
    if (!replaced) {
      fail({ code: "invalid-frontmatter", cardId, message: `frontmatter has no "${key}" field to update` });
    }
  }
  return lines.join("\n");
}

function validatePatch(patch: SchedulerPatch, cardId: string): void {
  const probe: Record<string, unknown> = { ...patch };
  const allowed = ["box", "due", "lapses"];
  const unknown = Object.keys(probe).filter((key) => !allowed.includes(key));
  if (unknown.length > 0) {
    fail({
      code: "invalid-frontmatter",
      cardId,
      message: `scheduler updates may only change box, due, lapses (got: ${unknown.join(", ")})`,
    });
  }
  if (patch.box !== undefined && (!Number.isInteger(patch.box) || patch.box < 1 || patch.box > 7)) {
    fail({ code: "invalid-frontmatter", cardId, message: '"box" must be an integer between 1 and 7' });
  }
  if (patch.due !== undefined && !DATE_RE.test(patch.due)) {
    fail({ code: "invalid-frontmatter", cardId, message: '"due" must be a YYYY-MM-DD date' });
  }
  if (patch.lapses !== undefined && (!Number.isInteger(patch.lapses) || patch.lapses < 0)) {
    fail({ code: "invalid-frontmatter", cardId, message: '"lapses" must be a non-negative integer' });
  }
}

/** Serializes an app-authored card file. gray-matter owns this format. */
export function serializeCard(card: Card): string {
  const { box, due, lapses, created, source, type } = card;
  return matter.stringify(card.body, { box, due, lapses, created, source, type });
}

/**
 * Generates a card ID per the signed-off scheme:
 * `<kebab-slug-of-front>-<YYYYMMDDHHmmss>` with the slug truncated to ~40 chars.
 */
export function generateCardId(front: string, now: Date = new Date()): string {
  const slug =
    front
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40)
      .replace(/-+$/, "") || "card";
  const pad = (n: number) => String(n).padStart(2, "0");
  const ts =
    `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
    `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return `${slug}-${ts}`;
}

export function openVault(vaultPath: string): Vault {
  const root = path.resolve(vaultPath);
  if (!existsSync(root) || !statSync(root).isDirectory()) {
    fail({ code: "vault-missing", message: "configured vault path does not exist or is not a directory" });
  }
  const cardsDir = path.join(root, FLASHCARDS_DIR);

  function cardPath(id: string): string {
    validateId(id);
    return path.join(cardsDir, `${id}.md`);
  }

  function readRaw(id: string): string {
    const filePath = cardPath(id);
    if (!existsSync(filePath)) {
      fail({ code: "not-found", cardId: id, message: `no card file for id "${id}"` });
    }
    return readFileSync(filePath, "utf8");
  }

  return {
    listCards(): ListCardsResult {
      if (!existsSync(cardsDir)) return { cards: [], errors: [] };
      const entries = readdirSync(cardsDir, { withFileTypes: true })
        .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
        .map((entry) => entry.name)
        .sort();
      const cards: Card[] = [];
      const errors: CardError[] = [];
      for (const name of entries) {
        const id = name.slice(0, -".md".length);
        try {
          cards.push(parseCard(readFileSync(path.join(cardsDir, name), "utf8"), id));
        } catch (error) {
          if (error instanceof VaultError) errors.push(error.cardError);
          else throw error;
        }
      }
      return { cards, errors };
    },

    readCard(id: string): Card {
      return parseCard(readRaw(id), id);
    },

    writeCard(card: Card): void {
      validateId(card.id);
      validateCard(card);
      const filePath = cardPath(card.id);
      if (existsSync(filePath)) {
        fail({
          code: "id-collision",
          cardId: card.id,
          message: `a card file already exists for id "${card.id}"; refusing to overwrite`,
        });
      }
      mkdirSync(cardsDir, { recursive: true });
      writeFileSync(filePath, serializeCard(card), "utf8");
    },

    updateFrontmatter(id: string, patch: SchedulerPatch): Card {
      validatePatch(patch, id);
      const raw = readRaw(id);
      parseCard(raw, id);
      const patched = patchFrontmatterLines(raw, patch, id);
      const updated = parseCard(patched, id);
      writeFileSync(cardPath(id), patched, "utf8");
      return updated;
    },

    // The user-initiated content-edit path (rewrite flow). Deliberately not
    // writeCard, which is create-only; the frontmatter block's bytes are kept
    // exactly as authored, only the body after it is replaced. Never renames.
    rewriteBody(id: string, front: string, back?: string): Card {
      const raw = readRaw(id);
      const existing = parseCard(raw, id);
      if (front.trim() === "") {
        fail({ code: "invalid-body", cardId: id, message: "a rewritten front must be non-empty" });
      }
      const keptBack = back ?? splitCardBody(existing.body)?.back ?? "";
      const body = `Q: ${front.trim()}\n\nA: ${keptBack.trim()}\n`;

      const lines = raw.split("\n");
      let end = -1;
      for (let i = 1; i < lines.length; i++) {
        if (lines[i]?.trim() === "---") {
          end = i;
          break;
        }
      }
      if (lines[0]?.trim() !== "---" || end === -1) {
        fail({ code: "invalid-frontmatter", cardId: id, message: "file has no closed frontmatter block" });
      }
      const rewritten = `${lines.slice(0, end + 1).join("\n")}\n${body}`;
      const updated = parseCard(rewritten, id);
      writeFileSync(cardPath(id), rewritten, "utf8");
      return updated;
    },

    deleteCard(id: string): void {
      const filePath = cardPath(id);
      if (!existsSync(filePath)) {
        fail({ code: "not-found", cardId: id, message: `no card file for id "${id}"` });
      }
      unlinkSync(filePath);
    },
  };
}
