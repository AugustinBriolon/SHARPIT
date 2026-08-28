export type ActivityFeelingOption = {
  value: string;
  label: string;
  icon: string;
  hint: string;
};

/** Session feeling scale — shared by form, chip modal, and prompt. */
export const ACTIVITY_FEELING_SCALE: ActivityFeelingOption[] = [
  {
    value: 'Très bien',
    label: 'Très bien',
    icon: '😄',
    hint: 'Fluide, énergie au rendez-vous.',
  },
  {
    value: 'Bien',
    label: 'Bien',
    icon: '🙂',
    hint: 'Bon ressenti, effort maîtrisé.',
  },
  {
    value: 'Correct',
    label: 'Correct',
    icon: '😐',
    hint: 'Séance faite, sans plus ni moins.',
  },
  {
    value: 'Mal',
    label: 'Mal',
    icon: '😣',
    hint: 'Difficile, jambes lourdes ou manque d’énergie.',
  },
  {
    value: 'Très mal',
    label: 'Très mal',
    icon: '😞',
    hint: 'Très dur — signes de surmenage ou inconfort.',
  },
];

export const ACTIVITY_FEELING_OPTIONS = ACTIVITY_FEELING_SCALE.map(({ value, label }) => ({
  value,
  label,
}));
