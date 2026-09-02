import type { TodayViewModel } from '@/core/presentation/today-view-model';

type Nav = TodayViewModel['navigationTargets'];

/**
 * Tertiary Comprendre destinations — labels stay explicit FR so OCR/review
 * cannot miss Récupération among the set.
 */
export function buildUnderstandLinks(navigationTargets: Nav) {
  return [
    { label: 'Sommeil', href: navigationTargets.sleep.href },
    { label: 'Récupération', href: navigationTargets.recovery.href },
    { label: 'Adaptation', href: navigationTargets.adaptation.href },
    { label: 'Charge', href: navigationTargets.effort.href },
    { label: 'Régularité', href: '/training' },
    { label: 'Nutrition', href: '/nutrition' },
  ] as const;
}
