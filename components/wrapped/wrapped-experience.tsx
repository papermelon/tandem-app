"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, ChevronLeft, X } from "lucide-react";

import { computeWrappedSnapshot } from "@/lib/caregiver-wrapped/compute";
import type { WrappedSnapshot } from "@/lib/caregiver-wrapped/types";
import { useCareData } from "@/components/providers/care-data-provider";
import { cn } from "@/lib/utils";
import { WrappedBackground } from "@/components/wrapped/background/wrapped-background";
import { SCENES } from "@/components/wrapped/background/scenes";
import { CoverCard } from "@/components/wrapped/cards/cover-card";
import { DurationCard } from "@/components/wrapped/cards/duration-card";
import { TasksCard } from "@/components/wrapped/cards/tasks-card";
import { CriticalMomentsCard } from "@/components/wrapped/cards/critical-moments-card";
import { ComparisonsCard } from "@/components/wrapped/cards/comparisons-card";
import { KeyMomentsCard } from "@/components/wrapped/cards/key-moments-card";
import { ThankYouCard } from "@/components/wrapped/cards/thank-you-card";

type Props = {
  memberId: string;
  seed?: number;
};

export function WrappedExperience({ memberId, seed }: Props) {
  const data = useCareData();
  const router = useRouter();
  const snapshot = React.useMemo<WrappedSnapshot | null>(
    () => computeWrappedSnapshot(data, memberId, { seed }),
    [data, memberId, seed]
  );

  const closableSessions = (data.handoverSessions ?? []).filter(
    (session) =>
      session.departingCaregiverId === memberId &&
      session.status === "completed" &&
      !session.archivedAt
  );

  const onEndHandover = closableSessions.length > 0
    ? () => {
        const archivedAt = new Date().toISOString();
        for (const session of closableSessions) {
          data.updateHandoverSession(session.id, { archivedAt });
        }
        router.push("/handover");
      }
    : undefined;

  const [index, setIndex] = React.useState(0);
  const cardCount = 7;

  const next = React.useCallback(() => setIndex((i) => Math.min(i + 1, cardCount - 1)), []);
  const prev = React.useCallback(() => setIndex((i) => Math.max(i - 1, 0)), []);

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        next();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        prev();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev]);

  const touchStart = React.useRef<number | null>(null);
  function onTouchStart(e: React.TouchEvent) {
    touchStart.current = e.touches[0].clientX;
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchStart.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStart.current;
    if (Math.abs(delta) > 40) {
      if (delta < 0) next();
      else prev();
    }
    touchStart.current = null;
  }

  if (!snapshot) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-950 p-8 text-center text-white">
        <div>
          <div className="text-2xl font-bold">Hmm — we couldn&apos;t find that caregiver.</div>
          <p className="mt-3 text-sm text-white/70">The wrap may have been removed, or the link is incomplete.</p>
          <Link href="/settings" className="mt-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20">
            <ChevronLeft className="size-4" />
            Back to settings
          </Link>
        </div>
      </div>
    );
  }

  const scene = SCENES[index % SCENES.length];

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col overflow-hidden text-white"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <WrappedBackground scene={scene} />
      <div className="relative z-10 flex flex-1 flex-col">
      <header className="flex items-center justify-between px-5 pt-6 sm:px-10">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">
          Caregiver Wrapped
        </div>
        <Link
          href="/settings"
          aria-label="Close"
          className="grid size-9 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
        >
          <X className="size-4" />
        </Link>
      </header>

      <div className="mx-auto mt-2 flex w-full max-w-md items-center gap-1.5 px-5 sm:max-w-xl sm:px-10">
        {Array.from({ length: cardCount }).map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={`Go to card ${i + 1}`}
            className={cn(
              "h-1 flex-1 rounded-full bg-white/20 transition-all",
              i < index && "bg-white/60",
              i === index && "bg-white"
            )}
          />
        ))}
      </div>

      <main className="flex-1 overflow-y-auto px-5 py-6 sm:px-10 sm:py-10">
        <div className="mx-auto flex h-full max-w-xl items-center justify-center">
          <CardSwitch
            index={index}
            snapshot={snapshot}
            onShare={next}
            onRestart={() => setIndex(0)}
            onEndHandover={onEndHandover}
          />
        </div>
      </main>

      <footer className="flex items-center justify-between gap-3 px-5 pb-[max(env(safe-area-inset-bottom),1.25rem)] pt-3 sm:px-10">
        <button
          type="button"
          onClick={prev}
          disabled={index === 0}
          className="grid size-11 place-items-center rounded-full bg-white/10 text-white transition-all hover:bg-white/20 disabled:opacity-30"
          aria-label="Previous card"
        >
          <ArrowLeft className="size-5" />
        </button>
        <div className="text-xs font-semibold tracking-wide text-white/70">
          {index + 1} / {cardCount}
        </div>
        <button
          type="button"
          onClick={next}
          disabled={index === cardCount - 1}
          className="grid size-11 place-items-center rounded-full bg-white/10 text-white transition-all hover:bg-white/20 disabled:opacity-30"
          aria-label="Next card"
        >
          <ArrowRight className="size-5" />
        </button>
      </footer>
      </div>
    </div>
  );
}

function CardSwitch({
  index,
  snapshot,
  onShare,
  onRestart,
  onEndHandover
}: {
  index: number;
  snapshot: WrappedSnapshot;
  onShare: () => void;
  onRestart: () => void;
  onEndHandover?: () => void;
}) {
  switch (index) {
    case 0:
      return <CoverCard snapshot={snapshot} />;
    case 1:
      return <DurationCard snapshot={snapshot} />;
    case 2:
      return <TasksCard snapshot={snapshot} />;
    case 3:
      return <CriticalMomentsCard snapshot={snapshot} />;
    case 4:
      return <ComparisonsCard snapshot={snapshot} />;
    case 5:
      return <KeyMomentsCard snapshot={snapshot} />;
    case 6:
    default:
      return (
        <ThankYouCard
          snapshot={snapshot}
          onShare={onShare}
          onRestart={onRestart}
          onEndHandover={onEndHandover}
        />
      );
  }
}
