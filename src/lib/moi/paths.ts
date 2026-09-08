/**
 * Canonical Réglages surfaces (`/moi` hub).
 *
 * Hub `/moi` title Paramètres — Bevel-like grouped plates:
 * Modèle · Pro solo · Compte · Préférences · Données · Ressources · Support · Mentions légales.
 * Corps owns composition + suivi (living body signals).
 * Profil (`/settings/account`) owns identity (taille / sommeil) + session + door to Confidentialité.
 * Apparence owns theme. Personnalisation owns Mode Expert densite (`#densite`), data window, modules.
 * `/settings/appearance/expert-mode` redirects to Personnalisation.
 * Legal walls `/consent` `/privacy` `/terms` stay outside the shell.
 */

export const MOI_HUB_PATH = '/moi' as const;
export const MOI_CORPS_PATH = '/moi/corps' as const;
export const MOI_OBJECTIFS_PATH = '/moi/objectifs' as const;
export const MOI_PERFORMANCE_PATH = '/moi/performance' as const;
export const MOI_CALIBRATION_PATH = '/moi/calibration' as const;
export const MOI_PRIVACY_PATH = '/settings/privacy' as const;
export const MOI_ACCOUNT_PATH = '/settings/account' as const;
export const MOI_PROFILE_PATH = MOI_ACCOUNT_PATH;
export const MOI_PROFILE_IDENTITY_HASH = '#identite' as const;
export const MOI_APPEARANCE_PATH = '/settings/appearance' as const;
export const MOI_PERSONALIZATION_PATH = '/settings/personalization' as const;
export const MOI_PERSONALIZATION_DENSITY_HASH = '#densite' as const;
export const MOI_SOURCE_ROUTING_PATH = '/settings/source-routing' as const;
export const MOI_WHATS_NEW_PATH = '/settings/whats-new' as const;
export const MOI_HELP_PATH = '/settings/help' as const;
export const MOI_PRO_PATH = '/settings/pro' as const;
