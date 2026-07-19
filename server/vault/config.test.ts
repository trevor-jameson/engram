import { describe, expect, it } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ConfigError, DEFAULT_HOST, DEFAULT_PORT, loadConfig } from "./config.ts";

const fixtures = path.join(path.dirname(fileURLToPath(import.meta.url)), "__fixtures__", "config");
const fixture = (name: string) => path.join(fixtures, name);

describe("loadConfig", () => {
  it("reads vaultPath and port from the config file when env is empty", () => {
    const config = loadConfig({ configPath: fixture("valid.json"), env: {} });
    expect(config).toEqual({ vaultPath: "/tmp/fixture-vault", port: 5000, host: DEFAULT_HOST });
  });

  it("reads host from the config file, defaulting to loopback when omitted", () => {
    const withHost = loadConfig({ configPath: fixture("with-host.json"), env: {} });
    expect(withHost.host).toBe("localhost");
    const without = loadConfig({ configPath: fixture("valid.json"), env: {} });
    expect(without.host).toBe(DEFAULT_HOST);
  });

  it("defaults port to 4321 when the file omits it", () => {
    const config = loadConfig({ configPath: fixture("no-port.json"), env: {} });
    expect(config.port).toBe(DEFAULT_PORT);
  });

  it("resolves a relative vaultPath against the config file's directory", () => {
    const config = loadConfig({ configPath: fixture("relative-vault.json"), env: {} });
    expect(config.vaultPath).toBe(path.join(fixtures, "rel-vault"));
  });

  it("lets ENGRAM_VAULT_PATH, ENGRAM_PORT, and ENGRAM_HOST override the file", () => {
    const config = loadConfig({
      configPath: fixture("with-host.json"),
      env: { ENGRAM_VAULT_PATH: "/tmp/env-vault", ENGRAM_PORT: "9999", ENGRAM_HOST: "::1" },
    });
    expect(config).toEqual({ vaultPath: "/tmp/env-vault", port: 9999, host: "::1" });
  });

  it("works from env alone when no config file exists", () => {
    const config = loadConfig({
      configPath: fixture("does-not-exist.json"),
      env: { ENGRAM_VAULT_PATH: "/tmp/env-vault" },
    });
    expect(config).toEqual({ vaultPath: "/tmp/env-vault", port: DEFAULT_PORT, host: DEFAULT_HOST });
  });

  it("fails fast when no vault path is resolvable", () => {
    expect(() => loadConfig({ configPath: fixture("does-not-exist.json"), env: {} })).toThrow(
      ConfigError,
    );
    expect(() => loadConfig({ configPath: fixture("does-not-exist.json"), env: {} })).toThrow(
      /No vault path configured/,
    );
  });

  it("rejects a config file that is not valid JSON", () => {
    expect(() => loadConfig({ configPath: fixture("invalid.json"), env: {} })).toThrow(ConfigError);
  });

  it("rejects a config file with wrongly typed fields", () => {
    expect(() => loadConfig({ configPath: fixture("wrong-shape.json"), env: {} })).toThrow(
      ConfigError,
    );
  });

  it("rejects a non-numeric ENGRAM_PORT", () => {
    expect(() =>
      loadConfig({
        configPath: fixture("valid.json"),
        env: { ENGRAM_PORT: "not-a-port" },
      }),
    ).toThrow(/ENGRAM_PORT/);
  });
});
