'use client';

import { createContext, useContext, type ReactNode } from 'react';

const PlannedSessionNavDismissContext = createContext<(() => void) | null>(null);

/** Lets deep-links (e.g. discuss with coach) close the planned-session dialog before navigating. */
export function PlannedSessionNavDismissProvider({
  onDismiss,
  children,
}: {
  onDismiss: () => void;
  children: ReactNode;
}) {
  return (
    <PlannedSessionNavDismissContext.Provider value={onDismiss}>
      {children}
    </PlannedSessionNavDismissContext.Provider>
  );
}

export function usePlannedSessionNavDismiss(): (() => void) | null {
  return useContext(PlannedSessionNavDismissContext);
}
