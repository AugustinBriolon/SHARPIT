'use client';

import { Plus } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { useState } from 'react';
import { Button } from '@/components/motion/button';
import {
  MorphPopover,
  MorphPopoverContent,
  MorphPopoverTrigger,
} from '@/components/motion/popover-morph';
import { SPRING_SWAP } from '@/lib/ease';
import type { PromptAction } from './prompt-input';

export function PromptInputActionsMenu({
  actions,
  disabled,
  loading,
  onAction,
}: {
  actions: PromptAction[];
  disabled?: boolean;
  loading?: boolean;
  onAction?: (action: string) => void;
}) {
  const reduce = useReducedMotion() ?? false;
  const [actionsOpen, setActionsOpen] = useState(false);

  return (
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
  );
}
