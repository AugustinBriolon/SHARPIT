import { DesktopShell } from './desktop-shell';
import { MobileShell } from './mobile-shell';

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <MobileShell>{children}</MobileShell>
      <DesktopShell>{children}</DesktopShell>
    </>
  );
}
