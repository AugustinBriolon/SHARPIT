import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import type { SessionsCoachAction } from '@/components/coaching/coach-menu';

export function handleSessionsCoachAction(
  action: SessionsCoachAction,
  handlers: {
    router: AppRouterInstance;
    onPlan: () => void;
    onGenerate: () => void;
    onAdapt: () => void;
    onMacro: () => void;
    onWeekBrief: () => void;
  },
) {
  switch (action) {
    case 'plan':
      handlers.onPlan();
      break;
    case 'manual':
      handlers.router.push('/training/manual');
      break;
    case 'generate':
      handlers.onGenerate();
      break;
    case 'adapt':
      handlers.onAdapt();
      break;
    case 'macro':
      handlers.onMacro();
      break;
    case 'week-brief':
      handlers.onWeekBrief();
      break;
  }
}
