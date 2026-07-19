import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    proxy: {
      // Dev-only: forward API calls to the local Engram server so the web app
      // stays same-origin. Both ends are localhost.
      "/api": `http://127.0.0.1:${process.env["ENGRAM_PORT"] ?? "4321"}`,
    },
  },
});
