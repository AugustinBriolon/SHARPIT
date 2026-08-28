'use client';

import { Button } from '@/components/ui/button';
import { activityTypeLabels } from '@/lib/format';
import { sportIdentityHex } from '@/lib/activity/sport-identity';
import type { ClientPlannedSession } from '@/lib/query/types';
import { Pencil } from 'lucide-react';

export function PlannedSessionReadHeader({
  session,
  isRealized,
  dateLabel,
  onEdit,
}: {
  session: ClientPlannedSession;
  isRealized: boolean;
  dateLabel: string;
  onEdit: () => void;
}) {
  return (
    <header className="space-y-1">
      <div className="flex items-start justify-between gap-2">
        <span className="text-label inline-flex min-w-0 items-center gap-2">
          <span
            className="size-2 shrink-0 rounded-full"
            style={{ backgroundColor: sportIdentityHex(session.type) }}
            aria-hidden
          />
          <span className="truncate">
            {activityTypeLabels[session.type]} ·{' '}
            {isRealized ? 'Séance réalisée' : 'Séance programmée'}
          </span>
        </span>
        <Button
          aria-label="Modifier la séance"
          className="shrink-0"
          size="icon-xs"
          type="button"
          variant="outline"
          onClick={onEdit}
        >
          <Pencil className="size-3.5" />
        </Button>
      </div>
      <h2 className="text-card-title leading-snug">
        {session.title?.trim() || activityTypeLabels[session.type]}
      </h2>
      <p className="text-data text-muted-foreground text-xs">{dateLabel}</p>
    </header>
  );
}
