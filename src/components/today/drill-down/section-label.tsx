import { EyebrowLabel } from '@/components/ui/eyebrow-label';
import { cn } from '@/lib/utils';

export function DrillDownSectionLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <EyebrowLabel className={cn('mb-3', className)} variant="section">
      {children}
    </EyebrowLabel>
  );
}
