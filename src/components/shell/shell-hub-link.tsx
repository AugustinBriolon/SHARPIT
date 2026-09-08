import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { NavArrowRight } from '@/components/icons/nav-arrows';
import { cn } from '@/lib/utils';

export type ShellHubRowProps = {
  title: string;
  icon: LucideIcon | React.ComponentType<{ className?: string }>;
  /** Trailing status (theme, connected count…) — iOS-style detail before the chevron. */
  meta?: ReactNode;
  className?: string;
} & ({ href: string; comingSoon?: false } | { comingSoon: true; href?: never });

/**
 * Single inset row inside a {@link ShellHubGroup}.
 * Bevel-like: icon · label · meta · chevron — no description stack.
 *
 * Press scale lives on the inner content, not the hit target — scaling the
 * `<a>` would shrink the plate row (and fight `overflow-hidden` / dividers).
 * Surface preset (0.988): discreet for list rows used tens of times/day.
 */
export function ShellHubRow(props: ShellHubRowProps) {
  const { title, icon: Icon, meta, className } = props;

  const body = (
    <>
      <div className="icon-well size-8 shrink-0" aria-hidden>
        <Icon className="size-3.5" />
      </div>
      <span className="min-w-0 flex-1 truncate text-sm font-medium">{title}</span>
      {meta ? (
        <span className="text-muted-foreground shrink-0 text-xs tabular-nums">{meta}</span>
      ) : null}
      {props.comingSoon ? (
        <span className="text-muted-foreground shrink-0 text-[10px] font-medium tracking-wide uppercase">
          À venir
        </span>
      ) : (
        <NavArrowRight className="text-muted-foreground/70 size-3.5 shrink-0" />
      )}
    </>
  );

  const rowClass = cn(
    'flex min-h-12 w-full items-center px-3.5 py-2.5',
    'focus-visible:bg-muted/40 focus-visible:outline-hidden',
    className,
  );

  if (props.comingSoon) {
    return (
      <li>
        <div className={cn(rowClass, 'opacity-75')} aria-disabled>
          <div className="flex min-w-0 flex-1 items-center gap-3">{body}</div>
        </div>
      </li>
    );
  }

  const isExternal = /^(mailto:|https?:|tel:)/i.test(props.href);
  const inner = (
    <span
      className={cn(
        'flex min-w-0 flex-1 items-center gap-3',
        'transition-transform duration-150 ease-out',
        'motion-safe:group-active:scale-[var(--press-scale-surface)]',
      )}
    >
      {body}
    </span>
  );

  return (
    <li>
      {isExternal ? (
        <a
          href={props.href}
          className={cn(
            rowClass,
            'group hover:bg-muted/35 focus-visible:ring-primary/30 focus-visible:ring-2 focus-visible:ring-inset',
          )}
        >
          {inner}
        </a>
      ) : (
        <Link
          href={props.href}
          className={cn(
            rowClass,
            'group hover:bg-muted/35 focus-visible:ring-primary/30 focus-visible:ring-2 focus-visible:ring-inset',
          )}
        >
          {inner}
        </Link>
      )}
    </li>
  );
}

/**
 * Grouped settings plate — one surface, hairline dividers between rows.
 * Matches Bevel Paramètres composition inside SHARPIT instrument tokens.
 */
export function ShellHubGroup({
  id,
  title,
  children,
  className,
}: {
  id: string;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section aria-labelledby={`shell-hub-${id}`} className={cn('space-y-2', className)}>
      <h2 className="text-label text-muted-foreground px-1" id={`shell-hub-${id}`}>
        {title}
      </h2>
      <ul className="analysis-panel rounded-analysis-lg divide-analysis-border/55 divide-y overflow-hidden">
        {children}
      </ul>
    </section>
  );
}

/** Standalone single-row plate (e.g. Pro offer) — no section label. */
export function ShellHubSolo({
  children,
  className,
  'aria-label': ariaLabel,
}: {
  children: ReactNode;
  className?: string;
  'aria-label'?: string;
}) {
  return (
    <ul
      aria-label={ariaLabel}
      className={cn(
        'analysis-panel rounded-analysis-lg divide-analysis-border/55 divide-y overflow-hidden',
        className,
      )}
    >
      {children}
    </ul>
  );
}

/**
 * @deprecated Prefer {@link ShellHubRow} inside {@link ShellHubGroup}.
 * Kept for legacy single-chip links.
 */
export function ShellHubLink(
  props: {
    title: string;
    description?: string;
    icon: LucideIcon | React.ComponentType<{ className?: string }>;
    meta?: ReactNode;
    className?: string;
  } & ({ href: string; comingSoon?: false } | { comingSoon: true; href?: never }),
) {
  if (props.description) {
    const { title, description, icon: Icon, meta, className } = props;
    const body = (
      <>
        <div className="icon-well size-9 shrink-0" aria-hidden>
          <Icon className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className="min-w-0 truncate text-sm font-medium">{title}</p>
            {meta ? <p className="text-data shrink-0 text-xs tabular-nums">{meta}</p> : null}
          </div>
          <p className="text-muted-foreground mt-0.5 text-sm leading-relaxed">{description}</p>
        </div>
        {props.comingSoon ? (
          <span className="text-muted-foreground shrink-0 text-[10px] font-medium tracking-wide uppercase">
            À venir
          </span>
        ) : (
          <NavArrowRight className="text-muted-foreground/70 size-3.5 shrink-0 transition-transform duration-150 ease-out group-hover:translate-x-0.5 motion-reduce:transition-none" />
        )}
      </>
    );

    if (props.comingSoon) {
      return (
        <li>
          <div
            className={cn(
              'chip-surface-lg flex items-center gap-3 px-3 py-2.5',
              'rounded-analysis-lg opacity-80',
              className,
            )}
            aria-disabled
          >
            {body}
          </div>
        </li>
      );
    }

    return (
      <li>
        <Link
          href={props.href}
          className={cn(
            'chip-surface-lg group flex items-center gap-3 px-3 py-2.5',
            'rounded-analysis-lg hover:border-primary/25 focus-visible:ring-primary/35 focus-visible:ring-2 focus-visible:outline-hidden',
            className,
          )}
        >
          {body}
        </Link>
      </li>
    );
  }

  return <ShellHubRow {...props} />;
}
