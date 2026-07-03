'use client';

import { DashboardSkeleton, InsufficientDataState } from './dashboard/today-dashboard-states';
import { useTodayDashboardViewModel } from './dashboard/use-today-dashboard-view-model';
import { TodayDashboardDesktop } from './today-dashboard-desktop';
import { TodayDashboardMobile } from './today-dashboard-mobile';
import { useIsMobile } from '@/hooks/use-viewport';

export function TodayDashboard() {
  const vm = useTodayDashboardViewModel();
  const isMobile = useIsMobile();

  if (vm.loading) return <DashboardSkeleton />;
  if (!vm.ready) return <InsufficientDataState onRetry={vm.refresh} />;

  return isMobile ? <TodayDashboardMobile vm={vm} /> : <TodayDashboardDesktop vm={vm} />;
}
