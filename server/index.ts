import { serve } from "@hono/node-server";
import { loadConfig } from "./vault/config.ts";
import { openVault } from "./vault/cards.ts";
import { createApp } from "./api/app.ts";

const config = loadConfig();
const vault = openVault(config.vaultPath);
const app = createApp(vault);

serve({ fetch: app.fetch, port: config.port, hostname: config.host }, (info) => {
  console.log(`engram server on http://${config.host}:${info.port} (vault: ${config.vaultPath})`);
});
