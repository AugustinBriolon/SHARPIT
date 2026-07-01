'use client';

import { AlertTriangle } from 'lucide-react';
import { useMemo } from 'react';
import { MetricLineChart } from '@/components/recovery/health-charts';
import { RecoveryStat } from '@/components/recovery/recovery-panels';
import { Skeleton } from '@/components/ui/skeleton';
import {
  buildCompositionSeries,
  computeCompositionTrend,
  formatCompositionDelta,
} from '@/lib/body-composition';
import { useBodyComposition } from '@/hooks/use-data';

export function CompositionView({ embedded: _embedded = false }: { embedded?: boolean }) {
  const query = useBodyComposition();
  const entries = useMemo(() => query.data ?? [], [query.data]);

  const latest = useMemo(() => entries[0] ?? null, [entries]);
  const series = useMemo(() => buildCompositionSeries(entries, 90), [entries]);

  const weight = useMemo(() => computeCompositionTrend(entries, 'weightKg'), [entries]);
  const bodyFat = useMemo(() => computeCompositionTrend(entries, 'bodyFatPct'), [entries]);
  const muscle = useMemo(() => computeCompositionTrend(entries, 'musclePct'), [entries]);
  const visceral = useMemo(() => computeCompositionTrend(entries, 'visceralFat'), [entries]);
  const bmi = useMemo(() => computeCompositionTrend(entries, 'bmi'), [entries]);

  if (query.isLoading) {
    return <CompositionSkeleton />;
  }

  const empty = entries.length === 0;

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
        <div className="flex gap-3">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
          <div className="space-y-1 text-sm">
            <p className="font-medium text-amber-800 dark:text-amber-300">
              Lecture indicative, pas une mesure médicale
            </p>
            <p className="text-muted-foreground text-xs leading-relaxed">
              Les balances à impédancemétrie (dont Renpho) estiment la composition à partir du
              courant électrique : utile pour suivre les <em>tendances</em>, mais plusieurs études
              montrent un écart notable avec la référence DEXA — surtout sur la masse grasse, la
              masse maigre et la graisse viscérale. Hydratation, repas récents, heure de pesée et
              posture influencent aussi le résultat. Utilise ces chiffres comme un fil conducteur,
              pas comme une vérité absolue.
            </p>
          </div>
        </div>
      </div>

      {empty ? (
        <div className="border-border bg-card text-muted-foreground rounded-xl border p-8 text-center text-sm">
          <p className="text-foreground font-medium">Aucune mesure importée</p>
          <p className="mt-2">
            Connecte Renpho dans les réglages pour synchroniser ta balance et voir l&apos;historique
            ici.
          </p>
        </div>
      ) : (
        <>
          <section className="border-border bg-card rounded-2xl border p-6">
            <p className="text-muted-foreground text-xs font-medium tracking-[0.2em] uppercase">
              Dernière pesée
            </p>
            {latest && (
              <p className="text-muted-foreground mt-1 text-xs">
                {new Date(latest.measuredAt).toLocaleString('fr-FR', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </p>
            )}
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <RecoveryStat
                footer={formatCompositionDelta(weight.delta, ' kg')}
                label="Poids"
                tone="neutral"
                value={weight.latest != null ? `${weight.latest} kg` : '—'}
              />
              <RecoveryStat
                footer={formatCompositionDelta(bodyFat.delta, ' pts')}
                label="Masse grasse"
                tone="neutral"
                value={bodyFat.latest != null ? `${bodyFat.latest} %` : '—'}
              />
              <RecoveryStat
                footer={formatCompositionDelta(muscle.delta, ' pts')}
                label="Muscle"
                tone="neutral"
                value={muscle.latest != null ? `${muscle.latest} %` : '—'}
              />
              <RecoveryStat
                footer={formatCompositionDelta(visceral.delta, ' pts')}
                label="Graisse viscérale"
                tone="neutral"
                value={visceral.latest != null ? `${visceral.latest}` : '—'}
              />
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <RecoveryStat
              label="IMC"
              tone="neutral"
              value={bmi.latest != null ? `${bmi.latest}` : '—'}
            />
            <RecoveryStat
              label="Masse maigre"
              tone="neutral"
              value={
                latest?.fatFreeWeightKg != null ? `${latest.fatFreeWeightKg.toFixed(1)} kg` : '—'
              }
            />
            <RecoveryStat
              label="Eau corporelle"
              tone="neutral"
              value={latest?.waterPct != null ? `${latest.waterPct.toFixed(1)} %` : '—'}
            />
            <RecoveryStat
              label="Masse osseuse"
              tone="neutral"
              value={latest?.boneKg != null ? `${latest.boneKg.toFixed(2)} kg` : '—'}
            />
            <RecoveryStat
              label="Métabolisme basal"
              tone="neutral"
              value={latest?.bmr != null ? `${Math.round(latest.bmr)} kcal` : '—'}
            />
            <RecoveryStat
              label="Âge métabolique"
              tone="neutral"
              value={latest?.bodyAge != null ? `${latest.bodyAge} ans` : '—'}
            />
          </section>

          <section className="space-y-4">
            <h2 className="font-heading text-lg font-medium">Tendances — 90 jours</h2>
            <p className="text-muted-foreground text-xs">
              Une mesure par jour (la plus récente). Les variations jour à jour peuvent refléter le
              bruit de mesure autant qu&apos;un vrai changement corporel.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <MetricLineChart
                color="#2563eb"
                data={series}
                dataKey="weightKg"
                subtitle="Pesées Renpho"
                title="Poids"
                unit="kg"
              />
              <MetricLineChart
                color="#dc2626"
                data={series}
                dataKey="bodyFatPct"
                subtitle="Estimation impédancemétrie"
                title="Masse grasse"
                unit="%"
              />
              <MetricLineChart
                color="#16a34a"
                data={series}
                dataKey="musclePct"
                subtitle="Part du poids total"
                title="Muscle"
                unit="%"
              />
              <MetricLineChart
                color="#ea580c"
                data={series}
                dataKey="visceralFat"
                subtitle="Indice viscéral Renpho"
                title="Graisse viscérale"
              />
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function CompositionSkeleton() {
  return (
    <div className="space-y-8">
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-40 w-full" />
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-64" />
        ))}
      </div>
    </div>
  );
}
