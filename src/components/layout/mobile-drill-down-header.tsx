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
    <header className={cn('mb-3 space-y-1 lg:mb-4', className)}>
      <Link
        className="text-muted-foreground hover:text-foreground inline-flex min-h-11 items-center gap-1 text-sm transition-colors"
        href={backHref}
      >
        <ChevronLeft className="size-4 shrink-0" aria-hidden />
        {backLabel}
      </Link>
      <h1 className="font-heading text-xl font-semibold lg:text-2xl">{title}</h1>
    </header>
  );
}
