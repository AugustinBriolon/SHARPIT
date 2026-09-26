/** Links to the Performance page's record categories — pure, safe for client components. */

export type RecordSportTab = 'run' | 'bike' | 'swim';

export const RECORDS_PAGE_PATH = '/moi/performance';

/** Identifiant d'ancre DOM pour une catégorie de record (ex. `swim-distance`). */
export function recordCategoryAnchorId(category: string): string {
  return category;
}

/** Onglet sport de la page Performance pour une catégorie de record. */
export function recordSportTabFromCategory(category: string): RecordSportTab | null {
  if (category.startsWith('swim-')) {
    return 'swim';
  }
  if (category.startsWith('bike-') || category.startsWith('power-')) {
    return 'bike';
  }
  if (category.startsWith('run-') || category.startsWith('run-best')) {
    return 'run';
  }
  return null;
}

/** Lien vers la catégorie sur la page Performance (sport + ancre). */
export function recordCategoryHref(category: string): string {
  const sport = recordSportTabFromCategory(category);
  const sportQuery = sport ? `?sport=${sport}` : '';
  return `${RECORDS_PAGE_PATH}${sportQuery}#${recordCategoryAnchorId(category)}`;
}
