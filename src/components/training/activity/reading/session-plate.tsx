import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Session plate — first viewport thesis for the activity reading logbook.
 * Identity + optional coach headline + secondary actions.
 */
export function SessionPlate({
  toolbar,
  identity,
  thesis,
  actions,
  className,
}: {
  toolbar: ReactNode;
  identity: ReactNode;
  thesis?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn('activity-log-plate space-y-4', className)}>
      {toolbar}
      <div className="activity-log-plate-body space-y-3">
        {identity}
        {thesis ? <div className="activity-log-thesis">{thesis}</div> : null}
        {actions ? <div className="activity-log-actions">{actions}</div> : null}
      </div>
    </header>
  );
}
