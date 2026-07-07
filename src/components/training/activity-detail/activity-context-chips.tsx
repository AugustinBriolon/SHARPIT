import type { ReactNode } from 'react';
import { CloudSun, Gauge, Smile } from 'lucide-react';
import { rpeTone } from './activity-detail-helpers';
import { ActivityMetaChip } from './activity-meta-chip';
import type { ActivityDetail } from './types';

export function ActivityContextChips({ activity }: { activity: ActivityDetail }) {
  const chips: ReactNode[] = [];

  if (activity.rpe != null) {
    chips.push(
      <ActivityMetaChip
        key="rpe"
        icon={Gauge}
        label="RPE"
        tone={rpeTone(activity.rpe)}
        value={`${activity.rpe}/10`}
      />,
    );
  }
  if (activity.feeling) {
    chips.push(
      <ActivityMetaChip key="feeling" icon={Smile} label="Ressenti" value={activity.feeling} />,
    );
  }
  if (activity.weather) {
    chips.push(
      <ActivityMetaChip key="weather" icon={CloudSun} label="Météo" value={activity.weather} />,
    );
  }

  if (chips.length === 0) return null;
  return <>{chips}</>;
}
