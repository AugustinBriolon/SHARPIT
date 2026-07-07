import { redirect } from 'next/navigation';

export default function PlanningPage() {
  redirect('/seances?tab=planning');
}
