/**
 * No server-only imports on purpose — this constant is shared by server code
 * (proxy, demo-session.ts, the entry/exit routes) and the client-side
 * `useIsDemoMode()` hook, which reads it directly off `document.cookie`.
 */

/** Set by `/demo`, cleared by `/api/demo/exit`. Presence alone grants access — it
 * only ever resolves to one fixed, read-only tenant, so there is nothing to forge.
 * Not httpOnly, for the same reason: a client-side hook needs to read it too, and
 * forging it grants nothing beyond what visiting /demo already grants for free. */
export const DEMO_COOKIE = 'sharpit_demo';
