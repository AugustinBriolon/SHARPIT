'use client';

import { CorpsStatCard } from '@/components/corps/corps-ui';
import { CORPS_TONE_DOT } from '@/lib/ui/metric-tone';
import { cn } from '@/lib/utils';
import { HeartPulse } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import type { PhysicalHealthConditionCard } from '@/core/presentation/physical-health-view-model';
import { PhysicalHealthConditionCardView } from '@/components/physical-health/cards/condition-card';
import { CorpsEmptyState, CorpsDivider } from '@/components/corps/corps-ui';

function ConditionCardSkeleton() {
  return (
    <div className="analysis-panel rounded-analysis-lg min-h-48 space-y-3 px-5 py-5">
      <Skeleton className="h-4 w-32 rounded-full border-0" />
      <Skeleton className="h-4 w-full rounded-full border-0" />
      <Skeleton className="h-4 w-[83%] rounded-full border-0" />
      <Skeleton className="mt-2 h-8 w-28 rounded-lg" />
    </div>
  );
}

export function PhysicalHealthLoadingSection() {
  return (
    <section className="space-y-3">
      <h3 className="text-section-title text-base">Conditions actives</h3>
      <div className="grid gap-3 md:grid-cols-2">
        <ConditionCardSkeleton />
        <ConditionCardSkeleton />
      </div>
    </section>
  );
}

export function PhysicalHealthActiveSection({
  conditions,
  embedded,
  onEditLegacy,
}: {
  conditions: PhysicalHealthConditionCard[];
  embedded: boolean;
  onEditLegacy: (legacyNoteId: string) => void;
}) {
  if (conditions.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3">
      <h3 className="text-section-title text-base">Conditions actives</h3>
      <div className={cn('grid gap-3', embedded ? 'grid-cols-1' : 'md:grid-cols-2')}>
        {conditions.map((c) => (
          <PhysicalHealthConditionCardView
            key={c.conditionId}
            compact={embedded}
            condition={c}
            onEditLegacy={onEditLegacy}
          />
        ))}
      </div>
    </section>
  );
}

export function PhysicalHealthResolvedSection({
  conditions,
  onEditLegacy,
}: {
  conditions: PhysicalHealthConditionCard[];
  onEditLegacy: (legacyNoteId: string) => void;
}) {
  if (conditions.length === 0) {
    return null;
  }

  return (
    <>
      <CorpsDivider count={conditions.length} label="Historique" />
      <section className="space-y-3">
        <h3 className="text-section-title text-muted-foreground text-base">Historique résolu</h3>
        <p className="text-muted-foreground text-sm">
          Le Digital Twin ne supprime jamais une condition — l&apos;historique reste disponible.
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          {conditions.map((c) => (
            <PhysicalHealthConditionCardView
              key={c.conditionId}
              condition={c}
              onEditLegacy={onEditLegacy}
            />
          ))}
        </div>
      </section>
    </>
  );
}

export function PhysicalHealthEmptySection({
  emptyState,
}: {
  emptyState: {
    title: string;
    description?: string;
    action?: { href: string; label: string };
  };
}) {
  return (
    <CorpsEmptyState
      description={emptyState.description ?? ''}
      icon={HeartPulse}
      title={emptyState.title}
      action={
        emptyState.action ? (
          <Link
            className="text-primary inline-flex min-h-11 items-center text-sm font-medium hover:underline lg:min-h-9"
            href={emptyState.action.href}
          >
            {emptyState.action.label}
          </Link>
        ) : undefined
      }
    />
  );
}

type AggregateDisplay = ReturnType<
  typeof import('@/components/physical-health/physical-health-page-helpers').aggregateDisplayValues
>;

function SuiviSignalChip({
  label,
  value,
  sub,
  tone,
  loading,
}: {
  label: string;
  value: string;
  sub?: string;
  tone: keyof typeof CORPS_TONE_DOT;
  loading: boolean;
}) {
  if (!loading) {
    return (
      <div className="chip-surface flex min-h-11 min-w-0 flex-col gap-1 rounded-2xl px-3 py-2.5">
        <span className="flex items-center gap-1.5">
          <span className={cn('h-2 w-2 shrink-0 rounded-full', CORPS_TONE_DOT[tone])} aria-hidden />
          <span className="text-muted-foreground text-xs font-medium tracking-wide">{label}</span>
        </span>
        <span className="text-data text-foreground text-[15px] tabular-nums">{value}</span>
        {sub ? <span className="text-muted-foreground text-xs leading-snug">{sub}</span> : null}
      </div>
    );
  }

  return <CorpsStatCard label={label} tone={tone} value="" loading />;
}

type StatsGridProps = {
  loading: boolean;
  aggregate: {
    activeCount: number;
    aggregateTrainingCapacityLabel: string;
    decisionLabel: string;
    confidencePct: number;
  };
  display: AggregateDisplay;
};

function PhysicalHealthStatsGridFull({ loading, aggregate, display }: StatsGridProps) {
  const capacitySublabel = loading ? undefined : aggregate.aggregateTrainingCapacityLabel;
  const verdictSublabel = loading ? undefined : aggregate.decisionLabel;
  const confidenceValue = loading ? '' : `${aggregate.confidencePct}%`;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <CorpsStatCard
        label="Actives"
        loading={loading}
        tone={display.activesTone}
        value={String(aggregate.activeCount)}
      />
      <CorpsStatCard
        label="Capacité"
        loading={loading}
        sublabel={capacitySublabel}
        tone={display.capacityTone}
        value={display.capacityValue}
      />
      <CorpsStatCard
        label="Verdict modèle"
        loading={loading}
        sublabel={verdictSublabel}
        tone={display.verdictTone}
        value={display.verdictValue}
      />
      <CorpsStatCard
        label="Confiance"
        loading={loading}
        tone={display.confidenceTone}
        value={confidenceValue}
      />
    </div>
  );
}

function PhysicalHealthStatsGridEmbedded({ loading, aggregate, display }: StatsGridProps) {
  const capacitySub = loading ? undefined : aggregate.aggregateTrainingCapacityLabel;
  const verdictSub = loading ? undefined : aggregate.decisionLabel;
  const confidenceValue = loading ? '…' : `${aggregate.confidencePct}%`;

  return (
    <nav aria-label="Signaux de suivi" className="grid grid-cols-2 gap-2 lg:grid-cols-4">
      <SuiviSignalChip
        label="Actives"
        loading={loading}
        tone={display.activesTone}
        value={String(aggregate.activeCount)}
      />
      <SuiviSignalChip
        label="Capacité"
        loading={loading}
        sub={capacitySub}
        tone={display.capacityTone}
        value={display.capacityValue}
      />
      <SuiviSignalChip
        label="Verdict"
        loading={loading}
        sub={verdictSub}
        tone={display.verdictTone}
        value={display.verdictValue}
      />
      <SuiviSignalChip
        label="Confiance"
        loading={loading}
        tone={display.confidenceTone}
        value={confidenceValue}
      />
    </nav>
  );
}

/** Instrument chips — same dialect as composition signals, not a 4-card dashboard. */
export function PhysicalHealthStatsGrid({
  loading,
  aggregate,
  display,
  embedded = false,
}: StatsGridProps & { embedded?: boolean }) {
  const Grid = embedded ? PhysicalHealthStatsGridEmbedded : PhysicalHealthStatsGridFull;
  return <Grid aggregate={aggregate} display={display} loading={loading} />;
}
