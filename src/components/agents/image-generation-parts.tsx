import type { CSSProperties, ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { RotateCcw } from 'lucide-react';
import { EASE_OUT, SPRING_PRESS } from '@/lib/ease';
import { motionTokens } from '@/lib/motion/tokens';
import { cn } from '@/lib/utils';
import { DitherField, DitherMark } from './image-generation-dither';
import type { ImageGenerationStatus } from './image-generation-types';

type MediaState = { filter: string; opacity: number; scale: number };

export function ImageGenerationViewport({
  active,
  aspectRatio,
  children,
  mediaClassName,
  mediaState,
  interactive,
  reduce,
  resolution,
  resolvedLabel,
  status,
}: {
  active: boolean;
  aspectRatio: CSSProperties['aspectRatio'];
  children?: ReactNode;
  mediaClassName?: string;
  mediaState: MediaState;
  interactive: boolean;
  reduce: boolean;
  resolution: string;
  resolvedLabel: string;
  status: ImageGenerationStatus;
}) {
  return (
    <div
      aria-label={resolvedLabel}
      className="bg-muted relative isolate w-full overflow-hidden rounded-xl"
      role="img"
      style={{ aspectRatio }}
    >
      <motion.div
        aria-hidden={children ? undefined : true}
        initial={false}
        transition={reduce ? { duration: 0 } : { duration: 0.4, ease: EASE_OUT }}
        animate={
          reduce
            ? { opacity: mediaState.opacity }
            : {
                filter: mediaState.filter,
                opacity: mediaState.opacity,
                scale: mediaState.scale,
              }
        }
        className={cn(
          'absolute inset-0 [&_img]:size-full [&_img]:object-cover [&>*]:size-full [&>*]:object-cover',
          mediaClassName,
        )}
      >
        {children}
      </motion.div>

      <AnimatePresence initial={false}>
        {active ? (
          <motion.div
            key="dither-field"
            animate={{ opacity: 1 }}
            className="absolute inset-0"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.25, ease: EASE_OUT }}
          >
            <DitherField interactive={interactive} reduce={reduce} status={status} />
          </motion.div>
        ) : null}
      </AnimatePresence>

      {resolution ? (
        <span className="bg-background/75 text-muted-foreground absolute top-2 right-2 z-10 rounded-full px-2 py-0.5 font-mono text-[10px] tabular-nums">
          {resolution}
        </span>
      ) : null}
    </div>
  );
}

function ImageGenerationStatusLine({
  reduce,
  resolvedStatusText,
  status,
  statusClassName,
}: {
  reduce: boolean;
  resolvedStatusText: string;
  status: ImageGenerationStatus;
  statusClassName?: string;
}) {
  return (
    <div
      aria-live="polite"
      className={cn(
        'text-foreground flex min-h-5 items-center gap-2 text-sm font-medium',
        status === 'error' && 'text-destructive',
        statusClassName,
      )}
    >
      <DitherMark reduce={reduce} status={status} />
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          key={resolvedStatusText}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? undefined : { opacity: 0, y: -4 }}
          initial={reduce ? false : { opacity: 0, y: 4 }}
          transition={{
            duration: reduce ? 0 : 0.15,
            ease: EASE_OUT,
          }}
        >
          {resolvedStatusText}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}

export function ImageGenerationStatusRow({
  prompt,
  reduce,
  resolvedStatusText,
  showStatus,
  status,
  statusClassName,
}: {
  prompt?: string;
  reduce: boolean;
  resolvedStatusText: string;
  showStatus: boolean;
  status: ImageGenerationStatus;
  statusClassName?: string;
}) {
  if (!showStatus && !prompt) {
    return null;
  }

  return (
    <div className="mt-3 text-left">
      {showStatus ? (
        <ImageGenerationStatusLine
          reduce={reduce}
          resolvedStatusText={resolvedStatusText}
          status={status}
          statusClassName={statusClassName}
        />
      ) : null}
      {prompt ? <p className="text-muted-foreground mt-0.5 truncate text-xs">“{prompt}”</p> : null}
    </div>
  );
}

export function ImageGenerationRetryButton({
  onRetry,
  reduce,
  status,
}: {
  onRetry?: () => void;
  reduce: boolean;
  status: ImageGenerationStatus;
}) {
  if (status !== 'error' || !onRetry) {
    return null;
  }

  return (
    <motion.button
      className="text-foreground hover:bg-muted focus-visible:ring-ring mt-3 inline-flex min-h-10 items-center gap-2 rounded-full px-3 text-sm font-medium transition-colors outline-none focus-visible:ring-2"
      transition={SPRING_PRESS}
      type="button"
      whileTap={reduce ? undefined : { scale: motionTokens.scale.pressSmall }}
      onClick={onRetry}
    >
      <RotateCcw aria-hidden="true" className="size-4" />
      Try again
    </motion.button>
  );
}
