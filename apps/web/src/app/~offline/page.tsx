import { Activity } from 'lucide-react';
import { LinkButton } from '@/components/ui/link-button';

export default function OfflinePage() {
  return (
    <div className="bg-background flex min-h-screen flex-col items-center justify-center gap-6 p-6 text-center">
      <div className="icon-well size-14">
        <Activity className="size-7" aria-hidden />
      </div>
      <div className="max-w-sm space-y-2">
        <h1 className="text-page-title">Hors connexion</h1>
        <p className="text-muted-foreground text-sm">
          SHARPIT a besoin d&apos;une connexion internet pour charger tes données
          d&apos;entraînement et de récupération.
        </p>
      </div>
      <LinkButton href="/">Réessayer</LinkButton>
    </div>
  );
}
