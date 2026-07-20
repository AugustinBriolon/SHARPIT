# SHARPIT — PWA Real-Device Testing Checklist

> **Status:** Manual checklist — no CI can drive a real iOS Safari install/offline/reconnect flow.
> **Related:** [ADR-008](adr/ADR-008-pwa-offline-snapshot-and-sw-lifecycle.md) · [`docs/design/DESIGN_LANGUAGE.md`](design/DESIGN_LANGUAGE.md)

Run this checklist on real hardware before shipping any change to `src/sw.ts`, `src/app/manifest.ts`, or `src/lib/pwa/**`. Automated tests (`.test.ts`) cover the pure logic behind each of these; they cannot verify the actual on-device experience.

## Devices

- [ ] iPhone with notch or Dynamic Island (safe-area insets are non-zero — the real test case `env(safe-area-inset-*)` exists for)
- [ ] iPhone SE (small screen, home-button form factor — no notch, safe-area insets near zero, smallest realistic viewport)
- [ ] iPad, portrait
- [ ] iPad, landscape (confirms the manifest's dropped `orientation` lock doesn't regress this)

## Appearance

- [ ] Light mode: theme color, background, and app icon read correctly in the app switcher and on the home screen
- [ ] Dark mode: same, plus confirm the splash screen (shown briefly on cold launch) doesn't flash the wrong color before hydration
- [ ] Browser tab: light chrome uses `favicon.svg`; dark chrome uses `favicon-dark.svg` (Lime Pulse stroke on forest canvas)
- [ ] Android adaptive icon: maskable asset (`icon-512-maskable.png`) keeps the pulse inside the safe zone when the launcher applies a circle/squircle crop — not cropped like the old identical-to-any file
- [ ] Splash screen (`/apple-splash/*`, wired via `apple-touch-startup-image` in `layout.tsx`) renders the themed mark on cold launch for each of the 4 device checklist entries above — no blank white flash, and the `media` query actually matches the right image per device (verify by device, not simulator — these `device-width`/`device-height` queries are notoriously easy to get subtly wrong, e.g. width/height swapping between portrait and landscape)
- [ ] Tap any button/link and confirm no gray highlight box flashes (`-webkit-tap-highlight-color`); long-press a button and confirm no iOS callout menu appears (`-webkit-touch-callout`); confirm text in coach rationale/briefings is still selectable (the callout/tap-highlight reset is scoped to interactive chrome, not body-wide)
- [ ] Scroll to the very top/bottom of Today and confirm no rubber-band bounce past the document edge (`overscroll-behavior-y: none`)

## Install flow

- [ ] Settings → Install card appears (not already installed, browser is iOS Safari) with the Share → Add to Home Screen instructions — confirm the icon and copy render correctly
- [ ] Complete the install; confirm the home-screen icon uses the maskable/apple-touch icon, not a browser-generated screenshot thumbnail
- [ ] Reopen from the home screen; confirm `display: standalone` (no Safari chrome) and that the Settings install card no longer appears (`ALREADY_INSTALLED`)
- [ ] Dismiss the install card once (before installing) and confirm it does not reappear on the next visit within the cooldown window

## Offline launch

- [ ] With connectivity, open the app once so a Snapshot is fetched and persisted
- [ ] Enable Airplane Mode
- [ ] Force-quit and relaunch the installed app
- [ ] Confirm Today shows the read-only offline summary (verdict, confidence, limiting factor, "last updated" label) — not the generic `~offline` fallback, and not a blank/broken screen
- [ ] Confirm the summary is clearly labeled read-only and does not read as a fresh instruction

## No cached Snapshot

- [ ] On a device/profile that has never opened the app online (or after clearing site data), go offline and open the app
- [ ] Confirm the existing `~offline` fallback page renders — no error, no blank screen

## Reconnect

- [ ] From the offline state above, disable Airplane Mode
- [ ] Confirm Today automatically refetches and replaces the read-only summary with the live view within a few seconds, with no manual refresh needed
- [ ] Confirm the verdict/confidence shown after reconnect matches what the server actually has (compare against the web app in a desktop browser at the same moment)

## Foreground resume

- [ ] Background the app (not force-quit) for several minutes, then bring it back to the foreground
- [ ] Confirm no stale-looking flash before the existing refetch-on-focus/staleTime behavior settles

## App update

- [ ] Ship a trivial change, deploy, and confirm `UpdateAvailableBanner` appears on the next visit without any open dialog being disturbed
- [ ] Open a coaching dialog (Plan Generator or Plan Adapter) while an update is available; confirm the banner does not force a reload out from under the open dialog
- [ ] Tap "Mettre à jour"; confirm the app reloads exactly once and the new version is active afterward (check a visible marker of the change)

## Authentication expiry

- [ ] Let a Clerk session expire (or manually sign out from another device/tab)
- [ ] Confirm the app redirects to sign-in rather than silently showing stale data
- [ ] Confirm the persisted offline Snapshot is cleared on sign-out (`SnapshotOfflineSync`) — sign in as a different account afterward and confirm no trace of the previous athlete's data appears, even offline
- [ ] Fresh install: sign in via Safari, then install and open standalone for the first time — confirm being asked to sign in again is expected (ADR-008's documented iOS storage-partitioning limitation) and that the sign-in screen itself renders correctly when reached this way, not looking broken or like an error state

## Safety

- [ ] While offline, open Plan Generator/Plan Adapter and confirm the insert/apply buttons are disabled and labeled "Hors ligne" rather than silently failing after a network timeout
