import { MessageCircle } from 'lucide-react';
import { LinkButton } from '@/components/ui/link-button';

export function DiscussCoachLink({
  activityId,
  plannedSessionId,
}: {
  activityId: string;
  plannedSessionId?: string | null;
}) {
  const href = plannedSessionId
    ? `/coach?discuss=${plannedSessionId}`
    : `/coach?discussActivity=${activityId}`;

  return (
    <LinkButton href={href} variant="outline">
      <MessageCircle className="size-4" />
      Discuter avec le coach
    </LinkButton>
  );
}
