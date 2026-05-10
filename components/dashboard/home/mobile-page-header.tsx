"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, type LucideIcon } from "lucide-react";

type Props = {
  title: string;
  icon?: LucideIcon;
  /** Optional hard fallback target if there's no browser history to go back to. */
  backHref?: string;
};

export function MobilePageHeader({ title, icon: Icon, backHref }: Props) {
  const router = useRouter();
  const [canGoBack, setCanGoBack] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    setCanGoBack(window.history.length > 1);
  }, []);

  const goBack = React.useCallback(() => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    if (backHref) {
      router.push(backHref);
    }
  }, [router, backHref]);

  // SSR-safe: render a Link when we know we can't go back; otherwise a button.
  // While `canGoBack` is null (pre-hydration) render the button so click still works post-hydration.
  const showLinkFallback = canGoBack === false && backHref;

  return (
    <header className="flex items-center gap-2 py-3">
      {showLinkFallback ? (
        <Link
          href={backHref}
          aria-label="Back"
          className="grid size-9 place-items-center rounded-full hover:bg-muted"
        >
          <ChevronLeft className="size-5" />
        </Link>
      ) : (
        <button
          type="button"
          onClick={goBack}
          aria-label="Back"
          className="grid size-9 place-items-center rounded-full hover:bg-muted"
        >
          <ChevronLeft className="size-5" />
        </button>
      )}
      <div className="flex flex-1 items-center justify-center gap-2">
        {Icon ? <Icon className="size-4 text-primary" /> : null}
        <h1 className="text-base font-bold">{title}</h1>
      </div>
      <span className="size-9" aria-hidden="true" />
    </header>
  );
}
