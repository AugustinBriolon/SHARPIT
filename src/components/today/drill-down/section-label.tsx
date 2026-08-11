import { EyebrowLabel } from '@/components/ui/eyebrow-label';
import { cn } from '@/lib/utils';

/**
 * Section title on a drill-down page. Renders as a real `h2` so the page has a
 * navigable outline; pass `as="p"` for the rare label that titles nothing.
 */
export function DrillDownSectionLabel({
  children,
  className,
  as = 'h2',
}: {
  children: React.ReactNode;
  className?: string;
  as?: 'p' | 'h2' | 'h3';
}) {
  return (
    <EyebrowLabel as={as} className={cn('mb-3', className)} variant="section">
      {children}
    </EyebrowLabel>
  );
}
