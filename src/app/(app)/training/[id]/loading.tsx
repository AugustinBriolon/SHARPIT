'use client';

import { usePathname } from 'next/navigation';
import { Suspense } from 'react';
import { ActivityDetailSkeleton } from '@/components/training/activity/detail/activity-detail-skeleton';
import { ActivityDetailInstantShell } from '@/components/training/activity/detail/activity-detail-instant-shell';

function parseActivityIdFromPathname(pathname: string): string | null {
  const match = pathname.match(/^\/training\/([^/]+)(?:\/|$)/);
  const segment = match?.[1];
  if (!segment || segment === 'edit') {
    return null;
  }
  return segment;
}

function ActivityDetailInstantShellFromPath() {
  const pathname = usePathname();
  const activityId = parseActivityIdFromPathname(pathname);
  return <ActivityDetailInstantShell activityId={activityId ?? undefined} />;
}

/** Route loading — pathname id streams inside Suspense (no useParams). */
export default function ActivityDetailLoading() {
  return (
    <Suspense
      fallback={
        <div
          aria-busy="true"
          aria-label="Chargement"
          className="relative z-0 space-y-4 sm:space-y-6"
        >
          <ActivityDetailSkeleton layout="map" />
        </div>
      }
    >
      <ActivityDetailInstantShellFromPath />
    </Suspense>
  );
}
