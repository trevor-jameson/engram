# Unit 01 — Workspace scaffold & config

## Goal

A pnpm workspace where `pnpm typecheck`, `pnpm lint`, `pnpm test`, and
`pnpm build` all pass (trivially), with the config-loading mechanism in place
and a scratch vault for development.

## Scope

- pnpm workspace with packages `server/`, `web/`, `shared/`.
- TypeScript strict mode everywhere; no `any` permitted by lint.
- Toolchain: ESLint + typescript-eslint, Vitest, Vite (web). These dev
  dependencies are pre-justified here; record them in `progress-tracker.md`
  when added.
- Root scripts that fan out to all packages: `typecheck`, `lint`, `test`,
  `build`, `dev`.
- `.gitignore` including `node_modules/`, build output, and
  `engram.config.json`.
- `engram.config.example.json` (committed) documenting the shape:
  `{ "vaultPath": "/absolute/path/to/vault", "port": 4321 }`.
- Config loader in `server/vault/config.ts` (the fs-confinement rule in
  `code-standards.md` applies to config reading too): reads
  `engram.config.json` from the repo root; `ENGRAM_VAULT_PATH` and
  `ENGRAM_PORT` env vars override when set; port defaults to 4321. Fails
  fast with a clear error if no vault path is resolvable.
- `scratch-vault/` folder in the repo (gitignored) with a `flashcards/`
  subfolder and 2–3 hand-written sample cards, used by the dev server.

## Out of scope

- Any card parsing, scheduling, API routes, or UI beyond a placeholder page
  proving the Vite dev server runs.

## Verification

- Fresh clone → `pnpm install` → all four root scripts pass.
- Config loader unit test: file-only, env-override, missing-config cases
  (against fixture config files, not a real one).
- `pnpm dev` starts server (binding localhost only) and web placeholder with
  the scratch vault configured via env override.
- `progress-tracker.md` updated (dependencies justified, unit recorded).
