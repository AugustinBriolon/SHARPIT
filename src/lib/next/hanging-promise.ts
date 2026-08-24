/**
 * Cache Components rejects hanging cookies()/connection()/fetch() promises when
 * prerender completes. Callers that catch errors must rethrow these so React
 * can postpone the Suspense boundary instead of baking a false error into the shell.
 */
export function isHangingPromiseRejection(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'digest' in error &&
    (error as { digest: unknown }).digest === 'HANGING_PROMISE_REJECTION'
  );
}
