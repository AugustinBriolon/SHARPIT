'use client';

import { AlertTriangle, Scale } from 'lucide-react';
import { useMemo } from 'react';
import {
  CorpsDisclaimer,
  CorpsEmptyState,
  CorpsPanel,
  CorpsSectionHeader,
} from '@/components/corps/corps-ui';
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

  const bmiDisplay = latest?.bmi ?? bmi.latest;
  const metabolicAgeDisplay = latest?.metabolicAge ?? latest?.bodyAge;

  if (query.isLoading) {
    return <CompositionSkeleton />;
  }

  const empty = entries.length === 0;

  return (
    <div className="space-y-4">
      <CorpsDisclaimer icon={AlertTriangle} title="Lecture indicative, pas une mesure médicale">
        Les balances à impédancemétrie (Withings, Renpho…) estiment la composition à partir du
        courant électrique : utile pour suivre les <em>tendances</em>, mais plusieurs études
        montrent un écart notable avec la référence DEXA — surtout sur la masse grasse, la masse
        maigre et la graisse viscérale. Hydratation, repas récents, heure de pesée et posture
        influencent aussi le résultat.
      </CorpsDisclaimer>

      {empty ? (
        <CorpsEmptyState
          description="Connecte Withings ou Renpho dans les réglages pour synchroniser ta balance."
          icon={Scale}
          title="Aucune mesure importée"
        />
      ) : (
        <>
          <CorpsPanel>
            <CorpsSectionHeader
              label="Dernière pesée"
              title={
                latest
                  ? new Date(latest.measuredAt).toLocaleString('fr-FR', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })
                  : '—'
              }
            />
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
          </CorpsPanel>

          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <RecoveryStat
              label="IMC"
              tone="neutral"
              value={bmiDisplay != null ? `${bmiDisplay}` : '—'}
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
              value={metabolicAgeDisplay != null ? `${metabolicAgeDisplay} ans` : '—'}
            />
          </section>

          {(latest?.vascularAgeYears != null ||
            latest?.nerveHealthScore != null ||
            latest?.pulseWaveVelocity != null ||
            latest?.skinConductance != null ||
            latest?.vo2Max != null) && (
            <CorpsPanel>
              <CorpsSectionHeader
                description="Métriques avancées Body Scan (Withings)."
                label="Cardio & nerveux"
                title="Signaux Withings"
              />
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {latest.vascularAgeYears != null && (
                  <RecoveryStat
                    label="Âge vasculaire"
                    tone="neutral"
                    value={`${latest.vascularAgeYears} ans`}
                  />
                )}
                {latest.pulseWaveVelocity != null && (
                  <RecoveryStat
                    label="Vitesse d'onde de pouls"
                    tone="neutral"
                    value={`${latest.pulseWaveVelocity.toFixed(1)} m/s`}
                  />
                )}
                {latest.nerveHealthScore != null && (
                  <RecoveryStat
                    label="Santé nerveuse (pieds)"
                    tone="neutral"
                    value={`${Math.round(latest.nerveHealthScore)}`}
                  />
                )}
                {latest.nerveResponseScore != null && (
                  <RecoveryStat
                    label="Score réponse nerveuse"
                    tone="neutral"
                    value={`${Math.round(latest.nerveResponseScore)}`}
                  />
                )}
                {latest.skinConductance != null && (
                  <RecoveryStat
                    label="Conductance cutanée (ESC)"
                    tone="neutral"
                    value={`${latest.skinConductance.toFixed(0)}`}
                  />
                )}
                {latest.vo2Max != null && (
                  <RecoveryStat
                    label="VO₂ max estimé"
                    tone="neutral"
                    value={`${latest.vo2Max.toFixed(1)} ml/kg/min`}
                  />
                )}
                {latest.heartRate != null && (
                  <RecoveryStat
                    label="FC debout"
                    tone="neutral"
                    value={`${latest.heartRate} bpm`}
                  />
                )}
              </div>
            </CorpsPanel>
          )}

          <section className="space-y-3">
            <CorpsSectionHeader
              description="Une mesure par jour (la plus récente). Les variations jour à jour peuvent refléter le bruit de mesure autant qu'un vrai changement corporel."
              label="Tendances"
              title="90 jours"
            />
            <div className="grid gap-3 md:grid-cols-2">
              <MetricLineChart
                color="#2563eb"
                data={series}
                dataKey="weightKg"
                subtitle="Pesées balance"
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
                subtitle="Indice viscéral"
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
    <div className="space-y-4">
      <Skeleton className="h-20 w-full rounded-2xl" />
      <Skeleton className="h-40 w-full rounded-2xl" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-56 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
