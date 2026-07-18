# UI Context

## Theme

Two MUI themes (`createTheme`), switched automatically by the system
`prefers-color-scheme` (light/dark) — no manual toggle. The design
language is calm, content-first, and functional: a reading environment
for daily spaced-repetition review, not a dashboard. Light mode uses a
warm paper canvas; dark mode uses a near-black layered surface. Card
content (the material being studied — markdown, code, KaTeX) is the
visual focus everywhere; UI chrome stays quiet and recedes.

## Colors

All colors are MUI theme palette slots, set per theme (light/dark) in
`createTheme({ palette: { ... } })`. Components must reference
`theme.palette.<slot>` (or `sx={{ color: 'primary.main' }}` etc.) —
no hardcoded hex values in components.

| Role                          | MUI palette slot | Light      | Dark       |
| ------------------------------ | ----------------- | ---------- | ---------- |
| App canvas                     | `background.default` | `#FAFAF7` | `#16181D` |
| Card / dialog surface          | `background.paper`   | `#FFFFFF` | `#1F2229` |
| Card content text              | `text.primary`       | `#1F2328` | `#E8E6E1` |
| Metadata text (source/box/due) | `text.secondary`     | `#57606A` | `#9AA0A8` |
| Actions, focus, links          | `primary.main`       | `#4A5D8A` | `#8C9EC9` |
| "Pass" grading action          | `success.main`       | `#2E7D5B` | `#5BAE8C` |
| "Lapse" grading action         | `error.main`         | `#B3574D` | `#C97B72` |
| Leech flags                    | `warning.main`       | `#B58A3C` | `#C9A35E` |
| Hairlines / separators         | `divider`            | `#E6E4DF` | `#2E323A` |

Note on `error.main`: deliberately softened, not alarm-red. Lapsing a
card is normal system behavior, not user failure — the grading action
must never read as a guilt or punishment signal.

## Typography

| Role                | Font                                                                 | Notes |
| -------------------- | --------------------------------------------------------------------- | ----- |
| UI chrome            | System stack: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif` | MUI default `typography` sizes/scale, unmodified. |
| Card content (markdown) | Same system stack, but sized as the exception for reading comfort | `font-size: 1.125rem`, `line-height: 1.7`. Applies only within rendered card content, not UI chrome. |
| Code blocks           | `ui-monospace` stack (SF Mono on macOS)                              | Rendered on a background tinted slightly off `background.paper` (a subtly darker/lighter shade of the same surface, not a new named token — implement via `alpha()` on `background.paper` or `action.hover`). |
| KaTeX math             | KaTeX's own font, sized to match                                     | Rendered at the same font size as surrounding card text (1.125rem), no visual jump between prose and math. |

## Border Radius

MUI `shape.borderRadius` plus per-component overrides — no Tailwind
radius classes in this project.

| Context                  | Value                                            |
| -------------------------- | --------------------------------------------------- |
| Theme default (`shape.borderRadius`) | `8` |
| Cards / dialogs (`MuiCard`, `MuiDialog` overrides) | `12` |
| Chips / pills (`MuiChip` override) | full / pill-shaped (`9999`) |

## Elevation

Shadows never exceed MUI elevation `2` anywhere in the app — flat-ish,
calm surfaces. Set via `MuiPaper`/`MuiCard` style overrides or by
capping `theme.shadows` so higher elevation values fall back to the
elevation-2 shadow.

## Component Library

MUI (`@mui/material`), styled entirely through the theme
(`createTheme`, component `styleOverrides`). No other component
library. Two theme objects (light/dark) are selected at runtime by
`prefers-color-scheme` and passed to `ThemeProvider`.

## Layout Patterns

- Single centered column, `maxWidth: 720px`, for the entire session UI — no sidebar, no dashboard chrome.
- One-thing-at-a-time screens, navigated linearly: free-recall brain-dump (textarea) → review queue (one card at a time: front shown → reveal answer → grade) → inbox triage (convert captured one-liners into cards via card-type template pickers: symptom→cause, decision→trade-off, prediction, problem, definition).
- Persistent minimal header containing only the inbox-capture action — a near-zero-friction one-line capture field, always available regardless of which screen is active.
- Card metadata (source, box, due date) rendered small and in `text.secondary`, positioned below the card content — never competing visually with the content itself.
- Grading actions (Pass / Lapse) appear only after the answer is revealed, styled with `success.main` and `error.main` respectively.
- Leech-rewrite flow: a dedicated surface for chronically failed cards, presenting each for a front rewrite; visually flagged with `warning.main`, not `error.main` (a leech is a card-quality signal, not a failed review).

## Icons

Icon set: `@mui/icons-material` (confirmed) — it ships with
MUI and adds no extra ecosystem. Keep icon usage minimal,
consistent with the calm/content-first theme.
