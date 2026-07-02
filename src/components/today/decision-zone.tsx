'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { KeyFinding, TopAction, LimitingFactor } from '@/hooks/use-today';

// ─────────────────────────────────────────────────────────────────────────────
// Why panel — key findings + explanation
// ─────────────────────────────────────────────────────────────────────────────

const SEVERITY_CLASS: Record<string, string> = {
  CRITICAL: 'text-red-600 dark:text-red-400',
  WARNING: 'text-amber-600 dark:text-amber-400',
  INFO: 'text-muted-foreground',
};

function WhyPanel({
  keyFindings,
  explanation,
}: {
  keyFindings: KeyFinding[];
  explanation: string;
}) {
  const [primary, ...rest] = keyFindings;
  const supporting = rest.slice(0, 3);

  return (
    <div className="bg-card/40 mt-3 space-y-3 rounded-xl border px-4 py-4">
      {primary && (
        <div>
          <p
            className={cn(
              'text-sm font-medium',
              SEVERITY_CLASS[primary.severity] ?? 'text-foreground',
            )}
          >
            {primary.title}
          </p>
          {primary.evidence.length > 0 && (
            <ul className="mt-1 space-y-0.5">
              {primary.evidence.map((e, i) => (
                <li
                  key={i}
                  className="text-muted-foreground text-xs before:mr-1.5 before:content-['·']"
                >
                  {e}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {supporting.length > 0 && (
        <ul className="space-y-1.5 border-t pt-3">
          {supporting.map((f) => (
            <li key={f.id} className="flex items-start gap-2">
              <span
                className={cn(
                  'mt-1 h-1.5 w-1.5 shrink-0 rounded-full',
                  f.severity === 'CRITICAL' && 'bg-red-500',
                  f.severity === 'WARNING' && 'bg-amber-500',
                  f.severity === 'INFO' && 'bg-muted-foreground',
                )}
              />
              <span className="text-muted-foreground text-xs leading-relaxed">{f.title}</span>
            </li>
          ))}
        </ul>
      )}

      {explanation && (
        <p className="text-muted-foreground border-t pt-3 text-xs leading-relaxed">{explanation}</p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Bottleneck panel — limiting factor
// ─────────────────────────────────────────────────────────────────────────────

const SYSTEM_LABEL: Record<string, string> = {
  RECOVERY: 'Recovery',
  FATIGUE: 'Fatigue',
  ADAPTATION: 'Adaptation',
};

function BottleneckPanel({ limitingFactor }: { limitingFactor: LimitingFactor }) {
  if (!limitingFactor.system && !limitingFactor.description) {
    return (
      <div className="bg-card/40 mt-3 rounded-xl border px-4 py-4">
        <p className="text-muted-foreground text-sm">
          No bottleneck detected — all systems balanced.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card/40 mt-3 space-y-2 rounded-xl border px-4 py-4">
      {limitingFactor.system && (
        <p className="text-muted-foreground text-[11px] font-medium tracking-[0.15em] uppercase">
          {SYSTEM_LABEL[limitingFactor.system] ?? limitingFactor.system}
        </p>
      )}
      {limitingFactor.description && (
        <p className="text-sm leading-relaxed">{limitingFactor.description}</p>
      )}
      {limitingFactor.actionable && (
        <p className="text-muted-foreground text-xs">
          Actionable — focus here for fastest progress.
        </p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Zone C — Decision
// ─────────────────────────────────────────────────────────────────────────────

interface DecisionZoneProps {
  topAction: TopAction;
  keyFindings: KeyFinding[];
  explanation: string;
  limitingFactor: LimitingFactor;
}

export function DecisionZone({
  topAction,
  keyFindings,
  explanation,
  limitingFactor,
}: DecisionZoneProps) {
  const [whyOpen, setWhyOpen] = useState(false);
  const [bottleneckOpen, setBottleneckOpen] = useState(false);
  const [done, setDone] = useState(false);

  return (
    <div className="space-y-2">
      <p className="text-muted-foreground px-1 text-[11px] font-medium tracking-[0.15em] uppercase">
        Today&apos;s recommendation
      </p>

      <div className="bg-card/60 space-y-4 rounded-2xl border px-5 py-5">
        {/* Action */}
        <div>
          <p className="text-lg leading-snug font-semibold">
            <span className="text-muted-foreground font-normal">{topAction.verb} </span>
            {topAction.focus}
          </p>
          {topAction.rationale && (
            <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
              {topAction.rationale}
            </p>
          )}
        </div>

        {/* Actions row */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            aria-expanded={whyOpen}
            type="button"
            className={cn(
              'rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors',
              'hover:bg-accent',
              whyOpen && 'bg-accent',
            )}
            onClick={() => {
              setWhyOpen((v) => !v);
              if (bottleneckOpen) setBottleneckOpen(false);
            }}
          >
            Why this?
          </button>

          <button
            aria-expanded={bottleneckOpen}
            type="button"
            className={cn(
              'rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors',
              'hover:bg-accent',
              bottleneckOpen && 'bg-accent',
            )}
            onClick={() => {
              setBottleneckOpen((v) => !v);
              if (whyOpen) setWhyOpen(false);
            }}
          >
            What&apos;s limiting me?
          </button>

          <button
            aria-pressed={done}
            type="button"
            className={cn(
              'ml-auto rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
              done
                ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                : 'hover:bg-accent border',
            )}
            onClick={() => setDone((v) => !v)}
          >
            {done ? 'Done ✓' : 'Mark done'}
          </button>
        </div>

        {/* Panels */}
        {whyOpen && <WhyPanel explanation={explanation} keyFindings={keyFindings} />}
        {bottleneckOpen && <BottleneckPanel limitingFactor={limitingFactor} />}
      </div>
    </div>
  );
}
