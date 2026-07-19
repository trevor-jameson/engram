import { afterEach, describe, expect, it } from "vitest";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import type { CardDTO, InboxResponse } from "@engram/shared";
import { openVault, type Vault } from "../vault/cards.ts";
import { openInbox, type InboxStore } from "../vault/inbox.ts";
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

function makeStores(): { vault: Vault; inbox: InboxStore } {
  const dir = mkdtempSync(path.join(os.tmpdir(), "engram-inbox-api-test-"));
  tempDirs.push(dir);
  mkdirSync(path.join(dir, "flashcards"));
  return { vault: openVault(dir), inbox: openInbox(dir) };
}

function makeApp(vault: Vault, inbox: InboxStore) {
  return createApp({ vault, logs: stubLogs, inbox }, { today: () => TODAY, rng: () => 0.5 });
}

function jsonRequest(method: string, body: unknown): RequestInit {
  return { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) };
}

describe("inbox routes", () => {
  it("POST appends and returns the updated items; GET lists them", async () => {
    const { vault, inbox } = makeStores();
    const app = makeApp(vault, inbox);
    const posted = await app.request("/api/inbox", jsonRequest("POST", { text: " tcp slow start " }));
    expect(posted.status).toBe(200);
    expect((await posted.json()) as InboxResponse).toEqual({ items: ["tcp slow start"] });
    const listed = await app.request("/api/inbox");
    expect((await listed.json()) as InboxResponse).toEqual({ items: ["tcp slow start"] });
  });

  it("POST rejects empty or multi-line text", async () => {
    const { vault, inbox } = makeStores();
    const app = makeApp(vault, inbox);
    expect((await app.request("/api/inbox", jsonRequest("POST", { text: "  " }))).status).toBe(400);
    expect((await app.request("/api/inbox", jsonRequest("POST", { text: "a\nb" }))).status).toBe(400);
    expect((await app.request("/api/inbox", jsonRequest("POST", {}))).status).toBe(400);
  });

  it("DELETE discards by exact content match", async () => {
    const { vault, inbox } = makeStores();
    inbox.append("keep");
    inbox.append("drop");
    const res = await makeApp(vault, inbox).request("/api/inbox", jsonRequest("DELETE", { text: "drop" }));
    expect(res.status).toBe(200);
    expect((await res.json()) as InboxResponse).toEqual({ items: ["keep"] });
  });

  it("DELETE returns 404 when no line matches", async () => {
    const { vault, inbox } = makeStores();
    inbox.append("present");
    const res = await makeApp(vault, inbox).request("/api/inbox", jsonRequest("DELETE", { text: "absent" }));
    expect(res.status).toBe(404);
  });
});

describe("POST /api/cards", () => {
  const valid = {
    front: "Hash tables cliff — when?",
    back: "Open addressing near load 0.7; chaining degrades gradually.",
    source: "CLRS §11.2",
    type: "symptom-cause",
  };

  it("creates a card with scheduler defaults and returns its DTO", async () => {
    const { vault, inbox } = makeStores();
    const res = await makeApp(vault, inbox).request("/api/cards", jsonRequest("POST", valid));
    expect(res.status).toBe(201);
    const dto = (await res.json()) as CardDTO;
    expect(dto).toMatchObject({
      box: 1,
      lapses: 0,
      created: TODAY,
      due: "2026-07-20",
      source: valid.source,
      type: valid.type,
      front: valid.front,
      back: valid.back,
      leech: false,
    });
    expect(dto.id).toMatch(/^hash-tables-cliff-when-\d{14}$/);
    expect(vault.readCard(dto.id).source).toBe(valid.source);
  });

  it("rejects a missing or empty source (invariant 6: no sourceless creation path)", async () => {
    const { vault, inbox } = makeStores();
    const app = makeApp(vault, inbox);
    const withoutSource: Record<string, string> = { ...valid };
    delete withoutSource["source"];
    expect((await app.request("/api/cards", jsonRequest("POST", withoutSource))).status).toBe(400);
    const emptied = { ...valid, source: "   " };
    expect((await app.request("/api/cards", jsonRequest("POST", emptied))).status).toBe(400);
    expect(vault.listCards().cards).toHaveLength(0);
  });

  it("rejects missing front/back and unknown types", async () => {
    const { vault, inbox } = makeStores();
    const app = makeApp(vault, inbox);
    expect((await app.request("/api/cards", jsonRequest("POST", { ...valid, front: "" }))).status).toBe(400);
    expect((await app.request("/api/cards", jsonRequest("POST", { ...valid, back: "" }))).status).toBe(400);
    expect((await app.request("/api/cards", jsonRequest("POST", { ...valid, type: "cloze" }))).status).toBe(400);
  });

  it("removes the originating inbox item in the same request", async () => {
    const { vault, inbox } = makeStores();
    inbox.append("hash tables cliff");
    const res = await makeApp(vault, inbox).request(
      "/api/cards",
      jsonRequest("POST", { ...valid, inboxText: "hash tables cliff" }),
    );
    expect(res.status).toBe(201);
    expect(inbox.list()).toEqual([]);
  });

  it("still succeeds when the inbox line was already removed externally", async () => {
    const { vault, inbox } = makeStores();
    const res = await makeApp(vault, inbox).request(
      "/api/cards",
      jsonRequest("POST", { ...valid, inboxText: "already gone" }),
    );
    expect(res.status).toBe(201);
  });
});
