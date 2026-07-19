import { Hono } from "hono";
import {
  CARD_TYPES,
  type Card,
  type CardsResponse,
  type CardType,
  type GradeResult,
  type InboxResponse,
  type QueueResponse,
  type RecallContextResponse,
} from "@engram/shared";
import { generateCardId, VaultError, type Vault } from "../vault/cards.ts";
import type { SessionLogStore } from "../vault/logs.ts";
import type { InboxStore } from "../vault/inbox.ts";
import { buildQueue } from "../scheduler/queue.ts";
import { grade, newCardDefaults } from "../scheduler/leitner.ts";
import { isLeech } from "../scheduler/leech.ts";
import { isDue } from "../scheduler/dates.ts";
import { toCardDTO, toCardSummary } from "./dto.ts";

/** Today's date in the machine's local timezone (sessions belong to local days). */
function todayLocal(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

const STATUS_BY_CODE = {
  "not-found": 404,
  "invalid-id": 400,
  "id-collision": 409,
  "vault-missing": 500,
  "invalid-yaml": 422,
  "invalid-frontmatter": 422,
  "invalid-body": 422,
} as const;

export interface AppOptions {
  /** Injectable clock for tests; defaults to the local date. */
  today?: () => string;
  /** Injectable RNG for deterministic queue ordering in tests. */
  rng?: () => number;
}

function isGradeResult(value: unknown): value is GradeResult {
  return value === "pass" || value === "lapse";
}

/** Unique `source` values of a queue, in queue order. */
function queueSources(queue: Card[]): string[] {
  return [...new Set(queue.map((card) => card.source))];
}

/** Extracts a trimmed, non-empty single-line `text` field from a request body. */
function textField(body: unknown): string | undefined {
  const value =
    typeof body === "object" && body !== null && "text" in body
      ? (body as Record<string, unknown>)["text"]
      : undefined;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed === "" || trimmed.includes("\n") ? undefined : trimmed;
}

export interface AppStores {
  vault: Vault;
  logs: SessionLogStore;
  inbox: InboxStore;
}

export function createApp(stores: AppStores, options: AppOptions = {}): Hono {
  const { vault, logs, inbox } = stores;
  const today = options.today ?? todayLocal;
  const rng = options.rng ?? Math.random;
  const app = new Hono();

  app.onError((error, c) => {
    if (error instanceof VaultError) {
      return c.json({ error: error.cardError.message }, STATUS_BY_CODE[error.cardError.code]);
    }
    console.error(error);
    return c.json({ error: "internal error" }, 500);
  });

  app.get("/api/queue", (c) => {
    const { cards } = vault.listCards();
    const date = today();
    const queue = buildQueue(cards, date, rng);
    const dueCount = cards.filter((card) => !isLeech(card) && isDue(card.due, date)).length;
    const queuedDue = queue.filter((card) => isDue(card.due, date)).length;
    const response: QueueResponse = {
      cards: queue.map(toCardDTO),
      counts: { due: dueCount, queued: queue.length, overflow: dueCount - queuedDue },
    };
    return c.json(response);
  });

  app.get("/api/cards", (c) => {
    const { cards, errors } = vault.listCards();
    const response: CardsResponse = { cards: cards.map(toCardSummary), errors };
    return c.json(response);
  });

  app.get("/api/cards/:id", (c) => {
    return c.json(toCardDTO(vault.readCard(c.req.param("id"))));
  });

  app.post("/api/cards/:id/grade", async (c) => {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "request body must be JSON" }, 400);
    }
    const result =
      typeof body === "object" && body !== null && "result" in body
        ? (body as Record<string, unknown>)["result"]
        : undefined;
    if (!isGradeResult(result)) {
      return c.json({ error: 'body must be { "result": "pass" | "lapse" }' }, 400);
    }

    const card = vault.readCard(c.req.param("id"));
    if (isLeech(card)) {
      return c.json({ error: "card is leech-flagged; rewrite or delete it instead of grading" }, 409);
    }
    const updated = vault.updateFrontmatter(card.id, grade(card, result, today()));
    return c.json(toCardDTO(updated));
  });

  app.get("/api/session/recall-context", (c) => {
    const last = logs.readLatestBefore(today());
    const response: RecallContextResponse = { lastSources: last?.sources ?? null };
    return c.json(response);
  });

  app.post("/api/session/recall", async (c) => {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "request body must be JSON" }, 400);
    }
    const text =
      typeof body === "object" && body !== null && "text" in body
        ? (body as Record<string, unknown>)["text"]
        : undefined;
    if (typeof text !== "string") {
      return c.json({ error: 'body must be { "text": string } (empty text is allowed)' }, 400);
    }

    const date = today();
    const queue = buildQueue(vault.listCards().cards, date, rng);
    return c.json(logs.writeRecall(date, queueSources(queue), text));
  });

  app.get("/api/inbox", (c) => {
    const response: InboxResponse = { items: inbox.list() };
    return c.json(response);
  });

  app.post("/api/inbox", async (c) => {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "request body must be JSON" }, 400);
    }
    const text = textField(body);
    if (text === undefined) {
      return c.json({ error: 'body must be { "text": string }, a non-empty single line' }, 400);
    }
    inbox.append(text);
    const response: InboxResponse = { items: inbox.list() };
    return c.json(response);
  });

  app.delete("/api/inbox", async (c) => {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "request body must be JSON" }, 400);
    }
    const text = textField(body);
    if (text === undefined) {
      return c.json({ error: 'body must be { "text": string }, a non-empty single line' }, 400);
    }
    inbox.remove(text);
    const response: InboxResponse = { items: inbox.list() };
    return c.json(response);
  });

  app.post("/api/cards", async (c) => {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "request body must be JSON" }, 400);
    }
    const record = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
    const problems: string[] = [];
    const requireText = (key: "front" | "back" | "source"): string => {
      const value = record[key];
      if (typeof value !== "string" || value.trim() === "") {
        problems.push(`"${key}" is required and must be a non-empty string`);
        return "";
      }
      return value.trim();
    };
    const front = requireText("front");
    const back = requireText("back");
    const source = requireText("source");
    const type = record["type"];
    if (typeof type !== "string" || !(CARD_TYPES as readonly string[]).includes(type)) {
      problems.push(`"type" must be one of: ${CARD_TYPES.join(", ")}`);
    }
    const inboxText = record["inboxText"];
    if (inboxText !== undefined && typeof inboxText !== "string") {
      problems.push('"inboxText" must be a string when present');
    }
    if (problems.length > 0) {
      return c.json({ error: problems.join("; ") }, 400);
    }

    const date = today();
    const card: Card = {
      id: generateCardId(front),
      ...newCardDefaults(date),
      source,
      type: type as CardType,
      body: `Q: ${front}\n\nA: ${back}\n`,
    };
    vault.writeCard(card);
    if (typeof inboxText === "string") {
      try {
        inbox.remove(inboxText);
      } catch (error) {
        // The card is already created; a capture line that vanished under an
        // external edit is not a failure of this request.
        if (!(error instanceof VaultError) || error.cardError.code !== "not-found") throw error;
      }
    }
    return c.json(toCardDTO(card), 201);
  });

  return app;
}
