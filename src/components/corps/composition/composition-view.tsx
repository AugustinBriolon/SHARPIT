'use client';

import { resolveCompositionViewBody } from '@/components/corps/composition/composition-view-body';
import { useCompositionView } from '@/components/corps/composition/use-composition-view';

export function CompositionView({ embedded: _embedded = false }: { embedded?: boolean }) {
  const view = useCompositionView();
  return resolveCompositionViewBody(view);
}
