import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Lien retour ; masqué sur desktop par défaut (< lg). */
export function MobileBackLink({
  href,
  label,
  className,
  showOnDesktop = false,
}: {
  href: string;
  label: string;
  className?: string;
  /** Affiche le lien sur desktop aussi (défaut : mobile uniquement). */
  showOnDesktop?: boolean;
}) {
  return (
    <>
      <Link
        href={href}
        className={cn(
          'text-muted-foreground hover:text-foreground bg-background/80 fixed inset-x-0 top-0 z-50 flex min-h-14 items-center gap-1 px-4 text-sm backdrop-blur-sm transition-colors lg:static lg:mb-3 lg:min-h-11 lg:bg-transparent lg:px-0 lg:backdrop-blur-none',
          !showOnDesktop && 'lg:hidden',
          className,
        )}
      >
        <ChevronLeft className="size-4 shrink-0" aria-hidden />
        {label}
      </Link>
      <div className="h-14 lg:hidden" aria-hidden />
    </>
  );
}
