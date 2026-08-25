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
 * Segmented Essentiel / Expert control.
 * In demo, persists locally so Settings stay read-only.
 */
export function ExpertModeToggle({ className }: { className?: string }) {
  const { mode, setMode, isResolved } = useDisplayMode();
  const isDemo = useIsDemoMode();

  if (!isResolved && !isDemo) return null;

  const isExpert = mode === 'expert';

  return (
    <div
      aria-label="Densité d'affichage"
      role="group"
      className={cn(
        'border-analysis-border/70 bg-background/80 flex items-center gap-0.5 rounded-full border p-0.5',
        className,
      )}
    >
      <ToggleSegment active={!isExpert} label="Essentiel" onClick={() => setMode('essential')} />
      <ToggleSegment
        active={isExpert}
        icon={<Microscope className="size-3" aria-hidden />}
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
        'inline-flex min-h-8 items-center gap-1 rounded-full px-2.5 text-[11px] font-medium tracking-wide transition-[background-color,color] duration-150 ease-out motion-reduce:transition-none',
        active ? 'bg-primary/12 text-primary' : 'text-muted-foreground hover:text-foreground',
      )}
      onClick={onClick}
    >
      {icon}
      {label}
    </button>
  );
}
