import { buttonVariants } from '@/components/ui/button';
import { ConnectGarminHeader } from '@/components/integrations/connect-garmin/connect-garmin-header';
import {
  CONNECT_GARMIN_START_PATH,
  garminHandoffCallbackPath,
} from '@/lib/integrations/garmin/garmin-connect-handoff';
import { cn } from '@/lib/utils';

const STEPS = [
  'Garmin s’ouvre — ton mot de passe reste chez Garmin.',
  'Tu autorises SHARPIT à lire tes données.',
  'Tu reviens dans l’app.',
] as const;

/** One intention: connect Garmin. The only exits are the CTA and Annuler. */
export function ConnectGarminIntro() {
  return (
    <>
      <ConnectGarminHeader
        lead="Ton Twin lit ton sommeil, ta récupération et tes séances depuis Garmin."
        title="Connecter Garmin"
      />
      <ol className="analysis-panel rounded-analysis-lg space-y-3 px-4 py-4">
        {STEPS.map((step, index) => (
          <li key={step} className="flex items-start gap-3 text-sm">
            <span
              className="text-muted-foreground border-border/70 inline-flex size-6 shrink-0 items-center justify-center rounded-full border font-mono text-xs"
              aria-hidden
            >
              {index + 1}
            </span>
            <span className="pt-0.5 text-pretty">{step}</span>
          </li>
        ))}
      </ol>
      <div className="flex flex-col gap-2">
        {/* Plain anchors: full loads, so the iOS session sees the callback URL. */}
        <a
          className={cn(buttonVariants({ size: 'lg' }), 'w-full')}
          href={CONNECT_GARMIN_START_PATH}
        >
          Connecter Garmin
        </a>
        <a
          className={cn(buttonVariants({ variant: 'ghost', size: 'lg' }), 'w-full')}
          href={garminHandoffCallbackPath('cancelled')}
        >
          Annuler
        </a>
      </div>
    </>
  );
}
