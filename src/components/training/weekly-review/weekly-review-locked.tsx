import { Lock } from 'lucide-react';
import { InkEmptyState } from '@/components/ui/ink-empty-state';
import { LinkButton } from '@/components/ui/link-button';

export function WeeklyReviewLocked() {
  return (
    <InkEmptyState
      description="Ton bilan hebdomadaire croise volume d'entraînement, sommeil et récupération pour dire où tu en es et ce qui compte pour la semaine suivante. Réservé au palier Pro, pas encore ouvert."
      icon={Lock}
      title="Fonctionnalité Pro"
      action={
        <LinkButton href="/settings/pro" size="sm" variant="outline">
          Voir ce que Pro apporte
        </LinkButton>
      }
    />
  );
}
