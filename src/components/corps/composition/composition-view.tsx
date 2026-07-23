'use client';

import { CompositionMetricCard } from '@/components/corps/composition/composition-metric-card';
import { CompositionMetricExplainer } from '@/components/corps/composition/composition-metric-explainer';
import { CorpsDisclaimer, CorpsEmptyState } from '@/components/corps/corps-ui';
import { Skeleton } from '@/components/ui/skeleton';
import { SkeletonDataValue } from '@/components/ui/skeleton-data-value';
import type { BodyChartPoint, BodyMetricCardVm } from '@/core/presentation/body-view-model';
import {
  isPresentationValuesLoading,
  useBodyPresentationViewModel,
} from '@/hooks/use-presentation-view-model';
import { filterCompositionSeriesByDays } from '@/lib/health/body-composition';
import type { CompositionMetricId } from '@/lib/health/composition-metric-guides';
import {
  CHART_BASE_STROKE,
  CHART_RECOVERY_STROKE,
  CHART_TEMPO_STROKE,
  CHART_THRESHOLD_STROKE,
} from '@/lib/theme/chart-theme';
import { CORPS_TONE_DOT } from '@/lib/ui/metric-tone';
import { cn } from '@/lib/utils';
import { Scale } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';

const MetricLineChart = dynamic(
  () =>
    import('@/components/recovery/sections/health-charts').then(
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

function MetricChip({
  label,
  value,
  tone,
  delta,
  loading = false,
  onExplain,
}: {
  label: string;
  value: string;
  tone: keyof typeof CORPS_TONE_DOT;
  delta?: string;
  loading?: boolean;
  onExplain?: () => void;
}) {
  return (
    <button
      disabled={!onExplain || loading}
      type="button"
      className={cn(
        'chip-surface flex min-w-0 flex-col gap-1 rounded-2xl px-3 py-2.5 text-left',
        onExplain && !loading
          ? 'hover:border-primary/35 transition-[border-color,background-color]'
          : 'cursor-default',
      )}
      onClick={onExplain}
    >
      <span className="flex items-center gap-1.5">
        <span className={cn('h-2 w-2 shrink-0 rounded-full', CORPS_TONE_DOT[tone])} aria-hidden />
        <span className="text-muted-foreground text-[11px] font-medium tracking-wide">{label}</span>
      </span>
      {loading ? (
        <SkeletonDataValue heightClassName="h-4" widthClassName="w-12" />
      ) : (
        <span className="text-data text-foreground text-[15px] tabular-nums">
          {value}
          {delta ? (
            <span className="text-muted-foreground ml-1.5 text-[10px] tracking-normal">
              {delta}
            </span>
          ) : null}
        </span>
      )}
      {loading ? <SkeletonDataValue heightClassName="h-2.5" widthClassName="w-16" /> : null}
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
      <div className="grid grid-cols-2 gap-2">
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

/** Desktop-only dense list — replaces the chip grids in the right-hand card. */
function CompositionDetailList({
  cards,
  onExplain,
}: {
  cards: BodyMetricCardVm[];
  onExplain: (id: CompositionMetricId) => void;
}) {
  if (cards.length === 0) return null;

  return (
    <div className="chip-surface rounded-analysis-lg divide-analysis-border/60 divide-y">
      <div className="flex items-baseline justify-between px-4 py-3">
        <p className="text-card-title">Composition détaillée</p>
        <span className="text-muted-foreground text-xs">
          {cards.length} mesure{cards.length > 1 ? 's' : ''}
        </span>
      </div>
      {cards.map((card) => (
        <button
          key={card.cardId}
          className="hover:bg-muted/30 flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors disabled:cursor-default"
          disabled={!card.guideId}
          type="button"
          onClick={card.guideId ? () => onExplain(card.guideId!) : undefined}
        >
          <span className="text-foreground/85 text-sm">{card.label}</span>
          <span className="text-data text-sm font-medium">{card.valueDisplay}</span>
        </button>
      ))}
    </div>
  );
}

/** First-vs-last point delta over the currently displayed window — display only. */
function windowDeltaDisplay(
  points: BodyChartPoint[],
  key: 'weightKg',
  unit: string,
  windowLabel: string,
): string | null {
  const values = points.map((p) => p[key]).filter((v): v is number => v != null);
  if (values.length < 2) return null;
  const delta = values[values.length - 1]! - values[0]!;
  if (Math.abs(delta) < 0.05) return null;
  const sign = delta > 0 ? '+' : '';
  return `${sign}${delta.toFixed(1)}${unit} sur ${windowLabel}`;
}

function CompositionSkeleton() {
  return (
    <div className="space-y-4 lg:space-y-5">
      <section
        className="surface-ink relative overflow-hidden px-5 py-8 sm:px-8 sm:py-10"
        aria-busy
      >
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <p className="text-ink-surface-foreground/65 inline-flex items-center gap-2 text-[11px] font-semibold tracking-wide uppercase">
            <span
              className="bg-highlight dark:bg-ink-surface-foreground h-2.5 w-2.5 shrink-0 rounded-full"
              aria-hidden
            />
            Dernière pesée
          </p>
          <SkeletonDataValue
            className="bg-ink-surface-foreground/20"
            heightClassName="h-3"
            widthClassName="w-28"
          />
        </div>
        <div className="text-verdict text-ink-surface-foreground mt-6 text-[2rem] leading-none sm:text-[2.25rem]">
          <SkeletonDataValue
            className="bg-ink-surface-foreground/20"
            heightClassName="h-10"
            widthClassName="w-28"
          />
        </div>
        <div className="border-highlight dark:border-ink-surface-foreground/80 mt-3 border-l-2 pl-3">
          <SkeletonDataValue
            className="bg-ink-surface-foreground/20"
            heightClassName="h-4"
            widthClassName="w-24"
          />
        </div>
      </section>

      <nav aria-label="Signaux de composition" className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {(
          [
            { key: 'bodyFatPct', label: 'Masse grasse' },
            { key: 'musclePct', label: 'Muscle' },
            { key: 'visceralFat', label: 'Viscéral' },
            { key: 'waterPct', label: 'Eau corporelle' },
          ] as const
        ).map(({ key, label }) => (
          <MetricChip key={key} label={label} tone="neutral" value="" loading />
        ))}
      </nav>

      <section className="space-y-2">
        <p className="text-label px-0.5">Composition</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <MetricChip key={i} label="Mesure" tone="neutral" value="" loading />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 px-0.5">
          <p className="text-label">Tendances</p>
          <div className="surface-shell inline-flex flex-wrap gap-1 rounded-full p-1">
            {TREND_WINDOWS.map((w) => (
              <span
                key={w.id}
                className="text-muted-foreground rounded-full px-2.5 py-1 text-xs font-medium"
              >
                {w.label}
              </span>
            ))}
          </div>
        </div>
        <Skeleton className="h-48 w-full rounded-lg" />
      </section>

      <CorpsDisclaimer title="Lecture indicative, pas une mesure médicale">
        Impédancemétrie = tendances utiles, écart possible vs DEXA. Hydratation, repas et heure de
        pesée influencent le résultat du jour.
      </CorpsDisclaimer>
    </div>
  );
}

export function CompositionView({ embedded: _embedded = false }: { embedded?: boolean }) {
  const [trendWindow, setTrendWindow] = useState<TrendWindowId>('90d');
  const selectedWindow = useMemo(
    () => TREND_WINDOWS.find((w) => w.id === trendWindow) ?? TREND_WINDOWS[2],
    [trendWindow],
  );

  // Full history once — window buttons only filter the chart series locally.
  const query = useBodyPresentationViewModel();
  const valuesLoading = isPresentationValuesLoading(query);
  const vm = query.data ?? null;

  const [explainMetricId, setExplainMetricId] = useState<CompositionMetricId | null>(null);

  const activeExplainer =
    !valuesLoading && explainMetricId ? vm?.explainerByMetricId[explainMetricId] : null;

  const chartData = vm?.chartData?.length
    ? filterCompositionSeriesByDays(vm.chartData, selectedWindow.days)
    : [];

  const heroMiniMetrics = useMemo(() => {
    if (!vm?.hasData) return [];
    return (
      [
        { key: 'bodyFatPct', label: 'Masse grasse', unit: '%' },
        { key: 'musclePct', label: 'Muscle', unit: '%' },
        { key: 'visceralFat', label: 'Viscéral', unit: '' },
        { key: 'waterPct', label: 'Eau corporelle', unit: '%' },
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
    if (!vm?.hasData || valuesLoading) return [];
    const hints: { label: string; text: string }[] = [];
    if (vm.hero.weightDeltaHint) hints.push({ label: 'Poids', text: vm.hero.weightDeltaHint });
    for (const { label, metric } of heroMiniMetrics) {
      if (metric.deltaHint) hints.push({ label, text: metric.deltaHint });
    }
    return hints;
  }, [vm, heroMiniMetrics, valuesLoading]);

  const allDetailCards = useMemo(() => {
    if (!vm?.hasData) return [];
    return [...vm.trajectoryCards, ...vm.contextCards, ...vm.healthScanCards];
  }, [vm]);

  const trendDelta = !valuesLoading
    ? windowDeltaDisplay(chartData, 'weightKg', ' kg', selectedWindow.label)
    : null;

  if (valuesLoading && !vm?.hasData) return <CompositionSkeleton />;

  if (!valuesLoading && (!vm || !vm.hasData)) {
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

  if (!vm?.hasData) return <CompositionSkeleton />;

  const chartEmptyInWindow = chartData.length === 0;

  const trendChart = (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-card-title">Poids · tendance</p>
          {trendDelta ? (
            <p className="text-data text-muted-foreground mt-0.5 text-xs">{trendDelta}</p>
          ) : null}
          {!trendDelta && chartEmptyInWindow ? (
            <p className="text-muted-foreground mt-0.5 text-xs">
              Aucune pesée sur {selectedWindow.label} — élargis la fenêtre.
            </p>
          ) : null}
        </div>
        <div className="border-analysis-border/70 inline-flex flex-wrap gap-1 rounded-full border p-1">
          {TREND_WINDOWS.map((w) => {
            const active = w.id === trendWindow;
            return (
              <button
                key={w.id}
                aria-pressed={active}
                type="button"
                className={cn(
                  'text-data rounded-full px-2.5 py-1 text-[10px] transition-colors',
                  active
                    ? 'bg-highlight text-highlight-foreground font-semibold'
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
        data={chartData}
        dataKey="weightKg"
        loading={false}
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
            data={chartData}
            dataKey="bodyFatPct"
            loading={false}
            subtitle="Estimation impédancemétrie"
            title="Masse grasse"
            unit="%"
          />
          <MetricLineChart
            color={CHART_RECOVERY_STROKE}
            data={chartData}
            dataKey="musclePct"
            loading={false}
            subtitle="Part du poids total"
            title="Muscle"
            unit="%"
          />
          <MetricLineChart
            color={CHART_TEMPO_STROKE}
            data={chartData}
            dataKey="visceralFat"
            loading={false}
            subtitle="Indice viscéral"
            title="Graisse viscérale"
          />
        </div>
      </details>
    </>
  );

  return (
    <div className="space-y-4 lg:space-y-5">
      <section
        aria-busy={valuesLoading || undefined}
        className={cn(
          'surface-ink relative overflow-hidden px-5 py-8 sm:px-8 sm:py-10',
          'motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200',
        )}
      >
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <p className="text-ink-surface-foreground/65 inline-flex items-center gap-2 text-[11px] font-semibold tracking-wide uppercase">
            <span
              className="bg-highlight dark:bg-ink-surface-foreground h-2.5 w-2.5 shrink-0 rounded-full"
              aria-hidden
            />
            Dernière pesée
          </p>
          {valuesLoading ? (
            <SkeletonDataValue
              className="bg-ink-surface-foreground/20"
              heightClassName="h-3"
              widthClassName="w-28"
            />
          ) : (
            <p className="text-data text-ink-surface-foreground/60 text-xs">
              {vm.hero.measuredAtLabel ?? '—'}
              {vm.hero.sourceLabel ? ` · ${vm.hero.sourceLabel}` : ''}
            </p>
          )}
        </div>

        <div className="text-verdict text-ink-surface-foreground mt-6 text-[2rem] leading-none sm:text-[2.25rem]">
          {valuesLoading ? (
            <SkeletonDataValue
              className="bg-ink-surface-foreground/20"
              heightClassName="h-10"
              widthClassName="w-28"
            />
          ) : (
            <>
              {vm.hero.latestWeightDisplay}
              {vm.hero.latestWeightKg != null ? (
                <span className="text-ink-surface-foreground/70 ml-1.5 text-lg font-normal">
                  kg
                </span>
              ) : null}
            </>
          )}
        </div>

        {valuesLoading ? (
          <div className="border-highlight dark:border-ink-surface-foreground/80 mt-3 border-l-2 pl-3">
            <SkeletonDataValue
              className="bg-ink-surface-foreground/20"
              heightClassName="h-4"
              widthClassName="w-24"
            />
          </div>
        ) : null}
        {!valuesLoading && vm.hero.weightDeltaDisplay ? (
          <p className="border-highlight dark:border-ink-surface-foreground/80 text-ink-surface-foreground/80 mt-3 border-l-2 pl-3 text-sm leading-relaxed font-medium">
            {vm.hero.weightDeltaDisplay}
          </p>
        ) : null}

        {heroHints.length > 0 ? (
          <div className="border-ink-surface-foreground/25 text-ink-surface-foreground/70 mt-6 space-y-1 border-l-2 pl-4 text-xs leading-relaxed">
            {heroHints.map(({ label, text }) => (
              <p key={label}>
                <span className="text-ink-surface-foreground/90 font-medium">{label}</span> — {text}
              </p>
            ))}
          </div>
        ) : null}
      </section>

      <nav aria-label="Signaux de composition" className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {heroMiniMetrics.map(({ key, label, metric, value, delta }) => (
          <MetricChip
            key={key}
            delta={valuesLoading ? undefined : delta}
            label={label}
            loading={valuesLoading}
            tone={metric.tone}
            value={value}
            onExplain={
              !valuesLoading && metric.guideId
                ? () => setExplainMetricId(metric.guideId!)
                : undefined
            }
          />
        ))}
      </nav>

      {/* Mobile: chip-grid sections stacked, chart at the end (unchanged from before, minus Lecture). */}
      <div className="space-y-4 lg:hidden">
        {!valuesLoading ? (
          <MetricCardsExpand
            cards={vm.trajectoryCards}
            label="Composition"
            onExplain={setExplainMetricId}
          />
        ) : (
          <section className="space-y-2">
            <p className="text-label px-0.5">Composition</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <MetricChip key={i} label="Mesure" tone="neutral" value="" loading />
              ))}
            </div>
          </section>
        )}

        {!valuesLoading && vm.contextCards.length > 0 ? (
          <MetricCardsExpand
            cards={vm.contextCards}
            label="Repères"
            onExplain={setExplainMetricId}
          />
        ) : null}

        {!valuesLoading && vm.hasBodyScan ? (
          <MetricCardsExpand
            cards={vm.healthScanCards}
            label="Santé de fond"
            onExplain={setExplainMetricId}
          />
        ) : null}

        <section className="space-y-3">{trendChart}</section>
      </div>

      {/* Desktop: two bordered cards — trend chart | composition detailed list. */}
      <div className="hidden lg:grid lg:grid-cols-[1.6fr_1fr] lg:items-stretch lg:gap-4">
        <section className="chip-surface rounded-analysis-lg space-y-3 p-5">{trendChart}</section>
        <CompositionDetailList cards={allDetailCards} onExplain={setExplainMetricId} />
      </div>

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
