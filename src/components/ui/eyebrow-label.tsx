import { cn } from '@/lib/utils';

/**
 * Semantic eyebrow — defaults to `text-label`.
 * Only `alert` overrides color; all other variants collapse to the canonical label.
 */
export function EyebrowLabel({
  children,
  variant = 'section',
  className,
}: {
  children: React.ReactNode;
  variant?: 'dashboard' | 'section' | 'corps' | 'metric' | 'alert';
  className?: string;
}) {
  return (
    <p className={cn('text-label', variant === 'alert' && 'text-signal-vo2', className)}>
      {children}
    </p>
  );
}
