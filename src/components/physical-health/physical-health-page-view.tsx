'use client';

import Link from 'next/link';
import { Plus, HeartPulse } from 'lucide-react';
import { useState } from 'react';
import {
  CorpsDisclaimer,
  CorpsDivider,
  CorpsEmptyState,
  CorpsSectionHeader,
  CorpsStatCard,
} from '@/components/corps/corps-ui';
import { PhysicalNoteDialog } from '@/components/physical/physical-note-dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { SkeletonCard, SkeletonEyebrow } from '@/components/ui/skeleton-patterns';
import type { PhysicalHealthViewModel } from '@/core/presentation/physical-health-view-model';
import { usePhysicalNotes } from '@/hooks/use-physical';
import type { ClientPhysicalNote } from '@/lib/query/types';
import { corpsToneFromPhysicalSeverity } from '@/lib/health-status';
import { PhysicalHealthConditionCardView } from './condition-card';
import { GlobalDecisionStrip } from '@/components/today/drill-down/global-decision-strip';

type DialogState = { mode: 'create' } | { mode: 'edit'; note: ClientPhysicalNote } | null;

function confidenceToneClass(tone: string): 'ok' | 'watch' | 'neutral' {
  if (tone === 'good') return 'ok';
  if (tone === 'warn') return 'watch';
  return 'neutral';
}

export function PhysicalHealthPageView({
  viewModel,
  embedded = false,
}: {
  viewModel: PhysicalHealthViewModel;
  embedded?: boolean;
}) {
  const notesQuery = usePhysicalNotes();
  const [dialog, setDialog] = useState<DialogState>(null);

  const headerAction = (
    <Button size="sm" onClick={() => setDialog({ mode: 'create' })}>
      <Plus className="size-4" />
      Nouvelle condition
    </Button>
  );

  function openLegacyCheckin(legacyNoteId: string) {
    const note = notesQuery.data?.find((n) => n.id === legacyNoteId);
    if (note) setDialog({ mode: 'edit', note });
  }

  const { aggregate, activeConditions, resolvedConditions, globalDecision } = viewModel;
  const hasAny = activeConditions.length > 0 || resolvedConditions.length > 0;

  return (
    <div className="space-y-4">
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
          value={String(aggregate.activeCount)}
          tone={
            aggregate.activeCount > 0 ? corpsToneFromPhysicalSeverity(aggregate.maxSeverity) : 'ok'
          }
        />
        <CorpsStatCard
          label="Capacité"
          sublabel={aggregate.aggregateTrainingCapacityLabel}
          tone={aggregate.trainingBlocked ? 'attention' : 'ok'}
          value={aggregate.trainingBlocked ? 'Limitée' : 'OK'}
        />
        <CorpsStatCard
          label="Verdict modèle"
          sublabel={aggregate.decisionLabel}
          tone={aggregate.trainingBlocked ? 'watch' : 'neutral'}
          value={aggregate.maxSeverity > 0 ? `${aggregate.maxSeverity.toFixed(1)}/10` : '—'}
        />
        <CorpsStatCard
          label="Confiance"
          tone={confidenceToneClass(aggregate.confidenceTone)}
          value={`${aggregate.confidencePct}%`}
        />
      </div>

      {!hasAny && viewModel.emptyState && (
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
      )}

      {activeConditions.length > 0 && (
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
      )}

      {resolvedConditions.length > 0 && (
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
      )}

      <CorpsDisclaimer title="Aide à la décision, pas un avis médical">
        {viewModel.medicalDisclaimer}
      </CorpsDisclaimer>

      {dialog && (
        <PhysicalNoteDialog
          note={dialog.mode === 'edit' ? dialog.note : undefined}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  );
}

export function PhysicalHealthPageSkeleton({ embedded = false }: { embedded?: boolean }) {
  return (
    <div className="space-y-4">
      {!embedded ? (
        <div className="space-y-2">
          <Skeleton className="h-3 w-20 rounded-full border-0" />
          <Skeleton className="h-8 w-48 max-w-full rounded-full border-0" />
          <Skeleton className="h-4 w-full max-w-xl rounded-full border-0" />
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Skeleton className="h-4 w-64 max-w-full rounded-full border-0" />
          <Skeleton className="h-9 w-40 rounded-lg" />
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="analysis-panel rounded-analysis-lg px-4 py-4">
            <Skeleton className="h-2.5 w-14 rounded-full border-0" />
            <Skeleton className="mt-2 h-8 w-10 border-0" />
            <Skeleton className="mt-1 h-3 w-20 rounded-full border-0" />
          </div>
        ))}
      </div>

      <SkeletonCard className="px-5 py-5">
        <SkeletonEyebrow className="w-40" />
        <Skeleton className="mt-3 h-7 w-48 max-w-full rounded-full border-0" />
        <Skeleton className="mt-2 h-4 w-full max-w-lg rounded-full border-0" />
      </SkeletonCard>

      <div className="grid gap-3 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <SkeletonCard key={i} className="min-h-48 px-5 py-5">
            <Skeleton className="h-4 w-32 rounded-full border-0" />
            <Skeleton className="mt-3 h-4 w-full rounded-full border-0" />
            <Skeleton className="mt-2 h-4 rounded-full border-0" style={{ width: '83%' }} />
            <Skeleton className="mt-4 h-8 w-28 rounded-lg" />
          </SkeletonCard>
        ))}
      </div>
    </div>
  );
}
