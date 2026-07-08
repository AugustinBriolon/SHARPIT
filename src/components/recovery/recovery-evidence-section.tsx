import { DrillDownBulletSection } from '@/components/today/drill-down/bullet-section';

export function RecoveryEvidenceSection({ lines }: { lines: string[] }) {
  return <DrillDownBulletSection label="Pourquoi SHARPIT penche dans ce sens" lines={lines} />;
}
