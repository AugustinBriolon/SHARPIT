# SHARPIT — Event-Driven Athlete State Architecture

> **Status:** Canonical — synchronization and orchestration specification  
> **Supersedes:** application-centric pull model (Today page load as sole inference trigger)  
> **Related:** [`docs/domain/DOMAIN.md`](domain/DOMAIN.md) · [`docs/engineering/INFERENCE_PLATFORM.md`](engineering/INFERENCE_PLATFORM.md) · [`docs/product/PRODUCT.md`](product/PRODUCT.md)

---

## 1. Principle

Synchronization is an **implementation detail**.

The athlete opens SHARPIT and finds an **up-to-date Digital Twin**. They never think about Garmin, Strava, cron jobs, or refresh buttons.

```
Before (application-centric):
  User opens app → UI fetches /api/today → inference runs → maybe stale data

After (athlete-centric):
  Meaningful event → sync if needed → ingest → features → inference → Twin updated
  User opens app → fresh state already exists or updates silently
```

---

## 2. Audit — current pipeline (baseline July 2026)

### 2.1 Triggers before this architecture

| Trigger              | Location                | Sync          | Ingest | Features | Inference | Background        |
| -------------------- | ----------------------- | ------------- | ------ | -------- | --------- | ----------------- |
| Vercel cron 3×/day   | `/api/cron/sync`        | All providers | ✓      | Partial¹ | ✗         | Briefing only     |
| Manual settings sync | `/api/*/sync`           | Per provider  | ✓      | Partial¹ | ✗²        | Narratives inline |
| App / Today load     | `/api/today`            | ✗             | ✗      | Lazy     | ✓         | ✗                 |
| Wellness POST        | `/api/wellness-checkin` | ✗             | ✓      | Partial¹ | Partial³  | ✗                 |
| Activity POST        | `/api/activities`       | ✗             | ✓      | Partial¹ | ✗         | Narrative         |
| Coach briefing POST  | `/api/coach/briefing`   | ✗             | ✗      | ✗        | ✗         | Briefing          |

¹ Feature Engine subscribed when `FEATURE_ENGINE_ENABLED !== 'false'`  
² After migration: inference via `onProviderSyncCompleted`  
³ Recovery + fatigue + reasoning only; adaptation skipped

### 2.2 Execution graph (legacy gaps)

```
SYNC ──► OBSERVATION ──?──► FEATURES ──?──► INFERENCE ──► DIGITAL TWIN
  │                              ▲
  │                              │
  └── (no automatic link) ───────┘ only when /api/today called
```

**Critical gaps addressed:**

- Inference not triggered post-sync
- Today / presentation / planned-sessions invalidated after settings sync (`invalidateAfterProviderSync`)
- Feature engine opt-in (`true` required) instead of opt-out
- Narratives blocking sync path
- Briefing generated without fresh inference state

---

## 3. Event taxonomy

Events are **facts** — immutable, idempotent handlers, traceable via `traceId`.

### 3.1 Lifecycle events

| Event                   | Emitted when                        | Fast path                              | Background                 |
| ----------------------- | ----------------------------------- | -------------------------------------- | -------------------------- |
| `ApplicationOpened`     | App shell mount                     | Freshness → selective sync → inference | Briefing, narratives       |
| `ProviderSyncRequested` | Orchestrator decides stale provider | Targeted provider sync                 | —                          |
| `ProviderSyncCompleted` | After any provider sync             | Inference                              | Link, narratives, briefing |

### 3.2 Data events

| Event                     | Emitted when                | Fast path            | Background                    |
| ------------------------- | --------------------------- | -------------------- | ----------------------------- |
| `ObservationIngested`     | Observation Engine persists | Feature invalidation | Debounced inference⁴          |
| `ActivityImported`        | New activities from sync    | Inference            | Narratives, plan link         |
| `SleepImported`           | Sleep observations batch    | Inference (recovery) | —                             |
| `BodyCompositionUpdated`  | Renpho/Withings             | —                    | —                             |
| `ManualWellnessSubmitted` | Morning wellness dialog     | Full inference       | Morning recalibration ensure⁵ |

