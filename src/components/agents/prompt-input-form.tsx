'use client';

import { type ReactNode, useRef } from 'react';
import { PromptInputActionsMenu } from '@/components/agents/prompt-input-actions';
import {
  usePromptInputState,
  usePromptKeyDown,
  usePromptTextareaResize,
} from '@/components/agents/prompt-input-hooks';
import { PromptInputModelSelect } from '@/components/agents/prompt-input-model-select';
import { PromptInputSubmitButton } from '@/components/agents/prompt-input-submit';
import { cn } from '@/lib/utils';
import type { PromptInputProps } from './prompt-input';

function PromptInputTextarea({
  ariaLabel,
  currentValue,
  disabled,
  handleKeyDown,
  measurementRef,
  minRows,
  placeholder,
  setValue,
  textareaProps,
  textareaRef,
}: {
  ariaLabel: string;
  currentValue: string;
  disabled?: boolean;
  handleKeyDown: ReturnType<typeof usePromptKeyDown>;
  measurementRef: React.RefObject<HTMLDivElement | null>;
  minRows: number;
  placeholder: string;
  setValue: (value: string) => void;
  textareaProps: Omit<PromptInputProps, keyof PromptInputProps>;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}) {
  return (
    <>
      <div
        ref={measurementRef}
        aria-hidden="true"
        className="pointer-events-none invisible absolute inset-x-2 top-0 px-2 pt-1.5 text-base leading-6 [overflow-wrap:break-word] whitespace-pre-wrap lg:text-sm"
      >
        {currentValue || '\u00a0'}
      </div>
      <textarea
        ref={textareaRef}
        aria-label={ariaLabel}
        disabled={disabled}
        placeholder={placeholder}
        rows={minRows}
        value={currentValue}
        {...textareaProps}
        className="scrollbar-hide text-foreground placeholder:text-muted-foreground/55 block w-full resize-none overflow-y-auto bg-transparent px-2 pt-1.5 text-base leading-6 outline-none lg:text-sm"
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={handleKeyDown}
      />
    </>
  );
}

function PromptInputToolbar({
  actions,
  canSubmit,
  currentModel,
  currentModelValue,
  disabled,
  leadingAction,
  loading,
  models,
  onAction,
  onStop,
  setModel,
}: {
  actions: PromptInputProps['actions'];
  canSubmit: boolean;
  currentModel?: PromptInputProps['models'] extends (infer M)[] | undefined ? M : never;
  currentModelValue?: string;
  disabled?: boolean;
  leadingAction?: ReactNode;
  loading: boolean;
  models: NonNullable<PromptInputProps['models']>;
  onAction?: PromptInputProps['onAction'];
  onStop?: () => void;
  setModel: (value: string) => void;
}) {
  return (
    <div className="mt-1 flex min-h-8 items-center gap-1">
      {actions?.length ? (
        <PromptInputActionsMenu
          actions={actions}
          disabled={disabled}
          loading={loading}
          onAction={onAction}
        />
      ) : null}
      {leadingAction}
      {models.length ? (
        <PromptInputModelSelect
          currentModel={currentModel}
          disabled={disabled}
          loading={loading}
          models={models}
          value={currentModelValue}
          onValueChange={setModel}
        />
      ) : null}
      <PromptInputSubmitButton canSubmit={canSubmit} loading={loading} onStop={onStop} />
    </div>
  );
}

function resolvePromptInputFormOptions(props: PromptInputProps) {
  return {
    actions: props.actions ?? [],
    ariaLabel: props['aria-label'] ?? 'Prompt',
    className: props.className,
    disabled: props.disabled,
    leadingAction: props.leadingAction,
    loading: props.loading ?? false,
    maxRows: props.maxRows ?? 8,
    minRows: props.minRows ?? 2,
    models: props.models ?? [],
    onAction: props.onAction,
    onKeyDown: props.onKeyDown,
    onStop: props.onStop,
    placeholder: props.placeholder ?? 'Ask the agent to do something…',
    textareaProps: Object.fromEntries(
      Object.entries(props).filter(
        ([key]) =>
          ![
            'value',
            'defaultValue',
            'onValueChange',
            'models',
            'model',
            'defaultModel',
            'onModelChange',
            'actions',
            'onAction',
            'onSubmit',
            'loading',
            'onStop',
            'minRows',
            'maxRows',
            'leadingAction',
            'className',
            'disabled',
            'placeholder',
            'aria-label',
            'onKeyDown',
          ].includes(key),
      ),
    ) as Omit<PromptInputProps, keyof PromptInputProps>,
  };
}

export function PromptInputForm(props: PromptInputProps) {
  const options = resolvePromptInputFormOptions(props);
  const measurementRef = useRef<HTMLDivElement>(null);
  const state = usePromptInputState(props);

  usePromptTextareaResize({
    textareaRef: state.textareaRef,
    measurementRef,
    currentValue: state.currentValue,
    minRows: options.minRows,
    maxRows: options.maxRows,
  });

  const handleKeyDown = usePromptKeyDown(options.onKeyDown, state.submit);

  return (
    <form
      className={cn(
        'border-border/80 bg-background focus-within:border-foreground/25 relative w-full rounded-2xl border p-2 transition-colors',
        options.disabled && 'opacity-60',
        options.className,
      )}
      onSubmit={state.submit}
    >
      <PromptInputTextarea
        ariaLabel={options.ariaLabel}
        currentValue={state.currentValue}
        disabled={options.disabled}
        handleKeyDown={handleKeyDown}
        measurementRef={measurementRef}
        minRows={options.minRows}
        placeholder={options.placeholder}
        setValue={state.setValue}
        textareaProps={options.textareaProps}
        textareaRef={state.textareaRef}
      />
      <PromptInputToolbar
        actions={options.actions}
        canSubmit={state.canSubmit}
        currentModel={state.currentModel}
        currentModelValue={state.currentModelValue}
        disabled={options.disabled}
        leadingAction={options.leadingAction}
        loading={options.loading}
        models={options.models}
        setModel={state.setModel}
        onAction={options.onAction}
        onStop={options.onStop}
      />
    </form>
  );
}
