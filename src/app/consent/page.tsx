import { Suspense } from 'react';
import { ConsentWallForm } from '@/components/privacy/consent-wall-form';

export default function ConsentPage() {
  return (
    <Suspense fallback={null}>
      <ConsentWallForm />
    </Suspense>
  );
}
