import { NextResponse } from "next/server";

import { listCaptureEvents, listCaptureEventsByIds } from "@/lib/captures";
import { getErrorMessage } from "@/lib/error-message";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || "pending_review";
  const captureId = searchParams.get("capture");

  try {
    const captures = captureId ? await listCaptureEventsByIds([captureId]) : await listCaptureEvents(status);
    return NextResponse.json({ captures });
  } catch (error) {
    console.error("Failed to load capture events", error);
    return NextResponse.json({ captures: [], error: getErrorMessage(error, "Could not load captures.") }, { status: 500 });
  }
}
