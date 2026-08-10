/**
 * Fire-and-forget warm of the server-side coach context cache.
 * Call when opening Coach chat, Plan generator, or Plan adapter.
 */
export function warmCoachContext(options?: { includeScenario?: boolean }): void {
  if (typeof window === 'undefined') return;
  const includeScenario = options?.includeScenario === true;
  void fetch('/api/coach/prepare', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ includeScenario }),
  }).catch(() => undefined);
}
