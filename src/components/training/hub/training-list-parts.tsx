'use client';

import { Plus } from 'lucide-react';
import type { ClientActivity } from '@/lib/query/types';
import { ActivityHistoryVirtualList } from '@/components/training/hub/activity-history-virtual-list';
import { HistoryFilters } from '@/components/training/hub/history-filters';
import { Button } from '@/components/ui/button';
import { InkEmptyState } from '@/components/ui/ink-empty-state';
import { LinkButton } from '@/components/ui/link-button';
import { type TrainingHistoryFilters } from '@/lib/training/periodization/history-filters';
import { CalendarPlus, FilterX, Link2, MoreHorizontal, X } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type WeekGroup = { key: string; label: string; activities: ClientActivity[] };

export function TrainingListToolbar({
  selectionMode,
  hasLinkableHikes,
  counts,
  filters,
  onApplyFilters,
  onToggleSelectionMode,
  onExitSelectionMode,
}: {
  selectionMode: boolean;
  hasLinkableHikes: boolean;
  counts: Record<string, number>;
  filters: TrainingHistoryFilters;
  onApplyFilters: (filters: TrainingHistoryFilters) => void;
  onToggleSelectionMode: () => void;
  onExitSelectionMode: () => void;
}) {
  return (
    <div className="border-analysis-border/40 flex flex-wrap items-center gap-2 border-b pb-3">
      <div className="min-w-0 flex-1">
        <HistoryFilters counts={counts} filters={filters} onApply={onApplyFilters} />
      </div>
      {selectionMode ? (
        <Button size="sm" type="button" variant="secondary" onClick={onExitSelectionMode}>
          <X className="size-3.5" aria-hidden />
          Annuler
        </Button>
      ) : (
        <>
          <LinkButton className="gap-1.5" href="/activite/nouvelle" size="sm">
            <Plus className="size-3.5" aria-hidden />
            Nouvelle activité
          </LinkButton>
          {hasLinkableHikes ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    aria-label="Actions de l'historique"
                    size="icon-sm"
                    type="button"
                    variant="outline"
                  />
                }
              >
                <MoreHorizontal className="size-4" aria-hidden />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-52">
                <DropdownMenuItem className="cursor-pointer gap-2" onClick={onToggleSelectionMode}>
                  <Link2 className="size-3.5" aria-hidden />
                  Lier des randonnées
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </>
      )}
    </div>
  );
}

export function TrainingListEmptyStates({
  activitiesCount,
  weekGroupsCount,
  onClearFilters,
}: {
  activitiesCount: number;
  weekGroupsCount: number;
  onClearFilters: () => void;
}) {
  return (
    <>
      {weekGroupsCount === 0 && activitiesCount === 0 ? (
        <InkEmptyState
          description="Connecte une source ou ajoute une séance manuelle pour construire l’historique."
          title="Aucune activité enregistrée"
          action={
            <LinkButton href="/activite/nouvelle" size="sm" variant="outline">
              <CalendarPlus className="size-3.5" aria-hidden />
              Saisir une activité
            </LinkButton>
          }
          bleed
        />
      ) : null}
      {weekGroupsCount === 0 && activitiesCount > 0 ? (
        <InkEmptyState
          description="Élargis ou réinitialise les filtres pour revoir l’historique."
          title="Aucun résultat pour ces filtres"
          action={
            <Button size="sm" type="button" variant="outline" onClick={onClearFilters}>
              <FilterX className="size-3.5" aria-hidden />
              Effacer les filtres
            </Button>
          }
          bleed
        />
      ) : null}
    </>
  );
}

export function TrainingListWeekGroups({
  weekGroups,
  recordLabelsById,
  selectionMode,
  selectedIds,
  onToggle,
}: {
  weekGroups: WeekGroup[];
  recordLabelsById: Map<string, string>;
  selectionMode: boolean;
  selectedIds: Set<string>;
  onToggle: (activityId: string) => void;
}) {
  if (weekGroups.length === 0) {
    return null;
  }

  return (
    <ActivityHistoryVirtualList
      recordLabelsById={recordLabelsById}
      selectedIds={selectedIds}
      selectionMode={selectionMode}
      weekGroups={weekGroups}
      onToggle={onToggle}
    />
  );
}
