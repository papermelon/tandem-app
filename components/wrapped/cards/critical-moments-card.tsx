import type { WrappedSnapshot } from "@/lib/caregiver-wrapped/types";

export function CriticalMomentsCard({ snapshot }: { snapshot: WrappedSnapshot }) {
  return (
    <div className="flex w-full flex-col">
      <div className="text-xs font-semibold uppercase tracking-[0.3em] text-white/70">Critical moments</div>
      <div className="mt-2 text-3xl font-black sm:text-4xl">You were there for the hard days.</div>

      <ul className="mt-8 space-y-3">
        {snapshot.criticalMoments.map((moment, i) => (
          <li key={i} className="flex items-center gap-4 rounded-2xl bg-white/10 p-4">
            <div className="text-3xl">{moment.emoji}</div>
            <div className="flex-1">
              <div className="text-2xl font-black leading-none">{moment.count}</div>
              <div className="mt-1 text-sm text-white/80">{moment.label}</div>
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-8 text-balance text-base text-white/80">
        You showed up when it mattered.
      </p>
    </div>
  );
}
