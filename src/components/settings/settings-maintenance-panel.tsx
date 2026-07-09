'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { RefreshCw, RotateCcw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';

async function clearBrowserCaches() {
  if (typeof window === 'undefined' || typeof caches === 'undefined') return;
  const keys = await caches.keys();
  await Promise.all(keys.map((key) => caches.delete(key)));
}

export function SettingsMaintenancePanel({
  variant = 'standalone',
}: {
  variant?: 'standalone' | 'embedded';
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [clearing, setClearing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  async function handleClearCache() {
    setClearing(true);
    try {
      queryClient.clear();
      await clearBrowserCaches();
      toast.success('Cache vidé', {
        description: 'Les caches locaux ont été supprimés. Les données seront rechargées.',
      });
      router.refresh();
    } catch (error) {
      toast.error('Impossible de vider le cache', {
        description: error instanceof Error ? error.message : 'Erreur inconnue.',
      });
    } finally {
      setClearing(false);
    }
  }

  async function handleReloadData() {
    setRefreshing(true);
    try {
      await queryClient.invalidateQueries();
      router.refresh();
      toast.success('Données rechargées', {
        description: 'Les requêtes principales ont été invalidées et seront refetch.',
      });
    } catch (error) {
      toast.error('Impossible de recharger les données', {
        description: error instanceof Error ? error.message : 'Erreur inconnue.',
      });
    } finally {
      setRefreshing(false);
    }
  }

  const actions = (
    <div className="flex flex-wrap gap-2">
      <Button
        disabled={refreshing}
        size="sm"
        type="button"
        variant="outline"
        onClick={handleClearCache}
      >
        <Trash2 className="size-4" />
        {clearing ? 'Vidage…' : 'Vider le cache'}
      </Button>
      <Button
        disabled={clearing}
        size="sm"
        type="button"
        variant="outline"
        onClick={handleReloadData}
      >
        {refreshing ? (
          <RotateCcw className="size-4 animate-spin" />
        ) : (
          <RefreshCw className="size-4" />
        )}
        {refreshing ? 'Rechargement…' : 'Recharger les données'}
      </Button>
    </div>
  );

  if (variant === 'embedded') {
    return actions;
  }

  return (
    <section className="space-y-3 rounded-2xl border px-4 py-4">
      <div>
        <p className="text-muted-foreground text-[11px] font-medium tracking-[0.15em] uppercase">
          Maintenance
        </p>
        <h2 className="mt-1 text-base font-semibold">Cache & synchronisation</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Vider les caches locaux ou forcer un rechargement propre des données de
          l&apos;application.
        </p>
      </div>

      {actions}
    </section>
  );
}
