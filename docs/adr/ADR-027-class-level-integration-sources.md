# ADR-027: Class-level integration sources of truth

**Status:** Accepted  
**Date:** 2026-08-25  
**Author:** SHARPIT  
**Supersedes:** N/A (extends ADR-003)

---

## Context

Athletes connect multiple providers that often overlap on the same physiological domain (e.g. Garmin and Strava for activities; Withings and Renpho for body composition). Garmin alone spans several domains (activities and wearable health). Product surfaces previously listed providers as a flat grid with hard-coded precedence (Withings over Renpho; Garmin conceptual primary per ADR-003) and no athlete choice.

Athletes need to:

1. Understand providers by **what data they feed** (data classes).
2. Connect a multi-class account **once**.
3. Opt in/out of each class independently (Garmin for activities without wearable health).
4. Choose which connected provider is the **source of truth** when several feed the same class.

---

## Decision

Adopt **account-level connection** and **class-level participation**:

- **Data classes:** `activities`, `wearable_health`, `body`, `nutrition`, `calendar`.
- **Connection:** one OAuth/credentials bind per provider account.
- **Participation:** `AthleteProfile.integrationSourcePrefs` stores, per class, `enabled[]` and `primary`.
- Connecting from a class enables **that class only**. Connecting from settings without a class context enables all classes the provider covers.
- Primary = source of truth; other enabled providers complement (existing merge paths read these prefs).
- ADR-003 remains: Garmin is the physiological model of reference when chosen as primary — not “always use every Garmin signal.”

---

## Rationale

- Matches athlete mental model (“I use Garmin for workouts, not for sleep”).
- Avoids double OAuth for multi-class providers.
- Unifies onboarding and settings catalogs.
- Preserves backward compatibility: null prefs → legacy defaults (connected providers enabled for every class they cover; Withings preferred for body; Garmin preferred for activities/health).

---

## Alternatives Considered

### Alternative 1: Connect twice per class

**Description:** Separate “Garmin activities” and “Garmin health” connections.

**Pros:** Explicit per-class auth.

**Cons:** Same credentials twice; confusing UX; duplicate account rows.

**Rejected because:** Account is shared; usage is the variable.

### Alternative 2: Generic field-by-field merge engine now

**Description:** Full multi-source resolver for every observation field.

**Pros:** Maximum flexibility.

**Cons:** Large scope; Polar/Apple not ready.

**Rejected because:** Vague A wires existing merges (body precedence, activity sync gates, health read gate) first.

---

## Consequences

### Positive

- Shared `provider-catalog` for onboarding and settings.
- Athlete-controlled primary/enabled per class.
- Product reads ignore disabled classes (e.g. empty health when Garmin not enabled for `wearable_health`).

### Negative

- Prefs JSON must stay sanitized against disconnected accounts.
- Sync may still pull data the product ignores until a later optimization.

### Scientific debt created

- None.

---

## Review Criteria

- Revisit when a second wearable health provider (Polar/Apple) ships — may require the generic complement engine (Vague B).
- Revisit if athletes need field-level overrides within a class.
