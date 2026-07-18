'use client';

import { Scale } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';
import type { ProductInsight } from '@/core/product-insight/types';
import type { CompositionMetricId } from '@/lib/composition-metric-guides';
import { useBodyPresentationViewModel } from '@/hooks/use-presentation-view-model';
import { CompositionMetricCard } from '@/components/corps/composition-metric-card';
import { CompositionMetricExplainer } from '@/components/corps/composition-metric-explainer';
import { ClinicalAnnotation } from '@/components/ui/clinical-annotation';
import {
  CorpsDisclaimer,
  CorpsDivider,
  CorpsEmptyState,
  CorpsPanel,
} from '@/components/corps/corps-ui';
import type { BodyChartPoint } from '@/core/presentation/body-view-model';
import { Skeleton } from '@/components/ui/skeleton';
import { SkeletonCard, SkeletonEyebrow, SkeletonPill } from '@/components/ui/skeleton-patterns';
import { CORPS_TONE_DOT, CORPS_TONE_TEXT } from '@/lib/metric-tone';
import { isDeltaStatusTone } from '@/lib/health-status';
import { cn } from '@/lib/utils';

const MetricLineChart = dynamic(
  () =>
    import('@/components/recovery/health-charts').then(
      (mod) => mod.MetricLineChart<BodyChartPoint>,
    ),
  { ssr: false, loading: () => <Skeleton className="h-48 w-full" /> },
);

const TREND_WINDOWS = [
  { id: '14d', label: '14 j', days: 14 },
  { id: '30d', label: '30 j', days: 30 },
  { id: '90d', label: '90 j', days: 90 },
  { id: '1y', label: '1 an', days: 365 },
  { id: 'all', label: 'Tout', days: null },
] as const;

type TrendWindowId = (typeof TREND_WINDOWS)[number]['id'];

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
      {description ? (
        <p className="text-muted-foreground -mt-1 text-xs leading-relaxed">{description}</p>
      ) : null}
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </section>
  );
}

/** Compact, scannable read of the insight bundle — one card, no repeated meta-text. */
function CompositionInsightList({ insights }: { insights: ProductInsight[] }) {
  if (insights.length === 0) return null;

  return (
    <CorpsPanel className="divide-border/60 divide-y p-0">
      {insights.map((insight) => (
        <div key={insight.id} className="px-5 py-3.5 first:pt-4 last:pb-4">
          <p className="text-sm font-medium">{insight.title}</p>
          {insight.evidence.length > 0 ? (
            <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">
              {insight.evidence.join(' · ')}
            </p>
          ) : null}
        </div>
      ))}
    </CorpsPanel>
  );
}

function CompositionSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-16 w-full rounded-2xl" />

      <SkeletonCard className="px-5 py-5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <Skeleton className="h-4 w-28 rounded-full" />
          <Skeleton className="h-4 w-36 rounded-full" />
        </div>
        <Skeleton className="mt-2 h-10 w-40" />
        <Skeleton className="mt-1 h-4 w-28 rounded-full" />
        <div className="border-analysis-border divide-analysis-border mt-4 grid grid-cols-1 divide-y border-t pt-4 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="min-w-0 py-3 first:pt-0 last:pb-0 sm:px-4 sm:py-0 sm:first:pl-0 sm:last:pr-0"
            >
              <Skeleton className="h-4 w-20 max-w-full rounded-full" />
              <Skeleton className="mt-2 h-[1.125rem] w-16" />
              <Skeleton className="mt-1.5 h-4 w-24 max-w-full rounded-full" />
            </div>
          ))}
        </div>
      </SkeletonCard>

      <div className="flex gap-1.5 overflow-x-auto pb-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonPill key={i} className="h-8 w-14 shrink-0" />
        ))}
      </div>

      <div className="space-y-3">
        <SkeletonEyebrow className="w-32" />
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-card/60 rounded-2xl border px-4 py-4">
              <Skeleton className="h-2.5 w-16 rounded-full border-0" />
              <Skeleton className="mt-2 h-8 w-20 border-0" />
              <Skeleton className="mt-2 h-3 w-24 rounded-full border-0" />
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} className="min-h-56 px-4 py-4">
            <Skeleton className="h-3 w-24 rounded-full border-0" />
            <Skeleton className="rounded-analysis mt-4 h-44 w-full border-0" />
          </SkeletonCard>
        ))}
      </div>
    </div>
  );
}

