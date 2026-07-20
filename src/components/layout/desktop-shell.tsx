import { Sidebar } from './sidebar';
import { OfflineBanner } from '@/components/pwa/offline-banner';
import { SyncingIndicator } from '@/components/ui/syncing-indicator';
import { PAGE_GUTTER } from '@/lib/page-gutter';

export function DesktopShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-background hidden h-dvh overflow-hidden lg:flex">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <OfflineBanner />
        <SyncingIndicator className="border-border/40 border-b" />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto p-6" style={{ ['--page-gutter' as string]: PAGE_GUTTER.desktop }}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
