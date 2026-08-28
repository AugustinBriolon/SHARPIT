import type { RulerBar } from '@/lib/training/thread/load-ruler';

export function buildRulerSliderA11y({
  interactive,
  bars,
  activeIndex,
  activeBar,
}: {
  interactive: boolean;
  bars: readonly RulerBar[];
  activeIndex: number;
  activeBar: RulerBar | undefined;
}) {
  if (!interactive) {
    return {};
  }
  return {
    'aria-label': 'Semaine lue dans le fil',
    'aria-valuemax': bars.length - 1,
    'aria-valuemin': 0,
    'aria-valuenow': activeIndex,
    'aria-valuetext': activeBar?.label,
    role: 'slider' as const,
    tabIndex: 0,
  };
}
