'use client';

import { Share, Smartphone, X } from 'lucide-react';
import { useInstallPrompt } from '@/hooks/use-install-prompt';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Athlete-initiated install entry point — lives only in Settings, never as a
 * floating banner. Quiet analysis plate (no ink slap): Settings is never a
 * critical coaching action, so "never interrupt coaching" holds by construction.
 */
export function InstallCard() {
  const { kind, visible, install, dismiss } = useInstallPrompt();

  if (!visible) return null;

  return (
    <div
      className={cn('analysis-panel rounded-analysis-lg relative px-3.5 py-3.5', 'border-dashed')}
    >
      <div className="flex items-start gap-3">
        <div className="icon-well size-9 shrink-0">
          <Smartphone className="size-4" aria-hidden />
        </div>
        <div className="min-w-0 flex-1 pr-8">
          <p className="text-sm font-medium">Installer SHARPIT</p>
          {kind === 'NATIVE_PROMPT' ? (
            <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
              Accès direct depuis l&apos;écran d&apos;accueil, en plein écran.
            </p>
          ) : (
            <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
              Appuie sur <Share className="mx-0.5 inline size-3.5 align-text-bottom" aria-hidden />{' '}
              Partager, puis « Sur l&apos;écran d&apos;accueil ».
            </p>
          )}
          {kind === 'NATIVE_PROMPT' ? (
            <Button className="mt-3" size="sm" type="button" onClick={() => void install()}>
              Installer
            </Button>
          ) : null}
        </div>
        <button
          aria-label="Ignorer"
          className="text-muted-foreground hover:text-foreground hover:bg-muted/60 focus-visible:ring-ring absolute top-2.5 right-2.5 flex size-9 items-center justify-center rounded-md transition-colors focus-visible:ring-2 focus-visible:outline-hidden"
          type="button"
          onClick={dismiss}
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
