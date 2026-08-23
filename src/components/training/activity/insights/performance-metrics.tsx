'use client';

import type { ActivityAnalysis } from '@/lib/activity/detail/activity-analysis';
import { ClinicalAnnotation } from '@/components/ui/instruments/clinical-annotation';
import { cn } from '@/lib/utils';
import Link from 'next/link';

type PerformanceRow = {
  label: string;
  value: string;
  note?: string;
};

function decouplingLabel(pct: number): string {
  if (pct < 5) return 'Excellent — peu de dérive cardiaque';
  if (pct < 10) return 'Correct pour une sortie longue';
  return "Dérive élevée — chaleur, fatigue ou manque d'endurance";
}

function intensityFactorSublabel(
  method: ActivityAnalysis['load']['method'],
  thresholds: ActivityAnalysis['thresholds'],
): string | undefined {
  if (method === 'power') {
    return thresholds.ftp ? `FTP ${thresholds.ftp} W` : undefined;
  }
  return thresholds.lthr ? `LTHR ${thresholds.lthr} bpm` : undefined;
}

export function PerformanceMetrics({ analysis }: { analysis: ActivityAnalysis }) {
  const { power, hr, load, thresholds } = analysis;
  const rows: PerformanceRow[] = [];

  if (power?.normalized)
    rows.push({
      label: 'NP',
      value: `${power.normalized} W`,
      note: power.avg ? `moy ${power.avg} W` : undefined,
    });
  if (load.intensityFactor != null)
    rows.push({
      label: 'IF',
      value: load.intensityFactor.toFixed(2),
      note: intensityFactorSublabel(load.method, thresholds),
    });
  if (power?.variabilityIndex != null)
    rows.push({
      label: 'VI',
      value: power.variabilityIndex.toFixed(2),
      note: power.variabilityIndex > 1.1 ? 'effort variable' : 'effort régulier',
    });
  if (load.tss != null)
    rows.push({
      label: load.method === 'hr' ? 'TSS (FC)' : 'TSS',
      value: String(load.tss),
    });
  if (hr.efficiencyFactor != null)
    rows.push({
      label: hr.efficiencyLabel,
      value: String(hr.efficiencyFactor),
    });
  if (hr.decouplingPct != null)
    rows.push({
      label: 'Découplage',
      value: `${hr.decouplingPct > 0 ? '+' : ''}${hr.decouplingPct}%`,
      note: decouplingLabel(Math.abs(hr.decouplingPct)),
    });
  if (analysis.run?.paceVariabilityPct != null)
    rows.push({
      label: 'Variabilité allure',
      value: `${analysis.run.paceVariabilityPct}%`,
      note: 'écart-type / moyenne',
    });

  if (!rows.length) return null;

  const compact = rows.length >= 6;

  return (
    <section className="analysis-panel rounded-analysis-lg px-5 pt-5 pb-2 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 className="text-label">Performance</h2>
        <p className="text-muted-foreground text-xs">
          Seuils {thresholds.source === 'profile' ? 'profil athlète' : 'estimés'}
        </p>
      </div>

      <div className="border-analysis-border/70 divide-analysis-border/60 mt-4 border-t">
        {rows.map((row) => (
          <div
            key={row.label}
            className={cn(
              'grid items-start gap-x-4 border-b last:border-b-0',
              compact
                ? 'grid-cols-[minmax(0,1fr)_auto] gap-y-1 py-3 last:pb-2'
                : 'grid-cols-[minmax(0,1fr)_auto] gap-y-1.5 py-3.5 last:pb-2 sm:grid-cols-[minmax(0,11rem)_1fr_auto]',
            )}
          >
            <div className="min-w-0">
              <p className="text-label">{row.label}</p>
              {row.note ? (
                <p className="text-muted-foreground mt-1 text-xs leading-snug sm:hidden">
                  {row.note}
                </p>
              ) : null}
            </div>

            {!compact ? (
              <div className="text-muted-foreground hidden min-w-0 text-xs leading-snug sm:block">
                {row.note ?? '—'}
              </div>
            ) : null}

            <p
              className={cn(
                'text-data text-foreground text-right font-semibold tabular-nums',
                compact ? 'text-base' : 'text-lg',
              )}
            >
              {row.value}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function ThresholdsHint({ analysis }: { analysis: ActivityAnalysis }) {
  const { thresholds } = analysis;
  if (thresholds.source === 'profile') return null;

  return (
    <ClinicalAnnotation title="Seuils estimés">
      Zones et IF/TSS s&apos;appuient ici sur des estimations. Pour les verrouiller, applique-les
      depuis{' '}
      <Link
        className="text-primary underline-offset-2 hover:underline"
        href="/settings/calibration"
      >
        Calibration
      </Link>{' '}
      ou ajuste-les dans{' '}
      <a className="text-primary underline-offset-2 hover:underline" href="/settings/account">
        Compte
      </a>
      .
      {thresholds.lthr && (
        <span className="text-data mt-1 block text-xs">
          LTHR estimé : {thresholds.lthr} bpm
          {thresholds.ftp ? ` · FTP estimé : ${thresholds.ftp} W` : ''}
        </span>
      )}
    </ClinicalAnnotation>
  );
}
