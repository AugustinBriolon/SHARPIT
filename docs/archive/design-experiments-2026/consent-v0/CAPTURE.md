# Consent V0 — Design UI captures

Source: production `https://sharpit.vercel.app` (SHA includes health consent #74).

## Files

| Path                                                  | Source                                             | Notes                                            |
| ----------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------ |
| `consent_soft_wall_mobile.png`                        | Live prod via `/demo` cookie → `/consent`          | Soft-wall with required health checkbox (art. 9) |
| `consent_soft_wall_desktop.png`                       | Same                                               | Desktop viewport                                 |
| `settings_privacy_demo_blocked_mobile.png`            | Live prod `/settings/privacy` in demo              | Documents auth/demo blocker                      |
| `settings_privacy_health_withdraw_fixture_mobile.png` | DOM fixture from `PrivacySettingsPanel` + prod CSS | Not a live authenticated session                 |

## Capture method

1. Vercel share bypass on `/demo` (sets deployment cookie).
2. `/demo` sets the public demo cookie (bypasses Clerk `auth.protect()` for reads).
3. Navigate to `/consent` — soft-wall renders (gate is skipped for demo, but the page itself is reachable).
4. Navigate to `/settings/privacy` — real panel is replaced by `SettingsDemoBlock`.

## Auth blockers

- `/consent` is **not** a public Clerk route. Signed-out (no demo cookie) → Clerk protect-rewrite **404**.
- Share bypass alone does **not** unlock Clerk-protected app routes.
- Demo mode **skips** the soft-wall gate and **disables** Settings privacy (export / delete / withdraw consents).
- Live withdraw UI therefore needs a real signed-in athlete (non-demo). Fixture PNG mirrors `src/components/privacy/privacy-settings-panel.tsx` copy and layout for Design review until a real account capture is available.
