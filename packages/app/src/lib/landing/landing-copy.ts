/**
 * Apex landing copy (sharpit.app, ADR-051). Same rules as the teaser: zero athlete data, zero
 * Art. 9 health processing claims, French, no em dashes. Links point at the web app.
 */

const WEB_ORIGIN = 'https://web.sharpit.app';

export const LANDING_LINKS = {
  signUp: `${WEB_ORIGIN}/sign-up`,
  signIn: `${WEB_ORIGIN}/sign-in`,
  demo: `${WEB_ORIGIN}/demo`,
  privacy: '/privacy',
  terms: '/terms',
} as const;

export const LANDING_HERO = {
  eyebrow: 'Coach d’endurance',
  titleLines: ['Le coach qui te connaît.', 'Et t’amène à ton objectif.'],
  body: 'SharpIt se branche sur ta montre, lit chacun de tes entraînements et tient compte de tous tes paramètres pour te mener jusqu’à ta course. Chaque matin, une décision claire.',
  primaryCta: { label: 'Créer mon compte', href: LANDING_LINKS.signUp },
  secondaryCta: { label: 'Voir la démo', href: LANDING_LINKS.demo },
  signIn: { label: 'Connexion', href: LANDING_LINKS.signIn },
} as const;

export type LandingStep = { index: string; label: string; title: string; body: string };

/** The decision chain, in the order the app reads it (DESIGN_SYSTEM_PROMPT: layout = causal argument). */
export const LANDING_CHAIN: readonly LandingStep[] = [
  {
    index: '01',
    label: 'Connaître',
    title: 'Tout ce que ta montre sait de toi',
    body: 'Séances, charge, régularité, historique : ton Digital Twin réunit ce que tes appareils mesurent et apprend comment tu réponds à l’entraînement.',
  },
  {
    index: '02',
    label: 'Décider',
    title: 'La bonne séance, ou le bon repos',
    body: 'Un verdict par jour, avec ses raisons. Tu peux le suivre, l’ajuster, ou en discuter avec le coach.',
  },
  {
    index: '03',
    label: 'Atteindre',
    title: 'Jusqu’à ton objectif',
    body: 'Chaque choix se projette sur ta course cible. Le programme s’adapte à ta vie, tu gardes le cap.',
  },
];

export const LANDING_PILLARS = [
  { label: 'Objectif', body: 'Une course, une date, un niveau visé.' },
  { label: 'Programme', body: 'Des semaines construites pour y arriver, qui bougent avec toi.' },
  { label: 'Suivi', body: 'Une lecture honnête de ta progression, incertitudes comprises.' },
] as const;

/** Only what ships is listed as connected; the rest is announced, never claimed. */
export const LANDING_SOURCES = {
  title: 'Branché sur tes appareils',
  connected: ['Garmin', 'Apple Watch', 'Strava', 'Withings', 'MyFitnessPal'],
  upcomingLabel: 'Bientôt',
  upcoming: ['Oura', 'Whoop', 'Google Fit'],
} as const;

export const LANDING_CLOSING = {
  title: 'Une décision, puis tu passes à autre chose.',
  cta: { label: 'Commencer', href: LANDING_LINKS.signUp },
} as const;

export const LANDING_FOOTER_LINKS = [
  { label: 'Confidentialité', href: LANDING_LINKS.privacy },
  { label: 'Conditions', href: LANDING_LINKS.terms },
  { label: 'Connexion', href: LANDING_LINKS.signIn },
] as const;

/** Every athlete-facing string on the landing, for the forbidden-copy guard. */
export function landingCopyStrings(): string[] {
  return [
    LANDING_HERO.eyebrow,
    ...LANDING_HERO.titleLines,
    LANDING_HERO.body,
    ...LANDING_CHAIN.flatMap((step) => [step.label, step.title, step.body]),
    ...LANDING_PILLARS.flatMap((pillar) => [pillar.label, pillar.body]),
    LANDING_SOURCES.title,
    ...LANDING_SOURCES.connected,
    LANDING_SOURCES.upcomingLabel,
    ...LANDING_SOURCES.upcoming,
    LANDING_CLOSING.title,
  ];
}
