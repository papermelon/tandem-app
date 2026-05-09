import { Badge } from "@/components/ui/badge";
import { severityLabels } from "@/lib/labels";
import type { SignalSeverity } from "@/lib/types";

export function SignalPill({ severity }: { severity: SignalSeverity }) {
  const variant = severity === "alert" ? "alert" : severity === "watch" ? "warning" : "success";
  return <Badge variant={variant}>{severityLabels[severity]}</Badge>;
}
