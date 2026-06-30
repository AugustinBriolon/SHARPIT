"use client";

import { HeartPulse, Plus } from "lucide-react";
import { useState } from "react";
import { StickyHeader } from "@/components/layout/sticky-header";
import { PhysicalNoteCard } from "@/components/physical/physical-note-card";
import { PhysicalNoteDialog } from "@/components/physical/physical-note-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { ClientPhysicalNote } from "@/lib/client/types";
import { categoryLabels, categoryOrder, severityColor } from "@/lib/physical";
import { cn } from "@/lib/utils";
import { usePhysicalNotes } from "@/hooks/use-physical";

type DialogState =
  | { mode: "create" }
  | { mode: "edit"; note: ClientPhysicalNote }
  | null;

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
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-2 font-mono text-2xl font-semibold tabular-nums",
          valueClassName,
        )}
      >
        {value}
      </p>
      {sublabel && (
        <p className="mt-0.5 text-xs text-muted-foreground">{sublabel}</p>
      )}
    </div>
  );
}

function CategoryDivider({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-center gap-3">
      <h3 className="text-sm font-medium">{label}</h3>
      <span className="font-mono text-xs text-muted-foreground tabular-nums">
        {count}
      </span>
      <div className="h-px flex-1 bg-border/60" />
    </div>
  );
}

export function PhysicalView() {
  const notesQuery = usePhysicalNotes();
  const [dialog, setDialog] = useState<DialogState>(null);

  const header = (
    <StickyHeader className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">
          Corps
        </p>
        <h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight">
          Suivi physique
        </h1>
        <p className="mt-1 text-muted-foreground">
          Douleurs, blessures, mobilité et posture — pris en compte par le coach.
        </p>
      </div>
      <Button onClick={() => setDialog({ mode: "create" })}>
        <Plus className="size-4" />
        Nouvelle note
      </Button>
    </StickyHeader>
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
  const active = notes.filter((n) => n.status !== "RESOLVED");
  const resolved = notes.filter((n) => n.status === "RESOLVED");
  const monitoring = active.filter((n) => n.status === "MONITORING");

  const activeSeverities = active
    .map((n) => n.severity)
    .filter((s): s is number => s != null);
  const avgSeverity =
    activeSeverities.length > 0
      ? Math.round(
          (activeSeverities.reduce((a, b) => a + b, 0) /
            activeSeverities.length) *
            10,
        ) / 10
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
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/60 py-16 text-center">
          <HeartPulse className="size-8 text-muted-foreground/50" />
          <p className="max-w-sm text-sm text-muted-foreground">
            Aucune note pour l&apos;instant. Ajoute une douleur, un point de
            mobilité ou un déséquilibre : le coach en tiendra compte dans tes
            séances.
          </p>
          <Button onClick={() => setDialog({ mode: "create" })}>
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
              value={avgSeverity != null ? `${avgSeverity}` : "—"}
              sublabel={avgSeverity != null ? "/10 sur les notes actives" : undefined}
              valueClassName={severityColor(avgSeverity)}
            />
            <StatTile
              label="Sous surveillance"
              value={String(monitoring.length)}
            />
            <StatTile label="Résolues" value={String(resolved.length)} />
          </section>

          {active.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border/60 py-10 text-center text-sm text-muted-foreground">
              Rien d&apos;actif pour le moment. 💪
            </p>
          ) : (
            <div className="space-y-8">
              {activeByCategory.map((group) => (
                <section key={group.category} className="space-y-4">
                  <CategoryDivider
                    label={categoryLabels[group.category]}
                    count={group.items.length}
                  />
                  <div className="grid gap-4 md:grid-cols-2">
                    {group.items.map((note) => (
                      <PhysicalNoteCard
                        key={note.id}
                        note={note}
                        onEdit={() => setDialog({ mode: "edit", note })}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}

          {resolved.length > 0 && (
            <section className="space-y-4">
              <CategoryDivider label="Résolues" count={resolved.length} />
              <div className="grid gap-4 md:grid-cols-2">
                {resolved.map((note) => (
                  <PhysicalNoteCard
                    key={note.id}
                    note={note}
                    onEdit={() => setDialog({ mode: "edit", note })}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {dialog && (
        <PhysicalNoteDialog
          note={dialog.mode === "edit" ? dialog.note : undefined}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  );
}
