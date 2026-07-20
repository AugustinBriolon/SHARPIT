import { Share, Smartphone, X } from 'lucide-react';
import { useInstallPrompt } from '@/hooks/use-install-prompt';
import { PageBleed } from '@/components/layout/page-bleed';

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
    <PageBleed className="py-4" ink>
      <div className="flex items-start gap-3">
        <div className="icon-well size-9 rounded-xl">
          <Smartphone className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-ink-surface-foreground text-sm font-medium">Installer SHARPIT</p>
          {kind === 'NATIVE_PROMPT' ? (
            <p className="text-ink-surface-foreground/75 mt-1 text-sm leading-relaxed">
              Ajoute SHARPIT à ton écran d&apos;accueil pour un accès direct, en plein écran.
            </p>
          ) : (
            <p className="text-ink-surface-foreground/75 mt-1 flex flex-wrap items-center gap-1 text-sm leading-relaxed">
              Appuie sur <Share className="mx-0.5 inline size-3.5" aria-hidden /> Partager, puis «
              Sur l&apos;écran d&apos;accueil ».
            </p>
          )}
        </div>
        <button
          aria-label="Ignorer"
          className="text-ink-surface-foreground/70 hover:text-ink-surface-foreground flex size-11 shrink-0 items-center justify-center"
          type="button"
          onClick={dismiss}
        >
          <X className="size-4" />
        </button>
      </div>
      {kind === 'NATIVE_PROMPT' && (
        <div className="mt-3">
          <button
            className="bg-ink-surface-foreground text-ink-surface min-h-11 rounded-lg px-4 py-2 text-sm font-medium hover:opacity-90"
            type="button"
            onClick={() => void install()}
          >
            Installer
          </button>
        </div>
      )}
    </PageBleed>
  );
}
