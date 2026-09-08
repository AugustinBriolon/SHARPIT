'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { AccessTier } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/toast';

const TIER_LABEL: Record<AccessTier, string> = {
  FREE: 'Gratuit',
  PRO: 'Pro',
};

export function AthleteTierToggle({ athleteId, tier }: { athleteId: string; tier: AccessTier }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const nextTier: AccessTier = tier === 'PRO' ? 'FREE' : 'PRO';

  function toggle() {
    startTransition(async () => {
      try {
        const response = await fetch(`/api/admin/athletes/${athleteId}/tier`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tier: nextTier }),
        });
        if (!response.ok) {
          throw new Error();
        }
        toast.success(`Palier changé pour ${TIER_LABEL[nextTier]}`);
        router.refresh();
      } catch {
        toast.error('Changement de palier impossible');
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Badge variant={tier === 'PRO' ? 'highlight' : 'outline'}>{TIER_LABEL[tier]}</Badge>
      <Button disabled={isPending} size="sm" variant="ghost" onClick={toggle}>
        Passer en {TIER_LABEL[nextTier]}
      </Button>
    </div>
  );
}
