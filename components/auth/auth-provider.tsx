"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { createExistingDemoHomeState, createFreshHomeState, writeHomeStateSnapshot } from "@/lib/home-state";
import { clearCareDemoData, setForceDemoData } from "@/lib/demo-mode";

type AuthProfile = {
  id: string;
  name: string;
  email?: string;
  mode: "demo" | "supabase";
};

type AuthContextValue = {
  profile: AuthProfile | null;
  isSupabaseConfigured: boolean;
  loading: boolean;
  continueAsDemo: (name: string) => void;
  signInWithEmail: (input: { email: string; name: string }) => Promise<string>;
  inviteWithEmail: (input: { email: string; name?: string }) => Promise<string>;
  signOut: () => Promise<void>;
};

const AUTH_STORAGE_KEY = "tandem-auth-profile-v1";
const AuthContext = React.createContext<AuthContextValue | null>(null);

function readStoredProfile() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AuthProfile) : null;
  } catch {
    return null;
  }
}

function writeStoredProfile(profile: AuthProfile | null) {
  if (typeof window === "undefined") return;
  if (profile) {
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(profile));
    return;
  }
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const supabase = React.useMemo(() => createBrowserSupabaseClient(), []);
  const isSupabaseConfigured = Boolean(supabase);
  const [profile, setProfile] = React.useState<AuthProfile | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;

    async function load() {
      const stored = readStoredProfile();
      if (stored?.mode === "demo") {
        setProfile(stored);
        setLoading(false);
        return;
      }

      if (!supabase) {
        writeStoredProfile(null);
        setLoading(false);
        return;
      }

      const { data } = await supabase.auth.getSession();
      const session = data.session;
      const user = session?.user;
      if (!user || cancelled) {
        writeStoredProfile(null);
        setLoading(false);
        return;
      }

      const name =
        typeof user.user_metadata?.name === "string" && user.user_metadata.name.trim()
          ? user.user_metadata.name.trim()
          : user.email?.split("@")[0] ?? "Caregiver";

      const nextProfile: AuthProfile = {
        id: user.id,
        name,
        email: user.email ?? undefined,
        mode: "supabase",
      };
      setProfile(nextProfile);
      writeStoredProfile(nextProfile);
      void bootstrapSupabaseProfile(session.access_token, name);
      setLoading(false);
    }

    void load();

    const { data: listener } =
      supabase?.auth.onAuthStateChange((_event, session) => {
        const user = session?.user;
        if (!user) return;
        const name =
          typeof user.user_metadata?.name === "string" && user.user_metadata.name.trim()
            ? user.user_metadata.name.trim()
            : user.email?.split("@")[0] ?? "Caregiver";
        const nextProfile: AuthProfile = {
          id: user.id,
          name,
          email: user.email ?? undefined,
          mode: "supabase",
        };
        setForceDemoData(false);
        clearCareDemoData();
        writeHomeStateSnapshot(createFreshHomeState(name));
        setProfile(nextProfile);
        writeStoredProfile(nextProfile);
        void bootstrapSupabaseProfile(session.access_token, name);
      }) ?? {};

    return () => {
      cancelled = true;
      listener?.subscription.unsubscribe();
    };
  }, [supabase]);

  const continueAsDemo = React.useCallback(
    (name: string) => {
      const displayName = name.trim() || "Caregiver";
      const nextProfile: AuthProfile = {
        id: "demo-caregiver",
        name: displayName,
        mode: "demo",
      };
      setForceDemoData(true);
      clearCareDemoData();
      writeHomeStateSnapshot(createExistingDemoHomeState(displayName));
      writeStoredProfile(nextProfile);
      setProfile(nextProfile);
      router.push("/");
    },
    [router],
  );

  const signInWithEmail = React.useCallback(
    async ({ email, name }: { email: string; name: string }) => {
      if (!supabase) return "Supabase keys are not configured. Continue in demo mode for now.";
      const origin = window.location.origin;
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${origin}/auth/callback`,
          data: { name: name.trim() || undefined },
        },
      });
      if (error) return error.message;
      return "Check your email for the sign-in link.";
    },
    [supabase],
  );

  const inviteWithEmail = React.useCallback(async ({ email, name }: { email: string; name?: string }) => {
    try {
      const response = await fetch("/api/auth/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name }),
      });
      const payload = (await response.json().catch(() => ({}))) as { message?: string; error?: string };
      return payload.message ?? payload.error ?? (response.ok ? "Invite sent." : "Could not send invite.");
    } catch {
      return "Could not send invite.";
    }
  }, []);

  const signOut = React.useCallback(async () => {
    writeStoredProfile(null);
    setForceDemoData(false);
    setProfile(null);
    if (supabase) {
      await supabase.auth.signOut();
    }
    router.push("/");
  }, [router, supabase]);

  const value = React.useMemo<AuthContextValue>(
    () => ({
      profile,
      isSupabaseConfigured,
      loading,
      continueAsDemo,
      signInWithEmail,
      inviteWithEmail,
      signOut,
    }),
    [continueAsDemo, inviteWithEmail, isSupabaseConfigured, loading, profile, signInWithEmail, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

async function bootstrapSupabaseProfile(accessToken: string, name: string) {
  try {
    await fetch("/api/auth/profile", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name }),
    });
  } catch {
    // Auth still works if profile bootstrap is unavailable; demo data remains usable.
  }
}

export function useAuth() {
  const value = React.useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return value;
}

export function SignOutButton({ className }: { className?: string }) {
  const { signOut } = useAuth();
  return (
    <Button type="button" variant="outline" className={className} onClick={() => void signOut()}>
      <LogOut className="size-4" />
      Sign out
    </Button>
  );
}
