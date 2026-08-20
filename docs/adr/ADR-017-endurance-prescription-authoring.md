# ADR-017: Structured endurance sessions are authored by both the coach and the athlete, with prose derived from the structure

**Status:** Accepted  
**Date:** 2026-08-20  
**Author:** Augustin Briolon  
**Supersedes:** N/A

---

## Context

[ADR-016](ADR-016-endurance-prescription-relative-targets.md) built the consumer side of structured endurance sessions: a validated `PlannedSession.endurancePrescription` schema with steps, one level of repeat groups and threshold-relative targets, a Connect payload builder, resolution at push time, and staleness detection when the athlete's references move.

Nothing writes that column. `endurancePrescription` appears in the validators, the push path, the staleness hook and the read view — and in no producer. The coach's `createPlannedSession` tool accepts `strengthPrescription` and free-text `description`, with no endurance equivalent; the session dialog has `strength-prescription-editor.tsx` and no counterpart.

The consequence is concrete: **every run sent to the watch today goes through the derived fallback.** `effectiveEndurancePrescription` builds a single timed step from `durationMin` and `intensity` whenever nothing is stored, which is always. One block, one band, no intervals. The step kinds, repeat groups and per-step targets specified in ADR-016 are unreachable from the product.

Two further forces:

1. **Structure is still being mined out of prose.** `bike-work-blocks.ts` scrapes `"3x15min à 85% FTP"` from the description to evaluate a ride. ADR-016 was written to remove that mechanism; it survives because nothing authoritative replaced it upstream.
2. **Bike is one table away.** `POWER_TARGET` is wired in the payload builder, `AthleteProfile.ftpW` is synchronised from Garmin, and the percent scale is already ascending easier-to-harder for watts. `fallbackTarget` returns no target for non-running sports — a deliberate refusal to invent a band, not a technical limit.

The strength pipeline shows what "authored" looks like end to end: the coach tool writes the structure, the athlete edits it in the dialog, and `resolveStrengthFieldsForPersist` falls back to a generated summary when no description is supplied.

---

## Decision

Give `endurancePrescription` two producers and make it authoritative:

1. **The coach writes it.** `endurancePrescription` becomes a field of the `createPlannedSession` and `updatePlannedSession` coach tools, validated by the same schema as the API, symmetric to `strengthPrescription`.
2. **The athlete edits it.** An endurance prescription editor in the session dialog, following the interaction patterns of `strength-prescription-editor.tsx`.
3. **The structure is the source of truth.** When a prescription exists, `description` is generated from it. The prose becomes a rendering of the structure, not a parallel statement of it.
4. **Bike is unlocked with power targets** anchored on percent of FTP. Swim stays locked.

---

## Rationale

**Why two producers rather than one.** Making the structure authoritative removes the athlete's current lever. Today a disagreement with a proposed session is expressed by rewriting the prose; once the prose is derived, that edit would change nothing that reaches the watch. The decision-memory model already assumes the athlete overrides — `recordDecisionAction` distinguishes `ACCEPTED` from `OVERRIDDEN` on session-defining fields, and `endurancePrescription` was added to `SESSION_DEFINING_FIELDS` precisely so an edit is auditable. An override the athlete cannot express is an override the system cannot record. The editor is the cost of keeping that loop honest.

**Why the structure wins over the prose.** Two independent statements of the same session drift, and the code then has to guess which one the athlete followed — which is what the regex scraping does today, with an explicit disclaimer that it never claims a full workout AST. Deriving the summary means one authority, one rendering, and a deletion path for the scraper. The nuance the prose carries today (sensations, technical cues) is not lost: it belongs in the per-step `notes` field the schema already defines, where it stays attached to the step it describes and reaches the watch with it.

