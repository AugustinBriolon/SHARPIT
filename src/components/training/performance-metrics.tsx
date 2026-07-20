'use client';

import type { ActivityAnalysis } from '@/lib/activity-analysis';
import { MetricCard } from '@/components/ui/metric-card';
import { ClinicalAnnotation } from '@/components/ui/clinical-annotation';

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
  const cards: {
    label: string;
    value: string;
    sublabel?: string;
    accent?: 'primary' | 'orange' | 'default';
  }[] = [];

  if (power?.normalized)
    cards.push({
      label: 'NP',
      value: `${power.normalized} W`,
      sublabel: power.avg ? `moy ${power.avg} W` : undefined,
      accent: 'default',
    });
  if (load.intensityFactor != null)
    cards.push({
      label: 'IF',
      value: load.intensityFactor.toFixed(2),
      sublabel: intensityFactorSublabel(load.method, thresholds),
      accent: 'default',
    });
  if (power?.variabilityIndex != null)
    cards.push({
      label: 'VI',
      value: power.variabilityIndex.toFixed(2),
      sublabel: power.variabilityIndex > 1.1 ? 'effort variable' : 'effort régulier',
      accent: 'default',
    });
  if (load.tss != null)
    cards.push({
      label: load.method === 'hr' ? 'TSS (FC)' : 'TSS',
      value: String(load.tss),
      accent: 'default',
    });
  if (hr.efficiencyFactor != null)
    cards.push({
      label: hr.efficiencyLabel,
      value: String(hr.efficiencyFactor),
      accent: 'default',
    });
  if (hr.decouplingPct != null)
    cards.push({
      label: 'Découplage',
      value: `${hr.decouplingPct > 0 ? '+' : ''}${hr.decouplingPct}%`,
      sublabel: decouplingLabel(Math.abs(hr.decouplingPct)),
      accent: 'default',
    });
  if (analysis.run?.paceVariabilityPct != null)
    cards.push({
      label: 'Variabilité allure',
      value: `${analysis.run.paceVariabilityPct}%`,
      sublabel: 'écart-type / moyenne',
      accent: 'default',
    });

  if (!cards.length) return null;

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 className="text-label">Performance</h2>
        <p className="text-muted-foreground text-xs">
          Seuils {thresholds.source === 'profile' ? 'profil athlète' : 'estimés'}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {cards.map((c) => (
          <MetricCard key={c.label} {...c} />
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
      Renseigne ton FTP, LTHR et allure seuil dans{' '}
      <a className="text-primary underline-offset-2 hover:underline" href="/profil">
        Profil
      </a>{' '}
      pour des zones et un IF/TSS précis.
      {thresholds.lthr && (
        <span className="text-data mt-1 block text-xs">
          LTHR estimé : {thresholds.lthr} bpm
          {thresholds.ftp ? ` · FTP estimé : ${thresholds.ftp} W` : ''}
        </span>
      )}
    </ClinicalAnnotation>
  );
}
