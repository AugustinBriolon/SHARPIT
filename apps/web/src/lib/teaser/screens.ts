/**
 * Public teaser copy — zero athlete data, zero Art. 9 health processing claims.
 * Athlete-facing FR only. No em dashes.
 */

export type TeaserScreen = {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
};

export const TEASER_SCREENS: readonly TeaserScreen[] = [
  {
    id: 'endurance',
    eyebrow: 'Endurance',
    title: 'Un coach pour tenir la distance',
    body: 'SHARPIT t’accompagne sur la durée. Objectif, programme, suivi. Une lecture claire pour progresser sans te perdre dans les chiffres.',
  },
  {
    id: 'twin',
    eyebrow: 'Digital Twin',
    title: 'Un jumeau numérique qui évolue avec toi',
    body: 'Ton Twin synthétise ton historique d’entraînement pour éclairer ce qui compte. Pas un tableau de bord de plus.',
  },
  {
    id: 'morning',
    eyebrow: 'Chaque matin',
    title: 'Décider le matin, avancer le reste du jour',
    body: 'Ouvre SHARPIT. Comprends où tu en es. Choisis la bonne séance, ou le bon repos. Une décision, puis tu passes à autre chose.',
  },
] as const;

export const TEASER_BRAND = 'SHARPIT';

export const TEASER_PRIMARY_CTA = {
  label: 'Créer mon compte',
  href: '/sign-up',
} as const;

export const TEASER_SECONDARY_CTA = {
  label: 'J’ai déjà un compte',
  href: '/sign-in',
} as const;

export const TEASER_CONTINUE_LABEL = 'Continuer';

/** Art. 13 transparency — legal pages before signup (Privacy). */
export const TEASER_LEGAL_LINKS = [
  { label: 'Confidentialité', href: '/privacy' },
  { label: 'Conditions', href: '/terms' },
] as const;

/** Words / phrases that must never appear on the public teaser (Art. 9 + product walls). */
export const TEASER_FORBIDDEN_COPY = [
  'cercle privé',
  'données de santé',
  'donnée de santé',
  'données santé',
  'fréquence cardiaque',
  'sommeil',
  'récupération',
  'HRV',
  'art. 9',
  'article 9',
] as const;
