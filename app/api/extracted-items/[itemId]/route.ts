import { NextResponse } from "next/server";

import { updateExtractedItem } from "@/lib/captures";

export const runtime = "nodejs";

export async function PATCH(request: Request, { params }: { params: Promise<{ itemId: string }> }) {
  const { itemId } = await params;
  const body = (await request.json()) as {
    patch?: Parameters<typeof updateExtractedItem>[1];
  };

  try {
    await updateExtractedItem(itemId, body.patch ?? {});
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Could not update item." },
      { status: 500 }
    );
  }
}
