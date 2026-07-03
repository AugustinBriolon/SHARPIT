'use client';

import { HeartPulse, Plus } from 'lucide-react';
import { useState } from 'react';
import {
  CorpsDivider,
  CorpsEmptyState,
  CorpsSectionHeader,
  CorpsStatCard,
} from '@/components/corps/corps-ui';
import { PhysicalNoteCard } from '@/components/physical/physical-note-card';
import { PhysicalNoteDialog } from '@/components/physical/physical-note-dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { ClientPhysicalNote } from '@/lib/query/types';
import { categoryLabels, categoryOrder } from '@/lib/physical';
import { usePhysicalNotes } from '@/hooks/use-physical';

type DialogState = { mode: 'create' } | { mode: 'edit'; note: ClientPhysicalNote } | null;

function severityTone(avgSeverity: number | null): 'low' | 'moderate' | 'neutral' {
  if (avgSeverity == null) return 'neutral';
  if (avgSeverity >= 7) return 'low';
  if (avgSeverity >= 4) return 'moderate';
  return 'neutral';
}

export function PhysicalView({ embedded = false }: { embedded?: boolean }) {
  const notesQuery = usePhysicalNotes();
  const [dialog, setDialog] = useState<DialogState>(null);

  const headerAction = (
    <Button size="sm" onClick={() => setDialog({ mode: 'create' })}>
      <Plus className="size-4" />
      Nouvelle note
    </Button>
  );

  if (notesQuery.isLoading) {
    return (
      <div className="space-y-4">
        {!embedded && (
          <CorpsSectionHeader
            action={headerAction}
            description="Douleurs, blessures, mobilité et posture — pris en compte par le coach."
            label="Corps"
            title="Suivi physique"
          />
        )}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  const notes = notesQuery.data ?? [];
  const active = notes.filter((n) => n.status !== 'RESOLVED');
  const resolved = notes.filter((n) => n.status === 'RESOLVED');
  const monitoring = active.filter((n) => n.status === 'MONITORING');

  const activeSeverities = active.map((n) => n.severity).filter((s): s is number => s != null);
  const avgSeverity =
    activeSeverities.length > 0
      ? Math.round((activeSeverities.reduce((a, b) => a + b, 0) / activeSeverities.length) * 10) /
        10
      : null;

  const activeByCategory = categoryOrder
    .map((category) => ({
      category,
      items: active
        .filter((n) => n.category === category)
        .sort((a, b) => (b.severity ?? -1) - (a.severity ?? -1)),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <div className="space-y-4">
      <CorpsSectionHeader
        action={headerAction}
        label={embedded ? undefined : 'Corps'}
        title={embedded ? 'Notes actives' : 'Suivi physique'}
        description={
          embedded
            ? 'Douleurs, blessures et points de vigilance pris en compte par le coach.'
            : 'Douleurs, blessures, mobilité et posture — pris en compte par le coach.'
        }
      />

      {notes.length === 0 ? (
        <CorpsEmptyState
          description="Ajoute une douleur, un point de mobilité ou un déséquilibre : le coach en tiendra compte dans tes séances."
          icon={HeartPulse}
          title="Aucune note pour l'instant"
          action={
            <Button onClick={() => setDialog({ mode: 'create' })}>
              <Plus className="size-4" />
              Créer ma première note
            </Button>
          }
        />
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <CorpsStatCard label="En cours" value={String(active.length)} />
            <CorpsStatCard
              footer={avgSeverity != null ? '/10 sur les notes actives' : undefined}
              label="Sévérité moy."
              tone={severityTone(avgSeverity)}
              value={avgSeverity != null ? `${avgSeverity}` : '—'}
            />
            <CorpsStatCard label="Sous surveillance" value={String(monitoring.length)} />
            <CorpsStatCard label="Résolues" tone="good" value={String(resolved.length)} />
          </section>

          {active.length === 0 ? (
            <p className="text-muted-foreground bg-card/40 rounded-2xl border border-dashed py-10 text-center text-sm">
              Rien d&apos;actif pour le moment.
            </p>
          ) : (
            <div className="space-y-6">
              {activeByCategory.map((group) => (
                <section key={group.category} className="space-y-3">
                  <CorpsDivider count={group.items.length} label={categoryLabels[group.category]} />
                  <div className="grid gap-3 md:grid-cols-2">
                    {group.items.map((note) => (
                      <PhysicalNoteCard
                        key={note.id}
                        note={note}
                        onEdit={() => setDialog({ mode: 'edit', note })}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}

          {resolved.length > 0 && (
            <section className="space-y-3">
              <CorpsDivider count={resolved.length} label="Résolues" />
              <div className="grid gap-3 md:grid-cols-2">
                {resolved.map((note) => (
                  <PhysicalNoteCard
                    key={note.id}
                    note={note}
                    onEdit={() => setDialog({ mode: 'edit', note })}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {dialog && (
        <PhysicalNoteDialog
          note={dialog.mode === 'edit' ? dialog.note : undefined}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  );
}
