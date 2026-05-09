import { NextResponse } from "next/server";

import { ignoreCapture } from "@/lib/captures";

export const runtime = "nodejs";

export async function POST(_request: Request, { params }: { params: Promise<{ captureId: string }> }) {
  const { captureId } = await params;

  try {
    await ignoreCapture(captureId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Could not ignore capture." },
      { status: 500 }
    );
  }
}
