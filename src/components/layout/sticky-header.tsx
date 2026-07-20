'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * En-tête de page collant (desktop uniquement). Au repos il est transparent ;
 * dès que la page défile, un fond translucide flouté apparaît en douceur.
 *
 * Sur mobile : en-tête statique, sans blur ni fondu (gain de place, pas de bug visuel).
 *
 * Utiliser `embedded` dans les vues imbriquées (hubs à onglets) pour éviter
 * l'empilement de plusieurs barres sticky sur le même scroll.
 */
export function StickyHeader({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const mq = window.matchMedia('(min-width: 1024px)');
    if (!mq.matches) return;

    const observer = new IntersectionObserver(([entry]) => setStuck(entry.intersectionRatio < 1), {
      threshold: [1],
      rootMargin: '-1px 0px 0px 0px',
    });
    observer.observe(el);

    const onBreakpoint = () => {
      if (!mq.matches) setStuck(false);
    };
    mq.addEventListener('change', onBreakpoint);

    return () => {
      observer.disconnect();
      mq.removeEventListener('change', onBreakpoint);
    };
  }, []);

  return (
    <header
      ref={ref}
      className={cn(
        'relative z-40 py-3 lg:sticky lg:top-0 lg:-mx-6 lg:px-6 lg:py-4 lg:transition-[background-color,border-color,backdrop-filter] lg:duration-300 lg:ease-out',
        stuck
          ? 'lg:border-border/60 lg:bg-background/85 lg:supports-backdrop-filter:bg-background/70 lg:border-b lg:backdrop-blur-xl'
          : 'border-b border-transparent bg-transparent',
        className,
      )}
    >
      {children}
      <div
        className={cn(
          'bg-background/80 pointer-events-none absolute inset-x-0 top-full hidden h-4 transition-opacity duration-300 lg:block',
          stuck ? 'opacity-100' : 'opacity-0',
        )}
        aria-hidden
      />
    </header>
  );
}

/** En-tête statique pour vues imbriquées dans un hub (évite les sticky empilés). */
export function PageHeader({
  children,
  className,
  embedded = false,
}: {
  children: React.ReactNode;
  className?: string;
  embedded?: boolean;
}) {
  if (embedded) {
    return <div className={cn('pb-2', className)}>{children}</div>;
  }
  return <StickyHeader className={className}>{children}</StickyHeader>;
}
