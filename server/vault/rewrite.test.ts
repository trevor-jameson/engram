import { afterEach, describe, expect, it } from "vitest";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { openVault, VaultError } from "./cards.ts";

const tempDirs: string[] = [];
afterEach(() => {
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

// Hand-authored formatting (comments, quoting) that must survive a rewrite.
const RAW = `---
box: 5            # promoted twice
due: 2026-07-19
lapses: 4
created: 2026-07-01
source: "CLRS §11.2"
type: definition
---
Q: What is a hash table?

A: Keys mapped to buckets.

With a second paragraph.
`;

function makeVaultDir(): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), "engram-rewrite-test-"));
  tempDirs.push(dir);
  mkdirSync(path.join(dir, "flashcards"));
  writeFileSync(path.join(dir, "flashcards", "leechy.md"), RAW, "utf8");
  return dir;
}

describe("rewriteBody", () => {
  it("replaces the front, keeps the back, and preserves frontmatter bytes exactly", () => {
    const dir = makeVaultDir();
    const card = openVault(dir).rewriteBody("leechy", "Lookup goes O(n) mid-incident — first structure to suspect?");
    const raw = readFileSync(path.join(dir, "flashcards", "leechy.md"), "utf8");
    expect(raw.startsWith(RAW.slice(0, RAW.indexOf("Q:")))).toBe(true);
    expect(raw).toContain("Q: Lookup goes O(n) mid-incident — first structure to suspect?");
    expect(raw).toContain("A: Keys mapped to buckets.\n\nWith a second paragraph.");
    expect(card.lapses).toBe(4); // scheduling reset is the API's job, not this path's
  });

  it("replaces the back when provided", () => {
    const dir = makeVaultDir();
    openVault(dir).rewriteBody("leechy", "New front?", "New back.");
    const raw = readFileSync(path.join(dir, "flashcards", "leechy.md"), "utf8");
    expect(raw).toContain("A: New back.");
    expect(raw).not.toContain("second paragraph");
  });

  it("rejects an empty front and an unknown id", () => {
    const dir = makeVaultDir();
    expect(() => openVault(dir).rewriteBody("leechy", "   ")).toThrow(VaultError);
    expect(() => openVault(dir).rewriteBody("missing", "x")).toThrow(VaultError);
  });

  it("never renames: the id and file stay stable across a rewrite", () => {
    const dir = makeVaultDir();
    const card = openVault(dir).rewriteBody("leechy", "Different front entirely");
    expect(card.id).toBe("leechy");
    expect(openVault(dir).readCard("leechy").body).toContain("Different front entirely");
  });
});
