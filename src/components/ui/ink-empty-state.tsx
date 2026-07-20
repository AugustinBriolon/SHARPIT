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
  /** Edge-to-edge within the shell column (Seed full-bleed band) */
  bleed?: boolean;
};

/**
 * Seed-inspired empty / onboarding surface — Forest (light) or Lime (dark) band.
 * Use for known-nothing states, not loading skeletons.
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
        'flex flex-col items-center justify-center gap-3 text-center',
        bleed ? 'page-bleed-ink' : 'surface-ink',
        compact ? 'py-8' : 'py-14',
        !bleed && (compact ? 'px-4' : 'px-6'),
        className,
      )}
    >
      {Icon ? (
        <div className={cn('icon-well rounded-analysis-lg', compact ? 'size-10' : 'size-12')}>
          <Icon className={compact ? 'size-4' : 'size-5'} />
        </div>
      ) : null}
      <div className="space-y-1">
        <p className="text-ink-surface-foreground text-sm font-medium">{title}</p>
        {description ? (
          <p
            className={cn(
              'text-ink-surface-foreground/75 max-w-sm leading-relaxed',
              compact ? 'text-xs' : 'text-xs sm:text-sm',
            )}
          >
            {description}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
