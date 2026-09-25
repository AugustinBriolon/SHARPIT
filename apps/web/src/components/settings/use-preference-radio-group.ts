'use client';

import { useRef } from 'react';

function handleArrowKeys(
  event: React.KeyboardEvent<HTMLButtonElement>,
  index: number,
  selectAt: (index: number) => void,
  length: number,
) {
  if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
    event.preventDefault();
    selectAt((index + 1) % length);
    return;
  }
  if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
    event.preventDefault();
    selectAt((index - 1 + length) % length);
  }
}

function handleHomeEndKeys(
  event: React.KeyboardEvent<HTMLButtonElement>,
  selectAt: (index: number) => void,
  length: number,
) {
  if (event.key === 'Home') {
    event.preventDefault();
    selectAt(0);
    return;
  }
  if (event.key === 'End') {
    event.preventDefault();
    selectAt(length - 1);
  }
}

export function usePreferenceRadioGroup<TId extends string>(
  options: readonly { id: TId }[],
  onChange: (id: TId) => void,
) {
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);

  function focusOption(index: number) {
    const clamped = Math.max(0, Math.min(options.length - 1, index));
    optionRefs.current[clamped]?.focus();
  }

  function selectAt(index: number) {
    const option = options[index];
    if (!option) {
      return;
    }
    onChange(option.id);
    focusOption(index);
  }

  function onRadioKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    handleArrowKeys(event, index, selectAt, options.length);
    handleHomeEndKeys(event, selectAt, options.length);
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      selectAt(index);
    }
  }

  return { optionRefs, onRadioKeyDown };
}
