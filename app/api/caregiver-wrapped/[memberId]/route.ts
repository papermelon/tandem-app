import { NextResponse } from "next/server";

import { computeWrappedSnapshot, hashString } from "@/lib/caregiver-wrapped/compute";
import { createSeedData } from "@/lib/seed-data";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ memberId: string }> }
) {
  const { memberId } = await context.params;
  const { searchParams } = new URL(request.url);
  const seedParam = searchParams.get("seed");
  const seed = seedParam ? Number.parseInt(seedParam, 10) || hashString(seedParam) : undefined;

  const data = createSeedData();
  const snapshot = computeWrappedSnapshot(data, memberId, { seed });

  if (!snapshot) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  return NextResponse.json({ snapshot });
}
