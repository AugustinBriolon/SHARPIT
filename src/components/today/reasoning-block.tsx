'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { resolve } from '@/lib/french';
import type { KeyFinding } from '@/hooks/use-today';

// ─────────────────────────────────────────────────────────────────────────────
// Severity indicator dot
// ─────────────────────────────────────────────────────────────────────────────

const SEVERITY_DOT: Record<string, string> = {
  CRITICAL: 'bg-red-500',
  WARNING: 'bg-amber-500',
  INFO: 'bg-muted-foreground/50',
};

const SEVERITY_TEXT: Record<string, string> = {
  CRITICAL: 'text-red-600 dark:text-red-400',
  WARNING: 'text-amber-600 dark:text-amber-400',
  INFO: 'text-foreground',
};

// ─────────────────────────────────────────────────────────────────────────────
// ReasoningBlock — Q2: Why?
// ─────────────────────────────────────────────────────────────────────────────

interface ReasoningBlockProps {
  keyFindings: KeyFinding[];
}

export function ReasoningBlock({ keyFindings }: ReasoningBlockProps) {
  const [expanded, setExpanded] = useState(false);

  const [primary, ...rest] = keyFindings;
  const supporting = rest.slice(0, 4);

  return (
    <div className="bg-card/60 space-y-3 rounded-2xl border px-5 py-5">
      <p className="text-muted-foreground text-[11px] font-medium tracking-[0.15em] uppercase">
        Pourquoi ?
      </p>

      {/* Primary finding */}
      {primary && (
        <div>
          <p
            className={cn(
              'text-sm leading-snug font-medium',
              SEVERITY_TEXT[primary.severity] ?? 'text-foreground',
            )}
          >
            {resolve(primary.title)}
          </p>
          {primary.evidenceItems.length > 0 && (
            <ul className="mt-1.5 space-y-0.5">
              {primary.evidenceItems.map((e, i) => (
                <li
                  key={i}
                  className="text-muted-foreground text-xs before:mr-1.5 before:content-['·']"
                >
                  {resolve(e)}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Expand toggle */}
      {supporting.length > 0 && (
        <button
          aria-expanded={expanded}
          className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs font-medium transition-colors"
          type="button"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? 'Réduire' : 'Plus de détails'}
          <span className={cn('transition-transform', expanded && 'rotate-180')} aria-hidden>
            ↓
          </span>
        </button>
      )}

      {/* Expanded: supporting findings */}
      {expanded && supporting.length > 0 && (
        <div className="space-y-3 border-t pt-3">
          <ul className="space-y-2">
            {supporting.map((f) => (
              <li key={f.id} className="flex items-start gap-2">
                <span
                  className={cn(
                    'mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full',
                    SEVERITY_DOT[f.severity],
                  )}
                />
                <span className="text-muted-foreground text-xs leading-relaxed">
                  {resolve(f.title)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
