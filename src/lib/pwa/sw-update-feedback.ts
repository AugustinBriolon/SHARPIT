/**
 * Copy + toast payload for the SW update applying transition.
 * Kept pure so the "never a dead click" contract is unit-testable without a browser.
 */

export const SW_UPDATE_AVAILABLE_TITLE = 'Nouvelle version disponible';
export const SW_UPDATE_APPLY_LABEL = 'Mettre à jour';
export const SW_UPDATE_APPLYING_LABEL = 'Mise à jour…';
export const SW_UPDATE_APPLYING_TITLE = 'Mise à jour en cours…';
export const SW_UPDATE_APPLYING_DESCRIPTION = 'Rechargement dans un instant';

export type ApplyingUpdateToastOptions = {
  readonly type: 'loading';
  readonly title: string;
  readonly description: string;
  readonly timeout: 0;
};

/** Immediate optimistic toast state after the athlete confirms an update. */
export function buildApplyingUpdateToastOptions(): ApplyingUpdateToastOptions {
  return {
    type: 'loading',
    title: SW_UPDATE_APPLYING_TITLE,
    description: SW_UPDATE_APPLYING_DESCRIPTION,
    timeout: 0,
  };
}
