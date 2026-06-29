import { SignOutButton } from "@clerk/nextjs";
import { currentUser } from "@clerk/nextjs/server";
import { ShieldX } from "lucide-react";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { isAllowedUser } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Le proxy Clerk redirige déjà les visiteurs non connectés vers /sign-in.
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  if (!isAllowedUser(user)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10 ring-1 ring-destructive/30">
          <ShieldX className="size-6 text-destructive" />
        </div>
        <div>
          <h1 className="font-heading text-xl font-semibold">Accès refusé</h1>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Ce compte n&apos;est pas autorisé à accéder à cette application.
          </p>
        </div>
        <SignOutButton>
          <Button variant="outline">Se déconnecter</Button>
        </SignOutButton>
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}
