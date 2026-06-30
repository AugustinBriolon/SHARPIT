import { Card, CardContent } from '@/components/ui/card';
import { buildFormView } from '@/lib/recovery';
import type { PmcPoint } from '@/lib/analytics';
import { cn } from '@/lib/utils';
import { Activity, Gauge } from 'lucide-react';

const TONE_SURFACE = {
  good: 'border-emerald-500/30 from-emerald-500/10',
  moderate: 'border-amber-500/30 from-amber-500/10',
  low: 'border-red-500/30 from-red-500/10',
  neutral: 'border-border from-muted/40',
} as const;

const TONE_TEXT = {
  good: 'text-emerald-600',
  moderate: 'text-amber-600',
  low: 'text-red-600',
  neutral: 'text-muted-foreground',
} as const;

/** Bannière de synthèse forme — même logique que le dashboard. */
export function FormStatusBanner({ pmc }: { pmc: PmcPoint[] }) {
  const form = buildFormView(pmc);
  const surface = TONE_SURFACE[form.tone];

  return (
    <Card className={cn('bg-linear-to-br to-transparent', surface)}>
      <CardContent className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:gap-5">
        <span className="bg-primary/10 grid size-11 shrink-0 place-items-center rounded-full">
          <Gauge className="text-primary size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-muted-foreground text-[11px] font-medium tracking-[0.2em] uppercase">
            État de forme actuel
          </p>
          <p className={cn('font-heading mt-1 text-xl font-semibold', TONE_TEXT[form.tone])}>
            {form.label}
            {form.tsb != null && (
              <span className="text-foreground ml-2 font-mono text-base font-normal tabular-nums">
                TSB {form.tsb > 0 ? '+' : ''}
                {form.tsb}
              </span>
            )}
          </p>
          {form.description && (
            <p className="text-foreground/80 mt-1 text-sm leading-relaxed">{form.description}</p>
          )}
        </div>
      </CardContent>
    </Card>
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
  return (
    <div className="border-border bg-card rounded-xl border p-4">
      <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">{label}</p>
      <p className="text-foreground mt-2 font-mono text-2xl font-semibold tabular-nums">{value}</p>
      {hint && <p className="text-muted-foreground mt-1 text-xs">{hint}</p>}
    </div>
  );
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
    <section className="space-y-4">
      <div>
        <h2 className="text-muted-foreground text-sm font-medium tracking-wider uppercase">
          {title}
        </h2>
        {description && <p className="text-muted-foreground mt-1 text-sm">{description}</p>}
      </div>
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
    <header className="flex flex-wrap items-start gap-4">
      <span className="bg-primary/10 grid size-11 shrink-0 place-items-center rounded-2xl">
        <Activity className="text-primary size-5" />
      </span>
      <div>
        <p className="text-primary text-xs font-medium tracking-[0.2em] uppercase">Records</p>
        <h2 className="font-heading mt-1 text-2xl font-semibold tracking-tight">
          Meilleures performances
        </h2>
        <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
          Top 5 par catégorie, calculé sur tes métriques et tes données GPS / puissance en cache.{' '}
          <span className="text-foreground/70 font-mono">
            {streamsAnalyzed} séance{streamsAnalyzed > 1 ? 's' : ''} avec données détaillées
          </span>{' '}
          sur {totalActivities} au total.
        </p>
      </div>
    </header>
  );
}
