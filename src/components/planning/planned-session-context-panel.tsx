'use client';

import { AlertTriangle, CloudSun, MapPin, ThermometerSun } from 'lucide-react';
import type { PlannedSessionViewModel } from '@/core/presentation/planned-session-view-model';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function PlannedSessionContextPanel({
  viewModel,
  className,
}: {
  viewModel: PlannedSessionViewModel['context'];
  className?: string;
}) {
  if (!viewModel.visible) return null;

  return (
    <Card className={cn('border-border/60', className)}>
      <CardContent className="space-y-4 p-5">
        <div className="flex items-start gap-2">
          {viewModel.needsLocationConfirmation ? (
            <MapPin className="text-primary mt-0.5 size-4 shrink-0" />
          ) : (
            <ThermometerSun className="text-primary mt-0.5 size-4 shrink-0" />
          )}
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
            {viewModel.conditionsDetail ? (
              <p className="text-muted-foreground text-sm leading-relaxed">
                {viewModel.conditionsDetail}
              </p>
            ) : null}
          </div>
        </div>

        {viewModel.advisories.length > 0 ? (
          <ul className="space-y-2">
            {viewModel.advisories.slice(0, 3).map((advisory) => (
              <li
                key={`${advisory.kind}-${advisory.headline}`}
                className="border-border/50 bg-muted/20 rounded-lg border px-3 py-2"
              >
                <p className="text-foreground flex items-center gap-1.5 text-sm font-medium">
                  {advisory.kind === 'CONFIRM_LOCATION' ? (
                    <AlertTriangle className="size-3.5 shrink-0 text-amber-500" />
                  ) : (
                    <CloudSun className="text-primary size-3.5 shrink-0" />
                  )}
                  {advisory.headline}
                </p>
                <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                  {advisory.rationale}
                </p>
              </li>
            ))}
          </ul>
        ) : null}

        {viewModel.preparation.length > 0 ? (
          <div>
            <p className="text-muted-foreground mb-1.5 text-[11px] font-medium tracking-wider uppercase">
              Préparation
            </p>
            <ul className="text-muted-foreground space-y-1 text-xs">
              {viewModel.preparation.map((item) => (
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

export function PlannedSessionCompletionPanel({
  completion,
  className,
}: {
  completion: NonNullable<PlannedSessionViewModel['completion']>;
  className?: string;
}) {
  if (!completion.visible) return null;

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
