'use client';

import { format, startOfWeek } from 'date-fns';
import { NotebookText } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { InkEmptyState } from '@/components/ui/ink-empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useWeeklyCoachingBriefViewModel } from '@/hooks/use-data';
import { WeeklyBriefContent } from '@/components/coach/weekly-brief-content';

import { useDisplayMode } from '@/providers/display-mode-provider';

const WEEK_OPTS = { weekStartsOn: 1 as const };

function WeeklyBriefDialogBody({
  showSkeleton,
  showEmptyState,
  showContent,
  vm,
  mode,
}: {
  showSkeleton: boolean;
  showEmptyState: boolean;
  showContent: boolean;
  vm: NonNullable<ReturnType<typeof useWeeklyCoachingBriefViewModel>['data']> | undefined;
  mode: ReturnType<typeof useDisplayMode>['mode'];
}) {
  if (showSkeleton || !vm) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }
  if (showEmptyState && vm.emptyState) {
    return (
      <InkEmptyState
        description={vm.emptyState.description ?? undefined}
        icon={NotebookText}
        title={vm.emptyState.title}
        compact
      />
    );
  }
  if (showContent) {
    return <WeeklyBriefContent mode={mode} vm={vm} />;
  }
  return null;
}

export function WeeklyBrief({ onClose }: { onClose: () => void }) {
  const { mode } = useDisplayMode();
  const weekStart = format(startOfWeek(new Date(), WEEK_OPTS), 'yyyy-MM-dd');
  const { data: vm, isLoading } = useWeeklyCoachingBriefViewModel(weekStart);
  const showSkeleton = isLoading || !vm;
  const showEmptyState = !showSkeleton && vm.emptyState;
  const showContent = !showSkeleton && !vm.emptyState;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-x-hidden overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <NotebookText className="text-primary size-4" />
            Bilan hebdo
          </DialogTitle>
          <DialogDescription>
            {vm ? `${vm.weekStartLabel} - ${vm.weekEndLabel}` : 'Chargement…'}
          </DialogDescription>
        </DialogHeader>

        <WeeklyBriefDialogBody
          mode={mode}
          showContent={showContent}
          showEmptyState={showEmptyState}
          showSkeleton={showSkeleton}
          vm={vm}
        />
      </DialogContent>
    </Dialog>
  );
}
