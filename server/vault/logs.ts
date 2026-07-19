import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import type { SessionLog } from "@engram/shared";
import { VaultError } from "./cards.ts";

const LOGS_DIR = "logs";
const LOG_FILE_RE = /^(\d{4}-\d{2}-\d{2})\.md$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const RECALL_HEADING = "## Free recall";

function fail(message: string): never {
  throw new VaultError({ code: "invalid-frontmatter", message });
}

/** js-yaml parses unquoted `2026-07-18` as a UTC Date; normalize both forms to YYYY-MM-DD. */
function normalizeDate(value: unknown): string | undefined {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === "string" && DATE_RE.test(value)) return value;
  return undefined;
}

/** Parses a session-log file's frontmatter. Throws VaultError on invalid logs. */
export function parseSessionLog(raw: string, fileDate: string): SessionLog {
  let data: unknown;
  try {
    data = matter(raw).data;
  } catch (cause) {
    fail(
      `log ${fileDate}: frontmatter is not valid YAML: ${cause instanceof Error ? cause.message : String(cause)}`,
    );
  }
  const record = typeof data === "object" && data !== null ? (data as Record<string, unknown>) : {};
  const date = normalizeDate(record["date"]);
  if (date === undefined) fail(`log ${fileDate}: "date" must be a YYYY-MM-DD date`);
  const sources = record["sources"];
  if (!Array.isArray(sources) || !sources.every((s) => typeof s === "string")) {
    fail(`log ${fileDate}: "sources" must be a list of strings`);
  }
  return { date, sources: sources as string[] };
}

export interface SessionLogStore {
  /** The most recent log strictly before `date`, or undefined on a first-ever session. */
  readLatestBefore(date: string): SessionLog | undefined;
  /**
   * Persists a free-recall dump for `date`: creates `logs/<date>.md`, or — on a
   * same-day re-run — appends a second "## Free recall" section, leaving every
   * existing byte of the file untouched.
   */
  writeRecall(date: string, sources: string[], text: string): SessionLog;
}

export function openSessionLogs(vaultPath: string): SessionLogStore {
  const logsDir = path.join(path.resolve(vaultPath), LOGS_DIR);

  function logPath(date: string): string {
    if (!DATE_RE.test(date)) fail(`log dates must be YYYY-MM-DD (got "${date}")`);
    return path.join(logsDir, `${date}.md`);
  }

  return {
    readLatestBefore(date: string): SessionLog | undefined {
      if (!existsSync(logsDir)) return undefined;
      const latest = readdirSync(logsDir)
        .map((name) => LOG_FILE_RE.exec(name)?.[1])
        .filter((d): d is string => d !== undefined && d < date)
        .sort()
        .at(-1);
      if (latest === undefined) return undefined;
      return parseSessionLog(readFileSync(logPath(latest), "utf8"), latest);
    },

    writeRecall(date: string, sources: string[], text: string): SessionLog {
      const filePath = logPath(date);
      const section = `${RECALL_HEADING}\n${text.trim() === "" ? "" : `\n${text.trim()}\n`}`;
      if (existsSync(filePath)) {
        const raw = readFileSync(filePath, "utf8");
        const log = parseSessionLog(raw, date);
        writeFileSync(filePath, `${raw}${raw.endsWith("\n") ? "" : "\n"}\n${section}`, "utf8");
        return log;
      }
      mkdirSync(logsDir, { recursive: true });
      writeFileSync(filePath, matter.stringify(`\n${section}`, { date, sources }), "utf8");
      return { date, sources };
    },
  };
}
