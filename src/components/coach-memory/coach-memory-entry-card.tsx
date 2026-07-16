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
        'analysis-panel rounded-analysis px-4 py-4 transition-shadow',
        highlighted && 'ring-primary/40 ring-2',
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          {(typeLabel || sourceLabel || entry.isActive || constraintLabel) && (
            <div className="flex flex-wrap items-center gap-2">
              {typeLabel ? (
                <Badge className="rounded-full font-normal" variant="outline">
                  {typeLabel}
                </Badge>
              ) : null}
              {sourceLabel ? (
                <Badge
                  variant="outline"
                  className={cn(
                    'rounded-full font-normal',
                    entry.source === 'COACH'
                      ? 'border-primary/30 bg-primary/5 text-primary'
                      : 'text-muted-foreground',
                  )}
                >
                  {sourceLabel}
                </Badge>
              ) : null}
              {constraintLabel ? (
                <Badge
                  className="rounded-full border-amber-500/30 bg-amber-500/10 font-normal text-amber-800 dark:text-amber-300"
                  variant="outline"
                >
                  {constraintLabel}
                </Badge>
              ) : null}
              {entry.isActive ? (
                <Badge
                  className="rounded-full border-emerald-500/30 bg-emerald-500/10 font-normal text-emerald-700 dark:text-emerald-400"
                  variant="outline"
                >
                  Actif
                </Badge>
              ) : null}
            </div>
          )}

          <div>
            <h3 className="text-sm font-medium">{title}</h3>
            {entry.locationLabel ? (
              <p className="text-muted-foreground mt-1 flex items-center gap-1.5 text-sm">
                <MapPin className="size-3.5 shrink-0" />
                {entry.locationLabel}
              </p>
            ) : null}
            <p className="text-data text-muted-foreground mt-1 text-xs tabular-nums">{dateRange}</p>
            {disciplineText ? (
              <p className="text-muted-foreground mt-1 text-xs">{disciplineText}</p>
            ) : null}
            {entry.note ? (
              <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{entry.note}</p>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Button
            aria-label={`Modifier ${title}`}
            size="icon"
            type="button"
            variant="ghost"
            onClick={onEdit}
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            aria-label={`Supprimer ${title}`}
            disabled={deleting}
            size="icon"
            type="button"
            variant="ghost"
            onClick={onDelete}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>
    </article>
  );
}
