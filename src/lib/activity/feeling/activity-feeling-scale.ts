export type ActivityFeelingOption = {
  value: string;
  label: string;
  hint: string;
};

/**
 * Session feeling scale — left (pire) → right (meilleur) in pickers.
 *
 * No icon field: the picker renders the ordinal and reads the hint back. Emoji
 * faces are decorative by definition and consumer-fitness DNA — both prohibited
 * (DESIGN_LANGUAGE §11.1 and the anti-pattern table).
 */
export const ACTIVITY_FEELING_SCALE: ActivityFeelingOption[] = [
  {
    value: 'Très mal',
    label: 'Très mal',
    hint: 'Très dur — signes de surmenage ou inconfort.',
  },
  {
    value: 'Mal',
    label: 'Mal',
    hint: 'Difficile, jambes lourdes ou manque d’énergie.',
  },
  {
    value: 'Correct',
    label: 'Correct',
    hint: 'Séance faite, sans plus ni moins.',
  },
  {
    value: 'Bien',
    label: 'Bien',
    hint: 'Bon ressenti, effort maîtrisé.',
  },
  {
    value: 'Très bien',
    label: 'Très bien',
    hint: 'Fluide, énergie au rendez-vous.',
  },
];

/** Select / form order — meilleur en premier. */
export const ACTIVITY_FEELING_OPTIONS = [...ACTIVITY_FEELING_SCALE]
  .reverse()
  .map(({ value, label }) => ({
    value,
    label,
  }));
