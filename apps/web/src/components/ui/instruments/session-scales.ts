import { ACTIVITY_FEELING_SCALE } from '@sharpit/app/lib/activity/feeling/activity-feeling-scale';
import type { ScaleOption } from '@/components/ui/instruments/scale-picker';

/** The scales a session (or a whole brick) is rated on after the fact. */

export const FEELING_OPTIONS: readonly ScaleOption<string>[] = ACTIVITY_FEELING_SCALE.map(
  (option) => ({ value: option.value, label: option.label, hint: option.hint }),
);

/** Foster CR10 anchors — the number alone tells the athlete nothing. */
const RPE_LABELS = [
  'Très facile',
  'Facile',
  'Modéré',
  'Assez dur',
  'Dur',
  'Plus dur',
  'Très dur',
  'Très dur soutenu',
  'Proche du max',
  'Maximal',
];

export const RPE_OPTIONS: readonly ScaleOption<number>[] = RPE_LABELS.map((label, index) => ({
  value: index + 1,
  label,
  hint: `${index + 1}/10 · ${label}.`,
}));

export const TRANSITION_OPTIONS: readonly ScaleOption<number>[] = [
  { value: 1, label: 'Ratées', hint: 'Jambes coupées, rythme jamais retrouvé.' },
  { value: 2, label: 'Difficiles', hint: 'Longues à digérer, allure en dessous.' },
  { value: 3, label: 'Correctes', hint: 'Quelques minutes pour retrouver le rythme.' },
  { value: 4, label: 'Bonnes', hint: 'Rythme retrouvé vite, sans à-coup.' },
  { value: 5, label: 'Fluides', hint: 'Enchaînement naturel, aucune rupture.' },
];
