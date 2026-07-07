import { CorpsPanel, CorpsSectionHeader, CorpsStatCard } from '@/components/corps/corps-ui';
import { buildFormView } from '@/lib/recovery';
import type { PmcPoint } from '@/lib/analytics';
import { Gauge } from 'lucide-react';
import { cn } from '@/lib/utils';

const TONE_TEXT = {
  good: 'text-emerald-600',
  moderate: 'text-amber-600',
  low: 'text-red-600',
  neutral: 'text-muted-foreground',
} as const;

/** Bannière de synthèse forme — même logique que le dashboard. */
export function FormStatusBanner({ pmc }: { pmc: PmcPoint[] }) {
  const form = buildFormView(pmc);

  return (
    <CorpsPanel
      className={cn(
        'bg-linear-to-br to-transparent',
        form.tone === 'good' && 'border-emerald-500/25 from-emerald-500/8',
        form.tone === 'moderate' && 'border-amber-500/25 from-amber-500/8',
        form.tone === 'low' && 'border-red-500/25 from-red-500/8',
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
        <span className="bg-primary/10 grid size-10 shrink-0 place-items-center rounded-full">
          <Gauge className="text-primary size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-muted-foreground text-[11px] font-medium tracking-[0.15em] uppercase">
            État de forme actuel
          </p>
          <p className={cn('mt-1 text-lg font-semibold', TONE_TEXT[form.tone])}>
            {form.label}
            {form.tsb != null && (
              <span className="text-foreground ml-2 text-base font-normal tabular-nums">
                TSB {form.tsb > 0 ? '+' : ''}
                {form.tsb}
              </span>
            )}
          </p>
          {form.description && (
            <p className="text-muted-foreground mt-1 text-xs leading-relaxed">{form.description}</p>
          )}
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
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
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
      description={`Top 5 par catégorie sur ${totalActivities} séances (${streamsAnalyzed} avec données détaillées).`}
      label="Records"
      title="Meilleures performances"
    />
  );
}
