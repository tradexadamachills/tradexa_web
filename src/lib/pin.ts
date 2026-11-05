type Credential = {
  version: 1;
  salt: number[];
  hash: number[];
  attempts: number;
  until: number;
};
const key = (id: string) => `tradexa.web.pin.v1.${id}`;
const pending = new Set<string>();
function read(id: string): Credential | null {
  try {
    const item = JSON.parse(
      localStorage.getItem(key(id)) ?? "null",
    ) as Credential | null;
    return item?.version === 1 &&
      Array.isArray(item.hash) &&
      Array.isArray(item.salt)
      ? item
      : null;
  } catch {
    return null;
  }
}
async function derive(pin: string, salt: Uint8Array<ArrayBuffer>) {
  if (!globalThis.crypto?.subtle)
    throw new Error(
      "Passcodes require HTTPS or localhost. Open the secure website and retry.",
    );
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(pin),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  return new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "PBKDF2", hash: "SHA-256", salt, iterations: 600000 },
      material,
      256,
    ),
  );
}
export const hasPin = (id: string) => read(id) !== null;
export async function savePin(id: string, pin: string) {
  if (!/^\d{6}$/.test(pin)) throw new Error("Use a six-digit passcode.");
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(pin, salt);
  localStorage.setItem(
    key(id),
    JSON.stringify({
      version: 1,
      salt: [...salt],
      hash: [...hash],
      attempts: 0,
      until: 0,
    } satisfies Credential),
  );
}
// This is a browser-local privacy lock. Backend OTP and KYC remain authoritative.
export async function verifyPin(id: string, pin: string): Promise<boolean> {
  if (pending.has(id))
    throw new Error("An unlock attempt is already in progress.");
  pending.add(id);
  try {
    const item = read(id);
    if (!item) return false;
    if (Date.now() < item.until)
      throw new Error("Too many attempts. Wait before trying again.");
    const candidate = await derive(pin, new Uint8Array(item.salt));
    let difference = candidate.length ^ item.hash.length;
    candidate.forEach((value, index) => {
      difference |= value ^ item.hash[index];
    });
    const ok = difference === 0;
    item.attempts = ok ? 0 : item.attempts + 1;
    item.until = ok
      ? 0
      : item.attempts >= 5
        ? Date.now() + Math.min(60, 2 ** (item.attempts - 5)) * 60000
        : 0;
    localStorage.setItem(key(id), JSON.stringify(item));
    return ok;
  } finally {
    pending.delete(id);
  }
}
