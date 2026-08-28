'use client';

import type { ReactNode } from 'react';
import { CompositionSkeleton } from '@/components/corps/composition/composition-view-parts';
import { CompositionViewLoaded } from '@/components/corps/composition/composition-view-loaded';
import type { useCompositionView } from '@/components/corps/composition/use-composition-view';
import { CorpsDisclaimer, CorpsEmptyState } from '@/components/corps/corps-ui';
import { Scale } from 'lucide-react';

type CompositionVm = ReturnType<typeof useCompositionView>['vm'];

function CompositionViewEmpty({ vm }: { vm: CompositionVm }) {
  return (
    <div className="space-y-4">
      <CorpsEmptyState
        icon={Scale}
        title={vm?.emptyState?.title ?? 'Aucune mesure importée'}
        description={
          vm?.emptyState?.description ??
          'Connecte Withings ou Renpho dans les réglages pour synchroniser ta balance.'
        }
      />
      <CorpsDisclaimer title="Lecture indicative, pas une mesure médicale">
        Les balances estiment la composition via impédancemétrie : utile pour les <em>tendances</em>
        , pas comme référence médicale.
      </CorpsDisclaimer>
    </div>
  );
}

function compositionViewPhase(
  valuesLoading: boolean,
  vm: CompositionVm,
): 'loading' | 'empty' | 'skeleton' | 'loaded' {
  const hasData = Boolean(vm?.hasData);
  if (valuesLoading && !hasData) {
    return 'loading';
  }
  if (!valuesLoading && !hasData) {
    return 'empty';
  }
  if (!hasData) {
    return 'skeleton';
  }
  return 'loaded';
}

export function resolveCompositionViewBody(view: ReturnType<typeof useCompositionView>): ReactNode {
  const { valuesLoading, vm } = view;
  const phase = compositionViewPhase(valuesLoading, vm);

  if (phase === 'loading' || phase === 'skeleton') {
    return <CompositionSkeleton />;
  }

  if (phase === 'empty') {
    return <CompositionViewEmpty vm={vm} />;
  }

  return <CompositionViewLoaded {...view} vm={vm!} />;
}
