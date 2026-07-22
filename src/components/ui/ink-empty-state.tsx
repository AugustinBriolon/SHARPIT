import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type InkEmptyStateProps = {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
  className?: string;
  /** Compact padding for inline lists / dialogs */
  compact?: boolean;
  /** Edge-to-edge within the shell column, without a loud ink band */
  bleed?: boolean;
};

/**
 * Quiet empty / known-nothing surface.
 * Continuity with analysis panels: muted icon, reading hierarchy, no ink band.
 */
export function InkEmptyState({
  title,
  description,
  icon: Icon,
  action,
  className,
  compact = false,
  bleed = false,
}: InkEmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-2.5',
        bleed
          ? 'border-analysis-border/60 bg-analysis-surface-alt/35 rounded-lg border border-dashed px-(--page-gutter,1rem)'
          : 'analysis-panel rounded-analysis-lg border-dashed',
        compact ? 'px-4 py-4' : 'px-5 py-5',
        className,
      )}
    >
      {Icon ? (
        <Icon
          aria-hidden={true}
          className="text-muted-foreground size-4 shrink-0"
          strokeWidth={1.5}
        />
      ) : null}
      <div className="space-y-1">
        <p className="text-foreground text-sm font-medium">{title}</p>
        {description ? (
          <p
            className={cn(
              'text-muted-foreground max-w-md leading-relaxed',
              compact ? 'text-xs' : 'text-xs sm:text-[13px]',
            )}
          >
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="pt-0.5">{action}</div> : null}
    </div>
  );
}
