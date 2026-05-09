import { cn } from "@/lib/utils";

export function MemberAvatar({
  avatar,
  name,
  className
}: {
  avatar: string;
  name: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-bold text-primary",
        className
      )}
      title={name}
      aria-label={name}
    >
      {avatar}
    </div>
  );
}
