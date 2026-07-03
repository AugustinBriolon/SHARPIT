# SHARPIT Design Language

> A Human Performance Intelligence System demands a visual identity that matches its ambition. This document defines the design language — the permanent principles that govern every pixel, every transition, every typographic choice. It is not a style guide. It is a manifesto expressed in form.

---

## 1. Design Philosophy

SHARPIT is not a fitness tracker. It is not a dashboard. It is not an AI chatbot with a pretty interface.

It is a **precision instrument** — the cardiograph of the athlete's physiological state. The design must communicate this. Every element on screen should feel like it was placed there because it earns its position, because it serves the athlete's understanding, because removing it would leave the athlete less informed.

The mental model for every design decision:

> _What does a Leica camera, a Breitling chronograph, and a clinical EEG readout have in common?_
>
> They are instruments. They do not perform. They reveal.

This is the spirit of SHARPIT's design.

**Three governing constraints:**

1. **Revelation over decoration** — Every element reveals something. Nothing is purely decorative.
2. **Earned density** — Information density is high, but never chaotic. Density earns respect when structure is impeccable.
3. **Temporal permanence** — The interface must look exactly as sophisticated in five years as it does today. No trends. No moments.

---

## 2. Emotional Goals

The athlete opening SHARPIT should feel:

| Feeling                                                  | Not                                       |
| -------------------------------------------------------- | ----------------------------------------- |
| **Understood** — the system knows their physiology       | Tracked — as if being surveilled          |
| **Informed** — confident in the decision before them     | Overwhelmed — drowning in numbers         |
| **Calm** — the complexity has been resolved for them     | Anxious — confronted with raw uncertainty |
| **Respected** — the interface treats them as intelligent | Patronized — dumbed down, gamified        |
| **Certain** — the recommendation is clear and earned     | Confused — ambiguous or hedged            |

These are not aspirational. They are functional requirements. If an interface element triggers the wrong column, it must be redesigned.

---

## 3. Visual Principles

### 3.1 Signal over Noise

Every element on screen competes for attention. SHARPIT resolves this competition strictly: the primary signal — the answer to the athlete's question — occupies the dominant position with the greatest visual weight. Supporting evidence recedes. Metadata is nearly invisible until needed.

This is not minimalism for aesthetic reasons. It is information hierarchy enforced by design.

### 3.2 Structure as Intelligence

SHARPIT's complexity is managed through structure, not simplification. The system does not hide hard truths — it organizes them. A well-structured interface communicates sophistication. A sparse interface communicates emptiness.

The difference between structure and clutter is a single constraint: **every element must have an answer to "why am I here?"**

### 3.3 Restraint as Trust

Color, animation, and emphasis are reserved. A red warning means something is wrong. An emerald signal means capacity is available. Amber means caution. These carry meaning because they are not used casually. Casual use of semantic color destroys its meaning.

The interface never celebrates itself. It does not pulse, bounce, or sparkle. When something needs attention, it gets it precisely — not dramatically.

### 3.4 Typographic Authority

Text carries the intelligence. The quality of the typography determines whether SHARPIT reads as scientific or amateur. Headings must command. Body text must be invisible in the best sense — the reader absorbs the content without noticing the type. Labels must be precise without being mechanical.

### 3.5 Causal Narrative

The visual layout follows the logic of explanation. Each block flows causally from the one above it. The athlete reads top to bottom as if reading an argument: decision → evidence → recommendation → projection → limiter → confidence. The layout structure is the argument structure.

---

## 4. Typography Hierarchy

### 4.1 Type Stack

**Display / Verdict** — `font-heading` (configured in project, maps to a high-authority geometric or editorial serif-influenced typeface)

- Role: the single most important signal on any screen
- Usage: verdict labels, hero action text, primary decision statements
- Treatment: large, bold, tight tracking; rarely used, so it commands authority when present

**Body** — system sans-serif stack (`Inter` or `system-ui`)

- Role: explanatory text, evidence, reasoning
- Usage: everything the athlete reads to understand why
- Treatment: 16px base, 1.6 line-height, regular weight; invisible in the best sense

**Label** — same sans-serif, reduced and spaced

