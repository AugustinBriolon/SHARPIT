import type { PhysicalHealthViewModel } from '@/core/presentation/physical-health-view-model';
import { corpsToneFromPhysicalSeverity } from '@/lib/health/health-status';
import type { CorpsTone } from '@/lib/ui/metric-tone';

export function confidenceToneClass(tone: string): 'ok' | 'watch' | 'neutral' {
  if (tone === 'good') {
    return 'ok';
  }
  if (tone === 'warn') {
    return 'watch';
  }
  return 'neutral';
}

function capacityDisplayValue(
  loading: boolean,
  aggregate: PhysicalHealthViewModel['aggregate'],
): string {
  if (loading) {
    return '';
  }
  return aggregate.trainingBlocked ? 'Limitée' : 'OK';
}

function verdictDisplayValue(
  loading: boolean,
  aggregate: PhysicalHealthViewModel['aggregate'],
): string {
  if (loading) {
    return '';
  }
  if (aggregate.maxSeverity > 0) {
    return `${aggregate.maxSeverity.toFixed(1)}/10`;
  }
  return '—';
}

function activesDisplayTone(
  loading: boolean,
  aggregate: PhysicalHealthViewModel['aggregate'],
): CorpsTone {
  if (loading || aggregate.activeCount === 0) {
    return 'ok';
  }
  return corpsToneFromPhysicalSeverity(aggregate.maxSeverity);
}

function capacityDisplayTone(
  loading: boolean,
  aggregate: PhysicalHealthViewModel['aggregate'],
): CorpsTone {
  if (!loading && aggregate.trainingBlocked) {
    return 'attention';
  }
  return 'ok';
}

function verdictDisplayTone(
  loading: boolean,
  aggregate: PhysicalHealthViewModel['aggregate'],
): CorpsTone {
  if (!loading && aggregate.trainingBlocked) {
    return 'watch';
  }
  return 'neutral';
}

export function aggregateDisplayValues(
  loading: boolean,
  aggregate: PhysicalHealthViewModel['aggregate'],
) {
  return {
    capacityValue: capacityDisplayValue(loading, aggregate),
    verdictValue: verdictDisplayValue(loading, aggregate),
    activesTone: activesDisplayTone(loading, aggregate),
    capacityTone: capacityDisplayTone(loading, aggregate),
    verdictTone: verdictDisplayTone(loading, aggregate),
    confidenceTone: loading ? 'neutral' : confidenceToneClass(aggregate.confidenceTone),
  };
}
