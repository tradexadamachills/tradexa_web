import { useEffect, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { CheckCircle2, LoaderCircle, Upload } from "lucide-react";
import { supabase, errorMessage, invoke } from "../lib/client";
import { useAuth } from "../auth";

/** Resizes to a JPEG under 2 MB and returns it with its base64 text. */
async function prepare(file: File): Promise<{ file: File; base64: string }> {
  if (
    !["image/jpeg", "image/png"].includes(file.type) ||
    file.size > 10 * 1024 * 1024
  )
    throw new Error("Choose a JPEG or PNG photo under 10 MB.");
  const image = await createImageBitmap(file);
  try {
    if (
      image.width * image.height > 16000000 ||
      Math.min(image.width, image.height) < 250
    )
      throw new Error("Use a clear document photo with readable details.");
    if (
      Math.max(image.width, image.height) /
        Math.min(image.width, image.height) >
      1.9
    )
      throw new Error(
        "This looks like a screenshot, not a photo of an ID card. Add a picture of your ID document.",
      );
    const scale = Math.min(1, 1600 / Math.max(image.width, image.height)),
      canvas = document.createElement("canvas");
    canvas.width = Math.round(image.width * scale);
    canvas.height = Math.round(image.height * scale);
    const context = canvas.getContext("2d");
    if (!context)
      throw new Error("Image processing is unavailable in this browser.");
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (value) =>
          value
            ? resolve(value)
            : reject(new Error("Could not prepare this image.")),
        "image/jpeg",
        0.82,
      ),
    );
    if (blob.size > 2 * 1024 * 1024)
      throw new Error("This photo is too large. Choose a smaller image.");
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
      reader.onerror = () => reject(new Error("Could not read this image."));
      reader.readAsDataURL(blob);
    });
    return { file: new File([blob], "document.jpg", { type: "image/jpeg" }), base64 };
  } finally {
    image.close();
  }
}

type Slot = { base64: string } | null;
type Check = "idle" | "checking" | "ok";

export function DocumentUpload() {
  const auth = useAuth();
  const [front, setFront] = useState<Slot>(null),
    [back, setBack] = useState<Slot>(null),
    [frontCheck, setFrontCheck] = useState<Check>("idle"),
    [backCheck, setBackCheck] = useState<Check>("idle"),
    [type, setType] = useState("national_id"),
    [consent, setConsent] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  const pending = ["manual_review", "processing", "verified"].includes(
    auth.identity,
  );
  const [reason, setReason] = useState("");
  useEffect(() => {
    if (!supabase || !["rejected", "admin_rejected"].includes(auth.identity)) {
      setReason("");
      return;
    }
    void supabase.rpc("identity_access_detail").then(({ data }) => {
      const r = (data as { reason?: string } | null)?.reason;
      setReason(typeof r === "string" ? r : "");
    });
  }, [auth.identity]);

  /** Step 1: pre-scan. Only tells the user whether the picture is an ID document. */
  async function pick(
    event: ChangeEvent<HTMLInputElement>,
    set: (v: Slot) => void,
    setCheck: (c: Check) => void,
  ) {
    const input = event.target;
    const chosen = input.files?.[0];
    set(null);
    setCheck("idle");
    setError("");
    setMessage("");
    if (!chosen) return;
    setCheck("checking");
    try {
      const prepared = await prepare(chosen);
      const verdict = await invoke<{ available?: boolean; ok?: boolean; message?: string }>(
        "check-document",
        { image: prepared.base64, document_type: type },
      ).catch(() => ({ available: false }) as { available?: boolean; ok?: boolean; message?: string });
      if (verdict.available && verdict.ok === false) {
        throw new Error(
          verdict.message ||
            "This does not look like an ID document. Add a picture of your ID document.",
        );
      }
      set({ base64: prepared.base64 });
      setCheck("ok");
    } catch (e) {
      input.value = "";
      setCheck("idle");
      setError(errorMessage(e));
    }
  }

  /** Step 2: send it to the admin queue. */
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!front || !consent || busy || pending) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await invoke("submit-document", {
        document_type: type,
        consent: true,
        front: front.base64,
        ...(back ? { back: back.base64 } : {}),
      });
      setMessage(
        "Received. Your document is being checked, then an admin will review it.",
      );
      await auth.refresh(true);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function replace() {
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await invoke("submit-document", { action: "replace" });
      setFront(null);
      setBack(null);
      setFrontCheck("idle");
      setBackCheck("idle");
      await auth.refresh(true);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  const badge = (c: Check) =>
    c === "checking" ? (
      <span className="doc-check">
        <LoaderCircle className="spin" size={16} /> Checking…
      </span>
    ) : c === "ok" ? (
      <span className="doc-check ok">
        <CheckCircle2 size={16} /> ID document detected
      </span>
    ) : null;
  return (
    <div className="document-upload">
      <p className="document-limit">
        Upload your national ID card, passport or driving licence. We check that
        it is an ID, then an admin reviews it before your real account is
        unlocked.
      </p>
      {["rejected", "admin_rejected"].includes(auth.identity) && (
        <p role="alert" className="form-error">
          Your last document was not accepted.
          {reason ? ` Reason: ${reason}` : ""} Please upload a new one.
        </p>
      )}
      {pending ? (
        <div className="document-pending">
          <strong>
            {auth.identity === "verified"
              ? "Your document was approved."
              : auth.identity === "processing"
                ? "Your document is being checked."
                : "Your document is awaiting admin review."}
          </strong>
          <p>You can keep using the demo while you wait.</p>
          {auth.identity !== "verified" && (
            <button
              type="button"
              className="button full"
              disabled={busy}
              onClick={() => void replace()}
            >
              Replace document
            </button>
          )}
        </div>
      ) : (
        <form onSubmit={(event) => void submit(event)}>
          <label htmlFor="document-type">Document type</label>
          <select
            id="document-type"
            value={type}
            onChange={(event) => setType(event.target.value)}
            disabled={busy}
          >
            <option value="national_id">National identity card / CNIC</option>
            <option value="passport">Passport</option>
            <option value="driving_licence">Driving licence</option>
          </select>
          <label htmlFor="document-front">
            Document front / passport photo page
          </label>
          <input
            id="document-front"
            type="file"
            accept="image/jpeg,image/png"
            capture="environment"
            required
            disabled={busy || frontCheck === "checking"}
            onChange={(e) => void pick(e, setFront, setFrontCheck)}
          />
          {badge(frontCheck)}
          <label htmlFor="document-back">
            Document back (if your ID has one)
          </label>
          <input
            id="document-back"
            type="file"
            accept="image/jpeg,image/png"
            capture="environment"
            disabled={busy || backCheck === "checking"}
            onChange={(e) => void pick(e, setBack, setBackCheck)}
          />
          {badge(backCheck)}
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={consent}
              disabled={busy}
              onChange={(event) => setConsent(event.target.checked)}
            />
            <span>I agree to an admin reviewing my document.</span>
          </label>
          <button
            className="button full"
            disabled={busy || !front || !consent || frontCheck !== "ok"}
          >
            {busy ? (
              <>
                <LoaderCircle className="spin" size={18} /> Sending…
              </>
            ) : (
              <>
                <Upload size={18} /> Submit document for review
              </>
            )}
          </button>
        </form>
      )}
      {message && (
        <p role="status" className="document-message">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
    </div>
  );
}
