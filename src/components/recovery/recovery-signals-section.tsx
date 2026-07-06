import { DrillDownSectionCard } from '@/components/today/drill-down/section-card';
import { DrillDownSectionLabel } from '@/components/today/drill-down/section-label';
import { cn } from '@/lib/utils';

function SignalChip({ label, colorClass }: { label: string; colorClass: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-current/20 ring-inset',
        colorClass,
      )}
    >
      {label}
    </span>
  );
}

export function RecoverySignalsSection({
  autonomicLabel,
  autonomicClass,
  wellnessLabel,
  wellnessClass,
  loadLabel,
  loadClass,
  dissonanceDetected,
}: {
  autonomicLabel: string;
  autonomicClass: string;
  wellnessLabel: string;
  wellnessClass: string;
  loadLabel: string;
  loadClass: string;
  dissonanceDetected: boolean;
}) {
  return (
    <DrillDownSectionCard>
      <DrillDownSectionLabel>Signaux physiologiques</DrillDownSectionLabel>
      <div className="flex flex-wrap gap-2">
        <SignalChip colorClass={autonomicClass} label={autonomicLabel} />
        <SignalChip colorClass={wellnessClass} label={wellnessLabel} />
        <SignalChip colorClass={loadClass} label={loadLabel} />
      </div>
      {dissonanceDetected && (
        <p className="mt-3 text-sm font-medium text-amber-600">
          Signaux contradictoires — marqueurs objectifs et subjectifs divergent.
        </p>
      )}
    </DrillDownSectionCard>
  );
}
