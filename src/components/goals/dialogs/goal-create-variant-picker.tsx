'use client';

import { Flag, Repeat, Timer } from 'lucide-react';
import { useRef } from 'react';
import { handleVariantKeyDown } from '@/components/goals/dialogs/goal-create-form-keyboard';
import { cn } from '@/lib/utils';

type GoalFormVariant = 'race' | 'performance' | 'period';

const CREATE_VARIANTS: {
  id: GoalFormVariant;
  label: string;
  icon: typeof Flag;
}[] = [
  { id: 'race', label: 'Course', icon: Flag },
  { id: 'performance', label: 'Temps sur distance', icon: Timer },
  { id: 'period', label: 'Objectif récurrent', icon: Repeat },
];

const RADIO_FOCUS =
  'focus-visible:ring-primary/35 focus-visible:ring-2 focus-visible:outline-hidden';

export function GoalCreateVariantPicker({
  variant,
  onVariantChange,
}: {
  variant: GoalFormVariant;
  onVariantChange: (variant: GoalFormVariant) => void;
}) {
  const variantRefs = useRef<Array<HTMLButtonElement | null>>([]);

  function focusVariant(index: number) {
    const clamped = Math.max(0, Math.min(CREATE_VARIANTS.length - 1, index));
    variantRefs.current[clamped]?.focus();
  }

  function selectVariantAt(index: number) {
    const option = CREATE_VARIANTS[index];
    if (!option) {
      return;
    }
    onVariantChange(option.id);
    focusVariant(index);
  }

  return (
    <div
      aria-label="Type d'objectif"
      className="grid grid-cols-1 gap-2 sm:grid-cols-3"
      role="radiogroup"
    >
      {CREATE_VARIANTS.map(({ id, label, icon: Icon }, index) => {
        const active = variant === id;
        return (
          <button
            key={id}
            ref={(node) => {
              variantRefs.current[index] = node;
            }}
            aria-checked={active}
            role="radio"
            tabIndex={active ? 0 : -1}
            type="button"
            className={cn(
              'pressable flex min-h-11 items-center justify-center gap-2 rounded-lg border px-2 py-1 text-left text-sm',
              RADIO_FOCUS,
              active ? 'border-primary/50 bg-primary/5' : 'border-border/60 hover:border-border',
            )}
            onClick={() => onVariantChange(id)}
            onKeyDown={(event) => handleVariantKeyDown(event, index, selectVariantAt)}
          >
            <Icon className="text-primary size-4 shrink-0" aria-hidden />
            <span className="block font-medium">{label}</span>
          </button>
        );
      })}
    </div>
  );
}

export type { GoalFormVariant };
