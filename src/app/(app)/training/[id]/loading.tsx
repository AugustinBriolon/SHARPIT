import { MobileBackLink } from '@/components/layout/mobile-back-link';
import { ActivityDetailRouteSkeleton } from '@/components/training/activity/detail/activity-detail-route-skeleton';

export default function Loading() {
  return (
    <div className="relative z-0 space-y-6 sm:space-y-8">
      <MobileBackLink showOnDesktop />
      <ActivityDetailRouteSkeleton />
    </div>
  );
}
