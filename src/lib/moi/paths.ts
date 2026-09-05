/**
 * Canonical Moi surfaces.
 *
 * Hub `/moi` is destinations only. Corps / Objectifs / Performance / Calibration
 * are dedicated pages — never a tabbed fourre-tout. Confidentialité stays at
 * `/settings/privacy` (consent / export / delete); legal walls `/consent`
 * `/privacy` `/terms` stay outside the shell.
 */

export const MOI_HUB_PATH = '/moi' as const;
export const MOI_CORPS_PATH = '/moi/corps' as const;
export const MOI_OBJECTIFS_PATH = '/moi/objectifs' as const;
export const MOI_PERFORMANCE_PATH = '/moi/performance' as const;
export const MOI_CALIBRATION_PATH = '/moi/calibration' as const;
export const MOI_PRIVACY_PATH = '/settings/privacy' as const;
