"use client";

import { Apple, HeartPulse, Info, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { CareProfile } from "@/lib/types";

type Props = {
  profile?: CareProfile;
  compact?: boolean;
  className?: string;
};

const sectionIcons = [Apple, ShieldCheck, HeartPulse, Info];

export function CareProfileSummary({ profile, compact = false, className }: Props) {
  if (!profile || !Array.isArray(profile.sections) || profile.sections.length === 0) return null;

  return (
    <section className={cn("space-y-3", className)} aria-label="Care profile summary">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-bold">Care profile</div>
          {profile.summary ? (
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{profile.summary}</p>
          ) : null}
        </div>
        <Badge variant="secondary" className="shrink-0">
          Reference
        </Badge>
      </div>

      <div className={cn("grid gap-2", compact ? "grid-cols-1" : "sm:grid-cols-2")}>
        {profile.sections.map((section, index) => {
          const Icon = sectionIcons[index % sectionIcons.length];

          return (
            <div key={`${section.label}-${section.value}`} className="rounded-xl border bg-white/70 p-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Icon className="size-3.5 text-primary" />
                {section.label}
              </div>
              <div className="mt-1 text-sm font-bold leading-5">{section.value}</div>
              {section.notes?.length ? (
                <ul className="mt-2 space-y-1 text-xs leading-5 text-muted-foreground">
                  {section.notes.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          );
        })}
      </div>

      {profile.updatedAt ? (
        <div className="text-[11px] font-medium text-muted-foreground">
          Last reviewed {profile.updatedAt}
        </div>
      ) : null}
    </section>
  );
}
