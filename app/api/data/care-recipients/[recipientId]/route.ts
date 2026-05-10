import { NextResponse } from "next/server";

import { createSupabaseAdmin } from "@/lib/supabase/server";
import type { CareRecipient } from "@/lib/types";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ recipientId: string }> },
) {
  try {
    const supabase = createSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ persisted: false, mode: "mock" });
    }

    const { recipientId } = await params;
    const { patch } = (await request.json()) as { patch?: Partial<CareRecipient> };
    if (!patch) {
      return NextResponse.json({ error: "Missing care recipient patch" }, { status: 400 });
    }

    const row = Object.fromEntries(
      Object.entries({
        name: patch.name,
        age: patch.age,
        context: patch.context,
        address: patch.address,
        relationship: patch.relationship,
        country: patch.country,
        care_profile: patch.careProfile,
      }).filter(([, value]) => value !== undefined),
    );

    const { error } = await supabase
      .from("care_recipients")
      .update(row)
      .eq("id", recipientId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ persisted: true });
  } catch {
    return NextResponse.json({ error: "Could not update care recipient" }, { status: 500 });
  }
}
