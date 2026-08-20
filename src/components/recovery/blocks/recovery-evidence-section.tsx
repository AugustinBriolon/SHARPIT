import { DrillDownSectionCard } from '@/components/today/drill-down/section-card';
import { DrillDownSectionLabel } from '@/components/today/drill-down/section-label';

/**
 * Compact readout — structured facts instead of prose bullets.
 * Score / intensity / limiter already drive the decision; no need to restate them in sentences.
 */
export function RecoveryEvidenceSection({
  readinessScore,
  intensityLabel,
  limiterLabel,
}: {
  readinessScore: number | null;
  intensityLabel: string;
  limiterLabel: string | null;
}) {
  const rows = [
    {
      label: 'Score',
      value: readinessScore != null ? `${Math.round(readinessScore)}` : '—',
    },
    {
      label: 'Intensité',
      value: intensityLabel,
    },
    ...(limiterLabel
      ? [
          {
            label: 'Facteur limitant',
            value: limiterLabel,
          },
        ]
      : []),
  ];

  return (
    <DrillDownSectionCard>
      <DrillDownSectionLabel>En bref</DrillDownSectionLabel>
      <ul className="divide-analysis-border/50 mt-2 divide-y">
        {rows.map((row) => (
          <li key={row.label} className="flex items-baseline justify-between gap-4 py-3">
            <p className="text-muted-foreground text-sm">{row.label}</p>
            <p className="text-data text-foreground shrink-0 text-sm font-semibold tabular-nums">
              {row.value}
            </p>
          </li>
        ))}
      </ul>
    </DrillDownSectionCard>
  );
}
