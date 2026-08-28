export type ActivityFeelingOption = {
  value: string;
  label: string;
  icon: string;
  hint: string;
};

/** Session feeling scale — left (pire) → right (meilleur) in pickers. */
export const ACTIVITY_FEELING_SCALE: ActivityFeelingOption[] = [
  {
    value: 'Très mal',
    label: 'Très mal',
    icon: '😞',
    hint: 'Très dur — signes de surmenage ou inconfort.',
  },
  {
    value: 'Mal',
    label: 'Mal',
    icon: '😣',
    hint: 'Difficile, jambes lourdes ou manque d’énergie.',
  },
  {
    value: 'Correct',
    label: 'Correct',
    icon: '😐',
    hint: 'Séance faite, sans plus ni moins.',
  },
  {
    value: 'Bien',
    label: 'Bien',
    icon: '🙂',
    hint: 'Bon ressenti, effort maîtrisé.',
  },
  {
    value: 'Très bien',
    label: 'Très bien',
    icon: '😄',
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
