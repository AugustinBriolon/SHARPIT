'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { isDisplayMode, type DisplayMode } from '@/lib/preferences/display-mode';
import { useDisplayMode } from '@/providers/display-mode-provider';
import { useIsDemoMode } from '@/hooks/use-is-demo-mode';
import { Microscope } from 'lucide-react';

export const DEMO_DISPLAY_MODE_KEY = 'sharpit_demo_display_mode';

export function getDemoDisplayModeOverride(): DisplayMode | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(DEMO_DISPLAY_MODE_KEY);
    return isDisplayMode(raw) ? raw : null;
  } catch {
    return null;
  }
}

/**
 * Demo-only Essentiel / Expert switch.
 * Real athletes change density in Settings; demo keeps Settings read-only and
 * persists the override in localStorage via the display-mode provider.
 * Renders nothing outside demo — do not mount on production athlete surfaces.
 */
export function ExpertModeToggle({ className }: { className?: string }) {
  const { mode, setMode, isResolved } = useDisplayMode();
  const isDemo = useIsDemoMode();

  if (!isDemo || !isResolved) return null;

  const isExpert = mode === 'expert';

  return (
    <div
      aria-label="Densité d'affichage"
      role="group"
      className={cn(
        'border-analysis-border/70 bg-analysis-surface-alt/80 flex items-center gap-0.5 rounded-lg border p-0.5',
        className,
      )}
    >
      <ToggleSegment active={!isExpert} label="Essentiel" onClick={() => setMode('essential')} />
      <ToggleSegment
        active={isExpert}
        icon={<Microscope className="size-3.5" aria-hidden />}
        label="Expert"
        onClick={() => setMode('expert')}
      />
    </div>
  );
}

function ToggleSegment({
  label,
  active,
  icon,
  onClick,
}: {
  label: string;
  active: boolean;
  icon?: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      aria-pressed={active}
      type="button"
      className={cn(
        'text-label focus-visible:ring-ring inline-flex min-h-9 items-center gap-1.5 rounded-md px-3',
        'tracking-wide normal-case transition-[background-color,color] duration-150 ease-out',
        'focus-visible:ring-2 focus-visible:outline-hidden motion-reduce:transition-none',
        active
          ? 'bg-background text-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground',
      )}
      onClick={onClick}
    >
      {icon}
      {label}
    </button>
  );
}
