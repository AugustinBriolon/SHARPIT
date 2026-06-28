"use client";

import { HeartPulse, Plus } from "lucide-react";
import { useState } from "react";
import { PhysicalNoteCard } from "@/components/physical/physical-note-card";
import { PhysicalNoteDialog } from "@/components/physical/physical-note-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { ClientPhysicalNote } from "@/lib/client/types";
import { usePhysicalNotes } from "@/hooks/use-physical";

type DialogState =
  | { mode: "create" }
  | { mode: "edit"; note: ClientPhysicalNote }
  | null;

export function PhysicalView() {
  const notesQuery = usePhysicalNotes();
  const [dialog, setDialog] = useState<DialogState>(null);

  const header = (
    <header className="flex flex-wrap items-end justify-between gap-4">
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
    </header>
  );

  if (notesQuery.isLoading) {
    return (
      <div className="space-y-6">
        {header}
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
          <section className="space-y-4">
            <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
              En cours ({active.length})
            </h2>
            {active.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Rien d&apos;actif. 💪
              </p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {active.map((note) => (
                  <PhysicalNoteCard
                    key={note.id}
                    note={note}
                    onEdit={() => setDialog({ mode: "edit", note })}
                  />
                ))}
              </div>
            )}
          </section>

          {resolved.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                Résolues ({resolved.length})
              </h2>
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
