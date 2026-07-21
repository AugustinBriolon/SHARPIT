import { TodayHubSkeleton } from '@/components/today/today-hub-skeleton';

/**
 * Scoped to `/` only via the `(home)` route group.
 * Do NOT place this at `(app)/loading.tsx` — that Suspense boundary wraps every
 * nested route and flashes Today chrome on hard refresh of /coach, /training, etc.
 * @see https://nextjs.org/learn/dashboard-app/streaming#fixing-the-loading-skeleton-bug-with-route-groups
 */
export default function HomeLoading() {
  return <TodayHubSkeleton />;
}
