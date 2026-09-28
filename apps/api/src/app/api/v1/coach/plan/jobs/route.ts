// Segment config is read statically — it cannot be re-exported with the handler. The
// generation runs after the response, within this function's time.
export const maxDuration = 300;
/** Native: a week generated in the background, read back by id or as the latest. */
export { POST, GET } from '@sharpit/server/handlers/coach/plan/jobs/handler';
