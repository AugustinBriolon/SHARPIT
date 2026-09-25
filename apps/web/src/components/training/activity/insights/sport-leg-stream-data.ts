import type { ActivityAnalysis } from '@/lib/activity/detail/activity-analysis';
import type { MultisportLegStream } from '@/lib/streams/streams';

function splitsFromAnalysis(analysis: ActivityAnalysis) {
  return {
    hrZones: analysis.hr.zones,
    powerZones: analysis.power?.zones ?? [],
    runSplits: analysis.run?.splits ?? [],
    bikeSplits: analysis.bike?.splits ?? [],
  };
}

export function deriveSportLegStreamData(stream: MultisportLegStream['stream']) {
  const { has, analysis } = stream;
  if (!analysis) {
    return { has, analysis: null, hrZones: [], powerZones: [], runSplits: [], bikeSplits: [] };
  }
  return { has, analysis, ...splitsFromAnalysis(analysis) };
}
