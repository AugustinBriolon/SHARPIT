'use client';

import { CorpsDivider, CorpsEmptyState, CorpsStatCard } from '@/components/corps/corps-ui';
import { HeartPulse } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import type { PhysicalHealthConditionCard } from '@/core/presentation/physical-health-view-model';
import { PhysicalHealthConditionCardView } from '@/components/physical-health/cards/condition-card';

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
      <div className="grid gap-3 md:grid-cols-2">
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

export function PhysicalHealthStatsGrid({
  loading,
  aggregate,
  display,
}: {
  loading: boolean;
  aggregate: {
    activeCount: number;
    aggregateTrainingCapacityLabel: string;
    decisionLabel: string;
    confidencePct: number;
  };
  display: ReturnType<
    typeof import('@/components/physical-health/physical-health-page-helpers').aggregateDisplayValues
  >;
}) {
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
        sublabel={loading ? undefined : aggregate.aggregateTrainingCapacityLabel}
        tone={display.capacityTone}
        value={display.capacityValue}
      />
      <CorpsStatCard
        label="Verdict modèle"
        loading={loading}
        sublabel={loading ? undefined : aggregate.decisionLabel}
        tone={display.verdictTone}
        value={display.verdictValue}
      />
      <CorpsStatCard
        label="Confiance"
        loading={loading}
        tone={display.confidenceTone}
        value={loading ? '' : `${aggregate.confidencePct}%`}
      />
    </div>
  );
}
