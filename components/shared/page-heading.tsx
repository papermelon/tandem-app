import type { LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";

export function PageHeading({
  eyebrow,
  title,
  description,
  icon: Icon,
  badge
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  icon?: LucideIcon;
  badge?: string;
}) {
  return (
    <div className="mb-5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          {eyebrow ? <div className="mb-1 text-xs font-bold uppercase tracking-[0.14em] text-primary">{eyebrow}</div> : null}
          <h1 className="text-balance text-3xl font-bold tracking-normal text-foreground sm:text-4xl">{title}</h1>
        </div>
        {Icon ? (
          <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
            <Icon className="size-5" />
          </div>
        ) : null}
      </div>
      {description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p> : null}
      {badge ? <Badge className="mt-3">{badge}</Badge> : null}
    </div>
  );
}
