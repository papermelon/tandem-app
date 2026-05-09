import type { WrappedSnapshot } from "@/lib/caregiver-wrapped/types";

function formatYearRange(startIso: string, endIso: string) {
  const startYear = new Date(startIso).getFullYear();
  const endYear = new Date(endIso).getFullYear();
  if (Number.isNaN(startYear)) return "";
  return startYear === endYear ? `${startYear}` : `${startYear}–${endYear}`;
}

export function CoverCard({ snapshot }: { snapshot: WrappedSnapshot }) {
  const yearRange = formatYearRange(snapshot.serviceStart, snapshot.serviceEnd);
  return (
    <div className="flex w-full flex-col items-center text-center">
      <div className="text-xs font-semibold uppercase tracking-[0.3em] text-white/70">Caregiver Wrapped</div>
      <div className="mt-2 text-base font-semibold text-white/80">{yearRange}</div>

      <div className="mt-12 text-balance text-5xl font-black leading-tight sm:text-6xl">
        Thank you,
        <br />
        {snapshot.memberName} <span aria-hidden>❤️</span>
      </div>

      <p className="mt-8 max-w-sm text-balance text-base text-white/80 sm:text-lg">
        Your Tandem care journey for {snapshot.recipientName} — in numbers, moments, and gratitude.
      </p>

      <div className="mt-12 text-xs font-semibold tracking-widest text-white/60">
        Tap → or swipe to begin
      </div>
    </div>
  );
}
