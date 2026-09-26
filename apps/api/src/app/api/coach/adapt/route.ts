// Measured at 58-68s with reasoning: 'medium' — over Vercel's 60s default and
// unreliable right at the edge. 300s matches the other long-running routes
// (cron/sync, garmin/connect) in vercel.json.
export const maxDuration = 300;

export { POST } from '@sharpit/server/handlers/coach/adapt/handler';
