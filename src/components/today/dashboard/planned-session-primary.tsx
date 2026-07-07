import { cn } from '@/lib/utils';
import { resolvePlannedSessionDisplay } from '@/lib/planned-session-display';
import type { ClientPlannedSession } from '@/lib/query/types';
import { PlannedSessionTypeBadge } from './planned-session-type-badge';

export function PlannedSessionPrimary({
  session,
  referenceDate,
  className,
}: {
  session: ClientPlannedSession;
  referenceDate?: Date;
  className?: string;
}) {
  const { title } = resolvePlannedSessionDisplay(session, referenceDate);

  return (
    <div className={cn('flex min-w-0 flex-1 items-start gap-1.5', className)}>
      <PlannedSessionTypeBadge referenceDate={referenceDate} session={session} />
      <p className="line-clamp-2 min-w-0 text-sm leading-snug font-medium break-words">{title}</p>
    </div>
  );
}
