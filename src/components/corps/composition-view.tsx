'use client';

import { AlertTriangle, Scale } from 'lucide-react';
import { useMemo, useState } from 'react';
import { CompositionMetricCard } from '@/components/corps/composition-metric-card';
import { CompositionMetricExplainer } from '@/components/corps/composition-metric-explainer';
import {
  CorpsDisclaimer,
  CorpsDivider,
  CorpsEmptyState,
  CorpsPanel,
  type CorpsTone,
} from '@/components/corps/corps-ui';
import { MetricLineChart } from '@/components/recovery/health-charts';
import { Skeleton } from '@/components/ui/skeleton';
import {
  buildCompositionSeries,
  computeCompositionTrend,
  formatCompositionDelta,
} from '@/lib/body-composition';
import {
  getGuide,
  type CompositionContext,
  type CompositionMetricId,
} from '@/lib/composition-metric-guides';
import { useBodyComposition, useAthleteProfile } from '@/hooks/use-data';
import { athleteCompositionContext } from '@/lib/athlete-profile-utils';
import { parseWithingsEcgStats } from '@/lib/withings-ecg-display';
import { cn } from '@/lib/utils';
import type { ClientBodyCompositionEntry } from '@/lib/query/types';

function heightFromEntry(entry: ClientBodyCompositionEntry | null): number | null {
  if (entry?.withingsExtras == null || typeof entry.withingsExtras !== 'object') return null;
  const h = (entry.withingsExtras as { heightM?: number }).heightM;
  return h != null && h > 0 ? h : null;
}

function sourceLabel(source: ClientBodyCompositionEntry['source']): string {
  return source === 'WITHINGS' ? 'Withings' : 'Renpho';
}

function toneFromGuide(id: CompositionMetricId, value: number, ctx: CompositionContext): CorpsTone {
  return getGuide(id).interpret(value, ctx).tone;
}

type ExplainState = {
  id: CompositionMetricId;
  value: number;
  displayValue: string;
};

function CompositionSection({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <CorpsDivider label={label} />
      {description && (
        <p className="text-muted-foreground -mt-1 text-xs leading-relaxed">{description}</p>
      )}
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </section>
  );
}

