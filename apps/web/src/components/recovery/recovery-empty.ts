import type { RecoveryViewModel } from '@/core/presentation/recovery-view-model';

const DEFAULT_EMPTY = {
  description: 'Données de récupération indisponibles.',
  title: 'Récupération indisponible',
} as const;

export function resolveRecoveryEmpty(viewModel: RecoveryViewModel | null | undefined) {
  if (viewModel && !viewModel.emptyState) {
    return null;
  }
  const empty = viewModel?.emptyState;
  return {
    description: empty?.description ?? DEFAULT_EMPTY.description,
    title: empty?.title ?? DEFAULT_EMPTY.title,
  };
}
