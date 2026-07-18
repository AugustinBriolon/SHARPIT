# SHARPIT — Design System Prompt

> Agent-facing design prompt: the operational rules for generating UI. For the underlying philosophy, see [DESIGN_LANGUAGE.md](./DESIGN_LANGUAGE.md).

## Brand identity

SHARPIT is an Athlete State Intelligence system — not a fitness tracker, not a dashboard. It is a clinically precise instrument that models an athlete's physiological state to improve decision quality over time.

The design must evoke: high-precision chronometry, clinical EEG monitoring, professional measurement instruments. NEVER a SaaS look, an analytics dashboard, or a mainstream fitness app.

## Immutable principles

1. **Revelation > Decoration** — Every pixel must justify its presence through an informational function. No decorative gradients, no shadows for effect, no colored badges without semantic meaning.

2. **Earned density** — Information density is high where the athlete makes decisions (snapshot, verdict), airy where they read explanations (rationale, context).

3. **Restraint = Trust** — Color is rare and meaningful. Green appears only for "OK/Go", orange for "Caution/Threshold", red for "Risk/Stop". No color for "the look".

4. **Layout = Causal argument** — Visual order follows the decision chain: State → Evidence → Recommendation → Projection → Limit → Confidence.

5. **Owned uncertainty** — No false precision. Uncertain values are displayed with confidence indicators (transparency, suffixes, annotations), never rounded to the nearest integer to look "clean".

6. **Instrument, not screen** — The interface is a reading tool, not a dashboard. Elements should evoke dials, reading grids, technical annotations — not floating cards.

## Design tokens (Tailwind v4)

### Colors

- Background: `oklch(0.17 0.022 158)` (dark), `oklch(0.988 0.006 148)` (light)
- Surface elevation: use luminosity steps, NOT shadows
  - Surface 0 (background): `--background`
  - Surface 1 (cards): `oklch(0.21 0.026 158)` (dark)
  - Surface 2 (interactive elements): `oklch(0.25 0.024 158)` (dark)
  - Surface 3 (hover/focus): `oklch(0.28 0.03 158)` (dark)
- Text: `oklch(0.96 0.008 148)` (dark), never pure white
- Single accent: `oklch(0.68 0.11 156)` — the SHARPIT sage green
- Semantic signals (for DATA ONLY):
  - `--signal-recovery`: cold teal (recovery)
  - `--signal-base`: sage green (base)
  - `--signal-tempo`: yellow-green (tempo)
  - `--signal-threshold`: gold (threshold)
  - `--signal-vo2`: orange (VO2max)
  - `--signal-neutral`: blue-gray (no signal)
  - `--signal-caution`: amber (caution)
  - `--signal-risk`: earth red (risk)

### Typography

- Heading: `font-family: var(--font-heading)` (Syne), weight 500-600, never 700 except logo
- Body: `font-family: var(--font-sans)` (IBM Plex Sans), weight 400-500
- Data: `font-family: var(--font-data)` (JetBrains Mono), `font-variant-numeric: tabular-nums`, letter-spacing -0.02em
- Labels: `text-label` utility — 0.6875rem, weight 600, letter-spacing 0.14em, uppercase, muted-foreground color

### Spacing

- Dense (data, metrics): 12px-16px
- Standard (cards, sections): 20px-24px
- Airy (explanations, rationale): 32px-48px
- Never uniform "p-6" padding everywhere

### Borders

- Rare. Prefer surface-luminosity difference for hierarchy.
- When necessary: `1px solid` at 10-14% opacity, never high-opacity "visible" borders.
- Radius: `0.625rem` (10px) standard, `calc(var(--radius) * 0.5)` for dense elements, `calc(var(--radius) * 1.15)` for analysis panels.

### Shadows

- FORBIDDEN in dark mode. Use surface luminosity for elevation.
- In light mode: very subtle shadows, never a "floating" drop-shadow.

## Component patterns

### Metric Card

```
┌─────────────────────────────┐
│ SLEEP            [●] 50%    │  ← Uppercase label left, value right
│                             │
│ 50% out of 100              │  ← Contextual subtitle
│ ████████████░░░░░░░░░░░░    │  ← Signal bar (no visible gray track)
│                             │
│ Physiological reading →     │  ← Discreet link, not a button
└─────────────────────────────┘
```

- NO visible card background (use surface difference)
- NO border unless required for separation
- NO "see more" button — the link lives in the reading flow
- The signal bar uses the semantic color, not a rainbow gradient

### Daily snapshot (Verdict)

```
┌─────────────────────────────────────────┐
│ TONIGHT                                 │
│ Rest day — recharge for tomorrow        │  ← Heading title, calm
│                                         │
│ Tonight — Bedtime around 23:22 to       │
│ recover from the day                    │  ← Body explanation, no card
│                                         │
│ TODAY'S POSITION                        │
│ ████████████████░░░░  recovery          │  ← Bar with inline annotation
│         toward high intensity           │
└─────────────────────────────────────────┘
```

- The verdict is the visual hero
- Secondary data is grouped but not boxed into cards

### Analysis Panel

- Use `analysis-panel` or `analysis-panel-alt`
- Subtle background grid (18px) evoking graph paper
- Data aligned on an invisible grid
- Margin annotations, "lab note" style

### Confidence indicator

- Displayed next to every inferred value
- Format: value ± uncertainty, or value (confidence level)
- Visual: partial transparency, no colored badge

## Anti-patterns (FORBIDDEN)

- ❌ Cards with floating shadows in dark mode
- ❌ Decorative gradients (except semantic signal bars)
- ❌ Colored badges without functional meaning
- ❌ Generic "See more" / "Understand" buttons
- ❌ Uniform padding on all elements
- ❌ Bold typography for all values
- ❌ Classic yellow/red banner alerts (Bootstrap style)
- ❌ Icons without labels in dense zones
- ❌ "AI" mentioned anywhere in the interface
- ❌ Scores rounded or simplified to look "pretty"

## Target feeling

Understood · Informed · Calm · Respected · Certain
Never: tracked, overwhelmed, anxious, infantilized

## Visual references

- Precision chronometers (Tag Heuer, Omega)
- EEG/clinical monitoring interfaces (Natus, Nihon Kohden)
- Aviation flight decks (EFIS, PFD)
- Scientific measurement instruments (oscilloscopes, spectrometers)
- NEVER: Strava, Whoop, Garmin Connect, Fitbit, Apple Fitness
