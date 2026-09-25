import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import type { SessionsCoachAction } from '@/components/planning/coach-menu';

export function handleSessionsCoachAction(
  action: SessionsCoachAction,
  handlers: {
    onGenerate: () => void;
    onAdapt: () => void;
    /** @deprecated unused — kept so call sites can pass a router without breakage. */
    router?: AppRouterInstance;
  },
) {
  switch (action) {
    case 'generate':
      handlers.onGenerate();
      break;
    case 'adapt':
      handlers.onAdapt();
      break;
  }
}
