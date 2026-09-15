# Design — Public teaser → signup funnel

Binary PNG evidence for the signed-out promise screens (Design SHIP).

| File | State |
| ---- | ----- |
| `teaser-01-endurance-mobile.png` | `/welcome` screen 1 — Endurance |
| `teaser-02-twin-mobile.png` | `/welcome` screen 2 — Digital Twin |
| `teaser-03-morning-cta-mobile.png` | `/welcome` screen 3 — Décider le matin + CTAs |

## Capture method (Eng / Design)

Preview must be reachable **signed-out** (no Clerk session, no demo cookie).

1. Open the Vercel preview URL for this PR (share bypass if the deployment is protected).
2. Navigate to `/welcome` (or `/` signed-out → redirects to `/welcome`).
3. Playwright Chromium, viewport **390×844 @2x** (or Safari responsive):

```bash
npx playwright screenshot --viewport-size=390,844 \
  "$PREVIEW_URL/welcome" docs/design/v0-teaser-signup/teaser-01-endurance-mobile.png
```

4. Click **Continuer** twice; capture screens 2 and 3 (CTAs visible on screen 3).
5. Commit PNGs into this folder and tick Design SHIP on the PR.

### Alternative (local)

```bash
yarn dev
# then Playwright / DevTools device toolbar at 390×844
```

## Notes

- Outside `(app)` shell: no bottom tab bar, no liquid-glass.
- Primary CTA → `/sign-up`; secondary « J’ai déjà un compte » → `/sign-in`.
- Zero athlete data; no health / Art. 9 processing copy on the teaser.
- Do **not** treat « cercle privé » as a signup wall.
