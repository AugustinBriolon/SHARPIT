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
import { CorpsDisclaimer, CorpsEmptyState } from '@/components/corps/corps-ui';
import type { BodyChartPoint, BodyMetricCardVm } from '@/core/presentation/body-view-model';
import { Skeleton } from '@/components/ui/skeleton';
import {
  CHART_BASE_STROKE,
  CHART_RECOVERY_STROKE,
  CHART_TEMPO_STROKE,
  CHART_THRESHOLD_STROKE,
} from '@/lib/chart-theme';
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

function CompositionInsightWhy({ insights }: { insights: ProductInsight[] }) {
  if (insights.length === 0) return null;
  const [primary, ...rest] = insights;
  const primarySentence =
    primary.evidence.length > 0
      ? `${primary.title} — ${primary.evidence.join(' · ')}`
      : primary.title;

  return (
    <section className="px-0.5">
      <p className="text-label mb-2">Lecture</p>
      <p className="text-foreground text-sm leading-relaxed">{primarySentence}</p>
      {rest.length > 0 ? (
        <details className="group mt-2">
          <summary className="text-muted-foreground hover:text-foreground cursor-pointer list-none py-1.5 text-xs font-medium tracking-wide transition-colors [&::-webkit-details-marker]:hidden">
            <span className="underline-offset-2 group-open:no-underline">
              {rest.length === 1 ? 'Voir le détail' : `Voir ${rest.length} autres lectures`}
            </span>
          </summary>
          <ul className="text-muted-foreground mt-1 space-y-2 text-sm leading-relaxed">
            {rest.map((insight) => (
              <li key={insight.id}>
                <span className="text-foreground/90 font-medium">{insight.title}</span>
                {insight.evidence.length > 0 ? ` — ${insight.evidence.join(' · ')}` : ''}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}

function MetricChip({
  label,
  value,
  tone,
  delta,
  onExplain,
}: {
  label: string;
  value: string;
  tone: keyof typeof CORPS_TONE_DOT;
  delta?: string;
  onExplain?: () => void;
}) {
  return (
    <button
      disabled={!onExplain}
      type="button"
      className={cn(
        'border-analysis-border/80 bg-background/50 flex min-w-0 flex-col gap-1 rounded-lg border px-3 py-2.5 text-left',
        onExplain
          ? 'hover:border-primary/35 hover:bg-muted/40 transition-[border-color,background-color]'
          : 'cursor-default',
      )}
      onClick={onExplain}
    >
      <span className="flex items-center gap-1.5">
        <span className={cn('h-2 w-2 shrink-0 rounded-full', CORPS_TONE_DOT[tone])} aria-hidden />
        <span className="text-muted-foreground text-[11px] font-medium tracking-wide">{label}</span>
      </span>
      <span className="text-data text-foreground text-sm tabular-nums">{value}</span>
      {delta ? (
        <span className="text-muted-foreground text-[10px] leading-snug">{delta}</span>
      ) : null}
      {onExplain ? (
        <span className="text-muted-foreground/70 text-data text-[10px] tracking-wider" aria-hidden>
          →
        </span>
      ) : null}
    </button>
  );
}

function MetricCardsExpand({
  label,
  cards,
  onExplain,
}: {
  label: string;
  cards: BodyMetricCardVm[];
  onExplain: (id: CompositionMetricId) => void;
}) {
  if (cards.length === 0) return null;
  const priority = cards.slice(0, 4);
  const rest = cards.slice(4);

  return (
    <section className="space-y-2">
      <p className="text-label px-0.5">{label}</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {priority.map((card) => (
          <MetricChip
            key={card.cardId}
            delta={card.footer && card.footer !== '—' ? card.footer : undefined}
            label={card.label}
            tone={card.tone}
            value={card.valueDisplay}
            onExplain={card.guideId ? () => onExplain(card.guideId!) : undefined}
          />
        ))}
      </div>
      {rest.length > 0 ? (
        <details className="group">
          <summary className="text-muted-foreground hover:text-foreground cursor-pointer list-none px-0.5 py-1.5 text-xs font-medium tracking-wide transition-colors [&::-webkit-details-marker]:hidden">
            <span className="underline-offset-2 group-open:no-underline">
              Voir toutes les mesures ({cards.length})
            </span>
          </summary>
          <div className="mt-2 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {rest.map((card) => (
              <CompositionMetricCard
                key={card.cardId}
                footer={card.footer}
                footerHint={card.footerHint}
                footerTone={card.footerTone}
                guideId={card.guideId}
                label={card.label}
                tone={card.tone}
                value={card.valueDisplay}
                onExplain={card.guideId ? (id) => onExplain(id) : undefined}
              />
            ))}
          </div>
        </details>
      ) : null}
    </section>
  );
}

function CompositionSkeleton() {
  return (
    <div className="space-y-4 sm:space-y-5">
      <section className="analysis-panel rounded-analysis-lg from-primary/8 relative overflow-hidden bg-linear-to-br to-transparent px-5 py-8 sm:px-8 sm:py-10">
        <Skeleton className="h-3 w-28 rounded-full" />
        <Skeleton className="mt-6 h-10 w-40 rounded-lg" />
        <Skeleton className="mt-3 h-4 w-32 rounded-full" />
      </section>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="border-analysis-border/80 bg-background/50 rounded-lg border px-3 py-2.5"
          >
            <Skeleton className="h-3 w-16 rounded-full" />
            <Skeleton className="mt-2 h-4 w-12 rounded-sm" />
          </div>
        ))}
      </div>
      <Skeleton className="h-4 w-full max-w-md rounded-full" />
      <Skeleton className="h-48 w-full rounded-lg" />
    </div>
  );
}

