'use client';
// beui.dev/components/agents/chat-app

import { ArrowUp, Plus, Square } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
  type TextareaHTMLAttributes,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { Button } from '@/components/motion/button';
import {
  MorphPopover,
  MorphPopoverContent,
  MorphPopoverTrigger,
} from '@/components/motion/popover-morph';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/motion/select';
import { SPRING_SWAP } from '@/lib/ease';
import { cn } from '@/lib/utils';

export interface PromptModel {
  value: string;
  label: ReactNode;
  icon?: ReactNode;
  disabled?: boolean;
}

export interface PromptAction {
  value: string;
  label: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  disabled?: boolean;
}

export interface PromptInputProps extends Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  'value' | 'defaultValue' | 'onChange' | 'onSubmit' | 'children'
> {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  models?: PromptModel[];
  model?: string;
  defaultModel?: string;
  onModelChange?: (model: string) => void;
  actions?: PromptAction[];
  onAction?: (action: string) => void;
  onSubmit?: (value: string, model?: string) => void | Promise<void>;
  loading?: boolean;
  onStop?: () => void;
  minRows?: number;
  maxRows?: number;
  leadingAction?: ReactNode;
  className?: string;
}

const LINE_HEIGHT_PX = 24;

export function PromptInput({
  value,
  defaultValue = '',
  onValueChange,
  models = [],
  model,
  defaultModel,
  onModelChange,
  actions = [],
  onAction,
  onSubmit,
  loading = false,
  onStop,
  minRows = 2,
  maxRows = 8,
  leadingAction,
  className,
  disabled,
  placeholder = 'Ask the agent to do something…',
  'aria-label': ariaLabel = 'Prompt',
  onKeyDown,
  ...textareaProps
}: PromptInputProps) {
  const reduce = useReducedMotion() ?? false;
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const measurementRef = useRef<HTMLDivElement>(null);
  const [internalValue, setInternalValue] = useState(defaultValue);
  const [internalModel, setInternalModel] = useState(defaultModel ?? models[0]?.value);
  const [actionsOpen, setActionsOpen] = useState(false);
  const currentValue = value ?? internalValue;
  const currentModelValue = model ?? internalModel;
  const currentModel = models.find((option) => option.value === currentModelValue);
  const canSubmit = Boolean(currentValue.trim()) && !disabled && !loading;

  const resizeTextarea = useCallback(() => {
    const textarea = textareaRef.current;
    const measurement = measurementRef.current;
    if (!textarea || !measurement) return;

    const maxHeight = maxRows * LINE_HEIGHT_PX;

    // Empty: native rows height — never shrink on load.
    if (!currentValue) {
      textarea.style.removeProperty('height');
      return;
    }

    // Derived only from the shadow measurement, never from the textarea's own
    // (possibly already-adjusted) offsetHeight: comparing against a height this
    // same effect set on a prior run made the result depend on invocation order —
    // two effect runs for the same value (Strict Mode double-invokes in dev, but
    // any repeat render can trigger it) would set it, read that height back as
    // "baseline", see nothing left to grow, and strip the style back to one row.
    const minHeight = minRows * LINE_HEIGHT_PX;
    const next = Math.min(Math.max(measurement.scrollHeight, minHeight), maxHeight);
    textarea.style.height = `${next}px`;
  }, [currentValue, maxRows, minRows]);

  useLayoutEffect(() => {
    resizeTextarea();
  }, [currentValue, resizeTextarea]);

  const setValue = (next: string) => {
    if (value === undefined) setInternalValue(next);
    onValueChange?.(next);
  };

  const setModel = (next: string) => {
    if (model === undefined) setInternalModel(next);
    onModelChange?.(next);
  };

  const submit = (event?: FormEvent) => {
    event?.preventDefault();
    const prompt = currentValue.trim();
    if (!prompt || disabled || loading) return;

    onSubmit?.(prompt, currentModelValue);
    if (value === undefined) setInternalValue('');
    textareaRef.current?.focus({ preventScroll: true });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
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

  return (
    <form
      className={cn(
        'border-border/80 bg-background focus-within:border-foreground/25 relative w-full rounded-2xl border p-2 transition-colors',
        disabled && 'opacity-60',
        className,
      )}
      onSubmit={submit}
    >
      <div
        ref={measurementRef}
        aria-hidden="true"
        className="pointer-events-none invisible absolute inset-x-2 top-0 px-2 pt-1.5 text-base leading-6 lg:text-sm [overflow-wrap:break-word] whitespace-pre-wrap"
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
        // 16px below `lg` \u2014 iOS Safari zooms the page on focus for any input
        // rendering under 16px, and a chat composer is focused constantly.
        className="scrollbar-hide text-foreground placeholder:text-muted-foreground/55 block w-full resize-none overflow-y-auto bg-transparent px-2 pt-1.5 text-base leading-6 outline-none lg:text-sm"
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={handleKeyDown}
      />

      <div className="mt-1 flex min-h-8 items-center gap-1">
        {actions.length ? (
          <MorphPopover open={actionsOpen} onOpenChange={setActionsOpen}>
            <MorphPopoverTrigger>
              <Button
                aria-label="Add to prompt"
                className="size-8 rounded-full"
                disabled={disabled || loading}
                size="icon"
                type="button"
                variant="ghost"
              >
                <motion.span
                  animate={{ rotate: actionsOpen ? 45 : 0 }}
                  aria-hidden="true"
                  transition={reduce ? { duration: 0 } : SPRING_SWAP}
                >
                  <Plus className="size-4" />
                </motion.span>
              </Button>
            </MorphPopoverTrigger>

            <MorphPopoverContent
              align="start"
              className="w-56 p-1.5"
              radius={12}
              side="top"
              sideOffset={8}
            >
              {actions.map((action) => (
                <button
                  key={action.value}
                  className="hover:bg-muted focus-visible:bg-muted flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors outline-none disabled:pointer-events-none disabled:opacity-50"
                  disabled={action.disabled}
                  type="button"
                  onClick={() => {
                    onAction?.(action.value);
                    setActionsOpen(false);
                  }}
                >
                  {action.icon ? (
                    <span className="text-muted-foreground mt-0.5 grid size-5 shrink-0 place-items-center [&_svg]:size-4">
                      {action.icon}
                    </span>
                  ) : null}
                  <span className="min-w-0">
                    <span className="text-foreground block text-sm">{action.label}</span>
                    {action.description ? (
                      <span className="text-muted-foreground mt-0.5 block text-xs leading-4">
                        {action.description}
                      </span>
                    ) : null}
                  </span>
                </button>
              ))}
            </MorphPopoverContent>
          </MorphPopover>
        ) : null}
        {leadingAction}
        {models.length ? (
          <Select
            className="min-w-0"
            disabled={disabled || loading}
            value={currentModelValue}
            onValueChange={setModel}
          >
            <SelectTrigger className="hover:bg-muted h-8 w-auto max-w-52 rounded-xl border-0 bg-transparent px-2 py-0 text-xs focus-visible:ring-2">
              <span className="flex min-w-0 items-center gap-1.5">
                {currentModel?.icon ? (
                  <span className="text-muted-foreground grid size-4 shrink-0 place-items-center [&_svg]:size-3.5">
                    {currentModel.icon}
                  </span>
                ) : null}
                <span className="text-muted-foreground truncate">
                  {currentModel?.label ?? 'Choose model'}
                </span>
              </span>
            </SelectTrigger>
            <SelectContent className="right-auto w-52 shadow-none">
              {models.map((option) => (
                <SelectItem
                  key={option.value}
                  className="py-2"
                  disabled={option.disabled}
                  value={option.value}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    {option.icon ? (
                      <span className="text-muted-foreground grid size-5 shrink-0 place-items-center [&_svg]:size-4">
                        {option.icon}
                      </span>
                    ) : null}
                    <span className="text-foreground min-w-0 truncate text-sm">{option.label}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}

        <Button
          aria-label={loading ? 'Stop generating' : 'Send prompt'}
          className="ml-auto size-8 rounded-full"
          disabled={loading ? !onStop : !canSubmit}
          size="icon"
          type={loading ? 'button' : 'submit'}
          onClick={loading ? onStop : undefined}
        >
          <AnimatePresence initial={false} mode="popLayout">
            <motion.span
              key={loading ? 'stop' : 'send'}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="grid place-items-center"
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -3, scale: 0.8 }}
              initial={reduce ? { opacity: 1 } : { opacity: 0, y: 3, scale: 0.8 }}
              transition={reduce ? { duration: 0 } : SPRING_SWAP}
            >
              {loading ? (
                <Square className="size-3 fill-current" />
              ) : (
                <ArrowUp className="size-4" />
              )}
            </motion.span>
          </AnimatePresence>
        </Button>
      </div>
    </form>
  );
}
