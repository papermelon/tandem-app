"use client";

import { usePathname } from "next/navigation";
import { Home, Settings, Stethoscope } from "lucide-react";

import { cn } from "@/lib/utils";

const items = [
  { href: "/", label: "Home", icon: Home, match: (p: string) => p === "/" || p.startsWith("/home") || p.startsWith("/capture") },
  { href: "/handover", label: "Health", icon: Stethoscope, match: (p: string) => p.startsWith("/handover") },
  { href: "/settings", label: "Settings", icon: Settings, match: (p: string) => p.startsWith("/settings") },
];

export function HomeNavbar() {
  const pathname = usePathname() ?? "";
  if (pathname.startsWith("/auth")) return null;

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-[100] border-t bg-white/90 backdrop-blur"
    >
      <ul className="mx-auto grid max-w-md grid-cols-3">
        {items.map((item) => {
          const Icon = item.icon;
          const active = item.match(pathname);
          return (
            <li key={item.href}>
              <button
                type="button"
                onClick={() => {
                  window.location.assign(item.href);
                }}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex w-full flex-col items-center gap-0.5 py-3 text-[10px] font-semibold",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className={cn("size-5", active && "stroke-[2.5]")} />
                {item.label}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
