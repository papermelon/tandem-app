import { NextResponse } from "next/server";

import { createSupabaseAdmin, hasSupabaseServerEnv } from "@/lib/supabase/server";

export const runtime = "nodejs";

const TABLES = [
  "users",
  "care_circles",
  "care_recipients",
  "circle_members",
  "timeline_items",
  "tasks",
  "documents",
  "care_signals",
  "handovers"
];

function describeSupabaseUrl() {
  const value = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!value) {
    return { present: false, valid: false, origin: null, host: null };
  }

  try {
    const url = new URL(value);
    return { present: true, valid: true, origin: url.origin, host: url.hostname };
  } catch {
    return { present: true, valid: false, origin: null, host: null };
  }
}

export async function GET() {
  const env = {
    hasPublicUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    hasAnonKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    hasServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    hasSupabaseServerEnv: hasSupabaseServerEnv(),
    supabaseUrl: describeSupabaseUrl()
  };

  const supabase = createSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ env, connected: false, tables: [] }, { status: 200 });
  }

  const tables = await Promise.all(
    TABLES.map(async (table) => {
      const { count, error } = await supabase.from(table).select("*", { count: "exact", head: true });

      return {
        table,
        ok: !error,
        count,
        error: error?.message ?? null
      };
    })
  );

  const { data: recipient, error: recipientError } = await supabase
    .from("care_recipients")
    .select("id,name,relationship,country,care_profile")
    .limit(1)
    .maybeSingle();

  return NextResponse.json({
    env,
    connected: tables.some((table) => table.ok),
    tables,
    recipient: {
      ok: !recipientError,
      data: recipient
        ? {
            id: recipient.id,
            name: recipient.name,
            relationship: recipient.relationship,
            country: recipient.country,
            hasCareProfile: Boolean(recipient.care_profile)
          }
        : null,
      error: recipientError?.message ?? null
    }
  });
}
