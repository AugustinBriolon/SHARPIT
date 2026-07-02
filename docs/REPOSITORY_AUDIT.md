# Repository Audit — 2026-07-02

Scope: full codebase review across all directories.
Method: static import analysis, grep-based reference counting, structural comparison against `ARCHITECTURE.md`.
No code was modified during this audit.

---

## Classification Legend

| Label          | Meaning                                                        |
| -------------- | -------------------------------------------------------------- |
| **CORE**       | Active, foundational — must not be removed                     |
| **ACTIVE**     | In use, no issues                                              |
| **DEAD**       | Zero imports, zero references, safe to delete immediately      |
| **LEGACY**     | In use but will be superseded; has a documented migration path |
| **DEPRECATED** | Marked for removal; should not be extended                     |

---

## Summary

The codebase is in excellent condition. Only **2 dead files** were found across 352 source files.
No LEGACY or DEPRECATED modules exist. The intelligence engine architecture (Recovery → Fatigue → Adaptation → Reasoning) is fully consistent and all four verticals follow identical structural patterns.

| Category   | Count | Notes                                          |
| ---------- | ----- | ---------------------------------------------- |
| CORE       | ~280  | All intelligence models, infra, API routes, UI |
| ACTIVE     | ~70   | Utilities, hooks, lib singletons, validators   |
| DEAD       | **2** | See Section 1 below                            |
| LEGACY     | 0     | —                                              |
| DEPRECATED | 0     | —                                              |

---

## Section 1 — Dead Files (safe to delete)

### `src/components/today/today-yesterday.tsx`

- **Size**: 62 lines
- **Status**: DEAD
- **Evidence**: Zero imports anywhere in `src/`. No re-export. Component is never rendered.
- **Why it exists**: Likely cut from the dashboard refactor when the "yesterday" column was collapsed into the today view. Was not deleted at the time.
- **Replaces nothing** — there is no active yesterday-panel concept in the current UI.
- **Action**: Delete.

### `src/components/garmin/garmin-auto-sync.tsx`

- **Size**: 44 lines
- **Status**: DEAD
- **Evidence**: Zero imports anywhere in `src/`. Not referenced in any settings panel or layout.
- **Why it exists**: Orphaned during an earlier Garmin integration refactor. Auto-sync functionality was likely folded into `src/components/settings/garmin-panel.tsx` or made server-side via `src/lib/garmin-sync.ts`.
- **Action**: Delete.

**Total dead code**: 106 lines across 2 files.

---

## Section 2 — Architecture Issues

### 2.1 Migration naming inconsistency

Migrations 0–15 use sequential integer names (`0_init`, `1_athlete_profile_and_notes`, ..., `15_renpho_body_composition`).
Migrations 16+ use ISO timestamps (`20260702110023_add_feature_set_table`, ...).

```
NUMBERED (0–15):   0_init, 1_athlete_profile_and_notes, ..., 15_renpho_body_composition
TIMESTAMPED (16+): 20260702110023_add_feature_set_table
                   20260702112334_add_digital_twin_and_decision_records
                   20260702124731_add_fatigue_state_to_digital_twin
                   20260702_add_adaptation_state_to_digital_twin
                   20260702_add_reasoning_state_to_digital_twin
                   20260702_add_observation_table
```

Additionally, the two most recent adaptation/reasoning/observation migrations lack the `HHMMSS` time component (`20260702_...` vs `20260702HHMMSS_...`). This is cosmetic — Prisma resolves migration order from `migration_lock.toml`, not from directory names — but it creates visual inconsistency.

**Severity**: Low. No functional impact.
**Action**: No action needed on existing migrations (they cannot be renamed after being applied). Establish convention going forward: all new migrations use `YYYYMMDDHHmmss_<description>` format.

### 2.2 Pending `src/lib/` reorganization

`ARCHITECTURE.md` notes a pending reorganization of `src/lib/`:

> The `src/lib/` directory contains integration adapters (garmin.ts, strava.ts, renpho.ts, google.ts) alongside domain utilities (analytics.ts, training-load.ts) and engine singletons (fatigue-engine.ts, recovery-engine.ts, etc.). A future cleanup will move integration adapters to `src/lib/integrations/` and engine singletons to `src/lib/engines/`.

Current `src/lib/` contains 73 files at a single level. The flat structure is functional but will become harder to navigate as the project grows.

Candidates for `src/lib/integrations/`:

- `garmin.ts`, `garmin-sync.ts`, `garmin-activities.ts`, `garmin-activity-sync.ts`, `garmin-streams.ts`, `garmin-feel.ts`
- `strava.ts`, `strava-sync.ts`
- `renpho.ts`, `renpho-sync.ts`
- `google.ts`, `google-sync.ts`

