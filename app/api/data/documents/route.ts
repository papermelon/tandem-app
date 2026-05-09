import { NextResponse } from "next/server";

import { persistDocument } from "@/lib/supabase/mutations";
import type { DocumentRecord } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { document } = (await request.json()) as { document?: DocumentRecord };
    if (!document) {
      return NextResponse.json({ error: "Missing document payload" }, { status: 400 });
    }

    const persisted = await persistDocument(document);
    return NextResponse.json({ persisted });
  } catch {
    return NextResponse.json({ error: "Could not persist document" }, { status: 500 });
  }
}
