import { Hono } from "hono";
import type { CardsResponse, GradeResult, QueueResponse } from "@engram/shared";
import { VaultError, type Vault } from "../vault/cards.ts";
import { buildQueue } from "../scheduler/queue.ts";
import { grade } from "../scheduler/leitner.ts";
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

export function createApp(vault: Vault, options: AppOptions = {}): Hono {
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

  return app;
}
