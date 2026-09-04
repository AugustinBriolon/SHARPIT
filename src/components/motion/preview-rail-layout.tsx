'use client';

import type { ReactNode } from 'react';
import { PreviewRailNavItem, PreviewRailPreviewCell } from '@/components/motion/preview-rail-parts';
import type { usePreviewRailState } from '@/components/motion/use-preview-rail';
import { cn } from '@/lib/utils';
import type { PreviewRailItem } from './preview-rail';

export function PreviewRailNav({
  items,
  label,
  isHorizontal,
  rowTemplate,
  railClassName,
  rail,
  itemSize,
  reduce,
  onItemSelect,
}: {
  items: PreviewRailItem[];
  label: string;
  isHorizontal: boolean;
  rowTemplate: string | undefined;
  railClassName?: string;
  rail: ReturnType<typeof usePreviewRailState>;
  itemSize: number;
  reduce: boolean;
  onItemSelect?: (item: PreviewRailItem) => void;
}) {
  return (
    <nav
      aria-label={label}
      className={cn(
        'relative z-10 grid shrink-0',
        isHorizontal ? 'h-12 w-fit max-w-full justify-center self-center' : 'w-12 content-center',
        railClassName,
      )}
      style={
        isHorizontal ? { gridTemplateColumns: rowTemplate } : { gridTemplateRows: rowTemplate }
      }
      onPointerLeave={(event) => {
        if (rail.hover.leave(event)) {
          rail.setHoveredId(null);
        }
      }}
    >
      {items.map((item, index) => (
        <PreviewRailNavItem
          key={item.id}
          displayedIndex={rail.displayedIndex}
          highlighted={item.id === rail.highlightedId}
          hover={rail.hover}
          index={index}
          isHorizontal={isHorizontal}
          item={item}
          itemSize={itemSize}
          pinned={rail.pinnedId === item.id}
          reduce={reduce}
          selected={item.id === rail.selectedId}
          tap={rail.tap}
          onFocus={rail.setFocusedId}
          onHover={rail.setHoveredId}
          onItemSelect={onItemSelect}
          onPin={rail.setPinnedId}
          onSelect={rail.selectItem}
        />
      ))}
    </nav>
  );
}

export function PreviewRailPreviewOverlay({
  items,
  isHorizontal,
  rowTemplate,
  previewContainerClassName,
  overlayClassName,
  rail,
  itemSize,
  previewSide,
  previewClassName,
  reduce,
  renderPreview,
}: {
  items: PreviewRailItem[];
  isHorizontal: boolean;
  rowTemplate: string | undefined;
  previewContainerClassName?: string;
  overlayClassName: string;
  rail: ReturnType<typeof usePreviewRailState>;
  itemSize: number;
  previewSide: 'before' | 'after';
  previewClassName?: string;
  reduce: boolean;
  renderPreview?: (item: PreviewRailItem) => ReactNode;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute z-50 grid',
        overlayClassName,
        previewContainerClassName,
      )}
      style={
        isHorizontal ? { gridTemplateColumns: rowTemplate } : { gridTemplateRows: rowTemplate }
      }
    >
      {items.map((item) => (
        <PreviewRailPreviewCell
          key={item.id}
          displayedId={rail.displayedId}
          isHorizontal={isHorizontal}
          item={item}
          itemSize={itemSize}
          previewClassName={previewClassName}
          previewSide={previewSide}
          reduce={reduce}
          renderPreview={renderPreview}
          uid={rail.uid}
        />
      ))}
    </div>
  );
}
