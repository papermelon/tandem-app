import { formatDay } from "@/lib/date";
import type { WrappedSnapshot } from "@/lib/caregiver-wrapped/types";

export function KeyMomentsCard({ snapshot }: { snapshot: WrappedSnapshot }) {
  if (snapshot.keyMoments.length === 0) {
    return (
      <div className="flex w-full flex-col text-center">
        <div className="text-xs font-semibold uppercase tracking-[0.3em] text-white/70">Highlight moments</div>
        <p className="mt-12 text-balance text-2xl font-bold">
          Some of the most important caregiving never makes the timeline.
        </p>
        <p className="mt-4 text-sm text-white/70">You did that work too.</p>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col">
      <div className="text-xs font-semibold uppercase tracking-[0.3em] text-white/70">{snapshot.keyMomentsTitle}</div>
      <div className="mt-2 text-3xl font-black sm:text-4xl">Moments we remember.</div>

      <ul className="mt-6 space-y-4">
        {snapshot.keyMoments.map((moment) => (
          <li key={moment.id} className="rounded-2xl bg-white/10 p-4">
            <div className="flex items-center gap-3 text-sm font-semibold text-white/70">
              <span className="text-lg">{moment.emoji}</span>
              <span>{formatDay(moment.date)}</span>
            </div>
            <div className="mt-2 text-base font-bold leading-snug">{moment.title}</div>
            <p className="mt-1 text-sm leading-relaxed text-white/80">{moment.description}</p>
            {moment.closer ? (
              <p className="mt-2 text-xs italic text-white/70">{moment.closer}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
