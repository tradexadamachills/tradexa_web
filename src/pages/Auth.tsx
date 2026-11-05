import { OtpBoxes } from "../components/OtpBoxes";
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Link, Navigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Delete,
  Fingerprint,
  LoaderCircle,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "../auth";
import { Brand } from "../components/ui";
import { errorMessage, invoke } from "../lib/client";
import { DocumentUpload } from "../components/DocumentUpload";
import { savePin, verifyPin } from "../lib/pin";
export function AuthScreen() {
  const auth = useAuth(),
    [input, setInput] = useState(""),
    [code, setCode] = useState(""),
    [first, setFirst] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [seconds, setSeconds] = useState(0),
    [biometricInfo, setBiometricInfo] = useState(false);
  const sentFor = useRef("");
  const pinInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    setCode("");
    setFirst("");
    setBiometricInfo(false);
    setError("");
  }, [auth.phase, auth.user?.id]);
  useEffect(() => {
    if (
      !busy &&
      !biometricInfo &&
      (auth.phase === "locked" || auth.phase === "passcode_setup")
    ) {
      pinInput.current?.focus();
    }
  }, [auth.phase, busy, biometricInfo]);

  useEffect(() => {
    if (seconds <= 0) return;
    const timer = setTimeout(() => setSeconds(seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [seconds]);
  useEffect(() => {
    if (
      auth.phase === "email_otp" &&
      auth.user &&
      sentFor.current !== auth.email
    ) {
      sentFor.current = auth.email;
      void auth
        .resend()
        .then(() => setSeconds(60))
        .catch((e) => setError(errorMessage(e)));
    }
  }, [auth]);
  async function action(run: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await run();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    await action(async () => {
      if (auth.phase === "email_otp") {
        await auth.verifyEmail(code);
      } else {
        await auth.beginEmail(input.trim());
        setSeconds(60);
      }
    });
  }
  async function pin(next: string) {
    if (busy) return;
    next = next.replace(/\D/g, "").slice(0, 6);
    setCode(next);
    setError("");
    if (next.length !== 6) return;
    await action(async () => {
      if (auth.phase === "locked") {
        if (!auth.user || !(await verifyPin(auth.user.id, next)))
          throw new Error("Incorrect passcode. Please try again.");
        await auth.refresh(true);
        setCode("");
      } else if (!first) {
        if (
          /^(.)\1{5}$/.test(next) ||
          "0123456789".includes(next) ||
          "9876543210".includes(next)
        )
          throw new Error("Choose a less predictable passcode.");
        setFirst(next);
        setCode("");
      } else {
        if (next !== first) {
          setFirst("");
          throw new Error("Passcodes did not match. Start again.");
        }
        if (!auth.user) throw new Error("Please sign in again.");
        await savePin(auth.user.id, next);
        setBiometricInfo(true);
        setCode("");
      }
    });
    if (next.length === 6 && !biometricInfo) setCode("");
  }
  if (auth.phase === "ready") return <Navigate to="/app" replace />;
  if (auth.phase === "verification") return <VerificationOnboarding />;
  const pinMode = auth.phase === "locked" || auth.phase === "passcode_setup";
  return (
    <div className="auth-layout">
      <aside className="auth-aside">
        <Brand />
        <div className="auth-message">
          <span className="eyebrow">YOUR PERSPECTIVE. CONNECTED.</span>
          <h1>
            A clearer view.
            <br />A confident start.
          </h1>
          <p>One account for your Tradexa experience, on web and mobile.</p>
          <div className="auth-orbit">
            <ShieldCheck size={72} strokeWidth={1} />
            <span className="orbit-label">
              <LockKeyhole size={14} /> Secure by design
            </span>
          </div>
        </div>
        <span className="micro">TRADEXA · BUILT AROUND YOU</span>
      </aside>
      <main className="auth-main">
        <Link className="back-link" to="/">
          <ArrowLeft size={16} /> Back to Tradexa
        </Link>
        <div className="auth-form-wrap">
          {auth.phase === "loading" ? (
            <div className="loading-state">
              <LoaderCircle className="spin" /> Restoring your session…
            </div>
          ) : biometricInfo ? (
            <>
              <span className="auth-icon">
                <Fingerprint />
              </span>
              <h1>Your access, secured.</h1>
              <p>
                Device biometrics are available in the mobile app. This browser
                uses your passcode with backend email verification.
              </p>
              <button
                className="button full"
                onClick={() => void action(() => auth.refresh(true))}
              >
                Continue <ArrowRight size={17} />
              </button>
            </>
          ) : pinMode ? (
            <>
              <span className="auth-icon">
                <LockKeyhole />
              </span>
              <h1>
                {auth.phase === "locked"
                  ? "Welcome back."
                  : first
                    ? "Confirm your passcode."
                    : "Make it personal."}
              </h1>
              <p>
                {auth.phase === "locked"
                  ? "Enter your six-digit web passcode to unlock this workspace."
                  : first
                    ? "Enter the same six digits one more time."
                    : "Choose a six-digit passcode for this browser. It never replaces your verified account session."}
              </p>
              <div
                className="pin-dots"
                aria-label={`${code.length} of 6 digits entered`}
              >
                <input
                  ref={pinInput}
                  className="pin-keyboard-input"
                  type="password"
                  aria-label="Six-digit passcode"
                  autoComplete="off"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  disabled={busy}
                  onChange={(event) => void pin(event.target.value)}
                />
                {Array.from({ length: 6 }, (_, i) => (
                  <span
                    key={i}
                    aria-hidden="true"
                    className={code.length > i ? "filled" : ""}
                  />
                ))}
              </div>
              <div className="pin-keypad">
                {[
                  "1",
                  "2",
                  "3",
                  "4",
                  "5",
                  "6",
                  "7",
                  "8",
                  "9",
                  "Clear",
                  "0",
                  "Delete",
                ].map((digit) => (
                  <button
                    key={digit}
                    type="button"
                    disabled={busy}
                    aria-label={digit}
                    onClick={() =>
                      digit === "Clear"
                        ? setCode("")
                        : digit === "Delete"
                          ? setCode(code.slice(0, -1))
                          : void pin(code + digit)
                    }
                  >
                    {digit === "Delete" ? <Delete size={22} /> : digit}
                  </button>
                ))}
              </div>
              <button
                className="text-button"
                onClick={() => void action(auth.signOut)}
              >
                Sign out and verify your account again
              </button>
            </>
          ) : (
            <>
              <span className="auth-icon">
                {auth.phase === "email_otp" ? <Mail /> : <ArrowRight />}
              </span>
              <h1>
                {auth.phase === "email_otp"
                  ? "Check your inbox."
                  : "Your next chapter."}
              </h1>
              <p>
                {auth.phase === "email_otp"
                  ? `Enter the 6-digit code sent to ${auth.email}`
                  : "Sign in or create your account. Your workspace is waiting."}
              </p>
              {auth.phase !== "email_otp" && (
                <>
                  <button
                    className="button google-button full"
                    disabled={busy}
                    onClick={() => void action(auth.google)}
                  >
                    <span className="google-g">G</span> Continue with Google
                  </button>
                  <div className="or-divider">
                    <span />
                    or continue with email
                    <span />
                  </div>
                </>
              )}
              <form onSubmit={submit}>
                {auth.phase === "email_otp" ? (
                  <OtpBoxes
                    value={code}
                    disabled={busy}
                    invalid={Boolean(error)}
                    onChange={(next) => {
                      setCode(next);
                      setError("");
                    }}
                    onComplete={(next) =>
                      void action(async () => {
                        try {
                          await auth.verifyEmail(next);
                        } catch (e) {
                          setCode("");
                          throw e;
                        }
                      })
                    }
                  />
                ) : (
                  <>
                <label htmlFor="auth-input">Email address</label>
                <input
                  id="auth-input"
                  autoComplete="email"
                  type="email"
                  inputMode="email"
                  placeholder="you@example.com"
                  value={input}
                  maxLength={254}
                  required
                  onChange={(e) => setInput(e.target.value)}
                />
                  </>
                )}
                <button
                  className="button full"
                  disabled={busy || (auth.phase === "email_otp" && code.length !== 6)}
                >
                  {busy ? (
                    <LoaderCircle className="spin" size={18} />
                  ) : auth.phase === "email_otp" ? (
                    "Verify email"
                  ) : (
                    "Continue with email"
                  )}
                  <ArrowRight size={17} />
                </button>
              </form>
              {auth.phase === "email_otp" && (
                <div className="otp-actions">
                  <button
                    className="text-button"
                    disabled={busy || seconds > 0}
                    onClick={() =>
                      void action(async () => {
                        await auth.resend();
                        setSeconds(60);
                      })
                    }
                  >
                    {seconds > 0
                      ? `Resend in ${seconds}s`
                      : "Resend verification code"}
                  </button>
                  <button
                    className="text-button"
                    onClick={() => void action(auth.signOut)}
                  >
                    Use another email
                  </button>
                </div>
              )}
              <p className="auth-legal">
                By continuing, you acknowledge our{" "}
                <Link to="/privacy">privacy information</Link>. Trading and
                payments are not enabled in this release.
              </p>
            </>
          )}
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
        </div>
        <div className="auth-footer">
          <ShieldCheck size={14} /> Your identity. Carefully protected.
        </div>
      </main>
    </div>
  );
}
export function VerificationOnboarding() {
  const auth = useAuth();
  return (
    <div className="verification-layout">
      <header>
        <Brand />
        <button className="text-button" onClick={() => void auth.signOut()}>
          Sign out
        </button>
      </header>
      <div className="verification-content">
        <div className="onboarding-progress">
          <span className="done">
            <Check size={13} /> Account
          </span>
          <i />
          <span className="done">
            <Check size={13} /> Security
          </span>
          <i />
          <span className="active">3 / Verification</span>
        </div>
        <VerificationPanel />
      </div>
    </div>
  );
}
export function VerificationPanel() {
  const auth = useAuth(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [phone, setPhone] = useState(""),
    [phoneCode, setPhoneCode] = useState(""),
    [sent, setSent] = useState(false),
    [verified, setVerified] = useState(false),
    [cooldown, setCooldown] = useState(0);
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);
  useEffect(() => {
    if (auth.phase !== "verification") return;
    const timer = setInterval(() => void auth.refresh(true), 20000);
    return () => clearInterval(timer);
  }, [auth]);
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  const states: Record<string, string> = {
    not_started: "Ready when you are",
    document_pending: "Complete your secure capture",
    processing: "Your document is being screened",
    manual_review: "Your document is awaiting admin review",
    admin_rejected: "Your documents need another review",
    rejected: "Verification could not be completed",
    provider_error: "Verification is temporarily unavailable",
    verified: "Your identity is verified",
  };
  return (
    <>
      <div className="verification-heading">
        <span className="auth-icon">
          <ShieldCheck />
        </span>
        <span className="eyebrow">ONE LAST STEP</span>
        <h1>Confidence, on both sides.</h1>
        <p>
          Upload your own identity document. A local model checks whether the
          image looks like a supported document, then an administrator reviews
          it.
        </p>
      </div>
      <div className="verification-card panel">
        <div className="verification-status">
          <span
            className={`status-dot ${auth.identity === "verified" ? "" : "amber"}`}
          />
          <strong>{states[auth.identity] ?? "Waiting for verification"}</strong>
        </div>
        <DocumentUpload />
        <button
          className="text-button"
          disabled={busy}
          onClick={() => void run(() => auth.refresh(true))}
        >
          Refresh verification status
        </button>
        {auth.identity === "verified" && (
          <Link className="button full" to="/app">
            Open workspace
          </Link>
        )}
      </div>
      <details className="panel contact-panel">
        <summary>
          <Mail size={18} /> Add a verified WhatsApp contact{" "}
          <span>Optional</span>
        </summary>
        <p>
          This is an additional contact method, not a replacement for email or
          identity checks.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              let device = localStorage.getItem("tradexa.device");
              if (!device) {
                device = crypto.randomUUID();
                localStorage.setItem("tradexa.device", device);
              }
              const data = await invoke<{ status: string }>("whatsapp-otp", {
                action: sent ? "verify" : "request",
                phone,
                ...(sent ? { code: phoneCode } : {}),
                device_id: device,
              });
              if (data.status === "sent") {
                setSent(true);
                setCooldown(60);
              } else if (data.status === "verified") {
                setVerified(true);
              }
            });
          }}
        >
          <label htmlFor="whatsapp">Phone number including country code</label>
          <input
            id="whatsapp"
            type="tel"
            placeholder="+923001234567"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={sent}
            required
            pattern="\+[1-9][0-9]{7,14}"
          />
          {sent && (
            <>
              <label htmlFor="whatsapp-code">Six-digit WhatsApp code</label>
              <input
                id="whatsapp-code"
                value={phoneCode}
                maxLength={6}
                inputMode="numeric"
                onChange={(e) =>
                  setPhoneCode(e.target.value.replace(/\D/g, ""))
                }
              />
            </>
          )}
          <button className="button full" disabled={busy || verified}>
            {verified
              ? "Contact verified"
              : sent
                ? "Verify code"
                : "Send WhatsApp code"}
          </button>
          {sent && !verified && (
            <button
              className="text-button"
              type="button"
              disabled={busy || cooldown > 0}
              onClick={() =>
                void run(async () => {
                  await invoke("whatsapp-otp", { action: "request", phone });
                  setCooldown(60);
                })
              }
            >
              {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
            </button>
          )}
        </form>
      </details>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <p className="verification-footnote">
        <LockKeyhole size={14} /> Documents stay in the provider’s secure flow.
        Tradexa retains the verification reference and review decision.
      </p>
    </>
  );
}
