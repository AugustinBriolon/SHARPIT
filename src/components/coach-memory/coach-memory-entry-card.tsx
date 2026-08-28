'use client';

import { MapPin, Pencil, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatEntryDateRange } from '@/lib/coach-memory/memory-summary';
import {
  coachMemorySourceLabel,
  coachMemoryTypeLabel,
  travelDisciplineLabels,
  travelTrainingConstraintLabel,
  type CoachMemoryEntry,
} from '@/lib/coach-memory/types';
import { cn } from '@/lib/utils';

/**
 * A dated constraint. Only two states are possible here — the API keeps current
 * and upcoming windows only — so anything not active is still ahead.
 */
function coachMemoryEntryLabels(entry: CoachMemoryEntry) {
  const typeLabel = coachMemoryTypeLabel(entry.type);
  const sourceLabel = coachMemorySourceLabel(entry.source);
  const constraintLabel =
    entry.trainingConstraint !== 'FULL'
      ? travelTrainingConstraintLabel(entry.trainingConstraint)
      : null;
  const disciplineText =
    entry.allowedDisciplines.length > 0
      ? travelDisciplineLabels(entry.allowedDisciplines).join(' · ')
      : null;
  const title = entry.label?.trim() || typeLabel || 'Déplacement';
  const metaText = [formatEntryDateRange(entry), disciplineText].filter(Boolean).join(' · ');
  return { typeLabel, sourceLabel, constraintLabel, title, metaText };
}

export function CoachMemoryEntryCard({
  entry,
  highlighted,
  onEdit,
  onDelete,
  deleting,
}: {
  entry: CoachMemoryEntry;
  highlighted?: boolean;
  onEdit: () => void;
  onDelete: () => void;
  deleting?: boolean;
}) {
  const { sourceLabel, constraintLabel, title, metaText } = coachMemoryEntryLabels(entry);

  return (
    <article
      data-memory-id={entry.id}
      id={`memory-${entry.id}`}
      className={cn(
        'rounded-[16px] px-4 py-3.5',
        entry.isActive ? 'border-signal-caution/35 bg-signal-caution/8 border' : 'chip-surface',
        highlighted && 'ring-primary/35 ring-2',
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <h3 className="min-w-0 text-sm font-medium">{title}</h3>
          {entry.isActive ? (
            <span className="text-primary inline-flex shrink-0 items-center gap-1.5 text-xs font-medium">
              <span className="bg-primary size-1.5 rounded-full" aria-hidden />
              En cours
            </span>
          ) : (
            <span className="text-muted-foreground shrink-0 text-xs">À venir</span>
          )}
          {sourceLabel ? (
            <Badge
              className="border-analysis-border text-muted-foreground font-normal"
              variant="outline"
            >
              {sourceLabel}
            </Badge>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {constraintLabel ? (
            <Badge
              className="border-signal-caution/30 bg-signal-caution/10 text-signal-caution font-normal"
              variant="outline"
            >
              {constraintLabel}
            </Badge>
          ) : null}
          <Button
            aria-label={`Modifier ${title}`}
            className="size-8"
            size="icon"
            type="button"
            variant="ghost"
            onClick={onEdit}
          >
            <Pencil className="size-3.5" aria-hidden />
          </Button>
          <Button
            aria-label={`Supprimer ${title}`}
            className="size-8"
            disabled={deleting}
            size="icon"
            type="button"
            variant="ghost"
            onClick={onDelete}
          >
            <Trash2 className="size-3.5" aria-hidden />
          </Button>
        </div>
      </div>

      <div className="mt-1 space-y-1">
        {entry.locationLabel ? (
          <p className="text-muted-foreground flex items-center gap-1.5 text-sm">
            <MapPin className="size-3.5 shrink-0" strokeWidth={2} aria-hidden />
            {entry.locationLabel}
          </p>
        ) : null}

        <p className="text-data text-muted-foreground text-xs tabular-nums">{metaText}</p>

        {entry.note ? (
          <p className="text-muted-foreground pt-1 text-sm leading-relaxed">{entry.note}</p>
        ) : null}
      </div>
    </article>
  );
}
