'use client';

import { Share, Smartphone, X } from 'lucide-react';
import { useInstallPrompt } from '@/hooks/use-install-prompt';
import { cn } from '@/lib/utils';

/**
 * Athlete-initiated install entry point — lives only in Settings, never as a
 * floating banner. That placement is deliberate: Settings is never a critical
 * coaching action or open dialog, so "never interrupt coaching" holds by
 * construction instead of by detecting open dialogs app-wide.
 */
export function InstallCard() {
  const { kind, visible, install, dismiss } = useInstallPrompt();

  if (!visible) return null;

  return (
    <div
      className={cn('rounded-2xl border border-dashed px-4 py-4', 'border-primary/25 bg-primary/5')}
    >
      <div className="flex items-start gap-3">
        <div className="bg-primary/10 ring-primary/15 flex size-9 shrink-0 items-center justify-center rounded-xl ring-1">
          <Smartphone className="text-primary size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Installer SHARPIT</p>
          {kind === 'NATIVE_PROMPT' ? (
            <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
              Ajoute SHARPIT à ton écran d&apos;accueil pour un accès direct, en plein écran.
            </p>
          ) : (
            <p className="text-muted-foreground mt-1 flex flex-wrap items-center gap-1 text-sm leading-relaxed">
              Appuie sur <Share className="mx-0.5 inline size-3.5" aria-hidden /> Partager, puis «
              Sur l&apos;écran d&apos;accueil ».
            </p>
          )}
        </div>
        <button
          aria-label="Ignorer"
          className="text-muted-foreground hover:text-foreground flex size-11 shrink-0 items-center justify-center"
          type="button"
          onClick={dismiss}
        >
          <X className="size-4" />
        </button>
      </div>
      {kind === 'NATIVE_PROMPT' && (
        <div className="mt-3">
          <button
            className="bg-primary text-primary-foreground min-h-11 rounded-full px-4 py-2 text-sm font-medium hover:opacity-90"
            type="button"
            onClick={() => void install()}
          >
            Installer
          </button>
        </div>
      )}
    </div>
  );
}
