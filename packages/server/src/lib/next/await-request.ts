import { connection } from 'next/server';

/**
 * Opt into request-time rendering before any try/catch that might call
 * cookies()/auth()/fetch().
 *
 * With Cache Components, those APIs return hanging promises during prerender.
 * If the rejection lands inside a catch (or after()/setTimeout), Next logs
 * HANGING_PROMISE_REJECTION. Awaiting `connection()` first lets the interrupt
 * propagate cleanly so the route stays dynamic without build noise.
 */
export async function awaitRequest(): Promise<void> {
  await connection();
}
