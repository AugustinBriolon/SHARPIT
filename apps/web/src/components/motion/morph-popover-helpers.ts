import { EASE_OUT, SPRING_PANEL } from '@/lib/ease';
import type { Align, Side } from '@/components/motion/popover-morph-types';

export function resolveMorphPopoverPosition({
  layout,
  side,
  align,
  sideOffset,
}: {
  layout: {
    trigger: { left: number; top: number; width: number; height: number };
    content: { width: number; height: number };
  } | null;
  side: Side;
  align: Align;
  sideOffset: number;
}) {
  if (!layout) {
    return { left: 0, top: 0, visible: false };
  }
  const {
    trigger: { left: triggerLeft, top: triggerTop, width: triggerWidth, height: triggerHeight },
    content: { width: contentWidth, height: contentHeight },
  } = layout;
  const left = align === 'end' ? triggerLeft + triggerWidth - contentWidth : triggerLeft;
  const top =
    side === 'bottom'
      ? triggerTop + triggerHeight + sideOffset
      : triggerTop - contentHeight - sideOffset;
  return { left, top, visible: true };
}

export function morphPopoverOrigin(side: Side, align: Align) {
  return `${side === 'bottom' ? 'top' : 'bottom'} ${align === 'end' ? 'right' : 'left'}`;
}

export function morphClipHidden(side: Side, align: Align, radius: number) {
  const top = side === 'bottom' ? '0%' : '92%';
  const bottom = side === 'bottom' ? '92%' : '0%';
  const right = align === 'end' ? '0%' : '92%';
  const left = align === 'end' ? '92%' : '0%';
  return `inset(${top} ${right} ${bottom} ${left} round ${radius}px)`;
}

export const MORPH_CLIP_SHOWN = (radius: number) => `inset(0% 0% 0% 0% round ${radius}px)`;

export const MORPH_CLIP_TRANSITION = { duration: 0.32, ease: EASE_OUT } as const;

export function buildMorphPortalVariants(
  reduce: boolean,
  side: Side,
  align: Align,
  radius: number,
) {
  const wrap = reduce
    ? undefined
    : {
        hidden: { opacity: 0, scale: 0.96, transition: SPRING_PANEL },
        show: { opacity: 1, scale: 1, transition: SPRING_PANEL },
      };
  const clip = reduce
    ? undefined
    : {
        hidden: {
          clipPath: morphClipHidden(side, align, radius),
          transition: MORPH_CLIP_TRANSITION,
        },
        show: { clipPath: MORPH_CLIP_SHOWN(radius), transition: MORPH_CLIP_TRANSITION },
      };
  return { wrap, clip };
}
