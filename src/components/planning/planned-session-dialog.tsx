"use client";

import { ActivityType, SessionIntensity } from "@prisma/client";
import { format } from "date-fns";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SessionRealization } from "@/components/planning/session-realization";
import type { ClientGoal, ClientPlannedSession } from "@/lib/client/types";
import { activityTypeLabels } from "@/lib/format";
import { intensityLabels, intensityOrder } from "@/lib/sessions";
import { usePlannedSessionMutations } from "@/hooks/use-data";

const NO_GOAL = "none";

interface PlannedSessionDialogProps {
  session?: ClientPlannedSession | null;
  defaultDate?: Date;
  goals?: ClientGoal[];
  onClose: () => void;
}

export function PlannedSessionDialog({
  session,
  defaultDate,
  goals = [],
  onClose,
}: PlannedSessionDialogProps) {
  const isEdit = Boolean(session);
  const { create, update, remove } = usePlannedSessionMutations();

  const [type, setType] = useState<ActivityType>(session?.type ?? "RUN");
  const [intensity, setIntensity] = useState<SessionIntensity>(
    session?.intensity ?? "ENDURANCE",
  );
  const [goalId, setGoalId] = useState<string>(session?.goalId ?? NO_GOAL);
  const [error, setError] = useState<string | null>(null);

  const initialDate = session?.date
    ? new Date(session.date)
    : (defaultDate ?? new Date());

  const raceGoals = goals.filter((g) => g.kind === "RACE");
  const pending = create.isPending || update.isPending || remove.isPending;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    const dateValue = String(formData.get("date") || "");
    const durationRaw = formData.get("durationMin");
    const loadRaw = formData.get("load");

    const payload = {
      type,
      date: new Date(`${dateValue}T12:00:00`),
      title: (formData.get("title") as string) || null,
      description: (formData.get("description") as string) || null,
      durationMin: durationRaw ? Number(durationRaw) : null,
      load: loadRaw ? Number(loadRaw) : null,
      intensity,
      goalId: goalId === NO_GOAL ? null : goalId,
    };

    try {
      if (isEdit && session) {
        await update.mutateAsync({ id: session.id, data: payload });
      } else {
        await create.mutateAsync(payload);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    }
  }

  async function handleDelete() {
    if (!session) return;
    if (!confirm("Supprimer cette séance planifiée ?")) return;
    setError(null);
    try {
      await remove.mutateAsync(session.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Modifier la séance" : "Planifier une séance"}
          </DialogTitle>
        </DialogHeader>

        {isEdit && session && <SessionRealization session={session} />}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Sport</Label>
              <Select
                value={type}
                onValueChange={(v) => setType(v as ActivityType)}
              >
                <SelectTrigger>
                  <SelectValue>{activityTypeLabels[type]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Object.values(ActivityType).map((t) => (
                    <SelectItem key={t} value={t}>
                      {activityTypeLabels[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                name="date"
                type="date"
                required
                defaultValue={format(initialDate, "yyyy-MM-dd")}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Titre</Label>
            <Input
              id="title"
              name="title"
              placeholder="Sortie longue Z2"
              defaultValue={session?.title ?? ""}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Intensité</Label>
              <Select
                value={intensity}
                onValueChange={(v) => setIntensity(v as SessionIntensity)}
              >
                <SelectTrigger>
                  <SelectValue>{intensityLabels[intensity]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {intensityOrder.map((i) => (
                    <SelectItem key={i} value={i}>
                      {intensityLabels[i]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Objectif lié</Label>
              <Select
                value={goalId}
                onValueChange={(v) => setGoalId(v ?? NO_GOAL)}
              >
                <SelectTrigger>
                  <SelectValue>
                    {goalId === NO_GOAL
                      ? "Aucun"
                      : (raceGoals.find((g) => g.id === goalId)?.title ??
                        "Aucun")}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_GOAL}>Aucun</SelectItem>
                  {raceGoals.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="durationMin">Durée (min)</Label>
              <Input
                id="durationMin"
                name="durationMin"
                type="number"
                min={0}
                placeholder="90"
                defaultValue={session?.durationMin ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="load">Charge prévue (TSS)</Label>
              <Input
                id="load"
                name="load"
                type="number"
                step="any"
                min={0}
                placeholder="auto si vide"
                defaultValue={session?.load ?? ""}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              rows={2}
              placeholder="3×10' au seuil, récup 3'…"
              defaultValue={session?.description ?? ""}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex items-center justify-between gap-2">
            <div>
              {isEdit && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                  disabled={pending}
                >
                  Supprimer
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={pending}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={pending}>
                {pending
                  ? "Enregistrement…"
                  : isEdit
                    ? "Mettre à jour"
                    : "Planifier"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