- Role: metadata, secondary classification, dimension names
- Usage: section labels, signal labels, confidence tiers
- Treatment: `text-[11px] tracking-[0.15em] uppercase font-medium text-muted-foreground` — this exact pattern is canonical

**Data / Numeric** — tabular figures, monospace where precision matters

- Role: scores, indices, percentages, time values
- Usage: readiness scores, fatigue indices, confidence percentages
- Treatment: tabular-nums always; never proportional figures in data contexts

### 4.2 Scale

```
Hero action text:     1.65rem  — font-heading, bold, tight
Section header:       1.15rem  — sans, semibold
Body primary:         0.875rem — sans, regular (14px)
Body secondary:       0.8125rem — sans, regular (13px)
Label canonical:      0.6875rem — 11px, uppercase, tracked
Caption / meta:       0.75rem  — 12px, muted
```

### 4.3 Typographic Rules

- **Never set body text below 13px.** Below this threshold, precision reads as anxiety.
- **Never use italic for emphasis in data contexts.** Use weight instead.
- **Uppercase is reserved for labels.** Never use all-caps for body text or headings.
- **Tracking (letter-spacing) on body text is always 0.** Only labels and uppercase elements receive tracked spacing.
- **Verdicts and hero text always left-aligned.** Center alignment is only for empty states and loading placeholders.

---

## 5. Spacing Philosophy

### 5.1 The 4-Point Grid

All spacing derives from multiples of 4px. This is not a suggestion — it is a constraint. Arbitrary spacing values (`7px`, `13px`, `22px`) are prohibited. When in doubt, the nearest multiple of 4 is always correct.

```
4px   — micro (inline gap between related atoms)
8px   — small (gap within a component)
12px  — compact (tight internal padding)
16px  — base (standard component padding)
20px  — comfortable (card internal spacing)
24px  — section (between grouped elements)
32px  — block (between major blocks)
48px  — page (between page-level sections)
```

### 5.2 Padding Asymmetry

Cards use more vertical padding than horizontal. The text must breathe vertically — this communicates quality. Tight vertical spacing reads as cheap.

Standard card: `px-5 py-5` minimum, `px-6 py-7` for primary blocks.

### 5.3 Density is Earned

SHARPIT surfaces are information-dense by necessity, not by default. Every piece of information on screen must earn its presence. The question before adding any element: _does the athlete make a better decision with this visible?_ If the answer requires qualification, the element belongs in a secondary tier or an expand interaction.

High density reads as intelligent when structure is impeccable. High density without structure reads as overwhelm.

---

## 6. Layout System

### 6.1 Single Column, Top-to-Bottom Narrative

SHARPIT's primary layout is a single column of stacked blocks. This is not a constraint of mobile design — it is a deliberate choice for any viewport. The causal narrative of the One Question Model requires linear reading. Multi-column layouts fragment this causality.

On larger viewports, the column widens to a maximum width, centered. The content remains linear.

### 6.2 Block Boundaries

Blocks are separated by `space-y-3` (12px). This is intentionally tight — the blocks are related, part of a continuous argument. They are not independent cards in a dashboard grid.

Each block is a `rounded-2xl border` card with `bg-card/40` backing. No shadows. Border separation is the only elevation signal.

### 6.3 The Expand Pattern

Secondary information lives behind an expand interaction, never on initial load. The expand trigger is always below the primary content it expands. Expanded content slides in, contracted with `max-h` animation. The trigger label inverts on expand (`↓` becomes `↑`, or equivalent).

Never use tabs. Tabs imply equivalence between sections; SHARPIT's hierarchy is strictly causal, not equivalent.

### 6.4 No Grid Layouts for Content

Grid layouts are prohibited for content blocks. Two-column content layouts fragment the narrative and compete for reading order. The only exception: dimension signal badges within a reasoning block, where three items are shown simultaneously because they are genuinely parallel (recovery, fatigue, adaptation are sibling signals, not sequential ones).

---

## 7. Density Strategy

### 7.1 Three Tiers

**Tier 1 — Immediate** (always visible, no interaction required)

- The verdict and verdict label
- The hero action (verb + focus)
- The primary finding title
- The session objective

