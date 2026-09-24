# Design — Consent health withdraw wall (art. 9)

Binary PNG evidence for the soft wall after health consent withdraw (PR #121).

| File                                  | State                                                                                                                               |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `consent-health-withdrawn-mobile.png` | `/consent?reason=health_withdrawn` — title « Consentement santé retiré », body FR, CTA « Réactiver et continuer ». No liquid-glass. |

## Capture method

1. Vercel preview share bypass on `/demo` (sets deployment cookie + demo cookie).
2. Navigate to `/consent?reason=health_withdrawn`.
3. Playwright Chromium screenshot, viewport 390×844 @2x.

## Notes

- Demo mode skips `PrivacyConsentGate` and blocks Settings privacy toggles; this fixture shows the **wall copy** athletes see after withdraw (query `reason=health_withdrawn` from Settings redirect or gate).
- Chrome glass allowlist unchanged: no `ChromeGlass` / liquid-glass under `src/app/consent/`.
