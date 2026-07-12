'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import type { ThemePreference } from '@/lib/theme';
import { useThemePreference } from '@/providers/theme-provider';
import { cn } from '@/lib/utils';

const OPTIONS: {
  id: ThemePreference;
  title: string;
  description: string;
  icon: typeof Sun;
}[] = [
  {
    id: 'light',
    title: 'Clair',
    description: 'Palette claire pour un usage diurne.',
    icon: Sun,
  },
  {
    id: 'dark',
    title: 'Sombre',
    description: 'Palette sombre pour réduire la distraction visuelle.',
    icon: Moon,
  },
  {
    id: 'system',
    title: 'Système',
    description: 'Suit automatiquement la préférence du système.',
    icon: Monitor,
  },
];

export function AppearanceThemePicker() {
  const { preference, setPreference } = useThemePreference();

  return (
    <div aria-label="Thème de l'application" className="space-y-3" role="radiogroup">
      {OPTIONS.map((option) => {
        const Icon = option.icon;
        const active = preference === option.id;
        return (
          <button
            key={option.id}
            aria-checked={active}
            role="radio"
            type="button"
            className={cn(
              'w-full rounded-2xl border px-4 py-4 text-left transition-colors',
              active
                ? 'border-primary/40 bg-primary/5 ring-primary/20 ring-1'
                : 'border-border/70 hover:bg-muted/30',
            )}
            onClick={() => setPreference(option.id)}
          >
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  'flex size-9 shrink-0 items-center justify-center rounded-xl',
                  active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
                )}
              >
                <Icon className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{option.title}</p>
                <p className="text-muted-foreground mt-1 text-sm">{option.description}</p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
