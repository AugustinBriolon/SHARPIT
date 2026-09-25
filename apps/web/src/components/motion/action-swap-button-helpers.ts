import type { MouseEvent } from 'react';
import type { ActionSwapItem } from './action-swap';

export function handleActionSwapClick(options: {
  event: MouseEvent<HTMLButtonElement>;
  disabled?: boolean;
  cycle: boolean;
  nextItem?: ActionSwapItem;
  value: string | undefined;
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  onValueChange?: (value: string, item: ActionSwapItem) => void;
  setInternalValue: (id: string) => void;
}): void {
  options.onClick?.(options.event);
  if (options.event.defaultPrevented || options.disabled || !options.cycle || !options.nextItem) {
    return;
  }
  if (options.value === undefined) {
    options.setInternalValue(options.nextItem.id);
  }
  options.onValueChange?.(options.nextItem.id, options.nextItem);
}

export function resolveActionSwapActiveItem(
  items: ActionSwapItem[],
  currentValue: string | undefined,
): { activeItem: ActionSwapItem | undefined; activeIndex: number; nextItem?: ActionSwapItem } {
  const activeIndex = Math.max(
    0,
    items.findIndex((item) => item.id === currentValue),
  );
  const activeItem = items[activeIndex] ?? items[0];
  const nextItem = items.length > 0 ? items[(activeIndex + 1) % items.length] : undefined;
  return { activeItem, activeIndex, nextItem };
}

export function actionSwapAccessibleLabel(
  activeItem: ActionSwapItem,
  iconOnly: boolean,
): string | undefined {
  if (activeItem.ariaLabel) {
    return activeItem.ariaLabel;
  }
  if (iconOnly && typeof activeItem.label === 'string') {
    return activeItem.label;
  }
  return undefined;
}
