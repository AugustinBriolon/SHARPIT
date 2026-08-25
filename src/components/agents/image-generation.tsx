'use client';
// beui.dev/components/agents/chat-app

import { Check, CircleAlert, RotateCcw } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import type { CSSProperties, ReactNode } from 'react';
import { useEffect, useRef } from 'react';
import { EASE_IN_OUT, EASE_OUT, SPRING_PRESS } from '@/lib/ease';
import { useHoverCapable } from '@/lib/hooks/use-hover-capable';
import { cn } from '@/lib/utils';

function pointerFollowRate(reduce: boolean, inside: boolean): number {
  if (reduce) return 1;
  return inside ? 0.16 : 0.045;
}

export type ImageGenerationStatus = 'queued' | 'generating' | 'refining' | 'complete' | 'error';

export interface ImageGenerationProps {
  /** The completed media. Pass an img, Next Image, canvas, video, or custom preview. */
  children?: ReactNode;
  status?: ImageGenerationStatus;
  /** Accessible description. Defaults to a description derived from prompt. */
  label?: string;
  prompt?: string;
  resolution?: string;
  /** CSS aspect ratio reserved before generated media is available. */
  aspectRatio?: CSSProperties['aspectRatio'];
  size?: 'compact' | 'fluid';
  /** Lets the active dither cluster follow fine-pointer movement. */
  interactive?: boolean;
  statusText?: string;
  showStatus?: boolean;
  onRetry?: () => void;
  className?: string;
  mediaClassName?: string;
  statusClassName?: string;
}

const STATUS_TEXT: Record<ImageGenerationStatus, string> = {
  queued: 'Waiting to generate',
  generating: 'Generating image',
  refining: 'Refining details',
  complete: 'Image ready',
  error: 'Generation failed',
};

const MEDIA_STATE: Record<
  ImageGenerationStatus,
  { filter: string; opacity: number; scale: number }
> = {
  queued: { filter: 'blur(4px) saturate(0.75)', opacity: 0, scale: 1.02 },
  generating: { filter: 'blur(3px) saturate(0.85)', opacity: 0, scale: 1.015 },
  refining: { filter: 'blur(1.5px) saturate(0.95)', opacity: 0.62, scale: 1.005 },
  complete: { filter: 'blur(0px) saturate(1)', opacity: 1, scale: 1 },
  error: { filter: 'blur(2px) saturate(0.5)', opacity: 0.28, scale: 1 },
};

const OVERLAY_OPACITY: Record<ImageGenerationStatus, number> = {
  queued: 1,
  generating: 1,
  refining: 0.48,
  complete: 0,
  error: 0,
};

const DOT_GAP = 10;
const TWO_PI = Math.PI * 2;

function DitherMark({ status, reduce }: { status: ImageGenerationStatus; reduce: boolean }) {
  if (status === 'complete') {
    return <Check aria-hidden="true" className="size-3.5" />;
  }

  if (status === 'error') {
    return <CircleAlert aria-hidden="true" className="size-3.5" />;
  }

  return (
    <motion.span
      animate={reduce ? undefined : { rotate: 360 }}
      aria-hidden="true"
      className="grid size-3.5 grid-cols-2 place-items-center gap-0.5"
      transition={{
        duration: 2.4,
        ease: EASE_IN_OUT,
        repeat: Number.POSITIVE_INFINITY,
      }}
    >
      <span className="size-1 rounded-[1px] bg-current" />
      <span className="size-1 rounded-[1px] bg-current opacity-55" />
      <span className="size-1 rounded-[1px] bg-current opacity-55" />
      <span className="size-1 rounded-[1px] bg-current" />
    </motion.span>
  );
}

