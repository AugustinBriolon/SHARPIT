/**
 * Every `/api/*` surface the iOS app still calls (SHARPIT-APP `Networking/*Client.swift`),
 * with the methods it uses. Each has a `/api/v1/<path>` twin that re-exports the same
 * handler — same Clerk Bearer authz, same payload — so the app moves by changing its
 * prefix only. Methods the app does not call stay off the native contract.
 */
export const NATIVE_V1_SURFACES = [
  { path: 'activities', methods: ['GET'] },
  { path: 'activities/[id]', methods: ['GET', 'PATCH'] },
  { path: 'activities/[id]/streams', methods: ['GET'] },
  { path: 'activities/[id]/narrative', methods: ['POST'] },
  { path: 'training-plans', methods: ['GET', 'POST'] },
  { path: 'training-plans/[id]', methods: ['DELETE'] },
  { path: 'coach/conversations', methods: ['GET', 'POST'] },
  { path: 'coach/conversations/[id]', methods: ['GET', 'PUT', 'DELETE'] },
  { path: 'coach/plan', methods: ['POST'] },
  { path: 'coach/adapt', methods: ['POST'] },
  { path: 'coach/context', methods: ['PUT'] },
  { path: 'coach-memory', methods: ['GET', 'POST'] },
  { path: 'coach-memory/[id]', methods: ['DELETE'] },
  { path: 'goals', methods: ['GET', 'POST'] },
  { path: 'goals/[id]', methods: ['PATCH', 'DELETE'] },
  { path: 'day-journal', methods: ['GET', 'PUT'] },
  { path: 'journal/day-signals', methods: ['GET'] },
  { path: 'journal-prefs', methods: ['GET', 'PUT'] },
  { path: 'wellness-checkin', methods: ['GET', 'POST'] },
  { path: 'athlete-profile', methods: ['GET', 'PATCH'] },
  { path: 'athlete-profile/threshold-history', methods: ['GET'] },
  { path: 'body-composition', methods: ['GET'] },
  { path: 'activity-status', methods: ['GET', 'PUT'] },
  { path: 'planned-sessions', methods: ['GET', 'POST'] },
  { path: 'planned-sessions/[id]', methods: ['PATCH', 'DELETE'] },
  { path: 'planned-sessions/[id]/link', methods: ['POST'] },
  { path: 'garmin/workouts/from-planned-session', methods: ['POST'] },
  { path: 'privacy/consent', methods: ['GET', 'POST'] },
  { path: 'onboarding/complete', methods: ['POST'] },
  { path: 'garmin/sync', methods: ['POST'] },
] as const;

/**
 * Native-only surfaces: `/api/v1` routes with their own handler and v1 projection (no
 * `/api` twin). Listed so the contract stays inventoried in one place.
 */
export const NATIVE_V1_ONLY = [
  { path: 'today', methods: ['GET'] },
  { path: 'sleep', methods: ['GET'] },
  { path: 'recovery', methods: ['GET'] },
  { path: 'sync', methods: ['POST'] },
  { path: 'sync-status', methods: ['GET'] },
  { path: 'health-samples', methods: ['POST'] },
  { path: 'push/device-token', methods: ['POST', 'DELETE'] },
  { path: 'push/test', methods: ['POST'] },
  { path: 'body/overview', methods: ['GET'] },
  { path: 'body/series', methods: ['GET'] },
  { path: 'pro', methods: ['GET'] },
  { path: 'billing/apple/app-account-token', methods: ['POST'] },
  { path: 'billing/apple/verify', methods: ['POST'] },
  { path: 'garmin/connect', methods: ['POST'] },
] as const;

/**
 * Called by iOS but deliberately not on `/api/v1` yet. `coach/chat` runs Coach tools
 * that write planned sessions as soon as the model calls them; a native contract waits
 * for the approve-before-apply cards (Lot B) rather than freezing that behaviour.
 */
export const NATIVE_V1_DEFERRED = ['coach/chat'] as const;
