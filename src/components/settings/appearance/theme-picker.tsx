'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { useRef } from 'react';
import type { ThemePreference } from '@/lib/theme/theme';
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
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);

  function focusOption(index: number) {
    const clamped = Math.max(0, Math.min(OPTIONS.length - 1, index));
    optionRefs.current[clamped]?.focus();
  }

  function selectAt(index: number) {
    const option = OPTIONS[index];
    if (!option) return;
    setPreference(option.id);
    focusOption(index);
  }

  function onRadioKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        event.preventDefault();
        selectAt((index + 1) % OPTIONS.length);
        break;
      case 'ArrowUp':
      case 'ArrowLeft':
        event.preventDefault();
        selectAt((index - 1 + OPTIONS.length) % OPTIONS.length);
        break;
      case 'Home':
        event.preventDefault();
        selectAt(0);
        break;
      case 'End':
        event.preventDefault();
        selectAt(OPTIONS.length - 1);
        break;
      case ' ':
      case 'Enter':
        event.preventDefault();
        selectAt(index);
        break;
      default:
        break;
    }
  }

  return (
    <div aria-label="Thème de l'application" className="space-y-3" role="radiogroup">
      {OPTIONS.map((option, index) => {
        const Icon = option.icon;
        const active = preference === option.id;
        return (
          <button
            key={option.id}
            ref={(node) => {
              optionRefs.current[index] = node;
            }}
            aria-checked={active}
            role="radio"
            tabIndex={active ? 0 : -1}
            type="button"
            className={cn(
              'analysis-panel rounded-analysis-lg pressable-lg focus-visible:ring-primary/35 w-full px-4 py-4 text-left focus-visible:ring-2 focus-visible:outline-hidden',
              active ? 'border-highlight bg-highlight/30' : 'hover:bg-analysis-surface-alt/80',
            )}
            onClick={() => setPreference(option.id)}
            onKeyDown={(event) => onRadioKeyDown(event, index)}
          >
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  'flex size-9 shrink-0 items-center justify-center rounded-xl',
                  active ? 'icon-well' : 'bg-muted text-muted-foreground',
                )}
                aria-hidden
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
