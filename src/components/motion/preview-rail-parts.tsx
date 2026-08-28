'use client';

import type { MouseEvent, PointerEvent, ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { EASE_OUT, SPRING_LAYOUT } from '@/lib/ease';
import type { useHoverGesture } from '@/lib/hooks/use-hover-gesture';
import type { useTapGesture } from '@/lib/hooks/use-tap-gesture';
import { cn } from '@/lib/utils';
import { DefaultPreview } from './preview-rail-default';
import {
  handlePreviewRailSelect,
  previewRailLinkRel,
  previewRailPointerEnter,
} from './preview-rail-helpers';
import { previewRailCardMotion } from './preview-rail-motion';
import type { PreviewRailItem } from './preview-rail';

function previewRailItemScale(highlighted: boolean, distance: number): number {
  if (highlighted) {
    return 1;
  }
  if (distance === 1) {
    return 0.68;
  }
  if (distance === 2) {
    return 0.44;
  }
  return 0.25;
}

function PreviewRailTick({
  highlighted,
  scale,
  isHorizontal,
  reduce,
}: {
  highlighted: boolean;
  scale: number;
  isHorizontal: boolean;
  reduce: boolean;
}) {
  return (
    <motion.span
      animate={isHorizontal ? { scaleY: scale } : { scaleX: scale }}
      aria-hidden="true"
      data-slot="preview-rail-tick"
      transition={reduce ? { duration: 0 } : SPRING_LAYOUT}
      className={cn(
        'block bg-current',
        isHorizontal ? 'h-12 w-0.5 origin-bottom' : 'h-0.5 w-12 origin-left',
        highlighted ? 'text-foreground' : undefined,
      )}
    />
  );
}

function PreviewRailNavControl({
  item,
  selected,
  sharedClassName,
  sharedStyle,
  itemContent,
  handlers,
}: {
  item: PreviewRailItem;
  selected: boolean;
  sharedClassName: string;
  sharedStyle: { width: number } | { height: number };
  itemContent: ReactNode;
  handlers: Record<string, unknown>;
}) {
  if (item.href) {
    return (
      <a
        aria-current={selected ? 'page' : undefined}
        aria-label={item.ariaLabel ?? item.label}
        className={sharedClassName}
        data-slot="preview-rail-item"
        href={item.href}
        rel={previewRailLinkRel(item)}
        style={sharedStyle}
        target={item.target}
        {...handlers}
      >
        {itemContent}
      </a>
    );
  }

  return (
    <button
      aria-current={selected ? 'location' : undefined}
      aria-label={item.ariaLabel ?? item.label}
      className={sharedClassName}
      data-slot="preview-rail-item"
      style={sharedStyle}
      type="button"
      {...handlers}
    >
      {itemContent}
    </button>
  );
}

export function PreviewRailNavItem({
  item,
  index,
  selected,
  highlighted,
  displayedIndex,
  isHorizontal,
  itemSize,
  reduce,
  pinned,
  tap,
  hover,
  onHover,
  onPin,
  onFocus,
  onSelect,
  onItemSelect,
}: {
  item: PreviewRailItem;
  index: number;
  selected: boolean;
  highlighted: boolean;
  displayedIndex: number;
  isHorizontal: boolean;
  itemSize: number;
  reduce: boolean;
  pinned: boolean;
  tap: ReturnType<typeof useTapGesture<boolean>>;
  hover: ReturnType<typeof useHoverGesture>;
  onHover: (id: string | null) => void;
  onPin: (id: string | null) => void;
  onFocus: (id: string | null) => void;
  onSelect: (id: string) => void;
  onItemSelect?: (item: PreviewRailItem) => void;
}) {
  const distance = displayedIndex < 0 ? Number.POSITIVE_INFINITY : Math.abs(index - displayedIndex);
  const scale = previewRailItemScale(highlighted, distance);
  const sharedClassName = cn(
    'relative flex text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
    isHorizontal ? 'h-12 w-6 items-end justify-center' : 'h-6 w-12 items-center',
  );
  const sharedStyle = isHorizontal ? { width: itemSize } : { height: itemSize };
  const dropGesture = () => tap.drop();

  const handlers = {
    onClick: (event: MouseEvent<HTMLElement>) =>
      handlePreviewRailSelect({
        event,
        item,
        tap,
        onPin: (id) => onPin(id),
        onSelect,
        onItemSelect,
      }),
    onFocus: (event: React.FocusEvent<HTMLElement>) => {
      if (event.currentTarget.matches(':focus-visible')) {
        onFocus(item.id);
      }
    },
    onKeyDown: dropGesture,
    onPointerCancel: dropGesture,
    onPointerDown: (event: PointerEvent<HTMLElement>) => {
      tap.start(event, pinned);
      onFocus(null);
    },
    onPointerEnter: (event: PointerEvent<HTMLElement>) =>
      previewRailPointerEnter(event, item.id, hover.enter, onHover),
  };

  return (
    <PreviewRailNavControl
      handlers={handlers}
      item={item}
      selected={selected}
      sharedClassName={sharedClassName}
      sharedStyle={sharedStyle}
      itemContent={
        <PreviewRailTick
          highlighted={highlighted}
          isHorizontal={isHorizontal}
          reduce={reduce}
          scale={scale}
        />
      }
    />
  );
}

function PreviewRailActiveCard({
  item,
  isHorizontal,
  previewSide,
  previewClassName,
  uid,
  reduce,
  renderPreview,
}: {
  item: PreviewRailItem;
  isHorizontal: boolean;
  previewSide: 'before' | 'after';
  previewClassName?: string;
  uid: string;
  reduce: boolean;
  renderPreview?: (item: PreviewRailItem) => ReactNode;
}) {
  return (
    <div
      className={cn(
        isHorizontal
          ? 'absolute bottom-12 left-1/2 w-72 -translate-x-1/2'
          : cn('w-full max-w-sm', previewSide === 'before' && 'ml-auto'),
        previewClassName,
      )}
    >
      <motion.div
        layoutId={`preview-rail-card-${uid}`}
        transition={reduce ? { duration: 0 } : SPRING_LAYOUT}
      >
        <AnimatePresence initial={false} mode="wait">
          <motion.div key={item.id} {...previewRailCardMotion(reduce)}>
            {renderPreview ? renderPreview(item) : <DefaultPreview item={item} />}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

export function PreviewRailPreviewCell({
  item,
  displayedId,
  isHorizontal,
  itemSize,
  previewSide,
  previewClassName,
  uid,
  reduce,
  renderPreview,
}: {
  item: PreviewRailItem;
  displayedId: string;
  isHorizontal: boolean;
  itemSize: number;
  previewSide: 'before' | 'after';
  previewClassName?: string;
  uid: string;
  reduce: boolean;
  renderPreview?: (item: PreviewRailItem) => ReactNode;
}) {
  return (
    <div
      className={cn('relative flex items-center', isHorizontal ? 'justify-center' : undefined)}
      style={isHorizontal ? { width: itemSize } : { height: itemSize }}
    >
      {item.id === displayedId ? (
        <PreviewRailActiveCard
          isHorizontal={isHorizontal}
          item={item}
          previewClassName={previewClassName}
          previewSide={previewSide}
          reduce={reduce}
          renderPreview={renderPreview}
          uid={uid}
        />
      ) : null}
    </div>
  );
}
