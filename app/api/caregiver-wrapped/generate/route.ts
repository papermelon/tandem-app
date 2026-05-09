import { NextResponse } from "next/server";

import { computeWrappedSnapshot } from "@/lib/caregiver-wrapped/compute";
import { createSeedData } from "@/lib/seed-data";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: { memberId?: string; seed?: number } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const memberId = body.memberId?.trim();
  if (!memberId) {
    return NextResponse.json({ error: "memberId is required" }, { status: 400 });
  }

  const data = createSeedData();
  const snapshot = computeWrappedSnapshot(data, memberId, { seed: body.seed });

  if (!snapshot) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  const viewUrl = `/wrapped/${memberId}?seed=${snapshot.seed}`;
  return NextResponse.json({ snapshot, viewUrl });
}
