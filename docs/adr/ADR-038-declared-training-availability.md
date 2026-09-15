# ADR-038: Declared training availability sits beside the observed days, never replacing them

**Status:** Accepted  
**Date:** 2026-09-14  
**Author:** Augustin Briolon (with Claude Code)  
**Supersedes:** N/A  
**Related:** [ADR-022](./ADR-022-temporal-product-navigation.md), [ADR-023](./ADR-023-reading-density-expert-mode.md), [INFORMATION_ARCHITECTURE.md](../design/INFORMATION_ARCHITECTURE.md), [DOMAIN.md](../domain/DOMAIN.md)

---

## Context

SHARPIT built plans against a week it inferred, and never once asked the athlete what their week actually was.

- **The only availability signal was observed.** `buildAvailableDays` counted activity days over a 56-day window and kept those occurring at least twice. That answers "when did you train", which is not the same question as "when can you train". An athlete who trained Monday and Wednesday for two months because of a work project was modelled as a Monday/Wednesday athlete, indefinitely.
- **Intent lived in free text or nowhere.** `AthleteProfile.context` is documented in the schema as holding "dispos, contraintes pro, préférences". Prose reaches the coach prompt, but nothing can count it, gate on it, or show it back to the athlete. Most athletes never wrote it.
- **Onboarding asked what the athlete owns, never when they are free.** The wizard collected sports, equipment, a goal and data sources. Equipment constrains _what_ a session can contain; availability constrains _whether it can happen at all_, and it was the one constraint never captured.
- **Nothing could detect the gap.** A plan asking for five sessions from an athlete who can train three times is a plan that will slip, and the slip was indistinguishable from low motivation, because the system had no record of what was promised.

---

## Decision

**Store the athlete's declared rhythm as first-class profile data, capture it in a dedicated onboarding step, and give the coach both the declared intent and the observed reality, labelled as two different facts.**

1. **One versioned JSON column**, `AthleteProfile.trainingAvailability`, shaped `{ version: 1, targetSessionsPerWeek: number | null, availableWeekdays: (0-6)[] }`. Weekdays follow `Date#getDay`. This is the same pattern as `equipment`, `practicedSports` and `journalPrefs`: a blob on the profile with a normaliser that degrades anything unreadable to "nothing declared" rather than throwing.
2. **Both answers are optional at rest.** Onboarding captures **days only**; `targetSessionsPerWeek` is derived as `availableWeekdays.length` (N days ⇒ N possible sessions). Legacy profiles may still hold an independent session count. `null` means never declared and is the state of every athlete who predates the column.
3. **A dedicated fifth onboarding step**, `Disponibilités`, placed between Équipement and Intention — the two constraint questions sit together, before the goal they constrain. It is skippable, and skipping still persists the empty state.
4. **The coach prompt carries both readings, named.** The `## Disponibilités` section now reads `Souhaité`, `Jours déclarés libres` and `Jours observés (8 dernières semaines)` as separate lines, emitting only those that exist.

---

## Rationale

- **Intent and observation are different facts, and the gap between them is the coaching signal.** Collapsing them loses the one thing a coach most needs to notice: the athlete who wants four sessions and completes three is not the athlete who wants three and completes three. Labelling both lets the model reason about the discrepancy instead of being handed a single number that hides it.
- **Declared data must not silently overwrite a working inference.** Every existing athlete has `null`. Had the declared value replaced the observed one, the entire install base would have lost its availability section on the day the column shipped, in exchange for nothing.
- **A JSON blob, not columns, because the shape will move.** Two answers today; session-length preferences, per-sport days or blackout periods are plausible next. The repo already carries three such blobs with a normalise-on-read contract, so this adds a pattern rather than inventing one.
- **Out-of-range values read as "not declared", never as a clamp.** A `targetSessionsPerWeek` of 0 or 15 is a bug or a hostile payload; silently storing 1 or 14 would fabricate an intent the athlete never expressed.
- **Storage tolerates more than the UI offers.** Onboarding exposes weekday tiles only; `targetSessionsPerWeek` is derived from the selected day count (1–7). The schema still accepts 1–14 for legacy or future two-a-day athletes.

---

## Alternatives Considered

