'use client';

import { CloudSun, MapPin, ThermometerSun } from 'lucide-react';
import type { PlannedSessionViewModel } from '@/core/presentation/planned-session-view-model';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function PlannedSessionLocationConfirmationPanel({
  sessionId,
  viewModel,
  onChangeLocation,
  className,
  onConfirmOutdoor,
  onConfirmIndoor,
  pending,
}: {
  sessionId: string;
  viewModel: PlannedSessionViewModel['context'];
  onChangeLocation?: () => void;
  className?: string;
  onConfirmOutdoor: () => void;
  onConfirmIndoor: () => void;
  pending: boolean;
}) {
  const proposed = viewModel.locationLabel;

  return (
    <Card className={cn('border-border/60', className)}>
      <CardContent className="space-y-3">
        <div className="flex items-start gap-2">
          <MapPin className="text-primary mt-0.5 size-4 shrink-0" />
          <div className="min-w-0 space-y-1">
            <p className="text-label">Lieu de la séance</p>
            <p className="text-foreground text-sm leading-relaxed font-medium">
              {proposed ? `Lieu proposé : ${proposed}` : 'Lieu à préciser'}
            </p>
            <p className="text-muted-foreground text-xs leading-relaxed">
              SHARPIT l’utilise pour anticiper l’impact météo sur ta séance.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={pending || !proposed || viewModel.locationLatitude === null}
            size="sm"
            type="button"
            onClick={onConfirmOutdoor}
          >
            Confirmer
          </Button>
          <Button
            disabled={pending}
            size="sm"
            type="button"
            variant="outline"
            onClick={onConfirmIndoor}
          >
            Intérieur
          </Button>
          {onChangeLocation ? (
            <Button
              disabled={pending}
              size="sm"
              type="button"
              variant="ghost"
              onClick={onChangeLocation}
            >
              Changer
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

export function PlannedSessionContextAdvisoryPanel({
  viewModel,
  className,
}: {
  viewModel: PlannedSessionViewModel['context'];
  className?: string;
}) {
  const advisories = viewModel.advisories.filter((a) => a.kind !== 'CONFIRM_LOCATION').slice(0, 3);
  const prepItems = viewModel.preparation.filter(
    (item) => !item.label.toLowerCase().includes('confirmer'),
  );

  return (
    <Card className={cn('border-border/60', className)}>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-2">
          <ThermometerSun className="text-primary mt-0.5 size-4 shrink-0" />
          <div className="min-w-0 space-y-1">
            <p className="text-label">Contexte avant séance</p>
            {viewModel.conditionsHeadline ? (
              <p className="text-foreground text-sm leading-relaxed font-medium">
                {viewModel.conditionsHeadline}
              </p>
            ) : null}
            {viewModel.impactSummary ? (
              <p className="text-muted-foreground text-sm leading-relaxed">
                {viewModel.impactSummary}
              </p>
            ) : null}
          </div>
        </div>

        {advisories.length > 0 ? (
          <ul className="space-y-2">
            {advisories.map((advisory) => (
              <li
                key={`${advisory.kind}-${advisory.headline}`}
                className="border-border/50 bg-muted/20 rounded-lg border px-3 py-2"
              >
                <p className="text-foreground flex items-center gap-1.5 text-sm font-medium">
                  <CloudSun className="text-primary size-3.5 shrink-0" />
                  {advisory.headline}
                </p>
                <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                  {advisory.rationale}
                </p>
              </li>
            ))}
          </ul>
        ) : null}

        {prepItems.length > 0 ? (
          <div>
            <p className="text-label mb-1.5">Préparation</p>
            <ul className="text-muted-foreground space-y-1 text-xs">
              {prepItems.map((item) => (
                <li key={item.label}>• {item.label}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="text-muted-foreground flex flex-wrap gap-x-3 gap-y-1 text-[11px]">
          {viewModel.locationLabel ? <span>Lieu : {viewModel.locationLabel}</span> : null}
          {viewModel.confidenceLabel ? <span>{viewModel.confidenceLabel}</span> : null}
          {viewModel.freshnessLabel ? <span>{viewModel.freshnessLabel}</span> : null}
        </div>
      </CardContent>
    </Card>
  );
}
