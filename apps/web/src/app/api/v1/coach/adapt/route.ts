/** Native contract for `/api/coach/adapt` (ADR-040) — same handler, same Clerk authz. */
export { POST } from '@/app/api/coach/adapt/route';

// Segment config is read statically — it cannot be re-exported with the handler.
export const maxDuration = 300;
