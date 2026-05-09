import type { WrappedSnapshot } from "@/lib/caregiver-wrapped/types";

function formatYearRange(startIso: string, endIso: string) {
  const startYear = new Date(startIso).getFullYear();
  const endYear = new Date(endIso).getFullYear();
  if (Number.isNaN(startYear)) return "";
  return startYear === endYear ? `${startYear}` : `${startYear}–${endYear}`;
}

function TandemLogo() {
  return (
    <svg viewBox="0 0 100 100" className="mx-auto mb-6 h-16 w-16" xmlns="http://www.w3.org/2000/svg">
      {/* Stylized Tandem logo: two figures holding hands */}
      <circle cx="35" cy="25" r="8" fill="currentColor" className="text-teal-300" />
      <circle cx="65" cy="30" r="7" fill="currentColor" className="text-orange-300" />
      {/* Teal figure */}
      <path d="M 35 33 Q 35 45 30 55 M 35 33 Q 35 45 40 55" stroke="currentColor" strokeWidth="3.5" fill="none" className="text-teal-400" strokeLinecap="round" />
      <path d="M 25 40 L 45 40" stroke="currentColor" strokeWidth="3.5" className="text-teal-400" strokeLinecap="round" />
      {/* Orange figure */}
      <path d="M 65 37 Q 65 48 60 58 M 65 37 Q 65 48 70 58" stroke="currentColor" strokeWidth="3.5" fill="none" className="text-orange-400" strokeLinecap="round" />
      <path d="M 55 45 L 75 45" stroke="currentColor" strokeWidth="3.5" className="text-orange-400" strokeLinecap="round" />
      {/* Connection: hands together */}
      <circle cx="50" cy="42" r="2.5" fill="white" opacity="0.9" />
    </svg>
  );
}

export function CoverCard({ snapshot }: { snapshot: WrappedSnapshot }) {
  const yearRange = formatYearRange(snapshot.serviceStart, snapshot.serviceEnd);
  return (
    <div className="flex w-full flex-col items-center text-center">
      <TandemLogo />
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
