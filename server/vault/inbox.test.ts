import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { VaultError } from "./cards.ts";
import { openInbox } from "./inbox.ts";

const tempDirs: string[] = [];
afterEach(() => {
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function makeVaultDir(): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), "engram-inbox-test-"));
  tempDirs.push(dir);
  return dir;
}

describe("append & list", () => {
  it("creates inbox.md on first capture and lists items in order", () => {
    const dir = makeVaultDir();
    const inbox = openInbox(dir);
    inbox.append("hash tables cliff near 0.7");
    inbox.append("why does tcp slow-start double");
    expect(inbox.list()).toEqual(["hash tables cliff near 0.7", "why does tcp slow-start double"]);
    expect(readFileSync(path.join(dir, "inbox.md"), "utf8")).toBe(
      "- hash tables cliff near 0.7\n- why does tcp slow-start double\n",
    );
  });

  it("appends to a hand-edited file without a trailing newline", () => {
    const dir = makeVaultDir();
    writeFileSync(path.join(dir, "inbox.md"), "- hand written", "utf8");
    const inbox = openInbox(dir);
    inbox.append("from app");
    expect(inbox.list()).toEqual(["hand written", "from app"]);
  });

  it("lists only list lines, ignoring stray prose", () => {
    const dir = makeVaultDir();
    writeFileSync(path.join(dir, "inbox.md"), "some note\n\n- real item\n", "utf8");
    expect(openInbox(dir).list()).toEqual(["real item"]);
  });

  it("returns empty for a missing file", () => {
    expect(openInbox(makeVaultDir()).list()).toEqual([]);
  });

  it("rejects empty or multi-line captures", () => {
    const inbox = openInbox(makeVaultDir());
    expect(() => inbox.append("   ")).toThrow(VaultError);
    expect(() => inbox.append("a\nb")).toThrow(VaultError);
  });
});

describe("remove", () => {
  it("removes by exact content match, leaving other bytes untouched", () => {
    const dir = makeVaultDir();
    writeFileSync(path.join(dir, "inbox.md"), "stray prose\n- keep me\n- drop me\n", "utf8");
    openInbox(dir).remove("drop me");
    expect(readFileSync(path.join(dir, "inbox.md"), "utf8")).toBe("stray prose\n- keep me\n");
  });

  it("removes only the first of duplicate captures", () => {
    const dir = makeVaultDir();
    const inbox = openInbox(dir);
    inbox.append("dup");
    inbox.append("dup");
    inbox.remove("dup");
    expect(inbox.list()).toEqual(["dup"]);
  });

  it("throws not-found when no line matches (file edited externally)", () => {
    const dir = makeVaultDir();
    openInbox(dir).append("present");
    expect(() => openInbox(dir).remove("absent")).toThrow(VaultError);
  });
});
