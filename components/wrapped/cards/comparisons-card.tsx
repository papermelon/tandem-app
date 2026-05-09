import type { WrappedSnapshot } from "@/lib/caregiver-wrapped/types";

export function ComparisonsCard({ snapshot }: { snapshot: WrappedSnapshot }) {
  const featured = snapshot.comparisons[0];
  const rest = snapshot.comparisons.slice(1, 3);

  if (!featured) {
    return (
      <div className="flex w-full flex-col text-center">
        <div className="text-xs font-semibold uppercase tracking-[0.3em] text-white/70">Your stats</div>
        <p className="mt-12 text-2xl font-bold">Quiet care, big impact.</p>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col">
      <div className="text-xs font-semibold uppercase tracking-[0.3em] text-white/70">By the numbers</div>

      <div className="mt-6 rounded-3xl bg-white/10 p-6">
        <div className="text-5xl">{featured.emoji}</div>
        <div className="mt-3 text-balance text-2xl font-black leading-tight sm:text-3xl">
          {featured.headline}
        </div>
        <ul className="mt-5 space-y-2 text-sm text-white/85">
          {featured.bullets.map((bullet, i) => (
            <li key={i} className="leading-relaxed">{bullet}</li>
          ))}
        </ul>
        {featured.closer ? (
          <p className="mt-5 text-balance text-sm font-semibold text-white">{featured.closer}</p>
        ) : null}
      </div>

      {rest.length > 0 ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {rest.map((c) => (
            <div key={c.id} className="rounded-2xl bg-white/10 p-4">
              <div className="text-2xl">{c.emoji}</div>
              <div className="mt-2 text-base font-bold leading-snug">{c.headline}</div>
              {c.closer ? <p className="mt-2 text-xs text-white/70">{c.closer}</p> : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
