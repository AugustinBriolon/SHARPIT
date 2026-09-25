import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { AdaptChange } from '@/hooks/use-coach';
import type { ClientPlannedSession } from '@/lib/query/types';
import { activityTypeLabels } from '@/lib/format';
import { intensityLabels } from '@/lib/planned-session/sessions';
import { cn } from '@/lib/utils';

export const ACTION_LABEL: Record<AdaptChange['action'], string> = {
  MODIFY: 'Modifier',
  REMOVE: 'Supprimer',
  ADD: 'Ajouter',
};

export const ACTION_STYLE: Record<AdaptChange['action'], string> = {
  MODIFY: 'bg-signal-caution/15 text-signal-caution',
  REMOVE: 'bg-signal-risk/15 text-signal-risk',
  ADD: 'bg-primary/15 text-primary',
};

export function formatChangeDate(
  date: string | null | undefined,
  existing: ClientPlannedSession | null | undefined,
): string {
  if (date) {
    return format(parseISO(date), 'EEE d MMM', { locale: fr });
  }
  if (existing?.date) {
    return format(existing.date, 'EEE d MMM', { locale: fr });
  }
  return '';
}

export function changeFieldsSummary(change: AdaptChange): string {
  return [
    change.type ? activityTypeLabels[change.type] : null,
    change.intensity ? intensityLabels[change.intensity] : null,
    change.durationMin !== null ? `${change.durationMin} min` : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

export function adaptChangeRowClass(rejected: boolean, selected: boolean) {
  if (rejected) {
    return 'border-signal-risk/30 bg-signal-risk/5 cursor-not-allowed opacity-80';
  }
  if (selected) {
    return 'border-primary/40 bg-primary/5';
  }
  return 'border-analysis-border/60 bg-analysis-surface-alt/50 opacity-60 hover:opacity-100';
}

export function adaptChangeSelectClass(selected: boolean, rejected: boolean) {
  return cn(
    'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-[4px] border',
    selected && !rejected ? 'border-primary bg-primary text-primary-foreground' : 'border-border',
  );
}
