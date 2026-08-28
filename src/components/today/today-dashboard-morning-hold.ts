import type { TodayViewModel } from '@/core/presentation/today-view-model';
import { sessionChoiceLabel } from '@/lib/today/morning-orientation';

function primaryPlannedSessionId(vm: TodayViewModel): string | undefined {
  return vm.actionRow.daySummaryLines.find((l) => l.kind === 'planned')?.id;
}

function holdSessionId(
  vm: TodayViewModel,
  primarySessionId: string | undefined,
): string | undefined {
  return (
    vm.morningOrientation?.confirmEase?.sessionId ??
    vm.morningOrientation?.confirmIncrease?.sessionId ??
    primarySessionId
  );
}

function applyHoldChoiceLabel(
  vm: TodayViewModel,
  sessionId: string | undefined,
  label: string,
): TodayViewModel['actionRow'] {
  return {
    ...vm.actionRow,
    daySummaryLines: vm.actionRow.daySummaryLines.map((line) => {
      if (!sessionId || line.id !== sessionId) {
        return line;
      }
      return { ...line, morningChoiceLabel: label };
    }),
  };
}

export function withClientMorningHold(vm: TodayViewModel, holdActive: boolean): TodayViewModel {
  if (!holdActive) {
    return vm;
  }
  if (!vm.morningOrientation || vm.morningOrientation.phase === 'POST_CHOICE') {
    return vm;
  }

  const label = sessionChoiceLabel('HOLD');
  const sessionId = holdSessionId(vm, primaryPlannedSessionId(vm));

  return {
    ...vm,
    morningOrientation: {
      ...vm.morningOrientation,
      phase: 'POST_CHOICE',
      evidenceLine: null,
      showRefreshEvidence: false,
      showFirmActions: false,
      hideHeroConfidence: true,
      heroHeadline: null,
      heroSubline: null,
      confirmEase: null,
      confirmIncrease: null,
      holdDecisionId: null,
      sessionChoice: sessionId ? { sessionId, kind: 'HOLD', label } : null,
    },
    actionRow: applyHoldChoiceLabel(vm, sessionId, label),
  };
}
