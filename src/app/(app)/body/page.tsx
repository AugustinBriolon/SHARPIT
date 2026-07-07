import { redirect } from 'next/navigation';

export default function BodyPage() {
  redirect('/corps?tab=suivi');
}
