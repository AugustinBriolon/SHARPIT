/**
 * Canonical Moi-split surfaces (Shell V1.1).
 *
 * Hub `/moi` is destinations only. Corps / Objectifs / Performance are dedicated
 * pages — never a tabbed fourre-tout. Confidentialité stays at `/settings/privacy`
 * (consent / export / delete); legal walls `/consent` `/privacy` `/terms` stay outside the shell.
 */

export const MOI_HUB_PATH = '/moi' as const;
export const MOI_CORPS_PATH = '/moi/corps' as const;
export const MOI_OBJECTIFS_PATH = '/moi/objectifs' as const;
export const MOI_PERFORMANCE_PATH = '/moi/performance' as const;
export const MOI_PRIVACY_PATH = '/settings/privacy' as const;

export type ProgressLegacyTab = 'goals' | 'performance' | 'body';

/** Map legacy `/progress?tab=` bookmarks onto dedicated Moi surfaces. */
export function resolveProgressLegacyRedirect(input: {
  tab?: string | null;
  sport?: string | null;
}): string {
  const { tab, sport: sportParam } = input;
  if (tab === 'body') {
    return MOI_CORPS_PATH;
  }
  if (tab === 'performance') {
    const sport =
      sportParam === 'run' || sportParam === 'bike' || sportParam === 'swim' ? sportParam : null;
    return sport ? `${MOI_PERFORMANCE_PATH}?sport=${sport}` : MOI_PERFORMANCE_PATH;
  }
  return MOI_OBJECTIFS_PATH;
}