function plateTintFromTone(tone: string | null | undefined): string {
  if (tone === 'ok')
    return 'bg-linear-to-br from-emerald-500/10 to-transparent border-emerald-500/20';
  if (tone === 'watch' || tone === 'verify') {
    return 'bg-linear-to-br from-amber-500/10 to-transparent border-amber-500/25';
  }
  if (tone === 'attention')
    return 'bg-linear-to-br from-orange-500/10 to-transparent border-orange-500/25';
  return 'bg-linear-to-br from-primary/8 to-transparent';
}

function plateDotFromTone(tone: string | null | undefined): string {
  if (tone === 'ok') return 'bg-emerald-500';
  if (tone === 'watch' || tone === 'verify') return 'bg-amber-500';
  if (tone === 'attention') return 'bg-orange-500';
  return 'bg-primary';
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

  const allInsights = useMemo(() => {
    if (!vm) return [];
    return [...vm.insights.primary, ...vm.insights.supporting, ...vm.insights.contextual];
  }, [vm]);

  if (query.isPending) return <CompositionSkeleton />;

  if (!vm || !vm.hasData) {
    return (
      <div className="space-y-4">
        <CorpsEmptyState
          icon={Scale}
          title={vm?.emptyState?.title ?? 'Aucune mesure importée'}
          description={
            vm?.emptyState?.description ??
            'Connecte Withings ou Renpho dans les réglages pour synchroniser ta balance.'
          }
        />
        <CorpsDisclaimer title="Lecture indicative, pas une mesure médicale">
          Les balances estiment la composition via impédancemétrie : utile pour les{' '}
          <em>tendances</em>, pas comme référence médicale.
        </CorpsDisclaimer>
      </div>
    );
  }

  const weightTone = vm.hero.weightDeltaTone;

  return (
    <div className="space-y-4 sm:space-y-5">
      <section
        className={cn(
          'analysis-panel rounded-analysis-lg relative overflow-hidden px-5 py-8 sm:px-8 sm:py-10',
          'motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200',
          plateTintFromTone(weightTone),
        )}
      >
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <p className="text-label inline-flex items-center gap-2">
            <span
              className={cn('h-2.5 w-2.5 shrink-0 rounded-full', plateDotFromTone(weightTone))}
              aria-hidden
            />
            Dernière pesée
          </p>
          <p className="text-muted-foreground text-xs">
            {vm.hero.measuredAtLabel ?? '—'}
            {vm.hero.sourceLabel ? ` · ${vm.hero.sourceLabel}` : ''}
          </p>
        </div>

        <p className="text-verdict mt-6 text-[2rem] leading-none sm:text-[2.25rem]">
          {vm.hero.latestWeightDisplay}
          {vm.hero.latestWeightKg != null ? (
            <span className="text-muted-foreground ml-1.5 text-lg font-normal">kg</span>
          ) : null}
        </p>

        {vm.hero.weightDeltaDisplay ? (
          <p
            className={cn(
              'mt-3 text-sm font-medium',
              weightTone && isDeltaStatusTone(weightTone)
                ? CORPS_TONE_TEXT[weightTone]
                : 'text-muted-foreground',
            )}
          >
            {vm.hero.weightDeltaDisplay}
          </p>
        ) : null}

        {heroHints.length > 0 ? (
          <ClinicalAnnotation className="mt-6">
            {heroHints.map(({ label, text }) => (
              <p key={label}>
                <span className="text-foreground/85 font-medium">{label}</span> — {text}
              </p>
            ))}
          </ClinicalAnnotation>
        ) : null}
      </section>

      <nav aria-label="Signaux de composition" className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {heroMiniMetrics.map(({ key, label, metric, value, delta }) => (
          <MetricChip
            key={key}
            delta={delta}
            label={label}
            tone={metric.tone}
            value={value}
            onExplain={metric.guideId ? () => setExplainMetricId(metric.guideId!) : undefined}
          />
        ))}
      </nav>

      <CompositionInsightWhy insights={allInsights} />

      <MetricCardsExpand
        cards={vm.trajectoryCards}
        label="Composition"
        onExplain={setExplainMetricId}
      />

      {vm.contextCards.length > 0 ? (
        <MetricCardsExpand cards={vm.contextCards} label="Repères" onExplain={setExplainMetricId} />
      ) : null}

      {vm.hasBodyScan ? (
        <MetricCardsExpand
          cards={vm.healthScanCards}
          label="Santé de fond"
          onExplain={setExplainMetricId}
        />
      ) : null}

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 px-0.5">
          <p className="text-label">Tendances</p>
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

        <MetricLineChart
          color={CHART_BASE_STROKE}
          data={vm.chartData}
          dataKey="weightKg"
          loading={isWindowRefreshing}
          subtitle="Pesées balance"
          title="Poids"
          unit="kg"
        />

        <details className="group">
          <summary className="text-muted-foreground hover:text-foreground cursor-pointer list-none px-0.5 py-1.5 text-xs font-medium tracking-wide transition-colors [&::-webkit-details-marker]:hidden">
            <span className="underline-offset-2 group-open:no-underline">
              Autres tendances (masse grasse, muscle, viscéral)
            </span>
          </summary>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <MetricLineChart
              color={CHART_THRESHOLD_STROKE}
              data={vm.chartData}
              dataKey="bodyFatPct"
              loading={isWindowRefreshing}
              subtitle="Estimation impédancemétrie"
              title="Masse grasse"
              unit="%"
            />
            <MetricLineChart
              color={CHART_RECOVERY_STROKE}
              data={vm.chartData}
              dataKey="musclePct"
              loading={isWindowRefreshing}
              subtitle="Part du poids total"
              title="Muscle"
              unit="%"
            />
            <MetricLineChart
              color={CHART_TEMPO_STROKE}
              data={vm.chartData}
              dataKey="visceralFat"
              loading={isWindowRefreshing}
              subtitle="Indice viscéral"
              title="Graisse viscérale"
            />
          </div>
        </details>
      </section>

      <CorpsDisclaimer title="Lecture indicative, pas une mesure médicale">
        Impédancemétrie = tendances utiles, écart possible vs DEXA. Hydratation, repas et heure de
        pesée influencent le résultat du jour.
      </CorpsDisclaimer>

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