⁵ After Twin refresh: `ensureMorningRecalibration` may create a PRESENTED Decision Memory proposal (never auto-applies). Athlete confirms via Today ActionRow.
| `SessionCompleted` | Activity finalized | Inference | Narrative |
| `PlanChanged` | Planning CRUD / Google sync | Planning freshness | — |

### 3.3 Control events

| Event                | Purpose                                        |
| -------------------- | ---------------------------------------------- |
| `InferenceRequested` | Explicit fast/background inference with reason |
| `InferenceCompleted` | Audit trail; freshness update                  |

⁴ Per-observation inference is avoided during batch sync; `ProviderSyncCompleted` triggers one inference pass.

### 3.4 Event properties (required)

Every event carries:

- `eventId` — unique, idempotent key
- `traceId` — correlates a single athlete refresh
- `athleteId`, `trainingDayId`, `emittedAt`
- Domain-specific payload

Handlers must be: **idempotent**, **replayable**, **observable** (structured logs), **independently testable**.

---

## 4. Freshness

Freshness is a **first-class domain concept**. The Twin always knows what is current, what is stale, what is waiting, and what is computing.

### 4.1 Domains

| Domain            | Driven by                                     |
| ----------------- | --------------------------------------------- |
| `recovery`        | Recovery model + sleep/subjective evidence    |
| `training`        | Fatigue model + session evidence              |
| `sleep`           | Sleep observations + recovery sleep dimension |
| `body`            | Body composition observations                 |
| `reasoning`       | Reasoning model vs sub-model timestamps       |
| `recommendations` | Daily briefing vs reasoning freshness         |
| `planning`        | Google calendar sync                          |

### 4.2 Freshness levels

| Level           | Meaning (internal)                 | Athlete sees                                           |
| --------------- | ---------------------------------- | ------------------------------------------------------ |
| `fresh`         | State matches latest evidence      | Nothing (default)                                      |
| `stale`         | New evidence, not yet inferred     | Contextual update message                              |
| `awaiting_data` | Expected data not arrived          | e.g. "Sleep data from last night has not arrived yet." |
| `syncing`       | Provider fetch in progress         | e.g. "Récupération de tes données de sommeil…"         |
| `computing`     | Inference running                  | e.g. "Analyse de ta récupération…"                     |
| `unavailable`   | No integration / insufficient data | Honest limitation message                              |

**Rule:** Never expose `Loading...`, `Model running...`, or provider names as primary UI.

### 4.3 API

- `GET /api/athlete-state/refresh?trainingDayId=` — freshness snapshot only
- Freshness computed in `src/lib/athlete-state/freshness-service.ts`
- Product copy in `src/lib/athlete-state/product-states.ts`

---

## 5. ApplicationOpened flow

When the athlete opens SHARPIT:

```
1. AthleteStateInitializer (client) → POST /api/athlete-state/refresh
2. computeFreshnessSnapshot()
3. If stale → syncProviders([garmin, strava, ...])  // selective
4. runFastInference() → loadTodayState({ forceRefresh: true })
5. scheduleBackgroundTasks() → narratives, briefing
6. Return { freshness, todayState } → hydrate React Query
7. UI renders Today with current Twin
```

The athlete performs **zero sync actions**.

---

## 6. Dual execution modes

### 6.1 Fast path (blocking, < few seconds)

- Selective provider synchronization
- Feature extraction (via observation pipeline bus)
- Recovery → Fatigue → Adaptation → Daily Strain → Reasoning
- Today state returned to client

**Code:** `src/lib/athlete-state/orchestrator.ts` → `runFastInference()` → `loadTodayState()`

### 6.2 Background path (non-blocking)

