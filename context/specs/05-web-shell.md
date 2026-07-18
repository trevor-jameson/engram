# Unit 05 — Web shell & theme

## Goal

The React/Vite/MUI application frame: both themes, the single-column layout,
the persistent header, and the linear session-flow skeleton — with placeholder
screen content. Everything visual after this unit happens inside this frame.

## Scope

- Two `createTheme` objects implementing every token in `ui-context.md`
  (palette slots, typography incl. 1.125rem/1.7 card-content class,
  `shape.borderRadius: 8`, MuiCard/MuiDialog radius 12, pill chips,
  elevation capped at 2 via `theme.shadows`). Selected by
  `prefers-color-scheme`, no manual toggle.
- Layout: single centered column `maxWidth: 720px`; no sidebar, no dashboard
  chrome.
- Persistent minimal header containing only the inbox-capture field —
  rendered but inert this unit (wired in unit 08).
- Linear session-flow state machine: recall → review → triage screens
  navigated one-thing-at-a-time; each screen is a labeled placeholder.
- API client module (`web/src/api/`): thin typed fetch wrapper over the
  unit 04 routes, using `shared/` DTO types. Card IDs only.
- Zero external requests: no web fonts, no CDN assets; verify the production
  bundle references only local assets.

## Out of scope

- Real screen content (units 06–09). Markdown/KaTeX rendering (unit 06).
  Mobile/responsive polish (out of v1 scope entirely).

## Verification

- App loads against the running unit 04 server + scratch vault; queue data
  visible in the review placeholder (proves API client works).
- Both themes render correctly by toggling the OS appearance; spot-check
  tokens against the `ui-context.md` table.
- Lint check: no hardcoded hex values in components (theme references only).
- Browser devtools network panel: no requests to any non-localhost origin.
- Standard unit-completion checklist.
