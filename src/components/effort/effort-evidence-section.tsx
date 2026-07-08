import { DrillDownBulletSection } from '@/components/today/drill-down/bullet-section';

export function EffortEvidenceSection({ lines }: { lines: string[] }) {
  return <DrillDownBulletSection label="Pourquoi ce cout compte" lines={lines} />;
}
