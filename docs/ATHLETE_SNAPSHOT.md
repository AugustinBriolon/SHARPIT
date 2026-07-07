# SHARPIT — Athlete Snapshot

> **Status:** Canonical — official athlete state for all product surfaces  
> **Related:** [`EVENT_DRIVEN_ARCHITECTURE.md`](EVENT_DRIVEN_ARCHITECTURE.md) · [`domain/DOMAIN.md`](domain/DOMAIN.md)

---

## 1. Principle

The athlete opens SHARPIT and **already knows their state**. Today never "builds itself" in front of them.

The **Athlete Snapshot** is the single source of truth:

```
Inference + Freshness + Briefing  →  Athlete Snapshot  →  Today / notifications / widgets
```

Consumers **read** the snapshot. They never recompute inference.

---

## 2. Snapshot contract

Type: `src/core/athlete-state/snapshot.ts`

| Field                                                 | Source                          | Purpose                                      |
| ----------------------------------------------------- | ------------------------------- | -------------------------------------------- |
| `snapshotId`                                          | Deterministic fingerprint       | Idempotency — skip regeneration if unchanged |
| `generatedAt`                                         | Generation timestamp            | Staleness display                            |
| `freshness`                                           | `computeFreshnessSnapshot`      | Domain-level freshness                       |
| `recovery` / `fatigue` / `adaptation` / `dailyStrain` | Inference engines               | Physiological state                          |
| `reasoning`                                           | Reasoning engine                | Synthesis                                    |
| `readiness`                                           | `recovery.readinessScore`       | Product headline                             |
| `todaysDecision`                                      | `reasoning.overallVerdict`      | Train / recover / caution                    |
| `limitingFactor`                                      | `reasoning.limitingFactor`      | What's holding the athlete back              |
| `confidence`                                          | `reasoning.confidence`          | Decision certainty                           |
| `briefing`                                            | `DailyBriefing` (if generated)  | Morning narrative                            |
| `recommendation`                                      | Derived from attention priority | Actionable guidance                          |
| `primaryProductMessage`                               | Freshness + degradation         | Athlete-facing status                        |
| `domainMessages`                                      | Per-domain freshness            | Section-level explanations                   |

---

## 3. Lifecycle

### 3.1 Generation triggers

Regenerate **only when inputs change** (fingerprint mismatch):

| Event                           | Path                                                              |
| ------------------------------- | ----------------------------------------------------------------- |
| `ApplicationOpened`             | `refreshAthleteState` → `regenerateAthleteSnapshotAfterInference` |
| `ProviderSyncCompleted`         | `onProviderSyncCompleted`                                         |
| `ManualWellnessSubmitted`       | `onWellnessSubmitted`                                             |
| `InferenceRequested` (fast)     | `handleAthleteStateEvent`                                         |
| Briefing generated (background) | `regenerateAthleteSnapshotAfterBriefing`                          |

### 3.2 Idempotency

`computeSnapshotId()` hashes:

- Sub-model `computedAt` timestamps
- Daily strain TSS
- Briefing `generatedAt`
- Freshness `computedAt`

Same fingerprint → return existing snapshot, no DB write.

### 3.3 Persistence

Table: `AthleteSnapshotRecord` — one row per `(athleteId, trainingDayId)`.

Repository: `src/infrastructure/athlete-state/snapshot-repository.ts`

Service: `src/lib/athlete-state/snapshot-service.ts`

---

## 4. Morning Experience

```
1. GET /api/athlete-state/snapshot     → instant persisted snapshot
2. POST /api/athlete-state/refresh     → background sync + inference (AthleteStateInitializer)
3. React Query cache updated           → UI updates seamlessly
```

### Client hooks

- `useAthleteSnapshot()` — primary Today hook
- `useToday()` — thin projection for drill-down pages (reads same cache)

### UX rules

| Situation          | Behaviour                                |
| ------------------ | ---------------------------------------- |
| Snapshot exists    | Show immediately — no full-page skeleton |
| Partial data       | Show metrics + `primaryProductMessage`   |
| Domain stale       | Section message, not global block        |
| Background refresh | Subtle banner, never "Model running…"    |
| First visit ever   | Minimal skeleton only                    |

---

## 5. Graceful degradation

Stale domains do **not** block Today.

Example messages (never technical):

- _"Les données de sommeil de la nuit ne sont pas encore arrivées."_
- _"En attente des signaux de récupération (sommeil, VFC)."_

Source: `src/lib/athlete-state/product-states.ts` via `freshness.domains[].productMessage`.

---

## 6. Future consumers

The snapshot API is designed for:

- Morning push notification (title from `todaysDecision`, body from `briefing` excerpt)
- Lock screen / home screen widgets
- Apple Watch complications
- Siri / Shortcuts

All consumers: `GET /api/athlete-state/snapshot?trainingDayId=YYYY-MM-DD`

---

## 7. File map

| File                                                         | Role                        |
| ------------------------------------------------------------ | --------------------------- |
| `src/core/athlete-state/snapshot.ts`                         | Domain type                 |
| `src/lib/athlete-state/snapshot-builder.ts`                  | Pure builder + fingerprint  |
| `src/lib/athlete-state/snapshot-service.ts`                  | Generate / get / regenerate |
| `src/infrastructure/athlete-state/snapshot-repository.ts`    | Prisma persistence          |
| `src/app/api/athlete-state/snapshot/route.ts`                | Read API                    |
| `src/hooks/use-athlete-snapshot.ts`                          | Client hook                 |
| `src/components/athlete-state/athlete-state-initializer.tsx` | Silent background refresh   |

---

## 8. What the athlete perceives

> _"SHARPIT already knows how I am this morning."_

Synchronization, inference, and briefing generation are invisible. The snapshot is always something meaningful — never an empty loading state.
