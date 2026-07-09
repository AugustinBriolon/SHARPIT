import { ActivityTypeIndicator } from '@/components/activity/activity-type-indicator';
import type { ClientPlannedSession } from '@/lib/query/types';

export function PlannedSessionTypeBadge({ session }: { session: ClientPlannedSession }) {
  return <ActivityTypeIndicator type={session.type} />;
}
