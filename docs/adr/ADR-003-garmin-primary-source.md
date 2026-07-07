# ADR-003: Garmin as Primary Data Source

**Status:** Accepted  
**Date:** 2024 (predates knowledge base creation)  
**Author:** Augustin Briolon  
**Supersedes:** N/A

---

## Context

SHARPIT requires physiological data to generate training recommendations. This data must include: activity metrics (HR, power, GPS), recovery signals (HRV, readiness, sleep), and health metrics (body composition, resting HR). The choice of primary data source determines what features SHARPIT can implement and how reliable its recommendations will be.

---

## Decision

**Garmin Connect is SHARPIT's primary and currently exclusive data source.** All features are designed around Garmin's data model. No multi-platform abstraction layer is maintained.

---

## Rationale

### Why Garmin

**HRV during sleep:** Garmin measures HRV overnight using the optical PPG sensor. This is the physiologically correct methodology (HRV during undisturbed sleep, not at waking). Most competing platforms measure HRV at a single morning measurement point.

**Training Readiness Score:** Garmin provides a pre-computed multi-signal recovery composite. While the algorithm is proprietary, it integrates overnight HRV, sleep, training load, and body battery into a single actionable number.

**Activity data completeness:** Garmin activities include power (cycling), HR, GPS, cadence, stride length, and vertical oscillation. The data richness enables TSS computation from multiple fallback methods.

**API maturity:** Garmin Health API is stable, well-documented, and widely used by third-party developers.

**Market position:** Garmin is the dominant platform for serious endurance athletes (cyclists, runners, triathletes) — SHARPIT's target user population.

### Why not device-agnostic abstraction

**Data lowest common denominator:** abstracting across Garmin, Apple Watch, and Polar requires reducing to the subset of features all platforms support. This eliminates HRV during sleep (Apple Watch does not provide this), training readiness, body battery, and power-based TSS for non-Garmin devices.

**Maintenance burden:** each additional data source requires a separate sync pipeline, data normalization layer, and feature parity maintenance. Two sources doubles the work without doubling the user base.

**Garmin dominance in the target market:** recreational endurance athletes who train seriously enough to benefit from SHARPIT's analysis overwhelmingly use Garmin. Apple Watch serves a different user profile (fitness tracking vs. endurance performance).

---

## Alternatives Considered

### Alternative 1: Strava as primary source

**Description:** Strava has the largest endurance activity database and strong social features. Import activities from Strava.

**Rejected because:**

- Strava does not provide sleep data, HRV, readiness, or body composition
- Activity load calculation from Strava requires the same fallback methods as Garmin but without the primary power/HR streams
- SHARPIT's recovery model is impossible without sleep and HRV

### Alternative 2: Apple HealthKit bridge

**Description:** use Apple HealthKit as an aggregation layer — Apple Watch users could provide sleep, HR, and activity data.

**Rejected because:**

- Apple Watch sleep staging accuracy is lower than Garmin
- No HRV during sleep (Apple Watch measures HRV at a single morning point in older versions)
- No training readiness equivalent
- Activity power data unavailable

**Future consideration:** if SHARPIT targets casual fitness users (not endurance athletes), Apple Health integration becomes more compelling.

### Alternative 3: Multi-source with Garmin primary

**Description:** build a device-agnostic data model that Garmin fills today, with other sources as optional supplements.

**Rejected in current form because:**

- Increases architectural complexity with no immediate user benefit
- Every feature must be built to degrade gracefully without Garmin-specific data
- The abstraction layer itself becomes a maintenance burden

**Potential future architecture:** a `SyncProvider` abstraction that different integrations implement. Garmin fills all fields; other providers fill a subset. Each feature declares its data requirements and degrades gracefully when optional sources are absent.

---

## Consequences

### Positive

- Maximum feature richness from Garmin's full data model
- No abstraction overhead — direct mapping to Garmin schema
- SHARPIT's advanced features (HRV trend, sleep staging, readiness) are fully implemented

### Negative

- Users without Garmin devices cannot use SHARPIT
- Garmin API changes break SHARPIT directly with no buffer
- Garmin algorithm changes (HRV computation, readiness) change SHARPIT behavior without code changes
- Vendor lock-in: significant effort required to add non-Garmin source later

### Risk mitigation

- Store raw Garmin values where possible (no preprocessing that would make data incompatible with a future abstraction)
- Zod-validate Garmin API responses to catch API changes early
- Document all Garmin-specific assumptions in `garmin.md`

---

## Review Criteria

This decision should be revisited if:

- A significant user segment reports using non-Garmin devices
- Garmin deprecates its Health API or introduces prohibitive licensing terms
- A competing platform (Polar, WHOOP) achieves equivalent data richness and market penetration
