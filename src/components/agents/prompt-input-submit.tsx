'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Button } from '@/components/motion/button';
import { SPRING_SWAP } from '@/lib/ease';
import { PromptSubmitIcon } from './prompt-input-submit-icon';

function submitButtonState(loading: boolean, canSubmit: boolean, onStop?: () => void) {
  return {
    ariaLabel: loading ? 'Stop generating' : 'Send prompt',
    disabled: loading ? !onStop : !canSubmit,
    type: loading ? ('button' as const) : ('submit' as const),
  };
}

export function PromptInputSubmitButton({
  canSubmit,
  loading,
  onStop,
}: {
  canSubmit: boolean;
  loading: boolean;
  onStop?: () => void;
}) {
  const reduce = useReducedMotion() ?? false;
  const button = submitButtonState(loading, canSubmit, onStop);

  return (
    <Button
      aria-label={button.ariaLabel}
      className="ml-auto size-8 rounded-full"
      disabled={button.disabled}
      size="icon"
      type={button.type}
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
          <PromptSubmitIcon loading={loading} />
        </motion.span>
      </AnimatePresence>
    </Button>
  );
}
