'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ActivityCompositionSkeleton,
  ActivityPerformanceSkeleton,
} from '@/components/training/activity/detail/activity-detail-skeleton';
import { useMultisportStreams } from '@/hooks/use-data';
import type { MultisportLegKind } from '@/lib/multisport';
import type { MultisportLegStream } from '@/lib/streams/streams';
import { cn } from '@/lib/utils';
import { SportLegInsights } from '@/components/training/activity/insights/sport-leg-insights';
import { sportHeader } from '@/components/training/activity/insights/sport-leg-insights-shared';

function legKey(entry: MultisportLegStream): string {
  return entry.leg.garminActivityId ?? entry.leg.kind;
}

function resolveSelectedLeg(
  legs: MultisportLegStream[],
  selectedKey: string | null,
): MultisportLegStream | null {
  if (selectedKey !== null && legs.some((entry) => legKey(entry) === selectedKey)) {
    return legs.find((entry) => legKey(entry) === selectedKey) ?? null;
  }
  return legs[0] ?? null;
}

function SportLegSelector({
  legs,
  selectedKey,
  onSelect,
}: {
  legs: MultisportLegStream[];
  selectedKey: string;
  onSelect: (key: string) => void;
}) {
  return (
    <div className="surface-shell inline-flex flex-wrap gap-1 rounded-full p-1">
      {legs.map((entry) => {
        const key = legKey(entry);
        const active = key === selectedKey;
        const Icon = sportHeader[entry.leg.kind as Exclude<MultisportLegKind, 'transition'>].icon;
        return (
          <button
            key={key}
            aria-pressed={active}
            type="button"
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
              active
                ? 'bg-highlight text-highlight-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
            onClick={() => onSelect(key)}
          >
            <Icon className="size-3.5 shrink-0 opacity-80" />
            {entry.leg.label}
          </button>
        );
      })}
    </div>
  );
}

export function TriathlonActivityInsights({ activityId }: { activityId: string }) {
  const { data, isPending, isError } = useMultisportStreams(activityId);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const legs = data?.legs ?? [];
  const selectedEntry = useMemo(() => resolveSelectedLeg(legs, selectedKey), [legs, selectedKey]);

  if (isPending) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Skeleton className="h-4 w-36 rounded-full border-0" />
          <Skeleton className="h-8 w-56 rounded-full border-0" />
        </div>
        <ActivityCompositionSkeleton withCoach={false} />
        <ActivityPerformanceSkeleton />
      </div>
    );
  }

  if (isError || legs.length === 0 || !selectedEntry) {
    return (
      <Card>
        <CardContent className="text-muted-foreground py-6 text-sm">
          Données détaillées par sport indisponibles (synchronisation Garmin en cours ou activité
          sans jambes enregistrées).
        </CardContent>
      </Card>
    );
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-label">Analyse par sport</p>
        <SportLegSelector
          legs={legs}
          selectedKey={legKey(selectedEntry)}
          onSelect={setSelectedKey}
        />
      </div>

      <SportLegInsights key={legKey(selectedEntry)} entry={selectedEntry} />
    </section>
  );
}
