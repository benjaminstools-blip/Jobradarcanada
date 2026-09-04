# DESIGN.md — Job Canada

The visual contract. Every UI decision resolves here. If a component disagrees with
this file, the component is wrong.

---

## The Idea

**An archival dossier, not a dashboard.**

This product is made of documents and codes: CVs, cover letters, NOC unit groups,
TEER tiers, province codes, match scores. A glassy dark SaaS shell buries all of
that under decoration. So the interface behaves like a well-set case file —
newsprint ground, hairline rules, hard typographic hierarchy, and every code set
in monospace where it can be read, compared, and trusted.

Three rules that follow from it:

1. **Rules, not cards.** Structure comes from 1px lines and whitespace. No drop
   shadows, no glass, no floating panels. A "card" is a region bounded by rules.
2. **Data is monospace.** NOC codes, TEER tiers, province codes, match scores,
   dates, counts — all IBM Plex Mono with `tabular-nums`. Prose is never mono.
3. **One accent.** Vermilion carries action and emphasis. It is never decorative.
   If everything is accented, nothing is.

Light, warm, and high-contrast. Not dark. The restraint is the point — job hunting
is anxious enough without an interface performing at you.

---

## Colour

Declared as CSS custom properties on `:root` in `app/globals.css`. Never hardcode a
hex in a component; use the token or its Tailwind alias.

### Ground and ink

| Token | Hex | Use |
|---|---|---|
| `--paper` | `#FBF8F1` | Page ground. Warm newsprint, never pure white. |
| `--paper-deep` | `#F2EDE1` | Recessed regions, alternating rows, inputs |
| `--paper-raised` | `#FFFDF8` | The one lift above ground — modals, active row |
| `--ink` | `#17130E` | Primary text, emphatic rules |
| `--ink-soft` | `#554D42` | Secondary text, body copy at rest |
| `--ink-faint` | `#8A8073` | Field labels, metadata, disabled |
| `--rule` | `#DDD5C6` | Default hairline |
| `--rule-strong` | `#B9AF9C` | Section dividers |

### Signal

| Token | Hex | Use |
|---|---|---|
| `--vermilion` | `#C8351A` | Primary action, active nav, focus ring, emphasis |
| `--vermilion-deep` | `#9E2712` | Hover/pressed on vermilion |
| `--vermilion-wash` | `#F7E4DF` | Vermilion at 8% — selected rows, subtle fills |
| `--forest` | `#2C6142` | High match (75+), Offer, success |
| `--ochre` | `#A8721A` | Medium match (50–74), Technical Interview, caution |
| `--clay` | `#A33A28` | Low match (<50), Rejected, destructive |
| `--slate-blue` | `#2B4A6F` | Informational, Screening, links in prose |

Vermilion is Canadian by association, not illustration. **No maple leaves, ever.**

---

## Type

Loaded via one Google Fonts `@import` at the very top of `globals.css`, before
`@import "tailwindcss"`.

| Role | Family | Tailwind | Notes |
|---|---|---|---|
| Display | **Instrument Serif** | `font-display` | Page titles, headline numerals. 400 + italic only. High contrast; needs size to work — never below 24px. |
| Body / UI | **Archivo** | `font-sans` | Everything else. Variable 300–700. Sturdy grotesque, signage lineage. |
| Data | **IBM Plex Mono** | `font-mono` | Every code and number. 400/500/600. Institutional, not techy. |

### Scale

Big jumps. Timid type is the enemy of an editorial look.

| Step | Size / leading | Use |
|---|---|---|
| Display | `clamp(2.5rem, 5vw, 4rem)` / 0.95 | Page title, one per screen |
| Title | `1.75rem` / 1.15 | Section heads |
| Lede | `1.125rem` / 1.55 | Standfirst under a display title |
| Body | `0.9375rem` / 1.6 | Default |
| Small | `0.8125rem` / 1.5 | Secondary |
| Label | `0.6875rem` / 1.3, `0.14em` tracking, uppercase, `--ink-faint` | Field labels. The dossier tell — use liberally. |

Numerals: always `font-variant-numeric: tabular-nums`.

---

## Space and Structure

- **8px base.** Spacing steps: 4, 8, 12, 16, 24, 32, 48, 64, 96.
- **Radius is near-zero.** `--radius: 2px`. Squares read as documents; pills read as
  chat apps. Only the avatar is round.
- **Page frame:** `max-width: 1240px`, gutters `clamp(20px, 5vw, 56px)`.
- **Asymmetry:** content column plus a narrow right rail for metadata where the
  page has metadata. Do not centre everything.
- **Rules:** `1px solid var(--rule)`. Section breaks use `--rule-strong`. A rule
  directly under a display title is `2px solid var(--ink)`.

### The label/value pair

The core dossier unit, used everywhere there is metadata:

```
LABEL           ← .field-label (uppercase, tracked, faint)
Value here      ← body, or font-mono for codes
```

---

## Motion

Restrained. One orchestrated entrance per page, then stillness.

- **Page load:** `.stagger-in` on a container animates children up 12px with a 40ms
  cadence. Nothing else animates on load.
- **Hover:** background shift or rule darkening only. Never lift, never scale,
  never glow.
- **Duration:** 160ms interactions, 400ms entrances. `cubic-bezier(0.2, 0, 0, 1)`.
- **Respect `prefers-reduced-motion`** — all of the above collapses to opacity.

---

## Texture

One effect, applied once: a **grain overlay** on the page ground via an inline SVG
`feTurbulence` at ~3% opacity, `pointer-events: none`, fixed. It makes the paper
read as paper. Do not add a second texture, gradient mesh, or noise layer anywhere.

---

## Components

- **Buttons** — square. Primary: vermilion ground, paper text. Secondary: 1px ink
  rule, transparent ground, ink text; hover fills `--vermilion-wash`. Ghost: text
  only with an underline offset on hover.
- **Inputs** — `--paper-deep` ground, 1px `--rule`, no radius beyond 2px. Focus:
  2px `--vermilion` rule, no glow.
- **Match score** — a large mono numeral with a hairline meter beneath. Colour by
  band: 75+ forest, 50–74 ochre, below clay. Not a pill badge.
- **Job entry** — a ruled row, not a card. Vermilion 2px left edge only when the
  score is 75+.
- **Kanban column** — a ruled column with a mono count in the header. Status colour
  appears as a 2px top edge, never a filled gradient header.
- **Tags/skills** — square, 1px rule, `--paper-deep` ground, small mono.

---

## Never

- Drop shadows, glass morphism, backdrop blur
- Gradients as surfaces (a 2px accent edge is not a gradient)
- Emerald/teal/indigo — the previous palette is retired
- Inter, Roboto, system-ui as a visible choice
- Pill-shaped anything except the avatar
- Emoji as UI iconography
- Maple leaves, flags, "eh", or any other Canadiana costume
