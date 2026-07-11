# Stabilization P2 Report — Repository Hygiene

> **Sprint:** Stabilization P2  
> **Date:** 2026-07-10  
> **Scope:** Remove legacy architecture, enforce canonical pipeline, extend guards  
> **Constitution:** [`CORE_ARCHITECTURE.md`](./CORE_ARCHITECTURE.md) — Core frozen, no new engines

---

## Mission outcome

SHARPIT now exposes **one canonical product pipeline** end-to-end:

```
Observation → Features → Digital Twin → Specialized Engines
        → Decision Engine → DecisionState
        → AthleteSnapshot.decision
        → Presentation ViewModels
        → Passive UI surfaces
```

Parallel verdict paths, legacy API routes, and deprecated helpers have been removed or documented as temporary compatibility.

---

## Removed files

| File                              | Reason                                                       |
| --------------------------------- | ------------------------------------------------------------ |
| `src/app/api/reasoning/route.ts`  | Legacy reasoning API — superseded by snapshot + presentation |
| `src/app/api/today/route.ts`      | Duplicate of athlete-state snapshot load                     |
| `src/app/api/recovery/route.ts`   | Direct engine read bypassing snapshot                        |
| `src/app/api/fatigue/route.ts`    | Direct engine read bypassing snapshot                        |
| `src/app/api/adaptation/route.ts` | Direct engine read bypassing snapshot                        |
| `src/lib/query/today-fetch.ts`    | Fetcher for removed `/api/today`                             |

---

## Removed APIs

| Endpoint              | Migration                                                          |
| --------------------- | ------------------------------------------------------------------ |
| `GET /api/reasoning`  | `GET /api/athlete-state/snapshot` or `GET /api/presentation/today` |
| `GET /api/today`      | `GET /api/athlete-state/snapshot`                                  |
| `GET /api/recovery`   | `GET /api/presentation/recovery` (ViewModel)                       |
| `GET /api/fatigue`    | `GET /api/presentation/effort` (fatigue domain in effort surface)  |
| `GET /api/adaptation` | `GET /api/presentation/adaptation`                                 |

**Verification:** zero remaining references in `src/**` to these paths.

---

## Removed helpers and compatibility layers

| Symbol                                 | Location (was)             | Replacement                                        |
| -------------------------------------- | -------------------------- | -------------------------------------------------- |
| `pickRecommendation()`                 | `snapshot-builder.ts`      | `resolveRecommendationFromDecision()` (P0)         |
| `buildWhyEvidence()`                   | `today-rich-view.ts`       | `buildWhyEvidenceFromDecision()`                   |
| `prioritizeFindings()`                 | `today-rich-view.ts`       | Evidence ranking in Decision Engine                |
| `resolveConfidenceHref()`              | `today-twin-navigation.ts` | `resolveConfidenceHrefFromDecision()`              |
| `resolveLimitingFactorHref()`          | `today-twin-navigation.ts` | `resolveLimitingFactorHrefFromDecision()`          |
| `isAdviceActionable(reasoning)`        | `snapshot-truthfulness.ts` | `isAdviceActionableFromDecision(decision)`         |
| `productViewToTodayState()`            | `product-view.ts`          | `snapshotToProductView()` + direct snapshot fields |
| `AthleteSnapshotProductView.reasoning` | `product-view.ts`          | Removed — decision-first product view              |

---

## Type simplifications

| Change                              | Detail                                                                                            |
| ----------------------------------- | ------------------------------------------------------------------------------------------------- |
| `AthleteSnapshotProductView`        | Decision-first; `reasoning` field removed from client product view                                |
| `useToday()` / `EMPTY_PRODUCT_VIEW` | No longer exposes deprecated `reasoning` on product view                                          |
| `ReasoningState`                    | Documented as **narrative projection only** — not a product verdict source                        |
| Canonical projection module         | `src/lib/decision/projection.ts` — single read path for verdicts, hrefs, why-lines, advice gating |

---

## Architecture enforcement (new / extended)

### Import guard (existing)

`src/core/architecture/__tests__/presentation-architecture-guard.test.ts`

- Blocks value imports from inference, digital-twin, feature engine, observation, engines singletons, product-insight builders
- Scope: `src/components/**`, `src/hooks/**`, `src/app/**` (excludes API routes)

### Legacy pattern guard (P2 — new)

Same test file — second `describe` block scans:

- `src/components/**`
- `src/hooks/**`
- `src/lib/presentation/**`

Forbidden patterns:

- `pickRecommendation`
- `buildWhyEvidence` (without `FromDecision` suffix)
- `resolveConfidenceHref` / `resolveLimitingFactorHref` (legacy, without `FromDecision`)
- `reasoning.overallVerdict`, `reasoning.topAction`, `reasoning.keyFindings`
- `isAdviceActionable(...reasoning...)`

