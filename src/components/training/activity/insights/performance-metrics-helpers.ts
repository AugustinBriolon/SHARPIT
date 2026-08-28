import type { ActivityAnalysis } from '@/lib/activity/detail/activity-analysis';

export type PerformanceRow = {
  label: string;
  value: string;
  note?: string;
};

function decouplingLabel(pct: number): string {
  if (pct < 5) {
    return 'Excellent — peu de dérive cardiaque';
  }
  if (pct < 10) {
    return 'Correct pour une sortie longue';
  }
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

function pushPowerRows(rows: PerformanceRow[], analysis: ActivityAnalysis) {
  const { power, load, thresholds } = analysis;
  if (power?.normalized) {
    rows.push({
      label: 'NP',
      value: `${power.normalized} W`,
      note: power.avg ? `moy ${power.avg} W` : undefined,
    });
  }
  if (load.intensityFactor !== null) {
    rows.push({
      label: 'IF',
      value: load.intensityFactor.toFixed(2),
      note: intensityFactorSublabel(load.method, thresholds),
    });
  }
  if (power?.variabilityIndex !== null) {
    rows.push({
      label: 'VI',
      value: power.variabilityIndex.toFixed(2),
      note: power.variabilityIndex > 1.1 ? 'effort variable' : 'effort régulier',
    });
  }
}

function pushLoadRows(rows: PerformanceRow[], analysis: ActivityAnalysis) {
  const { load } = analysis;
  if (load.tss !== null) {
    rows.push({
      label: load.method === 'hr' ? 'TSS (FC)' : 'TSS',
      value: String(load.tss),
    });
  }
}

function pushHrRows(rows: PerformanceRow[], analysis: ActivityAnalysis) {
  const { hr } = analysis;
  if (hr.efficiencyFactor !== null) {
    rows.push({ label: hr.efficiencyLabel, value: String(hr.efficiencyFactor) });
  }
  if (hr.decouplingPct !== null) {
    rows.push({
      label: 'Découplage',
      value: `${hr.decouplingPct > 0 ? '+' : ''}${hr.decouplingPct}%`,
      note: decouplingLabel(Math.abs(hr.decouplingPct)),
    });
  }
}

export function buildPerformanceRows(analysis: ActivityAnalysis): PerformanceRow[] {
  const rows: PerformanceRow[] = [];
  pushPowerRows(rows, analysis);
  pushLoadRows(rows, analysis);
  pushHrRows(rows, analysis);
  if (analysis.run?.paceVariabilityPct !== null) {
    rows.push({
      label: 'Variabilité allure',
      value: `${analysis.run.paceVariabilityPct}%`,
      note: 'écart-type / moyenne',
    });
  }
  return rows;
}
