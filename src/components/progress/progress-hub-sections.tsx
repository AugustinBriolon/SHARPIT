import Link from 'next/link';
import dynamic from 'next/dynamic';
import { CompositionView } from '@/components/corps/composition/composition-view';
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

/**
 * Performance dedicated content — observed best efforts.
 *
 * Thresholds are not mounted here: one editor, at `/moi/calibration`. Records are
 * what the body produced; a threshold is the ruler it is measured against, and
 * two entry points to one editor is what made calibration hard to find.
 */
export function PerformanceSection() {
  return (
    <div className="space-y-6">
      <RecordsPanel />
      <Link
        className="text-muted-foreground hover:text-foreground inline-block text-sm underline underline-offset-2"
        href="/activite"
      >
        Voir l&apos;historique complet des activités
      </Link>
    </div>
  );
}
