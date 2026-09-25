import { cn } from '@/lib/utils';

/**
 * Semantic eyebrow — defaults to `text-label`.
 * Only `alert` overrides color; all other variants collapse to the canonical label.
 *
 * `as` carries the heading level when the eyebrow is the actual title of a
 * section. Rendering every one of these as a `<p>` left the analysis pages with
 * no heading outline at all, so a screen reader could not jump between sections.
 */
export function EyebrowLabel({
  children,
  variant = 'section',
  className,
  as: Tag = 'p',
}: {
  children: React.ReactNode;
  variant?: 'dashboard' | 'section' | 'corps' | 'metric' | 'alert';
  className?: string;
  as?: 'p' | 'h2' | 'h3';
}) {
  return (
    <Tag className={cn('text-label', variant === 'alert' && 'text-signal-vo2', className)}>
      {children}
    </Tag>
  );
}
