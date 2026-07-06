import { DrillDownSectionCard } from '@/components/today/drill-down/section-card';
import { DrillDownSectionLabel } from '@/components/today/drill-down/section-label';

export function DrillDownBulletSection({
  label,
  lines,
  maxItems,
}: {
  label: string;
  lines: string[];
  maxItems?: number;
}) {
  if (!lines.length) return null;

  const visible = maxItems != null ? lines.slice(0, maxItems) : lines;

  return (
    <DrillDownSectionCard>
      <DrillDownSectionLabel>{label}</DrillDownSectionLabel>
      <ul className="text-muted-foreground space-y-1.5 text-sm leading-relaxed">
        {visible.map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ul>
    </DrillDownSectionCard>
  );
}