export function CompositionView({ embedded: _embedded = false }: { embedded?: boolean }) {
  const [trendWindow, setTrendWindow] = useState<TrendWindowId>('90d');
  const selectedWindow = useMemo(
    () => TREND_WINDOWS.find((w) => w.id === trendWindow) ?? TREND_WINDOWS[2],
    [trendWindow],
  );

  const query = useBodyPresentationViewModel(selectedWindow.days);
  const vm = query.data ?? null;

  const [explainMetricId, setExplainMetricId] = useState<CompositionMetricId | null>(null);

  const activeExplainer = explainMetricId ? vm?.explainerByMetricId[explainMetricId] : null;

  const isWindowRefreshing = query.isFetching && !query.isPending;

  const heroMiniMetrics = useMemo(() => {
    if (!vm?.hasData) return [];
    return (
      [
        { key: 'bodyFatPct', label: 'Masse grasse', unit: '%' },
        { key: 'musclePct', label: 'Muscle', unit: '%' },
        { key: 'visceralFat', label: 'Viscéral', unit: '' },
      ] as const
    ).map(({ key, label, unit }) => {
      const metric = vm.hero.heroMini[key];
      return {
        key,
        label,
        metric,
        value: metric.value != null ? `${metric.value}${unit ? ` ${unit}` : ''}` : '—',
        delta: metric.deltaDisplay && metric.deltaDisplay !== '—' ? metric.deltaDisplay : undefined,
      };
    });
  }, [vm]);

  const heroHints = useMemo(() => {
    if (!vm?.hasData) return [];
    const hints: { label: string; text: string }[] = [];
    if (vm.hero.weightDeltaHint) hints.push({ label: 'Poids', text: vm.hero.weightDeltaHint });
    for (const { label, metric } of heroMiniMetrics) {
      if (metric.deltaHint) hints.push({ label, text: metric.deltaHint });
    }
    return hints;
  }, [vm, heroMiniMetrics]);

  if (query.isPending) return <CompositionSkeleton />;

  if (!vm || !vm.hasData) {
    return (
      <div className="space-y-4">
        <CorpsDisclaimer title="Lecture indicative, pas une mesure médicale">
          Les balances estiment la composition via impédancemétrie : utile pour les{' '}
          <em>tendances</em>, pas comme référence médicale.
        </CorpsDisclaimer>
        <CorpsEmptyState
          icon={Scale}
          title={vm?.emptyState?.title ?? 'Aucune mesure importée'}
          description={
            vm?.emptyState?.description ??
            'Connecte Withings ou Renpho dans les réglages pour synchroniser ta balance.'
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <CorpsDisclaimer title="Lecture indicative, pas une mesure médicale">
        Impédancemétrie = tendances utiles, écart possible vs DEXA. Hydratation, repas et heure de
        pesée influencent le résultat du jour.
      </CorpsDisclaimer>

      <CorpsPanel className="px-5 py-5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <p className="text-label">dernière pesée</p>
          <p className="text-muted-foreground text-xs">
            {vm.hero.measuredAtLabel ?? '—'}
            {vm.hero.sourceLabel ? ` · ${vm.hero.sourceLabel}` : ''}
          </p>
        </div>

        <p className="text-instrument mt-2 text-4xl">
          {vm.hero.latestWeightDisplay}
          {vm.hero.latestWeightKg != null ? (
            <span className="text-muted-foreground ml-1.5 text-lg">kg</span>
          ) : null}
        </p>

        {vm.hero.weightDeltaDisplay ? (
          <p
            className={cn(
              'mt-1 text-xs font-medium',
              vm.hero.weightDeltaTone && isDeltaStatusTone(vm.hero.weightDeltaTone)
                ? CORPS_TONE_TEXT[vm.hero.weightDeltaTone]
                : 'text-muted-foreground',
            )}
          >
            {vm.hero.weightDeltaDisplay}
          </p>
        ) : null}

        <div className="border-analysis-border divide-analysis-border mt-4 grid grid-cols-1 divide-y border-t pt-4 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {heroMiniMetrics.map(({ key, label, metric, value, delta }) => (
            <div
              key={key}
              className="min-w-0 py-3 first:pt-0 last:pb-0 sm:px-4 sm:py-0 sm:first:pl-0 sm:last:pr-0"
            >
              <div className="flex items-center gap-2">
                <span
                  className={cn('size-1.5 shrink-0 rounded-full', CORPS_TONE_DOT[metric.tone])}
                />
                <p className="text-label truncate">{label}</p>
              </div>
              <p className="text-instrument mt-2 text-lg leading-none">{value}</p>
              {delta ? (
                <p
                  className={cn(
                    'mt-1.5 text-[11px] leading-snug',
                    metric.deltaTone && isDeltaStatusTone(metric.deltaTone)
                      ? CORPS_TONE_TEXT[metric.deltaTone]
                      : 'text-muted-foreground',
                  )}
                >
                  {delta}
                </p>
              ) : null}
              {metric.guideId ? (
                <button
                  aria-label={`Comprendre la mesure ${label}`}
                  className="explore-link mt-2 block"
                  type="button"
                  onClick={() => setExplainMetricId(metric.guideId!)}
                >
                  comprendre
                </button>
              ) : null}
            </div>
          ))}
        </div>

        {heroHints.length > 0 ? (
          <ClinicalAnnotation className="mt-4">
            {heroHints.map(({ label, text }) => (
              <p key={label}>
                <span className="text-foreground/85 font-medium">{label}</span> — {text}
              </p>
            ))}
          </ClinicalAnnotation>
        ) : null}
      </CorpsPanel>

      <CompositionInsightList
        insights={[...vm.insights.primary, ...vm.insights.supporting, ...vm.insights.contextual]}
      />

      <CompositionSection label="Composition détaillée">
        {vm.trajectoryCards.map((card) => (
          <CompositionMetricCard
            key={card.cardId}
            footer={card.footer}
            footerHint={card.footerHint}
            footerTone={card.footerTone}
            guideId={card.guideId}
            label={card.label}
            tone={card.tone}
            value={card.valueDisplay}
            onExplain={card.guideId ? (id) => setExplainMetricId(id) : undefined}
          />
        ))}
      </CompositionSection>

      {vm.contextCards.length > 0 ? (
        <CompositionSection label="Repères complémentaires">
          {vm.contextCards.map((card) => (
            <CompositionMetricCard
              key={card.cardId}
              footer={card.footer}
              footerHint={card.footerHint}
              footerTone={card.footerTone}
              guideId={card.guideId}
              label={card.label}
              tone={card.tone}
              value={card.valueDisplay}
              onExplain={card.guideId ? (id) => setExplainMetricId(id) : undefined}
            />
          ))}
        </CompositionSection>
      ) : null}

      {vm.hasBodyScan ? (
        <section className="space-y-3">
          <div className="space-y-3">
            <CorpsDivider label="Santé de fond" />
            <p className="text-muted-foreground -mt-1 text-xs leading-relaxed">
              Ces métriques ne pilotent pas la séance du jour, mais elles donnent du contexte sur la
              trajectoire santé et résilience.
            </p>
          </div>
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {vm.healthScanCards.map((card) => (
              <CompositionMetricCard
                key={card.cardId}
                footer={card.footer}
                footerHint={card.footerHint}
                footerTone={card.footerTone}
                guideId={card.guideId}
                label={card.label}
                tone={card.tone}
                value={card.valueDisplay}
                onExplain={card.guideId ? (id) => setExplainMetricId(id) : undefined}
              />
            ))}
          </div>
        </section>
      ) : null}

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CorpsDivider label="Tendances" />
          <div className="bg-muted/40 inline-flex flex-wrap gap-1 rounded-full border p-1">
            {TREND_WINDOWS.map((w) => {
              const active = w.id === trendWindow;
              return (
                <button
                  key={w.id}
                  aria-pressed={active}
                  type="button"
                  className={cn(
                    'rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
                    active
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                  onClick={() => setTrendWindow(w.id)}
                >
                  {w.label}
                </button>
              );
            })}
          </div>
        </div>

        <p className="text-muted-foreground text-xs leading-relaxed">
          Une mesure par jour (la plus récente).{' '}
          {selectedWindow.id === 'all'
            ? "La vue 'Tout' remonte jusqu'aux plus anciennes mesures enregistrées."
            : 'Les variations peuvent refléter le bruit autant qu&apos;un vrai changement.'}
        </p>

        <div className="grid gap-3 md:grid-cols-2">
          <MetricLineChart
            color="#2563eb"
            data={vm.chartData}
            dataKey="weightKg"
            loading={isWindowRefreshing}
            subtitle="Pesées balance"
            title="Poids"
            unit="kg"
          />
          <MetricLineChart
            color="#dc2626"
            data={vm.chartData}
            dataKey="bodyFatPct"
            loading={isWindowRefreshing}
            subtitle="Estimation impédancemétrie"
            title="Masse grasse"
            unit="%"
          />
          <MetricLineChart
            color="#16a34a"
            data={vm.chartData}
            dataKey="musclePct"
            loading={isWindowRefreshing}
            subtitle="Part du poids total"
            title="Muscle"
            unit="%"
          />
          <MetricLineChart
            color="#ea580c"
            data={vm.chartData}
            dataKey="visceralFat"
            loading={isWindowRefreshing}
            subtitle="Indice viscéral"
            title="Graisse viscérale"
          />
        </div>
      </section>

      {activeExplainer ? (
        <CompositionMetricExplainer
          explainer={activeExplainer}
          open={true}
          onOpenChange={(open) => !open && setExplainMetricId(null)}
        />
      ) : null}
    </div>
  );
}
