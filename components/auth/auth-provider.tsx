"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { HeartPulse, LogOut, Mail, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import {
  createExistingDemoHomeState,
  createFreshHomeState,
  writeHomeStateSnapshot,
} from "@/lib/home-state";
import { clearCareDemoData, setForceDemoData, shouldForceDemoData } from "@/lib/demo-mode";

type AuthProfile = {
  id: string;
  name: string;
  email?: string;
  mode: "demo" | "supabase";
  onboarding: "existing" | "new";
};

type AuthContextValue = {
  profile: AuthProfile | null;
  isSupabaseConfigured: boolean;
  signInWithEmail: (input: { email: string; name: string }) => Promise<string>;
  continueAsRachel: () => void;
  startFresh: (name: string) => void;
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
  const pathname = usePathname() ?? "";
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
        onboarding: "new",
      };
      if (!shouldForceDemoData()) {
        setForceDemoData(false);
        clearCareDemoData();
        writeHomeStateSnapshot(createFreshHomeState(name));
      }
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
          onboarding: "new",
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

  const continueAsRachel = React.useCallback(() => {
    const nextProfile: AuthProfile = {
      id: "demo-rachel",
      name: "Rachel",
      mode: "demo",
      onboarding: "existing",
    };
    setForceDemoData(true);
    clearCareDemoData();
    writeHomeStateSnapshot(createExistingDemoHomeState("Rachel"));
    writeStoredProfile(nextProfile);
    setProfile(nextProfile);
    router.push("/");
  }, [router]);

  const startFresh = React.useCallback(
    (name: string) => {
      const displayName = name.trim() || "Caregiver";
      const nextProfile: AuthProfile = {
        id: "demo-new-caregiver",
        name: displayName,
        mode: "demo",
        onboarding: "new",
      };
      setForceDemoData(true);
      clearCareDemoData();
      writeHomeStateSnapshot(createFreshHomeState(displayName));
      writeStoredProfile(nextProfile);
      setProfile(nextProfile);
      router.push("/");
    },
    [router],
  );

  const signInWithEmail = React.useCallback(
    async ({ email, name }: { email: string; name: string }) => {
      if (!supabase) return "Supabase keys are not configured. Use a demo path for now.";
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
      signInWithEmail,
      continueAsRachel,
      startFresh,
      signOut,
    }),
    [continueAsRachel, isSupabaseConfigured, profile, signInWithEmail, signOut, startFresh],
  );

  if (pathname.startsWith("/auth/callback")) {
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
  }

  if (loading) {
    return <AuthLoading />;
  }

  return (
    <AuthContext.Provider value={value}>
      {profile ? children : <AuthWelcome />}
    </AuthContext.Provider>
  );
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

function AuthLoading() {
  return (
    <div className="grid min-h-screen place-items-center bg-background px-6 text-center">
      <div>
        <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary text-lg font-bold text-primary-foreground">
          T
        </div>
        <div className="mt-4 text-lg font-bold">Loading Tandem</div>
        <p className="mt-2 max-w-xs text-sm leading-6 text-muted-foreground">Preparing your care circle.</p>
      </div>
    </div>
  );
}

function AuthWelcome() {
  const auth = useAuth();
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [message, setMessage] = React.useState<string | null>(null);
  const [sending, setSending] = React.useState(false);

  const handleEmailSignIn = async (event: React.FormEvent) => {
    event.preventDefault();
    setSending(true);
    setMessage(await auth.signInWithEmail({ email, name }));
    setSending(false);
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-primary/5 px-5 py-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-between">
        <section className="pt-8">
          <div className="flex items-center gap-3">
            <div className="grid size-12 place-items-center rounded-2xl bg-primary text-lg font-bold text-primary-foreground">
              T
            </div>
            <div>
              <div className="text-2xl font-bold">Tandem</div>
              <div className="text-sm text-muted-foreground">Family care hub</div>
            </div>
          </div>

          <div className="mt-12">
            <HeartPulse className="size-10 text-primary" />
            <h1 className="mt-4 text-4xl font-bold leading-tight tracking-normal">
              Coordinate care without losing the family context.
            </h1>
            <p className="mt-4 text-base leading-7 text-muted-foreground">
              Start fresh for onboarding, or continue as Rachel to see Ah Muay's existing care circle with Ming and Lina.
            </p>
          </div>
        </section>

        <section className="space-y-3 pb-8">
          <Button className="w-full" size="lg" onClick={auth.continueAsRachel}>
            Continue as Rachel
          </Button>

          <form className="space-y-3 rounded-2xl border bg-white/75 p-4 shadow-sm" onSubmit={handleEmailSignIn}>
            <div>
              <label className="text-xs font-semibold text-muted-foreground" htmlFor="auth-name">
                Your name
              </label>
              <Input
                id="auth-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Caregiver name"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground" htmlFor="auth-email">
                Email
              </label>
              <Input
                id="auth-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
              />
            </div>
            <Button type="submit" variant="outline" className="w-full" disabled={!email.trim() || sending}>
              <Mail className="size-4" />
              {sending ? "Sending" : auth.isSupabaseConfigured ? "Email me a sign-in link" : "Try Supabase sign-in"}
            </Button>
            {message ? <p className="text-sm leading-6 text-muted-foreground">{message}</p> : null}
          </form>

          <Button variant="ghost" className="w-full" onClick={() => auth.startFresh(name)}>
            <UserPlus className="size-4" />
            Start fresh
          </Button>
        </section>
      </div>
    </main>
  );
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
