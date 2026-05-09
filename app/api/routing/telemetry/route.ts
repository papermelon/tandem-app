import { NextResponse } from "next/server";

import { CARE_CIRCLE_ID } from "@/lib/captures";
import { createSupabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

type DecisionRow = {
  id: string;
  chosen_member_id: string | null;
  auto_executed: boolean;
  accepted: boolean | null;
  reassigned_within_4h: boolean | null;
  decided_at: string;
  resolved_at: string | null;
};

export async function GET() {
  const supabase = createSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ telemetry: emptyTelemetry(), mode: "mock" });
  }

  const { data, error } = await supabase
    .from("routing_decisions")
    .select("id, chosen_member_id, auto_executed, accepted, reassigned_within_4h, decided_at, resolved_at")
    .eq("care_circle_id", CARE_CIRCLE_ID)
    .order("decided_at", { ascending: false })
    .limit(500);

  if (error) {
    return NextResponse.json({ telemetry: emptyTelemetry(), error: error.message }, { status: 500 });
  }

  return NextResponse.json({ telemetry: summarize((data ?? []) as DecisionRow[]) });
}

function summarize(rows: DecisionRow[]) {
  const total = rows.length;
  const resolved = rows.filter((r) => r.accepted !== null);
  const accepted = resolved.filter((r) => r.accepted === true).length;
  const reassigned = resolved.filter((r) => r.reassigned_within_4h === true).length;
  const autoExecuted = rows.filter((r) => r.auto_executed).length;

  const claimDurations = resolved
    .filter((r) => r.resolved_at)
    .map((r) => (Date.parse(r.resolved_at!) - Date.parse(r.decided_at)) / 60_000)
    .filter((m) => Number.isFinite(m) && m >= 0)
    .sort((a, b) => a - b);

  const medianMinutes = claimDurations.length
    ? claimDurations[Math.floor(claimDurations.length / 2)]
    : null;

  return {
    total,
    resolved: resolved.length,
    autoExecuted,
    acceptanceRate: resolved.length > 0 ? accepted / resolved.length : null,
    reassignmentRate: resolved.length > 0 ? reassigned / resolved.length : null,
    medianTimeToClaimMinutes: medianMinutes
  };
}

function emptyTelemetry() {
  return {
    total: 0,
    resolved: 0,
    autoExecuted: 0,
    acceptanceRate: null,
    reassignmentRate: null,
    medianTimeToClaimMinutes: null
  };
}
