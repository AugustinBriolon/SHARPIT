"use client";

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarRange, Check, Loader2 } from "lucide-react";
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
import type { ClientGoal, ClientTrainingPlan } from "@/lib/client/types";
import { phaseColors, phaseLabels } from "@/lib/periodization";
import { useTrainingPlan, useTrainingPlanMutations } from "@/hooks/use-data";

const NO_GOAL = "none";

interface MacroPlanDialogProps {
  goals: ClientGoal[];
  onClose: () => void;
}

export function MacroPlanDialog({ goals, onClose }: MacroPlanDialogProps) {
  const planQuery = useTrainingPlan();
  const { generate, archive } = useTrainingPlanMutations();
  const [goalId, setGoalId] = useState(NO_GOAL);
  const [error, setError] = useState<string | null>(null);

  const datedGoals = goals
    .filter((g) => !g.achieved && g.targetDate)
    .filter((g) => new Date(g.targetDate as unknown as string) >= new Date());

  const activePlan = planQuery.data as ClientTrainingPlan | null;
  const isGenerating = generate.isPending;
  const isArchiving = archive.isPending;

  async function handleGenerate() {
    if (goalId === NO_GOAL) return;
    setError(null);
    try {
      await generate.mutateAsync(goalId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    }
  }

  async function handleArchive() {
    if (!activePlan) return;
    setError(null);
    try {
      await archive.mutateAsync(activePlan.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarRange className="size-4 text-primary" />
            Macro-plan périodisé
          </DialogTitle>
          <DialogDescription>
            Génère un plan multi-semaines (base → développement → spécifique →
            affûtage) calibré sur ta CTL actuelle, jusqu&apos;à la date de ton
            objectif.
          </DialogDescription>
        </DialogHeader>

        {activePlan ? (
          <ActivePlanView
            plan={activePlan}
            onArchive={handleArchive}
            isArchiving={isArchiving}
          />
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Objectif (course datée)</Label>
              <Select value={goalId} onValueChange={(v) => setGoalId(v ?? NO_GOAL)}>
                <SelectTrigger>
                  <SelectValue>
                    {goalId === NO_GOAL
                      ? "Choisir un objectif…"
                      : (datedGoals.find((g) => g.id === goalId)?.title ??
                        "Choisir")}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {datedGoals.length === 0 ? (
                    <SelectItem value={NO_GOAL} disabled>
                      Aucun objectif daté à venir
                    </SelectItem>
                  ) : (
                    datedGoals.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.title}
                        {g.targetDate
                          ? ` — ${format(new Date(g.targetDate as unknown as string), "d MMM yyyy", { locale: fr })}`
                          : ""}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>
                Fermer
              </Button>
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || goalId === NO_GOAL}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Génération…
                  </>
                ) : (
                  "Générer le macro-plan"
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ActivePlanView({
  plan,
  onArchive,
  isArchiving,
}: {
  plan: ClientTrainingPlan;
  onArchive: () => void;
  isArchiving: boolean;
}) {
  return (
    <div className="space-y-4">
      {plan.summary && (
        <p className="rounded-md border border-primary/20 bg-primary/5 p-3 text-sm text-muted-foreground">
          {plan.summary}
        </p>
      )}

      <div className="max-h-80 space-y-2 overflow-y-auto">
        {plan.weeks.map((w) => {
          const accent = phaseColors[w.phase];
          return (
            <div
              key={w.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-card/40 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  {format(new Date(w.weekStart), "d MMM yyyy", { locale: fr })}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {w.focus}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                  style={{ backgroundColor: `${accent}22`, color: accent }}
                >
                  {phaseLabels[w.phase]}
                  {w.isDeload ? " · deload" : ""}
                </span>
                <span className="font-mono text-xs text-muted-foreground">
                  {w.targetLoad} TSS
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        Utilise « Générer ma semaine » pour remplir chaque semaine selon la
        charge cible. Les phases s&apos;affichent sur le planning.
      </p>

      <div className="flex justify-end">
        <Button variant="outline" onClick={onArchive} disabled={isArchiving}>
          {isArchiving ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Check className="size-4" />
          )}
          Archiver ce plan
        </Button>
      </div>
    </div>
  );
}
