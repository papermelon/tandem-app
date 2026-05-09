import { NextResponse } from "next/server";

import { persistTasks } from "@/lib/supabase/mutations";
import type { Task } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { tasks } = (await request.json()) as { tasks?: Task[] };
    if (!tasks?.length) {
      return NextResponse.json({ error: "Missing tasks payload" }, { status: 400 });
    }

    const persisted = await persistTasks(tasks);
    return NextResponse.json({ persisted });
  } catch {
    return NextResponse.json({ error: "Could not persist tasks" }, { status: 500 });
  }
}
