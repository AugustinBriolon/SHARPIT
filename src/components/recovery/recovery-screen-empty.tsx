'use client';

import { HeartPulse } from 'lucide-react';
import { MobileDrillDownHeader } from '@/components/layout/mobile-drill-down-header';
import { InkEmptyState } from '@/components/ui/ink-empty-state';

export function RecoveryScreenEmpty({
  backHref,
  backLabel,
  description,
  title,
}: {
  backHref?: string;
  backLabel?: string;
  description: string;
  title: string;
}) {
  return (
    <div className="space-y-4">
      <MobileDrillDownHeader backHref={backHref} backLabel={backLabel} title="Récupération" />
      <InkEmptyState description={description} icon={HeartPulse} title={title} />
    </div>
  );
}
