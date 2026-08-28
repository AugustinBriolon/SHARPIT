'use client';

import { motion } from 'motion/react';
import { type ReactNode } from 'react';
import { PreviewRailNav, PreviewRailPreviewOverlay } from '@/components/motion/preview-rail-layout';
import type { usePreviewRailState } from '@/components/motion/use-preview-rail';
import { cn } from '@/lib/utils';
import type { PreviewRailItem } from './preview-rail';

export function PreviewRailFrame({
  isHorizontal,
  className,
  rootRef,
  onBlur,
  children,
}: {
  isHorizontal: boolean;
  className?: string;
  rootRef: ReturnType<typeof usePreviewRailState>['rootRef'];
  onBlur: (relatedTarget: EventTarget | null, currentTarget: Node) => void;
  children: ReactNode;
}) {
  return (
    <motion.div
      ref={rootRef}
      className={cn(
        'relative isolate flex w-full overflow-visible',
        isHorizontal ? 'min-h-64 flex-col items-center justify-center' : 'min-h-80',
        className,
      )}
      layoutRoot
      onBlur={(event) => onBlur(event.relatedTarget, event.currentTarget)}
    >
      {children}
    </motion.div>
  );
}

export function PreviewRailSurface({
  items,
  label,
  isHorizontal,
  rowTemplate,
  railClassName,
  rail,
  itemSize,
  reduce,
  showPreview,
  previewSide,
  previewContainerClassName,
  previewClassName,
  overlayClassName,
  onItemSelect,
  renderPreview,
  children,
}: {
  items: PreviewRailItem[];
  label: string;
  isHorizontal: boolean;
  rowTemplate: string | undefined;
  railClassName?: string;
  rail: ReturnType<typeof usePreviewRailState>;
  itemSize: number;
  reduce: boolean;
  showPreview: boolean;
  previewSide: 'before' | 'after';
  previewContainerClassName?: string;
  previewClassName?: string;
  overlayClassName: string;
  onItemSelect?: (item: PreviewRailItem) => void;
  renderPreview?: (item: PreviewRailItem) => ReactNode;
  children?: ReactNode;
}) {
  return (
    <>
      <PreviewRailNav
        isHorizontal={isHorizontal}
        items={items}
        itemSize={itemSize}
        label={label}
        rail={rail}
        railClassName={railClassName}
        reduce={reduce}
        rowTemplate={rowTemplate}
        onItemSelect={onItemSelect}
      />

      {showPreview ? (
        <PreviewRailPreviewOverlay
          isHorizontal={isHorizontal}
          items={items}
          itemSize={itemSize}
          overlayClassName={overlayClassName}
          previewClassName={previewClassName}
          previewContainerClassName={previewContainerClassName}
          previewSide={previewSide}
          rail={rail}
          reduce={reduce}
          renderPreview={renderPreview}
          rowTemplate={rowTemplate}
        />
      ) : null}

      {children ? <div className="min-h-0 min-w-0 flex-1">{children}</div> : null}
    </>
  );
}
