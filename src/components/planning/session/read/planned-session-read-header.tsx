'use client';

import { Button } from '@/components/ui/button';
import { activityTypeLabels } from '@/lib/format';
import { sportIdentityHex } from '@/lib/activity/sport-identity';
import type { ClientPlannedSession } from '@/lib/query/types';
import { Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Session anchor — title leads; meta and intent sit under it (no chip inventory).
 */
export function PlannedSessionReadHeader({
  session,
  isRealized,
  dateLabel,
  intentLine,
  onEdit,
}: {
  session: ClientPlannedSession;
  isRealized: boolean;
  dateLabel: string;
  intentLine?: string | null;
  onEdit: () => void;
}) {
  const sport = activityTypeLabels[session.type];
  const status = isRealized ? 'Réalisée' : 'Programmée';

  return (
    <header className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <p className="text-muted-foreground flex min-w-0 items-center gap-2 text-xs">
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: sportIdentityHex(session.type) }}
              aria-hidden
            />
            <span className="truncate">
              {sport} · {status} · {dateLabel}
            </span>
          </p>
          <h2
            className={cn(
              'text-foreground text-pretty',
              isRealized
                ? 'text-card-title leading-snug'
                : 'text-xl leading-tight font-semibold tracking-tight sm:text-2xl',
            )}
          >
            {session.title?.trim() || sport}
          </h2>
          {!isRealized && intentLine ? (
            <p className="text-data text-foreground/80 text-sm leading-snug font-medium tabular-nums">
              {intentLine}
            </p>
          ) : null}
        </div>
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
    </header>
  );
}