Candidates for `src/lib/engines/`:

- `recovery-engine.ts`, `fatigue-engine.ts`, `adaptation-engine.ts`, `reasoning-engine.ts`
- `feature-engine.ts`, `observation-engine.ts`

**Severity**: Low. Cosmetic / DX improvement.
**Action**: Schedule as a standalone refactor ticket. Not blocking any current work.

### 2.3 `src/lib/client/` mixed concerns

`src/lib/client/` contains React-Query infrastructure (`fetchers.ts`, `keys.ts`, `optimistic.ts`, `types.ts`) alongside domain validator modules (`src/lib/validators/`). Both are correctly scoped but the parent directory name `client` is ambiguous — it could mean "HTTP client", "React client component", or "client-side only".

**Severity**: Very low.
**Action**: Rename to `src/lib/query/` when the `src/lib/` reorganization is done (same ticket).

---

## Section 3 — What Was Audited and Found Clean

The following areas were audited and found to have no issues:

| Area                    | Files                                                                   | Finding                                                                                                                       |
| ----------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Intelligence models     | `src/core/inference/recovery/`, `fatigue/`, `adaptation/`, `reasoning/` | All 4 verticals structurally identical. No duplication.                                                                       |
| Digital Twin            | `src/core/digital-twin/types.ts`, `repository.ts`                       | All 4 state types present. AthleteState complete.                                                                             |
| Prisma schema           | `prisma/schema.prisma`                                                  | 29 models, all referenced. 4 DigitalTwin JSON columns all populated.                                                          |
| Infrastructure adapters | `src/infrastructure/digital-twin/`                                      | 4 repo implementations, all consistent with domain interfaces.                                                                |
| API routes              | `src/app/api/`                                                          | 59 routes, all active. No orphaned routes.                                                                                    |
| Lib utilities           | `src/lib/` (73 files)                                                   | All imported at least once. `analytics.ts` (PMC/CTL/ATL) and `training-load.ts` (ACWR) are different models, not duplication. |
| Docs                    | `docs/models/` (5 files), `docs/adr/`                                   | All current. Every intelligence model documented.                                                                             |
| Components              | `src/components/`                                                       | All except 2 dead files (Section 1) are imported.                                                                             |
| Benchmarks              | `src/core/benchmarks/`                                                  | 4 benchmark suites (Recovery, Fatigue, Adaptation, Reasoning). All CI gates active.                                           |
| Hooks                   | `src/hooks/`                                                            | All hooks imported by at least one component.                                                                                 |
| Tests                   | `src/__tests__/`, `**/__tests__/`                                       | No orphaned test files found.                                                                                                 |

---

## Section 4 — Cleanup Roadmap

Listed by priority (highest first). No code was changed by this audit.

### Priority 1 — Safe Deletions (do now, no risk)

| File                                         | Lines | Action |
| -------------------------------------------- | ----- | ------ |
| `src/components/today/today-yesterday.tsx`   | 62    | Delete |
| `src/components/garmin/garmin-auto-sync.tsx` | 44    | Delete |

**Estimated reduction**: 106 lines, 2 files.

### Priority 2 — Convention (low effort, low risk)

- Establish migration naming convention: `YYYYMMDDHHmmss_<description>` for all future migrations.
- Document in CLAUDE.md or CONTRIBUTING.md.

### Priority 3 — DX Refactor (medium effort, zero risk)

- Reorganize `src/lib/` into `src/lib/integrations/`, `src/lib/engines/`, `src/lib/query/` subdirectories.
- Already noted in `ARCHITECTURE.md` as a pending task.
- ~73 files, ~20 import paths to update. No logic changes.
- **Prerequisite**: do this as a standalone PR, not mixed with feature work.

---

## Audit Coverage

| Directory              | Files examined      | Method                                       |
| ---------------------- | ------------------- | -------------------------------------------- |
| `src/core/`            | All                 | Import graph + structural pattern comparison |
| `src/infrastructure/`  | All                 | Interface compliance check                   |
| `src/lib/`             | All 73              | Import reference count                       |
| `src/components/`      | All                 | Import reference count                       |
| `src/app/api/`         | All 59 routes       | Route existence + handler wiring             |
| `src/hooks/`           | All                 | Import reference count                       |
| `prisma/`              | schema + migrations | Model reference + migration naming           |
| `docs/`                | All                 | Cross-reference against implementation       |
| `src/core/benchmarks/` | All                 | CI gate verification                         |

**Total source files**: 352
**Dead files**: 2 (0.6%)
**LEGACY/DEPRECATED**: 0
