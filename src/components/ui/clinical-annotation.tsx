import { cn } from '@/lib/utils';

/**
 * Marginal clinical note — replaces colored alert banners.
 * No background, no icon: a 2px analysis border and muted text,
 * with the title inline in the reading flow.
 */
export function ClinicalAnnotation({
  title,
  children,
  className,
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('annotation-clinical', className)}>
      {title ? <span className="text-foreground/85 font-medium">{title} — </span> : null}
      {children}
    </div>
  );
}
