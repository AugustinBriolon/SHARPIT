'use client';

import { Check, CircleAlert } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useRef } from 'react';
import { EASE_IN_OUT, EASE_OUT } from '@/lib/ease';
import { useHoverCapable } from '@/lib/hooks/use-hover-capable';
import { drawDitherDotGrid } from './image-generation-canvas';
import type { ImageGenerationStatus } from './image-generation-types';

const OVERLAY_OPACITY: Record<ImageGenerationStatus, number> = {
  queued: 1,
  generating: 1,
  refining: 0.48,
  complete: 0,
  error: 0,
};

const DOT_GAP = 10;

function pointerFollowRate(reduce: boolean, inside: boolean): number {
  if (reduce) {
    return 1;
  }
  return inside ? 0.16 : 0.045;
}

export function DitherMark({ status, reduce }: { status: ImageGenerationStatus; reduce: boolean }) {
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

export function DitherField({
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
    if (!canvas || !context) {
      return;
    }

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

      drawDitherDotGrid({
        context,
        pointer,
        width,
        height,
        dotGap: DOT_GAP,
        dotColor,
      });

      if (!reduce) {
        frame = window.requestAnimationFrame(draw);
      }
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!pointerEnabled) {
        return;
      }
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
      if (frame) {
        window.cancelAnimationFrame(frame);
      }
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
