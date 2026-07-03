import Image from 'next/image';
import { cn } from '@/lib/utils';
import type { IntegrationId } from '@/lib/integrations/client-sync';

const LOGO_PATHS: Record<IntegrationId, string> = {
  strava: '/images/strava.png',
  garmin: '/images/garmin.png',
  withings: '/images/withings.png',
  renpho: '/images/renpho.png',
  google: '/images/googleagenda.png',
};

export function IntegrationLogo({ id, className }: { id: IntegrationId; className?: string }) {
  return (
    <Image
      alt=""
      className={cn('size-10 rounded-xl object-contain', className)}
      height={40}
      src={LOGO_PATHS[id]}
      width={40}
    />
  );
}
