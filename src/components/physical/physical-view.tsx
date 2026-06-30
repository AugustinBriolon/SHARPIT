'use client';

import { HeartPulse, Plus } from 'lucide-react';
import { useState } from 'react';
import { PageHeader } from '@/components/layout/sticky-header';
import { PhysicalNoteCard } from '@/components/physical/physical-note-card';
import { PhysicalNoteDialog } from '@/components/physical/physical-note-dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { ClientPhysicalNote } from '@/lib/client/types';
import { categoryLabels, categoryOrder, severityColor } from '@/lib/physical';
import { cn } from '@/lib/utils';
import { usePhysicalNotes } from '@/hooks/use-physical';

type DialogState = { mode: 'create' } | { mode: 'edit'; note: ClientPhysicalNote } | null;

function StatTile({
  label,
  value,
  sublabel,
  valueClassName,
}: {
  label: string;
  value: string;
  sublabel?: string;
  valueClassName?: string;
}) {
  return (
    <div className="border-border bg-card rounded-xl border p-4">
      <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">{label}</p>
      <p className={cn('mt-2 font-mono text-2xl font-semibold tabular-nums', valueClassName)}>
        {value}
      </p>
      {sublabel && <p className="text-muted-foreground mt-0.5 text-xs">{sublabel}</p>}
    </div>
  );
}

function CategoryDivider({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-center gap-3">
      <h3 className="text-sm font-medium">{label}</h3>
      <span className="text-muted-foreground font-mono text-xs tabular-nums">{count}</span>
      <div className="bg-border/60 h-px flex-1" />
    </div>
  );
}

export function PhysicalView({ embedded = false }: { embedded?: boolean }) {
  const notesQuery = usePhysicalNotes();
  const [dialog, setDialog] = useState<DialogState>(null);

  const header = (
    <PageHeader className="flex flex-wrap items-end justify-between gap-4" embedded={embedded}>
      {!embedded ? (
        <div>
          <p className="text-primary text-xs font-medium tracking-[0.2em] uppercase">Corps</p>
          <h1 className="font-heading mt-2 text-3xl font-semibold tracking-tight">
            Suivi physique
          </h1>
          <p className="text-muted-foreground mt-1">
            Douleurs, blessures, mobilité et posture — pris en compte par le coach.
          </p>
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">Douleurs, blessures et suivi corporel.</p>
      )}
      <Button onClick={() => setDialog({ mode: 'create' })}>
        <Plus className="size-4" />
        Nouvelle note
      </Button>
    </PageHeader>
  );

  if (notesQuery.isLoading) {
    return (
      <div className="space-y-8">
        {header}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-48" />
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
    <div className="space-y-8">
      {header}

      {notes.length === 0 ? (
        <div className="border-border/60 flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-16 text-center">
          <HeartPulse className="text-muted-foreground/50 size-8" />
          <p className="text-muted-foreground max-w-sm text-sm">
            Aucune note pour l&apos;instant. Ajoute une douleur, un point de mobilité ou un
            déséquilibre : le coach en tiendra compte dans tes séances.
          </p>
          <Button onClick={() => setDialog({ mode: 'create' })}>
            <Plus className="size-4" />
            Créer ma première note
          </Button>
        </div>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile label="En cours" value={String(active.length)} />
            <StatTile
              label="Sévérité moy."
              sublabel={avgSeverity != null ? '/10 sur les notes actives' : undefined}
              value={avgSeverity != null ? `${avgSeverity}` : '—'}
              valueClassName={severityColor(avgSeverity)}
            />
            <StatTile label="Sous surveillance" value={String(monitoring.length)} />
            <StatTile label="Résolues" value={String(resolved.length)} />
          </section>

          {active.length === 0 ? (
            <p className="border-border/60 text-muted-foreground rounded-xl border border-dashed py-10 text-center text-sm">
              Rien d&apos;actif pour le moment. 💪
            </p>
          ) : (
            <div className="space-y-8">
              {activeByCategory.map((group) => (
                <section key={group.category} className="space-y-4">
                  <CategoryDivider
                    count={group.items.length}
                    label={categoryLabels[group.category]}
                  />
                  <div className="grid gap-4 md:grid-cols-2">
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
            <section className="space-y-4">
              <CategoryDivider count={resolved.length} label="Résolues" />
              <div className="grid gap-4 md:grid-cols-2">
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
