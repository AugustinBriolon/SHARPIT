import Link from 'next/link';
import { CalendarCheck, ChevronRight } from 'lucide-react';
import { activityTypeLabels, formatDate } from '@/lib/format';
import {
  parseSessionAnalysis,
  plannedSessionHref,
  SESSION_VERDICT_LABELS,
  sessionScoreColor,
} from '@/lib/session-analysis-display';
import { cn } from '@/lib/utils';
import type { ActivityType } from '@prisma/client';
import { ActivityMetaChip } from '@/components/training/activity-detail/activity-meta-chip';

export type PlannedSessionSummary = {
  id: string;
  title: string | null;
  date: Date;
  type: ActivityType;
  analysis: unknown;
};

export function PlannedSessionLinkCard({
  plannedSession,
  variant = 'card',
}: {
  plannedSession: PlannedSessionSummary | undefined;
  variant?: 'card' | 'inline';
}) {
  if (!plannedSession) return null;

  const analysis = parseSessionAnalysis(plannedSession.analysis);
  const label = plannedSession.title ?? activityTypeLabels[plannedSession.type];
  const href = plannedSessionHref(plannedSession.id);

  if (variant === 'inline') {
    return (
      <ActivityMetaChip
        href={href}
        icon={CalendarCheck}
        label="Planifiée"
        value={analysis ? `${analysis.complianceScore}/100` : '—'}
      />
    );
  }

  return (
    <Link
      className="border-border bg-card hover:border-primary/30 hover:bg-muted/20 group block rounded-2xl border p-4 transition-colors"
      href={href}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-muted-foreground flex items-center gap-1.5 text-[11px] font-medium tracking-wider uppercase">
            <CalendarCheck className="size-3.5" />
            Séance programmée
          </p>
          <p className="mt-1 font-medium">{label}</p>
          <p className="text-muted-foreground mt-0.5 text-sm">
            {formatDate(new Date(plannedSession.date))}
          </p>
        </div>
        {analysis ? (
          <div className="text-right">
            <p
              className={cn(
                'font-mono text-2xl font-semibold tabular-nums',
                sessionScoreColor(analysis.complianceScore),
              )}
            >
              {analysis.complianceScore}
            </p>
            <p className="text-muted-foreground text-xs">/100</p>
            <p className="bg-muted/60 mt-1 rounded-full px-2 py-0.5 text-[10px] font-medium">
              {SESSION_VERDICT_LABELS[analysis.verdict]}
            </p>
          </div>
        ) : (
          <ChevronRight className="text-muted-foreground size-4 shrink-0 opacity-60 group-hover:opacity-100" />
        )}
      </div>
      {analysis?.summary && (
        <p className="text-muted-foreground mt-3 line-clamp-2 text-sm">{analysis.summary}</p>
      )}
      <p className="text-primary mt-3 text-xs font-medium group-hover:underline">
        Voir le détail planifié
      </p>
    </Link>
  );
}
