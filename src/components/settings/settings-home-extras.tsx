'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

export function SettingsHomeExtras() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleReload() {
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <button
      className="text-sm font-medium underline-offset-4 hover:underline disabled:opacity-50"
      disabled={isPending}
      type="button"
      onClick={handleReload}
    >
      {isPending ? 'Rechargement…' : 'Recharger les données'}
    </button>
  );
}
