import { Sidebar } from './sidebar';

export function DesktopShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-background hidden h-dvh overflow-hidden lg:flex">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto p-6">{children}</div>
      </main>
    </div>
  );
}
