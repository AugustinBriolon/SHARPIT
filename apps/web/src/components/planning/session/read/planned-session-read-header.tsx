'use client';

import { activityTypeLabels } from '@sharpit/app/lib/format';
import { sportIdentityHex } from '@sharpit/app/lib/activity/sport-identity';
import type { ClientPlannedSession } from '@sharpit/app/lib/query/types';
import {
  PlannedSessionReadActionsMenu,
  type PlannedSessionHeaderActions,
} from '@/components/planning/session/read/planned-session-read-actions-menu';

function PlannedSessionPlannedHeaderBody({
  session,
  dateLabel,
  intentLine,
  actions,
}: {
  session: ClientPlannedSession;
  dateLabel: string;
  intentLine?: string | null;
  actions: PlannedSessionHeaderActions;
}) {
  const sport = activityTypeLabels[session.type];

  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0 space-y-2">
        <p className="text-muted-foreground flex min-w-0 items-center gap-2 text-xs">
          <span
            className="size-2 shrink-0 rounded-full"
            style={{ backgroundColor: sportIdentityHex(session.type) }}
            aria-hidden
          />
          <span className="truncate">
            {sport} · Programmée · {dateLabel}
          </span>
        </p>
        <h2 className="text-foreground text-xl leading-tight font-semibold tracking-tight text-pretty sm:text-2xl">
          {session.title?.trim() || sport}
        </h2>
        {intentLine ? (
          <p className="text-data text-foreground/80 text-sm leading-snug font-medium tabular-nums">
            {intentLine}
          </p>
        ) : null}
      </div>
      <PlannedSessionReadActionsMenu {...actions} />
    </div>
  );
}

/**
 * Planned: sport · status · date + intent + actions.
 * Realized: actions only — title/date/activity already live on the surface that opened the modal.
 */
export function PlannedSessionReadHeader({
  session,
  isRealized,
  dateLabel,
  intentLine,
  actions,
}: {
  session: ClientPlannedSession;
  isRealized: boolean;
  dateLabel: string;
  intentLine?: string | null;
  actions: PlannedSessionHeaderActions;
}) {
  if (isRealized) {
    return (
      <div className="absolute top-2 right-10 z-10">
        <PlannedSessionReadActionsMenu {...actions} />
      </div>
    );
  }

  return (
    <header className="space-y-3">
      <PlannedSessionPlannedHeaderBody
        actions={actions}
        dateLabel={dateLabel}
        intentLine={intentLine}
        session={session}
      />
    </header>
  );
}
