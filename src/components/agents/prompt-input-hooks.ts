'use client';

import {
  type FormEvent,
  type KeyboardEvent,
  type TextareaHTMLAttributes,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import type { PromptInputProps } from './prompt-input';

const LINE_HEIGHT_PX = 24;

function canSubmitPrompt(prompt: string, disabled?: boolean, loading?: boolean) {
  return Boolean(prompt) && !disabled && !loading;
}

export function usePromptInputState(props: PromptInputProps) {
  const {
    value,
    defaultValue = '',
    onValueChange,
    model,
    defaultModel,
    onModelChange,
    models = [],
    disabled,
    loading,
    onSubmit,
  } = props;

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [internalValue, setInternalValue] = useState(defaultValue);
  const [internalModel, setInternalModel] = useState(defaultModel ?? models[0]?.value);
  const currentValue = value ?? internalValue;
  const currentModelValue = model ?? internalModel;
  const currentModel = models.find((option) => option.value === currentModelValue);
  const canSubmit = canSubmitPrompt(currentValue.trim(), disabled, loading);

  const setValue = (next: string) => {
    if (value === undefined) {
      setInternalValue(next);
    }
    onValueChange?.(next);
  };

  const setModel = (next: string) => {
    if (model === undefined) {
      setInternalModel(next);
    }
    onModelChange?.(next);
  };

  const submit = (event?: FormEvent) => {
    event?.preventDefault();
    const prompt = currentValue.trim();
    if (!canSubmitPrompt(prompt, disabled, loading)) {
      return;
    }

    onSubmit?.(prompt, currentModelValue);
    if (value === undefined) {
      setInternalValue('');
    }
    textareaRef.current?.focus({ preventScroll: true });
  };

  return {
    canSubmit,
    currentModel,
    currentModelValue,
    currentValue,
    setModel,
    setValue,
    submit,
    textareaRef,
  };
}

export function usePromptTextareaResize({
  textareaRef,
  measurementRef,
  currentValue,
  minRows,
  maxRows,
}: {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  measurementRef: React.RefObject<HTMLDivElement | null>;
  currentValue: string;
  minRows: number;
  maxRows: number;
}) {
  const resizeTextarea = useCallback(() => {
    const textarea = textareaRef.current;
    const measurement = measurementRef.current;
    if (!textarea || !measurement) {
      return;
    }

    const maxHeight = maxRows * LINE_HEIGHT_PX;

    if (!currentValue) {
      textarea.style.removeProperty('height');
      return;
    }

    const minHeight = minRows * LINE_HEIGHT_PX;
    const next = Math.min(Math.max(measurement.scrollHeight, minHeight), maxHeight);
    textarea.style.height = `${next}px`;
  }, [currentValue, maxRows, measurementRef, minRows, textareaRef]);

  useLayoutEffect(() => {
    resizeTextarea();
  }, [currentValue, resizeTextarea]);
}

export function usePromptKeyDown(
  onKeyDown: PromptInputProps['onKeyDown'],
  submit: (event?: FormEvent) => void,
) {
  return (event: KeyboardEvent<HTMLTextAreaElement>) => {
    onKeyDown?.(event);
    if (
      event.defaultPrevented ||
      event.key !== 'Enter' ||
      event.shiftKey ||
      event.nativeEvent.isComposing
    ) {
      return;
    }
    event.preventDefault();
    submit();
  };
}
