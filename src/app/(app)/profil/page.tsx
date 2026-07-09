import { redirect } from 'next/navigation';

export default async function ProfilPage() {
  redirect('/settings/account');
}
