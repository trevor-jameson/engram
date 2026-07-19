import { afterEach, describe, expect, it } from "vitest";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import type { Card, RecallContextResponse, SessionLog } from "@engram/shared";
import { openVault, type Vault } from "../vault/cards.ts";
import { openSessionLogs, type SessionLogStore } from "../vault/logs.ts";
import { createApp } from "./app.ts";

const TODAY = "2026-07-19";
const YESTERDAY = "2026-07-18";

const tempDirs: string[] = [];
afterEach(() => {
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function makeStores(): { vault: Vault; logs: SessionLogStore } {
  const dir = mkdtempSync(path.join(os.tmpdir(), "engram-session-test-"));
  tempDirs.push(dir);
  mkdirSync(path.join(dir, "flashcards"));
  return { vault: openVault(dir), logs: openSessionLogs(dir) };
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

const stubInbox = { list: () => [], append: () => undefined, remove: () => undefined };

function makeApp(vault: Vault, logs: SessionLogStore, today = TODAY) {
  return createApp({ vault, logs, inbox: stubInbox }, { today: () => today, rng: () => 0.5 });
}

describe("GET /api/session/recall-context", () => {
  it("returns null lastSources on the first-ever session", async () => {
    const { vault, logs } = makeStores();
    const res = await makeApp(vault, logs).request("/api/session/recall-context");
    expect(res.status).toBe(200);
    expect((await res.json()) as RecallContextResponse).toEqual({ lastSources: null });
  });

  it("returns the previous session's sources", async () => {
    const { vault, logs } = makeStores();
    logs.writeRecall(YESTERDAY, ["CLRS §11.2", "SRE book"], "dump");
    const res = await makeApp(vault, logs).request("/api/session/recall-context");
    expect((await res.json()) as RecallContextResponse).toEqual({
      lastSources: ["CLRS §11.2", "SRE book"],
    });
  });

  it("ignores today's own log (a same-day re-run still names the prior day)", async () => {
    const { vault, logs } = makeStores();
    logs.writeRecall(YESTERDAY, ["prior"], "a");
    logs.writeRecall(TODAY, ["today"], "b");
    const res = await makeApp(vault, logs).request("/api/session/recall-context");
    expect((await res.json()) as RecallContextResponse).toEqual({ lastSources: ["prior"] });
  });
});

describe("POST /api/session/recall", () => {
  function post(app: ReturnType<typeof makeApp>, body: unknown) {
    return app.request("/api/session/recall", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("writes today's log with the queue's unique sources", async () => {
    const { vault, logs } = makeStores();
    seedCard(vault, { source: "shared-src" });
    seedCard(vault, { source: "shared-src" });
    seedCard(vault, { source: "other-src" });
    const res = await post(makeApp(vault, logs), { text: "brain dump" });
    expect(res.status).toBe(200);
    const log = (await res.json()) as SessionLog;
    expect(log.date).toBe(TODAY);
    expect([...log.sources].sort()).toEqual(["other-src", "shared-src"]);
    expect(logs.readLatestBefore("2026-07-20")?.sources).toEqual(log.sources);
  });

  it("allows empty text — skipping the dump still records sources", async () => {
    const { vault, logs } = makeStores();
    seedCard(vault, { source: "src-a" });
    const res = await post(makeApp(vault, logs), { text: "" });
    expect(res.status).toBe(200);
    expect(((await res.json()) as SessionLog).sources).toEqual(["src-a"]);
  });

  it("records an empty source list on a 0-due day (recall still happens)", async () => {
    const { vault, logs } = makeStores();
    const res = await post(makeApp(vault, logs), { text: "dump" });
    expect(((await res.json()) as SessionLog).sources).toEqual([]);
  });

  it("rejects a body without a string text field", async () => {
    const { vault, logs } = makeStores();
    expect((await post(makeApp(vault, logs), { text: 42 })).status).toBe(400);
    expect((await post(makeApp(vault, logs), {})).status).toBe(400);
  });

  it("second POST the same day appends and keeps the first run's frontmatter", async () => {
    const { vault, logs } = makeStores();
    seedCard(vault, { source: "src-a" });
    const app = makeApp(vault, logs);
    await post(app, { text: "first" });
    seedCard(vault, { source: "src-b" });
    const res = await post(app, { text: "second" });
    expect(((await res.json()) as SessionLog).sources).toEqual(["src-a"]);
  });
});
