import type { TodayViewModel } from '@/core/presentation/today-view-model';

type Nav = TodayViewModel['navigationTargets'];

export function buildUnderstandLinks(navigationTargets: Nav) {
  return [
    navigationTargets.sleep,
    navigationTargets.recovery,
    navigationTargets.adaptation,
    { label: 'Charge', href: navigationTargets.effort.href },
    { label: 'Régularité', href: '/training' },
    { label: 'Nutrition', href: '/nutrition' },
  ];
}
