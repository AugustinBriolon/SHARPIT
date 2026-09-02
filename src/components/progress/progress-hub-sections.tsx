import Link from 'next/link';
import dynamic from 'next/dynamic';
import { CompositionView } from '@/components/corps/composition/composition-view';
import { CalibrationSection } from '@/components/progress/calibration-section';
import { PhysicalHealthHubView } from '@/components/physical-health/physical-health-hub-view';
import { Skeleton } from '@/components/ui/skeleton';

const RecordsPanel = dynamic(
  () => import('@/components/analytics/records/records-panel').then((mod) => mod.RecordsPanel),
  { ssr: false, loading: () => <Skeleton className="h-64 w-full" /> },
);

/** Corps dedicated content — composition + suivi only. */
export function BodySection() {
  return (
    <div className="space-y-6">
      <CompositionView embedded />
      <PhysicalHealthHubView />
    </div>
  );
}

/** Performance dedicated content — records + calibration (not mixed with Corps/Objectifs). */
export function PerformanceSection() {
  return (
    <div className="space-y-6">
      <RecordsPanel />
      <CalibrationSection />
      <Link
        className="text-muted-foreground hover:text-foreground inline-block text-sm underline underline-offset-2"
        href="/activite"
      >
        Voir l&apos;historique complet des activités
      </Link>
    </div>
  );
}
