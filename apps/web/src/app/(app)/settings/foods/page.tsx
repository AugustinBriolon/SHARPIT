import { MobileBackLink } from '@/components/layout/header/mobile-back-link';
import { StickyHeader } from '@/components/layout/header/sticky-header';
import { OwnFoodsPanel } from '@/components/nutrition/food-log/own-foods-panel';

export default function SettingsFoodsPage() {
  return (
    <div className="space-y-4">
      <MobileBackLink fallbackHref="/moi" fallbackLabel="Réglages" showOnDesktop />
      <StickyHeader>
        <p className="text-label">Réglages</p>
        <h1 className="text-page-title mt-1">Mes aliments</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Les aliments que tu as créés : ils passent en premier dans tes recherches. Tes repas déjà
          notés gardent leurs valeurs quand tu en modifies un.
        </p>
      </StickyHeader>
      <OwnFoodsPanel />
    </div>
  );
}
