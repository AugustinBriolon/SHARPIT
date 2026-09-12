# ADR-037: A declared injury changes training, including the plan already written

**Status:** Accepted  
**Date:** 2026-09-13  
**Author:** Augustin Briolon (with Claude Code)  
**Supersedes:** N/A  
**Related:** [ADR-036](./ADR-036-analyses-run-in-the-background-and-announce-themselves.md), [CORE_ARCHITECTURE.md](../models/CORE_ARCHITECTURE.md), [PHYSICAL_HEALTH_ENGINE.md](../models/PHYSICAL_HEALTH_ENGINE.md), [DESIGN_LANGUAGE.md](../design/DESIGN_LANGUAGE.md)

---

## Context

Declaring a pain or an injury was the most consequential thing an athlete could tell SHARPIT, and the least consequential thing the product did with it.

- **Follow-up depended on the model noticing.** Whether an athlete was asked again about a declared pain — and when — emerged from whatever the coach model chose to raise. Nothing in the system knew that a severity-7 knee declared four days ago was overdue for news, so a declaration could be made once and never revisited.
- **The re-assessment surface predated the rest of the product.** A dense form asking for a severity number, visually a generation behind every other athlete-facing surface.
- **What was collected was the wrong half.** The athlete was asked how much it hurt (`severity`, 0–10) and never what they could still do. Training decisions need the second: a 6/10 that stops running and a 6/10 that changes nothing are not the same input.
- **Generation ignored the declaration.** The plan prompt carried a general instruction never to aggravate a sensitive zone, but nothing named the zones, and nothing checked what came back. A session generated the day after an injury was declared could prescribe squats on that exact zone, and the plan gate — which already rejected or warned on load, intensity, and recovery — had no rule for it.
- **Nothing was retroactive.** Even once generation took the injury into account, a week generated _before_ the declaration kept its exercises, unchanged and unmarked, because nothing ever re-read an existing plan against a new condition.

The athlete's report: _"I'm afraid I've forgotten this feature lately, between the relevance of exercise creation and injuries being taken into account when generating them."_

---

## Decision

**A declared injury is an input to training, enforced at five points, and the last of them looks backwards.**

1. **The follow-up loop is deterministic, not conversational.** `reassessmentDue` decides from the note alone — severity band → silence tolerance (`high: 3d`, `moderate: 5d`, `low: 8d`) — whether news is due, and phrases the question. No model call decides whether to ask.
2. **The declaration collects functional impact, not only pain.** `FunctionalImpact` (`NONE` · `MILD` · `MODERATE` · `LIMITING` · `STOPPED`) is asked directly and stored. When the athlete declares it, **the declared value wins**; the severity-derived value is only a fallback for legacy notes that never carried one.
3. **Generation is told the zones by name.** Active conditions that constrain training are mapped — French body region → coarse body groups — into a `formatSensitiveZoneRules` block appended to the plan and adapt prompts, per request.
4. **The gate verifies the answer.** `sensitiveZoneRule` reads what each prescribed exercise loads (see point 6) and raises `SENSITIVE_ZONE_LOADED` when a loaded body group is one the athlete is protecting. Mobility work on a protected zone is never flagged: that is the prehab, not the aggravation. An endurance session carries no per-exercise structure, so the sport itself is judged — a run loads the legs, a swim the shoulders and back. The finding names each zone with its side and severity, worst first. A **WARNING**, never a rejection — see Rationale.
5. **The existing plan is re-read on every render.** `auditUpcomingSessions` runs that same check over sessions that are _already planned_, at read time, client-side, over data the page already holds. Declaring an injury therefore changes two visible surfaces immediately:
   - the condition card carries "N upcoming sessions load this zone";
   - the session itself, opened, says which exercises conflict and why.

   No regeneration, no model call, no migration, no background job.

6. **What an exercise loads is declared, never guessed from the media catalog.** The coach fills `intent` and `pattern` per exercise, drawn from the enums the curated movement taxonomy already defines. Classification falls back to that taxonomy, then to the Garmin category on an exact/alias match only, then to nothing. An unrecognised movement yields no claim and therefore no warning.

---

## Rationale

- **Retroactivity is the difference between a rule and a note.** A guard that only applies to future generations lets the athlete follow, unwarned, a week that was written before they got hurt — which is exactly the week in which they got hurt. Deriving the audit at read time makes the declaration effective at the moment it is made, for the whole plan, with no state to keep in sync. This is the same "derive at read, store intent" shape as [ADR-032](./ADR-032-journal-habit-experiments-derived-at-read.md).
- **Functional impact is the trainable variable.** Pain intensity is a symptom report; what the athlete can still do is what the plan has to be built from. Asking for it directly is cheaper and more reliable than inferring it from a number.
- **A warning, not a rejection, because the mapping is deliberately coarse.** A French body region resolves to broad catalog groups (`Genou` → `upper legs` + `lower legs`), and prehab work legitimately targets the same group as the injury. Rejecting would block correct plans; warning surfaces the conflict and leaves the judgment with the athlete and the coach.
- **Determinism where the cost of silence is high.** The model is good at phrasing a follow-up and bad at guaranteeing one. Severity bands are a product decision, visible in code and unit-tested; "the model usually asks" is neither.
- **No new engine.** Core is frozen (AGENTS.md). Everything here is mapping, formatting, one gate rule, and a read-time derivation — the Digital Twin coach expressed vertically, not a fifth engine.

