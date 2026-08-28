'use client';

import { MapPin } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export function SportLegUnavailable({ label }: { label: string }) {
  return (
    <Card>
      <CardContent className="text-muted-foreground flex items-center gap-2 py-6 text-sm">
        <MapPin className="size-4" />
        Pas de capteurs détaillés pour {label.toLowerCase()}.
      </CardContent>
    </Card>
  );
}
