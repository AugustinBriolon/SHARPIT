'use client';

import { useLayoutEffect, useRef } from 'react';

/**
 * Runs `reset` when Cache Components hides this route.
 *
 * Routes are preserved with React `<Activity>` in `"hidden"` mode instead of
 * being unmounted ([ADR-010]), so state that used to die on navigation now
 * survives it. Effect cleanup still runs on hide, which is the hook this uses.
 * `useLayoutEffect` so the reset lands before the route is hidden — no frame
 * where stale state is still painted.
 *
 * Use it for **transient** state only: a dialog opened by a button click, a
 * "saved" confirmation, a menu. Deliberate view state — filter values, an
 * expanded section, a draft in progress — should survive, since not losing it
 * is the point of the preservation.
 *
 * [ADR-010]: docs/adr/ADR-010-cache-components-and-instant-navigation.md
 */
export function useResetWhenHidden(reset: () => void): void {
  const latest = useRef(reset);

  useLayoutEffect(() => {
    latest.current = reset;
  });

  useLayoutEffect(() => () => latest.current(), []);
}
