import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

export function MobileDrillDownHeader({
  title,
  backHref = '/',
  backLabel = "Aujourd'hui",
  className,
}: {
  title: string;
  backHref?: string;
  backLabel?: string;
  className?: string;
}) {
  return (
    <header className={cn('mb-3 space-y-1 pt-14 lg:mb-4 lg:pt-0', className)}>
      <Link
        className="text-muted-foreground hover:text-foreground bg-background/80 fixed inset-x-0 top-0 z-40 flex min-h-14 items-center gap-1 px-4 text-sm backdrop-blur-xl transition-colors lg:static lg:min-h-11 lg:bg-transparent lg:px-0 lg:backdrop-blur-none"
        href={backHref}
      >
        <ChevronLeft className="size-4 shrink-0" aria-hidden />
        {backLabel}
      </Link>
      <h1 className="text-page-title">{title}</h1>
    </header>
  );
}
