# Dogfooding Validation — SHARPIT Coaching Loop

> **Status:** In progress — Day 0 (pre-flight smoke test) complete, Days 1–6 pending real calendar-day usage.
> **Date:** 2026-07-15 (Day 0)
> **Scope:** Athlete state → AI proposal → deterministic Gate → athlete action → completed session → outcome evaluation → learning feedback.
> **Related:** [`docs/SNAPSHOT_QUALITY_V1_AUDIT.md`](../SNAPSHOT_QUALITY_V1_AUDIT.md) (its own Definition of Done names "7 consecutive days dogfooded" as a precondition — this document is that exercise, extended to the full coaching loop) · [ADR-005](../adr/ADR-005-plan-safety-gate-placement.md) · [ADR-006](../adr/ADR-006-decision-memory-aggregate.md) · [ADR-007](../adr/ADR-007-coaching-explainability-presentation.md)

---

## 0. Honesty note on method

A 7-day dogfooding protocol requires seven real calendar days of an athlete actually training, syncing devices, and making real decisions — none of which an agent can compress into one sitting without fabricating evidence. What this document contains:

- **Day 0**: a real, live pre-flight pass executed today against the real dev database (13 `AthleteSnapshotRecord` rows, 275 real `Activity` rows, 17 pre-existing `PlannedSession` rows — real athlete history) by invoking the actual route handlers directly (`POST /api/coach/plan`, `POST /api/planned-sessions`, `PATCH /api/planned-sessions/[id]`, the presentation routes), the same code path the HTTP layer calls, bypassing only the Clerk auth middleware wrapper (which contains no business logic). This included one real LLM call through the configured `AI_GATEWAY_API_KEY`. Every number and finding below is observed, not invented.
- **Days 1–6**: a structured protocol (§2) and a log template (§3) for the athlete to run for real, plus specific checkpoints this session's Day 0 pass could not reach (outcome evaluation needs 72h+ real elapsed time; a genuine Gate-`REJECTED` proposal needs the LLM to actually produce one against real high-fatigue/high-load state).

Before beginning: **zero `CoachingDecision`, `TrainingPlan`, or `Goal` rows existed in the database.** The entire Plan Safety Gate → Decision Memory → Weekly Brief → Learning Feedback loop (built across Phases 2–4 of this project) had never been exercised against real data prior to today. That is itself the primary finding motivating this whole exercise.

---

## 1. Executive summary

Day 0 found and fixed **one safety-enforcement gap** and **two data-integrity/explanation bugs**, all unambiguous per this task's own fix-authorization criteria, all shipped with regression tests, full `typecheck`/`eslint`/`test`/`build` green. Seven further items are logged as open findings requiring either real multi-day evidence or a product decision — none blocking, none safety-critical, all specific and reproducible.

| #   | Finding                                                                                                   | Severity                                       | Status                          |
| --- | --------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | ------------------------------- |
| F1  | Server-side write path never checked Gate `REJECTED` status before creating/updating a session            | **Blocker (safety)**                           | **Fixed**                       |
| F2  | `snapshotContext.overallVerdict` read the deprecated legacy field, silently nulling a real verdict        | **Trust break (data integrity)**               | **Fixed**                       |
| F3  | `physicalHealthCapacity` label resolution used the wrong enum's lookup table, silently dropping the field | **Trust break (explanation failure)**          | **Fixed**                       |
| F4  | Coaching loop had zero real production data before today                                                  | Data gap                                       | Logged (baseline)               |
| F5  | Weekly Brief shows planned-vs-tolerated load with no warning when load exceeds tolerance                  | UX issue                                       | Logged — needs product decision |
| F6  | Future-dated plan proposals use a freshly-built, low-confidence snapshot for that future day              | Expected behaviour                             | Logged — documented             |
| F7  | Session Rationale's "what SHARPIT inferred" section disappears with no explanation when empty             | UX issue                                       | Logged — needs product decision |
| F8  | Weekly Brief `plannedLoad` didn't match a manual sum by 140 TSS in one observed case                      | Data gap (unresolved)                          | Logged — needs follow-up        |
| F9  | No UI control for explicit "reject" (only "leave unselected")                                             | Data gap (pre-existing, documented in ADR-006) | Logged — unchanged              |
| F10 | Outcome evaluation / Learning Feedback not reachable in a same-day pass                                   | Expected behaviour                             | Logged — Day 3+ checkpoint      |

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

### Days 1–6 — template (fill during real usage)

