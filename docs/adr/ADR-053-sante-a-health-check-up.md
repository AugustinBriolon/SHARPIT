# ADR-053: Santé — a health check-up, each marker read against a norm and against the athlete

**Status:** Accepted
**Date:** 2026-09-29
**Author:** Augustin Briolon (with Claude Code)
**Supersedes:** N/A (the native Corps tab becomes Santé; `/api/v1/body/*` stays for the drill-downs)

---

## Context

The native Corps tab listed body readings: weight, HRV, resting HR, VO₂max, composition and
training thresholds, each a number with a sparkline. It said what was measured, not how the
athlete is doing. The athlete asked for a page that reads like a health check-up: a dashboard of
their health, ranked by what matters most.

## Decision

1. **One projection, `GET /api/v1/health/overview`** (`packages/server/src/lib/health`). Markers are
   grouped by how much they say about health, in this order on the page:
   - **Synthèse**: the biological age (ADR-045), how many markers sit in their norm, and up to
     three markers whose month moved — the ones to watch first.
   - **À surveiller**: only when something deserves attention — resting HR at least 5 bpm over the
     month before for 3 days or more, HRV under the athlete's range, a 7-day sleep average under
     6 h 30, weight moving more than 2 % in two weeks, an active or monitored sensitive zone
     (physical notes). Empty on a quiet month, never filled for its own sake.
   - **Signes vitaux**: resting HR, HRV, sleep, VO₂max — the markers most tied to long-term health
     and the ones that move week to week.
   - **Corps**: weight (with its target), body fat, visceral fat, muscle — they move over months.
   - **Au quotidien**: steps and breathing during sleep.
2. **Every marker is read twice**: against a published norm (`health-norms.ts`), and against the
   athlete's own month — the mean of the last 7 days (14 for a scale, 30 for VO₂max) against the
   30 days before (`health-trend.ts`), with a per-marker noise floor under which it reads stable.
3. **Norms name their source** and describe, never diagnose: AHA for resting HR (60–100, lower in
   trained athletes), AASM / Sleep Research Society for sleep (7 h or more), HUNT3 (Loe 2013, the
   ADR-045 reference) for VO₂max against age and sex, ACE categories for body fat by sex, the
   Tanita index for visceral fat (1–12 healthy), Paluch et al. 2022 for steps (the benefit levels
   off near 8–10 000 before 60, 6–8 000 after), 12–20 breaths per minute at rest.
4. **HRV has no population norm.** It depends too much on the device (Apple SDNN, Garmin RMSSD),
   age and person; its norm is the athlete's own range — Garmin's baseline when sent, else two
   months of readings ± 1 SD.
5. **Free, except the biological age.** The readings are the athlete's own data and the norms are
   public references; only the biological age, which SharpIt computes, stays Pro (ADR-045).
6. **Training thresholds leave the page.** FTP, max HR, LTHR, threshold pace and CSS calibrate
   training; they say nothing of health. They move to Paramètres › Profil in the app.

## Consequences

- The app shows a check-up without computing one: every band, trend and alert is the server's.
- A marker without what its norm needs (no birth date or sex for VO₂max and body fat, too few
  HRV readings) shows its value and trend without a norm, rather than a guessed one.
- `/api/v1/body/overview` and `/api/v1/body/series` stay: the series drill-down and the
  thresholds page read them.
