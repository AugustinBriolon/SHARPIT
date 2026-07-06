import { cn } from '@/lib/utils';
import { resolvePlannedSessionDisplay } from '@/lib/planned-session-display';
import type { ClientPlannedSession } from '@/lib/query/types';

export function PlannedSessionTypeBadge({
  session,
  referenceDate,
  className,
}: {
  session: ClientPlannedSession;
  referenceDate?: Date;
  className?: string;
}) {
  const { typeLabel, typeColor } = resolvePlannedSessionDisplay(session, referenceDate);

  return (
    <span
      className={cn(
        'shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase',
        typeColor,
        className,
      )}
    >
      {typeLabel}
    </span>
  );
}
