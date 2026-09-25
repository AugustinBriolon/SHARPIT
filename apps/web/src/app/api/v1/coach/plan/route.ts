/** Native contract for `/api/coach/plan` (ADR-040) — same handler, same Clerk authz. */
export { POST } from '@/app/api/coach/plan/route';

// Segment config is read statically — it cannot be re-exported with the handler.
export const maxDuration = 300;
