import { afterEach, describe, expect, it } from "vitest";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Card, CardDTO, CardsResponse, QueueResponse } from "@engram/shared";
import { openVault, type Vault } from "../vault/cards.ts";
import { createApp } from "./app.ts";

const TODAY = "2026-07-19";
const fixtureVault = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "vault",
  "__fixtures__",
  "vault",
);

const tempDirs: string[] = [];
afterEach(() => {
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

/** Temp-dir creation is the only direct fs this file does; cards go through the vault module. */
function makeVault(): Vault {
  const dir = mkdtempSync(path.join(os.tmpdir(), "engram-api-test-"));
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

function seededRng(seed: number): () => number {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Card-route tests don't touch session logs; a stub keeps them isolated. */
const stubLogs = {
  readLatestBefore: () => undefined,
  writeRecall: (date: string, sources: string[]) => ({ date, sources }),
};

function makeApp(vault: Vault, seed = 1) {
  return createApp(vault, stubLogs, { today: () => TODAY, rng: seededRng(seed) });
}

describe("GET /api/queue", () => {
  it("returns queue DTOs with split front/back and counts", async () => {
    const vault = makeVault();
    seedCard(vault, { due: "2026-07-10" });
    seedCard(vault, { due: "2026-07-15" });
    const res = await makeApp(vault).request("/api/queue");
    expect(res.status).toBe(200);
    const body = (await res.json()) as QueueResponse;
    expect(body.counts).toEqual({ due: 2, queued: 2, overflow: 0 });
    const card = body.cards[0];
    expect(card?.front).toMatch(/^Question \d+\?$/);
    expect(card?.back).toMatch(/^Answer \d+\.$/);
    expect(card).not.toHaveProperty("body");
  });

  it("shows the weighted cap: 30 due singles → 25 queued, 5 overflow", async () => {
    const vault = makeVault();
    for (let i = 0; i < 30; i++) seedCard(vault, { due: "2026-07-01" });
    const body = (await (await makeApp(vault).request("/api/queue")).json()) as QueueResponse;
    expect(body.counts).toEqual({ due: 30, queued: 25, overflow: 5 });
  });

  it("shows floor-as-fill: 3 due + upcoming → 5 queued, 0 overflow", async () => {
    const vault = makeVault();
    for (let i = 0; i < 3; i++) seedCard(vault, { due: TODAY });
    for (let i = 0; i < 4; i++) seedCard(vault, { due: "2026-07-25" });
    const body = (await (await makeApp(vault).request("/api/queue")).json()) as QueueResponse;
    expect(body.counts).toEqual({ due: 3, queued: 5, overflow: 0 });
  });

  it("excludes leech-flagged cards", async () => {
    const vault = makeVault();
    const leech = seedCard(vault, { lapses: 4, due: "2026-07-01" });
    seedCard(vault, { due: TODAY });
    const body = (await (await makeApp(vault).request("/api/queue")).json()) as QueueResponse;
    expect(body.cards.map((card) => card.id)).not.toContain(leech.id);
    expect(body.counts.due).toBe(1);
  });

  it("rebuilds identically from files across app instances under the same seed", async () => {
    const vault = makeVault();
    for (let i = 0; i < 8; i++) seedCard(vault, { due: "2026-07-0" + ((i % 5) + 1) });
    const first = (await (await makeApp(vault, 42).request("/api/queue")).json()) as QueueResponse;
    const second = (await (await makeApp(vault, 42).request("/api/queue")).json()) as QueueResponse;
    expect(first.cards.map((card) => card.id)).toEqual(second.cards.map((card) => card.id));
  });
});

describe("GET /api/cards", () => {
  it("returns frontmatter summaries and reports invalid files", async () => {
    const vault = openVault(fixtureVault);
    const res = await makeApp(vault).request("/api/cards");
    expect(res.status).toBe(200);
    const body = (await res.json()) as CardsResponse;
    expect(body.cards).toHaveLength(5);
    expect(body.cards[0]).not.toHaveProperty("front");
    expect(body.cards[0]).not.toHaveProperty("body");
    expect(body.errors.map((error) => error.cardId).sort()).toEqual(["bad-yaml", "missing-source"]);
  });
});

describe("GET /api/cards/:id", () => {
  it("returns a single card DTO", async () => {
    const res = await makeApp(openVault(fixtureVault)).request("/api/cards/integrate-by-parts");
    expect(res.status).toBe(200);
    const body = (await res.json()) as CardDTO;
    expect(body.id).toBe("integrate-by-parts");
    expect(body.front).toContain("$$\\int x e^x \\, dx$$");
    expect(body.leech).toBe(false);
  });

  it("404s an unknown id", async () => {
    const res = await makeApp(openVault(fixtureVault)).request("/api/cards/nope");
    expect(res.status).toBe(404);
    expect(await res.json()).toHaveProperty("error");
  });

  it("400s a path-traversal id", async () => {
    const res = await makeApp(openVault(fixtureVault)).request("/api/cards/..%2Fescape");
    expect(res.status).toBe(400);
  });
});

describe("POST /api/cards/:id/grade", () => {
  function gradeReq(app: ReturnType<typeof createApp>, id: string, body: unknown) {
    return app.request(`/api/cards/${id}/grade`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    });
  }

  it("pass moves the card up a box and persists to disk", async () => {
    const vault = makeVault();
    const card = seedCard(vault, { box: 2, due: TODAY });
    const res = await gradeReq(makeApp(vault), card.id, { result: "pass" });
    expect(res.status).toBe(200);
    const body = (await res.json()) as CardDTO;
    expect(body.box).toBe(3);
    expect(body.due).toBe("2026-07-23");
    const onDisk = vault.readCard(card.id);
    expect(onDisk.box).toBe(3);
    expect(onDisk.due).toBe("2026-07-23");
  });

  it("lapse moves the card down a box and increments lapses on disk", async () => {
    const vault = makeVault();
    const card = seedCard(vault, { box: 3, lapses: 1 });
    const res = await gradeReq(makeApp(vault), card.id, { result: "lapse" });
    const body = (await res.json()) as CardDTO;
    expect(body.box).toBe(2);
    expect(body.lapses).toBe(2);
    expect(vault.readCard(card.id).lapses).toBe(2);
  });

  it("a 4th lapse leech-flags the card in the response", async () => {
    const vault = makeVault();
    const card = seedCard(vault, { box: 2, lapses: 3 });
    const body = (await (
      await gradeReq(makeApp(vault), card.id, { result: "lapse" })
    ).json()) as CardDTO;
    expect(body.lapses).toBe(4);
    expect(body.leech).toBe(true);
  });

  it("409s grading an already leech-flagged card, leaving the file untouched", async () => {
    const vault = makeVault();
    const card = seedCard(vault, { lapses: 4, box: 3 });
    const res = await gradeReq(makeApp(vault), card.id, { result: "pass" });
    expect(res.status).toBe(409);
    expect(vault.readCard(card.id).box).toBe(3);
  });

  it("400s a bad result value and non-JSON bodies", async () => {
    const vault = makeVault();
    const card = seedCard(vault);
    expect((await gradeReq(makeApp(vault), card.id, { result: "meh" })).status).toBe(400);
    expect((await gradeReq(makeApp(vault), card.id, "not json")).status).toBe(400);
  });

  it("404s an unknown id", async () => {
    const res = await gradeReq(makeApp(makeVault()), "nope", { result: "pass" });
    expect(res.status).toBe(404);
  });
});
