'use client';

import type { EquipmentItemId } from '@/lib/equipment/catalog';
import { accessoryOptionsForActivityType } from '@/lib/planned-session/accessories/session-accessories';
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
      <p className="text-sm leading-none font-medium" id="session-accessories-label">
        Accessoires nécessaires
      </p>
      <p className="text-muted-foreground text-xs leading-relaxed" id="session-accessories-hint">
        Matériel à préparer pour cette séance (pull buoy, élastique…).
      </p>
      <div
        aria-describedby="session-accessories-hint"
        aria-labelledby="session-accessories-label"
        className="flex flex-wrap gap-1.5"
        role="group"
      >
        {options.map((option) => {
          const active = selected.includes(option.id);
          return (
            <button
              key={option.id}
              aria-pressed={active}
              type="button"
              className={cn(
                'pressable min-h-11 rounded-full border px-2.5 py-1 text-xs sm:min-h-0',
                active
                  ? 'border-primary/40 bg-primary/10 text-foreground'
                  : 'border-analysis-border/60 text-muted-foreground hover:text-foreground',
              )}
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
