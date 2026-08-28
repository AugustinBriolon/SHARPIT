import { ActivityType } from '@prisma/client';
import type { HeroActivity } from '@/components/training/activity/detail/activity-hero-stats';
import { buildBikeHeroSlots } from '@/components/training/activity/detail/activity-hero-bike-slots';
import { buildHikeHeroSlots } from '@/components/training/activity/detail/activity-hero-hike-slots';
import {
  buildRunHeroSlots,
  type HeroStatSlot,
} from '@/components/training/activity/detail/activity-hero-run-slots';
import { buildSwimHeroSlots } from '@/components/training/activity/detail/activity-hero-swim-slots';

type StreamStats = {
  avgHr: number | null;
  avgSpeed: number | null;
  totalDistance: number | null;
  totalAscent: number | null;
};

export type { HeroStatSlot };

export function buildHeroStatSlots(
  activity: HeroActivity,
  stream: StreamStats | null,
): HeroStatSlot[] {
  switch (activity.type) {
    case ActivityType.RUN:
      return buildRunHeroSlots(activity, stream);
    case ActivityType.BIKE:
      return buildBikeHeroSlots(activity, stream);
    case ActivityType.SWIM:
      return buildSwimHeroSlots(activity, stream);
    case ActivityType.HIKE:
      return buildHikeHeroSlots(activity, stream);
    default:
      return [];
  }
}
