# Architecture Context

## Stack

| Layer            | Technology                              | Role                                                                 |
| ----------------- | ---------------------------------------- | --------------------------------------------------------------------- |
| Language          | TypeScript (end-to-end)                  | Single language across server, web, and shared types                 |
| Package manager   | pnpm                                     | Dependency installation and workspace management (never npm)         |
| Server framework  | Node + Hono                              | Localhost-only HTTP API; reads/writes the vault folder                |
| Frontend framework| React + Vite                             | Local UI served to the single user; talks only to the API             |
| UI components     | MUI                                      | Component library; follows system light/dark theme                   |
| Markdown/YAML     | gray-matter                              | Parses and writes card frontmatter (YAML) and body content            |
| Markdown rendering| unified / remark                         | Markdown rendering pipeline for card display in the web UI            |
| Math rendering    | KaTeX (bundled locally)                  | Renders `$...$` / `$$...$$` math with zero network requests, no CDN   |
| Database          | None                                     | The vault's markdown files are the store; no DB, no ORM               |
| Auth              | None                                     | Single local user; server binds to localhost only                     |

## System Boundaries

- `server/vault/` — the ONLY code in the entire repo that touches the filesystem: markdown+YAML read/write, card parsing, session-log writing.
- `server/scheduler/` — pure functions only, no I/O imports: Leitner box logic, queue building, leech detection.
- `server/api/` — localhost-only HTTP routes (Hono), the sole entry point into the server for the frontend.
- `web/` — React/Vite UI. Talks ONLY to the API; never touches the filesystem; never sees file paths, only card IDs.
- `shared/` — TypeScript types shared by server and web (Card, SessionLog, queue DTOs).
- `context/` — the project context docs (this file's home).

## Storage Model

There is no database. **The vault's markdown files are the sole source of truth for all application state.** Any index, cache, or in-memory structure the app builds is a disposable, fully rebuildable projection of the files on disk — never a second source of truth.

- **Card files (filesystem, `.md`)**: one card per markdown file, stored under a subfolder of the configured vault path (v1: `vault/flashcards/`). YAML frontmatter holds review state (`box`, `due`, `lapses`, `created`, `source`, `type`); the markdown body holds the Q/A content. These files must remain human-editable, Obsidian-linkable, and greppable at all times — they are not a serialization format the app owns, they are the record.
- **Session logs (filesystem, `.md`)**: free-recall brain dumps written as markdown files in `logs/`, beside the card files, for future triage to mine for knowledge gaps.
- **Vault path**: configurable to any filesystem path — not hardcoded, not assumed to be inside the repo. Source of truth is `engram.config.json` in the repo root (gitignored), holding `vaultPath` and `port` (default 4321); env vars `ENGRAM_VAULT_PATH` and `ENGRAM_PORT` override when set (used e.g. to point the dev server at a scratch vault without editing the file).
- **In-memory/derived state (server process)**: anything the scheduler or API computes (queues, due-card lists, leech flags) is derived on demand from the frontmatter of the files and discarded/recomputed freely; it is never persisted as an independent store.

## Auth and Access Model

- There is no authentication. This is by design: Engram is a single-user, local-first application.
- The server binds to localhost only; it is never exposed to the network.
- The app makes zero network requests of any kind (invariant, not aspiration) — no telemetry, no cloud sync, no CDN-hosted assets (KaTeX is bundled locally for this reason).
- Access control is moot: there is one user, one machine, one vault. No ownership model, no roles, no permissions layer exists or is planned.

## Invariants

1. Card files are the sole source of truth; all app state is rebuildable from the folder.
2. Every file the app writes remains valid, human-readable markdown that Obsidian renders.
3. The app makes zero network requests.
4. A daily session is always completable in ≤ ~15 minutes (the queue cap enforces this).
5. The scheduler never deletes or rewrites card content — only frontmatter state; content changes are user actions.
6. Every card has a `source`; no card-creation path omits it (it is the interleaving key and the future archival key).
