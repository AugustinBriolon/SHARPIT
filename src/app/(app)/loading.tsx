import { TodayHubSkeleton } from '@/components/today/today-hub-skeleton';

/**
 * Pair of `(app)/page.tsx` (/) — Today chrome.
 * Nested routes use their own `loading.tsx` (training, biology, coach, …).
 */
export default function AppLoading() {
  return <TodayHubSkeleton />;
}
