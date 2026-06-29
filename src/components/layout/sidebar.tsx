"use client";

import { UserButton, useUser } from "@clerk/nextjs";
import {
  Activity,
  BarChart3,
  BookOpen,
  Calendar,
  ClipboardList,
  Dumbbell,
  FlaskConical,
  HeartPulse,
  LayoutDashboard,
  PersonStanding,
  Settings,
  Sparkles,
  Target,
  Utensils,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { clerkAppearance } from "@/lib/clerk-appearance";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, active: true },
  { href: "/training", label: "Training", icon: Dumbbell, active: true },
  { href: "/analytics", label: "Analytics", icon: BarChart3, active: true },
  { href: "/recovery", label: "Recovery", icon: HeartPulse, active: true },
  { href: "/body", label: "Corps", icon: PersonStanding, active: true },
  { href: "/nutrition", label: "Nutrition", icon: Utensils, active: false },
  { href: "/knowledge", label: "Knowledge", icon: BookOpen, active: false },
  { href: "/goals", label: "Goals", icon: Target, active: true },
  { href: "/calendar", label: "Calendar", icon: Calendar, active: true },
  { href: "/coach", label: "Coach IA", icon: Sparkles, active: true },
  { href: "/testing", label: "Testing", icon: FlaskConical, active: false },
  { href: "/planning", label: "Planning", icon: ClipboardList, active: true },
  { href: "/settings", label: "Settings", icon: Settings, active: true },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useUser();

  return (
    <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r border-border bg-sidebar">
      <div className="border-b border-border/60 px-5 py-6">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/30">
            <Activity className="size-4 text-primary" />
          </div>
          <div>
            <p className="font-heading text-sm font-semibold tracking-wide">
              SharpIt
            </p>
            <p className="text-xs text-muted-foreground">Training intelligence</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.active ? item.href : "#"}
              aria-disabled={!item.active}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : item.active
                    ? "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                    : "cursor-not-allowed text-muted-foreground/40",
              )}
            >
              <item.icon className="size-4 shrink-0" />
              <span>{item.label}</span>
              {!item.active && (
                <span className="ml-auto text-[10px] uppercase tracking-wider text-muted-foreground/50">
                  soon
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center gap-3 border-t border-border/60 px-4 py-4">
        <UserButton
          appearance={{
            ...clerkAppearance,
            elements: {
              ...clerkAppearance.elements,
              avatarBox: "size-8 ring-1 ring-border",
            },
          }}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">
            {user?.fullName ?? user?.firstName ?? "Mon compte"}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {user?.primaryEmailAddress?.emailAddress ?? ""}
          </p>
        </div>
      </div>
    </aside>
  );
}
