/**
 * The e-mail confirming an account deletion. When a subscription still renews, it says how to
 * stop it: deleting the account cannot cancel an App Store subscription — only the athlete can.
 */
export type AccountDeletedEmailInput = {
  firstName: string | null;
  /** Where a still-renewing subscription is billed, or null when none renews. */
  renewingSubscription: 'apple' | 'stripe' | 'manual' | null;
};

const CANCEL_STEPS: Record<'apple' | 'stripe' | 'manual', string> = {
  apple:
    "Ton abonnement SharpIt Pro est facturé par Apple et continue de se renouveler : supprimer ton compte ne peut pas l'arrêter. Pour l'annuler : Réglages de l'iPhone › ton nom › Abonnements › SharpIt.",
  stripe:
    "Ton abonnement SharpIt Pro continue de se renouveler. Réponds à cet e-mail et nous l'annulons pour toi.",
  manual: "Ton accès SharpIt Pro offert prend fin avec ton compte : tu n'as rien à faire.",
};

export function accountDeletedEmail({ firstName, renewingSubscription }: AccountDeletedEmailInput) {
  const greeting = firstName?.trim() ? `Bonjour ${firstName.trim()},` : 'Bonjour,';
  const paragraphs = [
    greeting,
    'Ton compte SharpIt a été supprimé, avec toutes tes données : activités, plan, objectifs, journal, profil et conversations avec le coach. Les accès donnés à Garmin, Strava et à tes autres sources ont été révoqués.',
    ...(renewingSubscription ? [CANCEL_STEPS[renewingSubscription]] : []),
    "Si tu n'es pas à l'origine de cette suppression, réponds à cet e-mail.",
    "L'équipe SharpIt",
  ];
  return {
    subject: 'Ton compte SharpIt a été supprimé',
    text: paragraphs.join('\n\n'),
  };
}
