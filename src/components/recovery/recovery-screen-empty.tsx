'use client';

import { HeartPulse } from 'lucide-react';
import { ConnectSourceCta } from '@/components/integrations/connect-source-cta';
import { MobileDrillDownHeader } from '@/components/layout/header/mobile-drill-down-header';
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
      <InkEmptyState
        action={<ConnectSourceCta />}
        description={description}
        icon={HeartPulse}
        title={title}
      />
    </div>
  );
}
