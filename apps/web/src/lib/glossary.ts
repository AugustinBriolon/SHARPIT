/**
 * Every technical term the app puts in front of the athlete, defined once.
 *
 * The definitions used to live in a "Glossaire" section at the bottom of the load
 * screen, which meant reading an acronym at the top and scrolling to the end to
 * find out what it was. They now travel with the term instead — but only one copy
 * of each definition exists, so the card module and the inline marker can never
 * end up explaining the same word two different ways.
 */
export type GlossaryTerm = {
  /** How the term is written where it appears. */
  readonly term: string;
  /** Plain French, no other acronym inside it. */
  readonly definition: string;
};

export const GLOSSARY = {
  tss: {
    term: 'TSS',
    definition:
      'La charge d’une séance, en une seule note. Une heure passée exactement à ton seuil vaut 100. Deux heures faciles peuvent valoir autant qu’une demi-heure très dure.',
  },
  acwr: {
    term: 'Montée de charge',
    definition:
      'Le rapport entre la charge des sept derniers jours et ta base des dernières semaines. Sous 0,9 tu perds du terrain ; au-dessus de 1,3 tu progresses plus vite que ce que le corps encaisse, et c’est là que les blessures de surcharge apparaissent.',
  },
  tsb: {
    term: 'Forme',
    definition:
      'L’écart entre ta forme de fond et ta fatigue récente. Négatif, tu construis ; nettement positif, tu es frais et prêt à performer, mais tu ne progresses plus.',
  },
  ctl: {
    term: 'Forme chronique',
    definition:
      'Ta charge moyenne sur les six dernières semaines — ce que ton corps a appris à encaisser. Elle monte lentement et redescend lentement.',
  },
  atl: {
    term: 'Fatigue aiguë',
    definition:
      'Ta charge moyenne sur la dernière semaine. Elle réagit vite : deux jours durs la font grimper, trois jours de repos la font tomber.',
  },
  hrv: {
    term: 'VFC',
    definition:
      'Variabilité de la fréquence cardiaque : l’écart entre deux battements au repos. Elle monte quand le système nerveux est disponible, baisse sous fatigue, stress ou dette de sommeil.',
  },
  restingHr: {
    term: 'FC repos',
    definition:
      'Fréquence cardiaque au repos, mesurée pendant la nuit. Elle grimpe quand le corps travaille encore à récupérer.',
  },
  bodyBattery: {
    term: 'Body Battery',
    definition:
      'Estimation Garmin de l’énergie disponible, reconstituée par le sommeil et consommée par l’effort et le stress.',
  },
  stress: {
    term: 'Stress',
    definition:
      'Score Garmin de 0 à 100 dérivé de la variabilité cardiaque sur la journée. Il ne distingue pas le stress d’un entraînement de celui d’une réunion — le corps non plus.',
  },
  steps: {
    term: 'Pas',
    definition:
      'Tout ce que tu bouges hors séance. Sur une grosse journée debout, cette charge-là compte autant qu’un footing facile, et elle passe habituellement inaperçue.',
  },
  strain: {
    term: 'Charge du jour',
    definition:
      'La somme de ce que la journée a coûté : l’entraînement, le stress cardiovasculaire et le mouvement quotidien, ramenés à une même échelle.',
  },
} as const satisfies Record<string, GlossaryTerm>;

export type GlossaryKey = keyof typeof GLOSSARY;
