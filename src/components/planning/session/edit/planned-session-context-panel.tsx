'use client';

import { Skeleton } from '@/components/ui/skeleton';
import type { PlannedSessionViewModel } from '@/core/presentation/planned-session-view-model';
import { usePlannedSessionMutations } from '@/hooks/use-data';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin } from 'lucide-react';
import {
  PlannedSessionContextAdvisoryPanel,
  PlannedSessionLocationConfirmationPanel,
} from '@/components/planning/session/edit/planned-session-context-parts';

export function PlannedSessionContextPanelSkeleton({ className }: { className?: string }) {
  return (
    <Card
      aria-busy="true"
      aria-label="Chargement du lieu de séance"
      className={cn('border-border/60', className)}
    >
      <CardContent className="space-y-3">
        <div className="flex items-start gap-2">
          <MapPin className="text-primary mt-0.5 size-4 shrink-0" />
          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-label">Lieu de la séance</p>
            <Skeleton className="h-4 w-48 max-w-full rounded-full border-0" />
            <Skeleton className="h-3 w-64 max-w-full rounded-full border-0" />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-8 w-24 rounded-lg border-0" />
          <Skeleton className="h-8 w-20 rounded-lg border-0" />
          <Skeleton className="h-8 w-20 rounded-lg border-0" />
        </div>
      </CardContent>
    </Card>
  );
}

export function PlannedSessionContextPanel({
  sessionId,
  viewModel,
  onChangeLocation,
  className,
}: {
  sessionId: string;
  viewModel: PlannedSessionViewModel['context'];
  onChangeLocation?: () => void;
  className?: string;
}) {
  const { update } = usePlannedSessionMutations();

  if (!viewModel.visible) {
    return null;
  }

  if (viewModel.needsLocationConfirmation) {
    const proposed = viewModel.locationLabel;
    const pending = update.isPending;

    function confirmOutdoor() {
      update.mutate({
        id: sessionId,
        data: {
          exposureSetting: 'OUTDOOR',
          locationLabel: proposed,
          locationLat: viewModel.locationLatitude,
          locationLng: viewModel.locationLongitude,
        },
      });
    }

    function confirmIndoor() {
      update.mutate({
        id: sessionId,
        data: {
          exposureSetting: 'INDOOR',
          locationLabel: null,
          locationLat: null,
          locationLng: null,
        },
      });
    }

    return (
      <PlannedSessionLocationConfirmationPanel
        className={className}
        pending={pending}
        sessionId={sessionId}
        viewModel={viewModel}
        onChangeLocation={onChangeLocation}
        onConfirmIndoor={confirmIndoor}
        onConfirmOutdoor={confirmOutdoor}
      />
    );
  }

  return <PlannedSessionContextAdvisoryPanel className={className} viewModel={viewModel} />;
}

export function PlannedSessionCompletionPanel({
  completion,
  className,
}: {
  completion: NonNullable<PlannedSessionViewModel['completion']>;
  className?: string;
}) {
  if (!completion.visible) {
    return null;
  }

  return (
    <Card className={cn('border-border/60', className)}>
      <CardContent className="space-y-3 p-5">
        <p className="text-label">{completion.headline}</p>
        {completion.plannedConditionsLabel && completion.observedConditionsLabel ? (
          <p className="text-muted-foreground text-sm">
            Prévu : {completion.plannedConditionsLabel} · Observé :{' '}
            {completion.observedConditionsLabel}
          </p>
        ) : null}
        {completion.detailLines.map((line) => (
          <p key={line} className="text-foreground text-sm leading-relaxed">
            {line}
          </p>
        ))}
      </CardContent>
    </Card>
  );
}