---

## Intentionally retained (documented compatibility)

| Element                                  | Why kept                                          | Remove when                                          |
| ---------------------------------------- | ------------------------------------------------- | ---------------------------------------------------- |
| `src/core/inference/reasoning/`          | Projects DecisionState → ReasoningState for Twin  | Twin schema no longer stores ReasoningState          |
| `AthleteSnapshot.reasoning`              | Server-side narrative on snapshot                 | All consumers migrated to decision-only reads        |
| `runReasoningModel()`                    | Backward-compatible Twin write path               | Unified inference pass replaces ad-hoc orchestration |
| `src/lib/today-state-server.ts`          | Loads sub-models then decision on server          | Replaced by unified Inference Pass                   |
| `decisionStateToReasoningState()`        | Adapter in `src/core/decision/adapters.ts`        | Twin projection simplified                           |
| French i18n keys `reasoning.topAction.*` | Stable copy keys for topAction verb/focus strings | Optional rename to `decision.topAction.*` (cosmetic) |

---

## Remaining technical debt (P3+)

| Item                                                                    | Priority | Notes                                  |
| ----------------------------------------------------------------------- | -------- | -------------------------------------- |
| Type ownership inversion (`snapshot.ts` ← `hooks/use-today.ts`)         | Medium   | Move domain types to `core/`           |
| Analytics in presentation builders (`effort.ts`, `sleep.ts`, `body.ts`) | Medium   | Extract to product-insight layer       |
| Activity page inline environment resolution                             | Low      | Add `/api/presentation/activity/[id]`  |
| `analytics-view.tsx` builds ViewModel in component                      | Low      | Passive analytics migration            |
| `docs/EVENT_DRIVEN_ARCHITECTURE.md` references `/api/today`             | Low      | Doc update                             |
| Unified Inference Pass vs `today-state-server.ts`                       | Medium   | Structural — not blocking product work |

---

## Future cleanup opportunities

1. **Rename i18n keys** — `reasoning.topAction.*` → `decision.topAction.*` (no behavioral change)
2. **Drop `ReasoningState` from AthleteSnapshot** once Twin migration complete
3. **Consolidate confidence constants** — `MIN_ADVICE_CONFIDENCE` re-exports `MIN_DECISION_ADVICE_CONFIDENCE`
4. **Remove `TodayState.reasoning`** from server pipeline when Coach/briefing no longer need narrative projection inline
5. **Extend guards** to `src/app/(app)/**` page files if any server-side fetch patterns reappear

---

## Tests updated

| File                                                                      | Change                                |
| ------------------------------------------------------------------------- | ------------------------------------- |
| `src/lib/today-rich-view.test.ts`                                         | Removed `buildWhyEvidence` tests      |
| `src/lib/today-twin-navigation.test.ts`                                   | Migrated to `*FromDecision` helpers   |
| `src/lib/athlete-state/snapshot-truthfulness.test.ts`                     | Uses `isAdviceActionableFromDecision` |
| `src/core/architecture/__tests__/presentation-architecture-guard.test.ts` | Added legacy pattern guard            |

### Verification command

```bash
yarn test src/lib/decision/ src/lib/athlete-state/ src/core/architecture/ src/lib/today-rich-view.test.ts src/lib/today-twin-navigation.test.ts
```

---

## Documentation updated

| Document                                  | Change                                       |
| ----------------------------------------- | -------------------------------------------- |
| `docs/models/CORE_ARCHITECTURE.md`        | P0–P2 status, retained vs debt               |
| `docs/models/DECISION_ENGINE.md`          | Canonical APIs, Reasoning as projection-only |
| `docs/PRESENTATION_LAYER_ARCHITECTURE.md` | Canonical read path, guards, post-P2 state   |
| `docs/models/README.md`                   | P2 report index entry                        |

---

## Success criteria checklist

| Criterion                                                    | Status |
| ------------------------------------------------------------ | ------ |
| Single path: Observation → … → Presentation                  | ✅     |
| No duplicate verdict/recommendation builders in presentation | ✅     |
| Legacy reasoning APIs removed                                | ✅     |
| Deprecated helpers removed                                   | ✅     |
| Architecture guards extended                                 | ✅     |
| Contributor can discover canonical pipeline from docs        | ✅     |
| Remaining debt documented                                    | ✅     |

---

## Related reports

- [STABILIZATION_P0_MIGRATION_REPORT.md](./STABILIZATION_P0_MIGRATION_REPORT.md)
- [STABILIZATION_P1_REPORT.md](./STABILIZATION_P1_REPORT.md)
