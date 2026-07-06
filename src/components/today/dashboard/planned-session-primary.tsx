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
    <div className={cn('flex min-w-0 items-center gap-1.5', className)}>
      <PlannedSessionTypeBadge referenceDate={referenceDate} session={session} />
      <p className="truncate text-sm leading-snug font-medium">{title}</p>
    </div>
  );
}
