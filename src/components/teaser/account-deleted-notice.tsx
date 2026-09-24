'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { toast } from '@/components/ui/toast';

/** Confirms, on the teaser, the deletion that just signed the athlete out. */
export function AccountDeletedNotice() {
  const deleted = useSearchParams().get('compte') === 'supprime';

  useEffect(() => {
    if (deleted) {
      toast.success('Ton compte a été supprimé. Tu peux en créer un nouveau quand tu veux.');
    }
  }, [deleted]);

  return null;
}
