# ADR-020: Easy steps carry a readable band, and the steps around the work carry none

**Status:** Accepted  
**Date:** 2026-08-21  
**Author:** Augustin Briolon  
**Supersedes:** N/A — revises one rule of [ADR-016](ADR-016-endurance-prescription-relative-targets.md)

---

## Context

[ADR-016](ADR-016-endurance-prescription-relative-targets.md) decided that easy steps get a cap rather than a two-sided band: alerting an athlete for running _slower_ than prescribed on a recovery run is the behaviour that makes people switch guidance off. Connect requires both bounds, so the slow bound was set at 40 % of the reference — present in the payload, unreachable in practice, and assumed invisible.

The first session pushed to a real watch showed the assumption was wrong. A 20-minute warm-up rendered as:

```
14:45-8:22 min/km     Objectif d'intensité
1.70 km               Distance estimée
```

Connect displays both bounds prominently, slow bound first, and derives its distance estimate from the midpoint of the range. The floor was not invisible: it was the first number the athlete read, it made the band unreadable, and it corrupted the estimated distance for every easy step in the session.

The same session also showed that a warm-up, a recovery jog and a cool-down were each carrying a band at all — three of the six steps displaying a pace range that describes nothing the athlete needs to hold.

---

## Decision

Two changes to how easy work is targeted:

1. **Warm-up, recovery, rest and cool-down steps carry no target.** Whatever effort is authored on them, they resolve to `NO_TARGET`.
2. **Easy intensities get a real two-sided band**, half-width 7.5 % of the reference instead of the 2.5 % used on quality steps. The open floor is gone.

---

## Rationale

**Why no target on the steps around the work.** A warm-up is defined by being easy, not by holding a number. Whatever range is shown, the athlete's behaviour is the same, so the range is pure noise — and noise repeated on half the steps of a session trains the athlete to ignore the target field exactly where it matters. Removing it also removes the false-alert problem at its root rather than hiding from it behind an unreachable bound.

**Why a wider band rather than a cap.** The original reasoning still holds for a genuine easy _block_ — a steady endurance run has a pace worth guiding, and a "too slow" alert on it is still unwelcome. But a band of ±7.5 % is loose enough that ordinary variation never trips it, while both of its bounds are paces an athlete can read. At a 5:00/km threshold, an endurance block resolves to 5:43–6:54/km: recognisably an endurance range, where the previous rule produced 5:43–11:29/km.

**Why the earlier decision was wrong rather than unlucky.** ADR-016 reasoned about what the watch would _alert_ on and never about what it would _display_. The payload was correct on its own terms and the tests passed, because the tests asserted the same assumption the design made. Only the device could falsify it.

---

## Alternatives Considered

### Alternative 1: keep the cap, tighten the floor

Raise the open floor from 40 % to something like 60 % of reference so the displayed range stays plausible.

The smallest change, and it preserves the original intent. Rejected because it keeps a bound that means nothing — a number chosen to look acceptable rather than to describe an effort — and it still shows a range on warm-ups, where no range is wanted. It fixes the symptom the watch revealed without addressing why three steps in six were carrying targets.

### Alternative 2: keep bands everywhere, quality half-width throughout

Drop the easy/quality distinction and give every step ±2.5 %.

Simplest rule to state and to test. Rejected because it prescribes recovery runs to a two-second-per-kilometre corridor, which is both unachievable and precisely the nagging that ADR-016 set out to avoid.

### Alternative 3: let the athlete choose per step whether to carry a target

Expose a "guided / free" toggle on each step in the editor.

Maximum control, no guessing on our part. Rejected as configuration standing in for a decision: the right answer is knowable from the step kind, and asking the athlete to make it on every warm-up they ever author is a worse experience than making it once here.

---

## Consequences

### Positive

- Every displayed pace range is now a range the athlete could actually run, on land and in the water.
- Connect's estimated distance and duration stop being skewed by an unreachable bound.
- The target field on the watch means "hold this" everywhere it appears, rather than meaning it only on some steps.

### Negative

- An athlete who genuinely wants a pace cap on a warm-up — to stop themselves starting too fast, a real failure mode — no longer has one, and the editor offers no way to ask for it. If that turns out to matter, it argues for Alternative 3 rather than for restoring the floor.
- The easy half-width of 7.5 % is reasoned, not measured, the same status as the intensity anchors themselves.
- Sessions authored before this change keep their stored bands: the prescription holds percentages, and a step already saved with a 40 % floor keeps it until re-authored or re-pushed.

### Neutral

- `EASY_HALF_BAND_PCT` sits beside `QUALITY_HALF_BAND_PCT` in `endurance-targets.ts`; both are single constants to tune once the athlete has run against them.
- Step kinds now drive whether a target exists at all, which makes the kind a more load-bearing choice in the editor than it was.

---

## References

- [ADR-016](ADR-016-endurance-prescription-relative-targets.md) — the cap-and-open-floor rule this revises
- [ADR-018](ADR-018-swim-css-threshold.md) — swim anchors, subject to the same band rule
- `src/lib/planned-session/endurance/endurance-targets.ts` — band construction
- `src/lib/planned-session/endurance/coach-endurance-prescription.ts` — unguided step kinds
