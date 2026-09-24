/**
 * Web-owned handoff steps for the native app (ADR-040) — one intention per page, no app
 * shell, no navigation: the athlete came from iOS and goes back to it.
 */
export default function ConnectLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-background flex min-h-dvh flex-col items-center px-4 py-8 sm:py-12">
      <main className="flex w-full max-w-sm flex-col gap-6">{children}</main>
    </div>
  );
}
