import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ShellHubLinkProps = {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon | React.ComponentType<{ className?: string }>;
  /** Optional status / meta chip (e.g. settings hub status). */
  meta?: React.ReactNode;
  className?: string;
};

/**
 * Shared row for Shell V1 hub shells (Plan / Activité / Moi).
 * Same instrument chip surface as Settings — not a decorative card stack.
 */
export function ShellHubLink({
  href,
  title,
  description,
  icon: Icon,
  meta,
  className,
}: ShellHubLinkProps) {
  return (
    <li>
      <Link
        href={href}
        className={cn(
          'chip-surface-lg group flex items-center gap-3 px-3 py-2.5',
          'rounded-analysis-lg hover:border-primary/25 focus-visible:ring-primary/35 focus-visible:ring-2 focus-visible:outline-hidden',
          className,
        )}
      >
        <div className="icon-well size-9 shrink-0" aria-hidden>
          <Icon className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <p className="text-sm font-medium">{title}</p>
            {meta ? (
              <p className="text-data text-muted-foreground text-xs tabular-nums">{meta}</p>
            ) : null}
          </div>
          <p className="text-muted-foreground mt-0.5 text-sm leading-relaxed">{description}</p>
        </div>
        <span
          className="text-muted-foreground/70 text-data shrink-0 text-xs tracking-wider transition-transform group-hover:translate-x-0.5"
          aria-hidden
        >
          →
        </span>
      </Link>
    </li>
  );
}
