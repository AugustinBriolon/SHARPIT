import { DrillDownBulletSection } from '@/components/today/drill-down/bullet-section';

export function RecoveryEvidenceSection({ lines }: { lines: string[] }) {
  return <DrillDownBulletSection label="Signaux clés" lines={lines} />;
}
