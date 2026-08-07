'use client';

import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { MapPin, Pencil, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  coachMemorySourceLabel,
  coachMemoryTypeLabel,
  travelDisciplineLabels,
  travelTrainingConstraintLabel,
  type CoachMemoryEntry,
} from '@/lib/coach-memory/types';
import { cn } from '@/lib/utils';

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
  const dateRange = `${format(parseISO(entry.startDate), 'd MMM yyyy', { locale: fr })} — ${format(parseISO(entry.endDate), 'd MMM yyyy', { locale: fr })}`;

  return (
    <article
      data-memory-id={entry.id}
      id={`memory-${entry.id}`}
      className={cn(
        'border-analysis-border border-b px-1 py-4 last:border-b-0',
        highlighted && 'bg-primary/5 -mx-2 rounded-lg px-3',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <h3 className="text-sm font-medium">{title}</h3>
            {entry.isActive ? <span className="text-primary text-data text-xs">Actif</span> : null}
            {constraintLabel ? (
              <Badge
                className="border-signal-caution/30 bg-signal-caution/10 text-signal-caution rounded-full font-normal"
                variant="outline"
              >
                {constraintLabel}
              </Badge>
            ) : null}
          </div>

          {entry.locationLabel ? (
            <p className="text-muted-foreground flex items-center gap-1.5 text-sm">
              <MapPin className="size-3.5 shrink-0" aria-hidden />
              {entry.locationLabel}
            </p>
          ) : null}

          <p className="text-data text-muted-foreground text-xs tabular-nums">{dateRange}</p>

          {(typeLabel || sourceLabel || disciplineText) && (
            <p className="text-muted-foreground text-xs">
              {[typeLabel, sourceLabel, disciplineText].filter(Boolean).join(' · ')}
            </p>
          )}

          {entry.note ? (
            <p className="text-muted-foreground mt-1 text-sm leading-relaxed">{entry.note}</p>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          <Button
            aria-label={`Modifier ${title}`}
            size="icon"
            type="button"
            variant="ghost"
            onClick={onEdit}
          >
            <Pencil className="size-4" aria-hidden />
          </Button>
          <Button
            aria-label={`Supprimer ${title}`}
            disabled={deleting}
            size="icon"
            type="button"
            variant="ghost"
            onClick={onDelete}
          >
            <Trash2 className="size-4" aria-hidden />
          </Button>
        </div>
      </div>
    </article>
  );
}
