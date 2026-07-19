import { afterEach, describe, expect, it } from "vitest";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import type { Card, CardDTO, LeechesResponse, QueueResponse } from "@engram/shared";
import { openVault, type Vault } from "../vault/cards.ts";
import { createApp } from "./app.ts";

const TODAY = "2026-07-19";

const tempDirs: string[] = [];
afterEach(() => {
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

const stubLogs = {
  readLatestBefore: () => undefined,
  writeRecall: (date: string, sources: string[]) => ({ date, sources }),
};
const stubInbox = { list: () => [], append: () => undefined, remove: () => undefined };

function makeVault(): Vault {
  const dir = mkdtempSync(path.join(os.tmpdir(), "engram-leech-test-"));
  tempDirs.push(dir);
  mkdirSync(path.join(dir, "flashcards"));
  return openVault(dir);
}

let counter = 0;
function seedCard(vault: Vault, overrides: Partial<Card> = {}): Card {
  counter += 1;
  const card: Card = {
    id: `card-${counter}`,
    box: 2,
    due: TODAY,
    lapses: 0,
    created: "2026-07-01",
    source: `src-${counter}`,
    type: "symptom-cause",
    body: `Q: Question ${counter}?\n\nA: Answer ${counter}.\n`,
    ...overrides,
  };
  vault.writeCard(card);
  return card;
}

function makeApp(vault: Vault, today = TODAY) {
  return createApp({ vault, logs: stubLogs, inbox: stubInbox }, { today: () => today, rng: () => 0.5 });
}

function jsonRequest(method: string, body: unknown): RequestInit {
  return { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) };
}

describe("GET /api/leeches", () => {
  it("lists exactly the cards at 4+ lifetime lapses", async () => {
    const vault = makeVault();
    seedCard(vault, { lapses: 3 });
    const leech = seedCard(vault, { lapses: 4 });
    const worse = seedCard(vault, { lapses: 7 });
    const res = await makeApp(vault).request("/api/leeches");
    const body = (await res.json()) as LeechesResponse;
    expect(body.cards.map((card) => card.id).sort()).toEqual([leech.id, worse.id].sort());
    expect(body.cards.every((card) => card.leech)).toBe(true);
  });
});

describe("POST /api/cards/:id/rewrite", () => {
  it("rewrites the front, resets scheduling exactly, and preserves untouched fields", async () => {
    const vault = makeVault();
    const leech = seedCard(vault, { lapses: 5, box: 3 });
    const res = await makeApp(vault).request(
      `/api/cards/${leech.id}/rewrite`,
      jsonRequest("POST", { front: "Situation-shaped cue?" }),
    );
    expect(res.status).toBe(200);
    const dto = (await res.json()) as CardDTO;
    expect(dto).toMatchObject({
      id: leech.id,
      box: 1,
      lapses: 0,
      due: "2026-07-20",
      created: leech.created,
      source: leech.source,
      type: leech.type,
      front: "Situation-shaped cue?",
      leech: false,
    });
    expect(dto.back).toBe(leech.body.split("A: ")[1]?.trim());
  });

  it("replaces the back only when provided", async () => {
    const vault = makeVault();
    const leech = seedCard(vault, { lapses: 4 });
    const res = await makeApp(vault).request(
      `/api/cards/${leech.id}/rewrite`,
      jsonRequest("POST", { front: "New front", back: "New back." }),
    );
    expect(((await res.json()) as CardDTO).back).toBe("New back.");
  });

  it("rejects an empty front with 400", async () => {
    const vault = makeVault();
    const leech = seedCard(vault, { lapses: 4 });
    const res = await makeApp(vault).request(
      `/api/cards/${leech.id}/rewrite`,
      jsonRequest("POST", { front: "  " }),
    );
    expect(res.status).toBe(400);
  });

  it("404s an unknown id and 409s a non-leech", async () => {
    const vault = makeVault();
    const normal = seedCard(vault, { lapses: 3 });
    const app = makeApp(vault);
    expect(
      (await app.request("/api/cards/nope/rewrite", jsonRequest("POST", { front: "x" }))).status,
    ).toBe(404);
    expect(
      (await app.request(`/api/cards/${normal.id}/rewrite`, jsonRequest("POST", { front: "x" }))).status,
    ).toBe(409);
  });

  it("returns the card to rotation: queued tomorrow, out of the leech list", async () => {
    const vault = makeVault();
    const leech = seedCard(vault, { lapses: 4 });
    await makeApp(vault).request(
      `/api/cards/${leech.id}/rewrite`,
      jsonRequest("POST", { front: "Reshaped cue" }),
    );
    const leeches = (await (await makeApp(vault).request("/api/leeches")).json()) as LeechesResponse;
    expect(leeches.cards).toHaveLength(0);
    const tomorrowQueue = (await (
      await makeApp(vault, "2026-07-20").request("/api/queue")
    ).json()) as QueueResponse;
    expect(tomorrowQueue.cards.map((card) => card.id)).toContain(leech.id);
  });
});

describe("DELETE /api/cards/:id", () => {
  it("removes the card file", async () => {
    const vault = makeVault();
    const card = seedCard(vault);
    const res = await makeApp(vault).request(`/api/cards/${card.id}`, { method: "DELETE" });
    expect(res.status).toBe(200);
    expect(vault.listCards().cards).toHaveLength(0);
  });

  it("404s an unknown id", async () => {
    const vault = makeVault();
    const res = await makeApp(vault).request("/api/cards/ghost", { method: "DELETE" });
    expect(res.status).toBe(404);
  });
});
