# Coding Standards

Read during review (the Standards axis of `/code-review`). The Fowler smell baseline applies on top, and a rule here overrides the baseline.

## Testing seam

The app is tested through **one seam: the HTTP surface against a real SQLite database**. Tests drive routes — route handlers, server actions, and server-rendered pages — against a throwaway SQLite database seeded per test.

- **External behavior only.** Assert on what a client observes: server-rendered HTML (summary figures, chart data serialized into the page, links) and route responses and redirects.
- **Internal** means exported helper functions and component internals. These are exercised _through_ the seam, never unit-tested separately; a `renderToString`-driven component test also reaches below it.
- **Calculation rules surface through user-visible output** (Modal, Laba Kotor, Margin, Age, Stale, WIB period boundaries), not through the function that computes them.
- The tested surfaces are all HTTP: login/logout and protected-route redirects, Unit create/read/update/delete with derived Status and validation errors, CSV import/export, the inventory dashboard, the sales dashboard per period preset, and the data-issues checklist.

## Domain language

- User-facing labels are Indonesian and match the `_UI_` entry in `GLOSSARY.md`; code, tests, and comments use the canonical English term. Renaming a user-facing label means updating `GLOSSARY.md` in the same change.
- A fuzzy or overloaded word is sharpened in `GLOSSARY.md` first; the code follows the glossary.

## Architecture

- Binding decisions live in `docs/adr/`. Contradicting an ADR is a violation; changing a decision requires a new ADR.
