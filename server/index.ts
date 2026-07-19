import { createServer } from "node:http";
import { loadConfig } from "./vault/config.ts";

// Placeholder entry point for unit 01: proves config loading and a
// localhost-only server. Real routes (Hono) arrive in unit 04.
const config = loadConfig();

const server = createServer((_req, res) => {
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify({ app: "engram", phase: "scaffold" }));
});

server.listen(config.port, "127.0.0.1", () => {
  console.log(`engram server on http://127.0.0.1:${config.port} (vault: ${config.vaultPath})`);
});
