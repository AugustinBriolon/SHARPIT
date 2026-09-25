import type { PreviewRailItem } from '@/components/motion/preview-rail';

const PREVIEW_TITLE_LENGTH = 56;
const PREVIEW_DESCRIPTION_LENGTH = 88;

export function truncateMessageText(text: string, limit: number) {
  if (text.length <= limit) {
    return text;
  }
  const excerpt = text.slice(0, limit);
  const boundary = excerpt.lastIndexOf(' ');
  return `${excerpt.slice(0, boundary > limit * 0.65 ? boundary : limit).trim()}…`;
}

export function getMessageText(message: HTMLElement) {
  const surface =
    message.querySelector<HTMLElement>('[data-slot="message-bubble-content"]') ??
    message.querySelector<HTMLElement>('[data-slot="message-content"]') ??
    message;
  return (surface.textContent ?? '').replace(/\s+/g, ' ').trim();
}

export function getMessagePreview(message: HTMLElement, assistantResponse?: HTMLElement) {
  const text = getMessageText(message);
  if (!text) {
    return { label: 'Message', description: undefined };
  }

  if (text.length <= PREVIEW_TITLE_LENGTH) {
    const responseText = assistantResponse ? getMessageText(assistantResponse) : '';
    return {
      label: text,
      description: responseText
        ? truncateMessageText(responseText, PREVIEW_DESCRIPTION_LENGTH)
        : undefined,
    };
  }

  const titleExcerpt = text.slice(0, PREVIEW_TITLE_LENGTH);
  const titleBoundary = titleExcerpt.lastIndexOf(' ');
  const titleEnd =
    titleBoundary > PREVIEW_TITLE_LENGTH * 0.65 ? titleBoundary : PREVIEW_TITLE_LENGTH;
  const label = `${text.slice(0, titleEnd).trim()}…`;
  const responseText = assistantResponse
    ? getMessageText(assistantResponse)
    : text.slice(titleEnd).trim();
  return {
    label,
    description: responseText
      ? truncateMessageText(responseText, PREVIEW_DESCRIPTION_LENGTH)
      : undefined,
  };
}

export function findNearestRailId(targets: [string, HTMLElement][], viewportRect: DOMRect): string {
  const viewportCenter = viewportRect.top + viewportRect.height / 2;
  let nearestId = targets[0]?.[0] ?? '';
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const [id, element] of targets) {
    const rect = element.getBoundingClientRect();
    const messageCenter = rect.top + rect.height / 2;
    const distance = Math.abs(messageCenter - viewportCenter);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestId = id;
    }
  }

  return nearestId;
}

export function resolveActiveRailId(
  viewport: HTMLElement,
  targets: [string, HTMLElement][],
  followThreshold: number,
): string {
  if (targets.length === 0) {
    return '';
  }

  if (viewport.scrollTop <= followThreshold) {
    return targets[0]?.[0] ?? '';
  }

  const distanceFromEnd = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
  if (distanceFromEnd <= followThreshold) {
    return targets.at(-1)?.[0] ?? '';
  }

  return findNearestRailId(targets, viewport.getBoundingClientRect());
}

export function buildRailItems(
  messages: HTMLElement[],
  railIdRef: WeakMap<HTMLElement, string>,
  railIdCounterRef: { current: number },
): { items: PreviewRailItem[]; targets: Map<string, HTMLElement> } {
  const targets = new Map<string, HTMLElement>();
  const items = messages.map((message, index) => {
    let id = railIdRef.get(message);
    if (!id) {
      railIdCounterRef.current += 1;
      id = `message-rail-${railIdCounterRef.current}`;
      railIdRef.set(message, id);
    }
    targets.set(id, message);
    const sender = message.dataset.from ?? 'conversation';
    const assistantResponse =
      sender === 'user'
        ? messages.slice(index + 1).find((candidate) => candidate.dataset.from === 'assistant')
        : undefined;
    const preview = getMessagePreview(message, assistantResponse);

    return {
      id,
      label: preview.label,
      description: preview.description,
      ariaLabel: `Go to ${sender} message ${index + 1} of ${messages.length}`,
    };
  });

  return { items, targets };
}

export function railItemsUnchanged(current: PreviewRailItem[], next: PreviewRailItem[]) {
  return (
    current.length === next.length &&
    current.every(
      (item, index) =>
        item.id === next[index]?.id &&
        item.label === next[index]?.label &&
        item.description === next[index]?.description &&
        item.ariaLabel === next[index]?.ariaLabel,
    )
  );
}

export function scrollBehaviorFor(reduce: boolean, smooth: boolean): ScrollBehavior {
  return reduce || !smooth ? 'auto' : 'smooth';
}

export function scrollElementTo(options: {
  viewport: HTMLElement;
  top: number;
  behavior: ScrollBehavior;
  onProgrammaticEnd: () => void;
  scrollTimerRef: { current: number | undefined };
}) {
  const { viewport, top, behavior, onProgrammaticEnd, scrollTimerRef } = options;
  if (typeof viewport.scrollTo === 'function') {
    viewport.scrollTo({ top, behavior });
  } else {
    viewport.scrollTop = top;
  }
  if (scrollTimerRef.current) {
    window.clearTimeout(scrollTimerRef.current);
  }
  scrollTimerRef.current = window.setTimeout(onProgrammaticEnd, behavior === 'smooth' ? 320 : 0);
}

export function scrollToRailTarget(options: {
  viewport: HTMLElement;
  target: HTMLElement;
  reduce: boolean;
  smooth: boolean;
  scrollTimerRef: { current: number | undefined };
  onProgrammaticEnd: () => void;
}) {
  const { viewport, target, reduce, smooth, scrollTimerRef, onProgrammaticEnd } = options;
  const viewportRect = viewport.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  const top =
    viewport.scrollTop +
    targetRect.top -
    viewportRect.top -
    (viewport.clientHeight - targetRect.height) / 2;
  const behavior = scrollBehaviorFor(reduce, smooth);
  scrollElementTo({
    viewport,
    top,
    behavior,
    onProgrammaticEnd,
    scrollTimerRef,
  });
}
