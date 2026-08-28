import type { KeyboardEvent, RefObject } from 'react';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

function focusLastElement(last: HTMLElement) {
  last.focus();
}

function focusFirstElement(first: HTMLElement) {
  first.focus();
}

function getFocusableElements(panelRef: RefObject<HTMLDivElement | null>) {
  if (!panelRef.current) {
    return [];
  }
  return Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
}

function wrapTabFocus(event: KeyboardEvent<HTMLDivElement>, first: HTMLElement, last: HTMLElement) {
  event.preventDefault();
  if (event.shiftKey) {
    focusLastElement(last);
    return;
  }
  focusFirstElement(first);
}

function trapTabFocus(
  event: KeyboardEvent<HTMLDivElement>,
  panelRef: RefObject<HTMLDivElement | null>,
) {
  const focusable = getFocusableElements(panelRef);

  if (focusable.length === 0) {
    event.preventDefault();
    panelRef.current?.focus();
    return;
  }

  const [first] = focusable;
  const last = focusable.at(-1);
  if (!last) {
    return;
  }

  const atFirst = document.activeElement === first;
  const atLast = document.activeElement === last;
  const shouldWrap = (event.shiftKey && atFirst) || (!event.shiftKey && atLast);
  if (shouldWrap) {
    wrapTabFocus(event, first, last);
  }
}

export function handleMobilePanelKeyDown(
  event: KeyboardEvent<HTMLDivElement>,
  panelRef: RefObject<HTMLDivElement | null>,
  close: () => void,
) {
  if (event.key === 'Escape') {
    event.preventDefault();
    close();
    return;
  }

  if (event.key !== 'Tab') {
    return;
  }
  trapTabFocus(event, panelRef);
}

export function lockBodyScrollWhileOpen(
  open: boolean,
  panelRef: RefObject<HTMLDivElement | null>,
  onClose?: () => void,
) {
  if (!open) {
    return;
  }

  const { body } = document;
  const { scrollY } = window;
  const previousBodyStyles = {
    left: body.style.left,
    overflow: body.style.overflow,
    position: body.style.position,
    right: body.style.right,
    top: body.style.top,
  };

  body.style.position = 'fixed';
  body.style.top = `-${scrollY}px`;
  body.style.left = '0';
  body.style.right = '0';
  body.style.overflow = 'hidden';

  const focusFrame = requestAnimationFrame(() => {
    const firstFocusable = panelRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    (firstFocusable ?? panelRef.current)?.focus({ preventScroll: true });
  });

  return () => {
    cancelAnimationFrame(focusFrame);
    body.style.position = previousBodyStyles.position;
    body.style.top = previousBodyStyles.top;
    body.style.left = previousBodyStyles.left;
    body.style.right = previousBodyStyles.right;
    body.style.overflow = previousBodyStyles.overflow;
    window.scrollTo(0, scrollY);
    onClose?.();
  };
}
