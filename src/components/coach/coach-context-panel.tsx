"use client";

import { Check, ChevronDown, Loader2, NotebookPen } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useCoachContext, useSaveCoachContext } from "@/hooks/use-coach";
import { cn } from "@/lib/utils";

const PLACEHOLDER = `Ex. :
- En télétravail le lundi et le jeudi → plus de dispo pour les grosses séances ou les bricks ces jours-là.
- Pas plus de 45 min le mardi midi.
- Je préfère nager tôt le matin.
- Charge de travail intense en ce moment, garder de la marge.`;

export function CoachContextPanel() {
  const { data, isLoading } = useCoachContext();
  const save = useSaveCoachContext();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [syncedFrom, setSyncedFrom] = useState<string | undefined>(undefined);
  const [justSaved, setJustSaved] = useState(false);

  // Synchronise la valeur initiale avec les données chargées (pattern React :
  // ajustement d'état pendant le rendu plutôt que dans un effet).
  if (data !== undefined && data !== syncedFrom) {
    setSyncedFrom(data);
    setValue(data);
  }

  const dirty = (data ?? "") !== value;

  function handleSave() {
    save.mutate(value, {
      onSuccess: () => {
        setJustSaved(true);
        setTimeout(() => setJustSaved(false), 2000);
      },
    });
  }

  const hasContent = (data ?? "").trim().length > 0;

  return (
    <div className="rounded-xl border border-border/60 bg-card/30">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <NotebookPen className="size-4 text-primary" />
        <div className="flex-1">
          <p className="text-sm font-medium">Mon contexte</p>
          <p className="text-xs text-muted-foreground">
            {hasContent
              ? "Contraintes et préférences prises en compte par le coach."
              : "Ajoute tes dispos, contraintes pro, préférences… pour des propositions plus pertinentes."}
          </p>
        </div>
        <ChevronDown
          className={cn(
            "size-4 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div className="space-y-3 border-t border-border/60 p-4">
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Chargement…
            </div>
          ) : (
            <>
              <Textarea
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={PLACEHOLDER}
                rows={8}
                className="resize-y text-sm"
              />
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Ce texte est injecté dans le contexte du coach (chat &
                  génération).
                </p>
                <div className="flex items-center gap-2">
                  {justSaved && (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                      <Check className="size-3.5" /> Enregistré
                    </span>
                  )}
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={!dirty || save.isPending}
                  >
                    {save.isPending && (
                      <Loader2 className="size-3.5 animate-spin" />
                    )}
                    Enregistrer
                  </Button>
                </div>
              </div>
              {save.isError && (
                <p className="text-xs text-destructive">{save.error.message}</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
