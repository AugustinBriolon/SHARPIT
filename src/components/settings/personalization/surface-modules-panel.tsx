'use client';

import { useEffect, useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import {
  SURFACE_MODULE_COPY,
  SURFACE_MODULE_IDS,
  type SurfaceModuleId,
  type SurfaceModulesPrefs,
  readSurfaceModulesFromStorage,
  writeSurfaceModulesToStorage,
} from '@/lib/preferences/surface-modules';
import { cn } from '@/lib/utils';

/**
 * Local toggles for which optional surfaces the athlete wants in chrome.
 * Persistence only — bottom-nav / hub wiring lands with each module.
 */
export function SurfaceModulesPanel() {
  const [prefs, setPrefs] = useState<SurfaceModulesPrefs | null>(null);

  useEffect(() => {
    setPrefs(readSurfaceModulesFromStorage());
  }, []);

  function setModule(id: SurfaceModuleId, enabled: boolean) {
    setPrefs((prev) => {
      const base = prev ?? readSurfaceModulesFromStorage();
      const next: SurfaceModulesPrefs = {
        version: 1,
        modules: { ...base.modules, [id]: enabled },
      };
      writeSurfaceModulesToStorage(next);
      return next;
    });
  }

  if (!prefs) {
    return (
      <div className="space-y-2" aria-busy>
        <div className="bg-muted/45 h-16 animate-pulse rounded-xl" />
        <div className="bg-muted/45 h-16 animate-pulse rounded-xl" />
      </div>
    );
  }

  return (
    <ul aria-label="Modules visibles" className="space-y-2">
      {SURFACE_MODULE_IDS.map((id) => {
        const copy = SURFACE_MODULE_COPY[id];
        const checked = prefs.modules[id];
        const controlId = `surface-module-${id}`;
        return (
          <li key={id}>
            <label
              htmlFor={controlId}
              className={cn(
                'chip-surface-lg rounded-analysis-lg flex cursor-pointer items-start gap-3 px-3 py-2.5',
                'hover:border-primary/25',
              )}
            >
              <Checkbox
                checked={checked}
                className="mt-1"
                id={controlId}
                onCheckedChange={(value) => setModule(id, value === true)}
              />
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="text-sm font-medium">{copy.title}</span>
                  {copy.stub ? (
                    <span className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
                      À venir
                    </span>
                  ) : null}
                </span>
                <span className="text-muted-foreground mt-0.5 block text-sm leading-relaxed">
                  {copy.description}
                </span>
              </span>
            </label>
          </li>
        );
      })}
    </ul>
  );
}
