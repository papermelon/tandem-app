import { cn } from "@/lib/utils";

export function ProgressBar({
  value,
  className,
  indicatorClassName
}: {
  value: number;
  className?: string;
  indicatorClassName?: string;
}) {
  const width = Math.min(100, Math.max(0, value));

  return (
    <div className={cn("h-2 overflow-hidden rounded-full bg-muted", className)}>
      <div
        className={cn(
          "h-full rounded-full bg-primary transition-[width] duration-500 ease-out",
          indicatorClassName
        )}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}
