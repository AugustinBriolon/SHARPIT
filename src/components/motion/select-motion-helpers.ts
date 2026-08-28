import type { Transition } from 'motion/react';
import { EASE_OUT } from '@/lib/ease';

export const SELECT_INSTANT_TRANSITION: Transition = { duration: 0 };

export const SELECT_CHEVRON_TRANSITION: Transition = {
  type: 'spring',
  duration: 0.4,
  bounce: 0.3,
};

export function selectKeyframeTransition(open: boolean, reduce: boolean): Transition {
  if (reduce) {
    return { duration: 0 };
  }
  if (open) {
    return { duration: 0.6, times: [0, 0.4, 1], ease: EASE_OUT };
  }
  return { duration: 0.42, times: [0, 0.5, 1], ease: EASE_OUT };
}

export function selectTriggerBorderKeyframes(open: boolean) {
  return open ? [0, 0, 12] : [12, 0, 12];
}

export function selectTriggerAnimate(isTop: boolean, open: boolean) {
  const kf = selectTriggerBorderKeyframes(open);
  return {
    borderTopLeftRadius: isTop ? kf : 12,
    borderTopRightRadius: isTop ? kf : 12,
    borderBottomLeftRadius: isTop ? 12 : kf,
    borderBottomRightRadius: isTop ? 12 : kf,
  };
}

export function selectTriggerRadiusTransition(isTop: boolean, open: boolean, reduce: boolean) {
  const kfT = selectKeyframeTransition(open, reduce);
  return {
    borderTopLeftRadius: isTop ? kfT : SELECT_INSTANT_TRANSITION,
    borderTopRightRadius: isTop ? kfT : SELECT_INSTANT_TRANSITION,
    borderBottomLeftRadius: isTop ? SELECT_INSTANT_TRANSITION : kfT,
    borderBottomRightRadius: isTop ? SELECT_INSTANT_TRANSITION : kfT,
  };
}

export function selectContentGapTransition(open: boolean): Transition {
  return open
    ? { type: 'spring', duration: 0.6, bounce: 0.5, delay: 0.12 }
    : { type: 'spring', duration: 0.3, bounce: 0.1 };
}

export function selectContentRadiusTransition(open: boolean): Transition {
  return open ? { duration: 0.3, ease: EASE_OUT, delay: 0.14 } : { duration: 0.16, ease: EASE_OUT };
}

export function selectContentNearValues(open: boolean) {
  return { nearGap: open ? 8 : 0, nearRadius: open ? 12 : 0 };
}

function selectContentReduceAnimate(open: boolean, height: number) {
  return { opacity: open ? 1 : 0, height: open ? height : 0 };
}

function selectContentOpacityHeight(open: boolean, height: number) {
  return { opacity: open ? 1 : 0, height: open ? height : 0 };
}

function selectContentMargins(isTop: boolean, nearGap: number) {
  return { marginTop: isTop ? 0 : nearGap, marginBottom: isTop ? nearGap : 0 };
}

function selectContentCornerRadii(isTop: boolean, nearRadius: number) {
  return {
    borderTopLeftRadius: isTop ? 12 : nearRadius,
    borderTopRightRadius: isTop ? 12 : nearRadius,
    borderBottomLeftRadius: isTop ? nearRadius : 12,
    borderBottomRightRadius: isTop ? nearRadius : 12,
  };
}

function selectContentFullAnimate(options: {
  open: boolean;
  height: number;
  isTop: boolean;
  nearGap: number;
  nearRadius: number;
}) {
  const { open, height, isTop, nearGap, nearRadius } = options;
  return {
    ...selectContentOpacityHeight(open, height),
    ...selectContentMargins(isTop, nearGap),
    ...selectContentCornerRadii(isTop, nearRadius),
  };
}

export function selectContentAnimate({
  open,
  reduce,
  height,
  isTop,
  nearGap,
  nearRadius,
}: {
  open: boolean;
  reduce: boolean;
  height: number;
  isTop: boolean;
  nearGap: number;
  nearRadius: number;
}) {
  if (reduce) {
    return selectContentReduceAnimate(open, height);
  }
  return selectContentFullAnimate({ open, height, isTop, nearGap, nearRadius });
}

function selectContentReduceTransition(): Transition {
  return { duration: 0.12 };
}

function selectBorderTransitions(isTop: boolean, gapT: Transition, radiusT: Transition) {
  return {
    marginTop: isTop ? SELECT_INSTANT_TRANSITION : gapT,
    marginBottom: isTop ? gapT : SELECT_INSTANT_TRANSITION,
    borderTopLeftRadius: isTop ? SELECT_INSTANT_TRANSITION : radiusT,
    borderTopRightRadius: isTop ? SELECT_INSTANT_TRANSITION : radiusT,
    borderBottomLeftRadius: isTop ? radiusT : SELECT_INSTANT_TRANSITION,
    borderBottomRightRadius: isTop ? radiusT : SELECT_INSTANT_TRANSITION,
  };
}

function selectContentFullTransition(
  open: boolean,
  isTop: boolean,
  gapT: Transition,
  radiusT: Transition,
): Transition {
  return {
    opacity: open ? { duration: 0.18 } : { duration: 0.16, delay: 0.12 },
    height: open
      ? { type: 'spring', duration: 0.42, bounce: 0.14 }
      : { duration: 0.26, ease: EASE_OUT, delay: 0.14 },
    ...selectBorderTransitions(isTop, gapT, radiusT),
  };
}

export function selectContentPanelTransition({
  open,
  reduce,
  isTop,
  gapT,
  radiusT,
}: {
  open: boolean;
  reduce: boolean;
  isTop: boolean;
  gapT: Transition;
  radiusT: Transition;
}): Transition {
  if (reduce) {
    return selectContentReduceTransition();
  }
  return selectContentFullTransition(open, isTop, gapT, radiusT);
}
