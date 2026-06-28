"use client";

import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { Check, Loader2, Sparkles } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { activityTypeLabels } from "@/lib/format";
import {
  formatPlannedDuration,
  intensityAccent,
  intensityLabels,
} from "@/lib/sessions";
import { cn } from "@/lib/utils";
import { useCoachPlan, type GeneratedSession } from "@/hooks/use-coach";
import { usePlannedSessionMutations } from "@/hooks/use-data";

const DAYS_OPTIONS = [
  { value: "7", label: "1 semaine" },
  { value: "14", label: "2 semaines" },
  { value: "3", label: "3 jours" },
];

interface PlanGeneratorProps {
  startDate?: string; // yyyy-MM-dd
  onClose: () => void;
}

export function PlanGenerator({ startDate, onClose }: PlanGeneratorProps) {
  const [days, setDays] = useState("7");
  const [focus, setFocus] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [insertError, setInsertError] = useState<string | null>(null);
  const [inserted, setInserted] = useState(false);

  const coachPlan = useCoachPlan();
  const { create } = usePlannedSessionMutations();
  const plan = coachPlan.data;

  async function handleGenerate() {
    setInsertError(null);
    setInserted(false);
    const result = await coachPlan.mutateAsync({
      days: Number(days),
      focus: focus.trim() || undefined,
      startDate,
    });
    // tout sélectionner par défaut
    setSelected(new Set(result.sessions.map((_, i) => i)));
  }

  function toggle(index: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  async function handleInsert() {
    if (!plan) return;
    setInsertError(null);
    const toAdd = plan.sessions.filter((_, i) => selected.has(i));
    try {
      for (const s of toAdd) {
        await create.mutateAsync({
          type: s.type,
          date: new Date(`${s.date}T12:00:00`),
          title: s.title,
          description: s.description,
          durationMin: s.durationMin,
          load: s.load,
          intensity: s.intensity,
        });
      }
      setInserted(true);
      setTimeout(onClose, 800);
    } catch (err) {
      setInsertError(err instanceof Error ? err.message : "Erreur d'insertion");
    }
  }

  const isGenerating = coachPlan.isPending;
  const isInserting = create.isPending;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            Générer mes séances
          </DialogTitle>
          <DialogDescription>
            Le coach IA analyse ta forme, ta récupération et ton objectif pour
            proposer un bloc d&apos;entraînement. Tu valides avant ajout.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-2">
            <Label>Durée du bloc</Label>
            <Select value={days} onValueChange={(v) => setDays(v ?? "7")}>
              <SelectTrigger className="w-40">
                <SelectValue>
                  {DAYS_OPTIONS.find((o) => o.value === days)?.label}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {DAYS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleGenerate} disabled={isGenerating}>
            {isGenerating ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Génération…
              </>
            ) : (
              <>
                <Sparkles className="size-4" />
                {plan ? "Régénérer" : "Générer"}
              </>
            )}
          </Button>
        </div>

        <div className="space-y-2">
          <Label htmlFor="focus">Demande spécifique (optionnel)</Label>
          <Textarea
            id="focus"
            rows={2}
            value={focus}
            onChange={(e) => setFocus(e.target.value)}
            placeholder="Ex : je veux deux grosses séances vélo, repos le vendredi, je pars en voyage samedi…"
          />
        </div>

        {coachPlan.error && (
          <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {coachPlan.error.message}
          </p>
        )}

        {plan && (
          <div className="space-y-3">
            <p className="rounded-md border border-primary/20 bg-primary/5 p-3 text-sm text-muted-foreground">
              {plan.summary}
            </p>

            <div className="space-y-2">
              {plan.sessions.map((s, i) => (
                <SessionRow
                  key={i}
                  session={s}
                  selected={selected.has(i)}
                  onToggle={() => toggle(i)}
                />
              ))}
            </div>

            {insertError && (
              <p className="text-sm text-destructive">{insertError}</p>
            )}

            <div className="flex items-center justify-between gap-2 border-t border-border/60 pt-3">
              <span className="text-xs text-muted-foreground">
                {selected.size} séance(s) sélectionnée(s)
              </span>
              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose}>
                  Fermer
                </Button>
                <Button
                  onClick={handleInsert}
                  disabled={isInserting || selected.size === 0 || inserted}
                >
                  {inserted ? (
                    <>
                      <Check className="size-4" />
                      Ajouté
                    </>
                  ) : isInserting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Ajout…
                    </>
                  ) : (
                    "Ajouter au planning"
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SessionRow({
  session,
  selected,
  onToggle,
}: {
  session: GeneratedSession;
  selected: boolean;
  onToggle: () => void;
}) {
  const accent = intensityAccent[session.intensity];
  const date = parseISO(session.date);

  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "flex w-full gap-3 rounded-lg border p-3 text-left transition-colors",
        selected
          ? "border-primary/40 bg-primary/5"
          : "border-border/50 bg-card/30 opacity-60 hover:opacity-100",
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border",
          selected ? "border-primary bg-primary text-primary-foreground" : "border-border",
        )}
      >
        {selected && <Check className="size-3.5" />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {format(date, "EEE d MMM", { locale: fr })}
          </span>
          <span
            className="rounded-full px-1.5 py-0.5 text-[10px] font-medium"
            style={{ backgroundColor: `${accent}22`, color: accent }}
          >
            {intensityLabels[session.intensity]}
          </span>
          <span className="text-xs text-muted-foreground">
            {activityTypeLabels[session.type]} ·{" "}
            {formatPlannedDuration(session.durationMin)} · {session.load} TSS
          </span>
        </div>
        <p className="mt-1 text-sm font-medium">{session.title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {session.description}
        </p>
        {session.rationale && (
          <p className="mt-1 text-xs italic text-muted-foreground/80">
            → {session.rationale}
          </p>
        )}
      </div>
    </button>
  );
}
