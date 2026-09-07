'use client';

import { ChevronDown } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

const READ_MAX_COLLAPSED_CLASS = 'max-h-40';
const READ_MAX_COLLAPSED_PX = 160;

function ContextReadParagraph({ empty, text }: { empty: boolean; text: string }) {
  if (empty) {
    return <p>{text}</p>;
  }
  return <p className="whitespace-pre-wrap">{text}</p>;
}

function ContextReadExpandButton({
  expanded,
  overflows,
  onToggle,
}: {
  expanded: boolean;
  overflows: boolean;
  onToggle: () => void;
}) {
  if (!overflows) {
    return null;
  }

  return (
    <button
      aria-expanded={expanded}
      className="text-muted-foreground hover:text-foreground mt-2 inline-flex items-center gap-1 text-xs font-medium"
      type="button"
      onClick={onToggle}
    >
      {expanded ? 'Réduire' : 'Voir plus'}
      <ChevronDown
        className={cn(
          'size-3.5 transition-transform duration-150 ease-out motion-reduce:transition-none',
          expanded && 'rotate-180',
        )}
        aria-hidden
      />
    </button>
  );
}

export function ContextReadClamp({
  text,
  empty,
  emptyHint,
}: {
  text: string;
  empty: boolean;
  emptyHint: string;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);

  useLayoutEffect(() => {
    const el = contentRef.current;
    if (!el) {
      return;
    }

    const measure = () => {
      setOverflows(el.scrollHeight > READ_MAX_COLLAPSED_PX + 1);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [text, empty]);

  useEffect(() => {
    setExpanded(false);
  }, [text]);

  const clamped = overflows && !expanded;
  const displayText = empty ? emptyHint : text;

  return (
    <div>
      <div className="relative">
        <div
          className={cn(
            'text-sm leading-relaxed',
            'transition-[max-height,opacity] duration-[250ms] ease-in-out motion-reduce:transition-none',
            empty ? 'text-muted-foreground italic' : 'text-foreground',
            clamped
              ? cn(
                  READ_MAX_COLLAPSED_CLASS,
                  'overflow-hidden',
                  '[mask-image:linear-gradient(to_bottom,black_0%,black_45%,transparent_100%)]',
                )
              : 'max-h-[min(80vh,48rem)]',
          )}
        >
          <div ref={contentRef}>
            <ContextReadParagraph empty={empty} text={displayText} />
          </div>
        </div>

        {clamped ? (
          <div
            className="from-chip-surface pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-linear-to-t to-transparent"
            aria-hidden
          />
        ) : null}
      </div>

      <ContextReadExpandButton
        expanded={expanded}
        overflows={overflows}
        onToggle={() => setExpanded((value) => !value)}
      />
    </div>
  );
}
