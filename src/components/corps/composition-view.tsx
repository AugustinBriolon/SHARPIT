'use client';

import { AlertTriangle, Scale } from 'lucide-react';
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
import { MetricLineChart } from '@/components/recovery/health-charts';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

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
}: {
  label: string;
  value: number | null;
  unit: string;
  deltaDisplay: string | null;
}) {
  return (
    <div className="bg-background/50 px-3 py-2.5 text-center">
      <p className="text-muted-foreground min-h-6.5 text-[9px] font-semibold tracking-[0.12em] uppercase md:min-h-fit">
        {label}
      </p>
      <p className="mt-1 text-lg font-bold tabular-nums">
        {value != null ? value : '—'}
        {unit && value != null ? (
          <span className="text-muted-foreground text-xs font-normal"> {unit}</span>
        ) : null}
      </p>
      {deltaDisplay && deltaDisplay !== '—' ? (
        <p className="text-muted-foreground mt-0.5 text-[9px]">{deltaDisplay}</p>
      ) : null}
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
              <p
                className={cn(
                  'mt-2 text-xs font-medium',
                  vm.hero.weightDeltaColorClass ?? 'text-muted-foreground',
                )}
              >
                {vm.hero.weightDeltaDisplay}
              </p>
            ) : null}
          </div>

          <div className="grid min-w-[min(100%,280px)] grid-cols-3 gap-3 sm:gap-4">
            <HeroMini
              deltaDisplay={vm.hero.heroMini.bodyFatPct.deltaDisplay}
              label="Masse grasse"
              unit="%"
              value={vm.hero.heroMini.bodyFatPct.value}
            />
            <HeroMini
              deltaDisplay={vm.hero.heroMini.musclePct.deltaDisplay}
              label="Muscle"
              unit="%"
              value={vm.hero.heroMini.musclePct.value}
            />
            <HeroMini
              deltaDisplay={vm.hero.heroMini.visceralFat.deltaDisplay}
              label="Viscéral"
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
