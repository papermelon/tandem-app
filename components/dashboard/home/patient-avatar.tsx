import { cn } from "@/lib/utils";
import type { CareRecipient } from "@/lib/types";

type Props = {
  patient: Pick<CareRecipient, "name" | "avatar">;
  size?: "sm" | "md" | "lg";
  extraCount?: number;
  onClick?: () => void;
  className?: string;
};

const sizeClasses = {
  sm: "size-9 text-sm",
  md: "size-12 text-base",
  lg: "size-16 text-lg",
};

export function PatientAvatar({ patient, size = "md", extraCount, onClick, className }: Props) {
  const initials = patient.name.slice(0, 1).toUpperCase();
  const Wrapper = onClick ? "button" : "div";

  return (
    <Wrapper
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn("relative inline-flex flex-col items-center gap-1", className)}
      aria-label={patient.name}
    >
      <span
        className={cn(
          "grid place-items-center overflow-hidden rounded-full bg-primary/15 font-bold text-primary",
          sizeClasses[size],
        )}
      >
        {patient.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={patient.avatar} alt={patient.name} className="size-full object-cover" />
        ) : (
          initials
        )}
      </span>
      {extraCount && extraCount > 0 ? (
        <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-foreground text-[10px] font-bold text-background">
          +{extraCount}
        </span>
      ) : null}
      <span className="text-xs font-semibold text-muted-foreground">{patient.name}</span>
    </Wrapper>
  );
}
