'use client';

import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

function pillClass(active: 'off' | 'on' | 'primary'): string {
  return cn(
    'pressable inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
    active === 'primary' && 'border-highlight/40 bg-highlight text-highlight-foreground',
    active === 'on' && 'border-analysis-border bg-muted/40 text-foreground hover:bg-muted/60',
    active === 'off' &&
      'border-analysis-border text-muted-foreground hover:bg-muted/40 hover:text-foreground',
  );
}

/**
 * Two independent controls per connected provider within a data class:
 * "Activé" (in the enabled[] complement, or not at all) and "Source de
 * vérité" (the class's primary — only meaningful, and only shown, once
 * enabled). A provider can be enabled without being primary — that third
 * state is exactly what ADR-027 calls "complement" and needs its own
 * affordance, not just a single primary/off toggle.
 *
 * There's no "un-primary" action on the current primary: the only way to
 * change primary is to set a *different* enabled provider as primary, so
 * that button no-ops (shown checked, disabled) once already primary.
 */
export function ClassSourceControls({
  isEnabled,
  isPrimary,
  onToggleEnabled,
  onSetPrimary,
  className,
}: {
  isEnabled: boolean;
  isPrimary: boolean;
  onToggleEnabled: (next: boolean) => void;
  onSetPrimary: () => void;
  className?: string;
}) {
  return (
    <div className={cn('mt-3 flex flex-wrap items-center gap-2', className)}>
      <button
        aria-pressed={isEnabled}
        className={pillClass(isEnabled ? 'on' : 'off')}
        type="button"
        onClick={() => onToggleEnabled(!isEnabled)}
      >
        {isEnabled ? (
          <Check className="size-3.5" strokeWidth={2.5} aria-hidden />
        ) : (
          <X className="size-3.5" strokeWidth={2.5} aria-hidden />
        )}
        Activé
      </button>

      {isEnabled ? (
        <button
          aria-pressed={isPrimary}
          className={pillClass(isPrimary ? 'primary' : 'on')}
          disabled={isPrimary}
          type="button"
          onClick={onSetPrimary}
        >
          {isPrimary ? <Check className="size-3.5" strokeWidth={2.5} aria-hidden /> : null}
          Source de vérité
        </button>
      ) : null}
    </div>
  );
}
