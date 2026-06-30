'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * En-tête de page collant. Au repos il est transparent et fondu dans la page ;
 * dès que la page défile, un fond translucide flouté apparaît en douceur et un
 * léger dégradé fait « disparaître » le contenu qui passe derrière.
 *
 * À placer comme premier enfant du conteneur de page (padding `p-6` côté
 * AppShell). Les marges négatives `-mx-6` étendent le fond flouté sur toute la
 * largeur du contenu. Le composant rend un unique élément racine pour rester
 * compatible avec un parent en `space-y-*`.
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
    // Astuce « position: sticky collé » : on retire 1px en haut de la zone
    // d'intersection. Tant que l'en-tête est au repos il est entièrement
    // visible (ratio 1) ; dès qu'il se colle à `top-0`, ce 1px sort de la zone
    // observée et le ratio passe sous 1 → état « collé ».
    const observer = new IntersectionObserver(([entry]) => setStuck(entry.intersectionRatio < 1), {
      threshold: [1],
      rootMargin: '-1px 0px 0px 0px',
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <header
      ref={ref}
      className={cn(
        'sticky top-0 z-30 -mx-6 px-6 py-4 transition-[background-color,border-color,box-shadow,backdrop-filter] duration-300 ease-out',
        stuck
          ? 'border-border/60 bg-background/70 supports-backdrop-filter:bg-background/55 border-b shadow-sm backdrop-blur-xl'
          : 'border-b border-transparent bg-transparent',
        className,
      )}
    >
      {children}
      <div
        className={cn(
          'from-background/80 pointer-events-none absolute inset-x-0 top-full h-6 bg-linear-to-b to-transparent transition-opacity duration-300',
          stuck ? 'opacity-100' : 'opacity-0',
        )}
        aria-hidden
      />
    </header>
  );
}
