'use client';

import { usePathname } from 'next/navigation';
import { Suspense } from 'react';
import { ActivityDetailSkeleton } from '@/components/training/activity/detail/activity-detail-skeleton';
import { MobileBackLink } from '@/components/layout/mobile-back-link';
import { ActivityDetailInstantShell } from '@/components/training/activity/detail/activity-detail-instant-shell';

function parseActivityIdFromPathname(pathname: string): string | null {
  const match = pathname.match(/^\/training\/([^/]+)(?:\/|$)/);
  const segment = match?.[1];
  if (!segment || segment === 'edit') {
    return null;
  }
  return segment;
}

function ActivityDetailInstantShellFromPath({ includeBackLink }: { includeBackLink?: boolean }) {
  const pathname = usePathname();
  const activityId = parseActivityIdFromPathname(pathname);
  return (
    <ActivityDetailInstantShell
      activityId={activityId ?? undefined}
      includeBackLink={includeBackLink}
    />
  );
}

/** Route loading — pathname id streams inside Suspense (no useParams). */
export default function ActivityDetailLoading() {
  return (
    <Suspense
      fallback={
        <div
          aria-busy="true"
          aria-label="Chargement"
          className="relative z-0 space-y-6 sm:space-y-8"
        >
          <MobileBackLink showOnDesktop />
          <ActivityDetailSkeleton layout="map" />
        </div>
      }
    >
      <ActivityDetailInstantShellFromPath includeBackLink />
    </Suspense>
  );
}
