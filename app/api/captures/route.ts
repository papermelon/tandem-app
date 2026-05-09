import { NextResponse } from "next/server";

import { listCaptureEvents } from "@/lib/captures";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || "pending_review";

  try {
    const captures = await listCaptureEvents(status);
    return NextResponse.json({ captures });
  } catch (error) {
    return NextResponse.json(
      { captures: [], error: error instanceof Error ? error.message : "Could not load captures." },
      { status: 500 }
    );
  }
}
