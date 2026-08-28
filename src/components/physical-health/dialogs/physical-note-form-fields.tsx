'use client';

import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import type { BodySide, PhysicalCategory, PhysicalStatus } from '@prisma/client';

const BODY_PART_NONE = '__none__';

export function PhysicalNoteFormFields({
  note,
  category,
  status,
  side,
  bodyPart,
  bodyPartOptions,
  severity,
  affectsTraining,
  initialDate,
  onCategoryChange,
  onStatusChange,
  onSideChange,
  onBodyPartChange,
  onSeverityChange,
  onAffectsTrainingChange,
}: {
  note?: ClientPhysicalNote | null;
  category: PhysicalCategory;
  status: PhysicalStatus;
  side: BodySide;
  bodyPart: string;
  bodyPartOptions: string[];
  severity: number;
  affectsTraining: boolean;
  initialDate: Date;
  onCategoryChange: (value: PhysicalCategory) => void;
  onStatusChange: (value: PhysicalStatus) => void;
  onSideChange: (value: BodySide) => void;
  onBodyPartChange: (value: string) => void;
  onSeverityChange: (value: number) => void;
  onAffectsTrainingChange: (value: boolean) => void;
}) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="title">Titre</Label>
        <Input
          className="min-h-11 lg:h-9"
          defaultValue={note?.title ?? ''}
          id="title"
          name="title"
          placeholder="Ex : Tendinite genou droit"
          required
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Catégorie</Label>
          <Select value={category} onValueChange={(v) => onCategoryChange(v as PhysicalCategory)}>
            <SelectTrigger className="min-h-11 lg:h-9">
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
          <Select value={status} onValueChange={(v) => onStatusChange(v as PhysicalStatus)}>
            <SelectTrigger className="min-h-11 lg:h-9">
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

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Zone du corps</Label>
          <Select
            value={bodyPart || BODY_PART_NONE}
            onValueChange={(v) => onBodyPartChange(!v || v === BODY_PART_NONE ? '' : v)}
          >
            <SelectTrigger className="min-h-11 lg:h-9">
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
          <Select value={side} onValueChange={(v) => onSideChange(v as BodySide)}>
            <SelectTrigger className="min-h-11 lg:h-9">
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
          <span className="text-data text-sm">{severity}/10</span>
        </div>
        <input
          className="accent-primary h-11 w-full lg:h-auto"
          id="severity"
          max={10}
          min={0}
          type="range"
          value={severity}
          onChange={(e) => onSeverityChange(Number(e.target.value))}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="startDate">Depuis le</Label>
          <Input
            className="min-h-11 lg:h-9"
            defaultValue={format(initialDate, 'yyyy-MM-dd')}
            id="startDate"
            name="startDate"
            type="date"
          />
        </div>
        <label className="flex min-h-11 items-center gap-2.5 sm:items-end sm:pb-2">
          <Checkbox
            checked={affectsTraining}
            onCheckedChange={(checked) => onAffectsTrainingChange(checked === true)}
          />
          <span className="text-foreground text-sm leading-snug">Pris en compte par le coach</span>
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
    </>
  );
}
