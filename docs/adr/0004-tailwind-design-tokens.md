# Tailwind CSS + dark design tokens for the UI

The front end is styled with Tailwind CSS (v4, CSS-first `@theme` config) and a dark "Grafit + Amber" token system (`--color-*`, `--font-sans`), replacing the hand-written plain CSS previously in `app/globals.css`. Chosen for faster iteration on the visual redesign and a single source of truth for tokens.

## Considered Options

- **Plain CSS + custom properties** (previous state): zero dependencies, but every shared style is a hand-maintained class and the design drifted from the tokens.
- **shadcn/ui on Tailwind**: most polished out of the box, but brings a large dependency surface for a single-user internal tool.
- **Tailwind utility-first** (chosen): tokens stay in one place, markup stays declarative, no component-library overhead.

The palette (dark "Grafit + Amber"), Inter typography, and sticky top-nav shell are deliberate but easy to reverse, so they are not recorded as separate ADRs.