---

## Alternatives Considered

### Alternative 1: Regenerate the affected sessions when an injury is declared

**Description:** On declaration, find upcoming sessions loading the zone and re-run generation for each.

**Pros:**

- The plan becomes correct, not merely annotated.

**Cons:**

- N model calls fired by a form submit, paid for, with no guarantee the replacements are better.
- Silently rewrites a plan the athlete may have organised their week around.
- Needs the background-run ledger, failure states, and a way to explain what changed.

**Rejected because:** it spends money and agency to answer a question the athlete has not been asked yet. Flagging the conflict lets them choose regeneration — which already exists as an explicit action.

### Alternative 2: Store the audit result on the session

**Description:** Compute conflicts at declaration time, write a flag column on `PlannedSession`.

**Pros:**

- Readable server-side; no client computation.

**Cons:**

- A migration, plus an invalidation problem: the flag is wrong the moment the condition resolves, the severity changes, or the session is edited.
- Two sources of truth for something derivable in microseconds.

**Rejected because:** the input changes more often than the sessions do; derived-at-read cannot go stale.

### Alternative 3: Reject conflicting sessions in the plan gate

**Description:** Make `SENSITIVE_ZONE_LOADED` a `REJECTED` finding.

**Pros:**

- Hard guarantee: no plan ever loads a protected zone.

**Cons:**

- The region→group mapping is coarse by construction; false positives would block legitimate prehab and rehab loading.
- A rejection loop on a generation the athlete is waiting for is a dead end, not a correction.

**Rejected because:** the check is a heuristic over a coarse taxonomy; it is honest as a warning and dishonest as a law.

---

## Consequences

### Positive

- Declaring an injury now changes the prompt, the gate verdict, the condition card, and every upcoming session view — the last two retroactively.
- Follow-up happens on a schedule the code owns, so a declaration cannot be quietly forgotten.
- The data model gained the variable training actually needs (`functionalImpact`), collected rather than inferred.
- The audit is pure and unit-tested against real catalog ids, so the mapping itself is under test rather than stubbed.

### Negative

- **Endurance is judged at the sport level, which is blunt.** A run loads `lower legs` + `upper legs`, a bike `upper legs`, a swim `shoulders` + `back`. So a declared knee now flags _every_ upcoming run, with no way to distinguish an easy 30 minutes from a hard long run. That is the price of covering the case at all: the previous version stayed silent on a bike-and-run week, which is most weeks in a triathlon block. Volume and intensity remain the job of the existing load rules.
- **Declarations only help the sessions generated after this change.** Measured on 52 exercises across the eight most recent strength sessions: none carried a catalog id, the media catalog classified 13, and the curated taxonomy 16. Legacy rows therefore depend on the Garmin fallback, which covers them only where the watch match was exact or aliased.
- **The guard is quieter than it looks, on purpose.** Refusing fuzzy watch matches means a movement neither declared nor curated is simply not judged. That is the deliberate trade: the previous catalog-based version classified 25% of exercises and inverted the verdict on the rest, warning about the cat-cow stretch and the piriformis release prescribed _for_ the sciatica while missing the Bulgarian split squat and the Romanian deadlift that actually loaded it.
- The region→group mapping is a hand-written French lexicon; an unrecognised region yields no zone and therefore no protection, silently.
- Warnings can be ignored. Nothing prevents an athlete from following a flagged session.
- Two body-region vocabularies still coexist (legacy `PhysicalNote.bodyPart`, modern `Condition.bodyRegion`), and the mapping accepts both shapes.

### Scientific debt created

- No evidence base sets the silence tolerances (3 / 5 / 8 days); they are a product judgment on how often it is reasonable to ask, not a healing-timeline claim.
- The mapping from an injury site to "body groups to avoid loading" is anatomical common sense, not a sourced contraindication model. It must not be presented to the athlete as medical guidance.

---

## Review Criteria

- If endurance prescriptions gain structured per-session targeting, extend the audit to them — the "strength only" limitation above is the first thing to revisit.
- If athletes report false warnings on prehab work, refine the mapping to exercise-level contraindications rather than coarse body groups, or add an "on purpose" acknowledgement on the session.
- If declared `functionalImpact` proves more predictive than `severity` for load decisions, promote it from a recorded field to a direct input of plan generation.
- If an unrecognised body region is ever observed in production data, the lexicon's silent failure becomes a defect: make unknown regions visible.
