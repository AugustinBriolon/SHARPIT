'use client';

import { useReducedMotion } from 'motion/react';
import { type ReactNode } from 'react';
import { PreviewRailFrame, PreviewRailSurface } from '@/components/motion/preview-rail-frame';
import { usePreviewRailState } from '@/components/motion/use-preview-rail';

export interface PreviewRailItem {
  id: string;
  label: string;
  ariaLabel?: string;
  description?: ReactNode;
  href?: string;
  target?: '_blank' | '_self' | '_parent' | '_top';
  rel?: string;
}

function previewRailOverlayClass(isHorizontal: boolean, previewSide: 'before' | 'after'): string {
  if (isHorizontal) {
    return 'top-1/2 left-1/2 h-5 w-fit max-w-full -translate-x-1/2 -translate-y-1/2 justify-center';
  }
  if (previewSide === 'before') {
    return 'inset-y-0 right-16 left-4 content-center';
  }
  return 'inset-y-0 right-4 left-16 content-center';
}

export interface PreviewRailProps {
  items: PreviewRailItem[];
  label?: string;
  orientation?: 'vertical' | 'horizontal';
  activeId?: string;
  defaultActiveId?: string;
  onActiveChange?: (id: string) => void;
  onItemSelect?: (item: PreviewRailItem) => void;
  renderPreview?: (item: PreviewRailItem) => ReactNode;
  showPreview?: boolean;
  previewSide?: 'before' | 'after';
  highlightActive?: boolean;
  itemSize?: number;
  children?: ReactNode;
  className?: string;
  railClassName?: string;
  previewContainerClassName?: string;
  previewClassName?: string;
}

export function PreviewRail({
  items,
  label = 'Section navigation',
  orientation = 'vertical',
  activeId,
  defaultActiveId,
  onActiveChange,
  onItemSelect,
  renderPreview,
  showPreview = true,
  previewSide = 'after',
  highlightActive = false,
  itemSize = 24,
  children,
  className,
  railClassName,
  previewContainerClassName,
  previewClassName,
}: PreviewRailProps) {
  const reduce = Boolean(useReducedMotion());
  const rail = usePreviewRailState({
    items,
    activeId,
    defaultActiveId,
    onActiveChange,
    highlightActive,
  });
  const isHorizontal = orientation === 'horizontal';
  const rowTemplate = items.length ? `repeat(${items.length}, ${itemSize}px)` : undefined;

  return (
    <PreviewRailFrame
      className={className}
      isHorizontal={isHorizontal}
      rootRef={rail.rootRef}
      onBlur={rail.handleRootBlur}
    >
      <PreviewRailSurface
        isHorizontal={isHorizontal}
        items={items}
        itemSize={itemSize}
        label={label}
        overlayClassName={previewRailOverlayClass(isHorizontal, previewSide)}
        previewClassName={previewClassName}
        previewContainerClassName={previewContainerClassName}
        previewSide={previewSide}
        rail={rail}
        railClassName={railClassName}
        reduce={reduce}
        renderPreview={renderPreview}
        rowTemplate={rowTemplate}
        showPreview={showPreview}
        onItemSelect={onItemSelect}
      >
        {children}
      </PreviewRailSurface>
    </PreviewRailFrame>
  );
}
