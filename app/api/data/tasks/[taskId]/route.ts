import { NextResponse } from "next/server";

import { updatePersistedTask } from "@/lib/supabase/mutations";
import type { Task } from "@/lib/types";

export const runtime = "nodejs";

export async function PATCH(request: Request, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    const { taskId } = await params;
    const { patch } = (await request.json()) as { patch?: Partial<Task> };
    if (!patch) {
      return NextResponse.json({ error: "Missing task patch" }, { status: 400 });
    }

    const persisted = await updatePersistedTask(taskId, patch);
    return NextResponse.json({ persisted });
  } catch {
    return NextResponse.json({ error: "Could not update task" }, { status: 500 });
  }
}