**Tier 2 — Available** (visible by default, but secondary)

- Finding evidence bullets (first finding)
- Dimension signal badges (recovery, fatigue, adaptation)
- Expected outcome projection
- Confidence level

**Tier 3 — On Demand** (expand required)

- Additional findings beyond the first
- Detailed rationale
- Supporting evidence (physiological detail)
- Raw model signals and scores

This tier discipline is non-negotiable. Any Tier 3 content on initial render is an information design failure.

### 7.2 Progressive Disclosure

Information reveals itself as the athlete's question deepens. The athlete who wants only the answer gets it in 3 seconds. The athlete who wants to understand the reasoning gets it in 10 seconds. The athlete who wants to verify the physiological model gets it in 30 seconds.

Never force the 3-second athlete to navigate past the 30-second content.

---

## 8. Component Philosophy

### 8.1 Every Component Answers a Question

Components in SHARPIT are not generic UI primitives repurposed for content. Each component exists to answer one specific athlete question:

| Component                 | Question Answered                        |
| ------------------------- | ---------------------------------------- |
| `NarrativeHeader`         | What should I do today?                  |
| `ReasoningBlock`          | Why?                                     |
| `SessionBlock`            | What session, and toward what objective? |
| `ExpectedOutcomeBlock`    | What will happen if I follow / deviate?  |
| `BottleneckBlock`         | What system is limiting me?              |
| `ConfidenceBlock`         | How certain is SHARPIT?                  |
| `SupportingEvidenceBlock` | Show me the physiological detail         |

A component that answers two questions must be split. A component that answers no clear question must be deleted.

### 8.2 Props are a Contract

Component props define the semantic contract between the data layer and the presentation layer. Props must be typed precisely — never `string` when the domain type is `OverallVerdict`. Never `any`. The component's visual behavior is fully determined by its props; no internal data fetching, no store reads, no business logic.

### 8.3 No Presentational State

