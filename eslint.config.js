import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["**/dist/", "**/node_modules/", "scratch-vault/"] },
  eslint.configs.recommended,
  tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error"
    }
  },
  {
    // server/scheduler/ is pure: no filesystem, network, or vault imports.
    files: ["server/scheduler/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            "fs", "node:fs", "node:fs/promises",
            "http", "node:http", "https", "node:https",
            "net", "node:net", "dgram", "node:dgram",
            "child_process", "node:child_process"
          ].map((name) => ({ name, message: "server/scheduler/ must stay pure — no I/O imports." })),
          patterns: [
            {
              group: ["**/vault/**"],
              message: "server/scheduler/ must not import vault code."
            }
          ]
        }
      ]
    }
  }
);
