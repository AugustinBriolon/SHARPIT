'use client';

import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/motion/select';
import type { PromptModel } from './prompt-input';

export function PromptInputModelSelect({
  currentModel,
  disabled,
  loading,
  models,
  value,
  onValueChange,
}: {
  currentModel?: PromptModel;
  disabled?: boolean;
  loading?: boolean;
  models: PromptModel[];
  value?: string;
  onValueChange: (value: string) => void;
}) {
  return (
    <Select
      className="min-w-0"
      disabled={disabled || loading}
      value={value}
      onValueChange={onValueChange}
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
  );
}
