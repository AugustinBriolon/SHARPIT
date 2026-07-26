'use client';

import { Label } from '@/components/ui/label';
import type { EquipmentItemId } from '@/lib/equipment/catalog';
import { accessoryOptionsForActivityType } from '@/lib/planned-session/session-accessories';
import type { ActivityType } from '@prisma/client';
import { cn } from '@/lib/utils';

export function SessionAccessoriesPicker({
  type,
  selected,
  onChange,
}: {
  type: ActivityType;
  selected: EquipmentItemId[];
  onChange: (next: EquipmentItemId[]) => void;
}) {
  const options = accessoryOptionsForActivityType(type);
  if (options.length === 0) return null;

  function toggle(id: EquipmentItemId) {
    if (selected.includes(id)) {
      onChange(selected.filter((item) => item !== id));
      return;
    }
    onChange([...selected, id]);
  }

  return (
    <div className="space-y-2">
      <Label>Accessoires nécessaires</Label>
      <p className="text-muted-foreground text-[10px] leading-relaxed">
        Matériel à préparer pour cette séance (pull buoy, élastique…).
      </p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => {
          const active = selected.includes(option.id);
          return (
            <button
              key={option.id}
              className={cn(
                'rounded-full border px-2.5 py-1 text-xs transition-colors',
                active
                  ? 'border-primary/40 bg-primary/10 text-foreground'
                  : 'border-analysis-border/60 text-muted-foreground hover:text-foreground',
              )}
              type="button"
              onClick={() => toggle(option.id)}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
