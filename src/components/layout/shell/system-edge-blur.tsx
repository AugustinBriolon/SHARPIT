'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * Progressive top-edge blur under the status bar / Dynamic Island (ADR-039).
 *
 * Sticky zero-height sentinel inside `<main>`. Visuals live on an absolute child
 * so Safari 26 does not sample backdrop/background on the sticky box itself.
 *
 * Glass mounts only after the document has scrolled: at rest, titles sit clear
 * of the safe area and Safari's native Liquid Glass owns the status strip —
 * our overlay must not paint a second solid band over the first heading.
 */
export function SystemEdgeBlur({ enabled = true }: { enabled?: boolean }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const sync = () => {
      setScrolled(window.scrollY > 4);
    };

    sync();
    window.addEventListener('scroll', sync, { passive: true });
    return () => window.removeEventListener('scroll', sync);
  }, [enabled]);

  if (!enabled) {
    return null;
  }

  return (
    <div className={cn('system-edge-blur lg:hidden')} aria-hidden>
      {/* No opacity:0 glass — Safari still samples those styles for tint. */}
      {scrolled ? <div className="system-edge-fade" /> : null}
    </div>
  );
}
