# Design — Confidence V0 fixtures

Binary PNG evidence for Today `packTier` / soft-hero states (PR #117).

| File                               | State                                                               |
| ---------------------------------- | ------------------------------------------------------------------- |
| `today-full.png`                   | FULL — assertive hero OK                                            |
| `today-partial-soft-hero.png`      | PARTIAL — chip Estimation partielle + gaps                          |
| `today-insufficient.png`           | INSUFFICIENT — CTA sources / sync, no intensity topAction           |
| `today-pourquoi-open.png`          | (historical) former Pourquoi expand — panel removed from Today hero |
| `today-pourquoi-soft-readable.png` | (historical) soft-hero gaps; Pourquoi panel removed from Today hero |

## Capture method

Local HTML fixtures (Storybook-like) rendered with Playwright + Chrome headless — Vercel preview is auth-gated. Fixtures live under `/tmp` during capture; binaries here are the Design sign-off artifacts.
