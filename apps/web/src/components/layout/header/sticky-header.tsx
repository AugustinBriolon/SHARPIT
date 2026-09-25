'use client';

import { cn } from '@/lib/utils';
import { useDesktopStickyHeader } from '@/components/layout/header/use-desktop-sticky-header';

/**
 * En-tête de page collant (desktop uniquement). Au repos il est transparent ;
 * dès que la page défile, un fond translucide flouté apparaît en douceur.
 *
 * On mobile, the header stays static. `SystemEdgeBlur` owns the Dynamic Island
 * edge, and document scrolling lets Safari composite live page pixels beneath it.
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
  const { ref, stuck } = useDesktopStickyHeader();

  return (
    <header
      ref={ref}
      className={cn(
        'relative z-30 py-3 lg:sticky lg:top-0 lg:z-40 lg:-mx-6 lg:px-6 lg:py-4 lg:transition-[background-color,border-color,backdrop-filter] lg:duration-300 lg:ease-out',
        stuck
          ? 'lg:border-border/60 lg:bg-background/85 lg:supports-backdrop-filter:bg-background/70 lg:border-b lg:backdrop-blur-xl'
          : 'border-b border-transparent bg-transparent',
        className,
      )}
    >
      {children}
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
