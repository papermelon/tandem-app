import type { WrappedSnapshot } from "@/lib/caregiver-wrapped/types";

export function DurationCard({ snapshot }: { snapshot: WrappedSnapshot }) {
  const weeks = Math.max(1, Math.round(snapshot.totalDaysActive / 7));
  return (
    <div className="flex w-full flex-col text-center">
      <div className="text-xs font-semibold uppercase tracking-[0.3em] text-white/70">Days of service</div>

      <div className="mt-6 text-[7rem] font-black leading-none sm:text-[10rem]">
        {snapshot.totalDaysActive}
      </div>

      <p className="mt-6 text-balance text-lg text-white/90">
        You showed up for {snapshot.totalDaysActive} days — about {weeks} {weeks === 1 ? "week" : "weeks"} of being on call.
      </p>
      <p className="mt-3 text-balance text-sm text-white/60">
        That&apos;s how many times your alarm went off. (Or how many times you pretended to sleep.)
      </p>
    </div>
  );
}
