# Dogfooding Validation — SHARPIT Coaching Loop + Installed PWA

> **Status:** In progress — Day 0 (coaching-loop pre-flight) and Day 1 (coaching-loop live re-check + PWA code-level audit) complete. Days 2–7, and every real-iOS-device checkpoint in any day, remain pending real usage — see §0.1.
> **Date:** 2026-07-15 (Day 0) · 2026-07-16 (Day 1)
> **Scope:** Athlete state → AI proposal → deterministic Gate → athlete action → completed session → outcome evaluation → learning feedback, **plus** (from Day 1) the installed-PWA dimension: lifecycle, offline behaviour, service-worker updates, privacy/account isolation.
> **Related:** [`docs/SNAPSHOT_QUALITY_V1_AUDIT.md`](../SNAPSHOT_QUALITY_V1_AUDIT.md) · [`docs/ATHLETE_SNAPSHOT.md`](../ATHLETE_SNAPSHOT.md) · [`docs/PWA_TESTING.md`](../PWA_TESTING.md) (the authoritative human-executable checklist for every finding in §0.1's "cannot verify" list) · [ADR-005](../adr/ADR-005-plan-safety-gate-placement.md) · [ADR-006](../adr/ADR-006-decision-memory-aggregate.md) · [ADR-007](../adr/ADR-007-coaching-explainability-presentation.md) · [ADR-008](../adr/ADR-008-pwa-offline-snapshot-and-sw-lifecycle.md)

---

## 0. Honesty note on method

A 7-day dogfooding protocol requires seven real calendar days of an athlete actually training, syncing devices, and making real decisions — none of which an agent can compress into one sitting without fabricating evidence. What this document contains:

- **Day 0**: a real, live pre-flight pass executed today against the real dev database (13 `AthleteSnapshotRecord` rows, 275 real `Activity` rows, 17 pre-existing `PlannedSession` rows — real athlete history) by invoking the actual route handlers directly (`POST /api/coach/plan`, `POST /api/planned-sessions`, `PATCH /api/planned-sessions/[id]`, the presentation routes), the same code path the HTTP layer calls, bypassing only the Clerk auth middleware wrapper (which contains no business logic). This included one real LLM call through the configured `AI_GATEWAY_API_KEY`. Every number and finding below is observed, not invented.
- **Days 1–6**: a structured protocol (§2) and a log template (§3) for the athlete to run for real, plus specific checkpoints this session's Day 0 pass could not reach (outcome evaluation needs 72h+ real elapsed time; a genuine Gate-`REJECTED` proposal needs the LLM to actually produce one against real high-fatigue/high-load state).

Before beginning: **zero `CoachingDecision`, `TrainingPlan`, or `Goal` rows existed in the database.** The entire Plan Safety Gate → Decision Memory → Weekly Brief → Learning Feedback loop (built across Phases 2–4 of this project) had never been exercised against real data prior to today. That is itself the primary finding motivating this whole exercise.

---

## 0.1 Honesty note on the PWA dimension (Day 1 addition)

The combined protocol requested for Day 1 asks for 7 consecutive days of an installed iOS PWA in real use: opening from the Home Screen, backgrounding/resuming, toggling Airplane Mode, receiving a real service-worker update mid-session, signing out and back in as a different account. None of this is something an agent can perform — there is no physical iOS device in this environment, no way to background a process across real calendar days, and (per this repo's own standing safety rules) no self-directed sign-in/sign-out through the real auth flow.

What Day 1 actually contains, in place of fabricating that evidence:

- A **code-level compliance audit** of the PWA implementation (`src/sw.ts`, `src/lib/pwa/*`, `src/hooks/use-sw-update.ts`, `src/components/pwa/*`) against every claim ADR-008 and `docs/PWA_TESTING.md` make, read line-by-line, not summarized from memory.
- A **live re-verification** of the coaching-loop fixes from Day 0 (F1–F3) against the current codebase — confirming no regression.
- A **live, read-only pass** against the real dev database (`getOrBuildAthleteSnapshot`, a forced snapshot rebuild, and direct row counts), the same "invoke the real code path directly, bypass only the Clerk HTTP wrapper" technique Day 0 used — which surfaced one genuine, previously unlogged finding (F11, below).
- No new live LLM plan-generation call was made this round (Day 0 already exercised that path and confirmed it works after F1; running it again without a new hypothesis to test would just spend a real LLM call and add DB rows for no new evidence). Day 0's open item — a genuine Gate-`REJECTED` proposal from a real LLM call — remains open for a real Day 2+ session.
- Every checklist item that genuinely requires a physical device or real elapsed time is listed explicitly in the table below as **not verifiable by agent** — not silently skipped, not guessed at.

| Protocol item                                                                                                                           | Can agent verify?                                                                                                                                                                                | How Day 1 handled it                                                                                                                                                                                                                                                                |
| --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| §1 Installed-app lifecycle (Home Screen launch, standalone layout, safe areas, no repeat install prompts, foreground/background resume) | **No** — needs a physical iOS device                                                                                                                                                             | Code-level only: confirmed `classifyInstallPrompt()` returns `ALREADY_INSTALLED` (never re-prompts) once `isStandalone` is true — see the Day 1 log's PWA code audit below. Layout/safe-area/resume behavior needs `docs/PWA_TESTING.md`'s existing checklist run on real hardware. |
| §2 Daily athlete state cross-surface agreement                                                                                          | **Partially** — code + live dev-DB read                                                                                                                                                          | Done live — see Day 1 log and F11.                                                                                                                                                                                                                                                  |
| §3 Coaching loop (generate/adapt, Gate, accept/defer/reject/override, complete/skip)                                                    | **Partially** — mutations possible via direct route invocation, but not repeated without new hypothesis (cost/DB-noise reasons above)                                                            | F1–F3 re-confirmed unregressed; new live LLM call deferred to a real Day 2+ session.                                                                                                                                                                                                |
| §4 Offline behaviour (Airplane Mode, offline summary, reconnect)                                                                        | **No** — needs a physical device with real connectivity toggling                                                                                                                                 | Code-level only: `snapshot-store-validation.ts` and `snapshot-store.ts` read in full — see the Day 1 log's PWA code audit below.                                                                                                                                                    |
| §5 Service-worker update flow                                                                                                           | **No** — needs a real deploy + real device interaction mid-session                                                                                                                               | Code-level only: `src/sw.ts`, `sw-update-state.ts`, `use-sw-update.ts` read in full — see the Day 1 log's PWA code audit below.                                                                                                                                                     |
| §6 Privacy / account isolation                                                                                                          | **Partially** — sign-out clearing and cache validation are code-verifiable; signing in as a second real account is not (no test account, and self-directed sign-in is out of scope for an agent) | Code-level only: `SnapshotOfflineSync` and `snapshot-store-validation.ts` read in full — see the Day 1 log's PWA code audit below.                                                                                                                                                  |

**Bottom line: this entry is not "Day 1 of 7" in the sense the protocol intends.** It is a thorough code audit plus one more live coaching-loop data point. The 7-day real-device clock has not started. See the revised go/no-go at the bottom — it is unchanged in substance from Day 0 for exactly this reason.

---

## 1. Executive summary

Day 0 found and fixed **one safety-enforcement gap** and **two data-integrity/explanation bugs**, all unambiguous per this task's own fix-authorization criteria, all shipped with regression tests, full `typecheck`/`eslint`/`test`/`build` green. Day 1 re-confirmed all three fixes hold, found one new cross-surface consistency question (F11), and completed a code-level PWA compliance audit that found **zero new defects** — every claim in ADR-008 checked out against the actual implementation. Further items remain logged as open findings requiring either real multi-day/real-device evidence or a product decision — none blocking, none safety-critical, all specific and reproducible.

| #   | Finding                                                                                                                                                                                                                               | Severity                                       | Status                                                        |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------- |
| F1  | Server-side write path never checked Gate `REJECTED` status before creating/updating a session                                                                                                                                        | **Blocker (safety)**                           | **Fixed** (re-confirmed Day 1)                                |
| F2  | `snapshotContext.overallVerdict` read the deprecated legacy field, silently nulling a real verdict                                                                                                                                    | **Trust break (data integrity)**               | **Fixed** (re-confirmed Day 1)                                |
| F3  | `physicalHealthCapacity` label resolution used the wrong enum's lookup table, silently dropping the field                                                                                                                             | **Trust break (explanation failure)**          | **Fixed** (re-confirmed Day 1)                                |
| F4  | Coaching loop had zero real production data before today                                                                                                                                                                              | Data gap                                       | Logged (baseline)                                             |
| F5  | Weekly Brief shows planned-vs-tolerated load with no warning when load exceeds tolerance                                                                                                                                              | UX issue                                       | Logged — needs product decision                               |
| F6  | Future-dated plan proposals use a freshly-built, low-confidence snapshot for that future day                                                                                                                                          | Expected behaviour                             | Logged — documented                                           |
| F7  | Session Rationale's "what SHARPIT inferred" section disappears with no explanation when empty                                                                                                                                         | UX issue                                       | Logged — needs product decision                               |
| F8  | Weekly Brief `plannedLoad` didn't match a manual sum by 140 TSS in one observed case                                                                                                                                                  | Data gap (unresolved)                          | Logged — new hypothesis Day 1, still needs a controlled repro |
| F9  | No UI control for explicit "reject" (only "leave unselected")                                                                                                                                                                         | Data gap (pre-existing, documented in ADR-006) | Logged — unchanged                                            |
| F10 | Outcome evaluation / Learning Feedback not reachable in a same-day pass                                                                                                                                                               | Expected behaviour                             | Logged — Day 3+ checkpoint (still open, 0 outcome rows Day 1) |
| F11 | Today silently withholds `todaysDecision` outside the "forward advice" phase (by design), but Coach/Gate read the ungated canonical verdict — an athlete can get plan/chat advice referencing a verdict Today isn't currently showing | UX issue (cross-surface consistency)           | **New — logged Day 1 — needs product decision**               |

---

## 2. Seven-day dogfooding protocol

Run once per real calendar day, ideally at three checkpoints (morning consult, post-session, evening review) but at minimum once. Use §3's log template for each entry. Do not batch multiple days into one sitting — the point is real elapsed time and real physiological data.

### Daily checklist (every day, all 5 categories)

**1. Daily state**

- [ ] Open Today. Is the Snapshot's `generatedAt` recent relative to the last sync? Any domain flagged stale — does the copy explain why in plain language?
- [ ] Does `DecisionState` (verdict, confidence, limiting factor) match what Coach and Planning show for the same day? (Compare `todaysDecision`/`confidence`/`limitingFactor` on Today against the `snapshotContext` embedded in any `CoachingDecision` created that day, and against what Session Rationale's "what SHARPIT inferred" shows.)
- [ ] If confidence is low or data is incomplete, is that stated as uncertainty — never phrased as an instruction ("train hard") dressed up with a quiet caveat?
- [ ] Any contradiction between Today's verdict, Coach's chat context, and Planning's week view for the same day?

**2. Planning**

- [ ] Only generate/adapt a plan when there's real context to react to (a goal, a plan week, recent execution, an explicit athlete ask) — not on every visit reflexively.
- [ ] For every proposed session, is the Gate status (`ACCEPTED`/`WARNING`/`REQUIRES_CONFIRMATION`/`REJECTED`) something you'd understand without reading the code? Read the `rationale` text aloud — does it make sense cold?
- [ ] Do `requiredAssumptions`, `findings`, and `saferAlternative` (when present) actually help you decide, or do they feel like noise?
- [ ] Attempt to apply a `REJECTED` session directly (not just via the disabled UI button — try the API, or ask an engineer to try it once) — confirm it's refused server-side, not just visually disabled.
- [ ] Search the rendered page source / network payload for anything that looks like an internal code (`ruleCode` values, `decision-v1`, enum constants) leaking into visible copy.

**3. Athlete decisions** (across the week, exercise each at least once — not necessarily all in one day)

- [ ] Accept a coach-proposed session as-is.
- [ ] Leave a proposal unapplied (close the dialog without selecting it) — confirm it doesn't silently get treated as rejected before the 48h expiry window.
- [ ] Deselect/decline a proposed session explicitly.
- [ ] Edit an already-accepted session afterward (change intensity/load/date) via the calendar — confirm it's recorded as `OVERRIDDEN`, not silently untracked.
- [ ] Mark a planned session completed (link a real activity) and, separately, let one lapse unactioned past its date (`SKIPPED`).
- [ ] After each: check `CoachingDecisionAction` rows for that decision — exactly the actions you took, no duplicates, no phantom actions.

**4. Execution and outcome**

- [ ] Link a completed activity to a coach-originated planned session (via auto-link or manual link).
- [ ] Open that session's rationale — does the planned-vs-actual explanation match what you actually felt/did?
- [ ] If recovery/sleep/pain data wasn't available for the 24–72h window, confirm the outcome doesn't quietly assume it — check `limitations[]` on the outcome states what's missing.
- [ ] For a session whose 72h window has elapsed (`yarn db:evaluate-decision-outcomes`), check whether ambiguous/missing evidence produced `INCONCLUSIVE` rather than a confident verdict.
- [ ] Once 3+ evaluated outcomes exist in one category (type+intensity), confirm Learning Feedback says something specific and evidenced — and confirm it says nothing at all below that threshold.

**5. Cross-surface consistency**
For every session you touched today, open: the original Coach proposal, its Gate result, your recorded action, the persisted `PlannedSession`, any linked `Activity`, the raw `CoachingDecisionAction` history, Session Rationale, the Weekly Brief's mention of it (if it's a key session), and Learning Feedback (if it now contributes to a category). Write down whether all of these tell the _same story_ about what happened — same dates, same load numbers, same verdict language, no surface claiming something another surface contradicts.

### End of each day

Fill one entry in the log (§3). Do not fix anything found mid-protocol unless it's an unambiguous safety/data-integrity defect (fix it, add tests, note it, keep going) — everything else waits for the Day 7 findings report and explicit approval, exactly as this Day 0 pass did.

---

## 3. Dogfooding log

### Day 0 — 2026-07-15 (pre-flight smoke test, agent-run, real dev DB)

**1. Daily state.** `getOrBuildAthleteSnapshot('2026-07-15')`: `todaysDecision = TRAIN_EASY`, `confidence = 0.74` ("Estimation modérée"), `limitingFactor.system = RECOVERY`, `freshness.overallFresh = false` (at least one domain stale), `adviceActionable = true`. Consistent within Today's own fields. **Cross-check against Decision Memory failed** — see F2.

**2. Planning.** `POST /api/coach/plan` with `startDate = 2026-07-17, days: 2` (real LLM call via `AI_GATEWAY_API_KEY`). Produced 2 sessions (SWIM ENDURANCE 45 TSS, RUN ENDURANCE 68 TSS), both Gate `ACCEPTED`, no plan-level findings. Rationale text readable and specific ("Séance à faible impact après une journée de travail en présentiel..."). No `ruleCode`/model-id strings found in rendered/component-facing surfaces (verified by code path: `GateFindingsList` only reads `.rationale`; confirmed by `session-rationale.test.ts`'s explicit non-leak assertion). Could not exercise a live `REJECTED` case — this proposal had none. **Verified the reject-cannot-be-applied invariant via the fix in F1 instead of live data — see below.**

**3. Athlete decisions.**

- **Accept**: applied the SWIM session via `POST /api/planned-sessions` with `decisionId`. `PlannedSession` created (`cmrmfrbfn000m0biubqtrekyr`), `CoachingDecisionAction(ACCEPTED, source=PLAN_REVIEW_UI)` recorded. ✅
- **Defer**: left the RUN session's decision (`cmrmfrbdd000k0biu6rzcwb9o`) untouched. Confirmed in DB: `status = PRESENTED`, `actions.length = 0`. ✅ No misleading state.
- **Reject-then-apply (safety check)**: no `REJECTED` session existed in this proposal to test live. Verified via new unit tests instead (`route.test.ts`): a decision with `gateResult.status = 'REJECTED'` is refused with **422** by both `POST /api/planned-sessions` and `PATCH /api/planned-sessions/[id]` — **only after today's fix (F1)**; before the fix, neither route checked this at all.
- **Manual override**: `PATCH` on the accepted session's `load` (45 → 999) with no `decisionId`. Correctly detected as a session-defining-field change and recorded `CoachingDecisionAction(OVERRIDDEN, source=CALENDAR_EDIT)`. Action history now `[ACCEPTED, OVERRIDDEN]`, in order, no duplicates. ✅
- **Complete/skip**: not exercised live (would require a real completed `Activity` dated in the future, which doesn't exist yet — legitimately not reachable same-day).

**4. Execution and outcome.** Not reachable same-day — outcome evaluation requires 72h real elapsed time past the session date (`OUTCOME_EVALUATION_DELAY_HOURS = 72` in `repository.ts`). Logged as a Day 3+ checkpoint (F10).

**5. Cross-surface consistency.** Traced the accepted/overridden SWIM session through Session Rationale: `observed.load = 999` (correctly live, not the frozen original 45 — matches spec, "observed" reflects the current session, not the frozen proposal), `chosen.actionHistory` shows both actions in correct order, `chosen.executionState = SCHEDULED` (correct — future-dated, not completed). `suggested.purpose` correctly shows the LLM's original rationale untouched by the later override (matches ADR-006's "proposal is frozen, action history is what changed"). **`inferred.overallVerdictLabel` and `inferred.limitingFactorLabel` were both `null`** despite Today showing real values for the same underlying snapshot fields — root-caused to F2. **`inferred.physicalHealthCapacityLabel` was silently absent from the payload** (not even `null`) — root-caused to F3. Weekly Brief for the current week (2026-07-13 to 2026-07-19) correctly included the new session in `keySessions` with its purpose text; `load.plannedLoad = 1159` vs a manual sum that computed `1019` — unresolved discrepancy, see F8.

### Day 1 — 2026-07-16 (agent-run, partial: live coaching-loop re-check + PWA code audit — see §0.1)

**1. Daily state.** Called `getOrBuildAthleteSnapshot('2026-07-16')` against the real dev DB, then forced a fresh rebuild (`generateAthleteSnapshot({ forceRefresh: true })`, bypassing the persisted-row cache) to rule out stale data. Both returned the same values: `confidence = 0.75`, `limitingFactor.system = RECOVERY`, `freshness.overallFresh = false`, canonical `decision.overallVerdict = TRAIN_EASY`. **But `snapshot.todaysDecision = null`** — the Today-facing field, not the canonical one. Root-caused, not a regression of F2: this is `applyTruthfulnessOverlay()`'s deliberate gate (`src/lib/athlete-state/snapshot-truthfulness.ts`) — `todaysDecision` is intentionally nulled outside `isForwardAdvicePhase()` (it was 19:10 local when this ran, evening). Checked whether Coach/Gate respect the same gate: **they do not** — `coach-context.ts:375` reads `athleteSnapshot.decision` (the canonical, ungated field) directly. See **F11**.

**2. Planning.** Not exercised live this round (see §0.1 — no new hypothesis justified a new real LLM call). Re-read `src/app/api/planned-sessions/route.ts` and `[id]/route.ts` — the F1 Gate-`REJECTED` server-side check (`decision?.gateResult.status === 'REJECTED'` → 422) is still present, unregressed.

**3. Athlete decisions.** Not exercised live this round. `CoachingDecision: 2 rows`, `CoachingDecisionAction: 3 rows` — unchanged from Day 0 (no new decisions created).

**4. Execution and outcome.** `CoachingDecisionOutcome: 0 rows` — still zero, F10 remains open (72h window not yet reached on any real session).

**5. Cross-surface consistency.** Re-confirmed F2's fix (`overallVerdict: snapshot.decision?.overallVerdict ?? null` in `build-snapshot-context.ts`) and F3's fix (`CAPACITY_LABELS` reuse in `snapshot-context-labels.ts`) are both still in place — no regression. New consistency question found and logged as F11 (above).

**PWA code audit (new this round, no live device):**

- **Lifecycle (§1):** `classifyInstallPrompt()` (`src/lib/pwa/install-prompt-state.ts`) returns `ALREADY_INSTALLED` whenever `isStandalone` is true, unconditionally hiding the install card — matches "does not repeatedly show install guidance after installation." Cannot verify actual standalone layout/safe-area/resume behavior without a device.
- **Offline behaviour (§4):** `snapshot-store-validation.ts`'s `validatePersistedSnapshot()` correctly rejects (and `snapshot-store.ts`'s `loadSnapshot()` correctly clears-then-nulls) any entry that is malformed, schema-version-mismatched, owned by a different `ownerKey`, or older than `OFFLINE_SNAPSHOT_MAX_AGE_HOURS` (48h) — all four `SnapshotInvalidReason` branches read and confirmed against the type. No safety-sensitive mutation path exists in this module (`saveSnapshot`/`loadSnapshot`/`clearSnapshot` are the only three operations, none of them a mutation of athlete-facing state). Matches ADR-008 exactly. Cannot verify the actual on-device offline UI or reconnect behavior without a device.
- **Service-worker updates (§5):** `src/sw.ts` has `skipWaiting: false` and only calls `self.skipWaiting()` on an explicit `{ type: 'SKIP_WAITING' }` message. `sw-update-state.ts`'s reducer has no transition path from `NONE`/`AVAILABLE` to `ACTIVATING` except via an explicit `UPDATE_REQUESTED` event. `use-sw-update.ts` only reloads on the `controllerchange` event (which fires only after the browser has actually activated the new worker), guarded by a ref so it reloads exactly once. Matches ADR-008's "the athlete controls exactly when the new version takes effect" claim. Cannot verify the actual reload-preserves-session/auth behavior without a real deploy and device.
- **Privacy / account isolation (§6):** `SnapshotOfflineSync` clears the persisted snapshot on sign-out (`!isSignedIn` → `clearSnapshot()`) and `loadSnapshot()` independently re-checks `ownerKey` against the _currently_ signed-in user on every read, so even a missed clear can't leak a prior athlete's data to a new one. Cannot verify with a second real account — none available, and self-directed sign-in is out of scope for this agent regardless.

**New findings today:** F11 (below). F8 (Day 0, weekly-brief load discrepancy) revisited via code reading — new hypothesis added, still unresolved, see updated F8 entry.

### Days 2–7 — template (fill during real usage)

```markdown
### Day N — YYYY-MM-DD

**1. Daily state.** [snapshot freshness, verdict/confidence/limiting-factor coherence, Today/Coach/Planning agreement]

**2. Planning.** [what was generated/adapted, why; Gate statuses observed; any REJECTED session and whether apply was correctly blocked; any leaked internal terms]

**3. Athlete decisions.** [which of accept/defer/reject/override/complete/skip were exercised today; confirm each recorded exactly one correct CoachingDecisionAction]

**4. Execution and outcome.** [any session whose 72h window elapsed; outcome status (EVALUATED/INCONCLUSIVE) and whether the wording matched reality; Learning Feedback state]

**5. Cross-surface consistency.** [for each touched session: one story or contradiction, across Coach/Gate/Decision Memory/Session Rationale/Weekly Brief/Learning Feedback]

**Installed-app checkpoints (§1/§4/§5/§6 of the combined protocol — see PWA_TESTING.md for the exact steps):** [Home Screen launch, resume, at least 2 offline passes across the week, at least 1 SW-update pass, at least 1 sign-out/sign-in pass — check off as covered]

**New findings today:** [severity / description / evidence, or "none"]
```

---

## 4. Findings report

Severity scale: **blocker** (breaks the coaching loop or is unsafe) · **trust break** (silently wrong, misleading, or data-integrity-affecting) · **UX issue** (confusing but not wrong) · **data gap** (missing evidence, not a code defect) · **expected behaviour** (working as designed, documented here for completeness).

---

### F1 — Blocker (safety) — FIXED

**Description:** Neither `POST /api/planned-sessions` nor `PATCH /api/planned-sessions/[id]` checked the originating `CoachingDecision.gateResult.status` before creating/updating a session. A `REJECTED` proposal was only prevented from being applied by the client disabling the button (`disabled={rejected}` in `plan-generator.tsx`/`plan-adapter.tsx`) — a direct API call bypassed the Gate entirely.

**Reproduction (pre-fix):** `POST /api/planned-sessions` with a `decisionId` whose `gateResult.status === 'REJECTED'` → session created, `ACCEPTED` action recorded, 201 returned. No server-side rejection.

**Evidence:** Read `src/app/api/planned-sessions/route.ts`/`[id]/route.ts` pre-fix — `recordDecisionAction`'s only guard is `canRecordAction`, which checks the decision's lifecycle status (`PRESENTED → ACCEPTED`), never the embedded `gateResult.status`.

**Affected surfaces:** `POST /api/planned-sessions`, `PATCH /api/planned-sessions/[id]` — the sole enforcement boundary the Gate (ADR-005) exists to provide.

**Expected vs. actual:** Expected — a Gate-`REJECTED` proposal can never become a real `PlannedSession`, full stop. Actual — enforced only in the UI.

**Fix:** Added a server-side check in both routes: when `decisionId` is present, fetch the decision via `findCoachingDecisionById`; if `gateResult.status === 'REJECTED'`, return 422 and do not write. `src/app/api/planned-sessions/route.ts`, `src/app/api/planned-sessions/[id]/route.ts`.

**Tests added:** `route.test.ts` (both files) — "rejects the write with 422 and never creates/updates the session when the decision was Gate-REJECTED".

**Authorization:** Unambiguous safety defect — fixed immediately per task instructions, without waiting for approval.

---

### F2 — Trust break (data integrity) — FIXED

**Description:** `buildDecisionSnapshotContext` read `snapshot.todaysDecision` (the deprecated legacy `reasoning` projection) for `overallVerdict`, while the other three decision-derived fields in the same function (`confidenceTier`, `limitingFactorSystem`) correctly read from the canonical `snapshot.decision.*`. When the legacy field diverges from the canonical one — which happens for real, as shown below — the frozen `CoachingDecision.snapshotContext.overallVerdict` records `null` even though the canonical Decision Engine produced a real verdict.

**Reproduction:** Generate a plan for a future date. Query the resulting `CoachingDecision.snapshotContext` and compare to the `AthleteSnapshotRecord.payload.decision.overallVerdict` for that `trainingDayId`.

**Evidence (real, from Day 0):** For `trainingDayId = '2026-07-17'`: `payload.decision.overallVerdict = "TRAIN_SMART"` (canonical, populated) but `payload.todaysDecision = null` (legacy, empty). The persisted `snapshotContext.overallVerdict` for both `CoachingDecision` rows created that call was `null` — permanently wrong, since `snapshotContext` is frozen at creation and never updated (ADR-006).

**Affected surfaces:** Decision Memory persistence (permanent), Session Rationale's "what SHARPIT inferred" bucket, Weekly Coaching Brief's limiting-factor section — anywhere `describeSnapshotContext(...).overallVerdictLabel` is rendered.

**Expected vs. actual:** Expected — per `CORE_ARCHITECTURE.md`, "All product decisions come from `DecisionState`" (canonical). Actual — this one field read the deprecated projection instead.

**Fix:** `src/lib/decision-memory/build-snapshot-context.ts` — `overallVerdict: snapshot.decision?.overallVerdict ?? null` (was `snapshot.todaysDecision`).

**Tests added:** `build-snapshot-context.test.ts` — new regression test constructing exactly this divergence (`todaysDecision: null`, `decision.overallVerdict: 'TRAIN_SMART'`), asserting the canonical value wins. Existing test's fixture was also corrected to set `decision.overallVerdict` explicitly (it previously relied on the buggy fallback and would have masked this regression).

**Authorization:** Unambiguous data-integrity defect (permanently wrong frozen records) — fixed immediately.

---

### F3 — Trust break (explanation failure) — FIXED

**Description:** `describeSnapshotContext` resolved `physicalHealthCapacity` (a `TrainingCapacityLevel`: `FULL`/`REDUCED`/`LIMITED`/`UNABLE`) using `mapFatigueCapacityLabel`, a lookup table built for the _different_ `TrainingCapacity` enum (`FULL`/`REDUCED`/`LIGHT_ONLY`/`REST_ONLY`). For `LIMITED`/`UNABLE` — values with no equivalent key in the fatigue table — the lookup returned `undefined`, which `JSON.stringify` drops silently. The field didn't show as empty text or `null`; it vanished from the payload entirely.

**Reproduction:** Call `describeSnapshotContext` (or the Day 0 script's session-rationale trace) with `physicalHealthCapacity: 'LIMITED'`.

**Evidence (real, from Day 0):** The `inferred` object logged in the Day 0 session-rationale trace has keys `overallVerdictLabel`, `confidenceTierLabel`, `limitingFactorLabel`, `fatigueTrainingCapacityLabel` — but no `physicalHealthCapacityLabel` key at all, even though `snapshotContext.physicalHealthCapacity = "LIMITED"` was present in the underlying data.

**Affected surfaces:** Session Rationale, Weekly Coaching Brief — anywhere physical-health capacity should explain a reduced/blocked training state, which is precisely the moment this information matters most to the athlete.

**Fix:** Exported the correct label map (`CAPACITY_LABELS`, already existed in `src/lib/presentation/physical-health.ts` for the same enum) and reused it in `snapshot-context-labels.ts`, with a graceful fallback to the raw string for any future unmapped value instead of a silent `undefined`.

**Tests added:** New `snapshot-context-labels.test.ts` — resolves `LIMITED`/`UNABLE`/`FULL`, and an explicit "never returns undefined for a populated field" assertion.

**Authorization:** Unambiguous explanation-failure/data-integrity defect (the exact category of "clear explanation failures" this task authorizes fixing) — fixed immediately.

---

### F4 — Data gap (baseline)

**Description:** Before Day 0, `CoachingDecision`, `CoachingDecisionAction`, `CoachingDecisionOutcome`, `TrainingPlan`, and `Goal` tables were all empty (0 rows), despite 275 real `Activity` rows and 13 real `AthleteSnapshotRecord` rows existing. The Plan Gate / Decision Memory / Weekly Brief / Learning Feedback loop, built across three prior phases, had never touched real data.

**Recommended action:** Not a defect — this is why the 7-day protocol exists. No fix; establishes the starting baseline for Days 1–6.

---

### F5 — UX issue (needs product decision)

**Description:** Weekly Coaching Brief's load section shows `plannedLoad` and `toleratedCeiling` as two plain numbers with no visual or textual signal when the former exceeds the latter. Observed live: `1159` planned vs. `598` tolerated (≈94% over) rendered with no warning styling or callout — the athlete has to notice the comparison themselves. The underlying "exceeded weekly load" concept already exists (`WEEKLY_LOAD_EXCEEDED` Gate rule), but it only fires per-session at proposal time, not as a Brief-level aggregate check against the _current_ week's actual total.

**Evidence:** Day 0 Weekly Brief response: `{"plannedLoad": 1159, "toleratedCeiling": 598, "toleratedSource": "ACWR_ESTIMATE"}`.

**Expected vs. actual:** Expected (per PRODUCT.md's "silence is preferable to noise" but also "explanation before prescription") — a load figure this far over tolerance should be flagged, not presented neutrally. Actual — no flag.

**Recommended action:** Add a threshold-based warning state to `WeeklyBriefLoad` (e.g., `overTolerance: boolean`) and a corresponding visual/textual cue in `weekly-brief.tsx`. This is presentation-layer work over already-computed numbers, not a new inference concept — but it is new UI behavior, so it's logged for approval rather than built during dogfooding per this task's explicit constraint.

**Authorization needed:** Product decision (not unambiguous — a design/threshold call).

---

### F6 — Expected behaviour (documented)

**Description:** Generating a plan for a future `startDate` causes `buildGateContext` to call `getOrBuildAthleteSnapshot` for _that future day's_ `trainingDayId`, which builds a fresh, low-confidence snapshot (`confidenceTier: LOW`, `dataCompleteness: SPARSE`) rather than reusing today's cached, higher-confidence one — because there's no real observation evidence "for" a day that hasn't happened. This is architecturally sound (the Gate should reason about the day it's proposing for) but was not something either the Phase 2 (Gate) or Phase 4 (Session Rationale) work explicitly called out.

**Evidence:** Day 0's July-17 snapshot: `confidence: 0.48`, `confidenceTier: "LOW"`, `dataCompleteness: "SPARSE"`, `limitingFactor.system: null` — markedly more degraded than the same-run July-15 (today) snapshot (`confidence: 0.74`, `MEDIUM`-tier equivalent, real limiting factor).

**Recommended action:** No code change. Document this behavior explicitly in `ADR-005` or `plan-gate`'s module doc so a future reader doesn't mistake it for a bug. See also F7, its UX consequence.

---

### F7 — UX issue (needs product decision)

**Description:** `SessionRationaleCard` renders nothing at all for the "Ce que SHARPIT a analysé" (inferred) section when both `overallVerdictLabel` and `limitingFactorLabel` are null — which happens legitimately for future-dated, low-confidence proposals (F6). The athlete sees the section simply absent, with no way to distinguish "nothing notable to report" from "the system doesn't know yet."

**Evidence:** Day 0's session-rationale trace for the accepted (future-dated) session: `inferred.overallVerdictLabel: null`, `inferred.limitingFactorLabel: null` (independent of F2's bug, since even after the F2 fix, a genuinely `SPARSE`/low-confidence future-day snapshot can legitimately produce nulls here).

**Expected vs. actual:** Expected, per PRODUCT.md Principle IV ("Uncertainty is a feature, not a defect... When data is missing, we degrade gracefully") — degradation should be visible, not silent. Actual — the whole section disappears.

**Recommended action:** Either always render the section with an explicit low-confidence/insufficient-data message when empty, or add a one-line "limited data for this day" note elsewhere on the card. A copy/design decision, not unambiguous — logged for approval.

---

### F8 — Data gap (unresolved)

**Description:** The Weekly Coaching Brief's computed `plannedLoad` (1159) did not match a manual sum of the week's `PlannedSession.load` values (15 + 5 + 999 = 1019) by a difference of 140. Not conclusively root-caused within this session — candidate explanations include a timezone/day-boundary difference between the Brief's `startOfWeek(now)` (server-local time) and the UTC-based manual query used to verify it, or a session outside the exact window I queried.

**Evidence:** Weekly Brief response: `plannedLoad: 1159`. Manual query over `date >= 2026-07-13 AND date <= 2026-07-19`: 3 sessions summing to 1019.

**Recommended action:** Needs focused follow-up — reproduce with a controlled fixture (not live data) and step through `buildWeeklyCoachingBriefViewModel`'s session-window query and `weekStart`/`weekEnd` computation with explicit UTC-vs-local assertions. Do not trust `WeeklyBriefLoad.plannedLoad` as athlete-facing truth until resolved.

**Update (Day 1, code reading, not a live repro):** `src/app/api/presentation/weekly-coaching-brief/route.ts` computes `weekStart = startOfWeek(weekStartParam ? new Date(weekStartParam) : new Date(), WEEK_OPTS)`. If a caller ever passes `weekStart` as a bare `yyyy-MM-dd` string (no time component), `new Date(weekStartParam)` parses it as **UTC midnight** (per the ECMA-262 date-only rule), and `startOfWeek()` (`date-fns`) then truncates using the **server's local timezone** — the exact mismatch pattern that was the confirmed root cause of a different bug fixed earlier this session (travel-context dates shifting by a day; see `src/lib/travel-context/calendar-date.ts`'s `toUtcDateOnly` fix and its doc comment). This is a plausible mechanism for F8's 140-TSS discrepancy (a boundary session falling in or out of the queried week depending on server timezone), but it is **not confirmed** — Day 0's own live repro used values consistent with a same-timezone read (server and the manual verification query likely ran in the same process), and I have not reproduced the exact discrepancy with a controlled fixture this round. Flagging the structural similarity as the leading hypothesis for whoever picks up the follow-up, not implementing a fix — this is presentation-layer week-boundary logic with a broader blast radius than the narrowly-scoped travel-date fix, and F8 is explicitly not authorized for an unverified fix.

**Authorization needed:** Investigation before any fix — root cause not yet conclusively established, hypothesis added.

---

### F9 — Data gap (pre-existing, documented)

**Description:** There is still no UI control for an athlete to explicitly reject a proposed session (only "leave it unselected," which resolves to `EXPIRED` after 48h with no distinct `REJECTED` action type ever recorded via the UI). This was already known and documented in ADR-006 ("Rejected explicitly not modeled as a UI action in this phase") — confirmed unchanged by Day 0.

**Recommended action:** None for now — tracked as a known, intentional scope boundary. Re-flag if a future phase wants an explicit reject control.

---

### F10 — Expected behaviour (time-gated)

**Description:** Outcome evaluation (`EVALUATED`/`INCONCLUSIVE`) and Learning Feedback sentences require ≥72h real elapsed time past a session's date (`OUTCOME_EVALUATION_DELAY_HOURS`) and ≥3 evaluated outcomes per category respectively. Neither was reachable in a same-day pass.

**Recommended action:** No fix — this is the correct design (see ADR-006's rationale for the 72h window). Explicit checkpoint for Day 3+ of the real log: run `yarn db:evaluate-decision-outcomes` after a real session's window elapses and verify §2 category 4/§3 template entries.

---

### F11 — UX issue (cross-surface consistency) — NEW, Day 1

**Description:** `AthleteSnapshot.todaysDecision` (the field `docs/ATHLETE_SNAPSHOT.md` documents as what Today/notifications/widgets show) is deliberately nulled by `applyTruthfulnessOverlay()` (`src/lib/athlete-state/snapshot-truthfulness.ts`) whenever either advice isn't actionable (confidence < 0.6, insufficient data, etc.) **or** the current daily phase is outside `isForwardAdvicePhase()` (roughly: not a time of day where "should I train today" is still a live question — e.g. evening). This part is intentional, tested design, not a bug — Today correctly goes quiet rather than showing stale "train today" advice at 7pm.

The problem: `coach-context.ts` (the data fed to the AI Coach chat and to `/api/coach/plan`) reads `athleteSnapshot.decision.overallVerdict` directly — the canonical, **ungated** field — never `todaysDecision`. So at the exact moment Today is silently declining to show a decision (by design), the athlete can still open Coach and get a response that references and reasons from the same underlying verdict Today just chose not to display. This is exactly the kind of contradiction dogfooding checklist item 2 ("Confirm Today, Coach, Planning, and Weekly Brief agree on the current decision") exists to catch.

**Reproduction:** At a time outside the forward-advice phase (observed live at 19:10 local, 2026-07-16): `getOrBuildAthleteSnapshot('2026-07-16').todaysDecision === null` while `.decision.overallVerdict === 'TRAIN_EASY'`. `coach-context.ts:375` reads the latter unconditionally.

**Evidence:** Live dev-DB read (see Day 1 log, §1). Confirmed via a **forced** snapshot rebuild (`generateAthleteSnapshot({ forceRefresh: true })`, bypassing the persisted-row cache) that this is not stale data — the current code produces this divergence on every rebuild at this time of day, not just a leftover row from an older code path.

**Affected surfaces:** Today (silent, correctly), Coach chat + `/api/coach/plan` (verdict-aware, not gated) — anywhere `buildCoachContext`/`formatCoachContext` is used.

**Expected vs. actual:** Not obviously "expected" or "wrong" — this is a genuine product question. Two coherent options exist: (a) Coach should respect the same forward-advice-phase gate and hedge/decline to reference "today's decision" outside that window too, treating a chat question the same as a passive display; or (b) an athlete-initiated chat question is legitimately different from a passively-displayed verdict, and referencing the underlying state on request is correct — in which case Today's silence and Coach's answer are both right, just serving different purposes, and nothing needs to change except perhaps a one-line acknowledgment in Coach's response when asked outside the forward-advice window. Not unambiguous either way.

**Recommended action:** Product decision needed on which of the two framings above is correct; no code change made. If option (a) is chosen, the fix is narrow — reuse `isForwardAdvicePhase(snapshot.dailyPhase?.phase)` inside `coach-context.ts` the same way `snapshot-truthfulness.ts` already does, rather than inventing new gating logic.

**Authorization needed:** Product decision (not unambiguous — a design call about what Coach chat should do outside the forward-advice window).

---

## 5. Traceability matrix

Two real coaching decisions were exercised end-to-end on Day 0. IDs are real dev-DB rows.

| Stage                   | Chain 1 — Accepted → Overridden (SWIM)                                                                                                                                                                                                                                         | Chain 2 — Deferred (RUN)                                                                                                                                                                                            |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Recommendation**      | LLM proposal: SWIM, ENDURANCE, 45 min, 45 TSS, 2026-07-17. Rationale: "Séance à faible impact après une journée de travail en présentiel..."                                                                                                                                   | LLM proposal: RUN, ENDURANCE, 68 TSS, 2026-07-18                                                                                                                                                                    |
| **Gate**                | `ACCEPTED`, no findings, no required assumptions                                                                                                                                                                                                                               | `ACCEPTED`, no findings                                                                                                                                                                                             |
| **CoachingDecision**    | `cmrmfrbdd000l0biuzya2bdj7`, source `PLAN_GENERATOR`, frozen `snapshotContext` (confidence 0.47/0.74 post-fix\*, verdict TRAIN_SMART post-fix\*)                                                                                                                               | `cmrmfrbdd000k0biu6rzcwb9o`, source `PLAN_GENERATOR`, status `PRESENTED`                                                                                                                                            |
| **Athlete action**      | `ACCEPTED` (source `PLAN_REVIEW_UI`) → `OVERRIDDEN` (source `CALENDAR_EDIT`, load 45→999)                                                                                                                                                                                      | None — left `PRESENTED`                                                                                                                                                                                             |
| **Session/activity**    | `PlannedSession cmrmfrbfn000m0biubqtrekyr` created, `load = 999` after override, no linked activity                                                                                                                                                                            | No `PlannedSession` ever created                                                                                                                                                                                    |
| **Outcome**             | Not reachable (72h gate; date is 2 days in the future as of Day 0)                                                                                                                                                                                                             | N/A — no session exists to evaluate                                                                                                                                                                                 |
| **Learning feedback**   | Not reachable (0 evaluated outcomes in this category)                                                                                                                                                                                                                          | N/A                                                                                                                                                                                                                 |
| **Cross-surface check** | Session Rationale: 4 buckets present (inferred was null pre-fix — F2/F3), action history correct order, `observed` correctly live (999, not frozen 45). Weekly Brief: included in `keySessions` with real purpose text. **One consistent narrative once F2/F3 fixes applied.** | Correctly absent from Weekly Brief `keySessions` (no session exists) and from Session Rationale (no session to query). Correctly invisible everywhere a deferred-but-not-materialized proposal should be invisible. |

\* Values shown are **before** the F2 fix (the actual persisted rows, created pre-fix, still show `overallVerdict: null` — this is exactly ADR-006's frozen-forever contract: **these two specific rows remain permanently wrong**, since `snapshotContext` is never rewritten after creation. The fix prevents new rows from repeating this; it does not retroactively repair `cmrmfrbdd000l0biuzya2bdj7`/`cmrmfrbdd000k0biu6rzcwb9o`. Flagging this explicitly: if these two dev-only rows matter, they'd need a one-off data migration — not recommended for two throwaway dev-test rows, but worth knowing the pattern for any real athlete data written before this fix ships.

**Chain 3 — Gate-REJECTED write blocked (verified via test, not live data):** no `REJECTED` proposal was produced live on Day 0. The invariant "no rejected session can be applied" was instead verified by unit test against a synthetic `REJECTED` decision, confirming both routes now return 422 and perform no write. **Still open after Day 1** — no new live LLM call was made this round (see §0.1's rationale: no new hypothesis justified spending a real call/DB write). Re-confirmed via code reading only that the 422 guard is still present in both routes, unregressed. Recommend a real Day 2+ session specifically attempt to trigger a genuine `REJECTED` proposal (e.g., ask for an intense session while genuinely fatigued) to complete this chain with live data.

---

## 6. Go/no-go recommendation

| Question                                                         | Recommendation                     | Why                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ---------------------------------------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Continue internal dogfooding (Days 2–7)?**                     | **Go.**                            | The loop still works end-to-end on real data (F1–F3 re-confirmed unregressed on Day 1). The PWA implementation checked out clean against ADR-008 with zero new defects. One new UX question (F11) surfaced — exactly the kind of signal this process exists to produce, not a reason to pause. Days 2–7 need to run for real: physical iOS device, real calendar days, outcome evaluation, learning feedback, a genuine `REJECTED` scenario, and every PWA checkpoint in §0.1's "cannot verify" column.      |
| **Limited external beta?**                                       | **No-go, not yet.**                | Unchanged from Day 0. Zero real multi-day evidence exists that outcome evaluation and learning feedback behave correctly (F10, still 0 outcome rows). F5, F7, F11 are real trust/explanation/consistency gaps an external athlete would notice. F8's unresolved load discrepancy means the Weekly Brief cannot yet be trusted as shown. Zero real-device PWA evidence exists at all. Revisit after a complete real 7-day log (coaching loop **and** installed PWA) with no new blocker/trust-break findings. |
| **Notifications / widgets?**                                     | **No-go.**                         | `docs/SNAPSHOT_QUALITY_V1_AUDIT.md`'s own Tier 4 external-exposure gate requires Tier 1+2 items and "7 consecutive days dogfooded." Two agent-run passes (Day 0, Day 1) are complete — real elapsed-time and real-device requirements are unmet regardless of how many code-level audits stack up. Do not reconsider before a real Day 7 entry is filed with no open blocker/trust-break findings.                                                                                                           |
| **Persistent athlete calibration (`AthleteCalibrationSignal`)?** | **No-go, unchanged from ADR-007.** | ADR-007 already deferred this pending a real population of evaluated outcomes. F10 confirms zero evaluated outcomes exist as of Day 1. No new information changes that call — revisit only once Learning Feedback (the on-demand, unpersisted version) has been observed working correctly across several real categories over real weeks.                                                                                                                                                                   |

**Immediate next step:** run Day 2 for real, on a physical iOS device. Prioritize: (a) reaching a genuine `REJECTED` Gate proposal to complete Chain 3 live, (b) the first of the protocol's required 2 offline passes and 1 service-worker-update pass, (c) a real completed activity linked to the Day 0 accepted SWIM session once its date arrives, to start F10's 72h outcome-evaluation clock, and (d) a product decision on F11 (should Coach chat respect the same forward-advice-phase gate Today does?).