function DitherField({
  interactive,
  reduce,
  status,
}: {
  interactive: boolean;
  reduce: boolean;
  status: ImageGenerationStatus;
}) {
  const canHover = useHoverCapable();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;

    let frame = 0;
    let width = 0;
    let height = 0;
    let dotColor = 'currentColor';
    const pointer = {
      x: 0,
      y: 0,
      targetX: 0,
      targetY: 0,
      inside: false,
    };
    const pointerEnabled = interactive && canHover && !reduce;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width || canvas.clientWidth || 208;
      height = rect.height || canvas.clientHeight || 208;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      dotColor = window.getComputedStyle(canvas).color;
      pointer.x = width / 2;
      pointer.y = height / 2;
      pointer.targetX = pointer.x;
      pointer.targetY = pointer.y;
    };

    const draw = (time: number) => {
      context.clearRect(0, 0, width, height);

      if (!pointer.inside) {
        pointer.targetX = width / 2 + (reduce ? 0 : Math.sin(time / 1700) * width * 0.12);
        pointer.targetY = height / 2 + (reduce ? 0 : Math.cos(time / 2100) * height * 0.1);
      }

      const follow = pointerFollowRate(reduce, pointer.inside);
      pointer.x += (pointer.targetX - pointer.x) * follow;
      pointer.y += (pointer.targetY - pointer.y) * follow;

      const radius = Math.min(width, height) * 0.38;
      const columns = Math.ceil(width / DOT_GAP) + 1;
      const rows = Math.ceil(height / DOT_GAP) + 1;
      const offsetX = (width - (columns - 1) * DOT_GAP) / 2;
      const offsetY = (height - (rows - 1) * DOT_GAP) / 2;

      context.fillStyle = dotColor;

      for (let row = 0; row < rows; row += 1) {
        for (let column = 0; column < columns; column += 1) {
          const anchorX = offsetX + column * DOT_GAP;
          const anchorY = offsetY + row * DOT_GAP;
          const deltaX = anchorX - pointer.x;
          const deltaY = anchorY - pointer.y;
          const distance = Math.hypot(deltaX, deltaY);
          const proximity = Math.max(0, 1 - distance / radius);
          const influence = proximity * proximity * (3 - 2 * proximity);
          const displacement = influence * influence * 9;
          const directionX = distance > 0 ? deltaX / distance : 0;
          const directionY = distance > 0 ? deltaY / distance : 0;
          const x = anchorX + directionX * displacement;
          const y = anchorY + directionY * displacement;
          const dotRadius = 0.65 + influence * 0.85;

          context.globalAlpha = 0.17 + influence * 0.72;
          context.beginPath();
          context.arc(x, y, dotRadius, 0, TWO_PI);
          context.fill();
        }
      }

      context.globalAlpha = 1;
      if (!reduce) frame = window.requestAnimationFrame(draw);
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!pointerEnabled) return;
      const rect = canvas.getBoundingClientRect();
      pointer.inside = true;
      pointer.targetX = event.clientX - rect.left;
      pointer.targetY = event.clientY - rect.top;
    };

    const handlePointerLeave = () => {
      pointer.inside = false;
    };

    const resizeObserver =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize);

    resize();
    resizeObserver?.observe(canvas);
    canvas.addEventListener('pointermove', handlePointerMove, { passive: true });
    canvas.addEventListener('pointerleave', handlePointerLeave);
    draw(0);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      resizeObserver?.disconnect();
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerleave', handlePointerLeave);
    };
  }, [canHover, interactive, reduce]);

  return (
    <motion.div
      animate={{ opacity: OVERLAY_OPACITY[status] }}
      aria-hidden="true"
      className="bg-muted absolute inset-0 overflow-hidden"
      initial={false}
      transition={{ duration: reduce ? 0 : 0.4, ease: EASE_OUT }}
    >
      <canvas ref={canvasRef} className="text-foreground absolute inset-0 size-full" />
    </motion.div>
  );
}

export function ImageGeneration({
  children,
  status = 'generating',
  label,
  prompt,
  resolution = '1024 × 1024',
  aspectRatio = '1 / 1',
  size = 'compact',
  interactive = true,
  statusText,
  showStatus = true,
  onRetry,
  className,
  mediaClassName,
  statusClassName,
}: ImageGenerationProps) {
  const reduce = useReducedMotion() ?? false;
  const active = status === 'queued' || status === 'generating' || status === 'refining';
  const mediaState = MEDIA_STATE[status];
  const resolvedStatusText = statusText ?? STATUS_TEXT[status];
  const resolvedLabel = label ?? (prompt ? `${resolvedStatusText}: ${prompt}` : resolvedStatusText);

  return (
    <div
      aria-busy={active}
      className={cn('w-full', className)}
      data-slot="image-generation"
      data-state={status}
    >
      <div className={cn('w-full', size === 'compact' && 'mx-auto max-w-52')}>
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

        {showStatus || prompt ? (
          <div className="mt-3 text-left">
            {showStatus ? (
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
            ) : null}
            {prompt ? (
              <p className="text-muted-foreground mt-0.5 truncate text-xs">“{prompt}”</p>
            ) : null}
          </div>
        ) : null}

        {status === 'error' && onRetry ? (
          <motion.button
            className="text-foreground hover:bg-muted focus-visible:ring-ring mt-3 inline-flex min-h-10 items-center gap-2 rounded-full px-3 text-sm font-medium transition-colors outline-none focus-visible:ring-2"
            transition={SPRING_PRESS}
            type="button"
            whileTap={reduce ? undefined : { scale: 0.96 }}
            onClick={onRetry}
          >
            <RotateCcw aria-hidden="true" className="size-4" />
            Try again
          </motion.button>
        ) : null}
      </div>
    </div>
  );
}