export function CompositionView({ embedded: _embedded = false }: { embedded?: boolean }) {
  const query = useBodyComposition();
  const profileQuery = useAthleteProfile();
  const entries = useMemo(() => query.data ?? [], [query.data]);
  const latest = useMemo(() => entries[0] ?? null, [entries]);
  const series = useMemo(() => buildCompositionSeries(entries, 90), [entries]);

  const weight = useMemo(() => computeCompositionTrend(entries, 'weightKg'), [entries]);
  const bodyFat = useMemo(() => computeCompositionTrend(entries, 'bodyFatPct'), [entries]);
  const muscle = useMemo(() => computeCompositionTrend(entries, 'musclePct'), [entries]);
  const visceral = useMemo(() => computeCompositionTrend(entries, 'visceralFat'), [entries]);
  const bmi = useMemo(() => computeCompositionTrend(entries, 'bmi'), [entries]);

  const context = useMemo<CompositionContext>(() => {
    const profileCtx = athleteCompositionContext(profileQuery.data);
    return {
      heightM: profileCtx.heightM ?? heightFromEntry(latest),
      weightKg: latest?.weightKg ?? null,
      chronologicalAgeYears: profileCtx.chronoAge,
    };
  }, [latest, profileQuery.data]);

  const ecgStats = useMemo(
    () => parseWithingsEcgStats(latest?.withingsExtras),
    [latest?.withingsExtras],
  );
  const bmiDisplay = latest?.bmi ?? bmi.latest;
  const metabolicAgeDisplay = latest?.metabolicAge ?? latest?.bodyAge;

  const [explain, setExplain] = useState<ExplainState | null>(null);

  function openExplain(id: CompositionMetricId, value: number, displayValue: string) {
    setExplain({ id, value, displayValue });
  }

  const hasBodyScan =
    latest?.vascularAgeYears != null ||
    latest?.nerveHealthScore != null ||
    latest?.pulseWaveVelocity != null ||
    latest?.skinConductance != null ||
    latest?.vo2Max != null ||
    ecgStats.length > 0;

  if (query.isPending) return <CompositionSkeleton />;

  if (entries.length === 0) {
    return (
      <div className="space-y-4">
        <CorpsDisclaimer icon={AlertTriangle} title="Lecture indicative, pas une mesure médicale">
          Les balances estiment la composition via impédancemétrie : utile pour les{' '}
          <em>tendances</em>, pas comme référence médicale.
        </CorpsDisclaimer>
        <CorpsEmptyState
          description="Connecte Withings ou Renpho dans les réglages pour synchroniser ta balance."
          icon={Scale}
          title="Aucune mesure importée"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <CorpsDisclaimer icon={AlertTriangle} title="Lecture indicative, pas une mesure médicale">
        Impédancemétrie = tendances utiles, écart possible vs DEXA. Hydratation, repas et heure de
        pesée influencent le résultat du jour.
      </CorpsDisclaimer>

      {/* Hero — synthèse du jour */}
      <CorpsPanel className="overflow-hidden p-0">
        <div className="flex flex-col gap-5 px-5 py-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-muted-foreground text-[11px] font-medium tracking-[0.15em] uppercase">
              Dernière pesée
            </p>
            <p className="font-heading mt-1 text-4xl font-semibold tabular-nums">
              {weight.latest != null ? `${weight.latest}` : '—'}
              <span className="text-muted-foreground ml-1 text-lg font-normal">kg</span>
            </p>
            <p className="text-muted-foreground mt-1 text-sm">
              {latest
                ? new Date(latest.measuredAt).toLocaleString('fr-FR', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })
                : '—'}
              {latest && (
                <span className="bg-muted text-muted-foreground ml-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium uppercase">
                  {sourceLabel(latest.source)}
                </span>
              )}
            </p>
            {weight.delta != null && (
              <p
                className={cn(
                  'mt-2 text-xs font-medium',
                  weight.delta > 0 && 'text-amber-600',
                  weight.delta < 0 && 'text-emerald-600',
                )}
              >
                {formatCompositionDelta(weight.delta, ' kg')} vs 7 jours
              </p>
            )}
          </div>

          <div className="grid min-w-[min(100%,280px)] grid-cols-3 gap-3 sm:gap-4">
            <HeroMini
              delta={formatCompositionDelta(bodyFat.delta, ' pts')}
              label="Masse grasse"
              unit="%"
              value={bodyFat.latest}
            />
            <HeroMini
              delta={formatCompositionDelta(muscle.delta, ' pts')}
              label="Muscle"
              unit="%"
              value={muscle.latest}
            />
            <HeroMini
              delta={formatCompositionDelta(visceral.delta, ' pts')}
              label="Viscéral"
              value={visceral.latest}
            />
          </div>
        </div>
      </CorpsPanel>

      <CompositionSection label="Composition corporelle">
        {bmiDisplay != null && (
          <CompositionMetricCard
            footer="Repère poids / taille²"
            guideId="bmi"
            label="IMC"
            tone={toneFromGuide('bmi', bmiDisplay, context)}
            value={`${bmiDisplay}`}
            onExplain={(id) => openExplain(id, bmiDisplay, `${bmiDisplay}`)}
          />
        )}
        {bodyFat.latest != null && (
          <CompositionMetricCard
            footer={formatCompositionDelta(bodyFat.delta, ' pts vs 7j')}
            guideId="bodyFatPct"
            label="Masse grasse"
            tone={toneFromGuide('bodyFatPct', bodyFat.latest, context)}
            value={`${bodyFat.latest} %`}
            onExplain={(id) => openExplain(id, bodyFat.latest!, `${bodyFat.latest} %`)}
          />
        )}
        {muscle.latest != null && (
          <CompositionMetricCard
            footer={formatCompositionDelta(muscle.delta, ' pts vs 7j')}
            guideId="musclePct"
            label="Muscle"
            tone={toneFromGuide('musclePct', muscle.latest, context)}
            value={`${muscle.latest} %`}
            onExplain={(id) => openExplain(id, muscle.latest!, `${muscle.latest} %`)}
          />
        )}
        {visceral.latest != null && (
          <CompositionMetricCard
            footer={formatCompositionDelta(visceral.delta, ' pts vs 7j')}
            guideId="visceralFat"
            label="Graisse viscérale"
            tone={toneFromGuide('visceralFat', visceral.latest, context)}
            value={`${visceral.latest}`}
            onExplain={(id) => openExplain(id, visceral.latest!, `${visceral.latest}`)}
          />
        )}
        {latest?.fatFreeWeightKg != null && (
          <CompositionMetricCard
            label="Masse maigre"
            value={`${latest.fatFreeWeightKg.toFixed(1)} kg`}
          />
        )}
        {latest?.boneKg != null && (
          <CompositionMetricCard label="Masse osseuse" value={`${latest.boneKg.toFixed(2)} kg`} />
        )}
      </CompositionSection>

      <CompositionSection label="Métabolisme & hydratation">
        {latest?.waterPct != null && (
          <CompositionMetricCard
            guideId="waterPct"
            label="Eau corporelle"
            tone={toneFromGuide('waterPct', latest.waterPct, context)}
            value={`${latest.waterPct.toFixed(1)} %`}
            onExplain={(id) => {
              const v = latest.waterPct!;
              openExplain(id, v, `${v.toFixed(1)} %`);
            }}
          />
        )}
        {latest?.bmr != null && (
          <CompositionMetricCard
            guideId="bmr"
            label="Métabolisme basal"
            tone={toneFromGuide('bmr', latest.bmr, context)}
            value={`${Math.round(latest.bmr)} kcal`}
            onExplain={(id) => openExplain(id, latest.bmr!, `${Math.round(latest.bmr!)} kcal`)}
          />
        )}
        {metabolicAgeDisplay != null && (
          <CompositionMetricCard
            guideId="metabolicAge"
            label="Âge métabolique"
            tone={toneFromGuide('metabolicAge', metabolicAgeDisplay, context)}
            value={`${metabolicAgeDisplay} ans`}
            onExplain={(id) => openExplain(id, metabolicAgeDisplay, `${metabolicAgeDisplay} ans`)}
          />
        )}
      </CompositionSection>

      {hasBodyScan && latest && (
        <CompositionSection label="Cardio & nerveux">
          {latest.vascularAgeYears != null && (
            <CompositionMetricCard
              guideId="vascularAgeYears"
              label="Âge vasculaire"
              tone={toneFromGuide('vascularAgeYears', latest.vascularAgeYears, context)}
              value={`${latest.vascularAgeYears} ans`}
              onExplain={(id) =>
                openExplain(id, latest.vascularAgeYears!, `${latest.vascularAgeYears} ans`)
              }
            />
          )}
          {latest.pulseWaveVelocity != null && (
            <CompositionMetricCard
              guideId="pulseWaveVelocity"
              label="Onde de pouls (PWV)"
              tone={toneFromGuide('pulseWaveVelocity', latest.pulseWaveVelocity, context)}
              value={`${latest.pulseWaveVelocity.toFixed(1)} m/s`}
              onExplain={(id) =>
                openExplain(
                  id,
                  latest.pulseWaveVelocity!,
                  `${latest.pulseWaveVelocity!.toFixed(1)} m/s`,
                )
              }
            />
          )}
          {latest.nerveHealthScore != null && (
            <CompositionMetricCard
              guideId="nerveHealthScore"
              label="Santé nerveuse"
              tone={toneFromGuide('nerveHealthScore', latest.nerveHealthScore, context)}
              value={`${Math.round(latest.nerveHealthScore)}`}
              onExplain={(id) =>
                openExplain(id, latest.nerveHealthScore!, `${Math.round(latest.nerveHealthScore!)}`)
              }
            />
          )}
          {latest.nerveResponseScore != null && (
            <CompositionMetricCard
              guideId="nerveResponseScore"
              label="Réponse nerveuse"
              tone={toneFromGuide('nerveResponseScore', latest.nerveResponseScore, context)}
              value={`${Math.round(latest.nerveResponseScore)}`}
              onExplain={(id) =>
                openExplain(
                  id,
                  latest.nerveResponseScore!,
                  `${Math.round(latest.nerveResponseScore!)}`,
                )
              }
            />
          )}
          {latest.skinConductance != null && (
            <CompositionMetricCard
              guideId="skinConductance"
              label="Conductance (ESC)"
              tone={toneFromGuide('skinConductance', latest.skinConductance, context)}
              value={`${latest.skinConductance.toFixed(0)}`}
              onExplain={(id) =>
                openExplain(id, latest.skinConductance!, `${latest.skinConductance!.toFixed(0)}`)
              }
            />
          )}
          {latest.vo2Max != null && (
            <CompositionMetricCard
              guideId="vo2Max"
              label="VO₂ max est."
              tone={toneFromGuide('vo2Max', latest.vo2Max, context)}
              value={`${latest.vo2Max.toFixed(1)}`}
              onExplain={(id) =>
                openExplain(id, latest.vo2Max!, `${latest.vo2Max!.toFixed(1)} ml/kg/min`)
              }
            />
          )}
          {latest.heartRate != null && (
            <CompositionMetricCard
              guideId="heartRate"
              label="FC debout"
              tone={toneFromGuide('heartRate', latest.heartRate, context)}
              value={`${latest.heartRate} bpm`}
              onExplain={(id) => openExplain(id, latest.heartRate!, `${latest.heartRate} bpm`)}
            />
          )}
          {ecgStats.map((stat) => (
            <CompositionMetricCard
              key={stat.type}
              guideId={stat.guideId}
              label={stat.label}
              tone={toneFromGuide(stat.guideId, stat.value, context)}
              value={stat.displayValue}
              onExplain={(id) => openExplain(id, stat.value, stat.displayValue)}
            />
          ))}
        </CompositionSection>
      )}

      <section className="space-y-3">
        <CorpsDivider label="Tendances · 90 jours" />
        <p className="text-muted-foreground text-xs leading-relaxed">
          Une mesure par jour (la plus récente). Les variations peuvent refléter le bruit autant
          qu&apos;un vrai changement.
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          <MetricLineChart
            color="#2563eb"
            data={series}
            dataKey="weightKg"
            subtitle="Pesées balance"
            title="Poids"
            unit="kg"
          />
          <MetricLineChart
            color="#dc2626"
            data={series}
            dataKey="bodyFatPct"
            subtitle="Estimation impédancemétrie"
            title="Masse grasse"
            unit="%"
          />
          <MetricLineChart
            color="#16a34a"
            data={series}
            dataKey="musclePct"
            subtitle="Part du poids total"
            title="Muscle"
            unit="%"
          />
          <MetricLineChart
            color="#ea580c"
            data={series}
            dataKey="visceralFat"
            subtitle="Indice viscéral"
            title="Graisse viscérale"
          />
        </div>
      </section>

      {explain && (
        <CompositionMetricExplainer
          context={context}
          displayValue={explain.displayValue}
          metricId={explain.id}
          open={explain != null}
          value={explain.value}
          onOpenChange={(open) => !open && setExplain(null)}
        />
      )}
    </div>
  );
}

function HeroMini({
  label,
  value,
  unit,
  delta,
}: {
  label: string;
  value: number | null;
  unit?: string;
  delta?: string | null;
}) {
  return (
    <div className="bg-background/50 rounded-xl border px-3 py-2.5 text-center">
      <p className="text-muted-foreground text-[9px] font-semibold tracking-[0.12em] uppercase">
        {label}
      </p>
      <p className="mt-1 text-lg font-bold tabular-nums">
        {value != null ? value : '—'}
        {unit && value != null && (
          <span className="text-muted-foreground text-xs font-normal"> {unit}</span>
        )}
      </p>
      {delta && delta !== '—' && <p className="text-muted-foreground mt-0.5 text-[9px]">{delta}</p>}
    </div>
  );
}

function CompositionSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-16 w-full rounded-2xl" />
      <Skeleton className="h-36 w-full rounded-2xl" />
      <Skeleton className="h-4 w-40" />
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-56 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
