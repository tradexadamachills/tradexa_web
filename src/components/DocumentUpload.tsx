import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { LoaderCircle, Upload } from "lucide-react";
import { supabase, errorMessage } from "../lib/client";
import { useAuth } from "../auth";

async function prepare(file: File): Promise<File> {
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
    if (Math.max(image.width, image.height) / Math.min(image.width, image.height) > 1.9)
      throw new Error(
        "This looks like a screenshot, not a photo of an ID card. Take a clear photo of the card.",
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
    return new File([blob], "document.jpg", { type: "image/jpeg" });
  } finally {
    image.close();
  }
}
export function DocumentUpload() {
  const auth = useAuth();
  const [front, setFront] = useState<File | null>(null),
    [back, setBack] = useState<File | null>(null),
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
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!front || !consent || busy || pending) return;
    if (
      back &&
      back.name === front.name &&
      back.size === front.size &&
      back.lastModified === front.lastModified
    ) {
      setError(
        "The front and back are the same picture. Choose the back of your ID in the second box, or leave it empty.",
      );
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (!supabase) throw new Error("Please sign in again.");
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Please sign in again.");
      const endpoint = new URL(
        "/api/documents",
        import.meta.env.VITE_ADMIN_URL || "http://127.0.0.1:8000",
      );
      if (
        endpoint.protocol !== "https:" &&
        !["127.0.0.1", "localhost"].includes(endpoint.hostname)
      )
        throw new Error("Secure document uploads require an HTTPS server.");
      const body = new FormData();
      body.append("document_type", type);
      body.append("consent", "1");
      body.append("front", await prepare(front));
      if (back) body.append("back", await prepare(back));
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          Accept: "application/json",
        },
        body,
        signal: AbortSignal.timeout(150000),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok)
        throw new Error(
          data?.message || "Could not submit your document. Please retry.",
        );
      if (data.status === "rejected") setError(data.message);
      else setMessage(data.message);
      await auth.refresh(true);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function withdraw() {
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (!supabase) throw new Error("Please sign in again.");
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Please sign in again.");
      const response = await fetch(
        new URL(
          "/api/documents",
          import.meta.env.VITE_ADMIN_URL || "http://127.0.0.1:8000",
        ),
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            Accept: "application/json",
          },
        },
      );
      if (!response.ok) throw new Error("Could not remove your submission.");
      await auth.refresh(true);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="document-upload">
      <p className="document-limit">
        Upload your national ID card, passport or driving licence. An admin
        reviews it before your real account is unlocked.
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
                ? "Your document is being screened."
                : "Your document is awaiting admin review."}
          </strong>
          <p>
            You can keep using the demo while you wait.
          </p>
          {auth.identity !== "verified" && (
            <button
              type="button"
              className="button full"
              disabled={busy}
              onClick={() => void withdraw()}
            >
              Remove this and upload a different document
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
            disabled={busy}
            onChange={(event) => setFront(event.target.files?.[0] ?? null)}
          />
          <label htmlFor="document-back">
            Document back (if your ID has one)
          </label>
          <input
            id="document-back"
            type="file"
            accept="image/jpeg,image/png"
            capture="environment"
            disabled={busy}
            onChange={(event) => setBack(event.target.files?.[0] ?? null)}
          />
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={consent}
              disabled={busy}
              onChange={(event) => setConsent(event.target.checked)}
            />
            <span>
              I agree to private document storage, local document-type
              screening, and review by authorized Tradexa administrators.
            </span>
          </label>
          <button className="button full" disabled={busy || !front || !consent}>
            {busy ? (
              <>
                <LoaderCircle className="spin" size={18} /> Screening your
                document...
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
