import type { MouseEvent, PointerEvent } from 'react';
import type { useTapGesture } from '@/lib/hooks/use-tap-gesture';
import type { PreviewRailItem } from './preview-rail';

export function handlePreviewRailSelect(options: {
  event: MouseEvent<HTMLElement>;
  item: PreviewRailItem;
  tap: ReturnType<typeof useTapGesture<boolean>>;
  onPin: (id: string) => void;
  onSelect: (id: string) => void;
  onItemSelect?: (item: PreviewRailItem) => void;
}): void {
  const gesture = options.tap.take();
  const tapped = gesture !== null && gesture.pointerType !== 'mouse';

  if (tapped) {
    if (options.item.href && !gesture.state) {
      options.event.preventDefault();
      options.onPin(options.item.id);
      return;
    }
    options.onPin(options.item.id);
  }

  options.onSelect(options.item.id);
  options.onItemSelect?.(options.item);
}

export function previewRailLinkRel(item: PreviewRailItem): string | undefined {
  if (item.rel) {
    return item.rel;
  }
  if (item.target === '_blank') {
    return 'noreferrer noopener';
  }
  return undefined;
}

export function previewRailPointerEnter(
  event: PointerEvent<HTMLElement>,
  itemId: string,
  hoverEnter: (event: PointerEvent<HTMLElement>) => boolean,
  onHover: (id: string) => void,
): void {
  if (hoverEnter(event)) {
    onHover(itemId);
  }
}
