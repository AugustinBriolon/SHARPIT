import { cn } from '@/lib/utils';

/** Recharts tooltip shell — theme-aware (light + dark). */
export function ChartTooltipCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('analysis-panel rounded-analysis px-3 py-2 text-xs shadow-none', className)}>
      {children}
    </div>
  );
}
