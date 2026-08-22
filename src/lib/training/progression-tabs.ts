/**
 * The three readings of the athlete's own level, defined once.
 *
 * They were written inside the hub component, which meant the only way to reach
 * Records or Calibration was to already be on the hub and see its tab bar. Any
 * screen that wants to send someone straight to one of them needs the same label,
 * the same sentence and the same URL — so all three live here.
 *
 * "Progression" is the route's name, not theirs. Nothing about a threshold table
 * or a personal-best list is progression, and a heading that says so sends people
 * past the thing they were looking for. What the three actually share is that they
 * all answer "what is my level" — now, at best, and as the model reads it.
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

/** What the three have in common, said in the words an athlete would use. */
export const PROGRESSION_SECTION_TITLE = 'Ton niveau';

export function progressionTabHref(id: ProgressionTabId): string {
  return `${PROGRESSION_BASE_PATH}?tab=${id}`;
}

export function isProgressionTabId(value: string | null): value is ProgressionTabId {
  return PROGRESSION_TABS.some((tab) => tab.id === value);
}
