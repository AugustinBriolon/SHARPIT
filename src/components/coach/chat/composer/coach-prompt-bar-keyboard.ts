import type { KeyboardEvent } from 'react';

export function getNextMenuActiveIndex(
  current: number,
  direction: 'ArrowDown' | 'ArrowUp',
  length: number,
): number {
  if (direction === 'ArrowDown') {
    return (current + 1) % length;
  }
  return (current + length - 1) % length;
}

export function tryHandleMenuNavigationKey(
  event: KeyboardEvent<HTMLTextAreaElement>,
  sourcesLength: number,
  onNavigate: (direction: 'ArrowDown' | 'ArrowUp') => void,
): boolean {
  if (sourcesLength === 0) {
    return false;
  }
  if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') {
    return false;
  }
  event.preventDefault();
  onNavigate(event.key);
  return true;
}

export function tryHandleMenuPickKey(
  event: KeyboardEvent<HTMLTextAreaElement>,
  sourcesLength: number,
  onPick: () => void,
): boolean {
  if (sourcesLength === 0) {
    return false;
  }
  const isPickKey = (event.key === 'Enter' && !event.shiftKey) || event.key === 'Tab';
  if (!isPickKey) {
    return false;
  }
  event.preventDefault();
  onPick();
  return true;
}

export function tryHandleEscapeKey(
  event: KeyboardEvent<HTMLTextAreaElement>,
  onCloseMenu: () => void,
): boolean {
  if (event.key !== 'Escape') {
    return false;
  }
  onCloseMenu();
  return true;
}

export function tryHandleSubmitKey(
  event: KeyboardEvent<HTMLTextAreaElement>,
  onSubmit: () => void,
): boolean {
  if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) {
    return false;
  }
  event.preventDefault();
  onSubmit();
  return true;
}

export function handlePromptBarKeyDown(
  event: KeyboardEvent<HTMLTextAreaElement>,
  options: {
    menuOpen: boolean;
    sourcesLength: number;
    onMenuNavigate: (direction: 'ArrowDown' | 'ArrowUp') => void;
    onMenuPick: () => void;
    onCloseMenu: () => void;
    onSubmit: () => void;
  },
): void {
  const { menuOpen, sourcesLength, onMenuNavigate, onMenuPick, onCloseMenu, onSubmit } = options;

  if (menuOpen) {
    if (tryHandleMenuNavigationKey(event, sourcesLength, onMenuNavigate)) {
      return;
    }
    if (tryHandleMenuPickKey(event, sourcesLength, onMenuPick)) {
      return;
    }
  }
  if (tryHandleEscapeKey(event, onCloseMenu)) {
    return;
  }
  tryHandleSubmitKey(event, onSubmit);
}
