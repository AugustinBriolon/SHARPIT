'use client';

import { useSyncExternalStore } from 'react';

const emptySubscribe = () => () => {};

/**
 * Renvoie false pendant le rendu serveur et la première passe d'hydratation,
 * puis true côté client. C'est l'API officielle pour les valeurs « client-only »
 * (pas de setState dans un effet, donc pas de décalage d'hydratation ni de
 * réécriture par l'auto-fix lint `set-state-in-effect`).
 */
export function useMounted(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}
