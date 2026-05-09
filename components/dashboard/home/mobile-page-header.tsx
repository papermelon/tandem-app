"use client";

import Link from "next/link";
import { ChevronLeft, type LucideIcon } from "lucide-react";

type Props = {
  title: string;
  icon?: LucideIcon;
  backHref?: string;
};

export function MobilePageHeader({ title, icon: Icon, backHref = "/" }: Props) {
  return (
    <header className="flex items-center gap-2 py-3">
      <Link
        href={backHref}
        aria-label="Back"
        className="grid size-9 place-items-center rounded-full hover:bg-muted"
      >
        <ChevronLeft className="size-5" />
      </Link>
      <div className="flex flex-1 items-center justify-center gap-2">
        {Icon ? <Icon className="size-4 text-primary" /> : null}
        <h1 className="text-base font-bold">{title}</h1>
      </div>
      <span className="size-9" aria-hidden="true" />
    </header>
  );
}
