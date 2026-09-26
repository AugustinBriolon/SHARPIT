// Segment config is read statically — it cannot be re-exported with the handler.
export const maxDuration = 60;
/** Native contract for `/api/activities/[id]/narrative` (ADR-040) — same handler, same Clerk authz. */
export { POST } from '@sharpit/server/handlers/activities/[id]/narrative/handler';
