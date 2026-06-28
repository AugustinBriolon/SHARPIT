"use client";

import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { Check, Loader2, Wand2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import type { ClientPlannedSession } from "@/lib/client/types";
import { activityTypeLabels } from "@/lib/format";
import { intensityLabels } from "@/lib/sessions";
import { cn } from "@/lib/utils";
import { useAdaptPlan, type AdaptChange } from "@/hooks/use-coach";
import {
  usePlannedSessions,
  usePlannedSessionMutations,
  type PlannedSessionPayload,
} from "@/hooks/use-data";

const ACTION_LABEL: Record<AdaptChange["action"], string> = {
  MODIFY: "Modifier",
  REMOVE: "Supprimer",
  ADD: "Ajouter",
};

const ACTION_STYLE: Record<AdaptChange["action"], string> = {
  MODIFY: "bg-amber-400/15 text-amber-400",
  REMOVE: "bg-red-400/15 text-red-400",
  ADD: "bg-emerald-400/15 text-emerald-400",
};

export function PlanAdapter({ onClose }: { onClose: () => void }) {
  const [focus, setFocus] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [applyError, setApplyError] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);

  const adapt = useAdaptPlan();
  const plannedQuery = usePlannedSessions();
  const { create, update, remove } = usePlannedSessionMutations();
  const result = adapt.data;

  const sessionsById = useMemo(() => {
    const map = new Map<string, ClientPlannedSession>();
    for (const s of plannedQuery.data ?? []) map.set(s.id, s);
    return map;
  }, [plannedQuery.data]);

  async function handleAdapt() {
    setApplyError(null);
    setApplied(false);
    const res = await adapt.mutateAsync({
      days: 14,
      focus: focus.trim() || undefined,
    });
    setSelected(new Set(res.changes.map((_, i) => i)));
  }

  function toggle(i: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  async function handleApply() {
    if (!result) return;
    setApplyError(null);
    const changes = result.changes.filter((_, i) => selected.has(i));
    try {
      for (const c of changes) {
        if (c.action === "REMOVE" && c.sessionId) {
          await remove.mutateAsync(c.sessionId);
        } else if (c.action === "MODIFY" && c.sessionId) {
          const data: Partial<PlannedSessionPayload> = {};
          if (c.type) data.type = c.type;
          if (c.intensity) data.intensity = c.intensity;
          if (c.title != null) data.title = c.title;
          if (c.description != null) data.description = c.description;
          if (c.durationMin != null) data.durationMin = c.durationMin;
          if (c.load != null) data.load = c.load;
          if (c.date) data.date = new Date(`${c.date}T12:00:00`);
          await update.mutateAsync({ id: c.sessionId, data });
        } else if (c.action === "ADD" && c.date && c.type) {
          await create.mutateAsync({
            type: c.type,
            date: new Date(`${c.date}T12:00:00`),
            title: c.title,
            description: c.description,
            durationMin: c.durationMin,
            load: c.load,
            intensity: c.intensity,
          });
        }
      }
      setApplied(true);
      setTimeout(onClose, 800);
    } catch (err) {
      setApplyError(err instanceof Error ? err.message : "Erreur");
    }
  }

  const isAdapting = adapt.isPending;
  const isApplying = create.isPending || update.isPending || remove.isPending;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="size-4 text-primary" />
            Réadapter mes séances
          </DialogTitle>
          <DialogDescription>
            Le coach analyse ce que tu as réellement réalisé et propose des
            ajustements de tes séances des 14 prochains jours.
          </DialogDescription>
        </DialogHeader>

        <Textarea
          rows={2}
          value={focus}
          onChange={(e) => setFocus(e.target.value)}
          placeholder="Contexte optionnel : fatigue, blessure, contrainte d'agenda…"
        />

        <Button onClick={handleAdapt} disabled={isAdapting} className="w-fit">
          {isAdapting ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Analyse…
            </>
          ) : (
            <>
              <Wand2 className="size-4" />
              {result ? "Régénérer les propositions" : "Proposer des ajustements"}
            </>
          )}
        </Button>

        {adapt.error && (
          <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {adapt.error.message}
          </p>
        )}

        {result && (
          <div className="space-y-3">
            <p className="rounded-md border border-primary/20 bg-primary/5 p-3 text-sm text-muted-foreground">
              {result.summary}
            </p>

            {result.changes.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Aucun ajustement nécessaire : ton plan est cohérent. 👍
              </p>
            )}

            <div className="space-y-2">
              {result.changes.map((c, i) => {
                const existing = c.sessionId
                  ? sessionsById.get(c.sessionId)
                  : null;
                const dateStr = c.date
                  ? format(parseISO(c.date), "EEE d MMM", { locale: fr })
                  : existing?.date
                    ? format(existing.date, "EEE d MMM", { locale: fr })
                    : "";
                const fields = [
                  c.type ? activityTypeLabels[c.type] : null,
                  c.intensity ? intensityLabels[c.intensity] : null,
                  c.durationMin != null ? `${c.durationMin} min` : null,
                  c.load != null ? `${c.load} TSS` : null,
                ]
                  .filter(Boolean)
                  .join(" · ");
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggle(i)}
                    className={cn(
                      "flex w-full gap-3 rounded-lg border p-3 text-left transition-colors",
                      selected.has(i)
                        ? "border-primary/40 bg-primary/5"
                        : "border-border/50 bg-card/30 opacity-60 hover:opacity-100",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border",
                        selected.has(i)
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border",
                      )}
                    >
                      {selected.has(i) && <Check className="size-3.5" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            "rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                            ACTION_STYLE[c.action],
                          )}
                        >
                          {ACTION_LABEL[c.action]}
                        </span>
                        {dateStr && (
                          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            {dateStr}
                          </span>
                        )}
                        {(c.title ?? existing?.title) && (
                          <span className="text-sm font-medium">
                            {c.title ?? existing?.title}
                          </span>
                        )}
                      </div>
                      {fields && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {fields}
                        </p>
                      )}
                      {c.description && (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {c.description}
                        </p>
                      )}
                      <p className="mt-1 text-xs italic text-muted-foreground/80">
                        → {c.reason}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {applyError && (
              <p className="text-sm text-destructive">{applyError}</p>
            )}

            {result.changes.length > 0 && (
              <div className="flex items-center justify-between gap-2 border-t border-border/60 pt-3">
                <span className="text-xs text-muted-foreground">
                  {selected.size} ajustement(s) sélectionné(s)
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={onClose}>
                    Fermer
                  </Button>
                  <Button
                    onClick={handleApply}
                    disabled={isApplying || selected.size === 0 || applied}
                  >
                    {applied ? (
                      <>
                        <Check className="size-4" /> Appliqué
                      </>
                    ) : isApplying ? (
                      <>
                        <Loader2 className="size-4 animate-spin" /> Application…
                      </>
                    ) : (
                      "Appliquer"
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
