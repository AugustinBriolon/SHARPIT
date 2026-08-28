import { GoalPriority } from '@prisma/client';
import { Calendar, MapPin } from 'lucide-react';
import { CardDescription, CardTitle } from '@/components/ui/card';
import type { GoalItem } from '@/components/goals/cards/goal-cards';
import { daysUntil, priorityDescriptions, priorityLabels } from '@/lib/goals/goals';
import { horizonLabels } from '@/lib/goals/goals';
import { cn } from '@/lib/utils';

export function formatLongDate(value: string | Date): string {
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value));
}

export function countdownLabel(days: number): string {
  if (days > 0) {
    return `J-${days}`;
  }
  if (days < 0) {
    return `J+${Math.abs(days)}`;
  }
  return 'Jour J';
}

export function deadlineCopy(days: number): string {
  if (days < 0) {
    return `Échéance dépassée de ${Math.abs(days)} jour${Math.abs(days) > 1 ? 's' : ''}`;
  }
  if (days === 0) {
    return 'Échéance aujourd\u2019hui';
  }
  if (days === 1) {
    return 'Échéance demain';
  }
  return `Échéance dans ${days} jours`;
}

export function taperWindowCopy(days: number | null): string | null {
  if (days === null || days < 0 || days > 14) {
    return null;
  }
  if (days === 0) {
    return 'Jour de course';
  }
  return 'Fenêtre d\u2019affûtage';
}

export function PriorityAnnotation({ priority }: { priority: GoalPriority }) {
  return (
    <p className="text-muted-foreground text-xs leading-snug">
      <span
        className={cn(
          'font-medium',
          priority === GoalPriority.A ? 'text-primary' : 'text-foreground',
        )}
      >
        {priorityLabels[priority]}
      </span>
      <span aria-hidden> — </span>
      {priorityDescriptions[priority]}
    </p>
  );
}

export function metricGoalSubtitle(goal: GoalItem, subtitle: string | null) {
  if (subtitle) {
    return <CardDescription className="mt-0.5 text-xs">{subtitle}</CardDescription>;
  }
  if (goal.horizon) {
    return (
      <CardDescription className="mt-0.5 text-xs">{horizonLabels[goal.horizon]}</CardDescription>
    );
  }
  return null;
}

export function RaceCardMeta({
  dateLabel,
  location,
}: {
  dateLabel: string | null;
  location: string | null;
}) {
  return (
    <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
      {dateLabel ? (
        <span className="flex items-center gap-1 capitalize">
          <Calendar className="text-primary size-3.5" aria-hidden />
          {dateLabel}
        </span>
      ) : null}
      {location ? (
        <span className="flex items-center gap-1">
          <MapPin className="text-primary size-3.5" aria-hidden />
          {location}
        </span>
      ) : null}
    </div>
  );
}

export function RaceCardCountdown({ goal }: { goal: GoalItem }) {
  const days = daysUntil(goal.targetDate ? new Date(goal.targetDate) : null);
  if (days === null) {
    return null;
  }
  return (
    <p className="text-data text-primary font-mono text-3xl font-semibold tabular-nums">
      {countdownLabel(days)}
    </p>
  );
}

export function RaceCardDetails({ goal }: { goal: GoalItem }) {
  const date = goal.targetDate ? new Date(goal.targetDate) : null;
  const dateLabel = date ? formatLongDate(date) : null;
  const taperCopy = taperWindowCopy(daysUntil(date));

  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0 space-y-1.5">
        {goal.priority ? <PriorityAnnotation priority={goal.priority} /> : null}
        {goal.raceFormat ? <p className="text-primary/80 text-label">{goal.raceFormat}</p> : null}
        <CardTitle>{goal.title}</CardTitle>
        <RaceCardMeta dateLabel={dateLabel} location={goal.location} />
        {taperCopy ? <p className="text-primary text-xs font-medium">{taperCopy}</p> : null}
      </div>
      <RaceCardCountdown goal={goal} />
    </div>
  );
}
