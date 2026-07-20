'use client';

import { BodySide, PhysicalCategory, PhysicalStatus } from '@prisma/client';
import { format } from 'date-fns';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
import type { ClientPhysicalNote } from '@/lib/query/types';
import {
  categoryLabels,
  categoryOrder,
  COMMON_BODY_PARTS,
  sideLabels,
  sideOrder,
  statusLabels,
  statusOrder,
} from '@/lib/physical';
import { usePhysicalNoteMutations } from '@/hooks/use-physical';

interface Props {
  note?: ClientPhysicalNote | null;
  onClose: () => void;
}

const BODY_PART_NONE = '__none__';

export function PhysicalNoteDialog({ note, onClose }: Props) {
  const isEdit = Boolean(note);
  const { create, update, remove } = usePhysicalNoteMutations();

  const [category, setCategory] = useState<PhysicalCategory>(note?.category ?? 'PAIN');
  const [status, setStatus] = useState<PhysicalStatus>(note?.status ?? 'ACTIVE');
  const [side, setSide] = useState<BodySide>(note?.side ?? 'NA');
  const [bodyPart, setBodyPart] = useState(note?.bodyPart ?? '');
  const [severity, setSeverity] = useState<number>(note?.severity ?? 3);
  const [affectsTraining, setAffectsTraining] = useState(note?.affectsTraining ?? true);
  const [error, setError] = useState<string | null>(null);
  const { confirm, dialog } = useConfirmDialog();

  const bodyPartOptions = useMemo(() => {
    const parts = [...COMMON_BODY_PARTS];
    if (bodyPart && !parts.includes(bodyPart)) parts.unshift(bodyPart);
    return parts;
  }, [bodyPart]);

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
      title: String(fd.get('title') || '').trim(),
      bodyPart: bodyPart.trim() || null,
      description: (fd.get('description') as string) || null,
      startDate: new Date(`${String(fd.get('startDate'))}T12:00:00`),
    };
    if (!payload.title) {
      setError('Le titre est requis');
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
      setError(err instanceof Error ? err.message : 'Erreur');
    }
  }

  async function handleDelete() {
    if (!note) return;
    const confirmed = await confirm({
      title: 'Supprimer cette note et son historique ?',
      description: 'Toutes les check-ins associés seront aussi supprimés.',
      confirmLabel: 'Supprimer',
      variant: 'destructive',
    });
    if (!confirmed) return;
    try {
      await remove.mutateAsync(note.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    }
  }

  const initialDate = note?.startDate ? new Date(note.startDate) : new Date();

  function getSubmitButtonLabel(): string {
    if (pending) return 'Enregistrement…';
    if (isEdit) return 'Mettre à jour';
    return 'Créer';
  }

  return (
    <>
      <Dialog open onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{isEdit ? 'Modifier la note' : 'Nouvelle note physique'}</DialogTitle>
          </DialogHeader>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="title">Titre</Label>
              <Input
                defaultValue={note?.title ?? ''}
                id="title"
                name="title"
                placeholder="Ex : Tendinite genou droit"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Catégorie</Label>
                <Select value={category} onValueChange={(v) => setCategory(v as PhysicalCategory)}>
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
                <Select value={status} onValueChange={(v) => setStatus(v as PhysicalStatus)}>
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
                <Label>Zone du corps</Label>
                <Select
                  value={bodyPart || BODY_PART_NONE}
                  onValueChange={(v) => setBodyPart(!v || v === BODY_PART_NONE ? '' : v)}
                >
                  <SelectTrigger>
                    <SelectValue>{bodyPart || 'Non précisée'}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={BODY_PART_NONE}>Non précisée</SelectItem>
                    {bodyPartOptions.map((part) => (
                      <SelectItem key={part} value={part}>
                        {part}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                className="accent-primary w-full"
                id="severity"
                max={10}
                min={0}
                type="range"
                value={severity}
                onChange={(e) => setSeverity(Number(e.target.value))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="startDate">Depuis le</Label>
                <Input
                  defaultValue={format(initialDate, 'yyyy-MM-dd')}
                  id="startDate"
                  name="startDate"
                  type="date"
                />
              </div>
              <label className="flex items-end gap-2.5 pb-2">
                <Checkbox
                  checked={affectsTraining}
                  className="mb-0.5"
                  onCheckedChange={(checked) => setAffectsTraining(checked === true)}
                />
                <span className="text-foreground text-sm leading-snug">
                  Pris en compte par le coach
                </span>
              </label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                defaultValue={note?.description ?? ''}
                id="description"
                name="description"
                placeholder="Contexte, déclencheur, ressenti…"
                rows={2}
              />
            </div>

            {error && <p className="text-destructive text-sm">{error}</p>}

            <div className="flex items-center justify-between gap-2">
              <div>
                {isEdit && (
                  <Button
                    disabled={pending}
                    size="sm"
                    type="button"
                    variant="destructive"
                    onClick={handleDelete}
                  >
                    Supprimer
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button disabled={pending} type="button" variant="outline" onClick={onClose}>
                  Annuler
                </Button>
                <Button disabled={pending} type="submit">
                  {getSubmitButtonLabel()}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      {dialog}
    </>
  );
}
