import { afterEach, describe, expect, it } from "vitest";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { splitCardBody, type Card } from "@engram/shared";
import { generateCardId, openVault, parseCard, serializeCard, VaultError } from "./cards.ts";

const fixtureVault = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "__fixtures__",
  "vault",
);

const tempDirs: string[] = [];
afterEach(() => {
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function makeTempVault(seedFromFixture = false): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), "engram-test-vault-"));
  tempDirs.push(dir);
  if (seedFromFixture) cpSync(fixtureVault, dir, { recursive: true });
  else mkdirSync(path.join(dir, "flashcards"), { recursive: true });
  return dir;
}

const validFields: Record<string, string> = {
  box: "box: 2",
  due: "due: 2026-07-18",
  lapses: "lapses: 0",
  created: "created: 2026-07-01",
  source: "source: csapp",
  type: "type: symptom-cause",
};

function rawCard(overrides: Record<string, string | null> = {}, body?: string): string {
  const lines = Object.entries({ ...validFields })
    .map(([key, line]) => {
      const override = overrides[key];
      if (override === null) return undefined;
      return override ?? line;
    })
    .filter((line): line is string => line !== undefined);
  return `---\n${lines.join("\n")}\n---\n${body ?? "Q: A question?\n\nA: An answer.\n"}`;
}

function expectCardError(fn: () => unknown, code: string, messagePart?: RegExp): void {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(VaultError);
    const cardError = (error as VaultError).cardError;
    expect(cardError.code).toBe(code);
    if (messagePart) expect(cardError.message).toMatch(messagePart);
    return;
  }
  expect.unreachable("expected a VaultError");
}

describe("parseCard", () => {
  it("parses a minimal valid card", () => {
    const card = parseCard(rawCard(), "test-card");
    expect(card).toMatchObject({
      id: "test-card",
      box: 2,
      due: "2026-07-18",
      lapses: 0,
      created: "2026-07-01",
      source: "csapp",
      type: "symptom-cause",
    });
    expect(splitCardBody(card.body)).toEqual({ front: "A question?", back: "An answer." });
  });

  it("normalizes unquoted and quoted YAML dates to YYYY-MM-DD strings", () => {
    const unquoted = parseCard(rawCard({ due: "due: 2026-07-18" }), "a");
    const quoted = parseCard(rawCard({ due: "due: '2026-07-18'" }), "b");
    expect(unquoted.due).toBe("2026-07-18");
    expect(quoted.due).toBe("2026-07-18");
  });

  it.each(["box", "due", "lapses", "created", "source", "type"])(
    "rejects a card missing %s",
    (field) => {
      expectCardError(
        () => parseCard(rawCard({ [field]: null }), "x"),
        "invalid-frontmatter",
        new RegExp(`"${field}"`),
      );
    },
  );

  it.each([
    ["box out of range", { box: "box: 8" }],
    ["box not an integer", { box: "box: 2.5" }],
    ["unknown type slug", { type: "type: flashcard" }],
    ["empty source", { source: 'source: ""' }],
    ["negative lapses", { lapses: "lapses: -1" }],
    ["malformed due date", { due: "due: July 18" }],
  ])("rejects %s", (_label, overrides) => {
    expectCardError(() => parseCard(rawCard(overrides), "x"), "invalid-frontmatter");
  });

  it("rejects invalid YAML with a typed error", () => {
    expectCardError(() => parseCard("---\nbox: [unclosed\n---\nQ: x\nA: y\n", "x"), "invalid-yaml");
  });

  it.each([
    ["no Q: line", "Just some text.\n\nA: An answer.\n"],
    ["no A: line after Q:", "A: answer first\nQ: question after\n"],
    ["empty front", "Q:\nA: An answer.\n"],
  ])("rejects a body with %s", (_label, body) => {
    expectCardError(() => parseCard(rawCard({}, body), "x"), "invalid-body");
  });
});

