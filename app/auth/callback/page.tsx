"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [message, setMessage] = React.useState("Signing you in.");

  React.useEffect(() => {
    let cancelled = false;

    async function finish() {
      const supabase = createBrowserSupabaseClient();
      if (!supabase) {
        setMessage("Supabase is not configured for this deployment.");
        return;
      }

      const code = params.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          setMessage(error.message);
          return;
        }
      }

      if (!cancelled) {
        router.replace("/");
      }
    }

    void finish();

    return () => {
      cancelled = true;
    };
  }, [params, router]);

  return (
    <main className="grid min-h-screen place-items-center bg-background px-6 text-center">
      <div>
        <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary text-lg font-bold text-primary-foreground">
          T
        </div>
        <div className="mt-4 text-lg font-bold">Tandem</div>
        <p className="mt-2 max-w-xs text-sm leading-6 text-muted-foreground">{message}</p>
      </div>
    </main>
  );
}
