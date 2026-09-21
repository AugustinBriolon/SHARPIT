# ADR-043: The native app starts provider syncs and fills gaps from Apple Health

**Status:** Accepted  
**Date:** 2026-09-21  
**Author:** Augustin Briolon (with Claude)  
**Supersedes:** N/A  
**Related:** [ADR-040](./ADR-040-ios-product-canonical-api-v1.md)

---

## Context

The server pulls Garmin and the other providers: three scheduled runs a day
(`/api/cron/sync`) or the "sync" buttons in the web settings. The native app only reads
`/api/v1/*`. A night slept or a session done after the last scheduled run therefore stayed
invisible in the app until the athlete opened the web and pressed sync — watch, Garmin
Connect, web, then app.

Apple Health is on the phone already, and Garmin Connect writes to it within seconds of a
watch sync. It is not a substitute for Garmin: Garmin writes sleep and its stages, heart
rate, resting heart rate, steps, energy, weight and workouts without routes or streams, but
never HRV, HRV status, Body Battery, stress, sleep score or Training Readiness. Apple Health
stores HRV as SDNN; Garmin reports an overnight RMSSD.

## Decision

1. **The app starts syncs.** `POST /api/v1/sync` runs, for the signed-in athlete, the same
   per-athlete steps as the scheduled sync (`lib/sync/athlete-provider-sync`), rate-limited
   to one run every two minutes. `GET /api/v1/sync-status` reports when each connected
   provider was last pulled. The app syncs on launch and on return to the foreground when
   the last pull is over fifteen minutes old, and on every pull-to-refresh.
2. **Apple Health fills gaps, never overwrites.** `POST /api/v1/health-samples` receives up
   to 31 day summaries read on the phone. A field is written only when no provider wrote it;
   a night is taken whole or not at all; Apple HRV is ignored while Garmin is connected. The
   next provider sync overwrites what Apple Health filled, so Garmin remains the reference
   and Apple Health only closes the gap until it runs.
3. **Garmin stays a provider.** Apple Health is added beside it, not instead of it.

## Consequences

### Positive

- A night reaches the app when the app opens, without the web.
- Sleep, resting heart rate, steps and weight can reach the server even before a Garmin
  pull, and athletes without Garmin (Apple Watch) get those days at all.

### Negative

- Apple Health values do not go through the observation engine that Garmin ingestion
  feeds; they reach the athlete state through `DailyHealth` only.
- Workouts from Apple Health are not ingested yet: without routes or streams they would
  duplicate Garmin activities with less in them. An Apple Watch–only athlete needs this
  next.
- An on-demand sync can take up to the route's five-minute budget; the app runs it in the
  background and keeps the current data on screen.

### Neutral

- The provider catalogue's `apple-watch` entry stays `coming_soon` on the web: the source is
  native-only until the web can read it too.