- Activity narratives (`runActivityNarrativeForIds`)
- Planned session linking + compliance analysis
- Daily briefing generation
- Weekly review (cron Sunday)
- Stream backfill, records recompute (cron)

**Code:** `src/lib/athlete-state/background.ts` — fire-and-forget, failures logged, idempotent retries safe.

---

## 7. Implementation map

| Component                  | Path                                                         |
| -------------------------- | ------------------------------------------------------------ |
| Event types                | `src/core/athlete-state/events.ts`                           |
| Freshness types            | `src/core/athlete-state/freshness.ts`                        |
| Freshness computation      | `src/lib/athlete-state/freshness-service.ts`                 |
| Product-facing messages    | `src/lib/athlete-state/product-states.ts`                    |
| Orchestrator               | `src/lib/athlete-state/orchestrator.ts`                      |
| Provider sync              | `src/lib/athlete-state/sync-providers.ts`                    |
| Background tasks           | `src/lib/athlete-state/background.ts`                        |
| Observation → Features bus | `src/infrastructure/events/observation-pipeline-bus.ts`      |
| App open hook              | `src/components/athlete-state/athlete-state-initializer.tsx` |
| API                        | `src/app/api/athlete-state/refresh/route.ts`                 |

### 7.1 Wired triggers (post-migration)

| Trigger                      | Behavior                                  |
| ---------------------------- | ----------------------------------------- |
| App open                     | `refreshAthleteState()`                   |
| Cron after sync              | `refreshAthleteState({ skipSync: true })` |
| POST `/api/strava/sync`      | sync → `onProviderSyncCompleted()`        |
| POST `/api/garmin/sync`      | sync → `onProviderSyncCompleted()`        |
| POST `/api/wellness-checkin` | ingest → `onWellnessSubmitted()`          |
| GET `/api/today`             | Unchanged fallback for direct fetch       |

### 7.2 Feature Engine default

`FEATURE_ENGINE_ENABLED` is now **opt-out** (`false` disables). Observation pipeline always wires FeatureEngine unless explicitly disabled.

---

## 8. Provider selection logic

On app open, sync only providers that are:

- Connected, AND
- Stale (threshold: Garmin/Strava/Google 2h, body scales 24h), OR
- Force refresh requested

Before 5:00 local: skip sync (sleep data unlikely complete).

---

## 9. What the athlete perceives

> "My Digital Twin is always up to date."

They may occasionally see a **meaningful** status line:

- "Les données de sommeil de la nuit ne sont pas encore arrivées."
- "Analyse de ta récupération…"

They never see:

- "Synchroniser Garmin"
- "Loading..."
- "Inference running"

Settings may still offer manual reconnect; sync buttons become **recovery tools**, not daily workflow.

---

## 10. Athlete Snapshot (Morning Experience V1)

The orchestrator now materializes an **Athlete Snapshot** after every fast-path inference.

See [`ATHLETE_SNAPSHOT.md`](ATHLETE_SNAPSHOT.md) for the canonical contract.

```
Event → sync → inference → Athlete Snapshot (persisted) → Today / notifications / widgets
```

---

## 11. Future work

| Item                               | Notes                                        |
| ---------------------------------- | -------------------------------------------- |
| Distributed event bus              | Redis / Vercel Queues — same event contracts |
| `AthleteStateMeta` persistence     | Cross-request `computing` flags              |
| Physical notes → observations      | Unify injury pathway                         |
| Push notification on fresh verdict | Consume `GET /api/athlete-state/snapshot`    |
| Debounced batch inference          | Coalesce rapid observation bursts            |

---

## 12. Testing strategy

- **Unit:** freshness computation given fixture twin + observations
- **Unit:** `providersNeedingSync` selection
- **Integration:** sync mock → `onProviderSyncCompleted` → twin updated
- **E2E:** app open → refresh API called → today query hydrated

---

_Last updated: July 2026_
