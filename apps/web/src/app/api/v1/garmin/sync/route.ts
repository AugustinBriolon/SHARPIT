// Segment config is read statically — it cannot be re-exported with the handler.
export const maxDuration = 300;
/** Native contract for `/api/garmin/sync` (ADR-040) — same handler, same Clerk authz. */
export { POST } from '@sharpit/server/handlers/garmin/sync/handler';
