/**
 * The three faces of Progression, defined once.
 *
 * They were written inside the hub component, which meant the only way to reach
 * Records or Calibration was to already be on the hub and see its tab bar. Any
 * screen that wants to send someone straight to one of them needs the same label,
 * the same sentence and the same URL — so all three live here.
 */
export type ProgressionTabId = 'etat' | 'records' | 'calibration';

export type ProgressionTab = {
  readonly id: ProgressionTabId;
  readonly label: string;
  readonly description: string;
  /** Said plainly enough that nobody has to open it to find out. */
  readonly blurb: string;
};

export const PROGRESSION_TABS: readonly ProgressionTab[] = [
  {
    id: 'etat',
    label: 'État',
    description: 'Où tu en es maintenant — forme, charge, fraîcheur et projection.',
    blurb: 'Forme, charge et fraîcheur',
  },
  {
    id: 'records',
    label: 'Records',
    description: 'Tes meilleures performances observées et courbes de référence.',
    blurb: 'Tes meilleures performances',
  },
  {
    id: 'calibration',
    label: 'Calibration',
    description: 'Les repères utilisés par SHARPIT pour interpréter tes efforts.',
    blurb: 'Seuils, FTP, allure et FC max',
  },
] as const;

export const PROGRESSION_BASE_PATH = '/training/progression';

export function progressionTabHref(id: ProgressionTabId): string {
  return `${PROGRESSION_BASE_PATH}?tab=${id}`;
}

export function isProgressionTabId(value: string | null): value is ProgressionTabId {
  return PROGRESSION_TABS.some((tab) => tab.id === value);
}
