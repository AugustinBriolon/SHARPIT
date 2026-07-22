'use client';

import {
  CorpsDisclaimer,
  CorpsDivider,
  CorpsEmptyState,
  CorpsSectionHeader,
  CorpsStatCard,
} from '@/components/corps/corps-ui';
import { HeartPulse, Plus } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { PhysicalHealthViewModel } from '@/core/presentation/physical-health-view-model';
import { usePhysicalNotes } from '@/hooks/use-physical';
import { corpsToneFromPhysicalSeverity } from '@/lib/health/health-status';
import type { CorpsTone } from '@/lib/ui/metric-tone';
import type { ClientPhysicalNote } from '@/lib/query/types';
import { PhysicalHealthConditionCardView } from './condition-card';
import { PhysicalNoteDialog } from './physical-note-dialog';

type DialogState = { mode: 'create' } | { mode: 'edit'; note: ClientPhysicalNote } | null;

function confidenceToneClass(tone: string): 'ok' | 'watch' | 'neutral' {
  if (tone === 'good') return 'ok';
  if (tone === 'warn') return 'watch';
  return 'neutral';
}

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

export function PhysicalHealthPageView({
  embedded = false,
  loading = false,
  viewModel,
}: {
  viewModel: PhysicalHealthViewModel;
  embedded?: boolean;
  loading?: boolean;
}) {
  const notesQuery = usePhysicalNotes();
  const [dialog, setDialog] = useState<DialogState>(null);

  const headerAction = (
    <Button disabled={loading} size="sm" onClick={() => setDialog({ mode: 'create' })}>
      <Plus className="size-4" />
      Nouvelle condition
    </Button>
  );

  function openLegacyCheckin(legacyNoteId: string) {
    const note = notesQuery.data?.find((n) => n.id === legacyNoteId);
    if (note) setDialog({ mode: 'edit', note });
  }

  const { aggregate, activeConditions, resolvedConditions } = viewModel;
  const hasAny = !loading && (activeConditions.length > 0 || resolvedConditions.length > 0);

  let capacityValue = '';
  if (!loading) capacityValue = aggregate.trainingBlocked ? 'Limitée' : 'OK';

  let verdictValue = '';
  if (!loading) {
    verdictValue = aggregate.maxSeverity > 0 ? `${aggregate.maxSeverity.toFixed(1)}/10` : '—';
  }

  let activesTone: CorpsTone = 'ok';
  if (!loading && aggregate.activeCount > 0) {
    activesTone = corpsToneFromPhysicalSeverity(aggregate.maxSeverity);
  }

  return (
    <>
      {!embedded && (
        <CorpsSectionHeader
          action={headerAction}
          description="État inféré à partir de tes observations — symptômes et capacité fonctionnelle sont distincts."
          label="Physiologie"
          title="Santé physique"
        />
      )}

      {embedded && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-muted-foreground text-xs leading-relaxed">
            Conditions actives, capacité d&apos;entraînement et évolution inférées.
          </p>
          {headerAction}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <CorpsStatCard
          label="Actives"
          loading={loading}
          tone={activesTone}
          value={String(aggregate.activeCount)}
        />
        <CorpsStatCard
          label="Capacité"
          loading={loading}
          sublabel={loading ? undefined : aggregate.aggregateTrainingCapacityLabel}
          tone={!loading && aggregate.trainingBlocked ? 'attention' : 'ok'}
          value={capacityValue}
        />
        <CorpsStatCard
          label="Verdict modèle"
          loading={loading}
          sublabel={loading ? undefined : aggregate.decisionLabel}
          tone={!loading && aggregate.trainingBlocked ? 'watch' : 'neutral'}
          value={verdictValue}
        />
        <CorpsStatCard
          label="Confiance"
          loading={loading}
          tone={loading ? 'neutral' : confidenceToneClass(aggregate.confidenceTone)}
          value={loading ? '' : `${aggregate.confidencePct}%`}
        />
      </div>

      {!loading && !hasAny && viewModel.emptyState ? (
        <CorpsEmptyState
          description={viewModel.emptyState.description ?? ''}
          icon={HeartPulse}
          title={viewModel.emptyState.title}
          action={
            viewModel.emptyState.action ? (
              <Link
                className="text-primary text-sm font-medium hover:underline"
                href={viewModel.emptyState.action.href}
              >
                {viewModel.emptyState.action.label}
              </Link>
            ) : undefined
          }
        />
      ) : null}

      {loading ? (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold">Conditions actives</h3>
          <div className="grid gap-3 md:grid-cols-2">
            <ConditionCardSkeleton />
            <ConditionCardSkeleton />
          </div>
        </section>
      ) : null}

      {!loading && activeConditions.length > 0 ? (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold">Conditions actives</h3>
          <div className="grid gap-3 md:grid-cols-2">
            {activeConditions.map((c) => (
              <PhysicalHealthConditionCardView
                key={c.conditionId}
                compact={embedded}
                condition={c}
                onEditLegacy={openLegacyCheckin}
              />
            ))}
          </div>
        </section>
      ) : null}

      {!loading && resolvedConditions.length > 0 ? (
        <>
          <CorpsDivider count={resolvedConditions.length} label="Historique" />
          <section className="space-y-3">
            <h3 className="text-muted-foreground text-sm font-semibold">Historique résolu</h3>
            <p className="text-muted-foreground text-xs">
              Le Digital Twin ne supprime jamais une condition — l&apos;historique reste disponible.
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              {resolvedConditions.map((c) => (
                <PhysicalHealthConditionCardView
                  key={c.conditionId}
                  condition={c}
                  onEditLegacy={openLegacyCheckin}
                />
              ))}
            </div>
          </section>
        </>
      ) : null}

      <CorpsDisclaimer title="Aide à la décision, pas un avis médical">
        {viewModel.medicalDisclaimer}
      </CorpsDisclaimer>

      {dialog && !loading ? (
        <PhysicalNoteDialog
          note={dialog.mode === 'edit' ? dialog.note : undefined}
          onClose={() => setDialog(null)}
        />
      ) : null}
    </>
  );
}