```markdown
### Day N — YYYY-MM-DD

**1. Daily state.** [snapshot freshness, verdict/confidence/limiting-factor coherence, Today/Coach/Planning agreement]

**2. Planning.** [what was generated/adapted, why; Gate statuses observed; any REJECTED session and whether apply was correctly blocked; any leaked internal terms]

**3. Athlete decisions.** [which of accept/defer/reject/override/complete/skip were exercised today; confirm each recorded exactly one correct CoachingDecisionAction]

**4. Execution and outcome.** [any session whose 72h window elapsed; outcome status (EVALUATED/INCONCLUSIVE) and whether the wording matched reality; Learning Feedback state]

**5. Cross-surface consistency.** [for each touched session: one story or contradiction, across Coach/Gate/Decision Memory/Session Rationale/Weekly Brief/Learning Feedback]

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

**Authorization needed:** Investigation before any fix — root cause not yet established.

---

### F9 — Data gap (pre-existing, documented)

**Description:** There is still no UI control for an athlete to explicitly reject a proposed session (only "leave it unselected," which resolves to `EXPIRED` after 48h with no distinct `REJECTED` action type ever recorded via the UI). This was already known and documented in ADR-006 ("Rejected explicitly not modeled as a UI action in this phase") — confirmed unchanged by Day 0.

**Recommended action:** None for now — tracked as a known, intentional scope boundary. Re-flag if a future phase wants an explicit reject control.

---

### F10 — Expected behaviour (time-gated)

**Description:** Outcome evaluation (`EVALUATED`/`INCONCLUSIVE`) and Learning Feedback sentences require ≥72h real elapsed time past a session's date (`OUTCOME_EVALUATION_DELAY_HOURS`) and ≥3 evaluated outcomes per category respectively. Neither was reachable in a same-day pass.

**Recommended action:** No fix — this is the correct design (see ADR-006's rationale for the 72h window). Explicit checkpoint for Day 3+ of the real log: run `yarn db:evaluate-decision-outcomes` after a real session's window elapses and verify §2 category 4/§3 template entries.

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

**Chain 3 — Gate-REJECTED write blocked (verified via test, not live data):** no `REJECTED` proposal was produced live on Day 0. The invariant "no rejected session can be applied" was instead verified by unit test against a synthetic `REJECTED` decision, confirming both routes now return 422 and perform no write. Recommend Day 1–2 specifically attempt to trigger a real `REJECTED` proposal (e.g., ask for an intense session while genuinely fatigued) to complete this chain with live data.

---

## 6. Go/no-go recommendation

| Question                                                         | Recommendation                     | Why                                                                                                                                                                                                                                                                                                                                                                                                               |
| ---------------------------------------------------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Continue internal dogfooding (Days 1–6)?**                     | **Go.**                            | The loop works end-to-end on real data once F1–F3 are fixed. Three real, previously-undetected defects in one pass is exactly the signal dogfooding exists to produce — the process is working. Days 1–6 will exercise outcome evaluation, learning feedback, and a genuine `REJECTED` scenario, none of which Day 0 could reach.                                                                                 |
| **Limited external beta?**                                       | **No-go, not yet.**                | Zero real multi-day evidence exists that outcome evaluation and learning feedback behave correctly (F10) — they were never reachable in Day 0. F5 and F7 are real trust/explanation gaps an external athlete would notice immediately. F8's unresolved load discrepancy means the Weekly Brief cannot yet be trusted as shown. Revisit after a complete real 7-day log with no new blocker/trust-break findings.  |
| **Notifications / widgets?**                                     | **No-go.**                         | `docs/SNAPSHOT_QUALITY_V1_AUDIT.md`'s own Tier 4 external-exposure gate requires Tier 1+2 items and "7 consecutive days dogfooded" — that audit's Tier 1 items were fixed in an earlier phase of this project, but the _coaching-loop_ dogfooding this document represents has completed exactly 1 of 7 required days. Do not reconsider before Day 6's entry is filed with no open blocker/trust-break findings. |
| **Persistent athlete calibration (`AthleteCalibrationSignal`)?** | **No-go, unchanged from ADR-007.** | ADR-007 already deferred this pending a real population of evaluated outcomes. F10 confirms zero evaluated outcomes exist as of Day 0. No new information changes that call — revisit only once Learning Feedback (the on-demand, unpersisted version) has been observed working correctly across several real categories over real weeks.                                                                        |

**Immediate next step:** run Day 1 for real. Prioritize reaching a genuine `REJECTED` Gate proposal (completes Chain 3 live) and, if possible, a real completed activity linked to today's accepted SWIM session once its date arrives, to start the clock on F10's 72h outcome-evaluation checkpoint.