Components hold only UI state (is a section expanded, is a tooltip visible). Business state (the athlete's verdict, the fatigue level) is always external. A component must be renderable in isolation with props alone — no context required for correctness.

### 8.4 Semantic Color, Not Arbitrary Color

All color in components derives from the semantic system:

```typescript
emerald  →  positive, available, optimal, growth
blue     →  adequate, neutral-positive, maintaining
amber    →  caution, reduced, partial, plateau
orange   →  warning, elevated concern, maladapting
red      →  risk, critical, recover, overreaching
muted    →  unavailable, insufficient data, metadata
```

A component must never introduce a color outside this system. If a new semantic state requires a new color, the color system is extended — not bypassed.

---

## 9. Motion Principles

### 9.1 Motion Communicates State Change

Animation exists only to communicate that something changed. It answers: what moved, what appeared, what collapsed? It does not decorate, celebrate, or entertain.

### 9.2 Duration and Easing

```
Micro (tooltip, badge):       150ms  ease-out
Standard (expand/collapse):   250ms  ease-in-out
Page transition:              300ms  ease-out
Skeleton → content:           200ms  ease-in
```

Nothing in SHARPIT exceeds 300ms. Longer durations feel slow and self-important. Below 100ms feels brittle.

### 9.3 Expand Pattern

Expand/collapse uses `max-height` + `opacity` in combination. Height alone is jarring; opacity alone is disorienting. Together they communicate folding — a natural physical metaphor.

```css
/* expand */
transition:
  max-height 250ms ease-in-out,
  opacity 200ms ease-in;

/* collapse */
transition:
  max-height 200ms ease-in-out,
  opacity 150ms ease-out;
```

Exit is faster than entrance (80% of enter duration). This respects the athlete's time.

### 9.4 Skeleton Loading

Skeletons match the exact layout of the content they precede — same dimensions, same border-radius, same positioning. A skeleton that does not match its content causes layout shift and breaks trust.

Skeleton color: `bg-muted`. Pulse animation: `animate-pulse`. No shimmer — shimmer is decorative.

### 9.5 Reduced Motion

All animations respect `prefers-reduced-motion`. When reduced motion is set:

- Duration drops to 0 (immediate)
- Transitions are still applied (avoid snap-to state)
- The state change still happens; only the animation is removed

---

## 10. Color Philosophy

### 10.1 The Foundation

SHARPIT operates in dark-first. The athlete's primary context is early morning or evening — low light, cognitive activation, pre/post training. The color system is designed for this context.

**Base palette:**

```
Background:        hsl(222 47% 6%)   — deep blue-black, not pure black
Card surface:      hsl(222 35% 9%)   — slightly lighter, distinguishable
Border:            hsl(222 20% 15%)  — subtle separation, not stark
Foreground:        hsl(0 0% 95%)     — near-white, not pure white
Muted foreground:  hsl(222 10% 55%)  — secondary text, metadata
```

Light mode uses the inverse logic: near-white background, deep-slate text. Both modes share the semantic color system unchanged.

### 10.2 Semantic Color Application

Semantic colors appear on text, borders, dot indicators, and gradient overlays. They never appear as large solid fills. The block background uses `from-[color]/10` — a 10% tint of the semantic color into the card gradient. This communicates the state without dominating.

```
bg-gradient-to-br to-transparent from-emerald-500/10  — positive state
bg-gradient-to-br to-transparent from-red-500/10      — risk state
```

### 10.3 Color Restraint

The palette must be exhausted before any new color is introduced. If a design decision requires a color outside the semantic system, it is a signal that the component needs redesign, not that the palette needs expansion.

**Prohibited:**

- Purple or violet (no semantic meaning in the domain)
- Teal or cyan (too reminiscent of health apps)
- Yellow (insufficient contrast in dark mode)
- Any gradient that transitions between two semantic colors

### 10.4 Contrast

All text meets WCAG AA minimum (4.5:1 for normal text, 3:1 for large text). Muted text — by definition lower contrast — is reserved for metadata and secondary labels only. Never for primary content.

---

## 11. Iconography Philosophy

### 11.1 No Decorative Icons

Icons exist to communicate signal direction, state category, or action type. They are never decorative. An icon without semantic purpose is noise.

### 11.2 Arrow System

Directional arrows are the most important icon in SHARPIT. They communicate trajectory — the most important temporal dimension of athletic performance.

```
↗  — up, improving, recovering
→  — stable, neutral, maintaining
↘  — down, declining, accumulating risk
↑↑ — critical accumulation, accelerating risk
…  — pending, building baseline model
—  — unavailable, insufficient data
```

These arrows are Unicode characters, not SVG icons. This ensures they render at any size with typographic fidelity. They must always appear with sufficient visual weight to be readable — never smaller than 12px effective size.

### 11.3 Dimension Indicators

Colored dots (`h-2.5 w-2.5 rounded-full`) communicate state category without requiring reading. They are always paired with a text label — never used alone. The dot precedes the label.

### 11.4 Confidence Bars

The confidence tier visualization uses three stacked bars (`h-2 w-1.5 rounded-full`). Filled bars at `opacity-90`, empty bars at `opacity-20`. This communicates a scale without requiring a number. It is the only instance of a non-text, non-arrow visual metaphor in the interface.

---

## 12. Illustration Philosophy

### 12.1 No Illustrations

SHARPIT contains no illustrations, hero images, or decorative graphics.

This is a hard constraint, not a stylistic preference.

Illustrations communicate approachability, playfulness, or consumer-product accessibility. None of these are SHARPIT values. They contradict the precision instrument identity. A Breitling chronograph does not have charming illustrations on its face.

### 12.2 The Exception: Data Visualization

When physiological data is complex enough to require visualization — time series, distribution curves, load-adaptation ratios — the visualization is the illustration. It is precise, data-exact, and formatted with the typographic system. It earns its presence because it communicates something that text cannot.

Future data visualizations must follow these constraints:

- No decorative chart chrome (gridlines are functional; backgrounds are not)
- Semantic color only — no arbitrary palette
- No 3D effects
- Labeled axes, always
- Accessible without color (line style or pattern differentiation)

---

## 13. Empty State Philosophy

### 13.1 Empty States are Onboarding Moments

An empty state in SHARPIT occurs when the athlete does not yet have sufficient data for a reliable physiological assessment. This is not a failure state — it is an expected early stage of the system building its digital twin.

The empty state communicates:

1. **What is missing** — specifically, which data or how much is needed
2. **Why it matters** — what the athlete will unlock
3. **What to do** — one clear next action

Never communicate emptiness as an error. Never use red or warning colors in empty states. Neutral, informational tone only.

### 13.2 Empty State Structure

```
[Neutral icon or simple graphic: outline only, no fill]
[Primary message: what is being built]
[Secondary message: what the athlete needs to do]
[Single CTA: one action, no alternatives]
```

The "icon or graphic" exception to the no-illustration rule: empty states may use a single, simple SVG outline — not an illustration — to reinforce the onboarding context. This outline must be abstract (not figurative), monochromatic, and no larger than 48×48px.

### 13.3 Skeleton vs. Empty State

A skeleton is shown when data is loading (known-unknown — the data exists but hasn't arrived). An empty state is shown when data does not exist (known-nothing — the system cannot yet make a determination). These two states must never be confused or collapsed into the same component.

---

## 14. How These Principles Influence Every Screen

### Today View

The Today View is the highest-priority screen. Every principle is expressed most completely here.

- **NarrativeHeader** demonstrates revelation over decoration: verdict badge (color, dot, label) → confidence bar → hero action. Three layers of signal, nothing decorative.
- **ReasoningBlock** demonstrates earned density: the primary finding is always visible; additional findings are behind an expand.
- **SessionBlock** demonstrates component-as-answer: exists only to answer "what session?" — if there is no session recommendation, the block does not render.
- **ExpectedOutcomeBlock** demonstrates restraint: the deviation risk only appears if it is `caution` or `warning`. A safe state produces no noise.
- **ConfidenceBlock** demonstrates typographic authority: consistency label uses the semantic color system; confidence bars communicate tier without requiring a number.

### Future Profile Screen

The profile screen will surface the athlete's physiological history. The design principles require:

- Time series data expressed as functional data visualization, not decorative charts
- No comparisons to population averages (the system models the individual, not the population)
- Historical trends in the same semantic color system as the today view
- No gamification: no streaks, no badges, no achievement notifications

### Future Insights Screen

Insights will surface patterns the athlete may not have noticed. The design principles require:

- Each insight answers one question (the One Question Model extends beyond the today view)
- Insights are ordered by actionability, not recency
- An insight without a recommended action is metadata — it belongs in supporting evidence, not a primary insight card

### Settings / Configuration

Settings are a utility context, not a product context. The design principles apply with lower strictness:

- Standard form components, standard spacing
- The semantic color system still applies
- No emotional goals are relevant here — the athlete is configuring, not reading their assessment
- The typography system simplifies: label + body only, no display/verdict type

---

## Appendix: Anti-Patterns

These patterns must never appear in SHARPIT. They are listed because they are tempting, common, and contrary to the design language.

| Anti-pattern                                 | Why it's prohibited                                                               |
| -------------------------------------------- | --------------------------------------------------------------------------------- |
| Progress rings / radial charts               | Gamification. Communicates achievement, not physiology.                           |
| Streak counters                              | Behavioral manipulation. Contradicts scientific integrity.                        |
| Animated number counters                     | Decorative. The final number is what matters, not the animation.                  |
| Large hero images or gradients               | Consumerism. A precision instrument has no background photography.                |
| Notification badges on tab icons             | Dashboard thinking. SHARPIT is not a notification center.                         |
| Color gradients between two semantic colors  | Creates ambiguous meaning.                                                        |
| "Great job!" or motivational micro-copy      | Patronizing. The athlete is intelligent; SHARPIT is informative, not encouraging. |
| Card grid / masonry layouts                  | Fragments the causal narrative. The one-column layout is not negotiable.          |
| Toggle between "simple" and "advanced" modes | Implies the athlete needs protection from their own data.                         |
| Pull-to-refresh with animated mascot         | Consumer fitness app DNA.                                                         |

---

_This document is the authority on SHARPIT's visual identity. Individual implementation decisions must be traceable to the principles defined here. When a design decision requires deviation from these principles, the deviation must be documented and justified — not silently applied._
