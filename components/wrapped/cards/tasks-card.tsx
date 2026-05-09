import type { WrappedSnapshot } from "@/lib/caregiver-wrapped/types";

export function TasksCard({ snapshot }: { snapshot: WrappedSnapshot }) {
  return (
    <div className="flex w-full flex-col text-center">
      <div className="text-xs font-semibold uppercase tracking-[0.3em] text-white/70">Tasks completed</div>

      <div className="mt-6 text-[7rem] font-black leading-none sm:text-[10rem]">
        {snapshot.totalTasksDone}
      </div>

      <p className="mt-6 text-balance text-lg text-white/90">
        You claimed and closed out more tasks than a medieval baker had ovens.
      </p>

      <div className="mt-8 grid grid-cols-2 gap-3 text-left">
        <div className="rounded-2xl bg-white/10 p-4">
          <div className="text-2xl font-black">{snapshot.totalTasksClaimed}</div>
          <div className="mt-1 text-xs text-white/70">tasks claimed in total</div>
        </div>
        <div className="rounded-2xl bg-white/10 p-4">
          <div className="text-2xl font-black">{snapshot.averageTasksPerDay.toFixed(1)}</div>
          <div className="mt-1 text-xs text-white/70">avg per active day 🔥</div>
        </div>
      </div>
    </div>
  );
}
