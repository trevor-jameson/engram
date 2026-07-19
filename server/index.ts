import { serve } from "@hono/node-server";
import { loadConfig } from "./vault/config.ts";
import { openVault } from "./vault/cards.ts";
import { openSessionLogs } from "./vault/logs.ts";
import { openInbox } from "./vault/inbox.ts";
import { createApp } from "./api/app.ts";

const config = loadConfig();
const app = createApp({
  vault: openVault(config.vaultPath),
  logs: openSessionLogs(config.vaultPath),
  inbox: openInbox(config.vaultPath),
});

serve({ fetch: app.fetch, port: config.port, hostname: config.host }, (info) => {
  console.log(`engram server on http://${config.host}:${info.port} (vault: ${config.vaultPath})`);
});
