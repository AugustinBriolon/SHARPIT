// Segment config is read statically — it cannot be re-exported with the handler.
export const maxDuration = 60;
/** Native contract for `/api/coach/weekly-review` (ADR-040) — same handler, same Clerk authz. */
export { GET, POST } from '@sharpit/server/handlers/coach/weekly-review/handler';
