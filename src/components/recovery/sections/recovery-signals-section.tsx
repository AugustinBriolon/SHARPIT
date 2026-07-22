import { DrillDownSectionCard } from '@/components/today/drill-down/section-card';
import { DrillDownSectionLabel } from '@/components/today/drill-down/section-label';

/**
 * Instrument readout: hairline rows. Labels carry the state; no chip colors.
 */
export function RecoverySignalsSection({
  autonomicLabel,
  wellnessLabel,
  loadLabel,
  dissonanceDetected,
}: {
  autonomicLabel: string;
  autonomicClass?: string;
  wellnessLabel: string;
  wellnessClass?: string;
  loadLabel: string;
  loadClass?: string;
  dissonanceDetected: boolean;
}) {
  const rows = [
    { label: 'Autonome', value: autonomicLabel },
    { label: 'Sensation', value: wellnessLabel },
    { label: 'Charge', value: loadLabel },
  ];

  return (
    <DrillDownSectionCard>
      <DrillDownSectionLabel>Lecture des signaux</DrillDownSectionLabel>
      <ul className="divide-analysis-border/50 mt-2 divide-y">
        {rows.map((row) => (
          <li key={row.label} className="flex items-baseline justify-between gap-4 py-3">
            <p className="text-foreground text-sm font-medium">{row.label}</p>
            <p className="text-data text-foreground shrink-0 text-sm font-semibold tabular-nums">
              {row.value}
            </p>
          </li>
        ))}
      </ul>
      {dissonanceDetected ? (
        <p className="annotation-clinical text-signal-caution mt-4">
          Sensations et marqueurs physiologiques divergent aujourd&apos;hui.
        </p>
      ) : null}
    </DrillDownSectionCard>
  );
}