describe("splitCardBody", () => {
  it("keeps multi-line fronts and backs with fences and math intact", () => {
    const body =
      "Q: Evaluate\n\n$$\\int x e^x \\, dx$$\n\nA: By parts:\n\n```python\nprint(1)\n```\n";
    expect(splitCardBody(body)).toEqual({
      front: "Evaluate\n\n$$\\int x e^x \\, dx$$",
      back: "By parts:\n\n```python\nprint(1)\n```",
    });
  });
});

describe("openVault", () => {
  it("fails fast when the vault path does not exist", () => {
    expectCardError(() => openVault("/nonexistent/engram-vault"), "vault-missing");
  });

  it("returns an empty list when flashcards/ does not exist yet", () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "engram-test-empty-"));
    tempDirs.push(dir);
    expect(openVault(dir).listCards()).toEqual({ cards: [], errors: [] });
  });
});

describe("listCards", () => {
  it("parses every valid fixture card and reports the invalid ones", () => {
    const { cards, errors } = openVault(fixtureVault).listCards();
    expect(cards.map((card) => card.id)).toEqual([
      "branch-predictor-guess",
      "btree-vs-hash-index",
      "integrate-by-parts",
      "memoization-definition",
      "tlb-miss-storm",
    ]);
    expect(cards.map((card) => card.type).sort()).toEqual([
      "decision-tradeoff",
      "definition",
      "prediction",
      "problem",
      "symptom-cause",
    ]);
    expect(errors).toHaveLength(2);
    expect(errors.map((error) => error.cardId).sort()).toEqual(["bad-yaml", "missing-source"]);
  });
});

describe("readCard / deleteCard", () => {
  it("reads a card by id", () => {
    const card = openVault(fixtureVault).readCard("integrate-by-parts");
    expect(card.type).toBe("problem");
    expect(card.body).toContain("$$\\int x e^x \\, dx$$");
    expect(card.body).toContain("```python");
  });

  it("throws not-found for a missing id", () => {
    expectCardError(() => openVault(fixtureVault).readCard("nope"), "not-found");
  });

  it.each(["../escape", "a/b", ""])("rejects unsafe id %j", (id) => {
    expectCardError(() => openVault(fixtureVault).readCard(id), "invalid-id");
  });

  it("deletes a card file", () => {
    const vault = openVault(makeTempVault(true));
    vault.deleteCard("tlb-miss-storm");
    expectCardError(() => vault.readCard("tlb-miss-storm"), "not-found");
    expectCardError(() => vault.deleteCard("tlb-miss-storm"), "not-found");
  });
});

describe("writeCard", () => {
  const card: Card = {
    id: "new-card-20260718120000",
    box: 1,
    due: "2026-07-19",
    lapses: 0,
    created: "2026-07-18",
    source: "ddia",
    type: "prediction",
    body: "Q: A new question?\n\nA: A new answer.\n",
  };

  it("writes a card that reads back identically", () => {
    const vault = openVault(makeTempVault());
    vault.writeCard(card);
    expect(vault.readCard(card.id)).toEqual(card);
  });

  it("rejects a card without a source (no creation path may omit it)", () => {
    const vault = openVault(makeTempVault());
    expectCardError(() => vault.writeCard({ ...card, source: "" }), "invalid-frontmatter", /source/);
  });

  it("rejects a card whose body lacks the Q:/A: structure", () => {
    const vault = openVault(makeTempVault());
    expectCardError(() => vault.writeCard({ ...card, body: "no structure" }), "invalid-body");
  });

  it("produces files that survive a serialize→parse round-trip unchanged", () => {
    const reparsed = parseCard(serializeCard(card), card.id);
    expect(reparsed).toEqual(card);
  });

  it("refuses to overwrite an existing card id rather than clobbering it", () => {
    const vault = openVault(makeTempVault());
    vault.writeCard(card);
    expectCardError(
      () => vault.writeCard({ ...card, body: "Q: Different?\n\nA: Different.\n" }),
      "id-collision",
    );
    // original content is untouched
    expect(vault.readCard(card.id).body).toBe(card.body);
  });
});

