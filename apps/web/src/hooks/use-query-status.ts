import type { UseQueryResult } from '@tanstack/react-query';

type QueryLoadState = Pick<UseQueryResult<unknown>, 'isPending'>;

/**
 * True only when the query has no cached data yet (first load).
 * Background refetches keep this false — use for skeletons, not spinners globaux.
 */
export function isInitialQueryLoad(query: QueryLoadState): boolean {
  return query.isPending;
}

/** Skeleton gate when any of several queries is still on its first load. */
export function isAnyInitialQueryLoad(queries: QueryLoadState[]): boolean {
  return queries.some(isInitialQueryLoad);
}
