# Intelligent Planned Sessions — Environmental Journey

> **Status:** Phase 1–4 implemented (foundation)  
> **Architecture:** Product vertical — no new physiological engine  
> **Engine dependency:** `environment-v1.1` (frozen)

---

## Mission

Transform `PlannedSession` from a calendar entry into a **contextual training intention** that answers:

1. What am I going to do?
2. Under which conditions?
3. What should I expect?
4. Should anything change before I start?

After completion: compare planned vs observed conditions to close the loop.

---

## Pipeline

```
PlannedSession (intention fields)
        ↓
ForecastEnvironment (existing engine — buildForecastEnvironment)
        ↓
EnvironmentalDecisionSnapshot projection (existing — no duplicate logic)
        ↓
PlannedSessionAdvisory (decision layer — recommendations only)
        ↓
PlannedSessionViewModel (presentation — conditions, not raw weather)
        ↓
UI: dialog context panel, planning cards
        ↓
Post-session: planned vs observed comparison on activity detail
```

---

## Domain model (Phase 1)

**Athlete-declared (persisted on `PlannedSession`):**

| Field                         | Purpose                            |
| ----------------------------- | ---------------------------------- |
| `exposureSetting`             | `INDOOR` \| `OUTDOOR` \| `UNKNOWN` |
| `locationLabel`               | Human-readable place               |
| `locationLat` / `locationLng` | Optional precise location          |
| `locationType`                | `ROAD`, `TRAIL`, `TRAINER`, etc.   |

**Engine projection (cached JSON — not recomputed in UI):**

| Field                  | Purpose                            |
| ---------------------- | ---------------------------------- |
| `environmentContext`   | Serialized `PlannedSessionContext` |
| `environmentContextAt` | Cache freshness timestamp          |

Types: `src/core/planned-session/types.ts`

---

## Forecast (Phase 2)

- Provider: Open-Meteo **forecast** API (future sessions) or **archive** (past windows)
- Code: `src/lib/planned-session/forecast-fetch.ts`
- Uses `buildForecastEnvironment()` — no second weather model
- Graceful degradation: `NO_FORECAST` advisory, empty projection

Location resolution order:

1. Session lat/lng + label
2. Athlete geo from activity GPS (same day)
3. `SHARPIT_DEFAULT_LATITUDE/LONGITUDE`
4. Paris default

---

## Decision (Phase 3)

`src/core/decision/planned-session-advisory.ts`

Recommendations (non-binding):

| Kind                      | Trigger                            |
| ------------------------- | ---------------------------------- |
| `CONFIRM_LOCATION`        | Outdoor sport + `exposure=UNKNOWN` |
| `REDUCE_INTENSITY`        | High/extreme heat + hard intensity |
| `SHIFT_EARLIER`           | Heat + start after 11h             |
| `HYDRATION`               | High/extreme heat                  |
| `INDOOR_ALTERNATIVE`      | Significant training impact        |
| `RECOVERY_DEMAND`         | Elevated recovery adjustment       |
| `PROCEED` / `NO_FORECAST` | Fallbacks                          |

Does **not** mutate `DecisionState` or daily verdict — session-scoped only.

---

## Presentation (Phase 4)

- Contract: `src/core/presentation/planned-session-view-model.ts`
- Builder: `src/lib/presentation/planned-session.ts`
- API: `GET /api/presentation/planned-session/[id]`
- UI: `PlannedSessionContextPanel` in planning dialog

**Rule:** express conditions and impact first — temperature is supporting evidence only.

---

## Activity comparison (Phase 5)

`src/lib/planned-session/completion-comparison.ts`

```
Planned conditions (cached context)
        ↓
Observed conditions (ActivityEnvironmentalCorrection)
        ↓
Narrative comparison on activity detail when linked
```

---

## Code map

| Layer            | Path                                                        |
| ---------------- | ----------------------------------------------------------- |
| Domain types     | `src/core/planned-session/`                                 |
| Forecast fetch   | `src/lib/planned-session/forecast-fetch.ts`                 |
| Context resolver | `src/lib/planned-session/resolve-context.ts`                |
| Advisories       | `src/core/decision/planned-session-advisory.ts`             |
| Presentation     | `src/lib/presentation/planned-session.ts`                   |
| UI panel         | `src/components/planning/planned-session-context-panel.tsx` |

---

## Remaining product work

- Map picker for `locationLat/lng`
- Coach plan adapter injects forecast context for upcoming sessions
- Calendar chip micro-context (one-line conditions summary)
- Persist forecast snapshot on session for stable post-hoc comparison
- Open-Meteo rate-limit backoff UI

---

## Related

- [`ENVIRONMENTAL_CONTEXT_ENGINE.md`](./models/ENVIRONMENTAL_CONTEXT_ENGINE.md)
- [`ENVIRONMENTAL_CONTEXT_ENGINE_PHASE3_PRESENTATION.md`](./models/ENVIRONMENTAL_CONTEXT_ENGINE_PHASE3_PRESENTATION.md)
- [`DECISION_ENGINE.md`](./models/DECISION_ENGINE.md)
