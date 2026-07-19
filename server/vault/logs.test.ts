import { afterEach, describe, expect, it } from "vitest";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { VaultError } from "./cards.ts";
import { openSessionLogs, parseSessionLog } from "./logs.ts";

const tempDirs: string[] = [];
afterEach(() => {
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function makeVaultDir(): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), "engram-logs-test-"));
  tempDirs.push(dir);
  return dir;
}

function logFile(dir: string, date: string): string {
  return path.join(dir, "logs", `${date}.md`);
}

describe("writeRecall", () => {
  it("creates logs/<date>.md with date/sources frontmatter and the dump", () => {
    const dir = makeVaultDir();
    openSessionLogs(dir).writeRecall("2026-07-19", ["CLRS §11.2", "SRE book ch4"], "hash tables degrade");
    const raw = readFileSync(logFile(dir, "2026-07-19"), "utf8");
    expect(raw).toContain("## Free recall");
    expect(raw).toContain("hash tables degrade");
    expect(parseSessionLog(raw, "2026-07-19")).toEqual({
      date: "2026-07-19",
      sources: ["CLRS §11.2", "SRE book ch4"],
    });
  });

  it("allows an empty dump — the section is written headed but empty", () => {
    const dir = makeVaultDir();
    openSessionLogs(dir).writeRecall("2026-07-19", ["src"], "   ");
    const raw = readFileSync(logFile(dir, "2026-07-19"), "utf8");
    expect(raw).toContain("## Free recall");
    expect(parseSessionLog(raw, "2026-07-19").sources).toEqual(["src"]);
  });

  it("same-day re-run appends a second section, leaving existing bytes untouched", () => {
    const dir = makeVaultDir();
    const logs = openSessionLogs(dir);
    logs.writeRecall("2026-07-19", ["first"], "morning dump");
    const before = readFileSync(logFile(dir, "2026-07-19"), "utf8");
    const returned = logs.writeRecall("2026-07-19", ["second"], "evening dump");
    const after = readFileSync(logFile(dir, "2026-07-19"), "utf8");
    expect(after.startsWith(before)).toBe(true);
    expect(after.match(/## Free recall/g)).toHaveLength(2);
    expect(after).toContain("evening dump");
    // Frontmatter keeps the first run's sources; the append never rewrites it.
    expect(returned.sources).toEqual(["first"]);
  });

  it("round-trips: written file parses back to the same date and sources", () => {
    const dir = makeVaultDir();
    const written = openSessionLogs(dir).writeRecall("2026-07-19", ['tricky "quoted" source'], "x");
    const raw = readFileSync(logFile(dir, "2026-07-19"), "utf8");
    expect(parseSessionLog(raw, "2026-07-19")).toEqual(written);
  });

  it("rejects a non-date filename date", () => {
    const dir = makeVaultDir();
    expect(() => openSessionLogs(dir).writeRecall("not-a-date", [], "x")).toThrow(VaultError);
  });
});

describe("readLatestBefore", () => {
  it("returns undefined when no logs exist (first-ever session)", () => {
    expect(openSessionLogs(makeVaultDir()).readLatestBefore("2026-07-19")).toBeUndefined();
  });

  it("returns the most recent log strictly before the given date", () => {
    const dir = makeVaultDir();
    const logs = openSessionLogs(dir);
    logs.writeRecall("2026-07-17", ["older"], "a");
    logs.writeRecall("2026-07-18", ["newer"], "b");
    logs.writeRecall("2026-07-19", ["today"], "c");
    expect(logs.readLatestBefore("2026-07-19")?.sources).toEqual(["newer"]);
  });

  it("ignores files that are not YYYY-MM-DD.md logs", () => {
    const dir = makeVaultDir();
    mkdirSync(path.join(dir, "logs"));
    writeFileSync(path.join(dir, "logs", "notes.md"), "not a log", "utf8");
    expect(openSessionLogs(dir).readLatestBefore("2026-07-19")).toBeUndefined();
  });

  it("throws a typed error on a log with invalid frontmatter", () => {
    const dir = makeVaultDir();
    mkdirSync(path.join(dir, "logs"));
    writeFileSync(path.join(dir, "logs", "2026-07-18.md"), "---\ndate: nope\n---\nx", "utf8");
    expect(() => openSessionLogs(dir).readLatestBefore("2026-07-19")).toThrow(VaultError);
  });

  it("parses an unquoted YAML date (hand-authored in Obsidian)", () => {
    const dir = makeVaultDir();
    mkdirSync(path.join(dir, "logs"));
    writeFileSync(
      path.join(dir, "logs", "2026-07-18.md"),
      "---\ndate: 2026-07-18\nsources:\n  - hand-written\n---\n\n## Free recall\n\nnotes\n",
      "utf8",
    );
    expect(openSessionLogs(dir).readLatestBefore("2026-07-19")).toEqual({
      date: "2026-07-18",
      sources: ["hand-written"],
    });
  });
});
