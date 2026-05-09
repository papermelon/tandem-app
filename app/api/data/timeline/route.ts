import { NextResponse } from "next/server";

import { persistTimelineItem } from "@/lib/supabase/mutations";
import type { TimelineItem } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { item } = (await request.json()) as { item?: TimelineItem };
    if (!item) {
      return NextResponse.json({ error: "Missing timeline item payload" }, { status: 400 });
    }

    const persisted = await persistTimelineItem(item);
    return NextResponse.json({ persisted });
  } catch {
    return NextResponse.json({ error: "Could not persist timeline item" }, { status: 500 });
  }
}
