# Design — Hotfix Pourquoi off + onboarding days-only

Binary PNG evidence for Design SHIP (PR hotfix):

1. Today hero **sans** panel « Pourquoi » (soft-hero gaps conservés)
2. Onboarding Disponibilités : **jours seuls** (pas d’input nb séances)

| File | State |
| ---- | ----- |
| `today-hero-sans-pourquoi-mobile.png` | Soft-hero PARTIAL : chip + gaps, **pas** de collapsible Pourquoi |
| `onboarding-days-only-mobile.png` | Étape Disponibilités : jours + lecture dérivée (3 séances possibles) |

## Capture method

Local HTML fixtures rendered with Playwright + Chrome headless — Vercel preview is auth-gated. Fixtures live under `/tmp` during capture; binaries here are the Design sign-off artifacts.

Viewport: **390×844 @2x**.

Copy: French athlete strings, no em dashes in UI copy.

## Notes

- Soft-hero manques remain as bullets on the hero when `softHero` is true.
- `targetSessionsPerWeek` is derived from selected weekday count (N days ⇒ N possible sessions).
- Do **not** merge until Design sign-off.
