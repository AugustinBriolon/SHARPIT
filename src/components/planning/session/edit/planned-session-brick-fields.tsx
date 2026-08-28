'use client';

import {
  brickLegTitlePlaceholder,
  NO_GOAL,
} from '@/components/planning/session/edit/planned-session-dialog-helpers';
import type { usePlannedSessionDialog } from '@/components/planning/session/edit/use-planned-session-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { activityTypeLabels } from '@/lib/format';
import {
  brickLegActivityTypes,
  intensityLabels,
  intensityOrder,
} from '@/lib/planned-session/sessions';
import { ActivityType, type SessionIntensity } from '@prisma/client';
import { Plus, Trash2 } from 'lucide-react';

export function PlannedSessionBrickFields({
  dialog,
}: {
  dialog: ReturnType<typeof usePlannedSessionDialog>;
}) {
  const { addLeg, goalId, legs, linkableGoals, removeLeg, setGoalId, updateLeg } = dialog;

  return (
    <div className="space-y-3">
      <p className="text-muted-foreground text-xs">
        Chaque sport de l&apos;enchaînement devient une séance à part (une activité Strava liée, une
        analyse).
      </p>
      <div className="min-w-0 space-y-2">
        <Label>Objectif lié</Label>
        <Select value={goalId} onValueChange={(v) => setGoalId(v ?? NO_GOAL)}>
          <SelectTrigger className="w-full min-w-0">
            <SelectValue>
              {goalId === NO_GOAL
                ? 'Aucun'
                : (linkableGoals.find((g) => g.id === goalId)?.title ?? 'Aucun')}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_GOAL}>Aucun</SelectItem>
            {linkableGoals.map((g) => (
              <SelectItem key={g.id} value={g.id}>
                {g.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {legs.map((leg, index) => (
        <div
          key={index}
          className="border-analysis-border/60 bg-analysis-surface-alt/50 space-y-3 rounded-lg border p-3"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
              Étape {index + 1}
            </span>
            {legs.length > 2 ? (
              <button
                aria-label="Supprimer cette étape"
                className="text-muted-foreground hover:text-destructive"
                type="button"
                onClick={() => removeLeg(index)}
              >
                <Trash2 className="size-3.5" />
              </button>
            ) : null}
          </div>
          <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2">
            <div className="min-w-0 space-y-2">
              <Label>Sport</Label>
              <Select
                value={leg.type}
                onValueChange={(v) => updateLeg(index, { type: v as ActivityType })}
              >
                <SelectTrigger className="w-full min-w-0">
                  <SelectValue>{activityTypeLabels[leg.type]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {brickLegActivityTypes.map((t) => (
                    <SelectItem key={t} value={t}>
                      {activityTypeLabels[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-0 space-y-2">
              <Label>Intensité</Label>
              <Select
                value={leg.intensity}
                onValueChange={(v) =>
                  updateLeg(index, {
                    intensity: v as SessionIntensity,
                  })
                }
              >
                <SelectTrigger className="w-full min-w-0">
                  <SelectValue>{intensityLabels[leg.intensity]}</SelectValue>
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
          </div>
          <div className="space-y-2">
            <Label>Titre</Label>
            <Input
              placeholder={brickLegTitlePlaceholder(leg.type)}
              value={leg.title}
              onChange={(e) => updateLeg(index, { title: e.target.value })}
            />
          </div>
          <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2">
            <div className="min-w-0 space-y-2">
              <Label>Durée (min)</Label>
              <Input
                min={0}
                placeholder="40"
                type="number"
                value={leg.durationMin}
                onChange={(e) => updateLeg(index, { durationMin: e.target.value })}
              />
            </div>
            <div className="min-w-0 space-y-2">
              <Label>TSS</Label>
              <Input
                min={0}
                placeholder="auto"
                type="number"
                value={leg.load}
                onChange={(e) => updateLeg(index, { load: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              placeholder="Structure de la séance…"
              rows={2}
              value={leg.description}
              onChange={(e) => updateLeg(index, { description: e.target.value })}
            />
          </div>
        </div>
      ))}
      <Button size="sm" type="button" variant="outline" onClick={addLeg}>
        <Plus className="size-4" />
        Ajouter un sport
      </Button>
    </div>
  );
}