describe("updateFrontmatter", () => {
  it("changes only the patched frontmatter lines, byte-for-byte", () => {
    const vaultDir = makeTempVault(true);
    const filePath = path.join(vaultDir, "flashcards", "integrate-by-parts.md");
    const before = readFileSync(filePath, "utf8");

    openVault(vaultDir).updateFrontmatter("integrate-by-parts", {
      box: 4,
      due: "2026-07-29",
      lapses: 0,
    });

    const after = readFileSync(filePath, "utf8");
    expect(after).toBe(
      before.replace("box: 3", "box: 4").replace("due: 2026-07-21", "due: 2026-07-29"),
    );
  });

  it("preserves user formatting quirks outside the patched lines", () => {
    const vaultDir = makeTempVault();
    const quirky =
      "---\n" +
      "box:   2\n" +
      "due: '2026-07-18'\n" +
      "lapses: 0\n" +
      "created: 2026-07-01\n" +
      "source: csapp   \n" +
      "type: symptom-cause\n" +
      "---\n" +
      "\n" +
      "Q: Odd spacing everywhere?   \n" +
      "\n" +
      "A: Must survive untouched.\t\n" +
      "\n" +
      "```js\n" +
      "const x = 1;   // trailing spaces above and a tab up there\n" +
      "```\n";
    writeFileSync(path.join(vaultDir, "flashcards", "quirky.md"), quirky, "utf8");

    const updated = openVault(vaultDir).updateFrontmatter("quirky", { box: 3 });
    expect(updated.box).toBe(3);

    const after = readFileSync(path.join(vaultDir, "flashcards", "quirky.md"), "utf8");
    expect(after).toBe(quirky.replace("box:   2", "box: 3"));
  });

  it("returns the updated card", () => {
    const vault = openVault(makeTempVault(true));
    const updated = vault.updateFrontmatter("tlb-miss-storm", { lapses: 1, box: 1 });
    expect(updated).toMatchObject({ id: "tlb-miss-storm", box: 1, lapses: 1 });
  });

  it("rejects patches touching non-scheduler fields", () => {
    const vault = openVault(makeTempVault(true));
    expectCardError(
      () =>
        vault.updateFrontmatter("tlb-miss-storm", {
          source: "other",
        } as unknown as Parameters<typeof vault.updateFrontmatter>[1]),
      "invalid-frontmatter",
      /only change box, due, lapses/,
    );
  });

  it.each([
    ["box out of range", { box: 0 }],
    ["malformed due", { due: "tomorrow" }],
    ["negative lapses", { lapses: -2 }],
  ])("rejects invalid patch value: %s", (_label, patch) => {
    const vault = openVault(makeTempVault(true));
    expectCardError(() => vault.updateFrontmatter("tlb-miss-storm", patch), "invalid-frontmatter");
  });

  it("throws not-found for a missing id", () => {
    const vault = openVault(makeTempVault(true));
    expectCardError(() => vault.updateFrontmatter("nope", { box: 2 }), "not-found");
  });
});

describe("generateCardId", () => {
  const now = new Date(2026, 6, 18, 9, 5, 3);

  it("builds a kebab slug plus timestamp", () => {
    expect(generateCardId("What is the L3 cache?", now)).toBe(
      "what-is-the-l3-cache-20260718090503",
    );
  });

  it("truncates long fronts to ~40 chars without a trailing hyphen", () => {
    const id = generateCardId(
      "A loop's throughput drops ten times once the working set exceeds a few megabytes",
      now,
    );
    const slug = id.slice(0, id.length - "-20260718090503".length);
    expect(slug.length).toBeLessThanOrEqual(40);
    expect(slug.endsWith("-")).toBe(false);
    expect(id.endsWith("-20260718090503")).toBe(true);
  });

  it("falls back to 'card' for symbol-only fronts", () => {
    expect(generateCardId("→ ← ∮ ??", now)).toBe("card-20260718090503");
  });
});
