import { NextResponse } from "next/server";

import { persistHandover } from "@/lib/supabase/mutations";
import type { Handover } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { handover } = (await request.json()) as { handover?: Handover };
    if (!handover) {
      return NextResponse.json({ error: "Missing handover payload" }, { status: 400 });
    }

    const persisted = await persistHandover(handover);
    return NextResponse.json({ persisted });
  } catch {
    return NextResponse.json({ error: "Could not persist handover" }, { status: 500 });
  }
}
