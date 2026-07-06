import { DrillDownSectionCard } from '@/components/today/drill-down/section-card';
import { DrillDownSectionLabel } from '@/components/today/drill-down/section-label';
import { cn } from '@/lib/utils';

export function DrillDownHighlightSection({
  label,
  title,
  titleClassName,
  description,
  bullets = [],
  maxBullets = 3,
}: {
  label: string;
  title: string;
  titleClassName: string;
  description?: string;
  bullets?: string[];
  maxBullets?: number;
}) {
  return (
    <DrillDownSectionCard>
      <DrillDownSectionLabel>{label}</DrillDownSectionLabel>
      <p className={cn('text-lg font-semibold', titleClassName)}>{title}</p>
      {description && <p className="text-muted-foreground mt-1 text-sm">{description}</p>}
      {bullets.length > 0 && (
        <ul className="text-muted-foreground mt-3 space-y-1.5 text-sm leading-relaxed">
          {bullets.slice(0, maxBullets).map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      )}
    </DrillDownSectionCard>
  );
}
