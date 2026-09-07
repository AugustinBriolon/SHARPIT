# Plan Hub Continuous Thread Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `/plan` as one destination plate, one week decision, and a four-event vertical thread, using existing data helpers and Today session previews.

**Architecture:** Pure helpers own decisions (`buildMacroPhaseRail`, `buildWeekDecision`, `selectHubDoneEntries`). Presentational components consume those readings. `usePlanHubModel` assembles queries. No new API, no Core change.

**Tech Stack:** Next.js App Router, React client islands, Vitest, existing SHARPIT tokens (`surface-ink`, `analysis-panel`, `text-*`).

## Global Constraints

- French athlete-facing copy. No em dash. Charge, never TSS in Essential.
- Single causal column. No content grid. No drop shadows.
- Routes stay `/plan/semaine`, `/plan/bilan`, `/plan/adaptation`, `/plan/charge`, `/activite`, `/moi/objectifs`.
- Reuse `CompletedSessionPreview` and `PlannedSessionPreview`. Do not fork cards.
- Tests first on helpers. Components stay presentational.

---

### Task 1: Raise completed rail cap to 4

**Files:**

- Modify: `src/lib/plan/plan-week-previews.ts`
- Test: `src/lib/plan/plan-week-previews.test.ts`

**Interfaces:**

- Consumes: `ThreadEntry[]`
- Produces: `selectHubDoneEntries` with `HUB_DONE_PREVIEW_LIMIT = 4`

- [ ] Update tests: 5 items → featured 4 newest first, overflow 1
- [ ] Set limit to 4
- [ ] Run `npx vitest run src/lib/plan/plan-week-previews.test.ts`

### Task 2: `buildMacroPhaseRail`

**Files:**

- Create: `src/lib/plan/plan-macro-rail.ts`
- Test: `src/lib/plan/plan-macro-rail.test.ts`

**Interfaces:**

- Consumes: `PlanPhaseSource` from `plan-phase.ts`
- Produces:

```ts
export type MacroPhaseRun = {
  phase: PlanPhase;
  label: string;
  current: boolean;
};

export type MacroPhaseRail = {
  runs: MacroPhaseRun[];
  weekInRun: number;
  focus: string | null;
  isDeload: boolean;
};

export function buildMacroPhaseRail(
  plan: PlanPhaseSource | null | undefined,
  now: Date,
): MacroPhaseRail | null;
```

- [ ] Tests: null plan; week outside plan; mid-run weekInRun; consecutive PEAK weeks collapse to one run; omitted unused phases
- [ ] Implement grouping of consecutive identical phases, current run only emphasised
- [ ] Run `npx vitest run src/lib/plan/plan-macro-rail.test.ts`

### Task 3: `buildWeekDecision`

**Files:**

- Create: `src/lib/plan/plan-week-decision.ts`
- Test: `src/lib/plan/plan-week-decision.test.ts`

**Interfaces:**

- Consumes: `PlanWeek`, `OverallVerdict`, caution label, `hasBrief`
- Produces:

```ts
export type WeekDecisionAction = {
  label: string;
  href: string;
  sessionId: string | null;
};

export type WeekDecision = {
  kind: 'empty' | 'gated' | 'in_progress' | 'complete';
  sentence: string;
  reason: string | null;
  primary: WeekDecisionAction;
  secondary: WeekDecisionAction | null;
};

export function buildWeekDecision(input: {
  week: PlanWeek;
  verdict: OverallVerdict | null;
  cautionLabel: string | null;
  hasBrief: boolean;
}): WeekDecision;
```

Copy (locked):

- empty: `Sans séance prévue ni réalisée, il n’y a rien à comparer.` Primary `Construire la semaine` → `/plan/semaine`. No secondary.
- gated: `Tiens le volume, protège {weekday}.` Primary `Adapter {weekday}` with `sessionId`. Secondary `La semaine`.
- in_progress: `Tiens le volume. Prochaine : {title}.` Primary opens next remaining session. Secondary `La semaine`.
- complete + brief: `La semaine est tenue. Lis ce qu’elle a produit.` Primary `Voir le bilan` → `/plan/bilan`. Secondary `La semaine`.
- complete no brief: same sentence, primary `La semaine`, no secondary.

`reason` is `cautionLabel` when present.

- [ ] Write the five situation tests
- [ ] Implement
- [ ] Run `npx vitest run src/lib/plan/plan-week-decision.test.ts`

### Task 4: Upcoming selector

**Files:**

- Modify: `src/lib/plan/plan-week-previews.ts`
- Test: `src/lib/plan/plan-week-previews.test.ts`

**Interfaces:**

- Produces: `selectHubRemainingEntries(remaining)` → `{ featured, overflow }` with limit 2, chronological.

- [ ] Test 3 remaining → 2 featured, overflow 1
- [ ] Implement
- [ ] Run tests

### Task 5: Compose the hub

**Files:**

- Modify: `src/components/shell/plan-hub.tsx` (title `Ton cap, cette semaine`, drop subtitle)
- Modify: `src/components/shell/plan-hub-widgets.tsx`
- Modify: `src/hooks/use-plan-hub-model.ts` (expose rail + decision inputs)
- Create: `src/components/plan/plan-destination-plate.tsx`
- Create: `src/components/plan/plan-week-decision.tsx`
- Create: `src/components/plan/plan-week-thread.tsx`
- Modify: `src/components/plan/plan-week-entries.tsx` (rail + max 2 remaining)
- Modify: `src/components/plan/plan-load-trend.tsx` (drop standalone section chrome if folded)
- Modify: `src/components/plan/plan-projection-section.tsx` (event, plus bilan line)
- Delete unused: `plan-phase-band.tsx` if no callers
- Modify: `plan-week-section.tsx` to only keep strip + empty, or delete if unused

Composition order from spec. Single column. Rail: `flex snap-x snap-mandatory overflow-x-auto` cards `w-[min(85vw,20rem)] shrink-0 snap-start`.

- [ ] Wire model
- [ ] Build plates and thread
- [ ] Lint + `npx tsc --noEmit` + `npx vitest run src/lib/plan src/components/plan`

### Task 6: Visual check

- [ ] 390px: destination + decision + action visible without scrolling past the CTA
- [ ] Completed metrics do not overlap
- [ ] Empty week, no plan, no completed rail omitted

---

## Spec coverage

Destination plate, week decision, upcoming, rail, block state, projection+bilan, header, removals, helpers, PWA snap, tokens, states: Tasks 1-6.

## Execution

Inline in this session. No per-task commits unless asked.
