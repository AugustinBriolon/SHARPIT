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
    <Link
      href={href}
      className={cn(
        'text-muted-foreground hover:text-foreground mb-3 inline-flex min-h-11 items-center gap-1 text-sm transition-colors',
        !showOnDesktop && 'lg:hidden',
        className,
      )}
    >
      <ChevronLeft className="size-4 shrink-0" aria-hidden />
      {label}
    </Link>
  );
}
