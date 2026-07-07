import { redirect } from 'next/navigation';

export default function AnalyticsPage() {
  redirect('/corps?tab=stats');
}
