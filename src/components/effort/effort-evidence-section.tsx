import { DrillDownBulletSection } from '@/components/today/drill-down/bullet-section';

export function EffortEvidenceSection({ lines }: { lines: string[] }) {
  return <DrillDownBulletSection label="Signaux clés" lines={lines} />;
}
