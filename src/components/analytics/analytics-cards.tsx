import { CorpsPanel, CorpsSectionHeader, CorpsStatCard } from '@/components/corps/corps-ui';
import { buildFormView } from '@/lib/recovery/recovery';
import type { PmcPoint } from '@/lib/analytics';
import { Gauge } from 'lucide-react';
import { cn } from '@/lib/utils';

const TONE_TEXT = {
  good: 'text-primary',
  moderate: 'text-signal-caution',
  low: 'text-signal-risk',
  neutral: 'text-muted-foreground',
} as const;

/** Bannière de synthèse forme — même logique que le dashboard. */
export function FormStatusBanner({ pmc }: { pmc: PmcPoint[] }) {
  const form = buildFormView(pmc);

  return (
    <CorpsPanel
      className={cn(
        'px-4 py-3',
        form.tone === 'good' && 'border-primary/25 bg-primary/8',
        form.tone === 'moderate' && 'border-signal-caution/25 bg-signal-caution/8',
        form.tone === 'low' && 'border-signal-risk/25 bg-signal-risk/8',
      )}
    >
      <div className="flex items-center gap-3">
        <span className="icon-well size-8 rounded-full">
          <Gauge className="size-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-label">Forme actuelle</p>
          <p className={cn('text-base font-semibold', TONE_TEXT[form.tone])}>
            {form.label}
            {form.tsb != null && (
              <span className="text-foreground ml-1.5 text-sm font-normal tabular-nums">
                TSB {form.tsb > 0 ? '+' : ''}
                {form.tsb}
              </span>
            )}
          </p>
          {form.description ? (
            <p className="text-muted-foreground mt-0.5 text-[11px] leading-snug">
              {form.description}
            </p>
          ) : null}
        </div>
      </div>
    </CorpsPanel>
  );
}

/** Tuile de résumé analytics — valeurs neutres, labels explicites. */
export function AnalyticsStat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return <CorpsStatCard footer={hint} label={label} value={value} />;
}

/** En-tête de section avec titre + description pédagogique. */
export function AnalyticsSection({
  title,
  description,
  children,
  compact = false,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <section className={compact ? 'space-y-2' : 'space-y-3'}>
      <CorpsSectionHeader description={description} label="Analyse" title={title} />
      {children}
    </section>
  );
}

/** En-tête de page Records. */
export function RecordsSectionHeader({
  streamsAnalyzed,
  totalActivities,
}: {
  streamsAnalyzed: number;
  totalActivities: number;
}) {
  return (
    <CorpsSectionHeader
      description={`Performances observées — top 5 par catégorie sur ${totalActivities} séances (${streamsAnalyzed} avec données détaillées).`}
      label="Records"
      title="Meilleures performances"
    />
  );
}
