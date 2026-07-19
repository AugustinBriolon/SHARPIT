# Design — SHARPIT

A locked design system for this app. Every page redesign reads this file before
emitting code. Do not regenerate per page — extend or amend this file when the
system needs to grow.

<!-- Hallmark · theme: designed-as-app · design-system: design.md · genre: instrument-editorial -->

## Genre

**editorial / instrument** — precision instrument for Athlete State Intelligence.
Not atmospheric, not playful, not SaaS dashboard, not fitness tracker.

Canonical philosophy: [`docs/design/DESIGN_LANGUAGE.md`](docs/design/DESIGN_LANGUAGE.md)  
Agent prompt: [`docs/design/DESIGN_SYSTEM_PROMPT.md`](docs/design/DESIGN_SYSTEM_PROMPT.md)  
Product constitution: [`docs/product/PRODUCT.md`](docs/product/PRODUCT.md)

## Macrostructure family

Pages within a family share the family's shape; they vary only in component archetypes.
**Diversification across Hallmark catalog themes is forbidden** — same product, same system.

- Marketing pages: typography-led instrument (no Specimen / Bento defaults)
- App pages: **causal column** — State → Evidence → Recommendation → Projection → Limit → Confidence
- Content pages: document density with `text-label` eyebrows + `analysis-panel` surfaces

## Theme

Tokens live in [`src/app/globals.css`](src/app/globals.css). Do not invent a parallel `tokens.css`.

- Paper / surfaces: `--background`, `--card`, `--analysis-surface`, `--analysis-surface-alt`
- Ink: `--foreground`, `--muted-foreground`
- Accent (sage): `--primary` / SHARPIT sage green
- Focus: `--ring`
- Semantic signals (data only): `--signal-recovery`, `--signal-base`, `--signal-tempo`, `--signal-threshold`, `--signal-vo2`, `--signal-caution`, `--signal-risk`, `--signal-neutral`

## Typography

Utilities in `globals.css` (never reinvent with ad-hoc `text-[11px] uppercase`):

- Display / verdict: `text-verdict` — Syne, weight 600
- Page title: `text-page-title` — Syne
- Section title: `text-section-title` — Syne
- Card title: `text-card-title` — Syne
- Body: IBM Plex Sans (`--font-sans`)
- Data / instrument: `text-data` / `text-instrument` — JetBrains Mono, tabular nums
- Labels: `text-label` — uppercase, tracked, muted

One `<h1>` per page. Headings are roman (no italic display).

## Spacing

Dense (metrics): 12–16px · Standard (panels): 20–24px · Airy (explanations): 32–48px  
Prefer named Tailwind / CSS tokens already in the project; never uniform `p-6` everywhere.

## Motion

Restraint. Prefer opacity/transform only. Honor `prefers-reduced-motion`.  
No celebratory toasts, no pulse/bounce on chrome.

## Microinteractions stance

- Silent success over celebration
- Instant focus rings; no animated ring appearance
- Color is reserved for semantic state (go / caution / risk)

## CTA voice

- Primary: sage fill / primary button, short imperative French
- Secondary: outline / ghost, never competing with the verdict

## Physio drill-downs — native mobile shell

Shared by `/today/sleep|recovery|adaptation|effort`:

- Date pill **centered**, fixed width `15.5rem` (mobile + desktop)
- Chips: horizontal snap-scroll on mobile · grid from `sm`
- Surfaces: `rounded-[1.25rem]` inset on mobile; analysis panel on desktop
- Stack: plate → chips → why → evidence (`space-y-3` mobile)

## Today — Morning Instrument

`/` first viewport is one **plate**, not a dashboard:

1. Plate — label + 3 confidence bars · Syne verdict · one action line · limiter → drill-down
2. Signal chips — no parent panel; 2×2 mobile · one row desktop (`Sommeil 78 →`)
3. Why — primary finding as short narrative, rest in expand
4. Session — chip-style response only (no Frein column duplicate)
5. Trajectory — naked sparklines; titles are drill-downs

**Color = emotional state** (tint 12% + status dot + encouraging strip values). Never card grids.  
`RECOVER` uses protective sage/primary — never punitive red.  
Signal / session chips invite detail (hairline + →) without competing with the verdict plate.

No stacked metric cards in the hero. No physio rail competing with the verdict.

## App pages — Instrument family

Same causal column as Today (plate → chips → evidence → trajectory). No fitness-dashboard inventories.

- **`/training`** — plate (objectif `J-n` ou prochaine séance) · chips séances/activités · régularité en expand
- **`/biology?tab=composition`** — plate poids · chips fat/muscle/visceral · why insights · métriques en chips + expand · 1 chart poids, autres tendances en expand
- **Physio drill-downs** (`/today/sleep|recovery|adaptation|effort`) — shared shell: plate (dimension verdict + mono score chip) · signal chips · why bandeau · evidence (1 primary chart). No PhysioRail / inset % in the hero.

Canonical detail: [`docs/design/DESIGN_LANGUAGE.md`](docs/design/DESIGN_LANGUAGE.md) §14.

## Forbidden (anti-patterns)

- Streak counters, Flame icons, habit-tracker heatmaps as primary signal
- Progress rings / radial gauges dominating a hero
- Sparkles / “AI chatbot” chrome on Coach or state surfaces
- Colored glow shadows on nav pills
- Teal/cyan “health app” DNA for recovery charts
- Competitive card grids on the Today verdict / stacked RadialScoreCards in the plate
- Decorative grid textures without informational function
- Invented metrics or motivational micro-copy

## Surfaces

- Prefer `analysis-panel` (flat surface + hairline border)
- `analysis-panel-alt` is a flat alt surface — **no decorative grid / gradient wash**
- Elevation via luminosity, not heavy shadows (especially dark mode)

## Exports

Source of truth for values: [`src/app/globals.css`](src/app/globals.css).  
Hallmark must reference named tokens / utilities — never mid-render hex improvisation.
