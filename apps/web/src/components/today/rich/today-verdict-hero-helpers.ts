import type { TodayViewModel } from '@/core/presentation/today-view-model';

function contextLabelFromHero(hero: TodayViewModel['hero']): string {
  return hero.postureLabel?.trim() || 'Ce matin';
}

function secondaryFromHero(hero: TodayViewModel['hero']): {
  secondaryLine: string | null;
  secondaryMuted: boolean;
} {
  const priority = hero.focusPriority ?? hero.actionLine;
  return {
    secondaryLine: priority ?? hero.subline ?? null,
    secondaryMuted: !priority && Boolean(hero.subline),
  };
}

function limiterCauseFromHero(hero: TodayViewModel['hero']): string | null {
  return hero.twinTrustStrip.limitingCauseText?.trim() || null;
}

export function deriveVerdictHeroDisplay(hero: TodayViewModel['hero']) {
  const { secondaryLine, secondaryMuted } = secondaryFromHero(hero);
  return {
    contextLabel: contextLabelFromHero(hero),
    secondaryLine,
    secondaryMuted,
    limiterCause: limiterCauseFromHero(hero),
  };
}