### Alternative 1: Keep it in the free-text `context` field

**Description:** Ask the question in onboarding and append the answer to the existing prose field the coach already reads.

**Pros:**

- No schema change, no migration, no validator.
- Reaches the coach prompt immediately.

**Cons:**

- Unparseable. Nothing can count sessions, compare declared against observed, or gate generation on a day the athlete is not free.
- Cannot be shown back to the athlete as an editable control, so it drifts and is never corrected.
- The field is already a catch-all; adding a fourth concern to it makes all four harder to read.

**Rejected because:** the whole point is to make availability _checkable_, and prose cannot be checked.

### Alternative 2: Declared availability replaces the observed days

**Description:** When the athlete declares days, `buildAvailableDays` becomes a fallback used only when nothing is declared.

**Pros:**

- Shorter prompt, one unambiguous source.
- No risk of the model weighing two contradictory lists.

**Cons:**

- Destroys the intent-versus-reality gap, which is the most actionable thing in the section.
- An athlete who declares an aspirational week and never trains it would have the aspiration presented to the coach as fact.

**Rejected because:** it optimises prompt length at the cost of the signal the feature exists to create.

### Alternative 3: Fold the question into an existing onboarding step

**Description:** Add the rhythm and day pickers to the Intention or Équipement step rather than creating a fifth one.

**Pros:**

- The wizard stays at four steps, so the progress rail and the three test files that encode the count are untouched.
- One fewer screen before the athlete reaches the app.

**Cons:**

- Équipement is already skippable and material-focused; availability would inherit that framing and read as an afterthought.
- Intention is about the destination; mixing the weekly constraint into it blurs two questions the athlete answers differently.

**Rejected because:** availability is a constraint of the same weight as equipment and deserves its own screen. The cost — a five-segment rail and updated expectations in `wizard-steps.test.ts`, `wizard-progress.test.ts` and `onboarding-progress.test.ts` — was accepted deliberately.

---

## Consequences

### Positive

- The coach can name the discrepancy between the week the athlete wants and the week they run, instead of inferring motivation from a missed session.
- Availability is now editable structured data, so a change of job or season is one control away rather than a rewrite of a prose field.
- The normaliser makes every read total: an athlete with `null`, a truncated blob or a hostile payload yields `EMPTY_TRAINING_AVAILABILITY` and a coach prompt that simply omits the declared lines.
- A single weekday catalog (`WEEKDAY_LABELS_FR`) now serves both the picker and the coach formatter; the coach module no longer keeps a private copy that could drift.

### Negative

- **The declaration is not yet enforced anywhere.** It reaches the coach prompt and therefore influences generation, but no plan-gate rule rejects or warns when a generated session lands on a day the athlete declared unavailable. The guard is advisory, not structural — the same gap ADR-037 closed for sensitive zones remains open here.
- **`AthleteProfile.context` now overlaps its own documentation.** Its schema comment still claims to hold "dispos", which is half true. The field's guidance needs revisiting.
- The onboarding wizard is one screen longer, and the progress rail's segment arithmetic changed for every step.
- Declared and observed lists can contradict each other in the prompt, and nothing ranks them; the model decides what to make of the gap.

### Scientific debt created

- No evidence base was consulted for the plausible range of weekly sessions (1–14 stored, 1–7 offered). The bounds are product judgement, not literature, and exist only to reject nonsense rather than to encode a training principle.
- Whether the declared-versus-observed gap is a useful predictor of adherence is untested. It is surfaced to a language model, not measured.

---

## Review Criteria

Revisit this decision when any of these hold:

- **A plan-gate rule is written for availability.** The moment a generated session can be rejected for landing on an unavailable day, the advisory framing above is obsolete and this ADR should be superseded.
- **The declared blob gains a third concern** (session length, per-sport days, blackout periods). At that point `version: 2` and a migration path for `version: 1` readers are required.
- **More than a quarter of active athletes leave the step empty.** That would indicate the question is asked at the wrong moment, and it likely belongs after the first week of use rather than before the first session.
- **The observed-days inference is removed or rewritten.** `formatAvailabilitySection` assumes two independent sources; collapsing to one changes the contract this ADR rests on.
