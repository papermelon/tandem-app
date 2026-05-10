"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, ClipboardList, Home, Inbox, LineChart, MessageCircle, Mic, MoreHorizontal, Stethoscope, Upload } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { useCareData } from "@/components/providers/care-data-provider";
import { cn } from "@/lib/utils";

const primaryNav = [
  { href: "/dashboard", label: "Hub", icon: Home },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/tasks", label: "Tasks", icon: ClipboardList },
  { href: "/handover", label: "Health", icon: Stethoscope },
  { href: "/settings", label: "More", icon: MoreHorizontal }
];

const secondaryNav = [
  { href: "/timeline", label: "Timeline", icon: MessageCircle },
  { href: "/capture", label: "Add paperwork", icon: Upload },
  { href: "/meeting", label: "Meeting", icon: Mic },
  { href: "/load", label: "Care load", icon: LineChart }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { recipient } = useCareData();

  if (
    pathname?.startsWith("/wrapped") ||
    pathname?.startsWith("/auth") ||
    pathname === "/" ||
    pathname?.startsWith("/home") ||
    pathname?.startsWith("/handover") ||
    pathname?.startsWith("/settings")
  ) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl">
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r bg-white/55 p-5 backdrop-blur lg:block">
          <Link href="/dashboard" className="flex items-center gap-3">
            <Image
              src="/tandem-mark.png"
              alt="Tandem logo"
              width={44}
              height={44}
              className="size-11 rounded-2xl object-contain"
              priority
            />
            <div>
              <div className="text-lg font-bold">Tandem</div>
              <div className="text-xs text-muted-foreground">Care Moves Better in Tandem</div>
            </div>
          </Link>

          <nav className="mt-8 space-y-2">
            {[...primaryNav.slice(0, 4), ...secondaryNav, primaryNav[4]].map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold text-muted-foreground transition-colors hover:bg-white hover:text-foreground",
                    active && "bg-white text-foreground shadow-sm"
                  )}
                >
                  <Icon className="size-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="safe-bottom w-full px-4 py-4 pb-24 sm:px-6 lg:px-8 lg:py-8">
          <header className="mb-4 flex items-center justify-between lg:hidden">
            <Link href="/dashboard" className="flex items-center gap-2">
              <Image
                src="/tandem-mark.png"
                alt="Tandem logo"
                width={40}
                height={40}
                className="size-10 rounded-2xl object-contain"
                priority
              />
              <div>
                <div className="text-base font-bold">Tandem</div>
                <div className="text-xs text-muted-foreground">{recipient.name}&apos;s care space</div>
              </div>
            </Link>
            <button className="grid size-10 place-items-center rounded-full border bg-white/80 text-muted-foreground shadow-sm" aria-label="Notifications">
              <Bell className="size-4" />
            </button>
          </header>

          <div className="mb-4 flex gap-2 overflow-x-auto pb-1 lg:hidden">
            {secondaryNav.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex shrink-0 items-center gap-2 rounded-full border bg-white/70 px-3 py-2 text-xs font-semibold text-muted-foreground",
                    active && "border-primary/30 bg-primary/10 text-primary"
                  )}
                >
                  <Icon className="size-3.5" />
                  {item.label}
                </Link>
              );
            })}
          </div>

          <div className="mb-4 rounded-2xl border bg-white/70 px-3 py-2 text-xs leading-5 text-muted-foreground backdrop-blur">
            <Badge variant="secondary" className="mr-2">Safety note</Badge>
            Tandem helps families coordinate care. It does not provide medical advice; medication items are reminders and notes.
          </div>

          {children}
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t bg-white/92 px-2 pb-[env(safe-area-inset-bottom)] pt-2 shadow-[0_-10px_30px_rgba(37,33,28,0.08)] backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
          {primaryNav.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || (item.href === "/settings" && secondaryNav.some((nav) => nav.href === pathname));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2 text-[11px] font-semibold text-muted-foreground",
                  active && "bg-primary/10 text-primary"
                )}
              >
                <Icon className="size-5" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
