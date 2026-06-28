"use client";

import { BodySide, PhysicalCategory, PhysicalStatus } from "@prisma/client";
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
import type { ClientPhysicalNote } from "@/lib/client/types";
import {
  categoryLabels,
  categoryOrder,
  COMMON_BODY_PARTS,
  sideLabels,
  sideOrder,
  statusLabels,
  statusOrder,
} from "@/lib/physical";
import { usePhysicalNoteMutations } from "@/hooks/use-physical";

interface Props {
  note?: ClientPhysicalNote | null;
  onClose: () => void;
}

export function PhysicalNoteDialog({ note, onClose }: Props) {
  const isEdit = Boolean(note);
  const { create, update, remove } = usePhysicalNoteMutations();

  const [category, setCategory] = useState<PhysicalCategory>(
    note?.category ?? "PAIN",
  );
  const [status, setStatus] = useState<PhysicalStatus>(note?.status ?? "ACTIVE");
  const [side, setSide] = useState<BodySide>(note?.side ?? "NA");
  const [severity, setSeverity] = useState<number>(note?.severity ?? 3);
  const [affectsTraining, setAffectsTraining] = useState(
    note?.affectsTraining ?? true,
  );
  const [error, setError] = useState<string | null>(null);

  const pending = create.isPending || update.isPending || remove.isPending;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const payload = {
      category,
      status,
      side,
      severity,
      affectsTraining,
      title: String(fd.get("title") || "").trim(),
      bodyPart: (fd.get("bodyPart") as string) || null,
      description: (fd.get("description") as string) || null,
      startDate: new Date(`${String(fd.get("startDate"))}T12:00:00`),
    };
    if (!payload.title) {
      setError("Le titre est requis");
      return;
    }
    try {
      if (isEdit && note) {
        await update.mutateAsync({ id: note.id, data: payload });
      } else {
        await create.mutateAsync(payload);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    }
  }

  async function handleDelete() {
    if (!note) return;
    if (!confirm("Supprimer cette note et son historique ?")) return;
    try {
      await remove.mutateAsync(note.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    }
  }

  const initialDate = note?.startDate ? new Date(note.startDate) : new Date();

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Modifier la note" : "Nouvelle note physique"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Titre</Label>
            <Input
              id="title"
              name="title"
              placeholder="Ex : Tendinite genou droit"
              defaultValue={note?.title ?? ""}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Catégorie</Label>
              <Select
                value={category}
                onValueChange={(v) => setCategory(v as PhysicalCategory)}
              >
                <SelectTrigger>
                  <SelectValue>{categoryLabels[category]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {categoryOrder.map((c) => (
                    <SelectItem key={c} value={c}>
                      {categoryLabels[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Statut</Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as PhysicalStatus)}
              >
                <SelectTrigger>
                  <SelectValue>{statusLabels[status]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {statusOrder.map((s) => (
                    <SelectItem key={s} value={s}>
                      {statusLabels[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="bodyPart">Zone du corps</Label>
              <Input
                id="bodyPart"
                name="bodyPart"
                list="body-parts"
                placeholder="Genou, bassin, pied…"
                defaultValue={note?.bodyPart ?? ""}
              />
              <datalist id="body-parts">
                {COMMON_BODY_PARTS.map((p) => (
                  <option key={p} value={p} />
                ))}
              </datalist>
            </div>
            <div className="space-y-2">
              <Label>Côté</Label>
              <Select value={side} onValueChange={(v) => setSide(v as BodySide)}>
                <SelectTrigger>
                  <SelectValue>{sideLabels[side]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {sideOrder.map((s) => (
                    <SelectItem key={s} value={s}>
                      {sideLabels[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="severity">Sévérité actuelle</Label>
              <span className="font-mono text-sm">{severity}/10</span>
            </div>
            <input
              id="severity"
              type="range"
              min={0}
              max={10}
              value={severity}
              onChange={(e) => setSeverity(Number(e.target.value))}
              className="w-full accent-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="startDate">Depuis le</Label>
              <Input
                id="startDate"
                name="startDate"
                type="date"
                defaultValue={format(initialDate, "yyyy-MM-dd")}
              />
            </div>
            <label className="flex items-end gap-2 pb-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={affectsTraining}
                onChange={(e) => setAffectsTraining(e.target.checked)}
                className="size-4 rounded border-border"
              />
              Pris en compte par le coach
            </label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              rows={2}
              placeholder="Contexte, déclencheur, ressenti…"
              defaultValue={note?.description ?? ""}
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
                {pending ? "Enregistrement…" : isEdit ? "Mettre à jour" : "Créer"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
