import { redirect } from 'next/navigation';

export default function CalendarPage() {
  redirect('/seances?tab=calendrier');
}
