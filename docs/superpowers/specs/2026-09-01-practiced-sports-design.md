# Practiced sports — endurance-first (v1)

**Date:** 2026-09-01  
**Status:** Approved (Augustin) → implementing  
**Related:** [DESIGN_LANGUAGE.md](../../design/DESIGN_LANGUAGE.md) · onboarding · settings/equipment · goals Intention

---

## Problem

SharpIt is endurance-first, but onboarding and equipment treat all sports as equal (or omit practiced sports entirely). New athletes land on Intention without declaring what they actually train. Equipment tabs always show RUN/BIKE/SWIM/STRENGTH/MOBILITY. Goal sport pickers offer bike/swim even for run-only athletes.

---

## Goal

1. **Catalog locked** — core endurance (≥1 required): `run`, `bike`, `swim`, `triathlon`. Complementary optional: `strength`, `mobility`, `stretching`. No randonnée / Autre.
2. **Onboarding** — Sports → Intention → Sources → **Equipment (optional)** → bootstrap. Cannot leave Sports without ≥1 core sport. Equipment can be skipped via « Passer ».
3. **Triathlon UX** — check triathlon ⇒ run+bike+swim; uncheck any of the three ⇒ uncheck triathlon; checking all three may auto-check triathlon.
4. **Filter proposals only (V1)** — Intention/goal sport options + equipment tabs filtered by practiced sports. Do not hide historical activities or rewrite Today/Training hubs.
5. **Settings** — no new nav page. « Sports pratiqués » block at top of existing Equipment page; same model + persistence as onboarding.
6. **Onboarding Equipment** — filtered checklist only (no sports editor); reuses Settings inventory + `use-equipment-persist`.

---

## Storage & defaults

- `AthleteProfile.practicedSports` JSON: `{ version: 1, sports: PracticedSportId[] }`.
- **Existing athletes (null):** normalize-on-read to **all four core sports** (`run`, `bike`, `swim`, `triathlon`). Least surprising — they keep seeing current Intention/equipment surface and are never blocked. Complementary stays off until chosen.
- Persist via existing `PATCH /api/athlete-profile` (same path as equipment).

---

## Filtering rules

| Consumer | Behaviour |
| --- | --- |
| Equipment tabs | Map practiced → `EquipmentSport`: triathlon expands to RUN+BIKE+SWIM; mobility **or** stretching → MOBILITY; strength → STRENGTH. |
| Performance goals | Offer RUN/BIKE/SWIM only if the corresponding core sport (or triathlon) is practiced. |
| Period goals | Same for RUN/BIKE/SWIM; STRENGTH only if strength practiced; keep « Tous sports »; drop OTHER when filtering is active (optional keep OTHER — prefer drop for endurance-first clarity). |
| Race goals | Free-text format stays; no sport enum to filter. |

---

## Shared UI

One multi-select component reused by onboarding Sports step and Equipment settings. French copy; complementary block labelled e.g. « Complémentaire si tu veux ».

---

## Non-goals (this PR)

- Hiding past activities by sport.
- Rewriting Today / Training hubs.
- New Settings navigation entry.
