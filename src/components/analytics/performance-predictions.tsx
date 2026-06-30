'use client';

import { Check, Gauge, Loader2, Timer, Zap } from 'lucide-react';
import Link from 'next/link';
import { AnalyticsSection } from '@/components/analytics/analytics-cards';
import { Button } from '@/components/ui/button';
import { useApplyThresholdEstimates, useRecords, useThresholdPreview } from '@/hooks/use-data';
import {
  estimateFtp,
  estimateRunThresholdPace,
  fmtPaceSecPerKm,
  predictRunRaces,
  type PredictionConfidence,
} from '@/lib/performance-predictor';
import { cn } from '@/lib/utils';

const CONFIDENCE_LABEL: Record<PredictionConfidence, string> = {
  high: 'fiable',
  medium: 'approx.',
  low: 'indicatif',
};

const CONFIDENCE_COLOR: Record<PredictionConfidence, string> = {
  high: 'text-emerald-600',
  medium: 'text-amber-600',
  low: 'text-muted-foreground',
};

export function PerformancePredictions() {
  const { data } = useRecords();
  const previewQuery = useThresholdPreview();
  const apply = useApplyThresholdEstimates();

  if (!data) return null;

  const predictions = predictRunRaces(data.runBests, data.runEfforts);
  const thresholdPace = estimateRunThresholdPace(data.runBests, data.runEfforts);
  const ftp = estimateFtp(data.powerCurve, data.bikeEfforts);
  const preview = previewQuery.data;
  const canApply = preview?.hasChanges && (ftp || thresholdPace != null);

  if (predictions.length === 0 && !ftp) return null;

  return (
    <AnalyticsSection
      description="Projections calculées depuis tes meilleurs efforts réels (loi de Riegel pour la course, puissance soutenue pour la FTP). Estimations, pas des objectifs."
      title="Prédictions & seuils estimés"
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ftp && (
            <EstimateCard
              icon={Zap}
              label="FTP estimée"
              meta={`depuis ${ftp.source}`}
              value={`${ftp.watts} W`}
            />
          )}
          {thresholdPace != null && (
            <EstimateCard
              icon={Gauge}
              label="Allure seuil estimée"
              meta="effort soutenable ~1 h"
              value={fmtPaceSecPerKm(thresholdPace)}
            />
          )}
        </div>

        {canApply && (
          <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4">
            <p className="text-sm font-medium">Appliquer au profil athlète</p>
            <ul className="text-muted-foreground mt-2 space-y-1 text-xs">
              {preview?.changes.map((c) => (
                <li key={c.field}>
                  {c.label} : {c.from} → <span className="text-foreground">{c.to}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button disabled={apply.isPending} size="sm" onClick={() => apply.mutate()}>
                {apply.isPending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Check className="size-3.5" />
                )}
                Appliquer les seuils estimés
              </Button>
              <Link
                className="text-muted-foreground hover:text-foreground text-xs"
                href="/settings"
              >
                Voir dans Paramètres →
              </Link>
            </div>
            {apply.isSuccess && (
              <p className="mt-2 text-xs text-emerald-600">
                Seuils enregistrés — zones et TSS recalculés.
              </p>
            )}
            {apply.isError && (
              <p className="text-destructive mt-2 text-xs">{apply.error.message}</p>
            )}
          </div>
        )}

        {predictions.length > 0 && (
          <div className="border-border bg-card rounded-xl border p-4">
            <p className="text-muted-foreground mb-3 flex items-center gap-2 text-xs font-medium tracking-wider uppercase">
              <Timer className="size-3.5" /> Temps de course projetés
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {predictions.map((p) => (
                <div key={p.meters} className="space-y-1">
                  <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                    {p.label}
                  </p>
                  <p className="font-mono text-2xl font-semibold tabular-nums">{p.displayTime}</p>
                  <p className="text-muted-foreground text-xs">{p.pace}</p>
                  <p className={cn('text-[11px] font-medium', CONFIDENCE_COLOR[p.confidence])}>
                    {CONFIDENCE_LABEL[p.confidence]} · base {p.referenceLabel}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AnalyticsSection>
  );
}

function EstimateCard({
  icon: Icon,
  label,
  value,
  meta,
}: {
  icon: typeof Zap;
  label: string;
  value: string;
  meta: string;
}) {
  return (
    <div className="border-border bg-card rounded-xl border p-4">
      <p className="text-muted-foreground flex items-center gap-2 text-xs font-medium tracking-wider uppercase">
        <Icon className="size-3.5" /> {label}
      </p>
      <p className="mt-2 font-mono text-2xl font-semibold tabular-nums">{value}</p>
      <p className="text-muted-foreground mt-1 text-xs">{meta}</p>
    </div>
  );
}
