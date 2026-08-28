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

export const SECTIONS = [
  { id: 'goals', label: 'Objectifs' },
  { id: 'performance', label: 'Performance' },
  { id: 'body', label: 'Corps & santé' },
] as const;

export type SectionId = (typeof SECTIONS)[number]['id'];

export function isSectionId(value: string | null): value is SectionId {
  return SECTIONS.some((section) => section.id === value);
}

export function BodySection() {
  return (
    <div className="space-y-6">
      <CompositionView embedded />
      <PhysicalHealthHubView />
    </div>
  );
}

export function PerformanceSection() {
  return (
    <div className="space-y-6">
      <RecordsPanel />
      <CalibrationSection />
      <Link
        className="text-muted-foreground hover:text-foreground inline-block text-sm underline underline-offset-2"
        href="/training/history"
      >
        Voir l'historique complet des activités
      </Link>
    </div>
  );
}
