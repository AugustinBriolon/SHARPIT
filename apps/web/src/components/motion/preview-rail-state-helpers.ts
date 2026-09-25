import type { PreviewRailItem } from './preview-rail';

export function previewRailSelectedId(items: PreviewRailItem[], requestedActiveId: string): string {
  const match = items.some((item) => item.id === requestedActiveId);
  if (match) {
    return requestedActiveId;
  }
  return items[0]?.id ?? '';
}

export function previewRailHighlightedId(
  displayedId: string,
  highlightActive: boolean,
  selectedId: string,
): string {
  if (displayedId) {
    return displayedId;
  }
  if (highlightActive) {
    return selectedId;
  }
  return '';
}
