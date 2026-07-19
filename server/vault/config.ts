import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

export const DEFAULT_PORT = 4321;
export const CONFIG_FILENAME = "engram.config.json";

export interface EngramConfig {
  /** Absolute path to the vault folder. */
  vaultPath: string;
  port: number;
}

export class ConfigError extends Error {}

export interface LoadConfigOptions {
  /** Explicit path to the config file. Defaults to searching upward from cwd for engram.config.json. */
  configPath?: string;
  /** Environment map. Defaults to process.env. */
  env?: Record<string, string | undefined>;
}

interface ConfigFileContents {
  vaultPath?: string;
  port?: number;
}

function findConfigFile(startDir: string): string | undefined {
  let dir = path.resolve(startDir);
  for (;;) {
    const candidate = path.join(dir, CONFIG_FILENAME);
    if (existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) return undefined;
    dir = parent;
  }
}

function readConfigFile(filePath: string): ConfigFileContents {
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(filePath, "utf8"));
  } catch (cause) {
    throw new ConfigError(`${filePath} is not valid JSON`, { cause });
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new ConfigError(`${filePath} must contain a JSON object`);
  }
  const record = parsed as Record<string, unknown>;
  const contents: ConfigFileContents = {};
  if (record["vaultPath"] !== undefined) {
    if (typeof record["vaultPath"] !== "string" || record["vaultPath"] === "") {
      throw new ConfigError(`${filePath}: "vaultPath" must be a non-empty string`);
    }
    contents.vaultPath = path.resolve(path.dirname(filePath), record["vaultPath"]);
  }
  if (record["port"] !== undefined) {
    if (typeof record["port"] !== "number" || !isValidPort(record["port"])) {
      throw new ConfigError(`${filePath}: "port" must be an integer between 1 and 65535`);
    }
    contents.port = record["port"];
  }
  return contents;
}

function isValidPort(value: number): boolean {
  return Number.isInteger(value) && value >= 1 && value <= 65535;
}

function portFromEnv(raw: string): number {
  const port = Number(raw);
  if (!isValidPort(port)) {
    throw new ConfigError(`ENGRAM_PORT must be an integer between 1 and 65535, got "${raw}"`);
  }
  return port;
}

/**
 * Resolves the app configuration. Env vars ENGRAM_VAULT_PATH / ENGRAM_PORT
 * override the config file; port defaults to 4321. Fails fast when no vault
 * path is resolvable from either mechanism.
 */
export function loadConfig(options: LoadConfigOptions = {}): EngramConfig {
  const env = options.env ?? process.env;
  const configPath = options.configPath ?? findConfigFile(process.cwd());
  const file: ConfigFileContents =
    configPath !== undefined && existsSync(configPath) ? readConfigFile(configPath) : {};

  const envVaultPath = env["ENGRAM_VAULT_PATH"];
  const vaultPath =
    envVaultPath !== undefined && envVaultPath !== ""
      ? path.resolve(envVaultPath)
      : file.vaultPath;
  if (vaultPath === undefined) {
    throw new ConfigError(
      `No vault path configured. Set "vaultPath" in ${CONFIG_FILENAME} at the repo root ` +
        `(see engram.config.example.json) or set the ENGRAM_VAULT_PATH environment variable.`,
    );
  }

  const envPort = env["ENGRAM_PORT"];
  const port =
    envPort !== undefined && envPort !== "" ? portFromEnv(envPort) : (file.port ?? DEFAULT_PORT);

  return { vaultPath, port };
}
