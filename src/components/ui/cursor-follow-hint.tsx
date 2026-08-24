import { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChartTooltipCard } from '@/components/ui/charts/chart-tooltip';
import { cn } from '@/lib/utils';

export type CursorHintLine = {
  text: string;
  swatchClassName?: string;
  textClassName?: string;
};

export type CursorHintState = {
  x: number;
  y: number;
  title: string;
  lines: Array<string | CursorHintLine>;
} | null;

function asHintLine(line: string | CursorHintLine): CursorHintLine {
  return typeof line === 'string' ? { text: line } : line;
}

/** Keep the probe readout next to the cursor, never off-screen. */
export function placeCursorHint(
  x: number,
  y: number,
  width: number,
  height: number,
  viewport: { w: number; h: number },
): { left: number; top: number } {
  const gap = 12;
  const pad = 8;
  let left = x + gap;
  let top = y - height - gap;
  if (left + width > viewport.w - pad) left = x - width - gap;
  if (left < pad) left = pad;
  if (top < pad) top = y + gap;
  if (top + height > viewport.h - pad) top = Math.max(pad, viewport.h - height - pad);
  return { left, top };
}

export function CursorFollowHint({ hint }: { hint: CursorHintState }) {
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ left: 0, top: 0, ready: false });

  useLayoutEffect(() => {
    if (!hint) {
      setBox((current) => (current.ready ? { ...current, ready: false } : current));
      return;
    }
    const node = ref.current;
    const width = node?.offsetWidth ?? 160;
    const height = node?.offsetHeight ?? 48;
    const placed = placeCursorHint(hint.x, hint.y, width, height, {
      w: window.innerWidth,
      h: window.innerHeight,
    });
    setBox({ ...placed, ready: true });
  }, [hint]);

  if (!hint || typeof document === 'undefined') return null;

  return createPortal(
    <div
      ref={ref}
      className="pointer-events-none fixed z-50"
      role="status"
      style={{ left: box.left, top: box.top, opacity: box.ready ? 1 : 0 }}
    >
      <ChartTooltipCard className="max-w-64 min-w-[9.5rem]">
        <p className="text-foreground text-[11px] font-medium">{hint.title}</p>
        {hint.lines.map((line, index) => {
          const item = asHintLine(line);
          return (
            <p
              key={`${item.text}-${index}`}
              className={cn(
                'text-data mt-0.5 flex items-center gap-1.5 text-xs font-semibold tabular-nums',
                item.textClassName ?? 'text-foreground',
              )}
            >
              {item.swatchClassName ? (
                <span
                  className={cn('size-1.5 shrink-0 rounded-full', item.swatchClassName)}
                  aria-hidden
                />
              ) : null}
              {item.text}
            </p>
          );
        })}
      </ChartTooltipCard>
    </div>,
    document.body,
  );
}
