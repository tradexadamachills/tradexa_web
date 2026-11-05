import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase, invoke } from "./lib/client";
import { hasPin } from "./lib/pin";
export type Phase =
  | "loading"
  | "anonymous"
  | "email_otp"
  | "passcode_setup"
  | "locked"
  | "verification"
  | "ready";
type Auth = {
  user: User | null;
  phase: Phase;
  email: string;
  identity: string;
  refresh: (unlocked?: boolean) => Promise<void>;
  beginEmail: (email: string) => Promise<void>;
  verifyEmail: (code: string) => Promise<void>;
  resend: () => Promise<void>;
  google: () => Promise<void>;
  signOut: () => Promise<void>;
};
const Context = createContext<Auth | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null),
    [phase, setPhase] = useState<Phase>("loading");
  const [email, setEmail] = useState(""),
    [identity, setIdentity] = useState("not_started");
  const unlocked = useRef(false),
    generation = useRef(0),
    expected = useRef<string | null>(null);
  const refresh = useCallback(async (unlock = false) => {
    const version = ++generation.current;
    if (unlock) unlocked.current = true;
    if (!supabase) {
      setPhase("anonymous");
      return;
    }
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      unlocked.current = false;
      setUser(null);
      setPhase("anonymous");
      return;
    }
    const { data, error } = await supabase.auth.getUser();
    if (version !== generation.current) return;
    if (error || !data.user) {
      setPhase("anonymous");
      setUser(null);
      return;
    }
    setUser(data.user);
    setEmail(data.user.email ?? "");
    const proof = await supabase.rpc("has_email_otp");
    if (version !== generation.current) return;
    if (proof.error || proof.data !== true) {
      expected.current = data.user.id;
      setPhase("email_otp");
      return;
    }
    const profile = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", data.user.id)
      .maybeSingle();
    if (version !== generation.current) return;
    if (profile.data?.full_name)
      setUser({
        ...data.user,
        user_metadata: {
          ...data.user.user_metadata,
          full_name: profile.data.full_name,
        },
      });
    if (!hasPin(data.user.id)) {
      setPhase("passcode_setup");
      return;
    }
    if (!unlocked.current) {
      setPhase("locked");
      return;
    }
    try {
      const status = await invoke<{ status: string }>("identity-session", {
        action: "status",
      });
      if (version !== generation.current) return;
      let effective = status.status;
      if (effective === "verified") {
        const access = await supabase.rpc("identity_access_status");
        if (version !== generation.current) return;
        effective =
          access.error || access.data !== "verified"
            ? "manual_review"
            : "verified";
      }
      setIdentity(effective);
      setPhase(effective === "verified" ? "ready" : "verification");
    } catch {
      if (version === generation.current) {
        setIdentity("provider_error");
        setPhase("verification");
      }
    }
  }, []);
  useEffect(() => {
    void refresh();
    if (!supabase) return;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        generation.current++;
        unlocked.current = false;
        expected.current = null;
        setUser(null);
        setPhase("anonymous");
      } else
        queueMicrotask(() => {
          void refresh();
        });
    });
    return () => {
      subscription.unsubscribe();
      generation.current++;
    };
  }, [refresh]);
  useEffect(() => {
    const lock = () => {
      if (document.visibilityState === "hidden" && unlocked.current) {
        unlocked.current = false;
        generation.current++;
        setPhase("locked");
      }
    };
    document.addEventListener("visibilitychange", lock);
    return () => document.removeEventListener("visibilitychange", lock);
  }, []);
  async function beginEmail(value: string) {
    if (!supabase)
      throw new Error("Email sign-in is awaiting backend configuration.");
    const { error } = await supabase.auth.signInWithOtp({
      email: value,
      options: { emailRedirectTo: `${location.origin}/auth/callback` },
    });
    if (error)
      throw new Error("Unable to send a code. Please try again later.");
    expected.current = null;
    setEmail(value);
    setPhase("email_otp");
  }
  async function resend() {
    if (!supabase || !email) throw new Error("Enter your email first.");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: !user },
    });
    if (error)
      throw new Error("Could not send another code. Please wait and retry.");
  }
  async function verifyEmail(code: string) {
    if (!supabase || !/^\d{6}$/.test(code))
      throw new Error("Enter the six-digit code.");
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "email",
    });
    if (
      error ||
      !data.user ||
      (expected.current && expected.current !== data.user.id)
    ) {
      if (data.user && expected.current && expected.current !== data.user.id)
        await supabase.auth.signOut();
      throw new Error("The code is invalid or expired.");
    }
    await refresh();
  }
  async function google() {
    if (!supabase)
      throw new Error("Google sign-in is awaiting backend configuration.");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${location.origin}/auth/callback`,
        queryParams: { prompt: "select_account" },
      },
    });
    if (error) throw new Error("Google sign-in could not be started.");
  }
  async function signOut() {
    if (supabase) await supabase.auth.signOut();
    unlocked.current = false;
    generation.current++;
    setUser(null);
    setPhase("anonymous");
  }
  return (
    <Context.Provider
      value={{
        user,
        phase,
        email,
        identity,
        refresh,
        beginEmail,
        verifyEmail,
        resend,
        google,
        signOut,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useAuth() {
  const auth = useContext(Context);
  if (!auth) throw new Error("Missing AuthProvider");
  return auth;
}
