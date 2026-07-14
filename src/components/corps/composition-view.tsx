'use client';

import { AlertTriangle, Scale } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';
import type { CompositionMetricId } from '@/lib/composition-metric-guides';
import { useBodyPresentationViewModel } from '@/hooks/use-presentation-view-model';
import { CompositionMetricCard } from '@/components/corps/composition-metric-card';
import { CompositionMetricExplainer } from '@/components/corps/composition-metric-explainer';
import { InsightList } from '@/components/product-insight/insight-list';
import {
  CorpsDisclaimer,
  CorpsDivider,
  CorpsEmptyState,
  CorpsPanel,
} from '@/components/corps/corps-ui';
import type { BodyChartPoint } from '@/core/presentation/body-view-model';
import { Skeleton } from '@/components/ui/skeleton';
import { SkeletonCard, SkeletonEyebrow, SkeletonPill } from '@/components/ui/skeleton-patterns';
import { CORPS_TONE_TEXT } from '@/lib/metric-tone';
import type { CorpsTone } from '@/lib/metric-tone';
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

function HeroMini({
  label,
  value,
  unit,
  deltaDisplay,
  deltaTone = 'ok',
  deltaHint,
  tone = 'neutral',
}: {
  label: string;
  value: number | null;
  unit: string;
  deltaDisplay: string | null;
  deltaTone?: CorpsTone;
  deltaHint?: string | null;
  tone?: CorpsTone;
}) {
  return (
    <div className="bg-background/50 px-3 py-2.5 text-center">
      <p className="text-muted-foreground min-h-6.5 text-[9px] font-semibold tracking-[0.12em] uppercase md:min-h-fit">
        {label}
      </p>
      <p className={cn('mt-1 text-lg font-bold tabular-nums', CORPS_TONE_TEXT[tone])}>
        {value != null ? value : '—'}
        {unit && value != null ? (
          <span className="text-muted-foreground text-xs font-normal"> {unit}</span>
        ) : null}
      </p>
      {deltaDisplay && deltaDisplay !== '—' ? (
        <p
          className={cn(
            'mt-0.5 text-[9px]',
            isDeltaStatusTone(deltaTone) ? CORPS_TONE_TEXT[deltaTone] : 'text-muted-foreground',
          )}
        >
          {deltaDisplay}
        </p>
      ) : null}
      {deltaHint ? (
        <p className="text-muted-foreground mt-1 text-[8px] leading-snug">{deltaHint}</p>
      ) : null}
    </div>
  );
}

function CompositionSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-16 w-full rounded-2xl" />

      <SkeletonCard className="overflow-hidden p-0">
        <div className="flex flex-col gap-5 px-5 py-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-3 w-24 rounded-full border-0" />
            <Skeleton className="h-10 w-32 border-0" />
            <Skeleton className="h-4 w-40 rounded-full border-0" />
          </div>
          <div className="grid min-w-[min(100%,280px)] grid-cols-3 gap-3 sm:gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-card/60 rounded-2xl border px-3 py-3">
                <Skeleton className="h-2.5 w-14 rounded-full border-0" />
                <Skeleton className="mt-2 h-7 w-12 border-0" />
              </div>
            ))}
          </div>
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

  if (query.isPending) return <CompositionSkeleton />;

  if (!vm || !vm.hasData) {
    return (
      <div className="space-y-4">
        <CorpsDisclaimer icon={AlertTriangle} title="Lecture indicative, pas une mesure médicale">
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
      <CorpsDisclaimer icon={AlertTriangle} title="Lecture indicative, pas une mesure médicale">
        Impédancemétrie = tendances utiles, écart possible vs DEXA. Hydratation, repas et heure de
        pesée influencent le résultat du jour.
      </CorpsDisclaimer>

      <CorpsPanel className="overflow-hidden p-0">
        <div className="flex flex-col gap-5 px-5 py-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-muted-foreground text-[11px] font-medium tracking-[0.15em] uppercase">
              Dernière pesée
            </p>
            <p className="font-heading mt-1 text-4xl font-semibold tabular-nums">
              {vm.hero.latestWeightDisplay}
              {vm.hero.latestWeightKg != null ? (
                <span className="text-muted-foreground ml-1 text-lg font-normal">kg</span>
              ) : null}
            </p>
            <p className="text-muted-foreground mt-1 text-sm">
              {vm.hero.measuredAtLabel ?? '—'}
              {vm.hero.sourceLabel ? (
                <span className="bg-muted text-muted-foreground ml-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium uppercase">
                  {vm.hero.sourceLabel}
                </span>
              ) : null}
            </p>

            {vm.hero.weightDeltaDisplay ? (
              <div className="mt-2 space-y-1">
                <p
                  className={cn(
                    'text-xs font-medium',
                    vm.hero.weightDeltaTone && isDeltaStatusTone(vm.hero.weightDeltaTone)
                      ? CORPS_TONE_TEXT[vm.hero.weightDeltaTone]
                      : 'text-muted-foreground',
                  )}
                >
                  {vm.hero.weightDeltaDisplay}
                </p>
                {vm.hero.weightDeltaHint ? (
                  <p className="text-muted-foreground text-[10px] leading-snug">
                    {vm.hero.weightDeltaHint}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="grid min-w-[min(100%,280px)] grid-cols-3 gap-3 sm:gap-4">
            <HeroMini
              deltaDisplay={vm.hero.heroMini.bodyFatPct.deltaDisplay}
              deltaHint={vm.hero.heroMini.bodyFatPct.deltaHint}
              deltaTone={vm.hero.heroMini.bodyFatPct.deltaTone}
              label="Masse grasse"
              tone={vm.hero.heroMini.bodyFatPct.tone}
              unit="%"
              value={vm.hero.heroMini.bodyFatPct.value}
            />
            <HeroMini
              deltaDisplay={vm.hero.heroMini.musclePct.deltaDisplay}
              deltaHint={vm.hero.heroMini.musclePct.deltaHint}
              deltaTone={vm.hero.heroMini.musclePct.deltaTone}
              label="Muscle"
              tone={vm.hero.heroMini.musclePct.tone}
              unit="%"
              value={vm.hero.heroMini.musclePct.value}
            />
            <HeroMini
              deltaDisplay={vm.hero.heroMini.visceralFat.deltaDisplay}
              deltaHint={vm.hero.heroMini.visceralFat.deltaHint}
              deltaTone={vm.hero.heroMini.visceralFat.deltaTone}
              label="Viscéral"
              tone={vm.hero.heroMini.visceralFat.tone}
              unit=""
              value={vm.hero.heroMini.visceralFat.value}
            />
          </div>
        </div>
      </CorpsPanel>

      <InsightList insights={vm.insights.primary} label="Ce que ta trajectoire raconte" />
      <InsightList insights={vm.insights.supporting} label="Contexte de lecture" />

      <CompositionSection
        description="Les chiffres utiles sont ceux qui t'aident à juger si ton corps évolue dans le sens de ton projet, pas seulement la valeur du jour."
        label="Trajectoire corporelle"
      >
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

      <InsightList insights={vm.insights.contextual} label="Contexte sante et mesure" />

      {vm.contextCards.length > 0 ? (
        <CompositionSection
          description="Ces repères servent surtout à savoir si la lecture du jour est fiable et comment elle s'inscrit dans ta trajectoire."
          label="Contexte de mesure"
        >
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
