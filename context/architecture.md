# Architecture Context

## Stack

| Layer            | Technology                              | Role                                                                 |
| ----------------- | ---------------------------------------- | --------------------------------------------------------------------- |
| Language          | TypeScript (end-to-end)                  | Single language across server, web, and shared types                 |
| Package manager   | pnpm                                     | Dependency installation and workspace management (never npm)         |
| Server framework  | Node + Hono                              | Localhost-only HTTP API; reads/writes the vault folder (chosen over Express: lighter, TypeScript-first, fits the thin-scheduler ethos) |
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
- `server/api/` — localhost-only HTTP routes (Hono), the sole entry point into the server for the frontend. "Today" is computed here in the machine's local timezone (a session at 11pm belongs to the local day); the pure scheduler receives it as a string.
- `web/` — React/Vite UI. Talks ONLY to the API; never touches the filesystem; never sees file paths, only card IDs.
- `shared/` — TypeScript types shared by server and web (Card, SessionLog, queue DTOs).
- `context/` — the project context docs (this file's home).

## Storage Model

There is no database. **The vault's markdown files are the sole source of truth for all application state.** Any index, cache, or in-memory structure the app builds is a disposable, fully rebuildable projection of the files on disk — never a second source of truth.

- **Card files (filesystem, `.md`)**: one card per markdown file, stored under a subfolder of the configured vault path (v1: `vault/flashcards/`). YAML frontmatter holds review state (`box`, `due`, `lapses`, `created`, `source`, `type`); the markdown body holds the Q/A content. These files must remain human-editable, Obsidian-linkable, and greppable at all times — they are not a serialization format the app owns, they are the record.

  Reference card file (this schema is authoritative; field names signed off 2026-07-18):

  ```markdown
  ---
  box: 3            # Leitner box 1–7
  due: 2026-07-19
  lapses: 1
  created: 2026-07-12
  source: "CLRS §11.2"
  type: symptom-cause   # symptom-cause | decision-tradeoff | prediction | problem | definition
  ---
  Q: Hash table lookups degrade toward O(n) as it fills — what two design choices govern when?
  A: Load factor threshold + collision strategy (chaining degrades gracefully; open addressing cliffs near 0.7–0.8).
  ```

  The body is `Q:`/`A:`-delimited: the front runs from the line beginning `Q:` up to the first line beginning `A:`; the back is everything from that `A:` line on. Both sections may span multiple lines (code fences, `$$...$$` blocks).
- **Card IDs and file naming**: a card's ID is its filename without `.md`, unique within the flashcards folder. App-created files are named `<kebab-slug-of-front>-<YYYYMMDDHHmmss>.md` (slug truncated ~40 chars); hand-authored files with any name are valid cards, their basename is their ID. Leech rewrites never rename the file. The API and web layer only ever see IDs, never paths.
- **Session logs (filesystem, `.md`)**: free-recall brain dumps written as markdown files in `logs/`, beside the card files, for future triage to mine for knowledge gaps. One file per day, `logs/YYYY-MM-DD.md`, with `date`/`sources` frontmatter; a same-day re-run appends.
- **Inbox (filesystem, `.md`)**: a single `inbox.md` in the vault; one list item per capture, no metadata; deletion by exact line match.
- **Vault path**: configurable to any filesystem path — not hardcoded, not assumed to be inside the repo. Source of truth is `engram.config.json` in the repo root (gitignored), holding `vaultPath`, `port` (default 4321), and `host` (bind address, default `127.0.0.1`); env vars `ENGRAM_VAULT_PATH`, `ENGRAM_PORT`, and `ENGRAM_HOST` override when set (used e.g. to point the dev server at a scratch vault without editing the file). The `host` default keeps the localhost-only bind; overriding it to a non-loopback address is a deliberate user action outside the app's design envelope.
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

## File I/O Model

`server/vault/` uses **synchronous** filesystem calls (`readFileSync`, `writeFileSync`, `readdirSync`, etc.) throughout, and this is intentional — not a shortcut to migrate away from later. It fits the app's actual concurrency profile: a single local user, one machine, localhost-only, small markdown files on (by default) local disk. Under those conditions a card read/write blocks the event loop for well under a millisecond, and there is no second request to starve. Sync I/O is also what makes the read → parse → patch → write sequence in `updateFrontmatter` atomic against interleaving without any locking, and keeps error handling a plain synchronous `throw`/`try/catch` (`VaultError`) rather than pushing `async/await` up through every caller.

**Revisit this only if a load-bearing assumption changes.** The trigger conditions to watch:

- **The vault path moves off local disk.** `vaultPath` is configurable to any filesystem path (see Storage Model), including a network mount or a cloud-synced folder (Dropbox/iCloud/Obsidian Sync). On high-latency storage, a sync call blocks the loop for the full I/O latency.
- **Card counts reach the thousands.** Startup `listCards` does a `readdirSync` plus one `readFileSync` per file, sequentially — O(n) blocking I/O. Fine for hundreds of local cards; a visible stall for thousands on slow storage.
- **The app gains real concurrency.** Any move away from the single-user, single-request model (multi-user, background workers competing for the loop) invalidates the premise.

If any of these hold, converting is cheap by design: all blocking I/O is confined to `server/vault/` behind the `Vault` interface, so the change is contained to one module and invisible to callers.

### Write Paths

The vault has three distinct write paths, deliberately kept separate:

- **`writeCard` — create-only.** It refuses (`id-collision`) to overwrite an existing card file, so card creation can never silently overwrite another card. It serializes via `serializeCard` (gray-matter's canonical format), which is why it is only for app-authored cards.
- **`updateFrontmatter` — in-place scheduler state.** Byte-stable patch of only the changed frontmatter lines (`box`/`due`/`lapses`), preserving the user's hand-authored YAML formatting.

- **`rewriteBody` — user-initiated content edit** (added unit 09, the leech-rewrite flow). Replaces only the `Q:`/`A:` body after the frontmatter block, whose bytes are preserved exactly; never renames the file, so the ID and Obsidian backlinks stay stable. Deliberately not routed through `writeCard`. Scheduling changes (the rewrite reset) go through `updateFrontmatter` as a separate patch.
