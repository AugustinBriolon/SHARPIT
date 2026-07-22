'use client';

import { Check, Flag, Gauge, Loader2, Timer, Zap } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { AnalyticsSection } from '@/components/analytics/analytics-cards';
import { PredictionGoalDialog } from '@/components/goals/dialogs/prediction-goal-dialog';
import { Button } from '@/components/ui/button';
import { useApplyThresholdEstimates, useRecords, useThresholdPreview } from '@/hooks/use-data';
import {
  estimateFtp,
  estimateRunThresholdPace,
  fmtPaceSecPerKm,
  predictRunRaces,
  type PredictionConfidence,
  type RunPrediction,
} from '@/lib/training/performance-predictor';
import { cn } from '@/lib/utils';

const CONFIDENCE_LABEL: Record<PredictionConfidence, string> = {
  high: 'fiable',
  medium: 'approx.',
  low: 'indicatif',
};

const CONFIDENCE_COLOR: Record<PredictionConfidence, string> = {
  high: 'text-chart-4',
  medium: 'text-chart-3',
  low: 'text-muted-foreground',
};

export function PerformancePredictions() {
  const { data } = useRecords();
  const previewQuery = useThresholdPreview();
  const apply = useApplyThresholdEstimates();
  const [selectedPrediction, setSelectedPrediction] = useState<RunPrediction | null>(null);

  if (!data) return null;

  const predictions = predictRunRaces(data.runBests, data.runEfforts);
  const thresholdPace = estimateRunThresholdPace(data.runBests, data.runEfforts);
  const ftp = estimateFtp(data.powerCurve, data.bikeEfforts);
  const preview = previewQuery.data;
  const canApply = preview?.hasChanges && (ftp || thresholdPace != null);

  if (predictions.length === 0 && !ftp) return null;

  return (
    <>
      <AnalyticsSection
        description="Ce que ton niveau actuel laisse anticiper — depuis tes meilleurs efforts réels. Estimations, pas des objectifs."
        title="Projection du niveau actuel"
        compact
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
            <div className="analysis-panel rounded-analysis-lg p-4">
              <p className="text-sm font-medium">Appliquer au profil athlète</p>
              <ul className="text-muted-foreground mt-2 space-y-1 text-xs">
                {preview?.changes.map((c) => (
                  <li key={c.field}>
                    {c.label} : <span className="text-data">{c.from}</span> →{' '}
                    <span className="text-data text-foreground">{c.to}</span>
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
                  href="/training/progression?tab=calibration"
                >
                  Voir dans Calibration →
                </Link>
              </div>
              {apply.isSuccess && (
                <p className="text-primary mt-2 text-xs">
                  Seuils enregistrés — zones et TSS recalculés.
                </p>
              )}
              {apply.isError && (
                <p className="text-destructive mt-2 text-xs">{apply.error.message}</p>
              )}
            </div>
          )}

          {predictions.length > 0 && (
            <div
              className="analysis-panel rounded-analysis-lg p-4"
              style={{ boxShadow: 'inset 3px 0 0 var(--color-chart-4)' }}
            >
              <p className="text-muted-foreground mb-3 flex items-center gap-2 text-xs font-medium tracking-wider uppercase">
                <Timer className="size-3.5" /> Temps de course projetés
              </p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {predictions.map((p) => (
                  <div key={p.meters} className="space-y-2">
                    <div className="space-y-1">
                      <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                        {p.label}
                      </p>
                      <p className="text-data text-foreground text-2xl font-semibold">
                        {p.displayTime}
                      </p>
                      <p className="text-data text-muted-foreground text-xs">{p.pace}</p>
                      <p className={cn('text-[11px] font-medium', CONFIDENCE_COLOR[p.confidence])}>
                        {CONFIDENCE_LABEL[p.confidence]} · base {p.referenceLabel}
                      </p>
                    </div>
                    <Button
                      className="h-7 px-2 text-[11px]"
                      size="sm"
                      type="button"
                      variant="outline"
                      onClick={() => setSelectedPrediction(p)}
                    >
                      <Flag className="size-3" />
                      Créer un objectif
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </AnalyticsSection>

      {selectedPrediction ? (
        <PredictionGoalDialog
          prediction={selectedPrediction}
          onClose={() => setSelectedPrediction(null)}
        />
      ) : null}
    </>
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
    <div className="analysis-panel rounded-analysis-lg p-4">
      <p className="text-muted-foreground flex items-center gap-2 text-xs font-medium tracking-wider uppercase">
        <Icon className="size-3.5" /> {label}
      </p>
      <p className="text-data text-foreground mt-2 text-2xl font-semibold">{value}</p>
      <p className="text-data text-muted-foreground mt-1 text-xs">{meta}</p>
    </div>
  );
}