**Why bike now and swim not.** Power zones as a fraction of FTP are a stronger physiological commitment than the running pace anchors already shipped: the reference is measured on the bike with the same instrument that will enforce the target, and the zone boundaries are long-standing consensus (Coggan's classic seven-zone model). Percent of FTP also needs no inversion — watts already run easier-to-harder. Swimming has neither: the reference would be a critical swim speed the app never tests, and pool sessions additionally require `poolLengthM` and per-100 m pacing whose zone model is far less settled. Shipping a bike table is extending a validated mechanism; shipping a swim table would be inventing physiology to fill a schema field.

**Proposed bike anchors** (centre, as percent of FTP), mirroring the running table's structure: `RECOVERY` 50, `ENDURANCE` 65, `TEMPO` 83, `THRESHOLD` 98, `VO2MAX` 112, with the same ±2.5 % half-band on quality steps and the same open floor on easy ones. These sit inside the classic zone bands rather than at their edges, so a step lands unambiguously in its intended zone.

---

## Alternatives Considered

### Alternative 1: coach as sole author

**Description:** Add the field to the coach tools, ship no editor. The athlete accepts a proposed session or rewrites the prose.

**Pros:**

- Half the work, no new UI surface, one producer to keep consistent with the schema.
- Matches how most sessions are actually created today — the coach proposes, the athlete rarely rewrites.

**Cons:**

- Once the prose is derived, editing it changes nothing that reaches the watch; the athlete's only remaining lever is to ask the coach to redo the session.
- Overrides stop being expressible, so `OVERRIDDEN` decision actions on endurance sessions become unrecordable — the adaptation loop loses its counter-signal.

**Rejected because:** it trades the athlete's authority for a UI saving, on the exact field the athlete is most likely to want to adjust.

### Alternative 2: manual editor only

**Description:** Build the editor, leave the coach in prose.

**Pros:**

- Full athlete control, no prompt engineering, no risk of the model emitting malformed structures.

**Cons:**

- The app proposes nothing structured, so the default path stays the single derived block.
- Building intervals by hand for every session is exactly the friction that makes an athlete stop using a planner.

**Rejected because:** the point of the feature is that the tool proposes; an editor alone improves control without improving relevance.

### Alternative 3: keep prose authoritative and parse it properly

**Description:** Promote `bike-work-blocks.ts` from a heuristic scraper to a real parser of session descriptions.

**Pros:**

- No schema to teach the model, no editor, no migration of authoring habits.
- Works retroactively on the existing corpus of sessions.

**Cons:**

- Natural language has no closure: every new phrasing is a new parser case, and a parse failure is silent.
- ADR-016 exists to remove this mechanism.

**Rejected because:** it reinstates as an architecture the thing the previous ADR classified as debt.

### Alternative 4: unlock all three sports at once

**Description:** Ship running, bike and swim target tables together.

**Pros:**

- One coherent release, no sport left in a half state.

**Cons:**

- The swim table would be defined without a measured reference or a settled zone model, and would reach the watch as authoritative numbers.

**Rejected because:** it would put invented physiology on the athlete's wrist — the failure mode ADR-016's non-RUN refusal was written to prevent.

---

## Consequences

### Positive

- Interval sessions reach the watch as intervals: warmup, repeated work and recovery blocks, cooldown, each with its own target, instead of one flat timed block.
- The coach's plans become executable artefacts rather than instructions the athlete translates mentally — the translation step is where a prescription leaks.
- One authority per session removes the prose/structure divergence and makes `bike-work-blocks.ts` deletable.
- Bike sessions gain power guidance anchored on a reference already synchronised and already trusted for TSS.
- Staleness detection starts covering real dependencies: a structured session declares exactly which references it uses, so an FTP change flags rides and leaves runs alone.

### Negative

- Two producers must stay aligned with one schema. A schema change now touches the coach tool description, the editor and the validators.
- The coach must emit valid structures. Malformed output is rejected by the schema rather than silently stored, so the failure mode is a refused session — visible, but a regression in fluency compared to prose, which never fails.
- Deriving the description changes what the athlete reads for sessions that already carry hand-written prose. The rule must apply only when a structure exists, so existing sessions are untouched.
- An editor for a nested structure (steps inside repeat groups) is materially harder than the flat list of sets the strength editor manipulates.

### Scientific debt created

- The bike anchor table is expert-consensus grade (Coggan zones), not derived from this athlete's measured response; like the running table it will need revisiting against observed compliance rather than assumed correctness.
- Swim remains without a target table, and `poolLengthM` stays a schema field with no consumer.
- `RACE` intensity is still not derivable for any sport, for the reason recorded in ADR-016: `Goal` carries no structured race distance.

---

## Review Criteria

Revisit this decision if:

- The coach's structured output is rejected by the schema on more than a small minority of attempts — the constraint would be miscalibrated against what the model reliably emits, and the tool schema should be loosened or split.
- The athlete edits the generated structure on most sessions — the anchors or the coach's block-building conventions are wrong, not the authoring model.
- Sessions are pushed to the watch and consistently reported stale before being run — the resolution point, not the authoring path, is the problem.
- A measured swim reference becomes available (a tested critical swim speed), which removes the reason swim stays locked.

---

## References

- [ADR-016](ADR-016-endurance-prescription-relative-targets.md) — the schema and resolution model this gives producers to
- [ADR-015](ADR-015-strength-watch-fidelity-and-scoring.md) — the strength authoring pipeline this mirrors
- [ADR-006](ADR-006-decision-memory-aggregate.md) — decision memory, why an expressible override matters
- `src/lib/planned-session/endurance/endurance-prescription.ts` — schema the producers must satisfy
- `src/lib/planned-session/endurance/endurance-session.ts` — derived fallback this decision makes the exception rather than the rule
- `src/lib/planned-session/strength/strength-prescription.ts` — `resolveStrengthFieldsForPersist`, the prose-derivation precedent
- `src/lib/coach/chat/coach-tools.ts` — coach tool surface to extend
- `src/lib/coach/plan/bike-work-blocks.ts` — the scraper this decision retires
