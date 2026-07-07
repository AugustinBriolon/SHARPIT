import type { getActivityById } from '@/lib/queries';

export type ActivityDetail = NonNullable<Awaited<ReturnType<typeof getActivityById>>>;

export type ActivityStat = { label: string; value: string };

export type ActivitySpec = { label: string; value: string | number };

export type ChipTone = 'neutral' | 'emerald' | 'amber' | 'orange' | 'red';
