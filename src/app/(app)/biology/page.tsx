import { Suspense } from 'react';
import { CorpsHub } from '@/components/corps/corps-hub';

/** Suspense for `useSearchParams` only — no route/hub safety skeleton. */
export default function BiologyPage() {
  return (
    <Suspense>
      <CorpsHub basePath="/biology" />
    </Suspense>
  );
}
