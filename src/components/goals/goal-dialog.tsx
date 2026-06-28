"use client";

import { GoalHorizon, GoalKind } from "@prisma/client";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
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
import { queryKeys } from "@/lib/client/keys";
import { horizonLabels, horizonOrder } from "@/lib/goals";

interface GoalDialogProps {
  onClose: () => void;
}

export function GoalDialog({ onClose }: GoalDialogProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [kind, setKind] = useState<GoalKind>(GoalKind.METRIC);
  const [horizon, setHorizon] = useState<GoalHorizon>(GoalHorizon.MEDIUM_TERM);
  const [lowerIsBetter, setLowerIsBetter] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const payload: Record<string, unknown> = {
      title: formData.get("title"),
      kind,
      notes: formData.get("notes") || null,
    };

    if (kind === GoalKind.RACE) {
      payload.location = formData.get("location") || null;
      payload.targetDate = formData.get("targetDate") || null;
    } else {
      payload.horizon = horizon;
      payload.metricKey = formData.get("metricKey") || null;
      payload.unit = formData.get("unit") || null;
      payload.startValue = formData.get("startValue") || null;
      payload.currentValue = formData.get("currentValue") || null;
      payload.targetValue = formData.get("targetValue") || null;
      payload.lowerIsBetter = lowerIsBetter;
      payload.targetDate = formData.get("targetDate") || null;
    }

    const response = await fetch("/api/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSubmitting(false);

    if (!response.ok) {
      const data = await response.json();
      setError(data.error ?? "Une erreur est survenue");
      return;
    }

    await queryClient.invalidateQueries({ queryKey: queryKeys.goals });
    router.refresh();
    onClose();
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nouvel objectif</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Type</Label>
            <Select
              value={kind}
              onValueChange={(v) => setKind(v as GoalKind)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={GoalKind.RACE}>Course / Événement</SelectItem>
                <SelectItem value={GoalKind.METRIC}>Objectif chiffré</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Titre</Label>
            <Input
              id="title"
              name="title"
              required
              placeholder={
                kind === GoalKind.RACE
                  ? "Half Ironman de Versailles"
                  : "FTP 340 W"
              }
            />
          </div>

          {kind === GoalKind.RACE ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="location">Lieu</Label>
                <Input id="location" name="location" placeholder="Versailles" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="targetDate">Date</Label>
                <Input id="targetDate" name="targetDate" type="date" required />
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Horizon</Label>
                <Select
                  value={horizon}
                  onValueChange={(v) => setHorizon(v as GoalHorizon)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {horizonOrder.map((h) => (
                      <SelectItem key={h} value={h}>
                        {horizonLabels[h]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="startValue">Départ</Label>
                  <Input id="startValue" name="startValue" type="number" step="any" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currentValue">Actuel</Label>
                  <Input id="currentValue" name="currentValue" type="number" step="any" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="targetValue">Cible</Label>
                  <Input id="targetValue" name="targetValue" type="number" step="any" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="unit">Unité</Label>
                  <Input id="unit" name="unit" placeholder="W, kg, min…" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="targetDate">Échéance</Label>
                  <Input id="targetDate" name="targetDate" type="date" />
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={lowerIsBetter}
                  onChange={(e) => setLowerIsBetter(e.target.checked)}
                  className="size-4 rounded border-border"
                />
                Plus bas = meilleur (ex : chrono, poids, FC repos)
              </label>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" rows={2} />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Enregistrement…" : "Créer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
