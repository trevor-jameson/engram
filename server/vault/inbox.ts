import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { VaultError } from "./cards.ts";

const INBOX_FILE = "inbox.md";
const ITEM_PREFIX = "- ";

function fail(code: "invalid-body" | "not-found", message: string): never {
  throw new VaultError({ code, message });
}

/** A capture must be a single non-empty line — the format is one list item per line. */
function validateItemText(text: string): string {
  const trimmed = text.trim();
  if (trimmed === "" || trimmed.includes("\n")) {
    fail("invalid-body", "inbox items must be single non-empty lines");
  }
  return trimmed;
}

export interface InboxStore {
  /** Current capture lines, in file order. */
  list(): string[];
  append(text: string): void;
  /**
   * Removes the first list line whose content exactly matches `text` — never
   * by index, since the file may be hand-edited between listing and deleting.
   * All other bytes (including hand-written non-list lines) stay untouched.
   */
  remove(text: string): void;
}

export function openInbox(vaultPath: string): InboxStore {
  const filePath = path.join(path.resolve(vaultPath), INBOX_FILE);

  function readLines(): string[] {
    if (!existsSync(filePath)) return [];
    return readFileSync(filePath, "utf8").split("\n");
  }

  return {
    list(): string[] {
      return readLines()
        .filter((line) => line.startsWith(ITEM_PREFIX))
        .map((line) => line.slice(ITEM_PREFIX.length).trim())
        .filter((text) => text !== "");
    },

    append(text: string): void {
      const item = validateItemText(text);
      const raw = existsSync(filePath) ? readFileSync(filePath, "utf8") : "";
      const glue = raw === "" || raw.endsWith("\n") ? "" : "\n";
      writeFileSync(filePath, `${raw}${glue}${ITEM_PREFIX}${item}\n`, "utf8");
    },

    remove(text: string): void {
      const item = validateItemText(text);
      const lines = readLines();
      const index = lines.findIndex(
        (line) => line.startsWith(ITEM_PREFIX) && line.slice(ITEM_PREFIX.length).trim() === item,
      );
      if (index === -1) {
        fail("not-found", "no inbox line matches that text (the file may have been edited)");
      }
      lines.splice(index, 1);
      writeFileSync(filePath, lines.join("\n"), "utf8");
    },
  };
}
