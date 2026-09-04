'use client';

import type { ClientActivity } from '@/lib/query/types';
import { ActivityList } from '@/components/training/activity/list/activity-list';
import { HistoryFilters } from '@/components/training/hub/history-filters';
import { Button } from '@/components/ui/button';
import { InkEmptyState } from '@/components/ui/ink-empty-state';
import { LinkButton } from '@/components/ui/link-button';
import { type TrainingHistoryFilters } from '@/lib/training/history-filters';
import { CalendarPlus, FilterX, Link2, MoreHorizontal, X } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button as UiButton } from '@/components/ui/button';

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
    <div className="flex flex-wrap items-center gap-2">
      <div className="min-w-0 flex-1">
        <HistoryFilters counts={counts} filters={filters} onApply={onApplyFilters} />
      </div>
      {selectionMode ? (
        <Button size="sm" type="button" variant="secondary" onClick={onExitSelectionMode}>
          <X className="size-3.5" aria-hidden />
          Annuler
        </Button>
      ) : (
        hasLinkableHikes && (
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
        )
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
            <LinkButton href="/training/manual" size="sm" variant="outline">
              <CalendarPlus className="size-3.5" aria-hidden />
              Saisir une activité
            </LinkButton>
          }
        />
      ) : null}
      {weekGroupsCount === 0 && activitiesCount > 0 ? (
        <InkEmptyState
          description="Élargis ou réinitialise les filtres pour revoir l’historique."
          title="Aucun résultat pour ces filtres"
          action={
            <UiButton size="sm" type="button" variant="outline" onClick={onClearFilters}>
              <FilterX className="size-3.5" aria-hidden />
              Effacer les filtres
            </UiButton>
          }
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

  return weekGroups.map((group) => (
    <section key={group.key} className="cv-auto">
      <p className="text-label mb-2 px-0.5">{group.label}</p>
      <ActivityList
        activities={group.activities}
        chipListClassName="sm:grid sm:grid-cols-2 sm:gap-2 sm:space-y-0"
        recordLabelsById={recordLabelsById}
        selectedIds={selectedIds}
        selectionMode={selectionMode}
        variant="chip"
        onToggle={onToggle}
      />
    </section>
  ));
}
